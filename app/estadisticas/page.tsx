"use client"

import React, { useState, useMemo } from 'react';
import { ClinicDataProvider, useClinic } from "@/contexts/clinic-data-provider";
import { useChartData, type AppointmentFilters } from "@/hooks/use-chart-data";
import { Users, Calendar, CalendarCheck, CalendarClock, TrendingUp, Activity, ChartBar, PieChart, AlertCircle } from 'lucide-react';
import { MetricsGrid, ChartContainer, type MetricValue } from '@/components/ui/metrics-system';
import { AppointmentStatusEnum } from '@/lib/types';
import { useSurveyAnalytics } from '@/hooks/use-survey-analytics';
import { GenericLineChart } from '@/components/charts/common/generic-line-chart';
import { GenericBarChart } from '@/components/charts/common/generic-bar-chart';
import { GenericPieChart } from '@/components/charts/common/generic-pie-chart';

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
  const [activeSection, setActiveSection] = useState<'overview' | 'appointments' | 'surveys'>('overview');

  const chartData = useChartData({
    patients: allPatients,
    appointments: allAppointments,
    ...filters,
  });

  // Analíticas de encuestas
  const surveyQuery = useSurveyAnalytics({ groupBy: 'month' });
  const survey = surveyQuery.data;

  // Calcular estadísticas desde los datos reales de citas
  const appointmentStats = useMemo(() => {
    if (!allAppointments?.length) {
      return { 
        todayCount: 0, 
        futureCount: 0, 
        pastCount: 0, 
        totalCount: 0,
        completedRate: 0,
        cancelledRate: 0 
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = allAppointments.reduce((acc: any, apt: any) => {
      const aptDate = new Date(apt.fecha_hora_cita);
      aptDate.setHours(0, 0, 0, 0);
      
      if (aptDate.getTime() === today.getTime()) {
        acc.todayCount++;
      } else if (aptDate > today) {
        acc.futureCount++;
      } else {
        acc.pastCount++;
      }
      
      // Calcular tasas de completado y cancelación
      if (apt.estado === 'completada') acc.completed++;
      if (apt.estado === 'cancelada') acc.cancelled++;
      
      acc.totalCount++;
      return acc;
    }, { 
      todayCount: 0, 
      futureCount: 0, 
      pastCount: 0, 
      totalCount: 0,
      completed: 0,
      cancelled: 0 
    });
    
    stats.completedRate = stats.totalCount > 0 
      ? Math.round((stats.completed / stats.totalCount) * 100) 
      : 0;
    stats.cancelledRate = stats.totalCount > 0 
      ? Math.round((stats.cancelled / stats.totalCount) * 100) 
      : 0;
    
    return stats;
  }, [allAppointments]);

  // Datos derivados para gráficos (alineados al hook minimalista useChartData)
  const lineChartData = useMemo(() => {
    const series = chartData.chart.series?.[0]?.data || [];
    const categories = chartData.chart.categories || [];
    return categories.map((label, i) => ({ date: label, count: Number(series[i] ?? 0) }));
  }, [chartData.chart]);

  const statusDistribution = useMemo(() => {
    if (!allAppointments?.length) return [] as { name: string; value: number }[];
    const map = new Map<string, number>();
    for (const apt of allAppointments) {
      const key = String(apt.estado_cita || apt.estado || 'desconocido');
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

          {/* Información del periodo */}
          {survey && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Periodo analizado: {survey.summary.period.startDate} - {survey.summary.period.endDate}
                </span>
              </div>
            </div>
          )}

          {/* Gráficos de encuestas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer 
              title="Evolución de Respuestas" 
              isLoading={surveyQuery.isLoading}
              error={surveyQuery.error as Error | null}
              onRefresh={surveyQuery.refetch}
            >
              {survey && survey.timeseries.length > 0 ? (
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
              {survey && survey.histograms.pain_intensity.length > 0 ? (
                <GenericBarChart 
                  data={survey.histograms.pain_intensity}
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
              {survey && survey.distributions.severity.length > 0 ? (
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
              {survey && survey.distributions.motivo_visita?.length > 0 ? (
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
                  {survey.distributions.severity?.[0]?.name || 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {survey.distributions.severity?.[0]?.total || 0} reportes
                </p>
              </div>
              
              <div className="bg-card rounded-lg p-4 border">
                <h3 className="font-medium text-sm mb-2">Tendencia del dolor</h3>
                <p className="text-2xl font-bold">
                  {survey?.timeseries?.length > 1 
                    ? (((survey.timeseries?.[survey.timeseries.length - 1]?.avg_pain ?? 0) > (survey.timeseries?.[0]?.avg_pain ?? 0)) 
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
  return (
    <ClinicDataProvider>
      <EstadisticasContent />
    </ClinicDataProvider>
  );
};

export default EstadisticasPage;