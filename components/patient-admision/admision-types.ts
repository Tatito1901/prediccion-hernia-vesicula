// components/patient-admision/admision-types.ts
// TIPOS UNIFICADOS Y CORREGIDOS PARA EL FLUJO DE ADMISIÓN

import { z } from 'zod';

// ==================== TIPOS BASE SEGÚN DATABASE.TYPES.TS ====================

// ✅ Estados de cita exactamente como en la base de datos
export type AppointmentStatus = 
  | 'PROGRAMADA'
  | 'CONFIRMADA' 
  | 'PRESENTE'
  | 'EN_CONSULTA'
  | 'COMPLETADA'
  | 'CANCELADA'
  | 'NO_ASISTIO'
  | 'REAGENDADA';

// ✅ Estados de paciente según la base de datos
export type PatientStatus = 
  | 'PENDIENTE_DE_CONSULTA'
  | 'CONSULTADO'
  | 'EN_SEGUIMIENTO'
  | 'OPERADO'
  | 'NO_OPERADO'
  | 'INDECISO';

// ✅ Diagnósticos exactamente como en el enum de la base de datos
export type DiagnosisType = 
  | 'HERNIA INGUINAL'
  | 'HERNIA UMBILICAL'
  | 'COLECISTITIS'
  | 'COLEDOCOLITIASIS'
  | 'COLANGITIS'
  | 'APENDICITIS'
  | 'HERNIA HIATAL'
  | 'LIPOMA GRANDE'
  | 'HERNIA INGUINAL RECIDIVANTE'
  | 'QUISTE SEBACEO INFECTADO'
  | 'EVENTRACION ABDOMINAL'
  | 'VESICULA (COLECISTITIS CRONICA)'
  | 'OTRO'
  | 'HERNIA SPIGEL';

// ✅ Roles de usuario
export type UserRole = 'doctor' | 'admin' | 'recepcion';

// ✅ Acciones disponibles en el flujo de admisión
export type AdmissionAction = 
  | 'checkIn'
  | 'startConsult' 
  | 'complete'
  | 'cancel'
  | 'noShow'
  | 'reschedule'
  | 'viewHistory';

// ✅ Tipos de tabs en la interfaz
export type TabType = 'newPatient' | 'today' | 'future' | 'past';

// ==================== INTERFACES PRINCIPALES ====================

// ✅ Datos del paciente según el esquema de BD
export interface Patient {
  id: string;
  created_at: string;
  updated_at: string;
  creado_por_id?: string;
  nombre: string;
  apellidos: string;
  edad?: number;
  telefono?: string;
  email?: string;
  fecha_registro: string;
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
  id_legacy?: number;
}

// ✅ Datos de la cita según el esquema de BD
export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id?: string;
  fecha_hora_cita: string; // TIMESTAMPTZ como ISO string
  motivo_cita: string;
  estado_cita: AppointmentStatus;
  es_primera_vez?: boolean;
  notas_cita_seguimiento?: string;
  created_at?: string;
}

// ✅ Cita con datos del paciente (TIPO UNIFICADO para toda la app)
export interface AppointmentWithPatient extends Appointment {
  patients: {
    id: string;
    nombre?: string;
    apellidos?: string;
    telefono?: string;
    email?: string;
    edad?: number;
    estado_paciente?: PatientStatus;
    diagnostico_principal?: DiagnosisType;
  } | null;
  profiles?: {
    id: string;
    full_name?: string;
    username?: string;
    role?: UserRole;
  } | null;
}

// ✅ Datos de encuesta
export interface SurveyData {
  overall_rating: number;
  waiting_time_rating: number;
  staff_rating: number;
  facility_rating: number;
  recommendation_rating: number;
  comments?: string;
}

// ✅ Estado de encuesta
export interface SurveyStatus {
  id: string;
  appointment_id: string;
  survey_status: 'pendiente' | 'iniciada' | 'completada';
  start_time?: string;
  completion_time?: string;
  survey_data?: SurveyData;
}

// ✅ Historial del paciente
export interface PatientHistoryData {
  patient: {
    id: string;
    nombre: string;
    apellidos: string;
    telefono?: string;
    email?: string;
    created_at: string;
  };
  appointments: AppointmentWithPatient[];
  totalAppointments: number;
  lastVisit?: string;
  nextAppointment?: AppointmentWithPatient;
  survey_completion_rate?: number;
}

// ==================== SCHEMAS DE VALIDACIÓN ====================

