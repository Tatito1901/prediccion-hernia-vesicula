// hooks/use-appointments.ts - Hooks optimizados para manejo de citas
import { useMutation, useQuery, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { parseISO, isValid, format } from 'date-fns';
import { toast } from 'sonner';
import { 
  Appointment,
  ExtendedAppointment, 
  AppointmentStatusEnum,
  TimeString,
  NewAppointment
} from '@/lib/types';
import { 
  useSmartAppointmentInvalidation,
  CACHE_KEYS 
} from '@/lib/cache-invalidation';

// Importar tipos actualizados
import { AppointmentStatus, AppointmentWithPatient } from '@/components/patient-admission/types'

// ==================== QUERY KEYS GRANULARES ====================
export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (filters: { page?: number; pageSize?: number }) => 
    [...appointmentKeys.lists(), { filters }] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
  today: () => [...appointmentKeys.all, 'today'] as const,
  byStatus: (status: string) => [...appointmentKeys.all, 'status', status] as const,
  byPatient: (patientId: string) => [...appointmentKeys.all, 'patient', patientId] as const,
  summary: () => [...appointmentKeys.all, 'summary'] as const,
  byDate: (date: string) => [...appointmentKeys.all, 'date', date] as const,
  upcoming: () => [...appointmentKeys.all, 'upcoming'] as const,
  past: () => [...appointmentKeys.all, 'past'] as const,
};

export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (filters: any) => [...patientKeys.lists(), { filters }] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
  stats: () => [...patientKeys.all, 'stats'] as const,
  active: () => [...patientKeys.all, 'active'] as const,
  withAppointments: (patientId: string) => [...patientKeys.detail(patientId), 'appointments'] as const,
};

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
      diagnostico_principal: apiAppointment.patients.diagnostico_principal || undefined,
      estado_paciente: apiAppointment.patients.estado_paciente || undefined,
      probabilidad_cirugia: apiAppointment.patients.probabilidad_cirugia || undefined,
    } : null,
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
    queryKey: appointmentKeys.detail(id || ''),
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
    queryKey: appointmentKeys.today(),
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
      // Invalidación granular inteligente
      queryClient.invalidateQueries({ queryKey: appointmentKeys.today() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.summary() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.byStatus(newAppointment.estado_cita) });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.byPatient(newAppointment.patient_id) });
      queryClient.invalidateQueries({ queryKey: ['clinicData'] });
      
      // Actualización optimista del caché
      queryClient.setQueryData<AppointmentWithPatient[]>(
        appointmentKeys.today(), 
        (oldData) => {
          if (!oldData) return [newAppointment];
          if (isToday(newAppointment.fecha_hora_cita)) {
            return [...oldData, newAppointment].sort((a, b) => 
              new Date(a.fecha_hora_cita).getTime() - new Date(b.fecha_hora_cita).getTime()
            );
          }
          return oldData;
        }
      );
      
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
      // Invalidación granular específica
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(updatedAppointment.id) });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.today() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.byPatient(updatedAppointment.patient_id) });
      queryClient.invalidateQueries({ queryKey: ['clinicData'] });
      
      // Actualización directa del caché
      queryClient.setQueryData(appointmentKeys.detail(updatedAppointment.id), updatedAppointment);
      
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
  const smartInvalidation = useSmartAppointmentInvalidation(queryClient);
  
  return useMutation<AppointmentWithPatient, Error, UpdateStatusParams, UpdateStatusContext>({
    mutationFn: async ({ appointmentId, newStatus, motivo, nuevaFechaHora }) => {
      const payload = {
        estado_cita: newStatus,
        motivo_cambio: motivo,
        fecha_hora_cita: nuevaFechaHora
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
    onMutate: async ({ appointmentId, newStatus }) => {
      // Obtener estado anterior para el contexto
      const previousAppointment = queryClient.getQueryData<AppointmentWithPatient>(
        appointmentKeys.detail(appointmentId)
      );
      
      const oldStatus = previousAppointment?.estado_cita;
      const patientId = previousAppointment?.patient_id;
      const appointmentDate = previousAppointment?.fecha_hora_cita?.split('T')[0];
      
      // Ejecutar invalidación quirúrgica
      await smartInvalidation.onStatusUpdate({
        appointmentId,
        oldStatus,
        newStatus,
        patientId,
        appointmentDate
      });
      
      return { previousAppointment, appointmentId };
    },
    onSuccess: (updatedAppointment) => {
      // Actualizar caché local
      queryClient.setQueryData(
        appointmentKeys.detail(updatedAppointment.id), 
        updatedAppointment
      );
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.invalidateQueries({ queryKey: ['clinicData'] });
      
      const statusMessages: Record<AppointmentStatus, string> = {
        'PROGRAMADA': 'Cita programada',
        'CONFIRMADA': 'Cita confirmada',
        'PRESENTE': 'Check-in registrado',
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
          appointmentKeys.detail(context.appointmentId), 
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
      // Invalidación universal optimizada
      const keysToInvalidate = [
        patientKeys.all,
        patientKeys.active(),
        appointmentKeys.all,
        appointmentKeys.today(),
        appointmentKeys.upcoming(),
        ['clinicData'],
        ['dashboard'],
        ['trends'],
      ];
      
      // Invalidar todas las keys en paralelo
      await Promise.all(
        keysToInvalidate.map(key => 
          queryClient.invalidateQueries({ queryKey: key })
        )
      );
      
      // Invalidación con predicado para queries dinámicas
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const keyString = JSON.stringify(query.queryKey).toLowerCase();
          return (
            keyString.includes('patient') ||
            keyString.includes('appointment') ||
            keyString.includes('clinic') ||
            keyString.includes('dashboard')
          );
        }
      });
      
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
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['clinicData'] });
      
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

// ==================== EXPORTS ADICIONALES ====================
export { appointmentKeys as queryKeys };