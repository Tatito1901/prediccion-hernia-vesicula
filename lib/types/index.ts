// lib/types/index.ts - CORREGIDO SEGÚN ESQUEMA DE BASE DE DATOS

// Single source of truth for database types
import type { Database } from './database.types';

// --- Row Types (for reading data) ---
export type Patient = Database['public']['Tables']['patients']['Row'];
export type Appointment = Database['public']['Tables']['appointments']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type AssignedSurvey = Database['public']['Tables']['assigned_surveys']['Row'];
export type SurveyResponse = Database['public']['Tables']['survey_responses']['Row'];
export type SurveyTemplate = Database['public']['Tables']['survey_templates']['Row'];

// --- NEW TABLES FROM UPDATED SCHEMA ---
export type Lead = Database['public']['Tables']['leads']['Row'];
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
  estado_cita: string; // Nota: en el esquema esto es string, no enum
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
export type NewLead = Database['public']['Tables']['leads']['Insert'];
export type NewAiPrediction = Database['public']['Tables']['ai_predictions']['Insert'];
export type NewSurveyResponse = Database['public']['Tables']['survey_responses']['Insert'];

// --- Update Types (for updating data) ---
export type UpdatePatient = Database['public']['Tables']['patients']['Update'];
export type UpdateAppointment = Database['public']['Tables']['appointments']['Update'];
export type UpdateProfile = Database['public']['Tables']['profiles']['Update'];
export type UpdateLead = Database['public']['Tables']['leads']['Update'];
export type UpdateAiPrediction = Database['public']['Tables']['ai_predictions']['Update'];

// --- Enums as String Literal Types ---
export type PatientStatus = Database['public']['Enums']['patient_status_enum'];
export type DiagnosisEnum = Database['public']['Enums']['diagnosis_enum'];
export type AppointmentStatus = Database['public']['Enums']['appointment_status_enum'];
export type UserRole = Database['public']['Enums']['user_role_enum'];

// --- NEW ENUMS FROM UPDATED SCHEMA ---
export type LeadStatus = Database['public']['Enums']['lead_status_enum'];
export type Channel = Database['public']['Enums']['channel_enum'];
export type Motive = Database['public']['Enums']['motive_enum'];
export type SurgicalDecision = Database['public']['Enums']['surgical_decision_enum'];
export type SurveyStatus = Database['public']['Enums']['survey_status_enum'];
export type MarketingSource = Database['public']['Enums']['marketing_source_enum'];

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

// --- Lead Form Types ---
export interface LeadFormData {
  full_name: string;
  phone_number: string;
  email?: string;
  channel: Channel;
  motive: Motive;
  notes?: string;
  lead_intent?: 'ONLY_WANTS_INFORMATION' | 'WANTS_TO_SCHEDULE_APPOINTMENT' | 'WANTS_TO_COMPARE_PRICES' | 'OTHER';
  next_follow_up_date?: string;
}

// --- Extended Lead Types ---
export interface ExtendedLead extends Lead {
  // Computed properties for UI
  days_since_created: number;
  days_until_follow_up?: number;
  is_overdue: boolean;
  conversion_patient?: Patient;
}

// --- Lead Stats Types ---
export interface LeadStats {
  total_leads: number;
  new_leads: number;
  in_follow_up: number;
  converted_leads: number;
  conversion_rate: number;
  leads_by_channel: Record<Channel, number>;
  leads_by_status: Record<LeadStatus, number>;
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