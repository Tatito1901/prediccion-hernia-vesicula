/* -------------------------------------------------------------------------- */
/*  components/charts/diagnosis-chart.tsx                                     */
/*  🎯 Gráfico de diagnósticos interactivo con análisis inteligente          */
/*  Versión Optimizada para Next.js App Router                               */
/* -------------------------------------------------------------------------- */

import { memo, useMemo, useCallback, useState, useEffect, FC } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  Legend, LabelList, TooltipProps as RechartsTooltipProps, // Renombrado para evitar colisión
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity, TrendingUp, TrendingDown, AlertTriangle, Info,
  Eye, EyeOff, Loader2, Zap, Target, LucideIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { CHART_STYLES, getChartColors, getAdaptiveBackground } from '@/components/charts/chart-theme';
import { cn } from '@/lib/utils';

/* ============================================================================
 * TIPOS Y INTERFACES
 * ========================================================================== */
export interface DiagnosisDataInput {
  tipo: string;
  cantidad: number;
  porcentaje?: number;
  gravedad?: 'baja' | 'media' | 'alta';
  tendencia?: number;
  color?: string;
  descripcion?: string;
}

interface ProcessedDiagnosisData extends Omit<DiagnosisDataInput, 'color' | 'gravedad' | 'tendencia' | 'porcentaje'> {
  id: string;
  fill: string;
  rank: number;
  porcentaje: number;
  gravedad: 'baja' | 'media' | 'alta';
  tendencia: number;
  originalColor?: string;
}

interface DiagnosisStats {
  total: number;
  diversidad: number;
  concentracion: number;
  riesgoPromedio: 'baja' | 'media' | 'alta';
  tendenciaGeneral: number;
}

// Interface para el objeto 'entry' que Recharts pasa al formatter de Legend
// Asumimos que esta estructura es la que Recharts provee en este contexto específico.
interface CustomLegendEntry {
  value: string; // El valor del nameKey (e.g., "Apendicitis")
  id?: string;
  type?: string;
  color?: string; // Color del ícono de la leyenda
  payload?: { // Contiene el objeto de datos asociado con el item de la leyenda
    value?: ProcessedDiagnosisData; // El objeto de datos original
    strokeDasharray?: string | number;
  };
  fillOpacity?: number; // Propiedad que Recharts añade para el estado visual
}

// Props para el componente CustomTooltip de Recharts
// TValue y TName son los tipos para `value` y `name` de los datos del gráfico.
// El tercer genérico es para el tipo del `payload` interno de cada item en `payload` del tooltip.
interface CustomTooltipProps extends RechartsTooltipProps<ValueType, NameType> {
  payload?: Array<{
    payload: ProcessedDiagnosisData; // Especificamos que el payload interno es ProcessedDiagnosisData
    // Otras propiedades que Recharts añade a cada item del payload del tooltip
    name: NameType;
    value: ValueType;
    color?: string;
    fill?: string;
    // ... y más según la configuración de Recharts
  }>;
}


interface Props {
  data: ReadonlyArray<DiagnosisDataInput>;
  title?: string;
  description?: string;
  className?: string;
  maxCategories?: number;
  showPercentagesInChart?: boolean;
  showTrendsInTooltip?: boolean;
  interactive?: boolean;
  colorScheme?: 'medical' | 'diagnosis' | 'patients';
  onDiagnosisSelect?: (diagnosis: ProcessedDiagnosisData | null) => void;
}

/* ============================================================================
 * CONSTANTES Y VALORES POR DEFECTO
 * ========================================================================== */
const DEFAULT_MAX_CATEGORIES = 8;
const DEFAULT_GRAVEDAD: 'baja' | 'media' | 'alta' = 'baja';
const DEFAULT_TENDENCIA = 0;

/* ============================================================================
 * FUNCIONES AUXILIARES
 * ========================================================================== */
const abbreviateText = (text: string, maxLength = 16): string =>
  text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;

interface MedicalCategoryInfo {
  colorIndex: number;
  riesgo: 'baja' | 'media' | 'alta';
}

