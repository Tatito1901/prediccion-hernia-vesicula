// types/appointments.ts

import { Database } from '@/lib/types/database.types';

// Definición del tipo Patient basada en los tipos autogenerados de Supabase
export type Patient = Database['public']['Tables']['patients']['Row'];

// Estructura de datos de la cita tal como viene de la API de Supabase
export interface ApiAppointment {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  fecha_hora_cita: string; // ISO string
  motivo_cita: string;
  estado_cita: 'PROGRAMADA' | 'CONFIRMADA' | 'CANCELADA' | 'COMPLETADA' | 'PRESENTE' | 'REAGENDADA' | 'NO ASISTIO';
  es_primera_vez: boolean;
  notas_cita_seguimiento: string | null;
  created_at: string;
  patients: {
    id: string;
    nombre: string | null;
    apellidos: string | null;
    telefono: string | null;
    email: string | null;
    estado_paciente: 'activo' | 'inactivo' | 'potencial';
  };
}

// Estructura de datos de la cita normalizada para usar en el frontend
export interface NormalizedAppointment {
  id: string;
  patientId: string;
  doctorId: string | null;
  dateTime: Date;
  motivo: string;
  status: 'PROGRAMADA' | 'CONFIRMADA' | 'CANCELADA' | 'COMPLETADA' | 'PRESENTE' | 'REAGENDADA' | 'NO ASISTIO';
  isFirstTime: boolean;
  notes: string | null;
  createdAt: Date;
  patient: {
    id: string;
    name: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    status: 'activo' | 'inactivo' | 'potencial';
  };
}

// Estructura para agrupar citas por fecha
export interface AppointmentsByDate {
  today: NormalizedAppointment[];
  future: NormalizedAppointment[];
  past: NormalizedAppointment[];
}
