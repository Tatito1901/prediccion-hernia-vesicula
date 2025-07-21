// lib/cache-invalidation.ts - SISTEMA DE INVALIDACIÓN GRANULAR INTELIGENTE
// Elimina el "Efecto Tsunami" de raíz con invalidación quirúrgica

import { QueryClient } from '@tanstack/react-query';
import { ExtendedAppointment, EnrichedPatient, AppointmentStatusEnum } from '@/lib/types';

// ==================== KEYS DE CACHÉ CENTRALIZADAS ====================
export const CACHE_KEYS = {
  // Citas
  appointments: {
    all: ['appointments'] as const,
    lists: () => [...CACHE_KEYS.appointments.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...CACHE_KEYS.appointments.lists(), filters] as const,
    details: () => [...CACHE_KEYS.appointments.all, 'detail'] as const,
    detail: (id: string) => [...CACHE_KEYS.appointments.details(), id] as const,
    byDate: (date: string) => [...CACHE_KEYS.appointments.all, 'byDate', date] as const,
    byPatient: (patientId: string) => [...CACHE_KEYS.appointments.all, 'byPatient', patientId] as const,
    byStatus: (status: string) => [...CACHE_KEYS.appointments.all, 'byStatus', status] as const,
    today: () => [...CACHE_KEYS.appointments.all, 'today'] as const,
    future: () => [...CACHE_KEYS.appointments.all, 'future'] as const,
    past: () => [...CACHE_KEYS.appointments.all, 'past'] as const,
    summary: () => [...CACHE_KEYS.appointments.all, 'summary'] as const,
    metrics: () => [...CACHE_KEYS.appointments.all, 'metrics'] as const,
  },
  
  // Pacientes
  patients: {
    all: ['patients'] as const,
    lists: () => [...CACHE_KEYS.patients.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...CACHE_KEYS.patients.lists(), filters] as const,
    details: () => [...CACHE_KEYS.patients.all, 'detail'] as const,
    detail: (id: string) => [...CACHE_KEYS.patients.details(), id] as const,
    byStatus: (status: string) => [...CACHE_KEYS.patients.all, 'byStatus', status] as const,
    summary: () => [...CACHE_KEYS.patients.all, 'summary'] as const,
    metrics: () => [...CACHE_KEYS.patients.all, 'metrics'] as const,
    stats: () => [...CACHE_KEYS.patients.all, 'stats'] as const,
  },
  
  // Datos de clínica (legacy - para migración gradual)
  clinic: {
    all: ['clinicData'] as const,
    appointments: () => [...CACHE_KEYS.clinic.all, 'appointments'] as const,
    patients: () => [...CACHE_KEYS.clinic.all, 'patients'] as const,
  }
} as const;

// ==================== ESTRATEGIAS DE INVALIDACIÓN ====================
export interface InvalidationStrategy {
  readonly name: string;
  readonly description: string;
  readonly execute: (queryClient: QueryClient, context: any) => Promise<void>;
}

/**
 * Estrategia quirúrgica para actualizaciones de estado de citas
 * ELIMINA EL EFECTO TSUNAMI
 */
