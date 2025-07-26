// hooks/use-admission-data.ts - REFACTORIZADO PARA USAR CONTEXTO CENTRAL

import { useCallback, useMemo } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useClinic } from '@/contexts/clinic-data-provider';
import type { Appointment, AppointmentStatus, ExtendedAppointment } from '@/lib/types';
import { AppointmentStatusEnum } from '@/lib/types';
import type { TabType } from '@/components/patient-admision/admision-types';

// ==================== INTERFACES DE DATOS ====================
interface AppointmentUpdatePayload {
  appointmentId: string;
  status: AppointmentStatus;
}

interface AppointmentsByDate {
  today: ExtendedAppointment[];
  future: ExtendedAppointment[];
  past: ExtendedAppointment[];
}

interface AppointmentCounts {
  today: number;
  future: number;
  past: number;
  newPatient: number; // Static
}

// ==================== API FUNCTIONS ====================
const updateAppointmentStatus = async (payload: AppointmentUpdatePayload): Promise<Appointment> => {
  const response = await fetch(`/api/appointments/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Error al actualizar el estado de la cita');
  }
  return response.json();
};

// ==================== HOOK PRINCIPAL ====================
export const useAdmissionData = (activeTab: TabType) => {
  const queryClient = useQueryClient();
  const { allAppointments, appointmentsWithPatientData, isLoading, error, refetch } = useClinic();

  // Agrupamos citas por fechas (hoy, futuras, pasadas)
  const { today: todayAppointments, future: futureAppointments, past: pastAppointments } = useMemo(() => {
    // Separar citas por fecha (hoy, futuras, pasadas) - ya enriquecidas con datos de paciente
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar a inicio de día
    
    // Inicializar categorías
    const todayApps: ExtendedAppointment[] = [];
    const futureApps: ExtendedAppointment[] = [];
    const pastApps: ExtendedAppointment[] = [];
    
    // Clasificar citas por fecha
    allAppointments?.forEach((appointment: Appointment) => {
      const appDate = new Date(appointment.fecha_hora_cita);
      appDate.setHours(0, 0, 0, 0); // Normalizar a inicio de día para comparación justa
      
      if (appDate.getTime() === today.getTime()) {
        todayApps.push(appointment as ExtendedAppointment);
      } else if (appDate.getTime() > today.getTime()) {
        futureApps.push(appointment as ExtendedAppointment);
      } else {
        pastApps.push(appointment as ExtendedAppointment);
      }
    });
    
    return {
      today: todayApps,
      future: futureApps,
      past: pastApps
    };
  }, [allAppointments]);

  // Contadores de citas por categoría
  const counts = useMemo<AppointmentCounts>(() => ({
    today: todayAppointments.length,
    future: futureAppointments.length,
    past: pastAppointments.length,
    newPatient: 0, // Static
  }), [todayAppointments, futureAppointments, pastAppointments]);

  // Filtramos citas según la pestaña activa
  const filteredAppointments = useMemo(() => {
    if (activeTab === 'newPatient') return [];
    if (activeTab === 'today') return todayAppointments;
    if (activeTab === 'future') return futureAppointments;
    return pastAppointments; // 'past' tab
  }, [activeTab, todayAppointments, futureAppointments, pastAppointments]);

  // Mutación para actualizar estado de cita
  const updateStatusMutation = useMutation({
    mutationFn: updateAppointmentStatus,
    onSuccess: () => {
      // Invalidamos la caché central para refrescar los datos
      queryClient.invalidateQueries({ queryKey: ['clinicData'] });
    },
  });

  // Acción para actualizar estado de cita
  const updateAppointment = useCallback((payload: AppointmentUpdatePayload) => {
    updateStatusMutation.mutate(payload);
  }, [updateStatusMutation]);

  return {
    // Datos
    appointments: filteredAppointments,
    counts,
    
    // Estados
    isLoading: isLoading,
    isError: !!error,
    error: error,
    isUpdating: updateStatusMutation.isPending,
    
    // Acciones
    updateAppointment,
  };
};

// ==================== HOOK PARA ACCIONES ====================
export const useAppointmentActions = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateAppointmentStatus,
    onSuccess: () => {
      // Invalidamos la caché central
      queryClient.invalidateQueries({ queryKey: ['clinicData'] });
    },
  });
};