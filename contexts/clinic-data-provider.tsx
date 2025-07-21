// contexts/clinic-data-provider.tsx - ÚNICA FUENTE DE VERDAD CONSOLIDADA
'use client';

import React, { createContext, useContext, useMemo, ReactNode, useState } from 'react';
import { useClinicData } from '@/hooks/use-clinic-data';
import { usePaginatedPatients } from '@/hooks/use-paginated-patients';
import type { Appointment, EnrichedPatient } from '@/lib/types';

// ==================== ÚNICA FUENTE DE VERDAD - INTERFAZ CONSOLIDADA ====================
interface ClinicDataContextType {
  // ✅ Estados de carga globales
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  
  // ✅ CITAS - Solo datos esenciales
  todayAppointments: Appointment[];
  appointmentsSummary: {
    total_appointments: number;
    today_count: number;
    future_count: number;
    past_count: number;
  } | {};
  fetchSpecificAppointments: (filter: {
    dateFilter?: 'today' | 'future' | 'past';
    patientId?: string;
    search?: string;
    pageSize?: number;
  }) => Promise<any>;
  
  // ✅ PACIENTES - Datos paginados (ÚNICA FUENTE DE VERDAD)
  patients: EnrichedPatient[];
  patientsPagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  patientsStats: {
    totalPatients: number;
    surveyRate: number;
    pendingConsults: number;
    operatedPatients: number;
    statusStats: Record<string, number>;
  } | null;
  
  // ✅ Controles de pacientes (ÚNICA FUENTE DE VERDAD)
  patientsFilters: {
    page: number;
    search: string;
    status: string;
  };
  setPatientsPage: (page: number) => void;
  setPatientsSearch: (search: string) => void;
  setPatientsStatus: (status: string) => void;
  clearPatientsFilters: () => void;
  
  // ✅ Estados de pacientes
  isPatientsLoading: boolean;
  isPatientsFetching: boolean;
  patientsError: Error | null;
  refetchPatients: () => void;
}

// ==================== CREACIÓN DEL CONTEXTO ====================
const ClinicDataContext = createContext<ClinicDataContextType | undefined>(undefined);

// ==================== PROVEEDOR CONSOLIDADO - ÚNICA FUENTE DE VERDAD ====================
export function ClinicDataProvider({ children }: { children: ReactNode }) {
  // 🎯 Estados locales para controles de pacientes
  const [patientsPage, setPatientsPage] = useState(1);
  const [patientsSearch, setPatientsSearch] = useState('');
  const [patientsStatus, setPatientsStatus] = useState('all');

  // 📊 Hook para datos de citas
  const {
    isLoading: isLoadingAppointments,
    error: appointmentsError,
    refetch: refetchAppointments,
    allAppointments: todayAppointments,
    appointmentsSummary,
    fetchSpecificAppointments,
  } = useClinicData();

  // 👥 Hook para datos de pacientes paginados
  const {
    patients,
    pagination: patientsPagination,
    stats: patientsStats,
    isLoading: isPatientsLoading,
    isFetching: isPatientsFetching,
    error: patientsError,
    refetch: refetchPatients,
  } = usePaginatedPatients({
    page: patientsPage,
    pageSize: 15,
    search: patientsSearch,
    status: patientsStatus
  });

  // 🎛️ Funciones de control para pacientes
  const handleSetPatientsPage = (page: number) => {
    setPatientsPage(page);
  };

  const handleSetPatientsSearch = (search: string) => {
    setPatientsSearch(search);
    setPatientsPage(1); // Reset a página 1
  };

  const handleSetPatientsStatus = (status: string) => {
    setPatientsStatus(status);
    setPatientsPage(1); // Reset a página 1
  };

  const handleClearPatientsFilters = () => {
    setPatientsSearch('');
    setPatientsStatus('all');
    setPatientsPage(1);
  };

  // 🔄 Función de refetch global
  const handleGlobalRefetch = () => {
    refetchAppointments();
    refetchPatients();
  };

  // 🎯 Valor consolidado del contexto - ÚNICA FUENTE DE VERDAD
  const value = useMemo(() => ({
    // Estados globales
    isLoading: isLoadingAppointments || isPatientsLoading,
    error: appointmentsError || patientsError ? (appointmentsError || patientsError) as Error : null,
    refetch: handleGlobalRefetch,
    
    // CITAS
    todayAppointments,
    appointmentsSummary,
    fetchSpecificAppointments,
    
    // PACIENTES - ÚNICA FUENTE DE VERDAD
    patients,
    patientsPagination,
    patientsStats,
    
    // Controles de pacientes
    patientsFilters: {
      page: patientsPage,
      search: patientsSearch,
      status: patientsStatus
    },
    setPatientsPage: handleSetPatientsPage,
    setPatientsSearch: handleSetPatientsSearch,
    setPatientsStatus: handleSetPatientsStatus,
    clearPatientsFilters: handleClearPatientsFilters,
    
    // Estados de pacientes
    isPatientsLoading,
    isPatientsFetching,
    patientsError: patientsError ? (patientsError as Error) : null,
    refetchPatients,
  }), [
    isLoadingAppointments,
    isPatientsLoading,
    appointmentsError,
    patientsError,
    todayAppointments,
    appointmentsSummary,
    fetchSpecificAppointments,
    patients,
    patientsPagination,
    patientsStats,
    patientsPage,
    patientsSearch,
    patientsStatus,
    isPatientsFetching,
    refetchPatients,
  ]);

  return (
    <ClinicDataContext.Provider value={value}>
      {children}
    </ClinicDataContext.Provider>
  );
}

// ==================== HOOK DE CONSUMO ====================
/**
 * Hook para consumir los datos de la clínica desde cualquier componente.
 */
export function useClinic() {
  const context = useContext(ClinicDataContext);
  if (context === undefined) {
    throw new Error('useClinic debe ser utilizado dentro de un ClinicDataProvider');
  }
  return context;
}
