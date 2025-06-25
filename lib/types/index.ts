// lib/types/index.ts
// Single source of truth for database types
import type { Database } from './database.types';

// --- Row Types (for reading data) ---
export type Patient = Database['public']['Tables']['patients']['Row'];
export type Appointment = Database['public']['Tables']['appointments']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];

// --- Extended Types with Joined Relations ---

// ExtendedAppointment incluye los datos del paciente en la propiedad paciente
export interface ExtendedAppointment extends Appointment {
  paciente?: {
    id: string;
    nombre?: string;
    apellidos?: string;
    telefono?: string;
    email?: string;
  };
}

// --- Insert Types (for creating data) ---
export type NewPatient = Database['public']['Tables']['patients']['Insert'];
export type NewAppointment = Database['public']['Tables']['appointments']['Insert'];
export type NewProfile = Database['public']['Tables']['profiles']['Insert'];

// --- Update Types (for updating data) ---
export type UpdatePatient = Database['public']['Tables']['patients']['Update'];
export type UpdateAppointment = Database['public']['Tables']['appointments']['Update'];
export type UpdateProfile = Database['public']['Tables']['profiles']['Update'];

// --- Enums as String Literal Types ---
export type PatientStatus = Database['public']['Enums']['patient_status_enum'];
export type DiagnosisEnum = Database['public']['Enums']['diagnosis_enum'];
export type AppointmentStatus = Database['public']['Enums']['appointment_status_enum'];

// DiagnosisEnum Constants
// These match the string literal values in the database
export const DiagnosisEnum = {
  // Diagnósticos de hernias
  EVENTRACION_ABDOMINAL: 'EVENTRACION ABDOMINAL' as DiagnosisEnum,
  HERNIA_HIATAL: 'HERNIA HIATAL' as DiagnosisEnum,
  HERNIA_INGUINAL: 'HERNIA INGUINAL' as DiagnosisEnum,
  HERNIA_INGUINAL_BILATERAL: 'HERNIA INGUINAL BILATERAL' as DiagnosisEnum,
  HERNIA_INGUINAL_RECIDIVANTE: 'HERNIA INGUINAL RECIDIVANTE' as DiagnosisEnum,
  HERNIA_INCISIONAL: 'HERNIA INCISIONAL' as DiagnosisEnum,
  HERNIA_SPIGEL: 'HERNIA DE SPIGEL' as DiagnosisEnum,
  HERNIA_UMBILICAL: 'HERNIA UMBILICAL' as DiagnosisEnum,
  HERNIA_VENTRAL: 'HERNIA VENTRAL' as DiagnosisEnum,
  
  // Diagnósticos de vesícula
  COLANGITIS: 'COLANGITIS' as DiagnosisEnum, 
  COLECISTITIS: 'COLECISTITIS / COLECISTITIS CRONICA' as DiagnosisEnum,
  COLEDOCOLITIASIS: 'COLEDOCOLITIASIS' as DiagnosisEnum, 
  COLELITIASIS: 'COLELITIASIS' as DiagnosisEnum,
  
  // Otros diagnósticos
  APENDICITIS: 'APENDICITIS' as DiagnosisEnum,
  LIPOMA_GRANDE: 'LIPOMA GRANDE' as DiagnosisEnum,
  QUISTE_SEBACEO_INFECTADO: 'QUISTE SEBACEO INFECTADO' as DiagnosisEnum,
  
  // Misceláneos
  OTRO: 'OTRO' as DiagnosisEnum
};

// --- Helper Types ---
export type ID = string; // For Supabase UUIDs
export type ISODateTimeString = string; // Format YYYY-MM-DDTHH:mm:ss.sssZ
export type DateString = string; // Format YYYY-MM-DD
export type TimeString = string; // Format HH:MM
export type PhoneString = string;
export type EmailString = string;

// --- Adapters for Backward Compatibility with the old data-model.ts ---

// AppointmentStatus Enum Constants
// These match the string literal values in the database
export const AppointmentStatusEnum = {
  PROGRAMADA: 'PROGRAMADA' as AppointmentStatus,
  CONFIRMADA: 'CONFIRMADA' as AppointmentStatus,
  CANCELADA: 'CANCELADA' as AppointmentStatus,
  COMPLETADA: 'COMPLETADA' as AppointmentStatus,
  NO_ASISTIO: 'NO ASISTIO' as AppointmentStatus,
  PRESENTE: 'PRESENTE' as AppointmentStatus,
  REAGENDADA: 'REAGENDADA' as AppointmentStatus,
};

// PatientStatus Enum Constants
export const PatientStatusEnum = {
  PENDIENTE_DE_CONSULTA: 'PENDIENTE DE CONSULTA' as PatientStatus,
  CONSULTADO: 'CONSULTADO' as PatientStatus,
  EN_SEGUIMIENTO: 'EN SEGUIMIENTO' as PatientStatus,
  OPERADO: 'OPERADO' as PatientStatus,
  NO_OPERADO: 'NO OPERADO' as PatientStatus,
  INDECISO: 'INDECISO' as PatientStatus,
};

// Legacy interface for AppointmentData
// This provides backward compatibility with the old model
// while allowing easy conversion to the database model
export interface AppointmentData {
  id: string;
  patientId: string;
  paciente: string;
  telefono: string;
  fechaConsulta: Date;
  horaConsulta: TimeString;
  duracionEstimadaMin: number;
  motivoConsulta: string;
  tipoConsulta: string;
  estado: AppointmentStatus;
  notas?: string;
  ubicacion: string;
  recursosNecesarios: string[];
  esPrimeraVez: boolean;
  costo: number;
  doctor: string;
  raw_doctor_id: string;
}

// Legacy interface for PatientData
export interface PatientData extends Omit<Patient, 'id'> {
  id: string;
  // Add any additional fields that were in the original PatientData interface
  // but are not in the Patient type from the database
  estado?: PatientStatus; // Property that might have been renamed or moved
}

// Note: We're not exporting enum values as constants here to avoid the TypeScript error
// Since Database is a type, not a value, we can't do Object.values() on it
// If needed, these values should be fetched directly from the database

// --- Export Database Type for Advanced Use Cases ---
export type { Database };
