"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useClinicData, useClinicAnalytics } from '@/hooks/core/use-clinic-data-simplified';
import { useStatistics, useSurveyAnalytics } from '@/hooks/core/use-analytics-unified';
import { Users, Calendar, CalendarCheck, CalendarClock, TrendingUp, Activity, ChartBar, PieChart, AlertCircle } from 'lucide-react';
import { MetricsGrid, ChartContainer, type MetricValue, createMetric } from '@/components/ui/metrics-system';
import { AppointmentStatusEnum } from '@/lib/types';
import { GenericLineChart } from '@/components/charts/common/generic-line-chart';
import { GenericBarChart } from '@/components/charts/common/generic-bar-chart';
import { GenericPieChart } from '@/components/charts/common/generic-pie-chart';

interface Filters {
  dateRange: 'day' | 'month' | 'year';
  startDate?: Date;
  endDate?: Date;
}

const INITIAL_FILTERS: Filters = {
  dateRange: 'month'
};

const EstadisticasContent = () => {
  // Usar los nuevos hooks unificados
  const clinicData = useClinicData();
  const { analytics, chartData } = useClinicAnalytics({ 
    groupBy: 'month' 
  });
  const statisticsQuery = useStatistics();
  
  // Extraer datos necesarios
  const allPatients = clinicData.patients.paginated;
  const allAppointments = clinicData.appointments.all;
  const appointments = clinicData.appointments.classified;
  const isLoading = clinicData.isLoading || statisticsQuery.isLoading;
  const error = clinicData.error || statisticsQuery.error;
  const refetch = clinicData.refetch.all;


  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [activeSection, setActiveSection] = useState<'overview' | 'appointments' | 'surveys'>('overview');

  // Seleccionar datos de gráfico basados en el filtro actual
  const currentChartData = useMemo(() => {
    // Usar chartData directamente según el filtro de rango
    switch (filters.dateRange) {
      case 'day':
        return chartData.daily;
      case 'year':
        return chartData.yearly;
      default:
        return chartData.monthly;
    }
  }, [chartData, filters.dateRange]);

  // Analíticas de encuestas
  const surveyQuery = useSurveyAnalytics({ groupBy: 'month' });
  const survey = surveyQuery.data;

  // Usar datos centralizados de citas
  const appointmentStats = useMemo(() => {
    const totalCount = allAppointments.length;
    const todayCount = appointments?.today?.length || 0;
    const futureCount = appointments?.future?.length || 0;
    const pastCount = appointments?.past?.length || 0;
    
    const completed = allAppointments.filter(
      (apt: any) => apt.estado_cita === AppointmentStatusEnum.COMPLETADA
    ).length;
    const cancelled = allAppointments.filter(
      (apt: any) => apt.estado_cita === AppointmentStatusEnum.CANCELADA
    ).length;
    
    return {
      todayCount,
      futureCount,
      pastCount,
      totalCount,
      completed,
      cancelled,
      completedRate: totalCount > 0 ? Math.round((completed / totalCount) * 100) : 0,
      cancelledRate: totalCount > 0 ? Math.round((cancelled / totalCount) * 100) : 0
    };
  }, [allAppointments, appointments]);

  // Datos derivados para gráficos desde la fuente centralizada
  const lineChartData = useMemo(() => {
    const series = currentChartData.series?.[0]?.data || [];
    const categories = currentChartData.categories || [];
    return categories.map((label: string, i: number) => ({ date: label, count: Number(series[i] ?? 0) }));
  }, [currentChartData]);

  const statusDistribution = useMemo(() => {
    if (!allAppointments?.length) return [] as { name: string; value: number }[];
    const map = new Map<string, number>();
    for (const apt of allAppointments) {
      const a = apt as any;
      const key = String(a.estado_cita || a.estado || 'desconocido');
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [allAppointments]);

  const hourlyDistribution = useMemo(() => {
    if (!allAppointments?.length) return [] as { hour: string; count: number }[];
    const buckets = new Array(24).fill(0);
    for (const apt of allAppointments) {
      const d = new Date(apt.fecha_hora_cita);
      const h = d.getHours();
      if (!Number.isNaN(h)) buckets[h]++;
    }
    return buckets.map((count, h) => ({ hour: `${String(h).padStart(2, '0')}:00`, count }));
  }, [allAppointments]);

  const weeklyDistribution = useMemo(() => {
    if (!allAppointments?.length) return [] as { day: string; count: number }[];
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const buckets = new Array(7).fill(0);
    for (const apt of allAppointments) {
      const d = new Date(apt.fecha_hora_cita);
      const w = d.getDay();
      if (!Number.isNaN(w)) buckets[w]++;
    }
    return buckets.map((count, i) => ({ day: days[i], count }));
  }, [allAppointments]);

  const motivesDistribution = useMemo(() => {
    if (!allAppointments?.length) return [] as { name: string; value: number }[];
    const map = new Map<string, number>();
    for (const apt of allAppointments) {
      const motivos: string[] = (apt as any).motivos_consulta || [];
      motivos.forEach((m) => {
        const key = String(m || 'Sin especificar');
        map.set(key, (map.get(key) || 0) + 1);
      });
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [allAppointments]);

  // Métricas principales del dashboard
  const overviewMetrics: MetricValue[] = useMemo(() => [
    {
      label: "Citas Hoy",
      value: appointmentStats.todayCount,
      icon: Calendar,
      description: "Citas programadas para hoy",
      trend: appointmentStats.todayCount > 0 ? "up" : "neutral",
      trendValue: `${appointmentStats.todayCount} activas`
    },
    {
      label: "Próximas Citas",
      value: appointmentStats.futureCount,
      icon: CalendarClock,
      description: "Citas futuras programadas",
      trend: appointmentStats.futureCount > 10 ? "up" : "down",
      trendValue: "próximos días"
    },
    {
      label: "Tasa de Completado",
      value: `${appointmentStats.completedRate}%`,
      icon: CalendarCheck,
      description: "Citas completadas exitosamente",
      trend: appointmentStats.completedRate > 75 ? "up" : "down",
      trendValue: `${appointmentStats.completed} completadas`
    },
    {
      label: "Pacientes Activos",
      value: allPatients.length,
      icon: Users,
      description: "Total de pacientes registrados",
      trend: "up",
      trendValue: "en el sistema"
    }
  ], [appointmentStats, allPatients.length]);

  // KPIs from backend analytics (RPC-derived)
  const backendKpis = useMemo(() => {
    const data = statisticsQuery.data;
    return [
      createMetric('Total citas (RPC)', data?.derived?.totalAppointments ?? 0, { description: 'Suma por estado', color: 'info' }),
      createMetric('Completadas (RPC)', data?.derived?.completed ?? 0, { color: 'success' }),
      createMetric('Programadas (RPC)', data?.derived?.scheduled ?? 0, { color: 'info' }),
      createMetric('Canceladas (RPC)', data?.derived?.canceled ?? 0, { color: 'warning' }),
      createMetric('No-show (RPC)', data?.derived?.noShowRate ?? 0, { description: '% sobre total', color: 'error' }),
      createMetric('Puntualidad (RPC)', data?.derived?.punctualityRate ?? 0, { description: '% a tiempo', color: 'success' }),
    ];
  }, [statisticsQuery.data]);

  // Métricas de encuestas
  const surveyMetrics: MetricValue[] = useMemo(() => [
    {
      label: 'Total Respuestas',
      value: survey?.summary.responses_count ?? 0,
      icon: Activity,
      description: 'Encuestas completadas',
      trend: ((survey?.summary?.responses_count ?? 0) > 0) ? "up" : "neutral"
    },
    {
      label: 'Dolor Promedio',
      value: survey?.summary.avg_pain ? `${Number(survey.summary.avg_pain).toFixed(1)}/10` : '—',
      icon: TrendingUp,
      description: 'Escala de dolor reportada',
      trend: (Number(survey?.summary?.avg_pain ?? 0) > 5) ? "down" : "up"
    },
    {
      label: 'Con Diagnóstico',
      value: `${Math.round(((survey?.summary?.prev_diagnosis_rate ?? 0) * 100))}%`,
      icon: ChartBar,
      description: 'Pacientes con diagnóstico previo'
    },
    {
      label: 'Tasa de Respuesta',
      value: allPatients.length > 0 
        ? `${Math.round((((survey?.summary?.responses_count ?? 0) / allPatients.length) * 100))}%` 
        : '—',
      icon: PieChart,
      description: 'Participación en encuestas'
    },
  ], [survey, allPatients.length]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-red-500 text-center">Error al cargar los datos: {error.message}</p>
        <button 
          onClick={() => refetch()} 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      {/* Header con navegación */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Panel de Estadísticas</h1>
            <p className="text-muted-foreground mt-1">
              Monitoreo en tiempo real de citas y encuestas
            </p>
          </div>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <span className="text-sm text-muted-foreground">
              Última actualización: {new Date().toLocaleTimeString('es-MX')}
            </span>
          </div>
        </div>

        {/* Tabs de navegación */}
        <div className="border-b">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveSection('overview')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSection === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Vista General
            </button>
            <button
              onClick={() => setActiveSection('appointments')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSection === 'appointments'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Análisis de Citas
            </button>
            <button
              onClick={() => setActiveSection('surveys')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSection === 'surveys'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Encuestas de Salud
            </button>
          </nav>
        </div>
      </div>

      {/* Contenido según la sección activa */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Métricas principales */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Resumen General</h2>
            <MetricsGrid 
              metrics={overviewMetrics} 
              isLoading={isLoading} 
              columns={4} 
              variant="detailed"
            />
          </div>

          {/* KPIs del backend (RPC) */}
          <div>
            <h2 className="text-lg font-semibold mb-4">KPIs del Backend (RPC)</h2>
            <MetricsGrid
              metrics={backendKpis}
              isLoading={statisticsQuery.isLoading}
              columns={3}
              variant="detailed"
            />
          </div>

          {/* Vista rápida de gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer 
              title="Tendencia de Citas (Últimos 30 días)" 
              isLoading={isLoading}
            >
              {lineChartData.length > 0 ? (
                <GenericLineChart 
                  data={lineChartData}
                  xAxisKey="date"
                  yAxisKey="count"
                  lineColor="#6366f1"
                  gradient
                  area
                  showTrend
                />
              ) : (
                <div className="flex items-center justify-center h-48">
                  <p className="text-sm text-muted-foreground">
                    Sin datos suficientes para mostrar tendencias
                  </p>
                </div>
              )}
            </ChartContainer>

            <ChartContainer 
              title="Estado de Citas" 
              isLoading={isLoading}
            >
              {statusDistribution.length > 0 ? (
                <GenericPieChart 
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  colors={["#10b981", "#f59e0b", "#ef4444", "#6366f1"]}
                  donut
                />
              ) : (
                <div className="flex items-center justify-center h-48">
                  <p className="text-sm text-muted-foreground">
                    Sin datos de estado disponibles
                  </p>
                </div>
              )}
            </ChartContainer>
          </div>

          {/* Gráficos basados en backend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer
              title="Distribución por género (RPC)"
              description="Pacientes por género"
              isLoading={statisticsQuery.isLoading}
              error={statisticsQuery.isError ? (statisticsQuery.error as Error) : null}
              onRefresh={statisticsQuery.refetch}
            >
              {Array.isArray(statisticsQuery.data?.demographicProfile?.gender_distribution) && statisticsQuery.data?.demographicProfile?.gender_distribution?.length ? (
                <GenericPieChart
                  data={(statisticsQuery.data.demographicProfile.gender_distribution as any[]).map((d: any) => ({ name: d.label, value: d.count }))}
                  dataKey="value"
                  nameKey="name"
                  donut
                  colors={["#10b981", "#6366f1", "#f59e0b"]}
                />
              ) : (
                <div className="flex items-center justify-center h-48">
                  <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
                </div>
              )}
            </ChartContainer>

            <ChartContainer
              title="Top diagnósticos (RPC)"
              description="Principales diagnósticos clínicos"
              isLoading={statisticsQuery.isLoading}
              error={statisticsQuery.isError ? (statisticsQuery.error as Error) : null}
              onRefresh={statisticsQuery.refetch}
            >
              {Array.isArray(statisticsQuery.data?.clinicalProfile?.diagnoses_distribution) && statisticsQuery.data?.clinicalProfile?.diagnoses_distribution?.length ? (
                <GenericBarChart
                  data={(statisticsQuery.data.clinicalProfile.diagnoses_distribution as any[]).map((d: any) => ({ name: d.label, count: d.count }))}
                  xAxisKey="name"
                  yAxisKey="count"
                  colors={["#3b82f6"]}
                  gradient
                />
              ) : (
                <div className="flex items-center justify-center h-48">
                  <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
                </div>
              )}
            </ChartContainer>

            <ChartContainer
              title="Citas por estado (RPC)"
              description="Distribución operacional"
              isLoading={statisticsQuery.isLoading}
              error={statisticsQuery.isError ? (statisticsQuery.error as Error) : null}
              onRefresh={statisticsQuery.refetch}
            >
              {Array.isArray(statisticsQuery.data?.operationalMetrics?.appointments_by_status) && statisticsQuery.data?.operationalMetrics?.appointments_by_status?.length ? (
                <GenericPieChart
                  data={(statisticsQuery.data.operationalMetrics.appointments_by_status as any[]).map((d: any) => ({ name: d.status || 'N/A', value: d.count || 0 }))}
                  dataKey="value"
                  nameKey="name"
                  donut
                  colors={["#10b981", "#f59e0b", "#ef4444", "#6366f1"]}
                />
              ) : (
                <div className="flex items-center justify-center h-48">
                  <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
                </div>
              )}
            </ChartContainer>
          </div>
        </div>
      )}

      {activeSection === 'appointments' && (
        <div className="space-y-6">
          {/* Filtros y controles */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold mb-4 sm:mb-0">Análisis Detallado de Citas</h2>
            <div className="flex space-x-2">
              <select 
                className="px-3 py-2 border rounded-md text-sm"
                value={filters.dateRange}
                onChange={(e) => setFilters({...filters, dateRange: e.target.value as any})}
              >
                <option value="week">Última semana</option>
                <option value="month">Último mes</option>
                <option value="quarter">Último trimestre</option>
                <option value="year">Último año</option>
              </select>
            </div>
          </div>

          {/* Gráficos de análisis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer 
              title="Distribución por Horario" 
              isLoading={isLoading}
            >
              {hourlyDistribution.length > 0 ? (
                <GenericBarChart 
                  data={hourlyDistribution}
                  xAxisKey="hour"
                  yAxisKey="count"
                  colors={["#6366f1"]}
                  gradient
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
                </div>
              )}
            </ChartContainer>

            <ChartContainer 
              title="Citas por Día de la Semana" 
              isLoading={isLoading}
            >
              {weeklyDistribution.length > 0 ? (
                <GenericBarChart 
                  data={weeklyDistribution}
                  xAxisKey="day"
                  yAxisKey="count"
                  colors={["#10b981"]}
                  gradient
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
                </div>
              )}
            </ChartContainer>

            <ChartContainer 
              title="Motivos de Consulta" 
              isLoading={isLoading}
            >
              {motivesDistribution.length > 0 ? (
                <GenericPieChart 
                  data={motivesDistribution}
                  dataKey="value"
                  nameKey="name"
                  colors={["#f59e0b", "#ef4444", "#10b981", "#3b82f6", "#6366f1", "#a855f7"]}
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
                </div>
              )}
            </ChartContainer>

            {/* Sección de duración removida por falta de datos confiables en el esquema actual */}
          </div>
        </div>
      )}

      {activeSection === 'surveys' && (
        <div className="space-y-6">
          {/* Métricas de encuestas */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Resumen de Encuestas de Salud</h2>
            <MetricsGrid 
              metrics={surveyMetrics}
              isLoading={surveyQuery.isLoading}
              columns={4}
              variant="compact"
            />
          </div>

          {/* Información del periodo - removida temporalmente por incompatibilidad de tipos */}

          {/* Gráficos de encuestas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer 
              title="Evolución de Respuestas" 
              isLoading={surveyQuery.isLoading}
              error={surveyQuery.error as Error | null}
              onRefresh={surveyQuery.refetch}
            >
              {survey && survey.timeseries && survey.timeseries.length > 0 ? (
                <GenericLineChart 
                  data={survey.timeseries.map(p => ({ ...p, avg_pain: p.avg_pain ?? 0 }))}
                  xAxisKey="period"
                  yAxisKey="responses"
                  lineColor="#6366f1"
                  gradient
                  area
                  showTrend
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-sm text-muted-foreground">
                    Sin datos en el periodo seleccionado
                  </p>
                </div>
              )}
            </ChartContainer>

            <ChartContainer 
              title="Distribución de Intensidad del Dolor" 
              isLoading={surveyQuery.isLoading}
              error={surveyQuery.error as Error | null}
              onRefresh={surveyQuery.refetch}
            >
              {survey && (survey as any).histograms?.pain_intensity?.length > 0 ? (
                <GenericBarChart 
                  data={(survey as any).histograms.pain_intensity}
                  xAxisKey="name"
                  yAxisKey="total"
                  colors={["#22c55e", "#10b981", "#06b6d4", "#3b82f6", "#6366f1"]}
                  gradient
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-sm text-muted-foreground">
                    Sin datos para mostrar
                  </p>
                </div>
              )}
            </ChartContainer>

            <ChartContainer 
              title="Severidad de Síntomas Reportados" 
              isLoading={surveyQuery.isLoading}
              error={surveyQuery.error as Error | null}
              onRefresh={surveyQuery.refetch}
            >
              {survey && survey.distributions?.severity && survey.distributions.severity.length > 0 ? (
                <GenericPieChart 
                  data={survey.distributions.severity}
                  dataKey="total"
                  nameKey="name"
                  colors={["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#6366f1", "#a855f7"]}
                  donut
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-sm text-muted-foreground">
                    Sin datos para mostrar
                  </p>
                </div>
              )}
            </ChartContainer>

            <ChartContainer 
              title="Áreas del Cuerpo Afectadas" 
              isLoading={surveyQuery.isLoading}
              error={surveyQuery.error as Error | null}
              onRefresh={surveyQuery.refetch}
            >
              {survey && survey.distributions?.motivo_visita && survey.distributions.motivo_visita.length > 0 ? (
                <GenericBarChart 
                  data={survey.distributions.motivo_visita}
                  xAxisKey="name"
                  yAxisKey="total"
                  colors={["#6366f1"]}
                  gradient
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-sm text-muted-foreground">
                    Sin datos para mostrar
                  </p>
                </div>
              )}
            </ChartContainer>
          </div>

          {/* Insights adicionales */}
          {survey && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card rounded-lg p-4 border">
                <h3 className="font-medium text-sm mb-2">Síntoma más común</h3>
                <p className="text-2xl font-bold">
                  {survey.distributions?.severity?.[0]?.name || 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {survey.distributions?.severity?.[0]?.total || 0} reportes
                </p>
              </div>
              
              <div className="bg-card rounded-lg p-4 border">
                <h3 className="font-medium text-sm mb-2">Tendencia del dolor</h3>
                <p className="text-2xl font-bold">
                  {survey?.timeseries && survey.timeseries.length > 1 
                    ? (((survey.timeseries[survey.timeseries.length - 1]?.avg_pain ?? 0) > (survey.timeseries[0]?.avg_pain ?? 0)) 
                      ? '↑ Aumentando' 
                      : '↓ Disminuyendo')
                    : 'Estable'
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  En el último periodo
                </p>
              </div>
              
              <div className="bg-card rounded-lg p-4 border">
                <h3 className="font-medium text-sm mb-2">Participación</h3>
                <p className="text-2xl font-bold">
                  {(survey?.summary?.responses_count ?? 0) > 50 ? 'Alta' : (survey?.summary?.responses_count ?? 0) > 20 ? 'Media' : 'Baja'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(survey?.summary?.responses_count ?? 0)} respuestas totales
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EstadisticasPage = () => {
  return <EstadisticasContent />;
};

export default EstadisticasPage;