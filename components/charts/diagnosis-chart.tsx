/* -------------------------------------------------------------------------- */
/*  components/charts/diagnosis-chart.tsx                                     */
/*  🎯 Gráfico de diagnósticos interactivo con análisis inteligente          */
/* -------------------------------------------------------------------------- */

import { useMemo, useCallback, useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  Legend,
  LabelList,
} from 'recharts';
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
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  Loader2,
  Zap,
  Target
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { CHART_STYLES, getChartColors, getAdaptiveBackground } from '@/components/charts/chart-theme';
import { LocalDiagnosisCategory } from '@/components/charts/chart-diagnostic'; // Added import
import { DiagnosisEnum } from '@/app/dashboard/data-model'; // Added import
import { cn } from '@/lib/utils';

/* ============================================================================
 * TIPOS Y INTERFACES ESPECIALIZADAS
 * ========================================================================== */

export interface DiagnosisData {
  tipo: LocalDiagnosisCategory; // Changed from string
  cantidad: number;
  porcentaje?: number;
  // gravedad?: 'baja' | 'media' | 'alta'; // Removed gravedad
  tendencia?: number; // Cambio porcentual vs período anterior
  color?: string;
  descripcion?: string;
}

interface ProcessedDiagnosisData extends DiagnosisData {
  id: string;
  fill: string;
  isHighlighted: boolean;
  rank: number;
}

interface DiagnosisStats {
  total: number;
  // Eliminadas métricas redundantes que no son relevantes para el proyecto
  // diversidad: number;
  // concentracion: number;
  // tendenciaGeneral: number;
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
  colorScheme?: 'medical' | 'diagnosis' | 'patients';
  onDiagnosisSelect?: (diagnosis: DiagnosisData | null) => void;
}

/* ============================================================================
 * FUNCIONES AUXILIARES OPTIMIZADAS
 * ========================================================================== */

