"use client"

import type React from "react"

import { useState, useMemo, useCallback, useEffect, memo, useReducer, type FC } from "react"
import {
  Search,
  CalendarIcon,
  FileText,
  CheckCircle,
  XCircle,
  UserPlus,
  Filter,
  Clock,
  Calendar,
  Users,
  ClipboardCheck,
  AlertCircle,
  CalendarDays,
  CalendarClock,
  CalendarCheck,
  ChevronRight,
  RefreshCcw,
  Info,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UnifiedPatientRegistrationForm as NewPatientForm } from "./new-patient-form"
import PatientManagement from "./patient-management"
import { toast } from "sonner"
import { useAppContext } from "@/lib/context/app-context"
import { Badge } from "@/components/ui/badge"
import { SurveyShareDialog } from "@/components/surveys/survey-share-dialog"
import { generateSurveyId } from "@/lib/form-utils"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, isToday as dateIsToday, isBefore, isAfter, startOfDay } from "date-fns"
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { DiagnosisType } from "@/app/dashboard/data-model"
import { useMediaQuery } from "@/hooks/use-media-query"

// ============ TIPOS MEJORADOS ============

// Importar tipos directamente desde el modelo de datos centralizado
import { type AppointmentStatus, AppointmentStatusEnum, type AppointmentData } from "@/app/dashboard/data-model"

// Tipos más estrictos para fechas y cadenas de tiempo
type ISODateString = string // formato YYYY-MM-DD
type FormattedTimeString = `${number}:${number}` // formato HH:MM

// Tipos más estrictos para ID
type EntityId = string

export type PatientStatus =
  | "Pendiente de consulta"
  | "Operado"
  | "No Operado"
  | "Seguimiento"
  | "Cancelado"
  | "No Asistió"

export type ConfirmAction = "checkIn" | "cancel" | "complete" | "noShow" | "reschedule" | null

export type SortField = "nombre" | "fecha" | "hora" | "motivo" | "estado" | null
export type SortDirection = "asc" | "desc"

// Interfaces mejoradas
export interface Appointment {
  id: EntityId
  nombre: string
  apellidos: string
  telefono: string
  fechaConsulta: ISODateString | Date
  horaConsulta: FormattedTimeString
  motivoConsulta: string
  estado: AppointmentStatus
  patientId?: EntityId
}

// Adaptador para convertir AppointmentData a Appointment
const adaptAppointmentData = (appointment: AppointmentData): Appointment => ({
  id: appointment.id,
  nombre: appointment.paciente?.split(' ')[0] || 'Sin nombre',
  apellidos: appointment.paciente?.split(' ').slice(1).join(' ') || 'Sin apellido',
  telefono: appointment.telefono || '',
  fechaConsulta: appointment.fechaConsulta,
  horaConsulta: appointment.horaConsulta as FormattedTimeString,
  motivoConsulta: appointment.motivoConsulta || '',
  estado: appointment.estado,
  patientId: appointment.patientId
});

export interface Patient {
  id: EntityId
  nombre: string
  apellidos: string
  edad?: number
  telefono?: string
  fechaConsulta?: ISODateString
  fechaRegistro: ISODateString
  diagnostico?: DiagnosisType
  estado?: PatientStatus
  probabilidadCirugia?: number
  ultimoContacto?: ISODateString
  encuesta?: boolean
}

export interface PatientBasic {
  id: EntityId
  nombre: string
  apellidos: string
  telefono: string
}

export interface SurveyDialogState {
  isOpen: boolean
  patientId: EntityId
  patientName: string
  patientLastName: string
  patientPhone: string
  surveyId: string
  surveyLink: string
}

export interface ConfirmDialogState {
  isOpen: boolean
  action: ConfirmAction
  appointmentId: EntityId | null
  appointmentData?: Appointment | null
}

export interface FilterState {
  searchTerm: string
  statusFilter: AppointmentStatus | "all"
  dateRange: {
    from: Date | null
    to: Date | null
  }
  sortField: SortField
  sortDirection: SortDirection
}

export interface AppointmentLists {
  past: Appointment[]
  today: Appointment[]
  future: Appointment[]
}

// Tipo para las propiedades de FilterControls
export interface FilterControlsProps {
  filters: FilterState
  onUpdateFilters: (filters: FilterState) => void
  onClearFilters: () => void
  onRefresh: () => void
}

// Interfaz mejorada para el contexto de la aplicación
interface AppContextType {
  patients: PatientData[]
  appointments: AppointmentData[]
  fetchPatients: () => Promise<void>
  fetchAppointments: (filters?: Record<string, string>) => Promise<void>
  isLoadingPatients: boolean
  isLoadingAppointments: boolean
}

