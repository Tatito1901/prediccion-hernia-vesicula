/**
 * Datos de muestra para el CRM
 * NOTA: Este archivo contiene datos ficticios para desarrollo y pruebas.
 * En producción, estos datos deberían ser reemplazados por datos reales de la API.
 */

import { PatientData } from '../dashboard/data-model';

// Pacientes de muestra
export const samplePatients: PatientData[] = [
  {
    id: "1",
    nombre: "María",
    apellidos: "González Pérez",
    telefono: "+52 555 123 4567",
    email: "maria.gonzalez@example.com",
    fechaNacimiento: "1985-06-15",
    genero: "Femenino",
    direccion: {
      calle: "Av. Insurgentes Sur 1234",
      colonia: "Del Valle",
      ciudad: "Ciudad de México",
      estado: "CDMX",
      codigoPostal: "03100"
    },
    historialMedico: {
      alergias: ["Penicilina"],
      enfermedadesCronicas: ["Hipertensión"],
      cirugiasPrevias: ["Apendicectomía (2010)"]
    },
    fechaRegistro: "2023-01-10",
    ultimaConsulta: "2023-05-20",
    estado: "active"
  },
  {
    id: "2",
    nombre: "Carlos",
    apellidos: "Ramírez Vega",
    telefono: "+52 555 987 6543",
    email: "carlos.ramirez@example.com",
    fechaNacimiento: "1978-09-22",
    genero: "Masculino",
    direccion: {
      calle: "Calle Reforma 567",
      colonia: "Juárez",
      ciudad: "Ciudad de México",
      estado: "CDMX",
      codigoPostal: "06600"
    },
    historialMedico: {
      alergias: [],
      enfermedadesCronicas: ["Diabetes tipo 2"],
      cirugiasPrevias: []
    },
    fechaRegistro: "2023-02-15",
    ultimaConsulta: "2023-06-01",
    estado: "active"
  },
  {
    id: "3",
    nombre: "Ana",
    apellidos: "López Mendoza",
    telefono: "+52 555 234 5678",
    email: "ana.lopez@example.com",
    fechaNacimiento: "1990-03-12",
    genero: "Femenino",
    direccion: {
      calle: "Av. Universidad 890",
      colonia: "Coyoacán",
      ciudad: "Ciudad de México",
      estado: "CDMX",
      codigoPostal: "04510"
    },
    historialMedico: {
      alergias: ["Sulfas", "Mariscos"],
      enfermedadesCronicas: [],
      cirugiasPrevias: ["Cesárea (2018)"]
    },
    fechaRegistro: "2023-03-05",
    ultimaConsulta: "2023-04-15",
    estado: "inactive"
  }
];

// Tipo para datos de seguimiento
export interface FollowUp {
  id: number;
  patientId: number;
  scheduledDate: string;
  reason: string;
  status: 'pending' | 'completed' | 'rescheduled' | 'cancelled';
  notes?: string;
  contactMethod: 'phone' | 'email' | 'whatsapp' | 'in-person';
  priority: 'high' | 'medium' | 'low';
}

// Datos de seguimiento de muestra
const sampleFollowUps: FollowUp[] = [
  {
    id: 101,
    patientId: 1,
    scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    reason: "Seguimiento postoperatorio",
    status: 'pending',
    notes: "Verificar cicatrización y recuperación general",
    contactMethod: 'phone',
    priority: 'high'
  },
  {
    id: 102,
    patientId: 2,
    scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    reason: "Resultados de laboratorio",
    status: 'pending',
    notes: "Discutir niveles de glucosa y ajustar medicación si es necesario",
    contactMethod: 'in-person',
    priority: 'medium'
  },
  {
    id: 103,
    patientId: 3,
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    reason: "Evaluación de síntomas",
    status: 'pending',
    notes: "Seguimiento de dolor abdominal reportado en última visita",
    contactMethod: 'whatsapp',
    priority: 'high'
  }
];

// Función para obtener los seguimientos pendientes
export function getPendingFollowUps(): FollowUp[] {
  return sampleFollowUps.filter(followUp => followUp.status === 'pending');
}

// Función para obtener todos los seguimientos
export function getAllFollowUps(): FollowUp[] {
  return sampleFollowUps;
}

// Función para obtener seguimientos por paciente
export function getPatientFollowUps(patientId: number): FollowUp[] {
  return sampleFollowUps.filter(followUp => followUp.patientId === patientId);
}
