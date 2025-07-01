// hooks/use-statistics-data.ts

import { useQuery } from '@tanstack/react-query';
import type { DateRangeOption } from './use-chart-data';
import type { PatientData, ChartData, DiagnosticInsight } from '@/components/charts/chart-diagnostic';

// Define the interface for statistics data
export interface StatisticsResult {
  metrics: {
    totalPacientes: number;
    totalHernias: number;
    totalVesicula: number;
    totalApendicitis: number;
    diagnosticosMasComunes: ChartData[];
    distribucionHernias: ChartData[];
    porcentajeHernias: number;
    porcentajeVesicula: number;
    porcentajeApendicitis: number;
    ratioHerniaVesicula: number;
    diversidadDiagnostica: number;
    riesgoPromedio: 'baja' | 'media' | 'alta';
    tendenciaGeneral: number;
  };
  timeline: Array<{
    date: string;
    cantidad: number;
    formattedDate: string;
  }>;
  insights: DiagnosticInsight[];
}

interface UseStatisticsDataParams {
  dateRange?: DateRangeOption;
  estado?: string;
  refreshInterval?: number;
}

// Cache keys for react-query
export const statisticsKeys = {
  all: ['statistics'] as const,
  data: (filters: { dateRange?: string; estado?: string }) => 
    [...statisticsKeys.all, 'data', filters] as const,
};

// Hook to fetch statistics data
export const useStatisticsData = ({
  dateRange = '30dias',
  estado = 'todos',
  refreshInterval = 0
}: UseStatisticsDataParams = {}) => {
  // Minimum refresh interval to avoid excessive API calls
  const MIN_REFRESH_INTERVAL = 30 * 1000; // 30 seconds
  const validRefreshInterval = refreshInterval > 0 ? Math.max(refreshInterval, MIN_REFRESH_INTERVAL) : 0;

  // Use React Query to fetch and cache data
  const result = useQuery({
    queryKey: statisticsKeys.data({ dateRange, estado }),
    queryFn: async () => {
      const params = new URLSearchParams({
        dateRange,
        estado,
      });

      try {
        const response = await fetch(`/api/statics/patients?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Error fetching statistics: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data as StatisticsResult;
      } catch (error) {
        console.error('Error fetching statistics data:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error fetching statistics data');
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache freshness
    refetchInterval: validRefreshInterval > 0 ? validRefreshInterval : false,
  });

  // Return query result with additional utilities
  return {
    data: result.data,
    isLoading: result.isLoading,
    error: result.error ? (result.error as Error).message : null,
    refresh: result.refetch,
    lastUpdated: new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }),
  };
};
