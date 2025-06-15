"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
  // Crear instancia de QueryClient
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60000, // 1 minuto
        refetchOnWindowFocus: false,
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
      <AppContext.Provider value={contextValue}>
        {children}
      </AppContext.Provider>
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