const ABBR = (s: string, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const isHernia = (tipo: LocalDiagnosisCategory): boolean => {
  return (
    tipo === DiagnosisEnum.HERNIA_INGUINAL ||
    tipo === DiagnosisEnum.HERNIA_UMBILICAL ||
    tipo === DiagnosisEnum.HERNIA_INCISIONAL ||
    tipo === DiagnosisEnum.HERNIA_HIATAL ||
    tipo === DiagnosisEnum.HERNIA_INGUINAL_RECIDIVANTE ||
    tipo === DiagnosisEnum.HERNIA_INGUINAL_BILATERAL ||
    // Eliminado HERNIA_EPIGASTRICA ya que no existe en el enum DiagnosisEnum
    tipo === DiagnosisEnum.HERNIA_SPIGEL || // Utiliza HERNIA_SPIGEL que es el nombre correcto en el enum
    tipo === DiagnosisEnum.HERNIA_VENTRAL ||
    tipo === DiagnosisEnum.EVENTRACION_ABDOMINAL // Considered as a type of hernia/incisional
  );
};

const isVesicula = (tipo: LocalDiagnosisCategory): boolean => {
  return (
    tipo === DiagnosisEnum.COLECISTITIS || // "COLECISTITIS / COLECISTITIS CRONICA"
    tipo === DiagnosisEnum.COLELITIASIS ||
    tipo === DiagnosisEnum.COLEDOCOLITIASIS ||
    tipo === DiagnosisEnum.COLANGITIS
  );
};

const isApendicitis = (tipo: LocalDiagnosisCategory): boolean => {
  return tipo === DiagnosisEnum.APENDICITIS;
};

// Removed isCardiovascular as it's less central to current diagnosis set

const getMedicalCategory = (tipo: LocalDiagnosisCategory): { color: number } => {
  if (isHernia(tipo)) return { color: 0 };
  if (isVesicula(tipo)) return { color: 1 };
  if (isApendicitis(tipo)) return { color: 2 };
  // Add other primary categories if needed, e.g., Lipomas, Cysts
  if (tipo === DiagnosisEnum.LIPOMA_GRANDE) return { color: 3 }; 
  if (tipo === DiagnosisEnum.QUISTE_SEBACEO_INFECTADO) return { color: 4 };
  
  // Default/Other category
  return { color: 5 }; // Adjusted color index for 'Other'
};

const calculateShannonIndex = (data: DiagnosisData[]): number => {
  const total = data.reduce((sum, d) => sum + d.cantidad, 0);
  if (total === 0) return 0;
  
  return -data.reduce((sum, d) => {
    const p = d.cantidad / total;
    return sum + (p > 0 ? p * Math.log2(p) : 0);
  }, 0);
};

// Versión simplificada de getRiskColor para mantener compatibilidad
const getRiskColor = (risk: 'baja' | 'media' | 'alta'): string => {
  switch (risk) {
    case 'baja':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'media':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    case 'alta':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400';
  }
};

/* ============================================================================
 * COMPONENTE PRINCIPAL MEJORADO
 * ========================================================================== */

export default function DiagnosisChart({
  data,
  title = 'Distribución de Diagnósticos',
  description = 'Análisis detallado por categoría médica',
  className,
  maxCategories = 8,
  showPercentages = true,
  showTrends = true,
  interactive = true,
  colorScheme = 'diagnosis',
  onDiagnosisSelect,
}: Props) {
  
  /* ============================== ESTADO =============================== */
  
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string | null>(null);
  const [hiddenDiagnoses, setHiddenDiagnoses] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [showLabels, setShowLabels] = useState(true);

  /* ========================= EFECTOS Y SETUP ========================== */
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setIsVisible(true);
    }, 200);
    
    return () => clearTimeout(timer);
  }, [data]);

  /* ======================== PROCESAMIENTO DE DATOS ====================== */
  
  const { processedData, diagnosisStats, colors, hasOthers } = useMemo(() => {
    if (!data?.length) {
      return { 
        processedData: [], 
        diagnosisStats: {
          total: 0,
        }, 
        colors: [],
        hasOthers: false
      };
    }

    // Ordenar por cantidad
    const sortedData = [...data].sort((a, b) => b.cantidad - a.cantidad);
    const total = sortedData.reduce((sum, d) => sum + d.cantidad, 0);

    // Manejar categorías en exceso
    let finalData = sortedData;
    let hasOthersFlag = false;
    
    if (sortedData.length > maxCategories) {
      const topItems = sortedData.slice(0, maxCategories - 1);
      const otherItems = sortedData.slice(maxCategories - 1);
      const otherSum = otherItems.reduce((sum, d) => sum + d.cantidad, 0);
      
      if (otherSum > 0) {
        finalData = [
          ...topItems,
          {
            tipo: DiagnosisEnum.OTRO, // Changed from 'Otros diagnósticos'
            cantidad: otherSum,
            descripcion: `Incluye ${otherItems.length} diagnósticos adicionales`
          }
        ];
        hasOthersFlag = true;
      }
    }

    // Obtener paleta de colores
    const palette = getChartColors(colorScheme, finalData.length + 2);

    // Procesar datos con metadatos
    const processed: ProcessedDiagnosisData[] = finalData.map((item, index) => {
      const isOther = item.tipo === DiagnosisEnum.OTRO;
      const category = isOther ? { color: palette.length - 1 } : getMedicalCategory(item.tipo); // Removed riesgo from 'isOther' case
      const porcentaje = total > 0 ? Math.round((item.cantidad / total) * 100) : 0;
      
      return {
        ...item,
        id: `diag-${index}`,
        porcentaje,
        fill: palette[isOther ? palette.length - 1 : category.color % palette.length],
        // gravedad: item.gravedad || category.riesgo, // Removed gravedad assignment
        isHighlighted: selectedDiagnosis === item.tipo,
        rank: index + 1,
        tendencia: item.tendencia, // Removed simulation logic
      };
    });

    // Calcular estadísticas
    const stats: DiagnosisStats = {
      total,
    };

    return {
      processedData: processed,
      diagnosisStats: stats,
      colors: palette,
      hasOthers: hasOthersFlag
    };
  }, [data, maxCategories, selectedDiagnosis, colorScheme]);

  /* ======================= MANEJADORES DE EVENTOS ======================= */
  
  const handleDiagnosisClick = useCallback((data: ProcessedDiagnosisData) => {
    if (!interactive) return;
    
    const newSelected = selectedDiagnosis === data.tipo ? null : data.tipo;
    setSelectedDiagnosis(newSelected);
    
    const originalData = processedData.find(d => d.tipo === data.tipo);
    onDiagnosisSelect?.(originalData || null);
  }, [interactive, selectedDiagnosis, processedData, onDiagnosisSelect]);

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

  const visibleData = useMemo(() => 
    processedData.filter(d => !hiddenDiagnoses.has(d.tipo))
  , [processedData, hiddenDiagnoses]);

  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    
    const data = payload[0].payload as ProcessedDiagnosisData;
    
    return (
      <div 
        className="p-4 rounded-xl shadow-2xl border backdrop-blur-md text-sm animate-in fade-in zoom-in-95 duration-200"
        style={{
          backgroundColor: getAdaptiveBackground(0.95),
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        }}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.fill }} />
            <span className="font-semibold text-foreground">{data.tipo}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Casos:</span>
              <div className="font-bold text-base">{data.cantidad}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Porcentaje:</span>
              <div className="font-bold text-base">{data.porcentaje}%</div>
            </div>
            <div>
              <span className="text-muted-foreground">Ranking:</span>
              <div className="font-bold text-base">#{data.rank}</div>
            </div>
            {/* Gravedad section removed 
            <div>
              <span className="text-muted-foreground">Gravedad:</span>
              <Badge 
                variant="outline" 
                className={cn("text-xs h-5", getRiskColor(data.gravedad || 'baja'))}
              >
                {data.gravedad}
              </Badge>
            </div>
            */}
          </div>
          
          {showTrends && data.tendencia !== undefined && (
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground text-xs">Tendencia:</span>
              <div className={cn(
                "flex items-center gap-1 font-semibold text-xs",
                data.tendencia > 0 ? "text-red-500" : "text-green-500"
              )}>
                {data.tendencia > 0 ? 
                  <TrendingUp className="h-3 w-3" /> : 
                  <TrendingDown className="h-3 w-3" />
                }
                {Math.abs(data.tendencia).toFixed(1)}%
              </div>
            </div>
          )}
          
          {data.descripcion && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">{data.descripcion}</p>
            </div>
          )}
        </div>
      </div>
    );
  }, [isDark, showTrends]);

  /* ========================== COMPONENTE DE CARGA ========================= */
  
  if (isLoading) {
    return (
      <Card className={cn('shadow-lg hover:shadow-xl transition-all duration-300', className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <CardTitle>Analizando Diagnósticos</CardTitle>
          </div>
          <CardDescription>Procesando datos médicos...</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <div className="space-y-4 text-center">
            <Progress value={80} className="w-48" />
            <p className="text-sm text-muted-foreground">Categorizando diagnósticos por especialidad</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
        <CardContent className="h-[300px] flex flex-col items-center justify-center space-y-4">
          <div className="p-4 rounded-full bg-muted/50">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center space-y-2">
            <p className="font-medium text-muted-foreground">Sin datos disponibles</p>
            <p className="text-sm text-muted-foreground">
              No hay diagnósticos registrados en el período seleccionado
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ========================== RENDERIZADO PRINCIPAL ======================== */
  
  return (
    <Card className={cn(
      'shadow-lg hover:shadow-xl transition-all duration-300 border overflow-hidden',
      className
    )}>
      
      {/* ==================== HEADER CON ESTADÍSTICAS ==================== */}
      
      <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Activity className="h-5 w-5 text-primary" />
              {title}
              <Badge variant="secondary" className="ml-2">
                {diagnosisStats.total} casos
              </Badge>
            </CardTitle>
            <CardDescription>
              {description}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {interactive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLabels(!showLabels)}
                className="gap-2"
              >
                {showLabels ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                Etiquetas
              </Button>
            )}
            
            {/* Eliminado indicador de riesgo ya que la lógica de riesgo fue removida */}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        
        {/* ================== INDICADORES RÁPIDOS =================== */}
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="text-lg font-bold">{processedData.length}</div>
            <div className="text-xs text-muted-foreground">Categorías</div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="text-lg font-bold">{processedData[0]?.cantidad || 0}</div>
            <div className="text-xs text-muted-foreground">Casos del más frecuente</div>
          </div>
        </div>

        {/* ================ CONTROLES DE VISUALIZACIÓN ================= */}
        
        {interactive && processedData.length > 4 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm font-medium text-muted-foreground">Mostrar/Ocultar:</span>
            {processedData.map((item) => (
              <Button
                key={item.id}
                variant={hiddenDiagnoses.has(item.tipo) ? "outline" : "secondary"}
                size="sm"
                onClick={() => toggleDiagnosisVisibility(item.tipo)}
                className="h-7 px-2 text-xs gap-1"
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: item.fill }}
                />
                {ABBR(item.tipo, 12)}
                {hiddenDiagnoses.has(item.tipo) ? 
                  <EyeOff className="h-3 w-3" /> : 
                  <Eye className="h-3 w-3" />
                }
              </Button>
            ))}
          </div>
        )}

        {/* ==================== GRÁFICO PRINCIPAL ==================== */}
        
        <div className="h-[300px] sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={visibleData}
                dataKey="cantidad"
                nameKey="tipo"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                cornerRadius={5}
                stroke={isDark ? 'hsl(var(--card))' : 'hsl(var(--background))'}
                strokeWidth={2}
                isAnimationActive={isVisible}
                animationDuration={800}
                onClick={handleDiagnosisClick}
                className={cn(interactive && "cursor-pointer")}
              >
                {visibleData.map((entry) => (
                  <Cell 
                    key={entry.id}
                    fill={entry.fill}
                    fillOpacity={
                      selectedDiagnosis && selectedDiagnosis !== entry.tipo ? 0.3 : 
                      entry.isHighlighted ? 1 : 0.8
                    }
                    stroke={entry.isHighlighted ? entry.fill : undefined}
                    strokeWidth={entry.isHighlighted ? 3 : 2}
                    className={cn(
                      interactive && "hover:opacity-90 transition-all duration-200",
                      entry.isHighlighted && "drop-shadow-lg"
                    )}
                  />
                ))}
                
                {showLabels && showPercentages && (
                  <LabelList
                    dataKey="porcentaje"
                    position="outside"
                    formatter={(value: number) => value > 5 ? `${value}%` : ''}
                    style={{ 
                      fontSize: '11px', 
                      fill: isDark ? '#e2e8f0' : '#475569',
                      fontWeight: 600
                    }}
                  />
                )}
              </Pie>

              <RTooltip content={<CustomTooltip />} />

              <Legend
                wrapperStyle={{
                  color: CHART_STYLES.legend.color,
                  fontSize: CHART_STYLES.legend.fontSize,
                  paddingTop: '20px'
                }}
                iconType="circle"
                iconSize={CHART_STYLES.legend.iconSize}
                verticalAlign="bottom"
                height={50}
                formatter={(value, entry) => {
                  const item = processedData.find(d => d.tipo === value);
                  return (
                    <span 
                      style={{ color: entry.color }}
                      className={cn(
                        "text-sm",
                        selectedDiagnosis === value && "font-semibold"
                      )}
                    >
                      {ABBR(value, 20)} ({item?.porcentaje}%)
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* ================ INFORMACIÓN DETALLADA ================= */}
        
        {selectedDiagnosis && (
          <div className="mt-6 p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg border animate-in slide-in-from-bottom-3 fade-in duration-300">
            {(() => {
              const selectedData = processedData.find(d => d.tipo === selectedDiagnosis);
              if (!selectedData) return null;
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-lg">{selectedData.tipo}</h4>
                    {/* Eliminado el badge de gravedad ya que la lógica de riesgo ha sido removida */}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded bg-background border">
                      <div className="text-2xl font-bold text-primary">{selectedData.cantidad}</div>
                      <div className="text-xs text-muted-foreground">Casos Totales</div>
                    </div>
                    
                    <div className="text-center p-3 rounded bg-background border">
                      <div className="text-2xl font-bold text-primary">{selectedData.porcentaje}%</div>
                      <div className="text-xs text-muted-foreground">Del Total</div>
                    </div>
                    
                    <div className="text-center p-3 rounded bg-background border">
                      <div className="text-2xl font-bold text-primary">#{selectedData.rank}</div>
                      <div className="text-xs text-muted-foreground">Ranking</div>
                    </div>
                    
                    <div className="text-center p-3 rounded bg-background border">
                      <div className={cn(
                        "text-2xl font-bold flex items-center justify-center gap-1",
                        selectedData.tendencia && selectedData.tendencia > 0 ? "text-red-500" : "text-green-500"
                      )}>
                        {selectedData.tendencia !== undefined && (
                          <>
                            {selectedData.tendencia > 0 ? 
                              <TrendingUp className="h-5 w-5" /> : 
                              <TrendingDown className="h-5 w-5" />
                            }
                            {Math.abs(selectedData.tendencia).toFixed(1)}%
                          </>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">Tendencia</div>
                    </div>
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
            })()}
          </div>
        )}

      </CardContent>

      {/* ===================== FOOTER CON INSIGHTS ===================== */}
      
      <CardFooter className="bg-muted/20 border-t">
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Más frecuente:</span>
            <span className="font-medium">{processedData[0]?.tipo || 'N/A'}</span>
          </div>
          
          {/* Componente de diversidad eliminado por ser redundante */}
          
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Casos analizados:</span>
            <span className="font-bold">{diagnosisStats.total}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}