// Esta función es pura y sus resultados solo dependen de sus entradas.
// No necesita memoización si se define fuera del componente.
const getMedicalCategoryInfo = (tipo: string): MedicalCategoryInfo => {
  const lowerTipo = tipo.toLowerCase();
  if (lowerTipo.includes('hernia')) return { colorIndex: 0, riesgo: 'media' };
  if (lowerTipo.includes('vesícula') || lowerTipo.includes('colelitiasis')) return { colorIndex: 1, riesgo: 'media' };
  if (lowerTipo.includes('apendicitis')) return { colorIndex: 2, riesgo: 'alta' };
  if (lowerTipo.includes('cardio') || lowerTipo.includes('corazón')) return { colorIndex: 3, riesgo: 'alta' };
  return { colorIndex: 4, riesgo: 'baja' };
};

// Esta función es pura.
const calculateShannonIndex = (data: ReadonlyArray<ProcessedDiagnosisData>): number => {
  const total = data.reduce((sum, d) => sum + d.cantidad, 0);
  if (total === 0) return 0;
  return -data.reduce((sum, d) => {
    const proportion = d.cantidad / total;
    return sum + (proportion > 0 ? proportion * Math.log2(proportion) : 0);
  }, 0);
};

const RISK_BADGE_CLASSES: Readonly<Record<'baja' | 'media' | 'alta', string>> = {
  baja: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-500/50',
  media: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500/50',
  alta: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-500/50',
};
const getRiskBadgeClass = (level: 'baja' | 'media' | 'alta'): string => RISK_BADGE_CLASSES[level] || 'text-muted-foreground bg-muted border-border';

/* ============================================================================
 * COMPONENTE PRINCIPAL
 * ========================================================================== */
