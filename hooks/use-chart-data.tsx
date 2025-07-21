"use client";

import { useMemo, useCallback, useState, useEffect } from 'react';
import { format, parseISO, addDays, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';

import type { Database } from '@/lib/types/database.types';
import { calculateDateRange, isValidISODate } from '@/lib/utils';


// --- TIPOS DE DATOS ---
// Extraídos de la base de datos para autocompletado y seguridad de tipos.
type Patient = Database['public']['Tables']['patients']['Row'];
type Appointment = Database['public']['Tables']['appointments']['Row'];
type DiagnosisEnum = Database['public']['Enums']['diagnosis_enum'];
type PatientStatus = Database['public']['Enums']['patient_status_enum'];
type AppointmentStatus = Database['public']['Enums']['appointment_status_enum'];





export type DateRangeKey = "week" | "month" | "3-months" | "year" | "all";

export interface AppointmentFilters {
  dateRange: string;
  patientId: string | undefined;
  doctorId: string | undefined;
  estado: 'todos' | AppointmentStatus;
  motiveFilter: string;
  statusFilter: AppointmentStatus[];
  timeRange: [number, number];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

// Estructura de las métricas principales de la clínica.
export interface ClinicMetrics {
  totalPacientes: number;
  pacientesNuevosMes: number;
  pacientesOperados: number;
  pacientesNoOperados: number;
  pacientesSeguimiento: number;
  tasaConversion: number;
  tiempoPromedioDecision: number; // en días
  fuentePrincipalPacientes: string;
  diagnosticosMasComunes: { tipo: string; cantidad: number }[];
  lastUpdated: string;
}

// --- TIPOS TRANSFORMADOS PARA UI ---
// Pacientes para tablas
interface TransformedPatientData {
  id: string;
  nombre: string;
  telefono: string;
  estado: PatientStatus | 'SIN ESTADO';
  fechaRegistro: string;
  diagnostico: DiagnosisEnum | 'NO ESPECIFICADO';
}

// Datos para gráficos de pastel/dona de diagnósticos
interface TransformedDiagnosisData {
  name: DiagnosisEnum | 'NO ESPECIFICADO';
  value: number;
}

// Estadísticas generales para tarjetas de resumen
interface GeneralStats {
  total: number;
  nuevosEsteMes: number;
  operados: number;
  enSeguimiento: number;
}

// Distribución de citas por día de la semana
interface WeekdayData {
  name: string;
  value: number;
}

// Propiedades de entrada para el hook
interface UseChartDataProps {
  patients: Patient[];
  appointments: Appointment[];
  dateRange: string;
  patientId?: string;
  doctorId?: string;
  estado?: PatientStatus | AppointmentStatus | 'todos';
}

/**
 * Hook centralizado para procesar y transformar datos de citas y pacientes
 * para su uso en gráficos y tablas del dashboard.
 * * @param {UseChartDataProps} props - Filtros para los datos.
 * @returns Un objeto con datos listos para la UI, estados de carga y error.
 */
export function useChartData({
  patients,
  appointments,
  dateRange,
  patientId,
  doctorId,
  estado = 'todos'
}: UseChartDataProps) {
  // --- GUARD CLAUSE --- 
  // Si no hay pacientes, no se puede calcular nada. Devuelve un estado vacío.
  if (!patients || patients.length === 0) {
    return {
      transformedPatients: [],
      generalStats: { total: 0, nuevosEsteMes: 0, operados: 0, enSeguimiento: 0 },
      diagnosisData: [],
      weekdayDistribution: [],
      filteredAppointments: [],
      clinicMetrics: null,
      chart: { series: [], categories: [] },
    };
  }

  // --- 2. FILTRADO DE DATOS ---

    const { startDate, endDate } = useMemo(() => calculateDateRange(dateRange), [dateRange]);

  const filteredAppointments = useMemo(() => {
    if (!appointments || !appointments.length || !startDate || !endDate) return [];
    
    return appointments.filter((appt: Appointment) => {
      const apptDateStr = appt.fecha_hora_cita;
      if (!apptDateStr || !isValidISODate(apptDateStr)) return false;

      const apptDate = parseISO(apptDateStr);
      if (apptDate < startDate || apptDate > endDate) return false;
      if (doctorId && appt.doctor_id !== doctorId) return false;
      if (patientId && appt.patient_id !== patientId) return false;
      if (estado !== 'todos' && appt.estado_cita !== estado) return false;

      return true;
    });
  }, [appointments, startDate, endDate, doctorId, patientId, estado]);

  const filteredPatients = useMemo((): Patient[] => {
    const patientIdsInFilteredAppointments = new Set(filteredAppointments.map((a: Appointment) => a.patient_id).filter(Boolean));
    return patients.filter((p: Patient) => patientIdsInFilteredAppointments.has(p.id));
  }, [patients, filteredAppointments]);

  // --- 3. TRANSFORMACIÓN DE DATOS PARA LA UI ---

  const transformedPatients = useMemo((): TransformedPatientData[] => {
    return filteredPatients.map(p => ({
      id: p.id,
      nombre: `${p.nombre || ''} ${p.apellidos || ''}`.trim(),
      telefono: p.telefono ?? 'N/A',
      estado: p.estado_paciente ?? 'SIN ESTADO',
      fechaRegistro: p.created_at && isValidISODate(p.created_at)
        ? format(parseISO(p.created_at), 'dd/MM/yyyy')
        : 'N/A',
      diagnostico: p.diagnostico_principal ?? 'NO ESPECIFICADO',
    }));
  }, [filteredPatients]);

  const diagnosisData = useMemo((): TransformedDiagnosisData[] => {
    const counts = filteredPatients.reduce((acc, p) => {
      const diag = p.diagnostico_principal ?? 'NO ESPECIFICADO';
      acc[diag] = (acc[diag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, value]) => ({
      name: name as DiagnosisEnum | 'NO ESPECIFICADO',
      value
    }));
  }, [filteredPatients]);

  const generalStats = useMemo((): GeneralStats => {
    const startOfCurrentMonth = startOfMonth(new Date());
    
    const nuevosEsteMes = filteredPatients.filter(p => 
      p.created_at && isValidISODate(p.created_at) && parseISO(p.created_at) >= startOfCurrentMonth
    ).length;
    
    const operados = filteredPatients.filter(p => p.estado_paciente === 'OPERADO').length;
    const enSeguimiento = filteredPatients.filter(p => p.estado_paciente === 'EN SEGUIMIENTO').length;

    return {
      total: filteredPatients.length,
      nuevosEsteMes,
      operados,
      enSeguimiento,
    };
  }, [filteredPatients]);

  const weekdayDistribution = useMemo((): WeekdayData[] => {
    const distribution: Record<string, number> = { 'Lunes': 0, 'Martes': 0, 'Miércoles': 0, 'Jueves': 0, 'Viernes': 0, 'Sábado': 0, 'Domingo': 0 };
    
    filteredAppointments.forEach(appt => {
      if (appt.fecha_hora_cita && isValidISODate(appt.fecha_hora_cita)) {
        // getDay() es 0 para Domingo, 1 para Lunes. Ajustamos para el formato español.
        const dayIndex = parseISO(appt.fecha_hora_cita).getDay();
        const dayName = format(parseISO(appt.fecha_hora_cita), 'EEEE', { locale: es });
        const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        if (distribution.hasOwnProperty(capitalizedDayName)) {
           distribution[capitalizedDayName]++;
        }
      }
    });

    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [filteredAppointments]);

  // --- 4. CÁLCULO DE MÉTRICAS AVANZADAS ---

  const clinicMetrics = useMemo((): ClinicMetrics | null => {
    if (filteredPatients.length === 0) return null;

    // Tasa de Conversión
    const pacientesConDecision = filteredPatients.filter(p => 
      ['OPERADO', 'NO OPERADO', 'DECIDIDO NO OPERARSE'].includes(p.estado_paciente ?? '')
    ).length;
    const tasaConversion = pacientesConDecision > 0 ? (generalStats.operados / pacientesConDecision) : 0;
    
    // Tiempo Promedio de Decisión
    const decisionTimes = filteredPatients
      .filter(p => p.estado_paciente === 'OPERADO' && p.created_at && p.updated_at && isValidISODate(p.created_at) && isValidISODate(p.updated_at))
      .map(p => differenceInDays(parseISO(p.updated_at!), parseISO(p.created_at!)));
    const tiempoPromedioDecision = decisionTimes.length > 0
      ? Math.round(decisionTimes.reduce((a, b) => a + b, 0) / decisionTimes.length)
      : 0;
      
    // Fuente Principal de Pacientes
    const sourceCounts = filteredPatients.reduce((acc, p) => {
      const source = p.origen_paciente ?? 'Desconocido';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const fuentePrincipalPacientes = Object.keys(sourceCounts).reduce((a, b) => sourceCounts[a] > sourceCounts[b] ? a : b, 'N/A');

    // Diagnósticos más comunes
    const diagnosticosMasComunes = [...diagnosisData].sort((a, b) => b.value - a.value).slice(0, 5).map(d => ({ tipo: d.name, cantidad: d.value }));

    return {
      totalPacientes: filteredPatients.length,
      pacientesNuevosMes: generalStats.nuevosEsteMes,
      pacientesOperados: generalStats.operados,
      pacientesNoOperados: filteredPatients.filter(p => ['NO OPERADO', 'DECIDIDO NO OPERARSE'].includes(p.estado_paciente ?? '')).length,
      pacientesSeguimiento: generalStats.enSeguimiento,
      tasaConversion,
      tiempoPromedioDecision,
      fuentePrincipalPacientes,
      diagnosticosMasComunes,
      lastUpdated: new Date().toISOString(),
    };
  }, [filteredPatients, generalStats, diagnosisData]);
  
  // --- 5. PREPARACIÓN DE DATOS PARA GRÁFICOS DE SERIES DE TIEMPO ---
  
  const chart = useMemo(() => {
    if (!startDate || !endDate) return { series: [], categories: [] };
  
    // Define el formato de la clave y la etiqueta según el rango de fechas
    const isLongRange = differenceInDays(endDate, startDate) > 31;
    const keyFormat = isLongRange ? 'yyyy-MM' : 'yyyy-MM-dd';
    const labelFormat = isLongRange ? 'MMM yy' : 'dd/MM';
  
    const dataMap = new Map<string, { consultas: number; operados: number; nuevos: number; seguimiento: number }>();
  
    // Inicializa el mapa con todos los períodos (días o meses) en el rango
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const key = format(currentDate, keyFormat);
      if (!dataMap.has(key)) {
        dataMap.set(key, { consultas: 0, operados: 0, nuevos: 0, seguimiento: 0 });
      }
      if (isLongRange) {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  
    // Agrega los datos de las citas y pacientes
    filteredAppointments.forEach(appt => {
      if (appt.fecha_hora_cita && isValidISODate(appt.fecha_hora_cita)) {
        const key = format(parseISO(appt.fecha_hora_cita), keyFormat);
        if (dataMap.has(key)) dataMap.get(key)!.consultas++;
      }
    });
  
    filteredPatients.forEach(p => {
      // Nuevos
      if (p.created_at && isValidISODate(p.created_at)) {
        const key = format(parseISO(p.created_at), keyFormat);
        if (dataMap.has(key)) dataMap.get(key)!.nuevos++;
      }
      // Operados y Seguimiento
      if (p.updated_at && isValidISODate(p.updated_at)) {
        const key = format(parseISO(p.updated_at), keyFormat);
        const entry = dataMap.get(key);
        if (entry) {
          if (p.estado_paciente === 'OPERADO') entry.operados++;
          if (p.estado_paciente === 'EN SEGUIMIENTO') entry.seguimiento++;
        }
      }
    });
    
    const sortedKeys = Array.from(dataMap.keys()).sort();
  
    return {
      series: [
        { name: 'Consultas', data: sortedKeys.map(key => dataMap.get(key)!.consultas) },
        { name: 'Operados', data: sortedKeys.map(key => dataMap.get(key)!.operados) },
        { name: 'Nuevos', data: sortedKeys.map(key => dataMap.get(key)!.nuevos) },
        { name: 'Seguimiento', data: sortedKeys.map(key => dataMap.get(key)!.seguimiento) },
      ],
      categories: sortedKeys.map(key => format(parseISO(isLongRange ? `${key}-01` : key), labelFormat, { locale: es })),
    };
  }, [filteredAppointments, filteredPatients, startDate, endDate]);

  // --- 6. OBJETO DE RETORNO ---
  
  return {
    // Datos crudos filtrados
    appointments: filteredAppointments,
    patients: filteredPatients,
    
    // Datos transformados para UI
    transformedPatients,
    diagnosisData,
    generalStats,
    weekdayDistribution,
    clinicMetrics,
    chart,
  };
}