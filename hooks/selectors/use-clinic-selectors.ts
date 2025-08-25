// hooks/selectors/use-clinic-selectors.ts
// Read-only selectors derived from ClinicDataProvider. These do NOT trigger fetches.

import { useMemo } from 'react';
import { useClinic } from '@/contexts/clinic-data-provider';
import type { Appointment, Patient, AppointmentStatus } from '@/lib/types';

// Returns today's appointments from context and some derived groupings
export function useTodayAppointmentsSelector() {
  const { appointments: appts, loading, error } = useClinic();

  const today: Appointment[] = appts?.today ?? [];

  const byStatus = useMemo(() => {
    const groups: Partial<Record<AppointmentStatus, Appointment[]>> = {};
    for (const a of today) {
      const key = a.estado_cita;
      (groups[key] ??= []).push(a);
    }
    return groups;
  }, [today]);

  return {
    todayAppointments: today,
    byStatus,
    loading,
    error,
  };
}

// Locates a patient in the context cache by id (no fetch)
export function usePatientByIdSelector(id: string | null | undefined): Patient | undefined {
  const { patients } = useClinic();
  const all: Patient[] = patients?.paginated?.length ? patients.paginated : (patients?.active || []);
  return useMemo(() => {
    if (!id) return undefined;
    return all.find(p => p.id === id);
  }, [all, id]);
}

// Filters appointments currently available in context (typically today's) by status
export function useAppointmentsByStatusSelector(status: AppointmentStatus | 'ALL') {
  const { appointments } = useClinic();
  const source: Appointment[] = appointments?.today ?? [];

  const list = useMemo(() => {
    if (!status || status === 'ALL') return source;
    return source.filter(a => a.estado_cita === status);
  }, [source, status]);

  return list;
}

