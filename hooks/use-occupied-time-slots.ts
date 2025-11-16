import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { queryKeys } from '@/lib/query-keys';
import { queryFetcher } from '@/lib/http';
import { endpoints, buildSearchParams } from '@/lib/api-endpoints';
import { AppointmentStatusEnum, type AppointmentWithPatient } from '@/lib/types';

/**
 * Hook compartido para obtener los horarios ocupados de un día específico
 * Reemplaza las 3 implementaciones duplicadas en:
 * - patient-modal.tsx
 * - schedule-appointment-dialog.tsx
 * - patient-admission-reschedule.tsx
 */
export function useOccupiedTimeSlots(date: Date | undefined) {
  const dateStr = date ? format(date, 'yyyy-MM-dd') : null;

  return useQuery({
    queryKey: queryKeys.appointments.occupied(dateStr),
    queryFn: async () => {
      if (!dateStr) return new Set<string>();

      const params = buildSearchParams({
        dateFilter: 'range',
        startDate: dateStr,
        endDate: dateStr,
        pageSize: 200,
        includePatient: false,
      });

      const response = await queryFetcher<{ data: AppointmentWithPatient[] }>(
        endpoints.appointments.list(params)
      );

      const BLOCKING_STATUSES = [
        AppointmentStatusEnum.PROGRAMADA,
        AppointmentStatusEnum.CONFIRMADA,
        AppointmentStatusEnum.PRESENTE,
      ] as const;

      const occupied = new Set<string>();
      response.data?.forEach((apt) => {
        if ((BLOCKING_STATUSES as readonly string[]).includes(apt.estado_cita)) {
          const appointmentDate = new Date(apt.fecha_hora_cita);
          occupied.add(format(appointmentDate, 'HH:mm'));
        }
      });

      return occupied;
    },
    enabled: !!dateStr,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}
