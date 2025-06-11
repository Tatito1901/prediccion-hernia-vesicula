/* -------------------------------------------------------------------------- */
/*  components/charts/diagnosis-type-distribution.tsx                         */
/*  🎯 Distribución especializada de hernias con análisis médico avanzado     */
/* -------------------------------------------------------------------------- */


import { memo, useMemo, useCallback, useState, useEffect, FC } from 'react'; // Añadido FC y memo
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RTooltip, TooltipProps
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity, TrendingUp, TrendingDown, AlertTriangle, Info,
  Users, Loader2, LucideIcon, 
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { CHART_STYLES, getChartColors, getAdaptiveBackground } from '@/components/charts/chart-theme';
import { cn } from '@/lib/utils';

/* ============================================================================
 * TIPOS Y INTERFACES ESPECIALIZADAS
 * ========================================================================== */

export interface PatientDataInput { // Renombrado para diferenciar
  id: string;
  diagnostico_principal?: string;
  fecha_registro?: string; // No usado directamente en este gráfico
  edad?: number;
  genero?: 'M' | 'F';
  gravedad?: 'leve' | 'moderada' | 'severa'; // No usado directamente para tipos de hernia
}

// Datos procesados para el gráfico de torta
interface HerniaTypeChartData {
  name: string; // Tipo de hernia
  value: number; // Cantidad
  percentage: number;
  trend: number; // Asegurar que siempre exista
  severity: 'low' | 'medium' | 'high';
  description?: string;
  fill: string; // Color para el sector del gráfico
}

interface HerniaStats {
  totalHernias: number;
  mostCommonType: string;
  overallRiskLevel: 'low' | 'medium' | 'high'; // Riesgo ponderado de los tipos de hernia mostrados
  averageAge?: number;
  genderDistribution?: { malePercentage: number; femalePercentage: number };
}

interface Props {
  patients: ReadonlyArray<PatientDataInput>; // Usar ReadonlyArray
  className?: string;
  showStats?: boolean;
  showTrends?: boolean; // Usado en Tooltip y Badges
  // comparisonPeriod?: 'month' | 'quarter' | 'year'; // No se usa actualmente
}

/* ============================================================================
 * CONFIGURACIÓN Y CONSTANTES
 * ========================================================================== */

const HERNIA_TYPE_DETAILS: Readonly<Record<string, { description: string; riskLevel: 'low' | 'medium' | 'high'; colorIndex: number }>> = {
  'hernia inguinal': { description: 'Más común en hombres adultos', riskLevel: 'medium', colorIndex: 0 },
  'hernia umbilical': { description: 'Común en bebés y mujeres post-embarazo', riskLevel: 'low', colorIndex: 1 },
  'hernia incisional': { description: 'Aparece en cicatrices quirúrgicas', riskLevel: 'high', colorIndex: 2 },
  'hernia hiatal': { description: '', riskLevel: 'medium', colorIndex: 3 },
  'hernia ventral': { description: 'En la pared abdominal anterior', riskLevel: 'medium', colorIndex: 4 },
  'hernia epigástrica': { description: 'Entre ombligo y esternón', riskLevel: 'low', colorIndex: 5 },
  'hernia (otro tipo)': { description: 'Otros tipos de hernias menos comunes', riskLevel: 'medium', colorIndex: 6 }, // Para el fallback
};
const DEFAULT_HERNIA_TREND = 0;

/* ============================================================================
 * FUNCIONES AUXILIARES OPTIMIZADAS
 * ========================================================================== */

const categorizeHerniaType = (diagnosis?: string): string => {
  if (!diagnosis) return 'hernia (otro tipo)';
  const lower = diagnosis.toLowerCase();
  if (!lower.includes('hernia')) return 'no hernia'; // Para filtrar

  if (lower.includes('inguinal')) return 'hernia inguinal';
  if (lower.includes('umbilical')) return 'hernia umbilical';
  if (lower.includes('incisional') || lower.includes('eventración')) return 'hernia incisional'; // Incluir eventración
  if (lower.includes('hiatal') || lower.includes('hiato')) return 'hernia hiatal';
  if (lower.includes('ventral')) return 'hernia ventral';
  if (lower.includes('epigástrica')) return 'hernia epigástrica';
  if (lower.includes('femoral')) return 'hernia femoral'; // Añadir tipo común
  // Añadir más tipos si es necesario, ej: Spiegel, Lumbar, etc.
  return 'hernia (otro tipo)';
};

