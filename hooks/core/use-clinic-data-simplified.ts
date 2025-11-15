// hooks/core/use-clinic-data-simplified.ts
// Hook simplificado que reemplaza el complejo use-clinic-data.ts
// Utiliza los hooks unificados y elimina el Context innecesario

import { useMemo } from 'react';
import { useAppointments } from './use-appointments';
import { usePatients, useActivePatients } from './use-patients';
import { useAnalytics } from './use-analytics-unified';
import { processChartData } from '@/lib/services/chart-transformations';
import type { Appointment, AppointmentStatus, PatientStatus } from '@/lib/types';

export interface ClinicDataFilters {
  // Filtros de pacientes
  patientSearch?: string;
  patientStatus?: string;
  patientPage?: number;
  patientPageSize?: number;
  
  // Filtros de citas
  appointmentSearch?: string;
  appointmentStatus?: string;
  appointmentDateFilter?: 'today' | 'future' | 'past' | 'range';
  appointmentStartDate?: string;
  appointmentEndDate?: string;
  
  // Filtros de analytics
  analyticsPeriod?: '7d' | '30d' | '90d';
  analyticsGroupBy?: 'day' | 'week' | 'month';
}

/**
 * Hook simplificado para obtener todos los datos de la clínica
 * Sin Context, sin lógica compleja, solo composición de hooks
 */
export const useClinicData = (filters: ClinicDataFilters = {}) => {
  // Datos de pacientes
  const patientsQuery = usePatients({
    search: filters.patientSearch,
    status: filters.patientStatus as PatientStatus | undefined,
    page: filters.patientPage,
    pageSize: filters.patientPageSize,
  });

  // Pacientes activos (para vistas que los necesitan)
  const activePatientsQuery = useActivePatients();

  // Datos de citas
  const appointmentsQuery = useAppointments({
    search: filters.appointmentSearch,
    status: filters.appointmentStatus as AppointmentStatus | undefined,
    dateFilter: filters.appointmentDateFilter,
    startDate: filters.appointmentStartDate,
    endDate: filters.appointmentEndDate,
  });
  
  // Analytics y métricas
  const analyticsQuery = useAnalytics({
    period: filters.analyticsPeriod,
    groupBy: filters.analyticsGroupBy,
    includeCharts: true,
    includeSurveys: true,
  });
  
  // Procesar datos de gráficos desde las citas
  const chartData = useMemo(() => {
    const allAppointments = [
      ...appointmentsQuery.classifiedAppointments.today,
      ...appointmentsQuery.classifiedAppointments.future,
      ...appointmentsQuery.classifiedAppointments.past,
    ];
    
    return {
      daily: processChartData(allAppointments as Appointment[], undefined, undefined, 'day'),
      monthly: processChartData(allAppointments as Appointment[], undefined, undefined, 'month'),
      yearly: processChartData(allAppointments as Appointment[], undefined, undefined, 'year'),
    };
  }, [appointmentsQuery.classifiedAppointments]);
  
  // Estado de carga unificado
  const isLoading = patientsQuery.isLoading || 
                   appointmentsQuery.isLoading || 
                   analyticsQuery.isLoading;
  
  const isError = patientsQuery.isError || 
                 appointmentsQuery.isError || 
                 analyticsQuery.isError;
  
  const error = patientsQuery.error || 
               appointmentsQuery.error || 
               analyticsQuery.error;
  
  return {
    // Datos de pacientes
    patients: {
      active: activePatientsQuery.patients,
      paginated: patientsQuery.patients,
      pagination: patientsQuery.pagination,
      stats: patientsQuery.stats,
    },
    
    // Datos de citas
    appointments: {
      all: appointmentsQuery.appointments,
      classified: appointmentsQuery.classifiedAppointments,
      summary: appointmentsQuery.summary,
      stats: appointmentsQuery.stats,
    },
    
    // Analytics
    analytics: analyticsQuery.data,
    
    // Datos de gráficos
    chartData,
    
    // Estados
    isLoading,
    isError,
    error,
    
    // Funciones de refetch
    refetch: {
      patients: patientsQuery.refetch,
      activePatients: activePatientsQuery.refetch,
      appointments: appointmentsQuery.refetch,
      analytics: analyticsQuery.refetchAll,
      all: async () => {
        await Promise.all([
          patientsQuery.refetch(),
          activePatientsQuery.refetch(),
          appointmentsQuery.refetch(),
          analyticsQuery.refetchAll(),
        ]);
      },
    },
  };
};

/**
 * Hook selector para obtener solo datos de pacientes
 */
export const useClinicPatients = (filters?: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) => {
  const { patients, isLoading, isError, error, refetch } = useClinicData({
    patientSearch: filters?.search,
    patientStatus: filters?.status,
    patientPage: filters?.page,
    patientPageSize: filters?.pageSize,
  });
  
  return {
    patients,
    isLoading,
    isError,
    error,
    refetch: refetch.patients,
  };
};

/**
 * Hook selector para obtener solo datos de citas
 */
export const useClinicAppointments = (filters?: {
  search?: string;
  status?: string;
  dateFilter?: 'today' | 'future' | 'past' | 'range';
  startDate?: string;
  endDate?: string;
}) => {
  const { appointments, isLoading, isError, error, refetch } = useClinicData({
    appointmentSearch: filters?.search,
    appointmentStatus: filters?.status,
    appointmentDateFilter: filters?.dateFilter,
    appointmentStartDate: filters?.startDate,
    appointmentEndDate: filters?.endDate,
  });
  
  return {
    appointments,
    isLoading,
    isError,
    error,
    refetch: refetch.appointments,
  };
};

/**
 * Hook selector para obtener solo analytics
 */
export const useClinicAnalytics = (filters?: {
  period?: '7d' | '30d' | '90d';
  groupBy?: 'day' | 'week' | 'month';
}) => {
  const { analytics, chartData, isLoading, isError, error, refetch } = useClinicData({
    analyticsPeriod: filters?.period,
    analyticsGroupBy: filters?.groupBy,
  });
  
  return {
    analytics,
    chartData,
    isLoading,
    isError,
    error,
    refetch: refetch.analytics,
  };
};
