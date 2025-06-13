/* -------------------------------------------------------------------------- */
/*  components/charts/diagnosis-pie-chart.tsx                                */
/*  🎯 Gráfico de pie simplificado usando hook centralizador                */
/* -------------------------------------------------------------------------- */

import { memo, useMemo, useCallback, useState, FC } from 'react';
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
  Eye,
  EyeOff,
  Target,
  Settings,
  Download,
  Maximize2,
  Info,
  TrendingUp,
  TrendingDown,
  ChevronDown,
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';
import useChartConfig, { 
  type DiagnosisData,
  type GeneralStats,
  getMedicalCategory,
  ABBR,
  titleCaseStatus 
} from '@/components/charts/use-chart-config';

/* ============================================================================
 * TIPOS SIMPLIFICADOS
 * ========================================================================== */

interface ChartConfig {
  showPercentages: boolean;
  showLabels: boolean;
  innerRadius: number;
  outerRadius: number;
  colorScheme: 'medical' | 'diagnosis' | 'patients' | 'trends' | 'comparison';
  sortBy: 'valor' | 'alfabetico';
  maxCategories: number;
}

interface Props {
  data: readonly DiagnosisData[];
  title?: string;
  description?: string;
  className?: string;
  maxCategories?: number;
  interactive?: boolean;
  showControls?: boolean;
  showStats?: boolean;
  onSegmentClick?: (segment: DiagnosisData) => void;
  onExport?: (format: 'png' | 'svg' | 'json') => void;
}

/* ============================================================================
 * CONFIGURACIÓN POR DEFECTO
 * ========================================================================== */

const DEFAULT_CONFIG: ChartConfig = {
  showPercentages: true,
  showLabels: true,
  innerRadius: 60,
  outerRadius: 85,
  colorScheme: 'diagnosis',
  sortBy: 'valor',
  maxCategories: 8,
};

/* ============================================================================
 * COMPONENTE PRINCIPAL SIMPLIFICADO
 * ============================================================================ */

