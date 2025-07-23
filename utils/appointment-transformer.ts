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
    // 🔍 DEBUG: Log de estructura de cada cita
    console.log('🔍 Validando cita:', {
      id: item?.id,
      patient_id: item?.patient_id,
      patients: item?.patients,
      estado_cita: item?.estado_cita,
      fecha_hora_cita: item?.fecha_hora_cita
    });

    // Validaciones básicas requeridas
    if (!item || typeof item !== 'object') {
      console.log('❌ Cita rechazada: no es objeto válido');
      return false;
    }
    if (!item.id || typeof item.id !== 'string') {
      console.log('❌ Cita rechazada: ID inválido:', item.id);
      return false;
    }
    if (!item.patient_id || typeof item.patient_id !== 'string') {
      console.log('❌ Cita rechazada: patient_id inválido:', item.patient_id);
      return false;
    }
    if (!item.fecha_hora_cita || typeof item.fecha_hora_cita !== 'string') {
      console.log('❌ Cita rechazada: fecha_hora_cita inválida:', item.fecha_hora_cita);
      return false;
    }
    if (!item.estado_cita || typeof item.estado_cita !== 'string') {
      console.log('❌ Cita rechazada: estado_cita inválido:', item.estado_cita);
      return false;
    }

    // Validar que tiene información del paciente
    if (!item.patients || typeof item.patients !== 'object') {
      console.log('❌ Cita rechazada: patients inválido:', item.patients);
      return false;
    }
    if (!item.patients.id || !item.patients.nombre) {
      console.log('❌ Cita rechazada: datos de paciente incompletos:', {
        id: item.patients.id,
        nombre: item.patients.nombre
      });
      return false;
    }

    // Validar estados permitidos
    const validStatuses = ['PROGRAMADA', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA', 'PRESENTE', 'REAGENDADA', 'NO ASISTIO'];
    if (!validStatuses.includes(item.estado_cita)) {
      console.log('❌ Cita rechazada: estado no válido:', item.estado_cita);
      return false;
    }

    console.log('✅ Cita válida:', item.id);
    return true;
  });
}

/**
 * Transforma las citas de la API al formato normalizado del frontend
 * CORREGIDO: Validación robusta de fechas antes de transformar
 * @param apiAppointments - Citas válidas de la API
 * @returns Array de citas normalizadas
 */
export function transformApiAppointments(apiAppointments: ApiAppointment[]): NormalizedAppointment[] {
  return apiAppointments.map((appointment): NormalizedAppointment => {
    // ✅ SOLUCIÓN: Validación robusta de fecha de cita
    const parseAppointmentDate = (dateString: string): Date => {
      if (!dateString || typeof dateString !== 'string') {
        console.warn(`Cita ${appointment.id}: fecha_hora_cita inválida:`, dateString);
        return new Date(NaN); // Fecha inválida explícita
      }
      
      const parsedDate = new Date(dateString);
      if (isNaN(parsedDate.getTime())) {
        console.warn(`Cita ${appointment.id}: No se pudo parsear fecha:`, dateString);
        return new Date(NaN); // Fecha inválida explícita
      }
      
      return parsedDate;
    };

    // ✅ SOLUCIÓN: Validación robusta de fecha de creación
    const parseCreatedDate = (dateString?: string): Date => {
      if (!dateString) {
        return new Date(); // Usar fecha actual si no existe created_at
      }
      
      const parsedDate = new Date(dateString);
      if (isNaN(parsedDate.getTime())) {
        console.warn(`Cita ${appointment.id}: No se pudo parsear created_at:`, dateString);
        return new Date(); // Usar fecha actual como fallback
      }
      
      return parsedDate;
    };

    return {
      id: appointment.id,
      patientId: appointment.patient_id,
      doctorId: appointment.doctor_id,
      dateTime: parseAppointmentDate(appointment.fecha_hora_cita), // ✅ Fecha validada
      motivo: appointment.motivo_cita || 'Consulta general',
      status: appointment.estado_cita,
      isFirstTime: appointment.es_primera_vez || false,
      notes: appointment.notas_cita_seguimiento,
      createdAt: parseCreatedDate(appointment.created_at), // ✅ Fecha validada
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
 * CORREGIDO: Manejo robusto de fechas y zonas horarias
 * @param normalizedAppointments - Citas normalizadas
 * @returns Objeto con citas agrupadas por fecha
 */
export function groupAppointmentsByDate(normalizedAppointments: NormalizedAppointment[]): AppointmentsByDate {
  // ✅ SOLUCIÓN: Usar fechas locales consistentes
  const now = new Date();
  const localToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const localTomorrow = new Date(localToday.getFullYear(), localToday.getMonth(), localToday.getDate() + 1);

  const today: NormalizedAppointment[] = [];
  const future: NormalizedAppointment[] = [];
  const past: NormalizedAppointment[] = [];

  normalizedAppointments.forEach((appointment) => {
    // ✅ SOLUCIÓN: Validar fecha antes de procesar
    if (!appointment.dateTime || !(appointment.dateTime instanceof Date)) {
      console.warn(`Cita ${appointment.id} tiene fecha inválida:`, appointment.dateTime);
      past.push(appointment); // Poner citas inválidas en el pasado
      return;
    }

    const appointmentDate = appointment.dateTime;
    
    // ✅ SOLUCIÓN: Comparar solo las fechas (sin hora) para evitar problemas de zona horaria
    const appointmentDateOnly = new Date(
      appointmentDate.getFullYear(), 
      appointmentDate.getMonth(), 
      appointmentDate.getDate()
    );
    
    if (appointmentDateOnly.getTime() === localToday.getTime()) {
      today.push(appointment);
    } else if (appointmentDateOnly > localToday) {
      future.push(appointment);
    } else {
      past.push(appointment);
    }
  });

  // ✅ SOLUCIÓN: Ordenamiento mejorado con validación de fechas
  const safeSort = (a: NormalizedAppointment, b: NormalizedAppointment, reverse = false) => {
    const timeA = a.dateTime instanceof Date ? a.dateTime.getTime() : 0;
    const timeB = b.dateTime instanceof Date ? b.dateTime.getTime() : 0;
    return reverse ? timeB - timeA : timeA - timeB;
  };

  today.sort((a, b) => safeSort(a, b));
  future.sort((a, b) => safeSort(a, b));
  past.sort((a, b) => safeSort(a, b, true)); // Más recientes primero

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
