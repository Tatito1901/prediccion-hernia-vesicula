// lib/context/app-context.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
} from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
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

export type {
  PatientData,
  AppointmentData,
  DoctorData,
  ClinicMetrics,
  PatientStatus,
  AppointmentStatus,
} from '@/app/dashboard/data-model';

const API_BASE_URL = '/api';
const DEFAULT_USER_ID = '5e4d29a2-5eec-49ee-ac0f-8d349d5660ed';

// Helpers (definidos fuera para no recrearlos)
const normalizeId = (id: any): string =>
  id == null || id === '' ? '' : String(id).trim();

const safeParseDate = (s: string): Date | null => {
  const d = parseISO(s);
  return isValid(d) ? d : null;
};

const fetchWithRetry = async (
  input: RequestInfo,
  init: RequestInit,
  retries = 3
): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(input, init);
      if (res.ok || res.status < 500) return res;
    } catch {}
    if (i === retries - 1) break;
    await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
  }
  throw new Error('Network error');
};

// Define lo que vas a exponer en tu contexto
interface AppContextType {
  patients: PatientData[];
  isLoadingPatients: boolean;
  errorPatients: string | null;

  appointments: AppointmentData[];
  isLoadingAppointments: boolean;
  errorAppointments: string | null;

  doctors: DoctorData[];
  metrics: ClinicMetrics;

  refetchPatients: () => void;
  addPatient: (data: Omit<PatientData, 'id'>) => Promise<PatientData>;
  updatePatient: (
    id: string,
    update: Partial<PatientData>
  ) => Promise<PatientData>;

  refetchAppointments: () => void;
  addAppointment: (
    data: Omit<AppointmentData, 'id'>
  ) => Promise<AppointmentData>;
  updateAppointment: (
    id: string,
    update: Partial<AppointmentData>
  ) => Promise<AppointmentData>;

