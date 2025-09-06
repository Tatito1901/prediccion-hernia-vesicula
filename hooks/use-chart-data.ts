// hooks/use-chart-data.tsx - Minimal replacement for chart data processing
'use client';

import { useMemo } from 'react';
import { useClinic } from '@/contexts/clinic-data-provider';

/**
 * Hook simplificado que actúa como selector de datos de gráficos
 * desde la fuente centralizada useClinic
 */

interface UseChartDataOptions {
  startDate?: Date;
  endDate?: Date;
  groupBy?: 'day' | 'month' | 'year';
}

export const useChartData = (options?: UseChartDataOptions) => {
  const { chartData, getChartData } = useClinic();
  
  const data = useMemo(() => {
    // Si se proporcionan opciones específicas, usar getChartData
    if (options?.startDate || options?.endDate || options?.groupBy) {
      return getChartData(
        options.startDate,
        options.endDate,
        options.groupBy || 'day'
      );
    }
    
    // Por defecto, retornar los datos pre-calculados según el groupBy
    const groupBy = options?.groupBy || 'day';
    switch (groupBy) {
      case 'month':
        return chartData.monthly;
      case 'year':
        return chartData.yearly;
      default:
        return chartData.daily;
    }
  }, [chartData, getChartData, options?.startDate, options?.endDate, options?.groupBy]);

  return data;
};

/**
 * Función de utilidad para usar directamente los datos de gráficos
 * sin necesidad de un hook (útil en componentes que ya usan useClinic)
 */
export const selectChartData = (
  chartData: {
    daily: any;
    monthly: any;
    yearly: any;
  },
  groupBy: 'day' | 'month' | 'year' = 'day'
) => {
  switch (groupBy) {
    case 'month':
      return chartData.monthly;
    case 'year':
      return chartData.yearly;
    default:
      return chartData.daily;
  }
};
