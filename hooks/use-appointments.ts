// hooks/use-appointments.ts - Hooks optimizados para manejo de citas - REFACTORIZADO
import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { isMxToday } from '@/utils/datetime';
import { fetchJson } from '@/lib/http';
import { endpoints } from '@/lib/api-endpoints';
import { notifyError, notifySuccess } from '@/lib/client-errors';
import type { AppError } from '@/lib/errors';
 

// Importar tipos actualizados
import { AppointmentStatus, AppointmentWithPatient, PatientStatus, DiagnosisType } from '@/components/patient-admision/admision-types'
import { queryKeys } from '@/lib/query-keys';
import { AppointmentStatusEnum } from '@/lib/types';

// Patient hooks live exclusively in '@/hooks/use-patient' (no re-exports here)

// ==================== QUERY KEYS: usar lib/query-keys.ts ====================

// ==================== UTILIDADES DE TRANSFORMACIÓN ====================
const normalizeId = (id: string | number | null | undefined): string => {
  if (id === null || id === undefined) return '';
  return String(id).trim();
};

interface ApiAppointment {
  id: string;
  patient_id: string;
  doctor_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  fecha_hora_cita: string;
  motivos_consulta?: string[];
  estado_cita: string;
  notas_breves?: string | null;
  es_primera_vez?: boolean | null;
  doctor?: {
    id: string;
    full_name?: string;
  } | null;
  patients?: {
    id: string;
    nombre?: string;
    apellidos?: string;
    telefono?: string;
    email?: string;
    edad?: number | null;
    diagnostico_principal?: string;
    estado_paciente?: string;
    probabilidad_cirugia?: number | null;
  } | null;
}

const transformAppointment = (apiAppointment: ApiAppointment): AppointmentWithPatient => {
  const appointmentId = normalizeId(apiAppointment.id);
  const patientId = normalizeId(apiAppointment.patients?.id || apiAppointment.patient_id);

  return {
    id: appointmentId,
    patient_id: patientId,
    doctor_id: normalizeId(apiAppointment.doctor_id),
    agendado_por: null, // Use the actual database field name
    created_at: apiAppointment.created_at ?? null,
    updated_at: apiAppointment.updated_at ?? null,
    fecha_hora_cita: apiAppointment.fecha_hora_cita,
    duracion_minutos: 30, // Default duration from database schema
    motivos_consulta: (apiAppointment.motivos_consulta || []) as any,
    estado_cita: apiAppointment.estado_cita as AppointmentStatus,
    notas_breves: apiAppointment.notas_breves ?? null,
    es_primera_vez: apiAppointment.es_primera_vez || false,
    canal_agendamiento: null,
    decision_final: null,
    descripcion_motivos: null,
    diagnostico_final: null,
    fecha_agendamiento: null,
    hora_llegada: null,
    modification_count: 0,
    origen_cita: null,
    probabilidad_cirugia_inicial: null,
    proxima_cita_sugerida: null,
    puntualidad: null,
    slot: null,
    version: null,
    patients: apiAppointment.patients ? {
      id: patientId,
      nombre: apiAppointment.patients.nombre || '',
      apellidos: apiAppointment.patients.apellidos || '',
      telefono: apiAppointment.patients.telefono || undefined,
      email: apiAppointment.patients.email || undefined,
      edad: apiAppointment.patients.edad || undefined,
      diagnostico_principal: apiAppointment.patients.diagnostico_principal as DiagnosisType | undefined,
      estado_paciente: (apiAppointment.patients.estado_paciente as PatientStatus | undefined) ?? 'activo',
    } : {
      id: patientId,
      nombre: '',
      apellidos: '',
      telefono: undefined,
      email: undefined,
      edad: undefined,
      diagnostico_principal: undefined,
      estado_paciente: 'activo',
    },
  };
};

// ==================== TIPOS DE PARÁMETROS ====================

interface UpdateStatusParams {
  appointmentId: string;
  newStatus: AppointmentStatus;
  motivo?: string;
  nuevaFechaHora?: string;
}

interface CreateAppointmentParams {
  patient_id: string;
  fecha_hora_cita: string;
  motivos_consulta: string[];
  estado_cita?: AppointmentStatus;
  doctor_id?: string | null;
  notas_breves?: string;
  es_primera_vez?: boolean;
}

interface UpdateAppointmentParams {
  id: string;
  fecha_hora_cita?: string;
  motivos_consulta?: string[];
  estado_cita?: AppointmentStatus;
  notas_breves?: string;
  doctor_id?: string | null;
}

