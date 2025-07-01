/* -------------------------------------------------------------------------- */
/*  components/diagnostics/chart-diagnostic-client.tsx - OPTIMIZADO          */
/* -------------------------------------------------------------------------- */

import { FC, memo, useState, useMemo, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import {
  PieChart as PieChartIcon,
  ChartLine,
  Brain,
  Target,
  Users,
  BarChart3,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

/* ============================================================================
 * COMPONENTES DINÁMICOS OPTIMIZADOS
 * ============================================================================ */

const DiagnosisChart = dynamic(
  () => import('@/components/charts/diagnosis-chart').then(mod => ({ default: mod.default })),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
);

const DiagnosisTimelineChart = dynamic(
  () => import('@/components/charts/diagnosis-timeline-chart').then(mod => ({ default: mod.DiagnosisTimelineChart })),
  { 
    loading: () => <ChartSkeleton height="h-80" />,
    ssr: false 
  }
);

const DiagnosisBarChart = dynamic(
  () => import('@/components/charts/diagnosis-bar-chart').then(mod => ({ default: mod.default })),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
);

const DiagnosisTypeDistribution = dynamic(
  () => import('@/components/charts/diagnosis-type-distribution').then(mod => ({ default: mod.default })),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
);

/* ============================================================================
 * TIPOS SIMPLIFICADOS
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
  diversidadDiagnostica: number;
}

export interface DiagnosticInsight {
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
}

/* ============================================================================
 * COMPONENTES DE LOADING OPTIMIZADOS
 * ============================================================================ */

const ChartSkeleton: FC<{ height?: string }> = memo(({ height = "h-64" }) => (
  <Card className="p-6 shadow-none border animate-pulse">
    <div className="h-6 w-2/5 mb-4 bg-muted rounded" />
    <div className={cn("w-full rounded bg-muted", height)} />
  </Card>
));

ChartSkeleton.displayName = 'ChartSkeleton';

/* ============================================================================
 * COMPONENTE DE TARJETA DE ESTADÍSTICAS OPTIMIZADO
 * ============================================================================ */

const StatCard: FC<{
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  variant: 'blue' | 'green' | 'purple' | 'orange';
}> = memo(({ title, value, subtitle, icon, variant }) => {
  
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
 * FUNCIÓN AUXILIAR OPTIMIZADA
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
        diversidadDiagnostica: 0,
      },
      insights: []
    };
  }

  const total = patients.length;
  const diagnosisCounts = new Map<string, number>();

  // Contadores optimizados en una sola pasada
  let herniaCount = 0;
  let vesiculaCount = 0;
  let apendicitis = 0;

  patients.forEach(p => {
    const diagnosis = p.diagnostico_principal || p.diagnostico || 'Sin diagnóstico';
    diagnosisCounts.set(diagnosis, (diagnosisCounts.get(diagnosis) || 0) + 1);
    
    const lower = diagnosis.toLowerCase();
    if (lower.includes('hernia')) herniaCount++;
    if (lower.includes('vesícula') || lower.includes('colecist')) vesiculaCount++;
    if (lower.includes('apendicitis')) apendicitis++;
  });

  // Cálculos optimizados
  const porcentajeHernias = total > 0 ? (herniaCount / total) * 100 : 0;
  const porcentajeVesicula = total > 0 ? (vesiculaCount / total) * 100 : 0;
  const porcentajeApendicitis = total > 0 ? (apendicitis / total) * 100 : 0;
  const diversidad = diagnosisCounts.size > 1 ? Math.log2(diagnosisCounts.size) : 0;

  // Diagnósticos más comunes optimizado
  const diagnosticosMasComunes: ChartData[] = Array.from(diagnosisCounts.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([tipo, cantidad]) => ({
      tipo,
      cantidad,
      porcentaje: Math.round((cantidad / total) * 100),
      tendencia: 0,
    }));

  // Distribución de hernias optimizada
  const distribucionHernias: ChartData[] = Array.from(diagnosisCounts.entries())
    .filter(([tipo]) => tipo.toLowerCase().includes('hernia'))
    .sort(([,a], [,b]) => b - a)
    .map(([tipo, cantidad]) => ({
      tipo,
      cantidad,
      porcentaje: herniaCount > 0 ? Math.round((cantidad / herniaCount) * 100) : 0,
      tendencia: 0,
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
    diversidadDiagnostica: diversidad,
  };

  // Insights simplificados
  const insights: DiagnosticInsight[] = [
    {
      type: porcentajeHernias > 50 ? 'warning' : 'info',
      title: 'Prevalencia de Hernias',
      description: `Las hernias representan el ${porcentajeHernias.toFixed(1)}% de todos los diagnósticos`
    },
    {
      type: diversidad > 2 ? 'success' : 'warning',
      title: 'Diversidad Diagnóstica',
      description: `Se identificaron ${diagnosisCounts.size} tipos diferentes de diagnósticos`
    }
  ];

  return { metrics, insights };
};
export const ChartDiagnosticClient: FC<ChartDiagnosticClientProps> = memo(({
  metrics,
  timeline,
  insights,
  lastUpdated,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'distribution' | 'timeline' | 'analysis'>('distribution');

  // Callback memoizado para cambio de tab
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as typeof activeTab);
  }, []);

  if (isLoading) {
    return <DiagnosticLoadingSkeleton />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Diagnósticos</CardTitle>
          <CardDescription>Basado en {metrics.totalPacientes} pacientes. Última act: {lastUpdated}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="distribution">Distribución</TabsTrigger>
              <TabsTrigger value="timeline">Tendencias</TabsTrigger>
              <TabsTrigger value="analysis">Análisis</TabsTrigger>
            </TabsList>

            <TabsContent value="distribution" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="Total Pacientes"
                  value={metrics.totalPacientes.toString()}
                  icon={Users}
                />
                <MetricCard
                  title="Casos de Hernia"
                  value={`${metrics.totalHernias} (${metrics.porcentajeHernias.toFixed(0)}%)`}
                  icon={Target}
                />
                <MetricCard
                  title="Índice de Diversidad"
                  value={metrics.diversidadDiagnostica.toFixed(1)}
                  icon={BarChart3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ChartWrapper title="Distribución de Diagnósticos">
                  <CommonDiagnosesChart data={metrics.diagnosticosMasComunes} />
                </ChartWrapper>
                <ChartWrapper title="Distribución de Hernias">
                  <HerniaDistributionChart data={metrics.distribucionHernias} />
                </ChartWrapper>
              </div>
            </TabsContent>
            
            <TabsContent value="timeline" className="space-y-4">
              <ChartWrapper title="Tendencia Temporal">
                <TimelineChart data={timeline} />
              </ChartWrapper>
            </TabsContent>
            
            <TabsContent value="analysis" className="space-y-4">
              <div className="grid gap-4">
                {insights.map((insight, index) => (
                  <InsightCard key={index} insight={insight} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Footer optimizado */}
      <div className="text-right">
        <p className="text-xs text-muted-foreground">
          Última actualización: {lastUpdated}
        </p>
      </div>
    </>
  );
});

ChartDiagnosticClient.displayName = 'ChartDiagnosticClient';

export default ChartDiagnosticClient;