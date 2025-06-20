import React from "react";
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

// Configuración estática
const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30"
];

// Utilidades
const formatDisplayDate = (date: Date | null): string => {
  if (!date) return "Fecha inválida";
  try {
    return format(date, "EEEE, d 'de' MMMM", { locale: es });
  } catch {
    return "Error de formato";
  }
};

// Componente principal optimizado
export const RescheduleDatePicker: React.FC<RescheduleDatePickerProps> = ({ 
  rescheduleState, 
  onStateChange 
}) => {
  const handleDateChange = (date: Date | undefined) => {
    onStateChange({ date: date || null });
    // Limpiar tiempo al cambiar fecha
    if (rescheduleState.time) {
      onStateChange({ time: null });
    }
  };
  
  const handleTimeChange = (time: string) => {
    onStateChange({ time });
  };
  
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
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span>
                {rescheduleState.date 
                  ? formatDisplayDate(rescheduleState.date) 
                  : "Seleccionar fecha"
                }
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar 
              mode="single" 
              selected={rescheduleState.date || undefined} 
              onSelect={handleDateChange} 
              initialFocus 
              locale={es} 
              disabled={(d) => isBefore(d, startOfDay(new Date()))}
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
          <SelectTrigger id="newTime" className="h-10">
            <SelectValue placeholder={rescheduleState.date ? "Seleccionar hora" : "Seleccione fecha primero"} />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {TIME_SLOTS.map((hora) => (
              <SelectItem key={hora} value={hora} className="text-sm">
                <span className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  {hora}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Confirmación */}
      {showConfirmation && (
        <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
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
};