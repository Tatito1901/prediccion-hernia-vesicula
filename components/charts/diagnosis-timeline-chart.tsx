
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  HelpCircle, 
  TrendingUp, 
  TrendingDown, 
  BarChart2,
  Calendar,
  Brain,
  Target,
  ChevronDown,
  Settings
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';
import { useMemo, useState, useCallback, memo } from 'react';
import { CHART_STYLES, getChartColors, getAdaptiveBackground } from '@/components/charts/chart-theme';
import { cn } from '@/lib/utils';

/* ============================================================================
 * TIPOS OPTIMIZADOS
 * ========================================================================== */

export interface PatientData {
  id: string;
  diagnostico_principal?: string;
  fecha_primera_consulta?: string;
  fecha_registro?: string;
  gravedad?: 'leve' | 'moderada' | 'severa';
  edad?: number;
  genero?: 'M' | 'F';
}

const MAIN_DIAGNOSES = [
  'Hernia Inguinal',
  'Hernia Umbilical', 
  'Hernia Incisional',
  'Vesícula',
  'Colelitiasis',
  'Apendicitis',
  'Colecistitis',
] as const;

type MainDiagnosis = (typeof MAIN_DIAGNOSES)[number] | 'Otro';
type ChartView = 'line' | 'bar';
type ChartPeriod = 'weekly' | 'monthly' | 'quarterly';

interface ChartConfig {
  view: ChartView;
  period: ChartPeriod;
  topN: number;
  showPredictions: boolean;
  showTrend: boolean;
}

interface TimelineDataPoint {
  periodKey: string;
  periodLabel: string;
  total: number;
  trend?: number;
  prediction?: number;
  [K: string]: number | string | undefined;
}

interface DiagnosisMetrics {
  name: MainDiagnosis;
  total: number;
  growth: number;
}

interface Props {
  patients: PatientData[];
  className?: string;
  defaultConfig?: Partial<ChartConfig>;
  onConfigChange?: (config: ChartConfig) => void;
}

/* ============================================================================
 * CONSTANTES Y UTILITIES ESTÁTICAS
 * ========================================================================== */

const DEFAULT_CONFIG: ChartConfig = {
  view: 'line',
  period: 'monthly',
  topN: 6,
  showPredictions: false,
  showTrend: true,
};

