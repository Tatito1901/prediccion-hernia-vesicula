import type React from "react"
import { 
  useState, 
  useMemo, 
  useCallback, 
  useEffect, 
  memo, 
  lazy, 
  Suspense,
  type FC 
} from "react"
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
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
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
import { useMediaQuery } from "@/hooks/use-media-query"
import { toast } from "sonner"
import { useAppContext } from "@/lib/context/app-context"
import { generateSurveyId } from "@/lib/form-utils"

// Lazy loading para componentes pesados
const NewPatientForm = lazy(() => import("./new-patient-form").then(module => ({ default: module.NewPatientForm })))
const SurveyShareDialog = lazy(() => import("@/components/surveys/survey-share-dialog").then(module => ({ default: module.SurveyShareDialog })))
const AppointmentCard = lazy(() => import('./patient-card').then(module => ({ default: module.AppointmentCard })))

// ============ TIPOS OPTIMIZADOS ============
import { type AppointmentStatus, AppointmentStatusEnum, type AppointmentData } from "@/app/dashboard/data-model"

type EntityId = string
type ISODateString = string
type FormattedTimeString = `${number}:${number}`

export type ConfirmAction = "checkIn" | "cancel" | "complete" | "noShow" | "reschedule" | null

export interface Appointment {
  id: EntityId
  nombre: string
  apellidos: string
  telefono: string
  fechaConsulta: ISODateString | Date
  horaConsulta: FormattedTimeString
  motivoConsulta: string
  estado: AppointmentStatusEnum
  patientId?: EntityId
}

interface FilterState {
  searchTerm: string
  statusFilter: AppointmentStatus | "all"
  sortField: string | null
}

interface AppointmentLists {
  past: Appointment[]
  today: Appointment[]
  future: Appointment[]
}

// ============ UTILIDADES OPTIMIZADAS ============

// Adaptador optimizado y memoizado
const adaptAppointmentData = (appointment: AppointmentData): Appointment => ({
  id: appointment.id,
  nombre: appointment.paciente?.split(' ')[0] || 'Sin nombre',
  apellidos: appointment.paciente?.split(' ').slice(1).join(' ') || 'Sin apellido',
  telefono: appointment.telefono || '',
  fechaConsulta: appointment.fechaConsulta,
  horaConsulta: appointment.horaConsulta as FormattedTimeString,
  motivoConsulta: appointment.motivoConsulta || '',
  estado: appointment.estado as unknown as AppointmentStatusEnum,
  patientId: appointment.patientId
})

