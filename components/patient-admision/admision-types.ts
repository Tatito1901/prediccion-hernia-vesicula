// types/admission-types-corrected.ts - CORREGIDO PARA TU ESQUEMA REAL DE SUPABASE
import { z } from 'zod';

// ==================== ESTADOS REALES SEGÚN TU ESQUEMA ====================
// Tu esquema usa TEXT, no ENUM
export type AppointmentStatus = 
  | 'PROGRAMADA'
  | 'CONFIRMADA' 
  | 'EN_SALA'
  | 'EN_CONSULTA'
  | 'COMPLETADA'
  | 'CANCELADA'
  | 'NO_ASISTIO'
  | 'REAGENDADA';

// Según tu esquema database.types.ts
export type PatientStatus = 
  | 'PENDIENTE DE CONSULTA'
  | 'CONSULTADO'
  | 'EN SEGUIMIENTO'
  | 'OPERADO'
  | 'NO OPERADO'
  | 'INDECISO';

// Según tu esquema database.types.ts
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

export type UserRole = 'doctor' | 'admin' | 'recepcion';

export type AdmissionAction = 
  | 'checkIn'
  | 'startConsult' 
  | 'complete'
  | 'cancel'
  | 'noShow'
  | 'reschedule'
  | 'viewHistory';

export type TabType = 'newPatient' | 'today' | 'future' | 'past';

// ==================== INTERFACES SEGÚN TU ESQUEMA REAL ====================
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
  probabilidad_cirugia?: number; // NUMERIC 0-1, no 0-100
  ultimo_contacto?: string; // DATE
  proximo_contacto?: string; // DATE
  etiquetas?: string[];
  fecha_cirugia_programada?: string; // DATE
  id_legacy?: number;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id?: string;
  fecha_hora_cita: string; // TIMESTAMPTZ
  motivo_cita: string;
  estado_cita: string; // TEXT, no ENUM en tu esquema
  es_primera_vez?: boolean;
  notas_cita_seguimiento?: string;
  created_at?: string;
}

export interface AppointmentWithPatient extends Appointment {
  patients: Patient;
  profiles?: {
    id: string;
    username?: string;
    full_name?: string;
    role?: string;
  };
}

export interface AppointmentHistory {
  id: string;
  appointment_id: string;
  estado_cita_anterior?: string; // USER-DEFINED en tu esquema
  estado_cita_nuevo: string;     // USER-DEFINED en tu esquema
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

// ==================== VALIDACIÓN CORREGIDA PARA TU ESQUEMA ====================
export const NewPatientSchema = z.object({
  // Campos requeridos según tu esquema
  nombre: z.string().min(2, "Nombre debe tener al menos 2 caracteres").max(50),
  apellidos: z.string().min(2, "Apellidos debe tener al menos 2 caracteres").max(50),
  
  // Campos opcionales según tu esquema
  telefono: z.string().regex(/^[0-9+\-\s()]{10,15}$/, "Teléfono inválido").optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  edad: z.number().min(0).max(120).optional(),
  
  // Diagnóstico usando tus enums reales
  motivoConsulta: z.enum([
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
  ]),
  
  // Cita
  fechaConsulta: z.date({ required_error: "Fecha requerida" }),
  horaConsulta: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido"),
  
  // Campos opcionales
  notas: z.string().max(500, "Notas muy largas").optional(),
  
  // CORREGIDO: Probabilidad como decimal 0-1, no 0-100
  probabilidad_cirugia: z.number().min(0).max(1).optional(),
});

export type NewPatientForm = z.infer<typeof NewPatientSchema>;

// ==================== PAYLOAD CORREGIDO PARA TU RPC ====================
export interface AdmissionPayload {
  // Parámetros que SÍ acepta tu RPC actual
  nombre: string;
  apellidos: string;
  telefono?: string;
  edad?: number;
  motivo_cita: string;
  fecha_hora_cita: string;
  diagnostico_principal: DiagnosisType;
  comentarios_registro?: string;
  
