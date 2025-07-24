import { format, isToday, isFuture, isPast } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIME_ZONE = 'America/Mexico_City'; // O la zona horaria que prefieras

/**
 * Convierte una fecha UTC (de Supabase) a la zona horaria local.
 * @param dateString La fecha en formato string desde la base de datos (UTC).
 * @returns Un objeto Date en la zona horaria correcta.
 */
export const convertUtcToLocal = (dateString: string): Date => {
  // La fecha que viene de Supabase ya es un objeto Date en UTC
  // toZonedTime la convierte a la zona horaria especificada
  return toZonedTime(dateString, TIME_ZONE);
};

/**
 * Formatea una fecha para mostrarla en un formato legible (e.g., 'dd/MM/yyyy HH:mm').
 * @param date El objeto Date a formatear.
 * @returns La fecha formateada como string.
 */
export const formatReadableDateTime = (date: Date): string => {
  return format(date, 'dd/MM/yyyy HH:mm');
};

/**
 * Formatea una fecha para mostrar solo la hora (e.g., 'HH:mm').
 * @param date El objeto Date a formatear.
 * @returns La hora formateada como string.
 */
export const formatTime = (date: Date): string => {
  return format(date, 'HH:mm');
};

/**
 * Verifica si una fecha (convertida a local) es hoy.
 * @param localDate La fecha ya convertida a la zona horaria local.
 * @returns true si la fecha es hoy.
 */
export const isTodayLocal = (localDate: Date): boolean => {
  return isToday(localDate);
};

/**
 * Verifica si una fecha (convertida a local) es en el futuro.
 * @param localDate La fecha ya convertida a la zona horaria local.
 * @returns true si la fecha es en el futuro.
 */
export const isFutureLocal = (localDate: Date): boolean => {
  return isFuture(localDate);
};

/**
 * Verifica si una fecha (convertida a local) es en el pasado.
 * @param localDate La fecha ya convertida a la zona horaria local.
 * @returns true si la fecha es en el pasado.
 */
export const isPastLocal = (localDate: Date): boolean => {
  return isPast(localDate);
};
