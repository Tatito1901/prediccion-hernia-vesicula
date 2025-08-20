'use client'

import { create } from 'zustand'
import { PatientStatusEnum, type EnrichedPatient } from '@/lib/types'

// Tipos locales para el store
export type PatientStatusFilter = keyof typeof PatientStatusEnum | 'all' | string

export interface PatientsPagination {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasMore: boolean
}

export interface PatientsStats {
  totalPatients: number
  surveyRate: number
  pendingConsults: number
  operatedPatients: number
  statusStats: Record<string, number> & { all: number }
}

export interface PatientsFilters {
  page: number
  pageSize: number
  search: string
  status: PatientStatusFilter
  startDate?: string
  endDate?: string
}

export interface PatientStoreState {
  // Datos
  paginatedPatients: EnrichedPatient[] | null
  patientsPagination: PatientsPagination
  patientsStats?: PatientsStats | null

  // UI/estado
  patientsFilters: PatientsFilters
  isPatientsLoading: boolean
  patientsError: Error | null
}

export interface PatientStoreActions {
  // Fetching
  fetchPatients: (params?: Partial<PatientsFilters>) => Promise<void>
  refetchPatients: () => Promise<void>

  // Filtros/acciones
  setPatientsPage: (page: number) => Promise<void>
  setPatientsSearch: (search: string) => Promise<void>
  setPatientsStatus: (status: PatientStatusFilter) => Promise<void>
  clearPatientsFilters: () => Promise<void>
  setPageSize: (size: number) => Promise<void>
}

export type PatientStore = PatientStoreState & PatientStoreActions

const DEFAULT_FILTERS: PatientsFilters = {
  page: 1,
  pageSize: 15, // Alineado con useClinicData
  search: '',
  status: 'all',
}

function buildPatientsQueryString(p: Partial<PatientsFilters>): string {
  const sp = new URLSearchParams()
  if (p.page) sp.set('page', String(p.page))
  if (p.pageSize) sp.set('pageSize', String(p.pageSize))
  if (p.search) sp.set('search', p.search)
  if (p.status && p.status !== 'all') sp.set('estado', String(p.status))
  if (p.startDate) sp.set('startDate', p.startDate)
  if (p.endDate) sp.set('endDate', p.endDate)
  return sp.toString()
}

async function fetchJson<T>(input: RequestInfo | URL): Promise<T> {
  const res = await fetch(input)
  if (!res.ok) {
    let message = 'Request failed'
    try {
      const data: any = await res.json()
      message = (data && (data.message || data.error)) || message
    } catch (_) {
      // ignore
    }
    throw new Error(message)
  }
  return res.json()
}

export const usePatientStore = create<PatientStore>((set, get) => ({
  // Estado inicial
  paginatedPatients: null,
  patientsPagination: {
    page: DEFAULT_FILTERS.page,
    pageSize: DEFAULT_FILTERS.pageSize,
    totalCount: 0,
    totalPages: 0,
    hasMore: false,
  },
  patientsStats: null,
  patientsFilters: { ...DEFAULT_FILTERS },
  isPatientsLoading: false,
  patientsError: null,

  // Acciones
  fetchPatients: async (params) => {
    const current = get().patientsFilters
    const merged: PatientsFilters = { ...current, ...(params || {}) }
    // Normalizar status: permitir claves del enum o valores
    const byKey = (PatientStatusEnum as Record<string, string>)[merged.status as string]
    const normalizedStatus = merged.status === 'all' ? 'all' : (byKey || String(merged.status))

    set({ isPatientsLoading: true, patientsError: null, patientsFilters: { ...merged, status: normalizedStatus } })

    try {
      const qs = buildPatientsQueryString({
        page: merged.page,
        pageSize: merged.pageSize,
        search: merged.search,
        status: normalizedStatus,
        startDate: merged.startDate,
        endDate: merged.endDate,
      })

      const res = await fetchJson<{
        data: EnrichedPatient[]
        pagination: PatientsPagination
        stats?: PatientsStats | null
      }>(`/api/patients?${qs}`)

      set({
        paginatedPatients: res.data ?? [],
        patientsPagination: res.pagination ?? {
          page: merged.page,
          pageSize: merged.pageSize,
          totalCount: 0,
          totalPages: 0,
          hasMore: false,
        },
        patientsStats: (res.stats as PatientsStats | null) ?? null,
        isPatientsLoading: false,
        patientsError: null,
      })
    } catch (error: any) {
      set({ isPatientsLoading: false, patientsError: error instanceof Error ? error : new Error(String(error)) })
    }
  },

  refetchPatients: async () => {
    const { patientsFilters } = get()
    await get().fetchPatients(patientsFilters)
  },

  setPatientsPage: async (page: number) => {
    await get().fetchPatients({ page })
  },

  setPatientsSearch: async (search: string) => {
    await get().fetchPatients({ search, page: 1 })
  },

  setPatientsStatus: async (status: PatientStatusFilter) => {
    await get().fetchPatients({ status, page: 1 })
  },

  clearPatientsFilters: async () => {
    await get().fetchPatients({ ...DEFAULT_FILTERS })
  },

  setPageSize: async (size: number) => {
    await get().fetchPatients({ pageSize: size, page: 1 })
  },
}))
