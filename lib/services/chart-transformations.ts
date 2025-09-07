// lib/services/chart-transformations.ts
// Servicio centralizado para transformaciones de datos de gráficos
// Funciones puras sin efectos secundarios

import type { Appointment } from '@/lib/types';

export interface ChartDataResult {
  series: { name: string; data: number[] }[];
  categories: string[];
  groupedData: { [key: string]: { consultas: number; operados: number } };
}

export type GroupByPeriod = 'day' | 'week' | 'month' | 'year';

/**
 * Procesa datos de citas para generar datos de gráficos
 * @param appointments - Array de citas para procesar
 * @param startDate - Fecha de inicio opcional para filtrar
 * @param endDate - Fecha de fin opcional para filtrar  
 * @param groupBy - Período de agrupación (día, semana, mes, año)
 * @returns Datos formateados para gráficos
 */
export const processChartData = (
  appointments: Appointment[],
  startDate?: Date,
  endDate?: Date,
  groupBy: GroupByPeriod = 'day'
): ChartDataResult => {
  // Filtrar por rango de fechas si se especifica
  const filteredAppointments = appointments.filter(app => {
    if (!app.fecha_hora_cita) return false;
    const appointmentDate = new Date(app.fecha_hora_cita);
    
    if (startDate && appointmentDate < startDate) return false;
    if (endDate && appointmentDate > endDate) return false;
    
    return true;
  });

  // Agrupar citas por período
  const grouped: { [key: string]: { consultas: number; operados: number } } = {};
  
  filteredAppointments.forEach(appointment => {
    const date = new Date(appointment.fecha_hora_cita);
    const key = getDateKey(date, groupBy);
    
    if (!grouped[key]) {
      grouped[key] = { consultas: 0, operados: 0 };
    }
    
    grouped[key].consultas++;
    
    // Contar operados basado en el campo de la cita
    // Ajustar según la lógica de negocio real
    const isOperado = appointment.decision_final === 'CIRUGIA_PROGRAMADA' || 
                     appointment.decision_final === 'CIRUGIA_URGENTE_ACEPTADA' ||
                     appointment.diagnostico_final?.includes('cirugia');
    
    if (isOperado) {
      grouped[key].operados++;
    }
  });
  
  // Ordenar las claves cronológicamente
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const dateA = parseDate(a, groupBy);
    const dateB = parseDate(b, groupBy);
    return dateA.getTime() - dateB.getTime();
  });
  
  // Preparar datos para el gráfico
  const categories = sortedKeys;
  const consultasData = sortedKeys.map(key => grouped[key].consultas);
  const operadosData = sortedKeys.map(key => grouped[key].operados);
  
  return {
    series: [
      { name: 'Consultas', data: consultasData },
      { name: 'Operados', data: operadosData }
    ],
    categories,
    groupedData: grouped
  };
};

/**
 * Genera una clave de fecha según el período de agrupación
 */
function getDateKey(date: Date, groupBy: GroupByPeriod): string {
  switch (groupBy) {
    case 'day':
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    
    case 'week':
      // Obtener el número de semana del año
      const weekNumber = getWeekNumber(date);
      const year = date.getFullYear();
      return `Semana ${weekNumber}, ${year}`;
    
    case 'month':
      return date.toLocaleDateString('es-ES', { 
        month: 'long', 
        year: 'numeric' 
      });
    
    case 'year':
      return date.getFullYear().toString();
    
    default:
      return date.toISOString().split('T')[0];
  }
}

/**
 * Parsea una cadena de fecha según el formato de agrupación
 */
