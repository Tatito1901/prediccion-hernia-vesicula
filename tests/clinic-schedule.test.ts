import { describe, it, expect } from 'vitest';
import { validateRescheduleDateTime, CLINIC_SCHEDULE, isWorkDay } from '@/lib/clinic-schedule';

function nextWeekdayAt(targetWeekday: number, hour: number, minute = 0): Date {
  const now = new Date();
  const d = new Date(now);
  d.setSeconds(0, 0);
  const day = d.getDay();
  let delta = targetWeekday - day;
  if (delta <= 0) delta += 7; // next occurrence
  d.setDate(d.getDate() + delta);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function nextWorkdayAt(hour: number, minute = 0): Date {
  // choose Monday (1) from CLINIC_SCHEDULE.WORK_DAYS, default to Monday
  const wd = (CLINIC_SCHEDULE.WORK_DAYS as readonly number[])[0] ?? 1;
  return nextWeekdayAt(wd, hour, minute);
}

function nextWeekendAt(hour: number): Date {
  // Sunday (0)
  return nextWeekdayAt(0, hour, 0);
}

describe('clinic-schedule.validateRescheduleDateTime', () => {
  it('accepts a valid workday slot within hours', () => {
    const d = nextWorkdayAt(CLINIC_SCHEDULE.START_HOUR + 1, 0);
    const isoLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
    const res = validateRescheduleDateTime(isoLocal);
    expect(res.valid).toBe(true);
  });

  it('rejects weekend dates', () => {
    const d = nextWeekendAt(CLINIC_SCHEDULE.START_HOUR + 1);
    const isoLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:00:00`;
    const res = validateRescheduleDateTime(isoLocal);
    expect(res.valid).toBe(false);
    expect(res.reason || '').toMatch(/días hábiles|hábiles/i);
  });

  it('rejects lunch time', () => {
    const d = nextWorkdayAt(CLINIC_SCHEDULE.LUNCH_START, 0);
    const isoLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
    const res = validateRescheduleDateTime(isoLocal);
    expect(res.valid).toBe(false);
    expect(res.reason || '').toMatch(/comida/i);
  });

  it('rejects outside work hours (before start)', () => {
    const d = nextWorkdayAt(CLINIC_SCHEDULE.START_HOUR - 1, 0);
    const isoLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:00:00`;
    const res = validateRescheduleDateTime(isoLocal);
    expect(res.valid).toBe(false);
    expect(res.reason || '').toMatch(/horario laboral/i);
  });

  it('rejects outside work hours (after end)', () => {
    const d = nextWorkdayAt(CLINIC_SCHEDULE.END_HOUR, 0); // boundary, should be invalid
    const isoLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:00:00`;
    const res = validateRescheduleDateTime(isoLocal);
    expect(res.valid).toBe(false);
    expect(res.reason || '').toMatch(/horario laboral/i);
  });

  it('rejects misaligned slots (not multiple of 30 minutes)', () => {
    const d = nextWorkdayAt(CLINIC_SCHEDULE.START_HOUR + 1, 15);
    const isoLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
    const res = validateRescheduleDateTime(isoLocal);
    expect(res.valid).toBe(false);
    expect(res.reason || '').toMatch(/30 minutos|intervalos/i);
  });

  it('rejects non-future dates', () => {
    const now = new Date();
    const past = new Date(now.getTime() - 5 * 60 * 1000);
    const isoLocal = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}T${String(past.getHours()).padStart(2, '0')}:${String(past.getMinutes()).padStart(2, '0')}:00`;
    const res = validateRescheduleDateTime(isoLocal, now);
    expect(res.valid).toBe(false);
    expect(res.reason || '').toMatch(/futur/i);
  });

  it('rejects exceeding MAX_ADVANCE_DAYS', () => {
    const now = new Date();
    const d = new Date(now);
    // Move beyond the allowed window
    d.setDate(d.getDate() + CLINIC_SCHEDULE.MAX_ADVANCE_DAYS + 1);
    // Ensure time is a valid slot within work hours
    d.setHours(CLINIC_SCHEDULE.START_HOUR + 1, 0, 0, 0);
    // Ensure this lands on a workday so max-advance is the failing reason
    while (!isWorkDay(d)) {
      d.setDate(d.getDate() + 1);
      d.setHours(CLINIC_SCHEDULE.START_HOUR + 1, 0, 0, 0);
    }
    const isoLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
    const res = validateRescheduleDateTime(isoLocal, now);
    expect(res.valid).toBe(false);
    expect(res.reason || '').toMatch(/máximo|Excede/i);
  });
});
