// hooks/use-clinic-data.ts - Fuente única de verdad para datos clínicos
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type {
  Patient,
  Appointment,
  PatientStatus,
  AppointmentStatus,
  PaginatedResponse,
} from '@/lib/types';
import { PatientStatusEnum } from '@/lib/types';
import type { PatientHistoryData } from '@/components/patient-admision/admision-types';

// =============== Tipos del Hook ===============
export type ClinicFilters = {
  search?: string;
  patientStatus?: PatientStatus | 'ALL';
  appointmentStatus?: AppointmentStatus | 'ALL';
  dateFilter?: 'today' | 'future' | 'past' | 'range';
  startDate?: string | null;
  endDate?: string | null;
  page?: number;
  pageSize?: number;
  patientId?: string | null;
};

export type ClinicDataState = {
  patients: {
    active: Patient[];
    paginated: Patient[];
    pagination: {
      page: number;
      pageSize: number;
      totalCount?: number;
      totalPages?: number;
      hasMore?: boolean;
    };
    stats?: {
      totalPatients: number;
      surveyRate: number;
      pendingConsults: number;
      operatedPatients: number;
      statusStats: Record<string, number>;
    };
  };
  appointments: {
    today: Appointment[];
    future: Appointment[];
    past: Appointment[];
    summary?: {
      total_appointments: number;
      today_count: number;
      future_count: number;
      past_count: number;
    };
  };
  filters: ClinicFilters;
  loading: boolean;
  error: Error | null;
  lastUpdated: number | null;
};

export type ClinicDataActions = {
  setFilters: (partial: Partial<ClinicFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refetch: () => Promise<void>;
  fetchSpecificAppointments: (params: Pick<ClinicFilters, 'dateFilter' | 'startDate' | 'endDate' | 'appointmentStatus' | 'patientId' | 'search'> & { page?: number; pageSize?: number }) => Promise<{
    data: Appointment[];
    pagination?: {
      hasMore?: boolean;
      page?: number;
      pageSize?: number;
      totalCount?: number;
      totalPages?: number;
    };
  }>;
  fetchPatientDetail: (id: string) => Promise<Patient>;
  fetchPatientHistory: (patientId: string, options?: { includeHistory?: boolean; limit?: number }) => Promise<PatientHistoryData>;
};

export type UseClinicDataReturn = ClinicDataState & ClinicDataActions;

// =============== Utilidades de Fetch Optimizadas ===============
const isDebugApi = (): boolean => {
  try {
    if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') return true;
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('debug') === '1') return true;
      try { if (localStorage.getItem('debugApi') === '1') return true; } catch {}
    }
  } catch {}
  return false;
};

const previewResponse = (d: any) => {
  try {
    const out: any = {};
    if (d && typeof d === 'object') {
      if (d.data && Array.isArray(d.data)) out.dataCount = d.data.length;
      if (d.pagination) {
        const p = d.pagination;
        out.pagination = { page: p.page, pageSize: p.pageSize, totalCount: p.totalCount, totalPages: p.totalPages };
      }
      if (d.summary) out.summary = d.summary;
      if (d.stats) out.stats = d.stats;
      if (d.meta) out.meta = d.meta;
    }
    return out;
  } catch {
    return undefined;
  }
};

const logApi = (phase: 'request' | 'response' | 'error', payload: any) => {
  if (!isDebugApi()) return;
  const tag = phase === 'error' ? '[API][error]' : phase === 'request' ? '[API][request]' : '[API][response]';
  try { console.info(tag, payload); } catch {}
};

// Asegura que las peticiones incluyan debug=1 cuando el modo debug está activo
const withDebugParam = (url: string): string => {
  if (!isDebugApi()) return url;
  try {
    const hasQuery = url.includes('?');
    return `${url}${hasQuery ? '&' : '?'}debug=1`;
  } catch {
    return url;
  }
};

