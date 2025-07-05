import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
    case '7dias':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30dias':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90dias':
      startDate.setDate(endDate.getDate() - 90);
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
