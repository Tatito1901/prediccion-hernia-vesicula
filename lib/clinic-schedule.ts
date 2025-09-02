// lib/clinic-schedule.ts
// Configuración centralizada de agenda y validadores auxiliares
import { addMinutes, isBefore, isAfter, differenceInMinutes } from 'date-fns';
import { z } from 'zod';
import { ZAppointmentStatus } from '@/lib/validation/enums';
import { AppointmentStatusEnum } from '@/lib/types';

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

// ==================== Reglas de negocio de citas (consolidadas) ====================

export type AppointmentStatus = z.infer<typeof ZAppointmentStatus>;
export type AdmissionAction = 'checkIn' | 'complete' | 'cancel' | 'noShow' | 'reschedule' | 'viewHistory';
export interface ValidationResult { valid: boolean; reason?: string }
export interface BusinessRuleContext { currentTime?: Date; allowOverride?: boolean; userRole?: string }
export type AppointmentLike = { fecha_hora_cita: string; estado_cita: AppointmentStatus; updated_at?: string };

export const BUSINESS_RULES = {
  CHECK_IN_WINDOW_BEFORE_MINUTES: 30,
  CHECK_IN_WINDOW_AFTER_MINUTES: 15,
  COMPLETION_WINDOW_AFTER_MINUTES: 120,
  MIN_CONSULTATION_MINUTES: 5,
  MAX_CONSULTATION_MINUTES: 90,
  NO_SHOW_WINDOW_AFTER_MINUTES: 15,
  RESCHEDULE_DEADLINE_HOURS: 2,
  RAPID_CHANGE_COOLDOWN_MINUTES: 2,
} as const;

type Rule = (input: { appointment: AppointmentLike; now: Date; ctx?: BusinessRuleContext }) => ValidationResult;

const evaluateRules = (
  rules: Rule[],
  input: { appointment: AppointmentLike; now: Date; ctx?: BusinessRuleContext }
): ValidationResult => {
  for (const rule of rules) {
    const res = rule(input);
    if (!res.valid) return res;
  }
  return { valid: true };
};

export const getAppointmentDateTime = (appointment: AppointmentLike): Date => {
  return new Date(appointment.fecha_hora_cita);
};

export const wasRecentlyUpdated = (
  appointment: AppointmentLike,
  minutes: number = BUSINESS_RULES.RAPID_CHANGE_COOLDOWN_MINUTES
): boolean => {
  const ts = appointment.updated_at ? new Date(appointment.updated_at) : null;
  if (!ts || isNaN(ts.getTime())) return false;
  return differenceInMinutes(new Date(), ts) < minutes;
};

export const canCheckIn = (
  appointment: AppointmentLike,
  currentTime: Date = new Date(),
  context?: BusinessRuleContext
): ValidationResult => {
  const appointmentTime = getAppointmentDateTime(appointment);
  const checkInWindowStart = addMinutes(appointmentTime, -BUSINESS_RULES.CHECK_IN_WINDOW_BEFORE_MINUTES);
  const checkInWindowEnd = addMinutes(appointmentTime, BUSINESS_RULES.CHECK_IN_WINDOW_AFTER_MINUTES);

  const rules: Rule[] = [
    // Estado válido
    ({ appointment }) => {
      if (
        appointment.estado_cita !== AppointmentStatusEnum.PROGRAMADA &&
        appointment.estado_cita !== AppointmentStatusEnum.CONFIRMADA
      ) {
        return { valid: false, reason: `No se puede marcar presente desde estado: ${appointment.estado_cita}` };
      }
      return { valid: true };
    },
    // Ventana de tiempo: demasiado temprano
    ({ now, ctx }) => {
      if (!ctx?.allowOverride && isBefore(now, checkInWindowStart)) {
        const minutesUntil = differenceInMinutes(checkInWindowStart, now);
        return { valid: false, reason: `Check-in disponible en ${minutesUntil} minutos (30 min antes de la cita)` };
      }
      return { valid: true };
    },
    // Ventana de tiempo: demasiado tarde
    ({ now, ctx }) => {
      if (!ctx?.allowOverride && isAfter(now, checkInWindowEnd)) {
        return { valid: false, reason: 'Ventana de check-in expirada. Considere reagendar o marcar como "No Asistió".' };
      }
      return { valid: true };
    },
    // Horario laboral (respetando zona horaria de la clínica)
    ({ now, ctx }) => {
      if (!ctx?.allowOverride && !(withinWorkHours(now) && isWorkDay(now))) {
        return { valid: false, reason: `Check-in solo disponible durante horario laboral (${CLINIC_SCHEDULE.START_HOUR}:00 - ${CLINIC_SCHEDULE.END_HOUR}:00, L-V)` };
      }
      return { valid: true };
    },
    // Cambios recientes
    ({ appointment }) => {
      if (wasRecentlyUpdated(appointment)) {
        return { valid: false, reason: 'Espere unos momentos antes de realizar otra acción' };
      }
      return { valid: true };
    },
  ];

  return evaluateRules(rules, { appointment, now: currentTime, ctx: context });
};

