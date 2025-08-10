// lib/validation/enums.ts
// Centralized Zod enums and helpers derived from Supabase-generated constants

import { z } from 'zod';
import { Constants } from '@/lib/types/database.types';
import type { Database } from '@/lib/types/database.types';

// Helper to cast a readonly string[] into a tuple for z.enum
const asEnumTuple = <T extends readonly string[]>(arr: T) => arr as unknown as [T[number], ...T[number][]];

// Types from DB
export type DbAppointmentStatus = Database['public']['Enums']['appointment_status_enum'];
export type DbPatientStatus = Database['public']['Enums']['patient_status_enum'];
export type DbUserRole = Database['public']['Enums']['user_role_enum'];
export type DbDiagnosis = Database['public']['Enums']['diagnosis_enum'];
export type DbLeadStatus = Database['public']['Enums']['lead_status_enum'];
export type DbLeadMotive = Database['public']['Enums']['lead_motive_enum'];
export type DbContactChannel = Database['public']['Enums']['contact_channel_enum'];
export type DbSurveyStatus = Database['public']['Enums']['survey_status_enum'];
export type DbSurgicalDecision = Database['public']['Enums']['surgical_decision_enum'];
export type DbArrivalStatus = Database['public']['Enums']['arrival_status_enum'];

// Value arrays from DB (single source of truth)
export const APPOINTMENT_STATUS_VALUES = Constants.public.Enums.appointment_status_enum;
export const PATIENT_STATUS_VALUES = Constants.public.Enums.patient_status_enum;
export const USER_ROLE_VALUES = Constants.public.Enums.user_role_enum;
export const DIAGNOSIS_DB_VALUES = Constants.public.Enums.diagnosis_enum;
export const LEAD_STATUS_VALUES = Constants.public.Enums.lead_status_enum;
export const LEAD_MOTIVE_VALUES = Constants.public.Enums.lead_motive_enum;
export const CONTACT_CHANNEL_VALUES = Constants.public.Enums.contact_channel_enum;
export const SURVEY_STATUS_VALUES = Constants.public.Enums.survey_status_enum;
export const SURGICAL_DECISION_VALUES = Constants.public.Enums.surgical_decision_enum;
export const ARRIVAL_STATUS_VALUES = Constants.public.Enums.arrival_status_enum;

// Zod enums (DB-aligned)
export const ZAppointmentStatus = z.enum(asEnumTuple(APPOINTMENT_STATUS_VALUES));
export const ZPatientStatus = z.enum(asEnumTuple(PATIENT_STATUS_VALUES));
export const ZUserRole = z.enum(asEnumTuple(USER_ROLE_VALUES));
export const ZDiagnosisDb = z.enum(asEnumTuple(DIAGNOSIS_DB_VALUES));
export const ZLeadStatus = z.enum(asEnumTuple(LEAD_STATUS_VALUES));
export const ZLeadMotive = z.enum(asEnumTuple(LEAD_MOTIVE_VALUES));
export const ZContactChannel = z.enum(asEnumTuple(CONTACT_CHANNEL_VALUES));
export const ZSurveyStatus = z.enum(asEnumTuple(SURVEY_STATUS_VALUES));
export const ZSurgicalDecision = z.enum(asEnumTuple(SURGICAL_DECISION_VALUES));
export const ZArrivalStatus = z.enum(asEnumTuple(ARRIVAL_STATUS_VALUES));

// UI Display mapping for diagnosis (derive from DB, with targeted overrides)
const DB_TO_DISPLAY_OVERRIDES: Partial<Record<DbDiagnosis, string>> = {
  // Business-approved overrides
  HERNIA_INCISIONAL: 'EVENTRACION ABDOMINAL',
  COLECISTITIS_CRONICA: 'VESICULA (COLECISTITIS CRONICA)',
};

export const dbDiagnosisToDisplay = (db: DbDiagnosis): string => {
  return DB_TO_DISPLAY_OVERRIDES[db] ?? db.replace(/_/g, ' ');
};

export const DIAGNOSIS_DISPLAY_VALUES = DIAGNOSIS_DB_VALUES.map(dbDiagnosisToDisplay) as readonly string[];
export type DiagnosisDisplay = typeof DIAGNOSIS_DISPLAY_VALUES[number];

export const ZDiagnosisDisplay = z.enum(asEnumTuple(DIAGNOSIS_DISPLAY_VALUES));