// Tipo para datos de pacientes nuevos
export interface PatientData extends Patient {
  // Extendemos la interfaz Patient para incluir cualquier campo adicional
  // que pueda necesitar el formulario de registro
}

// ============ REDUCERS ============

// Reducer para el diálogo de confirmación
const confirmDialogReducer = (state: ConfirmDialogState, action: any): ConfirmDialogState => {
  switch (action.type) {
    case "OPEN_CONFIRM_DIALOG":
      return {
        isOpen: true,
        action: action.payload.action,
        appointmentId: action.payload.appointmentId,
        appointmentData: action.payload.appointmentData,
      }
    case "CLOSE_CONFIRM_DIALOG":
      return {
        ...state,
        isOpen: false,
      }
    case "RESET_CONFIRM_DIALOG":
      return initialConfirmDialogState
    default:
      return state
  }
}

// Reducer para el diálogo de encuestas
const surveyDialogReducer = (state: SurveyDialogState, action: any): SurveyDialogState => {
  switch (action.type) {
    case "OPEN_SURVEY_DIALOG":
      return {
        isOpen: true,
        patientId: action.payload.patientId,
        patientName: action.payload.patientName,
        patientLastName: action.payload.patientLastName,
        patientPhone: action.payload.patientPhone,
        surveyId: action.payload.surveyId || generateSurveyId(),
        surveyLink: action.payload.surveyLink || "",
      }
    case "CLOSE_SURVEY_DIALOG":
      return {
        ...state,
        isOpen: false,
      }
    default:
      return state
  }
}

// Reducer para los filtros
const filterReducer = (state: FilterState, action: Partial<FilterState> | { type: string }): FilterState => {
  if ("type" in action) {
    switch (action.type) {
      case "RESET_FILTERS":
        return initialFilterState
      default:
        return state
    }
  }
  return { ...state, ...action }
}

// Estados iniciales
const initialConfirmDialogState: ConfirmDialogState = {
  isOpen: false,
  action: null,
  appointmentId: null,
  appointmentData: null,
}

const initialSurveyDialogState: SurveyDialogState = {
  isOpen: false,
  patientId: "",
  patientName: "",
  patientLastName: "",
  patientPhone: "",
  surveyId: "",
  surveyLink: "",
}

const initialFilterState: FilterState = {
  searchTerm: "",
  statusFilter: "all",
  dateRange: {
    from: null,
    to: null,
  },
  sortField: null,
  sortDirection: "asc",
}

// ============ UTILIDADES DE FECHA CENTRALIZADAS ============

const dateUtils = {
  isValidDate: (date: any): date is Date => {
    return date instanceof Date && !isNaN(date.getTime())
  },

  parseDate: (dateInput: string | Date | undefined | null): Date | null => {
    if (!dateInput) return null
    if (dateInput instanceof Date) return dateUtils.isValidDate(dateInput) ? dateInput : null

    try {
      const date = new Date(dateInput)
      return dateUtils.isValidDate(date) ? date : null
    } catch {
      return null
    }
  },

  formatDate: (date: Date | string | null | undefined, formatStr: string, options?: any, fallback = ""): string => {
    const parsedDate = dateUtils.parseDate(date)
    if (!parsedDate) return fallback

    try {
      return format(parsedDate, formatStr, { locale: es, ...options })
    } catch (error) {
      console.error("[formatDate] Error:", error, "Input:", date)
      return fallback
    }
  },

  isToday: (date: Date | string | null | undefined): boolean => {
    const parsedDate = dateUtils.parseDate(date)
    return !!parsedDate && dateIsToday(parsedDate)
  },

  isPast: (date: Date | string | null | undefined): boolean => {
    const parsedDate = dateUtils.parseDate(date)
    return !!parsedDate && isBefore(parsedDate, startOfDay(new Date()))
  },

  isFuture: (date: Date | string | null | undefined): boolean => {
    const parsedDate = dateUtils.parseDate(date)
    return !!parsedDate && isAfter(parsedDate, startOfDay(new Date()))
  },
}

// Función para normalizar IDs
const normalizeId = (id: any): EntityId => {
  if (id === null || id === undefined) return ""
  return String(id)
}

// ============ COMPONENTES OPTIMIZADOS ============

