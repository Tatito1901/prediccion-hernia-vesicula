// lib/api-endpoints.ts - Centralización de todas las URLs de la API
// Este módulo es el único lugar donde se definen las rutas de la API
// Si una ruta cambia, solo necesitas modificarla aquí

const API_BASE = typeof window !== 'undefined' && window.location?.origin 
  ? window.location.origin + '/api'
  : '/api';

export const endpoints = {
  // ==================== PACIENTES ====================
  patients: {
    // Lista de pacientes con filtros opcionales
    list: (params?: URLSearchParams) => 
      params ? `${API_BASE}/patients?${params.toString()}` : `${API_BASE}/patients`,
    
    // Detalle de un paciente específico
    detail: (id: string) => 
      `${API_BASE}/patients/${id}`,
    
    // Historial médico del paciente
    history: (id: string, params?: URLSearchParams) => 
      params ? `${API_BASE}/patients/${id}/history?${params.toString()}` : `${API_BASE}/patients/${id}/history`,
    
    // Actualización de paciente (PATCH)
    update: (id: string) => 
      `${API_BASE}/patients/${id}`,
    
    // Búsqueda de pacientes
    search: (query: string) => 
      `${API_BASE}/patients/search?q=${encodeURIComponent(query)}`,
  },

  // ==================== CITAS ====================
  appointments: {
    list: (params?: URLSearchParams) => joinPaths('/api/appointments', params),
    detail: (id: string) => `/api/appointments/${encodeURIComponent(id)}`,
    status: (id: string) => `/api/appointments/${encodeURIComponent(id)}/status`,
    updateStatus: (id: string) => `/api/appointments/${encodeURIComponent(id)}/status`,
    history: (id: string) => `/api/appointments/${encodeURIComponent(id)}/history`,
    byPatient: (patientId: string, params?: URLSearchParams) => 
      joinPaths(`/api/appointments/patient/${encodeURIComponent(patientId)}`, params),
    assignSurvey: (appointmentId: string) => `/api/assign-survey/${encodeURIComponent(appointmentId)}`,
  },

  // ==================== ADMISIÓN DE PACIENTES ====================
  admission: {
    // Crear nueva admisión
    create: () => 
      `${API_BASE}/patient-admission`,
    
    // Lista de admisiones con filtros  
    list: (params?: URLSearchParams) => 
      params ? `${API_BASE}/patient-admission?${params.toString()}` : `${API_BASE}/patient-admission`,
  },

  // ==================== DASHBOARD ====================
  dashboard: {
    // Métricas consolidadas
    metrics: (params?: URLSearchParams) => 
      params ? `${API_BASE}/dashboard/metrics?${params.toString()}` : `${API_BASE}/dashboard/metrics`,
    
    // Tendencias históricas
    trends: (params?: URLSearchParams) => 
      params ? `${API_BASE}/dashboard/trends?${params.toString()}` : `${API_BASE}/dashboard/trends`,
    
    // Datos para gráficos
    charts: (params?: URLSearchParams) => 
      params ? `${API_BASE}/dashboard/charts?${params.toString()}` : `${API_BASE}/dashboard/charts`,
    
    // Resumen del dashboard
    summary: () => 
      `${API_BASE}/dashboard/summary`,
  },

  // ==================== ENCUESTAS ====================
  surveys: {
    // Obtener respuestas de encuestas
    responses: (appointmentId: string) => 
      `${API_BASE}/survey/${appointmentId}`,
    
    // Obtener encuesta de paciente
    byPatient: (patientId: string) =>
      `${API_BASE}/survey/patient/${patientId}`,
    
    // Guardar respuestas de encuesta
    submit: () => 
      `${API_BASE}/survey`,
    
    results: (id: string) => 
      `${API_BASE}/surveys/${id}/results`,
    
    // Templates de encuestas
    templates: () => 
      `${API_BASE}/survey-templates`,
    
    // Estadísticas de encuestas
    stats: (params?: URLSearchParams) => 
      params ? `${API_BASE}/surveys/stats?${params.toString()}` : `${API_BASE}/surveys/stats`,
    
    // Analíticas de encuestas
    analytics: (params?: URLSearchParams) => 
      params ? `${API_BASE}/surveys/analytics?${params.toString()}` : `${API_BASE}/surveys/analytics`,
  },

  // ==================== ASIGNACIÓN DE ENCUESTAS ====================
  assignSurvey: () => `${API_BASE}/assign-survey`,

  // ==================== ESTADÍSTICAS ====================
  statistics: {
    // Estadísticas unificadas
    unified: () => 
      `${API_BASE}/statistics`,
    
    // Estadísticas con filtros
    filtered: (params?: URLSearchParams) => 
      params ? `${API_BASE}/statistics?${params.toString()}` : `${API_BASE}/statistics`,
  },

  // ==================== DATOS DE CLÍNICA ====================
  clinic: {
    // Datos consolidados de la clínica
    data: () => 
      `${API_BASE}/clinic/data`,
    
    // Configuración de la clínica
    config: () => 
      `${API_BASE}/clinic/config`,
    
    // Horarios disponibles
    schedule: (params?: URLSearchParams) => 
      params ? `${API_BASE}/clinic/schedule?${params.toString()}` : `${API_BASE}/clinic/schedule`,
  },

  // ==================== PROCEDIMIENTOS ====================
  procedures: {
    // Lista de procedimientos
    list: () => 
      `${API_BASE}/procedures`,
    
    // Procedimientos por tipo
    byType: (type: string) => 
      `${API_BASE}/procedures/type/${encodeURIComponent(type)}`,
  },
} as const;

// ==================== HELPER FUNCTIONS ====================

/**
 * Construye URLSearchParams de manera segura
 */
export function buildSearchParams(params: Record<string, any>): URLSearchParams {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return; // Skip undefined/null/empty values
    }
    
    if (Array.isArray(value)) {
      value.forEach(item => searchParams.append(key, String(item)));
    } else if (typeof value === 'object') {
      searchParams.append(key, JSON.stringify(value));
    } else {
      searchParams.append(key, String(value));
    }
  });
  
  return searchParams;
}

/**
 * Combina base URL con path y query params de manera segura
 */
function joinPaths(base: string, params?: string | URLSearchParams): string {
  if (!params) return base;
  const queryString = params instanceof URLSearchParams ? params.toString() : params;
  if (!queryString || queryString.length === 0) return base;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${queryString}`;
}

/**
 * Obtiene la URL base de la API según el entorno
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin + '/api';
  }
  
  // En servidor, usa la variable de entorno si está disponible
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  return '/api';
}
