// lib/admission-business-rules.ts - REGLAS DE NEGOCIO PARA FLUJO DE ADMISIÓN
import { addMinutes, isBefore, isAfter, startOfDay, endOfDay, isWeekend } from 'date-fns';
import { AppointmentStatus, ACTION_TO_STATUS_MAP } from '@/components/patient-admision/admision-types';
import type { 
  AppointmentWithPatient, 
  AdmissionAction, 
  ValidationResult, 
  BusinessRuleContext 
} from '@/components/patient-admision/admision-types';

// ==================== CONFIGURACIÓN DE REGLAS ====================
const BUSINESS_RULES = {
  // Ventana de tiempo para marcar presente (antes de la cita)
  CHECK_IN_WINDOW_MINUTES: 30,
  
  // Ventana de tiempo para completar cita después de la hora programada
  COMPLETION_WINDOW_MINUTES: 120,
  
  // Tiempo mínimo en consulta antes de poder completar
  MIN_CONSULTATION_MINUTES: 5,
  
  // Ventana para marcar "No Asistió" después de la cita
  NO_SHOW_WINDOW_MINUTES: 60,
  
  // Horarios de trabajo
  WORK_START_HOUR: 8,
  WORK_END_HOUR: 18,
  
  // Tiempo máximo para reagendar antes de la cita
  RESCHEDULE_DEADLINE_HOURS: 2,
} as const;

// ==================== HELPERS DE TIEMPO ====================
const isWithinWorkHours = (date: Date): boolean => {
  const hour = date.getHours();
  return hour >= BUSINESS_RULES.WORK_START_HOUR && hour < BUSINESS_RULES.WORK_END_HOUR && !isWeekend(date);
};

const isRecentlyUpdated = (appointment: AppointmentWithPatient, minutes: number = 5): boolean => {
  // Check if appointment was updated in the last N minutes
  // This helps prevent rapid status changes
  return false; // Would need updated_at field from appointment
};

// ==================== VALIDADORES PRINCIPALES ====================

export const canCheckIn = (appointment: AppointmentWithPatient, currentTime: Date): ValidationResult => {
  const appointmentTime = new Date(appointment.fecha_hora_cita);
  const checkInWindowStart = addMinutes(appointmentTime, -BUSINESS_RULES.CHECK_IN_WINDOW_MINUTES);
  const checkInWindowEnd = addMinutes(appointmentTime, 15); // 15 min grace period
  
  // 1. Estado debe ser correcto
  if (!['PROGRAMADA', 'CONFIRMADA'].includes(appointment.estado_cita)) {
    return {
      valid: false,
      reason: `No se puede marcar presente desde estado: ${appointment.estado_cita}`
    };
  }
  
  // 2. Debe estar dentro de la ventana de check-in
  if (isBefore(currentTime, checkInWindowStart)) {
    const minutesEarly = Math.ceil((checkInWindowStart.getTime() - currentTime.getTime()) / (1000 * 60));
    return {
      valid: false,
      reason: `Muy temprano. Puede marcar presente ${minutesEarly} minutos antes de la cita.`
    };
  }
  
  if (isAfter(currentTime, checkInWindowEnd)) {
    return {
      valid: false,
      reason: 'Ventana de check-in cerrada. Use "No Asistió" o reagende la cita.'
    };
  }
  
  // 3. Debe ser en horario laboral
  if (!isWithinWorkHours(currentTime)) {
    return {
      valid: false,
      reason: 'Check-in solo disponible en horario laboral (8:00 - 18:00, días hábiles)'
    };
  }
  
  return { valid: true };
};

export const canStartConsultation = (appointment: AppointmentWithPatient, currentTime: Date): ValidationResult => {
  // 1. Paciente debe estar en sala
  if (appointment.estado_cita !== 'EN_SALA') {
    return {
      valid: false,
      reason: 'Paciente debe estar marcado como presente para iniciar consulta'
    };
  }
  
  // 2. Debe ser en horario laboral
  if (!isWithinWorkHours(currentTime)) {
    return {
      valid: false,
      reason: 'Consultas solo en horario laboral'
    };
  }
  
  return { valid: true };
};

export const canCompleteAppointment = (appointment: AppointmentWithPatient, currentTime: Date): ValidationResult => {
  const appointmentTime = new Date(appointment.fecha_hora_cita);
  const maxCompletionTime = addMinutes(appointmentTime, BUSINESS_RULES.COMPLETION_WINDOW_MINUTES);
  
  // 1. Estado debe ser correcto
  if (appointment.estado_cita !== 'EN_CONSULTA') {
    return {
      valid: false,
      reason: 'Consulta debe estar en progreso para poder completarla'
    };
  }
  
  // 2. No puede completar citas muy futuras (excepto últimos 15 min)
  if (isBefore(currentTime, addMinutes(appointmentTime, -15))) {
    return {
      valid: false,
      reason: 'No se puede completar una cita antes de la hora programada'
    };
  }
  
  // 3. Ventana máxima de finalización
  if (isAfter(currentTime, maxCompletionTime)) {
    return {
      valid: false,
      reason: `Ventana de finalización cerrada. Máximo ${BUSINESS_RULES.COMPLETION_WINDOW_MINUTES} minutos después de la cita.`
    };
  }
  
  return { valid: true };
};

export const canCancelAppointment = (appointment: AppointmentWithPatient, currentTime: Date): ValidationResult => {
  // 1. No puede cancelar citas ya completadas
  if (['COMPLETADA'].includes(appointment.estado_cita)) {
    return {
      valid: false,
      reason: 'No se puede cancelar una cita completada'
    };
  }
  
  // 2. No puede cancelar citas ya canceladas o no show
  if (['CANCELADA', 'NO_ASISTIO'].includes(appointment.estado_cita)) {
    return {
      valid: false,
      reason: 'La cita ya está cancelada'
    };
  }
  
  return { valid: true };
};

