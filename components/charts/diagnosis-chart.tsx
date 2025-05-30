/* -------------------------------------------------------------------------- */
/*  components/charts/diagnosis-chart.tsx                                     */
/* -------------------------------------------------------------------------- */


import { useMemo, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  Legend,
} from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { useTheme } from 'next-themes';
import { CHART_STYLES, getChartColors } from '@/lib/chart-theme';

export interface DiagnosisData {
  tipo: string;
  cantidad: number;
}

interface Props {
  data: readonly DiagnosisData[];
  title?: string;
  description?: string;
  className?: string;
}

/* -------------------------------- Helpers -------------------------------- */

const ABBR = (s: string, n = 14) => (s.length > n ? `${s.slice(0, n)}…` : s);
const isHernia = (t: string) => t.toLowerCase().includes('hernia');
const isVesicula = (t: string) =>
  t.toLowerCase().includes('vesícul') || t.toLowerCase().includes('colelit');

/* ------------------------------ Component --------------------------------- */

export default function DiagnosisChart({
  data,
  title = 'Distribución de diagnósticos',
  description = 'Desglose por tipo',
  className,
}: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  /* ------------------------ Data + colores memo ------------------------- */
  const { processed, total, palette } = useMemo(() => {
    if (!data?.length) return { processed: [], total: 0, palette: [] };

    const all = [...data].sort((a, b) => b.cantidad - a.cantidad);
    const sum = all.reduce((s, d) => s + d.cantidad, 0);

    const trimmed =
      all.length > 6
        ? [
            ...all.slice(0, 5),
            {
              tipo: 'Otros diagnósticos',
              cantidad: all.slice(5).reduce((s, d) => s + d.cantidad, 0),
            },
          ]
        : all;

    const palette = getChartColors('diagnosis', 6);

    /** map tipo → color fijo según familia, o color rotativo */
    const colorFor = (t: string, idx: number) => {
      if (isHernia(t)) return palette[0]; // azul
      if (isVesicula(t)) return palette[1]; // verde
      if (t.toLowerCase().includes('apend')) return palette[2]; // rojo
      return palette[(idx + 2) % palette.length]; // resto
    };

    return {
      processed: trimmed.map((d, i) => ({
        ...d,
        porcentaje: Math.round((d.cantidad / sum) * 100),
        fill: colorFor(d.tipo, i),
      })),
      total: sum,
      palette,
    };
  }, [data]);

  /* ----------------------- Tooltip Component ---------------------------- */
  const Tooltip = useCallback(
    ({ active, payload }: any) => {
      if (!active || !payload?.[0]) return null;
      const d = payload[0].payload;
      return (
        <div
          style={{
            ...CHART_STYLES.tooltip,
            backgroundColor: isDark ? '#1f2937' : '#fff',
          }}
        >
          <p className="font-medium">{d.tipo}</p>
          <p>{d.cantidad} pacientes</p>
          <p>{d.porcentaje}%</p>
        </div>
      );
    },
    [isDark]
  );

  /* ----------------------------- Empty ---------------------------------- */
  if (!processed.length)
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[220px] text-muted-foreground">
          Sin datos disponibles
        </CardContent>
      </Card>
    );

  /* ----------------------------- Chart ---------------------------------- */
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description} · {total} pacientes
        </CardDescription>
      </CardHeader>

      <CardContent className="h-[240px] sm:h-[280px]">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={processed}
              dataKey="cantidad"
              nameKey="tipo"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={2}
              cornerRadius={4}
              animationDuration={700}
              label={({ tipo, porcentaje }) => `${ABBR(tipo)} ${porcentaje}%`}
            >
              {processed.map((d, i) => (
                <Cell
                  key={d.tipo}
                  fill={d.fill}
                  stroke={isDark ? '#1f2937' : '#fff'}
                />
              ))}
            </Pie>

            <RTooltip content={Tooltip} />

            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{
                fontSize: CHART_STYLES.legend.fontSize,
                color: CHART_STYLES.legend.color,
                paddingLeft: 8,
              }}
              iconType="circle"
              iconSize={CHART_STYLES.legend.iconSize}
              formatter={(value: string) => {
                const item = processed.find(p => p.tipo === value);
                return `${ABBR(value, 18)} ${item ? `(${item.porcentaje}%)` : ''}`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
