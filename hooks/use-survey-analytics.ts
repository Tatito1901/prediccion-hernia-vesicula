// hooks/use-survey-analytics.ts - React Query hook para consumir /api/surveys/stats
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { fetchJson } from '@/lib/http';
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
      const params = new URLSearchParams();
      if (normalized.startDate) params.set('startDate', normalized.startDate);
      if (normalized.endDate) params.set('endDate', normalized.endDate);
      if (normalized.groupBy) params.set('groupBy', normalized.groupBy);

      return fetchJson<SurveyStatsResponse>(
        `/api/surveys/stats${params.toString() ? `?${params.toString()}` : ''}`
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
