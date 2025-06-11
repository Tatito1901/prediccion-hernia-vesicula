// components/diagnostics/chart-diagnostic-client.tsx

import type { FC } from 'react';
import { memo, useState, useMemo, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import {
  PieChart as PieChartIcon,
  ChartLine,
  Brain,
  Target,
  Users,
  TrendingUp,
  AlertTriangle,
  Award,
  RefreshCw,
  BarChart3,
  TrendingDown,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DiagnosisEnum } from '@/app/dashboard/data-model';

/* ============================================================================
 * TIPOS Y INTERFACES ESPECIALIZADAS
 * ========================================================================== */

export interface PatientData {
  id: string;
  diagnostico?: DiagnosisType | string;
  diagnostico_principal?: DiagnosisType | string;
  fecha_registro?: string;
  fecha_primera_consulta?: string;
  edad?: number;
  genero?: 'M' | 'F';
}

// Represents all specific diagnoses from the enum, excluding the generic "OTRO"
export type DiagnosisType = Exclude<`${DiagnosisEnum}`, typeof DiagnosisEnum.OTRO>;

// Represents a category for charting or local logic, which can be a specific diagnosis or "OTRO"
export type LocalDiagnosisCategory = DiagnosisType | typeof DiagnosisEnum.OTRO;

export interface ChartData {
  tipo: LocalDiagnosisCategory;
  cantidad: number;
  porcentaje?: number;
  tendencia?: number;
}

export interface TimelineData {
  date: string;
  cantidad: number;
  formattedDate: string;
}

export interface Metrics {
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
  tendenciaGeneral: number;
}

export interface DiagnosticInsight {
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
  metric?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface MetricsResult {
  metrics: Metrics;
  timeline: TimelineData[];
  insights: DiagnosticInsight[];
}

/* ============================================================================
 * CONSTANTES DE ESTILOS OPTIMIZADAS
 * ============================================================================ */

const CARD_VARIANTS = {
  blue: {
    border: 'border-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-600',
    trend: {
      up: 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/50',
      down: 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/50'
    }
  },
  green: {
    border: 'border-green-500',
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-600'
  },
  purple: {
    border: 'border-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    icon: 'text-purple-600'
  },
  orange: {
    border: 'border-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    icon: 'text-orange-600'
  }
} as const;

const ALERT_VARIANTS = {
  warning: {
    border: 'border-l-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-950/20',
    text: 'text-yellow-800 dark:text-yellow-300',
    icon: AlertTriangle,
    iconColor: 'text-yellow-600'
  },
  success: {
    border: 'border-l-green-500',
    bg: 'bg-green-50 dark:bg-green-950/20',
    text: 'text-green-800 dark:text-green-300',
    icon: Award,
    iconColor: 'text-green-600'
  },
  info: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    text: 'text-blue-800 dark:text-blue-300',
    icon: Brain,
    iconColor: 'text-blue-600'
  }
} as const;

/* ============================================================================
 * COMPONENTES DE GRÁFICOS OPTIMIZADOS
 * ============================================================================ */

// Preload crítico - sin lazy loading para el gráfico principal
const DiagnosisChart = dynamic(
  () => import('@/components/charts/diagnosis-chart').then(mod => mod.default),
  { 
    loading: () => <OptimizedChartSkeleton />,
    ssr: false 
  }
);

// Lazy loading para gráficos secundarios
const DiagnosisTimelineChart = dynamic(
  () => import('@/components/charts/diagnosis-timeline-chart').then(mod => mod.default),
  { 
    loading: () => <OptimizedChartSkeleton height="h-80" />,
    ssr: false 
  }
);

const DiagnosisBarChart = dynamic(
  () => import('@/components/charts/diagnosis-bar-chart').then(mod => mod.default),
  { 
    loading: () => <OptimizedChartSkeleton />,
    ssr: false 
  }
);

const DiagnosisTypeDistribution = dynamic(
  () => import('@/components/charts/diagnosis-type-distribution').then(mod => mod.default),
  { 
    loading: () => <OptimizedChartSkeleton />,
    ssr: false 
  }
);

/* ============================================================================
 * COMPONENTES DE LOADING OPTIMIZADOS
 * ============================================================================ */

const OptimizedChartSkeleton: FC<{ height?: string }> = memo(({ height = "h-64" }) => (
  <Card className="p-6 shadow-none border animate-pulse">
    <div className="h-6 w-2/5 mb-4 bg-muted rounded" />
    <div className={cn("w-full rounded bg-muted", height)} />
  </Card>
));
OptimizedChartSkeleton.displayName = 'OptimizedChartSkeleton';

const StatCardSkeleton: FC = memo(() => (
  <Card className="p-6 border-l-4 border-transparent animate-pulse">
    <div className="h-4 w-20 mb-2 bg-muted rounded" />
    <div className="h-8 w-16 mb-1 bg-muted rounded" />
    <div className="h-3 w-32 bg-muted rounded" />
  </Card>
));
StatCardSkeleton.displayName = 'StatCardSkeleton';

export const DiagnosticSkeleton: FC = memo(() => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)}
    </div>
    
    <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
    
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <OptimizedChartSkeleton />
        <OptimizedChartSkeleton />
      </div>
    </div>
  </div>
));
DiagnosticSkeleton.displayName = 'DiagnosticSkeleton';

