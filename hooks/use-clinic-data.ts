// hooks/use-clinic-data.ts - REFACTORED TO USE ENRICHED BACKEND DATA
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
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

// ==================== FUNCIONES DE FETCH OPTIMIZADAS ====================
/**
 * Obtiene citas enriquecidas usando la nueva función RPC
 */
const fetchEnrichedAppointments = async (): Promise<EnrichedAppointmentsResponse> => {
  try {
    const response = await fetch('/api/appointments?pageSize=100');
    
    if (!response.ok) {
      throw new Error('Failed to fetch enriched appointments');
    }
    
    return response.json();
  } catch (error) {
    toast.error('Error al cargar citas', {
      description: 'No se pudieron cargar las citas enriquecidas. Por favor, intente nuevamente.',
    });
    throw error;
  }
};

/**
 * Obtiene pacientes usando la API optimizada
 */
const fetchPatients = async (): Promise<PaginatedPatientsResponse> => {
  try {
    const response = await fetch('/api/patients?pageSize=100');
    
    if (!response.ok) {
      throw new Error('Failed to fetch patients');
    }
    
    return response.json();
  } catch (error) {
    toast.error('Error al cargar pacientes', {
      description: 'No se pudieron cargar los pacientes. Por favor, intente nuevamente.',
    });
    throw error;
  }
};

// ==================== HOOK PRINCIPAL OPTIMIZADO ====================
/**
 * Hook centralizado refactorizado que consume datos ya enriquecidos del backend.
 * Elimina el enriquecimiento en el cliente para mejorar performance y escalabilidad.
 */
export const useClinicData = () => {
  // Query optimizada para citas enriquecidas
  const {
    data: appointmentsResponse,
    isLoading: isLoadingAppointments,
    error: appointmentsError,
    refetch: refetchAppointments,
  } = useQuery({
    queryKey: ['clinicData', 'enrichedAppointments'],
    queryFn: fetchEnrichedAppointments,
    staleTime: 3 * 60 * 1000, // 3 minutos de caché
    refetchOnWindowFocus: true,
  });

  // Query optimizada para pacientes
  const {
    data: patientsResponse,
    isLoading: isLoadingPatients,
    error: patientsError,
    refetch: refetchPatients,
  } = useQuery({
    queryKey: ['clinicData', 'patients'],
    queryFn: fetchPatients,
    staleTime: 5 * 60 * 1000, // 5 minutos de caché
    refetchOnWindowFocus: true,
  });

  // Extraer datos de las respuestas
  const allAppointments = useMemo(() => 
    appointmentsResponse?.data ?? [], 
    [appointmentsResponse]
  );
  
  const allPatients = useMemo(() => 
    patientsResponse?.data ?? [], 
    [patientsResponse]
  );

  // Estadísticas de citas ya calculadas en el backend
  const appointmentsSummary = useMemo(() => 
    appointmentsResponse?.summary ?? {
      total_appointments: 0,
      today_count: 0,
      future_count: 0,
      past_count: 0
    }, 
    [appointmentsResponse]
  );

  // Crear pacientes enriquecidos simples (sin lógica compleja en el cliente)
  const enrichedPatients = useMemo(() => 
    allPatients.map((patient: Patient): EnrichedPatient => ({
      ...patient,
      nombreCompleto: `${patient.nombre || ''} ${patient.apellidos || ''}`.trim(),
      displayDiagnostico: patient.diagnostico_principal || 'Sin diagnóstico',
      encuesta_completada: false, // Se calculará en el backend si es necesario
      encuesta: null, // Se calculará en el backend si es necesario
      fecha_proxima_cita_iso: undefined, // Se calculará en el backend si es necesario
    })), 
    [allPatients]
  );

  // Los appointmentsWithPatientData ya vienen enriquecidos del backend
  const appointmentsWithPatientData = useMemo(() => 
    allAppointments, 
    [allAppointments]
  );

  return {
    isLoading: isLoadingPatients || isLoadingAppointments,
    error: patientsError || appointmentsError,
    refetch: () => { 
      refetchPatients(); 
      refetchAppointments(); 
    },
    allPatients,
    allAppointments,
    enrichedPatients,
    appointmentsWithPatientData,
    appointmentsSummary,
  };
};