// Bi-directional maps between DB and Display
export const DiagnosisDbToDisplayMap: Record<DbDiagnosis, DiagnosisDisplay> = Object.fromEntries(
  DIAGNOSIS_DB_VALUES.map((db) => [db, dbDiagnosisToDisplay(db)])
) as Record<DbDiagnosis, DiagnosisDisplay>;

/**
 * @deprecated Evitar en nuevos flujos. Los formularios deben enviar `DbDiagnosis` directamente.
 *             Mantener solo para compatibilidad con datos/UX legados.
 */
export const DiagnosisDisplayToDbMap: Record<DiagnosisDisplay, DbDiagnosis> = Object.fromEntries(
  DIAGNOSIS_DB_VALUES.map((db) => [dbDiagnosisToDisplay(db), db])
) as Record<DiagnosisDisplay, DbDiagnosis>;

// ----------------------------------------------------------------------------
// Normalization helpers (centralized): accept UI labels and map to DB enum
// ----------------------------------------------------------------------------

// Slugify arbitrary strings into DB-like enum tokens (A_Z0_9 and underscores)
/**
 * @deprecated Soporte de normalización legado. No usar en nuevos flujos; el cliente debe enviar `DbDiagnosis`.
 */
export const toSlug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '_');

// Accepted variants -> DB enum mapping
const DIAGNOSIS_NORMALIZATION_MAP: Record<string, DbDiagnosis> = {
  // Direct matches
  HERNIA_INGUINAL: 'HERNIA_INGUINAL',
  HERNIA_UMBILICAL: 'HERNIA_UMBILICAL',
  HERNIA_HIATAL: 'HERNIA_HIATAL',
  HERNIA_INCISIONAL: 'HERNIA_INCISIONAL',
  HERNIA_EPIGASTRICA: 'HERNIA_EPIGASTRICA',
  COLELITIASIS: 'COLELITIASIS',
  COLECISTITIS_AGUDA: 'COLECISTITIS_AGUDA',
  COLECISTITIS_CRONICA: 'COLECISTITIS_CRONICA',
  COLEDOCOLITIASIS: 'COLEDOCOLITIASIS',
  POLIPOS_VESICULA: 'POLIPOS_VESICULA',
  OTRO_DIAGNOSTICO: 'OTRO_DIAGNOSTICO',
  SIN_DIAGNOSTICO: 'SIN_DIAGNOSTICO',

  // UI label variants -> DB
  VESICULA_COLECISTITIS_CRONICA: 'COLECISTITIS_CRONICA',
  COLECISTITIS: 'COLECISTITIS_CRONICA',
  EVENTRACION_ABDOMINAL: 'HERNIA_INCISIONAL',
  HERNIA_INGUINAL_RECIDIVANTE: 'HERNIA_INGUINAL',
  HERNIA_SPIGEL: 'OTRO_DIAGNOSTICO',
  COLANGITIS: 'OTRO_DIAGNOSTICO',
  APENDICITIS: 'OTRO_DIAGNOSTICO',
  LIPOMA_GRANDE: 'OTRO_DIAGNOSTICO',
  QUISTE_SEBACEO_INFECTADO: 'OTRO_DIAGNOSTICO',
  OTRO: 'OTRO_DIAGNOSTICO',
};

/**
 * @deprecated No normalizar en el backend. El cliente debe enviar valores válidos de `DbDiagnosis`.
 *             Se mantiene por compatibilidad con datos históricos o migraciones.
 */
export function normalizeDiagnosis(input: unknown): DbDiagnosis {
  if (typeof input !== 'string' || !input.trim()) return 'OTRO_DIAGNOSTICO';
  const slug = toSlug(input);
  const mapped = DIAGNOSIS_NORMALIZATION_MAP[slug];
  if (mapped) return mapped;
  if ((DIAGNOSIS_DB_VALUES as readonly string[]).includes(slug)) return slug as DbDiagnosis;
  if (slug === 'SIN_DIAGNOSTICO') return 'SIN_DIAGNOSTICO';
  return 'OTRO_DIAGNOSTICO';
}

// ----------------------------------------------------------------------------
// Compatibility objects (generated from DB values) to avoid breaking imports
// ----------------------------------------------------------------------------

const makeEnumCompat = <T extends readonly string[]>(values: T) =>
  Object.fromEntries(values.map((v) => [v.toUpperCase(), v])) as Record<Uppercase<T[number]>, T[number]>;

export const AppointmentStatusEnum = makeEnumCompat(APPOINTMENT_STATUS_VALUES);
export const PatientStatusEnum = makeEnumCompat(PATIENT_STATUS_VALUES);
export const UserRoleEnum = makeEnumCompat(USER_ROLE_VALUES);
