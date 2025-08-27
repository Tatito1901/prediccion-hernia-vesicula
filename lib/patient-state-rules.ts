import {
  terminalPatientStatuses as CORE_terminalPatientStatuses,
  type TerminalPatientStatus,
  isTerminalPatientStatus as CORE_isTerminalPatientStatus,
  canSetFollowUpFrom as CORE_canSetFollowUpFrom,
  isValidPatientStatus as CORE_isValidPatientStatus,
  normalizePatientStatus as CORE_normalizePatientStatus,
  type PatientTransitionCode,
  validatePatientStatusChange as CORE_validatePatientStatusChange,
  planUpdateOnAppointmentCompleted as CORE_planUpdateOnAppointmentCompleted,
} from '@/lib/admission-business-rules'

export type { TerminalPatientStatus, PatientTransitionCode }

// Terminal states: once reached, should not be auto-overwritten by appointment completion
export const terminalPatientStatuses = CORE_terminalPatientStatuses

export function isTerminalPatientStatus(status?: string | null): boolean {
  return CORE_isTerminalPatientStatus(status)
}

// Determines if we can set patient to EN_SEGUIMIENTO from the current status
export function canSetFollowUpFrom(current?: string | null): boolean {
  return CORE_canSetFollowUpFrom(current)
}

// ==================== CENTRALIZED STATE TRANSITION HELPERS ====================

/** Check if a raw value is a valid patient status (case-insensitive). */
export function isValidPatientStatus(value: unknown): boolean {
  return CORE_isValidPatientStatus(value)
}

/** Normalize an incoming value to the canonical DB value (lowercase) or null. */
export function normalizePatientStatus(value: unknown): string | null {
  return CORE_normalizePatientStatus(value)
}

/**
 * Validate a state change request from current -> desiredRaw.
 * - Blocks changes from terminal states (except idempotent same-state updates)
 * - Blocks downgrades to POTENCIAL from any other set state
 * - Normalizes desired value to canonical lowercase
 */
export function validatePatientStatusChange(
  current?: string | null,
  desiredRaw?: unknown,
): { allowed: boolean; normalized?: string; reason?: string; code?: PatientTransitionCode } {
  return CORE_validatePatientStatusChange(current, desiredRaw)
}

/**
 * Plan the patient update when an appointment is completed.
 * - If current status is non-terminal, move to EN_SEGUIMIENTO.
 * - Always update fecha_ultima_consulta to the appointment date (YYYY-MM-DD).
 */
export function planUpdateOnAppointmentCompleted(
  current?: string | null,
  appointmentDateTimeISO?: string,
): { update: { fecha_ultima_consulta: string; estado_paciente?: string }; changed: boolean; reason?: string } {
  return CORE_planUpdateOnAppointmentCompleted(current, appointmentDateTimeISO)
}
