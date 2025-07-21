// lib/metrics-engine.ts - MOTOR DE MÉTRICAS COMPLETAMENTE DESACOPLADO
// Elimina la lógica de negocio de los componentes de presentación

import { useMemo } from 'react';
import { ExtendedAppointment, EnrichedPatient, AppointmentStatusEnum, PatientStatusEnum } from '@/lib/types';
import { 
  isAppointmentToday, 
  isAppointmentInPast, 
  formatAppointmentDate,
  formatAppointmentTime 
} from './appointment-utils';

// ==================== TIPOS DEL MOTOR DE MÉTRICAS ====================
export interface MetricDefinition<T = any> {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly color: 'info' | 'success' | 'warning' | 'error';
  readonly calculator: (data: T[]) => MetricValue;
  readonly formatter?: (value: any) => string;
}

export interface MetricValue {
  readonly value: number | string;
  readonly trend?: {
    readonly direction: 'up' | 'down' | 'stable';
    readonly percentage: number;
    readonly period: string;
  };
  readonly breakdown?: Record<string, number>;
  readonly metadata?: Record<string, any>;
}

export interface MetricsEngineResult<T> {
  readonly metrics: Record<string, MetricValue>;
  readonly rawData: T[];
  readonly lastUpdated: Date;
  readonly dataSource: string;
}

// ==================== CALCULADORAS DE MÉTRICAS PURAS ====================

/**
 * Calculadora de métricas de citas - LÓGICA PURA SIN ACOPLAMIENTO
 */
export class AppointmentMetricsCalculator {
  private static readonly METRICS_DEFINITIONS: Record<string, MetricDefinition<ExtendedAppointment>> = {
    totalCitas: {
      id: 'totalCitas',
      label: 'Total de Citas',
      description: 'Número total de citas en el sistema',
      icon: 'Calendar',
      color: 'info',
      calculator: (appointments) => ({
        value: appointments.length,
        breakdown: AppointmentMetricsCalculator.getStatusBreakdown(appointments)
      })
    },

    citasHoy: {
      id: 'citasHoy',
      label: 'Citas de Hoy',
      description: 'Citas programadas para el día de hoy',
      icon: 'Clock',
      color: 'success',
      calculator: (appointments) => {
        const todayAppointments = appointments.filter(apt => 
          isAppointmentToday(apt.fecha_hora_cita)
        );
        return {
          value: todayAppointments.length,
          breakdown: AppointmentMetricsCalculator.getStatusBreakdown(todayAppointments),
          metadata: { 
            nextAppointment: AppointmentMetricsCalculator.getNextAppointment(todayAppointments)
          }
        };
      }
    },

    citasFuturas: {
      id: 'citasFuturas',
      label: 'Citas Futuras',
      description: 'Citas programadas para fechas futuras',
      icon: 'TrendingUp',
      color: 'info',
      calculator: (appointments) => {
        const futureAppointments = appointments.filter(apt => 
          !isAppointmentToday(apt.fecha_hora_cita) && !isAppointmentInPast(apt.fecha_hora_cita)
        );
        return {
          value: futureAppointments.length,
          breakdown: AppointmentMetricsCalculator.getStatusBreakdown(futureAppointments)
        };
      }
    },

    citasCompletadas: {
      id: 'citasCompletadas',
      label: 'Citas Completadas',
      description: 'Citas que han sido completadas exitosamente',
      icon: 'CheckCircle2',
      color: 'success',
      calculator: (appointments) => {
        const completedAppointments = appointments.filter(apt => 
          apt.estado_cita === AppointmentStatusEnum.COMPLETADA
        );
        const total = appointments.length;
        const percentage = total > 0 ? Math.round((completedAppointments.length / total) * 100) : 0;
        
        return {
          value: completedAppointments.length,
          metadata: { 
            percentage,
            completionRate: `${percentage}%`
          }
        };
      }
    },

    citasPendientes: {
      id: 'citasPendientes',
      label: 'Citas Pendientes',
      description: 'Citas que están pendientes de completar',
      icon: 'AlertCircle',
      color: 'warning',
      calculator: (appointments) => {
        const pendingAppointments = appointments.filter(apt => 
          apt.estado_cita === AppointmentStatusEnum.PROGRAMADA ||
          apt.estado_cita === AppointmentStatusEnum.PRESENTE
        );
        return {
          value: pendingAppointments.length,
          breakdown: AppointmentMetricsCalculator.getStatusBreakdown(pendingAppointments)
        };
      }
    },

    pacientesUnicos: {
      id: 'pacientesUnicos',
      label: 'Pacientes Únicos',
      description: 'Número de pacientes únicos con citas',
      icon: 'Users',
      color: 'info',
      calculator: (appointments) => {
        const uniquePatients = new Set(appointments.map(apt => apt.patient_id));
        return {
          value: uniquePatients.size,
          metadata: {
            averageAppointmentsPerPatient: appointments.length > 0 
              ? Math.round((appointments.length / uniquePatients.size) * 100) / 100
              : 0
          }
        };
      }
    },

    tasaAsistencia: {
      id: 'tasaAsistencia',
      label: 'Tasa de Asistencia',
      description: 'Porcentaje de pacientes que asisten a sus citas',
      icon: 'TrendingUp',
      color: 'success',
      calculator: (appointments) => {
        const pastAppointments = appointments.filter(apt => isAppointmentInPast(apt.fecha_hora_cita));
        const attendedAppointments = pastAppointments.filter(apt => 
          apt.estado_cita === AppointmentStatusEnum.PRESENTE ||
          apt.estado_cita === AppointmentStatusEnum.COMPLETADA
        );
        
        const rate = pastAppointments.length > 0 
          ? Math.round((attendedAppointments.length / pastAppointments.length) * 100)
          : 0;
        
        return {
          value: `${rate}%`,
          metadata: {
            attended: attendedAppointments.length,
            total: pastAppointments.length,
            noShows: pastAppointments.filter(apt => apt.estado_cita === AppointmentStatusEnum.NO_ASISTIO).length
          }
        };
      },
      formatter: (value) => value
    }
  };

