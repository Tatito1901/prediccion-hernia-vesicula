// lib/admission-business-rules.ts
// REGLAS DE NEGOCIO COMPLETAS Y CORREGIDAS PARA FLUJO DE ADMISIÓN

import { addMinutes, isBefore, isAfter, differenceInMinutes, isWeekend } from 'date-fns';

// ✅ IMPORTS CORREGIDOS - usando tipos unificados
import type { 
  AppointmentWithPatient, 
  ValidationResult,
  BusinessRuleContext,
  AdmissionAction,
  AppointmentStatus
} from '@/components/patient-admision/admision-types';

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

// ==================== HELPERS DE TIEMPO ====================
const getAppointmentDateTime = (appointment: AppointmentWithPatient): Date => {
  return new Date(appointment.fecha_hora_cita);
};

const isWithinWorkHours = (date: Date): boolean => {
  const hour = date.getHours();
  const day = date.getDay();
  return hour >= BUSINESS_RULES.WORK_START_HOUR && 
         hour < BUSINESS_RULES.WORK_END_HOUR && 
         BUSINESS_RULES.WORK_DAYS.includes(day as 1 | 2 | 3 | 4 | 5);
};

const isLunchTime = (date: Date): boolean => {
  const hour = date.getHours();
  return hour >= BUSINESS_RULES.LUNCH_START_HOUR && 
         hour < BUSINESS_RULES.LUNCH_END_HOUR;
};

const wasRecentlyUpdated = (appointment: AppointmentWithPatient, minutes: number = BUSINESS_RULES.RAPID_CHANGE_COOLDOWN_MINUTES): boolean => {
  // ✅ Si tuviéramos campo updated_at, verificaríamos aquí
  // Por ahora, asumimos que no hay cambios recientes
  return false;
};

// ==================== VALIDADORES ESPECÍFICOS POR ACCIÓN ====================

// ✅ Validar check-in (marcar presente)
export const canCheckIn = (
  appointment: AppointmentWithPatient, 
  currentTime: Date = new Date(),
  context?: BusinessRuleContext
): ValidationResult => {
  const appointmentTime = getAppointmentDateTime(appointment);
  const checkInWindowStart = addMinutes(appointmentTime, -BUSINESS_RULES.CHECK_IN_WINDOW_BEFORE_MINUTES);
  const checkInWindowEnd = addMinutes(appointmentTime, BUSINESS_RULES.CHECK_IN_WINDOW_AFTER_MINUTES);
  
  // ✅ 1. Estado debe ser correcto
  if (!['PROGRAMADA', 'CONFIRMADA'].includes(appointment.estado_cita)) {
    return {
      valid: false,
      reason: `No se puede marcar presente desde estado: ${appointment.estado_cita}`
    };
  }
  
  // ✅ 2. Verificar ventana de tiempo (con override administrativo)
  if (!context?.allowOverride) {
    if (isBefore(currentTime, checkInWindowStart)) {
      const minutesUntil = differenceInMinutes(checkInWindowStart, currentTime);
      return {
        valid: false,
        reason: `Check-in disponible en ${minutesUntil} minutos (30 min antes de la cita)`
      };
    }
    
    if (isAfter(currentTime, checkInWindowEnd)) {
      return {
        valid: false,
        reason: 'Ventana de check-in expirada. Considere reagendar o marcar como "No Asistió".'
      };
    }
  }
  
  // ✅ 3. Verificar horario laboral
  if (!isWithinWorkHours(currentTime) && !context?.allowOverride) {
    return {
      valid: false,
      reason: 'Check-in solo disponible durante horario laboral (8:00 - 18:00, L-V)'
    };
  }
  
  // ✅ 4. Verificar cambios recientes
  if (wasRecentlyUpdated(appointment)) {
    return {
      valid: false,
      reason: 'Espere unos momentos antes de realizar otra acción'
    };
  }
  
  return { valid: true };
};

// ✅ Validar completar consulta
export const canCompleteAppointment = (
  appointment: AppointmentWithPatient, 
  currentTime: Date = new Date(),
  context?: BusinessRuleContext
): ValidationResult => {
  const appointmentTime = getAppointmentDateTime(appointment);
  const completionDeadline = addMinutes(appointmentTime, BUSINESS_RULES.COMPLETION_WINDOW_AFTER_MINUTES);
  
  // ✅ 1. Estado debe ser PRESENTE (flujo simplificado: sin EN_CONSULTA)
  if (appointment.estado_cita !== 'PRESENTE') {
    return {
      valid: false,
      reason: `No se puede completar desde estado: ${appointment.estado_cita}`
    };
  }
  
  // ✅ 2. Verificar que no haya pasado mucho tiempo (con override)
  if (!context?.allowOverride && isAfter(currentTime, completionDeadline)) {
    return {
      valid: false,
      reason: 'Ha pasado demasiado tiempo desde la cita programada. Contacte administración.'
    };
  }

  return { valid: true };
};

