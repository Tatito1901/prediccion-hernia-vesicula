import { PatientStatusEnum } from '@/lib/types'

// Terminal states: once reached, should not be auto-overwritten by appointment completion
export const terminalPatientStatuses = [
  PatientStatusEnum.OPERADO,
  PatientStatusEnum.NO_OPERADO,
  PatientStatusEnum.ALTA_MEDICA,
  PatientStatusEnum.INACTIVO,
] as const

export type TerminalPatientStatus = typeof terminalPatientStatuses[number]

export function isTerminalPatientStatus(status?: string | null): boolean {
  if (!status) return false
  const value = status.toString().toLowerCase()
  return (terminalPatientStatuses as readonly string[]).includes(value)
}

// Determines if we can set patient to EN_SEGUIMIENTO from the current status
export function canSetFollowUpFrom(current?: string | null): boolean {
  return !isTerminalPatientStatus(current)
}

// ==================== CENTRALIZED STATE TRANSITION HELPERS ====================

const ALL_PATIENT_STATUSES = Object.values(PatientStatusEnum) as readonly string[]

/** Check if a raw value is a valid patient status (case-insensitive). */
export function isValidPatientStatus(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const v = value.toLowerCase()
  return (ALL_PATIENT_STATUSES as readonly string[]).includes(v)
}

/** Normalize an incoming value to the canonical DB value (lowercase) or null. */
export function normalizePatientStatus(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.toLowerCase()
  return (ALL_PATIENT_STATUSES as readonly string[]).includes(v) ? v : null
}

export type PatientTransitionCode =
  | 'INVALID_VALUE'
  | 'BLOCKED_TERMINAL'
  | 'DOWNGRADE_NOT_ALLOWED'
  | 'NO_CHANGE'

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
  const desired = normalizePatientStatus(desiredRaw)
  if (desired == null) {
    return { allowed: false, reason: 'Valor de estado_paciente inválido', code: 'INVALID_VALUE' }
  }

  const cur = current ? current.toString().toLowerCase() : null

  if (cur === desired) {
    return { allowed: true, normalized: desired, code: 'NO_CHANGE' }
  }

  if (isTerminalPatientStatus(cur) && desired !== cur) {
    return { allowed: false, reason: 'No se puede modificar un estado de paciente terminal', code: 'BLOCKED_TERMINAL' }
  }

  if (desired === PatientStatusEnum.POTENCIAL && cur && cur !== PatientStatusEnum.POTENCIAL) {
    return { allowed: false, reason: 'No se permite degradar a POTENCIAL', code: 'DOWNGRADE_NOT_ALLOWED' }
  }

  return { allowed: true, normalized: desired }
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
  const datePart = (() => {
    if (!appointmentDateTimeISO) return new Date().toISOString().split('T')[0]
    const d = new Date(appointmentDateTimeISO)
    return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0]
  })()

  const shouldSetFollowUp = canSetFollowUpFrom(current)
  return {
    update: {
      fecha_ultima_consulta: datePart,
      ...(shouldSetFollowUp ? { estado_paciente: PatientStatusEnum.EN_SEGUIMIENTO } : {}),
    },
    changed: shouldSetFollowUp,
    reason: shouldSetFollowUp
      ? 'Cita completada: mover a EN_SEGUIMIENTO'
      : 'Estado terminal: solo actualizar fecha_ultima_consulta',
  }
}
