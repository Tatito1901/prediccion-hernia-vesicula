// hooks/selectors/use-clinic-selectors.ts
// Read-only selectors derived from ClinicDataProvider. These do NOT trigger fetches.

import { useMemo } from 'react';
import { useClinic } from '@/contexts/clinic-data-provider';
import type { Appointment, Patient } from '@/lib/types';

// Returns today's appointments from context and some derived groupings
export function useTodayAppointmentsSelector() {
  const { appointments: appts, loading, error } = useClinic();

  const today = appts?.today ?? [];

  const byStatus = useMemo(() => {
    const groups: Record<string, Appointment[]> = {} as any;
    for (const a of today as any[]) {
      const key = (a as any).estado_cita ?? 'UNKNOWN';
      if (!groups[key]) groups[key] = [] as any;
      (groups[key] as any).push(a);
    }
    return groups;
  }, [today]);

  return {
    todayAppointments: today as any[],
    byStatus,
    loading,
    error,
  };
}

// Locates a patient in the context cache by id (no fetch)
export function usePatientByIdSelector(id: string | null | undefined): Patient | undefined {
  const { patients } = useClinic();
  const all = patients?.paginated?.length ? patients.paginated : patients?.active || [];
  return useMemo(() => {
    if (!id) return undefined;
    return (all as Patient[]).find(p => p.id === id);
  }, [all, id]);
}

// Filters appointments currently available in context (typically today's) by status
export function useAppointmentsByStatusSelector(status: string | 'ALL') {
  const { appointments } = useClinic();
  const source = appointments?.today ?? [];

  const list = useMemo(() => {
    if (!status || status === 'ALL') return source as any[];
    return (source as any[]).filter(a => (a as any).estado_cita === status);
  }, [source, status]);

  return list;
}
