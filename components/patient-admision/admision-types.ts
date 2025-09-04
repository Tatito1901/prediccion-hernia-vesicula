// components/patient-admission/admision-types.ts
// TIPOS OPTIMIZADOS PARA EL FLUJO DE ADMISIÓN - CLÍNICA HERNIA Y VESÍCULA

import { z } from 'zod';
import { 
  AppointmentStatusEnum,
  PatientStatus,
  APPOINTMENT_STATUS_CONFIG,
  type AdmissionAction,
  ACTION_TO_STATUS_MAP,
  ZAppointmentStatus,
  ZDiagnosisDb,
  type DbDiagnosis
} from '@/lib/constants';
import { 
  canCheckIn,
  canCompleteAppointment,
  canCancelAppointment,
  canMarkNoShow,
  canRescheduleAppointment,
} from '@/lib/admission-business-rules';

// ==================== TIPOS BASE ====================
export type AppointmentStatus = z.infer<typeof ZAppointmentStatus>;

export type DiagnosisType = DbDiagnosis;
// UserRole is imported from @/lib/constants
export type { PatientStatus };

// Re-exported from centralized source
export type { AdmissionAction } from '@/lib/constants';

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
// Re-exported from centralized source
export { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants';

// Mapeo de acciones de UI a estados de cita
// Re-exported from centralized source
export { ACTION_TO_STATUS_MAP } from '@/lib/constants';

// ==================== SCHEMAS OPTIMIZADOS ====================
export const NewPatientSchema = z.object({
  // Requeridos
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(50),
  apellidos: z.string().min(2, "Mínimo 2 caracteres").max(50),
  diagnostico_principal: ZDiagnosisDb,
  fechaConsulta: z.date(),
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

// Re-exportar la función centralizada
export const canPerformAction = (
  appointment: AppointmentWithPatient, 
  action: AdmissionAction
): boolean => {
  switch (action) {
    case 'checkIn':
      return canCheckIn(appointment).valid;
    case 'complete':
      return canCompleteAppointment(appointment).valid;
    case 'cancel':
      return canCancelAppointment(appointment).valid;
    case 'noShow':
      return canMarkNoShow(appointment).valid;
    case 'reschedule':
      return canRescheduleAppointment(appointment).valid;
    case 'viewHistory':
      return true;
    default:
      return false;
  }
};