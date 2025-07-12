// use-patient-admission-flow.ts - Versión refactorizada y optimizada
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAppointments } from '@/hooks/use-appointments'
import { AppointmentData } from '@/lib/types'

// ==================== UTILIDADES INTEGRADAS ====================

// Cache optimizado con LRU para clasificación de fechas
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Cache global para clasificación de fechas
const dateClassificationCache = new LRUCache<string, 'today' | 'future' | 'past'>(300);

// Función de clasificación optimizada
const classifyAppointmentByDate = (dateString: string): 'today' | 'future' | 'past' => {
  const cached = dateClassificationCache.get(dateString);
  if (cached) return cached;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const appointmentDate = new Date(dateString);
    appointmentDate.setHours(0, 0, 0, 0);
    const appointmentTime = appointmentDate.getTime();

    let classification: 'today' | 'future' | 'past';
    if (appointmentTime === todayTime) {
      classification = 'today';
    } else if (appointmentTime > todayTime) {
      classification = 'future';
    } else {
      classification = 'past';
    }

    dateClassificationCache.set(dateString, classification);
    return classification;
  } catch (error) {
    console.warn('Error al clasificar fecha:', dateString, error);
    return 'past';
  }
};

// Función de limpieza de cache periódica
const cleanupCache = (): void => {
  if (dateClassificationCache.size() > 200) {
    dateClassificationCache.clear();
  }
};

// ==================== TIPOS OPTIMIZADOS ====================

export type AdmissionTab = 'newPatient' | 'today' | 'future' | 'past'

export interface AppointmentLists {
  today: AppointmentData[]
  future: AppointmentData[]
  past: AppointmentData[]
}

export interface AppointmentCounts {
  today: number
  future: number
  past: number
  total: number
}

export interface AppointmentStats {
  totalAppointments: number
  completedToday: number
  pendingToday: number
  upcomingCount: number
  completionRate: number
}

// ==================== HOOK PRINCIPAL OPTIMIZADO ====================

/**
 * Hook optimizado para manejar el flujo de admisión de pacientes
 * Incluye clasificación automática, estadísticas y gestión de estado
 */
