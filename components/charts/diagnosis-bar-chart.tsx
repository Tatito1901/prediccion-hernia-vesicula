/* -------------------------------------------------------------------------- */
/*  components/charts/diagnosis-bar-chart.tsx - OPTIMIZADO                   */
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
  BarChart3,
  TrendingUp,
  Target,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import useChartConfig, { 
  type DiagnosisData,
  type MotiveChartData,
  EmptyState
} from '@/components/charts/use-chart-config';

/* ============================================================================
 * TIPOS SIMPLIFICADOS
 * ========================================================================== */

interface Props {
  data: readonly DiagnosisData[];
  title?: string;
  description?: string;
  className?: string;
  showLabels?: boolean;
  sortBy?: 'cantidad' | 'alfabetico';
}

/* ============================================================================
 * COMPONENTE PRINCIPAL OPTIMIZADO
 * ========================================================================== */

const DiagnosisBarChart: FC<Props> = memo(({
  data,
  title = 'Análisis Comparativo de Frecuencias',
  description = 'Distribución de diagnósticos por cantidad',
  className,
  showLabels = false,
  sortBy = 'cantidad',
}) => {
  
  const { renderBarChart } = useChartConfig({
    showLegend: false,
    showTooltip: true,
    showGrid: true,
    animation: true,
    showLabels,
  });

  // Procesar datos con memoización optimizada
  const { chartData, stats } = useMemo(() => {
    if (!data?.length) return { 
      chartData: [], 
      stats: { total: 0, categories: 0, mostCommon: 'N/A', maxValue: 0 } 
    };

    // Clonar y ordenar solo si es necesario
    const sortedData = sortBy === 'cantidad' 
      ? [...data].sort((a, b) => b.cantidad - a.cantidad)
      : sortBy === 'alfabetico'
      ? [...data].sort((a, b) => a.tipo.localeCompare(b.tipo))
      : data;

    const total = sortedData.reduce((sum, d) => sum + d.cantidad, 0);
    const maxValue = Math.max(...sortedData.map(d => d.cantidad));
    const mostCommon = sortedData[0]?.tipo || 'N/A';

    const motiveData: MotiveChartData[] = sortedData.map((item) => ({
      motive: item.tipo,
      count: item.cantidad,
      percentage: total > 0 ? Math.round((item.cantidad / total) * 100) : 0,
    }));

    return {
      chartData: motiveData,
      stats: {
        total,
        categories: data.length,
        mostCommon,
        maxValue,
      }
    };
  }, [data, sortBy]);

  if (!data?.length) {
    return (
      <Card className={cn('shadow-lg', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <EmptyState 
            message="No hay datos disponibles para el análisis comparativo"
            icon={<BarChart3 className="h-8 w-8 text-muted-foreground opacity-50" />}
          />
        </CardContent>
      </Card>
    );
  }

  const concentration = stats.total > 0 ? Math.round((stats.maxValue / stats.total) * 100) : 0;
  const average = stats.categories > 0 ? Math.round(stats.total / stats.categories) : 0;

  return (
    <Card className={cn('shadow-lg hover:shadow-xl transition-all duration-300 border overflow-hidden', className)}>
      
      <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="h-5 w-5 text-primary" />
              {title}
              <Badge variant="secondary" className="ml-2">
                {stats.categories} categorías
              </Badge>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        
        {/* Indicadores rápidos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="text-lg font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Casos</div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="text-lg font-bold">{stats.categories}</div>
            <div className="text-xs text-muted-foreground">Categorías</div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="text-lg font-bold">{stats.maxValue}</div>
            <div className="text-xs text-muted-foreground">Valor Máximo</div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="text-lg font-bold">{concentration}%</div>
            <div className="text-xs text-muted-foreground">Concentración</div>
          </div>
        </div>

        {/* Gráfico usando el hook centralizador */}
        {renderBarChart(chartData, false)}

      </CardContent>

      <CardFooter className="bg-muted/20 border-t">
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Más frecuente:</span>
            <span className="font-medium">{stats.mostCommon}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Rango:</span>
            <span className="font-bold">1 - {stats.maxValue}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Promedio:</span>
            <span className="font-bold">{average}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
});

DiagnosisBarChart.displayName = 'DiagnosisBarChart';

export default DiagnosisBarChart;