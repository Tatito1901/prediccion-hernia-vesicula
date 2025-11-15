// lib/api-response-types.ts - Estructuras de respuesta API normalizadas
// ✅ SOLUCIÓN: Interfaz consistente para todas las respuestas API
// Refactorizado: Eliminados todos los 'any' para mejor type safety

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiMeta {
  usedClient?: 'admin' | 'server';
  params?: Record<string, string | number | boolean | null>;
  timestamp?: string;
  duration?: number;
}

export interface ApiErrorDetails {
  code?: string;
  validation_errors?: ValidationError[];
  suggested_actions?: string[];
  existing_patient?: {
    id: string;
    nombre: string;
    apellidos: string;
  };
  [key: string]: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: ApiErrorDetails;
  pagination?: PaginationInfo;
  summary?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  meta?: ApiMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: ApiErrorDetails;
  code?: string;
  validation_errors?: ValidationError[];
  suggested_actions?: string[];
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: PaginationInfo;
  summary?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  meta?: ApiMeta;
}

// Utility para crear respuestas consistentes
export const createApiResponse = <T>(
  data: T,
  options?: {
    message?: string;
    pagination?: PaginationInfo;
    summary?: Record<string, unknown>;
    stats?: Record<string, unknown>;
    meta?: ApiMeta;
  }
): ApiSuccessResponse<T> => ({
  success: true,
  data,
  ...options,
});

export const createApiError = (
  error: string,
  options?: {
    message?: string;
    details?: ApiErrorDetails;
    code?: string;
    validation_errors?: ValidationError[];
    suggested_actions?: string[];
  }
): ApiErrorResponse => ({
  success: false,
  error,
  ...options,
});

// Type guards
export const isApiError = (response: unknown): response is ApiErrorResponse => {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    response.success === false
  );
};

export const isApiSuccess = <T>(response: unknown): response is ApiSuccessResponse<T> => {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    response.success === true
  );
};

// Helper para tipos paginados
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
  summary?: Record<string, unknown>;
}

// Helper para extraer tipo de error de mutations
export interface MutationErrorPayload extends ApiErrorDetails {
  status?: number;
}
