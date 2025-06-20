// lib/stores/appointmentStore.ts - Optimizado con React Query
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseISO, isValid, format } from 'date-fns';
import { toast } from 'sonner';

import { 
  AppointmentData, AppointmentStatusEnum,
  type TimeString
} from '@/app/dashboard/data-model';

// Tipos
interface ApiAppointment {
  id: string | number;
  patient_id: string | number;
  doctor_id?: string | number;
  fecha_hora_cita: string;
  motivo_cita?: string;
  estado_cita: string;
  notas_cita_seguimiento?: string | null;
  patients?: {
    nombre?: string;
    apellidos?: string;
    telefono?: string;
  };
  patient?: {
    nombre?: string;
    apellidos?: string;
    telefono?: string;
  };
  doctors?: {
    full_name?: string;
  };
  doctor?: {
    full_name?: string;
  };
}

export interface AddAppointmentInput {
  patientId: string;
  fecha_raw: string;
  hora_raw: string;
  estado: AppointmentStatusEnum;
  raw_doctor_id?: string | null;
  motivoConsulta: string;
  duracionEstimadaMin?: number;
  esPrimeraVez: boolean;
  tipoConsulta?: string;
  ubicacion?: string;
  recursosNecesarios?: string[];
  costo?: number;
  notas?: string;
}

export interface UpdateAppointmentInput {
  id: string;
  fecha_raw?: string;
  hora_raw?: string;
  estado?: AppointmentStatusEnum;
  motivoConsulta?: string;
  raw_doctor_id?: string;
  duracionEstimadaMin?: number;
  esPrimeraVez?: boolean;
  tipoConsulta?: string;
  ubicacion?: string;
  recursosNecesarios?: string[];
  costo?: number;
  notas?: string;
}

// Store UI simplificado
interface AppointmentUIStore {
  selectedAppointmentId: string | null;
  setSelectedAppointmentId: (id: string | null) => void;
}

export const useAppointmentUIStore = create<AppointmentUIStore>()(
  immer((set) => ({
    selectedAppointmentId: null,
    setSelectedAppointmentId: (id) => set((state) => {
      state.selectedAppointmentId = id;
    }),
  }))
);

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

