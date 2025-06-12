/* -------------------------------------------------------------------------- */
/*  components/diagnostics/chart-diagnostic-client.tsx                       */
/*  🎯 Componente cliente principal simplificado y optimizado               */
/* -------------------------------------------------------------------------- */

import { FC, memo, useState, useMemo, useCallback, Suspense } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DiagnosisEnum } from '@/app/dashboard/data-model';

/* ============================================================================
 * COMPONENTES DINÁMICOS SIMPLIFICADOS
 * ============================================================================ */

// Componentes principales usando lazy loading
const DiagnosisChart = dynamic(
  () => import('@/components/charts/diagnosis-chart'),
  { 
    loading: () => <OptimizedChartSkeleton />,
    ssr: false 
  }
);

const DiagnosisTimelineChart = dynamic(
  () => import('@/components/charts/diagnosis-timeline-chart'),
  { 
    loading: () => <OptimizedChartSkeleton height="h-80" />,
    ssr: false 
  }
);

const DiagnosisBarChart = dynamic(
  () => import('@/components/charts/diagnosis-bar-chart'),
  { 
    loading: () => <OptimizedChartSkeleton />,
    ssr: false 
  }
);

const DiagnosisTypeDistribution = dynamic(
  () => import('@/components/charts/diagnosis-type-distribution'),
  { 
    loading: () => <OptimizedChartSkeleton />,
    ssr: false 
  }
);

/* ============================================================================
 * TIPOS Y INTERFACES SIMPLIFICADAS
 * ============================================================================ */

export interface PatientData {
  id: string;
  diagnostico?: string;
  diagnostico_principal?: string;
  fecha_registro?: string;
  fecha_primera_consulta?: string;
  edad?: number;
  genero?: 'M' | 'F';
}

