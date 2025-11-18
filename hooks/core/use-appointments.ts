// hooks/core/use-appointments-unified.ts
// Hook unificado para todas las operaciones de appointments
// Reemplaza: use-appointments.ts, use-admission-appointments.ts, y parte de use-clinic-data.ts

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { endpoints, buildSearchParams } from '@/lib/api-endpoints';
import { queryFetcher, fetchJson } from '@/lib/http';
import { notifySuccess, notifyError } from '@/lib/client-errors';
import type { 
  Appointment, 
  AppointmentStatus, 
  AppointmentWithPatient 
} from '@/lib/types';
import { AppointmentStatusEnum } from '@/lib/types';

// ==================== TIPOS ====================
export interface AppointmentFilters {
  search?: string;
  status?: AppointmentStatus | 'all';
  dateFilter?: 'today' | 'future' | 'past' | 'range' | 'all';
  startDate?: string | null;
  endDate?: string | null;
  patientId?: string | null;
  doctorId?: string | null;
  page?: number;
  pageSize?: number;
  includePatient?: boolean;
}

export interface AppointmentMutationParams {
  patient_id: string;
  fecha_hora_cita: string;
  motivos_consulta: string[];
  estado_cita?: AppointmentStatus;
  doctor_id?: string | null;
  notas_breves?: string;
  es_primera_vez?: boolean;
}

export interface AppointmentUpdateParams {
  id: string;
  fecha_hora_cita?: string;
  motivos_consulta?: string[];
  estado_cita?: AppointmentStatus;
  notas_breves?: string;
  doctor_id?: string | null;
}

export interface StatusUpdateParams {
  appointmentId: string;
  newStatus: AppointmentStatus;
  motivo?: string;
  nuevaFechaHora?: string;
  expectedUpdatedAt?: string; // For optimistic concurrency
}

interface AppointmentsResponse {
  data: AppointmentWithPatient[];
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  summary?: {
    total_appointments: number;
    today_count: number;
    future_count: number;
    past_count: number;
  };
}

// ==================== FETCH FUNCTIONS ====================
const fetchAppointments = async (filters: AppointmentFilters): Promise<AppointmentsResponse> => {
  const params = buildSearchParams({
    search: filters.search,
    status: filters.status !== 'all' ? filters.status : undefined,
    dateFilter: filters.dateFilter,
    startDate: filters.startDate,
    endDate: filters.endDate,
    patientId: filters.patientId,
    doctorId: filters.doctorId,
    page: filters.page,
    pageSize: filters.pageSize,
    includePatient: filters.includePatient,
  });

  const url = endpoints.appointments.list(params);
  return await queryFetcher<AppointmentsResponse>(url);
};

const fetchAppointmentDetail = async (id: string): Promise<AppointmentWithPatient> => {
  return await queryFetcher<AppointmentWithPatient>(endpoints.appointments.detail(id));
};

