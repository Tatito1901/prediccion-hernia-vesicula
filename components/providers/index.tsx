'use client';

import { useState } from 'react';
import { ThemeProvider } from "@/components/theme/theme-provider";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { notifyError } from '@/lib/client-errors';

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

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
