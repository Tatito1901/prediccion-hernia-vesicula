'use client';

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
  pacientesNoOperados: number;
  pacientesSeguimiento: number;
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

  // Create stable query key for React Query caching with proper structure for individual resources
  const baseQueryParams = useMemo(() => {
    if (!startDate || !endDate) {
      return null;
    }

    return { 
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      patientId, 
      doctorId, 
      estado: estado !== 'todos' ? estado : undefined 
    };
  }, [startDate, endDate, patientId, doctorId, estado]);

  // Query keys for individual resources - helps with targeted invalidation and prefetching
  const appointmentsQueryKey = useMemo(() => 
    baseQueryParams ? ['appointments', baseQueryParams] as const : ['appointments', {}] as const, 
    [baseQueryParams]
  );

  const patientsQueryKey = useMemo(() => 
    baseQueryParams ? ['patients', baseQueryParams] as const : ['patients', {}] as const, 
    [baseQueryParams]
  );

  const metricsQueryKey = useMemo(() => 
    baseQueryParams ? ['metrics', baseQueryParams] as const : ['metrics', {}] as const, 
    [baseQueryParams]
  );

  // Combined query key for invalidation
  const dashboardQueryKey = useMemo(() => 
    ['dashboard-data', startDate?.toISOString() || '', endDate?.toISOString() || '', patientId || '', doctorId || '', estado],
    [startDate, endDate, patientId, doctorId, estado]
  );

  // Appointments query with special date handling
  const appointmentsQuery = useQuery({
    queryKey: appointmentsQueryKey,
    queryFn: async () => {
      if (!baseQueryParams) return [];
      
      // Special handling for appointment dates (full ISO string for precise time filtering)
      const appointmentsParams = {
        ...baseQueryParams,
        startDate: `${baseQueryParams.startDate}T00:00:00Z`,
        endDate: `${baseQueryParams.endDate}T23:59:59Z`
      };
      const appointmentsQueryParams = buildQueryParams(appointmentsParams);
      
      try {
        // Verificamos que los parámetros estén bien formateados antes de hacer el fetch
        console.log(`Fetching appointments with params: ${appointmentsQueryParams}`);
        
        // Nos aseguramos de que la URL esté bien formada con el signo de interrogación
        const url = `/api/appointments${appointmentsQueryParams ? `?${appointmentsQueryParams}` : ''}`;
        console.log(`URL final: ${url}`);
        
        // Agregamos un timeout más largo para darle tiempo al servidor
        const result = await fetchData<{ data: Appointment[] }>(
          url,
          "Error al cargar citas",
          60000 // Aumentamos el timeout a 60 segundos
        );
        return result?.data ?? [];
      } catch (error) {
        console.error('Failed to fetch appointments:', error);
        // Propagamos el error para que React Query lo maneje correctamente
        // pero evitamos que la app se rompa completamente
        throw error;
      }
    },
    staleTime: DEFAULT_STALE_TIME,
    enabled: !!baseQueryParams,
    refetchOnWindowFocus: false, // Prevent unnecessary refetches when window regains focus
    retry: 2, // Intentar hasta 2 veces más si falla
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
  });

  // Patients query
  const patientsQuery = useQuery({
    queryKey: patientsQueryKey,
    queryFn: async () => {
      if (!baseQueryParams) return [];
      
      const queryParams = `?${buildQueryParams(baseQueryParams)}`;
      
      try {
        const result = await fetchData<{ data: Patient[] }>(
          `/api/patients${queryParams}`, 
          "Error al cargar pacientes"
        );
        return result?.data ?? [];
      } catch (error) {
        console.error('Failed to fetch patients:', error);
        return [];
      }
    },
    staleTime: DEFAULT_STALE_TIME,
    enabled: !!baseQueryParams,
    refetchOnWindowFocus: false,
  });

  // Metrics query
  const metricsQuery = useQuery({
    queryKey: metricsQueryKey,
    queryFn: async () => {
      if (!baseQueryParams) return null;
      
      const queryParams = `?${buildQueryParams(baseQueryParams)}`;
      
      try {
        return await fetchData<ClinicMetrics>(
          `/api/metrics${queryParams}`, 
          "Error al cargar métricas"
        );
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
        return null;
      }
    },
    staleTime: DEFAULT_STALE_TIME,
    enabled: !!baseQueryParams,
    refetchOnWindowFocus: false,
  });

  // Consolidate loading and error states
  const loading = appointmentsQuery.isLoading || patientsQuery.isLoading || metricsQuery.isLoading;
  const error = appointmentsQuery.error || patientsQuery.error || metricsQuery.error;

  // Extract data from queries
  const appointments = appointmentsQuery.data || [];
  const patients = patientsQuery.data || [];
  const clinicMetrics = metricsQuery.data;

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
    
    // Calculate new patients in current month more accurately
    const nuevos = patients.filter(p => {
      if (!p.fecha_registro) return false;
      const regDate = new Date(p.fecha_registro);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      return regDate >= startOfMonth;
    }).length;

    // Count operated patients
    const operados = patients.filter(p => p.estado_paciente === 'OPERADO').length;
    
    // Count patients in follow-up
    const seguimiento = patients.filter(p => p.estado_paciente === 'EN SEGUIMIENTO').length;
    
    return {
      total: patients.length,
      nuevos,
      operados,
      seguimiento,
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
    // Enhanced chart data structure to include more patient metrics
    if (!startDate || !endDate) {
      return { series: [], categories: [] };
    }

    let dataForChart;
    // Use monthly aggregation for year-to-date view
    if (dateRange === 'ytd') {
      const monthlyDataMap = new Map<string, { 
        name: string; 
        label: string;
        consultas: number; 
        operados: number;
        nuevos: number;
        seguimiento: number; 
      }>();

      const currentDate = new Date(startDate);
      currentDate.setDate(1);
      const end = new Date(endDate);

      while (currentDate <= end) {
        const key = format(currentDate, 'yyyy-MM');
        monthlyDataMap.set(key, {
          name: key,
          label: format(currentDate, 'MMM yy'),
          consultas: 0,
          operados: 0,
          nuevos: 0,
          seguimiento: 0,
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      if (appointments) {
        appointments.forEach((appointment) => {
          if (!appointment.fecha_hora_cita || !isValidISODate(appointment.fecha_hora_cita) || appointment.estado_cita === 'CANCELADA') return;
          const key = format(new Date(appointment.fecha_hora_cita), 'yyyy-MM');
          const monthEntry = monthlyDataMap.get(key);
          if (monthEntry) monthEntry.consultas += 1;
        });
      }

      if (patients) {
        patients.forEach(p => {
          if (p.fecha_registro && isValidISODate(p.fecha_registro)) {
            const key = format(new Date(p.fecha_registro), 'yyyy-MM');
            const monthEntry = monthlyDataMap.get(key);
            if (monthEntry) monthEntry.nuevos += 1;
          }
          if (p.estado_paciente === 'OPERADO' && p.updated_at && isValidISODate(p.updated_at)) {
            const key = format(new Date(p.updated_at), 'yyyy-MM');
            const monthEntry = monthlyDataMap.get(key);
            if (monthEntry) monthEntry.operados += 1;
          }
          if (p.estado_paciente === 'EN SEGUIMIENTO' && p.updated_at && isValidISODate(p.updated_at)) {
            const key = format(new Date(p.updated_at), 'yyyy-MM');
            const monthEntry = monthlyDataMap.get(key);
            if (monthEntry) monthEntry.seguimiento += 1;
          }
        });
      }

      dataForChart = Array.from(monthlyDataMap.values()).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    } else if (dateRange === '30dias') {
      // Weekly aggregation for 30-day view
      const weeklyDataMap = new Map<string, { 
        name: string; 
        label: string;
        consultas: number; 
        operados: number;
        nuevos: number;
        seguimiento: number; 
      }>();

      const currentDate = new Date(startDate);
      const end = new Date(endDate);

      while (currentDate <= end) {
        // Use Monday as the start of the week for consistency
        const dayOfWeek = currentDate.getDay();
        const weekStartDate = new Date(currentDate);
        weekStartDate.setDate(currentDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Get the Monday
        
        const weekKey = format(weekStartDate, 'yyyy-MM-dd');
        if (!weeklyDataMap.has(weekKey)) {
          // More descriptive label with month included
          const weekEndDate = new Date(weekStartDate);
          weekEndDate.setDate(weekStartDate.getDate() + 6);
          
          weeklyDataMap.set(weekKey, {
            name: weekKey,
            label: `${format(weekStartDate, 'dd')}-${format(weekEndDate, 'dd MMM')}`, // Format: "01-07 Jul"
            consultas: 0,
            operados: 0,
            nuevos: 0,
            seguimiento: 0,
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Process appointment and patient data for weekly view
      if (appointments) {
        appointments.forEach((appointment) => {
          if (!appointment.fecha_hora_cita || !isValidISODate(appointment.fecha_hora_cita) || appointment.estado_cita === 'CANCELADA') return;
          const appointmentDate = new Date(appointment.fecha_hora_cita);
          const dayOfWeek = appointmentDate.getDay();
          const weekStartDate = new Date(appointmentDate);
          weekStartDate.setDate(appointmentDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Get the Monday
          
          const weekKey = format(weekStartDate, 'yyyy-MM-dd');
          const weekEntry = weeklyDataMap.get(weekKey);
          if (weekEntry) weekEntry.consultas += 1;
        });
      }

      if (patients) {
        patients.forEach(p => {
          if (p.fecha_registro && isValidISODate(p.fecha_registro)) {
            const regDate = new Date(p.fecha_registro);
            const dayOfWeek = regDate.getDay();
            const weekStartDate = new Date(regDate);
            weekStartDate.setDate(regDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            
            const weekKey = format(weekStartDate, 'yyyy-MM-dd');
            const weekEntry = weeklyDataMap.get(weekKey);
            if (weekEntry) weekEntry.nuevos += 1;
          }
          if (p.estado_paciente === 'OPERADO' && p.updated_at && isValidISODate(p.updated_at)) {
            const opDate = new Date(p.updated_at);
            const dayOfWeek = opDate.getDay();
            const weekStartDate = new Date(opDate);
            weekStartDate.setDate(opDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            
            const weekKey = format(weekStartDate, 'yyyy-MM-dd');
            const weekEntry = weeklyDataMap.get(weekKey);
            if (weekEntry) weekEntry.operados += 1;
          }
          if (p.estado_paciente === 'EN SEGUIMIENTO' && p.updated_at && isValidISODate(p.updated_at)) {
            const followupDate = new Date(p.updated_at);
            const dayOfWeek = followupDate.getDay();
            const weekStartDate = new Date(followupDate);
            weekStartDate.setDate(followupDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            
            const weekKey = format(weekStartDate, 'yyyy-MM-dd');
            const weekEntry = weeklyDataMap.get(weekKey);
            if (weekEntry) weekEntry.seguimiento += 1;
          }
        });
      }

      dataForChart = Array.from(weeklyDataMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));
        
    } else if (dateRange === '90dias') {
      // Bi-weekly aggregation for 90-day view to reduce clutter
      const biWeeklyDataMap = new Map<string, { 
        name: string; 
        label: string;
        consultas: number; 
        operados: number;
        nuevos: number;
        seguimiento: number; 
      }>();

      const currentDate = new Date(startDate);
      const end = new Date(endDate);
      
      // Set to the 1st or 15th of the month for bi-weekly periods
      let periodStart = new Date(currentDate);
      if (periodStart.getDate() > 15) {
        // Set to the 15th of current month
        periodStart.setDate(15);
      } else {
        // Set to the 1st of current month
        periodStart.setDate(1);
      }

      while (periodStart <= end) {
        // Determine if this is the first or second half of the month
        const isFirstHalf = periodStart.getDate() === 1;
        const periodKey = format(periodStart, 'yyyy-MM') + (isFirstHalf ? '-1' : '-2');
        
        // Create period end date (14th or end of month)
        const periodEnd = new Date(periodStart);
        if (isFirstHalf) {
          // First half ends on the 14th
          periodEnd.setDate(14);
        } else {
          // Second half ends on the last day of the month
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          periodEnd.setDate(0);
        }
        
        if (!biWeeklyDataMap.has(periodKey)) {
          biWeeklyDataMap.set(periodKey, {
            name: periodKey,
            label: isFirstHalf ? 
              `1-15 ${format(periodStart, 'MMM')}` : 
              `16-${format(periodEnd, 'dd MMM')}`,
            consultas: 0,
            operados: 0,
            nuevos: 0,
            seguimiento: 0,
          });
        }
        
        // Move to next bi-weekly period
        if (isFirstHalf) {
          // Move to 15th of current month
          periodStart.setDate(15);
        } else {
          // Move to 1st of next month
          periodStart.setMonth(periodStart.getMonth() + 1);
          periodStart.setDate(1);
        }
      }

      // Process appointment and patient data for bi-weekly view
      if (appointments) {
        appointments.forEach((appointment) => {
          if (!appointment.fecha_hora_cita || !isValidISODate(appointment.fecha_hora_cita) || appointment.estado_cita === 'CANCELADA') return;
          
          const appointmentDate = new Date(appointment.fecha_hora_cita);
          const monthStr = format(appointmentDate, 'yyyy-MM');
          const dayOfMonth = appointmentDate.getDate();
          const isFirstHalf = dayOfMonth <= 15;
          const periodKey = monthStr + (isFirstHalf ? '-1' : '-2');
          
          const periodEntry = biWeeklyDataMap.get(periodKey);
          if (periodEntry) periodEntry.consultas += 1;
        });
      }

      if (patients) {
        patients.forEach(p => {
          if (p.fecha_registro && isValidISODate(p.fecha_registro)) {
            const regDate = new Date(p.fecha_registro);
            const monthStr = format(regDate, 'yyyy-MM');
            const dayOfMonth = regDate.getDate();
            const isFirstHalf = dayOfMonth <= 15;
            const periodKey = monthStr + (isFirstHalf ? '-1' : '-2');
            
            const periodEntry = biWeeklyDataMap.get(periodKey);
            if (periodEntry) periodEntry.nuevos += 1;
          }
          
          if (p.estado_paciente === 'OPERADO' && p.updated_at && isValidISODate(p.updated_at)) {
            const opDate = new Date(p.updated_at);
            const monthStr = format(opDate, 'yyyy-MM');
            const dayOfMonth = opDate.getDate();
            const isFirstHalf = dayOfMonth <= 15;
            const periodKey = monthStr + (isFirstHalf ? '-1' : '-2');
            
            const periodEntry = biWeeklyDataMap.get(periodKey);
            if (periodEntry) periodEntry.operados += 1;
          }
          
          if (p.estado_paciente === 'EN SEGUIMIENTO' && p.updated_at && isValidISODate(p.updated_at)) {
            const followupDate = new Date(p.updated_at);
            const monthStr = format(followupDate, 'yyyy-MM');
            const dayOfMonth = followupDate.getDate();
            const isFirstHalf = dayOfMonth <= 15;
            const periodKey = monthStr + (isFirstHalf ? '-1' : '-2');
            
            const periodEntry = biWeeklyDataMap.get(periodKey);
            if (periodEntry) periodEntry.seguimiento += 1;
          }
        });
      }

      dataForChart = Array.from(biWeeklyDataMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Daily aggregation for 7 days view
      const dailyDataMap = new Map<string, { 
        name: string; 
        label: string;
        consultas: number; 
        operados: number;
        nuevos: number;
        seguimiento: number; 
      }>();
      
      const currentDate = new Date(startDate);
      const end = new Date(endDate);

      while (currentDate <= end) {
        const key = format(currentDate, 'yyyy-MM-dd');
        dailyDataMap.set(key, {
          name: format(currentDate, 'yyyy-MM-dd'),
          label: format(currentDate, 'dd/MM'),
          consultas: 0,
          operados: 0,
          nuevos: 0,
          seguimiento: 0,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Process appointments for daily view
      if (appointments) {
        appointments.forEach((appointment) => {
          if (!appointment.fecha_hora_cita || !isValidISODate(appointment.fecha_hora_cita) || appointment.estado_cita === 'CANCELADA') return;
          const key = format(new Date(appointment.fecha_hora_cita), 'yyyy-MM-dd');
          const dailyEntry = dailyDataMap.get(key);
          if (dailyEntry) dailyEntry.consultas += 1;
        });
      }

      // Process patients for daily view
      if (patients) {
        patients.forEach(p => {
          if (p.fecha_registro && isValidISODate(p.fecha_registro)) {
            const key = format(new Date(p.fecha_registro), 'yyyy-MM-dd');
            const dailyEntry = dailyDataMap.get(key);
            if (dailyEntry) dailyEntry.nuevos += 1;
          }
          
          if (p.estado_paciente === 'OPERADO' && p.updated_at && isValidISODate(p.updated_at)) {
            const key = format(new Date(p.updated_at), 'yyyy-MM-dd');
            const dailyEntry = dailyDataMap.get(key);
            if (dailyEntry) dailyEntry.operados += 1;
          }
          
          if (p.estado_paciente === 'EN SEGUIMIENTO' && p.updated_at && isValidISODate(p.updated_at)) {
            const key = format(new Date(p.updated_at), 'yyyy-MM-dd');
            const dailyEntry = dailyDataMap.get(key);
            if (dailyEntry) dailyEntry.seguimiento += 1;
          }
        });
      }
      
      dataForChart = Array.from(dailyDataMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return {
      series: [
        { name: 'Consultas', data: dataForChart.map(d => d.consultas) },
        { name: 'Operados', data: dataForChart.map(d => d.operados) },
        { name: 'Nuevos', data: dataForChart.map(d => d.nuevos) },
        { name: 'Seguimiento', data: dataForChart.map(d => d.seguimiento) },
      ],
      categories: dataForChart.map(d => d.label),
    };
  }, [appointments, patients, startDate, endDate, dateRange]);

  // Create a refresh function to invalidate cache and trigger refetch - más granular y eficiente
  const refresh = useCallback(() => {
    // Invalidar todas las consultas relacionadas con el dashboard de una vez
    void queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    // O invalidar consultas específicas si se necesita más granularidad
    void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    void queryClient.invalidateQueries({ queryKey: ['patients'] });
    void queryClient.invalidateQueries({ queryKey: ['metrics'] });
  }, [queryClient]);
  
  // Calculate enhanced metrics if the API didn't provide complete data
  const enhancedMetrics = useMemo(() => {
    // If we have complete metrics from the API, use those
    if (clinicMetrics) {
      return {
        ...clinicMetrics,
        // Ensure we have non-operated and follow-up patients
        pacientesNoOperados: clinicMetrics.pacientesNoOperados ?? (
          patients?.filter(p => p.estado_paciente === 'NO OPERADO').length ?? 0
        ),
        pacientesSeguimiento: clinicMetrics.pacientesSeguimiento ?? (
          patients?.filter(p => p.estado_paciente === 'EN SEGUIMIENTO').length ?? 0
        ),
        // Recalculate conversion rate for accuracy using real patient data
        tasaConversion: clinicMetrics.tasaConversion ?? (
          // Calculamos usando los pacientes operados dividido entre el total de pacientes que ya han sido consultados
          patients && patients.length > 0 ? 
            patients.filter(p => p.estado_paciente === 'OPERADO').length / 
            patients.filter(p => ['CONSULTADO', 'EN SEGUIMIENTO', 'OPERADO', 'NO OPERADO', 'INDECISO'].includes(p.estado_paciente || '')).length : 0
        ),
      };
    }
    
    // If no metrics from API, calculate our own
    if (!patients || patients.length === 0) {
      return null;
    }
    
    // Calculate average decision time (from first consultation to surgery decision)
    const decisionTimes: number[] = [];
    patients.forEach(patient => {
      if (patient.estado_paciente === 'OPERADO' && patient.fecha_registro) {
        const firstConsultDate = new Date(patient.fecha_registro);
        // Use fecha_cirugia_programada if available, otherwise use updated_at
        const decisionDate = patient.fecha_cirugia_programada ? new Date(patient.fecha_cirugia_programada) : 
                              patient.updated_at ? new Date(patient.updated_at) : null;
        
        if (decisionDate && !isNaN(firstConsultDate.getTime()) && !isNaN(decisionDate.getTime())) {
          const daysDiff = Math.ceil((decisionDate.getTime() - firstConsultDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff >= 0) decisionTimes.push(daysDiff);
        }
      }
    });
    
    const avgDecisionTime = decisionTimes.length > 0 
      ? Math.round(decisionTimes.reduce((sum, time) => sum + time, 0) / decisionTimes.length) 
      : 0;
    
    // Calculate main patient source
    const sourceCounts: Record<string, number> = {};
    patients.forEach(patient => {
      const source = patient.origen_paciente || 'Other';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    
    let mainSource = 'Other';
    let maxCount = 0;
    
    Object.entries(sourceCounts).forEach(([source, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mainSource = source;
      }
    });
    
    // Most common diagnoses
    const diagnosisCounts: Record<string, number> = {};
    patients.forEach(patient => {
      const diagnosis = patient.diagnostico_principal || 'NO ESPECIFICADO';
      diagnosisCounts[diagnosis] = (diagnosisCounts[diagnosis] || 0) + 1;
    });
    
    const commonDiagnoses = Object.entries(diagnosisCounts)
      .map(([tipo, cantidad]) => ({ tipo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
    
    return {
      totalPacientes: patients.length,
      pacientesNuevosMes: generalStats.nuevos,
      pacientesOperados: generalStats.operados,
      pacientesNoOperados: patients.filter(p => p.estado_paciente === 'NO OPERADO').length,
      pacientesSeguimiento: generalStats.seguimiento,
      tasaConversion: patients.length > 0 ? generalStats.operados / patients.length : 0,
      tiempoPromedioDecision: avgDecisionTime,
      fuentePrincipalPacientes: mainSource,
      diagnosticosMasComunes: commonDiagnoses,
      lastUpdated: new Date().toISOString()
    };
  }, [clinicMetrics, patients, generalStats]);

  return {
    loading,
    error: error ? (error as Error).message : null,
    appointments,
    patients,
    transformedPatients,
    diagnosisData,
    generalStats,
    weekdayDistribution,
    clinicMetrics: enhancedMetrics,
    chart,
    refresh,
    rawData: { // Combined data for convenience in some components
      appointments,
      patients,
      metrics: clinicMetrics
    }
  };
}