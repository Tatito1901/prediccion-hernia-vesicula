// hooks/use-patients-unified.ts - HOOK MAESTRO UNIFICADO PARA PACIENTES
// Centraliza toda la lógica de fetching, mutaciones e invalidación de pacientes

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { queryKeys, getPatientMutationInvalidationKeys } from '@/lib/query-keys';
import type { Patient } from '@/lib/types';

// ==================== TIPOS ====================
export interface PaginatedPatientsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedPatientsResponse {
  data: Patient[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  stats?: {
    totalPatients: number;
    surveyRate: number;
    pendingConsults: number;
    operatedPatients: number;
    statusStats: Record<string, number>;
  };
}

export interface CreatePatientData {
  nombre: string;
  apellidos: string;
  edad?: number;
  telefono?: string;
  email?: string;
  estado_paciente?: string;
  diagnostico_principal?: string;
  diagnostico_principal_detalle?: string;
  probabilidad_cirugia?: number;
  fecha_cirugia_programada?: string;
  fecha_primera_consulta?: string;
  doctor_asignado_id?: string;
  origen_paciente?: string;
  etiquetas?: string[];
  comentarios_registro?: string;
  proximo_contacto?: string;
  ultimo_contacto?: string;
}

// ==================== FUNCIONES DE FETCH ====================

/**
 * Fetch pacientes paginados con filtros
 */
const fetchPaginatedPatients = async (params: PaginatedPatientsParams): Promise<PaginatedPatientsResponse> => {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.append('page', String(params.page));
  if (params.pageSize) searchParams.append('pageSize', String(params.pageSize));
  if (params.search) searchParams.append('search', params.search);
  if (params.status && params.status !== 'all') searchParams.append('estado', params.status);
  if (params.startDate) searchParams.append('startDate', params.startDate);
  if (params.endDate) searchParams.append('endDate', params.endDate);

  const response = await fetch(`/api/patients?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch patients');
  }
  
  return response.json();
};

/**
 * Fetch pacientes activos (para dashboard y admisión)
 */
const fetchActivePatients = async (params?: { status?: string; limit?: number }): Promise<Patient[]> => {
  const searchParams = new URLSearchParams();
  
  if (params?.status && params.status !== 'all') {
    searchParams.append('estado', params.status);
  }
  if (params?.limit) {
    searchParams.append('pageSize', String(params.limit));
  }

  const response = await fetch(`/api/patients?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch active patients');
  }
  
  const data = await response.json();
  return data.data || [];
};

/**
 * Crear nuevo paciente
 */
const createPatient = async (patientData: CreatePatientData): Promise<Patient> => {
  const response = await fetch('/api/patients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patientData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al crear paciente');
  }

  const result = await response.json();
  return result.patient;
};

// ==================== HOOK MAESTRO UNIFICADO ====================

/**
 * Hook maestro que centraliza toda la lógica de pacientes
 * Proporciona datos paginados, activos, estadísticas y mutaciones
 */
export const usePatients = () => {
  const queryClient = useQueryClient();

  // ==================== QUERIES ====================

  /**
   * Hook para pacientes paginados con filtros
   */
  const usePaginatedPatients = useCallback((params: PaginatedPatientsParams = {}) => {
    const {
      page = 1,
      pageSize = 15,
      search = '',
      status = 'all',
      startDate,
      endDate
    } = params;

    return useQuery({
      queryKey: queryKeys.patients.paginated({ page, pageSize, search, status, startDate, endDate }),
      queryFn: () => fetchPaginatedPatients({ page, pageSize, search, status, startDate, endDate }),
      staleTime: 2 * 60 * 1000, // 2 minutos
      refetchOnWindowFocus: false,
    });
  }, []);

  /**
   * Hook para pacientes activos (dashboard/admisión)
   */
  const useActivePatients = useCallback((params?: { status?: string; limit?: number }) => {
    return useQuery({
      queryKey: queryKeys.patients.active(params),
      queryFn: () => fetchActivePatients(params),
      staleTime: 2 * 60 * 1000, // 2 minutos
      refetchOnWindowFocus: true,
    });
  }, []);

  /**
   * Hook para estadísticas de pacientes
   */
  const usePatientsStats = useCallback(() => {
    return useQuery({
      queryKey: queryKeys.patients.stats,
      queryFn: async () => {
        const response = await fetch('/api/patients?pageSize=1'); // Solo necesitamos stats
        if (!response.ok) throw new Error('Failed to fetch patient stats');
        const data = await response.json();
        return data.stats;
      },
      staleTime: 5 * 60 * 1000, // 5 minutos
    });
  }, []);

  // ==================== MUTACIONES ====================

  /**
   * Mutación para crear paciente con invalidación completa
   */
  const useCreatePatient = useCallback(() => {
    return useMutation({
      mutationFn: createPatient,
      onSuccess: (newPatient) => {
        // 🎯 INVALIDACIÓN UNIVERSAL - Garantiza sincronización en toda la plataforma
        const invalidationKeys = getPatientMutationInvalidationKeys(newPatient.id);
        
        invalidationKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });

        // 🔄 Invalidación adicional para queries específicas que podrían usar patrones diferentes
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const queryKey = query.queryKey;
            return (
              queryKey.includes('patients') ||
              queryKey.includes('clinic') ||
              queryKey.includes('dashboard') ||
              queryKey.includes('clinicData') || // Legacy key
              queryKey.includes('paginatedPatients') // Legacy key
            );
          }
        });

        toast.success('Paciente creado exitosamente');
      },
      onError: (error: Error) => {
        console.error('Error creating patient:', error);
        toast.error(error.message || 'Error al crear paciente');
      },
    });
  }, [queryClient]);

  /**
   * Función para invalidar todas las queries de pacientes manualmente
   */
  const invalidateAllPatientQueries = useCallback(() => {
    const invalidationKeys = getPatientMutationInvalidationKeys();
    
    invalidationKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });

    // Invalidación adicional con predicado para capturar cualquier query relacionada
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey;
        return (
          queryKey.includes('patients') ||
          queryKey.includes('clinic') ||
          queryKey.includes('dashboard')
        );
      }
    });
  }, [queryClient]);

  // ==================== RETORNO DEL HOOK ====================
  return {
    // Hooks de queries
    usePaginatedPatients,
    useActivePatients,
    usePatientsStats,
    
    // Hooks de mutaciones
    useCreatePatient,
    
    // Utilidades
    invalidateAllPatientQueries,
    
    // Query keys para uso externo
    queryKeys: queryKeys.patients,
  };
};

// ==================== HOOKS ESPECÍFICOS PARA COMPATIBILIDAD ====================

/**
 * Hook específico para pacientes paginados (compatibilidad)
 */
export const usePaginatedPatientsUnified = (params: PaginatedPatientsParams = {}) => {
  const { usePaginatedPatients } = usePatients();
  return usePaginatedPatients(params);
};

/**
 * Hook específico para crear pacientes (compatibilidad)
 */
export const useCreatePatientUnified = () => {
  const { useCreatePatient } = usePatients();
  return useCreatePatient();
};

/**
 * Hook específico para pacientes activos (compatibilidad)
 */
export const useActivePatientsUnified = (params?: { status?: string; limit?: number }) => {
  const { useActivePatients } = usePatients();
  return useActivePatients(params);
};
