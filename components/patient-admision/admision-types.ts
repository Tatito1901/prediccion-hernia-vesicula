// components/patient-admission/admision-types.ts
// TIPOS OPTIMIZADOS PARA EL FLUJO DE ADMISIÓN - CLÍNICA HERNIA Y VESÍCULA

import { z } from 'zod';
import { AppointmentStatusEnum } from '@/lib/types';
import type { UserRole as DbUserRole, PatientStatus } from '@/lib/types';
import { 
  ZAppointmentStatus, 
  ZDiagnosisDb, 
  type DbDiagnosis 
} from '@/lib/validation/enums';

// ==================== TIPOS BASE ====================
export type AppointmentStatus = z.infer<typeof ZAppointmentStatus>;

export type DiagnosisType = DbDiagnosis;
export type UserRole = DbUserRole;
export type { PatientStatus };

export type AdmissionAction = 
  | 'checkIn'
  | 'complete'
  | 'cancel'
  | 'noShow'
  | 'reschedule'
  | 'viewHistory';

export type TabType = 'today' | 'future' | 'past';

// ==================== INTERFACES PRINCIPALES ====================
export interface Patient {
  id: string;
  created_at: string;
  updated_at: string;
  nombre: string;
  apellidos: string;
  edad?: number;
  telefono?: string;
  email?: string;
  fecha_registro: string;
  fecha_nacimiento?: string;
  genero?: string;
  ciudad?: string;
  estado?: string;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  antecedentes_medicos?: string;
  numero_expediente?: string;
  seguro_medico?: string;
  fecha_ultima_consulta?: string;
  creation_source?: string;
  marketing_source?: string;
  estado_paciente: PatientStatus;
  diagnostico_principal?: DiagnosisType;
  diagnostico_principal_detalle?: string;
  doctor_asignado_id?: string;
  fecha_primera_consulta?: string;
  comentarios_registro?: string;
  origen_paciente?: string;
  probabilidad_cirugia?: number;
  ultimo_contacto?: string;
  proximo_contacto?: string;
  etiquetas?: string[];
  fecha_cirugia_programada?: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id?: string;
  fecha_hora_cita: string;
  motivos_consulta: string[];
  estado_cita: AppointmentStatus;
  es_primera_vez?: boolean;
  notas_breves?: string;
  created_at?: string;
  updated_at?: string;
  agendado_por?: string;
  fecha_agendamiento?: string;
}

export interface AppointmentWithPatient extends Appointment {
  patients: Pick<Patient, 
    'id' | 'nombre' | 'apellidos' | 'telefono' | 'email' | 
    'edad' | 'estado_paciente' | 'diagnostico_principal'
  >;
}

// Datos agregados para vistas de historial de paciente
export interface PatientHistoryData {
  patient?: Patient;
  appointments: AppointmentWithPatient[];
  survey_completion_rate?: number;
}

// Nota: tipos de Lead eliminados al migrar a CRM externo

// ==================== PROPS DE COMPONENTES ====================
export interface PatientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
}

export interface NewPatientFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export interface AdmissionPayload {
  // Personal info
  nombre: string;
  apellidos: string;
  telefono?: string;
  email?: string;
  genero?: 'Masculino' | 'Femenino' | 'Otro';
  fecha_nacimiento?: string;
  ciudad?: string;
  estado?: string;
  
  // Medical info
  antecedentes_medicos?: string;
  numero_expediente?: string;
  seguro_medico?: string;
  comentarios_registro?: string;
  diagnostico_principal: DiagnosisType;
  diagnostico_principal_detalle?: string;
  probabilidad_cirugia?: number;
  
  // Appointment info
  fecha_hora_cita: string; // ISO 8601
  motivos_consulta: string[];
  doctor_id?: string;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  creado_por_id?: string;
  creation_source?: string;
}

