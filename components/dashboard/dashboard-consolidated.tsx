import React, { useState, memo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  Stethoscope, 
  Users, 
  Target, 
  Heart, 
  Shield, 
  RefreshCw, 
  ArrowUp, 
  ArrowDown, 
  Minus, 
  AlertCircle
} from 'lucide-react';

import { useDashboardMetrics } from '@/hooks/core/use-analytics-unified';

// Tipos y enums importados desde '@/lib/types' para evitar duplicación

export type Period = '7d' | '30d' | '90d';
export type Trend = 'up' | 'down' | 'neutral';

export interface ChartData {
  label: string;
  consultas: number;
  cirugias: number;
}

export interface Metrics {
  primary: {
    todayConsultations: number;
    totalPatients: number;
    occupancyRate: number;
  };
  clinical: {
    operatedPatients: number;
  };
  chartData: ChartData[];
  periodComparison: {
    changePercent: number;
  };
}

// Constantes para tendencias
const TREND_ICONS = {
  up: ArrowUp,
  down: ArrowDown,
  neutral: Minus
} as const;

const TREND_COLORS = {
  up: 'text-green-600 dark:text-green-400',
  down: 'text-red-600 dark:text-red-400',
  neutral: 'text-gray-500 dark:text-gray-400'
} as const;

// Métricas por defecto para estados de carga/error
const defaultMetrics: Metrics = {
  primary: { todayConsultations: 0, totalPatients: 0, occupancyRate: 0 },
  clinical: { operatedPatients: 0 },
  chartData: [],
  periodComparison: { changePercent: 0 },
};

// Componente MetricCard optimizado
interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: Trend;
  description?: string;
  isLoading?: boolean;
}

const MetricCard = memo<MetricCardProps>(({ 
  title, 
  value, 
  change = 0, 
  icon: Icon, 
  trend = 'neutral', 
  description, 
  isLoading 
}) => {
  const TrendIcon = TREND_ICONS[trend];
  const trendColor = TREND_COLORS[trend];

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24" />
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16" />
          </div>
          <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded flex-shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-2 flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide truncate">
            {title}
          </p>
          <div className="flex items-baseline flex-wrap gap-2">
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
            {change !== 0 && (
              <div className={`flex items-center text-xs sm:text-sm ${trendColor}`}>
                <TrendIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span>{Math.abs(change)}%</span>
              </div>
            )}
          </div>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {description}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    </div>
  );
});
MetricCard.displayName = 'MetricCard';

// Header del Dashboard
interface DashboardHeaderProps {
  period: Period;
  setPeriod: (period: Period) => void;
  handleRefresh: () => void;
  isLoading: boolean;
}

const DashboardHeader = memo<DashboardHeaderProps>(({ 
  period, 
  setPeriod, 
  handleRefresh, 
  isLoading 
}) => (
  <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Panel de Control
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Resumen de Actividad Clínica
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <div className="inline-flex bg-slate-100 dark:bg-gray-800 rounded-lg p-1 flex-1 sm:flex-initial" role="group">
        {(['7d', '30d', '90d'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex-1 sm:flex-initial ${
              period === p 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
            aria-pressed={period === p}
            aria-label={`Período de ${p.replace('d', ' días')}`}
          >
            {p.replace('d', '')}d
          </button>
        ))}
      </div>
      <button 
        onClick={() => handleRefresh()} 
        disabled={isLoading} 
        aria-label="Actualizar datos" 
        className="p-2 sm:p-2.5 rounded-lg bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`h-4 w-4 text-slate-700 dark:text-gray-300 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  </header>
));
DashboardHeader.displayName = 'DashboardHeader';

// Grid de métricas
interface MetricCardGridProps {
  metrics: Metrics;
  isLoading: boolean;
  period: Period;
  getTrend: (value: number) => Trend;
}

const MetricCardGrid = memo<MetricCardGridProps>(({ 
  metrics, 
  isLoading, 
  period, 
  getTrend 
}) => (
  <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
    <MetricCard 
      title="Consultas del Día" 
      value={metrics.primary.todayConsultations} 
      icon={Stethoscope} 
      isLoading={isLoading} 
    />
    <MetricCard 
      title="Base de Pacientes" 
      value={metrics.primary.totalPatients.toLocaleString()} 
      change={metrics.periodComparison.changePercent} 
      trend={getTrend(metrics.periodComparison.changePercent)} 
      icon={Users} 
      description={`Crecimiento en ${period.replace('d', ' días')}`} 
      isLoading={isLoading} 
    />
    <MetricCard 
      title="Eficiencia Operativa" 
      value={`${metrics.primary.occupancyRate}%`} 
      change={metrics.primary.occupancyRate - 80} 
      trend={getTrend(metrics.primary.occupancyRate - 80)} 
      icon={Target} 
      description="Tasa de ocupación" 
      isLoading={isLoading} 
    />
    <MetricCard 
      title="Total Cirugías" 
      value={metrics.clinical.operatedPatients} 
      icon={Heart} 
      description="Total histórico" 
      isLoading={isLoading} 
    />
  </section>
));
MetricCardGrid.displayName = 'MetricCardGrid';

// Carga diferida del gráfico pesado para reducir el bundle inicial
const ProcedureChart = dynamic(() => import('../charts/procedure-chart'), {
  ssr: false,
  loading: () => (
    <div className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="h-[200px] sm:h-[300px] flex items-center justify-center text-slate-500 dark:text-slate-400">
        Cargando gráfico…
      </div>
    </div>
  ),
});

// Componente principal
export default function DashboardEnhanced() {
  const [period, setPeriod] = useState<Period>('30d');
  const { data, isLoading, error, refetch } = useDashboardMetrics(period);
  const metrics = (data ?? defaultMetrics) as Metrics;

  const getTrend = useCallback((value: number): Trend => {
    if (value > 2) return 'up';
    if (value < -2) return 'down';
    return 'neutral';
  }, []);

  // Manejo de errores
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center max-w-md w-full bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg p-6 sm:p-8">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold text-center">
            Error al cargar los datos
          </h2>
          <p className="text-xs sm:text-sm text-center mt-2">
            {error.message}
          </p>
          <button 
            onClick={() => refetch()} 
            className="mt-4 px-4 py-2 bg-rose-600 dark:bg-rose-700 text-white rounded-md hover:bg-rose-700 dark:hover:bg-rose-600 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
            aria-label="Reintentar carga de datos"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans p-3 sm:p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <DashboardHeader 
          period={period} 
          setPeriod={setPeriod} 
          handleRefresh={refetch} 
          isLoading={isLoading}
        />
        <main className="space-y-4 sm:space-y-6">
          <MetricCardGrid 
            metrics={metrics} 
            isLoading={isLoading} 
            period={period} 
            getTrend={getTrend} 
          />
          <ProcedureChart 
            data={metrics.chartData} 
            isLoading={isLoading}
            period={period}
          />
        </main>
      </div>
    </div>
  );
}