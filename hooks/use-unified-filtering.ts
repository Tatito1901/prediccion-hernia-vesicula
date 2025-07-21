// hooks/use-unified-filtering.ts - SOLUCIÓN A LA ARQUITECTURA INCONSISTENTE
import { useMemo } from 'react';
import { parseISO, isValid, isSameDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ExtendedAppointment, EnrichedPatient } from '@/lib/types';

// ==================== TIPOS UNIFICADOS ====================
export interface UnifiedAppointment {
  readonly id: string;
  readonly patientId: string;
  readonly fechaConsulta: Date;
  readonly horaConsulta: string;
  readonly estado: string;
  readonly motivoConsulta: string;
  readonly notas?: string;
  readonly paciente: {
    readonly nombre: string;
    readonly apellidos: string;
    readonly telefono: string;
  };
  readonly doctor: string;
  readonly esNuevoPaciente: boolean;
}

export interface AppointmentsByDate {
  today: UnifiedAppointment[];
  future: UnifiedAppointment[];
  past: UnifiedAppointment[];
}

export interface AppointmentCounts {
  readonly today: number;
  readonly future: number;
  readonly past: number;
}

export type DateClassification = 'today' | 'future' | 'past';

// ==================== CACHE LRU OPTIMIZADO ====================
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!key) return undefined;
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Mover al final (más reciente)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (!key) return;
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

// ==================== CACHES GLOBALES ====================
const dateFormatCache = new LRUCache<string, string>(200);
const dateClassificationCache = new LRUCache<string, DateClassification>(300);
const appointmentAdapterCache = new LRUCache<string, UnifiedAppointment>(1000);

// ==================== UTILIDADES UNIFICADAS ====================

/**
 * Formatea una fecha para mostrar de manera consistente
 */
export const formatDisplayDate = (dateString: string | Date): string => {
  const key = typeof dateString === 'string' ? dateString : dateString.toISOString();
  
  const cached = dateFormatCache.get(key);
  if (cached) return cached;

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (!isValid(date)) return 'Fecha inválida';
    
    const formatted = format(date, "dd 'de' MMMM, yyyy", { locale: es });
    dateFormatCache.set(key, formatted);
    return formatted;
  } catch {
    return 'Fecha inválida';
  }
};

/**
 * Clasifica una cita por fecha (hoy, futuro, pasado)
 */
export const classifyAppointmentByDate = (dateString: string): DateClassification => {
  const cached = dateClassificationCache.get(dateString);
  if (cached) return cached;

  try {
    const appointmentDate = parseISO(dateString);
    if (!isValid(appointmentDate)) return 'past';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const appointmentDateOnly = new Date(appointmentDate);
    appointmentDateOnly.setHours(0, 0, 0, 0);
    
    let classification: DateClassification;
    if (appointmentDateOnly.getTime() === today.getTime()) {
      classification = 'today';
    } else if (appointmentDateOnly > today) {
      classification = 'future';
    } else {
      classification = 'past';
    }
    
    dateClassificationCache.set(dateString, classification);
    return classification;
  } catch {
    return 'past';
  }
};

/**
 * Adapta datos de cita a formato unificado
 */
export const adaptAppointmentData = (appointment: ExtendedAppointment): UnifiedAppointment => {
  const cached = appointmentAdapterCache.get(appointment.id);
  if (cached) return cached;

  try {
    const fechaConsulta = parseISO(appointment.fecha_hora_cita);
    if (!isValid(fechaConsulta)) {
      throw new Error(`Fecha inválida: ${appointment.fecha_hora_cita}`);
    }

    const adapted: UnifiedAppointment = {
      id: appointment.id,
      patientId: appointment.patient_id,
      fechaConsulta,
      horaConsulta: format(fechaConsulta, 'HH:mm'),
      estado: appointment.estado_cita,
      motivoConsulta: appointment.motivo_cita || 'Consulta general',
      notas: appointment.notas_cita_seguimiento || undefined,
      paciente: {
        nombre: appointment.patients?.nombre || 'Sin nombre',
        apellidos: appointment.patients?.apellidos || 'Sin apellidos',
        telefono: appointment.patients?.telefono || 'Sin teléfono',
      },
      doctor: appointment.doctor?.full_name || 'Dr. Sin asignar',
      esNuevoPaciente: appointment.es_primera_vez || false,
    };

    appointmentAdapterCache.set(appointment.id, adapted);
    return adapted;
  } catch (error) {
    console.error(`Error adaptando cita ${appointment.id}:`, error);
    // Retornar datos por defecto en caso de error
    return {
      id: appointment.id,
      patientId: appointment.patient_id,
      fechaConsulta: new Date(),
      horaConsulta: '00:00',
      estado: appointment.estado_cita,
      motivoConsulta: 'Error en datos',
      paciente: {
        nombre: 'Error',
        apellidos: 'Error',
        telefono: 'Error',
      },
      doctor: 'Error',
      esNuevoPaciente: false,
    };
  }
};

// ==================== HOOKS UNIFICADOS ====================

/**
 * 🎯 Hook unificado para filtrar y clasificar citas por fecha
 * Reemplaza la lógica duplicada en patient-admission.tsx y patient-management.tsx
 */
