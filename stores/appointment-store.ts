'use client'

import { create } from 'zustand'
import type { Appointment } from '@/lib/types'

export type DateFilter = 'today' | 'future' | 'past' | 'range'

export interface AppointmentsSummary {
  total_appointments: number
  today_count: number
  future_count: number
  past_count: number
}

export interface AppointmentsPagination {
  page?: number
  pageSize?: number
  totalCount?: number
  totalPages?: number
  hasMore?: boolean
}

export interface AppointmentsFilters {
  dateFilter: DateFilter
  startDate: string | null
  endDate: string | null
  search: string
  page: number
  pageSize: number
  patientId: string | null
}

export interface AppointmentStoreState {
  // Buckets por período
  todayAppointments: Appointment[]
  futureAppointments: Appointment[]
  pastAppointments: Appointment[]

  // Resultado de la última búsqueda/paginado
  filteredAppointments: Appointment[] | null
  appointmentsPagination?: AppointmentsPagination | null
  appointmentsSummary?: AppointmentsSummary | null

  // UI/estado
  appointmentsFilters: AppointmentsFilters
  isAppointmentsLoading: boolean
  appointmentsError: Error | null
}

export interface AppointmentStoreActions {
  // Carga buckets base (today/future/past) y summary
  fetchAppointmentsBuckets: () => Promise<void>

  // Búsqueda/paginado según filtros
  fetchAppointments: (params?: Partial<AppointmentsFilters>) => Promise<void>
  refetchAppointments: () => Promise<void>

  // Setters de filtros (disparan fetch)
  setDateFilter: (dateFilter: DateFilter) => Promise<void>
  setRange: (startDate: string | null, endDate: string | null) => Promise<void>
  setSearch: (search: string) => Promise<void>
  setPage: (page: number) => Promise<void>
  setPageSize: (size: number) => Promise<void>
  setPatientId: (patientId: string | null) => Promise<void>
  clearAppointmentsFilters: () => Promise<void>
}

export type AppointmentStore = AppointmentStoreState & AppointmentStoreActions

const DEFAULT_FILTERS: AppointmentsFilters = {
  dateFilter: 'today',
  startDate: null,
  endDate: null,
  search: '',
  page: 1,
  pageSize: 15,
  patientId: null,
}

function buildAppointmentsQueryString(f: Partial<AppointmentsFilters>): string {
  const sp = new URLSearchParams()
  if (f.dateFilter) sp.set('dateFilter', f.dateFilter)
  if (f.patientId) sp.set('patientId', f.patientId)
  if (f.search) sp.set('search', f.search)
  if (f.pageSize) sp.set('pageSize', String(f.pageSize))
  if (f.page) sp.set('page', String(f.page))
  if (f.dateFilter === 'range') {
    if (f.startDate) sp.set('startDate', f.startDate)
    if (f.endDate) sp.set('endDate', f.endDate)
  }
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

export const useAppointmentStore = create<AppointmentStore>((set, get) => ({
  // Estado inicial
  todayAppointments: [],
  futureAppointments: [],
  pastAppointments: [],
  filteredAppointments: null,
  appointmentsPagination: null,
  appointmentsSummary: null,

  appointmentsFilters: { ...DEFAULT_FILTERS },
  isAppointmentsLoading: false,
  appointmentsError: null,

  // Acciones
  fetchAppointmentsBuckets: async () => {
    set({ isAppointmentsLoading: true, appointmentsError: null })
    try {
      const [todayRes, futureRes, pastRes] = await Promise.all([
        fetchJson<{ data?: Appointment[]; summary?: AppointmentsSummary }>(`/api/appointments?${buildAppointmentsQueryString({ dateFilter: 'today', pageSize: 100 })}`),
        fetchJson<{ data?: Appointment[] }>(`/api/appointments?${buildAppointmentsQueryString({ dateFilter: 'future', pageSize: 100 })}`),
        fetchJson<{ data?: Appointment[] }>(`/api/appointments?${buildAppointmentsQueryString({ dateFilter: 'past', pageSize: 100 })}`),
      ])

      const today = (todayRes?.data ?? []) as Appointment[]
      const future = (futureRes?.data ?? []) as Appointment[]
      const past = (pastRes?.data ?? []) as Appointment[]

      const summary: AppointmentsSummary = todayRes?.summary || {
        total_appointments: today.length + future.length + past.length,
        today_count: today.length,
        future_count: future.length,
        past_count: past.length,
      }

      set({
        todayAppointments: today,
        futureAppointments: future,
        pastAppointments: past,
        appointmentsSummary: summary,
        isAppointmentsLoading: false,
        appointmentsError: null,
      })
    } catch (error: any) {
      set({ isAppointmentsLoading: false, appointmentsError: error instanceof Error ? error : new Error(String(error)) })
    }
  },

  fetchAppointments: async (params) => {
    const current = get().appointmentsFilters
    const merged: AppointmentsFilters = { ...current, ...(params || {}) }

    set({ isAppointmentsLoading: true, appointmentsError: null, appointmentsFilters: merged })

    try {
      const qs = buildAppointmentsQueryString(merged)
      const res = await fetchJson<{ data?: Appointment[]; pagination?: AppointmentsPagination }>(`/api/appointments?${qs}`)

      set({
        filteredAppointments: (res?.data ?? []) as Appointment[],
        appointmentsPagination: res?.pagination ?? null,
        isAppointmentsLoading: false,
        appointmentsError: null,
      })
    } catch (error: any) {
      set({ isAppointmentsLoading: false, appointmentsError: error instanceof Error ? error : new Error(String(error)) })
    }
  },

  refetchAppointments: async () => {
    const { appointmentsFilters } = get()
    await get().fetchAppointments(appointmentsFilters)
  },

  setDateFilter: async (dateFilter: DateFilter) => {
    await get().fetchAppointments({ dateFilter, page: 1 })
  },

  setRange: async (startDate: string | null, endDate: string | null) => {
    await get().fetchAppointments({ dateFilter: 'range', startDate, endDate, page: 1 })
  },

  setSearch: async (search: string) => {
    await get().fetchAppointments({ search, page: 1 })
  },

  setPage: async (page: number) => {
    await get().fetchAppointments({ page })
  },

  setPageSize: async (size: number) => {
    await get().fetchAppointments({ pageSize: size, page: 1 })
  },

  setPatientId: async (patientId: string | null) => {
    await get().fetchAppointments({ patientId, page: 1 })
  },

  clearAppointmentsFilters: async () => {
    await get().fetchAppointments({ ...DEFAULT_FILTERS })
  },
}))
