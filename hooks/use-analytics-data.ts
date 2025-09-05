// hooks/use-analytics-data.ts - unified statistics data manager - REFACTORIZADO
'use client';

import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { endpoints } from '@/lib/api-endpoints';
import { queryFetcher } from '@/lib/http';
import { type StatisticsResponse, type LabelCount } from '@/lib/validation/statistics';
import { AppointmentStatusEnum } from '@/lib/types';
import { notifyError } from '@/lib/client-errors';

async function fetchStatistics(): Promise<StatisticsResponse> {
  const data = await queryFetcher<StatisticsResponse>(endpoints.statistics.unified());
  try { console.debug('[useAnalyticsData] fetched statistics meta', (data as any)?.meta); } catch {}
  return data;
}

export function useAnalyticsData() {
  const { data, isLoading, isError, isSuccess, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.statistics.unified,
    queryFn: fetchStatistics,
    staleTime: 60 * 1000,
    meta: { suppressGlobalError: true },
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
    if (error) notifyError(error, { prefix: 'Estadísticas' });
  }, [error]);

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
