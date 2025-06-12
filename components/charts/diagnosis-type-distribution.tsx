/* -------------------------------------------------------------------------- */
/*  components/charts/diagnosis-type-distribution.tsx                         */
/*  🎯 Distribución especializada de hernias simplificada                    */
/* -------------------------------------------------------------------------- */

import { memo, useMemo, useCallback, useState, useEffect, FC } from 'react';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Activity, TrendingUp, TrendingDown, AlertTriangle, Info,
  Users, Loader2, LucideIcon, 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import useChartConfig, { type StatusChartData } from '@/components/charts/use-chart-config';

/* ============================================================================
 * TIPOS Y INTERFACES
 * ========================================================================== */

export interface PatientDataInput {
  id: string;
  diagnostico_principal?: string;
  fecha_registro?: string;
  edad?: number;
  genero?: 'M' | 'F';
}

interface HerniaTypeChartData {
  name: string;
  value: number;
  percentage: number;
  trend: number;
  severity: 'low' | 'medium' | 'high';
  description?: string;
  fill: string;
}

interface HerniaStats {
  totalHernias: number;
  mostCommonType: string;
  overallRiskLevel: 'low' | 'medium' | 'high';
  averageAge?: number;
  genderDistribution?: { malePercentage: number; femalePercentage: number };
}

interface Props {
  patients: ReadonlyArray<PatientDataInput>;
  className?: string;
  showStats?: boolean;
  showTrends?: boolean;
}

/* ============================================================================
 * CONFIGURACIÓN Y CONSTANTES
 * ========================================================================== */

const HERNIA_TYPE_DETAILS: Readonly<Record<string, { description: string; riskLevel: 'low' | 'medium' | 'high'; colorIndex: number }>> = {
  'hernia inguinal': { description: 'Más común en hombres adultos', riskLevel: 'medium', colorIndex: 0 },
  'hernia umbilical': { description: 'Común en bebés y mujeres post-embarazo', riskLevel: 'low', colorIndex: 1 },
  'hernia incisional': { description: 'Aparece en cicatrices quirúrgicas', riskLevel: 'high', colorIndex: 2 },
  'hernia hiatal': { description: 'En el área del diafragma', riskLevel: 'medium', colorIndex: 3 },
  'hernia ventral': { description: 'En la pared abdominal anterior', riskLevel: 'medium', colorIndex: 4 },
  'hernia epigástrica': { description: 'Entre ombligo y esternón', riskLevel: 'low', colorIndex: 5 },
  'hernia (otro tipo)': { description: 'Otros tipos de hernias menos comunes', riskLevel: 'medium', colorIndex: 6 },
};

const DEFAULT_HERNIA_TREND = 0;

/* ============================================================================
 * FUNCIONES AUXILIARES
 * ========================================================================== */

const categorizeHerniaType = (diagnosis?: string): string => {
  if (!diagnosis) return 'hernia (otro tipo)';
  const lower = diagnosis.toLowerCase();
  if (!lower.includes('hernia')) return 'no hernia';

  if (lower.includes('inguinal')) return 'hernia inguinal';
  if (lower.includes('umbilical')) return 'hernia umbilical';
  if (lower.includes('incisional') || lower.includes('eventración')) return 'hernia incisional';
  if (lower.includes('hiatal') || lower.includes('hiato')) return 'hernia hiatal';
  if (lower.includes('ventral')) return 'hernia ventral';
  if (lower.includes('epigástrica')) return 'hernia epigástrica';
  if (lower.includes('femoral')) return 'hernia femoral';
  return 'hernia (otro tipo)';
};

/* ============================================================================
 * COMPONENTE PRINCIPAL SIMPLIFICADO
 * ========================================================================== */

