import { describe, it, expect } from 'vitest'

import {
  canCheckIn,
  canCompleteAppointment,
  canCancelAppointment,
  canMarkNoShow,
  canRescheduleAppointment,
  getAvailableActions,
  suggestNextAction,
  needsUrgentAttention,
  getTimeUntilActionAvailable,
  canTransitionToStatus,
  terminalPatientStatuses,
  isTerminalPatientStatus,
  canSetFollowUpFrom,
  isValidPatientStatus,
  normalizePatientStatus,
  validatePatientStatusChange,
  planUpdateOnAppointmentCompleted,
  validateRescheduleDateTime,
} from '@/lib/admission-business-rules'

import { AppointmentStatusEnum, PatientStatusEnum } from '@/lib/types'

// Helper to create an AppointmentLike object
function makeAppointment(iso: string, estado: keyof typeof AppointmentStatusEnum | (typeof AppointmentStatusEnum)[keyof typeof AppointmentStatusEnum], updatedAt?: string) {
  // Accept both key and value of enum for convenience
  // Normalize to value (UPPER for appointments)
  const estadoValue = (AppointmentStatusEnum as any)[String(estado)] ?? estado
  return {
    fecha_hora_cita: iso,
    estado_cita: estadoValue,
    ...(updatedAt ? { updated_at: updatedAt } : {}),
  }
}

// Fixed working day: 2025-01-15 is Wednesday (work day)
const DAY = '2025-01-15'

// Convenience UTC timestamps that map to predictable Mexico City local times (UTC-6 in Jan)
// 08:00 local -> 14:00Z, 09:00 local -> 15:00Z, 10:00 local -> 16:00Z, etc.
const toZ = (hh: number, mm: number = 0) => new Date(`${DAY}T${String(hh + 6).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000Z`)

// ISO string for appointment at a given local hour (Mexico City)
const apptIsoAtLocal = (hh: number, mm: number = 0) => new Date(`${DAY}T${String(hh + 6).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000Z`).toISOString()

// Another stable day for date-only formatting checks
const DAY_SUMMER = '2025-07-15' // DST may apply but we only assert the local date string, not the hour
const toZSummer = (hh: number, mm: number = 0) => new Date(`${DAY_SUMMER}T${String(hh + 5).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000Z`)
const apptIsoAtLocalSummer = (hh: number, mm: number = 0) => new Date(`${DAY_SUMMER}T${String(hh + 5).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000Z`).toISOString()

