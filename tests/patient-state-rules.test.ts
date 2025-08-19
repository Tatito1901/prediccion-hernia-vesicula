import { describe, it, expect } from 'vitest'
import { isTerminalPatientStatus, canSetFollowUpFrom, terminalPatientStatuses } from '@/lib/patient-state-rules'
import { PatientStatusEnum } from '@/lib/types'

describe('patient-state-rules', () => {
  it('terminalPatientStatuses contains only terminal states', () => {
    expect(terminalPatientStatuses).toEqual([
      PatientStatusEnum.OPERADO,
      PatientStatusEnum.NO_OPERADO,
      PatientStatusEnum.ALTA_MEDICA,
      PatientStatusEnum.INACTIVO,
    ])
  })

  it('isTerminalPatientStatus detects terminal states (case-insensitive)', () => {
    expect(isTerminalPatientStatus('operado')).toBe(true)
    expect(isTerminalPatientStatus('no_operado')).toBe(true)
    expect(isTerminalPatientStatus('alta_medica')).toBe(true)
    expect(isTerminalPatientStatus('inactivo')).toBe(true)

    // Mixed case
    expect(isTerminalPatientStatus('Operado')).toBe(true)
    expect(isTerminalPatientStatus('No_Operado')).toBe(true)

    // Non-terminal
    expect(isTerminalPatientStatus('potencial')).toBe(false)
    expect(isTerminalPatientStatus('activo')).toBe(false)
    expect(isTerminalPatientStatus('en_seguimiento')).toBe(false)

    // Falsy
    expect(isTerminalPatientStatus(undefined)).toBe(false)
    expect(isTerminalPatientStatus(null)).toBe(false)
  })

  it('canSetFollowUpFrom returns true for non-terminal states', () => {
    expect(canSetFollowUpFrom(PatientStatusEnum.POTENCIAL)).toBe(true)
    expect(canSetFollowUpFrom(PatientStatusEnum.ACTIVO)).toBe(true)
    expect(canSetFollowUpFrom(PatientStatusEnum.EN_SEGUIMIENTO)).toBe(true)
  })

  it('canSetFollowUpFrom returns false for terminal states', () => {
    expect(canSetFollowUpFrom(PatientStatusEnum.OPERADO)).toBe(false)
    expect(canSetFollowUpFrom(PatientStatusEnum.NO_OPERADO)).toBe(false)
    expect(canSetFollowUpFrom(PatientStatusEnum.ALTA_MEDICA)).toBe(false)
    expect(canSetFollowUpFrom(PatientStatusEnum.INACTIVO)).toBe(false)
  })
})
