'use client';

import React from 'react';
import { AppSidebar } from '@/components/navigation/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ClinicDataProvider } from '@/contexts/clinic-data-provider';
import { useAnalyticsData } from '@/hooks/use-analytics-data';
import { MetricsGrid, createMetric, ChartContainer } from '@/components/ui/metrics-system';

function StatisticsContent() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAnalyticsData();

  const kpis = [
    createMetric('Total citas', data?.derived.totalAppointments ?? 0, { description: 'Suma por estado' }),
    createMetric('Completadas', data?.derived.completed ?? 0, { color: 'success' }),
    createMetric('Programadas', data?.derived.scheduled ?? 0, { color: 'info' }),
    createMetric('Canceladas', data?.derived.canceled ?? 0, { color: 'warning' }),
    createMetric('No-show', data?.derived.noShowRate ?? 0, { description: '% sobre total', color: 'error' }),
    createMetric('Puntualidad', data?.derived.punctualityRate ?? 0, { description: '% de citas a tiempo', color: 'success' }),
  ];

  return (
    <main className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6">
      <div className="flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto">
        <section>
          <MetricsGrid
            metrics={kpis}
            isLoading={isLoading || isFetching}
            columns={3}
            title="Estadísticas unificadas"
            description={data?.meta.partial ? 'Algunas secciones no se pudieron cargar' : undefined}
            onRefresh={() => refetch()}
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
    </main>
  );
}

export default function StatisticsPage() {
  return (
    <ClinicDataProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <StatisticsContent />
        </SidebarInset>
      </SidebarProvider>
    </ClinicDataProvider>
  );
}
