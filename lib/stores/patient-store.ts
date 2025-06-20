// lib/stores/patientStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { parseISO, isValid, format } from 'date-fns';
import { toast } from 'sonner';

import { 
  PatientData, PatientStatusEnum, DiagnosisEnum, 
  PatientOriginEnum, FollowUpData, FollowUpStatusEnum
} from '@/app/dashboard/data-model';

// Definiendo interfaces que antes venían de data-model pero que ahora definimos localmente
type AddPatientInput = Omit<PatientData, 'id' | 'fecha_creacion' | 'fecha_actualizacion' | 'created_at' | 
  'updated_at' | 'historial_cambios' | 'estado_paciente_info' | 'proxima_cita' | 'ultima_cita' | 'fecha_registro'>;

type UpdatePatientInput = { id: string } & Partial<PatientData>;

// Tipos
interface ApiPatient {
  id: string | number;
  nombre?: string;
  apellidos?: string;
  edad?: number | null;
  telefono?: string;
  email?: string;
  fecha_registro?: string | null;
  estado_paciente?: string | null;
  diagnostico_principal?: string | null;
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

interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
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

// Función de transformación de datos
const transformPatientData = (apiPatient: ApiPatient): PatientData => {
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
    fecha_nacimiento: parsedFechaNacimiento ? format(parsedFechaNacimiento, 'yyyy-MM-dd') : undefined,
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
  } as PatientData;
};

// Interfaz del Store de pacientes
interface PatientStore {
  patients: PatientData[];
  isLoading: boolean;
  error: Error | null;
  // Paginación
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  fetchPatients: (page?: number, pageSize?: number) => Promise<void>;
  addPatient: (data: Omit<PatientData, 'id' | 'fecha_creacion' | 'fecha_actualizacion' | 'created_at' | 'updated_at' | 'historial_cambios' | 'estado_paciente_info' | 'proxima_cita' | 'ultima_cita' | 'fecha_registro'>) => Promise<PatientData>;
  updatePatient: (input: { id: string } & Partial<PatientData>) => Promise<PatientData>;
  getPatientById: (patientId: string | number) => Promise<PatientData | null>;
  addFollowUp: (followUpData: Partial<FollowUpData>) => Promise<FollowUpData>;
}

// Creación del store con Zustand + immer para actualizaciones inmutables
const DEFAULT_STORE_PAGE_SIZE = 20;

