// components/dashboard/dashboard-consolidated.tsx - DASHBOARD USANDO SISTEMA GENÉRICO CONSOLIDADO
'use client';

import React, { useMemo, useState } from 'react';
import { useClinic } from '@/contexts/clinic-data-provider';
import { 
  MetricsGrid, 
  ChartContainer, 
  createMetric, 
  formatMetricValue,
  type MetricValue 
} from '@/components/ui/metrics-system';
import { AppointmentsListReactive } from '@/components/appointments/appointments-list-reactive';
// Reemplazado: PatientsListReactive eliminado. Mostramos una lista mínima inline.
import { 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Activity,
  Stethoscope,
  UserCheck,
  CalendarDays,
  Target,
  Heart,
  FileText,
  DollarSign,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ==================== DASHBOARD CONSOLIDADO ====================
export function DashboardConsolidated() {
  const {
    allAppointments,
    allPatients,
    isLoading,
    error,
    refetch,
  } = useClinic();

  // 🎛️ Periodo local para filtrar métricas (sin nuevos fetch)
  const periods = ['7d','30d','90d'] as const;
  type Period = typeof periods[number];
  const [period, setPeriod] = useState<Period>('7d');
  const periodStartISO = useMemo(() => {
    const d = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }, [period]);
  const periodText = useMemo(() => (
    period === '7d' ? 'últimos 7 días' : period === '30d' ? 'últimos 30 días' : 'últimos 90 días'
  ), [period]);

  // 🎯 MÉTRICAS PRINCIPALES PROFESIONALES
  const primaryMetrics = useMemo((): MetricValue[] => {
    if (!allAppointments || !allPatients) {
      return [
        createMetric('Consultas Hoy', '0', { icon: Stethoscope, color: 'info' }),
        createMetric('Pacientes Registrados', '0', { icon: Users, color: 'success' }),
        createMetric('Citas Pendientes', '0', { icon: CalendarDays, color: 'warning' }),
        createMetric('Tasa de Ocupación', '0%', { icon: Target, color: 'default' })
      ];
    }

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    // Consultas de hoy (más profesional que "citas")
    const todayConsultations = allAppointments.filter(appointment => 
      appointment.fecha_hora_cita?.startsWith(todayString)
    ).length;

    // Total de pacientes registrados
    const totalPatients = allPatients.length;

    // Citas pendientes (programadas)
    const pendingAppointments = allAppointments.filter(appointment => 
      appointment.estado_cita === 'PROGRAMADA'
    ).length;

    // Tasa de ocupación (citas completadas vs programadas en el periodo)
    const periodScheduled = allAppointments.filter(appointment => 
      appointment.fecha_hora_cita && appointment.fecha_hora_cita >= periodStartISO
    ).length;
    const periodCompleted = allAppointments.filter(appointment => 
      appointment.estado_cita === 'COMPLETADA' && 
      appointment.fecha_hora_cita && appointment.fecha_hora_cita >= periodStartISO
    ).length;
    const occupancyRate = periodScheduled > 0 ? Math.round((periodCompleted / periodScheduled) * 100) : 0;

    return [
      createMetric(
        'Consultas Hoy', 
        formatMetricValue(todayConsultations), 
        { 
          icon: Stethoscope, 
          color: todayConsultations > 0 ? 'success' : 'info',
          description: `${todayConsultations} consultas médicas programadas`,
          trend: todayConsultations > 0 ? 'up' : 'neutral'
        }
      ),
      createMetric(
        'Pacientes Registrados', 
        formatMetricValue(totalPatients), 
        { 
          icon: Users, 
          color: 'success',
          description: `Base total de pacientes en el sistema`,
          trend: totalPatients > 0 ? 'up' : 'neutral'
        }
      ),
      createMetric(
        'Citas Pendientes', 
        formatMetricValue(pendingAppointments), 
        { 
          icon: CalendarDays, 
          color: pendingAppointments > 10 ? 'warning' : pendingAppointments > 0 ? 'info' : 'default',
          description: `Citas programadas por confirmar`,
          trend: pendingAppointments > 5 ? 'up' : 'neutral'
        }
      ),
      createMetric(
        'Tasa de Ocupación', 
        `${occupancyRate}%`, 
        { 
          icon: Target, 
          color: occupancyRate >= 80 ? 'success' : occupancyRate >= 60 ? 'warning' : 'error',
          description: `Eficiencia de consultas (${periodText})`,
          trend: occupancyRate >= 70 ? 'up' : occupancyRate >= 50 ? 'neutral' : 'down'
        }
      )
    ];
  }, [allAppointments, allPatients, periodStartISO, periodText]);

  // 🎯 MÉTRICAS CLÍNICAS PROFESIONALES
  const clinicalMetrics = useMemo((): MetricValue[] => {
    if (!allAppointments || !allPatients) return [];

    // Nuevos ingresos (últimos 7 días)
    const newAdmissions = allPatients.filter(patient => 
      patient.fecha_registro && patient.fecha_registro >= periodStartISO
    ).length;

    // Consultas completadas (últimos 7 días)
    const completedConsultations = allAppointments.filter(appointment => 
      appointment.estado_cita === 'COMPLETADA' && 
      appointment.fecha_hora_cita && 
      appointment.fecha_hora_cita >= periodStartISO
    ).length;

    // Pacientes en tratamiento activo
    const activeTreatments = allPatients.filter(patient => 
      ['activo', 'en_seguimiento', 'operado'].includes(patient.estado_paciente || '')
    ).length;

    // Seguimientos pendientes (pacientes que necesitan revisión)
    const pendingFollowUps = allPatients.filter(patient => 
      patient.estado_paciente === 'en_seguimiento'
    ).length;

    // Tasa de retención (pacientes que volvieron en 30 días)
    const returningPatients = allPatients.filter(patient => {
      const patientAppointments = allAppointments.filter(apt => 
        apt.paciente_id === patient.id && 
        apt.fecha_hora_cita && apt.fecha_hora_cita >= periodStartISO
      );
      return patientAppointments.length > 1;
    }).length;
    const retentionRate = allPatients.length > 0 ? Math.round((returningPatients / allPatients.length) * 100) : 0;

    return [
      createMetric(
        'Nuevos Ingresos', 
        formatMetricValue(newAdmissions), 
        { 
          icon: UserCheck, 
          color: 'success',
          description: `Pacientes registrados (${periodText})`,
          trend: newAdmissions > 0 ? 'up' : 'neutral'
        }
      ),
      createMetric(
        'Consultas Realizadas', 
        formatMetricValue(completedConsultations), 
        { 
          icon: Heart, 
          color: 'info',
          description: `Consultas completadas (${periodText})`,
          trend: completedConsultations > 0 ? 'up' : 'neutral'
        }
      ),
      createMetric(
        'Tratamientos Activos', 
        formatMetricValue(activeTreatments), 
        { 
          icon: Activity, 
          color: 'warning',
          description: `Pacientes en seguimiento médico`,
          trend: activeTreatments > 0 ? 'up' : 'neutral'
        }
      ),
      createMetric(
        'Tasa de Retención', 
        `${retentionRate}%`, 
        { 
          icon: BarChart3, 
          color: retentionRate >= 70 ? 'success' : retentionRate >= 50 ? 'warning' : 'error',
          description: `Pacientes que regresan (${periodText})`,
          trend: retentionRate >= 60 ? 'up' : retentionRate >= 40 ? 'neutral' : 'down'
        }
      )
    ];
  }, [allAppointments, allPatients, periodStartISO, periodText]);

  return (
    <div className="space-y-6">
      {/* 🎛️ Barra de periodo */}
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant={period === '7d' ? 'default' : 'outline'} aria-pressed={period==='7d'} onClick={() => setPeriod('7d')}>7d</Button>
        <Button size="sm" variant={period === '30d' ? 'default' : 'outline'} aria-pressed={period==='30d'} onClick={() => setPeriod('30d')}>30d</Button>
        <Button size="sm" variant={period === '90d' ? 'default' : 'outline'} aria-pressed={period==='90d'} onClick={() => setPeriod('90d')}>90d</Button>
      </div>
      {/* 🎯 MÉTRICAS PRINCIPALES PROFESIONALES */}
      <MetricsGrid
        title="Panel de Control Clínico"
        description="Indicadores clave de rendimiento de la clínica"
        metrics={primaryMetrics}
        isLoading={isLoading}
        columns={4}
        size="lg"
        variant="detailed"
        onRefresh={refetch}
      />

      {/* 🎯 MÉTRICAS CLÍNICAS ESPECIALIZADAS */}
      {clinicalMetrics.length > 0 && (
        <MetricsGrid
          title="Indicadores Clínicos"
          description="Métricas de calidad y seguimiento médico"
          metrics={clinicalMetrics}
          isLoading={isLoading}
          columns={4}
          size="md"
          variant="detailed"
        />
      )}

      {/* 🎯 LISTAS REACTIVAS EN CONTENEDORES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Citas Recientes"
          description="Lista de citas programadas y completadas"
          isLoading={isLoading}
          error={error}
          onRefresh={refetch}
        >
          <AppointmentsListReactive />
        </ChartContainer>

        <ChartContainer
          title="Pacientes Activos"
          description="Lista de pacientes en seguimiento"
          isLoading={isLoading}
          error={error}
          onRefresh={refetch}
        >
          {/* Lista mínima de pacientes activos (máx. 10) */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 w-full bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : (!allPatients || allPatients.length === 0) ? (
            <div className="text-muted-foreground">No hay pacientes registrados.</div>
          ) : (
            <div className="space-y-2">
              {(allPatients
                .filter(p => ['potencial','activo','en_seguimiento','inactivo','alta_medica','operado','no_operado'].includes((p as any).estado_paciente || ''))
                .slice(0, 10)
              ).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {(p.nombreCompleto || `${p.nombre ?? ''} ${p.apellidos ?? ''}` || '?').trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {p.nombreCompleto || `${p.nombre ?? ''} ${p.apellidos ?? ''}`}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">ID: {(p.id || '').slice(0,8)}</p>
                    </div>
                  </div>
                  {p.estado_paciente && (
                    <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">
                      {String(p.estado_paciente).replaceAll('_',' ').replace(/\b\w/g, (c:string) => c.toUpperCase())}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </ChartContainer>
      </div>
    </div>
  );
}
