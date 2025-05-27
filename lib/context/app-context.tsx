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
    // En un entorno de producción, podrías enviar este error a un servicio de logging
    // Sentry, LogRocket, etc. en lugar de console.error
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
      if (response.ok || response.status < 500) { // No reintentar en errores 4xx
        return response;
      }
      // Solo reintentar en errores de servidor (5xx)
      if (response.status >= 500 && i === retries - 1) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} after ${retries} retries`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error("Failed after retries"); // Esto no debería alcanzarse si la lógica anterior es correcta
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
  const [doctors, setDoctors] = useState<DoctorData[]>([]); // Asumiendo que se llenará en algún momento
  const [metrics, setMetrics] = useState<ClinicMetrics>({} as ClinicMetrics); // Asumiendo que se llenará

  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [errorPatients, setErrorPatients] = useState<string | null>(null);
  const [errorAppointments, setErrorAppointments] = useState<string | null>(null);

  // --- Fetching Data ---
  const fetchPatients = useCallback(async () => {
    setIsLoadingPatients(true);
    setErrorPatients(null);
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/patients`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Error ${response.status}: ${errorData.message || response.statusText}`);
      }
      
      const data: PatientData[] = await response.json();
      
      const normalizedPatients = data.map(p => ({
        ...p,
        id: normalizeId(p.id),
        telefono: p.telefono || "Sin teléfono",
        estado: p.estado || p.estado_paciente || "PENDIENTE DE CONSULTA",
      }));
      
      setPatients(normalizedPatients);
      setErrorPatients(null);
    } catch (err: any) {
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
      
      const response = await fetchWithRetry(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Error ${response.status}: ${errorData.message || response.statusText}`);
      }
      
      const data: any[] = await response.json();
      
      const formattedAppointments = data.map(app => {
        try {
          let fechaConsulta: Date;
          let horaConsulta: string;
          
          if (app.fecha_hora_cita) {
            const fecha = parseISO(app.fecha_hora_cita);
            if (isValidDate(fecha)) {
              fechaConsulta = fecha;
              horaConsulta = safeFormatDate(fecha, "HH:mm", "00:00");
            } else {
              // Considerar un log a servicio externo si es necesario
              fechaConsulta = new Date(); // Fallback
              horaConsulta = "00:00";
            }
          } else {
            fechaConsulta = new Date(); // Fallback
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
        } catch (errorProcessing) {
          // Log a servicio externo
          return {
            id: normalizeId(app.id || `error-${Date.now()}`),
            paciente: "Error al cargar datos de cita",
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

  useEffect(() => {
    Promise.all([
      fetchPatients(),
      fetchAppointments()
    ]).catch(err => {
      // Este error podría ser más general, indicando un fallo en la carga inicial.
      // Se podría mostrar un toast genérico o loguear a un servicio externo.
      toast.error("Error en la carga inicial de datos", {
        description: "Algunos datos no pudieron cargarse. Intente recargar la página.",
        duration: 7000,
      });
    });
  }, [fetchPatients, fetchAppointments]);

  const addPatient = useCallback(async (patientData: any): Promise<PatientData | number | null> => {
    try {
      if (!patientData.nombre || !patientData.apellidos || !patientData.telefono) {
        toast.error("Datos incompletos", { description: "Nombre, apellidos y teléfono son requeridos." });
        throw new Error("Faltan datos requeridos del paciente");
      }
      
      const payload = {
        ...patientData,
        creado_por_id: patientData.creado_por_id || DEFAULT_USER_ID,
        fecha_registro: patientData.fecha_registro || new Date().toISOString().split('T')[0],
      };
      
      const response = await fetchWithRetry(`${API_BASE_URL}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const responseText = await response.text();

      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
            const errorJson = JSON.parse(responseText);
            errorDetail = errorJson.message || errorDetail;
        } catch { /* No es JSON, usar statusText */ }
        throw new Error(`Error ${response.status}: ${errorDetail}`);
      }
      
      const contentType = response.headers.get("content-type");
      let result: PatientData | number;
      
      if (contentType?.includes("application/json")) {
        try {
          result = JSON.parse(responseText);
        } catch {
          if (/^\d+$/.test(responseText.trim())) {
            result = parseInt(responseText.trim(), 10);
          } else {
            throw new Error("Respuesta JSON inválida del servidor");
          }
        }
      } else if (/^\d+$/.test(responseText.trim())) {
        result = parseInt(responseText.trim(), 10);
      } else {
        // Si la respuesta no es JSON y no es un número, pero fue OK (ej. 201 Created sin cuerpo o con texto plano)
        // Podríamos considerar esto un éxito si la API a veces responde así.
        // Por ahora, lo trataremos como una respuesta no esperada si no es un ID.
        // Si la API puede devolver un 201 sin cuerpo o con un mensaje de texto plano de éxito,
        // esta lógica necesitaría ajustarse.
         throw new Error("Formato de respuesta no reconocido del servidor tras POST exitoso.");
      }
      
      let newPatientObject: PatientData;

      if (typeof result === 'number') {
        newPatientObject = {
          id: normalizeId(result),
          ...payload, // Usar el payload enviado ya que la API solo devolvió un ID
          estado: payload.estado_paciente || "PENDIENTE DE CONSULTA",
          probabilidadCirugia: 0, // Valor por defecto
          timestampRegistro: new Date().toISOString(),
          ultimoContacto: payload.fecha_registro,
          // Asegurar que todos los campos de PatientData estén presentes con valores por defecto si es necesario
          nombre: payload.nombre,
          apellidos: payload.apellidos,
          telefono: payload.telefono,
          email: payload.email || "",
          fechaNacimiento: payload.fechaNacimiento || "",
          // ...otros campos con valores por defecto
        } as PatientData;
      } else {
        newPatientObject = {
          ...result, // La API devolvió el objeto completo
          id: normalizeId(result.id),
        } as PatientData;
      }
      
      setPatients(prev => [newPatientObject, ...prev]);
      toast.success("Paciente registrado con éxito");
      return newPatientObject;

    } catch (err: any) {
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
      if (!patientId) {
        toast.error("Error de datos", { description: "ID de paciente no proporcionado."});
        throw new Error("ID de paciente requerido");
      }
      
      const { id, created_at, ...updateData } = patientUpdate as any; // Campos a excluir
      
      const response = await fetchWithRetry(`${API_BASE_URL}/patients/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      
      const responseText = await response.text();

      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
            const errorJson = JSON.parse(responseText);
            errorDetail = errorJson.message || errorDetail;
        } catch { /* No es JSON, usar statusText */ }
        throw new Error(`Error ${response.status}: ${errorDetail}`);
      }
      
      let updatedPatientResult: PatientData;
      
      if (/^\d+$/.test(responseText.trim())) {
        const currentPatient = patients.find(p => normalizeId(p.id) === patientId);
        if (!currentPatient) {
          throw new Error("Paciente no encontrado en el estado local para actualizar tras recibir ID.");
        }
        updatedPatientResult = {
          ...currentPatient,
          ...updateData, // Aplicar los cambios enviados
          id: patientId, // Asegurar que el ID es el correcto
        } as PatientData;
      } else {
        try {
          const parsedResponse = JSON.parse(responseText);
          updatedPatientResult = {
            ...parsedResponse,
            id: normalizeId(parsedResponse.id || patientId), // Asegurar que el ID es el correcto
          } as PatientData;
        } catch {
          throw new Error("Respuesta JSON inválida del servidor al actualizar paciente.");
        }
      }
      
      setPatients(prev => prev.map(p => 
        normalizeId(p.id) === patientId ? updatedPatientResult : p
      ));
      
      toast.success("Paciente actualizado con éxito");
      return updatedPatientResult;

    } catch (err: any) {
      const errorMessage = err.message || "Error al actualizar paciente";
      toast.error("Error al actualizar paciente", { 
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

  const addAppointment = useCallback(async (appointmentData: any): Promise<AppointmentData | null> => {
    try {
      if (!appointmentData.patient_id || !appointmentData.motivo_cita || (!appointmentData.fecha_hora_cita && !appointmentData.fechaConsulta)) {
         toast.error("Datos incompletos", { description: "Faltan datos requeridos para la cita (paciente, motivo o fecha)." });
        throw new Error("Faltan datos requeridos para la cita");
      }
      
      const payload: any = {
        patient_id: normalizeId(appointmentData.patient_id),
        motivo_cita: appointmentData.motivo_cita,
        estado_cita: appointmentData.estado_cita || "PROGRAMADA",
        es_primera_vez: appointmentData.es_primera_vez !== undefined ? appointmentData.es_primera_vez : true,
        notas_cita_seguimiento: appointmentData.notas_cita_seguimiento || "",
        fecha_hora_cita: "", 
      };
      
      if (appointmentData.fecha_hora_cita) {
        payload.fecha_hora_cita = appointmentData.fecha_hora_cita;
      } else if (appointmentData.fechaConsulta) {
        const fecha = appointmentData.fechaConsulta;
        const fechaObj = fecha instanceof Date ? fecha : parseISO(fecha);
        if (isValidDate(fechaObj)) {
          payload.fecha_hora_cita = fechaObj.toISOString();
        } else {
          toast.error("Fecha inválida", { description: `La fecha de cita proporcionada no es válida: ${JSON.stringify(fecha)}`});
          throw new Error(`Fecha de cita inválida: ${JSON.stringify(fecha)}`);
        }
      }
      
      const response = await fetchWithRetry(`${API_BASE_URL}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const responseText = await response.text();

      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
            const errorJson = JSON.parse(responseText);
            errorDetail = errorJson.message || errorDetail;
        } catch { /* No es JSON, usar statusText */ }
        throw new Error(`Error ${response.status}: ${errorDetail}`);
      }
      
      let newAppointmentResponseData: any;
      if (/^\d+$/.test(responseText.trim())) {
        newAppointmentResponseData = {
          id: parseInt(responseText.trim(), 10),
          ...payload, // Usar payload ya que la API solo devolvió ID
        };
      } else {
        try {
          newAppointmentResponseData = JSON.parse(responseText);
        } catch (jsonError) {
          throw new Error("Respuesta JSON inválida del servidor al añadir cita: " + responseText.substring(0, 100));
        }
      }
      
      const patient = patients.find(p => normalizeId(p.id) === normalizeId(payload.patient_id));
      const fechaHoraCita = parseISO(newAppointmentResponseData.fecha_hora_cita || payload.fecha_hora_cita);
      
      const newAppointment: AppointmentData = {
        ...newAppointmentResponseData, // Contiene el ID de la API y otros campos devueltos
        id: normalizeId(newAppointmentResponseData.id),
        patientId: normalizeId(payload.patient_id), // Asegurar que es el ID normalizado
        paciente: patient ? `${patient.nombre} ${patient.apellidos}`.trim() : "Paciente no encontrado",
        telefono: patient?.telefono || "Sin teléfono",
        doctor: "No asignado", // TODO: Implementar lógica de asignación de doctor si es necesario
        fechaConsulta: fechaHoraCita,
        horaConsulta: safeFormatDate(fechaHoraCita, "HH:mm", "00:00"),
        motivoConsulta: payload.motivo_cita, // Usar el motivo del payload
        estado: (newAppointmentResponseData.estado_cita || payload.estado_cita || "PROGRAMADA").toLowerCase() as AppointmentStatus,
        es_primera_vez: newAppointmentResponseData.es_primera_vez !== undefined ? newAppointmentResponseData.es_primera_vez : payload.es_primera_vez,
        notas_cita_seguimiento: newAppointmentResponseData.notas_cita_seguimiento || payload.notas_cita_seguimiento,
      };
      
      setAppointments(prev => [newAppointment, ...prev].sort((a, b) => 
        b.fechaConsulta.getTime() - a.fechaConsulta.getTime()
      ));
      
      toast.success("Cita agendada con éxito");
      return newAppointment;

    } catch (err: any) {
      // No relanzar el error aquí si ya se manejó con toast
      const errorMessage = err.message || "Error al agendar la cita";
      toast.error("Error al agendar cita", { 
        description: errorMessage,
        duration: 5000,
      });
      return null;
    }
  }, [patients]);

  const updateAppointment = useCallback(async (appointmentId: string, appointmentUpdate: Partial<AppointmentData>): Promise<AppointmentData | null> => {
    try {
      if (!appointmentId) {
        toast.error("Error de datos", { description: "ID de cita no proporcionado."});
        throw new Error("ID de cita requerido");
      }
      
      const payload: any = { ...appointmentUpdate };
      
      if (payload.estado) {
        payload.estado_cita = payload.estado.toUpperCase();
        delete payload.estado;
      }
      
      if (payload.fechaConsulta) {
        const fecha = payload.fechaConsulta;
        const fechaObj = fecha instanceof Date ? fecha : parseISO(fecha);
        if (isValidDate(fechaObj)) {
          const currentAppointment = appointments.find(a => normalizeId(a.id) === appointmentId);
          const hora = payload.horaConsulta || currentAppointment?.horaConsulta || "00:00";
          payload.fecha_hora_cita = `${safeFormatDate(fechaObj, "yyyy-MM-dd")}T${hora}:00`; // Asumir segundos :00
        } else {
            toast.error("Fecha inválida", { description: `La fecha de cita proporcionada no es válida: ${JSON.stringify(fecha)}`});
            throw new Error(`Fecha de cita inválida para actualizar: ${JSON.stringify(fecha)}`);
        }
        delete payload.fechaConsulta;
        delete payload.horaConsulta;
      }
      
      delete payload.id;
      delete payload.paciente;
      delete payload.telefono;
      delete payload.doctor;
      
      const response = await fetchWithRetry(`${API_BASE_URL}/appointments/${appointmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const responseText = await response.text();

      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
            const errorJson = JSON.parse(responseText);
            errorDetail = errorJson.message || errorDetail;
        } catch { /* No es JSON, usar statusText */ }
        throw new Error(`Error ${response.status}: ${errorDetail}`);
      }
      
      let updatedAppointmentResponseData: any;
      const currentAppointmentForUpdate = appointments.find(a => normalizeId(a.id) === appointmentId);
      if (!currentAppointmentForUpdate) {
        throw new Error("Cita no encontrada en el estado local para actualizar.");
      }

      if (/^\d+$/.test(responseText.trim())) {
        updatedAppointmentResponseData = {
          ...currentAppointmentForUpdate, // Usar datos actuales
          ...payload, // Aplicar los cambios enviados que estaban en el payload
          id: appointmentId, // Asegurar que el ID es el correcto
        };
      } else {
        try {
          const parsedResponse = JSON.parse(responseText);
          updatedAppointmentResponseData = {
            ...currentAppointmentForUpdate, // Mantener datos base
            ...parsedResponse, // Sobrescribir con lo que devuelva la API
            id: normalizeId(parsedResponse.id || appointmentId), // Asegurar ID
          };
        } catch {
          throw new Error("Respuesta JSON inválida del servidor al actualizar cita.");
        }
      }
      
      const fechaHoraCita = updatedAppointmentResponseData.fecha_hora_cita 
        ? parseISO(updatedAppointmentResponseData.fecha_hora_cita)
        : currentAppointmentForUpdate.fechaConsulta;
      
      const finalUpdatedAppointment: AppointmentData = {
        ...currentAppointmentForUpdate, // Empezar con el estado actual
        ...updatedAppointmentResponseData, // Aplicar lo que vino de la API o se construyó
        id: normalizeId(appointmentId), // Asegurar el ID original
        fechaConsulta: fechaHoraCita,
        horaConsulta: safeFormatDate(fechaHoraCita, "HH:mm", "00:00"),
        estado: (updatedAppointmentResponseData.estado_cita || payload.estado_cita || currentAppointmentForUpdate.estado).toLowerCase() as AppointmentStatus,
      };
      
      setAppointments(prev => prev.map(app => 
        normalizeId(app.id) === appointmentId ? finalUpdatedAppointment : app
      ));
      
      toast.success("Cita actualizada con éxito");
      return finalUpdatedAppointment;

    } catch (err: any) {
      const errorMessage = err.message || "Error al actualizar cita";
      toast.error("Error al actualizar cita", { 
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
