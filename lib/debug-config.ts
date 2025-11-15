// lib/debug-config.ts - Sistema de debugging para problemas de sincronización
'use client';

// ✅ SOLUCIÓN: Sistema de debugging centralized para identificar problemas

// Types for debug logging
interface ApiCallData {
  url?: string
  method?: string
  body?: unknown
  headers?: Record<string, string>
  status?: number
  [key: string]: unknown
}

interface ErrorData {
  message?: string
  stack?: string
  code?: string
  [key: string]: unknown
}

interface ApiResponse {
  data?: unknown
  error?: string | ErrorData
  success?: boolean
  [key: string]: unknown
}

export const debugConfig = {
  api: {
    logRequests: process.env.NEXT_PUBLIC_DEBUG_API === 'true',
    logResponses: process.env.NEXT_PUBLIC_DEBUG_API === 'true',
    logErrors: true,
    slowRequestThreshold: 3000, // ms
  },
  reactQuery: {
    defaultStaleTime: 2 * 60 * 1000, // 2 min
    defaultCacheTime: 5 * 60 * 1000, // 5 min
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    maxRetries: 2,
  },
  performance: {
    trackRenders: process.env.NODE_ENV === 'development',
    trackEffects: process.env.NODE_ENV === 'development',
    warnSlowOperations: true,
  },
};

// Performance monitoring (bounded + HMR-safe)
type Timed<T> = { v: T; t: number };

function createBoundedMap<T>(maxEntries: number, ttlMs: number) {
  const m = new Map<string, Timed<T>>();

  const set = (key: string, value: T) => {
    const now = Date.now();
    m.set(key, { v: value, t: now });
    // Trim oldest if we exceed max entries (simple FIFO eviction)
    while (m.size > maxEntries) {
      const firstKey = m.keys().next().value as string | undefined;
      if (firstKey === undefined) break;
      m.delete(firstKey);
    }
  };

  const get = (key: string): T | undefined => {
    const now = Date.now();
    const entry = m.get(key);
    if (!entry) return undefined;
    if (now - entry.t > ttlMs) {
      m.delete(key);
      return undefined;
    }
    return entry.v;
  };

  const incr = (key: string) => {
    const current = (get(key) as unknown as number) ?? 0;
    const next = (current + 1) as unknown as T;
    set(key, next);
    return current + 1;
  };

  const cleanup = () => {
    const now = Date.now();
    for (const [k, entry] of m) {
      if (now - entry.t > ttlMs) m.delete(k);
    }
    while (m.size > maxEntries) {
      const firstKey = m.keys().next().value as string | undefined;
      if (firstKey === undefined) break;
      m.delete(firstKey);
    }
  };

  const entries = () => Array.from(m.entries());

  return { set, get, incr, cleanup, entries } as const;
}

interface DebugState {
  apiCallTimes: ReturnType<typeof createBoundedMap<number>>;
  renderCounts: ReturnType<typeof createBoundedMap<number>>;
  effectExecutions: ReturnType<typeof createBoundedMap<number>>;
  intervalId?: number;
}

declare global {
  interface Window {
    __APP_DEBUG_STATE__?: DebugState;
  }
}

const DEBUG_ENABLED =
  debugConfig.api.logRequests ||
  debugConfig.api.logResponses ||
  debugConfig.performance.trackRenders ||
  debugConfig.performance.trackEffects;

function getDebugState(): DebugState | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { __APP_DEBUG_STATE__?: DebugState };
  if (!w.__APP_DEBUG_STATE__) {
    const TTL_MS = 5 * 60 * 1000; // 5 min TTL por entrada
    const MAX = 200; // límite superior razonable y acotado
    w.__APP_DEBUG_STATE__ = {
      apiCallTimes: createBoundedMap<number>(MAX, TTL_MS),
      renderCounts: createBoundedMap<number>(MAX, TTL_MS),
      effectExecutions: createBoundedMap<number>(MAX, TTL_MS),
    };
  }
  return w.__APP_DEBUG_STATE__!;
}

function initCleanupLoopIfNeeded() {
  if (typeof window === 'undefined' || !DEBUG_ENABLED) return;
  const state = getDebugState();
  if (!state) return;
  if (state.intervalId) return; // evitar múltiples intervals en HMR

  const id = window.setInterval(() => {
    state.apiCallTimes.cleanup();
    state.renderCounts.cleanup();
    state.effectExecutions.cleanup();
  }, 60 * 1000); // limpieza ligera cada 60s

  state.intervalId = id;

  // Limpieza en descarte de pestaña
  window.addEventListener('beforeunload', () => {
    if (state.intervalId) window.clearInterval(state.intervalId);
    state.intervalId = undefined;
  });
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        state.apiCallTimes.cleanup();
        state.renderCounts.cleanup();
        state.effectExecutions.cleanup();
      }
    });
  }
}

