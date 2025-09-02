import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '@/lib/http'
import { queryKeys } from '@/lib/query-keys'
import { ZDashboardMetricsResponse, type DashboardMetricsResponse, type DashboardPeriod } from '@/lib/validation/dashboard'

export function useDashboardMetrics(period: DashboardPeriod = '30d') {
  return useQuery<DashboardMetricsResponse, Error>({
    queryKey: queryKeys.dashboard.metrics(period),
    queryFn: async () => {
      const url = `/api/dashboard/metrics?period=${encodeURIComponent(period)}`
      const raw = await fetchJson<unknown>(url)
      const parsed = ZDashboardMetricsResponse.safeParse(raw)
      if (!parsed.success) {
        // Surface first issue for easier debugging
        const first = parsed.error.issues?.[0]
        const msg = first ? `${first.path?.join('.')}: ${first.message}` : 'Invalid dashboard metrics response'
        throw new Error(msg)
      }
      return parsed.data
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
}

export type { DashboardMetricsResponse, DashboardPeriod }
