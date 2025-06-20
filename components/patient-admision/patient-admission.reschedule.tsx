// patient-admission.reschedule.tsx - Versión optimizada para rendimiento
import React, { memo, useCallback, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

// Tipos simplificados
interface RescheduleState {
  readonly date: Date | null;
  readonly time: string | null;
}

export interface RescheduleDatePickerProps {
  rescheduleState: RescheduleState;
  onStateChange: (newState: Partial<RescheduleState>) => void;
}

// Configuración estática fuera del componente
const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30"
] as const;

// Cache para formateo de fechas
const dateDisplayCache = new Map<string, string>();

// Función de formateo con cache
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

// Componente de slot de tiempo memoizado
const TimeSlot = memo<{ time: string; onClick: () => void }>(({ time, onClick }) => (
  <SelectItem value={time} className="text-sm">
    <span className="flex items-center gap-2">
      <Clock className="h-3.5 w-3.5" />
      {time}
    </span>
  </SelectItem>
));

TimeSlot.displayName = "TimeSlot";

// Componente principal optimizado
export const RescheduleDatePicker = memo<RescheduleDatePickerProps>(({ 
  rescheduleState, 
  onStateChange 
}) => {
  // Handlers memoizados
  const handleDateChange = useCallback((date: Date | undefined) => {
    onStateChange({ date: date || null });
    // Limpiar tiempo al cambiar fecha si ya había uno seleccionado
    if (rescheduleState.time) {
      onStateChange({ time: null });
    }
  }, [onStateChange, rescheduleState.time]);
  
  const handleTimeChange = useCallback((time: string) => {
    onStateChange({ time });
  }, [onStateChange]);
  
  // Función memoizada para deshabilitar fechas pasadas
  const disabledDates = useCallback((date: Date) => {
    return isBefore(date, startOfDay(new Date()));
  }, []);
  
  // Texto del botón de fecha memoizado
  const dateButtonText = useMemo(() => {
    return rescheduleState.date 
      ? formatDisplayDate(rescheduleState.date) 
      : "Seleccionar fecha";
  }, [rescheduleState.date]);
  
  // Placeholder del selector de tiempo memoizado
  const timePlaceholder = useMemo(() => {
    return rescheduleState.date ? "Seleccionar hora" : "Seleccione fecha primero";
  }, [rescheduleState.date]);
  
  const showConfirmation = rescheduleState.date && rescheduleState.time;

  return (
    <div className="space-y-5 pt-3">
      {/* Selector de Fecha */}
      <div className="space-y-2">
        <Label htmlFor="newDate" className="text-sm font-medium">
          Nueva Fecha
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              id="newDate" 
              variant="outline" 
              className={cn(
                "w-full justify-start text-left font-normal h-10",
                !rescheduleState.date && "text-muted-foreground"
              )}
              aria-label="Seleccionar nueva fecha"
              aria-haspopup="dialog"
              aria-expanded="false"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span>{dateButtonText}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar 
              mode="single" 
              selected={rescheduleState.date || undefined} 
              onSelect={handleDateChange} 
              initialFocus 
              locale={es} 
              disabled={disabledDates}
              aria-label="Calendario para seleccionar nueva fecha"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Selector de Hora */}
      <div className="space-y-2">
        <Label htmlFor="newTime" className="text-sm font-medium">
          Nueva Hora
        </Label>
        <Select 
          value={rescheduleState.time || ""} 
          onValueChange={handleTimeChange}
          disabled={!rescheduleState.date}
        >
          <SelectTrigger 
            id="newTime" 
            className="h-10"
            aria-label="Seleccionar nueva hora"
          >
            <SelectValue placeholder={timePlaceholder} />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {TIME_SLOTS.map((hora) => (
              <TimeSlot 
                key={hora} 
                time={hora} 
                onClick={() => handleTimeChange(hora)} 
              />
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Confirmación */}
      {showConfirmation && (
        <div 
          className="mt-4 p-4 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg"
          role="status"
          aria-live="polite"
        >
          <h4 className="font-medium text-sm mb-1 text-slate-900 dark:text-slate-100">
            Confirmación
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            La cita será reprogramada para el{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {formatDisplayDate(rescheduleState.date)}
            </span>
            {" a las "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {rescheduleState.time}
            </span>
            .
          </p>
        </div>
      )}
    </div>
  );
});

RescheduleDatePicker.displayName = "RescheduleDatePicker";