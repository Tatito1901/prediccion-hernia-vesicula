import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useAppointmentStore } from '@/stores/appointment-store'

// Helper to mock fetch responses
function mockFetchOnce(body: any, ok = true) {
  ;(global as any).fetch = vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  })
}

// Helper to mock buckets request: today has data+summary; future/past empty
function mockFetchBuckets() {
  ;(global as any).fetch = vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : String(input)
    const u = new URL(url, 'http://localhost')
    const df = u.searchParams.get('dateFilter')
    if (df === 'today') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: sampleAppointments, summary: sampleSummary }),
      } as Response)
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) } as Response)
  })
}

const sampleAppointments = [
  {
    id: 'a1',
    patient_id: 'p1',
    fecha_hora_cita: new Date().toISOString(),
    motivos_consulta: ['dolor'],
    estado_cita: 'programada',
  },
] as any[]

const samplePagination = {
  page: 1,
  pageSize: 15,
  totalCount: 1,
  totalPages: 1,
  hasMore: false,
}

const sampleSummary = {
  total_appointments: 1,
  today_count: 1,
  future_count: 0,
  past_count: 0,
}

const resetStore = () => {
  // Merge state to preserve actions
  useAppointmentStore.setState({
    todayAppointments: [],
    futureAppointments: [],
    pastAppointments: [],
    filteredAppointments: null,
    appointmentsPagination: null,
    appointmentsSummary: null,
    appointmentsFilters: {
      dateFilter: 'today',
      startDate: null,
      endDate: null,
      search: '',
      page: 1,
      pageSize: 15,
      patientId: null,
    },
    isAppointmentsLoading: false,
    appointmentsError: null,
  } as any)
}

describe('useAppointmentStore', () => {
  beforeEach(() => {
    resetStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchAppointmentsBuckets should populate today/future/past and summary', async () => {
    mockFetchBuckets()
    await useAppointmentStore.getState().fetchAppointmentsBuckets()

    const s = useAppointmentStore.getState()
    expect(s.isAppointmentsLoading).toBe(false)
    expect(s.appointmentsError).toBeNull()
    expect(s.todayAppointments.length).toBe(1)
    expect(s.futureAppointments.length + s.pastAppointments.length).toBe(0)
    expect(s.appointmentsSummary?.today_count).toBe(1)
  })

  it('fetchAppointments should set filteredAppointments and pagination', async () => {
    mockFetchOnce({ data: sampleAppointments, pagination: samplePagination })
    await useAppointmentStore.getState().fetchAppointments({ dateFilter: 'today' })

    const s = useAppointmentStore.getState()
    expect(s.filteredAppointments?.length).toBe(1)
    expect(s.appointmentsPagination?.totalCount).toBe(1)
    expect(s.isAppointmentsLoading).toBe(false)
    expect(s.appointmentsError).toBeNull()
  })

  it('setDateFilter should update filters and trigger fetch', async () => {
    mockFetchOnce({ data: sampleAppointments, pagination: samplePagination })
    await useAppointmentStore.getState().setDateFilter('future')

    const { appointmentsFilters } = useAppointmentStore.getState()
    expect(appointmentsFilters.dateFilter).toBe('future')
    expect(appointmentsFilters.page).toBe(1)
  })

  it('setRange should set range and trigger fetch', async () => {
    mockFetchOnce({ data: sampleAppointments, pagination: samplePagination })
    await useAppointmentStore.getState().setRange('2025-01-01', '2025-01-31')

    const { appointmentsFilters } = useAppointmentStore.getState()
    expect(appointmentsFilters.dateFilter).toBe('range')
    expect(appointmentsFilters.startDate).toBe('2025-01-01')
    expect(appointmentsFilters.endDate).toBe('2025-01-31')
  })

  it('clearAppointmentsFilters resets filters and triggers fetch', async () => {
    mockFetchOnce({ data: sampleAppointments, pagination: samplePagination })
    await useAppointmentStore.getState().fetchAppointments({ dateFilter: 'past', page: 2, search: 'x', patientId: 'p1' })

    mockFetchOnce({ data: sampleAppointments, pagination: samplePagination })
    await useAppointmentStore.getState().clearAppointmentsFilters()

    const { appointmentsFilters } = useAppointmentStore.getState()
    expect(appointmentsFilters).toMatchObject({
      dateFilter: 'today',
      startDate: null,
      endDate: null,
      search: '',
      page: 1,
      pageSize: 15,
      patientId: null,
    })
  })
})
