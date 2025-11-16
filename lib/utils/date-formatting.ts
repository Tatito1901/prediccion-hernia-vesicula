import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Tamaño máximo del cache (LRU)
 * Evita memory leaks con uso prolongado
 */
const MAX_CACHE_SIZE = 500;

/**
 * Cache único centralizado para formateo de fechas
 * Usa un Map con control de tamaño (LRU simple)
 */
class DateFormatCache {
  private cache: Map<string, string>;
  private accessOrder: string[];

  constructor(private maxSize: number) {
    this.cache = new Map();
    this.accessOrder = [];
  }

  get(key: string): string | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Mover al final (más recientemente usado)
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.accessOrder.push(key);
    }
    return value;
  }

  set(key: string, value: string): void {
    // Si ya existe, actualizar orden
    if (this.cache.has(key)) {
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.accessOrder.push(key);
      this.cache.set(key, value);
      return;
    }

    // Si llegamos al límite, eliminar el menos recientemente usado
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, value);
    this.accessOrder.push(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  get size(): number {
    return this.cache.size;
  }
}

// Instancia única del cache
const dateCache = new DateFormatCache(MAX_CACHE_SIZE);

/**
 * Formatea una fecha con cache LRU
 * @param date - Fecha a formatear (Date, string o null)
 * @param formatStr - String de formato de date-fns
 * @returns Fecha formateada o null si la fecha es inválida
 */
export const formatCachedDate = (
  date: Date | string | null | undefined,
  formatStr: string
): string | null => {
  if (!date) return null;

  const dateString = typeof date === 'string' ? date : date.toISOString();
  const key = `${dateString}_${formatStr}`;

  // Verificar cache
  const cached = dateCache.get(key);
  if (cached) return cached;

  // Formatear y guardar en cache
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const result = format(dateObj, formatStr, { locale: es });
    dateCache.set(key, result);
    return result;
  } catch {
    return null;
  }
};

/**
 * Formatea una fecha de cita en formato largo
 * Ejemplo: "15 Ene 2025"
 */
export const formatAppointmentDate = (date: Date | string | null | undefined): string | null => {
  return formatCachedDate(date, 'd MMM yyyy');
};

/**
 * Formatea la hora de una cita
 * Ejemplo: "14:30"
 */
export const formatAppointmentTime = (date: Date | string | null | undefined): string | null => {
  return formatCachedDate(date, 'HH:mm');
};

/**
 * Formatea una fecha completa con hora
 * Ejemplo: "15 Ene 2025, 14:30"
 */
export const formatAppointmentDateTime = (date: Date | string | null | undefined): string | null => {
  return formatCachedDate(date, "d MMM yyyy, HH:mm");
};

/**
 * Formatea una fecha en formato ISO (YYYY-MM-DD)
 */
export const formatDateISO = (date: Date | string | null | undefined): string | null => {
  return formatCachedDate(date, 'yyyy-MM-dd');
};

/**
 * Formatea una fecha con día de la semana
 * Ejemplo: "Lun 15 Ene"
 */
export const formatDateWithWeekday = (date: Date | string | null | undefined): string | null => {
  return formatCachedDate(date, 'EEE d MMM');
};

/**
 * Limpia el cache (útil para testing o cuando se quiera liberar memoria)
 */
export const clearDateCache = (): void => {
  dateCache.clear();
};

/**
 * Obtiene el tamaño actual del cache
 */
export const getDateCacheSize = (): number => {
  return dateCache.size;
};