const fetchJson = async <T,>(input: RequestInfo | URL): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    logApi('request', { url: typeof input === 'string' ? input : (input as any)?.toString?.() || input });
    const res = await fetch(input, { 
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      let message = 'Request failed';
      try {
        const data = await res.json();
        message = (data && (data.message || data.error)) || message;
        logApi('error', { url: typeof input === 'string' ? input : (input as any)?.toString?.(), status: res.status, body: previewResponse(data) });
      } catch (_) {
        // ignore
      }
      throw new Error(message);
    }
    
    const json = await res.json();
    logApi('response', { url: typeof input === 'string' ? input : (input as any)?.toString?.(), status: res.status, body: previewResponse(json) });
    return json;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

// =============== API Fetch Functions Optimizadas ===============
const fetchActivePatients = () =>
  fetchJson<{ data: Patient[] }>(withDebugParam(`/api/patients?estado=${PatientStatusEnum.ACTIVO}&pageSize=50`));

const fetchTodayAppointments = () =>
  fetchJson<{ data?: Appointment[]; summary?: ClinicDataState['appointments']['summary'] }>(
    withDebugParam('/api/appointments?dateFilter=today&pageSize=100')
  );

const buildPatientsQueryString = (p: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const sp = new URLSearchParams();
  if (p.page) sp.set('page', String(p.page));
  if (p.pageSize) sp.set('pageSize', String(p.pageSize));
  if (p.search) sp.set('search', p.search);
  if (p.status && p.status !== 'all') sp.set('estado', p.status);
  if (p.startDate) sp.set('startDate', p.startDate);
  if (p.endDate) sp.set('endDate', p.endDate);
  return sp.toString();
};

const fetchPaginatedPatients = (params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) =>
  fetchJson<
    PaginatedResponse<Patient> & {
      stats?: ClinicDataState['patients']['stats'];
    }
  >(withDebugParam(`/api/patients?${buildPatientsQueryString(params)}`));

const fetchAppointmentsByFilter = (filter: {
  dateFilter?: 'today' | 'future' | 'past' | 'range';
  patientId?: string | null;
  search?: string;
  pageSize?: number;
  page?: number;
  startDate?: string | null;
  endDate?: string | null;
}) => {
  const sp = new URLSearchParams();
  if (filter.dateFilter) sp.set('dateFilter', filter.dateFilter);
  if (filter.patientId) sp.set('patientId', filter.patientId);
  if (filter.search) sp.set('search', filter.search);
  if (filter.pageSize) sp.set('pageSize', String(filter.pageSize));
  if (filter.page) sp.set('page', String(filter.page));
  if (filter.dateFilter === 'range') {
    if (filter.startDate) sp.set('startDate', filter.startDate);
    if (filter.endDate) sp.set('endDate', filter.endDate);
  }
  return fetchJson<{ data?: Appointment[]; pagination?: any; summary?: ClinicDataState['appointments']['summary'] }>(
    withDebugParam(`/api/appointments?${sp.toString()}`)
  );
};

// =============== Hook Central Optimizado ===============
export function useClinicData(initial?: Partial<ClinicFilters>): UseClinicDataReturn {
  const queryClient = useQueryClient();

  const [filters, setFiltersState] = useState<ClinicFilters>({
    search: '',
    patientStatus: 'ALL',
    appointmentStatus: 'ALL',
    dateFilter: 'today',
    startDate: null,
    endDate: null,
    page: 1,
    pageSize: 15,
    patientId: null,
    ...(initial || {}),
  });

  // Datos esenciales: pacientes activos + citas de hoy
  const {
    data: essential,
    isLoading: loadingEssential,
    error: errorEssential,
    refetch: refetchEssential,
    dataUpdatedAt: essentialUpdatedAt,
  } = useQuery({
    queryKey: queryKeys.clinic.data,
    queryFn: async () => {
      // Paralelización tipada para mantener tipos precisos por respuesta
      type PatientsRes = Awaited<ReturnType<typeof fetchActivePatients>>;
      type TodayRes = Awaited<ReturnType<typeof fetchTodayAppointments>>;
      type FilterRes = Awaited<ReturnType<typeof fetchAppointmentsByFilter>>;

      const [patientsRes, appointmentsRes, futureRes, pastRes]: [PatientsRes, TodayRes, FilterRes, FilterRes] =
        await Promise.all([
          fetchActivePatients(),
          fetchTodayAppointments(),
          fetchAppointmentsByFilter({ dateFilter: 'future', pageSize: 50 }),
          fetchAppointmentsByFilter({ dateFilter: 'past', pageSize: 50 }),
        ]);

      const todayAppointments = (appointmentsRes?.data ?? []) as Appointment[];
      const futureAppointments = (futureRes?.data ?? []) as Appointment[];
      const pastAppointments = (pastRes?.data ?? []) as Appointment[];

      // Calcular summary mínimo si no viene del backend
      const summary =
        appointmentsRes?.summary ||
        ({
          total_appointments: todayAppointments.length + futureAppointments.length + pastAppointments.length,
          today_count: todayAppointments.length,
          future_count: futureAppointments.length,
          past_count: pastAppointments.length,
        } as ClinicDataState['appointments']['summary']);

      return {
        patients: patientsRes.data ?? [],
        appointments: {
          today: todayAppointments,
          future: futureAppointments,
          past: pastAppointments,
        },
        summary,
      };
    },
    staleTime: 2 * 60 * 1000, // 2m
    gcTime: 5 * 60 * 1000, // 5m
    retry: 1,
  });

  // Pacientes paginados con filtros - Optimizado con keepPreviousData
  const {
    data: paginated,
    isLoading: loadingPaginated,
    isPlaceholderData,
    error: errorPaginated,
    refetch: refetchPaginated,
    dataUpdatedAt: paginatedUpdatedAt,
  } = useQuery({
    queryKey: queryKeys.patients.paginated({
      page: filters.page,
      pageSize: filters.pageSize,
      search: filters.search,
      status: filters.patientStatus === 'ALL' ? 'all' : (filters.patientStatus as string),
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    }),
    queryFn: () =>
      fetchPaginatedPatients({
        page: filters.page,
        pageSize: filters.pageSize,
        search: filters.search,
        status: filters.patientStatus === 'ALL' ? 'all' : (filters.patientStatus as string),
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      }),
    staleTime: 60 * 1000, // 1m
    gcTime: 3 * 60 * 1000, // 3m
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const loading = loadingEssential || (loadingPaginated && !isPlaceholderData);
  const error = (errorEssential as Error) || (errorPaginated as Error) || null;

  const lastUpdated = useMemo(() => {
    if (!essential && !paginated) return null;
    const times = [essentialUpdatedAt || 0, paginatedUpdatedAt || 0].filter(Boolean);
    if (!times.length) return null;
    return Math.max(...times);
  }, [essential, paginated, essentialUpdatedAt, paginatedUpdatedAt]);

  // Memoización de funciones de acción
  const actions = useMemo(() => {
    const setFilters = (partial: Partial<ClinicFilters>) => {
      setFiltersState((prev) => ({ ...prev, ...partial }));
    };

    const resetFilters = () => {
      setFiltersState({
        search: '',
        patientStatus: 'ALL',
        appointmentStatus: 'ALL',
        dateFilter: 'today',
        startDate: null,
        endDate: null,
        page: 1,
        pageSize: 15,
        patientId: null,
      });
    };

    const setPage = (page: number) => {
      setFiltersState((prev) => ({ ...prev, page }));
    };

    const setPageSize = (size: number) => {
      setFiltersState((prev) => ({ ...prev, pageSize: size, page: 1 }));
    };

    const refetch = async () => {
      await Promise.allSettled([refetchEssential(), refetchPaginated()]);
    };

    const fetchSpecificAppointments = async ({
      dateFilter = 'today',
      startDate,
      endDate,
      appointmentStatus,
      patientId,
      search,
      page,
      pageSize = 100
    }: Parameters<ClinicDataActions['fetchSpecificAppointments']>[0]) => {
      const key = queryKeys.appointments.filtered({
        dateFilter: dateFilter as 'today' | 'future' | 'past',
        patientId: patientId || undefined,
        search,
        pageSize,
      });

      return queryClient.fetchQuery({
        queryKey: key,
        queryFn: async () => {
          const res = await fetchAppointmentsByFilter({ 
            dateFilter, 
            startDate, 
            endDate, 
            patientId, 
            search, 
            page, 
            pageSize 
          });
          return {
            data: (res.data ?? []) as Appointment[],
            pagination: res.pagination,
          };
        },
        staleTime: 60 * 1000,
        gcTime: 3 * 60 * 1000,
      });
    };

    const fetchPatientDetail = async (id: string) => {
      const key = queryKeys.patients.detail(id);
      return queryClient.fetchQuery({
        queryKey: key,
        queryFn: () => fetchJson<Patient>(withDebugParam(`/api/patients/${id}`)),
        staleTime: 2 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
      });
    };

    const fetchPatientHistory = async (
      patientId: string, 
      options?: { includeHistory?: boolean; limit?: number }
    ) => {
      const key = queryKeys.patients.historyWithOptions(patientId, options as unknown);
      const params = new URLSearchParams();
      if (options?.includeHistory) params.set('includeHistory', 'true');
      if (options?.limit) params.set('limit', String(options.limit));

      return queryClient.fetchQuery({
        queryKey: key,
        queryFn: () => fetchJson<PatientHistoryData>(withDebugParam(`/api/patients/${patientId}/history?${params.toString()}`)),
        staleTime: 2 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
      });
    };

    return {
      setFilters,
      resetFilters,
      setPage,
      setPageSize,
      refetch,
      fetchSpecificAppointments,
      fetchPatientDetail,
      fetchPatientHistory,
    };
  }, [queryClient, refetchEssential, refetchPaginated]);

  // Memoización del estado con tipos explícitos
  const state = useMemo((): ClinicDataState => ({
    patients: {
      active: (essential?.patients as Patient[]) ?? [],
      paginated: (paginated?.data as Patient[]) ?? [],
      pagination: {
        page: paginated?.pagination?.page ?? (filters.page ?? 1),
        pageSize: paginated?.pagination?.pageSize ?? (filters.pageSize ?? 15),
        totalCount: paginated?.pagination?.totalCount,
        totalPages: paginated?.pagination?.totalPages,
        hasMore: paginated?.pagination?.hasMore,
      },
      stats: paginated?.stats,
    },
    appointments: {
      today: (essential?.appointments?.today as Appointment[]) ?? [],
      future: (essential?.appointments?.future as Appointment[]) ?? [],
      past: (essential?.appointments?.past as Appointment[]) ?? [],
      summary: essential?.summary,
    },
    filters,
    loading,
    error,
    lastUpdated,
  }), [
    essential, 
    paginated, 
    filters, 
    loading, 
    error, 
    lastUpdated
  ]);

  return useMemo(() => ({
    ...state,
    ...actions,
  }), [state, actions]);
}