// Componente de selector de fecha para reagendamiento - Memoizado
const RescheduleDatePicker: FC<{
  date: Date | null
  time: string | null
  onDateChange: (date: Date | null) => void
  onTimeChange: (time: string) => void
}> = memo(({ date, time, onTimeChange, onDateChange }) => {
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = 8; hour <= 17; hour++) {
      if (hour !== 14) {
        // Saltar 14:00 (descanso)
        slots.push(`${hour.toString().padStart(2, "0")}:00`)
        slots.push(`${hour.toString().padStart(2, "0")}:30`)
      }
    }
    return slots
  }, [])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <CalendarDays className="h-4 w-4 text-primary" />
          Nueva fecha
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {date
                ? dateUtils.formatDate(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }, "Fecha inválida")
                : "Seleccionar fecha"}
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
              className="rounded-md border shadow-lg"
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
          <SelectTrigger className="w-full">
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
        <div className="mt-2 p-3 bg-primary/5 border border-primary/10 rounded-md">
          <h4 className="text-sm font-medium flex items-center gap-1.5 text-primary mb-1">
            <CalendarCheck className="h-4 w-4" />
            Resumen de reagendamiento
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            La cita será reagendada para el{" "}
            <span className="font-medium text-slate-900 dark:text-slate-200">
              {dateUtils.formatDate(date, "EEEE, d 'de' MMMM", { locale: es }, "Fecha inválida")}
            </span>{" "}
            a las <span className="font-medium text-slate-900 dark:text-slate-200">{time}</span>.
          </p>
        </div>
      )}
    </div>
  )
})
RescheduleDatePicker.displayName = "RescheduleDatePicker"

// Badge de estado - Memoizado
const AppointmentStatusBadge: FC<{ status: AppointmentStatus }> = memo(({ status }) => {
  // Mapa de colores de estado
  const statusConfig = useMemo(
    () => ({
      [AppointmentStatusEnum.PRESENTE]: {
        color:
          "bg-teal-100 text-teal-800 dark:bg-teal-800/20 dark:text-teal-400 border-teal-200 dark:border-teal-800/30",
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
        label: "Presente",
      },
      [AppointmentStatusEnum.CANCELADA]: {
        color:
          "bg-rose-100 text-rose-800 dark:bg-rose-800/20 dark:text-rose-400 border-rose-200 dark:border-rose-800/30",
        icon: <XCircle className="h-3 w-3 mr-1" />,
        label: "Cancelada",
      },
      [AppointmentStatusEnum.COMPLETADA]: {
        color: "bg-sky-100 text-sky-800 dark:bg-sky-800/20 dark:text-sky-400 border-sky-200 dark:border-sky-800/30",
        icon: <ClipboardCheck className="h-3 w-3 mr-1" />,
        label: "Completada",
      },
      [AppointmentStatusEnum.PROGRAMADA]: {
        color:
          "bg-slate-100 text-slate-800 dark:bg-slate-800/20 dark:text-slate-400 border-slate-200 dark:border-slate-800/30",
        icon: <Clock className="h-3 w-3 mr-1" />,
        label: "Programada",
      },
      [AppointmentStatusEnum.NO_ASISTIO]: {
        color:
          "bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-400 border-amber-200 dark:border-amber-800/30",
        icon: <AlertCircle className="h-3 w-3 mr-1" />,
        label: "No asistió",
      },
      [AppointmentStatusEnum.REAGENDADA]: {
        color:
          "bg-violet-100 text-violet-800 dark:bg-violet-800/20 dark:text-violet-400 border-violet-200 dark:border-violet-800/30",
        icon: <Calendar className="h-3 w-3 mr-1" />,
        label: "Reagendada",
      },
      [AppointmentStatusEnum.CONFIRMADA]: {
        color:
          "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400 border-blue-200 dark:border-blue-800/30",
        icon: <CalendarClock className="h-3 w-3 mr-1" />,
        label: "Confirmada",
      },
    }),
    [],
  )

  const config = statusConfig[status] || {
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400 border-gray-200 dark:border-gray-800/30",
    icon: null,
    label: status,
  }

  return (
    <Badge
      variant="outline"
      className={`${config.color} transition-all duration-300 border flex items-center gap-0.5 font-medium`}
    >
      {config.icon}
      {config.label}
    </Badge>
  )
})
AppointmentStatusBadge.displayName = "AppointmentStatusBadge"

