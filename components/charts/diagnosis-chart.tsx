/* -------------------------------------------------------------------------- */
/*  components/charts/diagnosis-chart.tsx - OPTIMIZADO                       */
/* -------------------------------------------------------------------------- */

import { memo, useMemo, FC } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Target,
  Zap,
  Info,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import useChartConfig, { 
  type DiagnosisData,
  type GeneralStats,
  titleCaseStatus,
  ABBR,
} from '@/components/charts/use-chart-config';

/* ============================================================================
 * TIPOS SIMPLIFICADOS
 * ========================================================================== */

interface Props {
  data: readonly DiagnosisData[];
  title?: string;
  description?: string;
  className?: string;
  maxCategories?: number;
  showPercentages?: boolean;
  showTrends?: boolean;
  interactive?: boolean;
  onDiagnosisSelect?: (diagnosis: DiagnosisData | null) => void;
}

/* ============================================================================
 * COMPONENTE PRINCIPAL OPTIMIZADO
 * ========================================================================== */

const DiagnosisChart: FC<Props> = memo(({
  data,
  title = 'Distribución de Diagnósticos',
  description = 'Análisis detallado por categoría médica',
  className,
  maxCategories = 8,
  showPercentages = true,
  showTrends = true,
  interactive = true,
  onDiagnosisSelect,
}) => {
  
  const { renderPieChart, EmptyState } = useChartConfig({
    showLegend: true,
    showTooltip: true,
    animation: true,
    interactive,
    showLabels: showPercentages,
  });

  // Procesar datos optimizado con useMemo único
  const { processedData, generalStats, selectedData } = useMemo(() => {
    if (!data?.length) {
      return { 
        processedData: [], 
        generalStats: {
          total: 0, attendance: 100, cancellation: 0, pending: 0, present: 0,
          completed: 0, cancelled: 0, pendingCount: 0, presentCount: 0,
          period: "Actual", allStatusCounts: {}
        },
        selectedData: null
      };
    }

    // Ordenar y limitar en una sola pasada
    const sortedData = [...data].sort((a, b) => b.cantidad - a.cantidad);
    
    let workingData = sortedData;
    if (sortedData.length > maxCategories) {
      const topItems = sortedData.slice(0, maxCategories - 1);
      const otherItems = sortedData.slice(maxCategories - 1);
      const otherSum = otherItems.reduce((sum, d) => sum + d.cantidad, 0);
      
      if (otherSum > 0) {
        workingData = [
          ...topItems,
          {
            tipo: 'Otros',
            cantidad: otherSum,
            descripcion: `Incluye ${otherItems.length} diagnósticos adicionales`
          }
        ];
      }
    }

    const total = workingData.reduce((sum, d) => sum + d.cantidad, 0);

    const stats: GeneralStats = {
      total,
      attendance: 100,
      cancellation: 0,
      pending: 0,
      present: 0,
      completed: total,
      cancelled: 0,
      pendingCount: 0,
      presentCount: 0,
      period: "Actual",
      allStatusCounts: {}
    };

    return { 
      processedData: workingData, 
      generalStats: stats,
      selectedData: null
    };
  }, [data, maxCategories]);

  if (!data?.length) {
    return (
      <Card className={cn('shadow-lg', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <EmptyState 
            message="No hay diagnósticos registrados para mostrar"
            icon={<Activity className="h-8 w-8 text-muted-foreground opacity-50" />}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('shadow-lg hover:shadow-xl transition-all duration-300 border overflow-hidden', className)}>
      
      <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Activity className="h-5 w-5 text-primary" />
              {title}
              <Badge variant="secondary" className="ml-2">
                {generalStats.total} casos
              </Badge>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Gráfico usando el hook centralizador */}
        {renderPieChart(processedData, generalStats, false)}
      </CardContent>

      <CardFooter className="bg-muted/20 border-t">
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Más frecuente:</span>
            <span className="font-medium">
              {processedData[0]?.tipo ? titleCaseStatus(processedData[0].tipo) : 'N/A'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Categorías:</span>
            <span className="font-bold">{processedData.length}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Total casos:</span>
            <span className="font-bold">{generalStats.total}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
});

DiagnosisChart.displayName = 'DiagnosisChart';

export default DiagnosisChart;