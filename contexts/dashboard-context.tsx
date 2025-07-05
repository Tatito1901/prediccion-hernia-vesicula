'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { useChartData } from '@/hooks/use-chart-data';

type DateRange = '7dias' | '30dias' | '60dias' | '90dias' | 'ytd';

// Define more precise types for the data structures
interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  created_at: string | null;
  fecha_hora_cita: string;
  estado_cita: string;
  es_primera_vez: boolean | null;
  motivo_cita: string;
  notas_cita_seguimiento: string | null;
  [key: string]: any; // Allow for additional properties
}

interface Patient {
  id: string;
  nombre: string;
  apellidos: string;
  created_at: string | null;
  updated_at: string | null;
  diagnostico_principal?: string | null;
  estado_paciente?: string | null;
  fecha_registro?: string | null;
  fecha_nacimiento?: string | null;
  creado_por_id?: string | null;
  comentarios_registro?: string | null;
  [key: string]: any; // Allow for additional properties
}

interface ClinicMetric {
  totalAppointments?: number;
  completedAppointments?: number;
  pendingAppointments?: number;
  canceledAppointments?: number;
  satisfactionRate?: number;
  availabilityRate?: number;
  patientRetentionRate?: number;
  conversionRate?: number;
  revenuePerPatient?: number;
  lastUpdated?: string;
  [key: string]: any; // Allow for additional properties
}

interface GeneralStats {
  totalPatients?: number;
  newPatients?: number;
  returningPatients?: number;
  averageWaitTime?: number;
  [key: string]: any; // Allow for additional properties
}

interface ChartDataSeries {
  name: string;
  data: number[];
}

interface ChartData {
  categories: string[];
  series: ChartDataSeries[];
}

interface TransformedPatient {
  id: string;
  nombre?: string;
  diagnostico?: string;
  estado?: string;
  fecha?: string;
  prioridad?: number;
  [key: string]: any;
}

interface DashboardContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  loading: boolean;
  error: string | null;
  appointments: Appointment[];
  patients: Patient[];
  transformedPatients: TransformedPatient[];
  diagnosisData: any[];
  generalStats: GeneralStats;
  weekdayDistribution: any[];
  clinicMetrics: ClinicMetric | null;
  chart: ChartData | null;
  refresh: () => void;
}

// Create the context with a default value
const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  // Shared date range state across all dashboard components
  const [dateRange, setDateRange] = useState<DateRange>('30dias');

  // Single data fetch for all dashboard components
  const {
    loading,
    error,
    appointments,
    patients,
    transformedPatients,
    diagnosisData,
    generalStats,
    weekdayDistribution,
    clinicMetrics,
    chart,
    refresh,
  } = useChartData({ dateRange });

  // Memoize the context value to prevent unnecessary re-renders of consuming components
  const value = useMemo(() => ({
    dateRange,
    setDateRange,
    loading,
    error,
    appointments,
    patients,
    transformedPatients,
    diagnosisData,
    generalStats,
    weekdayDistribution,
    clinicMetrics,
    chart,
    refresh,
  }), [
    dateRange, 
    loading, 
    error, 
    appointments, 
    patients, 
    transformedPatients,
    diagnosisData,
    generalStats,
    weekdayDistribution,
    clinicMetrics,
    chart,
    refresh
  ]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

// Custom hook to use the dashboard context
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
