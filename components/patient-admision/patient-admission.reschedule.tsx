import React, { useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

// Copy the date utils from the main file to avoid circular dependencies
const dateUtils = {
  formatDisplay: (date: Date | string | null | undefined, formatStr = "EEEE, d 'de' MMMM"): string => {
    if (!date) return "Fecha inválida";
    try {
      return format(date instanceof Date ? date : new Date(date), formatStr, { locale: es });
    } catch {
      return "Error de formato";
    }
  },
};

// Define types needed for this component
type EntityId = string;
type FormattedTimeString = `${number}:${number}`;

interface RescheduleState {
  readonly appointmentId: EntityId | null;
  readonly date: Date | null;
  readonly time: string | null;
}

export interface RescheduleDatePickerProps {
  rescheduleState: RescheduleState;
  onStateChange: (newState: Partial<RescheduleState>) => void;
}

// Create time slots for the time picker
const TIME_SLOTS: readonly string[] = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minute = (i % 2) * 30;
  if (hour >= 20) return null;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}).filter((slot): slot is string => slot !== null);

// Export the RescheduleDatePicker component
export const RescheduleDatePicker: React.FC<RescheduleDatePickerProps> = ({ 
  rescheduleState, 
  onStateChange 
}) => {
  const handleDateChange = useCallback(
    (date: Date | undefined) => onStateChange({ date: date || null }),
    [onStateChange]
  );
  
  const handleTimeChange = useCallback(
    (time: string) => onStateChange({ time }),
    [onStateChange]
  );
  
  return (
    <div className="space-y-5 pt-3">
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
                  ? dateUtils.formatDisplay(rescheduleState.date, "EEEE, d 'de' MMMM") 
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
      
      <div className="space-y-2">
        <Label htmlFor="newTime" className="text-sm font-medium">
          Nueva Hora
        </Label>
        <Select value={rescheduleState.time || ""} onValueChange={handleTimeChange}>
          <SelectTrigger id="newTime" className="h-10">
            <SelectValue placeholder="Seleccionar hora" />
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
      
      {rescheduleState.date && rescheduleState.time && (
        <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
          <h4 className="font-medium text-sm mb-1 text-slate-900 dark:text-slate-100">Confirmación</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            La cita será reprogramada para el{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {dateUtils.formatDisplay(rescheduleState.date, "EEEE, d 'de' MMMM")}
            </span>
            {" a las "}
            <span className="font-medium text-slate-900 dark:text-slate-100">{rescheduleState.time}</span>.
          </p>
        </div>
      )}
    </div>
  );
};

RescheduleDatePicker.displayName = "RescheduleDatePicker";
