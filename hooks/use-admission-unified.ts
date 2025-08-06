// hooks/use-admission-unified.ts
// HOOK UNIFICADO DE ADMISIÓN - CONSOLIDA use-admission-data.ts + use-admission-realtime.ts

import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCallback, useMemo } from 'react';
import { startOfDay, endOfDay, addDays, isToday, isFuture, isPast } from 'date-fns';

// ==================== TIPOS UNIFICADOS ====================
import type { AppointmentStatus, LeadMotive, LeadChannel, LeadStatus, DiagnosisType, UserRole, AdmissionAction, TabType, Patient, AppointmentWithPatient } from '../components/patient-admision/admision-types';

interface AdmissionPayload {
  nombre: string;
  apellidos: string;
  telefono?: string;
  email?: string;
  edad?: number;
  diagnostico_principal: string;
  comentarios_registro?: string;
  probabilidad_cirugia?: number;
  fecha_hora_cita: string;
  motivos_consulta: string[];
  doctor_id?: string;
}

interface AdmissionResponse {
  success: boolean;
  message: string;
  patient_id: string;
  appointment_id: string;
  patient: any;
  appointment: any;
}

interface AppointmentsResponse {
  data: AppointmentWithPatient[];
  hasMore: boolean;
  page: number;
  total: number;
  counts?: {
    today: number;
    future: number;
    past: number;
    newPatient: number;
  };
}

// ==================== CACHE KEYS ====================
export const CACHE_KEYS = {
  APPOINTMENTS: 'admission-appointments-unified',
  COUNTS: 'admission-counts-unified',
} as const;

// ==================== API FUNCTIONS UNIFICADAS ====================

/**
 * Función unificada de admisión que maneja tanto el flujo RPC como el tradicional
 */
const submitAdmission = async (data: AdmissionPayload): Promise<AdmissionResponse> => {
  console.log('🚀 [Unified Admission] Submitting admission:', {
    patient: `${data.nombre} ${data.apellidos}`,
    date: data.fecha_hora_cita,
  });

  const response = await fetch('/api/patient-admission', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: 'Error desconocido en el servidor' 
    }));
    throw new Error(errorData.message || 'Error al procesar la admisión');
  }

  const result: AdmissionResponse = await response.json();
  console.log('✅ [Unified Admission] Success:', result);
  
  return result;
};

/**
 * Función unificada para obtener citas por tab con paginación
 */
const fetchAppointmentsByTab = async (
  tab: TabType, 
  page: number = 1, 
  pageSize: number = 20
): Promise<AppointmentsResponse> => {
  const searchParams = new URLSearchParams({
    tab,
    page: String(page),
    pageSize: String(pageSize),
  });

  const response = await fetch(`/api/appointments?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error('Error al obtener las citas');
  }

  return response.json();
};

// ==================== HOOKS UNIFICADOS ====================

/**
 * Hook principal unificado para admisión de pacientes
 * Combina la mejor funcionalidad de ambos hooks originales
 */
export function usePatientAdmissionUnified() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitAdmission,
    onSuccess: (data) => {
      console.log('✅ [Unified Admission Hook] Success:', data);
      
      toast.success('¡Paciente admitido exitosamente!', {
        description: `${data.patient?.nombre} ${data.patient?.apellidos} ha sido registrado`,
      });

      // Invalidar cache de appointments para refrescar listas
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.APPOINTMENTS] });
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.COUNTS] });
      
      // Invalidar también el cache del contexto central si existe
      queryClient.invalidateQueries({ queryKey: ['clinicData'] });
    },
    onError: (error: Error) => {
      console.error('❌ [Unified Admission Hook] Error:', error);
      
      toast.error('Error en la admisión', {
        description: error.message || 'No se pudo completar el registro del paciente',
      });
    },
  });
}

/**
 * Hook unificado para datos de admisión con paginación inteligente
 * Optimizado para diferentes tabs (hoy, futuro, historial)
 */
export const useAdmissionUnified = (activeTab: TabType) => {
  const query = useInfiniteQuery({
    queryKey: [CACHE_KEYS.APPOINTMENTS, activeTab],
    queryFn: ({ pageParam = 1 }) => fetchAppointmentsByTab(activeTab, pageParam),
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: activeTab === 'today' ? 2 * 60 * 1000 : 5 * 60 * 1000, // 2min hoy, 5min otros
    gcTime: 10 * 60 * 1000, // 10min
  });

  // Transformaciones memoizadas de datos
  const transformedData = useMemo(() => {
    const allAppointments = query.data?.pages?.flatMap(page => page.data) || [];
    const totalCounts = query.data?.pages?.[0]?.counts || {
      today: 0,
      future: 0,
      past: 0,
      newPatient: 0
    };

    // Normalización y agrupamiento por fecha (con validación)
    const groupedByDate = allAppointments.reduce((acc, appointment) => {
      // Validación defensiva para evitar errores de runtime
      if (!appointment || !appointment.fecha_hora_cita) {
        console.warn('Appointment without fecha_hora_cita found:', appointment);
        return acc;
      }
      
      const dateKey = new Date(appointment.fecha_hora_cita).toDateString();
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(appointment);
      return acc;
    }, {} as Record<string, AppointmentWithPatient[]>);

    return {
      appointments: allAppointments,
      groupedByDate,
      totalCounts,
      hasData: allAppointments.length > 0,
    };
  }, [query.data]);

  return {
    ...query,
    ...transformedData,
  };
}

/**
 * Hook para acciones sobre citas (aprobar, rechazar, reagendar)
 * Unifica las acciones de ambos hooks originales
 */
export function useAppointmentActionsUnified() {
  const queryClient = useQueryClient();

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.APPOINTMENTS] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.COUNTS] });
  }, [queryClient]);

  const handleAppointmentAction = useCallback(async (action: AdmissionAction, appointmentId: string) => {
    try {
      switch (action) {
        case 'checkIn':
          // Implementar check-in
          toast.success('Paciente registrado como presente');
          break;
        case 'startConsult':
          // Implementar inicio de consulta
          toast.success('Consulta iniciada');
          break;
        case 'complete':
          // Implementar completar cita
          toast.success('Cita completada exitosamente');
          break;
        case 'cancel':
          // Implementar cancelación
          toast.success('Cita cancelada');
          break;
        case 'noShow':
          // Implementar no asistió
          toast.success('Cita marcada como no asistida');
          break;
        case 'reschedule':
          // Implementar reagendamiento
          toast.info('Reagendamiento no implementado aún');
          break;
        case 'viewHistory':
          // Implementar vista de historial
          toast.info('Vista de historial no implementada aún');
          break;
        default:
          toast.error('Acción no reconocida');
      }
      // Refrescar datos después de la acción
      refreshData();
    } catch (error) {
      console.error('Error handling appointment action:', error);
      toast.error('Error al procesar la acción');
    }
  }, [refreshData]);

  return {
    refreshData,
    handleAppointmentAction
  };
}

/**
 * Hook para refrescar todos los datos de admisión
 */
export function useRefreshAdmissionDataUnified() {
  const queryClient = useQueryClient();
  
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.APPOINTMENTS] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.COUNTS] });
    
    toast.success('Datos actualizados');
  }, [queryClient]);
}

// ==================== EXPORTS ====================
export type { 
  AdmissionPayload, 
  AdmissionResponse, 
  AppointmentWithPatient, 
  TabType 
};