export const useFilteredAppointments = (rawAppointments: ExtendedAppointment[]): AppointmentsByDate => {
  return useMemo(() => {
    const result: AppointmentsByDate = { 
      today: [], 
      future: [], 
      past: [] 
    };

    if (!rawAppointments?.length) return result;

    // Procesar y clasificar citas
    for (const appointment of rawAppointments) {
      try {
        const adaptedAppointment = adaptAppointmentData(appointment);
        const classification = classifyAppointmentByDate(appointment.fecha_hora_cita);
        result[classification].push(adaptedAppointment);
      } catch (error) {
        console.error(`Error procesando cita ${appointment.id}:`, error);
      }
    }

    // Ordenar por hora
    const sortByTime = (a: UnifiedAppointment, b: UnifiedAppointment): number => {
      return a.horaConsulta.localeCompare(b.horaConsulta);
    };

    result.today.sort(sortByTime);
    result.future.sort(sortByTime);
    result.past.sort((a, b) => sortByTime(b, a)); // Más recientes primero

    return result;
  }, [rawAppointments]);
};

/**
 * 🎯 Hook unificado para contar citas por categoría
 */
export const useAppointmentCounts = (appointmentsByDate: AppointmentsByDate): AppointmentCounts => {
  return useMemo(() => ({
    today: appointmentsByDate.today.length,
    future: appointmentsByDate.future.length,
    past: appointmentsByDate.past.length,
  }), [appointmentsByDate]);
};

/**
 * 🎯 Hook unificado para filtrar pacientes por búsqueda y estado
 * Reemplaza la lógica de filtrado en patient-management.tsx
 */
export const useFilteredPatients = (
  patients: EnrichedPatient[],
  searchTerm: string,
  statusFilter: string
): EnrichedPatient[] => {
  return useMemo(() => {
    if (!patients?.length) return [];

    let filtered = [...patients];

    // Filtro por búsqueda
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(patient => {
        const fullName = `${patient.nombre} ${patient.apellidos}`.toLowerCase();
        const phone = patient.telefono?.toLowerCase() || '';
        const email = patient.email?.toLowerCase() || '';
        
        return fullName.includes(searchLower) || 
               phone.includes(searchLower) || 
               email.includes(searchLower);
      });
    }

    // Filtro por estado
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(patient => patient.estado_paciente === statusFilter.toUpperCase());
    }

    return filtered;
  }, [patients, searchTerm, statusFilter]);
};

/**
 * 🎯 Hook unificado para estadísticas de pacientes
 * Proporciona estadísticas calculadas de manera consistente
 */
export const usePatientStats = (patients: EnrichedPatient[]) => {
  return useMemo(() => {
    if (!patients?.length) {
      return {
        totalPatients: 0,
        surveyRate: 0,
        pendingConsults: 0,
        operatedPatients: 0,
        statusStats: { all: 0 }
      };
    }

    const totalPatients = patients.length;
    const operatedPatients = patients.filter(p => p.estado_paciente === 'OPERADO').length;
    const pendingConsults = patients.filter(p => p.estado_paciente === 'PENDIENTE DE CONSULTA').length;
    const surveyRate = Math.round((patients.filter(p => p.probabilidad_cirugia !== null).length / totalPatients) * 100);

    // Estadísticas por estado
    const statusStats = patients.reduce((acc, patient) => {
      const status = patient.estado_paciente || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, { all: totalPatients } as Record<string, number>);

    return {
      totalPatients,
      surveyRate,
      pendingConsults,
      operatedPatients,
      statusStats
    };
  }, [patients]);
};

// ==================== UTILIDADES DE LIMPIEZA ====================

/**
 * Limpia todas las caches para liberar memoria
 */
export const clearAllCaches = (): void => {
  dateFormatCache.clear();
  dateClassificationCache.clear();
  appointmentAdapterCache.clear();
};

/**
 * Obtiene estadísticas de las caches para debugging
 */
export const getCacheStats = () => ({
  dateFormat: dateFormatCache['cache'].size,
  dateClassification: dateClassificationCache['cache'].size,
  appointmentAdapter: appointmentAdapterCache['cache'].size,
});

// ==================== COMPARACIÓN DE ARQUITECTURA ====================
/*
🚨 ANTES (Arquitectura Inconsistente):

patient-admission.tsx:
- Hook personalizado useFilteredAppointments (líneas 245-272)
- Lógica de adaptación de datos
- Cache LRU personalizado
- Clasificación por fecha

patient-management.tsx:
- useMemo directamente en componente (líneas 238-259)
- Lógica de estadísticas dispersa
- Sin clasificación por fecha
- Manejo diferente de filtros

PROBLEMAS:
❌ Duplicación de lógica de filtrado
❌ Enfoques arquitectónicos diferentes
❌ Código difícil de mantener
❌ Inconsistencia en UX

✅ DESPUÉS (Arquitectura Unificada):

hooks/use-unified-filtering.ts:
- useFilteredAppointments: Filtrado unificado de citas
- useAppointmentCounts: Conteo consistente
- useFilteredPatients: Filtrado unificado de pacientes
- usePatientStats: Estadísticas consistentes
- Caches LRU optimizados
- Utilidades compartidas

BENEFICIOS:
✅ Lógica centralizada y reutilizable
✅ Arquitectura consistente
✅ Fácil mantenimiento
✅ UX uniforme
✅ Performance optimizada con cache
✅ Código DRY (Don't Repeat Yourself)
*/
