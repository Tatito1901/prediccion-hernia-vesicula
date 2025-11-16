// lib/api-response-types.ts - Estructuras de respuesta API normalizadas
// ✅ SOLUCIÓN: Interfaz consistente para todas las respuestas API

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ApiResponseMeta {
  usedClient?: 'admin' | 'server';
  params?: Record<string, string | number | boolean | null>;
  timestamp?: string;
  duration?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: Record<string, unknown> | string | null;
  pagination?: PaginationInfo;
  summary?: Record<string, unknown>;
  stats?: Record<string, number | string>;
  meta?: ApiResponseMeta;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: Record<string, unknown> | string | null;
  code?: string;
  validation_errors?: ValidationError[];
  suggested_actions?: string[];
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  pagination?: PaginationInfo;
  summary?: Record<string, unknown>;
  stats?: Record<string, number | string>;
  meta?: ApiResponseMeta;
}

// Utility para crear respuestas consistentes
export const createApiResponse = <T>(
  data: T,
  options?: {
    message?: string;
    pagination?: PaginationInfo;
    summary?: Record<string, unknown>;
    stats?: Record<string, number | string>;
    meta?: ApiResponseMeta;
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
    details?: Record<string, unknown> | string | null;
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
  return typeof response === 'object' && response !== null &&
         'success' in response && response.success === false;
};

export const isApiSuccess = <T = unknown>(response: unknown): response is ApiSuccessResponse<T> => {
  return typeof response === 'object' && response !== null &&
         'success' in response && response.success === true;
};
