// components/patient-admision/admision-types.ts
// TIPOS CORREGIDOS Y UNIFICADOS PARA EL FLUJO DE ADMISIÓN

import { z } from 'zod';

// ==================== TIPOS BASE SEGÚN TU ESQUEMA REAL ====================

// ✅ Estados de cita según tu database.types.ts
export type AppointmentStatus = 
  | 'PROGRAMADA'
  | 'CONFIRMADA' 
  | 'PRESENTE'
  | 'EN_CONSULTA'
  | 'COMPLETADA'
  | 'CANCELADA'
  | 'NO_ASISTIO'
  | 'REAGENDADA';

// ✅ Estados de paciente según tu database.types.ts
export type PatientStatus = 
  | 'PENDIENTE_DE_CONSULTA'
  | 'CONSULTADO'
  | 'EN_SEGUIMIENTO'
  | 'OPERADO'
  | 'NO_OPERADO'
  | 'INDECISO';

// ✅ Diagnósticos según tu database.types.ts
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

// ✅ Roles de usuario según tu database.types.ts
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

// ✅ Datos del paciente según tu esquema
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
  fecha_registro: string; // DATE
  estado_paciente: PatientStatus;
  diagnostico_principal?: DiagnosisType;
  diagnostico_principal_detalle?: string;
  doctor_asignado_id?: string;
  fecha_primera_consulta?: string; // DATE
  comentarios_registro?: string;
  origen_paciente?: string;
  probabilidad_cirugia?: number; // NUMERIC 0-1
  ultimo_contacto?: string; // DATE
  proximo_contacto?: string; // DATE
  etiquetas?: string[];
  fecha_cirugia_programada?: string; // DATE
  id_legacy?: number;
}

// ✅ Datos de la cita según tu esquema
export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id?: string;
  fecha_hora_cita: string; // TIMESTAMPTZ como ISO string
  motivo_cita: string;
  estado_cita: AppointmentStatus; // Corregido para usar el enum
  es_primera_vez?: boolean;
  notas_cita_seguimiento?: string;
  created_at?: string;
}

// ✅ Cita con datos del paciente (para la interfaz)
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
  };
  profiles?: {
    id: string;
    full_name?: string;
    username?: string;
    role?: UserRole;
  };
}

// ✅ Historial de cambios de cita
export interface AppointmentHistory {
  id: string;
  appointment_id: string;
  estado_cita_anterior?: AppointmentStatus;
  estado_cita_nuevo: AppointmentStatus;
  fecha_cambio: string;
  fecha_cita_anterior?: string;
  fecha_cita_nueva?: string;
  modificado_por_id: string;
  notas?: string;
  motivo_cambio?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ==================== SCHEMAS DE VALIDACIÓN ====================

// ✅ Schema para nuevo paciente (corregido)
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
  
  // Diagnóstico usando valores reales
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
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido")
    .min(1, "Hora de consulta es requerida"),
  
  // Campos adicionales
  motivoConsulta: z.string()
    .min(5, "Motivo debe tener al menos 5 caracteres")
    .max(200, "Motivo muy largo"),
  comentarios_registro: z.string()
    .max(500, "Comentarios muy largos")
    .optional(),
  
  // Probabilidad como decimal 0-1
  probabilidad_cirugia: z.number()
    .min(0, "Probabilidad no puede ser negativa")
    .max(1, "Probabilidad no puede ser mayor a 1")
    .optional(),
});

export type NewPatientForm = z.infer<typeof NewPatientSchema>;

// ✅ Schema para actualización de estado de cita
export const AppointmentStatusUpdateSchema = z.object({
  appointmentId: z.string().uuid("ID de cita inválido"),
  newStatus: z.enum([
    'PROGRAMADA',
    'CONFIRMADA',
    'PRESENTE',
    'EN_CONSULTA',
    'COMPLETADA',
    'CANCELADA',
    'NO_ASISTIO',
    'REAGENDADA'
  ]),
  motivo_cambio: z.string().max(200).optional(),
  fecha_hora_cita: z.string().datetime().optional(),
  notas_adicionales: z.string().max(500).optional(),
});

// ==================== PAYLOADS PARA APIs ====================

// ✅ Payload para admisión (corregido para tu RPC)
export interface AdmissionPayload {
  nombre: string;
  apellidos: string;
  telefono?: string;
  email?: string;
  edad?: number;
  diagnostico_principal: DiagnosisType;
  comentarios_registro?: string;
  probabilidad_cirugia?: number; // 0-1 decimal
  fecha_hora_cita: string; // ISO string
  motivo_cita: string;
  doctor_id?: string;
}

// ✅ Respuesta de admisión
export interface AdmissionResponse {
  success: boolean;
  message: string;
  patient_id: string;
  appointment_id: string;
  patient: Partial<Patient>;
  appointment: Partial<Appointment>;
}

