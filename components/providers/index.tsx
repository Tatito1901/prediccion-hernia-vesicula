'use client';

import { useState, createContext, useContext, useCallback } from 'react';
import { ThemeProvider } from "@/components/theme/theme-provider";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { notifyError } from '@/lib/client-errors';
import { Loader2 } from 'lucide-react';

type OverlayAPI = {
  show: (message: string) => void;
  hide: () => void;
  setMessage: (message: string) => void;
};

const OverlayContext = createContext<OverlayAPI>({
  show: () => {},
  hide: () => {},
  setMessage: () => {},
});

export function useGlobalOverlay() {
  return useContext(OverlayContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Permite desactivar toasts globales por query usando meta
        const suppress = query?.options?.meta && (query.options.meta as any).suppressGlobalError;
        if (!suppress) notifyError(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        const suppress = mutation?.options?.meta && (mutation.options.meta as any).suppressGlobalError;
        if (!suppress) notifyError(error);
      },
    }),
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 60_000,
      },
    },
  }));

  const [overlay, setOverlay] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const show = useCallback((message: string) => setOverlay({ visible: true, message }), []);
  const hide = useCallback(() => setOverlay((s) => ({ ...s, visible: false })), []);
  const setMessage = useCallback((message: string) => setOverlay((s) => ({ ...s, message })), []);


  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <OverlayContext.Provider value={{ show, hide, setMessage }}>
        <QueryClientProvider client={queryClient}>
          {children}
          {overlay.visible && (
            <div className="fixed inset-0 z-[1000] bg-slate-950/60 backdrop-blur-sm">
              <div className="flex h-full items-center justify-center">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                  <p className="mt-3 text-slate-200 font-medium">{overlay.message || 'Cargando...'}</p>
                </div>
              </div>
            </div>
          )}
        </QueryClientProvider>
      </OverlayContext.Provider>
    </ThemeProvider>
  );
}