// ✅ Validar cancelar cita
export const canCancelAppointment = (
  appointment: AppointmentWithPatient, 
  currentTime: Date = new Date(),
  context?: BusinessRuleContext
): ValidationResult => {
  const appointmentTime = getAppointmentDateTime(appointment);
  
  // ✅ 1. Estados válidos para cancelar
  if (!['PROGRAMADA', 'CONFIRMADA'].includes(appointment.estado_cita)) {
    return {
      valid: false,
      reason: `No se puede cancelar una cita en estado: ${appointment.estado_cita}`
    };
  }
  
  // ✅ 2. No se puede cancelar citas del pasado (con override administrativo)
  if (!context?.allowOverride && isBefore(appointmentTime, currentTime)) {
    return {
      valid: false,
      reason: 'No se pueden cancelar citas que ya pasaron.'
    };
  }
  
  return { valid: true };
};

// ✅ Validar marcar como "No Asistió"
export const canMarkNoShow = (
  appointment: AppointmentWithPatient, 
  currentTime: Date = new Date(),
  context?: BusinessRuleContext
): ValidationResult => {
  const appointmentTime = getAppointmentDateTime(appointment);
  const noShowThreshold = addMinutes(appointmentTime, BUSINESS_RULES.NO_SHOW_WINDOW_AFTER_MINUTES);
  
  // ✅ 1. Estados válidos
  if (!['PROGRAMADA', 'CONFIRMADA'].includes(appointment.estado_cita)) {
    return {
      valid: false,
      reason: `No se puede marcar "No Asistió" desde estado: ${appointment.estado_cita}`
    };
  }
  
  // ✅ 2. Debe haber pasado el tiempo de gracia (con override)
  if (!context?.allowOverride && isBefore(currentTime, noShowThreshold)) {
    const minutesRemaining = Math.ceil(differenceInMinutes(noShowThreshold, currentTime));
    return {
      valid: false,
      reason: `Espere ${minutesRemaining} minutos más antes de marcar como "No Asistió".`
    };
  }
  
  return { valid: true };
};

// ✅ Validar reagendar cita
export const canRescheduleAppointment = (
  appointment: AppointmentWithPatient, 
  currentTime: Date = new Date(),
  context?: BusinessRuleContext
): ValidationResult => {
  const appointmentTime = getAppointmentDateTime(appointment);
  const rescheduleDeadline = addMinutes(appointmentTime, -BUSINESS_RULES.RESCHEDULE_DEADLINE_HOURS * 60);
  
  // ✅ 1. Estados válidos para reagendar
  if (!['PROGRAMADA', 'CONFIRMADA', 'CANCELADA', 'NO_ASISTIO'].includes(appointment.estado_cita)) {
    return {
      valid: false,
      reason: `No se puede reagendar una cita en estado: ${appointment.estado_cita}`
    };
  }
  
  // ✅ 2. Para citas futuras, verificar deadline (con override)
  if (['PROGRAMADA', 'CONFIRMADA'].includes(appointment.estado_cita) && !context?.allowOverride) {
    if (isAfter(currentTime, rescheduleDeadline)) {
      return {
        valid: false,
        reason: `No se puede reagendar con menos de ${BUSINESS_RULES.RESCHEDULE_DEADLINE_HOURS} horas de anticipación.`
      };
    }
  }
  
  // ✅ 3. Para citas canceladas/no asistió, siempre se puede reagendar
  return { valid: true };
};

// ==================== FUNCIONES AUXILIARES AVANZADAS ====================

// ✅ Obtener todas las acciones disponibles para una cita
export const getAvailableActions = (
  appointment: AppointmentWithPatient,
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
  appointment: AppointmentWithPatient,
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
  appointment: AppointmentWithPatient,
  currentTime: Date = new Date()
): { urgent: boolean; reason?: string; severity: 'low' | 'medium' | 'high' } => {
  const appointmentTime = getAppointmentDateTime(appointment);
  const minutesSinceAppointment = differenceInMinutes(currentTime, appointmentTime);
  
  // Paciente presente esperando mucho tiempo
  if (appointment.estado_cita === 'PRESENTE' && minutesSinceAppointment > 30) {
    return {
      urgent: true,
      reason: `Paciente esperando ${minutesSinceAppointment} minutos desde check-in`,
      severity: minutesSinceAppointment > 60 ? 'high' : 'medium'
    };
  }
  
  // Cita que debería marcarse como no asistió
  if (['PROGRAMADA', 'CONFIRMADA'].includes(appointment.estado_cita) && minutesSinceAppointment > 30) {
    return {
      urgent: true,
      reason: 'Cita pasada sin check-in. Considere marcar como "No Asistió"',
      severity: minutesSinceAppointment > 60 ? 'high' : 'medium'
    };
  }
  
  // Cita próxima sin confirmar
  if (appointment.estado_cita === 'PROGRAMADA' && minutesSinceAppointment > -60 && minutesSinceAppointment < 0) {
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
  appointment: AppointmentWithPatient,
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
    'PROGRAMADA': ['CONFIRMADA', 'PRESENTE', 'CANCELADA', 'NO_ASISTIO', 'REAGENDADA'],
    'CONFIRMADA': ['PRESENTE', 'CANCELADA', 'NO_ASISTIO', 'REAGENDADA'],
    'PRESENTE': ['COMPLETADA', 'CANCELADA'],
    'COMPLETADA': ['REAGENDADA'], // Solo si se necesita una nueva cita
    'CANCELADA': ['REAGENDADA'],
    'NO_ASISTIO': ['REAGENDADA'],
    'REAGENDADA': ['PROGRAMADA', 'CONFIRMADA'],
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