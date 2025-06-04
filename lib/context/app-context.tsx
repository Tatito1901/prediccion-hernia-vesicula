// lib/context/app-context.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useCallback,
} from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient as useTanStackQueryClient, // Renombrar para evitar confusión con nuestro QueryClient
  // MutateOptions,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseISO, isValid, format } from 'date-fns';

import type {
  PatientData,
  AppointmentData,
  DoctorData,
  ClinicMetrics,
  PatientStatus,
  AppointmentStatus,
} from '@/app/dashboard/data-model';
import { PatientStatusEnum, AppointmentStatusEnum } from '@/app/dashboard/data-model';

// Re-export types
export type {
  PatientData,
  AppointmentData,
  DoctorData,
  ClinicMetrics,
  PatientStatus,
  AppointmentStatus,
};

// Placeholder for AppointmentHistoryItem - refinar si se conoce la estructura
export interface AppointmentHistoryItem {
  id: string; // Asumiendo que cada item de historial tiene un ID
  event_type: string; // ej: 'CREATED', 'STATUS_CHANGED', 'RESCHEDULED'
  timestamp: string; // ISO date string
  changed_by_user_id?: string; // ID del usuario que hizo el cambio
  details: Record<string, any>; // Para campos como previous_values, new_values u otros detalles
  // [key: string]: any; // Evitar 'any' si es posible. Record<string, unknown> es más seguro.
}

// Constants
const API_BASE_URL = '/api';
const DEFAULT_USER_ID = '5e4d29a2-5eec-49ee-ac0f-8d349d5660ed';
const QUERY_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const QUERY_GC_TIME = 10 * 60 * 1000; // 10 minutes (gcTime es el nuevo nombre para cacheTime en v5+)
const MAX_FETCH_RETRIES = 2; // Máximo de reintentos para fetchWithRetry (0 es el primer intento, 2 son 2 reintentos adicionales)
const BASE_RETRY_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 10000;

// --- API Response and Payload Types ---

interface ApiPatient {
  id: string | number; // API puede enviar ID como string o number
  nombre?: string;
  apellidos?: string;
  telefono?: string;
  estado_paciente: PatientStatus | null; // Puede ser null desde la API
  fecha_nacimiento?: string | null; // ISO string o null
  correo_electronico?: string;
  direccion?: string;
  historial_medico_relevante?: string;
  creado_por_id?: string;
  fecha_creacion?: string | null; // ISO string o null
  ultima_actualizacion?: string | null; // ISO string o null
  // otros campos específicos de la API
}

interface ApiAppointment {
  id: string | number; // API puede enviar ID como string o number
  patient_id: string | number; // ID del paciente asociado
  doctor_id?: string | number;
  fecha_hora_cita: string; // ISO string
  motivo_cita?: string;
  estado_cita: AppointmentStatus;
  notas_cita_seguimiento?: string | null;
  // Datos anidados opcionales que la API podría devolver
  patients?: { // Nombre de la tabla/relación en la API
    nombre?: string;
    apellidos?: string;
    telefono?: string;
  };
  doctors?: { // Nombre de la tabla/relación en la API
    full_name?: string; // o nombre, apellido_paterno, etc.
  };
}

interface ApiAddAppointmentPayload {
  patient_id: string;
  doctor_id: string;
  fecha_hora_cita: string; // ISO string
  motivo_cita: string;
  estado_cita: AppointmentStatus;
  es_primera_vez: boolean;
  notas_cita_seguimiento: string | null;
}

interface ApiUpdateAppointmentStatusPayload {
  estado_cita: AppointmentStatus;
  actor_id: string;
  motivo_cambio?: string;
  fecha_hora_cita?: string; // ISO string, si se permite reagendar con el cambio de estado
}

// Custom Error class for API interactions
class ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;

  constructor(message: string, status?: number, details?: any, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.code = code;
    // Mantener la pila de errores correcta en V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

// --- Helper Functions ---

const normalizeId = (id: unknown): string => {
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
    return null; // Si parseISO lanza un error (ej. formato inválido que no maneja)
  }
};

