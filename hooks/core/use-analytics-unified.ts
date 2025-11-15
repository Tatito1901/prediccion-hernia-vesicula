// hooks/core/use-analytics-unified.ts
// Hook unificado para todas las operaciones de analytics y dashboard
// Reemplaza: use-analytics-data.ts, use-dashboard-metrics.ts, use-survey-analytics.ts

import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { endpoints, buildSearchParams } from '@/lib/api-endpoints';
import { queryFetcher } from '@/lib/http';
import { notifyError } from '@/lib/client-errors';
import type { 
  StatisticsResponse 
} from '@/lib/validation/statistics';
import type { 
  DashboardMetricsResponse, 
  DashboardPeriod 
} from '@/lib/validation/dashboard';
import { ZDashboardMetricsResponse } from '@/lib/validation/dashboard';
import { AppointmentStatusEnum } from '@/lib/types';

// ==================== TIPOS ====================
interface StatusDistributionItem {
  status: string
  count: number
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
  period?: DashboardPeriod;
  includeCharts?: boolean;
  includeSurveys?: boolean;
}

export interface UnifiedAnalyticsData {
  // Dashboard metrics
  dashboard?: DashboardMetricsResponse;
  
  // Statistics
  statistics?: StatisticsResponse & {
    derived?: {
      totalAppointments: number;
      completed: number;
      scheduled: number;
      canceled: number;
      noShowRate: number | null;
      punctualityRate: number | null;
    };
  };
  
  // Survey analytics
  surveys?: {
    summary: {
      responses_count: number;
      avg_pain: number | null;
      prev_diagnosis_rate: number;
    };
    distributions?: Record<string, Array<{ name: string; total: number }>>;
    timeseries?: Array<{
      period: string;
      responses: number;
      avg_pain: number | null;
    }>;
  };
  
  // Chart data
  chartData?: {
    daily: ChartDataResult;
    monthly: ChartDataResult;
    yearly: ChartDataResult;
  } | null;
}

interface ChartDataResult {
  series: { name: string; data: number[] }[];
  categories: string[];
  groupedData: { [key: string]: { consultas: number; operados: number } };
}

// ==================== FETCH FUNCTIONS ====================
async function fetchDashboardMetrics(period: DashboardPeriod): Promise<DashboardMetricsResponse> {
  const params = buildSearchParams({ period });
  const url = endpoints.dashboard.metrics(params);
  const raw = await queryFetcher<unknown>(url);
  
  const parsed = ZDashboardMetricsResponse.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues?.[0];
    const msg = first ? `${first.path?.join('.')}: ${first.message}` : 'Invalid dashboard metrics response';
    throw new Error(msg);
  }
  
  return parsed.data;
}

async function fetchStatistics(): Promise<StatisticsResponse> {
  return await queryFetcher<StatisticsResponse>(endpoints.statistics.unified());
}

async function fetchSurveyAnalytics(filters: {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}): Promise<any> {
  const params = buildSearchParams(filters);
  return await queryFetcher(endpoints.surveys.stats(params));
}

// ==================== TRANSFORMACIONES ====================
function normalizeStatistics(data: StatisticsResponse | undefined) {
  if (!data) return null;

  const demographic = data.demographicProfile;
  const operational = data.operationalMetrics;

  const statusItems = (operational?.appointments_by_status || []) as StatusDistributionItem[]
  const totalAppointments = statusItems
    .reduce((acc: number, s) => acc + (s.count || 0), 0);

  const findStatus = (name: string) =>
    statusItems.find((s) => s.status?.toUpperCase?.() === name)?.count || 0;
  
  return {
    ...data,
    derived: {
      totalAppointments,
      completed: findStatus(AppointmentStatusEnum.COMPLETADA),
      scheduled: findStatus(AppointmentStatusEnum.PROGRAMADA),
      canceled: findStatus(AppointmentStatusEnum.CANCELADA),
      noShowRate: operational?.no_show_rate ?? null,
      punctualityRate: operational?.punctuality_rate ?? null,
    },
  };
}

