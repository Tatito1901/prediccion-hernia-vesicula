// hooks/use-clinic-data.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { Patient, Appointment, EnrichedPatient, PatientSurvey } from '@/lib/types';
import { toast } from 'sonner';

// Tipo intermedio que extiende Patient con la propiedad encuesta opcional
type PatientWithSurvey = Patient & {
  encuesta?: PatientSurvey | null;
};

// ==================== TIPOS ====================
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ==================== FUNCIONES DE FETCH ====================
/**
 * Obtiene datos paginados de un recurso específico.
 */
const fetchPaginatedData = async ({ 
  pageParam = 1, 
  resource 
}: { 
  pageParam: number; 
  resource: 'patients' | 'appointments'; 
}): Promise<PaginatedResponse<Patient | Appointment>> => {
  try {
    const response = await fetch(`/api/${resource}?page=${pageParam}&pageSize=100`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${resource}`);
    }
    
    return response.json();
  } catch (error) {
    toast.error(`Error al cargar ${resource}`, {
      description: `No se pudieron cargar los datos de ${resource}. Por favor, intente nuevamente.`,
    });
    throw error;
  }
};

// ==================== HOOK PRINCIPAL ====================
/**
 * Hook centralizado que actúa como la única fuente de verdad para los datos
 * de pacientes y citas en toda la aplicación.
 */
export const useClinicData = () => {
  // Configuración de paginación infinita para pacientes
  const {
    data: patientsData,
    fetchNextPage: fetchNextPatientPage,
    hasNextPage: hasNextPatientPage,
    isLoading: isLoadingPatients,
    error: patientsError,
    refetch: refetchPatients,
  } = useInfiniteQuery({
    queryKey: ['clinicData', 'patients'],
    queryFn: ({ pageParam }) => fetchPaginatedData({ pageParam, resource: 'patients' }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    staleTime: 5 * 60 * 1000, // 5 minutos de caché
    refetchOnWindowFocus: true,
  });

  // Configuración de paginación infinita para citas
  const {
    data: appointmentsData,
    fetchNextPage: fetchNextAppointmentPage,
    hasNextPage: hasNextAppointmentPage,
    isLoading: isLoadingAppointments,
    error: appointmentsError,
    refetch: refetchAppointments,
  } = useInfiniteQuery({
    queryKey: ['clinicData', 'appointments'],
    queryFn: ({ pageParam }) => fetchPaginatedData({ pageParam, resource: 'appointments' }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    staleTime: 5 * 60 * 1000, // 5 minutos de caché
    refetchOnWindowFocus: true,
  });

  // Aplanar los datos de las páginas
  const allPatients = useMemo(() => 
    patientsData?.pages.flatMap(page => page.data as PatientWithSurvey[]) ?? [], 
    [patientsData]
  );
  
  const allAppointments = useMemo(() => 
    appointmentsData?.pages.flatMap(page => page.data as Appointment[]) ?? [], 
    [appointmentsData]
  );

  const enrichedData = useMemo(() => {
    if (!allPatients.length) {
      return {
        enrichedPatients: [],
        appointmentsWithPatientData: [],
      };
    }

    const appointmentsByPatientId = new Map<string, Appointment[]>();
    if (allAppointments) {
      for (const app of allAppointments) {
        if (!app.patient_id) continue;
        if (!appointmentsByPatientId.has(app.patient_id)) {
          appointmentsByPatientId.set(app.patient_id, []);
        }
        appointmentsByPatientId.get(app.patient_id)!.push(app);
      }
    }

    const appointmentsWithPatientData = allAppointments.map((app: Appointment) => ({
      ...app,
      paciente: allPatients.find(p => p.id === app.patient_id) || null
    }));

    const enrichedPatients: EnrichedPatient[] = allPatients.map((patient: PatientWithSurvey) => {
        const patientAppointments = appointmentsByPatientId.get(patient.id) || [];
        patientAppointments.sort((a, b) => {
            const dateA = a.fecha_hora_cita ? new Date(a.fecha_hora_cita).getTime() : 0;
            const dateB = b.fecha_hora_cita ? new Date(b.fecha_hora_cita).getTime() : 0;
            return dateB - dateA; // Sort descending to find the latest
        });

        const nextAppointment = patientAppointments.find(
            appointment => new Date(appointment.fecha_hora_cita!) >= new Date()
        );

        return {
            ...patient,
            nombreCompleto: `${patient.nombre || ''} ${patient.apellidos || ''}`.trim(),
            displayDiagnostico: patient.diagnostico_principal || 'Sin diagnóstico',
            encuesta_completada: !!patient.encuesta,
            encuesta: patient.encuesta || null,
            fecha_proxima_cita_iso: nextAppointment?.fecha_hora_cita,
            totalCitas: patientAppointments.length,
        };
    });

    return { enrichedPatients, appointmentsWithPatientData };
  }, [allPatients, allAppointments]);

  return {
    isLoading: isLoadingPatients || isLoadingAppointments,
    error: patientsError || appointmentsError,
    refetch: () => { 
      refetchPatients(); 
      refetchAppointments(); 
    },
    allPatients,
    allAppointments,
    // Funciones de paginación infinita
    fetchNextPatientPage,
    hasNextPatientPage,
    fetchNextAppointmentPage,
    hasNextAppointmentPage,
    ...enrichedData,
  };
};
