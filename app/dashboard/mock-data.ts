// app/dashboard/mock-data.ts
import { DiagnosisEnum } from './data-model'; // Import DiagnosisEnum
import type { DoctorData, ClinicMetrics, DiagnosisType, PatientOrigin } from './data-model';

export const sampleDoctors: DoctorData[] = [
  {
    id: "doc-mock-1",
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
      tipo: DiagnosisEnum.HERNIA_INGUINAL, cantidad: 95,
      porcentaje: 0
    },
    {
      // Assuming "Vesícula" generally refers to Colelitiasis or Colecistitis.
      // Using COLELITIASIS as a common general term for gallbladder issues.
      // Adjust if COLECISTITIS is more appropriate for this mock data.
      tipo: DiagnosisEnum.COLELITIASIS, cantidad: 85,
      porcentaje: 0
    },
    {
      tipo: DiagnosisEnum.HERNIA_UMBILICAL, cantidad: 45,
      porcentaje: 0
    },
    {
      tipo: DiagnosisEnum.HERNIA_INCISIONAL, cantidad: 25,
      porcentaje: 0
    },
  ],
};
