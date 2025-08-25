import { describe, it, expect } from 'vitest'
import { isTerminalPatientStatus, canSetFollowUpFrom, terminalPatientStatuses, isValidPatientStatus, normalizePatientStatus, validatePatientStatusChange, planUpdateOnAppointmentCompleted } from '@/lib/patient-state-rules'
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

  it('isValidPatientStatus validates patient status values (case-insensitive)', () => {
    expect(isValidPatientStatus('potencial')).toBe(true)
    expect(isValidPatientStatus('ACTIVO')).toBe(true)
    expect(isValidPatientStatus('INVALID')).toBe(false)
    expect(isValidPatientStatus(123 as any)).toBe(false)
    expect(isValidPatientStatus(null as any)).toBe(false)
  })

  it('normalizePatientStatus normalizes values to canonical lowercase or null', () => {
    expect(normalizePatientStatus('ACTIVO')).toBe('activo')
    expect(normalizePatientStatus('invalid')).toBeNull()
    expect(normalizePatientStatus(123 as any)).toBeNull()
  })

  it('validatePatientStatusChange enforces rules and normalizes', () => {
    // invalid value
    const invalid = validatePatientStatusChange('activo', 'INVALID')
    expect(invalid.allowed).toBe(false)
    expect(invalid.code).toBe('INVALID_VALUE')

    // idempotent
    const same = validatePatientStatusChange('activo', 'ACTIVO')
    expect(same.allowed).toBe(true)
    expect(same.normalized).toBe('activo')
    expect(same.code).toBe('NO_CHANGE')

    // blocked from terminal
    const blocked = validatePatientStatusChange('operado', 'activo')
    expect(blocked.allowed).toBe(false)
    expect(blocked.code).toBe('BLOCKED_TERMINAL')

    // downgrade not allowed
    const downgrade = validatePatientStatusChange('activo', 'potencial')
    expect(downgrade.allowed).toBe(false)
    expect(downgrade.code).toBe('DOWNGRADE_NOT_ALLOWED')

    // allowed upgrade
    const ok = validatePatientStatusChange('potencial', 'ACTIVO')
    expect(ok.allowed).toBe(true)
    expect(ok.normalized).toBe('activo')
  })

  it('planUpdateOnAppointmentCompleted sets follow-up when non-terminal and always updates last consult date', () => {
    const plan1 = planUpdateOnAppointmentCompleted('activo', '2025-02-03T10:00:00.000Z')
    expect(plan1.changed).toBe(true)
    expect(plan1.update.fecha_ultima_consulta).toBe('2025-02-03')
    expect(plan1.update.estado_paciente).toBe('en_seguimiento')

    const plan2 = planUpdateOnAppointmentCompleted('operado', '2025-02-03T10:00:00.000Z')
    expect(plan2.changed).toBe(false)
    expect(plan2.update.fecha_ultima_consulta).toBe('2025-02-03')
    expect('estado_paciente' in plan2.update).toBe(false)
  })
})
