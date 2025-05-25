// app/dashboard/mock-data.ts
import type { DoctorData, ClinicMetrics, DiagnosisType, PatientOrigin } from './data-model';

export const sampleDoctors: DoctorData[] = [
  {
    id: 1,
    nombre: "Dr. Luis Ángel Medina Andrade",
    especialidad: "Cirugía General y Laparoscópica",
    pacientesAtendidos: 120,
    tasaConversion: 0.68,
    foto: "/caring-doctor.png",
  },
];

export const clinicMetrics: ClinicMetrics = {
  totalPacientes: 250,
  pacientesNuevosMes: 35,
  pacientesOperados: 145,
  pacientesNoOperados: 45,
  pacientesSeguimiento: 60,
  tasaConversion: 0.68,
  tiempoPromedioDecision: 14,
  fuentePrincipalPacientes: "Google",
  diagnosticosMasComunes: [
    {
      tipo: "Hernia Inguinal", cantidad: 95,
      porcentaje: 0
    },
    {
      tipo: "Vesícula", cantidad: 85,
      porcentaje: 0
    },
    {
      tipo: "Hernia Umbilical", cantidad: 45,
      porcentaje: 0
    },
    {
      tipo: "Hernia Incisional", cantidad: 25,
      porcentaje: 0
    },
  ],
};
