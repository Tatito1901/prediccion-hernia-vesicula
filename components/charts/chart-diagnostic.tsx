/* -------------------------------------------------------------------------- */
/*  components/diagnostics/chart-diagnostic.tsx                               */
/* -------------------------------------------------------------------------- */
'use client';

import type { FC, ReactNode } from 'react';
import {
  memo, Suspense, useMemo, useCallback, useState, lazy, useDeferredValue,
} from 'react';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PieChartIcon, Activity, ChartLine, TrendingUp, TrendingDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAppContext } from '@/lib/context/app-context';
import {
  Card, CardHeader, CardContent, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  PatientData, DiagnosisType,
} from '@/app/dashboard/data-model';
import { DiagnosisEnum } from '@/app/dashboard/data-model';

/* --------------------------- Tipos & Constantes --------------------------- */

export const HERNIA_CATEGORIES = [
  'Hernia Inguinal',
  'Hernia Umbilical',
  'Hernia Incisional',
  'Hernia Hiatal',
  'Hernia Inguinal Recidivante',
] as const;

export const VESICULA_CATEGORIES = [
  'Vesícula',
  'Vesícula (Colecistitis Crónica)',
  'Colelitiasis',
] as const;

type Hernia = typeof HERNIA_CATEGORIES[number];
type Vesicula = typeof VESICULA_CATEGORIES[number];

export type LocalDiagnosisCategory =
  | Hernia
  | Vesicula
  | 'Apendicitis'
  | 'Lipoma Grande'
  | 'Quiste Sebáceo Infectado'
  | 'Eventración Abdominal'
  | 'Otro';

export interface DiagnosisData {
  readonly tipo: LocalDiagnosisCategory;
  readonly cantidad: number;
}

export interface DiagnosisMetrics {
  readonly totalPacientes: number;
  readonly totalHernias: number;
  readonly totalVesicula: number;
  readonly diagnosticosMasComunes: ReadonlyArray<DiagnosisData>;
  readonly distribucionHernias: ReadonlyArray<DiagnosisData>;
  readonly porcentajeHernias: number;
  readonly porcentajeVesicula: number;
  readonly ratioHerniaVesicula: number;
}

/* ---------------------------- Lazy components ----------------------------- */

const DiagnosisChart = dynamic(() => import('@/components/charts/diagnosis-chart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px]" />,
});
const DiagnosisTimelineChart = dynamic(
  () => import('@/components/charts/diagnosis-timeline-chart'),
  { ssr: false, loading: () => <Skeleton className="h-[300px]" /> },
);

/* ---------------------------- Helper Functions ---------------------------- */

const classify = (d?: DiagnosisType | string): LocalDiagnosisCategory => {
  if (!d) return 'Otro';
  if (HERNIA_CATEGORIES.includes(d as any)) return d as Hernia;
  if (VESICULA_CATEGORIES.includes(d as any)) return 'Vesícula';
  if (d === 'Apendicitis') return 'Apendicitis';
  if (['Lipoma Grande', 'Quiste Sebáceo Infectado', 'Eventración Abdominal'].includes(d)) return d as LocalDiagnosisCategory;
  if (d === DiagnosisEnum.HERNIA_INGUINAL || d.toLowerCase().includes('hernia')) return 'Hernia Inguinal';
  return 'Otro';
};

