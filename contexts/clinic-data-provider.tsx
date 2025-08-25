// contexts/clinic-data-provider.tsx
'use client';

import React, { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { useClinicData } from '@/hooks/use-clinic-data';
// Removed Zustand stores: React Query (useClinicData) is the single source of truth

import type { Patient, Appointment, ExtendedAppointment, PatientStatus } from '@/lib/types';
import type { ClinicDataState, UseClinicDataReturn } from '@/hooks/use-clinic-data';

// ==================== TIPOS Y CONTRATOS ====================

// Tipo extendido que incluye tanto los datos básicos como la funcionalidad de paginación
type ExtendedClinicDataContextType = UseClinicDataReturn & {
  // Funcionalidad de paginación de pacientes
  patientsData?: {
    data: Patient[];
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
  refetchPatients: () => Promise<void>;
  // ✅ Propiedades adicionales proporcionadas en el contexto
  paginatedPatients?: Patient[] | null;
  patientsPagination?: ClinicDataState['patients']['pagination'];
  patientsStats?: ClinicDataState['patients']['stats'] | null;
  // ✅ Compatibilidad hacia atrás con el provider legado
  allPatients: Patient[];
  allAppointments: (Appointment | ExtendedAppointment)[];
  enrichedPatients: Patient[];
  appointmentsWithPatientData: (Appointment | ExtendedAppointment)[];
  appointmentsSummary?: ClinicDataState['appointments']['summary'];
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

  // Crear estructura de datos compatible con el contrato anterior usando únicamente React Query
  const patientsData = useMemo<{ data: Patient[]; count: number }>(() => {
    const paginated = clinic.patients?.paginated ?? [];
    const count = clinic.patients?.pagination?.totalCount ?? (paginated?.length ?? 0);
    return { data: paginated, count };
  }, [clinic.patients?.paginated, clinic.patients?.pagination?.totalCount]);

  // Filtros compatibles
  const patientsFilters = useMemo(() => ({
    page: clinic.filters.page ?? 1,
    search: clinic.filters.search ?? '',
    status: clinic.filters.patientStatus === 'ALL' ? 'all' : String(clinic.filters.patientStatus ?? 'all'),
  }), [clinic.filters.page, clinic.filters.search, clinic.filters.patientStatus]);

  // Funciones de manejo de filtros mapeadas al hook central
  const setPatientsPage = useCallback((page: number) => {
    clinic.setPage(page);
  }, [clinic]);

  const setPatientsSearch = useCallback((search: string) => {
    clinic.setFilters({ search, page: 1 });
  }, [clinic]);

  const setPatientsStatus = useCallback((status: string) => {
    clinic.setFilters({ patientStatus: status === 'all' ? 'ALL' : (status as PatientStatus), page: 1 });
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

  const allAppointments = useMemo<(Appointment | ExtendedAppointment)[]>(() => {
    const today = clinic.appointments?.today ?? [];
    const future = clinic.appointments?.future ?? [];
    const past = clinic.appointments?.past ?? [];
    return [...today, ...future, ...past] as (Appointment | ExtendedAppointment)[];
  }, [clinic.appointments?.today, clinic.appointments?.future, clinic.appointments?.past]);

  // Los pacientes ya vienen enriquecidos desde el backend
  const enrichedPatients = allPatients;

  // Alias simple: dejamos que los componentes hagan el enriquecimiento adicional si lo requieren
  const appointmentsWithPatientData = useMemo<(Appointment | ExtendedAppointment)[]>(() => {
    return allAppointments;
  }, [allAppointments]);

  const appointmentsSummary = useMemo(() => clinic.appointments?.summary, [clinic.appointments?.summary]);

  // Valor combinado del contexto
  const contextValue = useMemo(() => ({
    ...clinic,
    // ===== Pacientes via React Query =====
    patientsData,
    patientsFilters,
    setPatientsPage,
    setPatientsSearch,
    setPatientsStatus,
    clearPatientsFilters,
    isPatientsLoading: clinic.loading,
    patientsError: clinic.error,
    refetchPatients: clinic.refetch,
    // Datos adicionales de paginación
    paginatedPatients: clinic.patients?.paginated ?? [],
    patientsPagination: clinic.patients?.pagination,
    patientsStats: clinic.patients?.stats ?? null,
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
