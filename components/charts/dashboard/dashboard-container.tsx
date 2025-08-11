'use client';
import React, { useMemo, useState } from 'react';
import { useDashboardCharts } from '@/hooks/use-dashboard-charts';
import { ChartWrapper } from '../common/chart-wrapper';
import { CommonDiagnosesChart } from './common-diagnoses-chart';
import { PathologyDistributionChart } from './pathology-distribution-chart';
import { DiagnosisTimelineChart } from './diagnosis-timeline-chart';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/datepicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { BarChart3, PieChart, TrendingUp, RefreshCw } from 'lucide-react';
import { format, subDays } from 'date-fns';

export const DashboardContainer: React.FC = () => {
  // Filtros: rango rápido, fechas personalizadas y Top N
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const [topN, setTopN] = useState<number>(5);

  // Calcular fechas a enviar al hook en formato YYYY-MM-DD
  const { startDateStr, endDateStr } = useMemo(() => {
    const today = new Date();
    if (range === 'custom') {
      return {
        startDateStr: customStart ? format(customStart, 'yyyy-MM-dd') : undefined,
        endDateStr: customEnd ? format(customEnd, 'yyyy-MM-dd') : undefined,
      };
    }
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const start = subDays(today, days - 1);
    return {
      startDateStr: format(start, 'yyyy-MM-dd'),
      endDateStr: format(today, 'yyyy-MM-dd'),
    };
  }, [range, customStart, customEnd]);

  const { data, isLoading, isFetching, refetch } = useDashboardCharts({
    startDate: startDateStr,
    endDate: endDateStr,
    topN,
  });

  const timelineData = data?.timelineData ?? [];
  const commonDiagnoses = data?.commonDiagnoses ?? [];
  const pathologyDistribution = data?.pathologyDistribution ?? [];

  return (
    <div className="space-y-4">
      {/* Toolbar de filtros */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border p-1 bg-background">
            <Button
              variant={range === '7d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setRange('7d')}
            >
              7 días
            </Button>
            <Button
              variant={range === '30d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setRange('30d')}
            >
              30 días
            </Button>
            <Button
              variant={range === '90d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setRange('90d')}
            >
              90 días
            </Button>
            <Button
              variant={range === 'custom' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setRange('custom')}
            >
              Personalizado
            </Button>
          </div>
          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <DatePicker
                date={customStart}
                onDateChange={setCustomStart}
                placeholder="Desde"
                className="w-[160px]"
              />
              <span className="text-muted-foreground">—</span>
              <DatePicker
                date={customEnd}
                onDateChange={setCustomEnd}
                placeholder="Hasta"
                className="w-[160px]"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-[140px]">
            <Select value={String(topN)} onValueChange={(v) => setTopN(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Top N" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="8">Top 8</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} aria-label="Actualizar">
            <RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </div>

      {/* Grilla de gráficos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartWrapper
          title="Diagnósticos Más Comunes"
          description={topN ? `Top ${topN} en el periodo seleccionado` : 'Diagnósticos en el periodo seleccionado'}
          isLoading={isLoading || isFetching}
          onRefresh={refetch}
        >
          {(!isLoading && !isFetching && commonDiagnoses.length === 0) ? (
            <EmptyState
              title="Sin datos disponibles"
              description="No se registraron diagnósticos en el periodo seleccionado."
              icon={<BarChart3 className="h-8 w-8 text-muted-foreground" />}
            />
          ) : (
            <CommonDiagnosesChart data={commonDiagnoses} />
          )}
        </ChartWrapper>

        <ChartWrapper
          title="Distribución de Patologías"
          description="Proporción por diagnóstico en el periodo seleccionado"
          isLoading={isLoading || isFetching}
          onRefresh={refetch}
        >
          {(!isLoading && !isFetching && pathologyDistribution.length === 0) ? (
            <EmptyState
              title="Sin datos disponibles"
              description="No hay distribución de patologías para el periodo."
              icon={<PieChart className="h-8 w-8 text-muted-foreground" />}
            />
          ) : (
            <PathologyDistributionChart data={pathologyDistribution} />
          )}
        </ChartWrapper>

        <div className="lg:col-span-2">
          <ChartWrapper
            title="Línea de Tiempo de Diagnósticos"
            description="Evolución diaria del periodo seleccionado"
            isLoading={isLoading || isFetching}
            onRefresh={refetch}
          >
            {(!isLoading && !isFetching && timelineData.length === 0) ? (
              <EmptyState
                title="Sin datos disponibles"
                description="No hay registros en la línea de tiempo para el periodo."
                icon={<TrendingUp className="h-8 w-8 text-muted-foreground" />}
              />
            ) : (
              <DiagnosisTimelineChart data={timelineData} />
            )}
          </ChartWrapper>
        </div>
      </div>
    </div>
  );
};
