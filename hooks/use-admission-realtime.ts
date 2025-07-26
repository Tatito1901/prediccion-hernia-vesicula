// hooks/use-admission-realtime.ts - REAL-TIME UPDATES PARA ADMISIÓN
import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import type { AppointmentUpdateEvent, AppointmentStatus } from '@/components/patient-admision/admision-types';

// ==================== TIPOS PARA REAL-TIME ====================
interface DatabaseUpdate {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
  schema: string;
  table: string;
}

interface RealtimeConfig {
  enableToasts: boolean;
  enableSounds: boolean;
  autoRefresh: boolean;
}

const DEFAULT_CONFIG: RealtimeConfig = {
  enableToasts: true,
  enableSounds: false,
  autoRefresh: true,
};

// ==================== HOOK PRINCIPAL ====================
export const useAdmissionRealtime = (config: Partial<RealtimeConfig> = {}) => {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const channelRef = useRef<any>(null);
  const configRef = useRef({ ...DEFAULT_CONFIG, ...config });
  
  // ==================== NOTIFICACIÓN HELPERS ====================
  const playNotificationSound = useCallback(() => {
    if (configRef.current.enableSounds && 'Audio' in window) {
      try {
        // Simple notification sound (you can replace with custom sound file)
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGYdBSJ+zO/ZfCsFKrTp4qVTEgdYnuP0vWEeAyCCzO7agC8BKrPn7K1WEgpVm+D1wGIcByl+yO/cjTMFKrPp6KdUEwYygdDv2IRNECtTqOPqvGUIJrLm5LZYFQhOqeXws3BdExOLxu/cjTQHSaXh8bllHwhSqOXrumEaDQfz2dWKPQQmE5WV1f7v5sU3FgIaYbfm2YAkBgQP9Lf9bN7YPSQGKS+O1/7HbzJJPQJSsODpq3ARB1GkTCTLLrO24PcCAAf9T8PCOAu5yPLciTUFJaLa5ql3HQllrbHl5J5NEAOY0e/WdCQEMLrf6bJZGQk2jc7s1X4tBSO31+y9aCgGK63p6qVZFgoJP7DF56VAFBz2');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore errors if user hasn't interacted with page
      } catch (error) {
        // Ignore audio errors
      }
    }
  }, []);
  
  const showUpdateNotification = useCallback((update: DatabaseUpdate) => {
    if (!configRef.current.enableToasts) return;
    
    const { eventType, new: newRecord, old: oldRecord, table } = update;
    
    if (table === 'appointments' && eventType === 'UPDATE') {
      const oldStatus = oldRecord?.estado_cita;
      const newStatus = newRecord?.estado_cita;
      
      if (oldStatus !== newStatus) {
        const patientName = newRecord?.patients?.nombre 
          ? `${newRecord.patients.nombre} ${newRecord.patients.apellidos || ''}`.trim()
          : 'Paciente';
        
        toast.info('Cita actualizada', {
          description: `${patientName}: ${oldStatus} → ${newStatus}`,
          duration: 3000,
        });
        
        playNotificationSound();
      }
    } else if (table === 'patients' && eventType === 'INSERT') {
      const patientName = `${newRecord?.nombre || ''} ${newRecord?.apellidos || ''}`.trim();
      toast.success('Nuevo paciente registrado', {
        description: patientName || 'Paciente registrado',
        duration: 3000,
      });
    }
  }, [playNotificationSound]);
  
  // ==================== INVALIDATION LOGIC ====================
  const handleAppointmentUpdate = useCallback((update: DatabaseUpdate) => {
    const { eventType, new: newRecord, old: oldRecord } = update;
    
    if (configRef.current.autoRefresh) {
      // Invalidate specific queries based on the type of update
      queryClient.invalidateQueries({ queryKey: ['admission-counts'] });
      
      if (eventType === 'UPDATE') {
        const oldStatus: AppointmentStatus = oldRecord?.estado_cita;
        const newStatus: AppointmentStatus = newRecord?.estado_cita;
        
        // Determine which tabs are affected
        const affectedTabs: string[] = [];
        
        // If status changed, multiple tabs might be affected
        if (oldStatus !== newStatus) {
          // Always invalidate all tabs for status changes to be safe
          affectedTabs.push('today', 'future', 'past');
        } else {
          // For other updates (notes, etc.), just invalidate the current view
          affectedTabs.push('today'); // Default to today for most updates
        }
        
        affectedTabs.forEach(tab => {
          queryClient.invalidateQueries({ queryKey: ['admission-appointments', tab] });
        });
      } else if (eventType === 'INSERT') {
        // New appointment - invalidate future and today
        queryClient.invalidateQueries({ queryKey: ['admission-appointments', 'today'] });
        queryClient.invalidateQueries({ queryKey: ['admission-appointments', 'future'] });
      } else if (eventType === 'DELETE') {
        // Deleted appointment - invalidate all tabs
        queryClient.invalidateQueries({ queryKey: ['admission-appointments'] });
      }
    }
    
    showUpdateNotification(update);
  }, [queryClient, showUpdateNotification]);
  
  const handlePatientUpdate = useCallback((update: DatabaseUpdate) => {
    if (configRef.current.autoRefresh) {
      // Patient updates might affect appointment displays
      queryClient.invalidateQueries({ queryKey: ['admission-appointments'] });
    }
    
    showUpdateNotification(update);
  }, [queryClient, showUpdateNotification]);
  
  // ==================== SETUP SUBSCRIPTIONS ====================
  const setupRealtimeSubscriptions = useCallback(() => {
    if (channelRef.current) {
      // Clean up existing subscription
      channelRef.current.unsubscribe();
    }
    
    // Create new channel
    channelRef.current = supabase
      .channel('admission_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          console.log('📡 Real-time appointment update:', payload);
          handleAppointmentUpdate(payload as DatabaseUpdate);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'patients'
        },
        (payload) => {
          console.log('📡 Real-time patient insert:', payload);
          handlePatientUpdate(payload as DatabaseUpdate);
        }
      )
      .subscribe((status) => {
        console.log('📡 Real-time subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscriptions active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error');
          toast.error('Error de conexión', {
            description: 'Actualizaciones en tiempo real deshabilitadas',
            duration: 5000,
          });
        }
      });
  }, [supabase, handleAppointmentUpdate, handlePatientUpdate]);
  
  // ==================== LIFECYCLE ====================
  useEffect(() => {
    setupRealtimeSubscriptions();
    
    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        console.log('🔌 Unsubscribing from real-time updates');
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, []); // Empty dependency array - setup once on mount
  
  // ==================== PUBLIC API ====================
  const updateConfig = useCallback((newConfig: Partial<RealtimeConfig>) => {
    configRef.current = { ...configRef.current, ...newConfig };
  }, []);
  
  const manualRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admission-appointments'] });
    queryClient.invalidateQueries({ queryKey: ['admission-counts'] });
    
    toast.success('Datos actualizados', {
      description: 'La información ha sido refrescada',
      duration: 2000,
    });
  }, [queryClient]);
  
  const reconnect = useCallback(() => {
    console.log('🔄 Reconnecting real-time subscriptions...');
    setupRealtimeSubscriptions();
  }, [setupRealtimeSubscriptions]);
  
  return {
    updateConfig,
    manualRefresh,
    reconnect,
    isConnected: channelRef.current?.state === 'joined',
  };
};

// ==================== SPECIALIZED HOOKS ====================

// Hook más simple para componentes que solo necesitan notificaciones
export const useAdmissionNotifications = (enableSounds = false) => {
  return useAdmissionRealtime({
    enableToasts: true,
    enableSounds,
    autoRefresh: false, // Don't auto-refresh, just show notifications
  });
};

// Hook para componentes que necesitan datos siempre actualizados
export const useAdmissionAutoRefresh = () => {
  return useAdmissionRealtime({
    enableToasts: false, // No notifications, just data updates
    enableSounds: false,
    autoRefresh: true,
  });
};