// lib/stores/patientStore.ts - Optimizado con React Query
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseISO, isValid, format } from 'date-fns';
import { toast } from 'sonner';

import { 
  PatientData, PatientStatusEnum, DiagnosisEnum, 
  PatientOriginEnum, FollowUpData, FollowUpStatusEnum
} from '@/app/dashboard/data-model';

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
  doctor?: {
    id: string;
    full_name: string;
  };
  creator?: {
    id: string;
    full_name: string;
  };
}

// Store simplificado solo para estado UI
interface PatientUIStore {
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;
}

export const usePatientUIStore = create<PatientUIStore>()(
  immer((set) => ({
    selectedPatientId: null,
    setSelectedPatientId: (id) => set((state) => {
      state.selectedPatientId = id;
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
    fecha_registro: parsedFechaRegistro ? parsedFechaRegistro.toISOString() : undefined,
    fecha_nacimiento: parsedFechaNacimiento ? format(parsedFechaNacimiento, 'yyyy-MM-dd') : undefined,
    ultimo_contacto: parsedUltimoContacto ? parsedUltimoContacto.toISOString() : undefined,
    proximo_contacto: parsedProximoContacto ? parsedProximoContacto.toISOString() : undefined,
    fecha_cirugia_programada: parsedFechaCirugiaProgramada ? parsedFechaCirugiaProgramada.toISOString() : undefined,
    fecha_primera_consulta: parsedFechaPrimeraConsulta ? parsedFechaPrimeraConsulta.toISOString() : undefined,
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
    foto_perfil: '',
    preferencias_comunicacion: [],
    consentimientos: [],
  } as PatientData;
};

// Query Keys
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (filters: { page?: number; pageSize?: number; estado?: string }) => 
    [...patientKeys.lists(), filters] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
};

// Hooks de React Query
export const usePatients = (page = 1, pageSize = 20, estado?: string) => {
  return useQuery({
    queryKey: patientKeys.list({ page, pageSize, estado }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (estado) params.append('estado', estado);

      const response = await fetch(`/api/patients?${params}`);
      if (!response.ok) {
        throw new Error('Error fetching patients');
      }
      
      const data = await response.json();
      return {
        patients: data.data.map(transformPatientData),
        pagination: data.pagination
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

export const usePatient = (id: string | null) => {
  return useQuery({
    queryKey: patientKeys.detail(id!),
    queryFn: async () => {
      const response = await fetch(`/api/patients/${id}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Error fetching patient');
      }
      const data = await response.json();
      return transformPatientData(data);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCreatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<PatientData, 'id' | 'fecha_creacion' | 'fecha_actualizacion' | 'created_at' | 'updated_at' | 'historial_cambios' | 'estado_paciente_info' | 'proxima_cita' | 'ultima_cita' | 'fecha_registro'>) => {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error creating patient');
      }
      
      const responseData = await response.json();
      return transformPatientData(responseData);
    },
    onSuccess: (newPatient) => {
      // Invalidar todas las listas de pacientes
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      
      // Agregar el nuevo paciente al cache
      queryClient.setQueryData(
        patientKeys.detail(newPatient.id),
        newPatient
      );
      
      toast.success('Paciente creado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al crear paciente', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    },
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string } & Partial<PatientData>) => {
      const response = await fetch(`/api/patients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error updating patient');
      }
      
      const responseData = await response.json();
      return transformPatientData(responseData);
    },
    onSuccess: (updatedPatient) => {
      // Actualizar el cache del paciente específico
      queryClient.setQueryData(
        patientKeys.detail(updatedPatient.id),
        updatedPatient
      );
      
      // Invalidar las listas para refrescarlas
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      
      toast.success('Paciente actualizado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al actualizar paciente', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    },
  });
};

export const useCreateFollowUp = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (followUpData: Partial<FollowUpData>) => {
      if (!followUpData.patient_id) {
        throw new Error('ID de paciente requerido');
      }

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

      const response = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Error creating follow-up');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidar el paciente específico para refrescar sus datos
      if (variables.patient_id) {
        queryClient.invalidateQueries({ 
          queryKey: patientKeys.detail(variables.patient_id) 
        });
      }
      
      toast.success('Seguimiento creado correctamente');
    },
    onError: (error) => {
      toast.error('Error al crear seguimiento', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    },
  });
};

// Store para compatibilidad hacia atrás (wrapper sobre React Query)
interface PatientStore {
  patients: PatientData[];
  isLoading: boolean;
  error: Error | null;
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

// Store wrapper para mantener compatibilidad
export const usePatientStore = create<PatientStore>(() => ({
  patients: [],
  isLoading: false,
  error: null,
  currentPage: 1,
  pageSize: 20,
  totalCount: 0,
  totalPages: 0,
  
  fetchPatients: async () => {
    // Este método ahora es un no-op porque usamos React Query
    console.warn('fetchPatients is deprecated. Use usePatients hook instead');
  },
  
  addPatient: async (data) => {
    // Este método ahora es un no-op porque usamos React Query
    console.warn('addPatient is deprecated. Use useCreatePatient hook instead');
    throw new Error('Use useCreatePatient hook instead');
  },
  
  updatePatient: async (input) => {
    // Este método ahora es un no-op porque usamos React Query
    console.warn('updatePatient is deprecated. Use useUpdatePatient hook instead');
    throw new Error('Use useUpdatePatient hook instead');
  },
  
  getPatientById: async (patientId) => {
    // Este método ahora es un no-op porque usamos React Query
    console.warn('getPatientById is deprecated. Use usePatient hook instead');
    return null;
  },
  
  addFollowUp: async (followUpData) => {
    // Este método ahora es un no-op porque usamos React Query
    console.warn('addFollowUp is deprecated. Use useCreateFollowUp hook instead');
    throw new Error('Use useCreateFollowUp hook instead');
  },
}));