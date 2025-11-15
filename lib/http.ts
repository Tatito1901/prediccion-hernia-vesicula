// lib/http.ts - Centralized HTTP client with error handling
import { normalizeError, type AppError } from '@/lib/errors';

// Configuration options for HTTP requests
export interface HttpOptions extends RequestInit {
  baseURL?: string;
  timeout?: number;
  retry?: boolean | number;
  retryDelay?: number | ((attempt: number) => number);
}

// Default configuration
const DEFAULT_CONFIG: HttpOptions = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds
  retry: false,
};

// Helper to merge headers
function mergeHeaders(...headers: (HeadersInit | undefined)[]): HeadersInit {
  const merged = new Headers();
  headers.forEach(h => {
    if (!h) return;
    const entries = h instanceof Headers 
      ? Array.from(h.entries())
      : Array.isArray(h) 
        ? h 
        : Object.entries(h);
    entries.forEach(([key, value]) => merged.set(key, value));
  });
  return merged;
}

// Sleep helper for retry logic
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main fetch wrapper with enhanced features
export async function fetchJson<T = unknown>(
  input: RequestInfo | URL, 
  options: HttpOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_CONFIG, ...options };
  const maxRetries = typeof config.retry === 'number' ? config.retry : config.retry ? 2 : 0;
  
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add timeout support
      const controller = config.timeout ? new AbortController() : null;
      const timeoutId = controller && config.timeout
        ? setTimeout(() => controller.abort(), config.timeout)
        : null;

      const res = await fetch(input, {
        ...config,
        headers: mergeHeaders(DEFAULT_CONFIG.headers, config.headers),
        signal: controller?.signal || config.signal,
      });
      
      if (timeoutId) clearTimeout(timeoutId);
      
      const contentType = res.headers.get('content-type') || '';

      if (!res.ok) {
        // Try to parse JSON error payload and include status
        let payload: unknown = null;
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
        const payloadObj = payload as Record<string, unknown> | null;
        const err: AppError = {
          name: 'AppError',
          message: (payloadObj?.error as string) || (payloadObj?.message as string) || `HTTP ${res.status}`,
          code: payloadObj?.code as string | undefined,
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
          details: payloadObj ?? undefined,
        };
        
        // Don't retry on client errors (4xx)
        if (res.status >= 400 && res.status < 500) {
          throw err;
        }
        
        lastError = err;
        
        // Retry logic for server errors
        if (attempt < maxRetries) {
          const delay = typeof config.retryDelay === 'function'
            ? config.retryDelay(attempt)
            : config.retryDelay || Math.min(1000 * Math.pow(2, attempt), 10000);
          await sleep(delay);
          continue;
        }
        
        throw err;
      }

      if (contentType.includes('application/json')) {
        return (await res.json()) as T;
      }
      // If not JSON, return text content cast to expected type
      return (await res.text()) as unknown as T;
    } catch (e) {
      // Handle timeout
      if (e instanceof Error && e.name === 'AbortError') {
        lastError = {
          name: 'AppError',
          message: 'La solicitud tardó demasiado tiempo',
          category: 'network',
          cause: e,
        } as AppError;
        
        if (attempt < maxRetries) {
          const delay = typeof config.retryDelay === 'function'
            ? config.retryDelay(attempt)
            : config.retryDelay || Math.min(1000 * Math.pow(2, attempt), 10000);
          await sleep(delay);
          continue;
        }
      }
      
      lastError = e;
      
      // Only retry on network errors
      const errObj = e as { category?: string };
      if (attempt < maxRetries &&
          (e instanceof TypeError || errObj?.category === 'network' || errObj?.category === 'server')) {
        const delay = typeof config.retryDelay === 'function'
          ? config.retryDelay(attempt)
          : config.retryDelay || Math.min(1000 * Math.pow(2, attempt), 10000);
        await sleep(delay);
        continue;
      }
      
      throw normalizeError(e);
    }
  }
  
  throw normalizeError(lastError);
}

// Specialized fetcher for React Query / SWR
// This version doesn't retry (React Query handles that)
export async function queryFetcher<T = unknown>(url: string): Promise<T> {
  return fetchJson<T>(url, { retry: false });
}
