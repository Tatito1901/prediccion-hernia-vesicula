// lib/http.ts - Minimal fetch wrapper that throws normalized AppError on non-2xx
import { normalizeError, type AppError } from '@/lib/errors';

export async function fetchJson<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      // Try to parse JSON error payload and include status
      let payload: any = null;
      if (contentType.includes('application/json')) {
        try {
          payload = await res.json();
        } catch (_) {
          // ignore json parse error
        }
      } else {
        try {
          payload = { error: await res.text() };
        } catch (_) {
          payload = null;
        }
      }
      const err: AppError = {
        name: 'AppError',
        message: payload?.error || payload?.message || `HTTP ${res.status}`,
        code: payload?.code,
        status: res.status,
        category: ((): AppError['category'] => {
          if (res.status === 400 || res.status === 422) return 'validation';
          if (res.status === 401 || res.status === 403) return 'auth';
          if (res.status === 404) return 'not_found';
          if (res.status === 409) return 'conflict';
          if (res.status === 429) return 'rate_limit';
          if (res.status >= 500) return 'server';
          return 'unknown';
        })(),
        // Expose the full payload so callers can read fields like
        // validation_errors, suggested_actions, and any custom details.
        details: payload ?? undefined,
      };
      throw err;
    }

    if (contentType.includes('application/json')) {
      return (await res.json()) as T;
    }
    // If not JSON, still return text as any
    return (await res.text()) as unknown as T;
  } catch (e) {
    throw normalizeError(e);
  }
}