const fetchWithRetry = async (
  input: RequestInfo,
  init: RequestInit = {},
  retries = MAX_FETCH_RETRIES
): Promise<Response> => {
  let lastError: Error = new Error('Fetch failed due to unknown reasons.');

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response; // Success or client error (no retry)
      }
      // Server error (5xx) or other retryable network issues
      lastError = new ApiError(`Server error: ${response.status} ${response.statusText}`, response.status);
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
    
    // If it's the last attempt, break and throw `lastError`
    if (attempt === retries) break;

    // Exponential backoff with jitter
    const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt) + Math.random() * (BASE_RETRY_DELAY_MS / 2);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  // If lastError is not already an ApiError, wrap it
  if (!(lastError instanceof ApiError)) {
    const finalError = new ApiError(
      `Failed after ${retries + 1} attempts. Last error: ${lastError.message}`,
      (lastError as any).status // Try to get status if present
    );
    finalError.cause = lastError; // Preserve original error
    throw finalError;
  }
  throw lastError;
};


// --- Data Transformation Functions ---

const transformPatientData = (apiPatient: ApiPatient): PatientData => {
  const defaultCreationDate = new Date();
  return {
    // Campos obligatorios en PatientData
    id: normalizeId(apiPatient.id),
    nombre: apiPatient.nombre || 'Nombre Desconocido',
    apellidos: apiPatient.apellidos || '',
    fecha_registro: defaultCreationDate.toISOString(), // Asumiendo que se usa el formato ISO string
    diagnostico_principal: undefined, // PatientData requiere esto, la API no lo provee directamente
    estado_paciente: apiPatient.estado_paciente || PatientStatusEnum.PENDIENTE_DE_CONSULTA,
    probabilidad_cirugia: 0, // PatientData requiere esto
    notas_paciente: '', // PatientData requiere esto
    telefono: apiPatient.telefono || 'Sin teléfono',

    // Campos opcionales o con defaults
    edad: undefined, // PatientData lo tiene como opcional
    fecha_nacimiento: apiPatient.fecha_nacimiento
      ? (() => {
          const date = safeParseDate(apiPatient.fecha_nacimiento);
          return date ? format(date, 'yyyy-MM-dd') : undefined;
        })()
      : undefined, // Convertir a DateString (yyyy-MM-dd) o undefined
    correo_electronico: apiPatient.correo_electronico || undefined,
    direccion: apiPatient.direccion || undefined,
    historial_medico_relevante: apiPatient.historial_medico_relevante || undefined,
    creado_por_id: apiPatient.creado_por_id || DEFAULT_USER_ID,
    fecha_creacion: apiPatient.fecha_creacion ? safeParseDate(apiPatient.fecha_creacion) : defaultCreationDate,
    ultima_actualizacion: apiPatient.ultima_actualizacion ? safeParseDate(apiPatient.ultima_actualizacion) : defaultCreationDate,
  };
};

const transformAppointmentData = (apiAppointment: ApiAppointment): AppointmentData => {
  const fechaHora = safeParseDate(apiAppointment.fecha_hora_cita);
  const fallbackDate = new Date(); // Usar solo si fechaHora es null y se necesita una Date sí o sí

  // Extraer nombre del paciente de la data anidada si existe
  const pacienteNombre = apiAppointment.patients?.nombre && apiAppointment.patients?.apellidos
    ? `${apiAppointment.patients.nombre} ${apiAppointment.patients.apellidos}`.trim()
    : apiAppointment.patients?.nombre // Si solo hay nombre
    ? apiAppointment.patients.nombre.trim()
    : 'Paciente Desconocido';

  const doctorNombre = apiAppointment.doctors?.full_name || 'Doctor No Asignado';

  return {
    // Campos obligatorios en AppointmentData
    id: normalizeId(apiAppointment.id),
    patientId: normalizeId(apiAppointment.patient_id),
    paciente: pacienteNombre,
    telefono: apiAppointment.patients?.telefono || 'Sin teléfono',
    doctor: doctorNombre,
    fechaConsulta: fechaHora || fallbackDate, // Considerar si null es mejor que fallbackDate si la fecha es crucial
    horaConsulta: fechaHora ? format(fechaHora, 'HH:mm') : format(fallbackDate, 'HH:mm'),
    motivoConsulta: apiAppointment.motivo_cita || 'No especificado',
    estado: apiAppointment.estado_cita || AppointmentStatusEnum.PROGRAMADA,
    
    // Campos opcionales o con defaults
    notas: apiAppointment.notas_cita_seguimiento || '',
    raw_fecha_hora_cita: apiAppointment.fecha_hora_cita, // Mantener string original para referencia
    raw_patient_id: String(apiAppointment.patient_id), // Mantener original, asegurando que sea string
    raw_doctor_id: apiAppointment.doctor_id ? normalizeId(apiAppointment.doctor_id) : undefined,
  };
};