// Utilidades de fecha simplificadas
const dateUtils = {
  parseDate: (dateInput: string | Date | undefined | null): Date | null => {
    if (!dateInput) return null
    if (dateInput instanceof Date) return !isNaN(dateInput.getTime()) ? dateInput : null
    const date = new Date(dateInput)
    return !isNaN(date.getTime()) ? date : null
  },

  formatDate: (date: Date | string | null | undefined, formatStr: string): string => {
    const parsedDate = dateUtils.parseDate(date)
    if (!parsedDate) return ""
    try {
      return format(parsedDate, formatStr, { locale: es })
    } catch {
      return ""
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

// ============ COMPONENTES MEMOIZADOS ============

// Badge de estado optimizado
const AppointmentStatusBadge: FC<{ status: AppointmentStatus }> = memo(({ status }) => {
  const statusConfig = useMemo(() => ({
    [AppointmentStatusEnum.PRESENTE]: {
      className: "bg-teal-100 text-teal-800 dark:bg-teal-800/20 dark:text-teal-400 border-teal-200",
      icon: <CheckCircle className="h-3 w-3" />,
      label: "Presente",
    },
    [AppointmentStatusEnum.CANCELADA]: {
      className: "bg-rose-100 text-rose-800 dark:bg-rose-800/20 dark:text-rose-400 border-rose-200",
      icon: <XCircle className="h-3 w-3" />,
      label: "Cancelada",
    },
    [AppointmentStatusEnum.COMPLETADA]: {
      className: "bg-sky-100 text-sky-800 dark:bg-sky-800/20 dark:text-sky-400 border-sky-200",
      icon: <ClipboardCheck className="h-3 w-3" />,
      label: "Completada",
    },
    [AppointmentStatusEnum.PROGRAMADA]: {
      className: "bg-slate-100 text-slate-800 dark:bg-slate-800/20 dark:text-slate-400 border-slate-200",
      icon: <Clock className="h-3 w-3" />,
      label: "Programada",
    },
    [AppointmentStatusEnum.NO_ASISTIO]: {
      className: "bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-400 border-amber-200",
      icon: <AlertCircle className="h-3 w-3" />,
      label: "No asistió",
    },
    [AppointmentStatusEnum.REAGENDADA]: {
      className: "bg-violet-100 text-violet-800 dark:bg-violet-800/20 dark:text-violet-400 border-violet-200",
      icon: <Calendar className="h-3 w-3" />,
      label: "Reagendada",
    },
    [AppointmentStatusEnum.CONFIRMADA]: {
      className: "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400 border-blue-200",
      icon: <CalendarClock className="h-3 w-3" />,
      label: "Confirmada",
    },
  }), [])

  const config = statusConfig[status] || {
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400 border-gray-200",
    icon: null,
    label: status,
  }

  return (
    <Badge variant="outline" className={`${config.className} transition-colors border flex items-center gap-1`}>
      {config.icon}
      {config.label}
    </Badge>
  )
})
AppointmentStatusBadge.displayName = "AppointmentStatusBadge"

// Componente de filtros optimizado
const FilterControls: FC<{
  filters: FilterState
  onUpdateFilters: (filters: FilterState) => void
  onClearFilters: () => void
  onRefresh: () => void
}> = memo(({ filters, onUpdateFilters, onClearFilters, onRefresh }) => {
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

  return (
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

        <Button variant="outline" size="icon" onClick={onClearFilters} title="Limpiar filtros">
          <X className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="icon" onClick={onRefresh} title="Actualizar">
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
})
FilterControls.displayName = "FilterControls"

// Selector de fecha para reagendamiento
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
        slots.push(`${hour.toString().padStart(2, "0")}:00`)
        slots.push(`${hour.toString().padStart(2, "0")}:30`)
      }
    }
    return slots
  }, [])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-1.5">
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
              {date ? dateUtils.formatDate(date, "EEEE, d 'de' MMMM") : "Seleccionar fecha"}
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
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <CalendarClock className="h-4 w-4 text-primary" />
          Nueva hora
        </label>
        <Select value={time || ""} onValueChange={onTimeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar hora" />
          </SelectTrigger>
          <SelectContent>
            {timeSlots.map((hora) => (
              <SelectItem key={hora} value={hora}>
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
            <span className="font-medium">
              {dateUtils.formatDate(date, "EEEE, d 'de' MMMM")}
            </span>{" "}
            a las <span className="font-medium">{time}</span>.
          </p>
        </div>
      )}
    </div>
  )
})
RescheduleDatePicker.displayName = "RescheduleDatePicker"

// Componente de carga optimizado
const LoadingSkeleton: FC = memo(() => (
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
))
LoadingSkeleton.displayName = "LoadingSkeleton"

// Estado vacío optimizado
const EmptyState: FC<{ isPast?: boolean; onNewPatient?: () => void }> = memo(({ isPast, onNewPatient }) => (
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
    {!isPast && onNewPatient && (
      <Button
        variant="outline"
        className="mt-4 border-primary/30 text-primary hover:bg-primary/10"
        onClick={onNewPatient}
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Crear nueva cita
      </Button>
    )}
  </div>
))
EmptyState.displayName = "EmptyState"

// ============ COMPONENTE PRINCIPAL OPTIMIZADO ============

