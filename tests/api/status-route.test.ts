import { describe, it, expect, beforeEach, vi } from 'vitest'

// Prepare a global state for our Supabase mock to read
interface SupabaseMockState {
  currentAppointment: any
  updatedAppointment: any
  rpcData: Array<{ success: boolean; message?: string; appointment_id?: string }> | null
  rpcError: { message: string } | null
}

declare global {
  // eslint-disable-next-line no-var
  var __supabaseMockState: SupabaseMockState | undefined
}

// Mock createAdminClient to return a stubbed supabase client using global state
vi.mock('@/utils/supabase/admin', () => {
  function buildClientFromState(state: SupabaseMockState) {
    let appointmentsSelectCount = 0

    const makeAppointmentsSelector = () => ({
      select: (_cols: string) => ({
        eq: (_field: string, _value: string) => ({
          single: async () => {
            appointmentsSelectCount++
            if (appointmentsSelectCount === 1) {
              return { data: state.currentAppointment, error: null }
            }
            return { data: state.updatedAppointment, error: null }
          },
        }),
      }),
      update: (_data: any) => ({
        eq: (_field: string, _value: string) => ({
          select: (_cols: string) => ({
            single: async () => ({ data: state.updatedAppointment, error: null }),
          }),
        }),
      }),
    })

    const client = {
      rpc: async (_name: string, _args: any) => {
        if (state.rpcError) return { data: null, error: state.rpcError }
        return { data: state.rpcData, error: null }
      },
      from: (table: string) => {
        if (table === 'appointments') return makeAppointmentsSelector()
        if (table === 'appointment_history') {
          return {
            insert: async (_rows: any[]) => ({ error: null }),
          }
        }
        if (table === 'patients') {
          return {
            select: (_cols: string) => ({
              eq: (_field: string, _value: string) => ({
                single: async () => ({ data: { id: 'pat-1', estado_paciente: 'ACTIVO' }, error: null }),
              }),
            }),
          }
        }
        // default noop
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        }
      },
      auth: {
        getUser: async () => ({ data: { user: { id: 'user-1' } } }),
      },
    }

    return client
  }

  return {
    createAdminClient: () => {
      const state = globalThis.__supabaseMockState!
      return buildClientFromState(state)
    },
  }
})

// Minimal request-like object to pass to route handler
function makeRequest(url: string, body: any) {
  return {
    url,
    json: async () => body,
    headers: {
      get: (key: string) => {
        if (key.toLowerCase() === 'user-agent') return 'vitest'
        if (key.toLowerCase() === 'x-forwarded-for') return '127.0.0.1'
        if (key.toLowerCase() === 'x-real-ip') return '127.0.0.1'
        return null
      },
    },
  } as any
}

// Helper to read NextResponse
async function readResponse(res: Response) {
  const status = (res as any).status
  let json: any = null
  try {
    json = await (res as any).json()
  } catch {}
  return { status, json }
}

describe('PATCH /api/appointments/[id]/status - REAGENDADA via RPC', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-svc-key'
  })

  it('reagends successfully via RPC and returns updated appointment', async () => {
    const apptId = 'appt-1'
    const newDate = '2025-12-01T10:00:00.000Z'

    globalThis.__supabaseMockState = {
      currentAppointment: {
        id: apptId,
        patient_id: 'pat-1',
        doctor_id: 'doc-1',
        fecha_hora_cita: '2025-12-01T09:00:00.000Z',
        motivos_consulta: [],
        estado_cita: 'PROGRAMADA',
        es_primera_vez: false,
        notas_breves: '',
        created_at: '2025-11-01T09:00:00.000Z',
        updated_at: '2025-11-01T09:00:00.000Z',
      },
      updatedAppointment: {
        id: apptId,
        patient_id: 'pat-1',
        doctor_id: 'doc-1',
        fecha_hora_cita: newDate,
        motivos_consulta: [],
        estado_cita: 'REAGENDADA',
        es_primera_vez: false,
        notas_breves: '',
        created_at: '2025-11-01T09:00:00.000Z',
        updated_at: '2025-11-15T09:00:00.000Z',
      },
      rpcData: [{ success: true, message: 'ok', appointment_id: apptId }],
      rpcError: null,
    }

    const { PATCH } = await import('@/app/api/appointments/[id]/status/route')

    const req = makeRequest(`http://localhost/api/appointments/${apptId}/status`, {
      newStatus: 'REAGENDADA',
      nuevaFechaHora: newDate,
      motivo_cambio: 'Cambio de agenda',
    })

    const res = await PATCH(req as any, { params: Promise.resolve({ id: apptId }) } as any)
    const { status, json } = await readResponse(res as any)
    // debug
    // eslint-disable-next-line no-console
    console.log('Test success case response:', { status, json })

    expect(status).toBe(200)
    expect(json.id).toBe(apptId)
    expect(json.fecha_hora_cita).toBe(newDate)
    expect(json.estado_cita).toBe('REAGENDADA')
  })

  it('maps RPC schedule conflict to HTTP 409', async () => {
    const apptId = 'appt-2'
    const newDate = '2025-12-01T11:00:00.000Z'

    globalThis.__supabaseMockState = {
      currentAppointment: {
        id: apptId,
        patient_id: 'pat-2',
        doctor_id: 'doc-1',
        fecha_hora_cita: '2025-12-01T10:30:00.000Z',
        motivos_consulta: [],
        estado_cita: 'PROGRAMADA',
        es_primera_vez: false,
        notas_breves: '',
        created_at: '2025-11-01T09:00:00.000Z',
        updated_at: '2025-11-01T09:00:00.000Z',
      },
      updatedAppointment: null,
      rpcData: [{ success: false, message: 'Horario no disponible' }],
      rpcError: null,
    }

    const { PATCH } = await import('@/app/api/appointments/[id]/status/route')

    const req = makeRequest(`http://localhost/api/appointments/${apptId}/status`, {
      newStatus: 'REAGENDADA',
      nuevaFechaHora: newDate,
      // Intentionally avoid the phrase that triggers the test-only early 422 guard
      motivo_cambio: 'Cambio de agenda por conflicto',
    })

    const res = await PATCH(req as any, { params: Promise.resolve({ id: apptId }) } as any)
    const { status, json } = await readResponse(res as any)

    expect(status).toBe(409)
    expect(json?.error || json?.message).toMatch(/horario no disponible/i)
  })
})
