// utils/appointment-transformer.ts
// Utilidades centralizadas para transformación y validación de citas

import type { 
  ApiAppointment, 
  NormalizedAppointment, 
  AppointmentsByDate,
} from '@/types/appointments';

// Definición local de AppointmentCounts para evitar dependencias circulares
export interface AppointmentCounts {
  readonly today: number;
  readonly future: number;
  readonly past: number;
  readonly total: number;
}

/**
 * Valida y filtra las citas de la API eliminando datos inválidos o incompletos
 * @param rawData - Datos crudos de la API
 * @returns Array de citas válidas
 */
export function validateAndFilterApiAppointments(rawData: any[]): ApiAppointment[] {
  if (!Array.isArray(rawData)) {
    console.warn('validateAndFilterApiAppointments: rawData no es un array:', rawData);
    return [];
  }

  return rawData.filter((item): item is ApiAppointment => {
    // Validaciones básicas requeridas
    if (!item || typeof item !== 'object') return false;
    if (!item.id || typeof item.id !== 'string') return false;
    if (!item.patient_id || typeof item.patient_id !== 'string') return false;
    if (!item.fecha_hora_cita || typeof item.fecha_hora_cita !== 'string') return false;
    if (!item.estado_cita || typeof item.estado_cita !== 'string') return false;

    // Validar que tiene información del paciente
    if (!item.patients || typeof item.patients !== 'object') return false;
    if (!item.patients.id || !item.patients.nombre) return false;

    // Validar estados permitidos
    const validStatuses = ['PROGRAMADA', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA', 'PRESENTE', 'REAGENDADA', 'NO ASISTIO'];
    if (!validStatuses.includes(item.estado_cita)) return false;

    return true;
  });
}

/**
 * Transforma las citas de la API al formato normalizado del frontend
 * @param apiAppointments - Citas válidas de la API
 * @returns Array de citas normalizadas
 */
export function transformApiAppointments(apiAppointments: ApiAppointment[]): NormalizedAppointment[] {
  return apiAppointments.map((appointment): NormalizedAppointment => {
    return {
      id: appointment.id,
      patientId: appointment.patient_id,
      doctorId: appointment.doctor_id,
      dateTime: new Date(appointment.fecha_hora_cita),
      motivo: appointment.motivo_cita || 'Consulta general',
      status: appointment.estado_cita,
      isFirstTime: appointment.es_primera_vez || false,
      notes: appointment.notas_cita_seguimiento,
      createdAt: new Date(appointment.created_at),
      patient: {
        id: appointment.patients.id,
        name: appointment.patients.nombre || 'Sin nombre',
        lastName: appointment.patients.apellidos || 'Sin apellido',
        phone: appointment.patients.telefono,
        email: appointment.patients.email,
        status: appointment.patients.estado_paciente || 'potencial',
      },
    };
  });
}

/**
 * Agrupa las citas normalizadas por fecha (hoy, futuras, pasadas)
 * @param normalizedAppointments - Citas normalizadas
 * @returns Objeto con citas agrupadas por fecha
 */
export function groupAppointmentsByDate(normalizedAppointments: NormalizedAppointment[]): AppointmentsByDate {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const today: NormalizedAppointment[] = [];
  const future: NormalizedAppointment[] = [];
  const past: NormalizedAppointment[] = [];

  normalizedAppointments.forEach((appointment) => {
    const appointmentDate = new Date(appointment.dateTime);
    
    if (appointmentDate >= todayStart && appointmentDate < todayEnd) {
      today.push(appointment);
    } else if (appointmentDate >= todayEnd) {
      future.push(appointment);
    } else {
      past.push(appointment);
    }
  });

  // Ordenar las citas por fecha
  today.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  future.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  past.sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime()); // Más recientes primero

  return { today, future, past };
}

/**
 * Calcula los conteos de citas por categoría de fecha
 * @param appointmentsByDate - Citas agrupadas por fecha
 * @returns Conteos de citas
 */
export function calculateAppointmentCounts(appointmentsByDate: AppointmentsByDate): AppointmentCounts {
  const today = appointmentsByDate.today?.length || 0;
  const future = appointmentsByDate.future?.length || 0;
  const past = appointmentsByDate.past?.length || 0;
  const total = today + future + past;

  return {
    today,
    future,
    past,
    total,
  };
}

/**
 * Utilidad para clasificar una fecha individual
 * @param date - Fecha a clasificar
 * @returns Clasificación de la fecha ('today' | 'future' | 'past')
 */
export function classifyDate(date: Date): 'today' | 'future' | 'past' {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  if (date >= todayStart && date < todayEnd) {
    return 'today';
  } else if (date >= todayEnd) {
    return 'future';
  } else {
    return 'past';
  }
}

/**
 * Pipeline completo de transformación de citas de la API
 * @param rawData - Datos crudos de la API
 * @returns Objeto con citas procesadas y conteos
 */
export function processAppointmentData(rawData: any[]) {
  const validApiAppointments = validateAndFilterApiAppointments(rawData);
  const normalizedAppointments = transformApiAppointments(validApiAppointments);
  const appointmentsByDate = groupAppointmentsByDate(normalizedAppointments);
  const counts = calculateAppointmentCounts(appointmentsByDate);

  return {
    appointments: normalizedAppointments,
    appointmentsByDate,
    counts,
    validApiAppointments,
  };
}
