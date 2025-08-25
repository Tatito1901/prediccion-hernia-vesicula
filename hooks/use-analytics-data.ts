// hooks/use-analytics-data.ts - unified statistics data manager
'use client';

import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { ZStatisticsResponse, type StatisticsResponse, type LabelCount } from '@/lib/validation/statistics';
import { AppointmentStatusEnum } from '@/lib/types';

async function fetchStatistics(): Promise<StatisticsResponse> {
  const res = await fetch('/api/statistics');
  if (!res.ok) {
    let message = 'Failed to load statistics';
    try {
      const j = await res.json();
      message = j?.message || j?.error || message;
    } catch {}
    console.error('[useAnalyticsData] HTTP error when fetching /api/statistics:', message);
    throw new Error(message);
  }
  const json = await res.json();
  const parsed = ZStatisticsResponse.safeParse(json);
  if (!parsed.success) {
    console.error('[useAnalyticsData] Statistics schema validation failed', parsed.error.issues);
    throw new Error('Statistics schema validation failed');
  }
  try { console.debug('[useAnalyticsData] fetched statistics meta', parsed.data.meta); } catch {}
  return parsed.data;
}

export function useAnalyticsData() {
  const { data, isLoading, isError, isSuccess, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.statistics.unified,
    queryFn: fetchStatistics,
    staleTime: 60 * 1000,
  });

  // Normalizations and derived values
  const normalized = useMemo(() => {
    if (!data) return null;

    const demographic = data.demographicProfile || undefined;
    const genderArray: LabelCount[] | undefined = (() => {
      const g = demographic?.gender_distribution as any;
      if (!g) return undefined;
      if (Array.isArray(g)) return g as LabelCount[];
      // object form -> array form
      const male = typeof g.male === 'number' ? g.male : 0;
      const female = typeof g.female === 'number' ? g.female : 0;
      const other = typeof g.other === 'number' ? g.other : 0;
      return [
        { label: 'Male', count: male },
        { label: 'Female', count: female },
        { label: 'Other', count: other },
      ] as LabelCount[];
    })();

    const operational = data.operationalMetrics || undefined;
    const totalAppointments = (operational?.appointments_by_status || []).reduce((acc, s) => acc + (s.count || 0), 0);
    const findStatus = (name: string) => (operational?.appointments_by_status || []).find((s) => s.status?.toUpperCase?.() === name)?.count || 0;
    const completed = findStatus(AppointmentStatusEnum.COMPLETADA);
    const scheduled = findStatus(AppointmentStatusEnum.PROGRAMADA);
    const canceled = findStatus(AppointmentStatusEnum.CANCELADA);

    const noShowRate = operational?.no_show_rate ?? null;
    const punctualityRate = operational?.punctuality_rate ?? null;

    return {
      ...data,
      demographicProfile: demographic ? { ...demographic, gender_distribution: genderArray } : null,
      derived: {
        totalAppointments,
        completed,
        scheduled,
        canceled,
        noShowRate,
        punctualityRate,
      },
    } as StatisticsResponse & {
      derived: {
        totalAppointments: number;
        completed: number;
        scheduled: number;
        canceled: number;
        noShowRate: number | null;
        punctualityRate: number | null;
      };
    };
  }, [data]);

  useEffect(() => {
    if (normalized) {
      try { console.debug('[useAnalyticsData] normalized ready', normalized.meta); } catch {}
    }
  }, [normalized]);

  useEffect(() => {
    if (isError && error) {
      console.error('[useAnalyticsData] error state', error);
    }
  }, [isError, error]);

  return {
    data: normalized,
    isLoading,
    isError,
    isSuccess,
    error: error as Error | null,
    refetch,
    isFetching,
  } as const;
}
