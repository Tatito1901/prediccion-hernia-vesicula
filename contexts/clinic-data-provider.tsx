// contexts/clinic-data-provider.tsx
'use client';

import React, { createContext, useContext, useCallback, useMemo, useRef, useEffect, ReactNode } from 'react';
import { useClinicData } from '@/hooks/use-clinic-data';
// Removed Zustand stores: React Query (useClinicData) is the single source of truth

import type { Patient, Appointment, ExtendedAppointment, PatientStatus, EnrichedPatient } from '@/lib/types';
import type { ClinicDataState, UseClinicDataReturn } from '@/hooks/use-clinic-data';
// Note: enrichment is handled inside useClinicData; no enrichment utilities here
import { dedupeById } from '@/lib/array';

// ==================== TIPOS Y CONTRATOS ====================

// Tipo extendido que incluye tanto los datos básicos como la funcionalidad de paginación
type ExtendedClinicDataContextType = UseClinicDataReturn & {
  // Funcionalidad de paginación de pacientes
  patientsData?: {
    data: EnrichedPatient[];
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
  paginatedPatients?: EnrichedPatient[] | null;
  patientsPagination?: ClinicDataState['patients']['pagination'];
  patientsStats?: ClinicDataState['patients']['stats'] | null;
  // ✅ Compatibilidad hacia atrás con el provider legado
  allPatients: EnrichedPatient[];
  allAppointments: (Appointment | ExtendedAppointment)[];
  enrichedPatients: EnrichedPatient[];
  appointmentsWithPatientData: (Appointment | ExtendedAppointment)[];
  appointmentsSummary?: ClinicDataState['appointments']['summary'];
  // Alias de estados
  isLoading: boolean;
  isLoadingAppointments?: boolean;
  error: Error | null;
  // Chart data desde useClinicData
  chartData?: ClinicDataState['chartData'];
  getChartData?: ClinicDataState['getChartData'];
};

export type ClinicDataContextType = ExtendedClinicDataContextType;

const ClinicDataContext = createContext<ClinicDataContextType | undefined>(
  undefined
);

// ==================== PROVEEDOR ====================

export const ClinicDataProvider = ({ children }: { children: ReactNode }) => {
  // Fuente única de verdad centralizada
  const clinic = useClinicData();

  // ✅ Crear estructura de datos compatible con referencias ESTABLES
  const patientsData = useMemo<{ data: EnrichedPatient[]; count: number }>(() => {
    const enrichedPaginated = clinic.patients?.paginated ?? [];
    const totalCount = clinic.patients?.pagination?.totalCount;
    const count = totalCount ?? enrichedPaginated.length;
    return { data: enrichedPaginated, count };
  }, [
    clinic.patients?.paginated,
    clinic.patients?.pagination?.totalCount
  ]); // ✅ Los pacientes ya vienen enriquecidos desde useClinicData

  // Filtros compatibles
  const patientsFilters = useMemo(() => ({
    page: clinic.filters.page ?? 1,
    search: clinic.filters.search ?? '',
    status: clinic.filters.patientStatus === 'ALL' ? 'all' : String(clinic.filters.patientStatus ?? 'all'),
  }), [clinic.filters.page, clinic.filters.search, clinic.filters.patientStatus]);

  // Funciones de manejo de filtros mapeadas al hook central
  const setPatientsPage = useCallback((page: number) => {
    clinic.setPage(page);
  }, [clinic.setPage]);

  const setPatientsSearch = useCallback((search: string) => {
    clinic.setFilters({ search, page: 1 });
  }, [clinic.setFilters]);

  const setPatientsStatus = useCallback((status: string) => {
    clinic.setFilters({ patientStatus: status === 'all' ? 'ALL' : (status as PatientStatus), page: 1 });
  }, [clinic.setFilters]);

  const clearPatientsFilters = useCallback(() => {
    clinic.resetFilters();
  }, [clinic.resetFilters]);

  // ===== Mapeo de compatibilidad con API legada =====
  const allPatients = useMemo(() => {
    const pag = clinic.patients?.paginated ?? [];
    const act = clinic.patients?.active ?? [];
    const enriched = (pag && pag.length > 0) ? pag : act;
    return enriched;
  }, [clinic.patients?.paginated, clinic.patients?.active]);

  const allAppointments = useMemo<(Appointment | ExtendedAppointment)[]>(() => {
    const today = clinic.appointments?.today ?? [];
    const future = clinic.appointments?.future ?? [];
    const past = clinic.appointments?.past ?? [];
    // Ensure no duplicates across categories by id
    return dedupeById([
      ...(today as (Appointment | ExtendedAppointment)[]),
      ...(future as (Appointment | ExtendedAppointment)[]),
      ...(past as (Appointment | ExtendedAppointment)[]),
    ]);
  }, [clinic.appointments?.today, clinic.appointments?.future, clinic.appointments?.past]);

  // Alias: los pacientes ya están enriquecidos en el hook
  const enrichedPatients = allPatients;

  // Alias simple: dejamos que los componentes hagan el enriquecimiento adicional si lo requieren
  const appointmentsWithPatientData = useMemo<(Appointment | ExtendedAppointment)[]>(() => {
    return allAppointments;
  }, [allAppointments]);

  const appointmentsSummary = useMemo(() => clinic.appointments?.summary, [clinic.appointments?.summary]);

  // ✅ Estabilizar datos críticos
  const stablePatients = useMemo(
    () => clinic.patients,
    [
      clinic.patients.paginated,
      clinic.patients.active,
      clinic.patients.pagination?.page,
      clinic.patients.pagination?.pageSize,
      clinic.patients.pagination?.totalCount,
      clinic.patients.pagination?.totalPages,
      clinic.patients.pagination?.hasMore,
      clinic.patients.stats,
    ]
  );
  
  const stableAppointments = useMemo(
    () => clinic.appointments,
    [clinic.appointments.today, clinic.appointments.future, clinic.appointments.past]
  );

  // ✅ Usar useRef para funciones que no cambian frecuentemente
  const actionsRef = useRef({
    setFilters: clinic.setFilters,
    resetFilters: clinic.resetFilters,
    refetch: clinic.refetch,
    fetchSpecificAppointments: clinic.fetchSpecificAppointments,
    fetchPatientDetail: clinic.fetchPatientDetail,
    fetchPatientHistory: clinic.fetchPatientHistory,
  });

  // ✅ Actualizar ref solo cuando sea necesario
  useEffect(() => {
    actionsRef.current = {
      setFilters: clinic.setFilters,
      resetFilters: clinic.resetFilters,
      refetch: clinic.refetch,
      fetchSpecificAppointments: clinic.fetchSpecificAppointments,
      fetchPatientDetail: clinic.fetchPatientDetail,
      fetchPatientHistory: clinic.fetchPatientHistory,
    };
  }, [clinic.setFilters, clinic.resetFilters, clinic.refetch, clinic.fetchSpecificAppointments, clinic.fetchPatientDetail, clinic.fetchPatientHistory]);

  // ✅ Context value más estable y optimizado
  const contextValue = useMemo<ExtendedClinicDataContextType>(() => ({
    // From useClinicData - spread all properties
    ...clinic,
    // Override/add specific properties
    isLoading: clinic.loading,
    errorDetails: clinic.errorDetails || {},
    isRetrying: clinic.isRetrying || false,
    // Core stable data
    patients: stablePatients,
    appointments: stableAppointments,
    patientsData,
    patientsFilters,
    setPatientsPage,
    setPatientsSearch,
    setPatientsStatus,
    clearPatientsFilters,
    isPatientsLoading: clinic.loading,
    patientsError: clinic.error,
    refetchPatients: clinic.refetch,
    // ✅ Propiedades adicionales más estables
    paginatedPatients: clinic.patients?.paginated,
    patientsPagination: clinic.patients?.pagination,
    patientsStats: clinic.patients?.stats || null,
    // ✅ Compatibilidad hacia atrás
    allPatients,
    allAppointments,
    enrichedPatients,
    appointmentsWithPatientData,
    appointmentsSummary,
    // Chart data
    chartData: clinic.chartData,
    getChartData: clinic.getChartData,
  }), [
    clinic,
    stablePatients, 
    stableAppointments, 
    patientsData,
    patientsFilters,
    setPatientsPage,
    setPatientsSearch,
    setPatientsStatus,
    clearPatientsFilters,
    allPatients,
    allAppointments,
    enrichedPatients,
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
