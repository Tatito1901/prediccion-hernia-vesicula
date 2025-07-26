// hooks/use-patient-admission-optimized.ts
// HOOK OPTIMIZADO PARA MANEJAR ADMISIÓN DE PACIENTES CON CACHE INTELIGENTE

import { useMutation, useQueryClient, useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCallback, useMemo } from 'react';
import { startOfDay, endOfDay, addDays, isToday, isFuture, isPast } from 'date-fns';

// ==================== TIPOS ====================
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
  motivo_cita: string;
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

interface AppointmentWithPatient {
  id: string;
  patient_id: string;
  fecha_hora_cita: string;
  motivo_cita: string;
  estado_cita: string;
  es_primera_vez?: boolean;
  notas_cita_seguimiento?: string;
  patients: {
    id: string;
    nombre?: string;
    apellidos?: string;
    telefono?: string;
    email?: string;
    edad?: number;
  };
}

type TabType = 'newPatient' | 'today' | 'future' | 'past';

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
  APPOINTMENTS: 'admission-appointments',
  COUNTS: 'admission-counts',
  PATIENTS: 'patients',
} as const;

// ==================== API FUNCTIONS ====================
const submitAdmission = async (data: AdmissionPayload): Promise<AdmissionResponse> => {
  console.log('🚀 [Admission Hook] Submitting admission:', {
    patient: `${data.nombre} ${data.apellidos}`,
    date: data.fecha_hora_cita,
  });

  const response = await fetch('/api/patient-admission', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    if (response.status === 409) {
      throw new Error(errorData.error || 'Conflicto detectado');
    }
    
    if (response.status === 400) {
      throw new Error(errorData.error || 'Datos inválidos');
    }
    
    throw new Error(errorData.error || `Error ${response.status}: No se pudo crear el paciente`);
  }

  const result = await response.json();
  
  if (!result.patient_id || !result.appointment_id) {
    throw new Error('Respuesta inválida del servidor');
  }

  return result;
};

