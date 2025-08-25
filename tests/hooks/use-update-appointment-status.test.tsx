import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { renderWithQueryClient, waitFor } from '../utils/test-utils';
import { queryKeys } from '@/lib/query-keys';
import { useUpdateAppointmentStatus } from '@/hooks/use-appointments';
import { AppointmentStatusEnum } from '@/lib/types';
import type { AppointmentWithPatient } from '@/components/patient-admision/admision-types';

// Mock sonner toast
vi.mock('sonner', () => {
  return {
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

function okJson(data: any, init?: Partial<ResponseInit>): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

function errJson(data: any, status = 400): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function Harness({ onReady }: { onReady: (m: ReturnType<typeof useUpdateAppointmentStatus>) => void }) {
  const mutation = useUpdateAppointmentStatus();
  React.useEffect(() => {
    onReady(mutation);
  }, [mutation, onReady]);
  return null;
}

describe('useUpdateAppointmentStatus (integration)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('PATCH success: calls correct endpoint, updates cache, invalidates queries, shows success toast', async () => {
    const appointmentId = 'a1';
    const patientId = 'p1';

    // Stub fetch
    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith(`/api/appointments/${appointmentId}/status`) && init?.method === 'PATCH') {
        const updated: AppointmentWithPatient = {
          id: appointmentId,
          patient_id: patientId,
          fecha_hora_cita: new Date().toISOString(),
          motivos_consulta: [],
          estado_cita: AppointmentStatusEnum.PRESENTE as any,
          patients: {
            id: patientId,
            nombre: 'Juan',
            apellidos: 'Perez',
            telefono: undefined,
            email: undefined,
            edad: undefined,
            estado_paciente: 'activo' as any,
            diagnostico_principal: undefined as any,
          },
        };
        return Promise.resolve(okJson(updated));
      }
      // default
      return Promise.resolve(okJson({ ok: true }));
    }) as Mock;

    let mutation: ReturnType<typeof useUpdateAppointmentStatus> | null = null;
    const { client } = renderWithQueryClient(
      <Harness onReady={(m) => (mutation = m)} />
    );

    // Spy on queryClient methods
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const setDataSpy = vi.spyOn(client, 'setQueryData');

    // Execute mutation
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await mutation!.mutateAsync({ appointmentId, newStatus: AppointmentStatusEnum.PRESENTE as any });

    // Assert fetch call
    const call = (fetchMock.mock.calls.find(([u]) => String(u).includes(`/api/appointments/${appointmentId}/status`)) || [])[1] as RequestInit;
    expect(call?.method).toBe('PATCH');
    const body = call?.body ? JSON.parse(call.body as string) : {};
    expect(body.newStatus).toBe(AppointmentStatusEnum.PRESENTE);

    // Assert cache updated for detail key
    expect(setDataSpy).toHaveBeenCalledWith(queryKeys.appointments.detail(appointmentId), expect.objectContaining({ id: appointmentId }));

    // Assert invalidations
    const invalidatedKeys = invalidateSpy.mock.calls.map(([arg]) => (arg as any).queryKey);
    const expectedInvalidations = [
      queryKeys.appointments.all,
      queryKeys.clinic.data,
      queryKeys.appointments.today,
      queryKeys.appointments.upcoming,
      queryKeys.appointments.past,
      queryKeys.appointments.byPatient(patientId),
      queryKeys.appointments.history(appointmentId),
      queryKeys.patients.history(patientId),
      queryKeys.patients.historyAll,
    ];
    for (const key of expectedInvalidations) {
      expect(invalidatedKeys).toContainEqual(key);
    }

    // Toast success
    const { toast } = await import('sonner');
    expect((toast as any).success).toHaveBeenCalled();
  });

  it('PATCH error: rolls back detail cache, no invalidations, shows error toast', async () => {
    const appointmentId = 'a2';
    const patientId = 'p2';

    const prev: AppointmentWithPatient = {
      id: appointmentId,
      patient_id: patientId,
      fecha_hora_cita: new Date().toISOString(),
      motivos_consulta: [],
      estado_cita: AppointmentStatusEnum.PROGRAMADA as any,
      patients: {
        id: patientId,
        nombre: 'Ana',
        apellidos: 'Lopez',
        telefono: undefined,
        email: undefined,
        edad: undefined,
        estado_paciente: 'activo' as any,
        diagnostico_principal: undefined as any,
      },
    };

    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith(`/api/appointments/${appointmentId}/status`) && init?.method === 'PATCH') {
        return Promise.resolve(errJson({ error: 'Conflicto' }, 409));
      }
      return Promise.resolve(okJson({ ok: true }));
    }) as Mock;

    let mutation: ReturnType<typeof useUpdateAppointmentStatus> | null = null;
    const { client } = renderWithQueryClient(
      <Harness onReady={(m) => (mutation = m)} />
    );

    // Seed previous detail in cache
    client.setQueryData(queryKeys.appointments.detail(appointmentId), prev);

    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const setDataSpy = vi.spyOn(client, 'setQueryData');

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await expect(mutation!.mutateAsync({ appointmentId, newStatus: AppointmentStatusEnum.CANCELADA as any })).rejects.toThrow();

    // Rollback applied
    expect(setDataSpy).toHaveBeenCalledWith(queryKeys.appointments.detail(appointmentId), prev);

    // No invalidations on error
    expect(invalidateSpy).not.toHaveBeenCalled();

    // Toast error
    const { toast } = await import('sonner');
    expect((toast as any).error).toHaveBeenCalled();

    // Ensure endpoint was hit
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes(`/api/appointments/${appointmentId}/status`))).toBe(true);
  });
});