// Componente de filtros memoizado
const FilterControls: FC<FilterControlsProps> = memo(({ filters, onUpdateFilters, onClearFilters, onRefresh }) => {
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateFilters({ ...filters, searchTerm: e.target.value })
    },
    [filters, onUpdateFilters],
  )

  const handleStatusChange = useCallback(
    (value: string) => {
      onUpdateFilters({ ...filters, statusFilter: value as AppointmentStatus | "all" })
    },
    [filters, onUpdateFilters],
  )

  const handleDateChange = useCallback(
    (range: { from: Date | null; to: Date | null }) => {
      onUpdateFilters({ ...filters, dateRange: range })
    },
    [filters, onUpdateFilters],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por nombre o motivo..."
            className="pl-9"
            value={filters.searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        <div className="flex gap-2">
          <Select value={filters.statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value={AppointmentStatusEnum.PROGRAMADA}>Programada</SelectItem>
              <SelectItem value={AppointmentStatusEnum.CONFIRMADA}>Confirmada</SelectItem>
              <SelectItem value={AppointmentStatusEnum.PRESENTE}>Presente</SelectItem>
              <SelectItem value={AppointmentStatusEnum.COMPLETADA}>Completada</SelectItem>
              <SelectItem value={AppointmentStatusEnum.CANCELADA}>Cancelada</SelectItem>
              <SelectItem value={AppointmentStatusEnum.NO_ASISTIO}>No Asistió</SelectItem>
              <SelectItem value={AppointmentStatusEnum.REAGENDADA}>Reagendada</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={onClearFilters}
            title="Limpiar filtros"
            className="border-slate-200 dark:border-slate-800"
          >
            <X className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            title="Actualizar"
            className="border-slate-200 dark:border-slate-800"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
})
FilterControls.displayName = "FilterControls"

// Tarjeta de cita (móvil) - Memoizada
const AppointmentCard: FC<{
  appointment: Appointment
  isPast?: boolean
  onAction: (action: ConfirmAction, id: EntityId, appointment: Appointment) => void
  onStartSurvey: (patientId: EntityId, patientName: string, patientLastName: string, patientPhone: string) => void
  showNoShowOverride?: boolean
}> = memo(({ appointment, onAction, onStartSurvey, showNoShowOverride = false, isPast = false }) => {
  // Utilizamos las funciones de utilidad de fecha
  const formatDate = useCallback((date: string | Date): string => {
    return dateUtils.formatDate(date, "EEEE, d 'de' MMMM", { locale: es }, "Fecha inválida")
  }, [])

  const formatTime = useCallback((time: string): string => {
    if (!time || !time.includes(":")) return "Hora inválida"
    try {
      const [hours, minutes] = time.split(":")
      const date = new Date()
      date.setHours(Number.parseInt(hours, 10))
      date.setMinutes(Number.parseInt(minutes, 10))
      return format(date, "p", { locale: es })
    } catch (error) {
      console.error("Error formateando hora en Card:", error, time)
      return "Hora inválida"
    }
  }, [])

  // Mapa de colores según estado
  const statusColors = useMemo(
    () => ({
      [AppointmentStatusEnum.PROGRAMADA]:
        "border-blue-500 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
      [AppointmentStatusEnum.CONFIRMADA]:
        "border-blue-500 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
      [AppointmentStatusEnum.PRESENTE]:
        "border-green-500 bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300",
      [AppointmentStatusEnum.COMPLETADA]:
        "border-purple-500 bg-purple-50 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300",
      [AppointmentStatusEnum.CANCELADA]: "border-red-500 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300",
      [AppointmentStatusEnum.REAGENDADA]:
        "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300",
      [AppointmentStatusEnum.NO_ASISTIO]:
        "border-slate-500 bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400",
    }),
    [],
  )

  const isPastAppointment = useMemo(() => {
    return (
      appointment.estado === AppointmentStatusEnum.COMPLETADA ||
      appointment.estado === AppointmentStatusEnum.CANCELADA ||
      (showNoShowOverride && appointment.estado === AppointmentStatusEnum.NO_ASISTIO) ||
      isPast
    )
  }, [appointment.estado, showNoShowOverride, isPast])

  return (
    <div
      className={`relative border-l-4 ${statusColors[appointment.estado] || "border-gray-300"} p-4 rounded-md shadow-sm bg-white dark:bg-slate-950 mb-3`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-slate-900 dark:text-slate-100">
            {appointment.nombre} {appointment.apellidos}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatDate(appointment.fechaConsulta)} - {formatTime(appointment.horaConsulta)}
          </p>
        </div>
        <AppointmentStatusBadge status={appointment.estado} />
      </div>

      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
        <span className="font-medium">Motivo:</span> {appointment.motivoConsulta || "No especificado"}
      </p>

      <div className="flex gap-2 mt-4">
        {!isPastAppointment && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => onAction("checkIn", appointment.id, appointment)}
          >
            <CheckCircle className="h-4 w-4 mr-2" /> Presente
          </Button>
        )}

        {appointment.estado === AppointmentStatusEnum.PRESENTE && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-sky-500/30 text-sky-600 hover:bg-sky-500/10 dark:text-sky-400"
            onClick={() => onAction("complete", appointment.id, appointment)}
          >
            <ClipboardCheck className="h-4 w-4 mr-2" /> Completar
          </Button>
        )}

        {!isPastAppointment && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
            onClick={() => onAction("reschedule", appointment.id, appointment)}
          >
            <CalendarDays className="h-4 w-4 mr-2" /> Reagendar
          </Button>
        )}

        {!isPastAppointment && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
            onClick={() => onAction("cancel", appointment.id, appointment)}
          >
            <XCircle className="h-4 w-4 mr-2" /> Cancelar
          </Button>
        )}

        {appointment.patientId && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-violet-500/30 text-violet-600 hover:bg-violet-500/10 dark:text-violet-400"
            onClick={() =>
              onStartSurvey(
                appointment.patientId as EntityId,
                appointment.nombre,
                appointment.apellidos,
                appointment.telefono,
              )
            }
          >
            <FileText className="h-4 w-4 mr-2" /> Encuesta
          </Button>
        )}
      </div>
    </div>
  )
})
AppointmentCard.displayName = "AppointmentCard"

