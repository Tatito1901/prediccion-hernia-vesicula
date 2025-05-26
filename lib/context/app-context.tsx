// lib/context/app-context-supabase.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { toast } from "sonner";
import { format, isValid, parseISO } from "date-fns";
import type { 
  PatientData, 
  AppointmentData, 
  FollowUp, 
  DoctorData, 
  ClinicMetrics, 
  PatientStatus, 
  AppointmentStatus, 
  DiagnosisType 
} from "@/app/dashboard/data-model";

// Definición de la URL base de tu API
const API_BASE_URL = "/api";

// ID de usuario por defecto hasta implementar auth
const DEFAULT_USER_ID = "5e4d29a2-5eec-49ee-ac0f-8d349d5660ed";

// Funciones auxiliares robustas
const isValidDate = (date: any): boolean => {
  if (!date) return false;
  const dateObj = date instanceof Date ? date : new Date(date);
  return isValid(dateObj) && !isNaN(dateObj.getTime());
};

const safeFormatDate = (date: any, formatString: string, fallback: string = ""): string => {
  try {
    if (!date) return fallback;
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValidDate(dateObj)) return fallback;
    return format(dateObj, formatString);
  } catch (error) {
    console.error("[safeFormatDate] Error:", error);
    return fallback;
  }
};

const normalizeId = (id: any): string => {
  if (id === null || id === undefined || id === "") return "";
  return String(id).trim();
};

// Función para realizar peticiones con reintentos
const fetchWithRetry = async (url: string, options: RequestInit, retries = 3): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status < 500) {
        return response;
      }
      if (i === retries - 1) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error("Failed after retries");
};

interface AppContextType {
  patients: PatientData[];
  appointments: AppointmentData[];
  doctors: DoctorData[];
  metrics: ClinicMetrics;
  
  isLoadingPatients: boolean;
  isLoadingAppointments: boolean;
  errorPatients: string | null;
  errorAppointments: string | null;

  fetchPatients: () => Promise<void>;
  fetchAppointments: (filters?: Record<string, string>) => Promise<void>;

  addPatient: (patientData: Omit<PatientData, "id" | "fechaRegistro" | "probabilidadCirugia" | "estado" | "timestampRegistro" | "ultimoContacto" | "proximoContacto" | "etiquetas" | "fechaCirugia" | "doctorAsignado" | "citas" | "seguimientos" | "encuesta" | "recomendacionesSistema" | "creado_por_id"> & { 
    creado_por_id?: string, 
    doctor_asignado_id?: string, 
    estado_paciente?: PatientStatus, 
    diagnostico_principal?: DiagnosisType, 
    comentarios_registro?: string, 
    origen_paciente?: string,
    fecha_registro?: string 
  }) => Promise<PatientData | number | null>;
  
  updatePatient: (patientId: string, patientUpdate: Partial<PatientData>) => Promise<PatientData | null>;
  getPatientById: (id: string) => PatientData | undefined;

  addAppointment: (appointmentData: Omit<AppointmentData, "id" | "paciente" | "telefono" | "doctor"> & { 
    patient_id: string, 
    doctor_id?: string,
    fecha_hora_cita?: string 
  }) => Promise<AppointmentData | null>;
  
  updateAppointment: (appointmentId: string, appointmentUpdate: Partial<AppointmentData>) => Promise<AppointmentData | null>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [doctors, setDoctors] = useState<DoctorData[]>([]);
  const [metrics, setMetrics] = useState<ClinicMetrics>({} as ClinicMetrics);

  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [errorPatients, setErrorPatients] = useState<string | null>(null);
  const [errorAppointments, setErrorAppointments] = useState<string | null>(null);

