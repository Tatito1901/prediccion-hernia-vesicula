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
})
