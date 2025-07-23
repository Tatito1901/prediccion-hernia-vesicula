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
 * Obtiene todas las citas para organizar por fechas en admisión
 */
const fetchAllAppointments = async (): Promise<EnrichedAppointmentsResponse> => {
  try {
    // ✅ Trae todas las citas para organizar por fechas (hoy, futuras, historial)
    const response = await fetch('/api/appointments?pageSize=100');
    
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
    // ✅ Trae pacientes relevantes para admisión (CONSULTADO + PENDIENTE DE CONSULTA)
    const response = await fetch('/api/patients?pageSize=50'); // Sin filtro de estado para incluir todos
    
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
  // ✅ Todas las citas para organizar por fechas
  const {
    data: allAppointmentsResponse,
    isLoading: isLoadingAllAppointments,
    error: allAppointmentsError,
    refetch: refetchAllAppointments,
  } = useQuery({
    queryKey: ['clinicData', 'allAppointments'],
    queryFn: fetchAllAppointments,
    staleTime: 2 * 60 * 1000, // 2 minutos de caché
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

  // ✅ SOLUCIÓN SIMPLIFICADA: Usar los datos directamente sin transformación excesiva
  const allAppointments = useMemo(() => {
    let appointments: any[] = [];
    
    // Manejar tanto array directo como objeto con data
    if (Array.isArray(allAppointmentsResponse)) {
      appointments = allAppointmentsResponse;
    } else if (allAppointmentsResponse?.data && Array.isArray(allAppointmentsResponse.data)) {
      appointments = allAppointmentsResponse.data;
    }
    
    console.log('🔍 Citas procesadas directamente:', {
      count: appointments.length
    });
    
    return appointments;
  }, [allAppointmentsResponse]);
  
  const activePatients = useMemo(() => 
    activePatientsResponse?.data ?? [], 
    [activePatientsResponse]
  );

  // Resumen de citas (si existe)
  const appointmentsSummary = useMemo(() => 
    allAppointmentsResponse?.summary ?? {}, 
    [allAppointmentsResponse]
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
    allAppointments.map(appointment => ({
      ...appointment,
      // Asegurar acceso directo a los datos del paciente
      paciente: appointment.patients // Alias para compatibilidad con componentes UI
    })), 
    [allAppointments]
  );

  return {
    // Estados de carga y error actualizados
    isLoading: isLoadingActivePatients || isLoadingAllAppointments,
    error: activePatientsError || allAppointmentsError,
    refetch: () => { 
      refetchActivePatients(); 
      refetchAllAppointments(); 
    },
    
    // ✅ Datos esenciales (todas las citas para organizar por fechas)
    allPatients: activePatients, // Todos los pacientes
    allAppointments: allAppointments, // Todas las citas
    enrichedPatients,
    appointmentsWithPatientData,
    appointmentsSummary,
    
    // ✅ Función para fetch bajo demanda
    fetchSpecificAppointments,
  };
};
