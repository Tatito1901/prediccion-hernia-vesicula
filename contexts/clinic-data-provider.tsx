// contexts/clinic-data-provider.tsx
'use client';

import React, { createContext, useContext, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { useClinicData } from '@/hooks/use-clinic-data';
import { usePatientStore } from '@/stores/patient-store';
import { useAppointmentStore } from '@/stores/appointment-store';


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
  refetchPatients: () => Promise<void>;
  // ✅ Propiedades adicionales proporcionadas en el contexto
  paginatedPatients?: any[] | null;
  patientsPagination?: any;
  patientsStats?: any | null;
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

  // ===== Migración a Zustand: pacientes =====
  const sPaginatedPatients = usePatientStore(s => s.paginatedPatients)
  const sPatientsPagination = usePatientStore(s => s.patientsPagination)
  const sPatientsStats = usePatientStore(s => s.patientsStats)
  const sPatientsFilters = usePatientStore(s => s.patientsFilters)
  const sIsPatientsLoading = usePatientStore(s => s.isPatientsLoading)
  const sPatientsError = usePatientStore(s => s.patientsError)
  const sSetPatientsPage = usePatientStore(s => s.setPatientsPage)
  const sSetPatientsSearch = usePatientStore(s => s.setPatientsSearch)
  const sSetPatientsStatus = usePatientStore(s => s.setPatientsStatus)
  const sClearPatientsFilters = usePatientStore(s => s.clearPatientsFilters)
  const sRefetchPatients = usePatientStore(s => s.refetchPatients)
  const sFetchPatients = usePatientStore(s => s.fetchPatients)

  // Fetch inicial si no hay datos en el store
  useEffect(() => {
    if (!sPaginatedPatients) {
      sFetchPatients().catch(() => {})
    }
  }, [sFetchPatients, sPaginatedPatients])

  // ===== Migración a Zustand: citas =====
  const sTodayAppointments = useAppointmentStore(s => s.todayAppointments)
  const sFutureAppointments = useAppointmentStore(s => s.futureAppointments)
  const sPastAppointments = useAppointmentStore(s => s.pastAppointments)
  const sAppointmentsSummary = useAppointmentStore(s => s.appointmentsSummary)
  const sIsAppointmentsLoading = useAppointmentStore(s => s.isAppointmentsLoading)
  const sAppointmentsError = useAppointmentStore(s => s.appointmentsError)
  const sFetchAppointmentsBuckets = useAppointmentStore(s => s.fetchAppointmentsBuckets)

  // Hidratar store de citas desde React Query si ya tenemos datos, para evitar doble fetch
  useEffect(() => {
    const hasStoreAppointments = (sTodayAppointments?.length || 0) + (sFutureAppointments?.length || 0) + (sPastAppointments?.length || 0) > 0
    const hasClinicAppointments = !!(clinic.appointments?.today?.length || clinic.appointments?.future?.length || clinic.appointments?.past?.length)

    if (!hasStoreAppointments && hasClinicAppointments) {
      // Hidratar rápidamente el store con lo que ya trajo React Query
      const today = clinic.appointments?.today ?? []
      const future = clinic.appointments?.future ?? []
      const past = clinic.appointments?.past ?? []
      const summary = clinic.appointments?.summary || {
        total_appointments: today.length + future.length + past.length,
        today_count: today.length,
        future_count: future.length,
        past_count: past.length,
      }
      useAppointmentStore.setState({
        todayAppointments: today as any[],
        futureAppointments: future as any[],
        pastAppointments: past as any[],
        appointmentsSummary: summary,
        isAppointmentsLoading: false,
        appointmentsError: null,
      } as any)
    } else if (!hasStoreAppointments && !hasClinicAppointments) {
      // Si no hay nada cargado aún, pedimos buckets al store
      sFetchAppointmentsBuckets().catch(() => {})
    }
  }, [
    clinic.appointments?.today,
    clinic.appointments?.future,
    clinic.appointments?.past,
    clinic.appointments?.summary,
    sTodayAppointments,
    sFutureAppointments,
    sPastAppointments,
    sFetchAppointmentsBuckets,
  ])

  // Crear estructura de datos compatible con el contrato anterior
  const patientsData = useMemo(() => {
    if (!sPaginatedPatients) return undefined;
    return {
      data: sPaginatedPatients,
      count: sPatientsPagination?.totalCount ?? sPaginatedPatients.length ?? 0,
    };
  }, [sPaginatedPatients, sPatientsPagination]);

  // Filtros compatibles
  const patientsFilters = useMemo(() => ({
    page: sPatientsFilters.page ?? 1,
    search: sPatientsFilters.search ?? '',
    status: sPatientsFilters.status ?? 'all',
  }), [sPatientsFilters]);

  // Funciones de manejo de filtros mapeadas al hook central
  const setPatientsPage = useCallback((page: number) => {
    void sSetPatientsPage(page)
  }, [sSetPatientsPage]);

  const setPatientsSearch = useCallback((search: string) => {
    void sSetPatientsSearch(search)
  }, [sSetPatientsSearch]);

  const setPatientsStatus = useCallback((status: string) => {
    void sSetPatientsStatus(status)
  }, [sSetPatientsStatus]);

  const clearPatientsFilters = useCallback(() => {
    void sClearPatientsFilters()
  }, [sClearPatientsFilters]);

  // ===== Mapeo de compatibilidad con API legada =====
  const allPatients = useMemo(() => {
    if (sPaginatedPatients && sPaginatedPatients.length > 0) return sPaginatedPatients
    const pag = clinic.patients?.paginated ?? [];
    const act = clinic.patients?.active ?? [];
    return (pag && pag.length > 0) ? pag : act;
  }, [sPaginatedPatients, clinic.patients?.paginated, clinic.patients?.active]);

  const allAppointments = useMemo(() => {
    const hasStore = (sTodayAppointments?.length || 0) + (sFutureAppointments?.length || 0) + (sPastAppointments?.length || 0) > 0
    if (hasStore) return [...(sTodayAppointments || []), ...(sFutureAppointments || []), ...(sPastAppointments || [])]
    const today = clinic.appointments?.today ?? []
    const future = clinic.appointments?.future ?? []
    const past = clinic.appointments?.past ?? []
    return [...today, ...future, ...past]
  }, [
    sTodayAppointments,
    sFutureAppointments,
    sPastAppointments,
    clinic.appointments?.today,
    clinic.appointments?.future,
    clinic.appointments?.past,
  ]);

  // Los pacientes ya vienen enriquecidos desde el backend
  const enrichedPatients = allPatients;

  // Alias simple: dejamos que los componentes hagan el enriquecimiento adicional si lo requieren
  const appointmentsWithPatientData = useMemo(() => {
    return allAppointments as any[];
  }, [allAppointments]);

  const appointmentsSummary = useMemo(() => sAppointmentsSummary || clinic.appointments?.summary, [sAppointmentsSummary, clinic.appointments?.summary]);

  // Valor combinado del contexto
  const contextValue = useMemo(() => ({
    ...clinic,
    // ===== Pacientes via Zustand =====
    patientsData,
    patientsFilters,
    setPatientsPage,
    setPatientsSearch,
    setPatientsStatus,
    clearPatientsFilters,
    isPatientsLoading: sIsPatientsLoading,
    // isPatientsFetching, // Removed: not available
    patientsError: sPatientsError,
    refetchPatients: sRefetchPatients,
    // Datos adicionales de paginación
    paginatedPatients: sPaginatedPatients,
    patientsPagination: sPatientsPagination,
    patientsStats: sPatientsStats,
    // ===== Exposición de campos heredados =====
    allPatients,
    allAppointments,
    enrichedPatients,
    appointmentsWithPatientData,
    appointmentsSummary,
    // Alias de estados
    isLoading: clinic.loading,
    isLoadingAppointments: sIsAppointmentsLoading,
    error: sAppointmentsError || clinic.error,
  }), [
    clinic,
    // citas Zustand
    sTodayAppointments,
    sFutureAppointments,
    sPastAppointments,
    sAppointmentsSummary,
    sIsAppointmentsLoading,
    sAppointmentsError,
    // Zustand deps
    sPaginatedPatients,
    sPatientsPagination,
    sPatientsStats,
    sPatientsFilters,
    sIsPatientsLoading,
    sPatientsError,
    sRefetchPatients,
    // Mapeos
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
