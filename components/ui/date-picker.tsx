"use client"

import * as React from "react"
import { format, startOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"

interface CustomDatePickerProps {
  value: Date | null | undefined
  onChange: (date: Date | undefined) => void
  label?: string
  className?: string
  labelClassName?: string
  triggerClassName?: string
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
  placeholder?: string
  shouldDisableDate?: (date: Date) => boolean
}

export function CustomDatePicker({
  value,
  onChange,
  label,
  className,
  labelClassName,
  triggerClassName,
  minDate,
  maxDate,
  disabled = false,
  placeholder = "Selecciona una fecha",
  shouldDisableDate,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleDisabledMatcher = (date: Date): boolean => {
    const normalizedDate = startOfDay(date)
    if (minDate && normalizedDate < startOfDay(minDate)) return true
    if (maxDate && normalizedDate > startOfDay(maxDate)) return true
    if (shouldDisableDate) return shouldDisableDate(normalizedDate)
    return false
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label
          htmlFor="date-picker-trigger"
          className={cn("text-xs font-medium text-slate-700 dark:text-slate-300", labelClassName)}
        >
          {label}
        </Label>
      )}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date-picker-trigger"
            variant={"outline"}
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal h-10 px-3 py-2 text-sm",
              "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900",
              "hover:bg-slate-50 dark:hover:bg-slate-800",
              "focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
              !value && "text-slate-500 dark:text-slate-400",
              triggerClassName,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
            {value ? format(value, "PPP", { locale: es }) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-xl rounded-md"
          align="start"
        >
          <Calendar
            mode="single"
            locale={es}
            selected={value || undefined}
            onSelect={(date) => {
              onChange(date)
              setIsOpen(false)
            }}
            initialFocus
            disabled={handleDisabledMatcher}
            fromDate={minDate}
            toDate={maxDate}
            classNames={{
              day_selected:
                "bg-sky-500 text-sky-50 hover:bg-sky-600 focus:bg-sky-600 dark:bg-sky-500 dark:text-sky-50 dark:hover:bg-sky-600",
              day_today: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50",
              day_disabled: "text-slate-400 opacity-50 dark:text-slate-600",
              head_cell: "text-slate-500 dark:text-slate-400 rounded-md w-9 font-normal text-[0.8rem] text-center",
              nav_button: cn(
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md",
              ),
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