const DiagnosisChartComponent: FC<Props> = ({
  data: rawDataInput,
  title = 'Distribución de Diagnósticos',
  description = 'Análisis detallado por categoría médica',
  className,
  maxCategories = DEFAULT_MAX_CATEGORIES,
  showPercentagesInChart = true,
  showTrendsInTooltip = true,
  interactive = true,
  colorScheme = 'diagnosis',
  onDiagnosisSelect,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [selectedDiagnosisName, setSelectedDiagnosisName] = useState<string | null>(null);
  const [hiddenDiagnoses, setHiddenDiagnoses] = useState<ReadonlySet<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true); // Estado para simular carga/procesamiento

  // Efecto para simular carga de procesamiento cuando cambian datos clave.
  // En una aplicación real, si los datos vienen de una API, `isLoading`
  // estaría ligado al estado de fetching de esa API.
  // Si el procesamiento síncrono de `useMemo` fuera muy pesado,
  // `useTransition` podría ser una mejor opción para mantener la UI responsiva.
  useEffect(() => {
    setIsLoading(true);
    // Este timeout simula una demora de procesamiento o una transición visual.
    const timer = setTimeout(() => setIsLoading(false), 250);
    return () => clearTimeout(timer);
  }, [rawDataInput, maxCategories, colorScheme]);

  const baseProcessedData = useMemo((): ReadonlyArray<Omit<ProcessedDiagnosisData, 'fill' | 'rank'>> => {
    if (!rawDataInput?.length) return [];

    const totalOriginal = rawDataInput.reduce((sum, d) => sum + d.cantidad, 0) || 1; // Evitar división por cero
    let dataToProcess: DiagnosisDataInput[];

    if (rawDataInput.length > maxCategories) {
      const sortedData = [...rawDataInput].sort((a, b) => b.cantidad - a.cantidad);
      const topItems = sortedData.slice(0, maxCategories - 1);
      const otherItems = sortedData.slice(maxCategories - 1);
      const otherSum = otherItems.reduce((sum, d) => sum + d.cantidad, 0);

      dataToProcess = [...topItems];
      if (otherSum > 0) {
        dataToProcess.push({
          tipo: 'Otros diagnósticos',
          cantidad: otherSum,
          descripcion: `Agrupa ${otherItems.length} diagnósticos adicionales.`,
          gravedad: DEFAULT_GRAVEDAD,
          tendencia: DEFAULT_TENDENCIA,
        });
      }
    } else {
      dataToProcess = [...rawDataInput].sort((a, b) => b.cantidad - a.cantidad);
    }

    return dataToProcess.map((item, index) => ({
      ...item,
      id: `diag-${item.tipo.replace(/\s+/g, '-')}-${index}`,
      porcentaje: item.porcentaje ?? Math.round((item.cantidad / totalOriginal) * 100),
      gravedad: item.gravedad ?? getMedicalCategoryInfo(item.tipo).riesgo ?? DEFAULT_GRAVEDAD,
      tendencia: item.tendencia ?? DEFAULT_TENDENCIA,
      originalColor: item.color,
    }));
  }, [rawDataInput, maxCategories]);

  const finalProcessedData = useMemo((): ReadonlyArray<ProcessedDiagnosisData> => {
    if (!baseProcessedData.length) return [];

    const palette = getChartColors(colorScheme, baseProcessedData.length);

    return baseProcessedData.map((item, index) => {
      const isOtherCategory = item.tipo === 'Otros diagnósticos';
      const categoryInfo = getMedicalCategoryInfo(item.tipo);
      
      let assignedColor: string;
      if (isOtherCategory) {
        assignedColor = palette[palette.length - 1] || '#8884d8'; // Fallback color para "Otros"
      } else {
        // Usa el colorIndex de la categoría médica, asegurando que esté dentro del rango de la paleta
        assignedColor = palette[categoryInfo.colorIndex % palette.length];
      }

      return {
        ...item,
        fill: item.originalColor || assignedColor,
        rank: index + 1,
      };
    });
  }, [baseProcessedData, colorScheme]);

  const diagnosisStats = useMemo((): DiagnosisStats => {
    if (!finalProcessedData.length) {
      return { total: 0, diversidad: 0, concentracion: 0, riesgoPromedio: 'baja', tendenciaGeneral: 0 };
    }
    const total = finalProcessedData.reduce((sum, d) => sum + d.cantidad, 0);
    const diversidad = calculateShannonIndex(finalProcessedData);
    
    const topN = Math.min(3, finalProcessedData.length);
    const topNSum = finalProcessedData.slice(0, topN).reduce((sum, d) => sum + d.cantidad, 0);
    const concentracion = total > 0 ? (topNSum / total) * 100 : 0;

    const riskScores: Record<'baja' | 'media' | 'alta', number> = { baja: 1, media: 2, alta: 3 };
    const avgRiskScore = finalProcessedData.reduce((sum, d) => sum + riskScores[d.gravedad] * d.cantidad, 0) / (total || 1);
    const riesgoPromedio: 'baja' | 'media' | 'alta' = avgRiskScore < 1.5 ? 'baja' : avgRiskScore < 2.5 ? 'media' : 'alta';

    const tendenciaGeneral = finalProcessedData.reduce((sum, d) => sum + d.tendencia * (d.cantidad / (total || 1)), 0);

    return { total, diversidad, concentracion, riesgoPromedio, tendenciaGeneral };
  }, [finalProcessedData]);

  // El payload de onClick en <Pie> es directamente el objeto de datos (ProcessedDiagnosisData)
  const handleDiagnosisClick = useCallback((clickedData: ProcessedDiagnosisData) => {
    if (!interactive || !clickedData || typeof clickedData.tipo !== 'string') return;
    
    const newSelectedName = selectedDiagnosisName === clickedData.tipo ? null : clickedData.tipo;
    setSelectedDiagnosisName(newSelectedName);

    if (onDiagnosisSelect) {
      const fullSelectedData = newSelectedName ? finalProcessedData.find(d => d.tipo === newSelectedName) : null;
      onDiagnosisSelect(fullSelectedData || null);
    }
  }, [interactive, selectedDiagnosisName, onDiagnosisSelect, finalProcessedData]);

  const toggleDiagnosisVisibility = useCallback((tipo: string) => {
    setHiddenDiagnoses(prevHidden => {
      const newHidden = new Set(prevHidden);
      if (newHidden.has(tipo)) {
        newHidden.delete(tipo);
      } else {
        newHidden.add(tipo);
      }
      return newHidden;
    });
  }, []); // Sin dependencias, ya que solo modifica el estado local

  const visibleData = useMemo(() =>
    finalProcessedData.filter(d => !hiddenDiagnoses.has(d.tipo))
  , [finalProcessedData, hiddenDiagnoses]);

  const CustomTooltip: FC<CustomTooltipProps> = useCallback(({ active, payload }) => {
    if (active && payload && payload.length && payload[0].payload) {
      const data = payload[0].payload; // `data` es ahora directamente `ProcessedDiagnosisData` gracias a CustomTooltipProps
      return (
        <div
          className="p-3 rounded-lg shadow-xl border text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          style={{
            backgroundColor: getAdaptiveBackground(0.95), // Asume que getAdaptiveBackground usa resolvedTheme o isDark
            borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
          }}
        >
          <div className="mb-1.5 flex items-center gap-2 border-b border-border/60 pb-1.5">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.fill }} />
            <span className="font-semibold text-foreground text-[13px]">{data.tipo}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between"><span>Casos:</span><span className="font-medium">{data.cantidad} ({data.porcentaje}%)</span></div>
            <div className="flex justify-between"><span>Ranking:</span><span className="font-medium">#{data.rank}</span></div>
            <div className="flex justify-between items-center">
              <span>Gravedad:</span>
              <Badge variant="outline" className={cn("h-auto py-0.5 px-1.5 font-medium text-xs", getRiskBadgeClass(data.gravedad))}>{data.gravedad}</Badge>
            </div>
            {showTrendsInTooltip && (
              <div className="flex justify-between items-center">
                <span>Tendencia:</span>
                <span className={cn("flex items-center gap-0.5 font-medium", data.tendencia > 0 ? "text-red-500" : data.tendencia < 0 ? "text-green-500" : "text-muted-foreground")}>
                  {data.tendencia !== 0 && (data.tendencia > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
                  {data.tendencia.toFixed(1)}%
                </span>
              </div>
            )}
            {data.descripcion && <p className="pt-1.5 mt-1.5 border-t border-border/60 text-muted-foreground text-[11px]">{data.descripcion}</p>}
          </div>
        </div>
      );
    }
    return null;
  }, [isDark, showTrendsInTooltip]); // getAdaptiveBackground y getRiskBadgeClass son estables (definidas fuera o memoizadas)

  if (isLoading && !finalProcessedData.length && rawDataInput.length > 0) { // Mostrar skeleton solo si hay datos de entrada pero aún no procesados
    return (
      <Card className={cn('shadow-lg', className)}>
        <CardHeader>
          <div className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin text-primary" /><CardTitle className="text-lg">Cargando Gráfico</CardTitle></div>
          <CardDescription className="text-sm">Analizando distribución de diagnósticos...</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <div className="w-full px-8 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-60 w-full rounded-full" />
            <div className="flex justify-between gap-2">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-6 w-1/3" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!finalProcessedData.length) {
    return (
      <Card className={cn('shadow-md', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5 text-primary" />{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex flex-col items-center justify-center text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground/70 mb-4" />
          <p className="font-semibold text-muted-foreground">Sin Datos Disponibles</p>
          <p className="text-xs text-muted-foreground mt-1">No hay diagnósticos para mostrar con los filtros actuales.</p>
        </CardContent>
      </Card>
    );
  }

  const renderSelectedDiagnosisDetails = () => {
    if (!interactive || !selectedDiagnosisName) return null;
    const selectedData = finalProcessedData.find(d => d.tipo === selectedDiagnosisName);
    if (!selectedData) return null;

    const details: { label: string; value: string | number; icon?: LucideIcon; colorClass?: string; }[] = [
        { label: 'Casos Totales', value: selectedData.cantidad },
        { label: 'Porcentaje Global', value: `${selectedData.porcentaje}%` },
        { label: 'Ranking Actual', value: `#${selectedData.rank}` },
        { label: 'Tendencia Reciente', value: `${selectedData.tendencia.toFixed(1)}%`, icon: selectedData.tendencia === 0 ? undefined : (selectedData.tendencia > 0 ? TrendingUp : TrendingDown), colorClass: selectedData.tendencia === 0 ? "text-muted-foreground" : (selectedData.tendencia > 0 ? "text-red-500" : "text-green-500") },
    ];

    return (
      <div className="mt-4 p-3.5 bg-muted/40 dark:bg-muted/20 rounded-lg border animate-in slide-in-from-bottom-3 fade-in-0 duration-200">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="font-semibold text-base text-primary">{selectedData.tipo}</h4>
          <Badge variant="outline" className={cn("py-1 px-2.5 text-sm", getRiskBadgeClass(selectedData.gravedad))}>
            <Target size={13} className="mr-1.5" /> Riesgo {selectedData.gravedad}
          </Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {details.map(item => (
            <div key={item.label} className="p-2 rounded-md bg-background/70 dark:bg-background/30 border text-center shadow-sm">
              <div className="text-muted-foreground mb-1 text-[11px] sm:text-xs uppercase tracking-wider">{item.label}</div>
              <div className={cn("font-bold text-sm sm:text-base flex items-center justify-center gap-1", item.colorClass)}>
                {item.icon && <item.icon className="inline h-3.5 w-3.5" />}
                {item.value}
              </div>
            </div>
          ))}
        </div>
        {selectedData.descripcion && (
          <div className="mt-3 pt-3 border-t border-border/70">
            <div className="flex items-start gap-2 text-primary/80 dark:text-primary/70">
              <Info size={16} className="mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">{selectedData.descripcion}</p>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const summaryStats: {icon: LucideIcon, label: string, value: string | number, colorClass?: string}[] = [
    {icon: Zap, label: "Más Frecuente:", value: finalProcessedData[0]?.tipo ? abbreviateText(finalProcessedData[0].tipo, 15) : 'N/A'},
    {icon: Activity, label: "Diversidad:", value: diagnosisStats.diversidad < 1.5 ? 'Baja' : diagnosisStats.diversidad < 2.5 ? 'Media' : 'Alta'},
    {icon: Target, label: "Total Casos:", value: diagnosisStats.total},
  ];

  return (
    <Card className={cn('shadow-lg hover:shadow-xl transition-shadow duration-300 border overflow-hidden', className)}>
      <CardHeader className="border-b bg-muted/30 dark:bg-muted/20 py-3 px-4 sm:py-4 sm:px-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-1.5 text-base sm:text-lg"><Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />{title}</CardTitle>
            {description && <CardDescription className="text-xs sm:text-sm mt-1">{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2 mt-1 sm:mt-0">
            {interactive && hiddenDiagnoses.size > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setHiddenDiagnoses(new Set())} className="text-xs h-auto px-2 py-1">
                Mostrar Todos
              </Button>
            )}
             <Badge variant="outline" className={cn("h-auto py-1 px-2 text-xs", getRiskBadgeClass(diagnosisStats.riesgoPromedio))}>
               Riesgo Prom. {diagnosisStats.riesgoPromedio}
             </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3 text-xs">
          {[
            {label: "Concent. Top 3", value: `${diagnosisStats.concentracion.toFixed(0)}%`},
            {label: "Categorías Vis.", value: `${visibleData.length}/${finalProcessedData.length}`},
            {label: "Tend. General", value: `${diagnosisStats.tendenciaGeneral.toFixed(1)}%`, icon: diagnosisStats.tendenciaGeneral === 0 ? undefined : (diagnosisStats.tendenciaGeneral > 0 ? TrendingUp : TrendingDown), colorClass: diagnosisStats.tendenciaGeneral === 0 ? "" : (diagnosisStats.tendenciaGeneral > 0 ? "text-red-500" : "text-green-500")},
            {label: "Casos Top 1", value: finalProcessedData[0]?.cantidad || 0},
          ].map(stat => (
            <div key={stat.label} className="text-center p-1.5 rounded-md bg-muted/50 dark:bg-muted/30 border">
              <div className={cn("font-bold text-primary text-base sm:text-lg flex items-center justify-center gap-1", stat.colorClass)}>
                {stat.icon && <stat.icon className="inline h-3.5 w-3.5" />}
                {stat.value}
              </div>
              <div className="text-muted-foreground text-[10px] sm:text-xs leading-tight mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {interactive && finalProcessedData.length > 1 && finalProcessedData.length <= 12 && (
          <div className="flex flex-wrap gap-1.5 mb-3.5">
            {finalProcessedData.map(item => (
              <Button
                key={item.id}
                variant={hiddenDiagnoses.has(item.tipo) ? "outline" : "secondary"}
                size="sm" // Usar un tamaño consistente o predefinido
                onClick={() => { if (item.tipo) toggleDiagnosisVisibility(item.tipo); }}
                className="h-auto px-2 py-1 text-[10px] sm:text-xs gap-1.5 items-center" // Ajustado para consistencia
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                {abbreviateText(item.tipo, 10)}
                {hiddenDiagnoses.has(item.tipo) ? <EyeOff size={11} /> : <Eye size={11} />}
              </Button>
            ))}
          </div>
        )}

        <div className={cn("h-[280px] sm:h-[320px] transition-opacity duration-500 ease-out", isLoading ? "opacity-50 blur-[2px]" : "opacity-100")}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <Pie
                data={visibleData}
                dataKey="cantidad"
                nameKey="tipo"
                cx="50%"
                cy="50%"
                innerRadius="58%"
                outerRadius="88%"
                paddingAngle={visibleData.length > 1 ? 2 : 0}
                cornerRadius={4}
                stroke={CHART_STYLES.axis.lineColor}
                strokeWidth={1}
                isAnimationActive={!isLoading && visibleData.length > 0} // Animación solo si no carga y hay datos
                animationDuration={700}
                onClick={interactive ? (data, _index) => handleDiagnosisClick(data) : undefined} // Tipado mejorado aquí
                className={cn(interactive && "cursor-pointer")}
              >
                {visibleData.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={entry.fill}
                    fillOpacity={selectedDiagnosisName && selectedDiagnosisName !== entry.tipo ? 0.3 : selectedDiagnosisName === entry.tipo ? 1 : 0.9}
                    stroke={selectedDiagnosisName === entry.tipo ? (isDark ? '#FFFFFF' : CHART_STYLES.colors.primary) : entry.fill}
                    strokeWidth={selectedDiagnosisName === entry.tipo ? 2.5 : 1}
                    className={cn(interactive && "focus:outline-none focus:opacity-100 hover:opacity-100 transition-opacity duration-150", selectedDiagnosisName === entry.tipo && "drop-shadow-lg")}
                  />
                ))}
                {showPercentagesInChart && (
                  <LabelList
                    dataKey="porcentaje"
                    position="outside"
                    offset={10}
                    formatter={(value: number) => value > 2.5 ? `${value}%` : ''}
                    style={{ 
                        fontSize: '10px', 
                        fill: CHART_STYLES.axis.labelColor, 
                        fontWeight: 500 
                    }}
                  />
                )}
              </Pie>
              <RTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              {visibleData.length > 1 && visibleData.length < 15 && (
                <Legend
                  wrapperStyle={{ 
                    fontSize: '11px', 
                    paddingTop: '15px', 
                    color: CHART_STYLES.legend.color,
                    maxHeight: '60px',
                    overflowY: 'auto'
                  }}
                  iconType="circle" verticalAlign="bottom" height={45}
                  formatter={(value: string, entry: CustomLegendEntry) => (
                    <span 
                        style={{ color: entry.fillOpacity === 1 ? entry.color : (isDark ? '#aaa' : '#555') }}
                        className={cn(
                            "truncate inline-block max-w-[100px] sm:max-w-[150px] cursor-pointer", 
                            selectedDiagnosisName === value && "font-bold",
                            // Asumimos que entry.payload.value.tipo es el identificador correcto
                            entry.payload?.value?.tipo && hiddenDiagnoses.has(entry.payload.value.tipo) && "opacity-50 line-through"
                        )}
                        onClick={() => { if (interactive && entry.payload?.value?.tipo) toggleDiagnosisVisibility(entry.payload.value.tipo); }}
                        title={value}
                    >
                      {abbreviateText(value, 18)}
                    </span>
                  )}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {renderSelectedDiagnosisDetails()}
      </CardContent>

      <CardFooter className="bg-muted/30 dark:bg-muted/20 border-t p-2.5 sm:p-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 w-full">
          {summaryStats.map(item => (
            <div key={item.label} className="flex items-center gap-1.5 text-muted-foreground truncate">
              <item.icon className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="shrink-0">{item.label}</span>
              <span className="font-medium text-foreground truncate ml-auto sm:ml-1" title={String(item.value)}>{item.value}</span>
            </div>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
};

export default memo(DiagnosisChartComponent);