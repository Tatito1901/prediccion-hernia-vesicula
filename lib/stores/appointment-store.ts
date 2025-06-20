// lib/stores/appointmentStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { parseISO, isValid, format } from 'date-fns';

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
  // Manejar ambas posibles estructuras que podría devolver Supabase
  patients?: {
    nombre?: string;
    apellidos?: string;
    telefono?: string;
  };
  // A veces Supabase puede devolverlo en singular
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

export interface AppointmentHistoryItem {
  id: string;
  event_type: string;
  timestamp: string;
  changed_by_user_id?: string;
  details: Record<string, any>;
}

export interface AddAppointmentInput {
  patientId: string;
  fecha_raw: string; // YYYY-MM-DD
  hora_raw: string; // HH:MM
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

// Funciones auxiliares
const normalizeId = (id: string | number | null | undefined): string => {
  if (id === null || id === undefined) return '';
  const stringId = String(id);
  return stringId.trim();
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

const fetchWithRetry = async (
  input: RequestInfo,
  init: RequestInit = {},
  retries = 2
): Promise<Response> => {
  let lastError: Error = new Error('Fetch failed due to unknown reasons.');
  const FETCH_TIMEOUT_MS = 10000;
  const BASE_RETRY_DELAY_MS = 1000;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      lastError = new Error(`Server error: ${response.status} ${response.statusText}`);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        lastError = error;
        if (controller.signal.aborted && !lastError.message.includes('timed out')) {
           lastError = new Error(`Request timed out after ${FETCH_TIMEOUT_MS / 1000}s on attempt ${attempt + 1}. Original error: ${lastError.message}`);
        }
      } else {
        lastError = new Error(String(error) || 'Network request failed');
      }
    }
    
    if (attempt === retries) break;

    const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt) + Math.random() * (BASE_RETRY_DELAY_MS / 2);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  throw lastError;
};

// Función para transformar los datos de la API a nuestro modelo AppointmentData
const transformAppointmentData = (apiAppointment: ApiAppointment): AppointmentData => {
  const appointmentId = normalizeId(apiAppointment.id);
  const patientId = normalizeId(apiAppointment.patient_id);
  const parsedDateTime = safeParseDate(apiAppointment.fecha_hora_cita);

  // Determinar el nombre del paciente y del doctor
  const patientInfo = apiAppointment.patients || apiAppointment.patient;
  const doctorInfo = apiAppointment.doctors || apiAppointment.doctor;

  return {
    id: appointmentId,
    patientId: patientId,
    paciente: patientInfo?.nombre ? `${patientInfo.nombre} ${patientInfo.apellidos || ''}`.trim() : 'Paciente no especificado',
    telefonoPaciente: patientInfo?.telefono || 'N/A',
    fechaConsulta: parsedDateTime || new Date(), // Usar fecha actual como fallback si es inválida
    horaConsulta: parsedDateTime ? format(parsedDateTime, 'HH:mm') as TimeString : '00:00', // Formato HH:MM
    duracionEstimadaMin: 30, // Placeholder
    motivoConsulta: apiAppointment.motivo_cita || 'Motivo no especificado',
    tipoConsulta: 'Seguimiento', // Placeholder, determinar según lógica de negocio
    estado: apiAppointment.estado_cita as AppointmentStatusEnum || AppointmentStatusEnum.PROGRAMADA,
    notas: apiAppointment.notas_cita_seguimiento ?? undefined,
    ubicacion: 'Consultorio Principal', // Placeholder
    recursosNecesarios: [], // Placeholder
    esPrimeraVez: false, // Placeholder, determinar según lógica de negocio
    costo: 0, // Placeholder
    doctor: doctorInfo?.full_name || 'Doctor no asignado',
    raw_doctor_id: normalizeId(apiAppointment.doctor_id),
  } as AppointmentData;
};

