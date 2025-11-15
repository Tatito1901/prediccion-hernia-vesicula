// lib/errors.ts - Centralized error types and helpers (isomorphic: server/client)

export type AppErrorCategory =
  | 'validation'
  | 'auth'
  | 'not_found'
  | 'conflict'
  | 'rate_limit'
  | 'network'
  | 'server'
  | 'unknown';

export interface AppError {
  name: 'AppError';
  message: string; // user-presentable message (can be mapped later)
  code?: string; // stable code when available
  status?: number; // HTTP status if relevant
  category: AppErrorCategory;
  details?: unknown; // extra context (safe)
  cause?: unknown; // original error (not for UI)
}

function categoryFromStatus(status?: number): AppErrorCategory {
  if (!status) return 'unknown';
  if (status === 400 || status === 422) return 'validation';
  if (status === 401) return 'auth';
  if (status === 403) return 'auth';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'server';
  return 'unknown';
}

export function isAppError(e: unknown): e is AppError {
  return !!e && typeof e === 'object' && 'name' in e && e.name === 'AppError';
}

// Best-effort normalization from unknown inputs coming from fetch, Supabase, zod, etc.
export function normalizeError(err: unknown): AppError {
  if (isAppError(err)) return err;

  // Supabase/PostgREST errors or API error payloads often look like { error, message, code, details }
  if (err && typeof err === 'object') {
    const errObj = err as Record<string, unknown>;
    // If it looks like a Response error payload
    if (typeof errObj.message === 'string' || typeof errObj.error === 'string') {
      const status = typeof errObj.status === 'number' ? errObj.status : undefined;
      const code = typeof errObj.code === 'string' ? errObj.code : undefined;
      const message = (errObj.message || errObj.error) as string;
      return {
        name: 'AppError',
        message: message || 'Ocurrió un error',
        code,
        status,
        category: categoryFromStatus(status),
        details: errObj.details,
        cause: err,
      };
    }
    // Supabase client error shape sometimes uses { message, status, hint, details }
    if (typeof errObj.message === 'string' || typeof errObj.hint === 'string') {
      const status = typeof errObj.status === 'number' ? errObj.status : undefined;
      return {
        name: 'AppError',
        message: (errObj.message as string) || 'Ocurrió un error',
        status,
        category: categoryFromStatus(status),
        details: { hint: errObj.hint, details: errObj.details },
        cause: err,
      };
    }
  }

  // Error instances
  if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
    return {
      name: 'AppError',
      message: 'Problemas de conexión. Verifica tu red.',
      category: 'network',
      cause: err,
    };
  }
  if (err instanceof Error) {
    return {
      name: 'AppError',
      message: err.message || 'Ocurrió un error',
      category: 'unknown',
      cause: err,
    };
  }

  // Fallback
  return {
    name: 'AppError',
    message: 'Ocurrió un error',
    category: 'unknown',
    details: err,
  };
}

export function toUserMessage(e: unknown): string {
  const n = normalizeError(e);
  // You can customize by category
  switch (n.category) {
    case 'validation':
      return n.message || 'Datos inválidos. Revisa tu información.';
    case 'auth':
      return n.message || 'No autorizado. Inicia sesión o verifica permisos.';
    case 'not_found':
      return n.message || 'Recurso no encontrado.';
    case 'conflict':
      return n.message || 'Conflicto de datos. Actualiza e intenta de nuevo.';
    case 'rate_limit':
      return 'Muchas solicitudes. Intenta nuevamente en unos momentos.';
    case 'network':
      return 'Problemas de conexión. Verifica tu red.';
    case 'server':
      return 'Error del servidor. Intenta nuevamente más tarde.';
    default:
      return n.message || 'Ocurrió un error inesperado.';
  }
}

// Helper for API routes to emit a consistent JSON error payload
export function jsonError(
  status: number,
  message: string,
  code?: string,
  details?: unknown
) {
  return new Response(
    JSON.stringify({ error: message, code, details, status }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}
