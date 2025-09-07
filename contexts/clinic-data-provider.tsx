// contexts/clinic-data-provider.tsx
// Wrapper de compatibilidad temporal para migración gradual
// TODO: Eliminar este archivo cuando todos los componentes usen los nuevos hooks directamente
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useClinicData } from '@/hooks/core/use-clinic-data-simplified';
import type { EnrichedPatient } from '@/lib/types';
import { endpoints, buildSearchParams } from '@/lib/api-endpoints';
import { fetchJson } from '@/lib/http';

// Context simplificado - solo pasa los datos del nuevo hook
const ClinicDataContext = createContext<ReturnType<typeof useClinicData> | undefined>(undefined);

export const ClinicDataProvider = ({ children }: { children: ReactNode }) => {
  const clinicData = useClinicData();
  
  return (
    <ClinicDataContext.Provider value={clinicData}>
      {children}
    </ClinicDataContext.Provider>
  );
};

// Hook de compatibilidad que mapea los datos del nuevo formato al formato antiguo
export const useClinic = () => {
  const context = useContext(ClinicDataContext);
  if (!context) {
    throw new Error('useClinic must be used within a ClinicDataProvider');
  }
  
  // Mapear al formato antiguo para compatibilidad
  return {
    ...context,
    // Compatibilidad con nombres antiguos
    loading: context.isLoading,
    enrichedPatients: context.patients.active as EnrichedPatient[],
    allPatients: context.patients.paginated,
    allAppointments: context.appointments.all,
    fetchSpecificAppointments: async (opts: {
      dateFilter: 'range';
      startDate: string;
      endDate: string;
      page?: number;
      pageSize?: number;
      includePatient?: boolean;
      signal?: AbortSignal;
    }) => {
      const params = buildSearchParams({
        dateFilter: opts.dateFilter,
        startDate: opts.startDate,
        endDate: opts.endDate,
        page: opts.page,
        pageSize: opts.pageSize,
        includePatient: opts.includePatient,
      });
      const url = endpoints.appointments.list(params);
      return await fetchJson<{ data: any[]; pagination?: any }>(url, { signal: opts.signal, retry: false });
    },
    fetchPatientDetail: async () => null as any,
    fetchPatientHistory: async () => null as any,
    setFilters: () => {},
    resetFilters: () => {},
    setPage: () => {},
    setPageSize: () => {},
    filters: {},
    errorDetails: {},
    isRetrying: false,
    lastUpdated: Date.now(),
  };
};
