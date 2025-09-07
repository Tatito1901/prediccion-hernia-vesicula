'use client';

import React, { memo, useMemo } from 'react';
import { useStatistics } from '@/hooks/core/use-analytics-unified';
import { MetricsGrid, createMetric, ChartContainer } from '@/components/ui/metrics-system';

const StatisticsContent = memo(function StatisticsContent() {
  const { data, isLoading, isError, error, refetch } = useStatistics();

  const kpis = useMemo(() => [
    createMetric('Total citas', data?.derived?.totalAppointments ?? 0, { description: 'Suma por estado' }),
    createMetric('Completadas', data?.derived?.completed ?? 0, { color: 'success' }),
    createMetric('Programadas', data?.derived?.scheduled ?? 0, { color: 'info' }),
    createMetric('Canceladas', data?.derived?.canceled ?? 0, { color: 'warning' }),
    createMetric('No-show', data?.derived?.noShowRate ?? 0, { description: '% sobre total', color: 'error' }),
    createMetric('Puntualidad', data?.derived?.punctualityRate ?? 0, { description: '% de citas a tiempo', color: 'success' }),
  ], [data]);

  return (
    <div className="flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto">
        <section>
          <MetricsGrid
            metrics={kpis}
            isLoading={isLoading}
            columns={3}
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer
            title="Distribución por diagnóstico"
            description="Top diagnósticos"
            isLoading={isLoading}
            error={isError ? (error as Error) : null}
            onRefresh={() => refetch()}
          >
            {/* TODO: Replace with a specialized chart component */}
            <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-md overflow-auto">
              {JSON.stringify(data?.clinicalProfile?.diagnoses_distribution?.slice(0, 10) || [], null, 2)}
            </pre>
          </ChartContainer>

          <ChartContainer
            title="Distribución por género"
            description="Pacientes por género"
            isLoading={isLoading}
            error={isError ? (error as Error) : null}
            onRefresh={() => refetch()}
          >
            {/* TODO: Replace with a specialized chart component */}
            <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-md overflow-auto">
              {JSON.stringify(data?.demographicProfile?.gender_distribution || [], null, 2)}
            </pre>
          </ChartContainer>
        </section>
      </div>
  );
});

const StatisticsPage = memo(function StatisticsPage() {
  return <StatisticsContent />;
});

export default StatisticsPage;