// ✅ Schema para nuevo paciente (CORREGIDO con valores exactos de la BD)
export const NewPatientSchema = z.object({
  // Campos requeridos
  nombre: z.string().min(2, "Nombre debe tener al menos 2 caracteres").max(50),
  apellidos: z.string().min(2, "Apellidos debe tener al menos 2 caracteres").max(50),
  
  // Campos opcionales
  telefono: z.string()
    .regex(/^[0-9+\-\s()]{10,15}$/, "Teléfono inválido")
    .optional()
    .or(z.literal("")),
  email: z.string()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  edad: z.number()
    .min(0, "Edad no puede ser negativa")
    .max(120, "Edad no puede ser mayor a 120")
    .optional(),
  
  // Diagnóstico usando valores exactos de la BD
  diagnostico_principal: z.enum([
    'HERNIA INGUINAL',
    'HERNIA UMBILICAL', 
    'COLECISTITIS',
    'COLEDOCOLITIASIS',
    'COLANGITIS',
    'APENDICITIS',
    'HERNIA HIATAL',
    'LIPOMA GRANDE',
    'HERNIA INGUINAL RECIDIVANTE',
    'QUISTE SEBACEO INFECTADO',
    'EVENTRACION ABDOMINAL',
    'VESICULA (COLECISTITIS CRONICA)',
    'OTRO',
    'HERNIA SPIGEL'
  ], { required_error: "Diagnóstico principal es requerido" }),
  
  // Cita
  fechaConsulta: z.date({ required_error: "Fecha de consulta es requerida" }),
  horaConsulta: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/, "Hora inválida (HH:MM)"),
  
  // Opcionales
  comentarios_registro: z.string().max(500).optional(),
  probabilidad_cirugia: z.number().min(0).max(1).optional(),
  doctor_id: z.string().uuid().optional(),
});

// ✅ Schema para actualización de estado de cita
export const AppointmentStatusUpdateSchema = z.object({
  appointmentId: z.string().uuid(),
  newStatus: z.enum([
    'PROGRAMADA', 'CONFIRMADA', 'PRESENTE', 'EN_CONSULTA', 
    'COMPLETADA', 'CANCELADA', 'NO_ASISTIO', 'REAGENDADA'
  ]),
  motivo_cambio: z.string().optional(),
  fecha_hora_cita: z.string().optional(),
  notas_adicionales: z.string().optional(),
});

// ==================== TIPOS PARA API ====================

// ✅ Payload para admisión (prefijos p_ según la función de BD)
export interface AdmissionPayload {
  nombre: string;
  apellidos: string;
  telefono?: string;
  email?: string;
  edad?: number;
  diagnostico_principal: DiagnosisType;
  comentarios_registro?: string;
  probabilidad_cirugia?: number;
  fecha_hora_cita: string; // ISO string
  motivo_cita: string;
  doctor_id?: string;
}

// ✅ Respuesta de la API de admisión
export interface AdmissionDBResponse {
  success: boolean;
  message: string;
  created_patient_id: string;
  created_appointment_id: string;
  validation_errors?: Array<{
    field: string;
    message: string;
  }>;
  suggested_times?: Array<{
    time_formatted: string;
    datetime: string;
  }>;
}

// ✅ Payload para actualización de estado
export interface AppointmentStatusUpdatePayload {
  appointmentId: string;
  newStatus: AppointmentStatus;
  motivo_cambio?: string;
  fecha_hora_cita?: string;
  notas_adicionales?: string;
}

// ✅ Respuesta genérica de API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ==================== CONFIGURACIÓN DE ESTADOS ====================

// ✅ Configuración visual para estados de cita
export const APPOINTMENT_STATUS_CONFIG = {
  PROGRAMADA: {
    label: 'Programada',
    color: 'blue',
    colorName: 'blue',
    bgClass: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100',
    description: 'Cita programada, esperando confirmación',
  },
  CONFIRMADA: {
    label: 'Confirmada',
    color: 'green',
    colorName: 'green',
    bgClass: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100',
    description: 'Cita confirmada por el paciente',
  },
  PRESENTE: {
    label: 'Presente',
    color: 'emerald',
    colorName: 'emerald',
    bgClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-100',
    description: 'Paciente presente, esperando consulta',
  },
  EN_CONSULTA: {
    label: 'En Consulta',
    color: 'purple',
    colorName: 'purple',
    bgClass: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-100',
    description: 'Consulta médica en progreso',
  },
  COMPLETADA: {
    label: 'Completada',
    color: 'green',
    colorName: 'green',
    bgClass: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100',
    description: 'Consulta completada exitosamente',
  },
  CANCELADA: {
    label: 'Cancelada',
    color: 'red',
    colorName: 'red',
    bgClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100',
    description: 'Cita cancelada',
  },
  NO_ASISTIO: {
    label: 'No Asistió',
    color: 'orange',
    colorName: 'orange',
    bgClass: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-100',
    description: 'Paciente no se presentó a la cita',
  },
  REAGENDADA: {
    label: 'Reagendada',
    color: 'yellow',
    colorName: 'yellow',
    bgClass: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100',
    description: 'Cita reagendada para nueva fecha',
  },
} as const;

