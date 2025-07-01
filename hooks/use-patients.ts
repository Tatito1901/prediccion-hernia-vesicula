// lib/hooks/use-patients.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Patient as PatientData, NewPatient, DiagnosisEnum } from '@/lib/types';

// OPTIMIZACIÓN CRÍTICA 1: Llaves de cache más específicas y organizadas
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (filters: { page?: number; pageSize?: number; estado?: string }) => 
    [...patientKeys.lists(), filters] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
  stats: () => [...patientKeys.all, 'stats'] as const,
};

// OPTIMIZACIÓN CRÍTICA 2: Configuración de cache agresivo
const CACHE_CONFIG = {
  // Para listas de pacientes - datos que cambian poco
  lists: {
    staleTime: 1000 * 60 * 10, // 10 minutos "fresco"
    gcTime: 1000 * 60 * 30,    // 30 minutos en cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  },
  // Para detalles de paciente - más estables
  details: {
    staleTime: 1000 * 60 * 15, // 15 minutos "fresco"  
    gcTime: 1000 * 60 * 60,    // 1 hora en cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  },
  // Para stats - cambián lentamente
  stats: {
    staleTime: 1000 * 60 * 20, // 20 minutos "fresco"
    gcTime: 1000 * 60 * 90,    // 1.5 horas en cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  }
} as const;

// OPTIMIZACIÓN CRÍTICA 3: Función de fetch optimizada con AbortController
const fetchPatients = async (page: number, pageSize: number, estado: string, signal?: AbortSignal) => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    estado,
  });
  
  const response = await fetch(`/api/patients?${params.toString()}`, {
    signal,
    // Aprovechamos el cache del navegador
    cache: 'force-cache',
  });
  
  if (!response.ok) {
    throw new Error('No se pudieron obtener los pacientes.');
  }
  
  return response.json();
};

// OPTIMIZACIÓN CRÍTICA 4: Hook principal con cache agresivo
export const usePatients = (page = 1, pageSize = 15, estado = 'all') => {
  return useQuery({
    queryKey: patientKeys.list({ page, pageSize, estado }),
    queryFn: ({ signal }) => fetchPatients(page, pageSize, estado, signal),
    ...CACHE_CONFIG.lists,
    // OPTIMIZACIÓN: Mantener datos previos durante refetch
    placeholderData: (previousData) => previousData,
  });
};

// OPTIMIZACIÓN CRÍTICA 5: Hook para paciente individual con cache separado
export const usePatient = (id: string | null) => {
  return useQuery({
    queryKey: patientKeys.detail(id!),
    queryFn: async ({ signal }) => {
      if (!id) return null;
      
      const response = await fetch(`/api/patients/${id}`, {
        signal,
        cache: 'force-cache',
      });
      
      if (!response.ok) {
        throw new Error('Paciente no encontrado.');
      }
      return response.json();
    },
    enabled: !!id,
    ...CACHE_CONFIG.details,
  });
};

// OPTIMIZACIÓN CRÍTICA 6: Hook de stats separado para evitar refetch innecesario  
export const usePatientStats = () => {
  return useQuery({
    queryKey: patientKeys.stats(),
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/patients/stats', {
        signal,
        cache: 'force-cache',
      });
      
      if (!response.ok) {
        throw new Error('No se pudieron obtener las estadísticas.');
      }
      return response.json();
    },
    ...CACHE_CONFIG.stats,
  });
};

// OPTIMIZACIÓN CRÍTICA 7: Mutación optimizada con invalidación inteligente
export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updatedData }: { id: string; updatedData: Partial<PatientData> }) => {
      const response = await fetch(`/api/patients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el paciente.');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast.success('Paciente actualizado exitosamente.');
      
      // OPTIMIZACIÓN: Invalidación específica en lugar de masiva
      // Solo invalida las queries que realmente podrían verse afectadas
      
      // 1. Actualizar el paciente específico en cache
      queryClient.setQueryData(patientKeys.detail(variables.id), data);
      
      // 2. Solo invalidar listas si el estado cambió (afecta filtros)
      if (variables.updatedData.estado_paciente) {
        queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
        queryClient.invalidateQueries({ queryKey: patientKeys.stats() });
      }
      
      // 3. Actualizar listas existentes en lugar de invalidar
      queryClient.setQueriesData(
        { queryKey: patientKeys.lists() },
        (oldData: any) => {
          if (!oldData?.data) return oldData;
          
          return {
            ...oldData,
            data: oldData.data.map((patient: PatientData) => 
              patient.id === variables.id ? { ...patient, ...variables.updatedData } : patient
            )
          };
        }
      );
    },
    onError: (error) => {
      toast.error('Fallo al actualizar paciente', { description: error.message });
    },
  });
};

// OPTIMIZACIÓN CRÍTICA 8: Creación optimizada con actualización optimista
export const useCreatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newPatientData: NewPatient) => {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatientData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear el paciente.');
      }
      return response.json();
    },
    onSuccess: (newPatient) => {
      toast.success('Paciente creado exitosamente.');
      
      // OPTIMIZACIÓN: Actualización optimista del cache
      // 1. Añadir a la primera página de listas
      queryClient.setQueriesData(
        { queryKey: patientKeys.lists() },
        (oldData: any) => {
          if (!oldData?.data) return oldData;
          
          // Solo añadir a la primera página para evitar problemas de paginación
          if (oldData.pagination?.page === 1) {
            return {
              ...oldData,
              data: [newPatient, ...oldData.data.slice(0, -1)], // Reemplaza el último elemento
              pagination: {
                ...oldData.pagination,
                totalCount: oldData.pagination.totalCount + 1,
              }
            };
          }
          return oldData;
        }
      );
      
      // 2. Invalidar stats para reflejar el nuevo paciente
      queryClient.invalidateQueries({ queryKey: patientKeys.stats() });
    },
    onError: (error) => {
      toast.error('Fallo al crear paciente', { description: error.message });
    },
  });
};

// OPTIMIZACIÓN CRÍTICA 9: Hook de admisión optimizado (sin cambios funcionales necesarios)
interface AdmissionFormValues {
  nombre: string;
  apellidos: string;
  telefono: string;
  edad: number | null;
  email?: string;
  diagnostico_principal: DiagnosisEnum;
  comentarios_registro?: string;
  fecha_hora_cita: string;
  motivo_cita: string;
  doctor_asignado_id?: string;
  creado_por_id?: string;
}

export const useAdmitPatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation<PatientData, Error, AdmissionFormValues>({
    mutationFn: async (admissionData) => {
      const response = await fetch('/api/admission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(admissionData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al registrar al paciente.');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Paciente y cita registrados exitosamente.');
      
      // OPTIMIZACIÓN: Invalidación específica
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: patientKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error) => {
      toast.error('Fallo en el registro', { description: error.message });
    },
  });
};

// OPTIMIZACIÓN CRÍTICA 10: Función de prefetch para mejorar UX
export const usePrefetchPatient = () => {
  const queryClient = useQueryClient();
  
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: patientKeys.detail(id),
      queryFn: async () => {
        const response = await fetch(`/api/patients/${id}`, {
          cache: 'force-cache',
        });
        if (!response.ok) throw new Error('Error al cargar paciente');
        return response.json();
      },
      ...CACHE_CONFIG.details,
    });
  };
};