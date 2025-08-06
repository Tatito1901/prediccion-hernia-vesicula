// components/dashboard/dashboard-consolidated.tsx - DASHBOARD USANDO SISTEMA GENÉRICO CONSOLIDADO
'use client';

import React, { useMemo } from 'react';
import { useClinic } from '@/contexts/clinic-data-provider';
import { 
  MetricsGrid, 
  ChartContainer, 
  createMetric, 
  formatMetricValue,
  type MetricValue 
} from '@/components/ui/metrics-system';
import { AppointmentsListReactive } from '@/components/appointments/appointments-list-reactive';
import { PatientsListReactive } from '@/components/patients/patients-list-reactive';
import { 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Activity
} from 'lucide-react';

// ==================== DASHBOARD CONSOLIDADO ====================
export function DashboardConsolidated() {
  const {
    allAppointments,
    allPatients,
    isLoading,
    error,
    refetch,
  } = useClinic();

  // 🎯 CÁLCULO DE MÉTRICAS USANDO DATOS REALES
  const dashboardMetrics = useMemo((): MetricValue[] => {
    if (!allAppointments || !allPatients) {
      return [
        createMetric('Citas Hoy', '0', { icon: Calendar, color: 'info' }),
        createMetric('Total Pacientes', '0', { icon: Users, color: 'success' }),
        createMetric('Consultas Pendientes', '0', { icon: Clock, color: 'warning' }),
        createMetric('Pacientes Activos', '0', { icon: CheckCircle, color: 'default' })
      ];
    }

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    // Citas de hoy
    const todayAppointments = allAppointments.filter(appointment => 
      appointment.fecha_hora_cita?.startsWith(todayString)
    ).length;

    // Total de pacientes
    const totalPatients = allPatients.length;

    // Consultas pendientes (citas programadas)
    const pendingConsults = allAppointments.filter(appointment => 
      appointment.estado_cita === 'PROGRAMADA'
    ).length;

    // Pacientes activos (estados relevantes)
    const activePatients = allPatients.filter(patient => 
      ['PENDIENTE DE CONSULTA', 'CONSULTADO', 'EN SEGUIMIENTO', 'INDECISO'].includes(
        patient.estado_paciente || ''
      )
    ).length;

    return [
      createMetric(
        'Citas Hoy', 
        formatMetricValue(todayAppointments), 
        { 
          icon: Calendar, 
          color: todayAppointments > 0 ? 'success' : 'info',
          description: `${todayAppointments} citas programadas para hoy`
        }
      ),
      createMetric(
        'Total Pacientes', 
        formatMetricValue(totalPatients), 
        { 
          icon: Users, 
          color: 'success',
          description: `${totalPatients} pacientes en el sistema`
        }
      ),
      createMetric(
        'Consultas Pendientes', 
        formatMetricValue(pendingConsults), 
        { 
          icon: Clock, 
          color: pendingConsults > 5 ? 'warning' : 'default',
          description: `${pendingConsults} citas programadas pendientes`
        }
      ),
      createMetric(
        'Pacientes Activos', 
        formatMetricValue(activePatients), 
        { 
          icon: CheckCircle, 
          color: 'info',
          description: `${activePatients} pacientes en seguimiento activo`
        }
      )
    ];
  }, [allAppointments, allPatients]);

  // 🎯 MÉTRICAS ADICIONALES DE ACTIVIDAD
  const activityMetrics = useMemo((): MetricValue[] => {
    if (!allAppointments || !allPatients) return [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoString = sevenDaysAgo.toISOString().split('T')[0];

    // Nuevos pacientes (últimos 7 días)
    const newPatients = allPatients.filter(patient => 
      patient.fecha_registro && patient.fecha_registro >= sevenDaysAgoString
    ).length;

    // Citas completadas (últimos 7 días)
    const completedAppointments = allAppointments.filter(appointment => 
      appointment.estado_cita === 'COMPLETADA' && 
      appointment.fecha_hora_cita && 
      appointment.fecha_hora_cita >= sevenDaysAgoString
    ).length;

    // Pacientes operados
    const operatedPatients = allPatients.filter(patient => 
      patient.estado_paciente === 'OPERADO'
    ).length;

    return [
      createMetric(
        'Nuevos Pacientes (7d)', 
        formatMetricValue(newPatients), 
        { 
          icon: TrendingUp, 
          color: 'success',
          trend: newPatients > 0 ? 'up' : 'neutral'
        }
      ),
      createMetric(
        'Citas Completadas (7d)', 
        formatMetricValue(completedAppointments), 
        { 
          icon: CheckCircle, 
          color: 'success',
          trend: completedAppointments > 0 ? 'up' : 'neutral'
        }
      ),
      createMetric(
        'Pacientes Operados', 
        formatMetricValue(operatedPatients), 
        { 
          icon: Activity, 
          color: 'info'
        }
      )
    ];
  }, [allAppointments, allPatients]);

  return (
    <div className="space-y-6">
      {/* 🎯 MÉTRICAS PRINCIPALES USANDO SISTEMA GENÉRICO */}
      <MetricsGrid
        title="Métricas Principales"
        description="Vista general del estado actual de la clínica"
        metrics={dashboardMetrics}
        isLoading={isLoading}
        columns={4}
        size="md"
        variant="detailed"
        onRefresh={refetch}
      />

      {/* 🎯 ACTIVIDAD RECIENTE */}
      {activityMetrics.length > 0 && (
        <MetricsGrid
          title="Actividad Reciente"
          description="Métricas de los últimos 7 días"
          metrics={activityMetrics}
          isLoading={isLoading}
          columns={3}
          size="md"
          variant="compact"
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
          <PatientsListReactive />
        </ChartContainer>
      </div>
    </div>
  );
}
