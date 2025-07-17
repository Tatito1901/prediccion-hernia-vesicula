// hooks/use-appointments.ts - REFACTORED TO USE CENTRAL DATA PROVIDER
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseISO, isValid, format } from 'date-fns';
import { toast } from 'sonner';
import { useClinic } from '@/contexts/clinic-data-provider';

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
    id: string;
    full_name?: string;
  } | null;
  // El objeto 'patients' viene anidado desde la API, tal como lo define la consulta de Supabase
  patients?: {
    id: string;
    nombre?: string;
    apellidos?: string;
    telefono?: string;
    email?: string;
  } | null;
}

// Funciones de transformación
const normalizeId = (id: string | number | null | undefined): string => {
  if (id === null || id === undefined) return '';
  return String(id).trim();
};

// Transformación del modelo de API al tipo centralizado ExtendedAppointment
const transformAppointment = (apiAppointment: ApiAppointment): ExtendedAppointment => {
  const appointmentId = normalizeId(apiAppointment.id);
  // El ID del paciente se obtiene del objeto anidado 'patients' si existe, si no, del 'patient_id' de la cita
  const patientId = normalizeId(apiAppointment.patients?.id || apiAppointment.patient_id);

  // Se acceden a las propiedades anidadas de forma segura
  const pacienteNombre = apiAppointment.patients?.nombre || '';
  const pacienteApellidos = apiAppointment.patients?.apellidos || '';
  const pacienteTelefono = apiAppointment.patients?.telefono || '';
  const pacienteEmail = apiAppointment.patients?.email || '';

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
    // La propiedad debe llamarse 'patients' para ser consistente con use-chart-data.tsx
    patients: {
      id: patientId,
      nombre: pacienteNombre,
      apellidos: pacienteApellidos,
      telefono: pacienteTelefono,
      email: pacienteEmail
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
 * Hook refactorizado que actúa como selector - NO hace fetch, consume datos del contexto central.
 * Realiza paginación sobre los datos ya existentes en memoria.
 */
export const useAppointments = (page = 1, pageSize = 100) => {
  // 1. Consume los datos desde la fuente única de la verdad
  const { appointmentsWithPatientData, isLoading, error, refetch } = useClinic();

  // 2. Realiza la paginación sobre los datos ya existentes en memoria
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return appointmentsWithPatientData.slice(start, end);
  }, [appointmentsWithPatientData, page, pageSize]);
  
  const totalCount = appointmentsWithPatientData.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  // 3. Devuelve los datos en la misma estructura que antes para no romper los componentes
  return {
    data: {
      appointments: paginatedData as ExtendedAppointment[],
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasMore: page < totalPages
      }
    },
    isLoading, // Propaga el estado de carga del hook central
    error,
    refetchAppointments: refetch // Expone la función de refetch central
  };
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
      // Invalidamos la query central para refrescar toda la app
      queryClient.invalidateQueries({ queryKey: ['clinicData'] });
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
      // Invalidamos la query central para refrescar toda la app
      queryClient.invalidateQueries({ queryKey: ['clinicData'] });
      
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
      // Invalidamos la query central para refrescar toda la app
      queryClient.invalidateQueries({ queryKey: ['clinicData'] });
      
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

// Hook para admitir un paciente (crear paciente + cita en una sola operación)
export const useAdmitPatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (patientData: {
      nombre: string;
      apellidos: string;
      telefono: string;
      edad?: number | null;
      diagnostico_principal: string;
      comentarios_registro: string;
      fecha_hora_cita: string;
      motivo_cita: string;
    }) => {
      const response = await fetch('/api/patients/admit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al admitir paciente');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidamos la query central para refrescar toda la app
      queryClient.invalidateQueries({ queryKey: ['clinicData'] });
      toast.success('Paciente admitido exitosamente');
    },
    onError: (error) => {
      toast.error('Error al admitir paciente', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    },
  });
};

// Hook para obtener un paciente específico por su ID
export const usePatient = (id: string | null) => {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      if (!id) return null;
      
      const response = await fetch(`/api/patients/${id}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Error al obtener el paciente');
      }
      
      return response.json();
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// Hook para actualizar un paciente
export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updatedData }: { id: string; updatedData: any }) => {
      const response = await fetch(`/api/patients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al actualizar el paciente');
      }
      
      return response.json();
    },
    onSuccess: (updatedPatient, { id }) => {
      // Actualizar la query del paciente específico
      queryClient.setQueryData(['patient', id], updatedPatient);
      // Invalidar la query central para refrescar toda la app
      queryClient.invalidateQueries({ queryKey: ['clinicData'] });
      toast.success('Paciente actualizado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al actualizar paciente', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    },
  });
};

// Hook para obtener múltiples pacientes con filtros
export const usePatients = (page = 1, pageSize = 100, status?: string) => {
  return useQuery({
    queryKey: ['patients', page, pageSize, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      
      if (status) {
        params.append('estado', status);
      }
      
      const response = await fetch(`/api/patients?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Error al obtener los pacientes');
      }
      
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