// ✅ Mapeo de acciones a estados
export const ACTION_TO_STATUS_MAP: Record<AdmissionAction, AppointmentStatus | null> = {
  checkIn: 'PRESENTE',
  startConsult: 'EN_CONSULTA',
  complete: 'COMPLETADA',
  cancel: 'CANCELADA',
  noShow: 'NO_ASISTIO',
  reschedule: 'REAGENDADA',
  viewHistory: null, // No cambia estado
};

// ==================== TIPOS PARA INTERFAZ ====================

// ✅ Props para PatientCard
export interface PatientCardProps {
  appointment: AppointmentWithPatient;
  onAction?: (action: AdmissionAction, appointmentId: string) => void;
  disableActions?: boolean;
  className?: string;
}

// ✅ Props para NewPatientForm
export interface NewPatientFormProps {
  onSuccess?: (data: AdmissionDBResponse) => void;
  onCancel?: () => void;
  className?: string;
}

// ✅ Props para PatientHistoryModal
export interface PatientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
}

// ✅ Props para RescheduleDatePicker
export interface RescheduleProps {
  appointment: AppointmentWithPatient;
  onClose: () => void;
  onReschedule: (date: Date, time: string) => void;
}

// ✅ Resultado de validación
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// ✅ Contexto de reglas de negocio
export interface BusinessRuleContext {
  currentTime?: Date;
  allowOverride?: boolean;
  userRole?: UserRole;
}

// ==================== UTILITIES ====================

// ✅ Helper para obtener datos del paciente
export const getPatientData = (appointment: AppointmentWithPatient) => {
  return appointment.patients;
};

// ✅ Helper para formatear nombre completo
export const getPatientFullName = (patient: { nombre?: string; apellidos?: string } | null): string => {
  if (!patient) return 'Sin nombre';
  return `${patient.nombre || ''} ${patient.apellidos || ''}`.trim() || 'Sin nombre';
};

// ✅ Helper para obtener configuración de estado
export const getStatusConfig = (status: AppointmentStatus) => {
  return APPOINTMENT_STATUS_CONFIG[status] || APPOINTMENT_STATUS_CONFIG.PROGRAMADA;
};

// ✅ Helper para verificar si se puede realizar una acción (básico)
export const canPerformActionBasic = (
  appointment: AppointmentWithPatient, 
  action: AdmissionAction
): boolean => {
  const status = appointment.estado_cita;
  
  switch (action) {
    case 'checkIn':
      return ['PROGRAMADA', 'CONFIRMADA'].includes(status);
    case 'startConsult':
      return status === 'PRESENTE';
    case 'complete':
      return ['EN_CONSULTA', 'PRESENTE'].includes(status);
    case 'cancel':
      return ['PROGRAMADA', 'CONFIRMADA'].includes(status);
    case 'noShow':
      return ['PROGRAMADA', 'CONFIRMADA'].includes(status);
    case 'reschedule':
      return ['PROGRAMADA', 'CONFIRMADA', 'CANCELADA'].includes(status);
    case 'viewHistory':
      return true; // Siempre disponible
    default:
      return false;
  }
};

// ==================== EXPORTS ====================
export type { 
  AppointmentWithPatient as AppointmentData, // Alias para compatibilidad
};

// Note: APPOINTMENT_STATUS_CONFIG, getPatientFullName, and getStatusConfig are already exported inline

export default {
  // Tipos principales
  NewPatientSchema,
  AppointmentStatusUpdateSchema,
  APPOINTMENT_STATUS_CONFIG,
  ACTION_TO_STATUS_MAP,
  
  // Helpers
  getPatientData,
  canPerformActionBasic,
  getPatientFullName,
  getStatusConfig,
};