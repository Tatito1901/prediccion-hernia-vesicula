// hooks/use-trends.ts - HOOK PARA CONSUMIR TENDENCIAS HISTÓRICAS REALES
"use client";

import { useQuery } from '@tanstack/react-query';

// ==================== TIPOS DE DATOS ====================
export interface TrendMetric {
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  percentageChange: number;
}

export interface TrendsData {
  totalPatients: TrendMetric;
  newPatients: TrendMetric;
  operatedPatients: TrendMetric;
  nonOperatedPatients: TrendMetric;
  followUpPatients: TrendMetric;
  conversionRate: TrendMetric;
  averageTime: TrendMetric;
  period: string;
  calculatedAt: string;
}

// ==================== FUNCIÓN DE FETCH ====================
async function fetchTrends(period: string = 'month'): Promise<TrendsData> {
  const response = await fetch(`/api/trends?period=${period}`);
  
  if (!response.ok) {
    throw new Error(`Error al obtener tendencias: ${response.status}`);
  }
  
  return response.json();
}

// ==================== HOOK PRINCIPAL ====================
export function useTrends(period: string = 'month', enabled: boolean = true) {
  return useQuery({
    queryKey: ['trends', period],
    queryFn: () => fetchTrends(period),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// ==================== NOTA ====================
// Los hooks wrapper específicos (useDashboardTrends, usePatientAnalyticsTrends, 
// useWeeklyTrends, useQuarterlyTrends) fueron eliminados por ser código muerto.
// Usar directamente useTrends(period, enabled) en su lugar.
