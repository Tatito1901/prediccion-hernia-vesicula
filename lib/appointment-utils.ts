// lib/appointment-utils.ts - UTILIDADES CENTRALIZADAS PARA CITAS
// Elimina duplicación de lógica en formularios y componentes

import { format, isWeekend, isBefore, startOfDay, addDays, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';

// ==================== CONFIGURACIÓN CENTRALIZADA ====================
export const CLINIC_CONFIG = {
  // Horarios de trabajo
  WORK_HOURS: {
    START: 8,  // 8:00 AM
    END: 18,   // 6:00 PM
    LUNCH_START: 12, // 12:00 PM
    LUNCH_END: 13,   // 1:00 PM
  },
  
  // Duración de citas
  APPOINTMENT_DURATION: 30, // minutos
  
  // Días de trabajo (1 = Lunes, 7 = Domingo)
  WORK_DAYS: [1, 2, 3, 4, 5] as number[], // Lunes a Viernes
  
  // Días festivos (formato YYYY-MM-DD)
  HOLIDAYS: [
    '2024-01-01', // Año Nuevo
    '2024-12-25', // Navidad
    // Agregar más días festivos según necesidad
  ] as string[],
  
  // Configuración de slots
  SLOT_CONFIG: {
    BUFFER_MINUTES: 5, // Buffer entre citas
    MAX_ADVANCE_DAYS: 90, // Máximo días de anticipación
    MIN_ADVANCE_HOURS: 2, // Mínimo horas de anticipación
  }
} as const;

// ==================== VALIDACIONES CENTRALIZADAS ====================

/**
 * Valida si una fecha es válida para agendar citas
 */
export const isValidAppointmentDate = (date: Date): boolean => {
  const today = startOfDay(new Date());
  const appointmentDate = startOfDay(date);
  
  // No puede ser en el pasado
  if (isBefore(appointmentDate, today)) {
    return false;
  }
  
  // No puede ser fin de semana
  if (isWeekend(date)) {
    return false;
  }
  
  // No puede ser día festivo
  const dateString = format(date, 'yyyy-MM-dd');
  if (CLINIC_CONFIG.HOLIDAYS.includes(dateString)) {
    return false;
  }
  
  // No puede ser más allá del límite de anticipación
  const maxDate = addDays(today, CLINIC_CONFIG.SLOT_CONFIG.MAX_ADVANCE_DAYS);
  if (isBefore(maxDate, appointmentDate)) {
    return false;
  }
  
  return true;
};

/**
 * Valida si es un día de trabajo
 */
export const isWorkDay = (date: Date): boolean => {
  const dayOfWeek = date.getDay();
  const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Domingo = 7
  return CLINIC_CONFIG.WORK_DAYS.includes(adjustedDay);
};

/**
 * Valida si una hora específica está en horario laboral
 */
export const isWorkingHour = (hour: number, minute: number = 0): boolean => {
  const totalMinutes = hour * 60 + minute;
  const startMinutes = CLINIC_CONFIG.WORK_HOURS.START * 60;
  const endMinutes = CLINIC_CONFIG.WORK_HOURS.END * 60;
  const lunchStartMinutes = CLINIC_CONFIG.WORK_HOURS.LUNCH_START * 60;
  const lunchEndMinutes = CLINIC_CONFIG.WORK_HOURS.LUNCH_END * 60;
  
  // Fuera del horario general
  if (totalMinutes < startMinutes || totalMinutes >= endMinutes) {
    return false;
  }
  
  // En horario de almuerzo
  if (totalMinutes >= lunchStartMinutes && totalMinutes < lunchEndMinutes) {
    return false;
  }
  
  return true;
};

// ==================== GENERACIÓN DE SLOTS CENTRALIZADA ====================

/**
 * Genera slots de tiempo disponibles para una fecha específica
 */
export const generateTimeSlots = (date?: Date): string[] => {
  if (!date || !isValidAppointmentDate(date)) {
    return [];
  }
  
  const slots: string[] = [];
  const { START, END, LUNCH_START, LUNCH_END } = CLINIC_CONFIG.WORK_HOURS;
  const { BUFFER_MINUTES } = CLINIC_CONFIG.SLOT_CONFIG;
  const { APPOINTMENT_DURATION } = CLINIC_CONFIG;
  
  // Calcular intervalo total (cita + buffer)
  const intervalMinutes = APPOINTMENT_DURATION + BUFFER_MINUTES;
  
  // Generar slots de la mañana (START hasta LUNCH_START)
  for (let hour = START; hour < LUNCH_START; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      if (isWorkingHour(hour, minute)) {
        const timeString = format(
          setMinutes(setHours(date, hour), minute),
          'HH:mm'
        );
        slots.push(timeString);
      }
    }
  }
  
  // Generar slots de la tarde (LUNCH_END hasta END)
  for (let hour = LUNCH_END; hour < END; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      if (isWorkingHour(hour, minute)) {
        const timeString = format(
          setMinutes(setHours(date, hour), minute),
          'HH:mm'
        );
        slots.push(timeString);
      }
    }
  }
  
  return slots;
};

