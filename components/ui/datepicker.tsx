"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerProps {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  minDate?: Date
  maxDate?: Date
  filterDate?: (date: Date) => boolean
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  date,
  onDateChange,
  minDate,
  maxDate,
  filterDate,
  placeholder = "Seleccione una fecha",
  disabled = false,
  className,
}: DatePickerProps): React.ReactElement {
  console.log("[DatePicker] Initial date prop:", date);
  
  // Estado local para gestionar la fecha seleccionada dentro del componente
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date);
  
  // Efecto para sincronizar el estado local cuando cambia la prop date
  React.useEffect(() => {
    console.log("[DatePicker] date prop changed:", date);
    setSelectedDate(date);
  }, [date]);
  
  const handleSelect = (newDate: Date | undefined) => {
    console.log("[DatePicker] handleSelect called with:", newDate);
    setSelectedDate(newDate); // Actualizar estado local para UI inmediata
    onDateChange(newDate); // Propagar el cambio al formulario padre
  }

  const isDisabled = React.useCallback(
    (day: Date) => {
      // Check if component-level disabled prop is true
      if (disabled) {
        console.log("[DatePicker] Date disabled by component prop", day);
        return true;
      }
      
      // Check if date is filtered out by filterDate function
      if (filterDate && !filterDate(day)) {
        console.log("[DatePicker] Date disabled by filterDate function", day);
        return true;
      }
      
      console.log("[DatePicker] Date is enabled", day);
      return false;
    },
    [filterDate, disabled]
  )

  // Estado para controlar la apertura del popover
  const [open, setOpen] = React.useState(false);

  // Modificar handleSelect para cerrar el popover después de seleccionar
  const handleSelectAndClose = (newDate: Date | undefined) => {
    console.log("[DatePicker] handleSelectAndClose called with:", newDate);
    setSelectedDate(newDate); // Actualizar estado local para UI inmediata
    onDateChange(newDate); // Propagar el cambio al formulario padre
    setOpen(false); // Cerrar explícitamente el popover
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, "PPP", { locale: es })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          locale={es}
          mode="single"
          selected={selectedDate}
          onSelect={handleSelectAndClose}
          disabled={isDisabled}
          fromDate={minDate}
          toDate={maxDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
