import { useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { Patient, Appointment, DiagnosisEnum, PatientStatus, AppointmentStatus } from '@/lib/types';
import { calculateDateRange, buildQueryParams, fetchData, isValidISODate } from '@/lib/utils';

// Increased stale time for better caching in production
const DEFAULT_STALE_TIME = process.env.NODE_ENV === 'development' 
  ? 1000 * 60 * 5  // 5 minutes for development
  : 1000 * 60 * 15; // 15 minutes for production

export interface ClinicMetrics {
  totalPacientes: number;
  pacientesNuevosMes: number;
  pacientesOperados: number;
  tasaConversion: number;
  tiempoPromedioDecision: number;
  fuentePrincipalPacientes: string;
  diagnosticosMasComunes: { tipo: string; cantidad: number }[];
  lastUpdated: string;
}

interface TransformedPatientData {
  id: string;
  nombre: string;
  telefono: string;
  estado: PatientStatus | 'SIN ESTADO';
  fechaRegistro: string;
  diagnostico: DiagnosisEnum | 'NO ESPECIFICADO';
}

interface TransformedDiagnosisData {
  name: DiagnosisEnum | 'NO ESPECIFICADO';
  value: number;
}

interface GeneralStats {
  total: number;
  nuevos: number;
  operados: number;
  seguimiento: number;
}

interface WeekdayData {
  name: string;
  value: number;
}

interface UseChartDataProps {
  dateRange: string;
  patientId?: string;
  doctorId?: string;
  estado?: PatientStatus | AppointmentStatus | 'todos';
}

export function useChartData({ 
  dateRange, 
  patientId, 
  doctorId, 
  estado = 'todos' 
}: UseChartDataProps) {
  const queryClient = useQueryClient();

  // Calculate date range based on selected range option
  const { startDate, endDate } = useMemo(() => calculateDateRange(dateRange), [dateRange]);

  // Create stable query key for React Query caching
  const dashboardQueryKey = useMemo(() => 
    ['dashboard-data', startDate?.toISOString() || '', endDate?.toISOString() || '', patientId || '', doctorId || '', estado],
    [startDate, endDate, patientId, doctorId, estado]
  );

  // Main data fetching query with React Query
  const {
    data = { appointments: [], patients: [], metrics: null },
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: dashboardQueryKey,
    queryFn: async () => {
      // Skip fetching if date range is invalid
      if (!startDate || !endDate) {
        return { appointments: [], patients: [], metrics: null };
      }
      
      // Build API query parameters
      const params = { 
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        patientId, 
        doctorId, 
        estado: estado !== 'todos' ? estado : undefined 
      };

      const queryParams = `?${buildQueryParams(params)}`;
      
      // Special handling for appointment dates (full ISO string)
      const appointmentsParams = {
        ...params,
        startDate: `${params.startDate}T00:00:00Z`,
        endDate: `${params.endDate}T23:59:59Z`
      };
      const appointmentsQueryParams = `?${buildQueryParams(appointmentsParams)}`;

      // Parallel fetching with error handling for each request
      const [appointmentsResult, patientsResult, metricsResult] = await Promise.allSettled([
        fetchData<{ data: Appointment[] }>(`/api/appointments${appointmentsQueryParams}`, "Error al cargar citas"),
        fetchData<{ data: Patient[] }>(`/api/patients${queryParams}`, "Error al cargar pacientes"),
        fetchData<ClinicMetrics>(`/api/metrics${queryParams}`, "Error al cargar métricas")
      ]);
      
      // Handle API errors but continue with available data
      if (appointmentsResult.status === 'rejected') {
        console.error('Failed to fetch appointments:', appointmentsResult.reason);
      }
      if (patientsResult.status === 'rejected') {
        console.error('Failed to fetch patients:', patientsResult.reason);
      }
      if (metricsResult.status === 'rejected') {
        console.error('Failed to fetch metrics:', metricsResult.reason);
      }

      return { 
        appointments: appointmentsResult.status === 'fulfilled' ? appointmentsResult.value?.data ?? [] : [],
        patients: patientsResult.status === 'fulfilled' ? patientsResult.value?.data ?? [] : [],
        metrics: metricsResult.status === 'fulfilled' ? metricsResult.value : null
      };
    },
    staleTime: DEFAULT_STALE_TIME,
    enabled: !!startDate && !!endDate,
  });

  const { appointments, patients, metrics: clinicMetrics } = data;

  const transformedPatients = useMemo((): TransformedPatientData[] => {
    if (!patients || patients.length === 0) return [];
    return patients.map(p => ({
      id: p.id,
      nombre: `${p.nombre} ${p.apellidos}`,
      telefono: p.telefono ?? 'N/A',
      estado: p.estado_paciente ?? 'SIN ESTADO',
      fechaRegistro: p.fecha_registro ? new Date(p.fecha_registro).toLocaleDateString() : 'N/A',
      diagnostico: p.diagnostico_principal ?? 'NO ESPECIFICADO',
    }));
  }, [patients]);

  const diagnosisData = useMemo((): TransformedDiagnosisData[] => {
    const count: Record<string, number> = {};
    if (!patients) return [];
    patients.forEach(p => {
      const diag = p.diagnostico_principal ?? 'NO ESPECIFICADO';
      count[diag] = (count[diag] || 0) + 1;
    });
    return Object.entries(count).map(([name, value]) => ({ name: name as DiagnosisEnum | 'NO ESPECIFICADO', value }));
  }, [patients]);

  const generalStats = useMemo((): GeneralStats => {
    if (!patients) return { total: 0, nuevos: 0, operados: 0, seguimiento: 0 };
    
    const nuevos = patients.filter(p => {
      if (!p.fecha_registro) return false;
      const regDate = new Date(p.fecha_registro);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      return regDate >= startOfMonth;
    }).length;

    return {
      total: patients.length,
      nuevos,
      operados: patients.filter(p => p.estado_paciente === 'OPERADO').length,
      seguimiento: patients.filter(p => p.estado_paciente === 'EN SEGUIMIENTO').length,
    };
  }, [patients]);

  const weekdayDistribution = useMemo((): WeekdayData[] => {
    const distribution: { [key: string]: number } = {
      Lunes: 0, Martes: 0, Miércoles: 0, Jueves: 0, Viernes: 0, Sábado: 0, Domingo: 0
    };
    if (!appointments || appointments.length === 0) {
      return Object.entries(distribution).map(([name, value]) => ({ name, value }));
    }

    const dayMapping: { [key: number]: string } = {
      1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 0: 'Domingo'
    };

    appointments.forEach(appointment => {
      if (isValidISODate(appointment.fecha_hora_cita)) {
        const dayOfWeek = new Date(appointment.fecha_hora_cita).getDay();
        const dayName = dayMapping[dayOfWeek];
        if (dayName) {
          distribution[dayName] += 1;
        }
      }
    });

    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [appointments]);

  const chart = useMemo(() => {
    const dailyDataMap = new Map<string, { name: string; consultas: number; operados: number }>();
    
    if (!startDate || !endDate) {
      return { series: [], categories: [] };
    }

    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    // Initialize data map with all dates in range
    while (currentDate <= end) {
      const key = format(currentDate, 'yyyy-MM-dd');
      dailyDataMap.set(key, {
        name: format(currentDate, 'd'),
        consultas: 0,
        operados: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Process valid appointments
    if (appointments) {
      appointments.forEach((appointment) => {
        // Skip appointments without valid dates or cancelled
        if (!appointment.fecha_hora_cita || !isValidISODate(appointment.fecha_hora_cita)) {
          return;
        }
        
        const appointmentDate = new Date(appointment.fecha_hora_cita);
        if (isNaN(appointmentDate.getTime())) {
          return;
        }

        const key = format(appointmentDate, 'yyyy-MM-dd');
        const dayEntry = dailyDataMap.get(key);
        
        // Skip if outside date range or cancelled
        if (!dayEntry || appointment.estado_cita === 'CANCELADA') {
          return;
        }

        // Valid appointment, count it
        dayEntry.consultas += 1;
      });
    }

    // Process operated patients
    if (patients) {
      patients.forEach(p => {
        if (p.estado_paciente === 'OPERADO' && p.updated_at && isValidISODate(p.updated_at)) {
          const opDate = new Date(p.updated_at);
          if (isNaN(opDate.getTime())) return;
          
          const key = format(opDate, 'yyyy-MM-dd');
          const dayEntry = dailyDataMap.get(key);
          
          if (!dayEntry) return;
          
          dayEntry.operados += 1;
        }
      });
    }
    
    const dataForChart = Array.from(dailyDataMap.values());

    return {
      series: [
        { name: 'Consultas', data: dataForChart.map(d => d.consultas) },
        { name: 'Operados', data: dataForChart.map(d => d.operados) },
      ],
      categories: dataForChart.map(d => d.name),
    };
  }, [appointments, patients, startDate, endDate]);

  // Create a refresh function to invalidate cache and trigger refetch
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
  }, [queryClient, dashboardQueryKey]);
  
  return {
    loading,
    error: error ? (error as Error).message : null,
    appointments,
    patients,
    transformedPatients,
    diagnosisData,
    generalStats,
    weekdayDistribution,
    clinicMetrics,
    chart,
    refresh,
    rawData: data, // Added for convenience in some components
  };
}