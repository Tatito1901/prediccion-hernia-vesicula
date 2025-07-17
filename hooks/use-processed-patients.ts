// hooks/use-processed-patients.ts

import { useMemo } from "react";
// Importamos los tipos centralizados, incluyendo nuestro nuevo tipo EnrichedPatient
import { 
  Patient, 
  Appointment, 
  PatientStatusEnum, 
  EnrichedPatient, // <-- Se importa el nuevo tipo desde la fuente de verdad.
  StatusStats
} from "@/lib/types";
// Ya no se necesita el tipo local de 'patient-management'

const STATUS_CONFIG = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: { label: "Pend. Consulta" },
  [PatientStatusEnum.CONSULTADO]: { label: "Consultado" },
  [PatientStatusEnum.EN_SEGUIMIENTO]: { label: "Seguimiento" },
  [PatientStatusEnum.OPERADO]: { label: "Operado" },
  [PatientStatusEnum.NO_OPERADO]: { label: "No Operado" },
  [PatientStatusEnum.INDECISO]: { label: "Indeciso" }
};

/**
 * Hook que toma listas de pacientes y citas, y las enriquece con datos calculados
 * para su uso en la interfaz de usuario. También maneja el filtrado y las estadísticas.
 */
export const useProcessedPatients = (
  patients: Patient[], // El hook recibe el tipo base 'Patient'
  appointments: Appointment[],
  searchTerm: string,
  statusFilter: keyof typeof PatientStatusEnum | "all"
) => {
  // Memoización del enriquecimiento de datos.
  // Ahora declara explícitamente que devuelve un array de EnrichedPatient.
  const enrichedPatients = useMemo((): EnrichedPatient[] => {
    if (!patients) return [];

    const appointmentsByPatientId = new Map<string, Appointment[]>();
    if (appointments) {
      for (const app of appointments) {
        if (!app.patient_id) continue;
        
        if (!appointmentsByPatientId.has(app.patient_id)) {
          appointmentsByPatientId.set(app.patient_id, []);
        }
        appointmentsByPatientId.get(app.patient_id)!.push(app);
      }
    }

    // El .map ahora está tipado para devolver un objeto EnrichedPatient.
    return patients.map((patient: Patient): EnrichedPatient => {
      const patientAppointments = appointmentsByPatientId.get(patient.id) || [];
      patientAppointments.sort((a, b) => {
        const dateA = a.fecha_hora_cita ? new Date(a.fecha_hora_cita).getTime() : 0;
        const dateB = b.fecha_hora_cita ? new Date(b.fecha_hora_cita).getTime() : 0;
        return dateA - dateB;
      });

      const nextAppointment = patientAppointments.find(
        appointment => {
          if (!appointment.fecha_hora_cita) return false;
          return new Date(appointment.fecha_hora_cita) >= new Date();
        }
      );

      // --- CORRECCIÓN DE TIPO ---
      // Se asume que el proceso que añade 'encuesta' al objeto 'patient' ocurre ANTES de llamar a este hook.
      // Esta es la forma segura de manejar esa propiedad potencialmente inexistente.
      const encuestaData = (patient as any).encuesta || null;

      // Se construye un nuevo objeto que CUMPLE con la interfaz EnrichedPatient.
      // Ya no es necesario forzar el tipo con `as EnrichedPatient` al final.
      return {
        ...patient,
        nombreCompleto: `${patient.nombre || ''} ${patient.apellidos || ''}`.trim(),
        fecha_proxima_cita_iso: nextAppointment?.fecha_hora_cita?.toString(),
        encuesta_completada: !!(encuestaData && encuestaData.id),
        encuesta: encuestaData,
        displayDiagnostico: patient.diagnostico_principal || "Sin diagnóstico",
      };
    });
  }, [patients, appointments]);

  // Memoización para el cálculo de estadísticas, depende solo de la lista completa.
  const statusStats = useMemo((): StatusStats => {
    const initialStats = Object.values(PatientStatusEnum).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<string, number>);

    const stats = enrichedPatients.reduce((acc, patient) => {
      if (patient.estado_paciente && patient.estado_paciente in acc) {
        acc[patient.estado_paciente]++;
      }
      return acc;
    }, initialStats);

    return { ...stats, all: enrichedPatients.length } as StatusStats;
  }, [enrichedPatients]);

  // Memoización para el filtrado, depende de la lista y los filtros.
  const filteredAndEnrichedPatients = useMemo(() => {
    let currentViewPatients: EnrichedPatient[] = enrichedPatients;
    const term = (searchTerm || '').toLowerCase();

    if (term) {
      currentViewPatients = currentViewPatients.filter(p =>
        p.nombreCompleto.toLowerCase().includes(term) ||
        (p.telefono?.includes(term)) ||
        (p.email?.toLowerCase().includes(term)) ||
        p.displayDiagnostico.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      currentViewPatients = currentViewPatients.filter((p) => p.estado_paciente === statusFilter);
    }

    return currentViewPatients;
  }, [enrichedPatients, searchTerm, statusFilter]);

  return { enrichedPatients, filteredAndEnrichedPatients, statusStats };
};