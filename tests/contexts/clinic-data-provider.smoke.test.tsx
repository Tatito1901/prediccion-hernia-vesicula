import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { renderWithQueryClient, waitFor } from '../utils/test-utils';
import { ClinicDataProvider, useClinic } from '@/contexts/clinic-data-provider';

function okJson(data: any, init?: Partial<ResponseInit>): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

const zeroSummary = {
  total_appointments: 0,
  today_count: 0,
  future_count: 0,
  past_count: 0,
};

function Consumer({ onState }: { onState: (ctx: any) => void }) {
  const ctx = useClinic();
  React.useEffect(() => {
    onState(ctx);
  }, [ctx, onState]);
  return null;
}

describe('ClinicDataProvider smoke', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches initial data and exposes expected context shape', async () => {
    let lastPaginatedURL: URL | null = null;
    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      const u = new URL(url, 'http://localhost');
      // Active patients (optimized default)
      if (u.pathname === '/api/patients' && u.searchParams.get('estado') === 'activo') {
        return Promise.resolve(okJson({ data: [] }));
      }
      // Appointments buckets
      if (u.pathname === '/api/appointments' && u.searchParams.get('dateFilter') === 'today') {
        return Promise.resolve(okJson({ data: [], summary: zeroSummary }));
      }
      if (u.pathname === '/api/appointments' && u.searchParams.get('dateFilter') === 'future') {
        return Promise.resolve(okJson({ data: [] }));
      }
      if (u.pathname === '/api/appointments' && u.searchParams.get('dateFilter') === 'past') {
        return Promise.resolve(okJson({ data: [] }));
      }
      // Paginated patients (no estado param by default: status=all)
      if (u.pathname === '/api/patients') {
        lastPaginatedURL = u;
        return Promise.resolve(
          okJson({
            data: [],
            pagination: { page: 1, pageSize: 15, totalCount: 0, totalPages: 0, hasMore: false },
            stats: {
              totalPatients: 0,
              surveyRate: 0,
              pendingConsults: 0,
              operatedPatients: 0,
              statusStats: {},
            },
          })
        );
      }
      return Promise.resolve(okJson({}));
    }) as Mock;

    let latest: any = null;
    renderWithQueryClient(
      <ClinicDataProvider>
        <Consumer onState={(c) => (latest = c)} />
      </ClinicDataProvider>
    );

    // Wait until provider finishes initial loading
    await waitFor(() => {
      expect(latest?.isLoading).toBe(false);
    }, { timeout: 3000 });

    // Patients shape
    expect(Array.isArray(latest.patientsData?.data)).toBe(true);
    expect(latest.patientsData?.count).toBe(0);
    expect(Array.isArray(latest.allPatients)).toBe(true);
    expect(latest.allPatients.length).toBe(0);

    // Appointments shape
    expect(Array.isArray(latest.allAppointments)).toBe(true);
    expect(latest.allAppointments.length).toBe(0);
    if (latest.appointmentsSummary) {
      expect(latest.appointmentsSummary).toMatchObject(zeroSummary);
    }

    // Filters and setters
    expect(latest.patientsFilters.page).toBe(1);
    expect(latest.patientsFilters.search).toBe('');
    expect(latest.patientsFilters.status).toBe('all');

    expect(typeof latest.setPatientsPage).toBe('function');
    expect(typeof latest.setPatientsSearch).toBe('function');
    expect(typeof latest.setPatientsStatus).toBe('function');
    expect(typeof latest.clearPatientsFilters).toBe('function');
    expect(typeof latest.refetchPatients).toBe('function');

    // Flags and errors
    expect(latest.isPatientsLoading).toBe(false);
    expect(latest.isLoadingAppointments).toBe(false);

    // Check paginated patients request params
    if (!lastPaginatedURL) {
      throw new Error('Paginated patients URL was not captured');
    }
    const ensuredPaginatedURL: URL = lastPaginatedURL as unknown as URL;
    expect(ensuredPaginatedURL.searchParams.get('page')).toBe('1');
    expect(ensuredPaginatedURL.searchParams.get('pageSize')).toBe('15');
    expect(ensuredPaginatedURL.searchParams.get('estado')).toBe(null);

    // Extra mapping fields
    expect(Array.isArray(latest.paginatedPatients)).toBe(true);
    expect(latest.patientsPagination?.page).toBe(1);
    expect(latest.patientsPagination?.pageSize).toBe(15);

    // Ensure endpoints hit at least once
    const urls = fetchMock.mock.calls.map(([u]) => new URL(String(u), 'http://localhost'));
    const hasActivePatients = urls.some((u) => u.pathname === '/api/patients' && u.searchParams.get('estado') === 'activo');
    const hasToday = urls.some((u) => u.pathname === '/api/appointments' && u.searchParams.get('dateFilter') === 'today');
    const hasFuture = urls.some((u) => u.pathname === '/api/appointments' && u.searchParams.get('dateFilter') === 'future');
    const hasPast = urls.some((u) => u.pathname === '/api/appointments' && u.searchParams.get('dateFilter') === 'past');
    const patientsCalls = urls.filter((u) => u.pathname === '/api/patients');
    expect(hasActivePatients).toBe(true);
    expect(hasToday).toBe(true);
    expect(hasFuture).toBe(true);
    expect(hasPast).toBe(true);
    expect(patientsCalls.length).toBeGreaterThanOrEqual(2); // active + paginated
  });
});
