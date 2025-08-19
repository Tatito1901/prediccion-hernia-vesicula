import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase server client
let capturedUpdatePayload: any | null
let updateCalled = false

function makeSupabaseStub(existingPatient: any, updatedPatient: any = existingPatient) {
  capturedUpdatePayload = null
  updateCalled = false

  const updateChain = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: updatedPatient, error: null }),
  }

  const tableChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: existingPatient, error: null }),
    update: vi.fn().mockImplementation((payload: any) => {
      updateCalled = true
      capturedUpdatePayload = payload
      return updateChain
    }),
  }

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table !== 'patients') throw new Error('Unexpected table: ' + table)
      return tableChain
    }),
  }
}

vi.mock('@/utils/supabase/server', () => {
  return {
    createClient: vi.fn(async () => supabaseStub)
  }
})

// Will be set per test
let supabaseStub: any

// Import after mocks
import { PATCH } from '@/app/api/patients/[id]/route'

function makeReq(body: any): any {
  return {
    json: async () => body,
  }
}

describe('PATCH /api/patients/[id] guards', () => {
  beforeEach(() => {
    capturedUpdatePayload = null
    updateCalled = false
  })

  it('does not overwrite terminal states (e.g., operado)', async () => {
    supabaseStub = makeSupabaseStub({ id: 'p1', estado_paciente: 'operado' })

    const res = await PATCH(
      makeReq({ estado_paciente: 'activo', nombre: 'Juan' }) as any,
      { params: Promise.resolve({ id: 'p1' }) } as any
    )

    expect(res.status).toBe(200)
    expect(updateCalled).toBe(true)
    expect(capturedUpdatePayload).toBeTruthy()
    // Should NOT include estado_paciente in the update payload
    expect('estado_paciente' in capturedUpdatePayload).toBe(false)
    // Should include updated_at
    expect(typeof capturedUpdatePayload.updated_at).toBe('string')
  })

  it('prevents downgrade to potencial from a non-potencial state', async () => {
    supabaseStub = makeSupabaseStub({ id: 'p2', estado_paciente: 'activo' })

    const res = await PATCH(
      makeReq({ estado_paciente: 'potencial' }) as any,
      { params: Promise.resolve({ id: 'p2' }) } as any
    )

    expect(res.status).toBe(200)
    expect(updateCalled).toBe(true)
    expect(capturedUpdatePayload).toBeTruthy()
    expect('estado_paciente' in capturedUpdatePayload).toBe(false)
  })

  it('rejects invalid estado_paciente values with 400', async () => {
    supabaseStub = makeSupabaseStub({ id: 'p3', estado_paciente: 'activo' })

    const res = await PATCH(
      makeReq({ estado_paciente: 'INVALID' }) as any,
      { params: Promise.resolve({ id: 'p3' }) } as any
    )

    expect(res.status).toBe(400)
    expect(updateCalled).toBe(false)
  })
})
