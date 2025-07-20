// patient-admission.reschedule.tsx - Con validación de horarios disponibles
import React, { memo, useCallback, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isBefore, startOfDay, isWeekend, addMonths, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

import { useClinic } from "@/contexts/clinic-data-provider";
import { AppointmentStatusEnum } from "@/lib/types";

// ==================== TIPOS ====================

interface RescheduleState {
  readonly selectedDate: Date | null;
  readonly selectedTime: string | null;
}

export interface RescheduleDatePickerProps {
  rescheduleState: RescheduleState;
  onStateChange: (newState: Partial<RescheduleState>) => void;
  excludeAppointmentId?: string; // ID de la cita que se está reagendando (para excluirla)
}

// ==================== CONFIGURACIONES ====================

// Horarios de trabajo: 9:00 AM - 2:00 PM, intervalos de 30 minutos
const WORK_SCHEDULE = {
  startHour: 9,
  endHour: 14, // 2 PM en formato 24h
  intervalMinutes: 30,
  workDays: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
} as const;

// Generar slots de tiempo basado en horario de trabajo
const generateWorkTimeSlots = (): string[] => {
  const slots: string[] = [];
  const { startHour, endHour, intervalMinutes } = WORK_SCHEDULE;
  
  // Calcular total de slots
  const totalSlots = ((endHour - startHour) * 60) / intervalMinutes;
  
  for (let i = 0; i < totalSlots; i++) {
    const totalMinutes = startHour * 60 + i * intervalMinutes;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    
    slots.push(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`);
  }
  
  return slots;
};

const AVAILABLE_TIME_SLOTS = generateWorkTimeSlots();

// ==================== UTILIDADES ====================

// Cache para formateo de fechas
const dateDisplayCache = new Map<string, string>();

const formatDisplayDate = (date: Date | null): string => {
  if (!date) return "Fecha inválida";
  
  const key = date.toISOString();
  const cached = dateDisplayCache.get(key);
  if (cached) return cached;
  
  try {
    const formatted = format(date, "EEEE, d 'de' MMMM", { locale: es });
    dateDisplayCache.set(key, formatted);
    return formatted;
  } catch {
    return "Error de formato";
  }
};

// Validar si es día laboral
const isWorkDay = (date: Date): boolean => {
  return WORK_SCHEDULE.workDays.includes(date.getDay());
};

// Validar si la fecha está en rango permitido
const isDateInValidRange = (date: Date): boolean => {
  const today = startOfDay(new Date());
  const maxDate = addMonths(today, 3); // Máximo 3 meses adelante
  
  return date >= today && date <= maxDate && isWorkDay(date);
};

// ==================== COMPONENTES ====================

const TimeSlot = memo<{ 
  time: string; 
  isAvailable: boolean;
  onClick: () => void;
}>(({ time, isAvailable, onClick }) => (
  <SelectItem 
    value={time} 
    className={cn(
      "text-sm cursor-pointer transition-colors",
      isAvailable 
        ? "text-slate-900 dark:text-slate-100" 
        : "text-slate-400 dark:text-slate-500 opacity-50 cursor-not-allowed"
    )}
    disabled={!isAvailable}
    onClick={isAvailable ? onClick : undefined}
  >
    <div className="flex items-center justify-between w-full">
      <span className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5" />
        {time}
      </span>
      <span className="ml-2">
        {isAvailable ? (
          <CheckCircle className="h-3 w-3 text-green-500" />
        ) : (
          <AlertCircle className="h-3 w-3 text-red-500" />
        )}
      </span>
    </div>
  </SelectItem>
));

TimeSlot.displayName = "TimeSlot";

const LoadingSpinner = memo(() => (
  <div className="flex items-center justify-center p-4">
    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
    <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
      Verificando disponibilidad...
    </span>
  </div>
));

LoadingSpinner.displayName = 'LoadingSpinner';

// ==================== COMPONENTE PRINCIPAL ====================

export const RescheduleDatePicker = memo<RescheduleDatePickerProps>(({ 
  rescheduleState, 
  onStateChange,
  excludeAppointmentId
}) => {
  // Obtener citas existentes
  // Selector simple usando useClinic (como propuso el usuario)
  const { allAppointments, isLoading: isLoadingAppointments } = useClinic();
  
  // Datos simulados para compatibilidad
  const appointmentsData = useMemo(() => ({
    appointments: allAppointments || []
  }), [allAppointments]);
  const appointments = useMemo(() => appointmentsData?.appointments || [], [appointmentsData?.appointments]);

  // Calcular horarios disponibles para la fecha seleccionada
  const availableTimeSlots = useMemo(() => {
    if (!rescheduleState.selectedDate || !isDateInValidRange(rescheduleState.selectedDate)) {
      return [];
    }

    const selectedDate = rescheduleState.selectedDate;
    const today = new Date();
    const isToday = isSameDay(selectedDate, today);
    
    // Crear Set de horarios ocupados para búsqueda O(1)
    const occupiedSlots = new Set<string>();
    
    appointments.forEach((appointment: any) => {
      // Excluir la cita que se está reagendando
      if (excludeAppointmentId && appointment.id === excludeAppointmentId) {
        return;
      }
      
      // Solo considerar citas no canceladas
      if (appointment.estado === AppointmentStatusEnum.CANCELADA) {
        return;
      }
      
      // Verificar si es el mismo día
      const appointmentDate = new Date(appointment.fecha_hora_cita || appointment.fechaConsulta);
      if (isSameDay(appointmentDate, selectedDate)) {
        const timeSlot = appointment.horaConsulta || 
          appointmentDate.toTimeString().slice(0, 5); // HH:MM format
        occupiedSlots.add(timeSlot);
      }
    });
    
    // Filtrar slots disponibles
    return AVAILABLE_TIME_SLOTS.map(timeSlot => {
      let isAvailable = !occupiedSlots.has(timeSlot);
      
      // Si es hoy, excluir horarios que ya pasaron
      if (isToday && isAvailable) {
        const [hour, minute] = timeSlot.split(':').map(Number);
        const slotDateTime = new Date();
        slotDateTime.setHours(hour, minute, 0, 0);
        
        // Agregar 30 minutos de buffer para preparación
        const currentTimeWithBuffer = new Date(today.getTime() + 30 * 60 * 1000);
        isAvailable = slotDateTime > currentTimeWithBuffer;
      }
      
      return {
        time: timeSlot,
        isAvailable
      };
    });
  }, [rescheduleState.selectedDate, appointments, excludeAppointmentId]);

  // Contar slots disponibles
  const availableSlotsCount = useMemo(() => {
    return availableTimeSlots.filter(slot => slot.isAvailable).length;
  }, [availableTimeSlots]);

  // Handlers memoizados
  const handleDateChange = useCallback((date: Date | undefined) => {
    if (!date) {
      onStateChange({ selectedDate: null, selectedTime: null });
      return;
    }
    
    if (!isDateInValidRange(date)) {
      return; // No actualizar si la fecha no es válida
    }
    
    onStateChange({ 
      selectedDate: date,
      selectedTime: null // Limpiar tiempo al cambiar fecha
    });
  }, [onStateChange]);
  
  const handleTimeChange = useCallback((time: string) => {
    const selectedSlot = availableTimeSlots.find(slot => slot.time === time);
    if (selectedSlot?.isAvailable) {
      onStateChange({ selectedTime: time });
    }
  }, [onStateChange, availableTimeSlots]);
  
  // Función para deshabilitar fechas
  const disabledDates = useCallback((date: Date) => {
    // Fechas pasadas
    if (isBefore(date, startOfDay(new Date()))) return true;
    
    // Fines de semana
    if (isWeekend(date)) return true;
    
    // Fuera del rango permitido
    if (!isDateInValidRange(date)) return true;
    
    return false;
  }, []);
  
  // Textos memoizados
  const dateButtonText = useMemo(() => {
    return rescheduleState.selectedDate 
      ? formatDisplayDate(rescheduleState.selectedDate) 
      : "Seleccionar fecha";
  }, [rescheduleState.selectedDate]);
  
  const timePlaceholder = useMemo(() => {
    if (!rescheduleState.selectedDate) {
      return "Seleccione fecha primero";
    }
    if (isLoadingAppointments) {
      return "Verificando disponibilidad...";
    }
    if (availableSlotsCount === 0) {
      return "No hay horarios disponibles";
    }
    return "Seleccionar hora";
  }, [rescheduleState.selectedDate, isLoadingAppointments, availableSlotsCount]);
  
  const showConfirmation = rescheduleState.selectedDate && rescheduleState.selectedTime;

  return (
    <div className="space-y-6 pt-4">
      {/* Información de horarios */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm">
            Horarios de Atención
          </h4>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Lunes a Sábado:</strong> 9:00 AM - 2:00 PM
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
          Citas cada 30 minutos • No hay atención domingos
        </p>
      </div>

      {/* Selector de Fecha */}
      <div className="space-y-3">
        <Label htmlFor="newDate" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Nueva Fecha <span className="text-red-500">*</span>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              id="newDate" 
              variant="outline" 
              className={cn(
                "w-full justify-start text-left font-normal h-11 border-slate-300 dark:border-slate-600",
                !rescheduleState.selectedDate && "text-slate-500 dark:text-slate-400"
              )}
              aria-label="Seleccionar nueva fecha"
            >
              <CalendarIcon className="mr-3 h-4 w-4" />
              <span>{dateButtonText}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar 
              mode="single" 
              selected={rescheduleState.selectedDate || undefined} 
              onSelect={handleDateChange} 
              initialFocus 
              locale={es} 
              disabled={disabledDates}
              aria-label="Calendario para seleccionar nueva fecha"
              className="rounded-lg"
            />
          </PopoverContent>
        </Popover>
        {rescheduleState.selectedDate && (
          <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            Fecha válida seleccionada
          </p>
        )}
      </div>

      {/* Selector de Hora */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="newTime" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Nueva Hora <span className="text-red-500">*</span>
          </Label>
          {rescheduleState.selectedDate && !isLoadingAppointments && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {availableSlotsCount} horarios disponibles
            </span>
          )}
        </div>
        
        <Select 
          value={rescheduleState.selectedTime || ""} 
          onValueChange={handleTimeChange}
          disabled={!rescheduleState.selectedDate || isLoadingAppointments || availableSlotsCount === 0}
        >
          <SelectTrigger 
            id="newTime" 
            className={cn(
              "h-11 border-slate-300 dark:border-slate-600",
              !rescheduleState.selectedDate && "text-slate-500 dark:text-slate-400"
            )}
            aria-label="Seleccionar nueva hora"
          >
            <SelectValue placeholder={timePlaceholder} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {isLoadingAppointments ? (
              <LoadingSpinner />
            ) : availableTimeSlots.length > 0 ? (
              <>
                <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    ✅ Disponible | ❌ Ocupado
                  </p>
                </div>
                {availableTimeSlots.map((slot) => (
                  <TimeSlot 
                    key={slot.time} 
                    time={slot.time}
                    isAvailable={slot.isAvailable}
                    onClick={() => handleTimeChange(slot.time)} 
                  />
                ))}
              </>
            ) : (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                {rescheduleState.selectedDate 
                  ? "No hay horarios disponibles para esta fecha" 
                  : "Seleccione una fecha válida"
                }
              </div>
            )}
          </SelectContent>
        </Select>
        
        {rescheduleState.selectedDate && !isLoadingAppointments && availableSlotsCount === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                No hay horarios disponibles para esta fecha.
              </p>
            </div>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Intente seleccionar otra fecha o contacte al personal médico.
            </p>
          </div>
        )}
      </div>

      {/* Confirmación */}
      {showConfirmation && (
        <div 
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <h4 className="font-medium text-green-900 dark:text-green-100 text-sm">
              Nueva Cita Confirmada
            </h4>
          </div>
          <p className="text-sm text-green-800 dark:text-green-200">
            La cita será reprogramada para el{" "}
            <span className="font-semibold">
              {formatDisplayDate(rescheduleState.selectedDate)}
            </span>
            {" a las "}
            <span className="font-semibold">
              {rescheduleState.selectedTime}
            </span>
            .
          </p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-2">
            ⏰ Duración estimada: 30 minutos
          </p>
        </div>
      )}
    </div>
  );
});

RescheduleDatePicker.displayName = "RescheduleDatePicker";