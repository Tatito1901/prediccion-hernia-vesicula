import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock deterministic time for business rules
vi.mock('@/utils/datetime', () => ({
  mxNow: () => new Date('2025-01-01T15:00:00.000Z'),
}))

// Minimal supabase stub with chainable query builder
class Builder {
  private _table: string
  private _dataset: Record<string, any[]>
  data: any
  error: any
  count: number
  private _pendingUpdate: Record<string, any> | null = null

  constructor(table: string, dataset: Record<string, any[]>) {
    this._table = table
    this._dataset = dataset
    const rows = dataset[table] || []
    this.data = rows
    this.error = null
    this.count = Array.isArray(rows) ? rows.length : 0
  }

  select(_fields?: any, _opts?: any) { return this }
  update(patch: Record<string, any>) { this._pendingUpdate = patch; return this }
  insert(_rows: any[]) { return { data: null, error: null } }
  gte(_col?: any, _val?: any) { return this }
  lt(_col?: any, _val?: any) { return this }
  or(_expr?: any) { return this }
  range(_from?: any, _to?: any) { return this }
  order(_col?: any, _opts?: any) { return this }
  head?: boolean
  eq(col?: string, val?: any) {
    if (col === 'id') {
      const rows = this._dataset[this._table] || []
      const found = rows.find((r: any) => String(r.id) === String(val))
      if (found && this._pendingUpdate) {
        Object.assign(found, this._pendingUpdate)
        found.updated_at = new Date().toISOString()
        this._pendingUpdate = null
      }
      this.data = found ? found : null
      this.count = found ? 1 : 0
    }
    return this
  }
  single() {
    if (Array.isArray(this.data)) {
      this.data = this.data[0] || null
      this.count = this.data ? 1 : 0
    }
    return this
  }
}

const dataset = {
  appointments: [
    {
      id: 'apt-1',
      patient_id: 'pat-1',
      doctor_id: 'doc-1',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
      fecha_hora_cita: '2025-01-02T16:00:00.000Z',
      motivos_consulta: ['hernia'],
      estado_cita: 'PROGRAMADA',
      notas_breves: '',
      es_primera_vez: true,
      patients: {
        id: 'pat-1', nombre: 'Juan', apellidos: 'Pérez', telefono: '555-1234', email: 'jp@example.com', diagnostico_principal: 'hernia', estado_paciente: 'ACTIVO'
      }
    }
  ],
}

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => new Builder(table, dataset),
    rpc: vi.fn(async () => ({ data: [{ success: true, appointment_id: 'apt-1' }], error: null })),
    auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
  })),
}))

// Helpers
const makeReq = (url: string) => ({ url } as any)

describe('API: /api/appointments enrichment', () => {
  beforeEach(() => {
    // Reset dataset if needed in future
  })

  it('GET /api/appointments returns enriched actions', async () => {
    const mod = await import('../../app/api/appointments/route')
    const res: Response = await mod.GET(makeReq('http://localhost/api/appointments?dateFilter=all'))
    expect(res).toBeInstanceOf(Response)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)
    const item = body.data[0]
    expect(item).toHaveProperty('actions')
    expect(item.actions).toHaveProperty('available')
    expect(Array.isArray(item.actions.available)).toBe(true)
    expect(item).toHaveProperty('action_reasons')
    expect(item).toHaveProperty('suggested_action')
  })

  it('GET /api/appointments/:id returns enriched appointment', async () => {
    const mod = await import('../../app/api/appointments/[id]/route')
    const res: Response = await mod.GET(makeReq('http://localhost/api/appointments/apt-1'), { params: Promise.resolve({ id: 'apt-1' }) })
    expect(res).toBeInstanceOf(Response)
    const item = await res.json()
    expect(item).toHaveProperty('id', 'apt-1')
    expect(item).toHaveProperty('actions')
    expect(item.actions).toHaveProperty('available')
    expect(item).toHaveProperty('action_reasons')
    expect(item).toHaveProperty('suggested_action')
  })

  it('PATCH /api/appointments/:id/status returns enriched appointment after status change', async () => {
    const mod = await import('../../app/api/appointments/[id]/status/route')
    const payload = { newStatus: 'CONFIRMADA' }
    const req = { url: 'http://localhost/api/appointments/apt-1/status', json: async () => payload } as any
    const res: Response = await mod.PATCH(req, { params: Promise.resolve({ id: 'apt-1' }) })
    expect(res).toBeInstanceOf(Response)
    const item = await res.json()
    expect(item).toHaveProperty('id', 'apt-1')
    expect(item).toHaveProperty('estado_cita', 'CONFIRMADA')
    expect(item).toHaveProperty('actions')
    expect(item.actions).toHaveProperty('available')
    expect(item).toHaveProperty('action_reasons')
    expect(item).toHaveProperty('suggested_action')
  })
})
