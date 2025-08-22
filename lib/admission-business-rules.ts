// lib/admission-business-rules.ts
// REGLAS DE NEGOCIO COMPLETAS Y CORREGIDAS PARA FLUJO DE ADMISIÓN

import { addMinutes, isBefore, isAfter, differenceInMinutes } from 'date-fns';
import {
  CLINIC_SCHEDULE,
  withinWorkHours as scheduleWithinWorkHours,
  isWorkDay as scheduleIsWorkDay,
  isLunchTime as scheduleIsLunchTime,
} from '@/lib/clinic-schedule';

// ✅ Tipos locales mínimos para evitar depender de components/* (isomórfico FE/BE)
import { z } from 'zod';
import { ZAppointmentStatus } from '@/lib/validation/enums';
import { AppointmentStatusEnum } from '@/lib/types';

export type AppointmentStatus = z.infer<typeof ZAppointmentStatus>;
export type AdmissionAction = 'checkIn' | 'complete' | 'cancel' | 'noShow' | 'reschedule' | 'viewHistory';
export interface ValidationResult { valid: boolean; reason?: string }
export interface BusinessRuleContext { currentTime?: Date; allowOverride?: boolean; userRole?: string }
export type AppointmentLike = { fecha_hora_cita: string; estado_cita: AppointmentStatus; updated_at?: string };

// ==================== CONFIGURACIÓN DE REGLAS ====================
export const BUSINESS_RULES = {
  // ✅ Ventanas de tiempo para check-in
  CHECK_IN_WINDOW_BEFORE_MINUTES: 30, // 30 min antes
  CHECK_IN_WINDOW_AFTER_MINUTES: 15,  // 15 min después (grace period)
  
  // ✅ Ventanas para gestión de consultas
  COMPLETION_WINDOW_AFTER_MINUTES: 120, // 2 horas después de la cita
  MIN_CONSULTATION_MINUTES: 5, // Mínimo 5 minutos en consulta
  MAX_CONSULTATION_MINUTES: 90, // Máximo 90 minutos en consulta
  
  // ✅ Ventana para marcar "No Asistió"
  NO_SHOW_WINDOW_AFTER_MINUTES: 15, // 15 min después de la hora programada
  
  // ✅ Tiempo límite para reagendar (2 horas antes)
  RESCHEDULE_DEADLINE_HOURS: 2,
  
  // ✅ Prevenir cambios rápidos consecutivos
  RAPID_CHANGE_COOLDOWN_MINUTES: 2,
  
  // ✅ Horarios de trabajo
  WORK_START_HOUR: 8,
  WORK_END_HOUR: 18,
  LUNCH_START_HOUR: 12,
  LUNCH_END_HOUR: 13,
  
  // ✅ Configuración de días laborales
  WORK_DAYS: [1, 2, 3, 4, 5], // Lunes a viernes
} as const;

// ==================== MOTOR DE REGLAS DECLARATIVO ====================
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

// ==================== HELPERS DE TIEMPO ====================
const getAppointmentDateTime = (appointment: AppointmentLike): Date => {
  return new Date(appointment.fecha_hora_cita);
};

const isWithinWorkHours = (date: Date): boolean => {
  // Usar helpers conscientes de zona horaria para evitar desalineaciones (SSR/UTC vs zona clínica)
  return scheduleWithinWorkHours(date) && scheduleIsWorkDay(date);
};

const isLunchTime = (date: Date): boolean => {
  // Delegar a helper centralizado (respetando CLINIC_TIMEZONE)
  return scheduleIsLunchTime(date);
};

const wasRecentlyUpdated = (appointment: AppointmentLike, minutes: number = BUSINESS_RULES.RAPID_CHANGE_COOLDOWN_MINUTES): boolean => {
  const ts = appointment.updated_at ? new Date(appointment.updated_at) : null;
  if (!ts || isNaN(ts.getTime())) return false;
  return differenceInMinutes(new Date(), ts) < minutes;
};

// ==================== VALIDADORES ESPECÍFICOS POR ACCIÓN ====================

// ✅ Validar check-in (marcar presente)
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
    // Horario laboral
    ({ now, ctx }) => {
      if (!ctx?.allowOverride && !isWithinWorkHours(now)) {
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

// ✅ Validar completar consulta
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

// ✅ Validar cancelar cita
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

// ✅ Validar marcar como "No Asistió"
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

// ✅ Validar reagendar cita
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

// ==================== FUNCIONES AUXILIARES AVANZADAS ====================

// ✅ Obtener todas las acciones disponibles para una cita
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
    { action: 'viewHistory', valid: true }, // Siempre disponible
  ];
};

