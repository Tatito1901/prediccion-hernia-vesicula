// hooks/use-clinic-data.ts - Fuente única de verdad para datos clínicos
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type {
  Patient,
  Appointment,
  PatientStatus,
  AppointmentStatus,
  PaginatedResponse,
  Lead,
  LeadStatus,
  Channel,
  Motive,
} from '@/lib/types';

// =============== Tipos del Hook ===============
export type ClinicFilters = {
  search?: string;
  patientStatus?: PatientStatus | 'ALL';
  appointmentStatus?: AppointmentStatus | 'ALL';
  dateFilter?: 'today' | 'future' | 'past' | 'range';
  startDate?: string | null; // YYYY-MM-DD
  endDate?: string | null;   // YYYY-MM-DD
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
    today: Appointment[]; // Usamos citas de HOY por defecto para eficiencia real
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
  fetchLeads: (params: {
    page?: number;
    pageSize?: number;
    status?: LeadStatus;
    channel?: Channel;
    motive?: Motive;
    search?: string;
    priority?: number;
    overdue?: boolean;
  }) => Promise<PaginatedResponse<Lead>>;
};

export type UseClinicDataReturn = ClinicDataState & ClinicDataActions;

// =============== Utilidades de Fetch ===============
const fetchJson = async <T,>(input: RequestInfo | URL): Promise<T> => {
  const res = await fetch(input);
  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = await res.json();
      message = (data && (data.message || data.error)) || message;
    } catch (_) {
      // ignore
    }
    throw new Error(message);
  }
  return res.json();
};

const fetchActivePatients = () =>
  fetchJson<{ data: Patient[] }>('/api/patients?estado=activo&pageSize=50');

const fetchTodayAppointments = () =>
  fetchJson<{ data?: Appointment[]; summary?: ClinicDataState['appointments']['summary'] }>(
    '/api/appointments?dateFilter=today&pageSize=100'
  );

const buildPatientsQueryString = (p: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string; // "all" | PatientStatus
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
  >(`/api/patients?${buildPatientsQueryString(params)}`);

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
    `/api/appointments?${sp.toString()}`
  );
};

// Leads paginated fetcher (centralized)
const fetchLeadsPaginated = (params: {
  page?: number;
  pageSize?: number;
  status?: LeadStatus;
  channel?: Channel;
  motive?: Motive;
  search?: string;
  priority?: number;
  overdue?: boolean;
}) => {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  if (params.status) sp.set('status', String(params.status));
  if (params.channel) sp.set('channel', String(params.channel));
  if (params.motive) sp.set('motive', String(params.motive));
  if (params.search) sp.set('search', params.search);
  if (typeof params.priority === 'number') sp.set('priority', String(params.priority));
  if (params.overdue) sp.set('overdue', 'true');
  return fetchJson<PaginatedResponse<Lead>>(`/api/leads?${sp.toString()}`);
};

// =============== Hook Central ===============
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
  } = useQuery({
    queryKey: queryKeys.clinic.data,
    queryFn: async () => {
      const [patientsRes, appointmentsRes] = await Promise.all([
        fetchActivePatients(),
        fetchTodayAppointments(),
      ]);

      const todayAppointments = (appointmentsRes?.data ?? []) as Appointment[];

      // Calcular summary mínimo si no viene del backend
      const summary =
        appointmentsRes?.summary ||
        ({
          total_appointments: todayAppointments.length,
          today_count: todayAppointments.length,
          future_count: 0,
          past_count: 0,
        } as ClinicDataState['appointments']['summary']);

      return {
        patients: patientsRes.data ?? [],
        appointments: todayAppointments,
        summary,
      };
    },
    staleTime: 2 * 60 * 1000, // 2m
  });

  // Pacientes paginados con filtros
  const {
    data: paginated,
    isLoading: loadingPaginated,
    error: errorPaginated,
    refetch: refetchPaginated,
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
  });

  const loading = loadingEssential || loadingPaginated;
  const error = (errorEssential as Error) || (errorPaginated as Error) || null;

  const lastUpdated = useMemo(() => {
    if (!essential && !paginated) return null;
    return Date.now();
  }, [essential, paginated]);

  // Acciones
  const setFilters = useCallback((partial: Partial<ClinicFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetFilters = useCallback(() => {
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
  }, []);

  const setPage = useCallback((page: number) => {
    setFiltersState((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setFiltersState((prev) => ({ ...prev, pageSize: size, page: 1 }));
  }, []);

  const refetch = useCallback(async () => {
    await Promise.all([refetchEssential(), refetchPaginated()]);
  }, [refetchEssential, refetchPaginated]);

  const fetchSpecificAppointments = useCallback<ClinicDataActions['fetchSpecificAppointments']>(
    async ({ dateFilter = 'today', startDate, endDate, appointmentStatus, patientId, search, page, pageSize = 100 }) => {
      const key = queryKeys.appointments.filtered({
        dateFilter: dateFilter as 'today' | 'future' | 'past',
        patientId: patientId || undefined,
        search,
        pageSize,
      });

      const result = await queryClient.fetchQuery({
        queryKey: key,
        queryFn: async () => {
          const res = await fetchAppointmentsByFilter({ dateFilter, startDate, endDate, patientId, search, page, pageSize });
          return {
            data: (res.data ?? []) as Appointment[],
            pagination: res.pagination,
          };
        },
        staleTime: 60 * 1000,
      });

      return result as { data: Appointment[]; pagination?: { hasMore?: boolean; page?: number; pageSize?: number; totalCount?: number; totalPages?: number } };
    },
    [queryClient]
  );

  const fetchLeads = useCallback<ClinicDataActions['fetchLeads']>(
    async (params) => {
      const key = queryKeys.leads.paginated({
        page: params?.page,
        pageSize: params?.pageSize,
        status: (params?.status as unknown as string) || undefined,
        channel: (params?.channel as unknown as string) || undefined,
        motive: (params?.motive as unknown as string) || undefined,
        search: params?.search,
        priority: params?.priority,
        overdue: params?.overdue,
      });

      const result = await queryClient.fetchQuery({
        queryKey: key,
        queryFn: () => fetchLeadsPaginated(params || {}),
        staleTime: 2 * 60 * 1000,
      });

      return result as PaginatedResponse<Lead>;
    },
    [queryClient]
  );

  // Ensamblar estado final
  const state: ClinicDataState = {
    patients: {
      active: essential?.patients ?? [],
      paginated: paginated?.data ?? [],
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
      today: essential?.appointments ?? [],
      summary: essential?.summary,
    },
    filters,
    loading,
    error,
    lastUpdated,
  };

  return {
    ...state,
    setFilters,
    resetFilters,
    setPage,
    setPageSize,
    refetch,
    fetchSpecificAppointments,
    fetchLeads,
  };
}
