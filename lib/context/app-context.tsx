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
  QueryKey,
  QueryObserverResult,
  RefetchOptions,
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
  DiagnosisType,
} from '@/app/dashboard/data-model';
import { PatientStatusEnum, AppointmentStatusEnum, DiagnosisEnum, PatientOriginEnum } from '@/app/dashboard/data-model';

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

// Placeholder for PatientStatusInfo and related function
export interface PatientStatusInfo {
  text: string;
  color: string; // Example: 'bg-green-500'
  // icon?: React.ReactElement; // Example
}

export const getPatientStatusInfo = (status?: PatientStatusEnum): PatientStatusInfo => {
  switch (status) {
    case PatientStatusEnum.OPERADO:
      return { text: 'Operado', color: 'bg-blue-500' };
    case PatientStatusEnum.NO_OPERADO:
      return { text: 'No Operado', color: 'bg-red-500' };
    case PatientStatusEnum.CONSULTADO:
      return { text: 'Consultado', color: 'bg-green-500' };
    case PatientStatusEnum.PENDIENTE_DE_CONSULTA:
      return { text: 'Pendiente de Consulta', color: 'bg-yellow-500' };
    case PatientStatusEnum.EN_SEGUIMIENTO:
      return { text: 'En Seguimiento', color: 'bg-purple-500' };
    case PatientStatusEnum.INDECISO:
        return { text: 'Indeciso', color: 'bg-gray-500' };
    default:
      return { text: 'Desconocido', color: 'bg-gray-300' };
  }
};

// --- Data Transformation Functions CORREGIDAS ---

const transformPatientData = (apiPatient: ApiPatient, _allRawAppointments?: ApiAppointment[]): PatientData => {
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

  const patientId = normalizeId(apiPatient.id);
  const parsedFechaRegistro = safeParseDate(apiPatient.fecha_registro);
  const parsedFechaNacimiento = safeParseDate(apiPatient.fecha_nacimiento);
  const parsedUltimoContacto = safeParseDate(apiPatient.ultimo_contacto);
  const parsedProximoContacto = safeParseDate(apiPatient.proximo_contacto);
  const parsedFechaCirugiaProgramada = safeParseDate(apiPatient.fecha_cirugia_programada);
  const parsedFechaPrimeraConsulta = safeParseDate(apiPatient.fecha_primera_consulta);

  return {
    id: patientId,
    nombre: apiPatient.nombre || '',
    apellidos: apiPatient.apellidos || '',
    edad: apiPatient.edad ?? undefined,
    telefono: apiPatient.telefono || '',
    email: apiPatient.email || apiPatient.correo_electronico || '',
    estado_paciente: (apiPatient.estado_paciente as PatientStatusEnum) || PatientStatusEnum.PENDIENTE_DE_CONSULTA,
    diagnostico_principal: (apiPatient.diagnostico_principal as DiagnosisEnum) ?? undefined,
    diagnostico_principal_detalle: apiPatient.diagnostico_principal_detalle ?? undefined,
    
    // Fechas (convertidas a ISO strings para PatientData)
    fecha_registro: parsedFechaRegistro ? parsedFechaRegistro.toISOString() : undefined,
    fecha_nacimiento: parsedFechaNacimiento ? format(parsedFechaNacimiento, 'yyyy-MM-dd') : undefined, // YYYY-MM-DD format
    ultimo_contacto: parsedUltimoContacto ? parsedUltimoContacto.toISOString() : undefined,
    proximo_contacto: parsedProximoContacto ? parsedProximoContacto.toISOString() : undefined,
    fecha_cirugia_programada: parsedFechaCirugiaProgramada ? parsedFechaCirugiaProgramada.toISOString() : undefined,
    fecha_primera_consulta: parsedFechaPrimeraConsulta ? parsedFechaPrimeraConsulta.toISOString() : undefined,

    // Otros campos
    origen_paciente: (apiPatient.origen_paciente as PatientOriginEnum) ?? undefined,
    probabilidad_cirugia: apiPatient.probabilidad_cirugia ?? undefined,
    etiquetas: apiPatient.etiquetas ? apiPatient.etiquetas.split(',').map(tag => tag.trim()) : [],
    comentarios_registro: apiPatient.comentarios_registro ?? undefined,
    notas_paciente: apiPatient.notas_paciente ?? undefined,
    historial_medico_relevante: apiPatient.historial_medico_relevante ?? undefined,
    direccion: apiPatient.direccion ?? undefined,
    doctor_asignado_id: normalizeId(apiPatient.doctor_asignado_id),
    doctor_asignado_nombre: apiPatient.doctor?.full_name ?? '',
    creado_por_id: normalizeId(apiPatient.creado_por_id),
    creado_por_nombre: apiPatient.creator?.full_name ?? '',
    // Campos que podrían necesitar lógica adicional o estar ausentes en ApiPatient
    foto_perfil: '', // Placeholder, no presente en ApiPatient
    preferencias_comunicacion: [], // Placeholder
    consentimientos: [], // Placeholder
  } as PatientData; // Asegurar que el tipo de retorno sea PatientData
};

