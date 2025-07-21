// hooks/use-clinic-data.ts - REFACTORED TO USE ENRICHED BACKEND DATA
import { useQuery } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import type { Patient, Appointment, EnrichedPatient } from '@/lib/types';
import { toast } from 'sonner';

// ==================== TIPOS OPTIMIZADOS ====================
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

interface PaginatedPatientsResponse {
  data: Patient[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ==================== FUNCIONES DE FETCH INTELIGENTES ====================
/**
 * Obtiene solo las citas relevantes usando filtros inteligentes
 */
const fetchTodayAppointments = async (): Promise<EnrichedAppointmentsResponse> => {
  try {
    // ✅ Solo trae citas de HOY (mucho más eficiente)
    const response = await fetch('/api/appointments?dateFilter=today&pageSize=50');
    
    if (!response.ok) {
      throw new Error('Failed to fetch today appointments');
    }
    
    return response.json();
  } catch (error) {
    toast.error('Error al cargar citas de hoy', {
      description: 'No se pudieron cargar las citas de hoy. Por favor, intente nuevamente.',
    });
    throw error;
  }
};

/**
 * Obtiene pacientes activos recientes (no todos)
 */
const fetchActivePatients = async (): Promise<PaginatedPatientsResponse> => {
  try {
    // ✅ Solo trae pacientes activos recientes (mucho más eficiente)
    const response = await fetch('/api/patients?estado=ACTIVO&pageSize=50');
    
    if (!response.ok) {
      throw new Error('Failed to fetch active patients');
    }
    
    return response.json();
  } catch (error) {
    toast.error('Error al cargar pacientes activos', {
      description: 'No se pudieron cargar los pacientes activos. Por favor, intente nuevamente.',
    });
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
}): Promise<EnrichedAppointmentsResponse> => {
  try {
    const params = new URLSearchParams();
    if (filter.dateFilter) params.append('dateFilter', filter.dateFilter);
    if (filter.patientId) params.append('patientId', filter.patientId);
    if (filter.search) params.append('search', filter.search);
    params.append('pageSize', String(filter.pageSize || 20));
    
    const response = await fetch(`/api/appointments?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch filtered appointments');
    }
    
    return response.json();
  } catch (error) {
    toast.error('Error al cargar citas filtradas');
    throw error;
  }
};

// ==================== HOOK PRINCIPAL INTELIGENTE ====================
/**
 * Hook centralizado verdaderamente eficiente que solo trae datos esenciales.
 * Usa filtros inteligentes y fetch bajo demanda para máxima escalabilidad.
 */
export const useClinicData = () => {
  // ✅ Solo citas de HOY por defecto (mucho más eficiente)
  const {
    data: todayAppointmentsResponse,
    isLoading: isLoadingTodayAppointments,
    error: todayAppointmentsError,
    refetch: refetchTodayAppointments,
  } = useQuery({
    queryKey: ['clinicData', 'todayAppointments'],
    queryFn: fetchTodayAppointments,
    staleTime: 2 * 60 * 1000, // 2 minutos de caché (más frecuente para citas de hoy)
    refetchOnWindowFocus: true,
  });

  // ✅ Solo pacientes activos recientes (mucho más eficiente)
  const {
    data: activePatientsResponse,
    isLoading: isLoadingActivePatients,
    error: activePatientsError,
    refetch: refetchActivePatients,
  } = useQuery({
    queryKey: ['clinicData', 'activePatients'],
    queryFn: fetchActivePatients,
    staleTime: 5 * 60 * 1000, // 5 minutos de caché
    refetchOnWindowFocus: true,
  });

  // Extraer datos esenciales
  const todayAppointments = useMemo(() => 
    todayAppointmentsResponse?.data ?? [], 
    [todayAppointmentsResponse]
  );
  
  const activePatients = useMemo(() => 
    activePatientsResponse?.data ?? [], 
    [activePatientsResponse]
  );

  // Estadísticas de citas de hoy
  const appointmentsSummary = useMemo(() => 
    todayAppointmentsResponse?.summary ?? {}, 
    [todayAppointmentsResponse]
  );

  // ✅ Función para obtener datos específicos bajo demanda
  const fetchSpecificAppointments = useCallback(async (filter: {
    dateFilter?: 'today' | 'future' | 'past';
    patientId?: string;
    search?: string;
    pageSize?: number;
  }) => {
    return await fetchAppointmentsByFilter(filter);
  }, []);

  // Crear pacientes enriquecidos simples (sin lógica compleja en el cliente)
  const enrichedPatients = useMemo(() => 
    activePatients.map((patient: Patient): EnrichedPatient => ({
      ...patient,
      nombreCompleto: `${patient.nombre || ''} ${patient.apellidos || ''}`.trim(),
      displayDiagnostico: patient.diagnostico_principal || 'Sin diagnóstico',
      encuesta_completada: false, // Se calculará en el backend si es necesario
      encuesta: null, // Se calculará en el backend si es necesario
      fecha_proxima_cita_iso: undefined, // Se calculará en el backend si es necesario
    })), 
    [activePatients]
  );

  // Los appointmentsWithPatientData ya vienen enriquecidos del backend
  const appointmentsWithPatientData = useMemo(() => 
    todayAppointments, 
    [todayAppointments]
  );

  return {
    // Estados de carga y error actualizados
    isLoading: isLoadingActivePatients || isLoadingTodayAppointments,
    error: activePatientsError || todayAppointmentsError,
    refetch: () => { 
      refetchActivePatients(); 
      refetchTodayAppointments(); 
    },
    
    // ✅ Datos esenciales (solo lo necesario)
    allPatients: activePatients, // Solo pacientes activos
    allAppointments: todayAppointments, // Solo citas de hoy
    enrichedPatients,
    appointmentsWithPatientData,
    appointmentsSummary,
    
    // ✅ Función para fetch bajo demanda
    fetchSpecificAppointments,
  };
};