const PatientAdmission: FC = () => {
  // Estados optimizados
  const { appointments } = useAppContext()
  const [activeTab, setActiveTab] = useState<string>('today')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    statusFilter: "all",
    sortField: null,
  })

  // Estados para diálogos
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    action: ConfirmAction
    appointmentId: EntityId | null
    appointmentData?: Appointment | null
  }>({
    isOpen: false,
    action: null,
    appointmentId: null,
    appointmentData: null,
  })

  const [surveyDialog, setSurveyDialog] = useState<{
    isOpen: boolean
    patientId: EntityId
    patientName: string
    patientLastName: string
    patientPhone: string
    surveyLink: string
  }>({
    isOpen: false,
    patientId: "",
    patientName: "",
    patientLastName: "",
    patientPhone: "",
    surveyLink: "",
  })

  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null)
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null)

  const isMobile = useMediaQuery("(max-width: 640px)")

  // Clasificación y filtrado de citas optimizado
  const { classifiedAppointments, filteredAppointments } = useMemo(() => {
    if (!appointments || appointments.length === 0) {
      return {
        classifiedAppointments: { today: [], future: [], past: [] },
        filteredAppointments: { today: [], future: [], past: [] }
      }
    }

    const adaptedAppointments = appointments.map(adaptAppointmentData)
    
    const classified: AppointmentLists = {
      today: adaptedAppointments.filter(cita => dateUtils.isToday(cita.fechaConsulta)),
      future: adaptedAppointments.filter(cita => dateUtils.isFuture(cita.fechaConsulta)),
      past: adaptedAppointments.filter(cita => 
        dateUtils.isPast(cita.fechaConsulta) || 
        [AppointmentStatusEnum.COMPLETADA, AppointmentStatusEnum.CANCELADA, AppointmentStatusEnum.NO_ASISTIO].includes(cita.estado)
      )
    }

    // Aplicar filtros
    const applyFilters = (appointmentsToFilter: Appointment[]): Appointment[] => {
      let filtered = [...appointmentsToFilter]
      
      if (filters.searchTerm) {
        const searchTermLower = filters.searchTerm.toLowerCase()
        filtered = filtered.filter(cita => 
          cita.nombre.toLowerCase().includes(searchTermLower) ||
          cita.apellidos.toLowerCase().includes(searchTermLower) ||
          cita.motivoConsulta.toLowerCase().includes(searchTermLower)
        )
      }
      
      if (filters.statusFilter !== 'all') {
        filtered = filtered.filter(cita => cita.estado === filters.statusFilter)
      }
      
      return filtered
    }

    const filtered: AppointmentLists = {
      today: applyFilters(classified.today),
      future: applyFilters(classified.future),
      past: applyFilters(classified.past)
    }

    return { classifiedAppointments: classified, filteredAppointments: filtered }
  }, [appointments, filters])

  // Manejadores optimizados
  const handleUpdateFilters = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters({
      searchTerm: "",
      statusFilter: "all", 
      sortField: null,
    })
  }, [])

  const handleRefresh = useCallback(() => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      toast.success("Datos actualizados")
    }, 1000)
  }, [])

  const handleAction = useCallback((action: ConfirmAction, appointmentId: EntityId, appointment: Appointment) => {
    setConfirmDialog({
      isOpen: true,
      action,
      appointmentId,
      appointmentData: appointment
    })
    
    if (action === 'reschedule') {
      setRescheduleDate(null)
      setRescheduleTime(null)
    }
  }, [])

  const handleConfirmAction = useCallback(async () => {
    if (!confirmDialog.action || !confirmDialog.appointmentId) return
    
    const loadingToastId = toast.loading('Procesando acción...')
    
    try {
      const statusMap = {
        checkIn: AppointmentStatusEnum.PRESENTE,
        cancel: AppointmentStatusEnum.CANCELADA,
        complete: AppointmentStatusEnum.COMPLETADA,
        noShow: AppointmentStatusEnum.NO_ASISTIO,
        reschedule: AppointmentStatusEnum.REAGENDADA
      }

      const body: any = { estado: statusMap[confirmDialog.action] }
      
      if (confirmDialog.action === "reschedule") {
        if (!rescheduleDate || !rescheduleTime) {
          toast.dismiss(loadingToastId)
          toast.error("Seleccione fecha y hora para reagendar")
          return
        }
        body.fechaConsulta = format(rescheduleDate, "yyyy-MM-dd")
        body.horaConsulta = rescheduleTime
      }

      await fetch(`/api/appointments/${confirmDialog.appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      toast.dismiss(loadingToastId)
      toast.success("Acción completada exitosamente")
      
      setConfirmDialog({ isOpen: false, action: null, appointmentId: null })
      handleRefresh()
      
    } catch (error) {
      console.error('Error al ejecutar acción:', error)
      toast.dismiss(loadingToastId)
      toast.error("Error al procesar la acción")
    }
  }, [confirmDialog, rescheduleDate, rescheduleTime, handleRefresh])

  const handleStartSurvey = useCallback((patientId: EntityId, patientName: string, patientLastName: string, patientPhone: string) => {
    const surveyId = generateSurveyId()
    const surveyLink = `https://encuestas.clinica.mx/${surveyId}`
    
    setSurveyDialog({
      isOpen: true,
      patientId,
      patientName,
      patientLastName,
      patientPhone,
      surveyLink
    })
  }, [])

  const handleNewPatientSuccess = useCallback(() => {
    toast.success("Paciente registrado correctamente")
    handleRefresh()
  }, [handleRefresh])

  // Función de renderizado optimizada
  const renderAppointmentsContent = useCallback((appointmentsToRender: Appointment[], isPast = false) => {
    if (isLoading) {
      return <LoadingSkeleton />
    }

    if (appointmentsToRender.length === 0) {
      return <EmptyState isPast={isPast} onNewPatient={() => setActiveTab('newPatient')} />
    }

    return (
      <div className="space-y-4">
        <Suspense fallback={<LoadingSkeleton />}>
          {appointmentsToRender.map((cita) => (
            <AppointmentCard 
              key={cita.id}
              appointment={cita}
              isPast={isPast}
              onAction={handleAction}
              onStartSurvey={handleStartSurvey}
              showNoShowOverride={isPast}
            />
          ))}
        </Suspense>
      </div>
    )
  }, [isLoading, handleAction, handleStartSurvey])

  // Efecto para carga inicial
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [appointments])

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="w-full overflow-hidden shadow-md hover:shadow-lg transition-shadow border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-6">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Users className="h-5 w-5 text-primary" />
              <span>Gestión de Citas</span>
              {isLoading && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent text-primary ml-2"></span>
              )}
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Control de admisión y seguimiento de pacientes.
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                  <TabsTrigger value="newPatient" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/50">
                    <div className="flex items-center gap-1.5">
                      <UserPlus className="h-4 w-4" />
                      <span className={isMobile ? "hidden" : ""}>Nuevo</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="today" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/50">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span className={isMobile ? "hidden" : ""}>Hoy</span>
                      {classifiedAppointments.today.length > 0 && !isLoading && (
                        <Badge variant="outline" className="ml-1 bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 px-1.5 py-0.5 text-xs">
                          {classifiedAppointments.today.length}
                        </Badge>
                      )}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="future" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/50">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span className={isMobile ? "hidden" : ""}>Futuras</span>
                      {classifiedAppointments.future.length > 0 && !isLoading && (
                        <Badge variant="outline" className="ml-1 bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 px-1.5 py-0.5 text-xs">
                          {classifiedAppointments.future.length}
                        </Badge>
                      )}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="past" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/50">
                    <div className="flex items-center gap-1.5">
                      <ClipboardCheck className="h-4 w-4" />
                      <span className={isMobile ? "hidden" : ""}>Historial</span>
                      {classifiedAppointments.past.length > 0 && !isLoading && (
                        <Badge variant="outline" className="ml-1 bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 px-1.5 py-0.5 text-xs">
                          {classifiedAppointments.past.length}
                        </Badge>
                      )}
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              {["today", "future", "past"].includes(activeTab) && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Filter className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Buscar y Filtrar Citas
                    </span>
                  </div>
                  <FilterControls 
                    filters={filters} 
                    onUpdateFilters={handleUpdateFilters} 
                    onClearFilters={handleClearFilters} 
                    onRefresh={handleRefresh} 
                  />
                </div>
              )}
            </div>

            <div className="p-6 pt-0">
              <TabsContent value="newPatient" className="mt-0">
                <Suspense fallback={<LoadingSkeleton />}>
                  <NewPatientForm mode="registerAndSchedule" onSuccess={handleNewPatientSuccess} />
                </Suspense>
              </TabsContent>
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

      {/* Diálogo para compartir encuesta - Lazy loaded */}
      <Suspense fallback={null}>
        <SurveyShareDialog
          isOpen={surveyDialog.isOpen}
          patient={{
            id: surveyDialog.patientId,
            nombre: surveyDialog.patientName,
            apellidos: surveyDialog.patientLastName,
            telefono: surveyDialog.patientPhone,
          }}
          surveyLink={surveyDialog.surveyLink}
          onStartInternal={() => {
            toast.success(`Iniciando encuesta para ${surveyDialog.patientName}`)
            setSurveyDialog(prev => ({ ...prev, isOpen: false }))
          }}
          onClose={() => setSurveyDialog(prev => ({ ...prev, isOpen: false }))}
        />
      </Suspense>

      {/* Diálogo de confirmación optimizado */}
      <AlertDialog 
        open={confirmDialog.isOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ isOpen: false, action: null, appointmentId: null })
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-[450px] border-slate-200 dark:border-slate-800 shadow-lg">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-2">
              {confirmDialog.action === "checkIn" && <CheckCircle className="h-5 w-5 text-primary" />}
              {confirmDialog.action === "cancel" && <XCircle className="h-5 w-5 text-rose-600" />}
              {confirmDialog.action === "complete" && <ClipboardCheck className="h-5 w-5 text-sky-600" />}
              {confirmDialog.action === "noShow" && <AlertCircle className="h-5 w-5 text-amber-600" />}
              {confirmDialog.action === "reschedule" && <CalendarDays className="h-5 w-5 text-primary" />}
              
              <AlertDialogTitle className={cn(
                confirmDialog.action === "checkIn" && "text-primary",
                confirmDialog.action === "cancel" && "text-rose-700",
                confirmDialog.action === "complete" && "text-sky-700",
                confirmDialog.action === "noShow" && "text-amber-700",
                confirmDialog.action === "reschedule" && "text-primary"
              )}>
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
                        <span>{dateUtils.formatDate(confirmDialog.appointmentData.fechaConsulta, "EEEE, d 'de' MMMM")}</span>
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
                
                {confirmDialog.action === "reschedule" ? (
                  <div className="mt-4">
                    <RescheduleDatePicker 
                      date={rescheduleDate} 
                      time={rescheduleTime} 
                      onDateChange={setRescheduleDate} 
                      onTimeChange={setRescheduleTime} 
                    />
                  </div>
                ) : (
                  <div className="mt-4 text-slate-600 dark:text-slate-300 p-3 bg-primary/5 rounded-md border border-primary/10">
                    <div className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>
                        {confirmDialog.action === "checkIn" && "El paciente aparecerá en el dashboard como pendiente de consulta."}
                        {confirmDialog.action === "cancel" && "Esta acción no se puede deshacer."}
                        {confirmDialog.action === "complete" && "El paciente pasará a estado de seguimiento."}
                        {confirmDialog.action === "noShow" && "Se marcará que el paciente no asistió a la cita."}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction} 
              disabled={confirmDialog.action === "reschedule" && (!rescheduleDate || !rescheduleTime)}
              className={cn(
                confirmDialog.action === "checkIn" && "bg-primary hover:bg-primary/90",
                confirmDialog.action === "cancel" && "bg-rose-600 hover:bg-rose-700",
                confirmDialog.action === "complete" && "bg-sky-600 hover:bg-sky-700",
                confirmDialog.action === "noShow" && "bg-amber-600 hover:bg-amber-700",
                confirmDialog.action === "reschedule" && "bg-primary hover:bg-primary/90",
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
  )
}

export default PatientAdmission