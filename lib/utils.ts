import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {
  formatClinicLongDate,
  formatClinicTime,
  formatClinicDateTime,
  formatClinicMediumDateTime,
  formatClinicDate,
  formatClinicShortDate,
} from '@/lib/timezone'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ✅ CONSOLIDACIÓN MASIVA: Funciones de formato unificadas
// Elimina redundancias críticas dispersas en 6+ archivos

// ==================== FORMATEO DE TELÉFONO ====================
export const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  }
  return value;
};

export const validatePhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
};

// ==================== FORMATEO DE FECHAS/TIEMPO ====================
// Helpers locales mínimos para validar y normalizar entradas
const toDate = (input: Date | string): Date => (input instanceof Date ? input : new Date(input));
const isValidDate = (d: Date): boolean => !isNaN(d.getTime());

export const formatAppointmentDate = (date: Date | string): string => {
  try {
    const d = toDate(date);
    if (!isValidDate(d)) return 'Fecha no válida';
    return formatClinicLongDate(d);
  } catch {
    return 'Fecha no válida';
  }
};

export const formatAppointmentTime = (date: Date | string | null): string => {
  try {
    if (!date) return '--:--';
    const d = toDate(date);
    if (!isValidDate(d)) return '--:--';
    return formatClinicTime(d);
  } catch {
    return '--:--';
  }
};

export const formatAppointmentDateTime = (date: Date | string): string => {
  try {
    const d = toDate(date);
    if (!isValidDate(d)) return 'Fecha y hora no válida';
    return formatClinicDateTime(d);
  } catch {
    return 'Fecha y hora no válida';
  }
};

export const formatReadableDateTime = (date: Date | string): string => {
  try {
    const d = toDate(date);
    if (!isValidDate(d)) return 'Fecha no válida';
    // Estilo legible: Intl dateStyle: 'medium', timeStyle: 'short'
    return formatClinicMediumDateTime(d);
  } catch {
    return 'Fecha no válida';
  }
};

export const formatDisplayDate = (date: Date | null): string => {
  if (!date) return 'Seleccionar fecha';
  const d = toDate(date);
  if (!isValidDate(d)) return 'Seleccionar fecha';
  // Formato "EEEE, d de MMMM" capitalizado
  return formatClinicDate(d);
};

// ==================== FORMATEO GENERAL ====================
export const formatText = (text: string | undefined | null): string => 
  text?.trim() || 'N/A';

export const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return 'N/A';
  try {
    const d = toDate(date);
    if (!isValidDate(d)) return 'N/A';
    return formatClinicShortDate(d);
  } catch {
    return 'N/A';
  }
};

// Helper para validar fechas ISO
export function isValidISODate(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

// Helper para fetch con manejo de errores mejorado, timeout y caché
export async function fetchData<T>(url: string, errorMessage: string, timeout = 30000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { 
      signal: controller.signal,
      next: { revalidate: 60 },
      headers: { 'Cache-Control': 'max-age=60' } 
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(`${errorMessage}: ${errorBody.message || res.statusText} (${res.status})`);
    }
    
    const data = await res.json();
    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`${errorMessage}: Tiempo de espera agotado`);
      }
      throw error;
    }
    throw new Error(`${errorMessage}: Error desconocido`);
  }
}

// Helper para construir parámetros de consulta con validación
export function buildQueryParams(params: Record<string, string | number | boolean | undefined>): string {
  const validParams = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => {
      const sanitizedKey = encodeURIComponent(key);
      const sanitizedValue = encodeURIComponent(String(value!));
      return `${sanitizedKey}=${sanitizedValue}`;
    });
  
  return validParams.length > 0 ? `?${validParams.join('&')}` : '';
}

// Helper para calcular rangos de fechas
export function calculateDateRange(dateRange: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  let startDate = new Date();

  switch (dateRange) {
    case '7d':
    case '7dias': // Compatibilidad hacia atrás
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
    case '30dias': // Compatibilidad hacia atrás
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
    case '90dias': // Compatibilidad hacia atrás
      startDate.setDate(endDate.getDate() - 90);
      break;
    case 'this-month':
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      break;
    case 'ytd':
      startDate = new Date(endDate.getFullYear(), 0, 1);
      break;
    case 'todos':
      // Devuelve un rango muy amplio para 'todos'
      startDate = new Date(2000, 0, 1);
      break;
    default:
      // Por defecto, 30 días
      startDate.setDate(endDate.getDate() - 30);
      break;
  }
  
  return { startDate, endDate };
}
