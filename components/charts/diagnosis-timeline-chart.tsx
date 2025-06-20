
/* -------------------------------------------------------------------------- */
/*  diagnosis-timeline-chart.tsx - OPTIMIZADO                                */
/* -------------------------------------------------------------------------- */

import { memo, useMemo, useCallback, useState, FC } from 'react';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, TrendingUp, BarChart2, Calendar, Settings, ChevronDown } from 'lucide-react';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import useChartConfig, { 
  type PatientData,
  type TrendChartData,
  categorizeMainDiagnosis,
  MAIN_DIAGNOSES,
} from '@/components/charts/use-chart-config';
import { format, parseISO } from "date-fns";

type ChartView = 'line' | 'bar';
type ChartPeriod = 'weekly' | 'monthly' | 'quarterly';

interface ChartConfig {
  view: ChartView;
  period: ChartPeriod;
  topN: number;
  showTrend: boolean;
}

interface Props {
  patients: PatientData[];
  className?: string;
  defaultConfig?: Partial<ChartConfig>;
  onConfigChange?: (config: ChartConfig) => void;
}

const DEFAULT_CONFIG: ChartConfig = {
  view: 'line',
  period: 'monthly',
  topN: 6,
  showTrend: true,
};

// Cache simplificado para fechas
const dateCache = new Map<string, string>();