// ✅ Sugerir próxima acción más relevante
export const suggestNextAction = (
  appointment: AppointmentLike,
  currentTime: Date = new Date(),
  context?: BusinessRuleContext
): AdmissionAction | null => {
  const availableActions = getAvailableActions(appointment, currentTime, context);
  
  // Prioridad de acciones según estado
  const actionPriority: AdmissionAction[] = ['checkIn', 'complete'];
  
  for (const priority of actionPriority) {
    const action = availableActions.find(a => a.action === priority && a.valid);
    if (action) return action.action;
  }
  
  return null;
};

// ✅ Verificar si una cita necesita atención urgente
export const needsUrgentAttention = (
  appointment: AppointmentLike,
  currentTime: Date = new Date()
): { urgent: boolean; reason?: string; severity: 'low' | 'medium' | 'high' } => {
  const appointmentTime = getAppointmentDateTime(appointment);
  const minutesSinceAppointment = differenceInMinutes(currentTime, appointmentTime);
  
  // Paciente presente esperando mucho tiempo
  if (appointment.estado_cita === AppointmentStatusEnum.PRESENTE && minutesSinceAppointment > 30) {
    return {
      urgent: true,
      reason: `Paciente esperando ${minutesSinceAppointment} minutos desde check-in`,
      severity: minutesSinceAppointment > 60 ? 'high' : 'medium'
    };
  }
  
  // Cita que debería marcarse como no asistió
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
  
  // Cita próxima sin confirmar
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

// ✅ Calcular tiempo hasta que una acción esté disponible
export const getTimeUntilActionAvailable = (
  appointment: AppointmentLike,
  action: AdmissionAction,
  currentTime: Date = new Date()
): { available: boolean; minutesUntil?: number; message?: string } => {
  const appointmentTime = getAppointmentDateTime(appointment);
  
  switch (action) {
    case 'checkIn': {
      const checkInStart = addMinutes(appointmentTime, -BUSINESS_RULES.CHECK_IN_WINDOW_BEFORE_MINUTES);
      if (isBefore(currentTime, checkInStart)) {
        const minutesUntil = differenceInMinutes(checkInStart, currentTime);
        return {
          available: false,
          minutesUntil,
          message: `Check-in disponible en ${minutesUntil} minutos`
        };
      }
      break;
    }
    
    case 'noShow': {
      const noShowTime = addMinutes(appointmentTime, BUSINESS_RULES.NO_SHOW_WINDOW_AFTER_MINUTES);
      if (isBefore(currentTime, noShowTime)) {
        const minutesUntil = differenceInMinutes(noShowTime, currentTime);
        return {
          available: false,
          minutesUntil,
          message: `"No Asistió" disponible en ${minutesUntil} minutos`
        };
      }
      break;
    }
    
    default:
      break;
  }
  
  return { available: true };
};

// ✅ Validar transición de estado
export const canTransitionToStatus = (
  currentStatus: AppointmentStatus,
  newStatus: AppointmentStatus,
  context?: BusinessRuleContext
): ValidationResult => {
  // Definir transiciones válidas
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
      AppointmentStatusEnum.REAGENDADA, // Solo si se necesita una nueva cita
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
  };

  // Verificar si la transición es válida
  const allowedTransitions = validTransitions[currentStatus] || [];
  
  if (!allowedTransitions.includes(newStatus) && !context?.allowOverride) {
    return {
      valid: false,
      reason: `Transición no válida de ${currentStatus} a ${newStatus}`
    };
  }
  
  return { valid: true };
};

// ==================== CONFIGURACIÓN DE EXPORTACIÓN ====================
export const ADMISSION_BUSINESS_RULES = {
  // Validadores principales
  canCheckIn,
  canCompleteAppointment,
  canCancelAppointment,
  canMarkNoShow,
  canRescheduleAppointment,
  
  // Helpers avanzados
  getAvailableActions,
  suggestNextAction,
  needsUrgentAttention,
  getTimeUntilActionAvailable,
  canTransitionToStatus,
  
  // Configuración
  BUSINESS_RULES,
  
  // Utilidades de tiempo
  getAppointmentDateTime,
  isWithinWorkHours,
  isLunchTime,
} as const;

export default ADMISSION_BUSINESS_RULES;