const ErrorState: FC<{ message: string; onRetry?: () => void }> = memo(({ message, onRetry }) => (
  <Card className="p-8 text-center border-destructive">
    <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
    <h3 className="text-lg font-semibold mb-2 text-destructive">Error</h3>
    <p className="text-muted-foreground mb-4">{message}</p>
    {onRetry && (
      <Button onClick={onRetry} variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Reintentar
      </Button>
    )}
  </Card>
));
ErrorState.displayName = 'ErrorState';

/* ============================================================================
 * COMPONENTES AUXILIARES OPTIMIZADOS
 * ============================================================================ */

const TrendIndicator: FC<{ trend: number }> = memo(({ trend }) => {
  if (trend === 0) return null;
  
  const isPositive = trend > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  
  return (
    <span className={cn(
      "text-xs font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded-full",
      isPositive 
        ? "text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/50" 
        : "text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/50"
    )}>
      <Icon className="h-3 w-3" />
      {Math.abs(trend).toFixed(1)}%
    </span>
  );
});
TrendIndicator.displayName = 'TrendIndicator';

const StatCard: FC<{
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  variant: keyof typeof CARD_VARIANTS;
  trend?: number;
}> = memo(({ title, value, subtitle, icon, variant, trend }) => {
  const styles = CARD_VARIANTS[variant];
  
  return (
    <Card className={cn(
      'border-l-4 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]',
      styles.border,
      styles.bg
    )}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">
                {value}
              </span>
              {trend !== undefined && <TrendIndicator trend={trend} />}
            </div>
            <p className="text-xs text-muted-foreground">
              {subtitle}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-background/60 dark:bg-card shrink-0">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
StatCard.displayName = 'StatCard';

const InsightAlert: FC<{ insight: DiagnosticInsight }> = memo(({ insight }) => {
  const config = ALERT_VARIANTS[insight.type];
  const IconComponent = config.icon;
  
  return (
    <Alert className={cn("border-l-4", config.border, config.bg, config.text)}>
      <div className="flex items-start gap-3">
        <IconComponent className={cn("h-4 w-4 mt-0.5", config.iconColor)} />
        <div className="flex-1">
          <p className="font-semibold text-sm">{insight.title}</p>
          <AlertDescription className="text-xs mt-1 text-inherit">
            {insight.description}
          </AlertDescription>
        </div>
        {insight.metric !== undefined && (
          <div className="text-right shrink-0">
            <div className="font-bold text-lg">{insight.metric}</div>
            {insight.trend && (
              <div className={cn(
                "text-xs flex items-center gap-1 justify-end",
                insight.trend === 'up' ? "text-red-500" : "text-green-500"
              )}>
                {insight.trend === 'up' ?
                  <TrendingUp className="h-3 w-3" /> :
                  <TrendingDown className="h-3 w-3" />}
              </div>
            )}
          </div>
        )}
      </div>
    </Alert>
  );
});
InsightAlert.displayName = 'InsightAlert';

/* ============================================================================
 * PROPS DEL COMPONENTE CLIENTE
 * ============================================================================ */
interface ChartDiagnosticClientProps {
  initialMetricsResult: MetricsResult;
  initialPatientsData: PatientData[];
  lastUpdated: string;
}

/* ============================================================================
 * COMPONENTE CLIENTE PRINCIPAL OPTIMIZADO
 * ============================================================================ */

export const ChartDiagnosticClient: FC<ChartDiagnosticClientProps> = memo(({
  initialMetricsResult,
  initialPatientsData,
  lastUpdated,
}) => {
  /* ============================== ESTADO OPTIMIZADO ============================== */
  const [activeTab, setActiveTab] = useState<'distribution' | 'timeline' | 'analysis'>('distribution');
  const [error, setError] = useState<string | null>(null);

  const { metrics, insights } = initialMetricsResult;

  /* ======================= CALLBACKS OPTIMIZADOS ======================= */
  const handleTabChange = useCallback((value: string) => {
    if (value === 'distribution' || value === 'timeline' || value === 'analysis') {
      setActiveTab(value);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
  }, []);

  /* ======================= DATOS MEMOIZADOS ======================= */
  const statCardsData = useMemo(() => [
    {
      title: 'Total Pacientes',
      value: metrics.totalPacientes,
      subtitle: 'Casos analizados',
      icon: <Users className="h-5 w-5" />,
      variant: 'blue' as const,
      trend: metrics.tendenciaGeneral,
    },
    {
      title: 'Casos de Hernia',
      value: metrics.totalHernias,
      subtitle: `${metrics.porcentajeHernias.toFixed(0)}% del total`,
      icon: <Target className="h-5 w-5" />,
      variant: 'green' as const,
    },
    {
      title: 'Vesícula/Colecistitis',
      value: metrics.totalVesicula,
      subtitle: `${metrics.porcentajeVesicula.toFixed(0)}% del total`,
      icon: <PieChartIcon className="h-5 w-5" />,
      variant: 'purple' as const,
    },
    {
      title: 'Diversidad Diagnóstica',
      value: metrics.diversidadDiagnostica.toFixed(1),
      subtitle: 'Índice Shannon',
      icon: <ChartLine className="h-5 w-5" />,
      variant: 'orange' as const,
    },
  ], [metrics]);

  const specialtyProportions = useMemo(() => [
    { label: 'Hernias', value: metrics.porcentajeHernias, color: 'bg-blue-500' },
    { label: 'Vesícula/Colecistitis', value: metrics.porcentajeVesicula, color: 'bg-green-500' },
    { label: 'Apendicitis', value: metrics.porcentajeApendicitis, color: 'bg-red-500' },
    {
      label: 'Otros',
      value: Math.max(0, 100 - metrics.porcentajeHernias - metrics.porcentajeVesicula - metrics.porcentajeApendicitis),
      color: 'bg-gray-500'
    },
  ], [metrics.porcentajeHernias, metrics.porcentajeVesicula, metrics.porcentajeApendicitis]);

  /* ========================== MANEJO DE ERRORES ========================== */
  if (error) {
    return <ErrorState message={error} onRetry={handleRetry} />;
  }

  /* ========================== RENDERIZADO OPTIMIZADO ========================== */
  return (
    <div className="space-y-6">
      {/* Insights */}
      {insights.length > 0 && (
        <div className="grid gap-3">
          {insights.slice(0, 2).map((insight, index) => (
            <InsightAlert key={`${insight.type}-${index}`} insight={insight} />
          ))}
        </div>
      )}

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCardsData.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Tabs de Contenido */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/60 dark:bg-muted/30">
          <TabsTrigger value="distribution" className="gap-2 data-[state=active]:bg-background">
            <PieChartIcon className="h-4 w-4" />
            Distribución
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2 data-[state=active]:bg-background">
            <ChartLine className="h-4 w-4" />
            Tendencias
          </TabsTrigger>
          <TabsTrigger value="analysis" className="gap-2 data-[state=active]:bg-background">
            <BarChart3 className="h-4 w-4" />
            Análisis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Suspense fallback={<OptimizedChartSkeleton />}>
              <Card className="flex flex-col h-full overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Distribución General</CardTitle>
                  <CardDescription>Todos los diagnósticos por frecuencia</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 min-h-[350px] p-4">
                  <DiagnosisChart
                    data={metrics.diagnosticosMasComunes}
                    title=""
                    description=""
                    className="h-full"
                  />
                </CardContent>
              </Card>
            </Suspense>

            {metrics.distribucionHernias.length > 0 && (
              <Suspense fallback={<OptimizedChartSkeleton />}>
                <Card className="flex flex-col h-full overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Distribución de Hernias</CardTitle>
                    <CardDescription>Tipos específicos de hernias por frecuencia</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-[350px] p-4">
                    <DiagnosisTypeDistribution 
                      patients={initialPatientsData}
                      className="h-full"
                    />
                  </CardContent>
                </Card>
              </Suspense>
            )}
          </div>

          {/* Proporciones por Especialidad */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Proporciones por Especialidad</CardTitle>
              <CardDescription>
                Distribución porcentual de los principales grupos diagnósticos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {specialtyProportions.map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", item.color)} />
                      {item.label}
                    </span>
                    <span>{item.value.toFixed(1)}%</span>
                  </div>
                  <Progress value={item.value} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Suspense fallback={<OptimizedChartSkeleton height="h-80" />}>
            <DiagnosisTimelineChart patients={initialPatientsData} />
          </Suspense>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid gap-6">
            <Suspense fallback={<OptimizedChartSkeleton />}>
              <DiagnosisBarChart
                data={metrics.diagnosticosMasComunes}
                title="Análisis Comparativo de Frecuencias"
              />
            </Suspense>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Proporciones de Especialidad */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Proporciones de Especialidad</CardTitle>
                  <CardDescription>
                    Distribución porcentual entre hernias, vesícula y apendicitis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {specialtyProportions.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={item.value} className={cn("h-2 w-24", item.color)} />
                        <span className="text-xs font-semibold w-10 text-right">
                          {item.value.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Métricas Avanzadas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Métricas Avanzadas</CardTitle>
                  <CardDescription>
                    Indicadores especializados para optimización
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-muted-foreground">Ratio Hernia:Vesícula</span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {metrics.ratioHerniaVesicula.toFixed(1)}:1
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-muted-foreground">Índice de Diversidad</span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {metrics.diversidadDiagnostica.toFixed(2)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-muted-foreground">Especialización</span>
                      <Badge variant="secondary" className="text-xs">
                        {metrics.diversidadDiagnostica < 2 ? 'Alta' :
                         metrics.diversidadDiagnostica < 3 ? 'Media' : 'Baja'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-right">
        <p className="text-xs text-muted-foreground">
          Última actualización: {lastUpdated}
        </p>
      </div>
    </div>
  );
});

ChartDiagnosticClient.displayName = 'ChartDiagnosticClient';

// Export the component as default for dynamic import to work correctly
export default ChartDiagnosticClient;