
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
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
import { Activity, HelpCircle, TrendingUp, BarChart2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from 'next-themes';
import { useMemo, useState } from 'react';
import type { PatientData } from '@/app/dashboard/data-model';
import { CHART_STYLES, getChartColors } from '@/lib/chart-theme';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  CONFIGURACIÓN                                                             */
/* -------------------------------------------------------------------------- */

const MAIN_DIAGNOSES = [
  'Hernia Inguinal',
  'Hernia Umbilical',
  'Hernia Incisional',
  'Vesícula',
  'Colelitiasis',
  'Apendicitis',
] as const;

type MainDiagnosis = (typeof MAIN_DIAGNOSES)[number] | 'Otro';

type ChartView = 'line' | 'bar';
type ChartPeriod = 'monthly' | 'quarterly';

interface ChartConfig {
  view: ChartView;
  period: ChartPeriod;
  showTrend: boolean;
  topN: number;
}

interface Props {
  patients: PatientData[];
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  HELPERS – puros e independientes                                          */
/* -------------------------------------------------------------------------- */

/**
 * Genera un identificador de trimestre en formato 'YYYY-QN'
 */
const getQuarter = (d: Date): string => `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;

/**
 * Genera un identificador de mes en formato 'YYYY-MM'
 */
const getMonthKey = (d: Date): string => `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}`;

/**
 * Formatea una clave de período para mostrarla en la UI
 */
const formatPeriodLabel = (key: string, period: ChartPeriod): string =>
  period === 'quarterly'
    ? key.split('-').reverse().join(' ')
    : new Date(key + '-01').toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });

/* -------------------------------------------------------------------------- */
/*  COMPONENTE                                                                */
/* -------------------------------------------------------------------------- */
export default function DiagnosisTimelineChart({ patients, className }: Props) {
  /* --------------------------- Tema & colores ---------------------------- */
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const baseColors = useMemo(
    () => getChartColors('diagnosis', MAIN_DIAGNOSES.length),
    []
  );

  const DIAG_COLORS: Record<MainDiagnosis, string> = useMemo(() => {
    const obj = MAIN_DIAGNOSES.reduce(
      (acc, diag, idx) => ({ ...acc, [diag]: baseColors[idx] }),
      {} as Record<MainDiagnosis, string>
    );
    obj.Otro = isDark ? '#8897B8' : '#5E6C8F';
    return obj;
  }, [baseColors, isDark]);

  /* ------------------------ Configuración de vista ----------------------- */
  const [config, setConfig] = useState<ChartConfig>({
    view: 'line',
    period: 'monthly',
    showTrend: false,
    topN: 6,
  });
  const [showHelp, setShowHelp] = useState(false);

  /**
   * Tipo para los datos procesados por período que se muestran en el gráfico
   */
  type DiagnosisPeriodData = {
    periodLabel: string;
    total: number;
  } & Record<MainDiagnosis, number>;

  /**
   * Tipo para los datos de retorno del useMemo
   */
  type ProcessedChartData = {
    chartData: DiagnosisPeriodData[];
    topDiagnoses: MainDiagnosis[];
    maxY: number;
  };

  /* ------------------ Derivar datos (heavy) con memo --------------------- */
  const { chartData, topDiagnoses, maxY } = useMemo<ProcessedChartData>(() => {
    if (!patients?.length) return { chartData: [], topDiagnoses: [], maxY: 10 };

    /* Totales globales por diagnóstico */
    const totals = new Map<MainDiagnosis, number>();
    // Inicializa todos los diagnósticos principales y 'Otro'
    [...MAIN_DIAGNOSES, 'Otro' as const].forEach(d => totals.set(d, 0));

    /* Agrupación por período */
    const grouped = new Map<string, DiagnosisPeriodData>();

    patients.forEach(p => {
      if (!p.fecha_primera_consulta) return;

      const d = new Date(p.fecha_primera_consulta);
      const key = config.period === 'quarterly' ? getQuarter(d) : getMonthKey(d);
      const diagnosis = MAIN_DIAGNOSES.includes(p.diagnostico_principal as any)
        ? (p.diagnostico_principal as MainDiagnosis)
        : 'Otro';

      if (!grouped.has(key)) {
        const baseEntry: DiagnosisPeriodData = {
          periodLabel: formatPeriodLabel(key, config.period),
          total: 0,
          ...(Object.fromEntries(
            [...MAIN_DIAGNOSES, 'Otro' as const].map(d => [d, 0])
          ) as Record<MainDiagnosis, number>),
        };
        grouped.set(key, baseEntry);
      }

      const entry = grouped.get(key)!;
      entry[diagnosis] += 1;
      entry.total += 1;
      grouped.set(key, entry);

      totals.set(diagnosis, (totals.get(diagnosis)! ?? 0) + 1);
    });

    /* Top diagnósticos globales */
    const topDiagnoses = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, config.topN)
      .map(([diag]) => diag);

    const chartData = [...grouped.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => v);

    const maxY = Math.max(...chartData.map(d => d.total)) * 1.2;

    return { chartData, topDiagnoses, maxY };
  }, [patients, config.period, config.topN]);

  /* ---------------------------- Render chart ----------------------------- */
  const Chart = config.view === 'line' ? LineChart : BarChart;
  
  /**
   * Tipo para los datos con línea de tendencia incluida
   */
  type DiagnosisTrendData = DiagnosisPeriodData & {
    trend?: number;
  };

  const trendData = useMemo<DiagnosisTrendData[]>(() => {
    if (!config.showTrend || chartData.length < 3) return chartData;
    return chartData.map((d, i, arr) => {
      const prev = arr[i - 1]?.total ?? d.total;
      const next = arr[i + 1]?.total ?? d.total;
      return { ...d, trend: Math.round((prev + d.total + next) / 3) };
    });
  }, [chartData, config.showTrend]);

  /* ----------------------------- UI -------------------------------------- */
  return (
    <Card className={cn('col-span-1 md:col-span-2', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Tendencia de Diagnósticos</CardTitle>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowHelp(true)}
                  >
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ver ayuda</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex flex-wrap gap-1">
            {/* Toggle tipo de gráfico */}
            <Button
              size="sm"
              variant={config.view === 'line' ? 'default' : 'outline'}
              onClick={() => setConfig(s => ({ ...s, view: 'line' }))}
            >
              <TrendingUp className="h-3.5 w-3.5 mr-1" /> Líneas
            </Button>
            <Button
              size="sm"
              variant={config.view === 'bar' ? 'default' : 'outline'}
              onClick={() => setConfig(s => ({ ...s, view: 'bar' }))}
            >
              <BarChart2 className="h-3.5 w-3.5 mr-1" /> Barras
            </Button>

            {/* Periodo */}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setConfig(s => ({
                  ...s,
                  period: s.period === 'monthly' ? 'quarterly' : 'monthly',
                }))
              }
            >
              {config.period === 'monthly' ? 'Mensual' : 'Trimestral'}
            </Button>

            {/* Tendencia */}
            {config.view === 'line' && (
              <Button
                size="sm"
                variant={config.showTrend ? 'default' : 'outline'}
                onClick={() => setConfig(s => ({ ...s, showTrend: !s.showTrend }))}
              >
                Tendencia
              </Button>
            )}
          </div>
        </div>

        <CardDescription>
          {config.period === 'monthly'
            ? 'Evolución mensual de diagnósticos'
            : 'Evolución trimestral de diagnósticos'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Badges top diagnósticos */}
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
          {topDiagnoses.map(d => (
            <Badge
              key={d}
              variant="outline"
              className="py-1.5 px-3 text-xs font-medium border-l-4"
              style={{ borderLeftColor: DIAG_COLORS[d] }}
            >
              {d}
            </Badge>
          ))}
        </div>

        {/* Chart container */}
        <div className="h-[300px] sm:h-[350px]">
          <ResponsiveContainer>
            <Chart
              data={trendData}
              margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
              maxBarSize={35}
            >
              <CartesianGrid
                strokeDasharray={CHART_STYLES.grid.strokeDasharray}
                stroke={CHART_STYLES.grid.stroke}
              />
              <XAxis
                dataKey="periodLabel"
                tickLine={false}
                axisLine={{ stroke: CHART_STYLES.axis.lineColor }}
                tick={{
                  fill: CHART_STYLES.axis.labelColor,
                  fontSize: CHART_STYLES.axis.labelFontSize,
                }}
              />
              <YAxis
                domain={[0, maxY]}
                tickLine={false}
                axisLine={{ stroke: CHART_STYLES.axis.lineColor }}
                tick={{
                  fill: CHART_STYLES.axis.labelColor,
                  fontSize: CHART_STYLES.axis.labelFontSize,
                }}
              />
              <RTooltip
                contentStyle={CHART_STYLES.tooltip}
                formatter={v => [`${v} pacientes`, '']}
              />
              <Legend
                wrapperStyle={{
                  color: CHART_STYLES.legend.color,
                  fontSize: CHART_STYLES.legend.fontSize,
                }}
                iconType="circle"
                iconSize={CHART_STYLES.legend.iconSize}
              />

              {config.view === 'line'
                ? topDiagnoses.map(d => (
                    <Line
                      key={d}
                      type="monotone"
                      dataKey={d}
                      stroke={DIAG_COLORS[d]}
                      strokeWidth={2}
                      dot={{ r: 3, fill: DIAG_COLORS[d] }}
                      activeDot={{ r: 5 }}
                    />
                  ))
                : topDiagnoses.map(d => (
                    <Bar
                      key={d}
                      dataKey={d}
                      fill={DIAG_COLORS[d]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}

              {config.showTrend && config.view === 'line' && (
                <Line
                  dataKey="trend"
                  name="Tendencia"
                  stroke={isDark ? '#CED4DE' : '#65789B'}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
            </Chart>
          </ResponsiveContainer>
        </div>
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground flex flex-col sm:flex-row justify-between gap-2">
        Total: {patients.length} pacientes
        {chartData.length > 0 && (
          <span>
            Período: {chartData[0].periodLabel} –{' '}
            {chartData[chartData.length - 1].periodLabel}
          </span>
        )}
      </CardFooter>

      {/* Diálogo de ayuda */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Cómo interpretar la gráfica
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <p>
              Esta gráfica muestra la evolución de los diagnósticos principales
              en su clínica. Use la vista de <strong>barras</strong> para
              comparar volúmenes y la vista de <strong>líneas</strong> para
              analizar tendencias.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Cambie entre vista <em>mensual</em> y <em>trimestral</em> para distintos niveles de detalle.</li>
              <li>Active “Tendencia” para suavizar fluctuaciones temporales.</li>
              <li>Los colores siguen la misma paleta en todo el sistema.</li>
            </ul>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowHelp(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
