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
  useQueryClient as useTanStackQueryClient,
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

export interface AppointmentHistoryItem {
  id: string;
  event_type: string;
  timestamp: string;
  changed_by_user_id?: string;
  details: Record<string, any>;
}

// Constants
const API_BASE_URL = '/api';
const DEFAULT_USER_ID = '5e4d29a2-5eec-49ee-ac0f-8d349d5660ed';
const QUERY_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const QUERY_GC_TIME = 10 * 60 * 1000; // 10 minutes
const MAX_FETCH_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 10000;

// --- API Response Types corregidos para Supabase ---

interface ApiPatient {
  id: string | number;
  nombre?: string;
  apellidos?: string;
  edad?: number | null; // ← CORREGIDO: Ahora incluye edad
  telefono?: string;
  email?: string;
  fecha_registro?: string | null; // ← CORREGIDO: Fecha de registro real
  estado_paciente?: PatientStatus | null;
  diagnostico_principal?: string | null; // ← CORREGIDO: Diagnóstico principal
  diagnostico_principal_detalle?: string | null;
  doctor_asignado_id?: string | null;
  fecha_primera_consulta?: string | null;
  comentarios_registro?: string | null;
  origen_paciente?: string | null;
  probabilidad_cirugia?: number | null;
  ultimo_contacto?: string | null;
  proximo_contacto?: string | null;
  etiquetas?: string | null;
  fecha_cirugia_programada?: string | null;
  creado_por_id?: string;
  fecha_nacimiento?: string | null;
  correo_electronico?: string;
  direccion?: string;
  historial_medico_relevante?: string;
  notas_paciente?: string;
  // Relaciones de Supabase
  doctor?: {
    id: string;
    full_name: string;
  };
  creator?: {
    id: string;
    full_name: string;
  };
}

interface ApiAppointment {
  id: string | number;
  patient_id: string | number;
  doctor_id?: string | number;
  fecha_hora_cita: string;
  motivo_cita?: string;
  estado_cita: AppointmentStatus;
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

interface ApiAddAppointmentPayload {
  patient_id: string;
  doctor_id: string;
  fecha_hora_cita: string;
  motivo_cita: string;
  estado_cita: AppointmentStatus;
  es_primera_vez: boolean;
  notas_cita_seguimiento: string | null;
}

interface ApiUpdateAppointmentStatusPayload {
  estado_cita: AppointmentStatus;
  actor_id: string;
  motivo_cambio?: string;
  fecha_hora_cita?: string;
}

// Custom Error class
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
    return null;
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
        return response;
      }
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
    
    if (attempt === retries) break;

    const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt) + Math.random() * (BASE_RETRY_DELAY_MS / 2);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  if (!(lastError instanceof ApiError)) {
    const finalError = new ApiError(
      `Failed after ${retries + 1} attempts. Last error: ${lastError.message}`,
      (lastError as any).status
    );
    finalError.cause = lastError;
    throw finalError;
  }
  throw lastError;
};

// --- Data Transformation Functions CORREGIDAS ---