// --- Transformación de datos de Cita ---
const transformAppointmentData = (apiAppointment: ApiAppointment, _allRawPatients?: ApiPatient[]): AppointmentData => {
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
    horaConsulta: parsedDateTime ? format(parsedDateTime, 'HH:mm') as `${number}:${number}` : '00:00', // Formato HH:MM
    duracionEstimadaMin: 30, // Placeholder
    motivoConsulta: apiAppointment.motivo_cita || 'Motivo no especificado',
    tipoConsulta: 'Seguimiento', // Placeholder, determinar según lógica de negocio
    estado: apiAppointment.estado_cita || AppointmentStatusEnum.PROGRAMADA,
    notas: apiAppointment.notas_cita_seguimiento ?? undefined,
    ubicacion: 'Consultorio Principal', // Placeholder
    recursosNecesarios: [], // Placeholder
    esPrimeraVez: false, // Placeholder, determinar según lógica de negocio
    costo: 0, // Placeholder
    doctor: doctorInfo?.full_name || 'Doctor no asignado',
    raw_doctor_id: normalizeId(apiAppointment.doctor_id),
  } as AppointmentData;
};

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
  getPatientById: (patientId: string | number) => Promise<PatientData | null>;

  refetchAppointments: () => Promise<void>;
  addAppointment: (data: AddAppointmentInput) => Promise<AppointmentData>;
  updateAppointment: (input: UpdateAppointmentInput) => Promise<AppointmentData>;

  getAppointmentHistory: (appointmentId: string) => Promise<AppointmentHistoryItem[]>;
  updateAppointmentStatus: (
    appointmentId: string,
    newStatus: AppointmentStatusEnum,
    motivo?: string,
    nuevaFechaHora?: string
  ) => Promise<AppointmentData>;
}

export type AddPatientInput = Omit<PatientData, 'id' | 'fecha_creacion' | 'fecha_actualizacion' | 'created_at' | 'updated_at' | 'historial_cambios' | 'estado_paciente_info' | 'proxima_cita' | 'ultima_cita' | 'fecha_registro'>;
export type UpdatePatientInput = { id: string } & Partial<AddPatientInput>;

