/* -------------------------------------------------------------------------- */
/*  components/charts/diagnosis-type-distribution.tsx - OPTIMIZADO           */
/* -------------------------------------------------------------------------- */

import { memo, useMemo, FC } from 'react';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity, Info, Users, LucideIcon, 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import useChartConfig, { 
  type PatientData, 
  type GeneralStats,
  LoadingSpinner,
} from '@/components/charts/use-chart-config';

/* ============================================================================
 * TIPOS Y INTERFACES
 * ========================================================================== */

interface HerniaStats {
  totalHernias: number;
  mostCommonType: string;
  overallRiskLevel: 'low' | 'medium' | 'high';
  averageAge?: number;
  genderDistribution?: { malePercentage: number; femalePercentage: number };
}

interface Props {
  patients: ReadonlyArray<PatientData>;
  className?: string;
  showStats?: boolean;
  showTrends?: boolean;
  isLoading?: boolean;
}

/* ============================================================================
 * CONFIGURACIÓN Y CONSTANTES
 * ========================================================================== */

const HERNIA_TYPE_DETAILS: Readonly<Record<string, { 
  description: string; 
  riskLevel: 'low' | 'medium' | 'high'; 
  colorIndex: number 
}>> = {
  'hernia inguinal': { description: 'Más común en hombres adultos', riskLevel: 'medium', colorIndex: 0 },
  'hernia umbilical': { description: 'Común en bebés y mujeres post-embarazo', riskLevel: 'low', colorIndex: 1 },
  'hernia incisional': { description: 'Aparece en cicatrices quirúrgicas', riskLevel: 'high', colorIndex: 2 },
  'hernia hiatal': { description: 'En el área del diafragma', riskLevel: 'medium', colorIndex: 3 },
  'hernia ventral': { description: 'En la pared abdominal anterior', riskLevel: 'medium', colorIndex: 4 },
  'hernia epigástrica': { description: 'Entre ombligo y esternón', riskLevel: 'low', colorIndex: 5 },
  'hernia (otro tipo)': { description: 'Otros tipos de hernias menos comunes', riskLevel: 'medium', colorIndex: 6 },
};

/* ============================================================================
 * FUNCIONES AUXILIARES OPTIMIZADAS
 * ========================================================================== */

const categorizeHerniaType = (diagnosis?: string): string => {
  if (!diagnosis) return 'hernia (otro tipo)';
  const lower = diagnosis.toLowerCase();
  if (!lower.includes('hernia')) return 'no hernia';

  // Usar un array para hacer un solo recorrido
  const herniaTypes = [
    { keyword: 'inguinal', type: 'hernia inguinal' },
    { keyword: 'umbilical', type: 'hernia umbilical' },
    { keyword: 'incisional', type: 'hernia incisional' },
    { keyword: 'eventración', type: 'hernia incisional' },
    { keyword: 'hiatal', type: 'hernia hiatal' },
    { keyword: 'hiato', type: 'hernia hiatal' },
    { keyword: 'ventral', type: 'hernia ventral' },
    { keyword: 'epigástrica', type: 'hernia epigástrica' },
    { keyword: 'femoral', type: 'hernia femoral' },
  ];

  for (const { keyword, type } of herniaTypes) {
    if (lower.includes(keyword)) return type;
  }

  return 'hernia (otro tipo)';
};

/* ============================================================================
 * COMPONENTE PRINCIPAL OPTIMIZADO
 * ============================================================================ */

