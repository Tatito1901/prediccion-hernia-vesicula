import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '../../app/api/appointments/[id]/route'

// Stateful minimal query builder to simulate select/update flows
function makeStatefulBuilder() {
  const calls: any[] = []
  const state: any = { mode: 'idle' }
  const builder: any = {
    from(table: string) { calls.push(['from', table]); state.table = table; return builder },
    select(sel?: string) { calls.push(['select', sel]); state.sel = sel; return builder },
    update(payload: any) { calls.push(['update', payload]); state.update = payload; return builder },
    eq(col: string, val: any) { calls.push(['eq', col, val]); (state.filters ||= []).push({ col, val }); return builder },
    neq(col: string, val: any) { calls.push(['neq', col, val]); (state.filters ||= []).push({ col, val, op: 'neq' }); return builder },
    limit(n: number) { calls.push(['limit', n]); state.limit = n; return builder },
    single() { calls.push(['single']); state.single = true; return builder },
    order() { return builder },
    range() { return builder },
    async then(resolve: any) {
      // First call pattern in our handler: select current by id single
      if (calls.find((c) => c[0] === 'select') && state.update === undefined) {
        return resolve({
          data: { id: 'appt-1', doctor_id: 'doc-1', fecha_hora_cita: '2025-08-25T15:00:00.000Z' },
          error: null,
        })
      }
      // Potential conflict probe: select('id') eq('doctor_id') eq('fecha_hora_cita') neq('id', id)
      const isConflictProbe = calls.some((c) => c[0] === 'select') &&
        (state.filters || []).some((f: any) => f.col === 'doctor_id') &&
        (state.filters || []).some((f: any) => f.col === 'fecha_hora_cita') &&
        (state.filters || []).some((f: any) => f.col === 'id' && f.op === 'neq')
      if (isConflictProbe) {
        return resolve({ data: [], error: null })
      }
      // Update path: return enriched row
      if (state.update) {
        return resolve({
          data: {
            id: 'appt-1',
            patient_id: 'pat-1',
            doctor_id: state.update.doctor_id ?? 'doc-1',
            created_at: '2025-08-20T00:00:00.000Z',
            updated_at: '2025-08-21T00:00:00.000Z',
            fecha_hora_cita: state.update.fecha_hora_cita ?? '2025-08-25T15:00:00.000Z',
            motivos_consulta: state.update.motivos_consulta ?? ['dolor'],
            estado_cita: 'PROGRAMADA',
            notas_breves: state.update.notas_breves ?? null,
            es_primera_vez: false,
            patients: { id: 'pat-1', nombre: 'Jane', apellidos: 'Roe', estado_paciente: 'activo' },
          },
          error: null,
        })
      }
      return resolve({ data: [], error: null })
    },
  }
  return builder
}

const adminMock = { from: vi.fn(() => makeStatefulBuilder()) }

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn(() => adminMock) }))
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }))

// Next.js NextRequest params adapter
function makeReq(body: any) {
  return new Request('http://localhost/api/appointments/appt-1', { method: 'PATCH', body: JSON.stringify(body) }) as any
}

function makeParams(id = 'appt-1') { return { params: Promise.resolve({ id }) } as any }

describe('PATCH /api/appointments/[id]', () => {
  beforeEach(() => { adminMock.from.mockClear() })

  it('rejects status change in this endpoint', async () => {
    const res = await PATCH(makeReq({ estado_cita: 'CONFIRMADA' }), makeParams())
    expect(res.status).toBe(422)
  })

  it('updates general fields and returns enriched row', async () => {
    const res = await PATCH(makeReq({ notas_breves: 'nota', motivos_consulta: ['control'] }), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('patients')
    expect(json.motivos_consulta).toEqual(['control'])
  })
})