  getAppointmentHistory: (id: string) => Promise<any[]>;
  updateAppointmentStatus: (
    id: string,
    newStatus: AppointmentStatus,
    motivo?: string,
    nuevaFecha?: string
  ) => Promise<AppointmentData>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Este es el único provider que exportarás
export function AppProvider({ children }: { children: ReactNode }) {
  // 1) Crea el QueryClient **solo una vez** en cliente
  const [queryClient] = useState(() => new QueryClient());

  return (
    // 2) Envuelve a todo con React Query
    <QueryClientProvider client={queryClient}>
      {/* 3) Este componente interno sí ve el QueryClient */}
      <AppProviderInner>{children}</AppProviderInner>
    </QueryClientProvider>
  );
}

// Aquí va toda tu lógica de queries/mutations y armado de contexto
function AppProviderInner({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  // — Patients
  const {
    data: patients = [],
    isLoading: isLoadingPatients,
    error: errorPatientsObj,
    refetch: refetchPatients,
  } = useQuery<PatientData[], Error>({
    queryKey: ['patients'],
    queryFn: async () => {
      const res = await fetchWithRetry(`${API_BASE_URL}/patients`, {
        method: 'GET',
      });
      if (!res.ok) throw new Error(res.statusText);
      const list = (await res.json()) as PatientData[];
      return list.map((p) => ({
        ...p,
        id: normalizeId(p.id),
        telefono: p.telefono || 'Sin teléfono',
        estado: p.estado as PatientStatus,
      }));
    },
    staleTime: 300_000,
  });
  const errorPatients = errorPatientsObj?.message ?? null;

  const addPatientMutation = useMutation({
    mutationFn: async (payload: Omit<PatientData, 'id'>) => {
      const res = await fetchWithRetry(`${API_BASE_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, creado_por_id: DEFAULT_USER_ID }),
      });
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      return { ...json, id: normalizeId(json.id) } as PatientData;
    },
    onSuccess: (newP) => {
      qc.setQueryData(['patients'], (old: PatientData[] = []) => [
        newP,
        ...old,
      ]);
      toast.success('Paciente registrado');
    },
    onError: (err: Error) => {
      toast.error('Error al registrar paciente', { description: err.message });
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: async ({
      id,
      update,
    }: {
      id: string;
      update: Partial<PatientData>;
    }) => {
      const res = await fetchWithRetry(`${API_BASE_URL}/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      return { ...json, id } as PatientData;
    },
    onSuccess: (upd) => {
      qc.setQueryData(['patients'], (old: PatientData[] = []) =>
        old.map((p) => (p.id === upd.id ? upd : p))
      );
      toast.success('Paciente actualizado');
    },
    onError: (err: Error) => {
      toast.error('Error al actualizar paciente', { description: err.message });
    },
  });

  // — Appointments
  const {
    data: appointments = [],
    isLoading: isLoadingAppointments,
    error: errorAppointmentsObj,
    refetch: refetchAppointments,
  } = useQuery<AppointmentData[], Error>({
    queryKey: ['appointments'],
    queryFn: async () => {
      const res = await fetchWithRetry(`${API_BASE_URL}/appointments`, {
        method: 'GET',
      });
      if (!res.ok) throw new Error(res.statusText);
      const raw = (await res.json()) as any[];
      return raw.map((app) => {
        const fecha = safeParseDate(app.fecha_hora_cita);
        return {
          id: normalizeId(app.id),
          paciente: `${app.patients?.nombre} ${app.patients?.apellidos}`.trim(),
          telefono: app.patients?.telefono || 'Sin teléfono',
          doctor: app.doctor?.full_name || 'No asignado',
          fechaConsulta: fecha || new Date(),
          horaConsulta: fecha ? format(fecha, 'HH:mm') : '00:00',
          motivoConsulta: app.motivo_cita,
          estado: (app.estado_cita || 'pendiente').toLowerCase() as AppointmentStatus,
          notas: app.notas_cita_seguimiento || '',
        } as AppointmentData;
      });
    },
    staleTime: 300_000,
  });
  const errorAppointments = errorAppointmentsObj?.message ?? null;

  const addAppointmentMutation = useMutation({
    mutationFn: async (payload: Omit<AppointmentData, 'id'>) => {
      // Format the date and time into a single ISO string
      const dateTime = new Date(payload.fechaConsulta);
      const [hours, minutes] = payload.horaConsulta.split(':').map(Number);
      dateTime.setHours(hours, minutes, 0, 0);
      
      // Transform the payload to match the API's expected format
      const apiPayload = {
        patient_id: payload.patientId,
        doctor_id: DEFAULT_USER_ID, // Or derive from payload.doctor if needed
        fecha_hora_cita: dateTime.toISOString(),
        motivo_cita: payload.motivoConsulta,
        estado_cita: payload.estado,
        es_primera_vez: true, // Default or from payload if available
        notas_cita_seguimiento: payload.notas || null
      };

      const res = await fetchWithRetry(`${API_BASE_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      const fecha = safeParseDate(json.fecha_hora_cita) || new Date();
      return {
        ...json,
        id: normalizeId(json.id),
        fechaConsulta: fecha,
        horaConsulta: format(fecha, 'HH:mm'),
      } as AppointmentData;
    },
    onSuccess: (newA) => {
      qc.setQueryData(['appointments'], (old: AppointmentData[] = []) => [
        newA,
        ...old,
      ]);
      toast.success('Cita agendada');
    },
    onError: (err: Error) => {
      toast.error('Error al agendar cita', { description: err.message });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({
      id,
      update,
    }: {
      id: string;
      update: Partial<AppointmentData>;
    }) => {
      const res = await fetchWithRetry(`${API_BASE_URL}/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      const fecha = safeParseDate(json.fecha_hora_cita) || new Date();
      return {
        ...json,
        id,
        fechaConsulta: fecha,
        horaConsulta: format(fecha, 'HH:mm'),
      } as AppointmentData;
    },
    onSuccess: (upd) => {
      qc.setQueryData(['appointments'], (old: AppointmentData[] = []) =>
        old.map((a) => (a.id === upd.id ? upd : a))
      );
      toast.success('Cita actualizada');
    },
    onError: (err: Error) => {
      toast.error('Error al actualizar cita', { description: err.message });
    },
  });

  const getAppointmentHistory = async (id: string) => {
    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/appointments/${id}/history`, {
        method: 'GET',
      });
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    } catch (err: any) {
      toast.error('Error al cargar historial', { description: err.message });
      return [];
    }
  };

  const updateAppointmentStatus = async (
    id: string,
    newStatus: AppointmentStatus,
    motivo?: string,
    nuevaFecha?: string
  ) => {
    const payload: any = { estado_cita: newStatus, actor_id: DEFAULT_USER_ID, motivo_cambio: motivo };
    if (nuevaFecha) payload.fecha_hora_cita = nuevaFecha;

    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      const fecha = safeParseDate(json.fecha_hora_cita) || new Date();
      const updated: AppointmentData = {
        ...json,
        id,
        fechaConsulta: fecha,
        horaConsulta: format(fecha, 'HH:mm'),
      };
      qc.setQueryData(['appointments'], (old: AppointmentData[] = []) =>
        old.map((a) => (a.id === id ? updated : a))
      );
      toast.success('Estado de cita actualizado');
      return updated;
    } catch (err: any) {
      toast.error('Error al actualizar estado', { description: err.message });
      throw err;
    }
  };

  // Derivar métricas (placeholder)
  const metrics = useMemo<ClinicMetrics>(() => ({} as ClinicMetrics), [
    patients,
    appointments,
  ]);

  // Context value
  const value = useMemo<AppContextType>(
    () => ({
      patients,
      isLoadingPatients,
      errorPatients,

      appointments,
      isLoadingAppointments,
      errorAppointments,

      doctors: [], // implementar si necesitas
      metrics,

      refetchPatients,
      addPatient: addPatientMutation.mutateAsync,
      updatePatient: (id: string, update: Partial<PatientData>) =>
        updatePatientMutation.mutateAsync({ id, update }),

      refetchAppointments,
      addAppointment: addAppointmentMutation.mutateAsync,
      updateAppointment: (id: string, update: Partial<AppointmentData>) =>
        updateAppointmentMutation.mutateAsync({ id, update }),

      getAppointmentHistory,
      updateAppointmentStatus,
    }),
    [
      patients,
      isLoadingPatients,
      errorPatients,
      appointments,
      isLoadingAppointments,
      errorAppointments,
      metrics,
      addPatientMutation,
      updatePatientMutation,
      addAppointmentMutation,
      updateAppointmentMutation,
      getAppointmentHistory,
      updateAppointmentStatus,
      refetchPatients,
      refetchAppointments,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook para usar contexto
export function useAppContext(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext debe usarse dentro de AppProvider');
  return ctx;
}