const DiagnosisTypeDistribution: FC<Props> = memo(({
  patients,
  className,
  showStats = true,
  isLoading = false,
}) => {
  
  const { renderPieChart } = useChartConfig({
    showLegend: true,
    showTooltip: true,
    animation: true,
    interactive: true,
  });

  // Procesamiento de datos optimizado con un solo useMemo
  const { chartData, herniaStats, generalStats } = useMemo(() => {
    if (!patients?.length) {
      return { 
        chartData: [], 
        herniaStats: { 
          totalHernias: 0, 
          mostCommonType: 'N/A', 
          overallRiskLevel: 'low' as const,
          averageAge: undefined,
          genderDistribution: undefined,
          malePercentage: 0,
          femalePercentage: 0
        },
        generalStats: {
          total: 0, attendance: 100, cancellation: 0, pending: 0, present: 0,
          completed: 0, cancelled: 0, pendingCount: 0, presentCount: 0,
          period: "Actual", allStatusCounts: {}
        }
      };
    }

    const herniaCounts = new Map<string, number>();
    let totalAgeSum = 0;
    let patientsWithAge = 0;
    let maleHerniaCount = 0;
    let femaleHerniaCount = 0;
    let totalHerniaCases = 0;

    // Un solo recorrido por todos los pacientes
    patients.forEach(p => {
      const herniaType = categorizeHerniaType(p.diagnostico_principal || p.diagnostico);
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
          overallRiskLevel: 'low' as const,
          averageAge: undefined,
          genderDistribution: undefined,
          malePercentage: 0,
          femalePercentage: 0
        },
        generalStats: {
          total: 0, attendance: 100, cancellation: 0, pending: 0, present: 0,
          completed: 0, cancelled: 0, pendingCount: 0, presentCount: 0,
          period: "Actual", allStatusCounts: {}
        }
      };
    }

    // Convertir a formato para el gráfico
    const statusChartData = Array.from(herniaCounts.entries())
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: `hsl(var(--chart-${(HERNIA_TYPE_DETAILS[name]?.colorIndex || 0) + 1}))`,
        percentage: Math.round((value / totalHerniaCases) * 100),
      }))
      .sort((a, b) => b.value - a.value);

    // Calcular nivel de riesgo general de manera optimizada
    const riskScores = { low: 1, medium: 2, high: 3 };
    let weightedRiskSum = 0;
    herniaCounts.forEach((count, name) => {
      const details = HERNIA_TYPE_DETAILS[name] || HERNIA_TYPE_DETAILS['hernia (otro tipo)'];
      weightedRiskSum += riskScores[details.riskLevel] * count;
    });
    
    const averageRiskScore = weightedRiskSum / totalHerniaCases;
    const overallRisk: 'low' | 'medium' | 'high' = 
      averageRiskScore < 1.7 ? 'low' : averageRiskScore < 2.5 ? 'medium' : 'high';

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

    const generalStatsData: GeneralStats = {
      total: totalHerniaCases,
      attendance: 100,
      cancellation: 0,
      pending: 0,
      present: 0,
      completed: totalHerniaCases,
      cancelled: 0,
      pendingCount: 0,
      presentCount: 0,
      period: "Actual",
      allStatusCounts: {
        PROGRAMADA: 0,
        CONFIRMADA: 0,
        CANCELADA: 0,
        COMPLETADA: totalHerniaCases,
        "NO ASISTIO": 0,
        PRESENTE: 0,
        REAGENDADA: 0
      }
    };

    return { chartData: statusChartData, herniaStats: stats, generalStats: generalStatsData };
  }, [patients]);

  // Estado vacío
  if (isLoading) {
    return (
      <Card className={cn('shadow-md', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-muted-foreground" />
            Distribución de Tipos de Hernia
          </CardTitle>
          <CardDescription>
            Cargando datos de diagnósticos...
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[260px] flex items-center justify-center">
          <LoadingSpinner className="[&_svg]:h-10 [&_svg]:w-10" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card className={cn('shadow-md', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-muted-foreground" />
            Distribución de Tipos de Hernia
          </CardTitle>
          <CardDescription>
            No se han encontrado datos de diagnósticos de hernias
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[260px] flex items-center justify-center">
          <p className="text-center text-muted-foreground">
            No hay suficientes datos para mostrar la distribución de tipos de hernias.
            <br />Por favor, añada pacientes con diagnósticos relacionados con hernias.
          </p>
        </CardContent>
      </Card>
    );
  }

  const footerStats: {icon: LucideIcon, label: string, value: string | number}[] = [
    {
      icon: Users, 
      label: "Más Común:", 
      value: herniaStats.mostCommonType
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
          {chartData.slice(0, 5).map((item) => (
            <Badge
              key={item.name}
              variant="outline"
              className={cn(
                "px-2 py-1 text-[10px] sm:text-xs font-medium border-l-2"
              )}
              style={{ borderLeftColor: item.color }}
            >
              <span className="capitalize">{item.name}</span>
              <span className="font-semibold ml-1.5">({item.percentage}%)</span>
            </Badge>
          ))}
        </div>

        {/* Gráfico usando el hook centralizador */}
        <div className="h-[280px] sm:h-[320px]">
          {renderPieChart(chartData, generalStats, false)}
        </div>

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
});

DiagnosisTypeDistribution.displayName = 'DiagnosisTypeDistribution';

export default DiagnosisTypeDistribution;
// Final del archivo