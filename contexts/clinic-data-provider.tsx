// contexts/clinic-data-provider.tsx
'use client';

import React, { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { useClinicData } from '@/hooks/use-clinic-data';


// ==================== TIPOS Y CONTRATOS ====================

// Tipo extendido que incluye tanto los datos básicos como la funcionalidad de paginación
type ExtendedClinicDataContextType = ReturnType<typeof useClinicData> & {
  // Funcionalidad de paginación de pacientes
  patientsData?: {
    data: any[];
    count: number;
  };
  patientsFilters: {
    page: number;
    search: string;
    status: string;
  };
  setPatientsPage: (page: number) => void;
  setPatientsSearch: (search: string) => void;
  setPatientsStatus: (status: string) => void;
  clearPatientsFilters: () => void;
  isPatientsLoading: boolean;
  // isPatientsFetching: boolean; // Removed: not available in UnifiedPatientDataResponse
  patientsError: Error | null;
  refetchPatients: () => void;
  // ✅ Propiedades adicionales proporcionadas en el contexto
  paginatedPatients?: any[];
  patientsPagination?: any;
  patientsStats?: any;
  // ✅ Compatibilidad hacia atrás con el provider legado
  allPatients: any[];
  allAppointments: any[];
  enrichedPatients: any[];
  appointmentsWithPatientData: any[];
  appointmentsSummary?: {
    total_appointments: number;
    today_count: number;
    future_count: number;
    past_count: number;
  };
  // Alias de estados
  isLoading: boolean;
  isLoadingAppointments?: boolean;
  error: Error | null;
};

export type ClinicDataContextType = ExtendedClinicDataContextType;

const ClinicDataContext = createContext<ClinicDataContextType | undefined>(
  undefined
);

// ==================== PROVEEDOR ====================

export const ClinicDataProvider = ({ children }: { children: ReactNode }) => {
  // Fuente única de verdad centralizada
  const clinic = useClinicData();

  // Crear estructura de datos compatible con el contrato anterior
  const patientsData = useMemo(() => {
    if (!clinic?.patients) return undefined;
    return {
      data: clinic.patients.paginated,
      count: clinic.patients.pagination?.totalCount ?? clinic.patients.paginated?.length ?? 0,
    };
  }, [clinic?.patients]);

  // Filtros compatibles
  const patientsFilters = useMemo(() => ({
    page: clinic.filters.page ?? 1,
    search: clinic.filters.search ?? '',
    status: clinic.filters.patientStatus === 'ALL' ? 'all' : String(clinic.filters.patientStatus ?? 'all'),
  }), [clinic.filters]);

  // Funciones de manejo de filtros mapeadas al hook central
  const setPatientsPage = useCallback((page: number) => {
    clinic.setPage(page);
  }, [clinic]);

  const setPatientsSearch = useCallback((search: string) => {
    clinic.setFilters({ search, page: 1 });
  }, [clinic]);

  const setPatientsStatus = useCallback((status: string) => {
    clinic.setFilters({ patientStatus: status === 'all' ? 'ALL' : (status as any), page: 1 });
  }, [clinic]);

  const clearPatientsFilters = useCallback(() => {
    clinic.resetFilters();
  }, [clinic]);

  // ===== Mapeo de compatibilidad con API legada =====
  const allPatients = useMemo(() => {
    const pag = clinic.patients?.paginated ?? [];
    const act = clinic.patients?.active ?? [];
    return (pag && pag.length > 0) ? pag : act;
  }, [clinic.patients?.paginated, clinic.patients?.active]);

  const allAppointments = useMemo(() => {
    return clinic.appointments?.today ?? [];
  }, [clinic.appointments?.today]);

  // Los pacientes ya vienen enriquecidos desde el backend
  const enrichedPatients = allPatients;

  // Alias simple: dejamos que los componentes hagan el enriquecimiento adicional si lo requieren
  const appointmentsWithPatientData = useMemo(() => {
    return allAppointments as any[];
  }, [allAppointments]);

  const appointmentsSummary = useMemo(() => clinic.appointments?.summary, [clinic.appointments?.summary]);

  // Valor combinado del contexto
  const contextValue = useMemo(() => ({
    ...clinic,
    patientsData,
    patientsFilters,
    setPatientsPage,
    setPatientsSearch,
    setPatientsStatus,
    clearPatientsFilters,
    isPatientsLoading: clinic.loading,
    // isPatientsFetching, // Removed: not available
    patientsError: clinic.error,
    refetchPatients: clinic.refetch,
    // Datos adicionales de paginación
    paginatedPatients: clinic.patients.paginated,
    patientsPagination: clinic.patients.pagination,
    patientsStats: clinic.patients.stats,
    // ===== Exposición de campos heredados =====
    allPatients,
    allAppointments,
    enrichedPatients,
    appointmentsWithPatientData,
    appointmentsSummary,
    // Alias de estados
    isLoading: clinic.loading,
    isLoadingAppointments: clinic.loading,
    error: clinic.error,
  }), [
    clinic,
    patientsData,
    patientsFilters,
    setPatientsPage,
    setPatientsSearch,
    setPatientsStatus,
    clearPatientsFilters,
    allPatients,
    allAppointments,
    appointmentsWithPatientData,
    appointmentsSummary,
  ]);

  return (
    <ClinicDataContext.Provider value={contextValue}>
      {children}
    </ClinicDataContext.Provider>
  );
};

// ==================== HOOK DE CONSUMO ====================

export const useClinic = () => {
  const context = useContext(ClinicDataContext);
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicDataProvider');
  }
  return context;
};
