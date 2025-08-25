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

describe('GET /api/appointments', () => {
  beforeEach(() => {
    vi.resetModules()
    createClientMock.from.mockClear()
  })

  it('returns data, pagination and summary for today', async () => {
    const { GET } = await import('../../app/api/appointments/route')
    const req = new Request('http://localhost/api/appointments?dateFilter=today&page=1&pageSize=10') as any
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('data')
    expect(json).toHaveProperty('pagination')
    expect(json).toHaveProperty('summary')
    expect(json.pagination).toMatchObject({ page: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasMore: false })
  })

  it('omits summary for future/past/range', async () => {
    const { GET } = await import('../../app/api/appointments/route')
    const req = new Request('http://localhost/api/appointments?dateFilter=future&page=1&pageSize=5') as any
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).not.toHaveProperty('summary')
  })

  it('includes meta when debug=1', async () => {
    // Ensure admin path is not taken
    const prevService = process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const { GET } = await import('../../app/api/appointments/route')
    const req = new Request('http://localhost/api/appointments?dateFilter=today&page=2&pageSize=7&debug=1') as any
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('meta')
    expect(json.meta).toHaveProperty('usedClient', 'server')
    expect(json.meta).toHaveProperty('params')
    expect(json.meta.params).toMatchObject({ page: 2, pageSize: 7, dateFilter: 'today' })

    // restore
    if (prevService !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prevService
  })

  it('falls back with summary and meta on permission denied (debug=1)', async () => {
    // Mock a permission denied error from Supabase
    function makeThenableError() {
      const result = { data: null, error: { message: 'permission denied for table appointments' }, count: null }
      return {
        gte() { return this },
        lt() { return this },
        eq() { return this },
        or() { return this },
        range() { return this },
        order() { return this },
        select() { return this },
        then(res: (v: any) => any) { return res(result) },
      }
    }
    createClientMock.from.mockReturnValueOnce(makeThenableError() as any)

    // Ensure we use server client path
    const prevService = process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const { GET } = await import('../../app/api/appointments/route')
    const req = new Request('http://localhost/api/appointments?dateFilter=today&page=1&pageSize=10&debug=1') as any
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('data')
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.data.length).toBe(0)
    expect(json).toHaveProperty('pagination')
    expect(json).toHaveProperty('summary')
    expect(json).toHaveProperty('meta')
    expect(json.meta).toHaveProperty('usedClient', 'server')

    // restore
    if (prevService !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prevService
  })
})