// ==================== HOOK PRINCIPAL ====================
export const useAppointments = (filters: AppointmentFilters = {}) => {
  const defaultFilters: AppointmentFilters = {
    status: 'all',
    dateFilter: 'today',
    page: 1,
    pageSize: 20,
    includePatient: true,
    ...filters,
  };

  // Optimización: Solo recalcular queryKey cuando cambian los filtros relevantes
  const queryKey = useMemo(
    () => queryKeys.appointments.filtered({
      search: defaultFilters.search,
      status: defaultFilters.status !== 'all' ? defaultFilters.status : undefined,
      dateFilter: defaultFilters.dateFilter,
      startDate: defaultFilters.startDate,
      endDate: defaultFilters.endDate,
      patientId: defaultFilters.patientId,
      doctorId: defaultFilters.doctorId,
      page: defaultFilters.page,
      pageSize: defaultFilters.pageSize,
    }),
    [
      defaultFilters.search,
      defaultFilters.status,
      defaultFilters.dateFilter,
      defaultFilters.startDate,
      defaultFilters.endDate,
      defaultFilters.patientId,
      defaultFilters.doctorId,
      defaultFilters.page,
      defaultFilters.pageSize,
    ]
  );

  const query = useQuery({
    queryKey,
    queryFn: () => fetchAppointments(defaultFilters),
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
  });

  // OPTIMIZADO: Clasificación de citas por período - SOLO cuando dateFilter='all'
  // Si el usuario pidió un dateFilter específico, el servidor ya filtró correctamente
  const classifiedAppointments = useMemo(() => {
    // Si el usuario pidió un dateFilter específico, no clasificar
    // El servidor ya hizo el filtrado
    if (filters.dateFilter && filters.dateFilter !== 'all') {
      return { today: [], future: [], past: [] };
    }

    if (!query.data?.data?.length) {
      return { today: [], future: [], past: [] };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const tomorrowStart = todayStart + 86400000; // 24 hours in ms

    const appointments = query.data.data;

    const classified = {
      today: [] as AppointmentWithPatient[],
      future: [] as AppointmentWithPatient[],
      past: [] as AppointmentWithPatient[],
    };

    // Una sola pasada con timestamps precalculados para mejor performance
    for (const appointment of appointments) {
      const appointmentTime = new Date(appointment.fecha_hora_cita).getTime();

      if (appointmentTime >= todayStart && appointmentTime < tomorrowStart) {
        classified.today.push(appointment);
      } else if (appointmentTime >= tomorrowStart) {
        classified.future.push(appointment);
      } else {
        classified.past.push(appointment);
      }
    }

    // Ordenar solo si hay elementos
    if (classified.today.length > 1) {
      classified.today.sort((a, b) =>
        new Date(a.fecha_hora_cita).getTime() - new Date(b.fecha_hora_cita).getTime()
      );
    }
    if (classified.future.length > 1) {
      classified.future.sort((a, b) =>
        new Date(a.fecha_hora_cita).getTime() - new Date(b.fecha_hora_cita).getTime()
      );
    }
    if (classified.past.length > 1) {
      classified.past.sort((a, b) =>
        new Date(b.fecha_hora_cita).getTime() - new Date(a.fecha_hora_cita).getTime()
      );
    }

    return classified;
  }, [query.data, filters.dateFilter]);

  // Estadísticas
  const stats = useMemo(() => {
    const appointments = query.data?.data || [];
    const today = classifiedAppointments.today;
    
    const pending = today.filter(
      (a) => a.estado_cita === AppointmentStatusEnum.PROGRAMADA || 
             a.estado_cita === AppointmentStatusEnum.CONFIRMADA
    ).length;
    
    const completed = today.filter(
      (a) => a.estado_cita === AppointmentStatusEnum.COMPLETADA
    ).length;
    
    const cancelled = appointments.filter(
      (a) => a.estado_cita === AppointmentStatusEnum.CANCELADA
    ).length;
    
    const rescheduled = appointments.filter(
      (a) => a.estado_cita === AppointmentStatusEnum.REAGENDADA
    ).length;

    return {
      total: appointments.length,
      today: today.length,
      pending,
      completed,
      cancelled,
      rescheduled,
      noShow: appointments.filter(
        (a) => a.estado_cita === AppointmentStatusEnum.NO_ASISTIO
      ).length,
    };
  }, [query.data, classifiedAppointments]);

  return {
    // Data
    appointments: query.data?.data || [],
    classifiedAppointments,
    pagination: query.data?.pagination,
    summary: query.data?.summary,
    stats,
    
    // Query state
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    
    // Actions
    refetch: query.refetch,
  };
};

// ==================== HOOK PARA DETALLE ====================
export const useAppointmentDetail = (id: string | undefined, enabled = true) => {
  return useQuery({
    queryKey: id ? queryKeys.appointments.detail(id) : ['appointment-detail-undefined'],
    queryFn: () => fetchAppointmentDetail(id!),
    enabled: !!id && enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
};

// ==================== HOOK PARA PAGINACIÓN INFINITA ====================
export const useAppointmentsInfinite = (baseFilters: Omit<AppointmentFilters, 'page'> = {}) => {
  return useInfiniteQuery({
    queryKey: ['appointments', 'infinite', baseFilters],
    queryFn: ({ pageParam = 1 }) => 
      fetchAppointments({ ...baseFilters, page: pageParam }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination?.hasMore) return undefined;
      return (lastPage.pagination?.page || 0) + 1;
    },
    initialPageParam: 1,
    staleTime: 30_000,
  });
};

// ==================== MUTATIONS ====================
export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation<AppointmentWithPatient, Error, AppointmentMutationParams>({
    mutationFn: async (data) => {
      return await fetchJson<AppointmentWithPatient>(endpoints.appointments.list(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: (newAppointment) => {
      // Invalidación inteligente y centralizada
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.appointments.all,
        exact: false,
      });
      
      if (newAppointment.patient_id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.patients.history(newAppointment.patient_id),
        });
      }
      
      notifySuccess('Cita agendada exitosamente');
    },
    onError: (error) => {
      notifyError(error, { prefix: 'Citas' });
    },
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation<AppointmentWithPatient, Error, AppointmentUpdateParams>({
    mutationFn: async ({ id, ...updateData }) => {
      return await fetchJson<AppointmentWithPatient>(endpoints.appointments.detail(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
    },
    onSuccess: (updatedAppointment) => {
      // Actualización directa del caché
      queryClient.setQueryData(
        queryKeys.appointments.detail(updatedAppointment.id), 
        updatedAppointment
      );
      
      // Invalidación inteligente
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.appointments.all,
        exact: false,
      });
      
      notifySuccess('Cita actualizada exitosamente');
    },
    onError: (error) => {
      notifyError(error, { prefix: 'Citas' });
    },
  });
};

export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation<AppointmentWithPatient, Error, StatusUpdateParams>({
    mutationFn: async ({ appointmentId, newStatus, motivo, nuevaFechaHora, expectedUpdatedAt }) => {
      // Obtener expected_updated_at desde caché si no fue provisto (control de concurrencia optimista)
      const expectedFromCache = expectedUpdatedAt ?? (() => {
        const detail = queryClient.getQueryData<AppointmentWithPatient>(
          queryKeys.appointments.detail(appointmentId)
        );
        if (detail?.updated_at) return detail.updated_at as string;
        const matches = queryClient.getQueriesData<AppointmentsResponse>({ queryKey: queryKeys.appointments.all });
        for (const [, data] of matches) {
          const found = data?.data?.find((a) => a.id === appointmentId);
          if (found?.updated_at) return found.updated_at as string;
        }
        return undefined;
      })();

      const payload = {
        newStatus,
        motivo_cambio: motivo,
        nuevaFechaHora,
        expected_updated_at: expectedFromCache,
      };
      
      return await fetchJson<AppointmentWithPatient>(
        endpoints.appointments.updateStatus(appointmentId), 
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
    },
    onMutate: async ({ appointmentId, newStatus, nuevaFechaHora }) => {
      // Cancelar todas las queries relacionadas a citas para evitar estados intermedios
      await queryClient.cancelQueries({ queryKey: queryKeys.appointments.all, exact: false });

      // Tomar snapshots previos para rollback
      const previousDetail = queryClient.getQueryData<AppointmentWithPatient>(
        queryKeys.appointments.detail(appointmentId)
      );
      const previousLists = queryClient.getQueriesData<AppointmentsResponse>({ queryKey: queryKeys.appointments.all });

      // Helper para aplicar actualización optimista a un appointment
      const applyUpdate = (appt: AppointmentWithPatient): AppointmentWithPatient => ({
        ...appt,
        estado_cita: newStatus,
        // Si viene una nueva fecha/hora (reagendar), reflejarla inmediatamente
        ...(nuevaFechaHora ? { fecha_hora_cita: nuevaFechaHora } : {}),
        // Marcar updated_at localmente para coherencia visual
        updated_at: new Date().toISOString(),
      });

      // 1) Actualizar caché de detalle si existe
      if (previousDetail) {
        queryClient.setQueryData(
          queryKeys.appointments.detail(appointmentId),
          applyUpdate(previousDetail)
        );
      }

      // 2) Actualizar todas las listas en caché donde exista la cita
      previousLists.forEach(([key, data]) => {
        if (!data?.data?.length) return;
        const idx = data.data.findIndex((a) => a.id === appointmentId);
        if (idx === -1) return;
        const updatedList: AppointmentsResponse = {
          ...data,
          data: data.data.map((a) => (a.id === appointmentId ? applyUpdate(a) : a)),
        } as AppointmentsResponse;
        queryClient.setQueryData(key as any, updatedList);
      });

      return { appointmentId, previousDetail, previousLists };
    },
    onSuccess: (updatedAppointment) => {
      // Actualización directa de detalle
      queryClient.setQueryData(
        queryKeys.appointments.detail(updatedAppointment.id), 
        updatedAppointment
      );

      // Refrescar listas con la versión confirmada del backend para evitar desalineación
      const lists = queryClient.getQueriesData<AppointmentsResponse>({ queryKey: queryKeys.appointments.all });
      lists.forEach(([key, data]) => {
        if (!data?.data?.length) return;
        const has = data.data.some((a) => a.id === updatedAppointment.id);
        if (!has) return;
        const updatedList: AppointmentsResponse = {
          ...data,
          data: data.data.map((a) => (a.id === updatedAppointment.id ? updatedAppointment : a)),
        } as AppointmentsResponse;
        queryClient.setQueryData(key as any, updatedList);
      });
      
      // Invalidación inteligente para sincronizar cualquier vista derivada
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.appointments.all,
        exact: false,
      });
      
      const statusMessages: Record<AppointmentStatus, string> = {
        [AppointmentStatusEnum.PROGRAMADA]: 'Cita programada',
        [AppointmentStatusEnum.CONFIRMADA]: 'Cita confirmada',
        [AppointmentStatusEnum.PRESENTE]: 'Check-in registrado',
        [AppointmentStatusEnum.COMPLETADA]: 'Consulta completada',
        [AppointmentStatusEnum.CANCELADA]: 'Cita cancelada',
        [AppointmentStatusEnum.NO_ASISTIO]: 'Marcado como no asistió',
        [AppointmentStatusEnum.REAGENDADA]: 'Cita reagendada',
      };
      
      notifySuccess(statusMessages[updatedAppointment.estado_cita] || 'Estado actualizado');
    },
    onError: (error, _variables, context: any) => {
      // Rollback de detalle
      if (context?.previousDetail) {
        queryClient.setQueryData(
          queryKeys.appointments.detail(context.appointmentId), 
          context.previousDetail
        );
      }
      // Rollback de todas las listas afectadas
      if (Array.isArray(context?.previousLists)) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key as any, data);
        }
      }
      
      notifyError(error, { prefix: 'Estado de cita' });
    },
  });
};

// ==================== HOOK DE BÚSQUEDA CON DEBOUNCE ====================
export const useAppointmentSearch = (searchTerm: string, delay = 300) => {
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [searchTerm, delay]);
  
  return useAppointments({
    search: debouncedSearch,
    pageSize: 10,
  });
};
