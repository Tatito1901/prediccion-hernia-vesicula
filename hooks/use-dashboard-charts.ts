// hooks/use-dashboard-charts.ts - React Query hook para consumir /api/dashboard/charts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

export interface TimelinePoint { date: string; count: number }
export interface NameTotal { name: string; total: number }

export interface DashboardChartsResponse {
  timelineData: TimelinePoint[];
  commonDiagnoses: NameTotal[];
  pathologyDistribution: NameTotal[];
  params: { startDate: string; endDate: string; topN: number };
  calculatedAt: string;
}

export interface UseDashboardChartsOptions {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  topN?: number;      // default 5
}

export function useDashboardCharts(opts?: UseDashboardChartsOptions) {
  const normalized = useMemo(() => ({
    startDate: opts?.startDate,
    endDate: opts?.endDate,
    topN: opts?.topN ?? 5,
  }), [opts?.startDate, opts?.endDate, opts?.topN]);

  return useQuery<DashboardChartsResponse>({
    queryKey: queryKeys.dashboard.charts(normalized),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (normalized.startDate) params.set('startDate', normalized.startDate);
      if (normalized.endDate) params.set('endDate', normalized.endDate);
      if (normalized.topN) params.set('topN', String(normalized.topN));

      const res = await fetch(`/api/dashboard/charts${params.toString() ? `?${params.toString()}` : ''}`);
      if (!res.ok) throw new Error('No se pudieron cargar los datos de gráficos');
      return res.json();
    },
    staleTime: 2 * 60 * 1000, // 2 min
    gcTime: 15 * 60 * 1000,   // 15 min (align SWR)
  });
}
