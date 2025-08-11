// hooks/use-unified-patient-data.ts - HOOK UNIFICADO PARA DATOS DE PACIENTES Y CITAS
import { useQuery } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { addDays } from 'date-fns';
import { queryKeys } from '@/lib/query-keys';
import type { Patient, Appointment, EnrichedPatient } from '@/lib/types';
import { toast } from 'sonner';

// ==================== TIPOS UNIFICADOS ====================
interface EnrichedAppointmentsResponse {
  data: Appointment[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  summary: {
    total_appointments: number;
    today_count: number;
    future_count: number;
    past_count: number;
  };
}

interface UnifiedPatientDataParams {
  // Parámetros para datos esenciales
  fetchEssentialData?: boolean;
  
  // Parámetros para paginación
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

interface UnifiedPatientDataResponse {
  // Datos esenciales
  allPatients: Patient[];
  allAppointments: Appointment[];
  enrichedPatients: EnrichedPatient[];
  appointmentsWithPatientData: Appointment[];
  appointmentsSummary: {
    total_appointments: number;
    today_count: number;
    future_count: number;
    past_count: number;
  };
  
  // Datos paginados
  paginatedPatients: Patient[];
  patientsPagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  patientsStats?: {
    totalPatients: number;
    surveyRate: number;
    pendingConsults: number;
    operatedPatients: number;
    statusStats: Record<string, number>;
  };
  
  // Estados
  isLoading: boolean;
  error: Error | null;
  
