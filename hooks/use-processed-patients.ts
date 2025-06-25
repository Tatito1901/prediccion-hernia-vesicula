// lib/hooks/use-processed-patients.ts

import { useMemo } from "react";
import { Patient, Appointment, PatientStatusEnum } from "@/lib/types";
import type { EnrichedPatient } from "@/components/patients/patient-management";
// Utilizamos los tipos centralizados de lib/types en lugar de app/dashboard/data-model

const STATUS_CONFIG = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: { label: "Pend. Consulta" },
  [PatientStatusEnum.CONSULTADO]: { label: "Consultado" },
  [PatientStatusEnum.EN_SEGUIMIENTO]: { label: "Seguimiento" },
  [PatientStatusEnum.OPERADO]: { label: "Operado" },
  [PatientStatusEnum.NO_OPERADO]: { label: "No Operado" },
  [PatientStatusEnum.INDECISO]: { label: "Indeciso" }
};

export const useProcessedPatients = (
  patients: Patient[],
  appointments: Appointment[],
  searchTerm: string,
  statusFilter: keyof typeof PatientStatusEnum | "all"
) => {
  // Memoización del enriquecimiento de datos
  const enrichedPatients = useMemo((): EnrichedPatient[] => {
    if (!patients) return [];

    const appointmentsByPatientId = new Map<string, Appointment[]>();
    if (appointments) {
      for (const app of appointments) {
        // Ignorar citas sin ID de paciente válido
        if (!app.patient_id) continue;
        
        if (!appointmentsByPatientId.has(app.patient_id)) {
          appointmentsByPatientId.set(app.patient_id, []);
        }
        appointmentsByPatientId.get(app.patient_id)!.push(app);
      }
    }

    return patients.map((patient: Patient) => {
      const patientAppointments = appointmentsByPatientId.get(patient.id) || [];
      // Asegurar que fechaConsulta es un string válido para new Date()
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

      return {
        ...patient,
        nombreCompleto: `${patient.nombre || ''} ${patient.apellidos || ''}`.trim(),
        fecha_proxima_cita_iso: nextAppointment?.fecha_hora_cita?.toString(),
        encuesta_completada: !!(patient as any).encuesta?.id,
        displayDiagnostico: patient.diagnostico_principal || "Sin diagnóstico",
      } as EnrichedPatient;
    });
  }, [patients, appointments]);

  // Memoización del filtrado y cálculo de estadísticas
  const { filteredAndEnrichedPatients, statusStats } = useMemo(() => {
    let currentViewPatients = enrichedPatients;
    // Asegurarse de que searchTerm sea siempre string
    const term = (searchTerm || '').toLowerCase();

    if (term) {
      currentViewPatients = currentViewPatients.filter(p =>
        // Asegurarse de que todos los campos son strings antes de llamar toLowerCase
        (p.nombreCompleto || '').toLowerCase().includes(term) ||
        (p.telefono ? p.telefono.toLowerCase().includes(term) : false) ||
        (p.email ? p.email.toLowerCase().includes(term) : false) ||
        (p.displayDiagnostico ? p.displayDiagnostico.toLowerCase().includes(term) : false) ||
        (p.id ? p.id.toLowerCase().includes(term) : false)
      );
    }

    if (statusFilter !== "all") {
      currentViewPatients = currentViewPatients.filter((p) => p.estado_paciente === statusFilter);
    }

    const stats = enrichedPatients.reduce((acc, patient) => {
      if (patient.estado_paciente && patient.estado_paciente in STATUS_CONFIG) {
        acc[patient.estado_paciente as keyof typeof PatientStatusEnum]++;
      }
      return acc;
    }, {
      [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: 0,
      [PatientStatusEnum.CONSULTADO]: 0,
      [PatientStatusEnum.EN_SEGUIMIENTO]: 0,
      [PatientStatusEnum.OPERADO]: 0,
      [PatientStatusEnum.NO_OPERADO]: 0,
      [PatientStatusEnum.INDECISO]: 0,
    } as Record<keyof typeof PatientStatusEnum, number>);

    return {
      filteredAndEnrichedPatients: currentViewPatients,
      statusStats: { ...stats, all: enrichedPatients.length }
    };
  }, [enrichedPatients, searchTerm, statusFilter]);

  return { enrichedPatients, filteredAndEnrichedPatients, statusStats };
};