// ✅ Payload para actualización de estado
export interface AppointmentStatusUpdatePayload {
  appointmentId: string;
  newStatus: AppointmentStatus;
  motivo_cambio?: string;
  fecha_hora_cita?: string;
  notas_adicionales?: string;
}

// ==================== CONFIGURACIÓN DE ESTADOS ====================

// ✅ Configuración visual para estados de cita
export const APPOINTMENT_STATUS_CONFIG = {
  PROGRAMADA: {
    label: 'Programada',
    color: 'blue',
    bgClass: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Cita programada, esperando confirmación',
  },
  CONFIRMADA: {
    label: 'Confirmada',
    color: 'green',
    bgClass: 'bg-green-100 text-green-800 border-green-200',
    description: 'Cita confirmada por el paciente',
  },
  PRESENTE: {
    label: 'Presente',
    color: 'emerald',
    bgClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Paciente presente, esperando consulta',
  },
  EN_CONSULTA: {
    label: 'En Consulta',
    color: 'purple',
    bgClass: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Consulta médica en progreso',
  },
  COMPLETADA: {
    label: 'Completada',
    color: 'green',
    bgClass: 'bg-green-100 text-green-800 border-green-200',
    description: 'Consulta completada exitosamente',
  },
  CANCELADA: {
    label: 'Cancelada',
    color: 'red',
    bgClass: 'bg-red-100 text-red-800 border-red-200',
    description: 'Cita cancelada',
  },
  NO_ASISTIO: {
    label: 'No Asistió',
    color: 'orange',
    bgClass: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'Paciente no se presentó a la cita',
  },
  REAGENDADA: {
    label: 'Reagendada',
    color: 'yellow',
    bgClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
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

// ✅ Props para AppointmentCard
export interface AppointmentCardProps {
  appointment: AppointmentWithPatient;
  onAction?: (action: AdmissionAction, appointmentId: string) => void;
  disableActions?: boolean;
  showReschedule?: boolean;
  showCancel?: boolean;
  showComplete?: boolean;
  className?: string;
}

// ✅ Response de API de citas
export interface AppointmentsApiResponse {
  data: AppointmentWithPatient[];
  hasMore: boolean;
  page: number;
  total: number;
  counts?: {
    today: number;
    future: number;
    past: number;
    newPatient: number;
  };
}

// ✅ Filtros para consultas
export interface AppointmentFilters {
  tab?: TabType;
  search?: string;
  status?: AppointmentStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
  doctorId?: string;
  page?: number;
  pageSize?: number;
}

// ==================== TIPOS DE VALIDACIÓN DE NEGOCIO ====================

// ✅ Resultado de validación
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// ✅ Contexto para reglas de negocio
export interface BusinessRuleContext {
  currentTime?: Date;
  userRole?: UserRole;
  doctorId?: string;
}

// ==================== TIPOS PARA ENCUESTAS (si es necesario) ====================

export interface SurveyData {
  overall_rating: number;
  service_quality?: number;
  wait_time_satisfaction?: number;
  doctor_communication?: number;
  would_recommend?: boolean;
  suggestions?: string;
  surveyTemplateId: number;
}

export interface SurveyStatus {
  completed: boolean;
  completedAt?: string;
  rating?: number;
}

// ==================== TIPOS DE HISTORIAL DE PACIENTE ====================

export interface PatientHistoryData {
  appointments: AppointmentWithPatient[];
  totalAppointments: number;
  lastVisit?: string;
  nextAppointment?: AppointmentWithPatient;
  treatmentStatus: PatientStatus;
}

// ==================== TIPOS DE RESPUESTA GENÉRICA ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ==================== UTILITIES ====================

// ✅ Helper para obtener datos del paciente
export const getPatientData = (appointment: AppointmentWithPatient) => {
  return appointment.patients;
};

// ✅ Helper para verificar si se puede realizar una acción
export const canPerformAction = (
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

// ✅ Helper para formatear nombre completo
export const getPatientFullName = (patient: { nombre?: string; apellidos?: string }): string => {
  return `${patient.nombre || ''} ${patient.apellidos || ''}`.trim() || 'Sin nombre';
};

// ✅ Helper para obtener configuración de estado
export const getStatusConfig = (status: AppointmentStatus) => {
  return APPOINTMENT_STATUS_CONFIG[status] || APPOINTMENT_STATUS_CONFIG.PROGRAMADA;
};

// ==================== EXPORTS ====================
export default {
  // Tipos principales
  type AppointmentWithPatient,
  type AdmissionAction,
  type TabType,
  type AppointmentStatus,
  
  // Schemas de validación
  NewPatientSchema,
  AppointmentStatusUpdateSchema,
  
  // Configuraciones
  APPOINTMENT_STATUS_CONFIG,
  ACTION_TO_STATUS_MAP,
  
  // Helpers
  getPatientData,
  canPerformAction,
  getPatientFullName,
  getStatusConfig,
};