const DiagnosisTypeDistribution: FC<Props> = ({
  patients,
  className,
  showStats = true,
  showTrends = true,
}) => {
  
  const [selectedTypeName, setSelectedTypeName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Usar el hook centralizador para el renderizado
  const { renderPieChart } = useChartConfig({
    showLegend: true,
    showTooltip: true,
    animation: true,
    interactive: true,
  });

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 250);
    return () => clearTimeout(timer);
  }, [patients]);

  // Procesamiento de datos memoizado
  const { chartData, herniaStats } = useMemo(() => {
    if (!patients?.length) {
      return { 
        chartData: [], 
        herniaStats: { 
          totalHernias: 0, 
          mostCommonType: 'N/A', 
          overallRiskLevel: 'low' as const 
        } 
      };
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
      return { 
        chartData: [], 
        herniaStats: { 
          totalHernias: 0, 
          mostCommonType: 'N/A', 
          overallRiskLevel: 'low' as const 
        } 
      };
    }

    // Convertir a formato para el hook centralizador
    const statusChartData: StatusChartData[] = Array.from(herniaCounts.entries())
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: `hsl(var(--chart-${(HERNIA_TYPE_DETAILS[name]?.colorIndex || 0) + 1}))`,
        percentage: Math.round((value / totalHerniaCases) * 100),
      }))
      .sort((a, b) => b.value - a.value);

    const riskScores = { low: 1, medium: 2, high: 3 };
    const weightedRiskSum = Array.from(herniaCounts.entries()).reduce((sum, [name, count]) => {
      const details = HERNIA_TYPE_DETAILS[name] || HERNIA_TYPE_DETAILS['hernia (otro tipo)'];
      return sum + riskScores[details.riskLevel] * count;
    }, 0);
    const averageRiskScore = totalHerniaCases > 0 ? weightedRiskSum / totalHerniaCases : 1;
    const overallRisk: 'low' | 'medium' | 'high' = averageRiskScore < 1.7 ? 'low' : averageRiskScore < 2.5 ? 'medium' : 'high';

    const stats: HerniaStats = {
      totalHernias: totalHerniaCases,
      mostCommonType: statusChartData[0]?.name || 'N/A',
      overallRiskLevel: overallRisk,
      averageAge: patientsWithAge > 0 ? Math.round(totalAgeSum / patientsWithAge) : undefined,
      genderDistribution: (maleHerniaCount + femaleHerniaCount > 0) ? {
        malePercentage: Math.round((maleHerniaCount / (maleHerniaCount + femaleHerniaCount)) * 100),
        femalePercentage: Math.round((femaleHerniaCount / (maleHerniaCount + femaleHerniaCount)) * 100),
      } : undefined,
    };

    return { chartData: statusChartData, herniaStats: stats };
  }, [patients]);

  const handleCellClick = useCallback((payload: any) => {
    if (!payload || typeof payload.name !== 'string') return;
    setSelectedTypeName(prev => (prev === payload.name ? null : payload.name));
  }, []);

  // Estado de carga
  if (isLoading && !chartData.length) {
    return (
      <Card className={cn('shadow-md', className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <CardTitle className="text-lg">Cargando Distribución</CardTitle>
          </div>
          <CardDescription className="text-sm">Analizando tipos de hernia...</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="w-full px-10 space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-64 w-full rounded-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Estado vacío
  if (!chartData.length) {
    return (
      <Card className={cn('shadow-md', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Distribución de Hernias
          </CardTitle>
          <CardDescription className="text-sm">
            No se encontraron casos de hernia en los datos proporcionados.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] flex flex-col items-center justify-center text-center">
          <AlertTriangle className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium text-muted-foreground">Sin Datos de Hernias</p>
          <p className="text-xs text-muted-foreground mt-1">
            Verifique los datos de pacientes o los filtros aplicados.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Generar estadísticas mock para el hook
  const generalStats = {
    total: herniaStats.totalHernias,
    attendance: 100,
    cancellation: 0,
    pending: 0,
    present: 0,
    completed: herniaStats.totalHernias,
    cancelled: 0,
    pendingCount: 0,
    presentCount: 0,
    period: "Actual",
    allStatusCounts: {}
  };

  const renderDetailedInfo = () => {
    if (!selectedTypeName) return null;
    const selectedData = chartData.find(d => d.name === selectedTypeName);
    if (!selectedData) return null;

    const originalName = selectedData.name.toLowerCase();
    const details = HERNIA_TYPE_DETAILS[originalName] || HERNIA_TYPE_DETAILS['hernia (otro tipo)'];

    const detailItems: { label: string; value: string | number; icon?: LucideIcon; color?: string; }[] = [
      { label: 'Casos', value: selectedData.value },
      { label: '% del Total', value: `${selectedData.percentage}%` },
      { label: 'Tendencia', value: `${DEFAULT_HERNIA_TREND.toFixed(1)}%`, icon: undefined, color: "text-muted-foreground" },
    ];

    return (
      <div className="mt-4 p-3 bg-muted/30 rounded-lg border animate-in slide-in-from-top-2 fade-in duration-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold capitalize">{selectedData.name}</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {detailItems.map(item => (
            <div key={item.label} className="p-1.5 rounded-md bg-background border text-center">
              <div className="text-muted-foreground mb-0.5 text-[10px] sm:text-xs">{item.label}</div>
              <div className={cn("font-semibold text-sm sm:text-base", item.color)}>
                {item.icon && <item.icon className="inline h-3 w-3 mr-0.5" />}
                {item.value}
              </div>
            </div>
          ))}
        </div>
        {details.description && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <div className="flex items-start gap-1.5 text-blue-700 dark:text-blue-300">
              <Info size={14} className="mt-0.5 shrink-0" />
              <p className="text-xs">{details.description}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const footerStats: {icon: LucideIcon, label: string, value: string | number}[] = [
    {
      icon: Users, 
      label: "Más Común:", 
      value: herniaStats.mostCommonType ? 
        herniaStats.mostCommonType.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 
        'N/A'
    },
    ...(herniaStats.averageAge ? [{
      icon: Activity, 
      label: "Edad Promedio:", 
      value: `${herniaStats.averageAge} años`
    }] : []),
    {
      icon: Activity, 
      label: "Total Hernias:", 
      value: herniaStats.totalHernias
    },
  ];

  return (
    <Card className={cn('shadow-md hover:shadow-lg transition-shadow duration-300 border overflow-hidden', className)}>
      
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
          <div>
            <CardTitle className="flex items-center gap-1.5 text-lg">
              <Activity className="h-4 w-4 text-primary" />
              Distribución de Hernias
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Análisis especializado de {herniaStats.totalHernias} casos de hernia.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4">
        
        {/* Badges de tipos principales */}
        <div className="flex flex-wrap gap-1.5 mb-3 justify-center">
          {chartData.slice(0, 5).map((item, index) => (
            <Badge
              key={item.name}
              variant={selectedTypeName === item.name ? "default" : "outline"}
              className={cn(
                "px-2 py-1 text-[10px] sm:text-xs font-medium border-l-2 cursor-pointer transition-all hover:scale-105", 
                selectedTypeName === item.name && "shadow-md"
              )}
              style={{ borderLeftColor: item.color }}
              onClick={() => handleCellClick(item)}
            >
              <span className="capitalize">{item.name}</span>
              <span className="font-semibold ml-1.5">({item.percentage}%)</span>
              {showTrends && (
                <span className="flex items-center gap-0.5 ml-1 text-muted-foreground/80">
                  {/* Tendencia visual placeholder */}
                </span>
              )}
            </Badge>
          ))}
        </div>

        {/* Gráfico usando el hook centralizador */}
        <div className={cn("h-[280px] sm:h-[320px] transition-opacity duration-300", isLoading ? "opacity-60" : "opacity-100")}>
          {renderPieChart(chartData, generalStats, false)}
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

export default memo(DiagnosisTypeDistribution);