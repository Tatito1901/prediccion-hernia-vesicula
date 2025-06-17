"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import { QueryClient, QueryClientProvider, HydrationBoundary } from '@tanstack/react-query';
import { PatientData, AppointmentDataAPI } from '@/app/dashboard/data-model';

// Definición de la interfaz para el contexto
interface AppContextType {
  patients: PatientData[];
  setPatients: (patients: PatientData[]) => void;
  addPatient: (patient: PatientData) => void;
  updatePatient: (patient: PatientData) => void;
  appointments: AppointmentDataAPI[];
  setAppointments: (appointments: AppointmentDataAPI[]) => void;
  addAppointment: (appointment: AppointmentDataAPI) => void;
  updateAppointment: (appointment: AppointmentDataAPI) => void;
  isLoading: {
    patients: boolean;
    appointments: boolean;
  };
  error: {
    patients: any;
    appointments: any;
  };
}

// Crear el contexto
const AppContext = createContext<AppContextType | undefined>(undefined);

// Proveedor del contexto
export function AppProvider({ children }: { children: ReactNode }) {
  // Crear instancia de QueryClient con configuración optimizada
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutos - más agresivo para reducir solicitudes innecesarias
        gcTime: 10 * 60 * 1000,   // 10 minutos - mantener en cache más tiempo
        refetchOnWindowFocus: false,
        refetchOnReconnect: 'always',
        retry: (failureCount, error: any) => {
          // No reintentar en errores 4xx (cliente)
          if (error?.status >= 400 && error?.status < 500) return false;
          return failureCount < 2; // Máximo 2 reintentos para otros errores
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  }));

  // Estado para pacientes
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [patientsError, setPatientsError] = useState<any>(null);

  // Estado para citas
  const [appointments, setAppointments] = useState<AppointmentDataAPI[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<any>(null);

  // Funciones para manejar pacientes
  const addPatient = (patient: PatientData) => {
    setPatients((prev) => [...prev, patient]);
  };

  const updatePatient = (updatedPatient: PatientData) => {
    setPatients((prev) => 
      prev.map((patient) => 
        patient.id === updatedPatient.id ? updatedPatient : patient
      )
    );
  };

  // Funciones para manejar citas
  const addAppointment = (appointment: AppointmentDataAPI) => {
    setAppointments((prev) => [...prev, appointment]);
  };

  const updateAppointment = (updatedAppointment: AppointmentDataAPI) => {
    setAppointments((prev) => 
      prev.map((appointment) => 
        appointment.id === updatedAppointment.id ? updatedAppointment : appointment
      )
    );
  };

  // Contexto
  const contextValue: AppContextType = {
    patients,
    setPatients,
    addPatient,
    updatePatient,
    appointments,
    setAppointments,
    addAppointment,
    updateAppointment,
    isLoading: {
      patients: isLoadingPatients,
      appointments: isLoadingAppointments,
    },
    error: {
      patients: patientsError,
      appointments: appointmentsError,
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary>
        <AppContext.Provider value={contextValue}>
          {children}
        </AppContext.Provider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}

// Hook para usar el contexto
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
