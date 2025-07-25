import { z } from "zod";
import { DiagnosisEnum } from "@/lib/types";

// ==================== TIPOS DE ACCIONES UNIFICADOS ====================
export type AppointmentAction = "checkIn" | "cancel" | "complete" | "noShow" | "reschedule";

// ==================== TIPOS DE CITAS UNIFICADOS ====================
export type AppointmentStatus = 
  | "PROGRAMADA" 
  | "CONFIRMADA" 
  | "PRESENTE" 
  | "COMPLETADA" 
  | "CANCELADA" 
  | "NO_ASISTIO" 
  | "REAGENDADA";

// ==================== TIPOS DE PACIENTES ====================
export interface PatientData {
  id: string;
  nombre: string;
  apellidos: string;
  full_name?: string;
  telefono?: string;
  edad?: number;
  email?: string;
  diagnostico_principal?: string;
  estado_paciente?: string;
  probabilidad_cirugia?: number | null;
  created_at?: string;
}

// ==================== TIPO PRINCIPAL DE CITA ====================
export interface AppointmentWithPatient {
  id: string;
  patient_id: string;
  fecha_hora_cita: string; // ISO string
  motivo_cita: string;
  estado_cita: AppointmentStatus;
  notas_cita_seguimiento?: string;
  es_primera_vez?: boolean;
  doctor_id?: string | null;
  created_at?: string;
  updated_at?: string;
  
  // Datos del paciente incluidos
  patients?: PatientData | null;
  
  // Alias para compatibilidad (deprecado)
  paciente?: PatientData | null;
}

// ==================== RESPUESTA DE BD ====================
export interface AdmissionDBResponse {
  patient_id: string;
  appointment_id: string;
  patient?: PatientData;
  appointment?: AppointmentWithPatient;
}

// ==================== ESQUEMAS DE VALIDACIÓN ====================
export const AdmissionFormSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es requerido."),
  apellidos: z.string().trim().min(2, "Los apellidos son requeridos."),
  edad: z.coerce.number().int().min(0).max(120).nullable().optional(),
  telefono: z.string().trim().min(10, "El teléfono debe tener al menos 10 dígitos."),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  motivoConsulta: z.enum(Object.values(DiagnosisEnum) as [DiagnosisEnum, ...DiagnosisEnum[]], {
    required_error: "Seleccione un motivo de consulta.",
  }),
  fechaConsulta: z.date({
    required_error: "La fecha de la cita es requerida.",
  }),
  horaConsulta: z.string({
    required_error: "La hora de la cita es requerida.",
  }).regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido"),
  notas: z.string().max(500, "Las notas no pueden exceder los 500 caracteres.").optional(),
  origen_paciente: z.string().optional(),
  probabilidad_cirugia: z.number().min(0).max(100).nullable().optional(),
});

export type TAdmissionForm = z.infer<typeof AdmissionFormSchema>;

// ==================== PAYLOADS PARA API ====================
export interface AdmissionPayload {
  nombre: string;
  apellidos: string;
  telefono: string;
  email?: string;
  edad?: number | null;
  diagnostico_principal: string;
  estado_paciente?: string;
  diagnostico_principal_detalle?: string;
  probabilidad_cirugia?: number | null;
  fecha_cirugia_programada?: string;
  origen_paciente?: string;
  etiquetas?: string[];
  ultimo_contacto?: string;
  proximo_contacto?: string;
  comentarios_registro?: string;
  fecha_hora_cita: string; // ISO String
  motivo_cita: string;
  es_primera_vez?: boolean;
  doctor_id?: string | null;
  notas_cita?: string;
}

// ==================== PAYLOAD DE ACTUALIZACIÓN ====================
export interface AppointmentStatusUpdatePayload {
  appointmentId: string;
  newStatus: AppointmentStatus;
  motivo_cambio?: string;
  fecha_hora_cita?: string; // Para reagendamiento
  notas_adicionales?: string;
}

// ==================== TIPOS DE ENCUESTA ====================
export interface SurveyData {
  surveyTemplateId: number;
  overall_rating: number;
  service_quality?: number;
  wait_time_satisfaction?: number;
  doctor_communication?: number;
  would_recommend?: boolean;
  would_return?: boolean;
  positive_feedback?: string;
  suggestions?: string;
  complaints?: string;
  wait_time_minutes?: number;
  notes?: string;
}

export interface SurveyStatus {
  survey_completed: boolean;
  survey_started_at?: string;
  survey_completed_at?: string;
  survey_data?: SurveyData;
}

// ==================== TIPOS DE HISTORIAL ====================
export interface PatientHistoryData {
  patient: PatientData;
  appointments: AppointmentWithPatient[];
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  no_show_appointments: number;
  survey_completion_rate: number;
}