// --- App Context Interface ---
interface AppContextType {
  patients: PatientData[];
  isLoadingPatients: boolean;
  errorPatients: ApiError | null;

  appointments: AppointmentData[];
  isLoadingAppointments: boolean;
  errorAppointments: ApiError | null;

  doctors: DoctorData[];
  metrics: ClinicMetrics;

  refetchPatients: () => Promise<void>;
  addPatient: (data: AddPatientInput) => Promise<PatientData>;
  updatePatient: (input: UpdatePatientInput) => Promise<PatientData>;

  refetchAppointments: () => Promise<void>;
  addAppointment: (data: AddAppointmentInput) => Promise<AppointmentData>;
  updateAppointment: (input: UpdateAppointmentInput) => Promise<AppointmentData>;

  getAppointmentHistory: (appointmentId: string) => Promise<AppointmentHistoryItem[]>;
  updateAppointmentStatus: (
    appointmentId: string,
    newStatus: AppointmentStatus,
    motivo?: string,
    nuevaFechaHora?: string
  ) => Promise<AppointmentData>;
}

type AddPatientInput = Omit<PatientData, 'id' | 'created_at' | 'updated_at'>;
type UpdatePatientInput = { id: string } & Partial<Omit<PatientData, 'id' | 'created_at' | 'updated_at'>>;
type AddAppointmentInput = Omit<AppointmentData, 'id' | 'raw_fecha_hora_cita' | 'raw_patient_id' | 'paciente' | 'telefono' | 'doctor'> &
  Required<Pick<AppointmentData, 'patientId' | 'fechaConsulta' | 'horaConsulta' | 'estado'>>;
type UpdateAppointmentInput = { id: string } & Partial<Omit<AppointmentData, 'id' | 'raw_fecha_hora_cita' | 'raw_patient_id'>>;

const AppContext = createContext<AppContextType | undefined>(undefined);

// QueryClient Configuration
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME,
      gcTime: QUERY_GC_TIME,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status && error.status >= 400 && error.status < 500) {
          return false; // No reintentar en errores 4xx
        }
        return failureCount < MAX_FETCH_RETRIES; // Reintentar otras fallas (ej. 5xx, red)
      },
      retryDelay: attemptIndex => Math.min(BASE_RETRY_DELAY_MS * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false, // Generalmente no se reintentan las mutaciones automáticamente
    },
  },
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [queryClientInstance] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClientInstance}>
      <AppProviderInner>{children}</AppProviderInner>
    </QueryClientProvider>
  );
}