export const canCompleteAppointment = (
  appointment: AppointmentLike,
  currentTime: Date = new Date(),
  context?: BusinessRuleContext
): ValidationResult => {
  const appointmentTime = getAppointmentDateTime(appointment);
  const completionDeadline = addMinutes(appointmentTime, BUSINESS_RULES.COMPLETION_WINDOW_AFTER_MINUTES);

  const rules: Rule[] = [
    ({ appointment }) => {
      if (appointment.estado_cita !== AppointmentStatusEnum.PRESENTE) {
        return { valid: false, reason: `No se puede completar desde estado: ${appointment.estado_cita}` };
      }
      return { valid: true };
    },
    ({ now, ctx }) => {
      if (!ctx?.allowOverride && isAfter(now, completionDeadline)) {
        return { valid: false, reason: 'Ha pasado demasiado tiempo desde la cita programada. Contacte administración.' };
      }
      return { valid: true };
    },
  ];

  return evaluateRules(rules, { appointment, now: currentTime, ctx: context });
};

export const canCancelAppointment = (
  appointment: AppointmentLike,
  currentTime: Date = new Date(),
  context?: BusinessRuleContext
): ValidationResult => {
  const appointmentTime = getAppointmentDateTime(appointment);

  const rules: Rule[] = [
    ({ appointment }) => {
      if (
        appointment.estado_cita !== AppointmentStatusEnum.PROGRAMADA &&
        appointment.estado_cita !== AppointmentStatusEnum.CONFIRMADA
      ) {
        return { valid: false, reason: `No se puede cancelar una cita en estado: ${appointment.estado_cita}` };
      }
      return { valid: true };
    },
    ({ now, ctx }) => {
      if (!ctx?.allowOverride && isBefore(appointmentTime, now)) {
        return { valid: false, reason: 'No se pueden cancelar citas que ya pasaron.' };
      }
      return { valid: true };
    },
  ];

  return evaluateRules(rules, { appointment, now: currentTime, ctx: context });
};

export const canMarkNoShow = (
  appointment: AppointmentLike,
  currentTime: Date = new Date(),
  context?: BusinessRuleContext
): ValidationResult => {
  const appointmentTime = getAppointmentDateTime(appointment);
  const noShowThreshold = addMinutes(appointmentTime, BUSINESS_RULES.NO_SHOW_WINDOW_AFTER_MINUTES);

  const rules: Rule[] = [
    ({ appointment }) => {
      if (
        appointment.estado_cita !== AppointmentStatusEnum.PROGRAMADA &&
        appointment.estado_cita !== AppointmentStatusEnum.CONFIRMADA
      ) {
        return { valid: false, reason: `No se puede marcar "No Asistió" desde estado: ${appointment.estado_cita}` };
      }
      return { valid: true };
    },
    ({ now, ctx }) => {
      if (!ctx?.allowOverride && isBefore(now, noShowThreshold)) {
        const minutesRemaining = Math.ceil(differenceInMinutes(noShowThreshold, now));
        return { valid: false, reason: `Espere ${minutesRemaining} minutos más antes de marcar como "No Asistió".` };
      }
      return { valid: true };
    },
  ];

  return evaluateRules(rules, { appointment, now: currentTime, ctx: context });
};

export const canRescheduleAppointment = (
  appointment: AppointmentLike,
  currentTime: Date = new Date(),
  context?: BusinessRuleContext
): ValidationResult => {
  const appointmentTime = getAppointmentDateTime(appointment);
  const rescheduleDeadline = addMinutes(appointmentTime, -BUSINESS_RULES.RESCHEDULE_DEADLINE_HOURS * 60);

  const rules: Rule[] = [
    ({ appointment }) => {
      if (
        appointment.estado_cita !== AppointmentStatusEnum.PROGRAMADA &&
        appointment.estado_cita !== AppointmentStatusEnum.CONFIRMADA &&
        appointment.estado_cita !== AppointmentStatusEnum.CANCELADA &&
        appointment.estado_cita !== AppointmentStatusEnum.NO_ASISTIO
      ) {
        return { valid: false, reason: `No se puede reagendar una cita en estado: ${appointment.estado_cita}` };
      }
      return { valid: true };
    },
    ({ now, ctx, appointment }) => {
      if (
        (appointment.estado_cita === AppointmentStatusEnum.PROGRAMADA ||
         appointment.estado_cita === AppointmentStatusEnum.CONFIRMADA) &&
        !ctx?.allowOverride
      ) {
        if (isAfter(now, rescheduleDeadline)) {
          return { valid: false, reason: `No se puede reagendar con menos de ${BUSINESS_RULES.RESCHEDULE_DEADLINE_HOURS} horas de anticipación.` };
        }
      }
      return { valid: true };
    },
  ];

  return evaluateRules(rules, { appointment, now: currentTime, ctx: context });
};

