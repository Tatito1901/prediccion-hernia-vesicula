import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';

import { useAdmissionAppointments } from '@/hooks/use-admission-appointments';
import type { AdmissionAppointmentsReturn } from '@/hooks/use-admission-appointments';
import { AppointmentStatusEnum } from '@/lib/types';
import type { AppointmentWithPatient } from '@/components/patient-admision/admision-types';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function makeAppointment(
  id: string,
  iso: string,
  status: keyof typeof AppointmentStatusEnum,
  extra?: Partial<AppointmentWithPatient>
): AppointmentWithPatient {
  return {
    id,
    patient_id: `p-${id}`,
    fecha_hora_cita: iso,
    motivos_consulta: ['dolor'],
    estado_cita: AppointmentStatusEnum[status],
    notas_breves: 'nota',
    es_primera_vez: false,
    patients: {
      id: `p-${id}`,
      nombre: 'Juan',
      apellidos: 'Pérez',
      telefono: '555-000-0000',
      email: 'juan@example.com',
      edad: 35,
      estado_paciente: 'ACTIVO' as any,
      diagnostico_principal: 'HERNIAS' as any,
    },
    ...extra,
  } as AppointmentWithPatient;
}

const now = new Date();
const toIso = (d: Date) => d.toISOString();

const todayA1 = makeAppointment('t1', toIso(new Date(now.getTime() + 60 * 60 * 1000)), 'COMPLETADA');
const todayA2 = makeAppointment('t2', toIso(new Date(now.getTime() + 2 * 60 * 60 * 1000)), 'PROGRAMADA');
const todayRes = makeAppointment('t3', toIso(new Date(now.getTime() + 3 * 60 * 60 * 1000)), 'REAGENDADA');

const futureA1 = makeAppointment('f1', toIso(new Date(now.getTime() + 24 * 60 * 60 * 1000)), 'CONFIRMADA');

const pastOlder = makeAppointment('p1', toIso(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)), 'PROGRAMADA');
const pastNewer = makeAppointment('p2', toIso(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)), 'COMPLETADA');

function makePayload(data: AppointmentWithPatient[]) {
  return {
    data,
    pagination: {
      page: 1,
      pageSize: 50,
      totalCount: data.length,
      totalPages: 1,
      hasMore: false,
    },
  };
}

async function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = typeof input === 'string' ? new URL(input) : new URL((input as any).url ?? String(input));
  const df = url.searchParams.get('dateFilter');
  let payload;
  switch (df) {
    case 'today':
      payload = { ...makePayload([todayA1, todayA2, todayRes]), summary: { total_appointments: 3, today_count: 3, future_count: 1, past_count: 2 } };
      break;
    case 'future':
      payload = makePayload([futureA1]);
      break;
    case 'past':
      // Intentionally unsorted: older first, newer second
      payload = makePayload([pastOlder, pastNewer]);
      break;
    default:
      payload = makePayload([]);
  }
  return {
    ok: true,
    json: async () => payload,
  } as unknown as Response;
}

describe('useAdmissionAppointments', () => {
  beforeEach(() => {
    // jsdom URL already set to http://localhost/ from vitest workspace
    global.fetch = vi.fn(mockFetch) as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and classifies, excludes REAGENDADA, sorts, and computes stats', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAdmissionAppointments({ pageSize: 50 }), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const { today, future, past } = result.current.appointments;

    // Excludes REAGENDADA from display lists
    expect(today).toHaveLength(2);
    expect(future).toHaveLength(1);
    expect(past).toHaveLength(2);

    // Sorting: past should be descending by date (newer first)
    expect(new Date(past[0].fecha_hora_cita).getTime()).toBeGreaterThan(new Date(past[1].fecha_hora_cita).getTime());

    // Rescheduled count tallies REAGENDADA
    expect(result.current.rescheduledCount).toBe(1);

    // Stats for today: pending (PROGRAMADA or CONFIRMADA) and completed (COMPLETADA)
    expect(result.current.stats).toEqual({ today: 2, pending: 1, completed: 1 });
  });

  it('applies status filtering and forwards search param; refetch triggers a new round', async () => {
    const wrapper = createWrapper();

    const { result, rerender } = renderHook<
      AdmissionAppointmentsReturn,
      { status?: keyof typeof AppointmentStatusEnum; search?: string }
    >(
      (props) =>
        useAdmissionAppointments({ status: (props.status as any) ?? 'all', search: props.search ?? 'Juan' }),
      { wrapper, initialProps: { search: 'Juan' } }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Verify search param was included in all three fetches
    const calls = (global.fetch as unknown as { mock: { calls: any[] } }).mock.calls;
    expect(calls).toHaveLength(3);
    for (const [firstArg] of calls) {
      const u = new URL(typeof firstArg === 'string' ? firstArg : (firstArg.url ?? String(firstArg)));
      expect(u.pathname).toBe('/api/appointments');
      expect(u.searchParams.get('search')).toBe('Juan');
    }

    // Now filter by CONFIRMADA (should include only the future one)
    rerender({ status: 'CONFIRMADA', search: 'Juan' });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.appointments.today).toHaveLength(0);
    expect(result.current.appointments.future).toHaveLength(1);
    expect(result.current.appointments.past).toHaveLength(0);

    const beforeRefetch = (global.fetch as unknown as { mock: { calls: any[] } }).mock.calls.length;
    await result.current.refetch();
    const afterRefetch = (global.fetch as unknown as { mock: { calls: any[] } }).mock.calls.length;
    expect(afterRefetch - beforeRefetch).toBe(3); // one per bucket
  });
});
