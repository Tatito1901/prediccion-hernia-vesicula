/* -------------------------------------------------------------------------- */
/*  components/charts/diagnosis-bar-chart.tsx                                */
/*  🎯 Gráfico de barras simplificado usando hook centralizador             */
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
import useChartConfig, { type MotiveChartData } from '@/components/charts/use-chart-config';

/* ============================================================================
 * TIPOS SIMPLIFICADOS
 * ========================================================================== */

export interface DiagnosisDataInput {
  tipo: string;
  cantidad: number;
  porcentaje?: number;
  tendencia?: number;
  descripcion?: string;
}

interface Props {
  data: readonly DiagnosisDataInput[];
  title?: string;
  description?: string;
  className?: string;
  showLabels?: boolean;
  sortBy?: 'cantidad' | 'alfabetico';
}

/* ============================================================================
 * COMPONENTE PRINCIPAL SIMPLIFICADO
 * ========================================================================== */

const DiagnosisBarChart: FC<Props> = ({
  data,
  title = 'Análisis Comparativo de Frecuencias',
  description = 'Distribución de diagnósticos por cantidad',
  className,
  showLabels = false,
  sortBy = 'cantidad',
}) => {
  
  // Usar el hook centralizador para el renderizado
  const { renderBarChart } = useChartConfig({
    showLegend: false,
    showTooltip: true,
    showGrid: true,
    animation: true,
    showLabels,
  });

  // Procesar datos para el formato que espera el hook
  const chartData = useMemo((): MotiveChartData[] => {
    if (!data?.length) return [];

    let sortedData = [...data];
    
    switch (sortBy) {
      case 'cantidad':
        sortedData.sort((a, b) => b.cantidad - a.cantidad);
        break;
      case 'alfabetico':
        sortedData.sort((a, b) => a.tipo.localeCompare(b.tipo));
        break;
    }

    const total = sortedData.reduce((sum, d) => sum + d.cantidad, 0);

    return sortedData.map((item) => ({
      motive: item.tipo,
      count: item.cantidad,
      percentage: total > 0 ? Math.round((item.cantidad / total) * 100) : 0,
    }));
  }, [data, sortBy]);

  const stats = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.cantidad, 0);
    const maxValue = Math.max(...data.map(d => d.cantidad));
    const mostCommon = data.find(d => d.cantidad === maxValue);
    
    return {
      total,
      categories: data.length,
      mostCommon: mostCommon?.tipo || 'N/A',
      maxValue,
    };
  }, [data]);

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
        <CardContent className="h-[300px] flex flex-col items-center justify-center space-y-4">
          <BarChart3 className="h-8 w-8 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground text-center">
            No hay datos disponibles para el análisis comparativo
          </p>
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
            <div className="text-lg font-bold">
              {stats.total > 0 ? Math.round((stats.maxValue / stats.total) * 100) : 0}%
            </div>
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
            <span className="font-bold">
              {stats.categories > 0 ? Math.round(stats.total / stats.categories) : 0}
            </span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default memo(DiagnosisBarChart);