'use client';

import { useMemo, useCallback } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

import type { Database } from '@/lib/types/database.types';
import { calculateDateRange, isValidISODate } from '@/lib/utils';
import { useAppointments } from './use-appointments';

// Tipos de la base de datos para mayor claridad
type Patient = Database['public']['Tables']['patients']['Row'];
type Appointment = Database['public']['Tables']['appointments']['Row'];
type DiagnosisEnum = Database['public']['Enums']['diagnosis_enum'];
type PatientStatus = Database['public']['Enums']['patient_status_enum'];
type AppointmentStatus = Database['public']['Enums']['appointment_status_enum'];

// Tipo para citas enriquecidas que viene de useAppointments
export interface ExtendedAppointment extends Appointment {
  paciente: Patient | null;
  doctor: { full_name?: string | null } | null;
  // Las propiedades fecha_hora_cita y estado_cita ya vienen del tipo base Appointment
  // Solo añadimos status como alias opcional para compatibilidad
  status?: AppointmentStatus;
}

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
  estado: string;
  fechaRegistro: string;
  diagnostico: string;
}

interface TransformedDiagnosisData {
  name: string;
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

interface BiWeeklyDataItem {
  name: string;
  label: string;
  consultas: number;
  operados: number;
  nuevos: number;
  seguimiento: number;
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

  const { data, isLoading: loading, error } = useAppointments();
  const allAppointments = data?.appointments as ExtendedAppointment[] || [];

  // Extraemos los pacientes únicos de las citas
  const patients = useMemo(() => {
    if (!allAppointments || allAppointments.length === 0) return [];
    
    const patientMap = new Map<string, Patient>();
    allAppointments.forEach(appt => {
      if (appt.paciente) {
        patientMap.set(appt.paciente.id, appt.paciente);
      }
    });
    
    return Array.from(patientMap.values());
  }, [allAppointments]);

  // Calculamos el rango de fechas basado en el dateRange seleccionado
  const { startDate, endDate } = useMemo(() => 
    calculateDateRange(dateRange), [dateRange]);

  // Filtramos las citas según rango de fechas, doctorId, patientId y estado
  const filteredAppointments = useMemo(() => {
    if (!allAppointments || allAppointments.length === 0 || !startDate || !endDate) {
      return [];
    }
    
    return allAppointments.filter(appointment => {
      // Verificamos que la fecha sea válida
      const appointmentDateStr = appointment.fecha_hora_cita || '';
      if (!appointmentDateStr) return false;
      
      const appointmentDate = isValidISODate(appointmentDateStr)
        ? parseISO(appointmentDateStr)
        : new Date(appointmentDateStr);
      
      // Si está fuera del rango, se excluye
      if (appointmentDate < startDate || appointmentDate > endDate) {
        return false;
      }
      
      // Filtro por doctorId
      if (doctorId && appointment.doctor_id !== doctorId) {
        return false;
      }
      
      // Filtro por patientId
      if (patientId && appointment.patient_id !== patientId) {
        return false;
      }
      
      // Filtro por estado (si existe y no es 'todos')
      if (estado && estado !== 'todos') {
        const appointmentStatus = appointment.status || appointment.estado_cita as AppointmentStatus;
        if (appointmentStatus !== estado) {
          return false;
        }
      }
      
      return true;
    });
  }, [allAppointments, startDate, endDate, doctorId, patientId, estado]);

  // Filtramos los pacientes según el rango de fechas y otros filtros
  const filteredPatients = useMemo(() => {
    if (!patients || patients.length === 0) {
      return [];
    }
    
    // Si hay filtro de paciente específico, solo incluimos ese paciente
    if (patientId) {
      return patients.filter(p => p.id === patientId);
    }
    
    // Creamos un conjunto con los IDs de pacientes de las citas filtradas
    const patientIds = new Set<string>();
    filteredAppointments.forEach(appointment => {
      if (appointment.patient_id) {
        patientIds.add(appointment.patient_id);
      }
    });
    
    // Solo incluimos los pacientes que tienen citas en el período
    return patients.filter(p => patientIds.has(p.id));
  }, [patients, filteredAppointments, patientId]);

