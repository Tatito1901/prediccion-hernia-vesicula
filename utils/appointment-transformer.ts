// utils/appointment-transformer.ts - Transformador robusto de datos de citas

import { ApiAppointment, NormalizedAppointment, AppointmentsByDate } from '@/types/appointments';

/**
 * Transforma una cita de la API a formato normalizado
 * Maneja todos los casos edge y valores nulos
 */
export function transformApiAppointment(apiAppointment: ApiAppointment): NormalizedAppointment {
  return {
    id: apiAppointment.id,
    patientId: apiAppointment.patient_id,
    doctorId: apiAppointment.doctor_id,
    dateTime: new Date(apiAppointment.fecha_hora_cita),
    motivo: apiAppointment.motivo_cita || 'Sin motivo especificado',
    status: apiAppointment.estado_cita,
    isFirstTime: apiAppointment.es_primera_vez || false,
    notes: apiAppointment.notas_cita_seguimiento,
    createdAt: new Date(apiAppointment.created_at),
    patient: {
      id: apiAppointment.patients.id,
      name: apiAppointment.patients.nombre || 'Sin nombre',
      lastName: apiAppointment.patients.apellidos || '',
      phone: apiAppointment.patients.telefono,
      email: apiAppointment.patients.email,
      status: apiAppointment.patients.estado_paciente,
    },
  };
}

/**
 * Transforma array de citas de la API a formato normalizado
 */
export function transformApiAppointments(apiAppointments: ApiAppointment[]): NormalizedAppointment[] {
  return apiAppointments.map(transformApiAppointment);
}

/**
 * Agrupa citas normalizadas por fecha de manera robusta
 * Utiliza la clasificación pre-calculada del backend
 */
export function groupAppointmentsByDate(appointments: NormalizedAppointment[]): AppointmentsByDate {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const grouped: AppointmentsByDate = {
    today: [],
    future: [],
    past: [],
  };

  appointments.forEach(appointment => {
    const appointmentDate = new Date(appointment.dateTime);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate.getTime() === today.getTime()) {
      grouped.today.push(appointment);
    } else if (appointmentDate > today) {
      grouped.future.push(appointment);
    } else {
      grouped.past.push(appointment);
    }
  });

  // Ordenar cada grupo
  grouped.today.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  grouped.future.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  grouped.past.sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime());

  return grouped;
}

/**
 * Valida que una cita de la API tenga la estructura correcta
 */
export function validateApiAppointment(data: any): data is ApiAppointment {
  return (
    data &&
    typeof data.id === 'string' &&
    typeof data.patient_id === 'string' &&
    typeof data.fecha_hora_cita === 'string' &&
    typeof data.motivo_cita === 'string' &&
    typeof data.estado_cita === 'string' &&
    data.patients &&
    typeof data.patients.id === 'string' &&
    typeof data.patients.nombre === 'string'
  );
}

/**
 * Filtra y valida array de citas de la API
 */
export function validateAndFilterApiAppointments(data: any[]): ApiAppointment[] {
  if (!Array.isArray(data)) {
    console.warn('validateAndFilterApiAppointments: data is not an array', data);
    return [];
  }

  return data.filter((item, index) => {
    const isValid = validateApiAppointment(item);
    if (!isValid) {
      console.warn(`validateAndFilterApiAppointments: Invalid appointment at index ${index}`, item);
    }
    return isValid;
  });
}

/**
 * Calcula contadores de citas por categoría
 */
export function calculateAppointmentCounts(appointmentsByDate: AppointmentsByDate) {
  return {
    today: appointmentsByDate.today.length,
    future: appointmentsByDate.future.length,
    past: appointmentsByDate.past.length,
    total: appointmentsByDate.today.length + appointmentsByDate.future.length + appointmentsByDate.past.length,
  };
}
