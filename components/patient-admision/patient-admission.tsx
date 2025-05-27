"use client"

import { useState, useMemo, useCallback, useEffect, memo, type FC } from "react"
import {
  Search,
  CalendarIcon,
  FileText,
  CheckCircle,
  XCircle,
  UserPlus,
  Filter,
  ArrowUpDown,
  Clock,
  Calendar,
  Users,
  ClipboardCheck,
  AlertCircle,
  CalendarDays,
  CalendarClock,
  CalendarCheck,
  CalendarX,
  ChevronRight,
  RefreshCcw,
  UserCog,
  Info as InfoIcon,
  MoreVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NewPatientOnlyForm } from "./new-patient-only-form" // Assuming this path is correct
import { PendingPatientsList } from "./pending-patients-list" // Assuming this path is correct
import { AppointmentForm } from "./appointment-form" // Assuming this path is correct
import { toast } from "sonner"
import { useAppContext } from "@/lib/context/app-context" // Assuming this path is correct
import { Badge } from "@/components/ui/badge"
import { SurveyShareDialog } from "@/components/surveys/survey-share-dialog" // Assuming this path is correct
import { generateSurveyId } from "@/lib/form-utils" // Assuming this path is correct
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, isToday as dateIsToday, isBefore, isAfter, startOfDay, addDays, isValid as isValidDateFns } from "date-fns"
import { es } from "date-fns/locale"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils" // Assuming this path is correct
import { AnimatePresence, motion } from "framer-motion"
// Assuming DiagnosisType, ModelAppointmentStatus, TimeString are correctly defined in data-model
import type { DiagnosisType, AppointmentStatus as ModelAppointmentStatus, TimeString } from "@/app/dashboard/data-model"
import { useIsMobile } from "@/hooks/use-mobile" // Assuming this path is correct

// Funciones de utilidad para manejo seguro de fechas
const isValidDate = (date: any): date is Date => {
  return date instanceof Date && !isNaN(date.getTime());
};

const safeFormatDate = (date: any, formatString: string, options?: any, fallback: string = ""): string => {
  try {
    if (!date) return fallback;
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (!isValidDate(dateObj)) return fallback;
    return format(dateObj, formatString, options);
  } catch (error) {
    console.error("[safeFormatDate] Error al formatear fecha:", error, "Fecha:", date);
    return fallback;
  }
};

// Función para normalizar IDs como strings
const normalizeId = (id: any): string => {
  if (id === null || id === undefined) return "";
  return String(id);
};

// Types for the component
// Unified "noAsistio" and removed "noShow"
export type AppointmentStatus = "pendiente" | "presente" | "completada" | "cancelada" | "reagendada" | "noAsistio" | "programada"
export type PatientStatus =
  | "Pendiente de consulta"
  | "Operado"
  | "No Operado"
  | "Seguimiento"
  | "Cancelado"
  | "No Asistió"
export type ConfirmAction = "checkIn" | "cancel" | "complete" | "noShow" | "reschedule" | null
// Added "motivo" and "estado" to SortField for potential future use, though "estado" sorting needs careful implementation
export type SortField = "nombre" | "fecha" | "hora" | "motivo" | "estado" | null
export type SortDirection = "asc" | "desc"

export interface Appointment {
  id: string | number
  nombre: string
  apellidos: string
  telefono: string
  fechaConsulta: string | Date
  horaConsulta: TimeString
  motivoConsulta: string
  estado: AppointmentStatus
  patientId?: string | number
}

export interface Patient {
  id: string | number
  nombre: string
  apellidos: string
  edad?: number
  telefono?: string
  fechaConsulta?: string // Consider if this should be Date
  fechaRegistro: string // Consider if this should be Date
  diagnostico?: DiagnosisType
  estado?: PatientStatus
  probabilidadCirugia?: number
  ultimoContacto?: string // Consider if this should be Date
  encuesta?: boolean
}

export interface SurveyDialogState {
  isOpen: boolean
  patientId: string | number
  patientName: string
  patientLastName: string
  patientPhone: string
  surveyId: string
  surveyLink: string
}

export interface ConfirmDialogState {
  isOpen: boolean
  action: ConfirmAction
  appointmentId: string | number | null
  appointmentData?: Appointment | null
}

export interface StatusColors {
  [key: string]: string // Can be more specific if AppointmentStatus is used as key
}

export interface FilterState {
  searchTerm: string
  statusFilter: string // Consider using AppointmentStatus | "all"
  dateRange: {
    from: Date | null
    to: Date | null
  }
  sortField: SortField
  sortDirection: SortDirection
}

