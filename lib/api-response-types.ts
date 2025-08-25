// lib/api-response-types.ts - Estructuras de respuesta API normalizadas
// ✅ SOLUCIÓN: Interfaz consistente para todas las respuestas API

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: any;
  pagination?: PaginationInfo;
  summary?: any;
  stats?: any;
  meta?: {
    usedClient?: 'admin' | 'server';
    params?: Record<string, any>;
    timestamp?: string;
    duration?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: any;
  code?: string;
  validation_errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  suggested_actions?: string[];
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  pagination?: PaginationInfo;
  summary?: any;
  stats?: any;
  meta?: any;
}

// Utility para crear respuestas consistentes
export const createApiResponse = <T>(
  data: T,
  options?: {
    message?: string;
    pagination?: PaginationInfo;
    summary?: any;
    stats?: any;
    meta?: any;
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
    details?: any;
    code?: string;
    validation_errors?: ApiErrorResponse['validation_errors'];
    suggested_actions?: string[];
  }
): ApiErrorResponse => ({
  success: false,
  error,
  ...options,
});

// Type guards
export const isApiError = (response: any): response is ApiErrorResponse => {
  return response && response.success === false;
};

export const isApiSuccess = <T>(response: any): response is ApiSuccessResponse<T> => {
  return response && response.success === true;
};
