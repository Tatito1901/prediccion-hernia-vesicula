// contexts/clinic-data-provider.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useClinicData } from '@/hooks/use-clinic-data';
import { usePaginatedPatients } from '@/hooks/use-paginated-patients';
// Importar sistema unificado para futuras migraciones
import { queryKeys } from '@/lib/query-keys';

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
  isPatientsFetching: boolean;
  patientsError: Error | null;
  refetchPatients: () => void;
};

export type ClinicDataContextType = ExtendedClinicDataContextType;

const ClinicDataContext = createContext<ClinicDataContextType | undefined>(
  undefined
);

// ==================== PROVEEDOR ====================

export const ClinicDataProvider = ({ children }: { children: ReactNode }) => {
  // Datos básicos de la clínica
  const clinicData = useClinicData();
  
  // Estado local para filtros de paginación
  const [patientsFilters, setPatientsFilters] = useState({
    page: 1,
    search: '',
    status: 'all', // ✅ Mostrar todos los pacientes por defecto
  });

  // Hook de pacientes paginados
  const {
    patients,
    pagination,
    stats: patientsStats,
    isLoading: isPatientsLoading,
    isFetching: isPatientsFetching,
    error: patientsError,
    refetch: refetchPatients,
  } = usePaginatedPatients(patientsFilters);

  // Crear estructura de datos compatible
  const patientsData = useMemo(() => {
    if (!patients || !pagination) return undefined;
    return {
      data: patients,
      count: pagination.totalCount,
    };
  }, [patients, pagination]);

  // Funciones de manejo de filtros
  const setPatientsPage = useCallback((page: number) => {
    setPatientsFilters((prev) => ({ ...prev, page }));
  }, []);

  const setPatientsSearch = useCallback((search: string) => {
    setPatientsFilters((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const setPatientsStatus = useCallback((status: string) => {
    setPatientsFilters((prev) => ({ ...prev, status, page: 1 }));
  }, []);

  const clearPatientsFilters = useCallback(() => {
    setPatientsFilters({ page: 1, search: '', status: 'all' }); // ✅ Limpiar a 'all' en lugar de 'CONSULTADO'
  }, []);

  // Valor combinado del contexto
  const contextValue = useMemo(() => ({
    ...clinicData,
    patientsData,
    patientsFilters,
    setPatientsPage,
    setPatientsSearch,
    setPatientsStatus,
    clearPatientsFilters,
    isPatientsLoading,
    isPatientsFetching,
    patientsError,
    refetchPatients,
    // Datos adicionales de paginación
    paginatedPatients: patients,
    patientsPagination: pagination,
    patientsStats,
  }), [
    clinicData,
    patientsData,
    patientsFilters,
    setPatientsPage,
    setPatientsSearch,
    setPatientsStatus,
    clearPatientsFilters,
    isPatientsLoading,
    isPatientsFetching,
    patientsError,
    refetchPatients,
    patients,
    pagination,
    patientsStats,
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
