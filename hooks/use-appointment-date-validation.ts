import { useCallback } from 'react';
import { startOfDay, addDays, isWithinInterval, isBefore, isWeekend } from 'date-fns';
import { CLINIC_SCHEDULE, isWorkDay } from '@/lib/clinic-schedule';

/**
 * Hook compartido para validación de fechas de citas
 * Reemplaza las 3 implementaciones duplicadas en:
 * - patient-modal.tsx
 * - schedule-appointment-dialog.tsx
 * - patient-admission-reschedule.tsx
 */
export function useAppointmentDateValidation() {
  /**
   * Valida si una fecha es válida para agendar una cita
   * - Debe ser un día laboral (no fin de semana)
   * - Debe estar entre hoy y MAX_ADVANCE_DAYS
   */
  const isValidDate = useCallback((date: Date): boolean => {
    const today = startOfDay(new Date());
    const maxDate = addDays(today, CLINIC_SCHEDULE.MAX_ADVANCE_DAYS);
    return isWorkDay(date) && isWithinInterval(date, { start: today, end: maxDate });
  }, []);

  /**
   * Función para deshabilitar fechas en el DatePicker
   * Deshabilita:
   * - Fechas pasadas
   * - Fines de semana
   */
  const disabledDates = useCallback((date: Date): boolean => {
    return isBefore(date, startOfDay(new Date())) || isWeekend(date);
  }, []);

  /**
   * Valida si una fecha está dentro del rango permitido para agendar
   */
  const isWithinValidRange = useCallback((date: Date): boolean => {
    const today = startOfDay(new Date());
    const maxDate = addDays(today, CLINIC_SCHEDULE.MAX_ADVANCE_DAYS);
    return isWithinInterval(date, { start: today, end: maxDate });
  }, []);

  return {
    isValidDate,
    disabledDates,
    isWithinValidRange,
  };
}
