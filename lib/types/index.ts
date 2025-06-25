// lib/types/index.ts
// Single source of truth for database types
import type { Database } from './database.types';

// --- Row Types (for reading data) ---
export type Patient = Database['public']['Tables']['patients']['Row'];
export type Appointment = Database['public']['Tables']['appointments']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];

// --- Extended Types with Joined Relations ---

// ExtendedAppointment incluye los datos del paciente en la propiedad paciente
export interface ExtendedAppointment {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  created_at: string | null;
  fecha_hora_cita: string;
  motivo_cita: string;
  estado_cita: AppointmentStatus;
  notas_cita_seguimiento: string | null;
  es_primera_vez: boolean;
  paciente?: {
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

// --- Update Types (for updating data) ---
export type UpdatePatient = Database['public']['Tables']['patients']['Update'];
export type UpdateAppointment = Database['public']['Tables']['appointments']['Update'];
export type UpdateProfile = Database['public']['Tables']['profiles']['Update'];

// --- Enums as String Literal Types ---
export type PatientStatus = Database['public']['Enums']['patient_status_enum'];
export type DiagnosisEnum = Database['public']['Enums']['diagnosis_enum'];
export type AppointmentStatus = Database['public']['Enums']['appointment_status_enum'];

// Mantenemos los objetos CONST para usarlos fácilmente en el código, 
// pero ahora están validados por el tipo de arriba.
export const PatientStatusEnum = {
  PENDIENTE_DE_CONSULTA: 'PENDIENTE DE CONSULTA' as PatientStatus,
  CONSULTADO: 'CONSULTADO' as PatientStatus,
  EN_SEGUIMIENTO: 'EN SEGUIMIENTO' as PatientStatus,
  OPERADO: 'OPERADO' as PatientStatus,
  NO_OPERADO: 'NO_OPERADO' as PatientStatus,
  INDECISO: 'INDECISO' as PatientStatus,
};

export const AppointmentStatusEnum = {
    PROGRAMADA: 'PROGRAMADA' as AppointmentStatus,
    CONFIRMADA: 'CONFIRMADA' as AppointmentStatus,
    CANCELADA: 'CANCELADA' as AppointmentStatus,
    COMPLETADA: 'COMPLETADA' as AppointmentStatus,
    NO_ASISTIO: 'NO ASISTIO' as AppointmentStatus,
    PRESENTE: 'PRESENTE' as AppointmentStatus,
    REAGENDADA: 'REAGENDADA' as AppointmentStatus,
};

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

// --- Survey Types ---
/**
 * Represents a survey template from the 'survey_templates' table.
 */
export type SurveyTemplate = Database['public']['Tables']['survey_templates']['Row'];

/**
 * Represents a single question within a survey template from the 'questions' table.
 */
export type SurveyQuestion = Database['public']['Tables']['questions']['Row'];

/**
 * Represents an option for a multiple-choice question from the 'survey_question_options' table.
 */
export type SurveyQuestionOption = Database['public']['Tables']['survey_question_options']['Row'];

/**
 * Represents a survey that has been assigned to a patient from the 'assigned_surveys' table.
 */
export type AssignedSurvey = Database['public']['Tables']['assigned_surveys']['Row'];

/**
 * Represents a patient's response submission to a survey from the 'survey_responses' table.
 */
export type SurveyResponse = Database['public']['Tables']['survey_responses']['Row'];

/**
 * Represents a single answer item within a survey response from the 'survey_answer_items' table.
 */
export type SurveyAnswerItem = Database['public']['Tables']['survey_answer_items']['Row'];

/**
 * An enriched survey response that includes the full list of answers.
 * This is a common pattern for representing a completed survey.
 */
export type PatientSurvey = SurveyResponse & {
  answers: (SurveyAnswerItem & { question: SurveyQuestion | null })[];
};

/**
 * @deprecated Use `PatientSurvey` or specific survey types instead.
 * This type is for legacy compatibility and represents a flattened structure
 * of survey data that was previously used.
 */
export type PatientSurveyData = {
  id: string; // Corresponds to SurveyResponse ID
  patient_id: string;
  submitted_at: string | null;
  // The old format included dynamically named properties based on question text.
  // Using an index signature for compatibility during refactoring.
  [key: string]: any;
};

// --- Adapters for Backward Compatibility with the old data-model.ts ---

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

/**
 * @deprecated Usar el tipo `Patient` y transformar los datos en el componente si es necesario.
 */
export interface PatientData extends Omit<Patient, 'id'> {
  id: string;
  // Add any additional fields that were in the original PatientData interface
  // but are not in the Patient type from the database
  estado?: PatientStatus; // Property that might have been renamed or moved
}

// --- Export Database Type for Advanced Use Cases ---
export type { Database };