  // NOTA: Tu RPC actual NO acepta estos campos:
  // - email
  // - probabilidad_cirugia
  // - doctor_id
  // - notas_cita
  // - es_primera_vez
}

export interface AppointmentUpdatePayload {
  appointmentId: string;
  newStatus: string; // TEXT, no ENUM
  motivo_cambio?: string;
  nuevaFechaHora?: string;
  notas_adicionales?: string;
}

// ==================== RESPUESTAS DE API ====================
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  summary?: {
    today_count: number;
    future_count: number;
    past_count: number;
    total_appointments: number;
  };
}

// ==================== CONFIGURACIÓN CORREGIDA ====================
export const STATUS_CONFIG: Record<string, {
  label: string;
  color: 'default' | 'secondary' | 'success' | 'warning' | 'destructive';
  allowedTransitions: string[];
  requiresConfirmation: boolean;
}> = {
  'PROGRAMADA': {
    label: 'Programada',
    color: 'secondary',
    allowedTransitions: ['CONFIRMADA', 'EN_SALA', 'CANCELADA', 'NO_ASISTIO', 'REAGENDADA'],
    requiresConfirmation: false,
  },
  'CONFIRMADA': {
    label: 'Confirmada',
    color: 'default',
    allowedTransitions: ['EN_SALA', 'CANCELADA', 'NO_ASISTIO', 'REAGENDADA'],
    requiresConfirmation: false,
  },
  'EN_SALA': {
    label: 'En Sala',
    color: 'warning',
    allowedTransitions: ['EN_CONSULTA', 'CANCELADA'],
    requiresConfirmation: false,
  },
  'EN_CONSULTA': {
    label: 'En Consulta',
    color: 'warning',
    allowedTransitions: ['COMPLETADA', 'REAGENDADA'],
    requiresConfirmation: false,
  },
  'COMPLETADA': {
    label: 'Completada',
    color: 'success',
    allowedTransitions: [],
    requiresConfirmation: false,
  },
  'CANCELADA': {
    label: 'Cancelada',
    color: 'destructive',
    allowedTransitions: ['REAGENDADA'],
    requiresConfirmation: true,
  },
  'NO_ASISTIO': {
    label: 'No Asistió',
    color: 'destructive',
    allowedTransitions: ['REAGENDADA'],
    requiresConfirmation: true,
  },
  'REAGENDADA': {
    label: 'Reagendada',
    color: 'default',
    allowedTransitions: ['PROGRAMADA'],
    requiresConfirmation: true,
  },
} as const;

// ==================== HELPERS DE CONVERSIÓN ====================
// Convertir probabilidad de porcentaje (0-100) a decimal (0-1) para la BD
export const convertProbabilityToDecimal = (percentage?: number): number | undefined => {
  if (percentage === undefined || percentage === null) return undefined;
  return percentage / 100;
};

// Convertir probabilidad de decimal (0-1) a porcentaje (0-100) para la UI
export const convertProbabilityToPercentage = (decimal?: number): number | undefined => {
  if (decimal === undefined || decimal === null) return undefined;
  return Math.round(decimal * 100);
};

// Mapeo de acciones a estados para tu esquema TEXT
export const ACTION_TO_STATUS_MAP: Record<AdmissionAction, string | null> = {
  checkIn: 'EN_SALA',
  startConsult: 'EN_CONSULTA',
  complete: 'COMPLETADA',
  cancel: 'CANCELADA',
  noShow: 'NO_ASISTIO',
  reschedule: 'REAGENDADA',
  viewHistory: null,
} as const;

// ==================== CONFIGURACIÓN DE CLÍNICA ====================
// Configuración para paginación y otros ajustes de la clínica
export const CLINIC_CONFIG = {
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [5, 10, 25, 50],
    MAX_PAGES_SHOWN: 5,
    INITIAL_PAGE: 1
  }
} as const;