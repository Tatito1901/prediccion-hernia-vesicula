"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import DatePicker, { registerLocale } from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

// Registrar el locale español
registerLocale("es", es)

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | null) => void
  disabled?: boolean
  placeholder?: string
  showTimeSelect?: boolean
  timeIntervals?: number
  minDate?: Date
  maxDate?: Date
  minTime?: Date
  maxTime?: Date
  excludeDates?: Date[]
  filterDate?: (date: Date) => boolean
  className?: string
}

export function DatePickerComponent({
  value,
  onChange,
  disabled = false,
  placeholder = "Seleccionar fecha",
  showTimeSelect = false,
  timeIntervals = 30,
  minDate,
  maxDate,
  minTime,
  maxTime,
  excludeDates,
  filterDate,
  className,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            showTimeSelect ? 
              format(value, "PPP HH:mm", { locale: es }) : 
              format(value, "PPP", { locale: es })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DatePicker
          selected={value}
          onChange={onChange}
          showTimeSelect={showTimeSelect}
          timeIntervals={timeIntervals}
          dateFormat={showTimeSelect ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy"}
          locale="es"
          minDate={minDate}
          maxDate={maxDate}
          minTime={minTime}
          maxTime={maxTime}
          excludeDates={excludeDates}
          filterDate={filterDate}
          inline
          calendarClassName="border-0 shadow-none"
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePickerComponent as DatePicker }