// ============ COMPONENTE PRINCIPAL ============

/**
 * Componente principal para la gestión de admisión de pacientes
 * Permite registrar nuevos pacientes, gestionar citas y realizar seguimiento
 */
const PatientAdmission: FC = () => {
  // Contexto y estado
  const { patients, appointments } = useAppContext();
  const [confirmDialog, setConfirmDialog] = useReducer(confirmDialogReducer, initialConfirmDialogState);
  const [surveyDialogState, setSurveyDialogState] = useReducer(surveyDialogReducer, initialSurveyDialogState);
  const [filterState, setFilterState] = useReducer(filterReducer, initialFilterState);
  const [activeTab, setActiveTab] = useState<string>('today');
  const [classifiedAppointments, setClassifiedAppointments] = useState<AppointmentLists>({
    today: [],
    future: [],
    past: []
  });
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentLists>({
    today: [],
    future: [],
    past: []
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitialMount, setIsInitialMount] = useState<boolean>(true);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const isMobile = useMediaQuery("(max-width: 640px)");

  // Función para obtener el color del botón según la acción
  const getActionButtonColor = useCallback((action: ConfirmAction): string => {
    switch (action) {
      case "checkIn": return "bg-primary hover:bg-primary/90 text-primary-foreground";
      case "cancel": return "bg-rose-600 hover:bg-rose-700 text-white";
      case "complete": return "bg-sky-600 hover:bg-sky-700 text-white";
      case "noShow": return "bg-amber-600 hover:bg-amber-700 text-white";
      case "reschedule": return "bg-primary hover:bg-primary/90 text-primary-foreground";
      default: return "bg-slate-600 hover:bg-slate-700 text-white"; // Fallback
    }
  }, []);

  // Función para obtener el icono de acción
  const getActionIcon = useCallback((action: ConfirmAction): JSX.Element => {
    switch (action) {
      case "checkIn": return <CheckCircle className="h-5 w-5 text-primary" />;
      case "cancel": return <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />;
      case "complete": return <ClipboardCheck className="h-5 w-5 text-sky-600 dark:text-sky-400" />;
      case "noShow": return <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case "reschedule": return <CalendarDays className="h-5 w-5 text-primary" />;
      default: return <Info className="h-5 w-5 text-slate-600 dark:text-slate-400" />;
    }
  }, []);

  // Manejadores de eventos
  const handleUpdateFilters = useCallback((filters: FilterState) => {
    setFilterState(filters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilterState({ type: 'RESET_FILTERS' });
  }, []);

  const handleRefresh = useCallback(() => {
    // Lógica para actualizar datos desde el backend
    setIsLoading(true);
    // Aquí se añadiría la llamada a la API o servicio
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Datos actualizados");
    }, 1000);
  }, []);

  const handleNewPatientSuccess = useCallback((patientData: PatientData) => {
    toast.success(`Paciente ${patientData.nombre} registrado correctamente`);
    handleRefresh();
  }, [handleRefresh]);

  const handleAction = useCallback((action: ConfirmAction, appointmentId: EntityId, appointment: Appointment) => {
    setConfirmDialog({
      type: 'OPEN_CONFIRM_DIALOG',
      payload: {
        action,
        appointmentId,
        appointmentData: appointment
      }
    });
    
    // Resetear fecha y hora de reagendamiento si es una acción de reagendar
    if (action === 'reschedule') {
      setRescheduleDate(null);
      setRescheduleTime(null);
    }
  }, []);

  const handleConfirmAction = useCallback(() => {
    if (!confirmDialog.action || !confirmDialog.appointmentId) return;
    
    // Aquí implementaríamos la lógica para cada acción con los datos del estado
    const actionMap: Record<string, () => void> = {
      checkIn: () => {
        // Lógica para marcar paciente como presente
        toast.success("Paciente marcado como presente");
      },
      cancel: () => {
        // Lógica para cancelar cita
        toast.info("Cita cancelada");
      },
      complete: () => {
        // Lógica para marcar consulta como completada
        toast.success("Consulta completada exitosamente");
      },
      noShow: () => {
        // Lógica para marcar como no asistió
        toast.info("Paciente marcado como no asistió");
      },
      reschedule: () => {
        // Lógica para reagendar
        if (rescheduleDate && rescheduleTime) {
          toast.success(`Cita reagendada para ${dateUtils.formatDate(rescheduleDate, "d/MM/yyyy")} a las ${rescheduleTime}`);
        }
      }
    };
    
    // Ejecutamos la acción correspondiente
    const actionFn = actionMap[confirmDialog.action];
    if (actionFn) actionFn();
    
    // Cerramos el diálogo
    setConfirmDialog({ type: 'CLOSE_CONFIRM_DIALOG' });
    
    // Refrescamos datos
    setTimeout(handleRefresh, 500);
  }, [confirmDialog.action, confirmDialog.appointmentId, rescheduleDate, rescheduleTime, handleRefresh]);

  const handleStartSurvey = useCallback((patientId: EntityId, patientName: string, patientLastName: string, patientPhone: string) => {
    const surveyId = generateSurveyId();
    const surveyLink = `https://encuestas.clinica.mx/${surveyId}`;
    
    setSurveyDialogState({
      type: 'OPEN_SURVEY_DIALOG',
      payload: {
        patientId,
        patientName,
        patientLastName,
        patientPhone,
        surveyId,
        surveyLink
      }
    });
  }, []);

  const handleCloseSurveyDialog = useCallback(() => {
    setSurveyDialogState({ type: 'CLOSE_SURVEY_DIALOG' });
  }, []);

  const handleStartInternalSurvey = useCallback((patientId: EntityId, patientName: string, patientLastName: string, patientPhone: string) => {
    // Lógica para iniciar encuesta interna
    toast.success(`Iniciando encuesta para ${patientName}`);
    handleCloseSurveyDialog();
  }, [handleCloseSurveyDialog]);

  // Función memoizada para renderizar el contenido de las citas
  const renderAppointmentsContent = useCallback((appointments: Appointment[], isPast = false) => {
    if (isLoading && isInitialMount) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-md p-4 border">
              <Skeleton className="h-5 w-3/4 mb-3" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex gap-2 mt-4">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (appointments.length === 0) {
      return (
        <div className="text-center p-6 border border-dashed rounded-md bg-slate-50 dark:bg-slate-900">
          <div className="flex justify-center mb-2">
            {isPast ? (
              <ClipboardCheck className="h-10 w-10 text-slate-400" />
            ) : (
              <Calendar className="h-10 w-10 text-slate-400" />
            )}
          </div>
          <h3 className="text-slate-800 dark:text-slate-200 font-medium mb-1">
            {isPast ? "No hay historial de citas" : "No hay citas programadas"}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
            {isPast
              ? "El historial de citas completadas o canceladas aparecerá aquí."
              : "Las citas programadas aparecerán aquí cuando se registren."}
          </p>
          {!isPast && (
            <Button
              variant="outline"
              className="mt-4 border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => setActiveTab('newPatient')}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Crear nueva cita
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {appointments.map((cita) => (
          <AppointmentCard
            key={cita.id}
            appointment={cita}
            isPast={isPast}
            onAction={handleAction}
            onStartSurvey={handleStartSurvey}
            showNoShowOverride={isPast}
          />
        ))}
      </div>
    );
  }, [isLoading, isInitialMount, handleAction, handleStartSurvey]);

  // Efectos
  
  // Cargar datos iniciales cuando el componente se monta
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Aquí podríamos realizar una llamada a una API para obtener las citas
        // Simulamos una carga inicial con un timeout
        setTimeout(() => {
          // Si no hay datos en el contexto, simplemente mostramos el estado vacío
          if (!appointments || appointments.length === 0) {
            console.log('No hay citas disponibles en el contexto');
          }
          setIsLoading(false);
          setIsInitialMount(false);
        }, 1000);
      } catch (error) {
        console.error("Error cargando datos:", error);
        setIsLoading(false);
        setIsInitialMount(false);
        toast.error("Error al cargar los datos");
      }
    };

    fetchData();
  }, [appointments]);

  // Efecto para clasificar las citas cuando se cargan
  useEffect(() => {
    // Verificar que appointments exista y tenga datos
    if (appointments && appointments.length > 0) {
      // Convertir AppointmentData a Appointment
      const adaptedAppointments = appointments.map(adaptAppointmentData);
      
      const classified = {
        today: adaptedAppointments.filter(cita => dateUtils.isToday(cita.fechaConsulta)),
        future: adaptedAppointments.filter(cita => dateUtils.isFuture(cita.fechaConsulta)),
        past: adaptedAppointments.filter(cita => dateUtils.isPast(cita.fechaConsulta) || 
                                         cita.estado === AppointmentStatusEnum.COMPLETADA || 
                                         cita.estado === AppointmentStatusEnum.CANCELADA ||
                                         cita.estado === AppointmentStatusEnum.NO_ASISTIO)
      };
      
      setClassifiedAppointments(classified);
      setFilteredAppointments(classified);
      
      // Marcar que ya no estamos en el montaje inicial
      setIsInitialMount(false);
    }
  }, [appointments]);

  // Efecto para filtrar las citas cuando cambian los filtros
  useEffect(() => {
    // Aplicar filtros a las citas clasificadas
    const applyFilters = (appointments: Appointment[]): Appointment[] => {
      let filtered = [...appointments];
      
      // Filtrar por término de búsqueda
      if (filterState.searchTerm) {
        const searchTermLower = filterState.searchTerm.toLowerCase();
        filtered = filtered.filter(cita => 
          cita.nombre.toLowerCase().includes(searchTermLower) ||
          cita.apellidos.toLowerCase().includes(searchTermLower) ||
          cita.motivoConsulta.toLowerCase().includes(searchTermLower)
        );
      }
      
      // Filtrar por estado
      if (filterState.statusFilter !== 'all') {
        filtered = filtered.filter(cita => cita.estado === filterState.statusFilter);
      }
      
      // Filtrar por rango de fechas
      if (filterState.dateRange.from || filterState.dateRange.to) {
        filtered = filtered.filter(cita => {
          const citaDate = dateUtils.parseDate(cita.fechaConsulta);
          if (!citaDate) return false;
          
          const fromDate = filterState.dateRange.from ? startOfDay(filterState.dateRange.from) : null;
          const toDate = filterState.dateRange.to ? startOfDay(filterState.dateRange.to) : null;
          
          if (fromDate && toDate) {
            return !isBefore(citaDate, fromDate) && !isAfter(citaDate, toDate);
          } else if (fromDate) {
            return !isBefore(citaDate, fromDate);
          } else if (toDate) {
            return !isAfter(citaDate, toDate);
          }
          
          return true;
        });
      }
      
      // Ordenar
      if (filterState.sortField) {
        filtered.sort((a, b) => {
          const direction = filterState.sortDirection === 'asc' ? 1 : -1;
          
          switch (filterState.sortField) {
            case 'nombre':
              return (a.nombre.localeCompare(b.nombre)) * direction;
            case 'fecha':
              const dateA = dateUtils.parseDate(a.fechaConsulta);
              const dateB = dateUtils.parseDate(b.fechaConsulta);
              return ((dateA?.getTime() || 0) - (dateB?.getTime() || 0)) * direction;
            case 'hora':
              return a.horaConsulta.localeCompare(b.horaConsulta) * direction;
            case 'motivo':
              return a.motivoConsulta.localeCompare(b.motivoConsulta) * direction;
            case 'estado':
              return a.estado.localeCompare(b.estado) * direction;
            default:
              return 0;
          }
        });
      }
      
      return filtered;
    };
    
    // Aplicar filtros a todas las categorías
    setFilteredAppointments({
      today: applyFilters(classifiedAppointments.today),
      future: applyFilters(classifiedAppointments.future),
      past: applyFilters(classifiedAppointments.past)
    });
  }, [filterState, classifiedAppointments]);

  // Renderizado del componente principal
  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Tarjeta principal de gestión de citas */}
      <Card className="w-full overflow-hidden shadow-md hover:shadow-lg transition-all border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-6">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Users className="h-5 w-5 text-primary" />
              <span>Gestión de Citas</span>
              {isLoading && !isInitialMount && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent text-primary ml-2"></span>
              )}
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Control de admisión y seguimiento de pacientes.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value)} 
            className="w-full"
          >
            <div className="px-6 pt-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <TabsList className="grid grid-cols-2 sm:grid-cols-5 gap-1">
                  <TabsTrigger 
                    value="newPatient" 
                    className={cn(
                      "data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/50 transition-all", 
                      isInitialMount && activeTab !== "newPatient" ? "opacity-0" : "opacity-100"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <UserPlus className="h-4 w-4" />
                      <span>Nuevo</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="pendingList" 
                    className={cn(
                      "data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/50 transition-all", 
                      isInitialMount && activeTab !== "pendingList" ? "opacity-0" : "opacity-100"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>Pendientes</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="today" 
                    className={cn(
                      "data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/50 transition-all", 
                      isInitialMount && activeTab !== "today" ? "opacity-0" : "opacity-100"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>Hoy</span>
                      {classifiedAppointments.today.length > 0 && !isLoading && (
                        <Badge 
                          variant="outline" 
                          className="ml-1 bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 px-1.5 py-0.5 text-xs"
                        >
                          {classifiedAppointments.today.length}
                        </Badge>
                      )}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="future" 
                    className={cn(
                      "data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/50 transition-all", 
                      isInitialMount && activeTab !== "future" ? "opacity-0" : "opacity-100"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>Futuras</span>
                      {classifiedAppointments.future.length > 0 && !isLoading && (
                        <Badge 
                          variant="outline" 
                          className="ml-1 bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 px-1.5 py-0.5 text-xs"
                        >
                          {classifiedAppointments.future.length}
                        </Badge>
                      )}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="past" 
                    className={cn(
                      "data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/50 transition-all", 
                      isInitialMount && activeTab !== "past" ? "opacity-0" : "opacity-100"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <ClipboardCheck className="h-4 w-4" />
                      <span>Historial</span>
                      {classifiedAppointments.past.length > 0 && !isLoading && (
                        <Badge 
                          variant="outline" 
                          className="ml-1 bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 px-1.5 py-0.5 text-xs"
                        >
                          {classifiedAppointments.past.length}
                        </Badge>
                      )}
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              {/* Filtros solo para las pestañas de listado de citas */}
              {["today", "future", "past"].includes(activeTab) && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Filter className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Buscar y Filtrar Citas
                    </span>
                  </div>
                  <FilterControls 
                    filters={filterState} 
                    onUpdateFilters={handleUpdateFilters} 
                    onClearFilters={handleClearFilters} 
                    onRefresh={handleRefresh} 
                  />
                </div>
              )}
            </div>

            <div className="p-6 pt-0">
              <TabsContent value="newPatient" className={cn("mt-0 transition-all", isInitialMount && activeTab !== "newPatient" ? "opacity-0" : "opacity-100")}>
                <NewPatientForm mode="registerAndSchedule" onSuccess={handleNewPatientSuccess} />
              </TabsContent>
              <TabsContent value="pendingList" className={cn("mt-0 transition-all", isInitialMount && activeTab !== "pendingList" ? "opacity-0" : "opacity-100")}>
                <PatientManagement />
              </TabsContent>
              <TabsContent value="today" className="m-0 py-2">
                {renderAppointmentsContent(filteredAppointments.today)}
              </TabsContent>
              <TabsContent value="future" className="m-0 py-2">
                {renderAppointmentsContent(filteredAppointments.future)}
              </TabsContent>
              <TabsContent value="past" className={cn("mt-0 transition-all", isInitialMount && activeTab !== "past" ? "opacity-0" : "opacity-100")}>
                {renderAppointmentsContent(filteredAppointments.past, true)}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Diálogo para compartir encuesta */}
      <SurveyShareDialog
        isOpen={surveyDialogState.isOpen}
        patient={{
          id: surveyDialogState.patientId,
          nombre: surveyDialogState.patientName,
          apellidos: surveyDialogState.patientLastName,
          telefono: surveyDialogState.patientPhone,
        }}
        surveyLink={surveyDialogState.surveyLink}
        onStartInternal={() => handleStartInternalSurvey(surveyDialogState.patientId, surveyDialogState.patientName, surveyDialogState.patientLastName, surveyDialogState.patientPhone)}
        onClose={handleCloseSurveyDialog}
      />

      {/* Diálogo de confirmación para acciones */}
      <AlertDialog 
        open={confirmDialog.isOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ type: 'RESET_CONFIRM_DIALOG' });
          }
        }}
      >
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
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        <span>{dateUtils.formatDate(confirmDialog.appointmentData.fechaConsulta, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }, "Fecha inválida")}</span>
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
                        <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>El paciente aparecerá en el dashboard como pendiente de consulta.</span>
                      </div>
                    )}
                    {confirmDialog.action === "cancel" && (
                      <div className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                        <span>Esta acción no se puede deshacer.</span>
                      </div>
                    )}
                    {confirmDialog.action === "complete" && (
                      <div className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 text-sky-500 mt-0.5 flex-shrink-0" />
                        <span>El paciente pasará a estado de seguimiento.</span>
                      </div>
                    )}
                    {confirmDialog.action === "noShow" && (
                      <div className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span>Se marcará que el paciente no asistió a la cita.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4">
                    <RescheduleDatePicker 
                      date={rescheduleDate} 
                      time={rescheduleTime} 
                      onDateChange={(date) => setRescheduleDate(date)} 
                      onTimeChange={(time) => setRescheduleTime(time)} 
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
              {confirmDialog.action === "cancel" && "Confirmar Cancelación"}
              {confirmDialog.action === "complete" && "Completar Consulta"}
              {confirmDialog.action === "noShow" && "Confirmar No Asistencia"}
              {confirmDialog.action === "reschedule" && "Confirmar Reagendamiento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PatientAdmission;