describe('Admission Business Rules - Action Validators', () => {
  it('canCheckIn: false if too early (before -30m window)', () => {
    const apptIso = apptIsoAtLocal(10, 0) // 10:00 local
    const appt = makeAppointment(apptIso, 'PROGRAMADA')
    const now = toZ(9, 20) // 09:20 local -> 40m before, still too early
    const res = canCheckIn(appt, now)
    expect(res.valid).toBe(false)
    expect(res.reason).toMatch(/Check-in disponible en/i)
  })

describe('Clinic schedule coverage (Saturday)', () => {
  // 2025-01-18 is Saturday
  const DAY_SAT = '2025-01-18'
  const toZSat = (hh: number, mm: number = 0) => new Date(`${DAY_SAT}T${String(hh + 6).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000Z`)
  const apptIsoAtLocalSat = (hh: number, mm: number = 0) => new Date(`${DAY_SAT}T${String(hh + 6).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000Z`).toISOString()

  it('Saturday is a work day: check-in valid within window and hours', () => {
    const appt = makeAppointment(apptIsoAtLocalSat(10, 0), 'CONFIRMADA')
    const now = toZSat(9, 40) // 09:40 local, within window and work hours
    const res = canCheckIn(appt, now)
    expect(res.valid).toBe(true)
  })

  it('validateRescheduleDateTime accepts Saturday within hours', () => {
    const iso = apptIsoAtLocalSat(9, 0)
    const res = validateRescheduleDateTime(iso, toZSat(8, 0))
    expect(res.valid).toBe(true)
  })
})

  it('canCheckIn: true within window and work hours', () => {
    const appt = makeAppointment(apptIsoAtLocal(10, 0), 'CONFIRMADA')
    const now = toZ(9, 40) // 09:40 local (window 09:30 - 10:15)
    const res = canCheckIn(appt, now)
    expect(res.valid).toBe(true)
  })

  it('canCheckIn: false if too late (after +15m window)', () => {
    const appt = makeAppointment(apptIsoAtLocal(10, 0), 'PROGRAMADA')
    const now = toZ(10, 20) // 10:20 local (after 10:15)
    const res = canCheckIn(appt, now)
    expect(res.valid).toBe(false)
    expect(res.reason).toMatch(/Ventana de check-in expirada/i)
  })

  it('canCheckIn: false if within window but outside work hours', () => {
    // Appointment at 09:00 local -> check-in window starts 08:30 local (outside work hours)
    const appt = makeAppointment(apptIsoAtLocal(9, 0), 'PROGRAMADA')
    const now = toZ(8, 45) // 08:45 local (within window, but < 09:00 work start)
    const res = canCheckIn(appt, now)
    expect(res.valid).toBe(false)
    expect(res.reason).toMatch(/horario laboral/i)
  })

  it('canCheckIn: false if appointment was recently updated (cooldown)', () => {
    const appt = makeAppointment(apptIsoAtLocal(10, 0), 'CONFIRMADA', new Date().toISOString())
    const now = toZ(9, 40) // within window
    const res = canCheckIn(appt, now)
    expect(res.valid).toBe(false)
    expect(res.reason).toMatch(/Espere unos momentos/i)
  })

  it('canCompleteAppointment: only from PRESENTE and before completion deadline', () => {
    const appt = makeAppointment(apptIsoAtLocal(10, 0), 'PRESENTE')
    const withinDeadline = toZ(11, 30) // 90m after -> within +120m
    const res1 = canCompleteAppointment(appt, withinDeadline)
    expect(res1.valid).toBe(true)

    const afterDeadline = toZ(12, 30) // 150m after -> beyond +120m
    const res2 = canCompleteAppointment(appt, afterDeadline)
    expect(res2.valid).toBe(false)

    const wrongState = makeAppointment(apptIsoAtLocal(10, 0), 'PROGRAMADA')
    const res3 = canCompleteAppointment(wrongState, withinDeadline)
    expect(res3.valid).toBe(false)
  })

  it('canCancelAppointment: only PROGRAMADA/CONFIRMADA and only before appointment time', () => {
    const appt = makeAppointment(apptIsoAtLocal(10, 0), 'PROGRAMADA')
    const before = toZ(9, 0)
    const after = toZ(10, 5)
    expect(canCancelAppointment(appt, before).valid).toBe(true)
    expect(canCancelAppointment(appt, after).valid).toBe(false)

    const wrongState = makeAppointment(apptIsoAtLocal(10, 0), 'PRESENTE')
    expect(canCancelAppointment(wrongState, before).valid).toBe(false)
  })

  it('canMarkNoShow: only PROGRAMADA/CONFIRMADA and after threshold', () => {
    const appt = makeAppointment(apptIsoAtLocal(10, 0), 'CONFIRMADA')
    const tooSoon = toZ(10, 10) // threshold 10:15
    const afterThreshold = toZ(10, 20)
    expect(canMarkNoShow(appt, tooSoon).valid).toBe(false)
    expect(canMarkNoShow(appt, afterThreshold).valid).toBe(true)

    const wrongState = makeAppointment(apptIsoAtLocal(10, 0), 'PRESENTE')
    expect(canMarkNoShow(wrongState, afterThreshold).valid).toBe(false)
  })

  it('canRescheduleAppointment: allowed states and deadline for PROGRAMADA/CONFIRMADA', () => {
    const apptProg = makeAppointment(apptIsoAtLocal(10, 0), 'PROGRAMADA')
    const beforeDeadline = toZ(7, 30) // > 2h before (10:00 - 2h = 08:00), so 07:30 is before but still same day
    const afterDeadline = toZ(9, 0) // within 2h window -> disallowed without override
    expect(canRescheduleAppointment(apptProg, beforeDeadline).valid).toBe(true)
    expect(canRescheduleAppointment(apptProg, afterDeadline).valid).toBe(false)

    const apptCancelled = makeAppointment(apptIsoAtLocal(10, 0), 'CANCELADA')
    expect(canRescheduleAppointment(apptCancelled, toZ(12, 0)).valid).toBe(true)

    const wrongState = makeAppointment(apptIsoAtLocal(10, 0), 'COMPLETADA')
    expect(canRescheduleAppointment(wrongState, toZ(12, 0)).valid).toBe(false)
  })

  it('canTransitionToStatus enforces matrix with optional override', () => {
    expect(canTransitionToStatus(AppointmentStatusEnum.PROGRAMADA, AppointmentStatusEnum.CONFIRMADA).valid).toBe(true)
    expect(canTransitionToStatus(AppointmentStatusEnum.PROGRAMADA, AppointmentStatusEnum.COMPLETADA).valid).toBe(false)
    expect(
      canTransitionToStatus(
        AppointmentStatusEnum.PROGRAMADA,
        AppointmentStatusEnum.COMPLETADA,
        { allowOverride: true }
      ).valid
    ).toBe(true)
  })
})