const DiagnosisPieChart: FC<Props> = ({
  data,
  title = "Distribución de Diagnósticos",
  description = "Análisis detallado con métricas avanzadas",
  className,
  maxCategories = 8,
  interactive = true,
  showControls = true,
  showStats = true,
  onSegmentClick,
  onExport,
}) => {
  
  /* ============================== ESTADO =============================== */
  
  const [config, setConfig] = useState<ChartConfig>({
    ...DEFAULT_CONFIG,
    maxCategories,
  });
  
  const [hiddenSegments, setHiddenSegments] = useState<Set<string>>(new Set());
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  // Usar el hook centralizador para renderizado
  const { renderPieChart, LoadingSpinner, EmptyState } = useChartConfig({
    showLegend: true,
    showTooltip: true,
    animation: true,
    interactive,
    innerRadius: config.innerRadius,
    outerRadius: config.outerRadius,
    showLabels: config.showLabels,
    colorScheme: config.colorScheme,
  });

  /* ======================== PROCESAMIENTO DE DATOS ====================== */
  
  const { processedData, chartStats, visibleData } = useMemo(() => {
    if (!data?.length) {
      return { 
        processedData: [], 
        chartStats: { total: 0, attendance: 100, cancellation: 0, pending: 0, present: 0, completed: 0, cancelled: 0, pendingCount: 0, presentCount: 0, period: "Actual", allStatusCounts: {} },
        visibleData: []
      };
    }

    // Ordenar datos según configuración
    let sortedData = [...data];
    switch (config.sortBy) {
      case 'valor':
        sortedData.sort((a, b) => b.cantidad - a.cantidad);
        break;
      case 'alfabetico':
        sortedData.sort((a, b) => a.tipo.localeCompare(b.tipo));
        break;
    }

    const total = sortedData.reduce((sum, d) => sum + d.cantidad, 0);

    // Manejar categorías en exceso
    let finalData = sortedData;
    if (sortedData.length > config.maxCategories) {
      const topItems = sortedData.slice(0, config.maxCategories - 1);
      const otherItems = sortedData.slice(config.maxCategories - 1);
      const otherSum = otherItems.reduce((sum, d) => sum + d.cantidad, 0);
      
      if (otherSum > 0) {
        finalData = [
          ...topItems,
          {
            tipo: 'Otros diagnósticos',
            cantidad: otherSum,
            descripcion: `Incluye ${otherItems.length} diagnósticos adicionales`,
            categoria: 'Varios'
          }
        ];
      }
    }

    // Procesar datos con metadatos médicos
    const processed = finalData.map((item, index) => {
      const medicalInfo = getMedicalCategory(item.tipo);
      const porcentaje = total > 0 ? Math.round((item.cantidad / total) * 100) : 0;
      
      return {
        ...item,
        porcentaje,
        categoria: item.categoria || medicalInfo.categoria,
        isVisible: !hiddenSegments.has(item.tipo),
        rank: index + 1,
      };
    });

    // Datos visibles para el gráfico
    const visible = processed.filter(d => d.isVisible);

    // Estadísticas para el hook
    const stats: GeneralStats = {
      total: visible.reduce((sum, d) => sum + d.cantidad, 0),
      attendance: 100,
      cancellation: 0,
      pending: 0,
      present: 0,
      completed: visible.reduce((sum, d) => sum + d.cantidad, 0),
      cancelled: 0,
      pendingCount: 0,
      presentCount: 0,
      period: "Actual",
      allStatusCounts: {}
    };

    return {
      processedData: processed,
      chartStats: stats,
      visibleData: visible
    };
  }, [data, config, hiddenSegments]);

  /* ======================= MANEJADORES DE EVENTOS ======================= */
  
  const updateConfig = useCallback((updates: Partial<ChartConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSegmentClick = useCallback((payload: any) => {
    if (!interactive) return;
    
    const segmentData = processedData.find(d => d.tipo === payload.name);
    if (segmentData) {
      const newSelected = selectedSegment === segmentData.tipo ? null : segmentData.tipo;
      setSelectedSegment(newSelected);
      onSegmentClick?.(segmentData);
    }
  }, [interactive, selectedSegment, onSegmentClick, processedData]);

  const toggleSegmentVisibility = useCallback((tipo: string) => {
    setHiddenSegments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tipo)) {
        newSet.delete(tipo);
      } else {
        newSet.add(tipo);
      }
      return newSet;
    });
  }, []);

  const handleExport = useCallback((format: 'png' | 'svg' | 'json') => {
    onExport?.(format);
  }, [onExport]);

  /* ========================== ESTADO VACÍO ============================ */
  
  if (!processedData.length) {
    return (
      <Card className={cn('shadow-lg hover:shadow-xl transition-all duration-300', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
          <EmptyState 
            message="Sin datos para visualizar"
            icon={<Activity className="h-8 w-8 text-muted-foreground" />}
          />
        </CardContent>
      </Card>
    );
  }

  /* ========================== INFORMACIÓN DETALLADA ======================== */
  
  const renderDetailedInfo = () => {
    if (!selectedSegment) return null;
    
    const selectedData = processedData.find(d => d.tipo === selectedSegment);
    if (!selectedData) return null;

    return (
      <div className="mt-4 p-4 bg-muted/30 rounded-lg border animate-in slide-in-from-top-2 fade-in duration-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold capitalize">{selectedData.tipo}</h4>
          <Badge variant="outline">#{selectedData.rank}</Badge>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div className="text-center p-3 rounded bg-background border">
            <div className="text-2xl font-bold text-primary">{selectedData.cantidad}</div>
            <div className="text-xs text-muted-foreground">Casos Totales</div>
          </div>
          
          <div className="text-center p-3 rounded bg-background border">
            <div className="text-2xl font-bold text-primary">{selectedData.porcentaje}%</div>
            <div className="text-xs text-muted-foreground">Del Total</div>
          </div>
          
          <div className="text-center p-3 rounded bg-background border">
            <div className="text-lg font-bold text-primary">{selectedData.categoria}</div>
            <div className="text-xs text-muted-foreground">Especialidad</div>
          </div>
          
          {selectedData.tendencia !== undefined && (
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
    );
  };

  /* ========================== RENDERIZADO PRINCIPAL ======================== */
  
  return (
    <Card className={cn(
      'shadow-lg hover:shadow-xl transition-all duration-300 border overflow-hidden',
      className
    )}>
      
      {/* ==================== HEADER CON CONTROLES ==================== */}
      
      <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Activity className="h-5 w-5 text-primary" />
              {title}
              <Badge variant="secondary" className="ml-2">
                {chartStats.total} casos
              </Badge>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          
          {showControls && (
            <div className="flex items-center gap-2">
              
              {/* Configuración */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Visualización</DropdownMenuLabel>
                  
                  <DropdownMenuItem>
                    <div className="flex items-center justify-between w-full">
                      <Label htmlFor="percentages" className="text-sm">Porcentajes</Label>
                      <Switch
                        id="percentages"
                        checked={config.showPercentages}
                        onCheckedChange={(checked) => updateConfig({ showPercentages: checked })}
                      />
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem>
                    <div className="flex items-center justify-between w-full">
                      <Label htmlFor="labels" className="text-sm">Etiquetas</Label>
                      <Switch
                        id="labels"
                        checked={config.showLabels}
                        onCheckedChange={(checked) => updateConfig({ showLabels: checked })}
                      />
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Ordenamiento</DropdownMenuLabel>
                  
                  <DropdownMenuCheckboxItem
                    checked={config.sortBy === 'valor'}
                    onCheckedChange={() => updateConfig({ sortBy: 'valor' })}
                  >
                    Por valor
                  </DropdownMenuCheckboxItem>
                  
                  <DropdownMenuCheckboxItem
                    checked={config.sortBy === 'alfabetico'}
                    onCheckedChange={() => updateConfig({ sortBy: 'alfabetico' })}
                  >
                    Alfabético
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Exportar */}
              {onExport && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport('png')}>
                      Exportar como PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('svg')}>
                      Exportar como SVG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('json')}>
                      Exportar datos JSON
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        
        {/* ================== CONTROLES DE VISIBILIDAD ================== */}
        
        {interactive && processedData.length > 4 && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Mostrar/Ocultar segmentos:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {processedData.map((item) => (
                <Button
                  key={item.tipo}
                  variant={item.isVisible ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => toggleSegmentVisibility(item.tipo)}
                  className="h-8 px-3 text-xs gap-2 transition-all hover:scale-105"
                >
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  {ABBR(item.tipo, 15)}
                  {!item.isVisible && <EyeOff className="h-3 w-3" />}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* ==================== GRÁFICO USANDO HOOK CENTRALIZADOR ==================== */}
        
        {renderPieChart(visibleData, chartStats, false)}

        {/* ================ INFORMACIÓN DETALLADA ================= */}
        
        {renderDetailedInfo()}

      </CardContent>

      {/* ===================== FOOTER CON ESTADÍSTICAS ===================== */}
      
      {showStats && (
        <CardFooter className="bg-muted/20 border-t">
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Más frecuente:</span>
              <span className="font-medium">
                {processedData[0]?.tipo ? titleCaseStatus(processedData[0].tipo) : 'N/A'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Segmentos visibles:</span>
              <span className="font-bold">{visibleData.length}</span>
            </div>
            
            <div className="flex items-center gap-2 justify-end">
              <span className="text-muted-foreground">Total casos:</span>
              <span className="font-bold">{chartStats.total}</span>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default memo(DiagnosisPieChart);