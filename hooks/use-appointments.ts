// lib/hooks/use-appointments.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseISO, isValid, format } from 'date-fns';
import { toast } from 'sonner';

import { 
  Appointment, 
  ExtendedAppointment,
  AppointmentStatusEnum, 
  TimeString,
  NewAppointment 
} from '@/lib/types';

// Tipos
interface ApiAppointment {
  id: string;
  patient_id: string;
  doctor_id?: string | null;
  created_at?: string | null;
  fecha_hora_cita: string;
  motivo_cita?: string;
  estado_cita: string;
  notas_cita_seguimiento?: string | null;
  es_primera_vez?: boolean | null;
  doctor?: {
    full_name?: string;
  };
  // Datos del paciente que vienen directamente en la respuesta de la API
  nombre?: string;
  apellidos?: string;
  telefono?: string;
  email?: string;
}

// Funciones de transformación
const normalizeId = (id: string | number | null | undefined): string => {
  if (id === null || id === undefined) return '';
  return String(id).trim();
};

// Transformación del modelo de API al tipo centralizado ExtendedAppointment
const transformAppointment = (apiAppointment: ApiAppointment): ExtendedAppointment => {
  const appointmentId = normalizeId(apiAppointment.id);
  // Corrección: Usar el patient_id proporcionado por la API
  const patientId = normalizeId(apiAppointment.patient_id);

  const pacienteNombre = apiAppointment.nombre || '';
  const pacienteApellidos = apiAppointment.apellidos || '';
  const pacienteTelefono = apiAppointment.telefono || '';

  return {
    id: appointmentId,
    patient_id: patientId,
    doctor_id: normalizeId(apiAppointment.doctor_id),
    created_at: apiAppointment.created_at || null,
    fecha_hora_cita: apiAppointment.fecha_hora_cita || '',
    motivo_cita: apiAppointment.motivo_cita || 'Motivo no especificado',
    estado_cita: apiAppointment.estado_cita as typeof AppointmentStatusEnum[keyof typeof AppointmentStatusEnum] || AppointmentStatusEnum.PROGRAMADA,
    notas_cita_seguimiento: apiAppointment.notas_cita_seguimiento || null,
    es_primera_vez: apiAppointment.es_primera_vez || false,
    paciente: {
      id: patientId,
      nombre: pacienteNombre,
      apellidos: pacienteApellidos,
      telefono: pacienteTelefono,
      email: apiAppointment.email || ''
    },
    doctor: {
      full_name: apiAppointment.doctor?.full_name || ''
    }
  };
};

// Query Keys para citas, ahora con un nombre más coherente
export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (filters: { page?: number; pageSize?: number }) => 
    [...appointmentKeys.lists(), filters] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
};

// Hooks de React Query

/**
 * Hook para obtener una lista paginada de citas con datos del paciente.
 * El endpoint de API /api/patients devuelve estos datos enriquecidos.
 */
export const useAppointments = (page = 1, pageSize = 10) => {
  return useQuery<{ appointments: ExtendedAppointment[], pagination: any }>({  
    queryKey: appointmentKeys.list({ page, pageSize }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const response = await fetch(`/api/patients?${params}`);
      if (!response.ok) {
        throw new Error('Error al obtener las citas');
      }
      
      const data = await response.json();
      const appointments = data.data.map(transformAppointment);
      return {
        appointments,
        pagination: data.pagination
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 30 * 1000, // Refrescar cada 30 segundos
  });
};

/**
 * Hook para obtener una cita específica por su ID.
 */
export const useAppointment = (id: string | null) => {
  return useQuery<ExtendedAppointment | null>({  
    queryKey: appointmentKeys.detail(id!),
    queryFn: async () => {
      const response = await fetch(`/api/appointments/${id}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Error al obtener la cita');
      }
      const data = await response.json();
      return transformAppointment(data);
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: NewAppointment) => {
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
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.setQueryData(
        appointmentKeys.detail(newAppointment.id),
        newAppointment
      );
      toast.success('Cita agendada exitosamente');
    },
    onError: (error) => {
      toast.error('Error al agendar cita', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    },
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({    
    mutationFn: async (input: Partial<ExtendedAppointment> & { id: string }) => {
      const { id, ...updateData } = input;
      
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
      queryClient.setQueryData(
        appointmentKeys.detail(updatedAppointment.id),
        updatedAppointment
      );
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      
      if (updatedAppointment.patient_id) {
        queryClient.invalidateQueries({ 
          queryKey: ['patients', 'detail', updatedAppointment.patient_id] 
        });
      }
      
      toast.success('Cita actualizada exitosamente');
    },
    onError: (error) => {
      toast.error('Error al actualizar cita', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    },
  });
};

export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      appointmentId, 
      newStatus, 
      motivo, 
      nuevaFechaHora 
    }: { 
      appointmentId: string; 
      newStatus: typeof AppointmentStatusEnum[keyof typeof AppointmentStatusEnum]; 
      motivo?: string; 
      nuevaFechaHora?: string;
    }) => {
      const payload = {
        estado_cita: newStatus,
        // TODO: Reemplazar con el ID del usuario autenticado.
        // Ejemplo: actor_id: getCurrentUserId(),
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
    onSuccess: (updatedAppointment) => {
      queryClient.setQueryData(
        appointmentKeys.detail(updatedAppointment.id),
        updatedAppointment
      );
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      
      if (updatedAppointment.patient_id) {
        queryClient.invalidateQueries({ 
          queryKey: ['patients', 'detail', updatedAppointment.patient_id] 
        });
      }
      
      const statusMessages: Record<string, string> = {
        [AppointmentStatusEnum.PRESENTE]: 'Check-in registrado',
        [AppointmentStatusEnum.COMPLETADA]: 'Consulta completada',
        [AppointmentStatusEnum.CANCELADA]: 'Cita cancelada',
        [AppointmentStatusEnum.NO_ASISTIO]: 'Marcado como no asistió',
        [AppointmentStatusEnum.REAGENDADA]: 'Cita reagendada',
      };
      
      toast.success(statusMessages[updatedAppointment.estado_cita] || 'Estado actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar estado', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    },
  });
};
