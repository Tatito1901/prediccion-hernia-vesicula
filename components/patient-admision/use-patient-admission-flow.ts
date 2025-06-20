import { useState, useEffect } from 'react'
import { usePatientStore } from '@/lib/stores/patient-store'
import { useAppointmentStore } from '@/lib/stores/appointment-store'
import type { AppointmentData } from '@/app/dashboard/data-model'

// Tipos simplificados
export type AdmissionTab = 'newPatient' | 'today' | 'future' | 'past'

export interface AppointmentLists {
  today: AppointmentData[]
  future: AppointmentData[]
  past: AppointmentData[]
}

/**
 * Hook simplificado para manejar el flujo de admisión de pacientes
 */
export function usePatientAdmissionFlow() {
  const { 
    appointments, 
    isLoading = false, 
    error = null,
    fetchAppointments,
  } = useAppointmentStore();
  
  const [activeTab, setActiveTab] = useState<AdmissionTab>("today");

  // Cargar citas al montar el componente
  useEffect(() => {
    if (!appointments?.length && !isLoading) {
      fetchAppointments();
    }
  }, [appointments?.length, isLoading, fetchAppointments]);

  // Clasificar citas por fecha - lógica simplificada
  const classifyAppointments = (appointmentsList: AppointmentData[]): AppointmentLists => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const result: AppointmentLists = {
      today: [],
      future: [],
      past: [],
    };

    if (!appointmentsList?.length) {
      return result;
    }

    for (const appointment of appointmentsList) {
      try {
        const appointmentDate = new Date(appointment.fechaConsulta);
        appointmentDate.setHours(0, 0, 0, 0);
        const appointmentTime = appointmentDate.getTime();

        if (appointmentTime === todayTime) {
          result.today.push(appointment);
        } else if (appointmentTime > todayTime) {
          result.future.push(appointment);
        } else {
          result.past.push(appointment);
        }
      } catch (error) {
        console.error(`Error procesando cita ${appointment.id}:`, error);
      }
    }

    // Ordenar por hora
    const sortByTime = (a: AppointmentData, b: AppointmentData): number => {
      const timeA = a.horaConsulta || '00:00';
      const timeB = b.horaConsulta || '00:00';
      return timeA.localeCompare(timeB);
    };

    result.today.sort(sortByTime);
    result.future.sort(sortByTime);
    result.past.sort((a, b) => sortByTime(b, a)); // Descendente para el pasado

    return result;
  };

  const filteredAppointments = classifyAppointments(appointments || []);

  return {
    appointments: appointments || [],
    isLoading,
    error: error as string | null,
    activeTab,
    setActiveTab,
    filteredAppointments,
    todayAppointments: filteredAppointments.today,
    upcomingAppointments: filteredAppointments.future,
    refetchAppointments: fetchAppointments,
  };
}