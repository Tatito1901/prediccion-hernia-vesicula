/**
 * lib/constants/index.ts
 * =====================
 * FUENTE ÚNICA DE VERDAD para enums, constantes y configuraciones
 * Todos los módulos deben importar desde aquí
 */

import { z } from 'zod';
import type { Database } from '@/lib/types/database.types';
import { Constants } from '@/lib/types/database.types';

// =========================================================================
// ENUMS DE BASE DE DATOS - Definiciones canónicas
// =========================================================================

// ===== DIAGNOSIS =====
export type DbDiagnosis = Database['public']['Enums']['diagnosis_enum'];
export const DIAGNOSIS_DB_VALUES = Constants.public.Enums.diagnosis_enum;
export const ZDiagnosisDb = z.enum(DIAGNOSIS_DB_VALUES);

export function dbDiagnosisToDisplay(value: DbDiagnosis): string {
  switch (value) {
    case 'HERNIA_INGUINAL':
      return 'Hernia inguinal';
    case 'HERNIA_UMBILICAL':
      return 'Hernia umbilical';
    case 'HERNIA_INCISIONAL':
      return 'Hernia incisional';
    case 'HERNIA_EPIGASTRICA':
      return 'Hernia epigástrica';
    case 'HERNIA_HIATAL':
      return 'Hernia hiatal';
    case 'COLELITIASIS':
      return 'Colelitiasis';
    case 'COLECISTITIS_AGUDA':
      return 'Colecistitis aguda';
    case 'COLECISTITIS_CRONICA':
      return 'Colecistitis crónica';
    case 'COLEDOCOLITIASIS':
      return 'Coledocolitiasis';
    case 'POLIPOS_VESICULA':
      return 'Pólipos en vesícula';
    case 'OTRO_DIAGNOSTICO':
      return 'Otro diagnóstico';
    case 'SIN_DIAGNOSTICO':
      return 'Sin diagnóstico';
    default:
      const s = String(value as string);
      return s.replace(/_/g, ' ').toLowerCase();
  }
}

// ===== APPOINTMENT STATUS =====
const APPOINTMENT_STATUS_ALLOWED = [
  'PROGRAMADA',
  'CONFIRMADA',
  'PRESENTE',
  'COMPLETADA',
  'CANCELADA',
  'REAGENDADA',
  'NO_ASISTIO',
] as const;

export const ZAppointmentStatus = z.enum(APPOINTMENT_STATUS_ALLOWED);
export type AppointmentStatus = z.infer<typeof ZAppointmentStatus>;

export const AppointmentStatusEnum = {
  PROGRAMADA: 'PROGRAMADA',
  CONFIRMADA: 'CONFIRMADA',
  PRESENTE: 'PRESENTE',
  COMPLETADA: 'COMPLETADA',
  CANCELADA: 'CANCELADA',
  REAGENDADA: 'REAGENDADA',
  NO_ASISTIO: 'NO_ASISTIO',
} as const;

// ===== PATIENT STATUS =====
export const PatientStatusEnum = {
  POTENCIAL: 'potencial',
  ACTIVO: 'activo',
  OPERADO: 'operado',
  NO_OPERADO: 'no_operado',
  EN_SEGUIMIENTO: 'en_seguimiento',
  INACTIVO: 'inactivo',
  ALTA_MEDICA: 'alta_medica',
} as const;

export type PatientStatus = typeof PatientStatusEnum[keyof typeof PatientStatusEnum];

// ===== USER ROLES =====
export const UserRoleEnum = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  ASISTENTE: 'asistente',
} as const;

export type UserRole = typeof UserRoleEnum[keyof typeof UserRoleEnum];

// ===== SURVEY STATUS =====
export const SurveyStatusEnum = {
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  SKIPPED: 'skipped',
  PARTIALLY_COMPLETED: 'partially_completed',
} as const;

export type SurveyStatus = typeof SurveyStatusEnum[keyof typeof SurveyStatusEnum];

// ===== PATIENT SOURCE =====
export const PatientSourceEnum = {
  PAGINA_WEB_GOOGLE: 'pagina_web_google',
  REDES_SOCIALES: 'redes_sociales',
  RECOMENDACION_MEDICO: 'recomendacion_medico',
  RECOMENDACION_FAMILIAR_AMIGO: 'recomendacion_familiar_amigo',
  SEGURO_MEDICO: 'seguro_medico',
  OTRO: 'otro',
} as const;

export type PatientSource = typeof PatientSourceEnum[keyof typeof PatientSourceEnum];

// ===== ARRIVAL STATUS =====
export const ArrivalStatusEnum = {
  A_TIEMPO: 'A_TIEMPO',
  TEMPRANO: 'TEMPRANO',
  TARDE: 'TARDE',
} as const;

