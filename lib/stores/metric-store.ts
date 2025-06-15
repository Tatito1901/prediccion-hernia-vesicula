// lib/stores/metricsStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { startOfMonth, endOfMonth, format, subMonths, parseISO } from 'date-fns';

// Tipos para métricas
export interface PatientMetrics {
  totalPatients: number;
  newPatientsThisMonth: number;
  newPatientsLastMonth: number;
  patientGrowthRate: number;
  patientsByStatus: Record<string, number>;
  patientsByDiagnosis: Record<string, number>;
  patientsByOrigin: Record<string, number>;
  conversionRate: number; // tasa de conversión a cirugía
  monthlyPatientTrend: Array<{ month: string; count: number }>;
}

export interface AppointmentMetrics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  appointmentsThisMonth: number;
  appointmentsLastMonth: number;
  appointmentGrowthRate: number;
  appointmentCompletionRate: number;
  monthlyAppointmentTrend: Array<{ month: string; count: number }>;
}

export interface SurgeryMetrics {
  totalSurgeries: number;
  scheduledSurgeries: number;
  completedSurgeries: number;
  surgeriesThisMonth: number;
  surgeriesLastMonth: number;
  surgeryGrowthRate: number;
  monthlySurgeryTrend: Array<{ month: string; count: number }>;
  surgeryByType: Record<string, number>;
}

export interface DashboardMetrics {
  patientMetrics: PatientMetrics;
  appointmentMetrics: AppointmentMetrics;
  surgeryMetrics: SurgeryMetrics;
  lastUpdated: string;
}

// Funciones auxiliares
const fetchWithRetry = async (
  input: RequestInfo,
  init: RequestInit = {},
  retries = 2
): Promise<Response> => {
  let lastError: Error = new Error('Fetch failed due to unknown reasons.');
  const FETCH_TIMEOUT_MS = 10000;
  const BASE_RETRY_DELAY_MS = 1000;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      lastError = new Error(`Server error: ${response.status} ${response.statusText}`);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        lastError = error;
        if (controller.signal.aborted && !lastError.message.includes('timed out')) {
           lastError = new Error(`Request timed out after ${FETCH_TIMEOUT_MS / 1000}s on attempt ${attempt + 1}. Original error: ${lastError.message}`);
        }
      } else {
        lastError = new Error(String(error) || 'Network request failed');
      }
    }
    
    if (attempt === retries) break;

    const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt) + Math.random() * (BASE_RETRY_DELAY_MS / 2);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  throw lastError;
};

// Función para generar las fechas de los últimos N meses
const getLastNMonthsRange = (n: number = 6) => {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  
  // Generar rango para los últimos n meses (incluyendo el actual)
  const ranges = Array.from({ length: n }, (_, i) => {
    const monthDate = i === 0 ? now : subMonths(now, i);
    return {
      start: i === 0 ? currentMonthStart : startOfMonth(monthDate),
      end: i === 0 ? currentMonthEnd : endOfMonth(monthDate),
      month: format(monthDate, 'MMM yyyy')
    };
  });
  
  return ranges;
};

// Interfaz del Store de métricas
interface MetricsStore {
  // Estado
  metrics: DashboardMetrics | null;
  isLoading: boolean;
  error: Error | null;
  timeRange: 'week' | 'month' | 'quarter' | 'year';
  
  // Acciones
  fetchMetrics: () => Promise<void>;
  setTimeRange: (range: 'week' | 'month' | 'quarter' | 'year') => void;
}

// Valores iniciales para las métricas
const initialPatientMetrics: PatientMetrics = {
  totalPatients: 0,
  newPatientsThisMonth: 0,
  newPatientsLastMonth: 0,
  patientGrowthRate: 0,
  patientsByStatus: {},
  patientsByDiagnosis: {},
  patientsByOrigin: {},
  conversionRate: 0,
  monthlyPatientTrend: []
};

const initialAppointmentMetrics: AppointmentMetrics = {
  totalAppointments: 0,
  completedAppointments: 0,
  cancelledAppointments: 0,
  noShowAppointments: 0,
  appointmentsThisMonth: 0,
  appointmentsLastMonth: 0,
  appointmentGrowthRate: 0,
  appointmentCompletionRate: 0,
  monthlyAppointmentTrend: []
};

const initialSurgeryMetrics: SurgeryMetrics = {
  totalSurgeries: 0,
  scheduledSurgeries: 0,
  completedSurgeries: 0,
  surgeriesThisMonth: 0,
  surgeriesLastMonth: 0,
  surgeryGrowthRate: 0,
  monthlySurgeryTrend: [],
  surgeryByType: {}
};

// Creación del store con Zustand + immer para actualizaciones inmutables
export const useMetricsStore = create<MetricsStore>()(
  immer((set, get) => ({
    metrics: null,
    isLoading: false,
    error: null,
    timeRange: 'month',
    
    fetchMetrics: async () => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });
      
      try {
        // Construir los parámetros según el timeRange seleccionado
        const timeRange = get().timeRange;
        const params = new URLSearchParams({ timeRange });
        
        const response = await fetchWithRetry(`/api/metrics?${params}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Error fetching metrics');
        }
        
        // Transformar y almacenar los datos de métricas
        const transformedMetrics: DashboardMetrics = {
          patientMetrics: data.patientMetrics || {...initialPatientMetrics},
          appointmentMetrics: data.appointmentMetrics || {...initialAppointmentMetrics},
          surgeryMetrics: data.surgeryMetrics || {...initialSurgeryMetrics},
          lastUpdated: new Date().toISOString()
        };
        
        set((state) => {
          state.metrics = transformedMetrics;
          state.isLoading = false;
        });
        
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Unknown error');
          state.isLoading = false;
        });
      }
    },
    
    setTimeRange: (range) => {
      set((state) => {
        state.timeRange = range;
      });
      
      // Refrescar las métricas cuando cambia el timeRange
      get().fetchMetrics();
    }
  }))
);

// Tipo para usar con metricsStore
export type { MetricsStore };