  private static getStatusBreakdown(appointments: ExtendedAppointment[]): Record<string, number> {
    return appointments.reduce((acc, apt) => {
      const status = apt.estado_cita || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private static getNextAppointment(appointments: ExtendedAppointment[]) {
    const upcoming = appointments
      .filter(apt => !isAppointmentInPast(apt.fecha_hora_cita))
      .sort((a, b) => new Date(a.fecha_hora_cita).getTime() - new Date(b.fecha_hora_cita).getTime());
    
    return upcoming.length > 0 ? {
      time: formatAppointmentTime(upcoming[0].fecha_hora_cita),
      patient: upcoming[0].patients?.nombre || 'Sin nombre'
    } : null;
  }

  static calculateMetrics(appointments: ExtendedAppointment[]): MetricsEngineResult<ExtendedAppointment> {
    const metrics: Record<string, MetricValue> = {};
    
    for (const [key, definition] of Object.entries(this.METRICS_DEFINITIONS)) {
      try {
        metrics[key] = definition.calculator(appointments);
      } catch (error) {
        console.error(`Error calculating metric ${key}:`, error);
        metrics[key] = { value: 0 };
      }
    }

    return {
      metrics,
      rawData: appointments,
      lastUpdated: new Date(),
      dataSource: 'appointments'
    };
  }

  static getMetricDefinition(metricId: string): MetricDefinition<ExtendedAppointment> | undefined {
    return this.METRICS_DEFINITIONS[metricId];
  }

  static getAllMetricDefinitions(): Record<string, MetricDefinition<ExtendedAppointment>> {
    return { ...this.METRICS_DEFINITIONS };
  }
}

/**
 * Calculadora de métricas de pacientes - LÓGICA PURA SIN ACOPLAMIENTO
 */
export class PatientMetricsCalculator {
  private static readonly METRICS_DEFINITIONS: Record<string, MetricDefinition<EnrichedPatient>> = {
    totalPacientes: {
      id: 'totalPacientes',
      label: 'Total de Pacientes',
      description: 'Número total de pacientes registrados',
      icon: 'Users',
      color: 'info',
      calculator: (patients) => ({
        value: patients.length,
        breakdown: PatientMetricsCalculator.getStatusBreakdown(patients)
      })
    },

    pacientesOperados: {
      id: 'pacientesOperados',
      label: 'Pacientes Operados',
      description: 'Pacientes que han sido operados',
      icon: 'Stethoscope',
      color: 'success',
      calculator: (patients) => {
        const operated = patients.filter(p => p.estado_paciente === PatientStatusEnum.OPERADO);
        const percentage = patients.length > 0 ? Math.round((operated.length / patients.length) * 100) : 0;
        
        return {
          value: operated.length,
          metadata: { 
            percentage,
            operationRate: `${percentage}%`
          }
        };
      }
    },

    consultasPendientes: {
      id: 'consultasPendientes',
      label: 'Consultas Pendientes',
      description: 'Pacientes pendientes de consulta inicial',
      icon: 'AlertTriangle',
      color: 'warning',
      calculator: (patients) => ({
        value: patients.filter(p => p.estado_paciente === PatientStatusEnum.PENDIENTE_DE_CONSULTA).length
      })
    },

    tasaEncuestas: {
      id: 'tasaEncuestas',
      label: 'Tasa de Encuestas',
      description: 'Porcentaje de pacientes con encuestas completadas',
      icon: 'ClipboardCheck',
      color: 'info',
      calculator: (patients) => {
        const withSurveys = patients.filter(p => p.probabilidad_cirugia !== null);
        const rate = patients.length > 0 ? Math.round((withSurveys.length / patients.length) * 100) : 0;
        
        return {
          value: `${rate}%`,
          metadata: {
            completed: withSurveys.length,
            total: patients.length,
            pending: patients.length - withSurveys.length
          }
        };
      },
      formatter: (value) => value
    },

    riesgoPromedio: {
      id: 'riesgoPromedio',
      label: 'Riesgo Promedio',
      description: 'Probabilidad promedio de cirugía',
      icon: 'TrendingUp',
      color: 'warning',
      calculator: (patients) => {
        const withRisk = patients.filter(p => p.probabilidad_cirugia !== null);
        const average = withRisk.length > 0 
          ? Math.round(withRisk.reduce((sum, p) => sum + (p.probabilidad_cirugia || 0), 0) / withRisk.length)
          : 0;
        
        return {
          value: `${average}%`,
          metadata: {
            sampleSize: withRisk.length,
            highRisk: withRisk.filter(p => (p.probabilidad_cirugia || 0) > 70).length,
            lowRisk: withRisk.filter(p => (p.probabilidad_cirugia || 0) < 30).length
          }
        };
      },
      formatter: (value) => value
    }
  };

  private static getStatusBreakdown(patients: EnrichedPatient[]): Record<string, number> {
    return patients.reduce((acc, patient) => {
      const status = patient.estado_paciente || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  static calculateMetrics(patients: EnrichedPatient[]): MetricsEngineResult<EnrichedPatient> {
    const metrics: Record<string, MetricValue> = {};
    
    for (const [key, definition] of Object.entries(this.METRICS_DEFINITIONS)) {
      try {
        metrics[key] = definition.calculator(patients);
      } catch (error) {
        console.error(`Error calculating metric ${key}:`, error);
        metrics[key] = { value: 0 };
      }
    }

    return {
      metrics,
      rawData: patients,
      lastUpdated: new Date(),
      dataSource: 'patients'
    };
  }

  static getMetricDefinition(metricId: string): MetricDefinition<EnrichedPatient> | undefined {
    return this.METRICS_DEFINITIONS[metricId];
  }

  static getAllMetricDefinitions(): Record<string, MetricDefinition<EnrichedPatient>> {
    return { ...this.METRICS_DEFINITIONS };
  }
}

// ==================== HOOKS PARA USO EN COMPONENTES ====================

/**
 * Hook para métricas de citas - COMPLETAMENTE DESACOPLADO
 */
export const useAppointmentMetrics = (appointments: ExtendedAppointment[]) => {
  return useMemo(() => {
    return AppointmentMetricsCalculator.calculateMetrics(appointments);
  }, [appointments]);
};

/**
 * Hook para métricas de pacientes - COMPLETAMENTE DESACOPLADO
 */
export const usePatientMetrics = (patients: EnrichedPatient[]) => {
  return useMemo(() => {
    return PatientMetricsCalculator.calculateMetrics(patients);
  }, [patients]);
};

// ==================== UTILIDADES DE EXPORTACIÓN ====================

/**
 * Exporta métricas a formato CSV
 */
export const exportMetricsToCSV = (result: MetricsEngineResult<any>): string => {
  const headers = ['Métrica', 'Valor', 'Descripción', 'Última Actualización'];
  const rows = Object.entries(result.metrics).map(([key, metric]) => [
    key,
    metric.value.toString(),
    'N/A', // Descripción se obtendría de las definiciones
    result.lastUpdated.toISOString()
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

/**
 * Compara métricas entre dos períodos
 */
export const compareMetrics = (
  current: MetricsEngineResult<any>,
  previous: MetricsEngineResult<any>
): Record<string, { current: any; previous: any; change: number; changeType: 'increase' | 'decrease' | 'stable' }> => {
  const comparison: Record<string, any> = {};
  
  for (const [key, currentMetric] of Object.entries(current.metrics)) {
    const previousMetric = previous.metrics[key];
    if (previousMetric) {
      const currentValue = typeof currentMetric.value === 'number' ? currentMetric.value : 0;
      const previousValue = typeof previousMetric.value === 'number' ? previousMetric.value : 0;
      const change = currentValue - previousValue;
      
      comparison[key] = {
        current: currentValue,
        previous: previousValue,
        change,
        changeType: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'stable'
      };
    }
  }
  
  return comparison;
};

export default {
  AppointmentMetricsCalculator,
  PatientMetricsCalculator,
  useAppointmentMetrics,
  usePatientMetrics,
  exportMetricsToCSV,
  compareMetrics
};