  // --- Fetching Data ---
  const fetchPatients = useCallback(async () => {
    setIsLoadingPatients(true);
    setErrorPatients(null);
    try {
      console.log("[fetchPatients] Iniciando carga...");
      const response = await fetchWithRetry(`${API_BASE_URL}/patients`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data: PatientData[] = await response.json();
      console.log("[fetchPatients] Pacientes cargados:", data.length);
      
      // Normalizar IDs y validar datos
      const normalizedPatients = data.map(p => ({
        ...p,
        id: normalizeId(p.id),
        telefono: p.telefono || "Sin teléfono",
        estado: p.estado || p.estado_paciente || "PENDIENTE DE CONSULTA",
      }));
      
      setPatients(normalizedPatients);
      setErrorPatients(null);
    } catch (err: any) {
      console.error("[fetchPatients] Error:", err);
      const errorMessage = err.message || "No se pudieron cargar los pacientes.";
      setErrorPatients(errorMessage);
      toast.error("Error al cargar pacientes", { 
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsLoadingPatients(false);
    }
  }, []);

  const fetchAppointments = useCallback(async (filters?: Record<string, string>) => {
    setIsLoadingAppointments(true);
    setErrorAppointments(null);
    try {
      const queryParams = filters ? new URLSearchParams(filters).toString() : "";
      const url = `${API_BASE_URL}/appointments${queryParams ? `?${queryParams}` : ''}`;
      console.log("[fetchAppointments] URL:", url);
      
      const response = await fetchWithRetry(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data: any[] = await response.json();
      console.log("[fetchAppointments] Citas cargadas:", data.length);
      
      // Mapear y normalizar datos
      const formattedAppointments = data.map(app => {
        try {
          // Validar y parsear fecha
          let fechaConsulta: Date;
          let horaConsulta: string;
          
          if (app.fecha_hora_cita) {
            const fecha = parseISO(app.fecha_hora_cita);
            if (isValidDate(fecha)) {
              fechaConsulta = fecha;
              horaConsulta = safeFormatDate(fecha, "HH:mm", "00:00");
            } else {
              console.warn("[fetchAppointments] Fecha inválida:", app.fecha_hora_cita);
              fechaConsulta = new Date();
              horaConsulta = "00:00";
            }
          } else {
            fechaConsulta = new Date();
            horaConsulta = "00:00";
          }
          
          return {
            id: normalizeId(app.id),
            patientId: app.patient_id ? normalizeId(app.patient_id) : undefined,
            paciente: app.patients ? `${app.patients.nombre} ${app.patients.apellidos}`.trim() : "Paciente desconocido",
            telefono: app.patients?.telefono || "Sin teléfono",
            doctor: app.doctor?.full_name || app.profiles?.full_name || "No asignado",
            fechaConsulta,
            horaConsulta,
            motivoConsulta: app.motivo_cita || "Sin especificar",
            estado: (app.estado_cita || "pendiente").toLowerCase() as AppointmentStatus,
            es_primera_vez: app.es_primera_vez,
            notas_cita_seguimiento: app.notas_cita_seguimiento,
          } as AppointmentData;
        } catch (error) {
          console.error("[fetchAppointments] Error procesando cita:", error, app);
          // Retornar cita con valores por defecto en caso de error
          return {
            id: normalizeId(app.id || `error-${Date.now()}`),
            paciente: "Error al cargar",
            telefono: "N/A",
            fechaConsulta: new Date(),
            horaConsulta: "00:00",
            motivoConsulta: "Error",
            estado: "pendiente" as AppointmentStatus,
            doctor: "No asignado",
          } as AppointmentData;
        }
      });
      
      setAppointments(formattedAppointments);
      setErrorAppointments(null);
    } catch (err: any) {
      console.error("[fetchAppointments] Error:", err);
      const errorMessage = err.message || "No se pudieron cargar las citas.";
      setErrorAppointments(errorMessage);
      toast.error("Error al cargar citas", { 
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsLoadingAppointments(false);
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    Promise.all([
      fetchPatients(),
      fetchAppointments()
    ]).catch(err => {
      console.error("[AppProvider] Error en carga inicial:", err);
    });
  }, [fetchPatients, fetchAppointments]);

  // --- Patient Management ---
  const addPatient = useCallback(async (patientData: any): Promise<PatientData | number | null> => {
    try {
      console.log("[addPatient] Iniciando...");
      
      // Validar datos requeridos
      if (!patientData.nombre || !patientData.apellidos || !patientData.telefono) {
        throw new Error("Faltan datos requeridos del paciente");
      }
      
      // Asegurar que se use el ID de usuario por defecto si no se proporciona
      const payload = {
        ...patientData,
        creado_por_id: patientData.creado_por_id || DEFAULT_USER_ID,
        fecha_registro: patientData.fecha_registro || new Date().toISOString().split('T')[0],
      };
      
      console.log("[addPatient] Enviando payload:", payload);
      
      const response = await fetchWithRetry(`${API_BASE_URL}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Error ${response.status}`);
      }
      
      // Manejar diferentes tipos de respuesta
      const contentType = response.headers.get("content-type");
      const responseText = await response.text();
      console.log("[addPatient] Respuesta recibida:", responseText);
      
      let result: PatientData | number;
      
      if (contentType?.includes("application/json")) {
        try {
          result = JSON.parse(responseText);
        } catch {
          // Si falla el parse pero es un número
          if (/^\d+$/.test(responseText.trim())) {
            result = parseInt(responseText.trim(), 10);
          } else {
            throw new Error("Respuesta inválida del servidor");
          }
        }
      } else if (/^\d+$/.test(responseText.trim())) {
        result = parseInt(responseText.trim(), 10);
      } else {
        throw new Error("Formato de respuesta no reconocido");
      }
      
      // Construir objeto completo si solo recibimos ID
      if (typeof result === 'number') {
        const newPatient: PatientData = {
          id: normalizeId(result),
          ...payload,
          estado: payload.estado_paciente || "PENDIENTE DE CONSULTA",
          probabilidadCirugia: 0,
          timestampRegistro: new Date().toISOString(),
          ultimoContacto: payload.fecha_registro,
        } as PatientData;
        
        setPatients(prev => [newPatient, ...prev]);
        toast.success("Paciente registrado con éxito");
        return newPatient;
      } else {
        // Normalizar el objeto recibido
        const normalizedPatient = {
          ...result,
          id: normalizeId(result.id),
        } as PatientData;
        
        setPatients(prev => [normalizedPatient, ...prev]);
        toast.success("Paciente registrado con éxito");
        return normalizedPatient;
      }
    } catch (err: any) {
      console.error("[addPatient] Error:", err);
      const errorMessage = err.message || "Error al añadir paciente";
      toast.error("Error al registrar paciente", { 
        description: errorMessage,
        duration: 5000,
      });
      return null;
    }
  }, []);

  const updatePatient = useCallback(async (patientId: string, patientUpdate: Partial<PatientData>): Promise<PatientData | null> => {
    try {
      console.log("[updatePatient] Actualizando paciente:", patientId);
      
      if (!patientId) {
        throw new Error("ID de paciente requerido");
      }
      
      // Limpiar datos que no deben enviarse
      const { id, created_at, ...updateData } = patientUpdate as any;
      
      const response = await fetchWithRetry(`${API_BASE_URL}/patients/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Error ${response.status}`);
      }
      
      // Procesar respuesta
      const responseText = await response.text();
      let updatedPatient: PatientData;
      
      if (/^\d+$/.test(responseText.trim())) {
        // Si la respuesta es solo un ID, usar los datos actuales
        const currentPatient = patients.find(p => normalizeId(p.id) === patientId);
        if (!currentPatient) {
          throw new Error("Paciente no encontrado en el estado");
        }
        
        updatedPatient = {
          ...currentPatient,
          ...updateData,
          id: patientId,
        } as PatientData;
      } else {
        try {
          updatedPatient = JSON.parse(responseText);
          updatedPatient.id = normalizeId(updatedPatient.id);
        } catch {
          throw new Error("Respuesta inválida del servidor");
        }
      }
      
      setPatients(prev => prev.map(p => 
        normalizeId(p.id) === patientId ? updatedPatient : p
      ));
      
      toast.success("Paciente actualizado con éxito");
      return updatedPatient;
    } catch (err: any) {
      console.error("[updatePatient] Error:", err);
      const errorMessage = err.message || "Error al actualizar paciente";
      toast.error("Error al actualizar", { 
        description: errorMessage,
        duration: 5000,
      });
      return null;
    }
  }, [patients]);

  const getPatientById = useCallback((id: string): PatientData | undefined => {
    if (!id) return undefined;
    return patients.find(p => normalizeId(p.id) === normalizeId(id));
  }, [patients]);

  // --- Appointment Management ---
  const addAppointment = useCallback(async (appointmentData: any): Promise<AppointmentData | null> => {
    try {
      console.log("[addAppointment] Iniciando...");
      
      // Validar datos requeridos
      if (!appointmentData.patient_id || !appointmentData.motivo_cita) {
        throw new Error("Faltan datos requeridos de la cita");
      }
      
      // Preparar payload
      const payload = {
        ...appointmentData,
        patient_id: normalizeId(appointmentData.patient_id),
        estado_cita: appointmentData.estado_cita || "PROGRAMADA",
        es_primera_vez: appointmentData.es_primera_vez !== undefined ? appointmentData.es_primera_vez : true,
      };
      
      // Asegurar formato correcto de fecha
      if (!payload.fecha_hora_cita && appointmentData.fechaConsulta) {
        const fecha = appointmentData.fechaConsulta;
        const fechaObj = fecha instanceof Date ? fecha : parseISO(fecha);
        if (isValidDate(fechaObj)) {
          payload.fecha_hora_cita = fechaObj.toISOString();
        } else {
          throw new Error("Fecha de cita inválida");
        }
      }
      
      // Limpiar campos que no van a la BD
      delete payload.fechaConsulta;
      delete payload.horaConsulta;
      
      console.log("[addAppointment] Enviando payload:", payload);
      
      const response = await fetchWithRetry(`${API_BASE_URL}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Error ${response.status}`);
      }
      
      // Procesar respuesta
      const responseText = await response.text();
      let newAppointmentData: any;
      
      if (/^\d+$/.test(responseText.trim())) {
        // Si la respuesta es solo un ID
        const appointmentId = parseInt(responseText.trim(), 10);
        newAppointmentData = {
          id: appointmentId,
          ...payload,
        };
      } else {
        try {
          newAppointmentData = JSON.parse(responseText);
        } catch {
          throw new Error("Respuesta inválida del servidor");
        }
      }
      
      // Buscar datos del paciente para completar la información
      const patient = patients.find(p => normalizeId(p.id) === normalizeId(payload.patient_id));
      const fechaHoraCita = parseISO(newAppointmentData.fecha_hora_cita || payload.fecha_hora_cita);
      
      const newAppointment: AppointmentData = {
        ...newAppointmentData,
        id: normalizeId(newAppointmentData.id),
        patientId: normalizeId(payload.patient_id),
        paciente: patient ? `${patient.nombre} ${patient.apellidos}`.trim() : "Paciente desconocido",
        telefono: patient?.telefono || "Sin teléfono",
        doctor: "No asignado", // TODO: Buscar doctor si hay doctor_id
        fechaConsulta: fechaHoraCita,
        horaConsulta: safeFormatDate(fechaHoraCita, "HH:mm", "00:00"),
        motivoConsulta: payload.motivo_cita,
        estado: (payload.estado_cita || "PROGRAMADA").toLowerCase() as AppointmentStatus,
      };
      
      setAppointments(prev => [newAppointment, ...prev].sort((a, b) => 
        b.fechaConsulta.getTime() - a.fechaConsulta.getTime()
      ));
      
      toast.success("Cita agendada con éxito");
      return newAppointment;
    } catch (err: any) {
      console.error("[addAppointment] Error:", err);
      const errorMessage = err.message || "Error al agendar cita";
      toast.error("Error al agendar", { 
        description: errorMessage,
        duration: 5000,
      });
      return null;
    }
  }, [patients]);

  const updateAppointment = useCallback(async (appointmentId: string, appointmentUpdate: Partial<AppointmentData>): Promise<AppointmentData | null> => {
    try {
      console.log("[updateAppointment] Actualizando cita:", appointmentId);
      
      if (!appointmentId) {
        throw new Error("ID de cita requerido");
      }
      
      // Preparar payload
      const payload: any = { ...appointmentUpdate };
      
      // Mapear campos del frontend a la BD
      if (payload.estado) {
        payload.estado_cita = payload.estado.toUpperCase();
        delete payload.estado;
      }
      
      if (payload.fechaConsulta) {
        const fecha = payload.fechaConsulta;
        const fechaObj = fecha instanceof Date ? fecha : parseISO(fecha);
        if (isValidDate(fechaObj)) {
          const hora = payload.horaConsulta || appointments.find(a => normalizeId(a.id) === appointmentId)?.horaConsulta || "00:00";
          payload.fecha_hora_cita = `${safeFormatDate(fechaObj, "yyyy-MM-dd")}T${hora}:00`;
        }
        delete payload.fechaConsulta;
        delete payload.horaConsulta;
      }
      
      // Limpiar campos que no deben enviarse
      delete payload.id;
      delete payload.paciente;
      delete payload.telefono;
      delete payload.doctor;
      
      const response = await fetchWithRetry(`${API_BASE_URL}/appointments/${appointmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Error ${response.status}`);
      }
      
      // Procesar respuesta
      const responseText = await response.text();
      let updatedAppointmentData: any;
      
      if (/^\d+$/.test(responseText.trim())) {
        // Si la respuesta es solo un ID, usar datos actuales
        const currentAppointment = appointments.find(a => normalizeId(a.id) === appointmentId);
        if (!currentAppointment) {
          throw new Error("Cita no encontrada en el estado");
        }
        
        updatedAppointmentData = {
          ...currentAppointment,
          ...payload,
          id: appointmentId,
        };
      } else {
        try {
          updatedAppointmentData = JSON.parse(responseText);
        } catch {
          throw new Error("Respuesta inválida del servidor");
        }
      }
      
      // Completar información de la cita
      const currentAppointment = appointments.find(a => normalizeId(a.id) === appointmentId);
      const fechaHoraCita = updatedAppointmentData.fecha_hora_cita 
        ? parseISO(updatedAppointmentData.fecha_hora_cita)
        : currentAppointment?.fechaConsulta || new Date();
      
      const updatedAppointment: AppointmentData = {
        ...currentAppointment,
        ...updatedAppointmentData,
        id: normalizeId(appointmentId),
        fechaConsulta: fechaHoraCita,
        horaConsulta: safeFormatDate(fechaHoraCita, "HH:mm", "00:00"),
        estado: (updatedAppointmentData.estado_cita || payload.estado_cita || currentAppointment?.estado || "pendiente").toLowerCase() as AppointmentStatus,
      };
      
      setAppointments(prev => prev.map(app => 
        normalizeId(app.id) === appointmentId ? updatedAppointment : app
      ));
      
      toast.success("Cita actualizada con éxito");
      return updatedAppointment;
    } catch (err: any) {
      console.error("[updateAppointment] Error:", err);
      const errorMessage = err.message || "Error al actualizar cita";
      toast.error("Error al actualizar", { 
        description: errorMessage,
        duration: 5000,
      });
      return null;
    }
  }, [appointments]);

  const contextValue: AppContextType = {
    patients,
    appointments,
    doctors,
    metrics,
    isLoadingPatients,
    isLoadingAppointments,
    errorPatients,
    errorAppointments,
    fetchPatients,
    fetchAppointments,
    addPatient,
    updatePatient,
    getPatientById,
    addAppointment,
    updateAppointment,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext debe ser usado dentro de AppProvider");
  }
  return context;
}