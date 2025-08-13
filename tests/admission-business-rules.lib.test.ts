import { describe, it, expect } from 'vitest';
import {
  canCheckIn,
  canCompleteAppointment,
  canCancelAppointment,
  canMarkNoShow,
  canRescheduleAppointment,
  canTransitionToStatus,
  getAvailableActions,
  type AppointmentLike,
  type AppointmentStatus,
} from '@/lib/admission-business-rules';

// Helper: next Monday at a given local hour to ensure workday and work hours
function nextMondayAt(hour: number): Date {
  const now = new Date();
  const d = new Date(now);
  d.setHours(hour, 0, 0, 0);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const delta = (8 - day) % 7; // days until next Monday (1)
  d.setDate(d.getDate() + delta);
  return d;
}

function withMinutes(base: Date, deltaMinutes: number): Date {
  return new Date(base.getTime() + deltaMinutes * 60_000);
}

function makeAppt(status: AppointmentStatus, date: Date): AppointmentLike {
  return {
    estado_cita: status,
    fecha_hora_cita: date.toISOString(),
  };
}

describe('Admission Business Rules (lib copy)', () => {
  const baseNow = nextMondayAt(10); // 10:00 local time, Monday (workday)

  describe('canCheckIn', () => {
    it('allows check-in within window for PROGRAMADA', () => {
      const appt = makeAppt('PROGRAMADA', baseNow);
      const res = canCheckIn(appt, baseNow);
      expect(res.valid).toBe(true);
    });

    it('blocks check-in too early (before -30 min)', () => {
      const apptTime = withMinutes(baseNow, 31); // appt 31 min in the future
      const appt = makeAppt('CONFIRMADA', apptTime);
      const res = canCheckIn(appt, baseNow);
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/Check-in disponible en/);
    });

    it('blocks check-in after +15 min', () => {
      const apptTime = withMinutes(baseNow, -16); // 16 min ago
      const appt = makeAppt('PROGRAMADA', apptTime);
      const res = canCheckIn(appt, baseNow);
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/Ventana de check-in expirada/);
    });
  });

  describe('canCompleteAppointment', () => {
    it('requires PRESENTE', () => {
      const appt = makeAppt('PROGRAMADA', withMinutes(baseNow, -5));
      const res = canCompleteAppointment(appt, baseNow);
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/No se puede completar/);
    });

    it('allows completion when PRESENTE within window', () => {
      const appt = makeAppt('PRESENTE', withMinutes(baseNow, -30));
      const res = canCompleteAppointment(appt, baseNow);
      expect(res.valid).toBe(true);
    });
  });

  describe('canCancelAppointment', () => {
    it('allows cancel for future PROGRAMADA', () => {
      const appt = makeAppt('PROGRAMADA', withMinutes(baseNow, 60));
      const res = canCancelAppointment(appt, baseNow);
      expect(res.valid).toBe(true);
    });

    it('blocks cancel for past appointment', () => {
      const appt = makeAppt('PROGRAMADA', withMinutes(baseNow, -10));
      const res = canCancelAppointment(appt, baseNow);
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/No se pueden cancelar citas que ya pasaron/);
    });
  });

  describe('canMarkNoShow', () => {
    it('blocks before grace period', () => {
      const appt = makeAppt('PROGRAMADA', withMinutes(baseNow, 10)); // future
      const res = canMarkNoShow(appt, baseNow);
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/Espere/);
    });

    it('allows after grace period', () => {
      const appt = makeAppt('CONFIRMADA', withMinutes(baseNow, -20));
      const res = canMarkNoShow(appt, baseNow);
      expect(res.valid).toBe(true);
    });
  });

  describe('canRescheduleAppointment', () => {
    it('allows reschedule with >2h ahead', () => {
      const appt = makeAppt('PROGRAMADA', withMinutes(baseNow, 180));
      const res = canRescheduleAppointment(appt, baseNow);
      expect(res.valid).toBe(true);
    });

    it('blocks reschedule within 2h window', () => {
      const appt = makeAppt('CONFIRMADA', withMinutes(baseNow, 60));
      const res = canRescheduleAppointment(appt, baseNow);
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/No se puede reagendar/);
    });
  });

  describe('canTransitionToStatus', () => {
    it('allows PROGRAMADA -> PRESENTE', () => {
      expect(canTransitionToStatus('PROGRAMADA', 'PRESENTE').valid).toBe(true);
    });

    it('blocks COMPLETADA -> PROGRAMADA', () => {
      expect(canTransitionToStatus('COMPLETADA', 'PROGRAMADA').valid).toBe(false);
    });
  });

  describe('getAvailableActions', () => {
    it('includes some valid actions for far-future PROGRAMADA', () => {
      const appt = makeAppt('PROGRAMADA', withMinutes(baseNow, 24 * 60));
      const actions = getAvailableActions(appt, baseNow);
      const reschedule = actions.find(a => a.action === 'reschedule');
      expect(reschedule?.valid).toBe(true);
    });
  });
});
