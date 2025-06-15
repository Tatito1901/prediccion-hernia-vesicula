// lib/stores/doctorStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// Tipos
export interface DoctorData {
  id: string;
  full_name: string;
  username?: string;
  role?: string;
  especialidad?: string;
  telefono?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
  disponible?: boolean;
  horario_consulta?: {
    dias: string[];
    horaInicio: string;
    horaFin: string;
  };
}

interface ApiDoctor {
  id: string;
  full_name?: string;
  username?: string;
  role?: string;
  especialidad?: string;
  telefono?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
  disponible?: boolean;
  horario_consulta?: string; // JSON string
}

// Funciones auxiliares
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
const transformDoctorData = (apiDoctor: ApiDoctor): DoctorData => {
  // Parse horario_consulta JSON if exists
  let horario_consulta;
  if (apiDoctor.horario_consulta) {
    try {
      horario_consulta = JSON.parse(apiDoctor.horario_consulta);
    } catch (e) {
      console.error('Error parsing horario_consulta', e);
      horario_consulta = undefined;
    }
  }

  return {
    id: apiDoctor.id,
    full_name: apiDoctor.full_name || 'Doctor sin nombre',
    username: apiDoctor.username,
    role: apiDoctor.role || 'doctor',
    especialidad: apiDoctor.especialidad,
    telefono: apiDoctor.telefono,
    email: apiDoctor.email,
    created_at: apiDoctor.created_at,
    updated_at: apiDoctor.updated_at,
    disponible: apiDoctor.disponible ?? true,
    horario_consulta
  };
};

// Interfaz del Store de doctores
interface DoctorStore {
  // Estado
  doctors: DoctorData[];
  isLoading: boolean;
  error: Error | null;
  
  // Acciones
  fetchDoctors: () => Promise<void>;
  addDoctor: (data: Omit<DoctorData, 'id' | 'created_at' | 'updated_at'>) => Promise<DoctorData>;
  updateDoctor: (input: { id: string } & Partial<DoctorData>) => Promise<DoctorData>;
  getDoctorById: (doctorId: string) => Promise<DoctorData | null>;
}

// Creación del store con Zustand + immer para actualizaciones inmutables
export const useDoctorStore = create<DoctorStore>()(
  immer((set, get) => ({
    doctors: [],
    isLoading: false,
    error: null,
    
    fetchDoctors: async () => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });
      
      try {
        const response = await fetchWithRetry('/api/doctors');
        const data = await response.json();
        
        if (response.ok) {
          const transformedDoctors = data.map(transformDoctorData);
          set((state) => {
            state.doctors = transformedDoctors;
            state.isLoading = false;
          });
        } else {
          throw new Error(data.message || 'Error fetching doctors');
        }
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Unknown error');
          state.isLoading = false;
        });
      }
    },
    
    addDoctor: async (data) => {
      set((state) => { state.isLoading = true; state.error = null; });
      
      try {
        const response = await fetchWithRetry('/api/doctors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(responseData.message || 'Error adding doctor');
        }
        
        const newDoctor = transformDoctorData(responseData);
        
        // Actualiza el estado con el nuevo doctor
        set((state) => {
          state.doctors = [...state.doctors, newDoctor];
          state.isLoading = false;
        });
        
        return newDoctor;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Error adding doctor');
          state.isLoading = false;
        });
        
        throw error;
      }
    },
    
    updateDoctor: async (input) => {
      set((state) => { state.isLoading = true; state.error = null; });
      
      try {
        const { id, ...updateData } = input;
        
        const response = await fetchWithRetry(`/api/doctors/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(responseData.message || 'Error updating doctor');
        }
        
        const updatedDoctor = transformDoctorData(responseData);
        
        // Actualiza el estado con el doctor modificado
        set((state) => {
          state.doctors = state.doctors.map(d => 
            d.id === updatedDoctor.id ? updatedDoctor : d
          );
          state.isLoading = false;
        });
        
        return updatedDoctor;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Error updating doctor');
          state.isLoading = false;
        });
        
        throw error;
      }
    },
    
    getDoctorById: async (doctorId) => {
      // Primero buscamos en el estado local
      const localDoctor = get().doctors.find(d => d.id === doctorId);
      if (localDoctor) {
        return localDoctor;
      }
      
      set((state) => { state.isLoading = true; state.error = null; });
      
      try {
        const response = await fetchWithRetry(`/api/doctors/${doctorId}`);
        const data = await response.json();
        
        if (!response.ok || !data) {
          if (response.status === 404) {
            set((state) => { state.isLoading = false; });
            return null;
          }
          throw new Error(data?.message || `Error fetching doctor ${doctorId}`);
        }
        
        const doctor = transformDoctorData(data);
        
        // No actualizamos el estado global con este doctor individual para no contaminar la lista
        set((state) => { state.isLoading = false; });
        
        return doctor;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error(`Error fetching doctor ${doctorId}`);
          state.isLoading = false;
        });
        
        throw error;
      }
    },
  }))
);

// Tipo para usar con doctorStore
export type { DoctorStore };
