// lib/hooks/use-appointments.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { parseISO, isValid, format } from 'date-fns';
import { toast } from 'sonner';
import { useState } from 'react';

import { 
  ID, 
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
  // La API de Supabase devuelve la relación bajo la clave 'patients' (plural)
  patients?: {
    id: string;
    nombre?: string;
    apellidos?: string;
    telefono?: string;
    email?: string;
  };
}

// Las interfaces AddAppointmentInput y UpdateAppointmentInput han sido reemplazadas
// por los tipos centralizados NewAppointment y Appointment de lib/types

// Funciones de transformación
const normalizeId = (id: string | number | null | undefined): string => {
  if (id === null || id === undefined) return '';
  return String(id).trim();
};

const safeParseDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
};

const extractTimeFromDate = (date: Date | null): TimeString | null => {
  if (!date) return null;
  return format(date, 'HH:mm') as TimeString;
};

// Transformación del modelo de API al tipo centralizado ExtendedAppointment
const transformAppointment = (apiAppointment: ApiAppointment): ExtendedAppointment => {
  const appointmentId = normalizeId(apiAppointment.id);
  const patientId = normalizeId(apiAppointment.patient_id);
  
  // Datos del paciente - Supabase devuelve 'patients' (plural)
  const patientInfo = apiAppointment.patients || {
    id: '',
    nombre: '',
    apellidos: '',
    telefono: '',
    email: ''
  };
  
  const pacienteNombre = patientInfo.nombre || '';
  const pacienteApellidos = patientInfo.apellidos || '';
  const pacienteTelefono = patientInfo.telefono || '';

  // Datos del doctor
  const doctorInfo = apiAppointment.doctor || {
    full_name: ''
  };
  
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
    // Datos enriquecidos que no son parte del modelo básico de Appointment
    paciente: {
      id: patientId,
      nombre: pacienteNombre,
      apellidos: pacienteApellidos,
      telefono: pacienteTelefono,
      email: patientInfo.email || ''
    },
    doctor: {
      full_name: doctorInfo.full_name || ''
    }
  };
};



// Query Keys
export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (filters: { page?: number; pageSize?: number }) => 
    [...appointmentKeys.lists(), filters] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
  history: (id: string) => [...appointmentKeys.all, 'history', id] as const,
};

// Hooks de React Query
// Devuelve las citas en el formato ExtendedAppointment
export const useAppointments = (page = 1, pageSize = 10) => {
  return useQuery<{ appointments: ExtendedAppointment[], pagination: any }>({  
    queryKey: appointmentKeys.list({ page, pageSize }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const response = await fetch(`/api/appointments?${params}`);
      if (!response.ok) {
        throw new Error('Error fetching appointments');
      }
      
      const data = await response.json();
      // Primero transformamos al modelo centralizado
      const appointments = data.data.map(transformAppointment);
      return {
        appointments, // Devolvemos directamente los objetos tipo Appointment
        pagination: data.pagination
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 30 * 1000, // Refrescar cada 30 segundos
  });
};

// Devuelve una cita específica en el formato ExtendedAppointment
export const useAppointment = (id: string | null) => {
  return useQuery<ExtendedAppointment | null>({  
    queryKey: appointmentKeys.detail(id!),
    queryFn: async () => {
      const response = await fetch(`/api/appointments/${id}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Error fetching appointment');
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
      // NewAppointment ya utiliza snake_case y tiene todos los campos necesarios
      // Solo necesitamos asegurarnos de que fecha_hora_cita tiene el formato correcto
      const payload = {
        ...data,
        // Asegurar que otros campos sean consistentes con la API
      };
      
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error creating appointment');
      }
      
      const responseData = await response.json();
      return transformAppointment(responseData);
    },
    onSuccess: (newAppointment) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      
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
      
      // Usamos directamente los datos de actualización sin transformaciones adicionales
      // ya que estamos trabajando con el tipo Partial<ExtendedAppointment> que ya tiene la estructura correcta
      const payload = { ...updateData };
      
      // Nota: El tipo ExtendedAppointment ya define fecha_hora_cita como string, por lo que
      // Nota: El tipo Appointment ya define fecha_hora_cita como string, por lo que
      // no es necesario realizar conversiones de tipo aquí
      
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error updating appointment');
      }
      
      const responseData = await response.json();
      return transformAppointment(responseData);
    },
    onSuccess: (updatedAppointment) => {
      // Actualizar la caché de la cita específica
      queryClient.setQueryData(
        appointmentKeys.detail(updatedAppointment.id),
        updatedAppointment
      );
      
      // Invalidar las listas de citas para forzar una recarga
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      
      // Invalidar los datos del paciente asociado si existe un ID de paciente
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
        actor_id: '5e4d29a2-5eec-49ee-ac0f-8d349d5660ed', // TODO: Obtener del usuario actual
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
        throw new Error(error.message || 'Error updating appointment status');
      }
      
      const responseData = await response.json();
      return transformAppointment(responseData);
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
