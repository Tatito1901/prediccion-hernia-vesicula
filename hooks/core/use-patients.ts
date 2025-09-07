// hooks/core/use-patients-unified.ts
// Hook unificado para todas las operaciones de pacientes
// Reemplaza: use-patient.ts, use-patient-survey.ts, y parte de use-clinic-data.ts

import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { endpoints, buildSearchParams } from '@/lib/api-endpoints';
import { queryFetcher, fetchJson } from '@/lib/http';
import { notifySuccess, notifyError } from '@/lib/client-errors';
import { toast } from 'sonner';
import type { 
  Patient, 
  EnrichedPatient,
  PatientStatus,
  PatientSurveyData,
  PaginatedResponse 
} from '@/lib/types';
import { PatientStatusEnum } from '@/lib/types';
import { dbDiagnosisToDisplay } from '@/lib/constants';
import type {
  AdmissionPayload,
  AdmissionDBResponse,
  PatientHistoryData,
} from '@/components/patient-admision/admision-types';

// ==================== TIPOS ====================
export interface PatientFilters {
  search?: string;
  status?: PatientStatus | 'all';
  dateFilter?: 'range';
  startDate?: string | null;
  endDate?: string | null;
  page?: number;
  pageSize?: number;
  hasAppointment?: boolean;
  hasSurvey?: boolean;
}

export interface PatientUpdateParams {
  id: string;
  updates: Partial<Patient>;
}

interface PatientHistoryOptions {
  includeHistory?: boolean;
  limit?: number;
  enabled?: boolean;
}

// ==================== FETCH FUNCTIONS ====================
const fetchPatients = async (filters: PatientFilters): Promise<PaginatedResponse<Patient> & {
  stats?: {
    totalPatients: number;
    surveyRate: number;
    pendingConsults: number;
    operatedPatients: number;
    statusStats: Record<string, number>;
  };
}> => {
  const params = buildSearchParams({
    search: filters.search,
    estado: filters.status !== 'all' ? filters.status : undefined,
    startDate: filters.startDate,
    endDate: filters.endDate,
    page: filters.page,
    pageSize: filters.pageSize,
    hasAppointment: filters.hasAppointment,
    hasSurvey: filters.hasSurvey,
  });

  const url = endpoints.patients.list(params);
  return await queryFetcher(url);
};

const fetchPatientDetail = async (id: string): Promise<Patient> => {
  const payload: any = await queryFetcher<any>(endpoints.patients.detail(id));
  return (payload && payload.success === true && 'data' in payload) ? payload.data : payload;
};

const fetchPatientHistory = async (
  patientId: string, 
  options?: PatientHistoryOptions
): Promise<PatientHistoryData> => {
  const params = buildSearchParams({
    includeHistory: options?.includeHistory,
    limit: options?.limit,
  });
  
  const url = endpoints.patients.history(patientId, params.toString() ? params : undefined);
  return await queryFetcher<PatientHistoryData>(url);
};