function AppProviderInner({ children }: { children: ReactNode }) {
  const tanStackQueryClient = useTanStackQueryClient();

  // Fetch Patients Query
  const {
    data: patientsDataFromQuery = [], // Ya transformado por 'select'
    isLoading: isLoadingPatients,
    error: errorPatients, // Tipo: ApiError | null
    refetch: refetchPatientsQuery,
  } = useQuery<ApiPatient[], ApiError, PatientData[], ['patients']>({
    queryKey: ['patients'],
    queryFn: async () => {
      const response = await fetchWithRetry(`${API_BASE_URL}/patients`);
      if (!response.ok) {
        const responseData = await response.json().catch(() => ({ message: response.statusText }));
        throw new ApiError(
          `Failed to fetch patients: ${response.statusText}`,
          response.status,
          responseData
        );
      }
      return response.json() as Promise<ApiPatient[]>; // API devuelve ApiPatient[]
    },
    select: useCallback((data: ApiPatient[]): PatientData[] => data.map(transformPatientData), []),
  });

  // Fetch Appointments Query
  const {
    data: appointmentsDataFromQuery = [], // Ya transformado por 'select'
    isLoading: isLoadingAppointments,
    error: errorAppointments, // Tipo: ApiError | null
    refetch: refetchAppointmentsQuery,
  } = useQuery<ApiAppointment[], ApiError, AppointmentData[], ['appointments']>({
    queryKey: ['appointments'],
    queryFn: async () => {
      const response = await fetchWithRetry(`${API_BASE_URL}/appointments`);
      if (!response.ok) {
        const responseData = await response.json().catch(() => ({ message: response.statusText }));
        throw new ApiError(
          `Failed to fetch appointments: ${response.statusText}`,
          response.status,
          responseData
        );
      }
      return response.json() as Promise<ApiAppointment[]>; // API devuelve ApiAppointment[]
    },
    select: useCallback((data: ApiAppointment[]): AppointmentData[] => data.map(transformAppointmentData), []),
  });

  const patients = useMemo(() => {
    // Si no hay datos de pacientes o citas, o las citas aún están cargando, no se puede derivar mucho.
    if (!patientsDataFromQuery.length || !appointmentsDataFromQuery.length) {
        // Si las citas están cargando pero los pacientes ya están, devolver pacientes tal cual.
        if (isLoadingAppointments && patientsDataFromQuery.length) return patientsDataFromQuery;
        return patientsDataFromQuery; // O [] si se prefiere lista vacía hasta que todo cargue.
    }
    
    const appointmentsByPatientId = new Map<string, AppointmentData[]>();
    appointmentsDataFromQuery.forEach(appointment => {
      // Usar patientId de AppointmentData, que ya está normalizado.
      const patientId = appointment.patientId; 
      if (!appointmentsByPatientId.has(patientId)) {
        appointmentsByPatientId.set(patientId, []);
      }
      appointmentsByPatientId.get(patientId)!.push(appointment);
    });

    // Ordenar citas por paciente para obtener la más reciente fácilmente
    appointmentsByPatientId.forEach(patientAppointments => {
      patientAppointments.sort((a, b) =>
        (b.fechaConsulta.getTime()) - (a.fechaConsulta.getTime()) // Usar Date objects directamente
      );
    });

    return patientsDataFromQuery.map(patient => {
      const patientAppointments = appointmentsByPatientId.get(patient.id); // patient.id está normalizado
      if (!patientAppointments || patientAppointments.length === 0) {
        return patient; // Sin citas, estado_paciente no cambia
      }

      const latestAppointment = patientAppointments[0]; // La más reciente por la ordenación
      let derivedStatus = patient.estado_paciente;

      // Lógica de derivación de estado basada en la última cita
      switch (latestAppointment.estado) {
        case AppointmentStatusEnum.COMPLETADA:
          derivedStatus = PatientStatusEnum.CONSULTADO;
          break;
        case AppointmentStatusEnum.PRESENTE: // Asumiendo que PRESENTE implica que la consulta está en curso o recién terminada
        case AppointmentStatusEnum.PROGRAMADA:
        case AppointmentStatusEnum.CONFIRMADA:
        case AppointmentStatusEnum.REAGENDADA:
          derivedStatus = PatientStatusEnum.PENDIENTE_DE_CONSULTA;
          break;
        case AppointmentStatusEnum.NO_ASISTIO:
          derivedStatus = PatientStatusEnum.EN_SEGUIMIENTO; // O algún otro estado para no asistencias
          break;
        // AppointmentStatusEnum.CANCELADA no cambia el estado del paciente por defecto.
        // Si una cita CANCELADA fuera la única o la más reciente, el estado del paciente se mantendría.
      }
      
      return derivedStatus !== patient.estado_paciente
        ? { ...patient, estado_paciente: derivedStatus }
        : patient;
    });
  }, [patientsDataFromQuery, appointmentsDataFromQuery, isLoadingAppointments]);


  // --- Mutations ---
  // Add Patient
  const addPatientMutation = useMutation<PatientData, ApiError, AddPatientInput>({
    mutationFn: async (patientPayload) => {
      const apiPayload = {
        ...patientPayload, // Campos que el usuario provee
        // Campos que el sistema/API debería asignar o que tienen defaults en transformPatientData
        creado_por_id: DEFAULT_USER_ID, 
        // estado_paciente, fecha_registro, etc. se pueden definir en backend o en transformPatientData
      };
      const response = await fetchWithRetry(`${API_BASE_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });
      if (!response.ok) {
        const resData = await response.json().catch(() => ({}));
        throw new ApiError('Failed to create patient', response.status, resData);
      }
      const newApiPatient = await response.json() as ApiPatient;
      return transformPatientData(newApiPatient);
    },
    onSuccess: (newPatient) => {
      tanStackQueryClient.setQueryData<PatientData[]>(['patients'], (oldData = []) =>
        [newPatient, ...oldData].sort((a,b) => (b.fecha_creacion?.getTime() ?? 0) - (a.fecha_creacion?.getTime() ?? 0)) // Mantener ordenado
      );
      toast.success('Paciente registrado exitosamente.');
    },
    onError: (error) => {
      console.error('Error al registrar paciente:', error.message, error.details);
      toast.error(`Error al registrar paciente: ${error.message}`, { description: JSON.stringify(error.details) });
    },
  });

  // Update Patient
  const updatePatientMutation = useMutation<PatientData, ApiError, UpdatePatientInput>({
    mutationFn: async ({ id, ...updatePayload }) => {
      const response = await fetchWithRetry(`${API_BASE_URL}/patients/${id}`, {
        method: 'PUT', // o PATCH
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      if (!response.ok) {
        const resData = await response.json().catch(() => ({}));
        throw new ApiError('Failed to update patient', response.status, resData);
      }
      const updatedApiPatient = await response.json() as ApiPatient;
      return transformPatientData({ ...updatedApiPatient, id }); // Asegurar que el ID se mantenga
    },
    onSuccess: (updatedPatient) => {
      tanStackQueryClient.setQueryData<PatientData[]>(['patients'], (oldData = []) =>
        oldData.map(p => p.id === updatedPatient.id ? updatedPatient : p)
      );
      toast.success('Paciente actualizado exitosamente.');
    },
    onError: (error, variables) => {
      console.error(`Error al actualizar paciente ${variables.id}:`, error.message, error.details);
      toast.error(`Error al actualizar paciente: ${error.message}`, { description: JSON.stringify(error.details) });
    },
  });
  
  // Add Appointment
  const addAppointmentMutation = useMutation<AppointmentData, ApiError, AddAppointmentInput>({
    mutationFn: async (appointmentPayload) => {
      const dateTime = new Date(appointmentPayload.fechaConsulta);
      const [hours, minutes] = appointmentPayload.horaConsulta.split(':').map(Number);
      dateTime.setHours(hours, minutes, 0, 0);

      const apiPayload: ApiAddAppointmentPayload = {
        patient_id: appointmentPayload.patientId,
        doctor_id: appointmentPayload.raw_doctor_id ?? DEFAULT_USER_ID,
        fecha_hora_cita: dateTime.toISOString(),
        motivo_cita: appointmentPayload.motivoConsulta || '',
        estado_cita: appointmentPayload.estado,
        es_primera_vez: appointmentPayload.es_primera_vez ?? false,
        notas_cita_seguimiento: appointmentPayload.notas || null,
      };
      const response = await fetchWithRetry(`${API_BASE_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });
      if (!response.ok) {
        const resData = await response.json().catch(() => ({}));
        throw new ApiError('Failed to create appointment', response.status, resData);
      }
      const newApiAppointment = await response.json() as ApiAppointment;
      return transformAppointmentData(newApiAppointment);
    },
    onSuccess: () => {
      // Invalidar es más simple y robusto si la nueva cita puede afectar múltiples vistas/filtros
      tanStackQueryClient.invalidateQueries({ queryKey: ['appointments'] });
      // Opcionalmente, invalidar pacientes si el estado derivado puede cambiar
      // tanStackQueryClient.invalidateQueries({ queryKey: ['patients'] }); 
      toast.success('Cita agendada exitosamente.');
    },
    onError: (error) => {
      console.error('Error al agendar cita:', error.message, error.details);
      toast.error(`Error al agendar cita: ${error.message}`, { description: JSON.stringify(error.details) });
    },
  });

  // Update Appointment
  const updateAppointmentMutation = useMutation<AppointmentData, ApiError, UpdateAppointmentInput>({
    mutationFn: async ({ id, ...updatePayload }) => {
      const apiPayloadForUpdate: Partial<ApiAddAppointmentPayload> = {};
      if (updatePayload.fechaConsulta) {
        const dateTime = new Date(updatePayload.fechaConsulta);
        if (updatePayload.horaConsulta) {
            const [hours, minutes] = updatePayload.horaConsulta.split(':').map(Number);
            dateTime.setHours(hours, minutes, 0, 0);
        }
        apiPayloadForUpdate.fecha_hora_cita = dateTime.toISOString();
      }
      if (updatePayload.raw_doctor_id) apiPayloadForUpdate.doctor_id = updatePayload.raw_doctor_id;
      if (updatePayload.motivoConsulta) apiPayloadForUpdate.motivo_cita = updatePayload.motivoConsulta;
      if (updatePayload.estado) apiPayloadForUpdate.estado_cita = updatePayload.estado;
      if (updatePayload.notas) apiPayloadForUpdate.notas_cita_seguimiento = updatePayload.notas;

      const response = await fetchWithRetry(`${API_BASE_URL}/appointments/${id}`, {
        method: 'PUT', // o PATCH
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayloadForUpdate),
      });
      if (!response.ok) {
        const resData = await response.json().catch(() => ({}));
        throw new ApiError('Failed to update appointment', response.status, resData);
      }
      const updatedApiApp = await response.json() as ApiAppointment;
      return transformAppointmentData({ ...updatedApiApp, id });
    },
    onSuccess: (updatedAppointment) => {
      tanStackQueryClient.setQueryData<AppointmentData[]>(['appointments'], (oldData = []) =>
        oldData.map(a => a.id === updatedAppointment.id ? updatedAppointment : a)
      );
      // tanStackQueryClient.invalidateQueries({ queryKey: ['patients'] }); // Si afecta estado del paciente
      toast.success('Cita actualizada exitosamente.');
    },
    onError: (error, variables) => {
      console.error(`Error al actualizar cita ${variables.id}:`, error.message, error.details);
      toast.error(`Error al actualizar cita: ${error.message}`, { description: JSON.stringify(error.details) });
    },
  });

  // Get Appointment History
  const getAppointmentHistory = useCallback(async (appointmentId: string): Promise<AppointmentHistoryItem[]> => {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/appointments/${appointmentId}/history`);
      if (!response.ok) {
        const resData = await response.json().catch(() => ({}));
        throw new ApiError('Failed to fetch appointment history', response.status, resData);
      }
      return await response.json() as Promise<AppointmentHistoryItem[]>;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(String(error));
      console.error('Error al cargar historial de cita:', apiError.message, apiError.details);
      toast.error(`Error al cargar historial: ${apiError.message}`, { description: JSON.stringify(apiError.details) });
      return [];
    }
  }, []); // fetchWithRetry es externo, API_BASE_URL es constante

  // Update Appointment Status
  const updateAppointmentStatus = useCallback(async (
    appointmentId: string, newStatus: AppointmentStatus, motivo?: string, nuevaFechaHora?: string
  ): Promise<AppointmentData> => {
    const payload: ApiUpdateAppointmentStatusPayload = {
      estado_cita: newStatus,
      actor_id: DEFAULT_USER_ID,
      motivo_cambio: motivo,
      ...(nuevaFechaHora && { fecha_hora_cita: nuevaFechaHora }),
    };
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const resData = await response.json().catch(() => ({}));
        throw new ApiError('Failed to update appointment status', response.status, resData);
      }
      const updatedApiApp = await response.json() as ApiAppointment;
      const transformed = transformAppointmentData({ ...updatedApiApp, id: appointmentId });
      
      tanStackQueryClient.setQueryData<AppointmentData[]>(['appointments'], (oldData = []) =>
        oldData.map(a => a.id === appointmentId ? transformed : a)
      );
      // tanStackQueryClient.invalidateQueries({ queryKey: ['patients'] }); // Si afecta estado del paciente
      toast.success('Estado de cita actualizado.');
      return transformed;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(String(error));
      console.error('Error al actualizar estado de cita:', apiError.message, apiError.details);
      toast.error(`Error al actualizar estado: ${apiError.message}`, { description: JSON.stringify(apiError.details) });
      throw apiError; // Re-lanzar para que el llamador pueda manejarlo
    }
  }, [tanStackQueryClient]); // tanStackQueryClient es estable

  // Placeholder data - implement fetching as needed
  const doctors = useMemo<DoctorData[]>(() => [], []);
  const metrics = useMemo<ClinicMetrics>(() => ({} as ClinicMetrics), []);

  const contextValue = useMemo<AppContextType>(() => ({
    patients, // Derivado y memoizado
    isLoadingPatients,
    errorPatients, // ApiError | null

    appointments: appointmentsDataFromQuery, // Transformado y de la query
    isLoadingAppointments,
    errorAppointments, // ApiError | null

    doctors,
    metrics,

    refetchPatients: async () => { await refetchPatientsQuery(); },
    addPatient: addPatientMutation.mutateAsync,
    updatePatient: updatePatientMutation.mutateAsync,

    refetchAppointments: async () => { await refetchAppointmentsQuery(); },
    addAppointment: addAppointmentMutation.mutateAsync,
    updateAppointment: updateAppointmentMutation.mutateAsync,
    
    getAppointmentHistory,
    updateAppointmentStatus,
  }), [
    patients, isLoadingPatients, errorPatients,
    appointmentsDataFromQuery, isLoadingAppointments, errorAppointments,
    doctors, metrics,
    refetchPatientsQuery, addPatientMutation.mutateAsync, updatePatientMutation.mutateAsync,
    refetchAppointmentsQuery, addAppointmentMutation.mutateAsync, updateAppointmentMutation.mutateAsync,
    getAppointmentHistory, updateAppointmentStatus,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}