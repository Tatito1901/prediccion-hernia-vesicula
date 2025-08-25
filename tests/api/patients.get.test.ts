import { describe, it, expect, vi, beforeEach } from 'vitest'

// Minimal Supabase client mock with thenable query objects
function makeThenable<T>(result: T) {
  return {
    gte() { return this },
    lt() { return this },
    eq() { return this },
    or() { return this },
    range() { return this },
    order() { return this },
    select() { return this },
    in() { return this },
    not() { return this },
    then(res: (v: T) => any) { return res(result) },
  }
}

const createClientMock = {
  from: vi.fn(() => makeThenable({ data: [], error: null, count: 0 })),
}

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => createClientMock),
}))

// Also mock admin client to avoid path resolution issues
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}))

vi.mock('next/server', async (orig) => {
  const actual = await (orig as any)()
  return { ...actual, NextResponse: actual.NextResponse }
})

describe('GET /api/patients', () => {
  beforeEach(() => {
    vi.resetModules()
    createClientMock.from.mockClear()
  })

  it('returns data and pagination (no debug meta by default)', async () => {
    const { GET } = await import('../../app/api/patients/route')
    const req = new Request('http://localhost/api/patients?page=1&pageSize=10') as any
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('data')
    expect(json).toHaveProperty('pagination')
    expect(json).not.toHaveProperty('meta')
  })

  it('includes meta when debug=1 (server client when no service role)', async () => {
    const prevService = process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const { GET } = await import('../../app/api/patients/route')
    const req = new Request('http://localhost/api/patients?page=2&pageSize=7&estado=all&debug=1') as any
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('meta')
    expect(json.meta).toHaveProperty('usedClient', 'server')
    expect(json.meta).toHaveProperty('params')
    expect(json.meta.params).toMatchObject({ page: 2, pageSize: 7, estado: 'all' })

    if (prevService !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prevService
  })

  it('falls back with pagination, stats and meta on permission denied (debug=1)', async () => {
    function makeThenableError() {
      const result = { data: null, error: { message: 'permission denied for table patients' }, count: null }
      return {
        gte() { return this },
        lt() { return this },
        eq() { return this },
        or() { return this },
        range() { return this },
        order() { return this },
        select() { return this },
        in() { return this },
        not() { return this },
        then(res: (v: any) => any) { return res(result) },
      }
    }

    // First query will error with permission denied
    createClientMock.from.mockReturnValueOnce(makeThenableError() as any)

    const prevService = process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const { GET } = await import('../../app/api/patients/route')
    const req = new Request('http://localhost/api/patients?page=1&pageSize=10&debug=1') as any
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('data')
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.data.length).toBe(0)
    expect(json).toHaveProperty('pagination')
    expect(json).toHaveProperty('stats')
    expect(json).toHaveProperty('meta')
    expect(json.meta).toHaveProperty('usedClient', 'server')

    if (prevService !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prevService
  })
})