interface UpdateStatusContext {
  previousAppointment: AppointmentWithPatient | undefined;
  appointmentId: string;
}

// ==================== MUTACIONES OPTIMIZADAS ====================

export const useCreateAppointment = (
  options?: Omit<UseMutationOptions<AppointmentWithPatient, AppError, CreateAppointmentParams>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  
  return useMutation<AppointmentWithPatient, AppError, CreateAppointmentParams>({
    mutationFn: async (data) => {
      const created = await fetchJson<ApiAppointment>(endpoints.appointments.list(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return transformAppointment(created);
    },
    onSuccess: (newAppointment) => {
      // Invalidación simplificada y robusta basada en queryKeys centralizadas
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.clinic.data });

      notifySuccess('Cita agendada exitosamente');
    },
    onError: (error) => {
      notifyError(error, { prefix: 'Citas' });
    },
    meta: { suppressGlobalError: true },
    ...options,
  });
};

export const useUpdateAppointment = (
  options?: Omit<UseMutationOptions<AppointmentWithPatient, AppError, UpdateAppointmentParams>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  
  return useMutation<AppointmentWithPatient, AppError, UpdateAppointmentParams>({
    mutationFn: async ({ id, ...updateData }) => {
      const updated = await fetchJson<ApiAppointment>(endpoints.appointments.detail(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      return transformAppointment(updated);
    },
    onSuccess: (updatedAppointment) => {
      // Invalidación simplificada y robusta
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.clinic.data });
      
      // Actualización directa del caché
      queryClient.setQueryData(queryKeys.appointments.detail(updatedAppointment.id), updatedAppointment);
      
      notifySuccess('Cita actualizada exitosamente');
    },
    onError: (error) => {
      notifyError(error, { prefix: 'Citas' });
    },
    meta: { suppressGlobalError: true },
    ...options,
  });
};

export const useUpdateAppointmentStatus = (
  options?: Omit<UseMutationOptions<AppointmentWithPatient, AppError, UpdateStatusParams, UpdateStatusContext>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  
  return useMutation<AppointmentWithPatient, AppError, UpdateStatusParams, UpdateStatusContext>({
    mutationFn: async ({ appointmentId, newStatus, motivo, nuevaFechaHora }) => {
      const payload = {
        newStatus,
        motivo_cambio: motivo,
        nuevaFechaHora
      };
      
      const updated = await fetchJson<ApiAppointment>(endpoints.appointments.updateStatus(appointmentId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      return transformAppointment(updated);
    },
    onMutate: async ({ appointmentId }) => {
      // Snapshot previo para posibles rollbacks; sin actualizaciones optimistas multi-key
      const previousAppointment = queryClient.getQueryData<AppointmentWithPatient>(
        queryKeys.appointments.detail(appointmentId)
      );
      return { previousAppointment, appointmentId };
    },
    onSuccess: (updatedAppointment) => {
      // Actualizar caché local
      queryClient.setQueryData(
        queryKeys.appointments.detail(updatedAppointment.id), 
        updatedAppointment
      );
      
      // ✅ Invalidación inteligente basada en prefijos - evita cascadas excesivas
      // Solo invalidar las queries que realmente necesitan actualización
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.appointments.all,
        exact: false // Invalida appointments.all y sus derivados automáticamente
      });
      
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.clinic.data,
        exact: false // Invalida contexto global
      });
      
      // ✅ Invalidación específica solo para el paciente afectado
      if (updatedAppointment.patient_id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.patients.history(updatedAppointment.patient_id),
          exact: false 
        });
      }
      
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
    onError: (error, variables, context) => {
      // Rollback en caso de error
      if (context?.previousAppointment) {
        queryClient.setQueryData(
          queryKeys.appointments.detail(context.appointmentId), 
          context.previousAppointment
        );
      }
      
      notifyError(error, { prefix: 'Estado de cita' });
    },
    meta: { suppressGlobalError: true },
    ...options,
  });
};

// Note: patient hooks are not re-exported here; import directly from '@/hooks/use-patient'

// ==================== UTILIDADES ====================
const isToday = (dateString: string): boolean => {
  try {
    return isMxToday(dateString);
  } catch {
    return false;
  }
};

const isFuture = (dateString: string): boolean => {
  try {
    return new Date(dateString) > new Date();
  } catch {
    return false;
  }
};