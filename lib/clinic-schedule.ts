// lib/clinic-schedule.ts
// Configuración centralizada de agenda y validadores auxiliares (solo agenda/horarios)
import { isBefore } from 'date-fns';

export const CLINIC_SCHEDULE = {
  START_HOUR: 9,
  END_HOUR: 15, // Último slot 14:30
  LUNCH_START: 12,
  LUNCH_END: 13,
  SLOT_DURATION_MINUTES: 30,
  MAX_ADVANCE_DAYS: 60,
  RESCHEDULE_MIN_ADVANCE_HOURS: 2,
  WORK_DAYS: [1, 2, 3, 4, 5, 6] as const, // L-S
} as const;

// Zona horaria de la clínica (configurable por ENV, con valor seguro por defecto)
export const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE || 'America/Mexico_City';

const isInteger = (n: number) => Number.isInteger(n);

// ==================== HELPERS DE ZONA HORARIA ====================
const weekdayToIndex = (w: string): number => {
  // en-US: Sun, Mon, Tue, Wed, Thu, Fri, Sat
  switch (w) {
    case 'Sun': return 0;
    case 'Mon': return 1;
    case 'Tue': return 2;
    case 'Wed': return 3;
    case 'Thu': return 4;
    case 'Fri': return 5;
    case 'Sat': return 6;
    default: return new Date().getDay();
  }
};

const getZonedHour = (date: Date, tz: string = CLINIC_TIMEZONE): number => {
  return Number(new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone: tz }).format(date));
};

const getZonedMinute = (date: Date, tz: string = CLINIC_TIMEZONE): number => {
  return Number(new Intl.DateTimeFormat('en-US', { minute: '2-digit', timeZone: tz }).format(date));
};

const getZonedWeekdayIndex = (date: Date, tz: string = CLINIC_TIMEZONE): number => {
  const w = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz }).format(date);
  return weekdayToIndex(w);
};

// Etiqueta corta para días laborales basada en configuración (p. ej., "L-V" o "L-S")
export function getWorkDaysLabel(): string {
  // Si incluye sábado y excluye domingo, usar "L-S"; en caso contrario, "L-V" como predeterminado.
  const hasSaturday = (CLINIC_SCHEDULE.WORK_DAYS as readonly number[]).includes(6 as any);
  return hasSaturday ? 'L-S' : 'L-V';
}

export function isWorkDay(date: Date): boolean {
  const d = getZonedWeekdayIndex(date);
  return (CLINIC_SCHEDULE.WORK_DAYS as readonly number[]).includes(d as any);
}

export function withinWorkHours(date: Date): boolean {
  const h = getZonedHour(date);
  return h >= CLINIC_SCHEDULE.START_HOUR && h < CLINIC_SCHEDULE.END_HOUR;
}

export function isLunchTime(date: Date): boolean {
  const h = getZonedHour(date);
  return h >= CLINIC_SCHEDULE.LUNCH_START && h < CLINIC_SCHEDULE.LUNCH_END;
}

export function isValidSlot(date: Date): boolean {
  const m = getZonedMinute(date);
  const step = CLINIC_SCHEDULE.SLOT_DURATION_MINUTES;
  return isInteger(m) && m % step === 0;
}

export function isFuture(date: Date, now: Date = new Date()): boolean {
  return date.getTime() > now.getTime();
}

export function validateRescheduleDateTime(isoString: string, now: Date = new Date()): { valid: boolean; reason?: string } {
  const dt = new Date(isoString);
  if (isNaN(dt.getTime())) return { valid: false, reason: 'Fecha/hora inválida' };

  if (!isFuture(dt, now)) return { valid: false, reason: 'La nueva fecha debe ser futura' };
  if (!isWorkDay(dt)) return { valid: false, reason: `Solo días hábiles (${getWorkDaysLabel()})` };
  {
    const hoursLabel = `${String(CLINIC_SCHEDULE.START_HOUR).padStart(2, '0')}:00-${String(CLINIC_SCHEDULE.END_HOUR).padStart(2, '0')}:00`;
    if (!withinWorkHours(dt)) return { valid: false, reason: `Fuera de horario laboral (${hoursLabel})` };
  }
  if (isLunchTime(dt)) return { valid: false, reason: 'No disponible en horario de comida (12:00-13:00)' };
  if (!isValidSlot(dt)) return { valid: false, reason: 'La hora debe coincidir con intervalos de 30 minutos' };

  // Límite de anticipación (opcional en servidor para consistencia con UI)
  const max = new Date(now);
  max.setDate(max.getDate() + CLINIC_SCHEDULE.MAX_ADVANCE_DAYS);
  if (dt.getTime() > max.getTime()) return { valid: false, reason: 'Excede el máximo de anticipación permitido' };

  return { valid: true };
}

// ==================== Utilidades de generación de horarios (para UI) ====================

export function generateTimeSlots(options?: {
  startHour?: number;
  endHour?: number;
  stepMinutes?: number;
  includeLunch?: boolean;
  baseDate?: Date;
  tz?: string;
}): Array<{ value: string; label: string }> {
  const {
    startHour = CLINIC_SCHEDULE.START_HOUR,
    endHour = CLINIC_SCHEDULE.END_HOUR,
    stepMinutes = CLINIC_SCHEDULE.SLOT_DURATION_MINUTES,
    includeLunch = true,
    baseDate = new Date(),
  } = options || {};

  const slots: Array<{ value: string; label: string }> = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      const dt = new Date(baseDate);
      dt.setHours(h, m, 0, 0);
      // Opcionalmente excluir horario de comida (12:00-12:59)
      if (!includeLunch && isLunchTime(dt)) continue;

      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      slots.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` });
    }
  }
  return slots;
}