const RISK_BADGE_CLASSES: Readonly<Record<'low' | 'medium' | 'high', string>> = {
  low: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-500/50',
  medium: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500/50',
  high: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-500/50',
};
const getRiskBadgeClass = (level: 'low' | 'medium' | 'high'): string => RISK_BADGE_CLASSES[level] || 'text-muted-foreground bg-muted border-border';

/* ============================================================================
 * COMPONENTE PRINCIPAL MEJORADO
 * ========================================================================== */

const DiagnosisTypeDistributionComponent: FC<Props> = ({
  patients,
  className,
  showStats = true,
  showTrends = true,
  // comparisonPeriod, // No usado
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [selectedTypeName, setSelectedTypeName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 250); // Simular carga
    return () => clearTimeout(timer);
  }, [patients]); // Recalcular solo si los pacientes cambian

  // Memoización del procesamiento de datos
  const { chartData, herniaStats, colorPalette } = useMemo(() => {
    if (!patients?.length) {
      return { chartData: [], herniaStats: { totalHernias: 0, mostCommonType: 'N/A', overallRiskLevel: 'low' } as HerniaStats, colorPalette: [] };
    }

    const herniaCounts = new Map<string, number>();
    let totalAgeSum = 0;
    let patientsWithAge = 0;
    let maleHerniaCount = 0;
    let femaleHerniaCount = 0;
    let totalHerniaCases = 0;

    patients.forEach(p => {
      const herniaType = categorizeHerniaType(p.diagnostico_principal);
      if (herniaType !== 'no hernia') {
        totalHerniaCases++;
        herniaCounts.set(herniaType, (herniaCounts.get(herniaType) || 0) + 1);
        if (p.edad != null) {
          totalAgeSum += p.edad;
          patientsWithAge++;
        }
        if (p.genero === 'M') maleHerniaCount++;
        else if (p.genero === 'F') femaleHerniaCount++;
      }
    });

    if (totalHerniaCases === 0) {
      return { chartData: [], herniaStats: { totalHernias: 0, mostCommonType: 'N/A', overallRiskLevel: 'low' } as HerniaStats, colorPalette: [] };
    }

    const localChartData: Omit<HerniaTypeChartData, 'fill'>[] = Array.from(herniaCounts.entries())
      .map(([name, value]) => {
        const details = HERNIA_TYPE_DETAILS[name] || HERNIA_TYPE_DETAILS['hernia (otro tipo)'];
        return {
          name,
          value,
          percentage: Math.round((value / totalHerniaCases) * 100),
          trend: DEFAULT_HERNIA_TREND, // La tendencia real debería venir de datos históricos
          severity: details.riskLevel,
          description: details.description,
        };
      })
      .sort((a, b) => b.value - a.value);

    const palette = getChartColors('medical', localChartData.length);
    const finalChartData: HerniaTypeChartData[] = localChartData.map((item, index) => ({
      ...item,
      fill: palette[index % palette.length], // Asignar color de la paleta
    }));
    
    const riskScores = { low: 1, medium: 2, high: 3 };
    const weightedRiskSum = finalChartData.reduce((sum, item) => sum + riskScores[item.severity] * item.value, 0);
    const averageRiskScore = totalHerniaCases > 0 ? weightedRiskSum / totalHerniaCases : 1;
    const overallRisk: 'low' | 'medium' | 'high' = averageRiskScore < 1.7 ? 'low' : averageRiskScore < 2.5 ? 'medium' : 'high';

    const stats: HerniaStats = {
      totalHernias: totalHerniaCases,
      mostCommonType: finalChartData[0]?.name || 'N/A',
      overallRiskLevel: overallRisk,
      averageAge: patientsWithAge > 0 ? Math.round(totalAgeSum / patientsWithAge) : undefined,
      genderDistribution: (maleHerniaCount + femaleHerniaCount > 0) ? {
        malePercentage: Math.round((maleHerniaCount / (maleHerniaCount + femaleHerniaCount)) * 100),
        femalePercentage: Math.round((femaleHerniaCount / (maleHerniaCount + femaleHerniaCount)) * 100),
      } : undefined,
    };

    return { chartData: finalChartData, herniaStats: stats, colorPalette: palette };
  }, [patients]);


  const handleCellClickInternal = useCallback((payload: any) => { // payload de Recharts
    const data = payload as HerniaTypeChartData; // Asumir que payload es el dato del sector
    if (!data || typeof data.name !== 'string') return;
    setSelectedTypeName(prev => (prev === data.name ? null : data.name));
  }, []);

  const CustomTooltipContent: FC<TooltipProps<ValueType, NameType>> = useCallback(({ active, payload }) => {
    if (!active || !payload?.[0]?.payload) return null;
    const data = payload[0].payload as HerniaTypeChartData;

    return (
      <div
        className="p-3 rounded-lg shadow-lg border text-xs backdrop-blur-sm animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: getAdaptiveBackground(0.92),
          borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
        }}
      >
        <div className="mb-1.5 flex items-center gap-1.5 border-b border-border/50 pb-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.fill }} />
          <span className="font-semibold text-foreground text-sm capitalize">{data.name}</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between"><span>Casos:</span><span className="font-medium">{data.value} ({data.percentage}%)</span></div>
          {/* Etiqueta de riesgo eliminada */}
          {showTrends && (
            <div className="flex justify-between items-center">
              <span>Tendencia:</span>
              <span className={cn("flex items-center gap-0.5 font-medium", data.trend > 0 ? "text-red-500" : data.trend < 0 ? "text-green-500" : "text-muted-foreground")}>
                {data.trend !== 0 && (data.trend > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />)}
                {data.trend.toFixed(1)}%
              </span>
            </div>
          )}
          {data.description && <p className="pt-1 mt-1 border-t border-border/50 text-muted-foreground">{data.description}</p>}
        </div>
      </div>
    );
  }, [isDark, showTrends]);


  if (isLoading && !chartData.length) {
    return (
      <Card className={cn('shadow-md', className)}>
        <CardHeader>
          <div className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin text-primary" /><CardTitle className="text-lg">Cargando Distribución</CardTitle></div>
          <CardDescription className="text-sm">Analizando tipos de hernia...</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="w-full px-10 space-y-3"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-64 w-full rounded-full" /><Skeleton className="h-6 w-full" /></div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card className={cn('shadow-md', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5 text-primary" />Distribución de Hernias</CardTitle>
          <CardDescription className="text-sm">No se encontraron casos de hernia en los datos proporcionados.</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] flex flex-col items-center justify-center text-center">
          <AlertTriangle className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium text-muted-foreground">Sin Datos de Hernias</p>
          <p className="text-xs text-muted-foreground mt-1">Verifique los datos de pacientes o los filtros aplicados.</p>
        </CardContent>
      </Card>
    );
  }

  const renderDetailedInfo = () => {
    if (!selectedTypeName) return null;
    const selectedData = chartData.find(d => d.name === selectedTypeName);
    if (!selectedData) return null;

    interface DetailItem { label: string; value: string | number; icon?: LucideIcon; color?: string; }
    const details: DetailItem[] = [
        { label: 'Casos', value: selectedData.value },
        { label: '% del Total', value: `${selectedData.percentage}%` },
        { label: 'Tendencia', value: `${selectedData.trend.toFixed(1)}%`, icon: selectedData.trend === 0 ? undefined : (selectedData.trend > 0 ? TrendingUp : TrendingDown), color: selectedData.trend === 0 ? "text-muted-foreground" : (selectedData.trend > 0 ? "text-red-500" : "text-green-500") },
    ];

    return (
      <div className="mt-4 p-3 bg-muted/30 rounded-lg border animate-in slide-in-from-top-2 fade-in duration-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold capitalize">{selectedData.name}</h4>
          {/* Etiqueta de riesgo eliminada */}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {details.map(item => (
            <div key={item.label} className="p-1.5 rounded-md bg-background border text-center">
              <div className="text-muted-foreground mb-0.5 text-[10px] sm:text-xs">{item.label}</div>
              <div className={cn("font-semibold text-sm sm:text-base", item.color)}>
                {item.icon && <item.icon className="inline h-3 w-3 mr-0.5" />}
                {item.value}
              </div>
            </div>
          ))}
        </div>
        {selectedData.description && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <div className="flex items-start gap-1.5 text-blue-700 dark:text-blue-300">
              <Info size={14} className="mt-0.5 shrink-0" />
              <p className="text-xs">{selectedData.description}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const footerStats: {icon: LucideIcon, label: string, value: string | number}[] = [
    {icon: Users, label: "Más Común:", value: herniaStats.mostCommonType ? herniaStats.mostCommonType.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'N/A'},
    ...(herniaStats.averageAge ? [{icon: Activity, label: "Edad Promedio:", value: `${herniaStats.averageAge} años`}] : []),
    {icon: Activity, label: "Total Hernias:", value: herniaStats.totalHernias},
  ];


  return (
    <Card className={cn('shadow-md hover:shadow-lg transition-shadow duration-300 border overflow-hidden', className)}>
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
          <div>
            <CardTitle className="flex items-center gap-1.5 text-lg"><Activity className="h-4 w-4 text-primary" />Distribución de Hernias</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Análisis especializado de {herniaStats.totalHernias} casos de hernia.
            </CardDescription>
          </div>
          {/* Etiqueta de riesgo eliminada */}
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-wrap gap-1.5 mb-3 justify-center">
          {chartData.slice(0, 5).map((item, index) => ( // Mostrar hasta 5 tipos como badges clickeables
            <Badge
              key={item.name}
              variant={selectedTypeName === item.name ? "default" : "outline"}
              className={cn("px-2 py-1 text-[10px] sm:text-xs font-medium border-l-2 cursor-pointer transition-all hover:scale-105", selectedTypeName === item.name && "shadow-md")}
              style={{ borderLeftColor: item.fill }}
              onClick={() => handleCellClickInternal(item)}
            >
              <span className="capitalize">{item.name}</span>
              <span className="font-semibold ml-1.5">({item.percentage}%)</span>
              {showTrends && (
                <span className={cn("flex items-center gap-0.5 ml-1", item.trend > 0 ? "text-red-500/80" : item.trend < 0 ? "text-green-500/80" : "text-muted-foreground/80")}>
                  {item.trend !== 0 && (item.trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />)}
                  {/* {item.trend.toFixed(0)}% */}
                </span>
              )}
            </Badge>
          ))}
        </div>

        <div className={cn("h-[280px] sm:h-[320px] transition-opacity duration-300", isLoading ? "opacity-60" : "opacity-100")}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData as any[]} // Recharts puede necesitar any[]
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="90%"
                paddingAngle={chartData.length > 1 ? 1.5 : 0}
                cornerRadius={4}
                stroke={CHART_STYLES.axis.lineColor}
                strokeWidth={1}
                isAnimationActive={!isLoading}
                animationDuration={500}
                onClick={handleCellClickInternal}
                className={cn("cursor-pointer")}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={entry.fill}
                    fillOpacity={selectedTypeName && selectedTypeName !== entry.name ? 0.35 : selectedTypeName === entry.name ? 1 : 0.9}
                    stroke={selectedTypeName === entry.name ? (isDark ? '#fff' : CHART_STYLES.colors.primary) : entry.fill}
                    strokeWidth={selectedTypeName === entry.name ? 2 : 1}
                    className={cn("transition-all duration-150 hover:opacity-100", selectedTypeName === entry.name && "drop-shadow-md")}
                  />
                ))}
              </Pie>
              <RTooltip content={<CustomTooltipContent />} />
              {chartData.length > 1 && chartData.length < 8 && ( // Leyenda solo si hay pocos items
                <Legend
                  wrapperStyle={{ fontSize: '10px', paddingTop: '10px', color: CHART_STYLES.legend.color }}
                  iconType="circle" iconSize={7} verticalAlign="bottom" height={35}
                  formatter={(value, entry: any) => (
                    <span style={{ color: entry.color }} className={cn("capitalize",selectedTypeName === value && "font-bold")}>
                      {value}
                    </span>
                  )}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>
        {renderDetailedInfo()}
      </CardContent>

      {showStats && (
        <CardFooter className="bg-muted/20 border-t p-2.5 sm:p-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2 w-full">
            {footerStats.map(item => (
              <div key={item.label} className="flex items-center gap-1 text-muted-foreground">
                <item.icon className="h-3 w-3 text-primary shrink-0" />
                <span>{item.label}</span>
                <span className="font-medium text-foreground truncate ml-auto sm:ml-0">{item.value}</span>
              </div>
            ))}
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default memo(DiagnosisTypeDistributionComponent);