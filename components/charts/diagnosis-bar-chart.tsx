/* -------------------------------------------------------------------------- */
/*  components/charts/diagnosis-bar-chart.tsx                                 */
/* -------------------------------------------------------------------------- */


import {
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
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import type { ClinicMetrics } from '@/app/dashboard/data-model';
import { useMemo } from 'react';
import { CHART_STYLES, getChartColors } from '@/lib/chart-theme';
import { useTheme } from 'next-themes';

interface Props {
  metrics: Pick<ClinicMetrics, 'diagnosticosMasComunes'>;
  className?: string;
}

/* -------------------------------- Helpers -------------------------------- */

const getGroupColor = (label: string, palette: readonly string[]) => {
  if (label.toLowerCase().includes('hernia')) return palette[0]; // azul
  if (label.toLowerCase().includes('vesícul')) return palette[1]; // verde
  return palette[2]; // “otros”
};

/* ------------------------------ Component --------------------------------- */

export default function DiagnosisBarChart({ metrics, className }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  /* -------------------------- Datos *useMemo* ---------------------------- */
  const { data, maxY, colors } = useMemo(() => {
    const raw = metrics.diagnosticosMasComunes ?? [];

    const palette = getChartColors('diagnosis', 3);
    const dataset = raw.map(d => ({
      name: d.tipo,
      value: d.cantidad,
      fill: getGroupColor(d.tipo, palette),
    }));

    const peak = Math.max(10, ...dataset.map(d => d.value)) * 1.2;

    return { data: dataset, maxY: peak, colors: palette };
  }, [metrics]);

  /* ---------------------------- Empty state ------------------------------ */
  if (!data.length)
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Diagnósticos por cantidad</CardTitle>
          <CardDescription>No hay datos suficientes.</CardDescription>
        </CardHeader>
      </Card>
    );

  /* ---------------------------------------------------------------------- */
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Diagnósticos por cantidad</CardTitle>
        <CardDescription>
          Top {data.length} diagnósticos (pacientes)
        </CardDescription>
      </CardHeader>

      <CardContent className="h-[320px] sm:h-[360px]">
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 10, bottom: 50 }}
            maxBarSize={50}
          >
            <CartesianGrid
              strokeDasharray={CHART_STYLES.grid.strokeDasharray}
              stroke={CHART_STYLES.grid.stroke}
              vertical={false}
            />

            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              angle={data.length > 6 ? -35 : 0}
              textAnchor={data.length > 6 ? 'end' : 'middle'}
              height={data.length > 6 ? 60 : 30}
              interval={0}
            />

            <YAxis
              domain={[0, maxY]}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />

            <RTooltip
              formatter={(v: number) => [`${v} pacientes`, 'Cantidad']}
              contentStyle={CHART_STYLES.tooltip as any}
              cursor={{ fill: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }}
            />

            <Legend
              wrapperStyle={{
                color: CHART_STYLES.legend.color,
                fontSize: CHART_STYLES.legend.fontSize,
              }}
              iconType="square"
              iconSize={CHART_STYLES.legend.iconSize}
            />

            {data.map(d => (
              <Bar
                key={d.name}
                dataKey="value"
                name={d.name}
                fill={d.fill}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
