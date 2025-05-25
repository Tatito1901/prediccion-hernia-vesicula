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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NewPatientForm } from "./new-patient-form"
import { toast } from "sonner"
import { useAppContext } from "@/lib/context/app-context"
import { Badge } from "@/components/ui/badge"
import { SurveyShareDialog } from "@/components/surveys/survey-share-dialog"
import { generateSurveyId } from "@/lib/form-utils"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, isToday as dateIsToday, isBefore, isAfter, startOfDay, addDays } from "date-fns"
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import type { DiagnosisType } from "@/app/dashboard/data-model"
import { useIsMobile } from "@/hooks/use-mobile"

// Types for the component
export type AppointmentStatus = "pendiente" | "presente" | "completada" | "cancelada" | "reagendada" | "noAsistio"
export type PatientStatus =
  | "Pendiente de consulta"
  | "Operado"
  | "No Operado"
  | "Seguimiento"
  | "Cancelado"
  | "No Asistió"
export type ConfirmAction = "checkIn" | "cancel" | "complete" | "noShow" | "reschedule" | null
export type SortField = "nombre" | "fecha" | "hora" | "motivo" | null
export type SortDirection = "asc" | "desc"

export interface Appointment {
  id: number
  nombre: string
  apellidos: string
  telefono: string
  fechaConsulta: string | Date
  horaConsulta: string
  motivoConsulta: string
  estado: AppointmentStatus
  patientId?: number
}

export interface Patient {
  id: number
  nombre: string
  apellidos: string
  edad?: number
  telefono?: string
  fechaConsulta?: string
  fechaRegistro: string
  diagnostico?: DiagnosisType
  estado?: PatientStatus
  probabilidadCirugia?: number
  ultimoContacto?: string
  encuesta?: boolean
}

export interface SurveyDialogState {
  isOpen: boolean
  patientId: number
  patientName: string
  patientLastName: string
  patientPhone: string
  surveyId: string
  surveyLink: string
}

export interface ConfirmDialogState {
  isOpen: boolean
  action: ConfirmAction
  appointmentId: number | null
  appointmentData?: Appointment | null
}

export interface StatusColors {
  [key: string]: string
}

