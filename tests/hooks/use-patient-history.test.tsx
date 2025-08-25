import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { renderWithQueryClient, waitFor } from '../utils/test-utils';
import { usePatientHistory } from '@/hooks/use-patient';

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

function Harness({
  patientId,
  options,
  onState,
}: {
  patientId: string;
  options?: { includeHistory?: boolean; limit?: number; enabled?: boolean };
  onState: (s: { data: any; isLoading: boolean; isSuccess: boolean; isError: boolean; error: Error | null }) => void;
}) {
  const q = usePatientHistory(patientId, options);
  React.useEffect(() => {
    onState({
      data: q.data,
      isLoading: q.isLoading,
      isSuccess: q.isSuccess,
      isError: q.isError,
      error: q.error ?? null,
    });
  }, [q.data, q.isLoading, q.isSuccess, q.isError, q.error, onState]);
  return null;
}

describe('usePatientHistory (integration)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET success: builds correct URL with params and caches result (no extra fetch on rerender)', async () => {
    const patientId = 'p123';
    const options = { includeHistory: true, limit: 5 } as const;

    const historyPayload = {
      patient: { id: patientId, nombre: 'Test', apellidos: 'One' },
      appointments: [
        { id: 'a1', patient_id: patientId, fecha_hora_cita: new Date().toISOString(), motivos_consulta: [], estado_cita: 'PROGRAMADA' },
      ],
    };

    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes(`/api/patients/${patientId}/history`)) {
        // Assert parameters present regardless of order
        expect(url).toContain('includeHistory=true');
        expect(url).toContain('limit=5');
        return Promise.resolve(okJson(historyPayload));
      }
      return Promise.resolve(okJson({}));
    }) as Mock;

    let latest: any = null;
    const { rerender } = renderWithQueryClient(
      <Harness patientId={patientId} options={options} onState={(s) => (latest = s)} />
    );

    await waitFor(() => expect(latest?.isSuccess).toBe(true));
    expect(latest?.data?.patient?.id).toBe(patientId);

    // Rerender with same options (structurally equal) should use cache, not refetch
    rerender(<Harness patientId={patientId} options={{ includeHistory: true, limit: 5 }} onState={(s) => (latest = s)} />);

    await waitFor(() => expect(latest?.isSuccess).toBe(true));
    // Only one network call expected
    const callsToHistory = fetchMock.mock.calls.filter(([u]) => String(u).includes(`/api/patients/${patientId}/history`));
    expect(callsToHistory.length).toBe(1);
  });

  it('GET error: exposes error state and message', async () => {
    const patientId = 'p404';

    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes(`/api/patients/${patientId}/history`)) {
        return Promise.resolve(errJson({ error: 'Not found' }, 404));
      }
      return Promise.resolve(okJson({}));
    }) as Mock;

    let latest: any = null;
    renderWithQueryClient(
      <Harness patientId={patientId} options={{ includeHistory: true }} onState={(s) => (latest = s)} />
    );

    await waitFor(() => expect(latest?.isError).toBe(true));
    expect(latest?.error?.message).toMatch(/not found/i);

    // Ensure endpoint hit
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes(`/api/patients/${patientId}/history`))).toBe(true);
  });
});
