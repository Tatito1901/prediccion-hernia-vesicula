import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock admin client with a tiny query builder
function makeBuilder(opts?: { conflictOnProbe?: boolean }) {
  const state: any = { table: null, op: null, payload: null, insertPayload: null, filters: [] }
  const result = {
    from(table: string) { state.table = table; return result },
    select(sel?: string, _opts?: any) { state.op = 'select'; state.sel = sel; return result },
    insert(payload: any) { state.op = 'insert'; state.payload = payload; state.insertPayload = payload; return result },
    eq(col: string, val: any) { state.filters.push({ type: 'eq', col, val }); return result },
    limit(n: number) { state.limit = n; return result },
    single() { state.single = true; return result },
    async then(resolve: any) {
      // If we performed an insert chain, always return enriched created row
      if (state.insertPayload) {
        const created = {
          id: 'appt-1',
          ...state.insertPayload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          patients: {
            id: state.insertPayload.patient_id,
            nombre: 'John',
            apellidos: 'Doe',
            telefono: null,
            email: null,
            edad: null,
            diagnostico_principal: null,
            estado_paciente: 'activo',
          },
        }
        return resolve({ data: created, error: null })
      }
      // Conflict probe: select('id').eq('doctor_id').eq('fecha_hora_cita').limit(1)
      const isConflictProbe = state.op === 'select' && state.sel === 'id' && state.filters.some((f: any) => f.col === 'doctor_id') && state.filters.some((f: any) => f.col === 'fecha_hora_cita') && state.limit === 1
      if (isConflictProbe) {
        // Return conflict when requested
        return resolve({ data: opts?.conflictOnProbe ? [{ id: 'conflict' }] : [], error: null })
      }
      return resolve({ data: [], error: null, count: 0 })
    },
  }
  return result
}

const adminMock = { from: vi.fn(() => makeBuilder()) }

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(() => adminMock),
}))

// Avoid accidental real import
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }))


describe('POST /api/appointments', () => {
  beforeEach(() => {
    adminMock.from.mockClear()
  })

  it('creates an appointment and returns enriched row', async () => {
    const { POST } = await import('../../app/api/appointments/route')
    const payload = {
      patient_id: '11111111-1111-1111-1111-111111111111',
      fecha_hora_cita: '2025-08-25T15:00:00.000Z',
      motivos_consulta: ['dolor'],
      notas_breves: 'Obs',
      es_primera_vez: true,
    }
    const req = new Request('http://localhost/api/appointments', { method: 'POST', body: JSON.stringify(payload) }) as any
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('id')
    expect(json).toHaveProperty('patients')
    expect(json.patient_id).toBe(payload.patient_id)
  })

  it('returns 409 on doctor/time conflict', async () => {
    // Override builder to simulate conflict
    adminMock.from.mockImplementationOnce(() => makeBuilder({ conflictOnProbe: true }))

    const payload = {
      patient_id: '11111111-1111-1111-1111-111111111111',
      fecha_hora_cita: '2025-08-25T15:00:00.000Z',
      motivos_consulta: ['dolor'],
      doctor_id: '22222222-2222-2222-2222-222222222222'
    }
    const { POST } = await import('../../app/api/appointments/route')
    const req = new Request('http://localhost/api/appointments', { method: 'POST', body: JSON.stringify(payload) }) as any
    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})
