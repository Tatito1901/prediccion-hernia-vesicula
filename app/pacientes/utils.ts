// app/pacientes/utils.ts
import type { PatientData, FollowUp, PatientStatus, PatientSurvey } from '@/app/dashboard/data-model';
import { additionalFollowUps } from './sample-data';

// Función para obtener los seguimientos pendientes
export const getPendingFollowUps = (): FollowUp[] => {
  // Usar los datos de seguimientos adicionales
  return additionalFollowUps.filter((followUp) => followUp.estado === "Programado");
};

// Función para obtener pacientes por estado
export const getPatientsByStatus = (patients: PatientData[], status: PatientStatus): ReadonlyArray<PatientData> => {
  return patients.filter((patient) => patient.estado === status);
};

// Función para obtener pacientes que necesitan completar su encuesta
export const getPatientsWithPendingSurvey = (patients: PatientData[]): ReadonlyArray<PatientData> => {
  return patients.filter(patient => patient.encuesta === undefined);
};

// Función para obtener pacientes que necesitan seguimiento
export const getPatientsNeedingFollowUp = (patients: PatientData[], daysThreshold: number = 3): ReadonlyArray<PatientData> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparaciones de día completo

  const thresholdDate = new Date(today);
  thresholdDate.setDate(today.getDate() + daysThreshold);

  return patients.filter((patient) => {
    if (!patient.proximoContacto) return false;
    
    try {
      const nextContactDate = new Date(patient.proximoContacto);
      nextContactDate.setHours(0,0,0,0); // Normalizar
      // Considerar sólo fechas futuras o iguales a hoy, y dentro del umbral.
      return nextContactDate >= today && nextContactDate <= thresholdDate;
    } catch (e: unknown) {
      console.error(`Invalid date format for patient ${patient.id} proximoContacto: ${patient.proximoContacto}`);
      return false; // Si la fecha no es válida, no incluir.
    }
  });
};

// Ejemplo de cómo podrías querer modificar un paciente
export function updatePatientStatus(patients: PatientData[], patientId: number, newStatus: PatientStatus): PatientData | undefined {
    const patientIndex = patients.findIndex(p => p.id === patientId);
    if (patientIndex > -1) {
        patients[patientIndex].estado = newStatus;
        return patients[patientIndex];
    }
    return undefined;
}

// Ejemplo de cómo podrías querer actualizar la encuesta de un paciente
export function updatePatientSurvey(patients: PatientData[], patientId: number, surveyData: PatientSurvey): PatientData | undefined {
  const patientIndex = patients.findIndex(p => p.id === patientId);
  if (patientIndex > -1) {
      patients[patientIndex].encuesta = surveyData;
      // Podrías querer actualizar etiquetas o estado también
      if (patients[patientIndex].etiquetas?.includes("Encuesta Pendiente")) {
        patients[patientIndex].etiquetas = patients[patientIndex].etiquetas?.filter(e => e !== "Encuesta Pendiente");
      }
      return patients[patientIndex];
  }
  return undefined;
}