export const APPOINTMENT_STATUS_UPDATE_STRATEGY: InvalidationStrategy = {
  name: 'appointmentStatusUpdate',
  description: 'Invalidación quirúrgica para cambios de estado de citas',
  execute: async (queryClient: QueryClient, context: { 
    appointmentId: string; 
    oldStatus?: string; 
    newStatus: string; 
    patientId?: string;
    appointmentDate?: string;
  }) => {
    const { appointmentId, oldStatus, newStatus, patientId, appointmentDate } = context;
    
    // 1. Actualización optimista INMEDIATA del detalle específico
    queryClient.setQueryData(
      CACHE_KEYS.appointments.detail(appointmentId),
      (old: ExtendedAppointment | undefined) => {
        if (!old) return old;
        return { ...old, estado_cita: newStatus as any };
      }
    );
    
    // 2. Actualización optimista de listas que contienen esta cita
    const updateAppointmentInList = (oldData: ExtendedAppointment[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, estado_cita: newStatus as any }
          : apt
      );
    };
    
    // Actualizar listas específicas
    queryClient.setQueryData(CACHE_KEYS.appointments.today(), updateAppointmentInList);
    queryClient.setQueryData(CACHE_KEYS.appointments.future(), updateAppointmentInList);
    queryClient.setQueryData(CACHE_KEYS.appointments.past(), updateAppointmentInList);
    
    if (patientId) {
      queryClient.setQueryData(CACHE_KEYS.appointments.byPatient(patientId), updateAppointmentInList);
    }
    
    if (appointmentDate) {
      queryClient.setQueryData(CACHE_KEYS.appointments.byDate(appointmentDate), updateAppointmentInList);
    }
    
    // 3. Invalidación MÍNIMA solo de estadísticas y métricas
    await queryClient.invalidateQueries({ 
      queryKey: CACHE_KEYS.appointments.metrics(),
      refetchType: 'active' // Solo refetch si está activo
    });
    
    await queryClient.invalidateQueries({ 
      queryKey: CACHE_KEYS.appointments.summary(),
      refetchType: 'active'
    });
    
    // 4. Invalidación condicional por cambio de estado
    if (oldStatus && oldStatus !== newStatus) {
      await queryClient.invalidateQueries({ 
        queryKey: CACHE_KEYS.appointments.byStatus(oldStatus),
        refetchType: 'active'
      });
      await queryClient.invalidateQueries({ 
        queryKey: CACHE_KEYS.appointments.byStatus(newStatus),
        refetchType: 'active'
      });
    }
    
    // 5. NO invalidar el caché masivo de clinicData
    // ❌ queryClient.invalidateQueries({ queryKey: CACHE_KEYS.clinic.all });
    
    console.log(`✅ Invalidación quirúrgica completada para cita ${appointmentId}: ${oldStatus} → ${newStatus}`);
  }
};

/**
 * Estrategia para creación de nuevas citas
 */
export const APPOINTMENT_CREATE_STRATEGY: InvalidationStrategy = {
  name: 'appointmentCreate',
  description: 'Invalidación optimizada para nuevas citas',
  execute: async (queryClient: QueryClient, context: { 
    appointment: ExtendedAppointment;
  }) => {
    const { appointment } = context;
    
    // 1. Agregar optimísticamente a listas relevantes
    const addToList = (oldData: ExtendedAppointment[] | undefined) => {
      if (!oldData) return [appointment];
      return [appointment, ...oldData];
    };
    
    // Determinar a qué listas agregar
    const appointmentDate = new Date(appointment.fecha_hora_cita);
    const today = new Date();
    const isToday = appointmentDate.toDateString() === today.toDateString();
    const isFuture = appointmentDate > today;
    
    if (isToday) {
      queryClient.setQueryData(CACHE_KEYS.appointments.today(), addToList);
    } else if (isFuture) {
      queryClient.setQueryData(CACHE_KEYS.appointments.future(), addToList);
    }
    
    // 2. Agregar a listas por paciente y fecha
    queryClient.setQueryData(
      CACHE_KEYS.appointments.byPatient(appointment.patient_id),
      addToList
    );
    
    queryClient.setQueryData(
      CACHE_KEYS.appointments.byDate(appointmentDate.toISOString().split('T')[0]),
      addToList
    );
    
    // 3. Invalidar solo métricas y resúmenes
    await queryClient.invalidateQueries({ 
      queryKey: CACHE_KEYS.appointments.metrics(),
      refetchType: 'active'
    });
    
    console.log(`✅ Nueva cita agregada optimísticamente: ${appointment.id}`);
  }
};

/**
 * Estrategia para actualización de datos de pacientes
 */
