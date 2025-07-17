// contexts/clinic-data-provider.tsx
'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useClinicData } from '@/hooks/use-clinic-data';
import type { Patient, Appointment, EnrichedPatient } from '@/lib/types';

// ==================== TIPOS PARA EL CONTEXTO ====================
interface ClinicDataContextType {
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  allPatients: Patient[];
  allAppointments: Appointment[];
  enrichedPatients: EnrichedPatient[];
  appointmentsWithPatientData: any[]; // Puedes definir un tipo más específico si lo necesitas
}

// ==================== CREACIÓN DEL CONTEXTO ====================
const ClinicDataContext = createContext<ClinicDataContextType | undefined>(undefined);

// ==================== PROVEEDOR PRINCIPAL ====================
export function ClinicDataProvider({ children }: { children: ReactNode }) {
  const {
    isLoading,
    error,
    refetch,
    allPatients,
    allAppointments,
    enrichedPatients,
    appointmentsWithPatientData,
  } = useClinicData();

  // Memoizamos el valor del contexto para evitar re-renders innecesarios
  const value = useMemo(() => ({
    isLoading,
    error: error ? (error as Error) : null,
    refetch,
    allPatients,
    allAppointments,
    enrichedPatients,
    appointmentsWithPatientData,
  }), [
    isLoading,
    error,
    refetch,
    allPatients,
    allAppointments,
    enrichedPatients,
    appointmentsWithPatientData,
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
