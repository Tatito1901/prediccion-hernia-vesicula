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
