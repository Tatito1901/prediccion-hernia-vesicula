// hooks/use-admission-appointments.ts
// Hook de dominio para la pantalla de Admisión

import { useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { AppointmentStatusEnum } from '@/lib/types'
import type { AppointmentStatus } from '@/lib/types'
import type { AppointmentWithPatient, TabType } from '@/components/patient-admision/admision-types'

// ===== Tipos de respuesta de la API =====
interface AppointmentsApiResponse {
  data: AppointmentWithPatient[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasMore: boolean
  }
  summary?: {
    total_appointments: number
    today_count: number
    future_count: number
    past_count: number
  }
  // meta?: unknown
}

export interface UseAdmissionAppointmentsParams {
  search?: string
  status?: 'all' | AppointmentStatus
  pageSize?: number
}

export interface AdmissionAppointmentsReturn {
  appointments: Record<TabType, AppointmentWithPatient[]>
  isLoading: boolean
  error: unknown
  refetch: () => Promise<void>
  stats: { today: number; pending: number; completed: number }
  rescheduledCount: number
}

async function fetchAppointments(params: {
  dateFilter: 'today' | 'future' | 'past'
  search?: string
  page?: number
  pageSize?: number
}): Promise<AppointmentsApiResponse> {
  // Build query string without relying on window during SSR
  const qs = new URLSearchParams()
  qs.set('dateFilter', params.dateFilter)
  if (params.search) qs.set('search', params.search)
  qs.set('page', String(params.page ?? 1))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))

  const origin =
    typeof globalThis !== 'undefined' && (globalThis as any).location?.origin
      ? (globalThis as any).location.origin
      : ''
  const url = `${origin}/api/appointments?${qs.toString()}`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const details = await res.json().catch(() => ({}))
    throw new Error(details?.message || 'Error al obtener citas')
  }
  return res.json()
}

export function useAdmissionAppointments(
  { search, status = 'all', pageSize = 50 }: UseAdmissionAppointmentsParams = {}
): AdmissionAppointmentsReturn {
  // 3 queries independientes (hoy, futuras, pasadas)
  const todayQuery = useQuery({
    queryKey: queryKeys.appointments.filtered({ dateFilter: 'today', search: search || '', pageSize }),
    queryFn: () => fetchAppointments({ dateFilter: 'today', search, page: 1, pageSize }),
    staleTime: 30_000,
  })
  const futureQuery = useQuery({
    queryKey: queryKeys.appointments.filtered({ dateFilter: 'future', search: search || '', pageSize }),
    queryFn: () => fetchAppointments({ dateFilter: 'future', search, page: 1, pageSize }),
    staleTime: 30_000,
  })
  const pastQuery = useQuery({
    queryKey: queryKeys.appointments.filtered({ dateFilter: 'past', search: search || '', pageSize }),
    queryFn: () => fetchAppointments({ dateFilter: 'past', search, page: 1, pageSize }),
    staleTime: 30_000,
  })

  const isLoading = todayQuery.isLoading || futureQuery.isLoading || pastQuery.isLoading
  const error = todayQuery.error || futureQuery.error || pastQuery.error

  const classified = useMemo(() => {
    const base: Record<TabType, AppointmentWithPatient[]> = { today: [], future: [], past: [] }
    let rescheduled = 0

    const filterOne = (list: AppointmentWithPatient[]) => {
      const filtered: AppointmentWithPatient[] = []
      for (const a of list || []) {
        if (a.estado_cita === AppointmentStatusEnum.REAGENDADA) {
          rescheduled += 1
          continue
        }
        if (status !== 'all' && a.estado_cita !== status) continue
        filtered.push(a)
      }
      return filtered
    }

    const today = filterOne(todayQuery.data?.data || [])
    const future = filterOne(futureQuery.data?.data || [])
    const past = filterOne(pastQuery.data?.data || [])

    // Ordenar (ascendente para today/future, descendente para past)
    today.sort((a, b) => new Date(a.fecha_hora_cita).getTime() - new Date(b.fecha_hora_cita).getTime())
    future.sort((a, b) => new Date(a.fecha_hora_cita).getTime() - new Date(b.fecha_hora_cita).getTime())
    past.sort((a, b) => new Date(b.fecha_hora_cita).getTime() - new Date(a.fecha_hora_cita).getTime())

    return { classified: { today, future, past }, rescheduled }
  }, [todayQuery.data, futureQuery.data, pastQuery.data, status])

  const stats = useMemo(() => {
    const today = classified.classified.today
    const pending = today.filter(
      (a) => a.estado_cita === AppointmentStatusEnum.PROGRAMADA || a.estado_cita === AppointmentStatusEnum.CONFIRMADA
    ).length
    const completed = today.filter((a) => a.estado_cita === AppointmentStatusEnum.COMPLETADA).length
    return { today: today.length, pending, completed }
  }, [classified.classified.today])

  const refetch = useCallback(async () => {
    await Promise.all([todayQuery.refetch(), futureQuery.refetch(), pastQuery.refetch()])
  }, [todayQuery, futureQuery, pastQuery])

  return {
    appointments: classified.classified,
    isLoading,
    error,
    refetch,
    stats,
    rescheduledCount: classified.rescheduled,
  }
}