const transformAppointmentData = (apiAppointment: ApiAppointment): AppointmentData => {
  const appointmentId = normalizeId(apiAppointment.id);
  const patientId = normalizeId(apiAppointment.patient_id);
  const parsedDateTime = safeParseDate(apiAppointment.fecha_hora_cita);
  
  const patientInfo = apiAppointment.patients || apiAppointment.patient;
  const doctorInfo = apiAppointment.doctors || apiAppointment.doctor;

  return {
    id: appointmentId,
    patientId: patientId,
    paciente: patientInfo?.nombre ? `${patientInfo.nombre} ${patientInfo.apellidos || ''}`.trim() : 'Paciente no especificado',
    telefono: patientInfo?.telefono || 'N/A',
    fechaConsulta: parsedDateTime || new Date(),
    horaConsulta: parsedDateTime ? format(parsedDateTime, 'HH:mm') as TimeString : '00:00',
    duracionEstimadaMin: 30,
    motivoConsulta: apiAppointment.motivo_cita || 'Motivo no especificado',
    tipoConsulta: 'Seguimiento',
    estado: apiAppointment.estado_cita as AppointmentStatusEnum || AppointmentStatusEnum.PROGRAMADA,
    notas: apiAppointment.notas_cita_seguimiento ?? undefined,
    ubicacion: 'Consultorio Principal',
    recursosNecesarios: [],
    esPrimeraVez: false,
    costo: 0,
    doctor: doctorInfo?.full_name || 'Doctor no asignado',
    raw_doctor_id: normalizeId(apiAppointment.doctor_id),
  } as AppointmentData;
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
export const useAppointments = (page = 1, pageSize = 10) => {
  return useQuery({
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
      return {
        appointments: data.data.map(transformAppointmentData),
        pagination: data.pagination
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 30 * 1000, // Refrescar cada 30 segundos
  });
};

export const useAppointment = (id: string | null) => {
  return useQuery({
    queryKey: appointmentKeys.detail(id!),
    queryFn: async () => {
      const response = await fetch(`/api/appointments/${id}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Error fetching appointment');
      }
      const data = await response.json();
      return transformAppointmentData(data);
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: AddAppointmentInput) => {
      const { fecha_raw, hora_raw, ...rest } = data;
      const payload = {
        patient_id: data.patientId,
        doctor_id: data.raw_doctor_id || null,
        fecha_hora_cita: `${fecha_raw}T${hora_raw}:00.000Z`,
        motivo_cita: data.motivoConsulta,
        estado_cita: data.estado,
        es_primera_vez: data.esPrimeraVez,
        notas_cita_seguimiento: data.notas || null
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
      return transformAppointmentData(responseData);
    },
    onSuccess: (newAppointment) => {
      // Invalidar todas las listas de citas
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      
      // Invalidar los pacientes para actualizar sus citas
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      
      // Agregar la nueva cita al cache
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
    mutationFn: async (input: UpdateAppointmentInput) => {
      const { id, fecha_raw, hora_raw, ...updateData } = input;
      
      const payload: Record<string, any> = { ...updateData };
      
      if (fecha_raw && hora_raw) {
        payload.fecha_hora_cita = `${fecha_raw}T${hora_raw}:00.000Z`;
      }
      
      if (updateData.raw_doctor_id !== undefined) {
        payload.doctor_id = updateData.raw_doctor_id;
        delete payload.raw_doctor_id;
      }
      
      if (updateData.motivoConsulta !== undefined) {
        payload.motivo_cita = updateData.motivoConsulta;
        delete payload.motivoConsulta;
      }
      
      if (updateData.notas !== undefined) {
        payload.notas_cita_seguimiento = updateData.notas;
        delete payload.notas;
      }
      
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
      return transformAppointmentData(responseData);
    },
    onSuccess: (updatedAppointment) => {
      // Actualizar el cache de la cita específica
      queryClient.setQueryData(
        appointmentKeys.detail(updatedAppointment.id),
        updatedAppointment
      );
      
      // Invalidar las listas para refrescarlas
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      
      // Invalidar pacientes relacionados
      if (updatedAppointment.patientId) {
        queryClient.invalidateQueries({ 
          queryKey: ['patients', 'detail', updatedAppointment.patientId] 
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
      newStatus: AppointmentStatusEnum; 
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
      return transformAppointmentData(responseData);
    },
    onSuccess: (updatedAppointment) => {
      // Actualizar el cache de la cita
      queryClient.setQueryData(
        appointmentKeys.detail(updatedAppointment.id),
        updatedAppointment
      );
      
      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      
      // Invalidar paciente relacionado
      if (updatedAppointment.patientId) {
        queryClient.invalidateQueries({ 
          queryKey: ['patients', 'detail', updatedAppointment.patientId] 
        });
      }
      
      const statusMessages = {
        [AppointmentStatusEnum.PRESENTE]: 'Check-in registrado',
        [AppointmentStatusEnum.COMPLETADA]: 'Consulta completada',
        [AppointmentStatusEnum.CANCELADA]: 'Cita cancelada',
        [AppointmentStatusEnum.NO_ASISTIO]: 'Marcado como no asistió',
        [AppointmentStatusEnum.REAGENDADA]: 'Cita reagendada',
      };
      
      toast.success(statusMessages[updatedAppointment.estado] || 'Estado actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar estado', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    },
  });
};

// Store wrapper para mantener compatibilidad
interface AppointmentStore {
  appointments: AppointmentData[];
  isLoading: boolean;
  error: Error | null;
  lastFetched: number | null;
  isStale: boolean;
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  fetchAppointments: (force?: boolean) => Promise<void>;
  loadMoreAppointments: () => Promise<void>;
  addAppointment: (data: AddAppointmentInput) => Promise<AppointmentData>;
  updateAppointment: (input: UpdateAppointmentInput) => Promise<AppointmentData>;
  updateAppointmentStatus: (appointmentId: string, newStatus: AppointmentStatusEnum, motivo?: string, nuevaFechaHora?: string) => Promise<AppointmentData>;
}

export const useAppointmentStore = create<AppointmentStore>(() => ({
  appointments: [],
  isLoading: false,
  error: null,
  lastFetched: null,
  isStale: true,
  pagination: {
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
    hasMore: false
  },
  
  fetchAppointments: async () => {
    console.warn('fetchAppointments is deprecated. Use useAppointments hook instead');
  },
  
  loadMoreAppointments: async () => {
    console.warn('loadMoreAppointments is deprecated. Use useAppointments hook with pagination');
  },
  
  addAppointment: async (data) => {
    console.warn('addAppointment is deprecated. Use useCreateAppointment hook instead');
    throw new Error('Use useCreateAppointment hook instead');
  },
  
  updateAppointment: async (input) => {
    console.warn('updateAppointment is deprecated. Use useUpdateAppointment hook instead');
    throw new Error('Use useUpdateAppointment hook instead');
  },
  
  updateAppointmentStatus: async () => {
    console.warn('updateAppointmentStatus is deprecated. Use useUpdateAppointmentStatus hook instead');
    throw new Error('Use useUpdateAppointmentStatus hook instead');
  },
}));