export const getAvailableActions = (
  appointment: AppointmentLike,
  currentTime: Date = new Date(),
  context?: BusinessRuleContext
): Array<{ action: AdmissionAction; valid: boolean; reason?: string }> => {
  return [
    { action: 'checkIn', ...canCheckIn(appointment, currentTime, context) },
    { action: 'complete', ...canCompleteAppointment(appointment, currentTime, context) },
    { action: 'cancel', ...canCancelAppointment(appointment, currentTime, context) },
    { action: 'noShow', ...canMarkNoShow(appointment, currentTime, context) },
    { action: 'reschedule', ...canRescheduleAppointment(appointment, currentTime, context) },
    { action: 'viewHistory', valid: true },
  ];
};

export const suggestNextAction = (
  appointment: AppointmentLike,
  currentTime: Date = new Date(),
  context?: BusinessRuleContext
): AdmissionAction | null => {
  const availableActions = getAvailableActions(appointment, currentTime, context);
  const actionPriority: AdmissionAction[] = ['checkIn', 'complete'];
  for (const priority of actionPriority) {
    const action = availableActions.find(a => a.action === priority && a.valid);
    if (action) return action.action;
  }
  return null;
};

export const needsUrgentAttention = (
  appointment: AppointmentLike,
  currentTime: Date = new Date()
): { urgent: boolean; reason?: string; severity: 'low' | 'medium' | 'high' } => {
  const appointmentTime = getAppointmentDateTime(appointment);
  const minutesSinceAppointment = differenceInMinutes(currentTime, appointmentTime);

  if (appointment.estado_cita === AppointmentStatusEnum.PRESENTE && minutesSinceAppointment > 30) {
    return {
      urgent: true,
      reason: `Paciente esperando ${minutesSinceAppointment} minutos desde check-in`,
      severity: minutesSinceAppointment > 60 ? 'high' : 'medium'
    };
  }

  if (
    (appointment.estado_cita === AppointmentStatusEnum.PROGRAMADA ||
     appointment.estado_cita === AppointmentStatusEnum.CONFIRMADA) &&
    minutesSinceAppointment > 30
  ) {
    return {
      urgent: true,
      reason: 'Cita pasada sin check-in. Considere marcar como "No Asistió"',
      severity: minutesSinceAppointment > 60 ? 'high' : 'medium'
    };
  }

  if (
    appointment.estado_cita === AppointmentStatusEnum.PROGRAMADA &&
    minutesSinceAppointment > -60 && minutesSinceAppointment < 0
  ) {
    return {
      urgent: true,
      reason: 'Cita próxima sin confirmar',
      severity: 'low'
    };
  }

  return { urgent: false, severity: 'low' };
};

export const canTransitionToStatus = (
  currentStatus: AppointmentStatus,
  newStatus: AppointmentStatus,
  context?: BusinessRuleContext
): ValidationResult => {
  const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
    [AppointmentStatusEnum.PROGRAMADA]: [
      AppointmentStatusEnum.CONFIRMADA,
      AppointmentStatusEnum.PRESENTE,
      AppointmentStatusEnum.CANCELADA,
      AppointmentStatusEnum.NO_ASISTIO,
      AppointmentStatusEnum.REAGENDADA,
    ],
    [AppointmentStatusEnum.CONFIRMADA]: [
      AppointmentStatusEnum.PRESENTE,
      AppointmentStatusEnum.CANCELADA,
      AppointmentStatusEnum.NO_ASISTIO,
      AppointmentStatusEnum.REAGENDADA,
    ],
    [AppointmentStatusEnum.PRESENTE]: [
      AppointmentStatusEnum.COMPLETADA,
      AppointmentStatusEnum.CANCELADA,
    ],
    [AppointmentStatusEnum.COMPLETADA]: [
      AppointmentStatusEnum.REAGENDADA,
    ],
    [AppointmentStatusEnum.CANCELADA]: [
      AppointmentStatusEnum.REAGENDADA,
    ],
    [AppointmentStatusEnum.NO_ASISTIO]: [
      AppointmentStatusEnum.REAGENDADA,
    ],
    [AppointmentStatusEnum.REAGENDADA]: [
      AppointmentStatusEnum.PROGRAMADA,
      AppointmentStatusEnum.CONFIRMADA,
    ],
  } as Record<AppointmentStatus, AppointmentStatus[]>;

  const allowedTransitions = validTransitions[currentStatus] || [];
  if (!allowedTransitions.includes(newStatus) && !context?.allowOverride) {
    return { valid: false, reason: `Transición no válida de ${currentStatus} a ${newStatus}` };
  }
  return { valid: true };
};

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
