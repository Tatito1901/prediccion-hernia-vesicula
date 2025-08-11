import { describe, it, expect } from 'vitest';
import { APPOINTMENT_STATUS_CONFIG, ACTION_TO_STATUS_MAP, type AppointmentStatus } from '@/components/patient-admision/admision-types';

const EXPECTED_STATUSES: AppointmentStatus[] = [
  'PROGRAMADA',
  'CONFIRMADA',
  'PRESENTE',
  'COMPLETADA',
  'CANCELADA',
  'NO_ASISTIO',
  'REAGENDADA',
];

describe('Appointment Status Config', () => {
  it('has all statuses defined and only valid statuses', () => {
    const keys = Object.keys(APPOINTMENT_STATUS_CONFIG).sort();
    const expected = [...EXPECTED_STATUSES].sort();
    expect(keys).toEqual(expected);
  });

  it('each status has required presentation fields', () => {
    for (const status of EXPECTED_STATUSES) {
      const cfg = (APPOINTMENT_STATUS_CONFIG as any)[status];
      expect(cfg).toBeTruthy();
      expect(typeof cfg.label).toBe('string');
      expect(typeof cfg.bgClass).toBe('string');
      expect(typeof cfg.textClass).toBe('string');
      expect(typeof cfg.borderClass).toBe('string');
      expect(typeof cfg.ringClass).toBe('string');
      expect(typeof cfg.description).toBe('string');
    }
  });

  it('NO_ASISTIO has user-friendly label', () => {
    expect(APPOINTMENT_STATUS_CONFIG.NO_ASISTIO.label).toBe('No Asistió');
  });

  it('action map sets noShow -> NO_ASISTIO', () => {
    expect(ACTION_TO_STATUS_MAP.noShow).toBe('NO_ASISTIO');
  });
});
