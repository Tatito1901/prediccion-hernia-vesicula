import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { usePatientStore } from '@/stores/patient-store'

// Helper to mock fetch responses
function mockFetchOnce(body: any, ok = true) {
  (global as any).fetch = vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  })
}

const samplePatients = [
  {
    id: 'p1',
    nombre: 'Ada',
    apellidos: 'Lovelace',
    estado_paciente: 'activo',
    nombreCompleto: 'Ada Lovelace',
    displayDiagnostico: 'Sin diagnóstico',
    encuesta_completada: false,
  },
] as any[]

const samplePagination = {
  page: 1,
  pageSize: 15,
  totalCount: 1,
  totalPages: 1,
  hasMore: false,
}

const sampleStats = {
  totalPatients: 1,
  surveyRate: 0,
  pendingConsults: 0,
  operatedPatients: 0,
  statusStats: { activo: 1, all: 1 },
}

const resetStore = () => {
  const initial = {
    paginatedPatients: null,
    patientsPagination: { page: 1, pageSize: 15, totalCount: 0, totalPages: 0, hasMore: false },
    patientsStats: null,
    patientsFilters: { page: 1, pageSize: 15, search: '', status: 'all' },
    isPatientsLoading: false,
    patientsError: null,
  }
  // Merge to preserve actions on the store
  usePatientStore.setState(initial as any)
}

describe('usePatientStore', () => {
  beforeEach(() => {
    resetStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchPatients should populate patients, pagination and stats', async () => {
    mockFetchOnce({ data: samplePatients, pagination: samplePagination, stats: sampleStats })

    await usePatientStore.getState().fetchPatients()

    const state = usePatientStore.getState()
    expect(state.isPatientsLoading).toBe(false)
    expect(state.patientsError).toBeNull()
    expect(state.paginatedPatients).toBeTruthy()
    expect(state.paginatedPatients?.length).toBe(1)
    expect(state.patientsPagination.totalCount).toBe(1)
    expect(state.patientsStats?.totalPatients).toBe(1)
  })

  it('setPatientsSearch resets page to 1 and triggers fetch', async () => {
    mockFetchOnce({ data: samplePatients, pagination: samplePagination, stats: sampleStats })

    await usePatientStore.getState().setPatientsSearch('ada')

    const { patientsFilters } = usePatientStore.getState()
    expect(patientsFilters.search).toBe('ada')
    expect(patientsFilters.page).toBe(1)
  })

  it('setPatientsStatus accepts enum key and value (normalizes to value)', async () => {
    mockFetchOnce({ data: samplePatients, pagination: samplePagination, stats: sampleStats })
    await usePatientStore.getState().setPatientsStatus('OPERADO') // key-like
    expect(usePatientStore.getState().patientsFilters.status).toBe('operado')

    mockFetchOnce({ data: samplePatients, pagination: samplePagination, stats: sampleStats })
    await usePatientStore.getState().setPatientsStatus('operado') // value-like
    expect(usePatientStore.getState().patientsFilters.status).toBe('operado')
  })

  it('clearPatientsFilters resets filters and data is fetched', async () => {
    mockFetchOnce({ data: samplePatients, pagination: samplePagination, stats: sampleStats })
    await usePatientStore.getState().fetchPatients({ page: 2, search: 'x', status: 'ACTIVO' })

    mockFetchOnce({ data: samplePatients, pagination: samplePagination, stats: sampleStats })
    await usePatientStore.getState().clearPatientsFilters()

    const { patientsFilters } = usePatientStore.getState()
    expect(patientsFilters).toMatchObject({ page: 1, pageSize: 15, search: '', status: 'all' })
  })
})
