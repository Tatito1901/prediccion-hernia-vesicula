// lib/types/index.ts - CORREGIDO SEGÚN ESQUEMA DE BASE DE DATOS

// Single source of truth for database types
import type { Database } from './database.types';

// --- Row Types (for reading data) ---
export type Patient = Database['public']['Tables']['patients']['Row'];
export type Appointment = Database['public']['Tables']['appointments']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type AssignedSurvey = Database['public']['Tables']['assigned_surveys']['Row'];
export type SurveyResponse = Database['public']['Tables']['survey_responses']['Row'];
export type SurveyAnswerItem = Database['public']['Tables']['survey_answer_items']['Row'];
export type SurveyTemplate = Database['public']['Tables']['survey_templates']['Row'];
export type SurveyQuestion = Database['public']['Tables']['questions']['Row'];
export type SurveyQuestionOption = Database['public']['Tables']['survey_question_options']['Row'];

// --- Extended Types with Joined Relations ---

// ExtendedAppointment incluye los datos del paciente en la propiedad paciente
export interface ExtendedAppointment {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  created_at: string | null;
  fecha_hora_cita: string;
  motivo_cita: string;
  estado_cita: string; // Nota: en el esquema esto es string, no enum
  notas_cita_seguimiento: string | null;
  es_primera_vez: boolean | null;
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
export type UserRole = Database['public']['Enums']['user_role_enum'];

// Mantenemos los objetos CONST para usarlos fácilmente en el código, 
// pero ahora están validados por el tipo de arriba.
export const PatientStatusEnum = {
  PENDIENTE_DE_CONSULTA: 'PENDIENTE DE CONSULTA' as PatientStatus,
  CONSULTADO: 'CONSULTADO' as PatientStatus,
  EN_SEGUIMIENTO: 'EN SEGUIMIENTO' as PatientStatus,
  OPERADO: 'OPERADO' as PatientStatus,
  NO_OPERADO: 'NO OPERADO' as PatientStatus,
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

// CORREGIDO: Diagnósticos exactos según el esquema
export const DiagnosisEnum = {
  // Hernias
  HERNIA_INGUINAL: 'HERNIA INGUINAL' as DiagnosisEnum,
  HERNIA_UMBILICAL: 'HERNIA UMBILICAL' as DiagnosisEnum,
  HERNIA_HIATAL: 'HERNIA HIATAL' as DiagnosisEnum,
  HERNIA_INGUINAL_RECIDIVANTE: 'HERNIA INGUINAL RECIDIVANTE' as DiagnosisEnum,
  HERNIA_SPIGEL: 'HERNIA SPIGEL' as DiagnosisEnum,
  EVENTRACION_ABDOMINAL: 'EVENTRACION ABDOMINAL' as DiagnosisEnum,
  
  // Vesícula
  COLECISTITIS: 'COLECISTITIS' as DiagnosisEnum,
  VESICULA_COLECISTITIS_CRONICA: 'VESICULA (COLECISTITIS CRONICA)' as DiagnosisEnum,
  COLEDOCOLITIASIS: 'COLEDOCOLITIASIS' as DiagnosisEnum,
  COLANGITIS: 'COLANGITIS' as DiagnosisEnum,
  
  // Otros
  APENDICITIS: 'APENDICITIS' as DiagnosisEnum,
  LIPOMA_GRANDE: 'LIPOMA GRANDE' as DiagnosisEnum,
  QUISTE_SEBACEO_INFECTADO: 'QUISTE SEBACEO INFECTADO' as DiagnosisEnum,
  
  // Misceláneos
  OTRO: 'OTRO' as DiagnosisEnum
};

export const UserRoleEnum = {
  DOCTOR: 'doctor' as UserRole,
  ADMIN: 'admin' as UserRole,
  RECEPCION: 'recepcion' as UserRole,
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
 * Representa un survey template completo con preguntas
 */
export type SurveyTemplateWithQuestions = SurveyTemplate & {
  questions: (SurveyQuestion & {
    options: SurveyQuestionOption[];
  })[];
};

/**
 * Representa un survey asignado con toda la información
 */
export type CompleteSurvey = AssignedSurvey & {
  template: SurveyTemplateWithQuestions;
  response?: SurveyResponse & {
    answers: (SurveyAnswerItem & {
      question: SurveyQuestion;
      selected_option?: SurveyQuestionOption;
    })[];
  };
};

/**
 * An enriched survey response that includes the full list of answers.
 * This is a common pattern for representing a completed survey.
 */
export type PatientSurvey = SurveyResponse & {
  answers: (SurveyAnswerItem & { question: SurveyQuestion | null })[];
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
  encuesta?: PatientSurvey | null;
}

// --- Stats Types ---
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
  motivo_cita: string;
  doctor_id?: string;
  notas_cita_seguimiento?: string;
  es_primera_vez?: boolean;
}

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