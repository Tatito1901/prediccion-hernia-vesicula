"use client"

import React, { useState, useMemo } from 'react';
import { ClinicDataProvider, useClinic } from "@/contexts/clinic-data-provider";
import { useChartData, type AppointmentFilters } from "@/hooks/use-chart-data";
import { Users, Calendar, CalendarCheck, CalendarClock } from 'lucide-react';
import { MetricsGrid, ChartContainer, type MetricValue } from '@/components/ui/metrics-system';
import { AppointmentStatusEnum } from '@/lib/types';

const INITIAL_FILTERS: AppointmentFilters = {
  dateRange: 'month',
  patientId: undefined,
  doctorId: undefined,
  estado: 'todos',
  motiveFilter: 'all',
  statusFilter: Object.values(AppointmentStatusEnum),
  timeRange: [0, 24],
  sortBy: 'fecha_hora_cita',
  sortOrder: 'desc',
};

const EstadisticasContent = () => {
  const {
    allPatients,
    allAppointments,
    appointmentsSummary,
    isLoading,
    error,
    refetch,
  } = useClinic();

  const [filters, setFilters] = useState<AppointmentFilters>(INITIAL_FILTERS);

  const chartData = useChartData({
    patients: allPatients,
    appointments: allAppointments,
    ...filters,
  });

  const summaryMetrics: MetricValue[] = useMemo(() => [
    {
      label: "Total de Citas (Hoy)",
      value: appointmentsSummary?.today_count ?? 0,
      icon: Calendar,
      description: "Todas las citas programadas para hoy."
    },
    {
      label: "Citas Futuras",
      value: appointmentsSummary?.future_count ?? 0,
      icon: CalendarClock,
      description: "Citas programadas para los próximos días."
    },
    {
      label: "Citas Pasadas",
      value: appointmentsSummary?.past_count ?? 0,
      icon: CalendarCheck,
      description: "Citas que ya han ocurrido."
    },
    {
      label: "Pacientes Activos",
      value: allPatients.length,
      icon: Users,
      description: "Pacientes con estado activo en el sistema."
    }
  ], [appointmentsSummary, allPatients]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">Error al cargar los datos: {error.message}</p>
        <button onClick={() => refetch()} className="ml-4 p-2 border rounded">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Estadísticas de Citas</h2>
      </div>

      <MetricsGrid 
        metrics={summaryMetrics} 
        isLoading={isLoading} 
        columns={4} 
        variant="detailed"
      />

      <ChartContainer title="Análisis Detallado de Citas" isLoading={isLoading}>
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">Datos para Gráficos (WIP)</h3>
          <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(chartData, null, 2)}
          </pre>
        </div>
      </ChartContainer>
    </div>
  );
};

const EstadisticasPage = () => {
  return (
    <ClinicDataProvider>
      <EstadisticasContent />
    </ClinicDataProvider>
  );
};

export default EstadisticasPage;