const transformPatientData = (apiPatient: ApiPatient): PatientData => {
  // DEBUG: Log para verificar datos recibidos
  console.log('TRANSFORM_PATIENT DEBUG:', {
    id: apiPatient.id,
    nombre: apiPatient.nombre,
    apellidos: apiPatient.apellidos,
    edad: apiPatient.edad,
    fecha_registro: apiPatient.fecha_registro,
    diagnostico_principal: apiPatient.diagnostico_principal,
    estado_paciente: apiPatient.estado_paciente
  });

  // Usar la fecha de registro real de la API, no la fecha actual
  const fechaRegistro = apiPatient.fecha_registro 
    ? safeParseDate(apiPatient.fecha_registro) 
    : new Date();

  return {
    // Campos obligatorios en PatientData
    id: normalizeId(apiPatient.id),
    nombre: apiPatient.nombre || 'Nombre Desconocido',
    apellidos: apiPatient.apellidos || '',
    
    // ← CORREGIDO: Usar fecha_registro real de la API
    fecha_registro: fechaRegistro ? fechaRegistro.toISOString() : new Date().toISOString(),
    
    // ← CORREGIDO: Usar diagnostico_principal real de la API
    diagnostico_principal: apiPatient.diagnostico_principal || 'Sin diagnóstico',
    
    estado_paciente: apiPatient.estado_paciente || PatientStatusEnum.PENDIENTE_DE_CONSULTA,
    probabilidad_cirugia: apiPatient.probabilidad_cirugia || 0,
    
    // ← CORREGIDO: Usar notas del campo correcto
    notas_paciente: apiPatient.comentarios_registro || apiPatient.notas_paciente || '',
    
    telefono: apiPatient.telefono || 'Sin teléfono',

    // ← CORREGIDO: Usar edad real de la API
    edad: apiPatient.edad || undefined,
    
    // Mapeo de campos adicionales
    diagnostico_principal_detalle: apiPatient.diagnostico_principal_detalle || undefined,
    fecha_nacimiento: apiPatient.fecha_nacimiento
      ? (() => {
          const date = safeParseDate(apiPatient.fecha_nacimiento);
          return date ? format(date, 'yyyy-MM-dd') : undefined;
        })()
      : undefined,
    email: apiPatient.email || apiPatient.correo_electronico || undefined,
    direccion: apiPatient.direccion || undefined,
    historial_medico_relevante: apiPatient.historial_medico_relevante || undefined,
    doctor_asignado_id: apiPatient.doctor_asignado_id || undefined,
    fecha_primera_consulta: apiPatient.fecha_primera_consulta 
      ? safeParseDate(apiPatient.fecha_primera_consulta) 
      : undefined,
    origen_paciente: apiPatient.origen_paciente || undefined,
    ultimo_contacto: apiPatient.ultimo_contacto 
      ? safeParseDate(apiPatient.ultimo_contacto) 
      : undefined,
    proximo_contacto: apiPatient.proximo_contacto 
      ? safeParseDate(apiPatient.proximo_contacto) 
      : undefined,
    etiquetas: apiPatient.etiquetas ? apiPatient.etiquetas.split(',') : undefined,
    fecha_cirugia_programada: apiPatient.fecha_cirugia_programada 
      ? safeParseDate(apiPatient.fecha_cirugia_programada) 
      : undefined,
    creado_por_id: apiPatient.creado_por_id || DEFAULT_USER_ID,
    fecha_creacion: fechaRegistro || new Date(),
    ultima_actualizacion: new Date(), // Esto se podría mapear de updated_at si existe
  };
};