export function usePatientAdmissionFlow() {
  // React Query hook para obtener citas
  const { 
    data: appointmentsData,
    isLoading,
    error,
    refetch: refetchAppointments
  } = useAppointments(1, 1000);

  // Estado local optimizado
  const [activeTab, setActiveTab] = useState<AdmissionTab>("today");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Obtener citas de forma segura
  const appointments = useMemo(() => 
    appointmentsData?.appointments || [], 
    [appointmentsData]
  );

  // Efecto para limpiar cache periódicamente
  useEffect(() => {
    const cleanup = setInterval(cleanupCache, 60000); // Cada minuto
    return () => clearInterval(cleanup);
  }, []);

  // Efecto para actualizar timestamp cuando cambian las citas
  useEffect(() => {
    if (appointments.length > 0) {
      setLastUpdated(new Date());
    }
  }, [appointments.length]);

  // Clasificar citas por fecha de forma optimizada
  const filteredAppointments = useMemo((): AppointmentLists => {
    const result: AppointmentLists = {
      today: [],
      future: [],
      past: [],
    };

    if (!appointments?.length) {
      return result;
    }

    // Procesar en lotes para mejor rendimiento con muchas citas
    const batchSize = 100;
    for (let i = 0; i < appointments.length; i += batchSize) {
      const batch = appointments.slice(i, i + batchSize);
      
      for (const appointment of batch) {
        try {
          const classification = classifyAppointmentByDate(appointment.fechaConsulta);
          result[classification].push(appointment);
        } catch (error) {
          console.error(`Error procesando cita ${appointment.id}:`, error);
          // En caso de error, categorizar como pasada por seguridad
          result.past.push(appointment);
        }
      }
    }

    // Ordenar por hora usando localeCompare (más eficiente que Date parsing)
    const sortByTime = (a: AppointmentData, b: AppointmentData): number => {
      const timeA = a.horaConsulta || '00:00';
      const timeB = b.horaConsulta || '00:00';
      return timeA.localeCompare(timeB);
    };

    // Aplicar ordenamiento
    result.today.sort(sortByTime);
    result.future.sort(sortByTime);
    result.past.sort((a, b) => sortByTime(b, a)); // Descendente para el pasado

    return result;
  }, [appointments]);

  // Calcular conteos de forma optimizada
  const appointmentCounts = useMemo((): AppointmentCounts => ({
    today: filteredAppointments.today.length,
    future: filteredAppointments.future.length,
    past: filteredAppointments.past.length,
    total: appointments.length
  }), [filteredAppointments, appointments.length]);

  // Calcular estadísticas avanzadas
  const appointmentStats = useMemo((): AppointmentStats => {
    const todayAppointments = filteredAppointments.today;
    const completed = todayAppointments.filter(app => 
      app.estado === 'COMPLETADA' || app.estado === 'COMPLETED'
    ).length;
    const pending = todayAppointments.length - completed;
    const completionRate = todayAppointments.length > 0 
      ? (completed / todayAppointments.length) * 100 
      : 0;

    return {
      totalAppointments: appointments.length,
      completedToday: completed,
      pendingToday: pending,
      upcomingCount: filteredAppointments.future.length,
      completionRate: Math.round(completionRate)
    };
  }, [filteredAppointments, appointments.length]);

  // Obtener citas para el tab activo
  const currentTabAppointments = useMemo(() => {
    if (activeTab === 'newPatient') return [];
    return filteredAppointments[activeTab] || [];
  }, [activeTab, filteredAppointments]);

  // Handlers optimizados
  const setActiveTabOptimized = useCallback((tab: AdmissionTab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [activeTab]);

  // Función para refrescar datos
  const refreshData = useCallback(async () => {
    try {
      await refetchAppointments();
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error al refrescar datos:', error);
    }
  }, [refetchAppointments]);

  // Función para obtener citas por estado
  const getAppointmentsByStatus = useCallback((status: string) => {
    return appointments.filter(app => app.estado === status);
  }, [appointments]);

  // Función para obtener citas de un paciente específico
  const getPatientAppointments = useCallback((patientId: string) => {
    return appointments.filter(app => app.patientId === patientId);
  }, [appointments]);

  // Función para buscar citas por término
  const searchAppointments = useCallback((searchTerm: string) => {
    const term = searchTerm.toLowerCase();
    return appointments.filter(app => 
      app.paciente?.nombre?.toLowerCase().includes(term) ||
      app.paciente?.apellidos?.toLowerCase().includes(term) ||
      app.motivoConsulta?.toLowerCase().includes(term)
    );
  }, [appointments]);

  // Verificar si hay citas para hoy
  const hasTodayAppointments = appointmentCounts.today > 0;
  
  // Verificar si hay citas pendientes
  const hasPendingAppointments = appointmentStats.pendingToday > 0;

  return {
    // Datos principales
    appointments,
    filteredAppointments,
    currentTabAppointments,
    
    // Estados de carga
    isLoading,
    error: error as Error | null,
    lastUpdated,
    
    // Tab management
    activeTab,
    setActiveTab: setActiveTabOptimized,
    
    // Estadísticas
    appointmentCounts,
    appointmentStats,
    
    // Flags de conveniencia
    hasTodayAppointments,
    hasPendingAppointments,
    
    // Funciones de utilidad
    refreshData,
    getAppointmentsByStatus,
    getPatientAppointments,
    searchAppointments,
    
    // Backwards compatibility
    todayAppointments: filteredAppointments.today,
    upcomingAppointments: filteredAppointments.future,
    refetchAppointments,
  };
}

// ==================== EXPORTS ADICIONALES ====================

/**
 * Hook simplificado para solo obtener conteos
 */
export function useAppointmentCounts() {
  const { appointmentCounts, isLoading } = usePatientAdmissionFlow();
  return { counts: appointmentCounts, isLoading };
}

/**
 * Hook para obtener solo estadísticas
 */
export function useAppointmentStats() {
  const { appointmentStats, isLoading } = usePatientAdmissionFlow();
  return { stats: appointmentStats, isLoading };
}

/**
 * Hook para gestión de tabs
 */
export function useTabManager(initialTab: AdmissionTab = 'today') {
  const [activeTab, setActiveTab] = useState<AdmissionTab>(initialTab);
  
  const nextTab = useCallback(() => {
    const tabs: AdmissionTab[] = ['newPatient', 'today', 'future', 'past'];
    const currentIndex = tabs.indexOf(activeTab);
    const nextIndex = (currentIndex + 1) % tabs.length;
    setActiveTab(tabs[nextIndex]);
  }, [activeTab]);
  
  const previousTab = useCallback(() => {
    const tabs: AdmissionTab[] = ['newPatient', 'today', 'future', 'past'];
    const currentIndex = tabs.indexOf(activeTab);
    const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
    setActiveTab(tabs[prevIndex]);
  }, [activeTab]);
  
  return {
    activeTab,
    setActiveTab,
    nextTab,
    previousTab
  };
}

// ==================== UTILIDADES DE EXPORTACIÓN ====================

/**
 * Limpiar todos los caches del hook
 */
export const clearAdmissionFlowCaches = (): void => {
  dateClassificationCache.clear();
};

/**
 * Obtener información sobre el cache
 */
export const getCacheInfo = () => ({
  dateClassificationSize: dateClassificationCache.size(),
});

/**
 * Validar si un tab es válido
 */
export const isValidAdmissionTab = (tab: string): tab is AdmissionTab => {
  return ['newPatient', 'today', 'future', 'past'].includes(tab);
};