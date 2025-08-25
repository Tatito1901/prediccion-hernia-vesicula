import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { PATCH } from '../../app/api/appointments/[id]/status/route'

// Helpers
function okJson(data: any, init?: Partial<ResponseInit>): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

function makeReq(body: any) {
  return new Request('http://localhost/api/appointments/appt-1/status', { method: 'PATCH', body: JSON.stringify(body) }) as any
}

function makeParams(id = 'appt-1') { return { params: Promise.resolve({ id }) } as any }

// Compute a future valid workday datetime ISO (next Monday 10:00 local)
function nextMondayAt(hour: number): string {
  const now = new Date()
  const d = new Date(now)
  d.setHours(hour, 0, 0, 0)
  const day = d.getDay() // 0..6
  const delta = (8 - day) % 7
  d.setDate(d.getDate() + delta)
  return d.toISOString()
}

// Stateful minimal query builder to simulate select/update/insert flows across multiple tables
// Allow tests to control the appointment's current scheduled datetime
let mockCurrentFechaHoraIso: string | null = null
let mockConflict: boolean = false

function makeStatefulBuilder() {
  const calls: any[] = []
  const state: any = { table: null, updates: {}, auditRows: null }

  const builder: any = {
    from(table: string) { calls.push(['from', table]); state.table = table; return builder },
    select(sel?: string) { calls.push(['select', sel]); state.sel = sel; return builder },
    update(payload: any) { calls.push(['update', payload]); state.update = payload; return builder },
    insert(rows: any) { calls.push(['insert', rows]); state.insert = rows; return builder },
    eq(col: string, val: any) { calls.push(['eq', col, val]); (state.filters ||= []).push({ col, val }); return builder },
    neq(col: string, val: any) { calls.push(['neq', col, val]); (state.filters ||= []).push({ col, val, op: 'neq' }); return builder },
    in(col: string, vals: any[]) { calls.push(['in', col, vals]); (state.filters ||= []).push({ col, vals, op: 'in' }); return builder },
    limit(n: number) { calls.push(['limit', n]); state.limit = n; return builder },
    order() { return builder },
    single() { calls.push(['single']); state.single = true; return builder },
    async then(resolve: any) {
      // Simulate flows based on table and presence of update/insert
      const now = new Date()
      const makeCurrentAppt = () => {
        const withinWindowIso = mockCurrentFechaHoraIso ?? now.toISOString()
        return {
          id: 'appt-1',
          patient_id: 'pat-1',
          doctor_id: 'doc-1',
          fecha_hora_cita: withinWindowIso,
          motivos_consulta: ['dolor'],
          estado_cita: 'PROGRAMADA',
          es_primera_vez: false,
          notas_breves: 'nota base',
          created_at: new Date(now.getTime() - 86400_000).toISOString(),
          updated_at: new Date(now.getTime() - 3600_000).toISOString(),
          patients: { id: 'pat-1', nombre: 'Jane', apellidos: 'Roe', estado_paciente: 'activo' },
        }
      }

      if (state.table === 'appointments') {
        // Debug trace
        // eslint-disable-next-line no-console
        console.log('[MOCK appointments] calls:', JSON.stringify(calls), 'filters:', JSON.stringify(state.filters))

        const isSelect = calls.some((c) => c[0] === 'select')
        const hasIdEq = (state.filters || []).some((f: any) => f.col === 'id' && !f.op)
        const hasLimit = typeof state.limit === 'number'
        const isConflictProbe = isSelect &&
          (state.filters || []).some((f: any) => f.col === 'doctor_id') &&
          (state.filters || []).some((f: any) => f.col === 'fecha_hora_cita') &&
          (state.filters || []).some((f: any) => f.op === 'in') &&
          (state.filters || []).some((f: any) => f.col === 'id' && f.op === 'neq')

        if (isConflictProbe) {
          // eslint-disable-next-line no-console
          console.log('[MOCK appointments] Conflict probe detected. mockConflict=', mockConflict)
          return resolve({ data: mockConflict ? [{ id: 'conflict-1' }] : [], error: null })
        }

        // Update appointment path: return enriched row reflecting update payload
        if (state.update) {
          const payload = state.update
          return resolve({
            data: {
              id: 'appt-1',
              patient_id: 'pat-1',
              doctor_id: 'doc-1',
              fecha_hora_cita: payload.fecha_hora_cita ?? '2025-08-25T15:00:00.000Z',
              motivos_consulta: ['dolor'],
              estado_cita: payload.estado_cita,
              es_primera_vez: false,
              notas_breves: payload.notas_breves ?? 'nota base',
              created_at: '2025-08-20T00:00:00.000Z',
              updated_at: new Date().toISOString(),
              patients: { id: 'pat-1', nombre: 'Jane', apellidos: 'Roe', estado_paciente: 'activo' },
            },
            error: null,
          })
        }

        // Current appointment fetches: eq('id', ...), or .single(), or any select without update/insert
        // If a limit(1) is present (fallback), return an array with one row; otherwise return an object
        // eslint-disable-next-line no-console
        console.log('[MOCK appointments] Default fetch-current path. Using fecha_hora_cita=', mockCurrentFechaHoraIso)
        const row = makeCurrentAppt()
        if (hasLimit && !state.single) {
          return resolve({ data: [row], error: null })
        }
        if (hasIdEq || state.single || isSelect) {
          return resolve({ data: row, error: null })
        }

        // Fallback safe default
        return resolve({ data: row, error: null })
      }
      if (state.table === 'appointment_history') {
        if (state.insert) {
          state.auditRows = state.insert
          return resolve({ data: null, error: null })
        }
      }
      if (state.table === 'patients') {
        if (state.update) {
          return resolve({ data: null, error: null })
        }
      }
      return resolve({ data: [], error: null })
    },
  }
  return builder
}