// ==================== TIPOS PARA COMPONENTES ====================
export interface AppointmentListProps {
  appointments: AppointmentWithPatient[];
  isLoading?: boolean;
  onAction: (action: AppointmentAction, appointment: AppointmentWithPatient) => void;
  onStartSurvey?: (appointment: AppointmentWithPatient) => void;
  onViewHistory?: (patientId: string) => void;
  className?: string;
  disabled?: boolean;
  emptyStateConfig?: {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  };
}

export interface AppointmentCardProps {
  appointment: AppointmentWithPatient;
  onAction: (action: AppointmentAction, appointment: AppointmentWithPatient) => void;
  onStartSurvey?: () => void;
  onViewHistory?: (patientId: string) => void;
  disableActions?: boolean;
  surveyCompleted?: boolean;
  showReschedule?: boolean;
  showCancel?: boolean;
  showComplete?: boolean;
}

export interface RescheduleProps {
  appointment: AppointmentWithPatient;
  onClose: () => void;
  onReschedule: (date: Date, time: string) => void;
}

// ==================== TIPOS DE FILTROS ====================
export interface AppointmentFilters {
  date?: Date | null;
  status?: AppointmentStatus | 'all';
  patientName?: string;
  page?: number;
  limit?: number;
}

// ==================== CONFIGURACIÓN DE ESTADOS ====================
export const APPOINTMENT_STATUS_CONFIG = {
  PROGRAMADA: { 
    label: "Programada", 
    color: "blue",
    bgClass: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    canEdit: true,
    canCancel: true,
    canReschedule: true,
    canCheckIn: true,
    canComplete: false,
    canMarkNoShow: false,
  },
  CONFIRMADA: { 
    label: "Confirmada", 
    color: "green",
    bgClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    canEdit: true,
    canCancel: true,
    canReschedule: true,
    canCheckIn: true,
    canComplete: false,
    canMarkNoShow: false,
  },
  PRESENTE: { 
    label: "En Consulta", 
    color: "emerald",
    bgClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    canEdit: true,
    canCancel: false,
    canReschedule: false,
    canCheckIn: false,
    canComplete: true,
    canMarkNoShow: true,
  },
  COMPLETADA: { 
    label: "Completada", 
    color: "green",
    bgClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    canEdit: false,
    canCancel: false,
    canReschedule: false,
    canCheckIn: false,
    canComplete: false,
    canMarkNoShow: false,
  },
  CANCELADA: { 
    label: "Cancelada", 
    color: "red",
    bgClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    canEdit: false,
    canCancel: false,
    canReschedule: false,
    canCheckIn: false,
    canComplete: false,
    canMarkNoShow: false,
  },
  NO_ASISTIO: { 
    label: "No Asistió", 
    color: "gray",
    bgClass: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    canEdit: false,
    canCancel: false,
    canReschedule: true,
    canCheckIn: false,
    canComplete: false,
    canMarkNoShow: false,
  },
  REAGENDADA: { 
    label: "Reagendada", 
    color: "yellow",
    bgClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    canEdit: false,
    canCancel: false,
    canReschedule: false,
    canCheckIn: false,
    canComplete: false,
    canMarkNoShow: false,
  },
} as const;

// ==================== TIPOS DE TABS ====================
export type PatientAdmissionTab = "newPatient" | "today" | "future" | "past";

export interface TabConfig {
  value: PatientAdmissionTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

// ==================== UTILIDADES DE TIPO ====================
export const hasPatientData = (
  appointment: AppointmentWithPatient
): appointment is AppointmentWithPatient & { 
  patients: NonNullable<AppointmentWithPatient['patients']> 
} => {
  return !!(appointment.patients || appointment.paciente);
};

export const getPatientData = (appointment: AppointmentWithPatient): PatientData | null => {
  return appointment.patients || appointment.paciente || null;
};

export const canPerformAction = (
  appointment: AppointmentWithPatient, 
  action: AppointmentAction
): boolean => {
  const config = APPOINTMENT_STATUS_CONFIG[appointment.estado_cita];
  
  switch (action) {
    case 'checkIn':
      return config.canCheckIn ?? false;
    case 'cancel':
      return config.canCancel ?? false;
    case 'reschedule':
      return config.canReschedule ?? false;
    case 'complete':
      return config.canComplete ?? false;
    case 'noShow':
      return config.canMarkNoShow ?? false;
    default:
      return false;
  }
};

// ==================== TIPOS DE RESPUESTA DE API ====================
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ==================== EXPORTACIONES PARA COMPATIBILIDAD ====================
export type ExtendedAppointment = AppointmentWithPatient;
export type NormalizedAppointment = AppointmentWithPatient;
export type ConfirmAction = AppointmentAction;