export const logApiCall = (phase: 'request' | 'response' | 'error', data: ApiCallData) => {
  if (!debugConfig.api.logRequests && phase === 'request') return;
  if (!debugConfig.api.logResponses && phase === 'response') return;
  if (!debugConfig.api.logErrors && phase === 'error') return;
  
  const timestamp = new Date().toISOString();
  const color = phase === 'error' ? 'color: red' : phase === 'request' ? 'color: blue' : 'color: green';
  
  console.log(
    `%c[${phase.toUpperCase()}] ${timestamp}`,
    color,
    data
  );

  // Track slow requests
  initCleanupLoopIfNeeded();
  const state = getDebugState();
  if (!state) return;
  if (phase === 'request' && data?.url) {
    state.apiCallTimes.set(String(data.url), Date.now());
  }
  if (phase === 'response' && data?.url) {
    const startTime = state.apiCallTimes.get(String(data.url));
    if (typeof startTime === 'number') {
      const duration = Date.now() - startTime;
      if (duration > debugConfig.api.slowRequestThreshold) {
        console.warn(`🐌 Slow API call detected: ${data.url} took ${duration}ms`);
      }
      // No es necesario eliminar explícitamente; TTL limpiará, pero podemos limpiar temprano
      state.apiCallTimes.set(String(data.url), Date.now()); // re-touch para permitir medición de respuestas tardías sucesivas
    }
  }
};

export const trackRender = (componentName: string) => {
  if (!debugConfig.performance.trackRenders) return;
  
  initCleanupLoopIfNeeded();
  const state = getDebugState();
  if (!state) return;
  const next = state.renderCounts.incr(componentName);
  if (next % 10 === 0) {
    console.warn(`🔄 ${componentName} has rendered ${next} times`);
  }
};

export const trackEffect = (effectName: string, dependencies: unknown[]) => {
  if (!debugConfig.performance.trackEffects) return;

  initCleanupLoopIfNeeded();
  const state = getDebugState();
  if (!state) return;
  const next = state.effectExecutions.incr(effectName);

  console.log(
    `%c[EFFECT] ${effectName} executed (${next} times)`,
    'color: orange',
    { dependencies }
  );
  
  if (next > 5) {
    console.warn(`⚠️ Effect ${effectName} has executed ${next} times. Check dependencies for infinite loops.`);
  }
};

export const logSyncError = (context: string, error: unknown, data?: unknown) => {
  // Definitively avoid triggering Next.js error overlays from client logs.
  // No-op by default. Enable only when explicitly requested via env flag.
  if (process.env.NEXT_PUBLIC_ENABLE_SYNC_ERROR_LOG === 'true') {
    try {
      const err = error as ErrorData
      const payload = {
        error: (err && (err.message || String(err))) ?? 'Unknown error',
        stack: err?.stack,
        data,
        timestamp: new Date().toISOString(),
      };
      // Schedule as microtask to avoid logging during render phase
      // and use warn instead of error.
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(() => console.warn(`[SYNC ERROR] ${context}`, payload));
      } else {
        setTimeout(() => console.warn(`[SYNC ERROR] ${context}`, payload), 0);
      }
    } catch (_) {
      // swallow
    }
  }
};

export const validateApiResponse = (response: unknown, expectedShape?: unknown): boolean => {
  if (!response || typeof response !== 'object') {
    console.warn('[API VALIDATION] Response is null, undefined, or not an object');
    return false;
  }

  const resp = response as ApiResponse

  // Check for consistent structure
  const hasData = 'data' in resp;
  const hasError = 'error' in resp;
  const hasSuccess = 'success' in resp;

  if (!hasSuccess) {
    console.warn('[API VALIDATION] Response missing "success" field for consistency');
  }

  if (hasError && hasData) {
    console.warn('[API VALIDATION] Response has both error and data - inconsistent state');
    return false;
  }

  if (!hasError && !hasData) {
    console.warn('[API VALIDATION] Response has neither error nor data');
    return false;
  }

  return true;
};

export const getPerformanceMetrics = () => ({
  apiCalls: (() => {
    const s = getDebugState();
    if (!s) return {} as Record<string, number>;
    return Object.fromEntries(
      s.apiCallTimes.entries().map(([k, e]) => [k, e.v])
    ) as Record<string, number>;
  })(),
  renderCounts: (() => {
    const s = getDebugState();
    if (!s) return {} as Record<string, number>;
    return Object.fromEntries(
      s.renderCounts.entries().map(([k, e]) => [k, e.v])
    ) as Record<string, number>;
  })(),
  effectExecutions: (() => {
    const s = getDebugState();
    if (!s) return {} as Record<string, number>;
    return Object.fromEntries(
      s.effectExecutions.entries().map(([k, e]) => [k, e.v])
    ) as Record<string, number>;
  })(),
});

// Inicializa limpieza periódica solo cuando el debug está habilitado y en cliente
initCleanupLoopIfNeeded();
