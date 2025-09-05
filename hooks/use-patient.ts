// hooks/use-patient.ts - Centraliza lógica de pacientes (detalle, historial, admisión, actualización)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { endpoints, buildSearchParams } from '@/lib/api-endpoints';
import { fetchJson, queryFetcher } from '@/lib/http';
import type { AppError } from '@/lib/errors';
import { toUserMessage } from '@/lib/errors';
import type { Patient } from '@/lib/types';
import type {
  AdmissionPayload,
  AdmissionDBResponse,
  PatientHistoryData,
} from '@/components/patient-admision/admision-types';

// ==================== API HELPERS ====================
interface PatientHistoryOptions {
  includeHistory?: boolean;
  limit?: number;
  enabled?: boolean;
}

async function fetchPatientDetail(id: string): Promise<Patient> {
  const payload: any = await queryFetcher<any>(endpoints.patients.detail(id));
  return (payload && payload.success === true && 'data' in payload) ? payload.data : payload;
}

async function fetchPatientHistory(patientId: string, options?: PatientHistoryOptions): Promise<PatientHistoryData> {
  const params = buildSearchParams({
    includeHistory: options?.includeHistory,
    limit: options?.limit,
  });
  
  const url = endpoints.patients.history(patientId, params.toString() ? params : undefined);
  return await queryFetcher<PatientHistoryData>(url);
}

async function postAdmission(payload: AdmissionPayload): Promise<AdmissionDBResponse> {
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
}

async function patchPatient({ id, updates }: { id: string; updates: Partial<Patient> }): Promise<Patient> {
  const payload: any = await fetchJson<any>(endpoints.patients.update(id), {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return (payload && payload.success === true && 'data' in payload) ? payload.data : payload;
}

// ==================== QUERIES ====================
export const usePatient = (id: string | undefined, enabled: boolean = true) => {
  return useQuery<Patient, AppError>({
    queryKey: id ? queryKeys.patients.detail(id) : queryKeys.patients.detail('undefined'),
    queryFn: () => fetchPatientDetail(id as string),
    enabled: !!id && enabled,
    staleTime: 2 * 60 * 1000,
  });
};

export const usePatientHistory = (
  patientId: string,
  options?: PatientHistoryOptions
) => {
  return useQuery<PatientHistoryData, AppError>({
    queryKey: queryKeys.patients.historyWithOptions(patientId, options as unknown),
    queryFn: () => fetchPatientHistory(patientId, options),
    enabled: !!patientId && (options?.enabled !== false),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// ==================== MUTATIONS ====================
export const useAdmitPatient = () => {
  const queryClient = useQueryClient();
  return useMutation<AdmissionDBResponse, AppError, AdmissionPayload>({
    mutationFn: postAdmission,
    onSuccess: (data, variables) => {
      toast.success('Admisión Exitosa', {
        description: `${variables.nombre} ${variables.apellidos} ha sido registrado correctamente.`,
        duration: 4000,
      });
      // Invalidaciones centralizadas
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.clinic.data });
    },
    onError: (error) => {
      const status = error?.status;
      const payload: any = (error?.details as any) ?? {};
      const code: string | undefined = typeof payload?.code === 'string' ? (payload.code as string).toUpperCase() : undefined;
      const validationErrors: Array<{ field: string; message: string; code: string }>|undefined = Array.isArray(payload?.validation_errors) ? payload.validation_errors : undefined;
      const suggestedActions: string[] | undefined = Array.isArray(payload?.suggested_actions) ? payload.suggested_actions : undefined;
      const existing = payload?.details?.existing_patient || payload?.existing_patient;
      const msg = error?.message || 'No se pudo completar el registro. Intente de nuevo.';

      const isValidation = error.category === 'validation' && !!validationErrors;
      const isDuplicatePhone = status === 400 && (msg?.includes('patients_telefono_key') || /tel[eé]fono/i.test(msg));
      const isDuplicatePatient = status === 409 && (code === 'DUPLICATE_PATIENT');
      const isConflict = status === 409 && (code === 'SCHEDULE_CONFLICT');
      const isBusinessRule = status === 422;

      if (isDuplicatePatient) {
        const name = existing ? `${existing.nombre ?? ''} ${existing.apellidos ?? ''}`.trim() : '';
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
        description: status ? `${toUserMessage(error)} (Código: ${status})` : toUserMessage(error),
        duration: 6000,
      });
    },
    retry: (failureCount, error) => {
      if (error.category === 'validation' || error.status === 409) return false;
      return failureCount < 2;
    },
    retryDelay: (i) => Math.min(1000 * 2 ** i, 30000),
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  return useMutation<Patient, AppError, { id: string; updates: Partial<Patient>}>({
    mutationFn: patchPatient,
    onSuccess: (updated, variables) => {
      toast.success('Paciente actualizado exitosamente');
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.clinic.data });
    },
    onError: (error) => {
      toast.error(error.message || 'Error al actualizar paciente');
    }
  });
};