export type AddAppointmentInput = Omit<AppointmentData, 'id' | 'paciente' | 'telefonoPaciente' | 'doctor' | 'fechaConsulta' | 'horaConsulta'> & {
  patientId: string;
  fecha_raw: string; // YYYY-MM-DD
  hora_raw: string; // HH:MM
  estado: AppointmentStatusEnum;
  raw_doctor_id?: string | null; 
};
export type UpdateAppointmentInput = { id: string } & Partial<Omit<AppointmentData, 'id' | 'paciente' | 'telefonoPaciente' | 'doctor'>> & {
  fecha_raw?: string;
  hora_raw?: string;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

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

const fetchPatientByIdAPI = async (patientId: string | number): Promise<ApiPatient | null> => {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/patients/${patientId}`);
    if (!response.ok) {
      console.error(`API error fetching patient ${patientId}: ${response.status}`);
      return null;
    }
    return response.json() as Promise<ApiPatient>;
  } catch (error) {
    console.error(`Network error fetching patient by ID ${patientId}:`, error);
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
};

function AppProviderInner({ children }: { children: ReactNode }) {
  const tanStackQueryClient = useTanStackQueryClient();

  const { 
    data: rawPatientsData = [], 
    isLoading: isLoadingRawPatients, 
    error: errorRawPatients, 
    refetch: refetchPatientsQuery 
  } = useQuery<ApiPatient[], ApiError, ApiPatient[], QueryKey>({ 
    queryKey: ['rawPatients'],
    queryFn: async () => {
      const response = await fetchWithRetry(`${API_BASE_URL}/patients`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new ApiError(`Failed to fetch patients: ${response.statusText}`, response.status, errorData);
      }
      return response.json() as Promise<ApiPatient[]>;
    },
  });

  const { 
    data: rawAppointmentsData = [], 
    isLoading: isLoadingRawAppointments, 
    error: errorRawAppointments, 
    refetch: refetchAppointmentsQuery 
  } = useQuery<ApiAppointment[], ApiError, ApiAppointment[], QueryKey>({
    queryKey: ['rawAppointments'],
    queryFn: async () => {
      const response = await fetchWithRetry(`${API_BASE_URL}/appointments`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new ApiError(`Failed to fetch appointments: ${response.statusText}`, response.status, errorData);
      }
      return response.json() as Promise<ApiAppointment[]>;
    },
  });

  const transformedAppointments = useMemo(() => {
    return rawAppointmentsData.map(ap => transformAppointmentData(ap, rawPatientsData));
  }, [rawAppointmentsData, rawPatientsData]);

  const patients = useMemo(() => {
    const transformed = rawPatientsData.map(p => transformPatientData(p, rawAppointmentsData));
    
    if (!transformed.length) return transformed;

    const appointmentsByPatientId = new Map<string, AppointmentData[]>();
    transformedAppointments.forEach(appointment => {
      const patientId = appointment.patientId; 
      if (!appointmentsByPatientId.has(patientId)) {
        appointmentsByPatientId.set(patientId, []);
      }
      appointmentsByPatientId.get(patientId)!.push(appointment);
    });

    appointmentsByPatientId.forEach(patientAppointments => {
      patientAppointments.sort((a, b) =>
        (new Date(b.fechaConsulta).getTime()) - (new Date(a.fechaConsulta).getTime())
      );
    });

    return transformed.map(p => {
      const patient = p as PatientData & { proxima_cita?: string; ultima_cita?: string; estado_paciente_info?: PatientStatusInfo };
      const patientAppointments = appointmentsByPatientId.get(patient.id);
      let updatedPatient = { ...patient };

      if (patientAppointments && patientAppointments.length > 0) {
        const latestAppointment = patientAppointments[0];
        updatedPatient.proxima_cita = latestAppointment.fechaConsulta.toISOString();
        updatedPatient.ultima_cita = latestAppointment.fechaConsulta.toISOString(); 

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
        if (derivedStatus !== patient.estado_paciente) {
            updatedPatient.estado_paciente = derivedStatus;
        }
      } else {
        updatedPatient.proxima_cita = undefined;
        updatedPatient.ultima_cita = undefined;
      }
      updatedPatient.estado_paciente_info = getPatientStatusInfo(updatedPatient.estado_paciente as PatientStatusEnum);
      return updatedPatient;
    }).sort((a,b) => (parseISO(b.fecha_registro)?.getTime() ?? 0) - (parseISO(a.fecha_registro)?.getTime() ?? 0));
  }, [rawPatientsData, rawAppointmentsData, transformedAppointments]);

  const isLoadingPatients = isLoadingRawPatients;
  const errorPatients = errorRawPatients;
  const isLoadingAppointments = isLoadingRawAppointments;
  const errorAppointments = errorRawAppointments;

  const addPatientMutation = useMutation<PatientData, ApiError, AddPatientInput>({
    mutationFn: async (patientPayload) => {
      const apiPayload = {
        ...patientPayload,
        creado_por_id: DEFAULT_USER_ID, 
        fecha_registro: new Date().toISOString(),
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
      // After successful creation, refetch raw data to include the new patient
      await refetchPatientsQuery(); 
      return transformPatientData(newApiPatient, rawAppointmentsData); // Transform with potentially stale appointment data, but UI will update on refetch
    },
    onSuccess: () => {
      // Data is already refetched in mutationFn. Cache will update automatically.
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
      await refetchPatientsQuery();
      return transformPatientData(updatedApiPatient, rawAppointmentsData);
    },
    onSuccess: () => {
      toast.success('Paciente actualizado exitosamente.');
    },
    onError: (error, variables) => {
      console.error(`Error al actualizar paciente ${variables.id}:`, error.message, error.details);
      toast.error(`Error al actualizar paciente: ${error.message}`, { description: JSON.stringify(error.details) });
    },
  });

  const getPatientById = useCallback(async (patientId: string | number): Promise<PatientData | null> => {
    const numericId = typeof patientId === 'string' ? parseInt(patientId, 10) : patientId;
    const existingPatient = patients.find(p => p.id === String(numericId));
    if (existingPatient) return existingPatient;

    const apiPatient = await fetchPatientByIdAPI(numericId);
    if (!apiPatient) return null;
    return transformPatientData(apiPatient, rawAppointmentsData);
  }, [patients, rawAppointmentsData]);

  const addAppointmentMutation = useMutation<AppointmentData, ApiError, AddAppointmentInput>({
    mutationFn: async (input: AddAppointmentInput) => {
      const {
        patientId,
        fecha_raw,
        hora_raw,
        estado,
        raw_doctor_id,
        motivoConsulta,
        notas,
        esPrimeraVez
      } = input;

      let validDoctorId: string;
      if (typeof raw_doctor_id === 'string') {
        // Explicit cast to string before trim
        const doctorIdAsString = raw_doctor_id as string;
        const trimmedDoctorId = doctorIdAsString.trim();
        if (trimmedDoctorId === '') {
          throw new ApiError("Doctor ID cannot be an empty string.", 400, { invalidField: "doctor_id" });
        }
        validDoctorId = trimmedDoctorId;
      } else {
        // Handles null, undefined, or any non-string type for raw_doctor_id
        throw new ApiError("Doctor ID is required and must be a non-empty string.", 400, { missingOrInvalidField: "doctor_id" });
      }

      const apiPayload: ApiAddAppointmentPayload = {
        patient_id: patientId,
        doctor_id: validDoctorId,
        fecha_hora_cita: `${fecha_raw}T${hora_raw}:00`,
        motivo_cita: motivoConsulta || '',
        estado_cita: estado,
        es_primera_vez: esPrimeraVez !== undefined ? esPrimeraVez : false,
        notas_cita_seguimiento: notas || null,
      };

      const response = await fetchWithRetry(`${API_BASE_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });
      if (!response.ok) {
        const resData = await response.json().catch(() => ({}));
        throw new ApiError('Failed to add appointment', response.status, resData);
      }
      const newApiAppointment = await response.json() as ApiAppointment;
      await refetchAppointmentsQuery(); 
      return transformAppointmentData(newApiAppointment, rawPatientsData);
    },
    onSuccess: () => {
      toast.success('Cita registrada exitosamente.');
    },
    onError: (error) => {
      console.error('Error creando cita:', error.message, error.details);
      toast.error(`Error creando cita: ${error.message}`, { description: JSON.stringify(error.details) });
    },
  });

  const updateAppointmentMutation = useMutation<AppointmentData, ApiError, UpdateAppointmentInput>({
    mutationFn: async ({ id, fecha_raw, hora_raw, ...updatePayload }) => {
      const apiPayloadForUpdate: Partial<ApiAppointment> = {};
      // Map known fields from UpdateAppointmentInput (camelCase) to ApiAppointment (snake_case)
      if (updatePayload.motivoConsulta !== undefined) apiPayloadForUpdate.motivo_cita = updatePayload.motivoConsulta;
      if (updatePayload.estado !== undefined) apiPayloadForUpdate.estado_cita = updatePayload.estado;
      if (updatePayload.notas !== undefined) apiPayloadForUpdate.notas_cita_seguimiento = updatePayload.notas;
      if (updatePayload.raw_doctor_id !== undefined) apiPayloadForUpdate.doctor_id = updatePayload.raw_doctor_id;
      // Add other mappable fields here if necessary

      if (fecha_raw && hora_raw) {
        apiPayloadForUpdate.fecha_hora_cita = `${fecha_raw}T${hora_raw}:00`;
      } else if (fecha_raw) { // If only date is provided, try to keep original time or handle as error/default
        const existingAppointment = transformedAppointments.find(a => a.id === id);
        if (existingAppointment?.horaConsulta) {
          apiPayloadForUpdate.fecha_hora_cita = `${fecha_raw}T${existingAppointment.horaConsulta}:00`;
        } else {
          // Potentially throw error or use a default time if only date is insufficient
          console.warn('Update appointment: only date provided, time might be incorrect or missing.');
          apiPayloadForUpdate.fecha_hora_cita = `${fecha_raw}T00:00:00`; 
        }
      }

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
      await refetchAppointmentsQuery();
      await refetchPatientsQuery();
      return transformAppointmentData(updatedApiApp, rawPatientsData);
    },
    onSuccess: () => {
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
      const apiError = error instanceof ApiError ? error : new ApiError(String(error instanceof Error ? error.message : String(error)));
      console.error('Error al cargar historial de cita:', apiError.message, apiError.details);
      toast.error(`Error al cargar historial: ${apiError.message}`, { description: JSON.stringify(apiError.details) });
      return [];
    }
  }, []);

  const updateAppointmentStatus = useCallback(async (
    appointmentId: string, newStatus: AppointmentStatusEnum, motivo?: string, nuevaFechaHora?: string
  ): Promise<AppointmentData> => {
    const payload: { estado_cita: AppointmentStatusEnum; actor_id: string; motivo_cambio?: string; fecha_hora_cita?: string } = {
      estado_cita: newStatus,
      actor_id: DEFAULT_USER_ID,
      ...(motivo && { motivo_cambio: motivo }),
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
      await refetchAppointmentsQuery();
      await refetchPatientsQuery();
      toast.success('Estado de cita actualizado.');
      return transformAppointmentData(updatedApiApp, rawPatientsData);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(String(error instanceof Error ? error.message : String(error)));
      console.error('Error al actualizar estado de cita:', apiError.message, apiError.details);
      toast.error(`Error al actualizar estado: ${apiError.message}`, { description: JSON.stringify(apiError.details) });
      throw apiError;
    }
  }, [tanStackQueryClient, rawPatientsData]); // Added rawPatientsData dependency

  const doctors = useMemo<DoctorData[]>(() => {
    // Placeholder: Fetch or define doctors data here
    // For now, returning an empty array as per previous logic
    return []; 
  }, []);

  const metrics = useMemo<ClinicMetrics>(() => {
    if (!patients.length) {
      return {
        totalPacientes: 0,
        pacientesNuevosMes: 0,
        pacientesOperados: 0,
        pacientesNoOperados: 0,
        pacientesSeguimiento: 0,
        tasaConversion: 0,
        tiempoPromedioDecision: 0, 
        fuentePrincipalPacientes: PatientOriginEnum.OTRO,
        diagnosticosMasComunes: [],
      } as ClinicMetrics;
    }

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let pacientesNuevosMes = 0;
    let pacientesOperados = 0;
    let pacientesNoOperados = 0;
    let pacientesSeguimiento = 0;
    const diagnosticosCount: Record<string, number> = {};
    const origenCount: Record<PatientOriginEnum, number> = {} as Record<PatientOriginEnum, number>;

    patients.forEach(patient => {
      const fechaRegistroDate = patient.fecha_registro ? parseISO(patient.fecha_registro) : null;
      if (fechaRegistroDate && fechaRegistroDate >= firstDayOfMonth) {
        pacientesNuevosMes++;
      }

      switch (patient.estado_paciente) {
        case PatientStatusEnum.OPERADO:
          pacientesOperados++;
          break;
        case PatientStatusEnum.NO_OPERADO:
          pacientesNoOperados++;
          break;
        case PatientStatusEnum.EN_SEGUIMIENTO:
          pacientesSeguimiento++;
          break;
      }

      if (patient.diagnostico_principal) {
        diagnosticosCount[patient.diagnostico_principal] = (diagnosticosCount[patient.diagnostico_principal] || 0) + 1;
      }
      if (patient.origen_paciente) {
        origenCount[patient.origen_paciente] = (origenCount[patient.origen_paciente] || 0) + 1;
      }
    });

    const diagnosticosMasComunes = Object.entries(diagnosticosCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({
        tipo: name as DiagnosisEnum, // Assuming 'name' is compatible with DiagnosisEnum
        cantidad: count,
        porcentaje: parseFloat(((count / patients.length) * 100).toFixed(1))
      }));

    let fuentePrincipalPacientes = PatientOriginEnum.OTRO;
    if (Object.keys(origenCount).length > 0) {
      fuentePrincipalPacientes = Object.entries(origenCount).sort(([,a],[,b]) => b-a)[0][0] as PatientOriginEnum;
    }
    
    const totalConsultadosDecision = pacientesOperados + pacientesNoOperados;
    const tasaConversion = totalConsultadosDecision > 0 ? (pacientesOperados / totalConsultadosDecision) * 100 : 0;

    return {
      totalPacientes: patients.length,
      pacientesNuevosMes,
      pacientesOperados,
      pacientesNoOperados,
      pacientesSeguimiento,
      tasaConversion: parseFloat(tasaConversion.toFixed(1)),
      tiempoPromedioDecision: 0, // Placeholder
      fuentePrincipalPacientes,
      diagnosticosMasComunes,
    } as ClinicMetrics;
  }, [patients]);

  const contextValue: AppContextType = {
    patients,
    isLoadingPatients,
    errorPatients,
    appointments: transformedAppointments, 
    isLoadingAppointments,
    errorAppointments,
    doctors,
    metrics,
    refetchPatients: async () => { await refetchPatientsQuery(); },
    addPatient: addPatientMutation.mutateAsync,
    updatePatient: updatePatientMutation.mutateAsync,
    getPatientById,
    refetchAppointments: async () => { await refetchAppointmentsQuery(); },
    addAppointment: addAppointmentMutation.mutateAsync,
    updateAppointment: updateAppointmentMutation.mutateAsync,
    getAppointmentHistory,
    updateAppointmentStatus,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};