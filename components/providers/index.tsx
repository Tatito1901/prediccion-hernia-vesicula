'use client';

import { useState } from 'react';
import { ThemeProvider } from "@/components/theme/theme-provider";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClinicDataProvider } from '@/contexts/clinic-data-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
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
        <ClinicDataProvider>
          {children}
        </ClinicDataProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
