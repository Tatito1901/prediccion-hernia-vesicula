// lib/types/index.ts - CORREGIDO SEGÚN ESQUEMA DE BASE DE DATOS

// Single source of truth for database types
import type { Database } from './database.types';
// Import centralized compatibility enums generated from DB constants and re-export explicitly
import {
  AppointmentStatusEnum as _AppointmentStatusEnum,
  PatientStatusEnum as _PatientStatusEnum,
  UserRoleEnum as _UserRoleEnum,
} from '@/lib/validation/enums';

export const AppointmentStatusEnum = _AppointmentStatusEnum;
export const PatientStatusEnum = _PatientStatusEnum;
export const UserRoleEnum = _UserRoleEnum;

// Re-export validation schemas and helpers so consumers can import from '@/lib/types'
export {
  ZAppointmentStatus,
  ZDiagnosisDb,
  dbDiagnosisToDisplay,
  DIAGNOSIS_DB_VALUES,
} from '@/lib/validation/enums';

// Re-export statistics validation schemas and their inferred types
export {
  ZLabelCount,
  ZClinicalProfile,
  ZDemographicProfile,
  ZOperationalMetrics,
  ZStatisticsMeta,
  ZStatisticsResponse,
} from '@/lib/validation/statistics';
export type { LabelCount, StatisticsResponse } from '@/lib/validation/statistics';

// Re-export database constants for enum lists and other static values
export { Constants } from './database.types';

// --- Row Types (for reading data) ---
export type Patient = Database['public']['Tables']['patients']['Row'];
export type Appointment = Database['public']['Tables']['appointments']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type AssignedSurvey = Database['public']['Tables']['assigned_surveys']['Row'];
export type SurveyResponse = Database['public']['Tables']['survey_responses']['Row'];
export type SurveyTemplate = Database['public']['Tables']['survey_templates']['Row'];

// --- NEW TABLES FROM UPDATED SCHEMA ---
export type AiPrediction = Database['public']['Tables']['ai_predictions']['Row'];
export type AppointmentHistory = Database['public']['Tables']['appointment_history']['Row'];
export type DoctorFeedback = Database['public']['Tables']['doctor_feedback']['Row'];
export type SystemMetric = Database['public']['Tables']['system_metrics']['Row'];

// --- Extended Types with Joined Relations ---

// ExtendedAppointment incluye los datos del paciente en la propiedad paciente
export interface ExtendedAppointment {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  created_at: string | null;
  fecha_hora_cita: string;
  motivos_consulta: string[];
  estado_cita: AppointmentStatus;
  notas_breves: string | null;
  es_primera_vez: boolean | null;
  patients?: {
    id: string;
    nombre?: string;
    apellidos?: string;
    telefono?: string;
    email?: string;
  };
  doctor?: {
    full_name?: string;
  };
}

// --- Insert Types (for creating data) ---
export type NewPatient = Database['public']['Tables']['patients']['Insert'];
export type NewAppointment = Database['public']['Tables']['appointments']['Insert'];
export type NewProfile = Database['public']['Tables']['profiles']['Insert'];
export type NewAiPrediction = Database['public']['Tables']['ai_predictions']['Insert'];
export type NewSurveyResponse = Database['public']['Tables']['survey_responses']['Insert'];

// --- Update Types (for updating data) ---
export type UpdatePatient = Database['public']['Tables']['patients']['Update'];
export type UpdateAppointment = Database['public']['Tables']['appointments']['Update'];
export type UpdateProfile = Database['public']['Tables']['profiles']['Update'];
export type UpdateAiPrediction = Database['public']['Tables']['ai_predictions']['Update'];

// --- Enums as String Literal Types ---
export type PatientStatus = Database['public']['Enums']['patient_status_enum'];
export type DiagnosisEnum = Database['public']['Enums']['diagnosis_enum'];
export type AppointmentStatus = Database['public']['Enums']['appointment_status_enum'];
export type UserRole = Database['public']['Enums']['user_role_enum'];

// --- NEW ENUMS FROM UPDATED SCHEMA ---
export type SurgicalDecision = Database['public']['Enums']['surgical_decision_enum'];
export type MarketingSource = Database['public']['Enums']['patient_source_enum'];

// PatientStatusEnum ahora se re-exporta desde '@/lib/validation/enums'

// AppointmentStatusEnum ahora se re-exporta desde '@/lib/validation/enums'

// Eliminado el objeto DiagnosisEnum manual. Use utilidades de '@/lib/validation/enums' para display y normalización.

// UserRoleEnum ahora se re-exporta desde '@/lib/validation/enums'

// --- Helper Types ---
export type ID = string; // For Supabase UUIDs
export type ISODateTimeString = string; // Format YYYY-MM-DDTHH:mm:ss.sssZ
export type DateString = string; // Format YYYY-MM-DD
export type TimeString = string; // Format HH:MM
export type PhoneString = string;
export type EmailString = string;

// --- Survey Types (Updated Schema) ---
/**
 * Survey response is now self-contained with all fields directly in the table
 */
export type CompleteSurveyResponse = SurveyResponse & {
  assigned_survey: AssignedSurvey;
  patient: Patient;
};

/**
 * Assigned survey with template info
 */
export type AssignedSurveyWithTemplate = AssignedSurvey & {
  template: SurveyTemplate;
  response?: SurveyResponse;
};

// --- Frontend-Specific Enriched Types ---

/**
 * Representa un objeto de Paciente después de haber sido procesado y enriquecido
 * en el frontend con datos adicionales que no existen en la tabla 'patients' de la base de datos.
 * Se usa para alimentar componentes de UI complejos como tablas y tarjetas.
 */
export interface EnrichedPatient extends Patient {
  // Propiedades añadidas durante el procesamiento en el frontend.
  nombreCompleto: string;
  displayDiagnostico: string;
  encuesta_completada: boolean;
  fecha_proxima_cita_iso?: string;
  
  // La propiedad que causaba el error, ahora definida formalmente.
  // Es opcional ('?') porque no todos los pacientes tendrán una encuesta asociada.
  encuesta?: CompleteSurveyResponse | null;
}

// --- Stats Types ---
// --- Stats Types ---
export type StatusStats = Record<PatientStatus, number> & { all: number };

export interface PatientStats {
  total_patients: number;
  pending_consults: number;
  operated_patients: number;
  surgery_rate: number;
  survey_completion_rate: number;
}

// --- API Response Types ---
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export type PaginatedPatients = PaginatedResponse<Patient>;
export type PaginatedAppointments = PaginatedResponse<Appointment>;

// --- Form Types ---
export interface PatientFormData {
  nombre: string;
  apellidos: string;
  edad: number | null;
  telefono?: string;
  email?: string;
  diagnostico_principal?: DiagnosisEnum;
  comentarios_registro?: string;
  doctor_asignado_id?: string;
  origen_paciente?: string;
}

export interface AppointmentFormData {
  patient_id: string;
  fecha_hora_cita: string;
  motivos_consulta: string[];
  doctor_id?: string;
  notas_breves?: string;
  es_primera_vez?: boolean;
}

// (Lead-related types removed due to CRM externalization)

// --- Tipos Deprecados para Compatibilidad ---

/**
 * @deprecated Use `PatientSurvey` or specific survey types instead.
 */
export type PatientSurveyData = {
  id: string;
  patient_id: string;
  submitted_at: string | null;
  [key: string]: any;
};

/**
 * @deprecated Usar el tipo `Appointment` y transformar los datos en el componente si es necesario.
 */
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

// --- Export Database Type for Advanced Use Cases ---
export type { Database };