// hooks/use-clinic-data.ts
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { Patient, Appointment, EnrichedPatient } from '@/lib/types';
import { toast } from 'sonner';

// ==================== TIPOS ====================
interface ClinicData {
  patients: Patient[];
  appointments: Appointment[];
}

// ==================== FUNCIONES DE FETCH ====================
/**
 * Obtiene todos los datos de la clínica (pacientes y citas) en una sola operación.
 */
const fetchClinicData = async (): Promise<ClinicData> => {
  try {
    // Usamos Promise.all para realizar las peticiones en paralelo
    const [patientsResponse, appointmentsResponse] = await Promise.all([
      fetch('/api/patients?pageSize=1000'), // Ajustar pageSize si esperas más de 1000 pacientes
      fetch('/api/appointments?pageSize=1000') // Ajustar pageSize si esperas más de 1000 citas
    ]);

    if (!patientsResponse.ok || !appointmentsResponse.ok) {
      throw new Error('No se pudieron obtener los datos de la clínica.');
    }

    const patientsData = await patientsResponse.json();
    const appointmentsData = await appointmentsResponse.json();

    return {
      patients: patientsData.data || [],
      appointments: appointmentsData.data || [],
    };
  } catch (error) {
    toast.error("Error Crítico de Datos", {
      description: "No se pudieron cargar los datos esenciales de la clínica. Por favor, recargue la página.",
    });
    // Devolvemos un estado vacío en caso de error para no romper la app
    return { patients: [], appointments: [] };
  }
};

// ==================== HOOK PRINCIPAL ====================
/**
 * Hook centralizado que actúa como la única fuente de verdad para los datos
 * de pacientes y citas en toda la aplicación.
 */
export const useClinicData = () => {
  const { data, isLoading, error, refetch } = useQuery<ClinicData>({
    queryKey: ['clinicData'], // Una única query key para toda la data
    queryFn: fetchClinicData,
    staleTime: 5 * 60 * 1000, // 5 minutos de caché
    refetchOnWindowFocus: true, // Refresca al volver a la pestaña
    refetchInterval: 15 * 60 * 1000, // Refresca cada 15 minutos en segundo plano
  });

  /**
   * Memoizamos el procesamiento de datos para que solo se ejecute cuando los datos crudos cambien.
   * Esto es crucial para el rendimiento.
   */
  const enrichedData = useMemo(() => {
    if (!data || !data.patients.length) {
      return {
        enrichedPatients: [],
        appointmentsWithPatientData: [],
      };
    }

    // Creamos un mapa para un acceso rápido a los pacientes por ID
    const patientsMap = new Map(data.patients.map(p => [p.id, p]));

    const appointmentsWithPatientData = data.appointments.map(app => ({
      ...app,
      paciente: patientsMap.get(app.patient_id) || null
    }));

    const enrichedPatients: EnrichedPatient[] = data.patients.map(patient => ({
      ...patient,
      nombreCompleto: `${patient.nombre || ''} ${patient.apellidos || ''}`.trim(),
      displayDiagnostico: patient.diagnostico_principal || 'Sin diagnóstico',
      encuesta_completada: !!(patient as any).encuesta, // Asumimos que 'encuesta' es un campo que puede o no existir
      encuesta: (patient as any).encuesta || null,
      // Aquí podrías agregar más datos enriquecidos, como el número de citas
      totalCitas: data.appointments.filter(a => a.patient_id === patient.id).length,
    }));

    return { enrichedPatients, appointmentsWithPatientData };
  }, [data]);

  return {
    isLoading,
    error,
    refetch,
    allPatients: data?.patients || [],
    allAppointments: data?.appointments || [],
    ...enrichedData,
  };
};