function parseDate(dateStr: string, groupBy: GroupByPeriod): Date {
  switch (groupBy) {
    case 'day': {
      const [day, month, year] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    case 'week': {
      // Formato: "Semana 15, 2024"
      const matches = dateStr.match(/Semana (\d+), (\d+)/);
      if (matches) {
        const weekNum = parseInt(matches[1]);
        const year = parseInt(matches[2]);
        return getDateFromWeek(weekNum, year);
      }
      return new Date();
    }
    
    case 'month': {
      // Para meses en español, mapear a número
      const monthMap: { [key: string]: number } = {
        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
        'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
        'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
      };
      const parts = dateStr.toLowerCase().split(' de ');
      const month = monthMap[parts[0]] || 0;
      const year = parseInt(parts[1]);
      return new Date(year, month, 1);
    }
    
    case 'year':
      return new Date(parseInt(dateStr), 0, 1);
    
    default:
      return new Date(dateStr);
  }
}

/**
 * Obtiene el número de semana del año para una fecha
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Obtiene una fecha a partir del número de semana y año
 */
function getDateFromWeek(week: number, year: number): Date {
  const date = new Date(year, 0, 1);
  const dayOfWeek = date.getDay();
  const daysToAdd = (week - 1) * 7 - dayOfWeek + 1;
  date.setDate(date.getDate() + daysToAdd);
  return date;
}

/**
 * Agrupa datos por diagnóstico
 */
export const groupByDiagnosis = (
  appointments: Appointment[]
): Record<string, number> => {
  const grouped: Record<string, number> = {};
  
  appointments.forEach(appointment => {
    const diagnosis = appointment.diagnostico_final || 'Sin diagnóstico';
    grouped[diagnosis] = (grouped[diagnosis] || 0) + 1;
  });
  
  return grouped;
};

/**
 * Calcula estadísticas de puntualidad
 */
export const calculatePunctualityStats = (
  appointments: Appointment[]
): {
  onTime: number;
  late: number;
  veryLate: number;
  total: number;
  averageDelayMinutes: number;
} => {
  let onTime = 0;
  let late = 0;
  let veryLate = 0;
  let totalDelay = 0;
  let appointmentsWithArrival = 0;
  
  appointments.forEach(appointment => {
    if (!appointment.hora_llegada || !appointment.fecha_hora_cita) return;
    
    const scheduled = new Date(appointment.fecha_hora_cita);
    const arrival = new Date(appointment.hora_llegada);
    const delayMinutes = (arrival.getTime() - scheduled.getTime()) / (1000 * 60);
    
    appointmentsWithArrival++;
    totalDelay += Math.max(0, delayMinutes);
    
    if (delayMinutes <= 5) {
      onTime++;
    } else if (delayMinutes <= 15) {
      late++;
    } else {
      veryLate++;
    }
  });
  
  return {
    onTime,
    late,
    veryLate,
    total: appointmentsWithArrival,
    averageDelayMinutes: appointmentsWithArrival > 0 
      ? totalDelay / appointmentsWithArrival 
      : 0
  };
};

/**
 * Genera datos para gráfico de distribución por hora del día
 */
export const generateHourlyDistribution = (
  appointments: Appointment[]
): ChartDataResult => {
  const hourCounts: number[] = new Array(24).fill(0);
  
  appointments.forEach(appointment => {
    if (!appointment.fecha_hora_cita) return;
    const hour = new Date(appointment.fecha_hora_cita).getHours();
    hourCounts[hour]++;
  });
  
  const categories = Array.from({ length: 24 }, (_, i) => 
    `${i.toString().padStart(2, '0')}:00`
  );
  
  return {
    series: [{ name: 'Citas', data: hourCounts }],
    categories,
    groupedData: categories.reduce((acc, cat, idx) => {
      acc[cat] = { consultas: hourCounts[idx], operados: 0 };
      return acc;
    }, {} as Record<string, { consultas: number; operados: number }>)
  };
};

/**
 * Calcula la tasa de conversión de consultas a cirugías
 */
export const calculateConversionRate = (
  appointments: Appointment[]
): {
  totalConsults: number;
  totalSurgeries: number;
  conversionRate: number;
  byMonth: Record<string, { consults: number; surgeries: number; rate: number }>;
} => {
  const byMonth: Record<string, { consults: number; surgeries: number }> = {};
  
  appointments.forEach(appointment => {
    if (!appointment.fecha_hora_cita) return;
    
    const monthKey = getDateKey(new Date(appointment.fecha_hora_cita), 'month');
    
    if (!byMonth[monthKey]) {
      byMonth[monthKey] = { consults: 0, surgeries: 0 };
    }
    
    byMonth[monthKey].consults++;
    
    const isSurgery = appointment.decision_final === 'CIRUGIA_PROGRAMADA' || 
                     appointment.decision_final === 'CIRUGIA_URGENTE_ACEPTADA' ||
                     appointment.diagnostico_final?.includes('cirugia');
    
    if (isSurgery) {
      byMonth[monthKey].surgeries++;
    }
  });
  
  // Calcular tasas
  const byMonthWithRates = Object.entries(byMonth).reduce((acc, [month, data]) => {
    acc[month] = {
      ...data,
      rate: data.consults > 0 ? (data.surgeries / data.consults) * 100 : 0
    };
    return acc;
  }, {} as Record<string, { consults: number; surgeries: number; rate: number }>);
  
  const totalConsults = Object.values(byMonth).reduce((sum, m) => sum + m.consults, 0);
  const totalSurgeries = Object.values(byMonth).reduce((sum, m) => sum + m.surgeries, 0);
  
  return {
    totalConsults,
    totalSurgeries,
    conversionRate: totalConsults > 0 ? (totalSurgeries / totalConsults) * 100 : 0,
    byMonth: byMonthWithRates
  };
};
