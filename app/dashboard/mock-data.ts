// app/dashboard/mock-data.ts
import type { DoctorData, ClinicMetrics, DiagnosisType, PatientOrigin } from './data-model';

export const sampleDoctors: DoctorData[] = [
  {
    id: 1,
    nombre: "Dr. Luis Ángel Medina",
    especialidad: "Cirugía General y Laparoscópica",
    pacientesAtendidos: 120,
    tasaConversion: 0.68,
    foto: "/caring-doctor.png",
  },
  {
    id: 2,
    nombre: "Dra. Ana Gutiérrez",
    especialidad: "Cirugía Laparoscópica",
    pacientesAtendidos: 85,
    tasaConversion: 0.72,
    foto: "/female-doctor.png",
  },
  {
    id: 3,
    nombre: "Dr. Ricardo Fuentes",
    especialidad: "Cirugía General",
    pacientesAtendidos: 65,
    tasaConversion: 0.6,
    foto: "/male-doctor.png",
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
      tipo: "Hernia Inguinal",
      cantidad: 95,
    },
    {
      tipo: "Vesícula",
      cantidad: 85,
    },
    {
      tipo: "Hernia Umbilical",
      cantidad: 45,
    },
    {
      tipo: "Hernia Incisional",
      cantidad: 25,
    },
  ]
};