export interface ChartData {
  tipo: string;
  cantidad: number;
  porcentaje?: number;
  tendencia?: number;
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
  insights: DiagnosticInsight[];
}

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
 * COMPONENTE DE TARJETA DE ESTADÍSTICAS SIMPLIFICADO
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
  variant: 'blue' | 'green' | 'purple' | 'orange';
  trend?: number;
}> = memo(({ title, value, subtitle, icon, variant, trend }) => {
  
  const variantStyles = {
    blue: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    green: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    purple: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
    orange: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
  };
  
  return (
    <Card className={cn(
      'border-l-4 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]',
      variantStyles[variant]
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

/* ============================================================================
 * FUNCIONES AUXILIARES SIMPLIFICADAS
 * ============================================================================ */

const processPatientData = (patients: PatientData[]): { metrics: Metrics; insights: DiagnosticInsight[] } => {
  if (!patients?.length) {
    return {
      metrics: {
        totalPacientes: 0,
        totalHernias: 0,
        totalVesicula: 0,
        totalApendicitis: 0,
        diagnosticosMasComunes: [],
        distribucionHernias: [],
        porcentajeHernias: 0,
        porcentajeVesicula: 0,
        porcentajeApendicitis: 0,
        ratioHerniaVesicula: 0,
        diversidadDiagnostica: 0,
        tendenciaGeneral: 0,
      },
      insights: []
    };
  }

  const total = patients.length;
  const diagnosisCounts = new Map<string, number>();

  // Contar diagnósticos
  patients.forEach(p => {
    const diagnosis = p.diagnostico_principal || p.diagnostico || 'Sin diagnóstico';
    diagnosisCounts.set(diagnosis, (diagnosisCounts.get(diagnosis) || 0) + 1);
  });

  // Categorizar diagnósticos
  let herniaCount = 0;
  let vesiculaCount = 0;
  let apendicitis = 0;

  diagnosisCounts.forEach((count, diagnosis) => {
    const lower = diagnosis.toLowerCase();
    if (lower.includes('hernia')) herniaCount += count;
    if (lower.includes('vesícula') || lower.includes('colecist')) vesiculaCount += count;
    if (lower.includes('apendicitis')) apendicitis += count;
  });

  // Calcular métricas
  const porcentajeHernias = total > 0 ? (herniaCount / total) * 100 : 0;
  const porcentajeVesicula = total > 0 ? (vesiculaCount / total) * 100 : 0;
  const porcentajeApendicitis = total > 0 ? (apendicitis / total) * 100 : 0;
  const ratioHerniaVesicula = vesiculaCount > 0 ? herniaCount / vesiculaCount : herniaCount;
  
  // Diversidad (Shannon Index simplificado)
  const diversidad = diagnosisCounts.size > 1 ? Math.log2(diagnosisCounts.size) : 0;

  // Diagnósticos más comunes
  const diagnosticosMasComunes: ChartData[] = Array.from(diagnosisCounts.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([tipo, cantidad]) => ({
      tipo,
      cantidad,
      porcentaje: Math.round((cantidad / total) * 100),
      tendencia: Math.random() * 10 - 5, // Simulado
    }));

  // Distribución de hernias
  const distribucionHernias: ChartData[] = Array.from(diagnosisCounts.entries())
    .filter(([tipo]) => tipo.toLowerCase().includes('hernia'))
    .sort(([,a], [,b]) => b - a)
    .map(([tipo, cantidad]) => ({
      tipo,
      cantidad,
      porcentaje: herniaCount > 0 ? Math.round((cantidad / herniaCount) * 100) : 0,
      tendencia: Math.random() * 10 - 5, // Simulado
    }));

  const metrics: Metrics = {
    totalPacientes: total,
    totalHernias: herniaCount,
    totalVesicula: vesiculaCount,
    totalApendicitis: apendicitis,
    diagnosticosMasComunes,
    distribucionHernias,
    porcentajeHernias,
    porcentajeVesicula,
    porcentajeApendicitis,
    ratioHerniaVesicula,
    diversidadDiagnostica: diversidad,
    tendenciaGeneral: Math.random() * 10 - 5, // Simulado
  };

  // Generar insights
  const insights: DiagnosticInsight[] = [
    {
      type: porcentajeHernias > 50 ? 'warning' : 'info',
      title: 'Prevalencia de Hernias',
      description: `Las hernias representan el ${porcentajeHernias.toFixed(1)}% de todos los diagnósticos`,
      metric: porcentajeHernias,
      trend: 'up'
    },
    {
      type: diversidad > 2 ? 'success' : 'warning',
      title: 'Diversidad Diagnóstica',
      description: `Se identificaron ${diagnosisCounts.size} tipos diferentes de diagnósticos`,
      metric: diversidad,
      trend: 'stable'
    }
  ];

  return { metrics, insights };
};

/* ============================================================================
 * COMPONENTE CLIENTE PRINCIPAL SIMPLIFICADO
 * ============================================================================ */

interface ChartDiagnosticClientProps {
  initialPatientsData: PatientData[];
  lastUpdated: string;
}

export const ChartDiagnosticClient: FC<ChartDiagnosticClientProps> = memo(({
  initialPatientsData,
  lastUpdated,
}) => {
  
  const [activeTab, setActiveTab] = useState<'distribution' | 'timeline' | 'analysis'>('distribution');
  const [error, setError] = useState<string | null>(null);

  const handleTabChange = useCallback((value: string) => {
    if (value === 'distribution' || value === 'timeline' || value === 'analysis') {
      setActiveTab(value);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
  }, []);

  // Procesamiento de datos memoizado
  const { metrics, insights } = useMemo(() => 
    processPatientData(initialPatientsData), 
    [initialPatientsData]
  );

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

  if (error) {
    return <ErrorState message={error} onRetry={handleRetry} />;
  }

  return (
    <div className="space-y-6">
      {/* Insights */}
      {insights.length > 0 && (
        <div className="grid gap-3">
          {insights.slice(0, 2).map((insight, index) => (
            <Alert key={`${insight.type}-${index}`} className="border-l-4 border-l-blue-500">
              <Brain className="h-4 w-4" />
              <AlertDescription>
                <strong>{insight.title}:</strong> {insight.description}
              </AlertDescription>
            </Alert>
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
              <DiagnosisChart
                data={metrics.diagnosticosMasComunes}
                title="Distribución General"
                description="Todos los diagnósticos por frecuencia"
              />
            </Suspense>

            {metrics.distribucionHernias.length > 0 && (
              <Suspense fallback={<OptimizedChartSkeleton />}>
                <DiagnosisTypeDistribution 
                  patients={initialPatientsData}
                />
              </Suspense>
            )}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Suspense fallback={<OptimizedChartSkeleton height="h-80" />}>
            <DiagnosisTimelineChart patients={initialPatientsData} />
          </Suspense>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Suspense fallback={<OptimizedChartSkeleton />}>
            <DiagnosisBarChart
              data={metrics.diagnosticosMasComunes}
              title="Análisis Comparativo de Frecuencias"
            />
          </Suspense>
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

export default ChartDiagnosticClient;