export type ArrivalStatus = typeof ArrivalStatusEnum[keyof typeof ArrivalStatusEnum];

// ===== SURGICAL DECISION =====
export const SurgicalDecisionEnum = {
  CIRUGIA_PROGRAMADA: 'CIRUGIA_PROGRAMADA',
  SEGUIMIENTO: 'SEGUIMIENTO',
  CIRUGIA_RECHAZADA: 'CIRUGIA_RECHAZADA',
  CIRUGIA_URGENTE_ACEPTADA: 'CIRUGIA_URGENTE_ACEPTADA',
  CIRUGIA_URGENTE_RECHAZADA: 'CIRUGIA_URGENTE_RECHAZADA',
  NO_CANDIDATO: 'NO_CANDIDATO',
  PENDIENTE: 'PENDIENTE',
  SEGUNDA_OPINION_SOLICITADA: 'SEGUNDA_OPINION_SOLICITADA',
} as const;

export type SurgicalDecision = typeof SurgicalDecisionEnum[keyof typeof SurgicalDecisionEnum];

// =========================================================================
// CONFIGURACIONES DE UI
// =========================================================================

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

export const PATIENT_STATUS_CONFIG = {
  [PatientStatusEnum.POTENCIAL]: {
    label: 'Potencial',
    color: 'purple',
    bgClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300',
    borderClass: 'border-purple-200 dark:border-purple-700',
  },
  [PatientStatusEnum.ACTIVO]: {
    label: 'Activo',
    color: 'blue',
    bgClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',
    borderClass: 'border-blue-200 dark:border-blue-700',
  },
  [PatientStatusEnum.OPERADO]: {
    label: 'Operado',
    color: 'green',
    bgClass: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300',
    borderClass: 'border-green-200 dark:border-green-700',
  },
  [PatientStatusEnum.NO_OPERADO]: {
    label: 'No Operado',
    color: 'orange',
    bgClass: 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300',
    borderClass: 'border-orange-200 dark:border-orange-700',
  },
  [PatientStatusEnum.EN_SEGUIMIENTO]: {
    label: 'En Seguimiento',
    color: 'indigo',
    bgClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300',
    borderClass: 'border-indigo-200 dark:border-indigo-700',
  },
  [PatientStatusEnum.INACTIVO]: {
    label: 'Inactivo',
    color: 'gray',
    bgClass: 'bg-gray-50 text-gray-700 dark:bg-gray-950/30 dark:text-gray-300',
    borderClass: 'border-gray-200 dark:border-gray-700',
  },
  [PatientStatusEnum.ALTA_MEDICA]: {
    label: 'Alta Médica',
    color: 'emerald',
    bgClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
    borderClass: 'border-emerald-200 dark:border-emerald-700',
  },
} as const;

// =========================================================================
// ACCIONES DE ADMISIÓN
// =========================================================================

export type AdmissionAction = 
  | 'checkIn'
  | 'complete'
  | 'cancel'
  | 'noShow'
  | 'reschedule'
  | 'viewHistory';

export const ACTION_TO_STATUS_MAP: Record<AdmissionAction, AppointmentStatus | null> = {
  checkIn: AppointmentStatusEnum.PRESENTE,
  complete: AppointmentStatusEnum.COMPLETADA,
  cancel: AppointmentStatusEnum.CANCELADA,
  noShow: AppointmentStatusEnum.NO_ASISTIO,
  reschedule: AppointmentStatusEnum.REAGENDADA,
  viewHistory: null,
};

// =========================================================================
// UTILIDADES
// =========================================================================

export const getStatusConfig = (status: AppointmentStatus) => {
  return APPOINTMENT_STATUS_CONFIG[status] || APPOINTMENT_STATUS_CONFIG[AppointmentStatusEnum.PROGRAMADA];
};

export const getPatientStatusConfig = (status: PatientStatus) => {
  return PATIENT_STATUS_CONFIG[status] || PATIENT_STATUS_CONFIG[PatientStatusEnum.POTENCIAL];
};

// NOTA: canPerformAction ha sido eliminada de aquí.
// Usar las funciones centralizadas en lib/admission-business-rules.ts:
// - canCheckIn, canCompleteAppointment, canCancelAppointment, etc.
// - getAvailableActions para obtener todas las acciones disponibles
// - validateStatusChange para validar cambios de estado

// =========================================================================
// RE-EXPORTS para compatibilidad
// =========================================================================

// Estos exports mantienen compatibilidad con código existente
export type DiagnosisType = DbDiagnosis;
export type TabType = 'today' | 'future' | 'past';