// Interface del Store de citas
interface AppointmentStore {
  // Estado
  appointments: AppointmentData[];
  isLoading: boolean;
  error: Error | null;
  lastFetched: number | null; // Timestamp de la última carga exitosa
  isStale: boolean; // Indica si los datos podrían estar obsoletos
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  
  // Acciones
  fetchAppointments: (force?: boolean) => Promise<void>;
  loadMoreAppointments: () => Promise<void>;
  addAppointment: (data: AddAppointmentInput) => Promise<AppointmentData>;
  updateAppointment: (input: UpdateAppointmentInput) => Promise<AppointmentData>;
  updateAppointmentStatus: (
    appointmentId: string,
    newStatus: AppointmentStatusEnum,
    motivo?: string,
    nuevaFechaHora?: string
  ) => Promise<AppointmentData>;
  getAppointmentHistory: (appointmentId: string) => Promise<AppointmentHistoryItem[]>;
}

// Duración máxima de la caché en milisegundos (5 minutos)
const CACHE_MAX_AGE = 5 * 60 * 1000;

// Creación del store con Zustand + immer para actualizaciones inmutables + persist para caché local
export const useAppointmentStore = create<AppointmentStore>()(
  persist(
    immer((set, get) => ({
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
    
    fetchAppointments: async (force = false) => {
      const state = get();
      const now = Date.now();
      
      // Verificar si tenemos datos en caché válidos
      const cacheValid = 
        !force && 
        state.lastFetched && 
        state.appointments.length > 0 && 
        now - state.lastFetched < CACHE_MAX_AGE;
      
      // Si hay una solicitud en curso y no estamos forzando, no hacer nada
      if (state.isLoading && !force) return;
      
      // Si los datos en caché son válidos y no estamos forzando, usar los datos en caché
      if (cacheValid) {
        set((state) => {
          state.isStale = false;
        });
        return;
      }
      
      // Si los datos están obsoletos pero tenemos datos, marcarlos como obsoletos
      // pero no bloquear la UI mientras se recargan
      const shouldBlockUI = state.appointments.length === 0;
      
      set((state) => {
        state.isLoading = shouldBlockUI;
        state.isStale = state.appointments.length > 0;
        state.error = null;
        // Reiniciar paginación al hacer una carga completa nueva
        state.pagination.page = 1;
      });
      
      try {
        // Usar AbortController para cancelar peticiones pendientes si se hace una nueva
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        // Añadir parámetros de paginación a la solicitud
        const searchParams = new URLSearchParams({
          page: '1',
          pageSize: state.pagination.pageSize.toString()
        });
        
        const response = await fetch(`/api/appointments?${searchParams.toString()}`, {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const responseData = await response.json();
        
        if (response.ok) {
          const { data, pagination } = responseData;
          const transformedAppointments = data.map(transformAppointmentData);
          
          set((state) => {
            state.appointments = transformedAppointments;
            state.pagination = pagination;
            state.isLoading = false;
            state.isStale = false;
            state.lastFetched = Date.now();
          });
        } else {
          throw new Error(responseData.message || 'Error fetching appointments');
        }
      } catch (error) {
        // Solo actualizar el estado de error si no fue por aborto de la petición
        if (error instanceof Error && error.name !== 'AbortError') {
          set((state) => {
            state.error = error instanceof Error ? error : new Error('Unknown error');
            state.isLoading = false;
          });
        }
      }
    },
    
    loadMoreAppointments: async () => {
      const state = get();
      
      // No cargar más si ya estamos cargando o no hay más datos
      if (state.isLoading || !state.pagination.hasMore) return;
      
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });
      
      try {
        // Incrementar página para cargar el siguiente conjunto
        const nextPage = state.pagination.page + 1;
        
        const searchParams = new URLSearchParams({
          page: nextPage.toString(),
          pageSize: state.pagination.pageSize.toString()
        });
        
        const response = await fetchWithRetry(`/api/appointments?${searchParams.toString()}`, {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' },
        });
        
        const responseData = await response.json();
        
        if (response.ok) {
          const { data, pagination } = responseData;
          const newAppointments = data.map(transformAppointmentData);
          
          set((state) => {
            // Concatenar los nuevos resultados a los existentes
            state.appointments = [...state.appointments, ...newAppointments];
            state.pagination = pagination;
            state.isLoading = false;
            state.lastFetched = Date.now();
          });
        } else {
          throw new Error(responseData.message || 'Error fetching more appointments');
        }
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Error loading more appointments');
          state.isLoading = false;
        });
      }
    },
    
    
    addAppointment: async (data) => {
      set((state) => { state.isLoading = true; state.error = null; });
      
      try {
        // Preparar payload para la API
        const { fecha_raw, hora_raw, ...rest } = data;
        const payload = {
          patient_id: data.patientId,
          doctor_id: data.raw_doctor_id || null,
          fecha_hora_cita: `${fecha_raw}T${hora_raw}:00.000Z`, // ISO string
          motivo_cita: data.motivoConsulta,
          estado_cita: data.estado,
          es_primera_vez: data.esPrimeraVez,
          notas_cita_seguimiento: data.notas || null
        };
        
        const response = await fetchWithRetry('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(responseData.message || 'Error adding appointment');
        }
        
        const newAppointment = transformAppointmentData(responseData);
        
        // Actualiza el estado con la nueva cita
        set((state) => {
          state.appointments = [...state.appointments, newAppointment];
          state.isLoading = false;
        });
        
        return newAppointment;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Error adding appointment');
          state.isLoading = false;
        });
        
        throw error;
      }
    },
    
    updateAppointment: async (input) => {
      set((state) => { state.isLoading = true; state.error = null; });
      
      try {
        const { id, fecha_raw, hora_raw, ...updateData } = input;
        
        // Preparar payload para la API
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
        
        const response = await fetchWithRetry(`/api/appointments/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(responseData.message || 'Error updating appointment');
        }
        
        const updatedAppointment = transformAppointmentData(responseData);
        
        // Actualiza el estado con la cita modificada
        set((state) => {
          state.appointments = state.appointments.map(a => 
            a.id === updatedAppointment.id ? updatedAppointment : a
          );
          state.isLoading = false;
        });
        
        return updatedAppointment;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Error updating appointment');
          state.isLoading = false;
        });
        
        throw error;
      }
    },
    
    updateAppointmentStatus: async (appointmentId, newStatus, motivo, nuevaFechaHora) => {
      set((state) => { state.isLoading = true; state.error = null; });
      
      try {
        const payload = {
          estado_cita: newStatus,
          actor_id: '5e4d29a2-5eec-49ee-ac0f-8d349d5660ed', // TODO: Obtener el ID del usuario actual
          motivo_cambio: motivo,
          fecha_hora_cita: nuevaFechaHora
        };
        
        const response = await fetchWithRetry(`/api/appointments/${appointmentId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(responseData.message || 'Error updating appointment status');
        }
        
        const updatedAppointment = transformAppointmentData(responseData);
        
        // Actualiza el estado con la cita modificada
        set((state) => {
          state.appointments = state.appointments.map(a => 
            a.id === updatedAppointment.id ? updatedAppointment : a
          );
          state.isLoading = false;
        });
        
        return updatedAppointment;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Error updating appointment status');
          state.isLoading = false;
        });
        
        throw error;
      }
    },
    
    getAppointmentHistory: async (appointmentId) => {
      set((state) => { state.isLoading = true; state.error = null; });
      
      try {
        const response = await fetchWithRetry(`/api/appointments/${appointmentId}/history`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Error fetching appointment history');
        }
        
        set((state) => { state.isLoading = false; });
        
        return data as AppointmentHistoryItem[];
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Error fetching appointment history');
          state.isLoading = false;
        });
        
        throw error;
      }
    },
  })),
    {
      name: 'appointment-storage-v2', // Actualizado para evitar conflictos con la versión anterior
      partialize: (state) => ({
        appointments: state.appointments,
        lastFetched: state.lastFetched
      }),
      storage: createJSONStorage(() => localStorage)
    }
  )
);

// Tipo para usar con appointmentStore
export type { AppointmentStore };
