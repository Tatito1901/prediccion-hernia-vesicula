// use-patient-admission-flow.ts - Versión optimizada para rendimiento
import { useState, useEffect, useMemo } from 'react'

import { useAppointments } from '@/hooks/use-appointments'
import type { AppointmentData } from '@/app/dashboard/data-model'

// Tipos simplificados
export type AdmissionTab = 'newPatient' | 'today' | 'future' | 'past'

export interface AppointmentLists {
  today: AppointmentData[]
  future: AppointmentData[]
  past: AppointmentData[]
}

// Cache para clasificación de fechas
const dateClassificationCache = new Map<string, 'today' | 'future' | 'past'>();

/**
 * Hook optimizado para manejar el flujo de admisión de pacientes
 */
export function usePatientAdmissionFlow() {
  const { 
    data: appointmentsData,
    isLoading,
    error,
    refetch: refetchAppointments
  } = useAppointments(1, 1000); // Fetch a large number of appointments

  const appointments = appointmentsData?.appointments || [];
  
  const [activeTab, setActiveTab] = useState<AdmissionTab>("today");

  // Clasificar citas por fecha - optimizado con memoización y cache
  const filteredAppointments = useMemo((): AppointmentLists => {
    const result: AppointmentLists = {
      today: [],
      future: [],
      past: [],
    };

    if (!appointments?.length) {
      return result;
    }

    // Calcular fechas una sola vez
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    // Clasificar citas con cache
    for (const appointment of appointments) {
      try {
        const dateKey = appointment.fechaConsulta.toString();
        
        // Verificar cache primero
        let classification = dateClassificationCache.get(dateKey);
        
        if (!classification) {
          const appointmentDate = new Date(appointment.fechaConsulta);
          appointmentDate.setHours(0, 0, 0, 0);
          const appointmentTime = appointmentDate.getTime();

          if (appointmentTime === todayTime) {
            classification = 'today';
          } else if (appointmentTime > todayTime) {
            classification = 'future';
          } else {
            classification = 'past';
          }
          
          // Guardar en cache
          dateClassificationCache.set(dateKey, classification);
        }

        result[classification].push(appointment);
      } catch (error) {
        console.error(`Error procesando cita ${appointment.id}:`, error);
      }
    }

    // Ordenar por hora usando localeCompare (más eficiente)
    const sortByTime = (a: AppointmentData, b: AppointmentData): number => {
      const timeA = a.horaConsulta || '00:00';
      const timeB = b.horaConsulta || '00:00';
      return timeA.localeCompare(timeB);
    };

    result.today.sort(sortByTime);
    result.future.sort(sortByTime);
    result.past.sort((a, b) => sortByTime(b, a)); // Descendente para el pasado

    // Limpiar cache si es muy grande (para evitar memory leaks)
    if (dateClassificationCache.size > 1000) {
      dateClassificationCache.clear();
    }

    return result;
  }, [appointments]);

  return {
    appointments,
    isLoading,
    error: error as Error | null,
    activeTab,
    setActiveTab,
    filteredAppointments,
    todayAppointments: filteredAppointments.today,
    upcomingAppointments: filteredAppointments.future,
    refetchAppointments,
  };
}