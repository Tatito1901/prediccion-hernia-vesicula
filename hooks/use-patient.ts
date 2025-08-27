// hooks/use-patient.ts - Centraliza lógica de pacientes (detalle, historial, admisión, actualización)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import type { Patient } from '@/lib/types';
import type {
  AdmissionPayload,
  AdmissionDBResponse,
  PatientHistoryData,
} from '@/components/patient-admision/admision-types';

// ==================== API HELPERS ====================
async function fetchPatientDetail(id: string): Promise<Patient> {
  const res = await fetch(`/api/patients/${id}`);
  let payload: any = {};
  try {
    payload = await res.json();
  } catch {
    payload = {};
  }
  if (!res.ok) {
    const msg = payload?.error || payload?.message || 'Error al obtener el paciente';
    throw new Error(msg);
  }
  return (payload && payload.success === true && 'data' in payload) ? payload.data : payload;
}

interface PatientHistoryOptions {
  includeHistory?: boolean;
  limit?: number;
  enabled?: boolean;
}

async function fetchPatientHistory(patientId: string, options?: PatientHistoryOptions): Promise<PatientHistoryData> {
  const params = new URLSearchParams();
  if (options?.includeHistory) params.set('includeHistory', 'true');
  if (options?.limit) params.set('limit', String(options.limit));

  const res = await fetch(`/api/patients/${patientId}/history?${params}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Error al obtener historial del paciente');
  }
  return res.json();
}

async function postAdmission(payload: AdmissionPayload): Promise<AdmissionDBResponse> {
  let response: Response;
  
  try {
    response = await fetch('/api/patient-admission', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
    });
  } catch (networkError) {
    // ✅ Error de red separado
    throw new Error('Error de conexión. Verifica tu conexión a internet.', {
      cause: { type: 'network', originalError: networkError }
    });
  }
  
  // ✅ Intentar parsear respuesta SIEMPRE
  let data: any;
  try {
    data = await response.json();
  } catch (parseError) {
    if (!response.ok) {
      throw new Error(`Error del servidor (${response.status})`, {
        cause: { type: 'server', status: response.status }
      });
    }
    // Si la respuesta es ok pero no es JSON, continuar
    data = {};
  }
  
  if (!response.ok) {
    // ✅ Preservar TODA la información del error con contexto específico
    if (response.status === 400 && data.validation_errors) {
      const msg = data.validation_errors.map((e: any) => `${e.field}: ${e.message}`).join(', ');
      const error = new Error(`Errores de validación: ${msg}`) as any;
      error.status = response.status;
      error.data = data;
      error.validation_errors = data.validation_errors;
      throw error;
    }
    
    if (response.status === 409) {
      const conflict = data.error || 'Conflicto de horario';
      const suggestions = Array.isArray(data.suggested_times) && data.suggested_times.length > 0
        ? ` Horarios sugeridos: ${data.suggested_times.map((t: any) => t.time_formatted).join(', ')}`
        : '';
      const error = new Error(conflict + suggestions) as any;
      error.status = response.status;
      error.data = data;
      error.suggested_times = data.suggested_times;
      throw error;
    }
    
    // ✅ Casos específicos con información preservada
    const msg = data.error || data.message || `Error HTTP ${response.status}`;
    const error = new Error(msg) as any;
    error.status = response.status;
    error.data = data;
    error.validation_errors = data.validation_errors;
    error.suggested_times = data.suggested_times;
    throw error;
  }
  
  return data;
}

async function patchPatient({ id, updates }: { id: string; updates: Partial<Patient> }): Promise<Patient> {
  const res = await fetch(`/api/patients/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  let payload: any = {};
  try {
    payload = await res.json();
  } catch {
    payload = {};
  }
  if (!res.ok) {
    const msg = payload?.error || payload?.message || 'Error al actualizar paciente';
    throw new Error(msg);
  }
  return (payload && payload.success === true && 'data' in payload) ? payload.data : payload;
}

// ==================== QUERIES ====================
export const usePatient = (id: string | undefined, enabled: boolean = true) => {
  return useQuery<Patient, Error>({
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
  return useQuery<PatientHistoryData, Error>({
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
  return useMutation<AdmissionDBResponse, Error, AdmissionPayload>({
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
    onError: (error: any) => {
      // ✅ Acceso directo a propiedades del error mejorado
      const status = error?.status as number | undefined;
      const data = error?.data;
      const validationErrors = error?.validation_errors;
      const suggestedTimes = error?.suggested_times;
      const msg = error?.message || 'No se pudo completar el registro. Intente de nuevo.';

      // ✅ Detección más robusta de tipos de error
      const isValidation = status === 400 && Array.isArray(validationErrors);
      const isDuplicatePhone = status === 400 && (msg?.includes('patients_telefono_key') || /tel[eé]fono/i.test(msg));
      const isDuplicatePatient = status === 409 && (data?.code === 'duplicate_patient');
      const isConflict = status === 409;
      const isBusinessRule = status === 422;
      
      if (isValidation || isDuplicatePhone || isDuplicatePatient || isBusinessRule) {
        if (isDuplicatePatient) {
          const existing = data?.existing_patient;
          const name = existing ? `${existing.nombre ?? ''} ${existing.apellidos ?? ''}`.trim() : '';
          toast.error('Paciente duplicado', {
            description: name
              ? `Ya existe un registro para ${name} con esa fecha de nacimiento.`
              : 'Ya existe un registro con mismo nombre, apellidos y fecha de nacimiento.',
            duration: 6000,
          });
        } else if (isConflict && Array.isArray(suggestedTimes) && suggestedTimes.length > 0) {
          // ✅ Mostrar horarios sugeridos cuando hay conflicto
          toast.error('Conflicto de Horario', {
            description: `${msg}\nHorarios disponibles: ${suggestedTimes.map((t: any) => t.time_formatted || t).join(', ')}`,
            duration: 8000,
          });
        }
        return;
      }

      // ✅ Error general con más contexto
      toast.error('Error en la Admisión', {
        description: status ? `${msg} (Código: ${status})` : msg,
        duration: 6000,
      });
    },
    retry: (failureCount, error) => {
      if (error.message.includes('validación') || error.message.includes('Conflicto')) return false;
      return failureCount < 2;
    },
    retryDelay: (i) => Math.min(1000 * 2 ** i, 30000),
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  return useMutation<Patient, Error, { id: string; updates: Partial<Patient>}>({
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