const getGroupKey = (date: Date, period: ChartPeriod): string => {
  const cacheKey = `${date.toISOString()}-${period}`;
  if (dateCache.has(cacheKey)) return dateCache.get(cacheKey)!;
  
  let result: string;
  if (period === 'quarterly') {
    result = `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
  } else if (period === 'weekly') {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    result = `${startOfWeek.getFullYear()}-W${Math.ceil(startOfWeek.getDate() / 7)}`;
  } else {
    result = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  
  if (dateCache.size > 100) dateCache.clear(); // Limpiar cache
  dateCache.set(cacheKey, result);
  return result;
};

const formatPeriodLabel = (key: string, period: ChartPeriod): string => {
  switch (period) {
    case 'quarterly': return key.split('-').reverse().join(' ');
    case 'weekly': return `Sem ${key.split('-W')[1]}`;
    case 'monthly':
    default:
      const [year, month] = key.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('es-MX', { 
        month: 'short', 
        year: '2-digit' 
      });
  }
};

const useProcessedTimelineData = (patients: PatientData[], config: ChartConfig) => {
  return useMemo(() => {
    if (!patients?.length) {
      return { timelineData: [], diagnosisMetrics: [], maxY: 10 };
    }

    const totals = new Map<string, number>();
    const grouped = new Map<string, Record<string, number>>();

    // Procesar datos en una sola pasada
    patients.forEach(p => {
      const date = p.fecha_primera_consulta ? 
        new Date(p.fecha_primera_consulta) : 
        p.fecha_registro ? new Date(p.fecha_registro) : null;
        
      if (!date || isNaN(date.getTime())) return;

      const key = getGroupKey(date, config.period);
      const diagnosis = categorizeMainDiagnosis(p.diagnostico_principal || p.diagnostico);

      if (!grouped.has(key)) {
        const baseEntry: Record<string, number> = {};
        [...MAIN_DIAGNOSES, 'Otro'].forEach(d => baseEntry[d] = 0);
        grouped.set(key, baseEntry);
      }

      grouped.get(key)![diagnosis]++;
      totals.set(diagnosis, (totals.get(diagnosis) || 0) + 1);
    });

    // Obtener top diagnósticos
    const topDiagnoses = Array.from(totals.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, config.topN)
      .map(([diag]) => diag);

    // Convertir a formato TrendChartData
    const timelineArray: TrendChartData[] = Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, counts]) => {
        const total = Object.values(counts).reduce((sum, val) => sum + val, 0);
        const dataPoint: TrendChartData = {
          date: key,
          formattedDate: formatPeriodLabel(key, config.period),
          total,
        };
        
        topDiagnoses.forEach((diag) => {
          (dataPoint as any)[diag] = counts[diag] || 0;
        });

        return dataPoint;
      });

    // Calcular métricas
    const metrics = topDiagnoses.map(diag => {
      const values = timelineArray.map(d => (d as any)[diag] || 0);
      const total = values.reduce((sum, val) => sum + val, 0);
      const growth = values.length >= 2 ? 
        ((values[values.length - 1] - values[0]) / Math.max(values[0], 1)) * 100 : 0;
      
      return { name: diag, total, growth };
    });

    const peak = Math.max(...timelineArray.map(d => d.total || 0)) * 1.1;

    return {
      timelineData: timelineArray,
      diagnosisMetrics: metrics,
      maxY: peak
    };
  }, [patients, config]);
};

const DiagnosisTimelineChart: FC<Props> = memo(({ 
  patients, 
  className,
  defaultConfig,
  onConfigChange 
}) => {
  
  const [config, setConfig] = useState<ChartConfig>({
    ...DEFAULT_CONFIG,
    ...defaultConfig,
  });

  const { renderLineChart, EmptyState } = useChartConfig({
    showLegend: true,
    showTooltip: true,
    showGrid: true,
    animation: true,
    showBrush: config.showTrend,
  });

  const updateConfig = useCallback((updates: Partial<ChartConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      onConfigChange?.(newConfig);
      return newConfig;
    });
  }, [onConfigChange]);

  const { timelineData, diagnosisMetrics } = useProcessedTimelineData(patients, config);

  if (!patients?.length) {
    return (
      <Card className={cn('shadow-lg', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Tendencia de Diagnósticos
          </CardTitle>
          <CardDescription>No hay datos disponibles</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          <EmptyState 
            message="Agregue pacientes para ver el análisis temporal"
            icon={<Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('shadow-lg hover:shadow-xl transition-shadow duration-300', className)}>
      
      <CardHeader className="bg-muted/20 border-b">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Tendencia de Diagnósticos
              </CardTitle>
              <CardDescription>
                Evolución {config.period === 'monthly' ? 'mensual' : 
                          config.period === 'quarterly' ? 'trimestral' : 'semanal'} de diagnósticos
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <Button
                size="sm"
                variant={config.view === 'line' ? 'default' : 'ghost'}
                onClick={() => updateConfig({ view: 'line' })}
                className="h-8 px-3"
              >
                <TrendingUp className="h-3.5 w-3.5 mr-1" />
                Líneas
              </Button>
              <Button
                size="sm"
                variant={config.view === 'bar' ? 'default' : 'ghost'}
                onClick={() => updateConfig({ view: 'bar' })}
                className="h-8 px-3"
              >
                <BarChart2 className="h-3.5 w-3.5 mr-1" />
                Barras
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Período</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => updateConfig({ period: 'weekly' })}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Semanal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateConfig({ period: 'monthly' })}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Mensual
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateConfig({ period: 'quarterly' })}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Trimestral
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => updateConfig({ showTrend: !config.showTrend })}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Tendencia
                  <Switch checked={config.showTrend} className="ml-auto" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        
        {diagnosisMetrics.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {diagnosisMetrics.slice(0, 4).map((metric) => (
              <div key={metric.name} className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/40 transition-colors duration-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground truncate">
                    {metric.name}
                  </span>
                </div>
                <div className="text-lg font-bold">{metric.total}</div>
                <div className={cn(
                  "text-xs flex items-center gap-1",
                  metric.growth > 0 ? "text-emerald-600" : metric.growth < 0 ? "text-red-600" : "text-muted-foreground"
                )}>
                  {metric.growth > 0 ? <TrendingUp className="h-3 w-3" /> : 
                   metric.growth < 0 ? <TrendingUp className="h-3 w-3 rotate-180" /> : null}
                  {metric.growth !== 0 ? `${Math.abs(metric.growth).toFixed(1)}%` : 'Sin cambio'}
                </div>
              </div>
            ))}
          </div>
        )}

        {renderLineChart(timelineData, false)}

      </CardContent>

      <CardFooter className="bg-muted/20 border-t">
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Total: {patients.length} pacientes
            </span>
            {timelineData.length > 0 && (
              <span className="text-muted-foreground">
                {timelineData[0]?.formattedDate} – {timelineData[timelineData.length - 1]?.formattedDate}
              </span>
            )}
          </div>
          
          {diagnosisMetrics[0] && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground">Prevalente:</span>
              <Badge variant="outline" className="text-xs">
                {diagnosisMetrics[0].name} ({diagnosisMetrics[0].total})
              </Badge>
              {diagnosisMetrics[0].growth !== 0 && (
                <Badge variant={diagnosisMetrics[0].growth > 0 ? "destructive" : "default"} className="text-xs">
                  {diagnosisMetrics[0].growth > 0 ? '↗' : '↘'} {Math.abs(diagnosisMetrics[0].growth).toFixed(1)}%
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
});

DiagnosisTimelineChart.displayName = 'DiagnosisTimelineChart';

export { DiagnosisTimelineChart };
// Final del archivo
