// hooks/use-clinic-data.ts - Fuente única de verdad para datos clínicos - REFACTORIZADO
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { endpoints, buildSearchParams } from '@/lib/api-endpoints';
import { queryFetcher } from '@/lib/http';
import type {
  Patient,
  EnrichedPatient,
  Appointment,
  PatientStatus,
  AppointmentStatus,
  PaginatedResponse,
} from '@/lib/types';
import { PatientStatusEnum } from '@/lib/types';
import type { PatientHistoryData } from '@/components/patient-admision/admision-types';
import { dbDiagnosisToDisplay } from '@/lib/constants';
import { dedupeById } from '@/lib/array';

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

interface ChartDataResult {
  series: { name: string; data: number[] }[];
  categories: string[];
  groupedData: { [key: string]: { consultas: number; operados: number } };
}

export type ClinicDataState = {
  patients: {
    active: EnrichedPatient[];
    paginated: EnrichedPatient[];
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
  isLoading: boolean; // Alias para compatibilidad
  error: Error | null;
  errorDetails: {
    patients?: Error | null;
    appointments?: Error | null;
    message?: string;
  };
  isRetrying: boolean;
  lastUpdated: number | null;
  chartData: {
    daily: ChartDataResult;
    monthly: ChartDataResult;
    yearly: ChartDataResult;
  };
  getChartData: (startDate?: Date, endDate?: Date, groupBy?: 'day' | 'month' | 'year') => ChartDataResult;
};

export type ClinicDataActions = {
  setFilters: (partial: Partial<ClinicFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refetch: () => Promise<void>;
  fetchSpecificAppointments: (params: Pick<ClinicFilters, 'dateFilter' | 'startDate' | 'endDate' | 'appointmentStatus' | 'patientId' | 'search'> & { page?: number; pageSize?: number; signal?: AbortSignal }) => Promise<{
    data: Appointment[];
    pagination?: {
      hasMore?: boolean;
      page?: number;
      pageSize?: number;
      totalCount?: number;
      totalPages?: number;
    };
  }>;
  fetchPatientDetail: (id: string) => Promise<EnrichedPatient>;
  fetchPatientHistory: (patientId: string, options?: { includeHistory?: boolean; limit?: number }) => Promise<PatientHistoryData>;
};

export type UseClinicDataReturn = ClinicDataState & ClinicDataActions;

// =============== Utilidades de Debug ===============
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

// =============== API Fetch Functions con abstracciones centralizadas ===============
const fetchActivePatients = (opts?: { signal?: AbortSignal }) => {
  const params = buildSearchParams({
    estado: PatientStatusEnum.ACTIVO,
    pageSize: 50
  });
  return queryFetcher<{ data: Patient[] }>(
    withDebugParam(endpoints.patients.list(params))
  );
};

const fetchTodayAppointments = (opts?: { signal?: AbortSignal }) => {
  const params = buildSearchParams({
    dateFilter: 'today',
    pageSize: 100
  });
  return queryFetcher<{ data?: Appointment[]; summary?: ClinicDataState['appointments']['summary'] }>(
    withDebugParam(endpoints.appointments.list(params))
  );
};

const fetchPaginatedPatients = (params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  signal?: AbortSignal;
}) => {
  const queryParams = buildSearchParams({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    estado: params.status && params.status !== 'all' ? params.status : undefined,
    startDate: params.startDate,
    endDate: params.endDate
  });
  return queryFetcher<
    PaginatedResponse<Patient> & {
      stats?: ClinicDataState['patients']['stats'];
    }
  >(
    withDebugParam(endpoints.patients.list(queryParams))
  );
};

const fetchAppointmentsByFilter = (filter: {
  dateFilter?: 'today' | 'future' | 'past' | 'range';
  patientId?: string | null;
  search?: string;
  pageSize?: number;
  page?: number;
  startDate?: string | null;
  endDate?: string | null;
  signal?: AbortSignal;
}) => {
  const params = buildSearchParams({
    dateFilter: filter.dateFilter,
    patientId: filter.patientId || undefined,
    search: filter.search,
    pageSize: filter.pageSize,
    page: filter.page,
    startDate: filter.dateFilter === 'range' ? filter.startDate : undefined,
    endDate: filter.dateFilter === 'range' ? filter.endDate : undefined
  });
  return queryFetcher<{ data?: Appointment[]; pagination?: any; summary?: ClinicDataState['appointments']['summary'] }>(
    withDebugParam(endpoints.appointments.list(params))
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
    queryFn: async ({ signal }) => {
      // ✅ Paralelización MEJORADA con manejo granular de errores
      const results = await Promise.allSettled([
        fetchActivePatients({ signal }),
        fetchTodayAppointments({ signal }),
        fetchAppointmentsByFilter({ dateFilter: 'future', pageSize: 50, signal }),
        fetchAppointmentsByFilter({ dateFilter: 'past', pageSize: 50, signal }),
      ]);

      const [patientsResult, appointmentsResult, futureResult, pastResult] = results;

      // ✅ Manejar cada resultado individualmente con fallbacks seguros
      const patients = patientsResult.status === 'fulfilled' 
        ? (patientsResult.value?.data ?? []) 
        : [];
        
      const todayAppointments = appointmentsResult.status === 'fulfilled'
        ? ((appointmentsResult.value?.data ?? []) as Appointment[])
        : [];
        
      const futureAppointments = futureResult.status === 'fulfilled'
        ? ((futureResult.value?.data ?? []) as Appointment[])
        : [];
        
      const pastAppointments = pastResult.status === 'fulfilled'
        ? ((pastResult.value?.data ?? []) as Appointment[])
        : [];

      // 🔍 DEBUG: Log datos recibidos
      console.log('[useClinicData] Data received:', {
        patientsCount: patients.length,
        todayCount: todayAppointments.length,
        futureCount: futureAppointments.length,
        pastCount: pastAppointments.length,
        patientsFirstItem: patients[0],
        todayFirstItem: todayAppointments[0],
      });

      // ✅ Log errores sin romper el flujo de datos
      if (patientsResult.status === 'rejected') {
        console.warn('[useClinicData] Failed to fetch patients:', patientsResult.reason?.message || patientsResult.reason);
      }
      if (appointmentsResult.status === 'rejected') {
        console.warn('[useClinicData] Failed to fetch today appointments:', appointmentsResult.reason?.message || appointmentsResult.reason);
      }
      if (futureResult.status === 'rejected') {
        console.warn('[useClinicData] Failed to fetch future appointments:', futureResult.reason?.message || futureResult.reason);
      }
      if (pastResult.status === 'rejected') {
        console.warn('[useClinicData] Failed to fetch past appointments:', pastResult.reason?.message || pastResult.reason);
      }

      // ✅ Summary más robusto con datos reales obtenidos
      const summary = (appointmentsResult.status === 'fulfilled' ? appointmentsResult.value?.summary : undefined) ||
        ({
          total_appointments: todayAppointments.length + futureAppointments.length + pastAppointments.length,
          today_count: todayAppointments.length,
          future_count: futureAppointments.length,
          past_count: pastAppointments.length,
        } as ClinicDataState['appointments']['summary']);

      return {
        patients,
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
    queryFn: ({ signal }) =>
      fetchPaginatedPatients({
        page: filters.page,
        pageSize: filters.pageSize,
        search: filters.search,
        status: filters.patientStatus === 'ALL' ? 'all' : (filters.patientStatus as string),
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        signal,
      }),
    staleTime: 60 * 1000, // 1m
    gcTime: 3 * 60 * 1000, // 3m
    placeholderData: keepPreviousData,
    retry: 1,
  });

  // Estados de carga mejorados
  const [isRetrying, setIsRetrying] = useState(false);
  const loading = loadingEssential || (loadingPaginated && !isPlaceholderData);
  const error = (errorEssential as Error) || (errorPaginated as Error) || null;
  
  // Detalles de error granulares
  const errorDetails = useMemo(() => {
    const details: ClinicDataState['errorDetails'] = {};
    
    if (errorEssential) {
      const msg = (errorEssential as Error)?.message || 'Error desconocido';
      if (msg.includes('patient')) {
        details.patients = errorEssential as Error;
      } else if (msg.includes('appointment')) {
        details.appointments = errorEssential as Error;
      }
      details.message = msg;
    }
    
    if (errorPaginated) {
      details.patients = errorPaginated as Error;
      if (!details.message) {
        details.message = (errorPaginated as Error)?.message || 'Error al cargar pacientes';
      }
    }
    
    return details;
  }, [errorEssential, errorPaginated]);

  const lastUpdated = useMemo(() => {
    if (!essentialUpdatedAt && !paginatedUpdatedAt) return null;
    const times = [essentialUpdatedAt || 0, paginatedUpdatedAt || 0].filter(Boolean);
    if (!times.length) return null;
    return Math.max(...times);
  }, [essentialUpdatedAt, paginatedUpdatedAt]);

  // Enriquecimiento unificado definido a nivel de módulo (ver al final del archivo)

  // Mantener refs a los refetchers para evitar dependencias inestables
  const refetchEssentialRef = useRef(refetchEssential);
  const refetchPaginatedRef = useRef(refetchPaginated);
  useEffect(() => {
    refetchEssentialRef.current = refetchEssential;
    refetchPaginatedRef.current = refetchPaginated;
  }, [refetchEssential, refetchPaginated]);

  // Acciones estables
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
    setIsRetrying(true);
    try {
      await Promise.allSettled([refetchEssentialRef.current(), refetchPaginatedRef.current()]);
    } finally {
      setIsRetrying(false);
    }
  }, []);

  const fetchSpecificAppointments = useCallback(async ({
    dateFilter = 'today',
    startDate,
    endDate,
    appointmentStatus,
    patientId,
    search,
    page,
    pageSize = 100,
    signal: externalSignal,
  }: Parameters<ClinicDataActions['fetchSpecificAppointments']>[0]) => {
    const key = queryKeys.appointments.filtered({
      dateFilter: dateFilter as 'today' | 'future' | 'past',
      patientId: patientId || undefined,
      search,
      pageSize,
    });

    return queryClient.fetchQuery({
      queryKey: key,
      queryFn: async ({ signal }) => {
        // compone señales para que cualquier cancelación (React Query o externa) aborte la petición
        const composed = new AbortController();
        const abort = () => { try { composed.abort(); } catch {} };
        try {
          if (signal) signal.addEventListener('abort', abort, { once: true });
          if (externalSignal) externalSignal.addEventListener('abort', abort, { once: true });

          const res = await fetchAppointmentsByFilter({
            dateFilter,
            startDate,
            endDate,
            patientId,
            search,
            page,
            pageSize,
            signal: composed.signal,
          });
          return {
            data: (res.data ?? []) as Appointment[],
            pagination: res.pagination,
          };
        } finally {
          try { if (signal) signal.removeEventListener('abort', abort as any); } catch {}
          try { if (externalSignal) externalSignal.removeEventListener('abort', abort as any); } catch {}
        }
      },
      staleTime: 60 * 1000,
      gcTime: 3 * 60 * 1000,
    });
  }, [queryClient]);

  const fetchPatientDetail = useCallback(async (id: string) => {
    const key = queryKeys.patients.detail(id);
    const patient = await queryClient.fetchQuery({
      queryKey: key,
      queryFn: ({ signal }) => queryFetcher<Patient>(withDebugParam(endpoints.patients.detail(id))),
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
    });
    // Enriquecer el paciente individual con los campos calculados
    return enrichPatient(patient);
  }, [queryClient]);

  const fetchPatientHistory = useCallback(async (
    patientId: string, 
    options?: { includeHistory?: boolean; limit?: number }
  ) => {
    const key = queryKeys.patients.historyWithOptions(patientId, options as unknown);
    const params = new URLSearchParams();
    if (options?.includeHistory) params.set('includeHistory', 'true');
    if (options?.limit) params.set('limit', String(options.limit));

    return queryClient.fetchQuery({
      queryKey: key,
      queryFn: ({ signal }) => queryFetcher<PatientHistoryData>(withDebugParam(endpoints.patients.history(patientId, params))),
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  const actions: ClinicDataActions = useMemo(() => ({
    setFilters,
    resetFilters,
    setPage,
    setPageSize,
    refetch,
    fetchSpecificAppointments,
    fetchPatientDetail,
    fetchPatientHistory,
  }), [
    setFilters,
    resetFilters,
    setPage,
    setPageSize,
    refetch,
    fetchSpecificAppointments,
    fetchPatientDetail,
    fetchPatientHistory,
  ]);

  // Memoización del estado con tipos explícitos
  const enrichedAllAppointments = useMemo(() => {
    const today = essential?.appointments?.today || [];
    const future = essential?.appointments?.future || [];
    const past = essential?.appointments?.past || [];
    return dedupeById([...(today as any[]), ...(future as any[]), ...(past as any[])]);
  }, [essential]);

  const chartData = useMemo(() => {
    if (!enrichedAllAppointments || enrichedAllAppointments.length === 0) {
      return {
        daily: { series: [], categories: [], groupedData: {} },
        monthly: { series: [], categories: [], groupedData: {} },
        yearly: { series: [], categories: [], groupedData: {} }
      };
    }
    
    return {
      daily: processChartData(enrichedAllAppointments, undefined, undefined, 'day'),
      monthly: processChartData(enrichedAllAppointments, undefined, undefined, 'month'),
      yearly: processChartData(enrichedAllAppointments, undefined, undefined, 'year')
    };
  }, [enrichedAllAppointments]);

  // Función para obtener datos de gráfico con filtros personalizados
  const getChartData = useCallback(
    (startDate?: Date, endDate?: Date, groupBy: 'day' | 'month' | 'year' = 'day') => {
      return processChartData(enrichedAllAppointments, startDate, endDate, groupBy);
    },
    [enrichedAllAppointments]
  );

  // Enriquecer pacientes con referencias estables basadas en la fuente de datos
  const enrichedActivePatients = useMemo(
    () => enrichPatients((essential?.patients as Patient[]) ?? []),
    [essential?.patients]
  );

  const enrichedPaginatedPatients = useMemo(
    () => enrichPatients((paginated?.data as Patient[]) ?? []),
    [paginated?.data]
  );

  const state = useMemo((): ClinicDataState => ({
    patients: {
      active: enrichedActivePatients,
      paginated: enrichedPaginatedPatients,
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
    isLoading: loading, // Alias para compatibilidad
    error,
    errorDetails,
    isRetrying,
    lastUpdated,
    chartData,
    getChartData,
  }), [
    // Pacientes enriquecidos estables
    enrichedActivePatients,
    enrichedPaginatedPatients,
    // Paginación y estadísticas (escalares estables)
    paginated?.pagination?.page,
    paginated?.pagination?.pageSize,
    paginated?.pagination?.totalCount,
    paginated?.pagination?.totalPages,
    paginated?.pagination?.hasMore,
    paginated?.stats,
    // Citas (arreglos referenciales) y resumen
    essential?.appointments?.today,
    essential?.appointments?.future,
    essential?.appointments?.past,
    essential?.summary,
    // Otros estados
    filters,
    loading,
    error,
    errorDetails,
    isRetrying,
    lastUpdated,
    chartData,
    getChartData,
  ]);

  return useMemo(() => ({
    ...state,
    ...actions,
  }), [state, actions]);
}

// =============== PROCESAMIENTO DE DATOS PARA GRÁFICOS ===============

const processChartData = (
  appointments: any[],
  startDate?: Date,
  endDate?: Date,
  groupBy: 'day' | 'month' | 'year' = 'day'
): ChartDataResult => {
  // Filtrar por rango de fechas si se especifica
  const filteredAppointments = appointments.filter(app => {
    if (!app.fecha_hora_cita) return false;
    const appointmentDate = new Date(app.fecha_hora_cita);
    
    if (startDate && appointmentDate < startDate) return false;
    if (endDate && appointmentDate > endDate) return false;
    
    return true;
  });

  // Agrupar citas por período
  const grouped: { [key: string]: { consultas: number; operados: number } } = {};
  
  filteredAppointments.forEach(appointment => {
    const date = new Date(appointment.fecha_hora_cita);
    let key: string;
    
    if (groupBy === 'day') {
      key = date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } else if (groupBy === 'month') {
      key = date.toLocaleDateString('es-ES', { 
        month: 'long', 
        year: 'numeric' 
      });
    } else {
      key = date.getFullYear().toString();
    }
    
    if (!grouped[key]) {
      grouped[key] = { consultas: 0, operados: 0 };
    }
    
    grouped[key].consultas++;
    
    // Contar operados (cuando el procedimiento es operado)
    if (appointment.procedimiento === 'operado') {
      grouped[key].operados++;
    }
  });
  
  // Ordenar las claves cronológicamente
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const dateA = parseDate(a, groupBy);
    const dateB = parseDate(b, groupBy);
    return dateA.getTime() - dateB.getTime();
  });
  
  // Preparar datos para el gráfico
  const categories = sortedKeys;
  const consultasData = sortedKeys.map(key => grouped[key].consultas);
  const operadosData = sortedKeys.map(key => grouped[key].operados);
  
  return {
    series: [
      { name: 'Consultas', data: consultasData },
      { name: 'Operados', data: operadosData }
    ],
    categories,
    groupedData: grouped
  };
};

// Función auxiliar para parsear fechas según el formato de agrupación
const parseDate = (dateStr: string, groupBy: 'day' | 'month' | 'year'): Date => {
  if (groupBy === 'day') {
    const [day, month, year] = dateStr.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  } else if (groupBy === 'month') {
    // Para meses en español, mapear a número
    const monthMap: { [key: string]: number } = {
      'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
      'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
      'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
    };
    const parts = dateStr.toLowerCase().split(' de ');
    const month = monthMap[parts[0]] || 0;
    const year = parseInt(parts[1]);
    return new Date(year, month, 1);
  } else {
    return new Date(parseInt(dateStr), 0, 1);
  }
};

// =============== UTILIDAD DE ENRIQUECIMIENTO (Única fuente) ===============
// Definimos una única versión consistente para todo el hook

const enrichPatient = (patient: Patient): EnrichedPatient => {
  const nombreCompleto = `${patient.nombre || ''} ${patient.apellidos || ''}`.trim();
  const displayDiagnostico = patient.diagnostico_principal
    ? dbDiagnosisToDisplay(patient.diagnostico_principal)
    : 'Sin diagnóstico';
  const encuesta_completada = (patient.updated_at && patient.created_at)
    ? patient.updated_at !== patient.created_at
    : false;
  return {
    ...patient,
    nombreCompleto,
    displayDiagnostico,
    encuesta_completada,
  } as EnrichedPatient;
};

const enrichPatients = (patients: Patient[]): EnrichedPatient[] => patients.map(enrichPatient);