/**
 * Genera slots disponibles excluyendo citas ya programadas
 */
export const getAvailableTimeSlots = (
  date: Date,
  existingAppointments: Array<{ fecha_hora_cita: string }> = []
): string[] => {
  const allSlots = generateTimeSlots(date);
  
  // Extraer horas ocupadas
  const occupiedTimes = existingAppointments
    .filter(apt => {
      const aptDate = new Date(apt.fecha_hora_cita);
      return format(aptDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    })
    .map(apt => format(new Date(apt.fecha_hora_cita), 'HH:mm'));
  
  // Filtrar slots disponibles
  return allSlots.filter(slot => !occupiedTimes.includes(slot));
};

// ==================== UTILIDADES DE FORMATEO ====================

/**
 * Formatea una fecha para mostrar en la UI
 */
export const formatAppointmentDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, "d 'de' MMMM 'de' yyyy", { locale: es });
};

/**
 * Formatea una hora para mostrar en la UI
 */
export const formatAppointmentTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'HH:mm');
};

/**
 * Formatea fecha y hora completa
 */
export const formatAppointmentDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es });
};

// ==================== VALIDACIONES DE CITAS ====================

/**
 * Valida si una cita puede ser reagendada
 */
export const canRescheduleAppointment = (appointmentDate: Date | string): boolean => {
  const aptDate = typeof appointmentDate === 'string' ? new Date(appointmentDate) : appointmentDate;
  const now = new Date();
  const minAdvanceMs = CLINIC_CONFIG.SLOT_CONFIG.MIN_ADVANCE_HOURS * 60 * 60 * 1000;
  
  return (aptDate.getTime() - now.getTime()) >= minAdvanceMs;
};

/**
 * Valida si una cita puede ser cancelada
 */
export const canCancelAppointment = (appointmentDate: Date | string): boolean => {
  // Misma lógica que reagendar por ahora
  return canRescheduleAppointment(appointmentDate);
};

/**
 * Obtiene el próximo día hábil disponible
 */
export const getNextAvailableWorkDay = (fromDate: Date = new Date()): Date => {
  let nextDay = addDays(startOfDay(fromDate), 1);
  
  while (!isValidAppointmentDate(nextDay)) {
    nextDay = addDays(nextDay, 1);
  }
  
  return nextDay;
};

// ==================== UTILIDADES DE ESTADO ====================

/**
 * Determina si una cita está en el pasado
 */
export const isAppointmentInPast = (appointmentDate: Date | string): boolean => {
  const aptDate = typeof appointmentDate === 'string' ? new Date(appointmentDate) : appointmentDate;
  return isBefore(aptDate, new Date());
};

/**
 * Determina si una cita es para hoy
 */
export const isAppointmentToday = (appointmentDate: Date | string): boolean => {
  const aptDate = typeof appointmentDate === 'string' ? new Date(appointmentDate) : appointmentDate;
  const today = startOfDay(new Date());
  return format(aptDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
};

/**
 * Calcula tiempo restante hasta una cita
 */
export const getTimeUntilAppointment = (appointmentDate: Date | string): {
  days: number;
  hours: number;
  minutes: number;
  isPast: boolean;
} => {
  const aptDate = typeof appointmentDate === 'string' ? new Date(appointmentDate) : appointmentDate;
  const now = new Date();
  const diffMs = aptDate.getTime() - now.getTime();
  
  if (diffMs < 0) {
    return { days: 0, hours: 0, minutes: 0, isPast: true };
  }
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes, isPast: false };
};

// ==================== EXPORTACIONES PARA COMPATIBILIDAD ====================
export {
  generateTimeSlots as generateTimeSlotsLegacy,
  isValidAppointmentDate as isValidAppointmentDateLegacy,
  isWorkDay as isWorkDayLegacy
};