const fetchAppointmentsByTab = async (
  tab: TabType, 
  page: number = 1, 
  pageSize: number = 20
): Promise<AppointmentsResponse> => {
  if (tab === 'newPatient') {
    return {
      data: [],
      hasMore: false,
      page: 1,
      total: 0,
      counts: { today: 0, future: 0, past: 0, newPatient: 0 }
    };
  }

  const params = new URLSearchParams({
    tab,
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  const response = await fetch(`/api/admission/appointments?${params}`);
  
  if (!response.ok) {
    throw new Error('Error al cargar citas');
  }

  return response.json();
};

// ==================== HOOK PRINCIPAL PARA ADMISIÓN ====================
export const usePatientAdmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitAdmission,
    
    onMutate: async () => {
      console.log('🔄 [Admission Hook] Starting admission mutation...');
    },

    onSuccess: async (data, variables) => {
      console.log('✅ [Admission Hook] Admission successful:', {
        patientId: data.patient_id,
        appointmentId: data.appointment_id,
      });

      // ✅ INVALIDAR CACHÉS DE FORMA INTELIGENTE
      const appointmentDate = new Date(variables.fecha_hora_cita);
      const affectedTabs: TabType[] = [];

      if (isToday(appointmentDate)) {
        affectedTabs.push('today');
      } else if (isFuture(appointmentDate)) {
        affectedTabs.push('future');
      }

      // Invalidar tabs afectados
      const invalidationPromises = affectedTabs.map(tab => 
        queryClient.invalidateQueries({ 
          queryKey: [CACHE_KEYS.APPOINTMENTS, tab] 
        })
      );

      // Invalidar contadores siempre
      invalidationPromises.push(
        queryClient.invalidateQueries({ 
          queryKey: [CACHE_KEYS.COUNTS] 
        })
      );

      await Promise.all(invalidationPromises);

      // ✅ REFRESCAR INMEDIATAMENTE LA TAB PRINCIPAL
      if (affectedTabs.length > 0) {
        await queryClient.refetchQueries({ 
          queryKey: [CACHE_KEYS.APPOINTMENTS, affectedTabs[0]] 
        });
      }

      // ✅ MOSTRAR TOAST DE ÉXITO
      toast.success('¡Paciente registrado exitosamente!', {
        description: `${data.patient.nombre} ${data.patient.apellidos} ha sido admitido y su cita ha sido programada.`,
        duration: 5000,
      });
    },

    onError: (error: Error) => {
      console.error('❌ [Admission Hook] Admission failed:', error.message);
      
      toast.error('Error al registrar paciente', {
        description: error.message,
        duration: 6000,
      });
    },

    retry: (failureCount, error) => {
      if (error.message.includes('Conflicto') || error.message.includes('inválidos')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

// ==================== HOOK OPTIMIZADO PARA DATOS DE ADMISIÓN ====================
export const useAdmissionData = (activeTab: TabType) => {
  const queryClient = useQueryClient();

  // ✅ QUERY INFINITA ESPECÍFICA POR TAB
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error,
    refetch
  } = useInfiniteQuery<
    AppointmentsResponse, 
    Error, 
    InfiniteData<AppointmentsResponse>
  >({
    queryKey: [CACHE_KEYS.APPOINTMENTS, activeTab],
    queryFn: ({ pageParam = 1 }) => fetchAppointmentsByTab(activeTab, pageParam as number, 20),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000, // 2 minutos cache
    gcTime: 5 * 60 * 1000, // 5 minutos en memoria (anteriormente cacheTime)
    enabled: true,
    refetchOnWindowFocus: true,
  });

  // ✅ DATOS MEMOIZADOS EFICIENTEMENTE
  const appointments = useMemo(() => 
    data?.pages.flatMap(page => page.data) ?? [], 
    [data]
  );

  const counts = useMemo(() => 
    data?.pages[0]?.counts ?? { today: 0, future: 0, past: 0, newPatient: 0 },
    [data]
  );

  // ✅ INVALIDACIÓN ESPECÍFICA
  const invalidateSpecific = useCallback((affectedTabs: TabType[]) => {
    affectedTabs.forEach(tab => {
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.APPOINTMENTS, tab] });
    });
  }, [queryClient]);

  // ✅ REFRESH OPTIMIZADO
  const refresh = useCallback(() => {
    return queryClient.refetchQueries({ queryKey: [CACHE_KEYS.APPOINTMENTS, activeTab] });
  }, [queryClient, activeTab]);

  return {
    // Datos
    appointments,
    counts,
    
    // Estados
    isLoading,
    isLoadingMore: isFetchingNextPage,
    hasMore: hasNextPage,
    isError: !!error,
    error,
    
    // Acciones
    loadMore: fetchNextPage,
    refresh,
    invalidateSpecific,
  };
};

// ==================== HOOK PARA ACCIONES DE CITAS ====================
export const useAppointmentActions = () => {
  const queryClient = useQueryClient();

  const updateAppointmentStatus = async (params: {
    appointmentId: string;
    newStatus: string;
    motivo_cambio?: string;
    fecha_hora_cita?: string;
    notas_adicionales?: string;
  }) => {
    const response = await fetch(`/api/appointments/${params.appointmentId}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        estado_cita: params.newStatus,
        motivo_cambio: params.motivo_cambio,
        fecha_hora_cita: params.fecha_hora_cita,
        notas_adicionales: params.notas_adicionales
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error al actualizar estado a ${params.newStatus}`);
    }

    return response.json();
  };

  return useMutation({
    mutationFn: updateAppointmentStatus,
    onSuccess: async () => {
      // ✅ Invalidar todas las tabs de citas
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.APPOINTMENTS] }),
        queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.COUNTS] }),
      ]);

      toast.success('Estado de cita actualizado');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar cita', {
        description: error.message,
      });
    },
  });
};

// ==================== HOOK PARA REFRESCAR TODOS LOS DATOS ====================
export const useRefreshAdmissionData = () => {
  const queryClient = useQueryClient();

  return {
    refreshAll: async () => {
      console.log('🔄 [Admission Hook] Refreshing all admission data...');
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.APPOINTMENTS] }),
        queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.COUNTS] }),
        queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.PATIENTS] }),
      ]);
    },

    refreshAppointments: async () => {
      await queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.APPOINTMENTS] });
    },

    refreshCounts: async () => {
      await queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.COUNTS] });
    },
  };
};