export const PATIENT_UPDATE_STRATEGY: InvalidationStrategy = {
  name: 'patientUpdate',
  description: 'Invalidación quirúrgica para actualizaciones de pacientes',
  execute: async (queryClient: QueryClient, context: { 
    patientId: string; 
    updatedPatient: EnrichedPatient;
    oldStatus?: string;
    newStatus?: string;
  }) => {
    const { patientId, updatedPatient, oldStatus, newStatus } = context;
    
    // 1. Actualización optimista del detalle específico
    queryClient.setQueryData(
      CACHE_KEYS.patients.detail(patientId),
      updatedPatient
    );
    
    // 2. Actualización en listas de pacientes
    const updatePatientInList = (oldData: EnrichedPatient[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.map(patient => 
        patient.id === patientId ? updatedPatient : patient
      );
    };
    
    queryClient.setQueryData(CACHE_KEYS.patients.lists(), updatePatientInList);
    
    // 3. Invalidación condicional por cambio de estado
    if (oldStatus && newStatus && oldStatus !== newStatus) {
      await queryClient.invalidateQueries({ 
        queryKey: CACHE_KEYS.patients.byStatus(oldStatus),
        refetchType: 'active'
      });
      await queryClient.invalidateQueries({ 
        queryKey: CACHE_KEYS.patients.byStatus(newStatus),
        refetchType: 'active'
      });
    }
    
    // 4. Invalidar solo estadísticas
    await queryClient.invalidateQueries({ 
      queryKey: CACHE_KEYS.patients.metrics(),
      refetchType: 'active'
    });
    
    console.log(`✅ Paciente actualizado optimísticamente: ${patientId}`);
  }
};

// ==================== EJECUTOR DE ESTRATEGIAS ====================
export class CacheInvalidationManager {
  private queryClient: QueryClient;
  private strategies: Map<string, InvalidationStrategy> = new Map();
  
  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.registerDefaultStrategies();
  }
  
  private registerDefaultStrategies() {
    this.strategies.set('appointmentStatusUpdate', APPOINTMENT_STATUS_UPDATE_STRATEGY);
    this.strategies.set('appointmentCreate', APPOINTMENT_CREATE_STRATEGY);
    this.strategies.set('patientUpdate', PATIENT_UPDATE_STRATEGY);
  }
  
  async executeStrategy(strategyName: string, context: any): Promise<void> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      console.warn(`⚠️ Estrategia de invalidación no encontrada: ${strategyName}`);
      return;
    }
    
    try {
      await strategy.execute(this.queryClient, context);
    } catch (error) {
      console.error(`❌ Error ejecutando estrategia ${strategyName}:`, error);
      // Fallback a invalidación tradicional solo en caso de error
      await this.fallbackInvalidation(context);
    }
  }
  
  private async fallbackInvalidation(context: any) {
    console.log('🔄 Ejecutando invalidación de fallback...');
    // Invalidación mínima como fallback
    await this.queryClient.invalidateQueries({ 
      queryKey: CACHE_KEYS.appointments.summary(),
      refetchType: 'active'
    });
  }
  
  registerStrategy(name: string, strategy: InvalidationStrategy) {
    this.strategies.set(name, strategy);
  }
  
  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
}

// ==================== HOOKS PARA USAR EN MUTACIONES ====================

/**
 * Hook para invalidación quirúrgica en mutaciones de citas
 */
export const useSmartAppointmentInvalidation = (queryClient: QueryClient) => {
  const manager = new CacheInvalidationManager(queryClient);
  
  return {
    onStatusUpdate: (context: {
      appointmentId: string;
      oldStatus?: string;
      newStatus: string;
      patientId?: string;
      appointmentDate?: string;
    }) => manager.executeStrategy('appointmentStatusUpdate', context),
    
    onCreate: (context: { appointment: ExtendedAppointment }) => 
      manager.executeStrategy('appointmentCreate', context),
    
    onUpdate: (context: { 
      appointmentId: string; 
      updatedAppointment: ExtendedAppointment 
    }) => manager.executeStrategy('appointmentStatusUpdate', {
      appointmentId: context.appointmentId,
      newStatus: context.updatedAppointment.estado_cita,
      patientId: context.updatedAppointment.patient_id,
      appointmentDate: context.updatedAppointment.fecha_hora_cita.split('T')[0]
    })
  };
};

/**
 * Hook para invalidación quirúrgica en mutaciones de pacientes
 */
export const useSmartPatientInvalidation = (queryClient: QueryClient) => {
  const manager = new CacheInvalidationManager(queryClient);
  
  return {
    onUpdate: (context: {
      patientId: string;
      updatedPatient: EnrichedPatient;
      oldStatus?: string;
      newStatus?: string;
    }) => manager.executeStrategy('patientUpdate', context)
  };
};

// ==================== UTILIDADES DE MIGRACIÓN ====================

/**
 * Migra gradualmente del caché legacy al nuevo sistema
 */
export const migrateLegacyCache = async (queryClient: QueryClient) => {
  console.log('🔄 Iniciando migración de caché legacy...');
  
  // Invalidar caché legacy gradualmente
  await queryClient.invalidateQueries({ 
    queryKey: CACHE_KEYS.clinic.all,
    refetchType: 'none' // No refetch, solo invalidar
  });
  
  console.log('✅ Migración de caché completada');
};

export default {
  CACHE_KEYS,
  CacheInvalidationManager,
  useSmartAppointmentInvalidation,
  useSmartPatientInvalidation,
  migrateLegacyCache
};