const fetchPatientSurvey = async (patientId: string): Promise<PatientSurveyData | null> => {
  try {
    const data = await queryFetcher<PatientSurveyData>(
      endpoints.surveys.byPatient(patientId)
    );
    return data;
  } catch (error: any) {
    // Handle 404 as no survey found
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
};

// ==================== TRANSFORMACIONES ====================
export const enrichPatient = (patient: Patient): EnrichedPatient => {
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

const enrichPatients = (patients: Patient[]): EnrichedPatient[] => 
  patients.map(enrichPatient);

// ==================== HOOK PRINCIPAL ====================
export const usePatients = (filters: PatientFilters = {}) => {
  const defaultFilters: PatientFilters = {
    status: 'all',
    page: 1,
    pageSize: 15,
    ...filters,
  };

  const queryKey = useMemo(
    () => queryKeys.patients.paginated({
      page: defaultFilters.page,
      pageSize: defaultFilters.pageSize,
      search: defaultFilters.search,
      status: defaultFilters.status === 'all' ? 'all' : (defaultFilters.status as string),
      startDate: defaultFilters.startDate || undefined,
      endDate: defaultFilters.endDate || undefined,
    }),
    [
      defaultFilters.page,
      defaultFilters.pageSize,
      defaultFilters.search,
      defaultFilters.status,
      defaultFilters.startDate,
      defaultFilters.endDate,
    ]
  );

  const query = useQuery({
    queryKey,
    queryFn: () => fetchPatients(defaultFilters),
    staleTime: 60_000,
    gcTime: 3 * 60_000,
  });

  // Enriquecer pacientes
  const enrichedPatients = useMemo(
    () => enrichPatients(query.data?.data || []),
    [query.data?.data]
  );

  // Estadísticas
  const stats = useMemo(() => {
    const data = query.data;
    if (!data) return null;

    const baseStats = data.stats || {
      totalPatients: data.data?.length || 0,
      surveyRate: 0,
      pendingConsults: 0,
      operatedPatients: 0,
      statusStats: {},
    };

    // Calcular estadísticas adicionales si no vienen del servidor
    if (!data.stats && data.data) {
      const patients = data.data;
      const withSurvey = patients.filter(p => 
        p.updated_at && p.created_at && p.updated_at !== p.created_at
      ).length;
      
      baseStats.surveyRate = patients.length > 0 
        ? (withSurvey / patients.length) * 100 
        : 0;

      // Contar por estado
      const statusCounts: Record<string, number> = {};
      patients.forEach(p => {
        const status = p.estado_paciente || PatientStatusEnum.ACTIVO;
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      baseStats.statusStats = statusCounts;
    }

    return baseStats;
  }, [query.data]);

  return {
    // Data
    patients: enrichedPatients,
    pagination: query.data?.pagination,
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

// ==================== HOOK PARA PACIENTES ACTIVOS ====================
export const useActivePatients = () => {
  return usePatients({
    status: PatientStatusEnum.ACTIVO,
    pageSize: 50,
  });
};

// ==================== HOOK PARA DETALLE ====================
export const usePatientDetail = (id: string | undefined, enabled = true) => {
  const query = useQuery<Patient, Error>({
    queryKey: id ? queryKeys.patients.detail(id) : ['patient-detail-undefined'],
    queryFn: () => fetchPatientDetail(id!),
    enabled: !!id && enabled,
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
  });

  // Enriquecer paciente individual
  const enrichedPatient = useMemo(
    () => query.data ? enrichPatient(query.data) : null,
    [query.data]
  );

  return {
    ...query,
    patient: enrichedPatient,
  };
};

// ==================== HOOK PARA HISTORIAL ====================
export const usePatientHistory = (
  patientId: string | undefined,
  options?: PatientHistoryOptions
) => {
  return useQuery<PatientHistoryData, Error>({
    queryKey: queryKeys.patients.historyWithOptions(patientId || '', options as unknown),
    queryFn: () => fetchPatientHistory(patientId!, options),
    enabled: !!patientId && (options?.enabled !== false),
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
  });
};

// ==================== HOOK PARA ENCUESTA ====================
export const usePatientSurvey = (patientId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.surveys.byPatient(patientId || ''),
    queryFn: () => fetchPatientSurvey(patientId!),
    enabled: !!patientId,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
};

// ==================== HOOK PARA PAGINACIÓN INFINITA ====================
export const usePatientsInfinite = (baseFilters: Omit<PatientFilters, 'page'> = {}) => {
  return useInfiniteQuery({
    queryKey: ['patients', 'infinite', baseFilters],
    queryFn: ({ pageParam = 1 }) => 
      fetchPatients({ ...baseFilters, page: pageParam }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination?.hasMore) return undefined;
      return (lastPage.pagination?.page || 0) + 1;
    },
    initialPageParam: 1,
    staleTime: 60_000,
  });
};

// ==================== MUTATIONS ====================
export const useAdmitPatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation<AdmissionDBResponse, Error, AdmissionPayload>({
    mutationFn: async (payload) => {
      const payloadResp: any = await fetchJson<any>(endpoints.admission.create(), {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      // Desempaquetar createApiResponse
      if (payloadResp && payloadResp.success === true && 'data' in payloadResp) {
        const data = payloadResp.data as any;
        return {
          ...data,
          message: payloadResp.message ?? data?.message ?? 'Admisión creada exitosamente',
        } as AdmissionDBResponse;
      }
      return payloadResp as AdmissionDBResponse;
    },
    onSuccess: (data, variables) => {
      toast.success('Admisión Exitosa', {
        description: `${variables.nombre} ${variables.apellidos} ha sido registrado correctamente.`,
        duration: 4000,
      });
      
      // Invalidaciones centralizadas e inteligentes
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.patients.all,
        exact: false,
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.appointments.all,
        exact: false,
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.dashboard.all,
        exact: false,
      });
    },
    onError: (error: any) => {
      const status = error?.status;
      const payload: any = error?.details ?? {};
      const code: string | undefined = typeof payload?.code === 'string' 
        ? (payload.code as string).toUpperCase() 
        : undefined;
      const validationErrors: Array<{ field: string; message: string; code: string }> | undefined = 
        Array.isArray(payload?.validation_errors) ? payload.validation_errors : undefined;
      const suggestedActions: string[] | undefined = 
        Array.isArray(payload?.suggested_actions) ? payload.suggested_actions : undefined;
      const existing = payload?.details?.existing_patient || payload?.existing_patient;
      const msg = error?.message || 'No se pudo completar el registro. Intente de nuevo.';

      const isValidation = error.category === 'validation' && !!validationErrors;
      const isDuplicatePhone = status === 400 && 
        (msg?.includes('patients_telefono_key') || /tel[eé]fono/i.test(msg));
      const isDuplicatePatient = status === 409 && (code === 'DUPLICATE_PATIENT');
      const isConflict = status === 409 && (code === 'SCHEDULE_CONFLICT');
      const isBusinessRule = status === 422;

      if (isDuplicatePatient) {
        const name = existing 
          ? `${existing.nombre ?? ''} ${existing.apellidos ?? ''}`.trim() 
          : '';
        toast.error('Paciente duplicado', {
          description: name
            ? `Ya existe un registro para ${name} con esa fecha de nacimiento.`
            : 'Ya existe un registro con mismo nombre, apellidos y fecha de nacimiento.',
          duration: 6000,
        });
        return;
      }

      if (isConflict) {
        const extra = suggestedActions && suggestedActions.length > 0
          ? `\nSugerencias: ${suggestedActions.join(', ')}`
          : '';
        toast.error('Conflicto de Horario', {
          description: `${msg}${extra}`,
          duration: 8000,
        });
        return;
      }

      if (isValidation || isDuplicatePhone || isBusinessRule) {
        const summary = validationErrors && validationErrors.length > 0
          ? validationErrors.map((e) => `${e.field}: ${e.message}`).join(', ')
          : msg;
        toast.error('Errores de validación', {
          description: summary,
          duration: 7000,
        });
        return;
      }

      toast.error('Error en la Admisión', {
        description: status ? `${msg} (Código: ${status})` : msg,
        duration: 6000,
      });
    },
    retry: (failureCount, error: any) => {
      if (error.category === 'validation' || error.status === 409) return false;
      return failureCount < 2;
    },
    retryDelay: (i) => Math.min(1000 * 2 ** i, 30000),
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation<Patient, Error, PatientUpdateParams>({
    mutationFn: async ({ id, updates }) => {
      const payload: any = await fetchJson<any>(endpoints.patients.update(id), {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      return (payload && payload.success === true && 'data' in payload) 
        ? payload.data 
        : payload;
    },
    onSuccess: (updated, variables) => {
      // Actualización directa del caché
      queryClient.setQueryData(
        queryKeys.patients.detail(variables.id),
        updated
      );
      
      // Invalidación inteligente
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.patients.all,
        exact: false,
      });
      
      notifySuccess('Paciente actualizado exitosamente');
    },
    onError: (error) => {
      notifyError(error, { prefix: 'Paciente' });
    },
  });
};