  // Generamos datos para gráficos por semanas
  const biWeeklyDataMap = useMemo(() => {
    if (!startDate || !endDate) {
      return new Map<string, BiWeeklyDataItem>();
    }
    
    const dataMap = new Map<string, BiWeeklyDataItem>();
    
    // Inicializamos el mapa con las semanas en el rango de fechas
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const weekKey = format(currentDate, 'yyyy-MM-dd');
      const weekLabel = format(currentDate, 'dd/MM');
      
      dataMap.set(weekKey, {
        name: weekKey,
        label: weekLabel,
        consultas: 0,
        operados: 0,
        nuevos: 0,
        seguimiento: 0
      });
      
      // Avanzamos una semana
      currentDate = addDays(currentDate, 7);
    }
    
    // Contamos las citas por semana
    filteredAppointments.forEach(appointment => {
      const appointmentDateStr = appointment.fecha_hora_cita;
      if (!appointmentDateStr) return;
      
      const appointmentDate = isValidISODate(appointmentDateStr)
        ? parseISO(appointmentDateStr)
        : new Date(appointmentDateStr);
      
      const weekKey = format(appointmentDate, 'yyyy-MM-dd');
      
      // Si la semana existe en nuestro mapa
      const weekData = dataMap.get(weekKey);
      if (weekData) {
        // Incrementamos contador de consultas
        weekData.consultas += 1;
        
        // Incrementamos contadores según el diagnóstico del paciente
        if (appointment.paciente) {
          const diagnostico = appointment.paciente.diagnostico_principal || '';
          if (diagnostico.includes('OPERADO')) {
            weekData.operados += 1;
          } else if (diagnostico.includes('NUEVO')) {
            weekData.nuevos += 1;
          } else if (diagnostico.includes('SEGUIMIENTO')) {
            weekData.seguimiento += 1;
          }
        }
      }
    });
    
    return dataMap;
  }, [filteredAppointments, startDate, endDate]);