// Improved component for selecting new date and time with consistent styling
const RescheduleDatePicker: FC<{
  date: Date | null
  time: string | null
  onDateChange: (date: Date | null) => void
  onTimeChange: (time: string) => void
}> = memo(({ date, time, onTimeChange, onDateChange }) => {
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = 8; hour <= 17; hour++) {
      if (hour !== 14) { // Skip 14:00 (lunch break)
        slots.push(`${hour.toString().padStart(2, "0")}:00`)
        slots.push(`${hour.toString().padStart(2, "0")}:30`)
      }
    }
    return slots
  }, [])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <CalendarDays className="h-4 w-4 text-primary" />
          Nueva fecha
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-10 px-3 py-2",
                "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800",
                "focus-visible:ring-primary",
                !date && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {date ? safeFormatDate(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }, "Fecha inválida") : "Seleccionar fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={date || undefined}
              onSelect={(d) => onDateChange(d || null)}
              initialFocus
              locale={es}
              disabled={(d) => isBefore(d, startOfDay(new Date()))}
              required={false} // This prop might not be standard for shadcn Calendar, check documentation
              className="rounded-md border shadow-lg"
              classNames={{
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_end: "aria-selected:bg-primary aria-selected:text-primary-foreground",
                day_range_start: "aria-selected:bg-primary aria-selected:text-primary-foreground",
                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav_button: "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100",
                table: "w-full border-collapse space-y-1",
                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                row: "flex w-full mt-2",
                head_row: "flex",
                nav: "flex items-center",
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <CalendarClock className="h-4 w-4 text-primary" />
          Nueva hora
        </label>
        <Select value={time || ""} onValueChange={onTimeChange}>
          <SelectTrigger
            className={cn(
              "w-full h-10 px-3 py-2",
              "border-slate-200 dark:border-slate-700",
              "focus-visible:ring-primary",
            )}
          >
            <SelectValue placeholder="Seleccionar hora" />
          </SelectTrigger>
          <SelectContent>
            {timeSlots.map((hora) => (
              <SelectItem key={hora} value={hora} className="cursor-pointer">
                <span className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  {hora}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {date && time && (
        <div className="mt-4 p-3 bg-primary/5 border border-primary/10 rounded-md">
          <h4 className="text-sm font-medium flex items-center gap-1.5 text-primary mb-1">
            <CalendarCheck className="h-4 w-4" />
            Resumen de reagendamiento
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            La cita será reagendada para el{" "}
            <span className="font-medium text-slate-900 dark:text-slate-200">
              {safeFormatDate(date, "EEEE, d 'de' MMMM", { locale: es }, "Fecha inválida")}
            </span>{" "}
            a las <span className="font-medium text-slate-900 dark:text-slate-200">{time}</span>.
          </p>
        </div>
      )}
    </div>
  )
})
RescheduleDatePicker.displayName = "RescheduleDatePicker"

// Memoized components for better performance
const AppointmentStatusBadge = memo(({ status }: { status: AppointmentStatus }) => {
  const getStatusColorClass = useCallback((appointmentStatus: AppointmentStatus): string => {
    const statusColors: Partial<Record<AppointmentStatus, string>> = { // Use AppointmentStatus for keys
      presente: "bg-teal-100 text-teal-800 dark:bg-teal-800/20 dark:text-teal-400 border-teal-200 dark:border-teal-800/30",
      cancelada: "bg-rose-100 text-rose-800 dark:bg-rose-800/20 dark:text-rose-400 border-rose-200 dark:border-rose-800/30",
      completada: "bg-sky-100 text-sky-800 dark:bg-sky-800/20 dark:text-sky-400 border-sky-200 dark:border-sky-800/30",
      pendiente: "bg-slate-100 text-slate-800 dark:bg-slate-800/20 dark:text-slate-400 border-slate-200 dark:border-slate-800/30",
      noAsistio: "bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-400 border-amber-200 dark:border-amber-800/30",
      reagendada: "bg-violet-100 text-violet-800 dark:bg-violet-800/20 dark:text-violet-400 border-violet-200 dark:border-violet-800/30",
      programada: "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400 border-blue-200 dark:border-blue-800/30",
    }
    return statusColors[appointmentStatus] || "bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400 border-gray-200 dark:border-gray-800/30" // Fallback
  }, [])

  const getStatusLabel = useCallback((appointmentStatus: AppointmentStatus): string => {
    const statusLabels: Record<AppointmentStatus, string> = {
      presente: "Presente",
      cancelada: "Cancelada",
      completada: "Completada",
      pendiente: "Pendiente",
      noAsistio: "No asistió",
      reagendada: "Reagendada",
      programada: "Programada",
    }
    return statusLabels[appointmentStatus] || appointmentStatus
  }, [])

  const getStatusIcon = useCallback((appointmentStatus: AppointmentStatus) => {
    switch (appointmentStatus) {
      case "presente": return <CheckCircle className="h-3 w-3 mr-1" />
      case "cancelada": return <XCircle className="h-3 w-3 mr-1" />
      case "completada": return <ClipboardCheck className="h-3 w-3 mr-1" />
      case "pendiente": return <Clock className="h-3 w-3 mr-1" />
      case "noAsistio": return <AlertCircle className="h-3 w-3 mr-1" />
      case "reagendada": return <Calendar className="h-3 w-3 mr-1" />
      case "programada": return <CalendarClock className="h-3 w-3 mr-1" />
      default: return null
    }
  }, [])

  return (
    <Badge
      variant="outline"
      className={`${getStatusColorClass(status)} transition-all duration-300 border flex items-center gap-0.5 font-medium`}
    >
      {getStatusIcon(status)}
      {getStatusLabel(status)}
    </Badge>
  )
})
AppointmentStatusBadge.displayName = "AppointmentStatusBadge"

// Appointment card component (mobile)
const AppointmentCard: FC<{
  appointment: Appointment
  isPast?: boolean // This prop seems to be used as 'showNoShow' logic in some places, clarify its purpose
  onAction: (action: ConfirmAction, id: string | number, appointment: Appointment) => void
  onStartSurvey: (patientId: string | number, patientName: string, patientLastName: string, patientPhone: string) => void
  showNoShowOverride?: boolean // Explicit prop to override status to "noAsistio"
}> = memo(({ appointment, onAction, onStartSurvey, showNoShowOverride = false }) => {
  const formatDate = useCallback((date: string | Date): string => {
    return safeFormatDate(date, "EEEE, d 'de' MMMM", { locale: es }, "Fecha inválida");
  }, [])

  const formatTime = useCallback((time: string): string => {
    if (!time || !time.includes(':')) return "Hora inválida";
    try {
      const [hours, minutes] = time.split(":");
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return format(date, "p", { locale: es });
    } catch (error) {
      console.error("Error formateando hora en Card:", error, time);
      return "Hora inválida";
    }
  }, [])

  const statusColors: Partial<Record<AppointmentStatus, string>> = useMemo(
    () => ({
      pendiente: "border-blue-500 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
      programada: "border-blue-500 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
      presente: "border-green-500 bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300",
      completada: "border-purple-500 bg-purple-50 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300",
      cancelada: "border-red-500 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300",
      reagendada: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300",
      noAsistio: "border-slate-500 bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400",
    }),
    []
  )

  const getStatusLabel = (status: AppointmentStatus): string => {
    const labels: Record<AppointmentStatus, string> = {
      pendiente: "Pendiente", programada: "Programada", presente: "Presente",
      completada: "Completada", cancelada: "Cancelada", reagendada: "Reagendada",
      noAsistio: "No Asistió",
    }
    return labels[status] || "Desconocido"
  }

  const currentAppointmentStatus = showNoShowOverride ? "noAsistio" : appointment.estado

  const getBorderColor = (status: AppointmentStatus, isNoShowOverride: boolean): string => {
    const effectiveStatus = isNoShowOverride ? "noAsistio" : status
    const colorMap: Partial<Record<AppointmentStatus, string>> = {
      pendiente: "border-l-blue-500 dark:border-l-blue-400",
      programada: "border-l-blue-500 dark:border-l-blue-400",
      presente: "border-l-green-500 dark:border-l-green-400",
      completada: "border-l-purple-500 dark:border-l-purple-400",
      cancelada: "border-l-red-500 dark:border-l-red-400",
      reagendada: "border-l-yellow-500 dark:border-l-yellow-400",
      noAsistio: "border-l-slate-500 dark:border-l-slate-400",
    }
    return colorMap[effectiveStatus] || "border-l-gray-300 dark:border-l-gray-600"
  }

  // Logic for actionability: Not actionable if completed, cancelled, or already marked as no-show (unless the no-show is an override)
  const isActionable = !["completada", "cancelada"].includes(currentAppointmentStatus) &&
                       !(currentAppointmentStatus === "noAsistio" && showNoShowOverride);


  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="w-full"
    >
      <Card
        className={`overflow-hidden mb-4 border-l-4 hover:shadow-lg transition-all duration-300 ease-in-out ${getBorderColor(appointment.estado, showNoShowOverride)} bg-white dark:bg-slate-900`}
      >
        {/* Removed redundant nested Card causing double borders */}
        <CardHeader className="p-4 bg-gradient-to-r from-slate-50/80 to-white dark:from-slate-900/50 dark:to-slate-950 border-b border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-start">
            <div className="flex-grow">
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                {appointment.nombre} {appointment.apellidos}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                {appointment.motivoConsulta}
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={`ml-2 text-xs px-2 py-0.5 ${statusColors[currentAppointmentStatus] || "border-gray-300 bg-gray-50 text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
            >
              {getStatusLabel(currentAppointmentStatus)}
            </Badge>
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-600 dark:text-slate-400 space-x-3">
            <div className="flex items-center">
              <CalendarDays className="h-3.5 w-3.5 mr-1 text-primary/80" />
              <span>{formatDate(appointment.fechaConsulta)}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-3.5 w-3.5 mr-1 text-primary/80" />
              <span>{formatTime(appointment.horaConsulta)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 text-sm text-slate-700 dark:text-slate-300">
          <p className="text-xs text-slate-500 dark:text-slate-400">ID Cita: {normalizeId(appointment.id)}</p>
          {appointment.patientId && <p className="text-xs text-slate-500 dark:text-slate-400">ID Paciente: {normalizeId(appointment.patientId)}</p>}
        </CardContent>
        <CardFooter className="p-4 pt-2 flex flex-wrap justify-between items-center gap-2 bg-gradient-to-b from-white to-slate-50/80 dark:from-slate-950 dark:to-slate-900/50 border-t border-slate-100 dark:border-slate-700/50">
          <div className="flex gap-2 flex-wrap">
            {currentAppointmentStatus === "pendiente" && (
              <Button
                size="sm" variant="ghost"
                className="text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/50"
                onClick={() => onAction("checkIn", appointment.id, appointment)}
              >
                <CheckCircle className="mr-1.5 h-4 w-4" /> Marcar Presente
              </Button>
            )}
            {currentAppointmentStatus === "presente" && (
              <Button
                size="sm" variant="ghost"
                className="text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/50"
                onClick={() => onAction("complete", appointment.id, appointment)}
              >
                <ClipboardCheck className="mr-1.5 h-4 w-4" /> Completar Cita
              </Button>
            )}
            {/* Survey button should be available if appointment is actionable */}
            {isActionable && (
              <Button
                size="sm" variant="ghost"
                className="text-sky-600 hover:bg-sky-100 dark:text-sky-400 dark:hover:bg-sky-900/50"
                onClick={() =>
                  onStartSurvey(
                    normalizeId(appointment.patientId || appointment.id), // Fallback to appointment.id if patientId is not available
                    appointment.nombre,
                    appointment.apellidos,
                    appointment.telefono
                  )
                }
              >
                <FileText className="mr-1.5 h-4 w-4" /> Encuesta
              </Button>
            )}
          </div>

          {isActionable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                  Acciones <ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                {currentAppointmentStatus !== "reagendada" && (
                  <DropdownMenuItem
                    className="text-slate-700 dark:text-slate-300 hover:!bg-yellow-100 dark:hover:!bg-yellow-700/50 focus:!bg-yellow-100 dark:focus:!bg-yellow-700/50"
                    onClick={() => onAction("reschedule", appointment.id, appointment)}
                  >
                    <CalendarClock className="mr-2 h-4 w-4 text-yellow-600 dark:text-yellow-400" /> Reagendar Cita
                  </DropdownMenuItem>
                )}
                {currentAppointmentStatus !== "cancelada" && (
                  <DropdownMenuItem
                    className="text-slate-700 dark:text-slate-300 hover:!bg-red-100 dark:hover:!bg-red-700/50 focus:!bg-red-100 dark:focus:!bg-red-700/50"
                    onClick={() => onAction("cancel", appointment.id, appointment)}
                  >
                    <CalendarX className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" /> Cancelar Cita
                  </DropdownMenuItem>
                )}
                {/* Show "No Asistió" only if not already "noAsistio", "completada", or "cancelada" */}
                {currentAppointmentStatus !== "noAsistio" && currentAppointmentStatus !== "completada" && currentAppointmentStatus !== "cancelada" && (
                  <DropdownMenuItem
                    className="text-slate-700 dark:text-slate-300 hover:!bg-slate-200 dark:hover:!bg-slate-700 focus:!bg-slate-200 dark:focus:!bg-slate-700"
                    onClick={() => onAction("noShow", appointment.id, appointment)} // "noShow" action triggers "noAsistio" state
                  >
                    <UserCog className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" /> Marcar No Asistió
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  )
})
AppointmentCard.displayName = "AppointmentCard"

// Appointment table component (desktop)
const AppointmentTable: FC<{
  appointments: Appointment[]
  isLoading: boolean
  showPastStatusOverride?: boolean // If true, past 'pendiente' appointments are shown as 'noAsistio'
  onAction: (action: ConfirmAction, id: string | number, appointment: Appointment) => void
  onStartSurvey: (patientId: string | number, patientName: string, patientLastName: string, patientPhone: string) => void
  onSort: (field: SortField) => void
  sortConfig: { field: SortField; direction: SortDirection }
}> = memo(({ appointments, isLoading, showPastStatusOverride = false, onAction, onStartSurvey, onSort, sortConfig }) => {
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-1/4" /> {/* Adjusted widths */}
            <Skeleton className="h-12 w-1/5" />
            <Skeleton className="h-12 w-1/6" />
            <Skeleton className="h-12 w-1/6" />
            <Skeleton className="h-12 w-1/5" />
            <Skeleton className="h-12 w-1/6" />
          </div>
        ))}
      </div>
    )
  }

  if (appointments.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
        className="p-12 text-center"
      >
        <div className="flex flex-col items-center justify-center">
          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
            <Calendar className="h-12 w-12 text-primary" />
          </div>
          <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No hay citas para mostrar</p>
          <p className="text-sm text-muted-foreground mt-1">Prueba a cambiar los filtros o añadir nuevas citas</p>
        </div>
      </motion.div>
    )
  }

  const renderSortableHeader = (label: string, field: SortField) => {
    const isActive = sortConfig.field === field
    return (
      <div className="flex items-center gap-1 cursor-pointer group" onClick={() => onSort(field)}>
        <span>{label}</span>
        <ArrowUpDown className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground/40 group-hover:text-muted-foreground"} transition-all`} />
        {isActive && <span className="ml-1 text-xs text-primary">({sortConfig.direction === "asc" ? "↑" : "↓"})</span>}
      </div>
    )
  }

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
      <table className="w-full table-auto divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <tr>
            <th className="p-3 pb-4 border-b border-slate-200 dark:border-slate-700">{renderSortableHeader("Paciente", "nombre")}</th>
            <th className="p-3 pb-4 border-b border-slate-200 dark:border-slate-700">{renderSortableHeader("Motivo", "motivo")}</th>
            <th className="p-3 pb-4 border-b border-slate-200 dark:border-slate-700">{renderSortableHeader("Fecha", "fecha")}</th>
            <th className="p-3 pb-4 border-b border-slate-200 dark:border-slate-700">{renderSortableHeader("Hora", "hora")}</th>
            <th className="p-3 pb-4 border-b border-slate-200 dark:border-slate-700"> {/* Estado no es sortable por ahora */} Estado </th>
            <th className="p-3 pb-4 border-b border-slate-200 dark:border-slate-700 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => {
            const appointmentDateObj = typeof appointment.fechaConsulta === 'string'
                                      ? new Date(appointment.fechaConsulta)
                                      : appointment.fechaConsulta;

            const isPastAndPending = showPastStatusOverride &&
                                     appointment.estado === "pendiente" &&
                                     isValidDate(appointmentDateObj) && // Check if date is valid before comparison
                                     isBefore(appointmentDateObj, startOfDay(new Date())) &&
                                     !dateIsToday(appointmentDateObj);

            const displayStatus = isPastAndPending ? "noAsistio" : appointment.estado;

            // Logic for actionability in table row
            const isActionableInTable = !["completada", "cancelada"].includes(displayStatus) &&
                                        !(displayStatus === "noAsistio" && isPastAndPending);


            return (
              <motion.tr
                key={normalizeId(appointment.id)}
                className="border-b hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <td className="p-3">
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-100">{appointment.nombre} {appointment.apellidos}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/70"></span>
                      {appointment.telefono}
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant="outline" className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
                    {appointment.motivoConsulta}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                    {safeFormatDate(appointment.fechaConsulta, "dd/MM/yyyy", { locale: es }, "Inválida")}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    {appointment.horaConsulta}
                  </div>
                </td>
                <td className="p-3">
                  <AppointmentStatusBadge status={displayStatus} />
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1 flex-wrap"> {/* Use flex-wrap for smaller screens */}
                    {/* Direct action buttons */}
                    {(displayStatus === "pendiente" || displayStatus === "programada") && (
                      <Button size="xs" variant="ghost" className="text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/50 px-2 py-1"
                        onClick={() => onAction("checkIn", appointment.id, appointment)}>
                        <CheckCircle className="mr-1 h-3.5 w-3.5" /> Presente
                      </Button>
                    )}
                    {displayStatus === "presente" && (
                      <Button size="xs" variant="ghost" className="text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/50 px-2 py-1"
                        onClick={() => onAction("complete", appointment.id, appointment)}>
                        <ClipboardCheck className="mr-1 h-3.5 w-3.5" /> Completar
                      </Button>
                    )}

                    {/* Survey button */}
                    {isActionableInTable && (
                       <Button size="xs" variant="ghost" className="text-sky-600 hover:bg-sky-100 dark:text-sky-400 dark:hover:bg-sky-900/50 px-2 py-1"
                        onClick={() => onStartSurvey( normalizeId(appointment.patientId || appointment.id), appointment.nombre, appointment.apellidos, appointment.telefono)}>
                        <FileText className="mr-1 h-3.5 w-3.5" /> Encuesta
                      </Button>
                    )}

                    {/* More actions dropdown */}
                    {isActionableInTable && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="xs" variant="outline" className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          {displayStatus !== "reagendada" && (
                            <DropdownMenuItem className="text-slate-700 dark:text-slate-300 hover:!bg-yellow-100 dark:hover:!bg-yellow-700/50 focus:!bg-yellow-100 dark:focus:!bg-yellow-700/50"
                              onClick={() => onAction("reschedule", appointment.id, appointment)}>
                              <CalendarClock className="mr-2 h-4 w-4 text-yellow-600 dark:text-yellow-400" /> Reagendar
                            </DropdownMenuItem>
                          )}
                          {displayStatus !== "cancelada" && (
                            <DropdownMenuItem className="text-slate-700 dark:text-slate-300 hover:!bg-red-100 dark:hover:!bg-red-700/50 focus:!bg-red-100 dark:focus:!bg-red-700/50"
                              onClick={() => onAction("cancel", appointment.id, appointment)}>
                              <CalendarX className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" /> Cancelar
                            </DropdownMenuItem>
                          )}
                          {displayStatus !== "noAsistio" && displayStatus !== "completada" && displayStatus !== "cancelada" && (
                            <DropdownMenuItem className="text-slate-700 dark:text-slate-300 hover:!bg-slate-200 dark:hover:!bg-slate-700 focus:!bg-slate-200 dark:focus:!bg-slate-700"
                              onClick={() => onAction("noShow", appointment.id, appointment)}>
                              <UserCog className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" /> No Asistió
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
})
AppointmentTable.displayName = "AppointmentTable"

// Advanced filters in separate component
const FilterControls: FC<{
  filters: FilterState
  onUpdateFilters: (newFilters: Partial<FilterState>) => void
  onClearFilters: () => void
  onRefresh: () => void
}> = memo(({ filters, onUpdateFilters, onClearFilters, onRefresh }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="relative flex-1 w-full sm:max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          type="search"
          placeholder="Buscar paciente..."
          className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9"
          value={filters.searchTerm}
          onChange={(e) => onUpdateFilters({ searchTerm: e.target.value })}
        />
      </div>
      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
        <Select value={filters.statusFilter} onValueChange={(value) => onUpdateFilters({ statusFilter: value })}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 border-slate-300 dark:border-slate-700 focus-visible:ring-primary">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="programada">Programada</SelectItem>
            <SelectItem value="presente">Presente</SelectItem>
            <SelectItem value="completada">Completada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
            <SelectItem value="noAsistio">No asistió</SelectItem>
            <SelectItem value="reagendada">Reagendada</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 h-9" onClick={onRefresh}>
          <RefreshCcw className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Actualizar</span>
          <span className="sm:hidden">Refrescar</span>
        </Button>
      </div>
    </div>
  )
})
FilterControls.displayName = "FilterControls"

// Main component optimized
export function PatientAdmission() {
  const [activeTab, setActiveTab] = useState<string>("today") // Start with 'today' tab
  const [filterState, setFilterState] = useState<FilterState>({
    searchTerm: "",
    statusFilter: "all",
    dateRange: { from: null, to: null },
    sortField: "fecha", // Default sort by date
    sortDirection: "asc",
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false, action: null, appointmentId: null, appointmentData: null,
  })
  const [surveyDialogState, setSurveyDialogState] = useState<SurveyDialogState>({
    isOpen: false, patientId: "", patientName: "", patientLastName: "", patientPhone: "", surveyId: "", surveyLink: "",
  })
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null)
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null)

  const isMobile = useIsMobile(768) // Check if this threshold is appropriate

  const {
    appointments, fetchAppointments: fetchAppointmentsFromContext, updateAppointment,
    updatePatient, addPatient, addAppointment,
  } = useAppContext()
  const router = useRouter()

  const fetchAppointments = useCallback(async (filters?: Record<string, string>) => {
    console.log("[PatientAdmission] Fetching appointments with filters:", filters);
    setIsLoading(true); // Set loading true at the start of fetch
    if (typeof fetchAppointmentsFromContext === 'function') {
      try {
        await fetchAppointmentsFromContext(filters);
        console.log("[PatientAdmission] Appointments fetched successfully.");
      } catch (error) {
        console.error('[PatientAdmission] Error fetching appointments from context:', error);
        toast.error('Error al cargar citas', { description: 'No se pudieron obtener los datos de las citas.' });
      } finally {
        // setIsLoading(false); // Moved to useEffect [appointments] for smoother UI
      }
    } else {
      console.error('[PatientAdmission] fetchAppointmentsFromContext is not a function.');
      toast.error('Error de configuración', { description: 'El servicio de citas no está disponible.' });
      setIsLoading(false); // Ensure loading is false if context function is missing
      return Promise.resolve(); // Return resolved promise to avoid unhandled rejections
    }
  }, [fetchAppointmentsFromContext])

  const [isInitialMount, setIsInitialMount] = useState(true)

  useEffect(() => {
    console.log("[PatientAdmission] Component mounted. Initial fetch triggered.");
    fetchAppointments().catch(err => {
      console.error("[PatientAdmission] Initial fetchAppointments call failed:", err);
      // Toast error is handled within fetchAppointments
    });
  }, [fetchAppointments]); // fetchAppointments is memoized, so this runs once on mount

  useEffect(() => {
    // This effect handles the loading state based on when appointments data is available
    // It provides a small delay to prevent UI flickering if data arrives very quickly
    if (isInitialMount) {
        if (appointments !== undefined) { // Data (even empty array) has been received
            console.log("[PatientAdmission] Appointments data received. Total:", appointments?.length);
            const timer = setTimeout(() => {
                setIsLoading(false);
                setIsInitialMount(false); // Mark initial mount as complete
                console.log("[PatientAdmission] Initial loading complete.");
            }, 300); // Small delay
            return () => clearTimeout(timer);
        }
    } else {
        // For subsequent updates, if appointments change, briefly set loading then false
        // This might be too aggressive if fetchAppointments already handles its own loading state.
        // Consider if this is needed or if setIsLoading(false) in fetchAppointments is sufficient.
        if (appointments !== undefined) {
            setIsLoading(false);
        }
    }
  }, [appointments, isInitialMount]);


  const dateUtils = useMemo(() => ({
    isToday: (date: Date): boolean => isValidDate(date) && dateIsToday(date),
    isPast: (date: Date): boolean => isValidDate(date) && isBefore(date, startOfDay(new Date())),
    isFuture: (date: Date): boolean => isValidDate(date) && isAfter(date, startOfDay(new Date())),
  }), [])

  const classifiedAppointments = useMemo(() => {
    if (!appointments || !Array.isArray(appointments)) {
      // console.log("[PatientAdmission] No appointments data to classify.");
      return { past: [], today: [], future: [] };
    }
    // console.log(`[PatientAdmission] Classifying ${appointments.length} appointments.`);

    const past: Appointment[] = []
    const today: Appointment[] = []
    const future: Appointment[] = []

    appointments.forEach((appointment: any) => { // Use 'any' if source data structure is uncertain
      try {
        // Normalize appointment data carefully, ensure all expected fields exist
        const normalizedAppointment: Appointment = {
          id: normalizeId(appointment.id),
          nombre: appointment.paciente?.split(' ')[0] || appointment.nombre || "Paciente",
          apellidos: appointment.paciente?.split(' ').slice(1).join(' ') || appointment.apellidos || "Desconocido",
          telefono: appointment.telefono || "N/A",
          fechaConsulta: appointment.fechaConsulta || appointment.fecha_hora_cita, // Handle different possible date fields
          horaConsulta: appointment.horaConsulta || (appointment.fecha_hora_cita ? format(new Date(appointment.fecha_hora_cita), 'HH:mm') : "00:00"),
          motivoConsulta: appointment.motivo_cita || appointment.motivoConsulta || "Consulta",
          // Ensure status mapping is robust if backend sends different values
          estado: (appointment.estado_cita || appointment.estado || "pendiente").toLowerCase() as AppointmentStatus,
          patientId: appointment.patientId || appointment.patient_id ? normalizeId(appointment.patientId || appointment.patient_id) : undefined
        };

        const appointmentDate = typeof normalizedAppointment.fechaConsulta === 'string'
          ? new Date(normalizedAppointment.fechaConsulta)
          : normalizedAppointment.fechaConsulta;

        if (!isValidDate(appointmentDate)) {
          // console.warn(`[PatientAdmission] Invalid date for appointment ID ${normalizedAppointment.id}:`, normalizedAppointment.fechaConsulta, ". Classifying as future.");
          future.push(normalizedAppointment); // Default to future if date is problematic
          return;
        }

        if (dateUtils.isToday(appointmentDate)) today.push(normalizedAppointment);
        else if (dateUtils.isPast(appointmentDate)) past.push(normalizedAppointment);
        else future.push(normalizedAppointment);

      } catch (error) {
        console.error("[PatientAdmission] Error classifying appointment:", error, appointment);
        // Potentially add to a separate "error" list or log for review
      }
    });

    // Sort appointments within each category
    const sortByDateAndTime = (a: Appointment, b: Appointment, direction: 'asc' | 'desc' = 'asc') => {
        const dateA = new Date(a.fechaConsulta);
        const dateB = new Date(b.fechaConsulta);
        let comparison = 0;
        if (isValidDate(dateA) && isValidDate(dateB)) {
            comparison = dateA.getTime() - dateB.getTime();
        }
        if (comparison === 0) { // If dates are same, sort by time
            comparison = (a.horaConsulta || "").localeCompare(b.horaConsulta || "");
        }
        return direction === 'asc' ? comparison : -comparison;
    };
    
    past.sort((a,b) => sortByDateAndTime(a,b, 'desc')); // Past appointments, newest first
    today.sort((a,b) => sortByDateAndTime(a,b, 'asc')); // Today's appointments, earliest first
    future.sort((a,b) => sortByDateAndTime(a,b, 'asc')); // Future appointments, earliest first

    // console.log("[PatientAdmission] Appointments classified:", { today: today.length, past: past.length, future: future.length });
    return { past, today, future };
  }, [appointments, dateUtils])

  const getFilteredAppointments = useCallback((appointmentsToFilter: Appointment[]): Appointment[] => {
    if (!appointmentsToFilter || !Array.isArray(appointmentsToFilter)) return []

    const { searchTerm, statusFilter, sortField, sortDirection } = filterState
    const searchTermLower = searchTerm.toLowerCase()

    const filtered = appointmentsToFilter.filter((appointment) => {
      try {
        const fullName = `${appointment.nombre || ""} ${appointment.apellidos || ""}`.toLowerCase();
        const matchesSearch = searchTerm === "" ||
          fullName.includes(searchTermLower) ||
          (appointment.motivoConsulta && appointment.motivoConsulta.toLowerCase().includes(searchTermLower)) ||
          (appointment.telefono && appointment.telefono.includes(searchTerm));
        
        const currentStatus = appointment.estado; // Already normalized in classifiedAppointments
        const matchesStatus = statusFilter === "all" || currentStatus === statusFilter;
        
        return matchesSearch && matchesStatus;
      } catch (error) {
        console.error("[PatientAdmission] Error filtering appointment:", error, appointment);
        return false;
      }
    });

    if (sortField) {
      filtered.sort((a, b) => {
        let comparison = 0;
        try {
          switch (sortField) {
            case "nombre":
              comparison = `${a.nombre || ""} ${a.apellidos || ""}`.localeCompare(`${b.nombre || ""} ${b.apellidos || ""}`);
              break;
            case "fecha": {
              const dateA = new Date(a.fechaConsulta);
              const dateB = new Date(b.fechaConsulta);
              comparison = (isValidDate(dateA) && isValidDate(dateB)) ? dateA.getTime() - dateB.getTime() : 0;
              break;
            }
            case "hora":
              comparison = (a.horaConsulta || "").localeCompare(b.horaConsulta || "");
              break;
            case "motivo":
              comparison = (a.motivoConsulta || "").localeCompare(b.motivoConsulta || "");
              break;
            // case "estado": // Sorting by status string might not be ideal without a defined order
            //   comparison = (a.estado || "").localeCompare(b.estado || "");
            //   break;
          }
        } catch (error) {
            console.error("[PatientAdmission] Error sorting appointments:", error, "Field:", sortField);
            comparison = 0;
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }
    return filtered;
  }, [filterState]);

  const filteredAppointments = useMemo(() => ({
    past: getFilteredAppointments(classifiedAppointments.past),
    today: getFilteredAppointments(classifiedAppointments.today),
    future: getFilteredAppointments(classifiedAppointments.future),
  }), [getFilteredAppointments, classifiedAppointments]);

  const handleUpdateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilterState((prev) => ({ ...prev, ...newFilters }));
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilterState({
      searchTerm: "", statusFilter: "all", dateRange: { from: null, to: null },
      sortField: "fecha", sortDirection: "asc", // Reset to default sort
    });
  }, [])

  const handleRefresh = useCallback(() => {
    console.log("[PatientAdmission] Manual refresh triggered.");
    toast.promise(fetchAppointments(), {
        loading: 'Actualizando datos...',
        success: 'Datos actualizados correctamente.',
        error: 'Error al actualizar los datos.',
    });
  }, [fetchAppointments]);

  const handleSort = useCallback((field: SortField) => {
    setFilterState((prev) => ({
      ...prev,
      sortField: field,
      sortDirection: prev.sortField === field && prev.sortDirection === "asc" ? "desc" : "asc",
    }));
  }, [])

  // --- Action Handlers ---
  const handleActionWithLoading = async (
    actionPromise: Promise<any>,
    successMessage: string,
    successDescription?: string,
    successIcon?: React.ReactNode,
    errorMessage: string = "Error al procesar la acción"
  ) => {
    setIsLoading(true);
    try {
        await actionPromise;
        toast.success(successMessage, { description: successDescription, icon: successIcon });
        await fetchAppointments(); // Refresh data after action
    } catch (error) {
        console.error(`[PatientAdmission] Error during action (${successMessage}):`, error);
        toast.error(errorMessage, { description: (error as Error)?.message || "Detalles no disponibles" });
    } finally {
        setConfirmDialog({ isOpen: false, action: null, appointmentId: null, appointmentData: null });
        // setIsLoading(false); // Loading state will be managed by fetchAppointments and its useEffect
    }
  };


  const handleCheckIn = useCallback((id: string | number, appointment: Appointment) => {
    const appointmentIdStr = normalizeId(id);
    console.log("[PatientAdmission] Checking in appointment:", appointmentIdStr);

    const actionPromise = updateAppointment(appointmentIdStr, { estado: "presente" as ModelAppointmentStatus })
      .then(() => {
        if (appointment.patientId) {
          return updatePatient(normalizeId(appointment.patientId), {
            estado: "Pendiente de consulta", // Ensure this matches PatientStatus type
            ultimoContacto: new Date().toISOString().split("T")[0],
          });
        } else {
          // This case (check-in for appointment without patientId) might need specific handling
          // or creation of a new patient record if that's the intended flow.
          console.warn("[PatientAdmission] Check-in for appointment without existing patientId. Patient record not updated/created here.");
          // Potentially, create a patient here if one doesn't exist.
          // For now, we assume the appointment is linked to an existing patient or patient creation is handled elsewhere for check-ins.
          return Promise.resolve();
        }
      });

    handleActionWithLoading(
        actionPromise,
        `${appointment.nombre} registrado como presente`,
        "El paciente ha sido movido a la lista de consulta.",
        <CheckCircle className="h-4 w-4 text-primary" />,
        "Error al registrar llegada del paciente"
    );
  }, [updateAppointment, updatePatient, fetchAppointments]);


  const handleCancel = useCallback((id: string | number, appointment: Appointment) => {
    const appointmentIdStr = normalizeId(id);
    console.log("[PatientAdmission] Cancelling appointment:", appointmentIdStr);
    const actionPromise = updateAppointment(appointmentIdStr, { estado: "cancelada" as ModelAppointmentStatus });
    
    handleActionWithLoading(
        actionPromise,
        `Cita cancelada: ${appointment.nombre}`,
        `${safeFormatDate(appointment.fechaConsulta, "dd/MM/yyyy")} - ${appointment.horaConsulta}`,
        <XCircle className="h-4 w-4 text-rose-500" />,
        "Error al cancelar la cita"
    );
  }, [updateAppointment, fetchAppointments]);


  const handleNoShow = useCallback((id: string | number, appointment: Appointment) => {
    const appointmentIdStr = normalizeId(id);
    console.log("[PatientAdmission] Marking no-show for appointment:", appointmentIdStr);

    const actionPromise = updateAppointment(appointmentIdStr, { estado: "noAsistio" as ModelAppointmentStatus })
      .then(() => {
        if (appointment.patientId) {
          return updatePatient(normalizeId(appointment.patientId), {
            estado: "No Asistió", // Ensure this matches PatientStatus type
            ultimoContacto: new Date().toISOString().split("T")[0],
          });
        }
        return Promise.resolve();
      });
      
    handleActionWithLoading(
        actionPromise,
        `Paciente no asistió: ${appointment.nombre}`,
        `${safeFormatDate(appointment.fechaConsulta, "dd/MM/yyyy")} - ${appointment.horaConsulta}`,
        <AlertCircle className="h-4 w-4 text-amber-500" />,
        "Error al registrar no asistencia"
    );
  }, [updateAppointment, updatePatient, fetchAppointments]);


  const handleReschedule = useCallback((id: string | number, currentAppointment: Appointment, newDate: Date, newTime: string) => {
    if (!isValidDate(newDate) || !newTime) {
      toast.error("Fecha u hora inválida para reagendar.");
      return;
    }

    const appointmentIdStr = normalizeId(id);
    console.log(`[PatientAdmission] Rescheduling appointment ${appointmentIdStr} to ${safeFormatDate(newDate, "yyyy-MM-dd")} ${newTime}`);

    // Combine newDate (Date object) and newTime (string "HH:mm") into a full DateTime object
    const [hoursStr, minutesStr] = newTime.split(':');
    const combinedDateTime = new Date(newDate);
    combinedDateTime.setHours(parseInt(hoursStr, 10));
    combinedDateTime.setMinutes(parseInt(minutesStr, 10));
    combinedDateTime.setSeconds(0);
    combinedDateTime.setMilliseconds(0);

    if (!isValidDate(combinedDateTime)) {
        toast.error("La fecha y hora combinadas son inválidas.");
        return;
    }
    
    const originalDateFormatted = safeFormatDate(currentAppointment.fechaConsulta, "dd/MM/yyyy");

    // 1. Mark the current appointment as "reagendada"
    const actionPromise = updateAppointment(appointmentIdStr, { estado: "reagendada" as ModelAppointmentStatus })
      .then(() => {
        // 2. Create a new appointment with the new date/time and copied details
        // Ensure your addAppointment function and backend can handle these fields.
        // The structure of data for addAppointment might differ from updateAppointment.
        const newAppointmentData = {
          // Fields from original appointment
          patient_id: normalizeId(currentAppointment.patientId || ""), // Critical: ensure patient_id is correct
          nombre: currentAppointment.nombre, // Assuming these are needed for new appointment creation
          apellidos: currentAppointment.apellidos,
          telefono: currentAppointment.telefono,
          motivoConsulta: currentAppointment.motivoConsulta,
          // ... any other relevant fields from 'currentAppointment' that should carry over

          // New/updated fields
          fechaConsulta: safeFormatDate(combinedDateTime, "yyyy-MM-dd"), // Or however your API expects date
          horaConsulta: newTime,
          // If your API takes a single datetime field:
          // fecha_hora_cita: combinedDateTime.toISOString(), // Recommended for APIs
          estado: "programada" as ModelAppointmentStatus, // New appointment is 'programada'
        };
        // @ts-ignore - If addAppointment has a different signature, adjust this call
        return addAppointment(newAppointmentData);
      });

    handleActionWithLoading(
        actionPromise,
        `Cita reagendada: ${currentAppointment.nombre}`,
        `De: ${originalDateFormatted} ${currentAppointment.horaConsulta} a: ${safeFormatDate(newDate, "dd/MM/yyyy")} ${newTime}`,
        <CalendarIcon className="h-4 w-4 text-primary" />,
        "Error al reagendar la cita"
    ).then(() => {
        setActiveTab("future"); // Switch to future tab after successful reschedule
        setRescheduleDate(null);
        setRescheduleTime(null);
    });
  }, [updateAppointment, addAppointment, fetchAppointments]);


  const handleComplete = useCallback((id: string | number, appointment: Appointment) => {
    const appointmentIdStr = normalizeId(id);
    console.log("[PatientAdmission] Completing appointment:", appointmentIdStr);

    const actionPromise = updateAppointment(appointmentIdStr, { estado: "completada" as ModelAppointmentStatus })
      .then(() => {
        if (appointment.patientId) {
          return updatePatient(normalizeId(appointment.patientId), {
            estado: "Seguimiento", // Ensure this matches PatientStatus type
            // fechaConsulta: safeFormatDate(appointment.fechaConsulta, "yyyy-MM-dd"), // Update patient's last consultation date
            ultimoContacto: new Date().toISOString().split("T")[0],
          });
        }
        return Promise.resolve();
      });

    handleActionWithLoading(
        actionPromise,
        `Consulta completada: ${appointment.nombre}`,
        "El paciente ha pasado a estado de seguimiento.",
        <ClipboardCheck className="h-4 w-4 text-sky-500" />,
        "Error al completar la consulta"
    );
  }, [updateAppointment, updatePatient, fetchAppointments]);

  // --- Dialog Handlers ---
  const handleStartSurvey = useCallback((patientId: string | number, patientName: string, patientLastName: string, patientPhone: string) => {
    const surveyId = generateSurveyId()
    // Ensure window.location.origin is safe and available (usually is in browser)
    const surveyLink = `${window.location.origin}/survey/${surveyId}?patientId=${normalizeId(patientId)}`
    setSurveyDialogState({
      isOpen: true, patientId: normalizeId(patientId), patientName, patientLastName, patientPhone, surveyId, surveyLink,
    })
  }, [])

  const handleStartInternalSurvey = useCallback(() => {
    setSurveyDialogState((prev) => ({ ...prev, isOpen: false }))
    toast.info(`Iniciando encuesta para ${surveyDialogState.patientName}`, { description: "Preparando formulario..." })
    router.push(`/survey/${surveyDialogState.surveyId}?patientId=${surveyDialogState.patientId}&mode=internal`)
  }, [router, surveyDialogState])

  const handleCloseSurveyDialog = useCallback(() => {
    setSurveyDialogState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  const handleNewPatientSuccess = useCallback(async (newPatient?: any, newAppointment?: any) => {
    console.log("[PatientAdmission] New patient/appointment registered. Patient:", newPatient?.id, "Appointment:", newAppointment?.id);
    toast.success("Paciente añadido correctamente", { description: "El paciente ha sido agendado para una cita futura." });
    await fetchAppointments(); // Refresh data
    setActiveTab("future"); // Navigate to future tab
  }, [fetchAppointments])

  const openConfirmDialog = useCallback((action: ConfirmAction, id: string | number, appointment: Appointment) => {
    console.log(`[PatientAdmission] Opening confirm dialog for action: ${action}, ID: ${id}`);
    if (action === "reschedule") {
      try {
        const appointmentDate = typeof appointment.fechaConsulta === 'string' ? new Date(appointment.fechaConsulta) : appointment.fechaConsulta;
        let defaultDate = addDays(new Date(), 7); // Default to 7 days from now
        if (isValidDate(appointmentDate)) {
            defaultDate = isBefore(appointmentDate, startOfDay(new Date())) 
                          ? addDays(new Date(), 1) // If past, suggest tomorrow
                          : addDays(appointmentDate, 1); // If today or future, suggest next day
            // Ensure defaultDate is not in the past
            if (isBefore(defaultDate, startOfDay(new Date()))) {
                defaultDate = addDays(startOfDay(new Date()), 1);
            }
        }
        setRescheduleDate(defaultDate);
        setRescheduleTime(appointment.horaConsulta || "10:00"); // Fallback time
      } catch (error) {
        console.error("[PatientAdmission] Error setting default reschedule date/time:", error);
        setRescheduleDate(addDays(new Date(), 7));
        setRescheduleTime("10:00");
      }
    }
    setConfirmDialog({ isOpen: true, action, appointmentId: id, appointmentData: appointment });
  }, [])

  const handleConfirmAction = useCallback(() => {
    if (!confirmDialog.action || confirmDialog.appointmentId === null || !confirmDialog.appointmentData) {
      console.warn("[PatientAdmission] Confirm action attempted with incomplete data:", confirmDialog);
      toast.error("No se puede procesar la acción, faltan datos.");
      return;
    }
    // console.log("[PatientAdmission] Executing confirmed action:", confirmDialog.action);
    switch (confirmDialog.action) {
      case "checkIn": handleCheckIn(confirmDialog.appointmentId, confirmDialog.appointmentData); break;
      case "cancel": handleCancel(confirmDialog.appointmentId, confirmDialog.appointmentData); break;
      case "complete": handleComplete(confirmDialog.appointmentId, confirmDialog.appointmentData); break;
      case "noShow": handleNoShow(confirmDialog.appointmentId, confirmDialog.appointmentData); break;
      case "reschedule":
        if (rescheduleDate && rescheduleTime) {
          handleReschedule(confirmDialog.appointmentId, confirmDialog.appointmentData, rescheduleDate, rescheduleTime);
        } else {
          toast.error("Por favor selecciona una fecha y hora válidas para reagendar.");
        }
        break;
      default:
        console.warn("[PatientAdmission] Unknown action in confirm dialog:", confirmDialog.action);
        toast.error("Acción desconocida.");
    }
    // Dialog close is handled by handleActionWithLoading or if reschedule fails
  }, [confirmDialog, handleCheckIn, handleCancel, handleComplete, handleNoShow, handleReschedule, rescheduleDate, rescheduleTime])

  const renderAppointmentsContent = useCallback((appointmentsToRender: Appointment[], showPastOverride = false) => {
    if (isLoading && isInitialMount) { // Show skeleton only during initial full load
        return (
            <div className="space-y-4 p-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-1/4" />
                        <Skeleton className="h-12 w-1/5" />
                        <Skeleton className="h-12 w-1/6" />
                        <Skeleton className="h-12 w-1/6" />
                        <Skeleton className="h-12 w-1/5" />
                        <Skeleton className="h-12 w-1/6" />
                    </div>
                ))}
            </div>
        );
    }
    if (appointmentsToRender.length === 0 && !isLoading) { // Show no appointments message if not loading
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="p-12 text-center">
                <div className="flex flex-col items-center justify-center">
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
                        <Calendar className="h-12 w-12 text-primary" />
                    </div>
                    <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No hay citas para mostrar</p>
                    <p className="text-sm text-muted-foreground mt-1">Prueba a cambiar los filtros o añadir nuevas citas.</p>
                </div>
            </motion.div>
        );
    }

    if (isMobile) {
      return (
        <AnimatePresence>
          {appointmentsToRender.map((appointment) => (
            <AppointmentCard
              key={normalizeId(appointment.id)}
              appointment={appointment}
              onAction={openConfirmDialog}
              onStartSurvey={handleStartSurvey}
              showNoShowOverride={showPastOverride && appointment.estado === 'pendiente' && dateUtils.isPast(typeof appointment.fechaConsulta === 'string' ? new Date(appointment.fechaConsulta) : appointment.fechaConsulta)}
            />
          ))}
        </AnimatePresence>
      )
    }
    return (
      <AppointmentTable
        appointments={appointmentsToRender}
        isLoading={isLoading && !isInitialMount} // Show table's internal skeleton for subsequent loads
        showPastStatusOverride={showPastOverride}
        onAction={openConfirmDialog}
        onStartSurvey={handleStartSurvey}
        onSort={handleSort}
        sortConfig={{ field: filterState.sortField, direction: filterState.sortDirection }}
      />
    )
  }, [isLoading, isInitialMount, openConfirmDialog, handleStartSurvey, handleSort, filterState.sortField, filterState.sortDirection, isMobile, dateUtils])

  const getActionButtonColor = useCallback((action: ConfirmAction | null): string => {
    switch (action) {
      case "checkIn": return "bg-primary hover:bg-primary/90 text-primary-foreground";
      case "cancel": return "bg-rose-600 hover:bg-rose-700 text-white";
      case "complete": return "bg-sky-600 hover:bg-sky-700 text-white";
      case "noShow": return "bg-amber-600 hover:bg-amber-700 text-white";
      case "reschedule": return "bg-primary hover:bg-primary/90 text-primary-foreground";
      default: return "bg-slate-600 hover:bg-slate-700 text-white"; // Fallback
    }
  }, []);

  const getActionIcon = useCallback((action: ConfirmAction | null) => {
    switch (action) {
      case "checkIn": return <CheckCircle className="h-5 w-5 text-primary" />;
      case "cancel": return <CalendarX className="h-5 w-5 text-rose-500" />;
      case "complete": return <ClipboardCheck className="h-5 w-5 text-sky-500" />;
      case "noShow": return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case "reschedule": return <CalendarClock className="h-5 w-5 text-primary" />;
      default: return <InfoIcon className="h-5 w-5 text-slate-500" />; // Fallback
    }
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 gap-6">
        {/* This structure means PendingPatientsList and NewPatientOnlyForm are outside the main Tabs component.
            If they should be part of a "Nuevo Paciente" tab within the main Tabs, this structure needs adjustment.
        */}
        {activeTab === "newPatient" && ( // Changed from "pending" to "newPatient" for clarity
          <Card className="w-full overflow-hidden shadow-md border-slate-200 dark:border-slate-800">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 pb-4">
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <UserPlus className="h-5 w-5 text-primary" />
                <span>Registrar Nuevo Paciente y Cita</span>
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Añade un nuevo paciente y programa su primera cita.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              {/* Using NewPatientOnlyForm which seems to handle both patient and appointment */}
              <NewPatientOnlyForm onPatientAdded={handleNewPatientSuccess} />
            </CardContent>
          </Card>
        )}
         {activeTab === "pendingList" && ( // For listing patients without appointments
          <Card className="w-full overflow-hidden shadow-md border-slate-200 dark:border-slate-800">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 pb-4">
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Users className="h-5 w-5 text-primary" />
                <span>Pacientes Pendientes de Cita</span>
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Pacientes registrados que aún no tienen una cita programada.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <PendingPatientsList />
            </CardContent>
          </Card>
        )}


        <Card className="w-full overflow-hidden shadow-md hover:shadow-lg transition-all border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-6">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Users className="h-5 w-5 text-primary" />
                <span>Gestión de Citas</span>
                {isLoading && !isInitialMount && ( // Show spinner for subsequent loads
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent text-primary ml-2"></span>
                )}
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Control de admisión y seguimiento de pacientes.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" className="bg-white dark:bg-slate-900 border-primary text-primary hover:bg-primary/5"
              onClick={() => setActiveTab("newPatient")}> {/* Changed to "newPatient" */}
              <UserPlus className="h-4 w-4 mr-1.5" /> Nuevo Paciente
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 pt-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                  <TabsList className="grid grid-cols-2 sm:grid-cols-5 gap-1"> {/* Adjusted for more tabs */}
                    <TabsTrigger value="newPatient" className={cn("data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/50 transition-all", isInitialMount && activeTab !== "newPatient" ? "opacity-0" : "opacity-100")}>
                      <div className="flex items-center gap-1.5"><UserPlus className="h-4 w-4" /><span>Nuevo</span></div>
                    </TabsTrigger>
                     <TabsTrigger value="pendingList" className={cn("data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/50 transition-all", isInitialMount && activeTab !== "pendingList" ? "opacity-0" : "opacity-100")}>
                      <div className="flex items-center gap-1.5"><Users className="h-4 w-4" /><span>Pendientes</span></div>
                    </TabsTrigger>
                    <TabsTrigger value="today" className={cn("data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/50 transition-all", isInitialMount && activeTab !== "today" ? "opacity-0" : "opacity-100")}>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" /><span>Hoy</span>
                        {classifiedAppointments.today.length > 0 && !isLoading && <Badge variant="outline" className="ml-1 bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 px-1.5 py-0.5 text-xs">{classifiedAppointments.today.length}</Badge>}
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="future" className={cn("data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/50 transition-all", isInitialMount && activeTab !== "future" ? "opacity-0" : "opacity-100")}>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" /><span>Futuras</span>
                        {classifiedAppointments.future.length > 0 && !isLoading && <Badge variant="outline" className="ml-1 bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 px-1.5 py-0.5 text-xs">{classifiedAppointments.future.length}</Badge>}
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="past" className={cn("data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/50 transition-all", isInitialMount && activeTab !== "past" ? "opacity-0" : "opacity-100")}>
                      <div className="flex items-center gap-1.5">
                        <ClipboardCheck className="h-4 w-4" /><span>Historial</span>
                        {classifiedAppointments.past.length > 0 && !isLoading && <Badge variant="outline" className="ml-1 bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 px-1.5 py-0.5 text-xs">{classifiedAppointments.past.length}</Badge>}
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </div>
                {/* Filters are shown for appointment list tabs */}
                {["today", "future", "past"].includes(activeTab) && (
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                        <Filter className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Buscar y Filtrar Citas</span>
                        </div>
                        <FilterControls filters={filterState} onUpdateFilters={handleUpdateFilters} onClearFilters={handleClearFilters} onRefresh={handleRefresh} />
                    </div>
                )}
              </div>

              <div className="p-6 pt-0">
                <TabsContent value="today" className="m-0 py-2">{renderAppointmentsContent(filteredAppointments.today)}</TabsContent>
                <TabsContent value="future" className="m-0 py-2">{renderAppointmentsContent(filteredAppointments.future)}</TabsContent>
                <TabsContent value="past" className={cn("mt-0 transition-all", isInitialMount && activeTab !== "past" ? "opacity-0" : "opacity-100")}>{renderAppointmentsContent(filteredAppointments.past, true)}</TabsContent>
                
                {/* Content for newPatient and pendingList tabs are handled by the separate Cards above */}
                <TabsContent value="newPatient" className={cn("mt-0 transition-all", isInitialMount && activeTab !== "newPatient" ? "opacity-0" : "opacity-100")}>
                    {/* This content is now shown in a separate Card when activeTab is "newPatient" */}
                    {/* You can add a placeholder here if needed, or ensure the Card above is the primary content */}
                </TabsContent>
                 <TabsContent value="pendingList" className={cn("mt-0 transition-all", isInitialMount && activeTab !== "pendingList" ? "opacity-0" : "opacity-100")}>
                    {/* This content is now shown in a separate Card when activeTab is "pendingList" */}
                </TabsContent>

              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <SurveyShareDialog
        isOpen={surveyDialogState.isOpen}
        patient={{
          id: surveyDialogState.patientId, nombre: surveyDialogState.patientName,
          apellidos: surveyDialogState.patientLastName, telefono: surveyDialogState.patientPhone,
        }}
        surveyLink={surveyDialogState.surveyLink}
        onStartInternal={handleStartInternalSurvey}
        onClose={handleCloseSurveyDialog}
      />

      <AlertDialog open={confirmDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          setConfirmDialog({ isOpen: false, action: null, appointmentId: null, appointmentData: null });
          setRescheduleDate(null);
          setRescheduleTime(null);
        }
      }}>
        <AlertDialogContent className="sm:max-w-[450px] border-slate-200 dark:border-slate-800 shadow-lg">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-2">
              {getActionIcon(confirmDialog.action)}
              <AlertDialogTitle className={`
                ${confirmDialog.action === "checkIn" ? "text-primary" : ""}
                ${confirmDialog.action === "cancel" ? "text-rose-700 dark:text-rose-400" : ""}
                ${confirmDialog.action === "complete" ? "text-sky-700 dark:text-sky-400" : ""}
                ${confirmDialog.action === "noShow" ? "text-amber-700 dark:text-amber-400" : ""}
                ${confirmDialog.action === "reschedule" ? "text-primary" : ""}
              `}>
                {confirmDialog.action === "checkIn" && "¿Registrar llegada del paciente?"}
                {confirmDialog.action === "cancel" && "¿Cancelar esta cita?"}
                {confirmDialog.action === "complete" && "¿Marcar consulta como completada?"}
                {confirmDialog.action === "noShow" && "¿Marcar como no asistió?"}
                {confirmDialog.action === "reschedule" && "Reagendar cita"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div>
                {confirmDialog.appointmentData && (
                  <div className="text-sm mt-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
                    <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-primary/70"></span>
                      {confirmDialog.appointmentData.nombre} {confirmDialog.appointmentData.apellidos}
                    </div>
                    <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 flex flex-col gap-2">
                      <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-primary" /><span>{safeFormatDate(confirmDialog.appointmentData.fechaConsulta, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }, "Fecha inválida")}</span></div>
                      <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><span>{confirmDialog.appointmentData.horaConsulta}</span></div>
                      <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><span>{confirmDialog.appointmentData.motivoConsulta}</span></div>
                    </div>
                  </div>
                )}
                {confirmDialog.action !== "reschedule" ? (
                  <div className="mt-4 text-slate-600 dark:text-slate-300 p-3 bg-primary/5 rounded-md border border-primary/10">
                    {confirmDialog.action === "checkIn" && <div className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /><span>El paciente aparecerá en el dashboard como pendiente de consulta.</span></div>}
                    {confirmDialog.action === "cancel" && <div className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" /><span>Esta acción no se puede deshacer.</span></div>}
                    {confirmDialog.action === "complete" && <div className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-sky-500 mt-0.5 flex-shrink-0" /><span>El paciente pasará a estado de seguimiento.</span></div>}
                    {confirmDialog.action === "noShow" && <div className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" /><span>Se marcará que el paciente no asistió a la cita.</span></div>}
                  </div>
                ) : (
                  <div className="mt-4"><RescheduleDatePicker date={rescheduleDate} time={rescheduleTime} onDateChange={setRescheduleDate} onTimeChange={setRescheduleTime} /></div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogCancel className="border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} disabled={confirmDialog.action === "reschedule" && (!rescheduleDate || !rescheduleTime)}
              className={cn("transition-all duration-200", getActionButtonColor(confirmDialog.action), confirmDialog.action === "reschedule" && (!rescheduleDate || !rescheduleTime) && "opacity-50 cursor-not-allowed")}>
              {confirmDialog.action === "checkIn" && "Registrar"}
              {confirmDialog.action === "cancel" && "Confirmar Cancelación"}
              {confirmDialog.action === "complete" && "Completar Consulta"}
              {confirmDialog.action === "noShow" && "Confirmar No Asistencia"}
              {confirmDialog.action === "reschedule" && "Confirmar Reagendamiento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