  // Funciones
  refetch: () => void;
  fetchSpecificAppointments: (filter: {
    dateFilter?: 'today' | 'future' | 'past';
    patientId?: string;
    search?: string;
    pageSize?: number;
    page?: number;
  }) => Promise<EnrichedAppointmentsResponse>;
}

// ==================== FUNCIONES DE FETCH ====================
/**
 * Obtiene citas por defecto (OPTIMIZADO): HOY y PRÓXIMOS 7 días
 */
const fetchAllAppointments = async (): Promise<EnrichedAppointmentsResponse> => {
  try {
    // ✅ Trae citas de HOY y los PRÓXIMOS 7 días para eficiencia real
    const today = new Date();
    const in7 = addDays(today, 7);
    const startDate = today.toISOString().split('T')[0];
    const endDate = in7.toISOString().split('T')[0];
    const response = await fetch(`/api/appointments?startDate=${startDate}&endDate=${endDate}&pageSize=100`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch appointments');
    }
    
    return response.json();
  } catch (error) {
    console.error('❌ Error fetching all appointments:', error);
    toast.error('Error al cargar las citas');
    throw error;
  }
};

/**
 * Obtiene pacientes activos recientes (no todos)
 */
const fetchActivePatients = async (): Promise<{ data: Patient[] }> => {
  try {
    // ✅ Solo trae pacientes activos recientes (máx. 50)
    const response = await fetch('/api/patients?estado=activo&pageSize=50');
    
    if (!response.ok) {
      throw new Error('Failed to fetch active patients');
    }
    
    return response.json();
  } catch (error) {
    console.error('❌ Error fetching active patients:', error);
    toast.error('Error al cargar pacientes activos');
    throw error;
  }
};

/**
 * Función para obtener datos específicos bajo demanda
 */
const fetchAppointmentsByFilter = async (filter: {
  dateFilter?: 'today' | 'future' | 'past';
  patientId?: string;
  search?: string;
  pageSize?: number;
  page?: number;
}): Promise<EnrichedAppointmentsResponse> => {
  try {
    const searchParams = new URLSearchParams();
    
    if (filter.dateFilter) searchParams.append('dateFilter', filter.dateFilter);
    if (filter.patientId) searchParams.append('patientId', filter.patientId);
    if (filter.search) searchParams.append('search', filter.search);
    if (filter.pageSize) searchParams.append('pageSize', String(filter.pageSize));
    if (filter.page) searchParams.append('page', String(filter.page));
    
    const response = await fetch(`/api/appointments?${searchParams.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch appointments by filter');
    }
    
    return response.json();
  } catch (error) {
    console.error('❌ Error fetching appointments by filter:', error);
    toast.error('Error al cargar citas filtradas');
    throw error;
  }
};

/**
 * Fetch de pacientes paginados con filtros avanzados
 */
const fetchPaginatedPatients = async (params: UnifiedPatientDataParams): Promise<{
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
}> => {
  try {
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
  } catch (error) {
    console.error('❌ Error fetching paginated patients:', error);
    toast.error('Error al cargar pacientes');
    throw error;
  }
};

// ==================== HOOK UNIFICADO ====================
/**
 * Hook unificado que combina la eficiencia de useClinicData con la paginación avanzada de usePaginatedPatients
 * Proporciona tanto datos esenciales como funcionalidad de paginación con filtros
 */
export const useUnifiedPatientData = (params: UnifiedPatientDataParams = {}): UnifiedPatientDataResponse => {
  // Valores por defecto
  const {
    fetchEssentialData = true,
    page = 1,
    pageSize = 15,
    search = '',
    status = 'all',
    startDate,
    endDate
  } = params;
  
  // ✅ Query para datos esenciales (pacientes activos recientes + todas las citas)
  const {
    data: essentialData,
    isLoading: isLoadingEssential,
    error: essentialError,
    refetch: refetchEssential,
  } = useQuery({
    // ✅ Unificación de query keys: usamos el sistema centralizado
    queryKey: queryKeys.clinic.data,
    queryFn: async () => {
      if (!fetchEssentialData) return null;

      const [patientsResponse, appointmentsResponse] = await Promise.all([
        fetchActivePatients(),
        fetchAllAppointments()
      ]);

      return {
        patients: patientsResponse.data,
        appointments: appointmentsResponse.data,
        summary: appointmentsResponse.summary
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    enabled: fetchEssentialData
  });
  
  // Query para pacientes paginados con filtros avanzados
  const {
    data: paginatedResponse,
    isLoading: isLoadingPaginated,
    error: paginatedError,
    refetch: refetchPaginated
  } = useQuery({
    // ✅ Query key centralizada y estable para paginación/filters
    queryKey: queryKeys.patients.paginated({ page, pageSize, search, status, startDate, endDate }),
    queryFn: () => fetchPaginatedPatients({ page, pageSize, search, status, startDate, endDate }),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
  
  // Función para fetch bajo demanda
  const fetchSpecificAppointments = useCallback(fetchAppointmentsByFilter, []);
  
  // Memoización de pacientes enriquecidos
  const enrichedPatients = useMemo(() => {
    if (!essentialData?.patients) return [];
    
    // ✅ Enriquecer pacientes con datos médicos (todo en backend)
    return essentialData.patients.map((patient: Patient) => ({
      ...patient,
      // Datos médicos ya enriquecidos desde el backend
    })) as EnrichedPatient[];
  }, [essentialData?.patients]);
  
  // Memoización de citas con datos de pacientes
  const appointmentsWithPatientData = useMemo(() => {
    if (!essentialData?.appointments || !essentialData?.patients) return [];
    
    // ✅ Asociar citas con pacientes enriquecidos (todo en backend)
    return essentialData.appointments.map((appointment: Appointment) => {
      const patient = essentialData.patients.find((p: Patient) => p.id === appointment.patient_id);
      return {
        ...appointment,
        patient: patient || null,
      };
    });
  }, [essentialData]);
  
  // Combinar estados de carga y error
  const isLoading = isLoadingEssential || isLoadingPaginated;
  const error = essentialError || paginatedError;
  
  // Función de refetch unificada
  const refetch = useCallback(() => {
    refetchEssential();
    refetchPaginated();
  }, [refetchEssential, refetchPaginated]);
  
  return {
    // Datos esenciales
    allPatients: essentialData?.patients || [],
    allAppointments: essentialData?.appointments || [],
    enrichedPatients,
    appointmentsWithPatientData,
    appointmentsSummary: essentialData?.summary || {
      total_appointments: 0,
      today_count: 0,
      future_count: 0,
      past_count: 0
    },
    
    // Datos paginados
    paginatedPatients: paginatedResponse?.data || [],
    patientsPagination: paginatedResponse?.pagination || {
      page: 1,
      pageSize,
      totalCount: 0,
      totalPages: 1,
      hasMore: false
    },
    patientsStats: paginatedResponse?.stats,
    
    // Estados
    isLoading,
    error: error ? (error as Error) : null,
    
    // Funciones
    refetch,
    fetchSpecificAppointments
  };
};
