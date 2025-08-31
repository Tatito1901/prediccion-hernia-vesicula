// lib/validation/enums.ts
import { z } from 'zod';
import type { Database } from '@/lib/types/database.types';
import { Constants } from '@/lib/types/database.types';

// ===== Diagnosis (motivos/diagnósticos) =====
export type DbDiagnosis = Database['public']['Enums']['diagnosis_enum'];

// Fuente única de valores soportados (del schema generado)
export const DIAGNOSIS_DB_VALUES = Constants.public.Enums.diagnosis_enum;

// Zod schema para validar diagnósticos provenientes del frontend/API
export const ZDiagnosisDb = z.enum(DIAGNOSIS_DB_VALUES);

// Utilidad de display para UI (gráficos, tablas, selects)
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
      // Coerce to string to avoid 'never' narrowing when union is fully covered
      const s = String(value as string);
      return s.replace(/_/g, ' ').toLowerCase();
  }
}

// ===== Appointment Status =====
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

// Para uso en frontend: claves UPPER -> valores DB (UPPER también para citas)
export const AppointmentStatusEnum = {
  PROGRAMADA: 'PROGRAMADA',
  CONFIRMADA: 'CONFIRMADA',
  PRESENTE: 'PRESENTE',
  COMPLETADA: 'COMPLETADA',
  CANCELADA: 'CANCELADA',
  REAGENDADA: 'REAGENDADA',
  NO_ASISTIO: 'NO_ASISTIO',
} as const;

// ===== Patient Status =====
// Regla: claves UPPER -> valores db lower (consistente con otros módulos del proyecto)
export const PatientStatusEnum = {
  POTENCIAL: 'potencial',
  ACTIVO: 'activo',
  OPERADO: 'operado',
  NO_OPERADO: 'no_operado',
  EN_SEGUIMIENTO: 'en_seguimiento',
  INACTIVO: 'inactivo',
  ALTA_MEDICA: 'alta_medica',
} as const;

// ===== User Roles =====
export const UserRoleEnum = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  ASISTENTE: 'asistente',
} as const;