export interface FilterState {
  searchTerm: string
  statusFilter: string
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
  // Generate time slots for the select component
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = 8; hour <= 17; hour++) {
      if (hour !== 14) {
        // Skip 14:00 (lunch break)
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
              {date ? format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : "Seleccionar fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={date || undefined}
              onSelect={onDateChange}
              initialFocus
              disabled={(day) => isBefore(day, startOfDay(new Date()))}
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
              {format(date, "EEEE, d 'de' MMMM", { locale: es })}
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
  const getStatusColorClass = useCallback((appointmentStatus: string): string => {
    const statusColors: StatusColors = {
      presente:
        "bg-teal-100 text-teal-800 dark:bg-teal-800/20 dark:text-teal-400 border-teal-200 dark:border-teal-800/30",
      cancelada:
        "bg-rose-100 text-rose-800 dark:bg-rose-800/20 dark:text-rose-400 border-rose-200 dark:border-rose-800/30",
      completada: "bg-sky-100 text-sky-800 dark:bg-sky-800/20 dark:text-sky-400 border-sky-200 dark:border-sky-800/30",
      pendiente:
        "bg-slate-100 text-slate-800 dark:bg-slate-800/20 dark:text-slate-400 border-slate-200 dark:border-slate-800/30",
      noShow:
        "bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-400 border-amber-200 dark:border-amber-800/30",
      noAsistio:
        "bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-400 border-amber-200 dark:border-amber-800/30",
      reagendada:
        "bg-violet-100 text-violet-800 dark:bg-violet-800/20 dark:text-violet-400 border-violet-200 dark:border-violet-800/30",
    }

    return statusColors[appointmentStatus] || ""
  }, [])

  const getStatusLabel = useCallback((appointmentStatus: string): string => {
    const statusLabels: Record<string, string> = {
      presente: "Presente",
      cancelada: "Cancelada",
      completada: "Completada",
      pendiente: "Pendiente",
      noShow: "No asistió",
      noAsistio: "No asistió",
      reagendada: "Reagendada",
    }

    return statusLabels[appointmentStatus] || appointmentStatus
  }, [])

  const getStatusIcon = useCallback((appointmentStatus: string) => {
    switch (appointmentStatus) {
      case "presente":
        return <CheckCircle className="h-3 w-3 mr-1" />
      case "cancelada":
        return <XCircle className="h-3 w-3 mr-1" />
      case "completada":
        return <ClipboardCheck className="h-3 w-3 mr-1" />
      case "pendiente":
        return <Clock className="h-3 w-3 mr-1" />
      case "noShow":
      case "noAsistio":
        return <AlertCircle className="h-3 w-3 mr-1" />
      case "reagendada":
        return <Calendar className="h-3 w-3 mr-1" />
      default:
        return null
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
  isPast?: boolean
  onAction: (action: ConfirmAction, id: number, appointment: Appointment) => void
  onStartSurvey: (appointment: Appointment) => void
}> = memo(({ appointment, isPast = false, onAction, onStartSurvey }) => {
  // Functions to format date
  const formatDate = useCallback((date: string | Date): string => {
    if (!date) return ""
    const dateObj = typeof date === "string" ? new Date(date) : date
    return format(dateObj, "EEEE, d 'de' MMMM", { locale: es })
  }, [])

  const showNoShow = isPast && appointment.estado === "pendiente"

  // Function to get border color based on status
  const getBorderColor = useCallback((status: AppointmentStatus, showNoShow: boolean): string => {
    if (showNoShow) return "border-amber-500"

    switch (status) {
      case "presente":
        return "border-teal-500"
      case "cancelada":
        return "border-rose-500"
      case "completada":
        return "border-sky-500"
      case "reagendada":
        return "border-violet-500"
      default:
        return "border-slate-300 dark:border-slate-700"
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={`overflow-hidden mb-4 border-l-4 hover:shadow-md transition-all duration-300 ${getBorderColor(showNoShow ? ("noAsistio" as AppointmentStatus) : appointment.estado, showNoShow)}`}
      >
        <CardHeader className="p-4 pb-2 bg-gradient-to-r from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-medium line-clamp-1">
                {appointment.nombre} {appointment.apellidos}
              </CardTitle>
              <CardDescription className="text-xs flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-primary/70"></span>
                {appointment.telefono}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <AppointmentStatusBadge status={showNoShow ? ("noShow" as AppointmentStatus) : appointment.estado} />
              <span className="text-xs text-muted-foreground flex items-center">
                <Clock className="h-3 w-3 mr-1 text-primary" />
                {appointment.horaConsulta}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-3 space-y-2">
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="truncate">{formatDate(appointment.fechaConsulta)}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="truncate">{appointment.motivoConsulta}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex flex-wrap justify-end gap-2">
          {appointment.estado === "pendiente" && !isPast && (
            <>
              <Button
                size="sm"
                className="transition-all hover:scale-105 bg-primary hover:bg-primary/90"
                onClick={() => onAction("checkIn", appointment.id, appointment)}
              >
                <CheckCircle className="h-4 w-4 mr-1" /> Registrar
              </Button>

              {/* Reschedule Button - Improved */}
              <Button
                size="sm"
                variant="outline"
                className="transition-all hover:bg-primary/10 border-primary/20 text-primary"
                onClick={() => onAction("reschedule", appointment.id, appointment)}
              >
                <CalendarIcon className="h-4 w-4 mr-1" /> Reagendar
              </Button>

              {/* No Show Button */}
              <Button
                size="sm"
                variant="outline"
                className="transition-all hover:bg-amber-50 dark:hover:bg-amber-900/20 border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-400"
                onClick={() => onAction("noShow", appointment.id, appointment)}
              >
                <AlertCircle className="h-4 w-4 mr-1" /> No Asistió
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="transition-all hover:bg-rose-50 dark:hover:bg-rose-900/20 border-rose-200 dark:border-rose-800/30 text-rose-700 dark:text-rose-400"
                onClick={() => onAction("cancel", appointment.id, appointment)}
              >
                <XCircle className="h-4 w-4 mr-1" /> Cancelar
              </Button>
            </>
          )}
          {appointment.estado === "presente" && (
            <>
              <Button
                size="sm"
                className="transition-all hover:scale-105 bg-sky-600 hover:bg-sky-700"
                onClick={() => onStartSurvey(appointment)}
              >
                <FileText className="h-4 w-4 mr-1" /> Encuesta
              </Button>
              <Button
                size="sm"
                className="transition-all hover:scale-105 bg-primary hover:bg-primary/90"
                onClick={() => onAction("complete", appointment.id, appointment)}
              >
                <CheckCircle className="h-4 w-4 mr-1" /> Completar
              </Button>
            </>
          )}
          {showNoShow && (
            <>
              <Badge
                variant="outline"
                className="bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-400 border-amber-200 dark:border-amber-800/30 flex items-center"
              >
                <AlertCircle className="h-3 w-3 mr-1" /> No asistió
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="transition-all hover:bg-primary/10 border-primary/20 text-primary"
                onClick={() => onAction("reschedule", appointment.id, appointment)}
              >
                <CalendarIcon className="h-4 w-4 mr-1" /> Reagendar
              </Button>
            </>
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
  showPastStatus?: boolean
  onAction: (action: ConfirmAction, id: number, appointment: Appointment) => void
  onStartSurvey: (appointment: Appointment) => void
  onSort: (field: SortField) => void
  sortConfig: { field: SortField; direction: SortDirection }
}> = memo(({ appointments, isLoading, showPastStatus = false, onAction, onStartSurvey, onSort, sortConfig }) => {
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-[250px]" />
            <Skeleton className="h-12 w-[100px]" />
            <Skeleton className="h-12 w-[150px]" />
            <Skeleton className="h-12 w-[100px]" />
            <Skeleton className="h-12 w-[200px]" />
          </div>
        ))}
      </div>
    )
  }

  if (appointments.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
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

  // Function to render sortable header
  const renderSortableHeader = (label: string, field: SortField) => {
    const isActive = sortConfig.field === field

    return (
      <div className="flex items-center gap-1 cursor-pointer group" onClick={() => onSort(field)}>
        <span>{label}</span>
        <ArrowUpDown
          className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground/40 group-hover:text-muted-foreground"} transition-all`}
        />
        {isActive && <span className="ml-1 text-xs text-primary">({sortConfig.direction === "asc" ? "↑" : "↓"})</span>}
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gradient-to-r from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
            <th className="p-3 text-left font-medium">{renderSortableHeader("Paciente", "nombre")}</th>
            <th className="p-3 text-left font-medium">{renderSortableHeader("Motivo", "motivo")}</th>
            <th className="p-3 text-left font-medium">{renderSortableHeader("Fecha", "fecha")}</th>
            <th className="p-3 text-left font-medium">{renderSortableHeader("Hora", "hora")}</th>
            <th className="p-3 text-left font-medium">Estado</th>
            <th className="p-3 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => {
            const showNoShow =
              showPastStatus &&
              appointment.estado === "pendiente" &&
              isBefore(new Date(appointment.fechaConsulta), startOfDay(new Date())) &&
              !dateIsToday(new Date(appointment.fechaConsulta))

            return (
              <motion.tr
                key={appointment.id}
                className="border-b hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <td className="p-3">
                  <div>
                    <div className="font-medium">
                      {appointment.nombre} {appointment.apellidos}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/70"></span>
                      {appointment.telefono}
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <Badge
                    variant="outline"
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                  >
                    {appointment.motivoConsulta}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                    {format(new Date(appointment.fechaConsulta), "dd/MM/yyyy")}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    {appointment.horaConsulta}
                  </div>
                </td>
                <td className="p-3">
                  <AppointmentStatusBadge status={showNoShow ? ("noShow" as AppointmentStatus) : appointment.estado} />
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    {appointment.estado === "pendiente" && !showNoShow && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-primary/20 text-primary hover:bg-primary/10"
                          >
                            <span>Acciones</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem
                            onClick={() => onAction("checkIn", appointment.id, appointment)}
                            className="text-primary focus:text-primary focus:bg-primary/10"
                          >
                            <CheckCircle className="h-4 w-4 mr-2 text-primary" /> Registrar llegada
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onAction("noShow", appointment.id, appointment)}
                            className="text-amber-700 dark:text-amber-400 focus:text-amber-900 dark:focus:text-amber-300 focus:bg-amber-50 dark:focus:bg-amber-900/20"
                          >
                            <AlertCircle className="h-4 w-4 mr-2 text-amber-500" /> No asistió
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onAction("reschedule", appointment.id, appointment)}
                            className="text-primary focus:text-primary focus:bg-primary/10"
                          >
                            <CalendarIcon className="h-4 w-4 mr-2 text-primary" /> Reagendar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-rose-700 dark:text-rose-400 focus:text-rose-900 dark:focus:text-rose-300 focus:bg-rose-50 dark:focus:bg-rose-900/20"
                            onClick={() => onAction("cancel", appointment.id, appointment)}
                          >
                            <XCircle className="h-4 w-4 mr-2 text-rose-500" /> Cancelar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {appointment.estado === "presente" && (
                      <>
                        <Button
                          size="sm"
                          className="transition-all hover:scale-105 bg-sky-600 hover:bg-sky-700"
                          onClick={() => onStartSurvey(appointment)}
                        >
                          <FileText className="h-4 w-4 mr-1" /> Encuesta
                        </Button>
                        <Button
                          size="sm"
                          className="transition-all hover:scale-105 bg-primary hover:bg-primary/90"
                          onClick={() => onAction("complete", appointment.id, appointment)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Completar
                        </Button>
                      </>
                    )}
                    {showNoShow && (
                      <>
                        <Badge
                          variant="outline"
                          className="bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-400 border-amber-200 dark:border-amber-800/30 flex items-center"
                        >
                          <AlertCircle className="h-3 w-3 mr-1" /> No asistió
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="transition-all hover:bg-primary/10 border-primary/20 text-primary"
                          onClick={() => onAction("reschedule", appointment.id, appointment)}
                        >
                          <CalendarIcon className="h-4 w-4 mr-1" /> Reagendar
                        </Button>
                      </>
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
}> = memo(({ filters, onUpdateFilters, onClearFilters }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
      <div className="relative w-full sm:w-[280px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        <Input
          placeholder="Buscar nombre, teléfono, motivo..."
          className="pl-9 border-slate-300 dark:border-slate-700 focus-visible:ring-primary"
          value={filters.searchTerm}
          onChange={(e) => onUpdateFilters({ searchTerm: e.target.value })}
        />
      </div>

      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
        <Select value={filters.statusFilter} onValueChange={(value) => onUpdateFilters({ statusFilter: value })}>
          <SelectTrigger className="w-full sm:w-[180px] border-slate-300 dark:border-slate-700 focus-visible:ring-primary">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="presente">Presente</SelectItem>
            <SelectItem value="completada">Completada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
            <SelectItem value="noAsistio">No asistió</SelectItem>
            <SelectItem value="reagendada">Reagendada</SelectItem>
          </SelectContent>
        </Select>

      </div>
    </div>
  )
})

FilterControls.displayName = "FilterControls"

// Main component optimized
export function PatientAdmission() {
  // States
  const [activeTab, setActiveTab] = useState<string>("today")
  const [filterState, setFilterState] = useState<FilterState>({
    searchTerm: "",
    statusFilter: "all",
    dateRange: { from: null, to: null },
    sortField: null,
    sortDirection: "asc",
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    action: null,
    appointmentId: null,
    appointmentData: null,
  })
  const [surveyDialogState, setSurveyDialogState] = useState<SurveyDialogState>({
    isOpen: false,
    patientId: 0,
    patientName: "",
    patientLastName: "",
    patientPhone: "",
    surveyId: "",
    surveyLink: "",
  })
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null)
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null)

  // Media Query to detect mobile devices safely with SSR
  const isMobile = useIsMobile(768)

  // Context and router
  const {
    pendingAppointments,
    todayAppointments,
    updateAppointment,
    patients,
    setPatients,
    addPatient,
    updatePatient,
    addAppointment,
  } = useAppContext()
  const router = useRouter()

  // Improved initialization and data loading
  const [isInitialMount, setIsInitialMount] = useState(true)

  useEffect(() => {
    // Check if we have real data first
    if (pendingAppointments && pendingAppointments.length > 0) {
      // Wait a moment to ensure child components are ready
      const timer = setTimeout(() => {
        setIsLoading(false)
        setIsInitialMount(false)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      // If no data yet, wait a bit longer
      const timer = setTimeout(() => {
        setIsLoading(false)
        setIsInitialMount(false)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [pendingAppointments])

  // Utility functions for dates (memoized)
  const dateUtils = useMemo(
    () => ({
      isToday: (date: Date): boolean => {
        return dateIsToday(date)
      },
      isPast: (date: Date): boolean => {
        const today = startOfDay(new Date())
        return isBefore(date, today)
      },
      isFuture: (date: Date): boolean => {
        const today = startOfDay(new Date())
        return isAfter(date, today)
      },
    }),
    [],
  )

  // Classification of appointments by date
  const classifiedAppointments = useMemo(() => {
    if (!pendingAppointments || !Array.isArray(pendingAppointments)) return { past: [], today: [], future: [] }

    const past: Appointment[] = []
    const today: Appointment[] = []
    const future: Appointment[] = []

    pendingAppointments.forEach((appointment: Appointment) => {
      const appointmentDate = new Date(appointment.fechaConsulta)

      if (dateUtils.isToday(appointmentDate)) {
        today.push(appointment)
      } else if (dateUtils.isPast(appointmentDate)) {
        past.push(appointment)
      } else if (dateUtils.isFuture(appointmentDate)) {
        future.push(appointment)
      }
    })

    // Sort appointments
    past.sort((a, b) => new Date(b.fechaConsulta).getTime() - new Date(a.fechaConsulta).getTime())
    future.sort((a, b) => new Date(a.fechaConsulta).getTime() - new Date(b.fechaConsulta).getTime())
    today.sort((a, b) => a.horaConsulta.localeCompare(b.horaConsulta))

    return {
      past,
      today,
      future,
    }
  }, [pendingAppointments, dateUtils])

  // Function to filter appointments (memoized)
  const getFilteredAppointments = useCallback(
    (appointments: Appointment[]): Appointment[] => {
      if (!appointments || !Array.isArray(appointments)) return []

      // Extract search terms and status to avoid recalculations
      const { searchTerm, statusFilter, sortField, sortDirection } = filterState
      const searchTermLower = searchTerm.toLowerCase()

      // Apply filters
      const filtered = appointments.filter((appointment) => {
        const matchesSearch =
          searchTerm === "" ||
          `${appointment.nombre} ${appointment.apellidos}`.toLowerCase().includes(searchTermLower) ||
          appointment.motivoConsulta.toLowerCase().includes(searchTermLower) ||
          appointment.telefono.includes(searchTerm)

        const matchesStatus = statusFilter === "all" || appointment.estado === statusFilter

        return matchesSearch && matchesStatus
      })

      // Apply sorting if a field is selected
      if (sortField) {
        filtered.sort((a, b) => {
          let comparison = 0

          switch (sortField) {
            case "nombre":
              comparison = `${a.nombre} ${a.apellidos}`.localeCompare(`${b.nombre} ${b.apellidos}`)
              break
            case "fecha":
              comparison = new Date(a.fechaConsulta).getTime() - new Date(b.fechaConsulta).getTime()
              break
            case "hora":
              comparison = a.horaConsulta.localeCompare(b.horaConsulta)
              break
            case "motivo":
              comparison = a.motivoConsulta.localeCompare(b.motivoConsulta)
              break
          }

          return sortDirection === "asc" ? comparison : -comparison
        })
      }

      return filtered
    },
    [filterState],
  )

  // Apply filters to each category
  const filteredAppointments = useMemo(
    () => ({
      past: getFilteredAppointments(classifiedAppointments.past),
      today: getFilteredAppointments(classifiedAppointments.today),
      future: getFilteredAppointments(classifiedAppointments.future),
    }),
    [getFilteredAppointments, classifiedAppointments],
  )

  // Functions to update filters
  const handleUpdateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilterState((prev) => ({ ...prev, ...newFilters }))
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilterState({
      searchTerm: "",
      statusFilter: "all",
      dateRange: { from: null, to: null },
      sortField: null,
      sortDirection: "asc",
    })
  }, [])

  const handleSort = useCallback((field: SortField) => {
    setFilterState((prev) => {
      // If we click on the same field, toggle the direction
      if (prev.sortField === field) {
        return {
          ...prev,
          sortDirection: prev.sortDirection === "asc" ? "desc" : "asc",
        }
      }
      // If we click on a new field, set it with ascending direction
      return {
        ...prev,
        sortField: field,
        sortDirection: "asc",
      }
    })
  }, [])

  // Functions to handle actions on appointments
  const handleCheckIn = useCallback(
    (id: number, appointment: Appointment) => {
      updateAppointment(id, { estado: "presente" })

      // Update or create patient
      if (appointment.patientId) {
        updatePatient(appointment.patientId, {
          estado: "Pendiente de consulta",
          ultimoContacto: new Date().toISOString().split("T")[0],
        })

        toast.success(`${appointment.nombre} registrado como presente`, {
          description: "El paciente ha sido movido a la lista de consulta",
          icon: <CheckCircle className="h-4 w-4 text-primary" />,
        })
      } else {
        const newPatientId = addPatient({
          nombre: appointment.nombre,
          apellidos: appointment.apellidos,
          edad: 0,
          fechaConsulta:
            typeof appointment.fechaConsulta === "string"
              ? appointment.fechaConsulta
              : appointment.fechaConsulta.toISOString().split("T")[0],
          fechaRegistro: new Date().toISOString().split("T")[0],
          diagnostico: appointment.motivoConsulta as DiagnosisType,
          estado: "Pendiente de consulta",
          probabilidadCirugia: 0.5,
          ultimoContacto: new Date().toISOString().split("T")[0],
          telefono: appointment.telefono,
        })

        updateAppointment(id, { patientId: newPatientId })

        toast.success(`Nuevo paciente registrado: ${appointment.nombre}`, {
          description: "Se ha creado una ficha de paciente",
          icon: <UserPlus className="h-4 w-4 text-primary" />,
        })
      }

      setConfirmDialog({ isOpen: false, action: null, appointmentId: null, appointmentData: null })
    },
    [updateAppointment, updatePatient, addPatient],
  )

  const handleCancel = useCallback(
    (id: number, appointment: Appointment) => {
      updateAppointment(id, { estado: "cancelada" })

      toast.info(`Cita cancelada: ${appointment.nombre}`, {
        description: format(new Date(appointment.fechaConsulta), "dd/MM/yyyy") + " - " + appointment.horaConsulta,
        icon: <XCircle className="h-4 w-4 text-rose-500" />,
      })

      setConfirmDialog({ isOpen: false, action: null, appointmentId: null, appointmentData: null })
    },
    [updateAppointment],
  )

  const handleNoShow = useCallback(
    (id: number, appointment: Appointment) => {
      updateAppointment(id, { estado: "noAsistio" })

      if (appointment.patientId) {
        updatePatient(appointment.patientId, {
          estado: "No Asistió",
          ultimoContacto: new Date().toISOString().split("T")[0],
        })
      }

      toast.info(`Paciente no asistió: ${appointment.nombre}`, {
        description: format(new Date(appointment.fechaConsulta), "dd/MM/yyyy") + " - " + appointment.horaConsulta,
        icon: <AlertCircle className="h-4 w-4 text-amber-500" />,
      })

      setConfirmDialog({ isOpen: false, action: null, appointmentId: null, appointmentData: null })
    },
    [updateAppointment, updatePatient],
  )

  const handleReschedule = useCallback(
    (id: number, appointment: Appointment, newDate: Date, newTime: string) => {
      // Keep reference to original appointment
      const originalDate = new Date(appointment.fechaConsulta)

      // Update current appointment as rescheduled
      updateAppointment(id, { estado: "reagendada" })

      // Create a new appointment with the same data but new date/time
      const newAppointmentId = addAppointment({
        ...appointment,
        id: Math.floor(Math.random() * 10000) + 1000, // Generate new ID
        fechaConsulta: newDate,
        horaConsulta: newTime,
        estado: "pendiente",
      })

      toast.success(`Cita reagendada: ${appointment.nombre}`, {
        description: `De: ${format(originalDate, "dd/MM/yyyy")} ${appointment.horaConsulta} a: ${format(newDate, "dd/MM/yyyy")} ${newTime}`,
        icon: <CalendarIcon className="h-4 w-4 text-primary" />,
      })

      setConfirmDialog({ isOpen: false, action: null, appointmentId: null, appointmentData: null })
      setRescheduleDate(null)
      setRescheduleTime(null)

      // Switch to future appointments tab
      setActiveTab("future")
    },
    [updateAppointment, addAppointment],
  )

  const handleComplete = useCallback(
    (id: number, appointment: Appointment) => {
      updateAppointment(id, { estado: "completada" })

      if (appointment.patientId) {
        updatePatient(appointment.patientId, {
          estado: "Seguimiento",
          fechaConsulta:
            typeof appointment.fechaConsulta === "string"
              ? appointment.fechaConsulta
              : appointment.fechaConsulta.toISOString().split("T")[0],
          ultimoContacto: new Date().toISOString().split("T")[0],
        })
      }

      toast.success(`Consulta completada: ${appointment.nombre}`, {
        description: "El paciente ha pasado a estado de seguimiento",
        icon: <ClipboardCheck className="h-4 w-4 text-sky-500" />,
      })

      setConfirmDialog({ isOpen: false, action: null, appointmentId: null, appointmentData: null })
    },
    [updateAppointment, updatePatient],
  )

  // Functions for dialogs
  const handleStartSurvey = useCallback((appointment: Appointment) => {
    const surveyId = generateSurveyId()
    const surveyLink = `${window.location.origin}/survey/${surveyId}?patientId=${appointment.patientId || 0}`

    setSurveyDialogState({
      isOpen: true,
      patientId: appointment.patientId || 0,
      patientName: appointment.nombre,
      patientLastName: appointment.apellidos,
      patientPhone: appointment.telefono,
      surveyId,
      surveyLink,
    })
  }, [])

  const handleStartInternalSurvey = useCallback(() => {
    setSurveyDialogState((prev) => ({ ...prev, isOpen: false }))

    toast.info(`Iniciando encuesta para ${surveyDialogState.patientName}`, {
      description: "Preparando formulario...",
    })

    router.push(`/survey/${surveyDialogState.surveyId}?patientId=${surveyDialogState.patientId}&mode=internal`)
  }, [router, surveyDialogState])

  const handleCloseSurveyDialog = useCallback(() => {
    setSurveyDialogState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  const handleNewPatientSuccess = useCallback(() => {
    setActiveTab("future")
    toast.success("Paciente añadido correctamente", {
      description: "El paciente ha sido agendado para una cita futura",
    })
  }, [])

  // Open confirmation dialog
  const openConfirmDialog = useCallback((action: ConfirmAction, id: number, appointment: Appointment) => {
    // If rescheduling, set a default date (7 days later)
    if (action === "reschedule") {
      const currentDate = new Date(appointment.fechaConsulta)
      // If the appointment is in the past, use current date + 7 days, otherwise use current date + 1 day
      const defaultDate = isBefore(currentDate, startOfDay(new Date()))
        ? addDays(new Date(), 7)
        : addDays(currentDate, 1)

      setRescheduleDate(defaultDate)
      setRescheduleTime(appointment.horaConsulta)
    }

    setConfirmDialog({
      isOpen: true,
      action,
      appointmentId: id,
      appointmentData: appointment,
    })
  }, [])

  // Execute confirmed action
  const handleConfirmAction = useCallback(() => {
    if (!confirmDialog.action || confirmDialog.appointmentId === null || !confirmDialog.appointmentData) return

    switch (confirmDialog.action) {
      case "checkIn":
        handleCheckIn(confirmDialog.appointmentId, confirmDialog.appointmentData)
        break
      case "cancel":
        handleCancel(confirmDialog.appointmentId, confirmDialog.appointmentData)
        break
      case "complete":
        handleComplete(confirmDialog.appointmentId, confirmDialog.appointmentData)
        break
      case "noShow":
        handleNoShow(confirmDialog.appointmentId, confirmDialog.appointmentData)
        break
      case "reschedule":
        if (rescheduleDate && rescheduleTime) {
          handleReschedule(confirmDialog.appointmentId, confirmDialog.appointmentData, rescheduleDate, rescheduleTime)
        } else {
          toast.error("Por favor selecciona una fecha y hora válidas")
        }
        break
    }
  }, [
    confirmDialog,
    handleCheckIn,
    handleCancel,
    handleComplete,
    handleNoShow,
    handleReschedule,
    rescheduleDate,
    rescheduleTime,
  ])

  // Conditional rendering for mobile and desktop
  const renderAppointmentsContent = useCallback(
    (appointments: Appointment[], showPastStatus = false) => {
      if (isMobile) {
        return (
          <AnimatePresence>
            {appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                isPast={showPastStatus}
                onAction={openConfirmDialog}
                onStartSurvey={handleStartSurvey}
              />
            ))}
          </AnimatePresence>
        )
      }

      return (
        <AppointmentTable
          appointments={appointments}
          isLoading={isLoading}
          showPastStatus={showPastStatus}
          onAction={openConfirmDialog}
          onStartSurvey={handleStartSurvey}
          onSort={handleSort}
          sortConfig={{ field: filterState.sortField, direction: filterState.sortDirection }}
        />
      )
    },
    [
      isLoading,
      openConfirmDialog,
      handleStartSurvey,
      handleSort,
      filterState.sortField,
      filterState.sortDirection,
      isMobile,
    ],
  )

  // Get action button color based on action type
  const getActionButtonColor = useCallback((action: ConfirmAction | null): string => {
    switch (action) {
      case "checkIn":
        return "bg-primary hover:bg-primary/90 text-primary-foreground"
      case "cancel":
        return "bg-rose-600 hover:bg-rose-700 text-white"
      case "complete":
        return "bg-sky-600 hover:bg-sky-700 text-white"
      case "noShow":
        return "bg-amber-600 hover:bg-amber-700 text-white"
      case "reschedule":
        return "bg-primary hover:bg-primary/90 text-primary-foreground"
      default:
        return ""
    }
  }, [])

  // Get icon for action dialog
  const getActionIcon = useCallback((action: ConfirmAction | null) => {
    switch (action) {
      case "checkIn":
        return <CheckCircle className="h-5 w-5 text-primary" />
      case "cancel":
        return <CalendarX className="h-5 w-5 text-rose-500" />
      case "complete":
        return <ClipboardCheck className="h-5 w-5 text-sky-500" />
      case "noShow":
        return <AlertCircle className="h-5 w-5 text-amber-500" />
      case "reschedule":
        return <CalendarClock className="h-5 w-5 text-primary" />
      default:
        return null
    }
  }, [])

  return (
    <>
      <Card className="w-full overflow-hidden shadow-md hover:shadow-lg transition-all border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Users className="h-5 w-5 text-primary" />
              <span>Admisión de Pacientes</span>
              {isLoading && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent text-primary"></span>
              )}
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Gestione el ingreso de pacientes y citas
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <NewPatientForm onSuccess={handleNewPatientSuccess} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <TabsList className="grid grid-cols-3 w-full sm:w-auto bg-slate-100 dark:bg-slate-800 p-1">
                  <TabsTrigger
                    value="today"
                    className="relative data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-primary dark:data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    Hoy
                    <Badge className="ml-1 bg-primary hover:bg-primary/90">{filteredAppointments.today.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="future"
                    className="relative data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-primary dark:data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    Próximas
                    <Badge className="ml-1 bg-primary hover:bg-primary/90">{filteredAppointments.future.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="past"
                    className="relative data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-primary dark:data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    Anteriores
                    <Badge className="ml-1 bg-primary hover:bg-primary/90">{filteredAppointments.past.length}</Badge>
                  </TabsTrigger>
                </TabsList>
              </div>

              <FilterControls
                filters={filterState}
                onUpdateFilters={handleUpdateFilters}
                onClearFilters={handleClearFilters}
              />
            </div>

            <div className="p-6 pt-0">
              <TabsContent value="today" className="m-0 py-2">
                {renderAppointmentsContent(filteredAppointments.today)}
              </TabsContent>

              <TabsContent value="future" className="m-0 py-2">
                {renderAppointmentsContent(filteredAppointments.future)}
              </TabsContent>

              <TabsContent value="past" className="m-0 py-2">
                {renderAppointmentsContent(filteredAppointments.past, true)}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Survey share dialog */}
      <SurveyShareDialog
        isOpen={surveyDialogState.isOpen}
        patient={{
          id: surveyDialogState.patientId,
          nombre: surveyDialogState.patientName,
          apellidos: surveyDialogState.patientLastName,
          telefono: surveyDialogState.patientPhone,
        }}
        surveyLink={surveyDialogState.surveyLink}
        onStartInternal={handleStartInternalSurvey}
        onClose={handleCloseSurveyDialog}
      />

      {/* Improved confirmation dialog */}
      <AlertDialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({
              isOpen: false,
              action: null,
              appointmentId: null,
              appointmentData: null,
            })
            setRescheduleDate(null)
            setRescheduleTime(null)
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-[450px] border-slate-200 dark:border-slate-800 shadow-lg">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-2">
              {getActionIcon(confirmDialog.action)}
              <AlertDialogTitle
                className={`
                ${confirmDialog.action === "checkIn" ? "text-primary" : ""}
                ${confirmDialog.action === "cancel" ? "text-rose-700 dark:text-rose-400" : ""}
                ${confirmDialog.action === "complete" ? "text-sky-700 dark:text-sky-400" : ""}
                ${confirmDialog.action === "noShow" ? "text-amber-700 dark:text-amber-400" : ""}
                ${confirmDialog.action === "reschedule" ? "text-primary" : ""}
              `}
              >
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
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        <span>
                          {format(new Date(confirmDialog.appointmentData.fechaConsulta), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>{confirmDialog.appointmentData.horaConsulta}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span>{confirmDialog.appointmentData.motivoConsulta}</span>
                      </div>
                    </div>
                  </div>
                )}

                {confirmDialog.action !== "reschedule" ? (
                  <div className="mt-4 text-slate-600 dark:text-slate-300 p-3 bg-primary/5 rounded-md border border-primary/10">
                    {confirmDialog.action === "checkIn" && (
                      <div className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 text-primary mt-0.5" />
                        <span>El paciente aparecerá en el dashboard como pendiente de consulta.</span>
                      </div>
                    )}
                    {confirmDialog.action === "cancel" && (
                      <div className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 text-rose-500 mt-0.5" />
                        <span>Esta acción no se puede deshacer.</span>
                      </div>
                    )}
                    {confirmDialog.action === "complete" && (
                      <div className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 text-sky-500 mt-0.5" />
                        <span>El paciente pasará a estado de seguimiento.</span>
                      </div>
                    )}
                    {confirmDialog.action === "noShow" && (
                      <div className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 text-amber-500 mt-0.5" />
                        <span>Se marcará que el paciente no asistió a la cita.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4">
                    <RescheduleDatePicker
                      date={rescheduleDate}
                      time={rescheduleTime}
                      onDateChange={setRescheduleDate}
                      onTimeChange={setRescheduleTime}
                    />
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogCancel className="border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={confirmDialog.action === "reschedule" && (!rescheduleDate || !rescheduleTime)}
              className={cn(
                "transition-all duration-200",
                getActionButtonColor(confirmDialog.action),
                confirmDialog.action === "reschedule" && (!rescheduleDate || !rescheduleTime) && "opacity-50 cursor-not-allowed"
              )}
            >
              {confirmDialog.action === "checkIn" && "Registrar"}
              {confirmDialog.action === "cancel" && "Cancelar cita"}
              {confirmDialog.action === "complete" && "Completar"}
              {confirmDialog.action === "noShow" && "Marcar como no asistió"}
              {confirmDialog.action === "reschedule" && "Reagendar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
