// components/patient-admission/admision-types.ts
// TIPOS OPTIMIZADOS PARA EL FLUJO DE ADMISIÓN - CLÍNICA HERNIA Y VESÍCULA

import { z } from 'zod';
import type { UserRole as DbUserRole } from '@/lib/types';
import { 
  ZAppointmentStatus, 
  ZContactChannel, 
  ZLeadMotive, 
  ZLeadStatus, 
  ZDiagnosisDb, 
  type DbDiagnosis 
} from '@/lib/validation/enums';

// ==================== TIPOS BASE ====================
export type AppointmentStatus = z.infer<typeof ZAppointmentStatus>;

export type PatientStatus = 
  | 'potencial'
  | 'activo'
  | 'operado'
  | 'no_operado'
  | 'en_seguimiento'
  | 'inactivo'
  | 'alta_medica';

export type LeadChannel = z.infer<typeof ZContactChannel>;
export type LeadMotive = z.infer<typeof ZLeadMotive>;
export type LeadStatus = z.infer<typeof ZLeadStatus>;
export type DiagnosisType = DbDiagnosis;
export type UserRole = DbUserRole;

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
  lead_id?: string;
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

export interface Lead {
  id?: string;
  full_name: string;
  phone_number: string;
  email?: string | null;
  channel: LeadChannel;
  motive: LeadMotive;
  notes?: string | null;
  status?: LeadStatus;
  lead_intent?: string;
  created_at?: string;
  registered_by?: string;
}

// ==================== CONFIGURACIÓN VISUAL ====================
export const APPOINTMENT_STATUS_CONFIG = {
  PROGRAMADA: {
    label: 'Programada',
    color: 'sky',
    bgClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300',
    borderClass: 'border-sky-400 dark:border-sky-600',
    iconBg: 'bg-sky-100 dark:bg-sky-900/50',
  },
  CONFIRMADA: {
    label: 'Confirmada',
    color: 'emerald',
    bgClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
    borderClass: 'border-emerald-400 dark:border-emerald-600',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
  },
  PRESENTE: {
    label: 'En Consulta',
    color: 'teal',
    bgClass: 'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300',
    borderClass: 'border-teal-400 dark:border-teal-600',
    iconBg: 'bg-teal-100 dark:bg-teal-900/50',
  },
  COMPLETADA: {
    label: 'Completada',
    color: 'green',
    bgClass: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300',
    borderClass: 'border-green-400 dark:border-green-600',
    iconBg: 'bg-green-100 dark:bg-green-900/50',
  },
  CANCELADA: {
    label: 'Cancelada',
    color: 'red',
    bgClass: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
    borderClass: 'border-red-400 dark:border-red-600',
    iconBg: 'bg-red-100 dark:bg-red-900/50',
  },
  NO_ASISTIO: {
    label: 'No Asistió',
    color: 'amber',
    bgClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
    borderClass: 'border-amber-400 dark:border-amber-600',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
  },
  REAGENDADA: {
    label: 'Reagendada',
    color: 'violet',
    bgClass: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300',
    borderClass: 'border-violet-400 dark:border-violet-600',
    iconBg: 'bg-violet-100 dark:bg-violet-900/50',
  },
} as const;

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
  edad: z.number().min(0).max(120).optional(),
  genero: z.enum(['Masculino', 'Femenino', 'Otro']).optional(),
  ciudad: z.string().max(100).optional().or(z.literal("")),
  estado: z.string().max(100).optional().or(z.literal("")),
  contacto_emergencia_nombre: z.string().max(100).optional().or(z.literal("")),
  contacto_emergencia_telefono: z.string().regex(/^[0-9+\-\s()]{10,15}$/, "Teléfono inválido").optional().or(z.literal("")),
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
  return APPOINTMENT_STATUS_CONFIG[status] || APPOINTMENT_STATUS_CONFIG.PROGRAMADA;
};

export const canPerformAction = (
  appointment: AppointmentWithPatient, 
  action: AdmissionAction
): boolean => {
  const status = appointment.estado_cita;
  
  const rules: Record<AdmissionAction, () => boolean> = {
    checkIn: () => ['PROGRAMADA', 'CONFIRMADA'].includes(status),
    complete: () => status === 'PRESENTE',
    cancel: () => ['PROGRAMADA', 'CONFIRMADA'].includes(status),
    noShow: () => ['PROGRAMADA', 'CONFIRMADA'].includes(status),
    reschedule: () => ['PROGRAMADA', 'CONFIRMADA', 'CANCELADA'].includes(status),
    viewHistory: () => true,
  };
  
  return rules[action]?.() ?? false;
};