// ==================== HOOK PRINCIPAL ====================
export const useAnalytics = (filters: AnalyticsFilters = {}) => {
  const {
    period = '30d',
    startDate,
    endDate,
    groupBy = 'month',
    includeCharts = true,
    includeSurveys = true,
  } = filters;

  // Dashboard metrics query
  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard.metrics(period),
    queryFn: () => fetchDashboardMetrics(period),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Statistics query
  const statisticsQuery = useQuery({
    queryKey: queryKeys.statistics.unified,
    queryFn: fetchStatistics,
    staleTime: 60_000,
    meta: { suppressGlobalError: true },
  });

  // Survey analytics query
  const surveyQuery = useQuery({
    queryKey: queryKeys.surveys.statsWithParams({ startDate, endDate, groupBy }),
    queryFn: () => fetchSurveyAnalytics({ startDate, endDate, groupBy }),
    enabled: includeSurveys,
    staleTime: 2 * 60_000,
    gcTime: 15 * 60_000,
    meta: { suppressGlobalError: true },
  });

  // Normalizar datos de estadísticas
  const normalizedStatistics = useMemo(
    () => normalizeStatistics(statisticsQuery.data),
    [statisticsQuery.data]
  );

  // Procesar datos de gráficos si es necesario
  const chartData = useMemo(() => {
    if (!includeCharts || !dashboardQuery.data) {
      return null;
    }

    // Aquí procesaríamos los datos para gráficos
    // Por ahora retornamos estructura vacía
    return {
      daily: { series: [], categories: [], groupedData: {} },
      monthly: { series: [], categories: [], groupedData: {} },
      yearly: { series: [], categories: [], groupedData: {} },
    };
  }, [includeCharts, dashboardQuery.data]);

  // Manejo de errores
  useEffect(() => {
    if (dashboardQuery.error) {
      notifyError(dashboardQuery.error, { prefix: 'Dashboard' });
    }
  }, [dashboardQuery.error]);

  useEffect(() => {
    if (statisticsQuery.error) {
      notifyError(statisticsQuery.error, { prefix: 'Estadísticas' });
    }
  }, [statisticsQuery.error]);

  useEffect(() => {
    if (surveyQuery.error) {
      notifyError(surveyQuery.error, { prefix: 'Encuestas' });
    }
  }, [surveyQuery.error]);

  // Estado de carga unificado
  const isLoading = dashboardQuery.isLoading || 
                    statisticsQuery.isLoading || 
                    (includeSurveys && surveyQuery.isLoading);

  const isFetching = dashboardQuery.isFetching || 
                     statisticsQuery.isFetching || 
                     (includeSurveys && surveyQuery.isFetching);

  const isError = dashboardQuery.isError || 
                  statisticsQuery.isError || 
                  (includeSurveys && surveyQuery.isError);

  // Datos unificados
  const data: UnifiedAnalyticsData = {
    dashboard: dashboardQuery.data,
    statistics: normalizedStatistics || undefined,
    surveys: surveyQuery.data,
    chartData,
  };

  return {
    data,
    isLoading,
    isFetching,
    isError,
    error: dashboardQuery.error || statisticsQuery.error || surveyQuery.error,
    
    // Refetch functions
    refetchDashboard: dashboardQuery.refetch,
    refetchStatistics: statisticsQuery.refetch,
    refetchSurveys: surveyQuery.refetch,
    refetchAll: async () => {
      await Promise.all([
        dashboardQuery.refetch(),
        statisticsQuery.refetch(),
        includeSurveys && surveyQuery.refetch(),
      ].filter(Boolean));
    },
  };
};

// ==================== HOOKS ESPECIALIZADOS ====================
// Para compatibilidad con código existente

export const useDashboardMetrics = (period: DashboardPeriod = '30d') => {
  const { data, isLoading, isError, error, refetchDashboard } = useAnalytics({
    period,
    includeCharts: false,
    includeSurveys: false,
  });

  return {
    data: data.dashboard,
    isLoading,
    isError,
    error,
    refetch: refetchDashboard,
  };
};

export const useStatistics = () => {
  const { data, isLoading, isError, error, refetchStatistics } = useAnalytics({
    includeCharts: false,
    includeSurveys: false,
  });

  return {
    data: data.statistics,
    isLoading,
    isError,
    error,
    refetch: refetchStatistics,
  };
};

export const useSurveyAnalytics = (options?: {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}) => {
  const { data, isLoading, isError, error, refetchSurveys } = useAnalytics({
    ...options,
    includeCharts: false,
    includeSurveys: true,
  });

  return {
    data: data.surveys,
    isLoading,
    isError,
    error,
    refetch: refetchSurveys,
  };
};
