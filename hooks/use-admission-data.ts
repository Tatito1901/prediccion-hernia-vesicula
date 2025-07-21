// hooks/use-admission-data.ts - Hook robusto específico para admisión

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { 
  ApiAppointment, 
  NormalizedAppointment, 
  AppointmentsByDate, 
  AppointmentCounts 
} from '@/types/appointments';
import { AppointmentStatusEnum } from '@/lib/types';
import { CACHE_KEYS } from '@/lib/cache-invalidation';
import { 
  validateAndFilterApiAppointments,
  transformApiAppointments,
  groupAppointmentsByDate,
  calculateAppointmentCounts
} from '@/utils/appointment-transformer';

// Función para obtener todas las citas
const fetchAllAppointments = async (): Promise<ApiAppointment[]> => {
  const response = await fetch('/api/appointments?pageSize=100');
  if (!response.ok) {
    throw new Error('Failed to fetch appointments');
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

// Hook principal para datos de admisión
export function useAdmissionData() {
  // Obtener todas las citas
  const {
    data: rawAppointments = [],
    isLoading,
    error,
    refetch
  } = useQuery({
        queryKey: CACHE_KEYS.appointments.list(), // 🎯 CLAVE CENTRALIZADA
    queryFn: fetchAllAppointments,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
  });

  // Procesar y agrupar citas usando transformadores robustos
  const { appointmentsByDate, appointmentCounts } = useMemo(() => {
    if (!rawAppointments.length) {
      const emptyData: AppointmentsByDate = { today: [], future: [], past: [] };
      const emptyCounts: AppointmentCounts = { today: 0, future: 0, past: 0, total: 0 };
      return { appointmentsByDate: emptyData, appointmentCounts: emptyCounts };
    }

    // Validar y filtrar datos de la API
    const validAppointments = validateAndFilterApiAppointments(rawAppointments);
    
    // Transformar a formato normalizado
    const normalizedAppointments = transformApiAppointments(validAppointments);
    
    // Agrupar por fecha
    const groupedAppointments = groupAppointmentsByDate(normalizedAppointments);
    
    // Calcular contadores
    const counts = calculateAppointmentCounts(groupedAppointments);
    
    return { 
      appointmentsByDate: groupedAppointments, 
      appointmentCounts: counts 
    };
  }, [rawAppointments]);

  return {
    appointmentsByDate,
    appointmentCounts,
    isLoading,
    error,
    refetch
  };
}
