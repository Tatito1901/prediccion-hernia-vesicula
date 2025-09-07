// hooks/index.ts
// Exportación centralizada de todos los hooks
// Los hooks antiguos son wrappers de compatibilidad que redirigen a los nuevos hooks unificados

// ==================== HOOKS UNIFICADOS (NUEVOS) ====================
// Estos son los hooks principales que deberías usar
export {
  // Appointments
  useAppointments,
  useAppointmentDetail,
  useAppointmentsInfinite,
  useCreateAppointment,
  useUpdateAppointment,
  useUpdateAppointmentStatus,
  useAppointmentSearch,
} from './core/use-appointments';

export type {
  AppointmentFilters,
  AppointmentMutationParams,
  AppointmentUpdateParams,
  StatusUpdateParams,
} from './core/use-appointments';

export {
  // Patients
  usePatients,
  useActivePatients,
  usePatientDetail,
  usePatientHistory,
  usePatientSurvey,
  usePatientsInfinite,
  useAdmitPatient,
  useUpdatePatient,
  enrichPatient,
} from './core/use-patients';

export type {
  PatientFilters,
  PatientUpdateParams,
} from './core/use-patients';

export {
  // Analytics
  useAnalytics,
  useDashboardMetrics,
  useStatistics,
  useSurveyAnalytics,
} from './core/use-analytics-unified';

export type {
  AnalyticsFilters,
  UnifiedAnalyticsData,
} from './core/use-analytics-unified';

export {
  // Clinic Data
  useClinicData,
  useClinicPatients,
  useClinicAppointments,
  useClinicAnalytics,
} from './core/use-clinic-data-simplified';

export type {
  ClinicDataFilters,
} from './core/use-clinic-data-simplified';

// ==================== HOOKS DE UTILIDAD ====================
export { useDebounce } from './use-debounce';
export { useAutoListHeight as useAutoSize } from './use-auto-size';
export { useBreakpoint } from './use-breakpoint';

// ==================== HOOKS DE COMPATIBILIDAD (DEPRECATED) ====================
// Estos hooks están deprecados y solo existen para compatibilidad con código existente
// Migra gradualmente a los hooks unificados

import { useAppointments as useAppointmentsUnified } from './core/use-appointments';
import { useActivePatients } from './core/use-patients';

/**
 * @deprecated Use `useAppointments` from './core/use-appointments-unified' instead
 * Este hook solo existe para compatibilidad con código existente
 */
export const useAdmissionAppointments = (params?: {
  search?: string;
  status?: string;
  pageSize?: number;
}) => {
  const query = useAppointmentsUnified({
    search: params?.search,
    status: params?.status as any,
    pageSize: params?.pageSize,
  });
  
  return {
    appointments: query.classifiedAppointments,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    stats: query.stats,
    rescheduledCount: query.stats.rescheduled,
  };
};

/**
 * @deprecated Use `useAnalytics` from './core/use-analytics-unified' instead
 */
export { useAnalytics as useAnalyticsData } from './core/use-analytics-unified';

/**
 * @deprecated Use `usePatientDetail` from './core/use-patients-unified' instead
 */
export { usePatientDetail as usePatient } from './core/use-patients';

// (compatibilidad 'useClinic' eliminado; migrado completamente a hooks unificados)

// Re-exportar templates de encuestas
export { useSurveyTemplates, useAssignSurvey } from './use-survey-templates';
