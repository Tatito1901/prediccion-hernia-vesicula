/* -------------------------------------------------------------------------- */
/*  components/charts/diagnosis-chart.tsx                                     */
/*  🎯 Gráfico de diagnósticos simplificado usando hook centralizador        */
/* -------------------------------------------------------------------------- */

import { memo, useMemo, useCallback, useState, FC } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Eye,
  EyeOff,
  Target,
  Zap,
  Info,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import useChartConfig, { type StatusChartData } from '@/components/charts/use-chart-config';
import { LocalDiagnosisCategory } from '@/components/charts/chart-diagnostic';
import { DiagnosisEnum } from '@/app/dashboard/data-model';

/* ============================================================================
 * TIPOS SIMPLIFICADOS
 * ========================================================================== */

export interface DiagnosisData {
  tipo: LocalDiagnosisCategory;
  cantidad: number;
  porcentaje?: number;
  tendencia?: number;
  color?: string;
  descripcion?: string;
}

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
 * FUNCIONES AUXILIARES
 * ========================================================================== */

const titleCaseStatus = (status: string): string => {
  if (status === "NO ASISTIO") return "No Asistió";
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const ABBR = (s: string, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/* ============================================================================
 * COMPONENTE PRINCIPAL SIMPLIFICADO
 * ========================================================================== */

const DiagnosisChart: FC<Props> = ({
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
  
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string | null>(null);
  const [hiddenDiagnoses, setHiddenDiagnoses] = useState<Set<string>>(new Set());

  // Usar el hook centralizador para el renderizado
  const { renderPieChart } = useChartConfig({
    showLegend: true,
    showTooltip: true,
    animation: true,
    interactive,
  });

  // Procesar datos para el formato que espera el hook
  const chartData = useMemo((): StatusChartData[] => {
    if (!data?.length) return [];

    // Manejar categorías en exceso
    let processedData = [...data].sort((a, b) => b.cantidad - a.cantidad);
    
    if (processedData.length > maxCategories) {
      const topItems = processedData.slice(0, maxCategories - 1);
      const otherItems = processedData.slice(maxCategories - 1);
      const otherSum = otherItems.reduce((sum, d) => sum + d.cantidad, 0);
      
      if (otherSum > 0) {
        processedData = [
          ...topItems,
          {
            tipo: DiagnosisEnum.OTRO,
            cantidad: otherSum,
            descripcion: `Incluye ${otherItems.length} diagnósticos adicionales`
          }
        ];
      }
    }

    const total = processedData.reduce((sum, d) => sum + d.cantidad, 0);

    return processedData
      .filter(d => !hiddenDiagnoses.has(d.tipo))
      .map((item) => ({
        name: titleCaseStatus(item.tipo),
        value: item.cantidad,
        color: item.color || `hsl(var(--chart-${Math.floor(Math.random() * 5) + 1}))`,
        percentage: total > 0 ? Math.round((item.cantidad / total) * 100) : 0,
      }));
  }, [data, maxCategories, hiddenDiagnoses]);

  const generalStats = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.cantidad, 0);
    return {
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
  }, [data]);

  const handleDiagnosisClick = useCallback((diagnosis: DiagnosisData | null) => {
    setSelectedDiagnosis(diagnosis?.tipo || null);
    onDiagnosisSelect?.(diagnosis);
  }, [onDiagnosisSelect]);

  const toggleDiagnosisVisibility = useCallback((tipo: string) => {
    setHiddenDiagnoses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tipo)) {
        newSet.delete(tipo);
      } else {
        newSet.add(tipo);
      }
      return newSet;
    });
  }, []);

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
        <CardContent className="h-[300px] flex flex-col items-center justify-center space-y-4">
          <Activity className="h-8 w-8 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground text-center">
            No hay diagnósticos registrados para mostrar
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedData = data.find(d => d.tipo === selectedDiagnosis);

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
          
          {interactive && data.length > 4 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHiddenDiagnoses(new Set())}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Mostrar Todos
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        
        {/* Controles de visibilidad */}
        {interactive && data.length > 4 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm font-medium text-muted-foreground">Mostrar/Ocultar:</span>
            {data.slice(0, maxCategories).map((item) => (
              <Button
                key={item.tipo}
                variant={hiddenDiagnoses.has(item.tipo) ? "outline" : "secondary"}
                size="sm"
                onClick={() => toggleDiagnosisVisibility(item.tipo)}
                className="h-7 px-2 text-xs gap-1"
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                {ABBR(item.tipo, 12)}
                {hiddenDiagnoses.has(item.tipo) && <EyeOff className="h-3 w-3" />}
              </Button>
            ))}
          </div>
        )}

        {/* Gráfico usando el hook centralizador */}
        {renderPieChart(chartData, generalStats, false)}

        {/* Información detallada del diagnóstico seleccionado */}
        {selectedData && (
          <div className="mt-6 p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg border animate-in slide-in-from-bottom-3 fade-in duration-300">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">{selectedData.tipo}</h4>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded bg-background border">
                  <div className="text-2xl font-bold text-primary">{selectedData.cantidad}</div>
                  <div className="text-xs text-muted-foreground">Casos Totales</div>
                </div>
                
                <div className="text-center p-3 rounded bg-background border">
                  <div className="text-2xl font-bold text-primary">
                    {selectedData.porcentaje || Math.round((selectedData.cantidad / generalStats.total) * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Del Total</div>
                </div>
                
                <div className="text-center p-3 rounded bg-background border">
                  <div className="text-2xl font-bold text-primary">
                    #{data.findIndex(d => d.tipo === selectedData.tipo) + 1}
                  </div>
                  <div className="text-xs text-muted-foreground">Ranking</div>
                </div>
                
                {showTrends && selectedData.tendencia !== undefined && (
                  <div className="text-center p-3 rounded bg-background border">
                    <div className={cn(
                      "text-2xl font-bold flex items-center justify-center gap-1",
                      selectedData.tendencia > 0 ? "text-red-500" : "text-green-500"
                    )}>
                      {selectedData.tendencia > 0 ? 
                        <TrendingUp className="h-5 w-5" /> : 
                        <TrendingDown className="h-5 w-5" />
                      }
                      {Math.abs(selectedData.tendencia).toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Tendencia</div>
                  </div>
                )}
              </div>
              
              {selectedData.descripcion && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {selectedData.descripcion}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </CardContent>

      <CardFooter className="bg-muted/20 border-t">
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Más frecuente:</span>
            <span className="font-medium">{data[0]?.tipo || 'N/A'}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Categorías:</span>
            <span className="font-bold">{chartData.length}</span>
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
};

export default memo(DiagnosisChart);