// Respuesta tipada de la API de admisión
export interface AdmissionDBResponse {
  message: string;
  patient_id: string;
  appointment_id: string;
  next_steps?: string[];
}

// ==================== PROPS DE UI ====================
export interface PatientCardProps {
  appointment: AppointmentWithPatient;
  onAction?: (action: AdmissionAction, appointmentId: string) => void;
  disableActions?: boolean;
  className?: string;
  // Control externo de expansión (opcional)
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface RescheduleProps {
  appointment: AppointmentWithPatient;
  onClose: () => void;
  onReschedule: (date: Date, time: string) => void | Promise<void>;
}

// ==================== CONFIGURACIÓN VISUAL ====================
export const APPOINTMENT_STATUS_CONFIG = {
  [AppointmentStatusEnum.PROGRAMADA]: {
    label: 'Programada',
    color: 'sky',
    bgClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300',
    textClass: 'text-sky-700 dark:text-sky-300',
    borderClass: 'border-sky-400 dark:border-sky-600',
    ringClass: 'ring-sky-100 dark:ring-sky-900/30',
    iconBg: 'bg-sky-100 dark:bg-sky-900/50',
    description: 'Cita programada',
  },
  [AppointmentStatusEnum.CONFIRMADA]: {
    label: 'Confirmada',
    color: 'emerald',
    bgClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-400 dark:border-emerald-600',
    ringClass: 'ring-emerald-100 dark:ring-emerald-900/30',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    description: 'Cita confirmada por paciente',
  },
  [AppointmentStatusEnum.PRESENTE]: {
    label: 'En Consulta',
    color: 'teal',
    bgClass: 'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300',
    textClass: 'text-teal-700 dark:text-teal-300',
    borderClass: 'border-teal-400 dark:border-teal-600',
    ringClass: 'ring-teal-100 dark:ring-teal-900/30',
    iconBg: 'bg-teal-100 dark:bg-teal-900/50',
    description: 'Paciente en consulta',
  },
  [AppointmentStatusEnum.COMPLETADA]: {
    label: 'Completada',
    color: 'green',
    bgClass: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300',
    textClass: 'text-green-700 dark:text-green-300',
    borderClass: 'border-green-400 dark:border-green-600',
    ringClass: 'ring-green-100 dark:ring-green-900/30',
    iconBg: 'bg-green-100 dark:bg-green-900/50',
    description: 'Consulta completada',
  },
  [AppointmentStatusEnum.CANCELADA]: {
    label: 'Cancelada',
    color: 'red',
    bgClass: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
    textClass: 'text-red-700 dark:text-red-300',
    borderClass: 'border-red-400 dark:border-red-600',
    ringClass: 'ring-red-100 dark:ring-red-900/30',
    iconBg: 'bg-red-100 dark:bg-red-900/50',
    description: 'Cita cancelada',
  },
  [AppointmentStatusEnum.NO_ASISTIO]: {
    label: 'No Asistió',
    color: 'amber',
    bgClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-400 dark:border-amber-600',
    ringClass: 'ring-amber-100 dark:ring-amber-900/30',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    description: 'Paciente no asistió',
  },
  [AppointmentStatusEnum.REAGENDADA]: {
    label: 'Reagendada',
    color: 'violet',
    bgClass: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300',
    textClass: 'text-violet-700 dark:text-violet-300',
    borderClass: 'border-violet-400 dark:border-violet-600',
    ringClass: 'ring-violet-100 dark:ring-violet-900/30',
    iconBg: 'bg-violet-100 dark:bg-violet-900/50',
    description: 'Cita reagendada',
  },
} as const;

// Mapeo de acciones de UI a estados de cita
export const ACTION_TO_STATUS_MAP: Record<AdmissionAction, AppointmentStatus | null> = {
  checkIn: AppointmentStatusEnum.PRESENTE,
  complete: AppointmentStatusEnum.COMPLETADA,
  cancel: AppointmentStatusEnum.CANCELADA,
  noShow: AppointmentStatusEnum.NO_ASISTIO,
  reschedule: AppointmentStatusEnum.REAGENDADA,
  viewHistory: null,
};

// ==================== SCHEMAS OPTIMIZADOS ====================
export const NewPatientSchema = z.object({
  // Requeridos
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(50),
  apellidos: z.string().min(2, "Mínimo 2 caracteres").max(50),
  diagnostico_principal: ZDiagnosisDb,
  fechaConsulta: z.date({ required_error: "Fecha requerida" }),
  horaConsulta: z.string().regex(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/, "Formato HH:MM"),
  
  // Opcionales
  telefono: z.string().regex(/^[0-9+\-\s()]{10,15}$/, "Teléfono inválido").optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  edad: z.number().int().min(0).max(120).optional(),
  genero: z.enum(['Masculino', 'Femenino', 'Otro']).optional(),
  fecha_nacimiento: z.string().optional().or(z.literal("")),
  ciudad: z.string().max(100).optional().or(z.literal("")),
  estado: z.string().max(100).optional().or(z.literal("")),
  contacto_emergencia_nombre: z.string().max(100).optional().or(z.literal("")),
  contacto_emergencia_telefono: z.string().regex(/^[0-9+\-\s()]{10,15}$/i, "Teléfono inválido").optional().or(z.literal("")),
  antecedentes_medicos: z.string().max(1000).optional().or(z.literal("")),
  numero_expediente: z.string().max(50).optional().or(z.literal("")),
  seguro_medico: z.string().max(100).optional().or(z.literal("")),
  comentarios_registro: z.string().max(500).optional(),
  probabilidad_cirugia: z.number().min(0).max(1).optional(),
  doctor_id: z.string().uuid().optional(),
});

export type NewPatientFormData = z.infer<typeof NewPatientSchema>;

// ==================== UTILIDADES ====================
export const getPatientFullName = (patient: { nombre?: string; apellidos?: string } | null): string => {
  if (!patient) return 'Sin nombre';
  return `${patient.nombre || ''} ${patient.apellidos || ''}`.trim() || 'Sin nombre';
};

export const getStatusConfig = (status: AppointmentStatus) => {
  return APPOINTMENT_STATUS_CONFIG[status] || APPOINTMENT_STATUS_CONFIG[AppointmentStatusEnum.PROGRAMADA];
};

export const canPerformAction = (
  appointment: AppointmentWithPatient, 
  action: AdmissionAction
): boolean => {
  const status = appointment.estado_cita;
  
  // Conjuntos tipados para evitar problemas de unión estrecha en Array.includes
  const canCheckInStatuses = new Set<AppointmentStatus>([
    AppointmentStatusEnum.PROGRAMADA,
    AppointmentStatusEnum.CONFIRMADA,
  ]);
  const canCancelStatuses = new Set<AppointmentStatus>([
    AppointmentStatusEnum.PROGRAMADA,
    AppointmentStatusEnum.CONFIRMADA,
  ]);
  const canNoShowStatuses = new Set<AppointmentStatus>([
    AppointmentStatusEnum.PROGRAMADA,
    AppointmentStatusEnum.CONFIRMADA,
  ]);
  const canRescheduleStatuses = new Set<AppointmentStatus>([
    AppointmentStatusEnum.PROGRAMADA,
    AppointmentStatusEnum.CONFIRMADA,
    AppointmentStatusEnum.CANCELADA,
  ]);
  
  const rules: Record<AdmissionAction, () => boolean> = {
    checkIn: () => canCheckInStatuses.has(status),
    complete: () => status === AppointmentStatusEnum.PRESENTE,
    cancel: () => canCancelStatuses.has(status),
    noShow: () => canNoShowStatuses.has(status),
    reschedule: () => canRescheduleStatuses.has(status),
    viewHistory: () => true,
  };
  
  return rules[action]?.() ?? false;
};