export const usePatientStore = create<PatientStore>()(
  immer((set, get) => ({
    patients: [],
    isLoading: false,
    error: null,
    // Estado de paginación inicial
    currentPage: 1,
    pageSize: DEFAULT_STORE_PAGE_SIZE,
    totalCount: 0,
    totalPages: 0,
    
    fetchPatients: async (page, pageSizeOption) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });
      
      const requestedPage = page || get().currentPage || 1;
      const requestedPageSize = pageSizeOption || get().pageSize || DEFAULT_STORE_PAGE_SIZE;

      set((state) => {
        state.isLoading = true;
        state.error = null;
      });
      
      try {
        const apiUrl = `/api/patients?page=${requestedPage}&pageSize=${requestedPageSize}`;
        const response = await fetchWithRetry(apiUrl);
        const responseData = await response.json(); // Ahora esperamos un objeto { data: [], pagination: {} }
        
        if (response.ok && responseData.data) {
          const transformedPatients = responseData.data.map(transformPatientData);
          set((state) => {
            state.patients = transformedPatients;
            state.currentPage = responseData.pagination.page;
            state.pageSize = responseData.pagination.pageSize;
            state.totalCount = responseData.pagination.totalCount;
            state.totalPages = responseData.pagination.totalPages;
            state.isLoading = false;
          });
        } else {
          throw new Error(responseData.message || 'Error fetching patients');
        }
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Unknown error');
          state.isLoading = false;
        });
      }
    },
    
    addPatient: async (data) => {
      set((state) => { state.isLoading = true; state.error = null; });
      
      try {
        const response = await fetchWithRetry('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(responseData.message || 'Error adding patient');
        }
        
        const newPatient = transformPatientData(responseData);
        
        // Actualiza el estado con el nuevo paciente
        set((state) => {
          state.patients = [...state.patients, newPatient];
          state.isLoading = false;
        });
        
        return newPatient;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Error adding patient');
          state.isLoading = false;
        });
        
        throw error;
      }
    },
    
    updatePatient: async (input) => {
      set((state) => { state.isLoading = true; state.error = null; });
      
      try {
        const { id, ...updateData } = input;
        
        const response = await fetchWithRetry(`/api/patients/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(responseData.message || 'Error updating patient');
        }
        
        const updatedPatient = transformPatientData(responseData);
        
        // Actualiza el estado con el paciente modificado
        set((state) => {
          state.patients = state.patients.map(p => 
            p.id === updatedPatient.id ? updatedPatient : p
          );
          state.isLoading = false;
        });
        
        return updatedPatient;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Error updating patient');
          state.isLoading = false;
        });
        
        throw error;
      }
    },
    
    getPatientById: async (patientId) => {
      const normalizedId = normalizeId(patientId);
      
      // Primero buscamos en el estado local
      const localPatient = get().patients.find(p => p.id === normalizedId);
      if (localPatient) {
        return localPatient;
      }
      
      set((state) => { state.isLoading = true; state.error = null; });
      
      try {
        const response = await fetchWithRetry(`/api/patients/${normalizedId}`);
        const data = await response.json();
        
        if (!response.ok || !data) {
          if (response.status === 404) {
            set((state) => { state.isLoading = false; });
            return null;
          }
          throw new Error(data?.message || `Error fetching patient ${normalizedId}`);
        }
        
        const patient = transformPatientData(data);
        
        // No actualizamos el estado global con este paciente individual para no contaminar la lista
        set((state) => { state.isLoading = false; });
        
        return patient;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error(`Error fetching patient ${normalizedId}`);
          state.isLoading = false;
        });
        
        throw error;
      }
    },
    addFollowUp: async (followUpData) => {
      try {
        if (!followUpData.patient_id) {
          throw new Error('ID de paciente requerido para crear seguimiento');
        }

        // Asegurar que tiene los campos requeridos
        const payload = {
          patient_id: followUpData.patient_id,
          fecha_seguimiento: followUpData.fecha_seguimiento || new Date().toISOString().split('T')[0],
          tipo_seguimiento: followUpData.tipo_seguimiento || 'Llamada',
          notas_seguimiento: followUpData.notas_seguimiento || '',
          estado_seguimiento: followUpData.estado_seguimiento || FollowUpStatusEnum.PROGRAMADO,
          resultado_seguimiento: followUpData.resultado_seguimiento,
          proximo_seguimiento_fecha: followUpData.proximo_seguimiento_fecha,
          user_id_assigned: followUpData.user_id_assigned
        };

        // Realizamos la llamada a la API
        const response = await fetchWithRetry('/api/followups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `Error ${response.status} al crear seguimiento`);
        }

        const createdFollowUp = await response.json();

        // Actualizar el estado del paciente si es necesario
        if (followUpData.patient_id) {
          const patientId = followUpData.patient_id;
          try {
            // Refrescamos el paciente para ver su estado actualizado
            await get().getPatientById(patientId);
          } catch (patientError) {
            console.error('Error actualizando datos del paciente después de crear seguimiento:', patientError);
          }
        }

        // Mostrar notificación de éxito
        toast?.success?.('Seguimiento creado correctamente');
        
        return createdFollowUp;
      } catch (error) {
        console.error('Error en addFollowUp:', error);
        // Mostrar notificación de error
        toast?.error?.('Error al crear seguimiento', {
          description: error instanceof Error ? error.message : 'Error inesperado'
        });
        throw error;
      }
    },
  }))
);

// Tipo para usar con patientStore
export type { PatientStore };
