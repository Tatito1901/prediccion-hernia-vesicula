// hooks/use-survey-analytics.ts - REFACTORIZADO
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { queryFetcher } from '@/lib/http';
import { endpoints, buildSearchParams } from '@/lib/api-endpoints';
import { notifyError } from '@/lib/client-errors';

export interface NameTotal { name: string; total: number }

export interface SurveyTimeseriesPoint {
  period: string;
  responses: number;
  avg_pain: number | null;
}

export interface SurveyStatsResponse {
  summary: {
    responses_count: number;
    avg_pain: number | null;
    prev_diagnosis_rate: number; // 0..1
    period: { startDate: string; endDate: string; groupBy: 'day'|'week'|'month' };
  };
  histograms: {
    pain_intensity: NameTotal[];
    age: NameTotal[];
  };
  distributions: {
    severity: NameTotal[];
    decision_time: NameTotal[];
    desde_cuando: NameTotal[];
    plazo_resolucion_ideal: NameTotal[];
    motivo_visita: NameTotal[];
    seguro_medico: NameTotal[];
  };
  geolocation: {
    origen: NameTotal[];
    alcaldia_cdmx: NameTotal[];
    municipio_edomex: NameTotal[];
  };
  top_lists: {
    concerns: NameTotal[];
    important_aspects: NameTotal[];
    sintomas: NameTotal[];
  };
  timeseries: SurveyTimeseriesPoint[];
  calculatedAt: string;
}

export interface UseSurveyAnalyticsOptions {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  groupBy?: 'day' | 'week' | 'month';
}

export function useSurveyAnalytics(opts?: UseSurveyAnalyticsOptions) {
  const normalized = useMemo(() => ({
    startDate: opts?.startDate,
    endDate: opts?.endDate,
    groupBy: opts?.groupBy ?? 'month' as 'day'|'week'|'month',
  }), [opts?.startDate, opts?.endDate, opts?.groupBy]);

  const q = useQuery<SurveyStatsResponse>({
    queryKey: queryKeys.surveys.statsWithParams(normalized),
    queryFn: async () => {
      const params = buildSearchParams({
        startDate: normalized.startDate,
        endDate: normalized.endDate,
        groupBy: normalized.groupBy
      });

      return queryFetcher<SurveyStatsResponse>(
        endpoints.surveys.stats(params)
      );
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    meta: { suppressGlobalError: true },
  });

  useEffect(() => {
    if (q.error) notifyError(q.error, { prefix: 'Encuestas' });
  }, [q.error]);

  return q;
}
