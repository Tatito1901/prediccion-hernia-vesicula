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

// ==================== HOOKS ESPECÍFICOS PARA COMPONENTES ====================

/**
 * Hook optimizado para métricas del dashboard principal
 */
export function useDashboardTrends(enabled: boolean = true) {
  return useTrends('month', enabled);
}

/**
 * Hook para analytics de pacientes con período personalizable
 */
export function usePatientAnalyticsTrends(period: string = 'month', enabled: boolean = true) {
  return useTrends(period, enabled);
}

/**
 * Hook para tendencias semanales
 */
export function useWeeklyTrends(enabled: boolean = true) {
  return useTrends('week', enabled);
}

/**
 * Hook para tendencias trimestrales
 */
export function useQuarterlyTrends(enabled: boolean = true) {
  return useTrends('quarter', enabled);
}