const buildTimeline = (pts: readonly PatientData[]) => {
  const map = new Map<string, number>();
  pts.forEach(({ fecha_registro }) => {
    if (!fecha_registro) return;
    const key = new Date(fecha_registro).toLocaleDateString('es-ES');
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return [...map.entries()]
    .map(([date, cantidad]) => ({ date, cantidad }))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
};

/* -------------------------------------------------------------------------- */
/*  UI • Metric card                                                          */
/* -------------------------------------------------------------------------- */

interface MetricProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: ReactNode;
  trend: 'up' | 'down' | 'stable';
  borderColor: string;
  loading?: boolean;
}

const TrendIcon = ({ t }: { t: MetricProps['trend'] }) =>
  t === 'up' ? <TrendingUp className="h-4 w-4 text-green-500" /> :
  t === 'down' ? <TrendingDown className="h-4 w-4 text-red-500" /> : null;

const MetricCard: FC<MetricProps> = memo(({
  title, value, subtitle, icon, borderColor, trend, loading,
}) => (
  <Card className={cn('border-l-4', borderColor)}>
    {loading ? (
      <CardContent className="p-6 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    ) : (
      <CardContent className="p-6">
        <div className="flex justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-3xl font-bold">{value}</span>
              <TrendIcon t={trend} />
            </div>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <span className="bg-muted h-12 w-12 rounded-full flex items-center justify-center text-primary">
            {icon}
          </span>
        </div>
      </CardContent>
    )}
  </Card>
));
MetricCard.displayName = 'MetricCard';

/* -------------------------------------------------------------------------- */
/*  Root component                                                            */
/* -------------------------------------------------------------------------- */

const ChartDiagnostic: FC = memo(() => {
  const { patients, isLoadingPatients } = useAppContext();
  /** defer para que el cambio de pestaña no bloquee input */
  const dataDeferred = useDeferredValue(patients);

  /* --------------------------- Métricas memorizadas --------------------- */
  const metrics: DiagnosisMetrics = useMemo(() => {
    if (!dataDeferred?.length) {
      return {
        totalPacientes: 0,
        totalHernias: 0,
        totalVesicula: 0,
        diagnosticosMasComunes: [],
        distribucionHernias: [],
        porcentajeHernias: 0,
        porcentajeVesicula: 0,
        ratioHerniaVesicula: 0,
      };
    }

    const counts = new Map<LocalDiagnosisCategory, number>();
    dataDeferred.forEach(p => {
      const cat = classify(p.diagnostico);
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    });

    const total = dataDeferred.length;
    const totalH = HERNIA_CATEGORIES.reduce((s, h) => s + (counts.get(h) ?? 0), 0);
    const totalV = VESICULA_CATEGORIES.reduce((s, v) => s + (counts.get(v) ?? 0), 0)
      + (counts.get('Colelitiasis') ?? 0);

    const toArr = (c: readonly LocalDiagnosisCategory[]) =>
      c.map(tipo => ({ tipo, cantidad: counts.get(tipo) ?? 0 }))
        .filter(x => x.cantidad);

    return {
      totalPacientes: total,
      totalHernias: totalH,
      totalVesicula: totalV,
      diagnosticosMasComunes:
        [...counts.entries()]
          .map(([tipo, cantidad]) => ({ tipo, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad),
      distribucionHernias: toArr(HERNIA_CATEGORIES),
      porcentajeHernias: Math.round((totalH / total) * 100),
      porcentajeVesicula: Math.round((totalV / total) * 100),
      ratioHerniaVesicula: totalV ? +(totalH / totalV).toFixed(1) : 0,
    };
  }, [dataDeferred]);

  const timeline = useMemo(() => buildTimeline(dataDeferred), [dataDeferred]);

  /* ---------------------------- Render helpers -------------------------- */

  const proportion = [
    { label: 'Hernias', val: metrics.porcentajeHernias, color: 'bg-blue-500' },
    { label: 'Vesícula', val: metrics.porcentajeVesicula, color: 'bg-green-500' },
    { label: 'Otros', val: 100 - metrics.porcentajeHernias - metrics.porcentajeVesicula, color: 'bg-gray-400' },
  ] as const;

  /* ------------------------------- UI ----------------------------------- */

  return (
    <section className="space-y-6">
      {/* header */}
      <div className="flex items-center gap-2">
        <Activity className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold">Diagnósticos</h2>
        <span className="px-2 py-0.5 bg-muted rounded text-sm">
          {metrics.totalPacientes} pacientes
        </span>
      </div>

      {/* métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Hernias"
          value={metrics.totalHernias}
          subtitle={`${metrics.porcentajeHernias}% del total`}
          icon={<PieChartIcon className="h-6 w-6" />}
          borderColor="border-blue-500"
          trend="stable"
          loading={isLoadingPatients}
        />
        <MetricCard
          title="Vesícula"
          value={metrics.totalVesicula}
          subtitle={`${metrics.porcentajeVesicula}% del total`}
          icon={<PieChartIcon className="h-6 w-6" />}
          borderColor="border-green-500"
          trend="stable"
          loading={isLoadingPatients}
        />
        <MetricCard
          title="Ratio H:V"
          value={metrics.ratioHerniaVesicula}
          subtitle="Hernias / Vesícula"
          icon={<ChartLine className="h-6 w-6" />}
          borderColor="border-purple-500"
          trend="stable"
          loading={isLoadingPatients}
        />
      </div>

      {/* tabs */}
      <Tabs defaultValue="d" className="w-full">
        <TabsList className="grid grid-cols-2 bg-muted">
          <TabsTrigger value="d">Distribución</TabsTrigger>
          <TabsTrigger value="t">Tendencia</TabsTrigger>
        </TabsList>

        {/* Distribución */}
        <TabsContent value="d">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Distribución de diagnósticos</CardTitle>
              </CardHeader>
              <CardContent className="aspect-video">
                {isLoadingPatients
                  ? <Skeleton className="w-full h-full" />
                  : <DiagnosisChart data={metrics.diagnosticosMasComunes} />}
              </CardContent>
            </Card>

            {!!metrics.distribucionHernias.length && (
              <Card>
                <CardHeader>
                  <CardTitle>Tipos de hernia</CardTitle>
                </CardHeader>
                <CardContent className="aspect-video">
                  {isLoadingPatients
                    ? <Skeleton className="w-full h-full" />
                    : <DiagnosisChart data={metrics.distribucionHernias} />}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Proporciones */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Proporciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {proportion.map(p => (
                <div key={p.label}>
                  <div className="flex justify-between text-sm">
                    <span>{p.label}</span>
                    <span>{p.val}%</span>
                  </div>
                  <Progress value={p.val} className="h-2" color={p.color} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tendencia */}
        <TabsContent value="t">
          <Card>
            <CardHeader>
              <CardTitle>Tendencia temporal</CardTitle>
            </CardHeader>
            <CardContent className="aspect-video">
              {isLoadingPatients
                ? <Skeleton className="w-full h-full" />
                : timeline.length
                  ? <DiagnosisTimelineChart patients={dataDeferred} />
                  : <p className="text-muted-foreground text-center mt-10">Sin datos</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* footer */}
      <p className="text-right text-xs text-muted-foreground">
        Actualizado {format(new Date(), "d MMM yyyy HH:mm", { locale: es })}
      </p>
    </section>
  );
});
ChartDiagnostic.displayName = 'ChartDiagnostic';
export default ChartDiagnostic;