describe('Admission Business Rules - Helpers', () => {
  it('getAvailableActions and suggestNextAction', () => {
    const appt = makeAppointment(apptIsoAtLocal(10, 0), 'CONFIRMADA')
    const now = toZ(9, 45)
    const actions = getAvailableActions(appt, now)

    const checkIn = actions.find(a => a.action === 'checkIn')
    expect(checkIn?.valid).toBe(true)

    const complete = actions.find(a => a.action === 'complete')
    expect(complete?.valid).toBe(false)

    const suggestion = suggestNextAction(appt, now)
    expect(suggestion).toBe('checkIn')
  })

  it('needsUrgentAttention flags overdue PRESENTE and late PROGRAMADA/CONFIRMADA', () => {
    // PRESENTE 45m after appointment
    const apptPresent = makeAppointment(apptIsoAtLocal(9, 0), 'PRESENTE')
    const now1 = toZ(9, 45)
    const urgent1 = needsUrgentAttention(apptPresent, now1)
    expect(urgent1.urgent).toBe(true)
    expect(['medium', 'high']).toContain(urgent1.severity)

    // CONFIRMADA 40m after appointment
    const apptConf = makeAppointment(apptIsoAtLocal(9, 0), 'CONFIRMADA')
    const now2 = toZ(9, 40)
    const urgent2 = needsUrgentAttention(apptConf, now2)
    expect(urgent2.urgent).toBe(true)

    // PROGRAMADA 30m before (within 60m window)
    const apptProg = makeAppointment(apptIsoAtLocal(10, 0), 'PROGRAMADA')
    const now3 = toZ(9, 30)
    const urgent3 = needsUrgentAttention(apptProg, now3)
    expect(urgent3.urgent).toBe(true)
    expect(urgent3.severity).toBe('low')
  })

  it('getTimeUntilActionAvailable reports minutes for checkIn and noShow', () => {
    const appt = makeAppointment(apptIsoAtLocal(10, 0), 'PROGRAMADA')
    const beforeCheckIn = toZ(9, 20) // start 09:30 -> 10 minutes
    const t1 = getTimeUntilActionAvailable(appt, 'checkIn', beforeCheckIn)
    expect(t1.available).toBe(false)
    expect(t1.minutesUntil).toBe(10)

    const beforeNoShow = toZ(10, 10) // threshold 10:15 -> 5 minutes
    const t2 = getTimeUntilActionAvailable(appt, 'noShow', beforeNoShow)
    expect(t2.available).toBe(false)
    expect(t2.minutesUntil).toBe(5)
  })
})

describe('Patient State Rules', () => {
  it('terminalPatientStatuses and isTerminalPatientStatus', () => {
    expect(terminalPatientStatuses).toEqual(
      expect.arrayContaining([
        PatientStatusEnum.OPERADO,
        PatientStatusEnum.NO_OPERADO,
        PatientStatusEnum.ALTA_MEDICA,
        PatientStatusEnum.INACTIVO,
      ])
    )
    expect(isTerminalPatientStatus('operado')).toBe(true)
    expect(isTerminalPatientStatus('activo')).toBe(false)
  })

  it('canSetFollowUpFrom', () => {
    expect(canSetFollowUpFrom('operado')).toBe(false)
    expect(canSetFollowUpFrom('potencial')).toBe(true)
  })

  it('isValidPatientStatus and normalizePatientStatus', () => {
    expect(isValidPatientStatus('ACTIVO')).toBe(true)
    expect(isValidPatientStatus('desconocido')).toBe(false)
    expect(normalizePatientStatus('ACTIVO')).toBe('activo')
    expect(normalizePatientStatus('INVALIDO')).toBeNull()
  })

  it('validatePatientStatusChange: blocks terminal changes and downgrades; allows idempotent', () => {
    const termBlocked = validatePatientStatusChange('operado', 'en_seguimiento')
    expect(termBlocked.allowed).toBe(false)
    expect(termBlocked.code).toBe('BLOCKED_TERMINAL')

    const downgradeBlocked = validatePatientStatusChange('activo', 'potencial')
    expect(downgradeBlocked.allowed).toBe(false)
    expect(downgradeBlocked.code).toBe('DOWNGRADE_NOT_ALLOWED')

    const idempotent = validatePatientStatusChange('activo', 'ACTIVO')
    expect(idempotent.allowed).toBe(true)
    expect(idempotent.code).toBe('NO_CHANGE')
  })

  it('planUpdateOnAppointmentCompleted: sets EN_SEGUIMIENTO for non-terminal and only date for terminal', () => {
    // Use a mid-day UTC time which maps to the same calendar date in Mexico City
    const isoWinterMidday = new Date(`${DAY}T18:00:00.000Z`).toISOString()
    const nonTerminal = planUpdateOnAppointmentCompleted('activo', isoWinterMidday)
    expect(nonTerminal.update.fecha_ultima_consulta).toBe('2025-01-15')
    expect(nonTerminal.update.estado_paciente).toBe(PatientStatusEnum.EN_SEGUIMIENTO)
    expect(nonTerminal.changed).toBe(true)

    const terminal = planUpdateOnAppointmentCompleted('operado', isoWinterMidday)
    expect(terminal.update.fecha_ultima_consulta).toBe('2025-01-15')
    expect(terminal.update.estado_paciente).toBeUndefined()
    expect(terminal.changed).toBe(false)
    expect(terminal.reason).toMatch(/Estado terminal/i)

    // Summer sample to ensure date derives from ISO in Mexico City timezone correctly
    const isoSummerMidday = new Date(`${DAY_SUMMER}T17:00:00.000Z`).toISOString() // around 12:00 local
    const summer = planUpdateOnAppointmentCompleted('activo', isoSummerMidday)
    expect(summer.update.fecha_ultima_consulta).toBe('2025-07-15')
  })
})
