// lib/debug-config.ts - Sistema de debugging para problemas de sincronización
'use client';

// ✅ SOLUCIÓN: Sistema de debugging centralized para identificar problemas

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

// Performance monitoring
const performanceMetrics = {
  apiCallTimes: new Map<string, number>(),
  renderCounts: new Map<string, number>(),
  effectExecutions: new Map<string, number>(),
};

export const logApiCall = (phase: 'request' | 'response' | 'error', data: any) => {
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
  if (phase === 'request' && data.url) {
    performanceMetrics.apiCallTimes.set(data.url, Date.now());
  }
  if (phase === 'response' && data.url) {
    const startTime = performanceMetrics.apiCallTimes.get(data.url);
    if (startTime) {
      const duration = Date.now() - startTime;
      if (duration > debugConfig.api.slowRequestThreshold) {
        console.warn(`🐌 Slow API call detected: ${data.url} took ${duration}ms`);
      }
      performanceMetrics.apiCallTimes.delete(data.url);
    }
  }
};

export const trackRender = (componentName: string) => {
  if (!debugConfig.performance.trackRenders) return;
  
  const count = performanceMetrics.renderCounts.get(componentName) || 0;
  performanceMetrics.renderCounts.set(componentName, count + 1);
  
  if (count > 0 && count % 10 === 0) {
    console.warn(`🔄 ${componentName} has rendered ${count + 1} times`);
  }
};

export const trackEffect = (effectName: string, dependencies: any[]) => {
  if (!debugConfig.performance.trackEffects) return;
  
  const count = performanceMetrics.effectExecutions.get(effectName) || 0;
  performanceMetrics.effectExecutions.set(effectName, count + 1);
  
  console.log(
    `%c[EFFECT] ${effectName} executed (${count + 1} times)`,
    'color: orange',
    { dependencies }
  );
  
  if (count > 5) {
    console.warn(`⚠️ Effect ${effectName} has executed ${count + 1} times. Check dependencies for infinite loops.`);
  }
};

export const logSyncError = (context: string, error: any, data?: any) => {
  console.error(
    `%c[SYNC ERROR] ${context}`,
    'color: red; font-weight: bold',
    {
      error: error.message || error,
      stack: error.stack,
      data,
      timestamp: new Date().toISOString(),
    }
  );
};

export const validateApiResponse = (response: any, expectedShape?: any): boolean => {
  if (!response) {
    console.error('[API VALIDATION] Response is null or undefined');
    return false;
  }

  // Check for consistent structure
  const hasData = 'data' in response;
  const hasError = 'error' in response;
  const hasSuccess = 'success' in response;

  if (!hasSuccess) {
    console.warn('[API VALIDATION] Response missing "success" field for consistency');
  }

  if (hasError && hasData) {
    console.error('[API VALIDATION] Response has both error and data - inconsistent state');
    return false;
  }

  if (!hasError && !hasData) {
    console.warn('[API VALIDATION] Response has neither error nor data');
    return false;
  }

  return true;
};

export const getPerformanceMetrics = () => ({
  apiCalls: Object.fromEntries(performanceMetrics.apiCallTimes),
  renderCounts: Object.fromEntries(performanceMetrics.renderCounts),
  effectExecutions: Object.fromEntries(performanceMetrics.effectExecutions),
});

// Clear metrics periodically to prevent memory leaks
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (performanceMetrics.apiCallTimes.size > 100) {
      performanceMetrics.apiCallTimes.clear();
    }
    if (performanceMetrics.renderCounts.size > 50) {
      performanceMetrics.renderCounts.clear();
    }
    if (performanceMetrics.effectExecutions.size > 50) {
      performanceMetrics.effectExecutions.clear();
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}