const transformAppointmentData = (apiAppointment: ApiAppointment): AppointmentData => {
  const fechaHora = safeParseDate(apiAppointment.fecha_hora_cita);
  const fallbackDate = new Date();

  // Obtener información del paciente - manejar diferentes estructuras
  const patientInfo = apiAppointment.patients || apiAppointment.patient || null;
  
  // Mejorar la extracción de datos del paciente con logging para depuración
  console.log('API Appointment data:', {
    id: apiAppointment.id,
    patient_id: apiAppointment.patient_id,
    patients: apiAppointment.patients,
    patient: apiAppointment.patient,
    patient_info: patientInfo,
    fecha_hora_cita: apiAppointment.fecha_hora_cita,
  });

  // Este es un problema de estructura de datos. Si tenemos un ID de paciente pero no tenemos información,
  // deberíamos buscar ese paciente directamente en la API, pero eso requeriría una llamada asíncrona.
  // Esto debería ser abordado al nivel de la API para asegurar que siempre incluya los datos del paciente.
  if (apiAppointment.patient_id && !patientInfo) {
    console.warn(`Falta información del paciente para la cita ${apiAppointment.id}. ID del paciente: ${apiAppointment.patient_id}. ` +
      `Se recomienda revisar la estructura de la respuesta de la API o la consulta Supabase.`);
  }

  // Obtener el nombre del paciente de forma más robusta
  let pacienteNombre = 'Paciente Sin Nombre';
  
  if (patientInfo) {
    if (patientInfo.nombre && patientInfo.apellidos) {
      pacienteNombre = `${patientInfo.nombre} ${patientInfo.apellidos}`.trim();
    } else if (patientInfo.nombre) {
      pacienteNombre = patientInfo.nombre.trim();
    } else if (patientInfo.apellidos) {
      pacienteNombre = patientInfo.apellidos.trim();
    }
  } else if (apiAppointment.patient_id) {
    // Si no tenemos información del paciente pero sí tenemos el ID,
    // usamos un placeholder más informativo que incluye el ID
    pacienteNombre = `Paciente ID: ${apiAppointment.patient_id}`;
  }
  
  // Obtener información del doctor - manejar diferentes estructuras
  const doctorInfo = apiAppointment.doctors || apiAppointment.doctor;
  const doctorNombre = doctorInfo?.full_name || 'Doctor No Asignado';

  return {
    id: normalizeId(apiAppointment.id),
    patientId: normalizeId(apiAppointment.patient_id),
    paciente: pacienteNombre,
    telefono: apiAppointment.patients?.telefono || 'Sin teléfono',
    doctor: doctorNombre,
    fechaConsulta: fechaHora || fallbackDate,
    horaConsulta: fechaHora ? format(fechaHora, 'HH:mm') : format(fallbackDate, 'HH:mm'),
    motivoConsulta: apiAppointment.motivo_cita || 'No especificado',
    estado: apiAppointment.estado_cita || AppointmentStatusEnum.PROGRAMADA,
    notas: apiAppointment.notas_cita_seguimiento || '',
    raw_fecha_hora_cita: apiAppointment.fecha_hora_cita,
    raw_patient_id: String(apiAppointment.patient_id),
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
          return false;
        }
        return failureCount < MAX_FETCH_RETRIES;
      },
      retryDelay: attemptIndex => Math.min(BASE_RETRY_DELAY_MS * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
    },
  },
});

