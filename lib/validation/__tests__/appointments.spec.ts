import { describe, it, expect } from 'vitest';
import { ZNewAppointmentSchema } from '@/lib/validation/appointments';

function nextWorkdayAt(hour: number, minute: number = 0): string {
  const now = new Date();
  const d = new Date(now.getTime());
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  // advance until Mon-Fri and within 8-15 and not 12-13
  while (true) {
    const day = d.getDay();
    const h = d.getHours();
    if (day >= 1 && day <= 5 && h >= 8 && h < 15 && h !== 12) break;
    d.setDate(d.getDate() + 1);
    d.setHours(hour, minute, 0, 0);
  }
  return d.toISOString();
}

function nextSundayAt(hour: number, minute = 0): string {
  const now = new Date();
  const d = new Date(now.getTime());
  const diff = (7 - d.getDay()) % 7; // days to Sunday (0)
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

describe('ZNewAppointmentSchema', () => {
  it('accepts a valid new appointment payload', () => {
    const iso = nextWorkdayAt(10, 0);
    const parsed = ZNewAppointmentSchema.safeParse({
      patient_id: '11111111-1111-1111-1111-111111111111',
      doctor_id: '22222222-2222-2222-2222-222222222222',
      fecha_hora_cita: iso,
      motivos_consulta: [],
      es_primera_vez: true,
      notas_breves: 'Primera visita',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects Sunday scheduling', () => {
    const iso = nextSundayAt(10, 0);
    const res = ZNewAppointmentSchema.safeParse({
      patient_id: '11111111-1111-1111-1111-111111111111',
      fecha_hora_cita: iso,
    });
    expect(res.success).toBe(false);
  });

  it('rejects lunch time scheduling (12:00-13:00)', () => {
    const iso = nextWorkdayAt(12, 0);
    const res = ZNewAppointmentSchema.safeParse({
      patient_id: '11111111-1111-1111-1111-111111111111',
      fecha_hora_cita: iso,
    });
    expect(res.success).toBe(false);
  });

  it('rejects non 30-minute slot (e.g., 10:15)', () => {
    const iso = nextWorkdayAt(10, 15);
    const res = ZNewAppointmentSchema.safeParse({
      patient_id: '11111111-1111-1111-1111-111111111111',
      fecha_hora_cita: iso,
    });
    expect(res.success).toBe(false);
  });
});