const getQuarter = (d: Date): string => `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
const getMonthKey = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const getWeekKey = (d: Date): string => {
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - d.getDay());
  return `${startOfWeek.getFullYear()}-W${Math.ceil(startOfWeek.getDate() / 7)}`;
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

const classifyDiagnosis = (diagnosis?: string): MainDiagnosis => {
  if (!diagnosis) return 'Otro';
  
  const lower = diagnosis.toLowerCase();
  for (const mainDiag of MAIN_DIAGNOSES) {
    if (lower.includes(mainDiag.toLowerCase())) {
      return mainDiag;
    }
  }
  return 'Otro';
};

const calculateTrend = (data: number[]): number[] => {
  const n = data.length;
  if (n < 2) return data;
  
  const sumX = (n * (n - 1)) / 2;
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
  const sumY = data.reduce((a, b) => a + b, 0);
  const sumXY = data.reduce((sum, y, x) => sum + x * y, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return data.map((_, i) => intercept + slope * i);
};

/* ============================================================================
 * TOOLTIP OPTIMIZADO (ULTRA-SIMPLE)
 * ========================================================================== */

const OptimizedTooltip = memo(({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload as TimelineDataPoint;
  const isPrediction = data.periodKey.startsWith('pred-');

  return (
    <div className="p-3 rounded-lg shadow-lg border bg-background/95 backdrop-blur-sm text-sm">
      <div className="font-semibold mb-2 flex items-center gap-2">
        <div className={cn("h-2 w-2 rounded-full", isPrediction ? "bg-purple-500" : "bg-primary")} />
        {isPrediction ? '🔮 Predicción' : label}
      </div>
      
      <div className="space-y-1">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
            </div>
            <span className="font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
      
      {data.trend && (
        <div className="pt-2 mt-2 border-t border-border text-xs">
          <span className="text-muted-foreground">Tendencia: </span>
          <span className="font-medium">{Math.round(data.trend)}</span>
        </div>
      )}
    </div>
  );
});

OptimizedTooltip.displayName = "OptimizedTooltip";

/* ============================================================================
 * MÉTRICAS CARD OPTIMIZADO
 * ========================================================================== */

const MetricCard = memo<{
  metric: DiagnosisMetrics;
  color: string;
}>(({ metric, color }) => (
  <div className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/40 transition-colors duration-200">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-medium text-muted-foreground truncate">
        {metric.name}
      </span>
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
    </div>
    <div className="text-lg font-bold">{metric.total}</div>
    <div className={cn(
      "text-xs flex items-center gap-1",
      metric.growth > 0 ? "text-emerald-600" : metric.growth < 0 ? "text-red-600" : "text-muted-foreground"
    )}>
      {metric.growth > 0 ? <TrendingUp className="h-3 w-3" /> : 
       metric.growth < 0 ? <TrendingDown className="h-3 w-3" /> : null}
      {metric.growth !== 0 ? `${Math.abs(metric.growth).toFixed(1)}%` : 'Sin cambio'}
    </div>
  </div>
));

MetricCard.displayName = "MetricCard";

/* ============================================================================
 * HOOK DE PROCESAMIENTO OPTIMIZADO
 * ========================================================================== */

const useProcessedData = (patients: PatientData[], config: ChartConfig) => {
  return useMemo(() => {
    if (!patients?.length) {
      return { 
        timelineData: [], 
        diagnosisMetrics: [], 
        chartColors: {}, 
        maxY: 10 
      };
    }

    // Función de agrupación
    const getGroupKey = config.period === 'quarterly' ? getQuarter :
                       config.period === 'weekly' ? getWeekKey : 
                       getMonthKey;

    // Contar totales y agrupar por período
    const totals = new Map<MainDiagnosis, number>();
    const grouped = new Map<string, Record<MainDiagnosis, number>>();

    [...MAIN_DIAGNOSES, 'Otro' as const].forEach(d => totals.set(d, 0));

    patients.forEach(p => {
      const date = p.fecha_primera_consulta ? 
        new Date(p.fecha_primera_consulta) : 
        p.fecha_registro ? new Date(p.fecha_registro) : null;
        
      if (!date || isNaN(date.getTime())) return;

      const key = getGroupKey(date);
      const diagnosis = classifyDiagnosis(p.diagnostico_principal);

      if (!grouped.has(key)) {
        const baseEntry = {} as Record<MainDiagnosis, number>;
        [...MAIN_DIAGNOSES, 'Otro' as const].forEach(d => baseEntry[d] = 0);
        grouped.set(key, baseEntry);
      }

      grouped.get(key)![diagnosis] += 1;
      totals.set(diagnosis, (totals.get(diagnosis) || 0) + 1);
    });

    // Top diagnósticos
    const topDiagnoses = Array.from(totals.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, config.topN)
      .map(([diag]) => diag);

    // Timeline data
    const timelineArray: TimelineDataPoint[] = Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, counts]) => {
        const total = Object.values(counts).reduce((sum, val) => sum + val, 0);
        const dataPoint: TimelineDataPoint = {
          periodKey: key,
          periodLabel: formatPeriodLabel(key, config.period),
          total,
        };
        
        topDiagnoses.forEach(diag => {
          dataPoint[diag] = counts[diag] || 0;
        });

        return dataPoint;
      });

    // Tendencia simple
    if (config.showTrend && timelineArray.length > 2) {
      const totalValues = timelineArray.map(d => d.total);
      const trendValues = calculateTrend(totalValues);
      timelineArray.forEach((item, i) => {
        item.trend = trendValues[i];
      });
    }

    // Predicciones simples
    if (config.showPredictions && timelineArray.length >= 3) {
      const lastThree = timelineArray.slice(-3);
      const avgGrowth = lastThree.reduce((sum, item, i) => {
        if (i === 0) return sum;
        return sum + (item.total - lastThree[i-1].total);
      }, 0) / 2;
      
      for (let i = 1; i <= 2; i++) {
        const lastValue = timelineArray[timelineArray.length - 1].total;
        const predictedValue = Math.max(0, lastValue + avgGrowth * i);
        
        timelineArray.push({
          periodKey: `pred-${i}`,
          periodLabel: `Pred ${i}`,
          total: 0,
          prediction: predictedValue,
        });
      }
    }

    // Métricas de diagnósticos
    const metrics: DiagnosisMetrics[] = topDiagnoses.map(diag => {
      const values = timelineArray
        .filter(d => !d.periodKey.startsWith('pred-'))
        .map(d => (d[diag] as number) || 0);
      
      const total = values.reduce((sum, val) => sum + val, 0);
      const growth = values.length >= 2 ? 
        ((values[values.length - 1] - values[0]) / Math.max(values[0], 1)) * 100 : 0;
      
      return { name: diag, total, growth };
    });

    // Colores
    const baseColors = getChartColors('diagnosis', topDiagnoses.length);
    const colorMap = topDiagnoses.reduce((acc, diag, i) => {
      acc[diag] = baseColors[i];
      return acc;
    }, {} as Record<string, string>);

    const peak = Math.max(...timelineArray.map(d => 
      Math.max(d.total, d.prediction || 0, d.trend || 0)
    )) * 1.1;

    return {
      timelineData: timelineArray,
      diagnosisMetrics: metrics,
      chartColors: colorMap,
      maxY: peak
    };
  }, [patients, config]);
};

/* ============================================================================
 * COMPONENTE PRINCIPAL OPTIMIZADO
 * ========================================================================== */

export default function DiagnosisTimelineChart({ 
  patients, 
  className,
  defaultConfig,
  onConfigChange 
}: Props) {
  
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const [config, setConfig] = useState<ChartConfig>({
    ...DEFAULT_CONFIG,
    ...defaultConfig,
  });
  const [showHelp, setShowHelp] = useState(false);

  const updateConfig = useCallback((updates: Partial<ChartConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      onConfigChange?.(newConfig);
      return newConfig;
    });
  }, [onConfigChange]);

  const { timelineData, diagnosisMetrics, chartColors, maxY } = useProcessedData(patients, config);

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
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Agregue pacientes para ver el análisis temporal</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const Chart = config.view === 'line' ? LineChart : BarChart;
  
  return (
    <Card className={cn('shadow-lg hover:shadow-xl transition-shadow duration-300', className)}>
      
      {/* Header simplificado */}
      <CardHeader className="bg-muted/20 border-b">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Tendencia de Diagnósticos
                {config.showPredictions && (
                  <Badge variant="secondary" className="gap-1">
                    <Brain className="h-3 w-3" />
                    IA
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Evolución {config.period === 'monthly' ? 'mensual' : 
                          config.period === 'quarterly' ? 'trimestral' : 'semanal'} de diagnósticos
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Controles de Vista */}
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

            {/* Configuración */}
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
                  Semanal {config.period === 'weekly' && <Target className="h-3 w-3 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateConfig({ period: 'monthly' })}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Mensual {config.period === 'monthly' && <Target className="h-3 w-3 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateConfig({ period: 'quarterly' })}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Trimestral {config.period === 'quarterly' && <Target className="h-3 w-3 ml-auto" />}
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => updateConfig({ showPredictions: !config.showPredictions })}>
                  <Brain className="h-4 w-4 mr-2" />
                  Predicciones
                  <Switch checked={config.showPredictions} className="ml-auto" />
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => updateConfig({ showTrend: !config.showTrend })}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Tendencia
                  <Switch checked={config.showTrend} className="ml-auto" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Ayuda */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHelp(true)}
                    className="h-8 w-8 p-0"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ayuda</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        
        {/* Métricas optimizadas */}
        {diagnosisMetrics.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {diagnosisMetrics.slice(0, 4).map((metric) => (
              <MetricCard
                key={metric.name}
                metric={metric}
                color={chartColors[metric.name]}
              />
            ))}
          </div>
        )}

        {/* Gráfico principal */}
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <Chart
              data={timelineData}
              margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                strokeOpacity={0.3}
              />
              
              <XAxis
                dataKey="periodLabel"
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              
              <YAxis
                domain={[0, maxY]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              
              <RTooltip content={<OptimizedTooltip />} />
              
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                iconType="circle"
              />

              {/* Línea de referencia para predicciones */}
              {config.showPredictions && timelineData.some(d => d.prediction) && (
                <ReferenceLine 
                  x={timelineData.findIndex(d => d.periodKey.startsWith('pred-'))} 
                  stroke="#6366f1"
                  strokeDasharray="5 5"
                />
              )}

              {/* Renderizado dinámico */}
              {config.view === 'line'
                ? diagnosisMetrics.map(metric => (
                    <Line
                      key={metric.name}
                      type="monotone"
                      dataKey={metric.name}
                      stroke={chartColors[metric.name]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls={false}
                    />
                  ))
                : diagnosisMetrics.map(metric => (
                    <Bar
                      key={metric.name}
                      dataKey={metric.name}
                      fill={chartColors[metric.name]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}

              {/* Línea de tendencia */}
              {config.showTrend && config.view === 'line' && (
                <Line
                  dataKey="trend"
                  name="Tendencia"
                  stroke={isDark ? '#94a3b8' : '#64748b'}
                  strokeDasharray="8 4"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              )}

              {/* Línea de predicción */}
              {config.showPredictions && config.view === 'line' && (
                <Line
                  dataKey="prediction"
                  name="Predicción"
                  stroke="#8b5cf6"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#8b5cf6' }}
                  connectNulls
                />
              )}
            </Chart>
          </ResponsiveContainer>
        </div>
      </CardContent>

      {/* Footer simplificado */}
      <CardFooter className="bg-muted/20 border-t">
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Total: {patients.length} pacientes
            </span>
            {timelineData.length > 0 && (
              <span className="text-muted-foreground">
                {timelineData[0]?.periodLabel} – {timelineData.filter(d => !d.periodKey.startsWith('pred-')).slice(-1)[0]?.periodLabel}
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

      {/* Dialog de ayuda simplificado */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Guía de Interpretación
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">📊 Análisis Temporal</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Vista de <strong>líneas</strong> para tendencias temporales</li>
                <li>Vista de <strong>barras</strong> para comparar volúmenes</li>
                <li>Línea de <strong>tendencia</strong> muestra dirección general</li>
                <li><strong>Predicciones</strong> basadas en patrones históricos</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">🎯 Aplicaciones</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li><strong>Planificación</strong>: Anticipe demanda por especialidad</li>
                <li><strong>Recursos</strong>: Prepare equipos según tendencias</li>
                <li><strong>Análisis</strong>: Detecte cambios poblacionales</li>
              </ul>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-blue-800 dark:text-blue-200 text-xs">
                <strong>💡 Tip:</strong> Use diferentes períodos para perspectivas múltiples: 
                semanal para operaciones, mensual para táctica, trimestral para estrategia.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowHelp(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}