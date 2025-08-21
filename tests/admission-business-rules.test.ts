import { describe, it, expect } from 'vitest';
import { canCheckIn, canMarkNoShow } from '@/lib/admission-business-rules';
import type { AppointmentWithPatient, AppointmentStatus } from '@/components/patient-admision/admision-types';

const makeAppointment = (estado: AppointmentStatus, dt: Date): AppointmentWithPatient => ({
  id: 'a1',
  patient_id: 'p1',
  fecha_hora_cita: dt.toISOString(),
  motivos_consulta: [],
  estado_cita: estado,
  patients: { 
    id: 'p1',
    nombre: 'Juan',
    apellidos: 'Pérez',
    estado_paciente: 'activo',
  },
});

describe('Admission Business Rules', () => {
  it('canCheckIn: invalid too early, valid within window, invalid too late', () => {
    const appointmentTime = new Date('2024-01-01T10:00:00');
    const appt = makeAppointment('PROGRAMADA', appointmentTime);

    // too early: 60 min before (window starts 30 min before)
    expect(
      canCheckIn(appt, new Date('2024-01-01T09:00:00')).valid
    ).toBe(false);

    // within window: 20 min before
    expect(
      canCheckIn(appt, new Date('2024-01-01T09:40:00')).valid
    ).toBe(true);

    // too late: 16 min after (window ends 15 min after)
    expect(
      canCheckIn(appt, new Date('2024-01-01T10:16:00')).valid
    ).toBe(false);
  });

  it('canMarkNoShow: invalid before threshold, valid after threshold', () => {
    const appointmentTime = new Date('2024-01-01T10:00:00');
    const appt = makeAppointment('CONFIRMADA', appointmentTime);

    // before +15 minutes threshold
    expect(
      canMarkNoShow(appt, new Date('2024-01-01T10:10:00')).valid
    ).toBe(false);

    // after +15 minutes threshold
    expect(
      canMarkNoShow(appt, new Date('2024-01-01T10:20:00')).valid
    ).toBe(true);
  });
});
