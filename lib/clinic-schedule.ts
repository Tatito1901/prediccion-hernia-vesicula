// lib/clinic-schedule.ts
// Configuración centralizada de agenda y validadores auxiliares

export const CLINIC_SCHEDULE = {
  START_HOUR: 8,
  END_HOUR: 15, // Último slot 14:30
  LUNCH_START: 12,
  LUNCH_END: 13,
  SLOT_DURATION_MINUTES: 30,
  MAX_ADVANCE_DAYS: 60,
  RESCHEDULE_MIN_ADVANCE_HOURS: 2,
  WORK_DAYS: [1, 2, 3, 4, 5] as const, // L-V
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
  if (!isWorkDay(dt)) return { valid: false, reason: 'Solo días hábiles (L-V)' };
  if (!withinWorkHours(dt)) return { valid: false, reason: 'Fuera de horario laboral (08:00-15:00)' };
  if (isLunchTime(dt)) return { valid: false, reason: 'No disponible en horario de comida (12:00-13:00)' };
  if (!isValidSlot(dt)) return { valid: false, reason: 'La hora debe coincidir con intervalos de 30 minutos' };

  // Límite de anticipación (opcional en servidor para consistencia con UI)
  const max = new Date(now);
  max.setDate(max.getDate() + CLINIC_SCHEDULE.MAX_ADVANCE_DAYS);
  if (dt.getTime() > max.getTime()) return { valid: false, reason: 'Excede el máximo de anticipación permitido' };

  return { valid: true };
}