  // Convertimos el mapa a un array para los gráficos, ordenado por fecha
  const dataForChart = useMemo(() => {
    return Array.from(biWeeklyDataMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [biWeeklyDataMap]);

  // Métricas clínicas principales
  const clinicMetrics = useMemo<ClinicMetrics>(() => {
    const now = new Date();
    
    // Calculamos diagnósticos más comunes
    const diagnosisCounts = new Map<string, number>();
    filteredPatients.forEach(patient => {
      // Usamos diagnostico_principal en lugar de diagnosis
      const diagnosis = patient.diagnostico_principal || 'NO ESPECIFICADO';
      diagnosisCounts.set(diagnosis, (diagnosisCounts.get(diagnosis) || 0) + 1);
    });
    
    // Convertimos el mapa a un array y ordenamos por cantidad
    const diagnosticosMasComunes = Array.from(diagnosisCounts.entries())
      .map(([tipo, cantidad]) => ({ tipo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5); // Top 5

    // Calculamos pacientes nuevos en el último mes
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const pacientesNuevosMes = filteredPatients.filter(
      p => p.created_at && parseISO(p.created_at) >= lastMonth
    ).length;

    // Contamos por estado, asumiendo que status podría no existir y usando operador
    // de encadenamiento opcional para evitar errores
    const operados = filteredPatients.filter(p => 
      p.status === 'OPERADO' || p.diagnostico_principal === 'HERNIA OPERADA'
    ).length;
    
    const noOperados = filteredPatients.filter(p => 
      p.status !== 'OPERADO' && p.status !== 'SEGUIMIENTO' && 
      p.diagnostico_principal !== 'HERNIA OPERADA'
    ).length;
    
    const seguimiento = filteredPatients.filter(p => 
      p.status === 'SEGUIMIENTO' || p.diagnostico_principal?.includes('SEGUIMIENTO')
    ).length;
    
    // Calculamos tasa de conversión (operados/total)
    const tasaConversion = filteredPatients.length > 0 ? 
      operados / filteredPatients.length : 0;
    
    // Fuente principal de pacientes (simulación - esta lógica debe ajustarse)
    const fuentePrincipal = 'REFERIDO';
    
    // Tiempo promedio de decisión (simulación - esta lógica debe ajustarse)
    const tiempoPromedioDecision = 15; // días
    
    return {
      totalPacientes: filteredPatients.length,
      pacientesNuevosMes,
      pacientesOperados: operados,
      pacientesNoOperados: noOperados,
      pacientesSeguimiento: seguimiento,
      tasaConversion,
      tiempoPromedioDecision,
      fuentePrincipalPacientes: fuentePrincipal,

  const transformedPatients = useMemo((): TransformedPatientData[] => {
    if (!filteredPatients || filteredPatients.length === 0) return [];
    return filteredPatients.map(p => ({
      id: p.id,
      nombre: `${p.nombre} ${p.apellidos}`,
      telefono: p.telefono ?? 'N/A',
      estado: p.estado_paciente ?? 'SIN ESTADO',
      fechaRegistro: p.fecha_registro ? new Date(p.fecha_registro).toLocaleDateString() : 'N/A',
      diagnostico: p.diagnostico_principal ?? 'NO ESPECIFICADO',
    }));
  }, [filteredPatients]);

  const diagnosisData = useMemo((): TransformedDiagnosisData[] => {
    const count: Record<string, number> = {};
    if (!filteredPatients) return [];
    filteredPatients.forEach(p => {
      const diag = p.diagnostico_principal ?? 'NO ESPECIFICADO';
      count[diag] = (count[diag] || 0) + 1;
    });
    return Object.entries(count).map(([name, value]) => ({ name: name as DiagnosisEnum | 'NO ESPECIFICADO', value }));
  }, [filteredPatients]);

  const generalStats = useMemo((): GeneralStats => {
    if (!filteredPatients) return { total: 0, nuevos: 0, operados: 0, seguimiento: 0 };
    
    const nuevos = filteredPatients.filter(p => {
      if (!p.fecha_registro || !isValidISODate(p.fecha_registro)) return false;
      const regDate = parseISO(p.fecha_registro);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      return regDate >= startOfMonth;
    }).length;

    const operados = filteredPatients.filter(p => p.estado_paciente === 'OPERADO').length;
    const seguimiento = filteredPatients.filter(p => p.estado_paciente === 'EN SEGUIMIENTO').length;
    
    return {
      total: filteredPatients.length,
      nuevos,
      operados,
      seguimiento,
    };
  }, [filteredPatients]);

  const weekdayDistribution = useMemo((): WeekdayData[] => {
    const distribution: { [key: string]: number } = {
      Lunes: 0, Martes: 0, Miércoles: 0, Jueves: 0, Viernes: 0, Sábado: 0, Domingo: 0
    };
    if (!filteredAppointments || filteredAppointments.length === 0) {
      return Object.entries(distribution).map(([name, value]) => ({ name, value }));
    }

    const dayMapping: { [key: number]: string } = {
      1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 0: 'Domingo'
    };

    filteredAppointments.forEach(appointment => {
      if (isValidISODate(appointment.fecha_hora_cita)) {
        const dayOfWeek = parseISO(appointment.fecha_hora_cita).getDay();
        const dayName = dayMapping[dayOfWeek];
        if (dayName) {
          distribution[dayName] += 1;
        }
      }
    });

    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [filteredAppointments]);

  const chart = useMemo(() => {
    if (!startDate || !endDate) {
      return { series: [], categories: [] };
    }

    let dataForChart;
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

      if (filteredAppointments) {
        filteredAppointments.forEach((appointment) => {
          if (!appointment.fecha_hora_cita || !isValidISODate(appointment.fecha_hora_cita) || appointment.estado_cita === 'CANCELADA') return;
          const key = format(parseISO(appointment.fecha_hora_cita), 'yyyy-MM');
          const monthEntry = monthlyDataMap.get(key);
          if (monthEntry) monthEntry.consultas += 1;
        });
      }

      if (filteredPatients) {
        filteredPatients.forEach(p => {
          if (p.fecha_registro && isValidISODate(p.fecha_registro)) {
            const key = format(parseISO(p.fecha_registro), 'yyyy-MM');
            const monthEntry = monthlyDataMap.get(key);
            if (monthEntry) monthEntry.nuevos += 1;
          }
          if (p.estado_paciente === 'OPERADO' && p.updated_at && isValidISODate(p.updated_at)) {
            const key = format(parseISO(p.updated_at), 'yyyy-MM');
            const monthEntry = monthlyDataMap.get(key);
            if (monthEntry) monthEntry.operados += 1;
          }
          if (p.estado_paciente === 'EN SEGUIMIENTO' && p.updated_at && isValidISODate(p.updated_at)) {
            const key = format(parseISO(p.updated_at), 'yyyy-MM');
            const monthEntry = monthlyDataMap.get(key);
            if (monthEntry) monthEntry.seguimiento += 1;
          }
        });
      }

      dataForChart = Array.from(monthlyDataMap.values()).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    } else {
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
      
      if (filteredAppointments) {
        filteredAppointments.forEach((appointment) => {
          if (!appointment.fecha_hora_cita || !isValidISODate(appointment.fecha_hora_cita) || appointment.estado_cita === 'CANCELADA') return;
          const key = format(parseISO(appointment.fecha_hora_cita), 'yyyy-MM-dd');
          const dailyEntry = dailyDataMap.get(key);
          if (dailyEntry) dailyEntry.consultas += 1;
        });
      }

      if (filteredPatients) {
        filteredPatients.forEach(p => {
          if (p.fecha_registro && isValidISODate(p.fecha_registro)) {
            const key = format(parseISO(p.fecha_registro), 'yyyy-MM-dd');
            const dailyEntry = dailyDataMap.get(key);
            if (dailyEntry) dailyEntry.nuevos += 1;
          }
          
          if (p.estado_paciente === 'OPERADO' && p.updated_at && isValidISODate(p.updated_at)) {
            const key = format(parseISO(p.updated_at), 'yyyy-MM-dd');
            const dailyEntry = dailyDataMap.get(key);
            if (dailyEntry) dailyEntry.operados += 1;
          }
          
          if (p.estado_paciente === 'EN SEGUIMIENTO' && p.updated_at && isValidISODate(p.updated_at)) {
            const key = format(parseISO(p.updated_at), 'yyyy-MM-dd');
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
  }, [filteredAppointments, filteredPatients, startDate, endDate, dateRange]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
  }, [queryClient]);
  
  const enhancedMetrics = useMemo(() => {
    if (!clinicMetrics) return null;
    return {
      ...clinicMetrics,
      tasaConversion: filteredPatients.length > 0 ? (clinicMetrics.pacientesOperados / filteredPatients.length) : 0,
    };
  }, [clinicMetrics, filteredPatients]);

          // Move to 15th of current month
          periodStart.setDate(15);
        } else {
          // Move to 1st of next month
          periodStart.setMonth(periodStart.getMonth() + 1);
          periodStart.setDate(1);
        }
  return {
    loading,
    error: error ? (error as Error).message : null,
    appointments: filteredAppointments,
    patients: filteredPatients,
    transformedPatients,
    diagnosisData,
    generalStats,
    weekdayDistribution,
    clinicMetrics: enhancedMetrics,
    chart,
    refresh,
    rawData: { 
      appointments: filteredAppointments,
      patients: filteredPatients,
      metrics: clinicMetrics
    }
  };
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