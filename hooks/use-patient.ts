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
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Error al obtener el paciente');
  }
  return res.json();
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
  const res = await fetch('/api/patient-admission', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    // Mensajes enriquecidos en caso de conflicto/validaciones
    if (res.status === 400 && data.validation_errors) {
      const msg = data.validation_errors.map((e: any) => `${e.field}: ${e.message}`).join(', ');
      throw new Error(`Errores de validación: ${msg}`);
    }
    if (res.status === 409) {
      const conflict = data.error || 'Conflicto de horario';
      const suggestions = Array.isArray(data.suggested_times) && data.suggested_times.length > 0
        ? ` Horarios sugeridos: ${data.suggested_times.map((t: any) => t.time_formatted).join(', ')}`
        : '';
      throw new Error(conflict + suggestions);
    }
    throw new Error(data.error || 'Error al procesar la admisión.');
  }
  return res.json();
}

async function patchPatient({ id, updates }: { id: string; updates: Partial<Patient> }): Promise<Patient> {
  const res = await fetch(`/api/patients/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Error al actualizar paciente');
  }
  return res.json();
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
    onError: (error) => {
      toast.error('Error en la Admisión', {
        description: error.message || 'No se pudo completar el registro. Intente de nuevo.',
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
