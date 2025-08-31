// lib/query-keys.ts - SISTEMA UNIFICADO DE QUERY KEYS
// Centraliza todas las query keys para garantizar consistencia y sincronización
// Convenciones:
// - Estructura: [dominio, subgrupo, params?]
// - Preferir un único camino canónico por recurso para evitar duplicados.
// - Params siempre como objeto (estable) para caching determinístico.
// - Invalidation: usar prefijos (exact: false) sobre `*.all` o raíces por dominio.

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
    
    // Pacientes activos (reservado para vistas específicas)
    active: (params?: { status?: string; limit?: number }) =>
      ['patients', 'active', params] as const,
    
    // Pacientes por estado (útil para invalidaciones específicas)
    byStatus: (status: string) => ['patients', 'byStatus', status] as const,
    
    // Paciente individual por ID
    detail: (id: string) => ['patients', 'detail', id] as const,

    // Historial de paciente
    history: (id: string) => ['patients', 'history', id] as const,
    historyWithOptions: (id: string, options?: unknown) => ['patients', 'history', id, options] as const,
    historyAll: ['patients', 'history'] as const,
  },

  // ==================== CITAS ====================
  appointments: {
    all: ['appointments'] as const,
    
    detail: (id: string) => ['appointments', 'detail', id] as const,
    
    // Citas con filtros específicos
    filtered: (params: {
      dateFilter?: 'today' | 'future' | 'past';
      patientId?: string;
      search?: string;
      pageSize?: number;
    }) => ['appointments', 'filtered', params] as const,
    
    // Alias canónicos sobre `filtered` para evitar claves paralelas
    today: () => ['appointments', 'filtered', { dateFilter: 'today' as const }] as const,
    upcoming: () => ['appointments', 'filtered', { dateFilter: 'future' as const }] as const,
    past: () => ['appointments', 'filtered', { dateFilter: 'past' as const }] as const,
    
    // Citas por fecha y por estado
    byDate: (date: string) => ['appointments', 'date', date] as const,
    byStatus: (status: string) => ['appointments', 'status', status] as const,
    
    // Citas por paciente
    byPatient: (patientId: string) => ['appointments', 'byPatient', patientId] as const,

    // Historial de estados de una cita
    history: (appointmentId: string) => ['appointments', 'history', appointmentId] as const,
  },

  // ==================== DASHBOARD ====================
  dashboard: {
    all: ['dashboard'] as const,
    
    // Tendencias históricas
    trends: (period?: string) => ['dashboard', 'trends', period] as const,
    
    // Datos de gráficos del dashboard (agregados en backend)
    charts: (params?: { startDate?: string; endDate?: string; topN?: number }) => ['dashboard', 'charts', params] as const,
  },

  // ==================== DATOS DE CLÍNICA ====================
  clinic: {
    all: ['clinic'] as const,
    
    // Datos centralizados de la clínica
    data: ['clinic', 'data'] as const,
  },

  // ==================== ENCUESTAS ====================
  surveys: {
    all: ['surveys'] as const,
    
    // Encuestas por paciente
    byPatient: (patientId: string) => ['surveys', 'byPatient', patientId] as const,
    
    // Resultados de encuestas
    results: (surveyId: string) => ['surveys', 'results', surveyId] as const,

    // Estado de encuesta por cita
    status: (appointmentId: string) => ['surveys', 'status', appointmentId] as const,

    // Estadísticas/analíticas agregadas de encuestas
    stats: ['surveys', 'stats'] as const,
    statsWithParams: (params: { startDate?: string; endDate?: string; groupBy?: 'day' | 'week' | 'month'; templateId?: number | 'all' }) =>
      ['surveys', 'stats', params] as const,
  },

  // ==================== ESTADÍSTICAS UNIFICADAS ====================
  statistics: {
    all: ['statistics'] as const,
    unified: ['statistics', 'unified'] as const,
  },
} as const;

// Utilities removed: prefer direct usage of centralized queryKeys with
// queryClient.invalidateQueries({ queryKey: ... }) inside mutations.
