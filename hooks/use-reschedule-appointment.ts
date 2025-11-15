// hooks/use-reschedule-appointment.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { queryKeys } from '@/lib/query-keys';
import { notifyError, notifySuccess } from '@/lib/client-errors';
import type { AppointmentWithPatient } from '@/lib/types';
import { AppointmentStatusEnum } from '@/lib/types';

export interface RescheduleParams {
  appointmentId: string;
  newFechaHora: string; // ISO string
  expectedUpdatedAt?: string;
  doctorId?: string | null;
  notasBreves?: string;
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();

  return useMutation<{ appointment_id: string }, Error, RescheduleParams>({
    mutationFn: async ({ appointmentId, newFechaHora, expectedUpdatedAt, doctorId, notasBreves }) => {
      const supabase = createClient();
      // Type assertion needed as Supabase client types don't include custom RPC functions
      const rpcClient = supabase as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> };
      const { data, error } = await rpcClient.rpc('reschedule_appointment', {
        p_appointment_id: appointmentId,
        p_new_fecha_hora_cita: newFechaHora,
        ...(expectedUpdatedAt ? { p_expected_updated_at: expectedUpdatedAt } : {}),
        ...(doctorId !== undefined ? { p_doctor_id: doctorId } : {}),
        ...(notasBreves !== undefined ? { p_notas_breves: notasBreves } : {}),
      });

      if (error) {
        throw new Error(error.message || 'Error al reagendar la cita');
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.success || !row?.appointment_id) {
        throw new Error(row?.message || 'No se pudo reagendar la cita');
      }
      return { appointment_id: row.appointment_id as string };
    },
    onMutate: async ({ appointmentId, newFechaHora }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.appointments.all, exact: false });

      const previousDetail = queryClient.getQueryData<AppointmentWithPatient>(
        queryKeys.appointments.detail(appointmentId)
      );
      const previousLists = queryClient.getQueriesData<{ data?: AppointmentWithPatient[] }>({ queryKey: queryKeys.appointments.all });

      const applyReschedule = (appt: AppointmentWithPatient): AppointmentWithPatient => ({
        ...appt,
        fecha_hora_cita: newFechaHora,
        estado_cita: AppointmentStatusEnum.PROGRAMADA,
        updated_at: new Date().toISOString(),
      });

      if (previousDetail) {
        queryClient.setQueryData(
          queryKeys.appointments.detail(appointmentId),
          applyReschedule(previousDetail)
        );
      }

      previousLists.forEach(([key, data]) => {
        if (!data?.data?.length) return;
        const idx = data.data.findIndex((a) => a.id === appointmentId);
        if (idx === -1) return;
        const updated = {
          ...data,
          data: data.data.map((a) => (a.id === appointmentId ? applyReschedule(a) : a)),
        };
        queryClient.setQueryData(key, updated);
      });

      return { appointmentId, previousDetail, previousLists };
    },
    onSuccess: () => {
      // Invalidaciones para sincronizar vistas derivadas
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all, exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.today(), exact: false });
      notifySuccess('Cita reagendada con éxito.');
    },
    onError: (error, _vars, context: { appointmentId: string; previousDetail: unknown } | undefined) => {
      // Rollback de caches
      if (context?.previousDetail) {
        queryClient.setQueryData(
          queryKeys.appointments.detail(context.appointmentId),
          context.previousDetail
        );
      }
      if (Array.isArray((context as { previousLists?: unknown[] })?.previousLists)) {
        for (const [key, data] of (context as { previousLists: [unknown, unknown][] }).previousLists) {
          queryClient.setQueryData(key, data);
        }
      }
      notifyError(error, { prefix: 'Reagendar' });
    },
  });
}
