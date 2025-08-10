// hooks/use-appointments.ts - Hooks optimizados para manejo de citas
import { useMutation, useQuery, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
 

// Importar tipos actualizados
import { AppointmentStatus, AppointmentWithPatient, PatientStatus, DiagnosisType } from '@/components/patient-admision/admision-types'
import { queryKeys } from '@/lib/query-keys';

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
    created_at: apiAppointment.created_at || undefined,
    updated_at: apiAppointment.updated_at || undefined,
    fecha_hora_cita: apiAppointment.fecha_hora_cita,
    motivos_consulta: apiAppointment.motivos_consulta || [],
    estado_cita: apiAppointment.estado_cita as AppointmentStatus,
    notas_breves: apiAppointment.notas_breves || undefined,
    es_primera_vez: apiAppointment.es_primera_vez || false,
    patients: apiAppointment.patients ? {
      id: patientId,
      nombre: apiAppointment.patients.nombre || '',
      apellidos: apiAppointment.patients.apellidos || '',
      telefono: apiAppointment.patients.telefono || undefined,
      email: apiAppointment.patients.email || undefined,
      edad: apiAppointment.patients.edad || undefined,
      diagnostico_principal: apiAppointment.patients.diagnostico_principal as DiagnosisType | undefined,
      estado_paciente: apiAppointment.patients.estado_paciente as PatientStatus | undefined,
    } : {
      id: patientId,
      nombre: '',
      apellidos: '',
      telefono: undefined,
      email: undefined,
      edad: undefined,
      diagnostico_principal: undefined,
      estado_paciente: undefined,
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

// ==================== HOOKS OPTIMIZADOS ====================

// Hook para obtener una cita específica
export const useAppointment = (
  id: string | null,
  options?: Omit<UseQueryOptions<AppointmentWithPatient, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<AppointmentWithPatient, Error>({
    queryKey: queryKeys.appointments.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('ID de cita requerido');
      
      const response = await fetch(`/api/appointments/${id}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Error al obtener la cita');
      }
      
      return transformAppointment(await response.json());
    },
    enabled: !!id,
    staleTime: 30 * 1000, // 30 segundos
    ...options,
  });
};

// Hook para obtener citas de hoy
export const useTodayAppointments = (
  options?: Omit<UseQueryOptions<AppointmentWithPatient[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<AppointmentWithPatient[], Error>({
    queryKey: queryKeys.appointments.today,
    queryFn: async () => {
      const response = await fetch('/api/appointments?dateFilter=today');
      if (!response.ok) {
        throw new Error('Error al obtener citas de hoy');
      }
      
      const data = await response.json();
      const appointments = data.data || data;
      return appointments.map(transformAppointment);
    },
    staleTime: 60 * 1000, // 1 minuto
    refetchInterval: 5 * 60 * 1000, // Refrescar cada 5 minutos
    ...options,
  });
};

// Hook para obtener citas por fecha específica (YYYY-MM-DD)
export const useAppointmentsByDate = (
  dateISO: string | undefined,
  options?: Omit<UseQueryOptions<AppointmentWithPatient[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<AppointmentWithPatient[], Error>({
    queryKey: queryKeys.appointments.byDate(dateISO || ''),
    queryFn: async () => {
      if (!dateISO) return [];
      const response = await fetch(`/api/appointments?onDate=${encodeURIComponent(dateISO)}`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Error al obtener citas por fecha');
      }
      const data = await response.json();
      const appointments = data.data || data;
      return appointments.map(transformAppointment);
    },
    enabled: !!dateISO,
    staleTime: 60 * 1000,
    ...options,
  });
};

// ==================== MUTACIONES OPTIMIZADAS ====================

export const useCreateAppointment = (
  options?: Omit<UseMutationOptions<AppointmentWithPatient, Error, CreateAppointmentParams>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  
  return useMutation<AppointmentWithPatient, Error, CreateAppointmentParams>({
    mutationFn: async (data) => {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al crear la cita');
      }
      
      return transformAppointment(await response.json());
    },
    onSuccess: (newAppointment) => {
      // Invalidación simplificada y robusta basada en queryKeys centralizadas
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.clinic.data });

      toast.success('Cita agendada exitosamente');
    },
    onError: (error) => {
      toast.error('Error al agendar cita', {
        description: error.message
      });
    },
    ...options,
  });
};

export const useUpdateAppointment = (
  options?: Omit<UseMutationOptions<AppointmentWithPatient, Error, UpdateAppointmentParams>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  
  return useMutation<AppointmentWithPatient, Error, UpdateAppointmentParams>({
    mutationFn: async ({ id, ...updateData }) => {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al actualizar la cita');
      }
      
      return transformAppointment(await response.json());
    },
    onSuccess: (updatedAppointment) => {
      // Invalidación simplificada y robusta
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.clinic.data });
      
      // Actualización directa del caché
      queryClient.setQueryData(queryKeys.appointments.detail(updatedAppointment.id), updatedAppointment);
      
      toast.success('Cita actualizada exitosamente');
    },
    onError: (error) => {
      toast.error('Error al actualizar cita', {
        description: error.message
      });
    },
    ...options,
  });
};

export const useUpdateAppointmentStatus = (
  options?: Omit<UseMutationOptions<AppointmentWithPatient, Error, UpdateStatusParams, UpdateStatusContext>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  
  return useMutation<AppointmentWithPatient, Error, UpdateStatusParams, UpdateStatusContext>({
    mutationFn: async ({ appointmentId, newStatus, motivo, nuevaFechaHora }) => {
      const payload = {
        newStatus,
        motivo_cambio: motivo,
        nuevaFechaHora
      };
      
      const response = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al actualizar el estado de la cita');
      }
      
      return transformAppointment(await response.json());
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
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.clinic.data });
      
      const statusMessages: Record<AppointmentStatus, string> = {
        'PROGRAMADA': 'Cita programada',
        'CONFIRMADA': 'Cita confirmada',
        'PRESENTE': 'Check-in registrado',
        'EN_CONSULTA': 'En consulta',
        'COMPLETADA': 'Consulta completada',
        'CANCELADA': 'Cita cancelada',
        'NO_ASISTIO': 'Marcado como no asistió',
        'REAGENDADA': 'Cita reagendada',
      };
      
      toast.success(statusMessages[updatedAppointment.estado_cita] || 'Estado actualizado');
    },
    onError: (error, variables, context) => {
      // Rollback en caso de error
      if (context?.previousAppointment) {
        queryClient.setQueryData(
          queryKeys.appointments.detail(context.appointmentId), 
          context.previousAppointment
        );
      }
      
      toast.error('Error al actualizar estado', {
        description: error.message
      });
    },
    ...options,
  });
};

// Hook optimizado para admitir pacientes
export const useAdmitPatient = (
  options?: Omit<UseMutationOptions<any, Error, any>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, any>({
    mutationFn: async (patientAndAppointmentData) => {
      const response = await fetch('/api/patient-admission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientAndAppointmentData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al admitir paciente');
      }

      return response.json();
    },
    onSuccess: async (result) => {
      // Invalidación simplificada y suficiente
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.patients.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.clinic.data }),
      ]);

      toast.success('Paciente admitido exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error admitting patient:', error);
      toast.error(error.message || 'Error al admitir paciente');
    },
    ...options,
  });
};

// Hook para actualizar datos de pacientes
export const useUpdatePatient = (
  options?: Omit<UseMutationOptions<any, Error, { id: string; updates: any }>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { id: string; updates: any }>({
    mutationFn: async (data) => {
      const response = await fetch(`/api/patients/${data.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data.updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al actualizar paciente');
      }

      return response.json();
    },
    onSuccess: (updatedPatient, variables) => {
      // Invalidación específica
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.clinic.data });
      
      toast.success('Paciente actualizado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error updating patient:', error);
      toast.error(error.message || 'Error al actualizar paciente');
    },
    ...options,
  });
};

// ==================== UTILIDADES ====================
const isToday = (dateString: string): boolean => {
  try {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
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