// Función para obtener datos de un paciente por ID directamente de la API
const fetchPatientById = async (patientId: string | number): Promise<ApiPatient | null> => {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/patients/${patientId}`);
    if (!response.ok) return null;
    return response.json() as Promise<ApiPatient>;
  } catch (error) {
    console.error(`Error al obtener datos del paciente ID ${patientId}:`, error);
    return null;
  }
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
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
    data: patientsDataFromQuery = [],
    isLoading: isLoadingPatients,
    error: errorPatients,
    refetch: refetchPatientsQuery,
  } = useQuery<ApiPatient[], ApiError, PatientData[], ['patients']>({
    queryKey: ['patients'],
    queryFn: async () => {
      console.log('FETCHING PATIENTS from API...');
      const response = await fetchWithRetry(`${API_BASE_URL}/patients`);
      if (!response.ok) {
        const responseData = await response.json().catch(() => ({ message: response.statusText }));
        throw new ApiError(
          `Failed to fetch patients: ${response.statusText}`,
          response.status,
          responseData
        );
      }
      const data = await response.json() as ApiPatient[];
      console.log('RAW PATIENTS from API:', data.slice(0, 2)); // Log first 2 patients
      return data;
    },
    select: useCallback((data: ApiPatient[]): PatientData[] => {
      console.log('TRANSFORMING PATIENTS:', data.length, 'patients');
      const transformed = data.map(transformPatientData);
      console.log('TRANSFORMED PATIENTS sample:', transformed.slice(0, 2));
      return transformed;
    }, []),
  });

  // Fetch Appointments Query
  const {
    data: appointmentsDataFromQuery = [],
    isLoading: isLoadingAppointments,
    error: errorAppointments,
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
      return response.json() as Promise<ApiAppointment[]>;
    },
    select: useCallback((data: ApiAppointment[]): AppointmentData[] => data.map(transformAppointmentData), []),
  });

  const patients = useMemo(() => {
    if (!patientsDataFromQuery.length || !appointmentsDataFromQuery.length) {
        if (isLoadingAppointments && patientsDataFromQuery.length) return patientsDataFromQuery;
        return patientsDataFromQuery;
    }
    
    const appointmentsByPatientId = new Map<string, AppointmentData[]>();
    appointmentsDataFromQuery.forEach(appointment => {
      const patientId = appointment.patientId; 
      if (!appointmentsByPatientId.has(patientId)) {
        appointmentsByPatientId.set(patientId, []);
      }
      appointmentsByPatientId.get(patientId)!.push(appointment);
    });

    appointmentsByPatientId.forEach(patientAppointments => {
      patientAppointments.sort((a, b) =>
        (b.fechaConsulta.getTime()) - (a.fechaConsulta.getTime())
      );
    });

    return patientsDataFromQuery.map(patient => {
      const patientAppointments = appointmentsByPatientId.get(patient.id);
      if (!patientAppointments || patientAppointments.length === 0) {
        return patient;
      }

      const latestAppointment = patientAppointments[0];
      let derivedStatus = patient.estado_paciente;

      switch (latestAppointment.estado) {
        case AppointmentStatusEnum.COMPLETADA:
          derivedStatus = PatientStatusEnum.CONSULTADO;
          break;
        case AppointmentStatusEnum.PRESENTE:
        case AppointmentStatusEnum.PROGRAMADA:
        case AppointmentStatusEnum.CONFIRMADA:
        case AppointmentStatusEnum.REAGENDADA:
          derivedStatus = PatientStatusEnum.PENDIENTE_DE_CONSULTA;
          break;
        case AppointmentStatusEnum.NO_ASISTIO:
          derivedStatus = PatientStatusEnum.EN_SEGUIMIENTO;
          break;
      }
      
      return derivedStatus !== patient.estado_paciente
        ? { ...patient, estado_paciente: derivedStatus }
        : patient;
    });
  }, [patientsDataFromQuery, appointmentsDataFromQuery, isLoadingAppointments]);

  // --- Mutations ---
  const addPatientMutation = useMutation<PatientData, ApiError, AddPatientInput>({
    mutationFn: async (patientPayload) => {
      const apiPayload = {
        ...patientPayload,
        creado_por_id: DEFAULT_USER_ID, 
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
        [newPatient, ...oldData].sort((a,b) => (b.fecha_creacion?.getTime() ?? 0) - (a.fecha_creacion?.getTime() ?? 0))
      );
      toast.success('Paciente registrado exitosamente.');
    },
    onError: (error) => {
      console.error('Error al registrar paciente:', error.message, error.details);
      toast.error(`Error al registrar paciente: ${error.message}`, { description: JSON.stringify(error.details) });
    },
  });

  const updatePatientMutation = useMutation<PatientData, ApiError, UpdatePatientInput>({
    mutationFn: async ({ id, ...updatePayload }) => {
      const response = await fetchWithRetry(`${API_BASE_URL}/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      if (!response.ok) {
        const resData = await response.json().catch(() => ({}));
        throw new ApiError('Failed to update patient', response.status, resData);
      }
      const updatedApiPatient = await response.json() as ApiPatient;
      return transformPatientData({ ...updatedApiPatient, id });
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
      tanStackQueryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Cita agendada exitosamente.');
    },
    onError: (error) => {
      console.error('Error al agendar cita:', error.message, error.details);
      toast.error(`Error al agendar cita: ${error.message}`, { description: JSON.stringify(error.details) });
    },
  });

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
        method: 'PUT',
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
      toast.success('Cita actualizada exitosamente.');
    },
    onError: (error, variables) => {
      console.error(`Error al actualizar cita ${variables.id}:`, error.message, error.details);
      toast.error(`Error al actualizar cita: ${error.message}`, { description: JSON.stringify(error.details) });
    },
  });

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
  }, []);

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
      toast.success('Estado de cita actualizado.');
      return transformed;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(String(error));
      console.error('Error al actualizar estado de cita:', apiError.message, apiError.details);
      toast.error(`Error al actualizar estado: ${apiError.message}`, { description: JSON.stringify(apiError.details) });
      throw apiError;
    }
  }, [tanStackQueryClient]);

  const doctors = useMemo<DoctorData[]>(() => [], []);
  const metrics = useMemo<ClinicMetrics>(() => ({} as ClinicMetrics), []);

  const contextValue = useMemo<AppContextType>(() => ({
    patients,
    isLoadingPatients,
    errorPatients,

    appointments: appointmentsDataFromQuery,
    isLoadingAppointments,
    errorAppointments,

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