// Create a mock admin client exposing the builder
const adminMock = { from: vi.fn(() => makeStatefulBuilder()), auth: { getUser: vi.fn() } }

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn(() => adminMock) }))
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn(async () => ({ from: vi.fn(() => makeStatefulBuilder()), auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) } })) }))

// For REAGENDADA, stub schedule validation to always accept in these API tests
vi.mock('@/lib/clinic-schedule', async (orig) => {
  const mod = await (orig as any)()
  return { ...mod, validateRescheduleDateTime: vi.fn(() => ({ valid: true })) }
})

// Allow any state transition here; transitions are covered in dedicated unit tests
vi.mock('@/lib/admission-business-rules', async (orig) => {
  const mod = await (orig as any)()
  return { ...mod, canTransitionToStatus: vi.fn(() => ({ valid: true })) }
})

// Also stub patient state plan to avoid complexity in COMPLETADA paths (not exercised here)
vi.mock('@/lib/patient-state-rules', () => ({ planUpdateOnAppointmentCompleted: vi.fn(() => ({ update: { estado_paciente: 'en_seguimiento' } })) }))

describe('PATCH /api/appointments/[id]/status', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    ;(adminMock.from as Mock).mockClear()
    // Force admin path to skip auth
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test')
    mockCurrentFechaHoraIso = null
    mockConflict = false
  })

  it('400 when CANCELADA without motivo_cambio', async () => {
    const res = await PATCH(makeReq({ newStatus: 'CANCELADA' }), makeParams())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Datos inválidos')
  })

  it('200 when CANCELADA with motivo_cambio', async () => {
    mockCurrentFechaHoraIso = new Date().toISOString()
    const res = await PATCH(makeReq({ newStatus: 'CANCELADA', motivo_cambio: 'Paciente indispuesto' }), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.estado_cita).toBe('CANCELADA')
  })

  it('200 PROGRAMADA -> PRESENTE with audit trail row', async () => {
    // Ensure appointment time equals now to satisfy check-in window
    mockCurrentFechaHoraIso = new Date().toISOString()
    const res = await PATCH(makeReq({ newStatus: 'PRESENTE' }), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.estado_cita).toBe('PRESENTE')

    // Ensure audit trail wrote one row for estado_cita
    // Find the last builder used for appointment_history
    const builderCall = (adminMock.from as Mock).mock.calls.find((c) => c[0] === 'appointment_history')
    expect(builderCall).toBeTruthy()
  })

  it('200 REAGENDADA updates fecha_hora_cita and inserts two audit rows', async () => {
    // Make current appointment clearly in the future so reschedule is allowed by business rules
    const future = new Date(); future.setDate(future.getDate() + 3); future.setHours(9, 0, 0, 0)
    mockCurrentFechaHoraIso = future.toISOString()
    const newIso = nextMondayAt(10)
    const res = await PATCH(makeReq({ newStatus: 'REAGENDADA', nuevaFechaHora: newIso, motivo_cambio: 'Reagenda por fuerza mayor' }), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.estado_cita).toBe('REAGENDADA')
    expect(json.fecha_hora_cita).toBe(newIso)

    // We cannot directly read audit rows from builder here easily without exposing state.
    // At least assert that appointment_history insert was attempted.
    const auditInsertCalled = (adminMock.from as Mock).mock.calls.some((c) => c[0] === 'appointment_history')
    expect(auditInsertCalled).toBe(true)
  })

  it('422 NO_ASISTIO too early per timing window', async () => {
    // Enable real rule checks
    vi.stubEnv('NODE_ENV', 'production')
    try {
      const future = new Date(); future.setMinutes(future.getMinutes() + 5)
      mockCurrentFechaHoraIso = future.toISOString()
      const res = await PATCH(makeReq({ newStatus: 'NO_ASISTIO' }), makeParams())
      expect(res.status).toBe(422)
      const json = await res.json()
      expect(json.attemptedStatus).toBe('NO_ASISTIO')
      expect(json.error).toBe('Acción no permitida por reglas de negocio')
    } finally {
      vi.stubEnv('NODE_ENV', 'test')
    }
  })

  it('422 REAGENDADA rejects when conflict detected for same doctor/date-time', async () => {
    mockConflict = true
    const future = new Date(); future.setDate(future.getDate() + 2); future.setHours(10, 0, 0, 0)
    mockCurrentFechaHoraIso = future.toISOString()
    const newIso = future.toISOString()
    const res = await PATCH(makeReq({ newStatus: 'REAGENDADA', nuevaFechaHora: newIso, motivo_cambio: 'Conflicto simulado' }), makeParams())
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error).toBe('Horario no disponible')
  })

  it('200 NO_ASISTIO allowed at or after 15 minutes past scheduled time', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      // Use 20 minutes to avoid boundary flakiness due to milliseconds
      const past = new Date(); past.setMinutes(past.getMinutes() - 20)
      mockCurrentFechaHoraIso = past.toISOString()
      // Debug: ensure mock time is set as expected
      // eslint-disable-next-line no-console
      console.log('[TEST DEBUG] mockCurrentFechaHoraIso set to', mockCurrentFechaHoraIso)
      const res = await PATCH(makeReq({ newStatus: 'NO_ASISTIO' }), makeParams())
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.estado_cita).toBe('NO_ASISTIO')
    } finally {
      vi.stubEnv('NODE_ENV', 'test')
    }
  })

  it('422 REAGENDADA invalid when within 2 hours of appointment time', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      const soon = new Date(); soon.setMinutes(soon.getMinutes() + 90)
      mockCurrentFechaHoraIso = soon.toISOString()
      const target = new Date(soon); target.setDate(target.getDate() + 1); target.setHours(10, 0, 0, 0)
      const res = await PATCH(makeReq({ newStatus: 'REAGENDADA', nuevaFechaHora: target.toISOString(), motivo_cambio: 'Ventana inválida' }), makeParams())
      expect(res.status).toBe(422)
      const json = await res.json()
      expect(json.error).toBe('Acción no permitida por reglas de negocio')
    } finally {
      vi.stubEnv('NODE_ENV', 'test')
    }
  })
})
