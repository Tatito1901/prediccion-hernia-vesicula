// lib/query-keys.ts - SISTEMA UNIFICADO DE QUERY KEYS
// Centraliza todas las query keys para garantizar consistencia y sincronización

export const queryKeys = {
  // ==================== PACIENTES ====================
  patients: {
    // Query key base para invalidación masiva
    all: ['patients'] as const,
    
    // Datos paginados con filtros específicos
    paginated: (params: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    }) => ['patients', 'paginated', params] as const,
    
    // Pacientes activos para dashboard y admisión
    active: (params?: { status?: string; limit?: number }) => 
      ['patients', 'active', params] as const,
    
    // Estadísticas globales de pacientes
    stats: ['patients', 'stats'] as const,
    
    // Paciente individual por ID
    detail: (id: string) => ['patients', 'detail', id] as const,
  },

  // ==================== CITAS ====================
  appointments: {
    all: ['appointments'] as const,
    
    // Citas con filtros específicos
    filtered: (params: {
      dateFilter?: 'today' | 'future' | 'past';
      patientId?: string;
      search?: string;
      pageSize?: number;
    }) => ['appointments', 'filtered', params] as const,
    
    // Citas de hoy (para admisión)
    today: ['appointments', 'today'] as const,
    
    // Citas por paciente
    byPatient: (patientId: string) => ['appointments', 'byPatient', patientId] as const,
  },

  // ==================== DASHBOARD ====================
  dashboard: {
    all: ['dashboard'] as const,
    
    // Resumen general del dashboard
    summary: ['dashboard', 'summary'] as const,
    
    // Tendencias históricas
    trends: (period?: string) => ['dashboard', 'trends', period] as const,
    
    // Métricas específicas
    metrics: ['dashboard', 'metrics'] as const,
  },

  // ==================== DATOS DE CLÍNICA ====================
  clinic: {
    all: ['clinic'] as const,
    
    // Datos centralizados de la clínica
    data: ['clinic', 'data'] as const,
    
    // Citas de hoy para el contexto
    todayAppointments: ['clinic', 'todayAppointments'] as const,
    
    // Pacientes activos para el contexto
    activePatients: ['clinic', 'activePatients'] as const,
  },

  // ==================== ENCUESTAS ====================
  surveys: {
    all: ['surveys'] as const,
    
    // Encuestas por paciente
    byPatient: (patientId: string) => ['surveys', 'byPatient', patientId] as const,
    
    // Resultados de encuestas
    results: (surveyId: string) => ['surveys', 'results', surveyId] as const,
  },
} as const;

// ==================== UTILIDADES ====================

/**
 * Función para invalidar todas las queries relacionadas con pacientes
 * Garantiza sincronización completa en toda la plataforma
 */
export const getPatientInvalidationKeys = () => [
  queryKeys.patients.all,
  queryKeys.clinic.all,
  queryKeys.dashboard.all,
  queryKeys.appointments.all,
];

/**
 * Función para invalidar queries específicas tras crear/actualizar paciente
 */
export const getPatientMutationInvalidationKeys = (patientId?: string) => [
  queryKeys.patients.all,
  queryKeys.patients.stats,
  queryKeys.clinic.activePatients,
  queryKeys.clinic.todayAppointments,
  queryKeys.dashboard.summary,
  queryKeys.dashboard.metrics,
  queryKeys.dashboard.trends(),
  ...(patientId ? [queryKeys.patients.detail(patientId)] : []),
];

/**
 * Función para invalidar queries tras crear/actualizar cita
 */
export const getAppointmentMutationInvalidationKeys = (patientId?: string) => [
  queryKeys.appointments.all,
  queryKeys.appointments.today,
  queryKeys.clinic.todayAppointments,
  queryKeys.dashboard.summary,
  queryKeys.dashboard.metrics,
  ...(patientId ? [queryKeys.appointments.byPatient(patientId)] : []),
];
