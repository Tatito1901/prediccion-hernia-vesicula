/* -------------------------------------------------------------------------- */
/*  components/charts/diagnosis-type-distribution.tsx                         */
/* -------------------------------------------------------------------------- */


import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RTooltip,
} from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PatientData } from '@/app/dashboard/data-model';
import { useTheme } from 'next-themes';
import { CHART_STYLES, getChartColors } from '@/lib/chart-theme';
import { cn } from '@/lib/utils';

/* -------------------------------- Helpers -------------------------------- */

const isHernia = (d?: string) => d?.toLowerCase().includes('hernia');

/* --------------------------------- Types --------------------------------- */

interface Props {
  patients: PatientData[];
  className?: string;
}

/* ---------------------------- Main Component ----------------------------- */

export default function DiagnosisTypeDistribution({
  patients,
  className,
}: Props) {
  /* --------------------------- Theme & colors --------------------------- */
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const colors = useMemo(() => getChartColors('patients', 8), []);

  /* ---------------------------- Data memo -------------------------------- */
  const data = useMemo(() => {
    const counts = new Map<string, number>();

    patients.forEach(p => {
      if (!isHernia(p.diagnostico_principal)) return;
      const key = p.diagnostico_principal || 'Otro';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [patients]);

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  /* ---------------------- Empty-state early return ----------------------- */
  if (!data.length)
    return (
      <Card className={cn('col-span-1 md:col-span-2', className)}>
        <CardHeader>
          <CardTitle>Distribución de Hernias</CardTitle>
          <CardDescription>No hay datos registrados de hernias.</CardDescription>
        </CardHeader>
        <CardContent className="py-12 flex justify-center text-muted-foreground">
          –
        </CardContent>
      </Card>
    );

  /* ------------------------------ Render --------------------------------- */
  return (
    <Card className={cn('col-span-1 md:col-span-2', className)}>
      <CardHeader>
        <CardTitle>Distribución de Hernias</CardTitle>
        <CardDescription>
          Tipos registrados&nbsp;·&nbsp;{total} pacientes
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Badges con top-3 para visión rápida */}
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
          {data.slice(0, 3).map(({ name, value }, i) => (
            <Badge
              key={name}
              variant="outline"
              className="px-3 py-1.5 text-xs font-medium border-l-4"
              style={{ borderLeftColor: colors[i] }}
            >
              {name}: {value}
            </Badge>
          ))}
        </div>

        <div className="h-[320px] sm:h-[360px]">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={2}
                cornerRadius={4}
                stroke={isDark ? '#1f2937' : '#fff'}
                strokeWidth={1}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>

              <RTooltip
                contentStyle={CHART_STYLES.tooltip as any}
                formatter={(v: number) => [
                  `${v} pacientes (${((v / total) * 100).toFixed(1)}%)`,
                  'Total',
                ]}
              />

              <Legend
                wrapperStyle={{
                  color: CHART_STYLES.legend.color,
                  fontSize: CHART_STYLES.legend.fontSize,
                }}
                iconType="circle"
                iconSize={CHART_STYLES.legend.iconSize}
                verticalAlign="bottom"
                height={36}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