export const canMarkNoShow = (appointment: AppointmentWithPatient, currentTime: Date): ValidationResult => {
  const appointmentTime = new Date(appointment.fecha_hora_cita);
  const noShowWindowStart = addMinutes(appointmentTime, 15); // Grace period
  const noShowWindowEnd = addMinutes(appointmentTime, BUSINESS_RULES.NO_SHOW_WINDOW_MINUTES);
  
  // 1. Estado debe ser correcto
  if (!['PROGRAMADA', 'CONFIRMADA'].includes(appointment.estado_cita)) {
    return {
      valid: false,
      reason: `No se puede marcar "No Asistió" desde estado: ${appointment.estado_cita}`
    };
  }
  
  // 2. Debe ser después de la hora de la cita + grace period
  if (isBefore(currentTime, noShowWindowStart)) {
    const minutesRemaining = Math.ceil((noShowWindowStart.getTime() - currentTime.getTime()) / (1000 * 60));
    return {
      valid: false,
      reason: `Espere ${minutesRemaining} minutos después de la hora de la cita para marcar "No Asistió"`
    };
  }
  
  // 3. Ventana de tiempo para marcar no show
  if (isAfter(currentTime, noShowWindowEnd)) {
    return {
      valid: false,
      reason: 'Ventana cerrada para marcar "No Asistió". Use reagendar si es necesario.'
    };
  }
  
  return { valid: true };
};

export const canRescheduleAppointment = (appointment: AppointmentWithPatient, currentTime: Date): ValidationResult => {
  const appointmentTime = new Date(appointment.fecha_hora_cita);
  const rescheduleDeadline = addMinutes(appointmentTime, -BUSINESS_RULES.RESCHEDULE_DEADLINE_HOURS * 60);
  
  // 1. Citas completadas no se pueden reagendar
  if (appointment.estado_cita === 'COMPLETADA') {
    return {
      valid: false,
      reason: 'No se puede reagendar una cita completada'
    };
  }
  
  // 2. Para citas futuras, debe ser antes del deadline
  if (isAfter(appointmentTime, currentTime) && isAfter(currentTime, rescheduleDeadline)) {
    return {
      valid: false,
      reason: `Reagendar debe hacerse al menos ${BUSINESS_RULES.RESCHEDULE_DEADLINE_HOURS} horas antes de la cita`
    };
  }
  
  return { valid: true };
};

export const canViewHistory = (appointment: AppointmentWithPatient): ValidationResult => {
  // Siempre se puede ver el historial
  return { valid: true };
};

// ==================== VALIDADOR PRINCIPAL ====================
export const validateAction = (
  action: AdmissionAction,
  appointment: AppointmentWithPatient,
  currentTime: Date = new Date(),
  context?: Partial<BusinessRuleContext>
): ValidationResult => {
  // Validaciones generales primero
  if (!appointment.id) {
    return { valid: false, reason: 'Cita inválida' };
  }
  
  // Si hay actualizaciones recientes, esperar un poco
  if (isRecentlyUpdated(appointment) && action !== 'viewHistory') {
    return { 
      valid: false, 
      reason: 'Cita actualizada recientemente. Espere unos segundos.' 
    };
  }
  
  // Validaciones específicas por acción
  switch (action) {
    case 'checkIn':
      return canCheckIn(appointment, currentTime);
      
    case 'startConsult':
      return canStartConsultation(appointment, currentTime);
      
    case 'complete':
      return canCompleteAppointment(appointment, currentTime);
      
    case 'cancel':
      return canCancelAppointment(appointment, currentTime);
      
    case 'noShow':
      return canMarkNoShow(appointment, currentTime);
      
    case 'reschedule':
      return canRescheduleAppointment(appointment, currentTime);
      
    case 'viewHistory':
      return canViewHistory(appointment);
      
    default:
      return { valid: false, reason: 'Acción no reconocida' };
  }
};

// ==================== HELPER PARA OBTENER ACCIONES DISPONIBLES ====================
export const getAvailableActions = (
  appointment: AppointmentWithPatient,
  currentTime: Date = new Date()
): AdmissionAction[] => {
  const actions: AdmissionAction[] = ['viewHistory']; // Siempre disponible
  
  const allActions: AdmissionAction[] = [
    'checkIn', 'startConsult', 'complete', 'cancel', 'noShow', 'reschedule'
  ];
  
  allActions.forEach(action => {
    const validation = validateAction(action, appointment, currentTime);
    if (validation.valid) {
      actions.push(action);
    }
  });
  
  return actions;
};

// ==================== HELPER PARA OBTENER SIGUIENTE ACCIÓN SUGERIDA ====================
export const getNextSuggestedAction = (
  appointment: AppointmentWithPatient,
  currentTime: Date = new Date()
): AdmissionAction | null => {
  const availableActions = getAvailableActions(appointment, currentTime);
  
  // Prioridad de acciones basada en el flujo normal
  const priorityOrder: AdmissionAction[] = [
    'checkIn',      // Paciente llega
    'startConsult', // Inicia consulta
    'complete',     // Completa consulta
  ];
  
  for (const action of priorityOrder) {
    if (availableActions.includes(action)) {
      return action;
    }
  }
  
  return null;
};

// ==================== MAPEO DE ACCIONES A ESTADOS ====================
// ACTION_TO_STATUS_MAP is imported from admision-types.ts