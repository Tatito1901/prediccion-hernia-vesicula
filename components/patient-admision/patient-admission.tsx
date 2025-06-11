import { Label } from "@/components/ui/label"
import React from "react"
import { 
  useState, 
  useMemo, 
  useCallback, 
  memo, 
  useTransition, 
  useEffect, 
  lazy, 
  Suspense,
  type ComponentType,
  type ReactNode,
  type ChangeEvent
} from "react"
import {
  Search,
  CalendarIcon,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  CalendarDaysIcon,
  Users,
  ClipboardCheck,
  AlertCircle,
  CalendarClock,
  CalendarCheck,
  RefreshCcw,
  X,
  ChevronDown,
  ListFilter,
  History,
  UserRoundPlus,
  CalendarHeart,
  CalendarX2,
  type LucideIcon,
  Filter,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, isToday as dateIsToday, isBefore, isAfter, startOfDay, parseISO, isValid } from "date-fns"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { toast } from "sonner"
import { useAppContext } from "@/lib/context/app-context"
import { generateSurveyId } from "@/lib/form-utils"
import { usePatientAdmissionFlow } from "./use-patient-admission-flow"
import {
  type AppointmentStatus as AppointmentStatusType,
  AppointmentStatusEnum,
  type AppointmentData,
} from "@/app/dashboard/data-model"

// Importar componentes
import { Calendar } from "@/components/ui/calendar"

// Lazy load components
const NewPatientForm = lazy(() => import("./new-patient-form").then(module => ({ 
  default: module.NewPatientForm 
})))
const SurveyShareDialog = lazy(() => import("@/components/surveys/survey-share-dialog").then(module => ({ 
  default: module.SurveyShareDialog 
})))
const AppointmentCard = lazy(() => import("./patient-card").then(module => ({ 
  default: module.AppointmentCard 
})))

// =================================================================
// TIPOS
// =================================================================
type EntityId = string
type ISODateString = string
type FormattedTimeString = `${number}:${number}`
type TabValue = "newPatient" | "today" | "future" | "past"
export type ConfirmAction = "checkIn" | "cancel" | "complete" | "noShow" | "reschedule"
type AppointmentActionType = ConfirmAction | "startSurvey" | "viewPatientHistory"

export interface Appointment {
  readonly id: EntityId
  readonly nombre: string
  readonly apellidos: string
  readonly telefono: string
  readonly fechaConsulta: ISODateString | Date
  readonly horaConsulta: FormattedTimeString
  readonly dateTime: Date
  readonly motivoConsulta?: string
  readonly estado: AppointmentStatusEnum
  readonly patientId?: EntityId
}

interface FilterState {
  readonly searchTerm: string
  readonly statusFilter: AppointmentStatusType | "all"
  readonly sortField: string | null
}

interface ConfirmDialogState {
  readonly isOpen: boolean
  readonly action: ConfirmAction | null
  readonly appointmentId: EntityId | null
  readonly appointmentData?: Appointment | null
}

interface SurveyDialogState {
  readonly isOpen: boolean
  readonly patientId: EntityId
  readonly patientName: string
  readonly patientLastName: string
  readonly patientPhone: string
  readonly surveyLink: string
}

interface RescheduleState {
  readonly appointmentId: EntityId | null
  readonly date: Date | null
  readonly time: string | null
}

interface StatusConfig {
  readonly className: string
  readonly icon: LucideIcon
  readonly label: string
}

interface AppointmentCounts {
  readonly today: number
  readonly future: number
  readonly past: number
}

interface TabConfig {
  readonly id: TabValue
  readonly icon: LucideIcon
  readonly label: string
  readonly countKey: keyof AppointmentCounts | null
}

// =================================================================
// UTILIDADES Y CONSTANTES
// =================================================================
const dateUtils = {
  parseToDate: (dateInput: string | Date | undefined | null): Date | null => {
    if (!dateInput) return null
    const date = dateInput instanceof Date ? dateInput : parseISO(String(dateInput))
    return !isNaN(date.getTime()) ? date : null
  },
  
  formatDisplay: (date: Date | string | null | undefined, formatStr = "EEEE, d 'de' MMMM"): string => {
    const parsedDate = dateUtils.parseToDate(date)
    if (!parsedDate) return "Fecha inválida"
    try {
      return format(parsedDate, formatStr, { locale: es })
    } catch {
      return "Error de formato"
    }
  },
  
  formatForStorage: (date: Date | null): ISODateString | "" => {
    return date ? format(date, "yyyy-MM-dd") : ""
  },
  
  isToday: (date: Date | string | null | undefined): boolean => {
    const parsedDate = dateUtils.parseToDate(date)
    return !!parsedDate && dateIsToday(parsedDate)
  },
  
  isPast: (date: Date | string | null | undefined): boolean => {
    const parsedDate = dateUtils.parseToDate(date)
    return !!parsedDate && isBefore(parsedDate, startOfDay(new Date()))
  },
  
  isFuture: (date: Date | string | null | undefined): boolean => {
    const parsedDate = dateUtils.parseToDate(date)
    return !!parsedDate && isAfter(parsedDate, startOfDay(new Date())) && !dateIsToday(parsedDate)
  },
} as const

const STATUS_CONFIG: Record<AppointmentStatusEnum, StatusConfig> = {
  [AppointmentStatusEnum.PRESENTE]: {
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700",
    icon: CheckCircle,
    label: "En espera",
  },
  [AppointmentStatusEnum.CANCELADA]: {
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700",
    icon: XCircle,
    label: "Cancelada",
  },
  [AppointmentStatusEnum.COMPLETADA]: {
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700",
    icon: ClipboardCheck,
    label: "Completada",
  },
  [AppointmentStatusEnum.PROGRAMADA]: {
    className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700",
    icon: Clock,
    label: "Programada",
  },
  [AppointmentStatusEnum.NO_ASISTIO]: {
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700",
    icon: AlertCircle,
    label: "No Asistió",
  },
  [AppointmentStatusEnum.REAGENDADA]: {
    className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700",
    icon: CalendarDaysIcon,
    label: "Reagendada",
  },
  [AppointmentStatusEnum.CONFIRMADA]: {
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700",
    icon: CalendarClock,
    label: "Confirmada",
  },
} as const

const TIME_SLOTS: readonly string[] = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8
  const minute = (i % 2) * 30
  if (hour >= 20) return null
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
}).filter((slot): slot is string => slot !== null)

const adaptAppointmentData = (appointment: AppointmentData): Appointment => {
  let nombre = "N/A"
  let apellidos = ""
  
  if (appointment.paciente?.trim()) {
    const nombreCompleto = appointment.paciente.trim()
    const primerEspacio = nombreCompleto.indexOf(" ")
    if (primerEspacio > 0) {
      nombre = nombreCompleto.substring(0, primerEspacio)
      apellidos = nombreCompleto.substring(primerEspacio + 1)
    } else {
      nombre = nombreCompleto
    }
  }
  
  const fecha = dateUtils.parseToDate(appointment.fechaConsulta)
  const hora = appointment.horaConsulta as FormattedTimeString
  let combinedDateTime = new Date(0)
  
  if (fecha && hora && /^\d{2}:\d{2}$/.test(hora)) {
    const [hours, minutes] = hora.split(":").map(Number)
    combinedDateTime = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), hours, minutes)
  }
  
  return {
    id: appointment.id,
    nombre,
    apellidos,
    telefono: appointment.telefono || "N/A",
    fechaConsulta: appointment.fechaConsulta,
    horaConsulta: hora,
    dateTime: combinedDateTime,
    motivoConsulta: appointment.motivoConsulta || "N/A",
    estado: appointment.estado as AppointmentStatusEnum,
    patientId: appointment.patientId,
  }
}

// =================================================================
// COMPONENTES OPTIMIZADOS
// =================================================================

interface AppointmentStatusBadgeProps {
  status: AppointmentStatusType
}

const AppointmentStatusBadge = memo<AppointmentStatusBadgeProps>(({ status }) => {
  const config = STATUS_CONFIG[status as AppointmentStatusEnum] || {
    className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700",
    icon: AlertCircle,
    label: status,
  }
  
  const IconComponent = config.icon
  
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs px-2.5 py-1 border flex items-center gap-1.5 font-medium rounded-md",
        config.className
      )}
    >
      <IconComponent className="h-3 w-3 shrink-0" />
      <span className="truncate">{config.label}</span>
    </Badge>
  )
})
AppointmentStatusBadge.displayName = "AppointmentStatusBadge"

interface FilterControlsProps {
  filters: FilterState
  onUpdateFilters: (filters: Partial<FilterState>) => void
  onClearFilters: () => void
  onRefresh: () => void
  isLoading: boolean
}

// Lazy loading fallback for components
const ComponentLoadingFallback = () => (
  <div className="w-full p-4 border rounded-md animate-pulse bg-slate-100 dark:bg-slate-800/50">
    <div className="h-8 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
    <div className="h-6 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
  </div>
);

// Lazy load the FilterControls component
const FilterControlsLazy = lazy(() => import('./filter-controls').then(module => ({
  default: module.FilterControls
})))

// Create a wrapper component that adapts our FilterState to the one from filter-controls.tsx
const FilterControlsAdapter = memo<FilterControlsProps>(({ 
  filters, 
  onUpdateFilters, 
  onClearFilters, 
  onRefresh,
  isLoading 
}) => {
  // Convert our FilterState to the format expected by FilterControls
  const adaptedFilters = {
    searchTerm: filters.searchTerm,
    statusFilter: filters.statusFilter === 'all' ? 'all' : filters.statusFilter,
    sortField: filters.sortField || undefined
  }

  // Create an adapter for the update function
  const handleUpdateFilters = (newFilters: any) => {
    onUpdateFilters({
      searchTerm: newFilters.searchTerm,
      statusFilter: newFilters.statusFilter,
      sortField: newFilters.sortField || null
    })
  }

  return (
    <FilterControlsLazy
      filters={adaptedFilters}
      onUpdateFilters={handleUpdateFilters}
      onClearFilters={onClearFilters}
      onRefresh={onRefresh}
    />
  )
})

// Our original component
const FilterControlsMemoized = memo<FilterControlsProps>(({ 
  filters, 
  onUpdateFilters, 
  onClearFilters, 
  onRefresh, 
  isLoading 
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const isMobile = useMediaQuery("(max-width: 640px)")
  
  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => onUpdateFilters({ searchTerm: e.target.value }),
    [onUpdateFilters]
  )
  
  const handleStatusChange = useCallback(
    (value: string) => onUpdateFilters({ statusFilter: value as AppointmentStatusType | "all" }),
    [onUpdateFilters]
  )
  
  const toggleExpanded = useCallback(() => setIsExpanded(prev => !prev), [])
  
  const hasActiveFilters = filters.searchTerm !== "" || filters.statusFilter !== "all"
  
  const commonControls = (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input 
          type="text" 
          placeholder="Buscar paciente..." 
          className="pl-10 h-10 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" 
          value={filters.searchTerm} 
          onChange={handleSearchChange} 
          aria-label="Buscar paciente"
        />
      </div>
      <Select value={filters.statusFilter} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-full sm:w-48 h-10 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" aria-label="Filtrar por estado">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los Estados</SelectItem>
          {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
  
  if (!isMobile) {
    return (
      <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
        {commonControls}
        <div className="flex gap-2 shrink-0">
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClearFilters} 
              title="Limpiar filtros" 
              className="h-10 w-10 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onRefresh} 
            title="Actualizar citas" 
            className="h-10 w-10 hover:bg-slate-200 dark:hover:bg-slate-700" 
            disabled={isLoading}
          >
            <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="space-y-3">
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs bg-slate-200 dark:bg-slate-700">
              Activos
            </Badge>
          )}
        </div>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 hover:bg-slate-200 dark:hover:bg-slate-700"
            onClick={toggleExpanded}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
        {commonControls}
        <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearFilters} 
            className="flex-1 hover:bg-slate-200 dark:hover:bg-slate-700"
            disabled={!hasActiveFilters}
          >
            <X className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRefresh} 
            className="flex-1 hover:bg-slate-200 dark:hover:bg-slate-700" 
            disabled={isLoading}
          >
            <RefreshCcw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
})
FilterControlsMemoized.displayName = "FilterControls"

interface RescheduleDatePickerProps {
  rescheduleState: RescheduleState
  onStateChange: (newState: Partial<RescheduleState>) => void
}

// Lazy load RescheduleDatePicker from separate file
const RescheduleDatePicker = lazy(() => import('./patient-admission.reschedule').then(module => ({
  default: module.RescheduleDatePicker
})))

const AppointmentCardSkeleton = memo(() => (
  <Card className="p-4 shadow-sm bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32 bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-3 w-20 bg-slate-200 dark:bg-slate-700" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-8 flex-1 bg-slate-200 dark:bg-slate-700" />
        <Skeleton className="h-8 flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  </Card>
))
AppointmentCardSkeleton.displayName = "AppointmentCardSkeleton"

const LoadingSkeleton = memo(() => (
  <div className="space-y-4">
    {Array.from({ length: 3 }, (_, i) => (
      <AppointmentCardSkeleton key={i} />
    ))}
  </div>
))
LoadingSkeleton.displayName = "LoadingSkeleton"

interface EmptyStateProps {
  title: string
  description: string
  icon?: LucideIcon
  onAction?: () => void
  actionLabel?: string
}

const EmptyState = memo<EmptyStateProps>(({ 
  title, 
  description, 
  icon: IconComponent, 
  onAction, 
  actionLabel 
}) => (
  <div className="text-center p-12 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 min-h-[320px] flex flex-col items-center justify-center">
    {IconComponent && (
      <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <IconComponent className="h-8 w-8 text-slate-500 dark:text-slate-400" />
      </div>
    )}
    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
    <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
      {description}
    </p>
    {onAction && actionLabel && (
      <Button 
        variant="secondary" 
        className="gap-2" 
        onClick={onAction}
      >
        <UserRoundPlus className="h-4 w-4" />
        {actionLabel}
      </Button>
    )}
  </div>
))
EmptyState.displayName = "EmptyState"

interface MobileTabsProps {
  activeTab: TabValue
  onTabChange: (tab: TabValue) => void
  appointmentCounts: AppointmentCounts
  isLoading: boolean
}

const MobileTabs = memo<MobileTabsProps>(({ 
  activeTab, 
  onTabChange, 
  appointmentCounts, 
  isLoading 
}) => {
  const tabsConfig: TabConfig[] = [
    { id: "newPatient", icon: UserRoundPlus, label: "Nuevo", countKey: null },
    { id: "today", icon: Clock, label: "Hoy", countKey: "today" },
    { id: "future", icon: CalendarHeart, label: "Futuras", countKey: "future" },
    { id: "past", icon: History, label: "Historial", countKey: "past" },
  ]
  
  return (
    <div className="grid grid-cols-4 gap-2 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
      {tabsConfig.map((tab) => {
        const Icon = tab.icon
        const count = tab.countKey ? appointmentCounts[tab.countKey] : 0
        const isActive = activeTab === tab.id
        
        return (
          <div key={tab.id} className="relative">
            <Button 
              variant={isActive ? "secondary" : "ghost"} 
              size="sm" 
              className={cn(
                "flex flex-col items-center justify-center gap-1 h-auto py-3 px-2 text-xs font-medium w-full",
                isActive 
                  ? "bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-slate-100" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              )} 
              onClick={() => onTabChange(tab.id)}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate w-full">{tab.label}</span>
            </Button>
            {tab.countKey && count > 0 && !isLoading && (
              <Badge 
                variant="default" 
                className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] text-[10px] px-1 rounded-full bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-900"
              >
                {count > 99 ? "99+" : count}
              </Badge>
            )}
          </div>
        )
      })}
    </div>
  )
})
MobileTabs.displayName = "MobileTabs"

// =================================================================
// COMPONENTE PRINCIPAL
// =================================================================
const PatientAdmission = memo(() => {
  const {
    appointments: rawAppointments = [], 
    classifiedAppointments, 
    isLoadingAppointments,
    errorAppointments,
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    refetchAppointments,
  } = usePatientAdmissionFlow()

  const {
    patients,
    updateAppointment,
    updateAppointmentStatus,
  } = useAppContext()

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    action: null,
    appointmentId: null,
    appointmentData: null
  })
  
  const [surveyDialog, setSurveyDialog] = useState<SurveyDialogState>({
    isOpen: false,
    patientId: "",
    patientName: "",
    patientLastName: "",
    patientPhone: "",
    surveyLink: ""
  })
  
  const [rescheduleState, setRescheduleState] = useState<RescheduleState>({
    appointmentId: null,
    date: null,
    time: null
  })
  
  const [isPending, startTransition] = useTransition()
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isTablet = useMediaQuery("(max-width: 1024px)")

  const processedAppointments = useMemo(
    () => (rawAppointments || []).map(adaptAppointmentData),
    [rawAppointments]
  )

  const classifiedAndFilteredAppointments = useMemo(() => {
    const today: Appointment[] = []
    const future: Appointment[] = []
    const past: Appointment[] = []
    
    const searchTermLower = filters.searchTerm.toLowerCase()
    
    for (const appt of processedAppointments) {
      const matchesSearch = filters.searchTerm === "" || 
        appt.nombre.toLowerCase().includes(searchTermLower) || 
        appt.apellidos.toLowerCase().includes(searchTermLower) || 
        (appt.motivoConsulta || "").toLowerCase().includes(searchTermLower)
      
      const matchesStatus = filters.statusFilter === "all" || appt.estado === filters.statusFilter
      
      if (matchesSearch && matchesStatus) {
        if (dateUtils.isToday(appt.dateTime)) {
          today.push(appt)
        } else if (dateUtils.isFuture(appt.dateTime)) {
          future.push(appt)
        } else if (dateUtils.isPast(appt.dateTime) || !isValid(appt.dateTime)) {
          past.push(appt)
        }
      }
    }
    
    const sortAppointments = (arr: Appointment[]) => 
      arr.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())
    
    return {
      today: sortAppointments(today),
      future: sortAppointments(future),
      past: past.sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime()),
    }
  }, [processedAppointments, filters])

  const appointmentCounts = useMemo((): AppointmentCounts => ({
    today: classifiedAndFilteredAppointments.today.length,
    future: classifiedAndFilteredAppointments.future.length,
    past: classifiedAndFilteredAppointments.past.length,
  }), [classifiedAndFilteredAppointments])

  const handleUpdateFilters = useCallback((newFilters: Partial<FilterState>) => {
    startTransition(() => {
      setFilters(prev => ({ ...prev, ...newFilters }))
    })
  }, [setFilters])

  const handleClearFilters = useCallback(() => {
    startTransition(() => {
      setFilters({
        searchTerm: "",
        statusFilter: "all",
        sortField: "default"
      })
    })
  }, [setFilters])

  const handleRefresh = useCallback(() => {
    refetchAppointments()
  }, [refetchAppointments])

  const handleAction = useCallback((action: ConfirmAction, appointment: Appointment) => {
    setConfirmDialog({
      isOpen: true,
      action,
      appointmentId: appointment.id,
      appointmentData: appointment
    })
    
    if (action === "reschedule") {
      setRescheduleState({
        appointmentId: appointment.id,
        date: dateUtils.parseToDate(appointment.fechaConsulta),
        time: appointment.horaConsulta
      })
    }
  }, [])

  const handleConfirmAction = useCallback(async () => {
    if (!confirmDialog.action || !confirmDialog.appointmentId) return
    
    const { action, appointmentId } = confirmDialog
    let promise: Promise<any> | undefined

    if (action === "checkIn") {
      promise = updateAppointmentStatus(appointmentId, AppointmentStatusEnum.PRESENTE, "Check-in manual")
    } else if (action === "cancel") {
      promise = updateAppointmentStatus(appointmentId, AppointmentStatusEnum.CANCELADA, "Cancelación manual")
    } else if (action === "complete") {
      promise = updateAppointmentStatus(appointmentId, AppointmentStatusEnum.COMPLETADA, "Consulta completada")
    } else if (action === "noShow") {
      promise = updateAppointmentStatus(appointmentId, AppointmentStatusEnum.NO_ASISTIO, "Paciente no asistió")
    } else if (action === "reschedule") {
      if (!rescheduleState.date || !rescheduleState.time) {
        toast.error("Por favor, seleccione una fecha y hora para reprogramar.")
        return
      }

      const [hours, minutes] = rescheduleState.time.split(':').map(Number)
      const newDate = new Date(rescheduleState.date)
      newDate.setHours(hours, minutes)

      promise = updateAppointmentStatus(
        appointmentId,
        AppointmentStatusEnum.REAGENDADA,
        "Cita reprogramada",
        newDate.toISOString()
      )
    }

    if (promise) {
      toast.promise(promise, {
        loading: "Actualizando...",
        success: "Actualizado correctamente",
        error: "Error al actualizar",
      })
      await promise
      refetchAppointments()
    }

    setConfirmDialog({ isOpen: false, action: null, appointmentId: null, appointmentData: null })
    if (action === "reschedule") {
      setRescheduleState({ appointmentId: null, date: null, time: null })
    }
  }, [confirmDialog, rescheduleState, refetchAppointments, updateAppointmentStatus])

  const handleOpenSurveyDialog = useCallback((appointment: Appointment) => {
    const patient = patients?.find(p => p.id === (appointment.patientId || appointment.id))
    
    if (!patient) {
      toast.error("No se encontró el paciente para esta cita.")
      return
    }

    const patientId = patient.id || '';
    const appointmentId = appointment.id || '';
    const surveyLink = `https://example.com/survey?patientId=${patientId}&appointmentId=${appointmentId}`
    
    setSurveyDialog({
      isOpen: true,
      patientId: patient.id,
      patientName: patient.nombre || '',
      patientLastName: patient.apellidos || '',
      patientPhone: patient.telefono || '',
      surveyLink,
    })
  }, [patients])

  const handleViewPatientHistory = useCallback((patientId: EntityId | undefined) => {
    toast.info(`Ver historial del paciente ${patientId}`)
  }, [])
  
  const renderAppointmentsContent = useCallback((appointmentsToRender: Appointment[], tabKey: TabValue) => {
    if (isLoadingAppointments || isPending) {
      return <LoadingSkeleton />
    }

    if (appointmentsToRender.length === 0) {
      return (
        <EmptyState
          title={`No hay citas ${tabKey === "today" ? "para hoy" : tabKey === "future" ? "futuras" : "pasadas"}`}
          description="Cuando haya citas disponibles, aparecerán aquí."
          icon={CalendarX2}
        />
      )
    }

    return (
      <div className="space-y-4">
        {appointmentsToRender.map((cita) => {
          const patientId = cita.patientId || cita.id;
          const patient = patients?.find(p => p.id === patientId);
          
          const surveyCompleted = Boolean(
            patient?.encuesta?.id &&
            patient?.encuesta?.submitted_at
          );
          
          const requireSurvey = [
            AppointmentStatusEnum.PRESENTE, 
            AppointmentStatusEnum.CONFIRMADA,
            AppointmentStatusEnum.PROGRAMADA
          ].includes(cita.estado);
          
          const disableActions = requireSurvey && !surveyCompleted;
          
          return (
            <Suspense fallback={<AppointmentCardSkeleton />}>
              <AppointmentCard
                key={cita.id}
                appointment={cita}
                onAction={(action, appointmentId) => {
                  const appointment = appointmentsToRender.find(apt => apt.id === appointmentId);
                  if (appointment) {
                    handleAction(action as ConfirmAction, appointment);
                  }
                }}
                onStartSurvey={(appointmentId) => {
                  const appointment = appointmentsToRender.find(apt => apt.id === appointmentId);
                  if (appointment) {
                    handleOpenSurveyDialog(appointment);
                  }
                }}
                onViewHistory={(patientId) => handleViewPatientHistory(patientId)}
                disableActions={disableActions}
                surveyCompleted={surveyCompleted}
              />
            </Suspense>
          )
        })}
      </div>
    )
  }, [isLoadingAppointments, isPending, handleAction, handleOpenSurveyDialog, patients, handleViewPatientHistory])

  useEffect(() => {
    if (errorAppointments) {
      toast.error("Error al cargar las citas")
      console.error("Error fetching appointments:", errorAppointments)
    }
  }, [errorAppointments])

  const tabsConfig: Array<{
    value: TabValue
    label: string
    icon: LucideIcon
    count: number | null
  }> = [
    { value: "newPatient", label: "Nuevo Paciente", icon: UserRoundPlus, count: null },
    { value: "today", label: "Hoy", icon: Clock, count: appointmentCounts.today },
    { value: "future", label: "Futuras", icon: CalendarHeart, count: appointmentCounts.future },
    { value: "past", label: "Historial", icon: History, count: appointmentCounts.past },
  ]

  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue as TabValue)
  }

  const handleRescheduleStateChange = useCallback((update: Partial<RescheduleState>) => {
    setRescheduleState((prevState: RescheduleState): RescheduleState => {
      const newState = { ...prevState, ...update };
      return {
        appointmentId: newState.appointmentId === undefined ? prevState.appointmentId : newState.appointmentId,
        date: newState.date === undefined ? prevState.date : newState.date,
        time: newState.time === undefined ? prevState.time : newState.time,
      };
    });
  }, [setRescheduleState]);

  const handleNewPatientSuccess = () => {
    refetchAppointments()
    setActiveTab("today")
    toast.success("Paciente agregado exitosamente")
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <Card className="w-full overflow-hidden shadow-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-800/30 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-3 text-2xl text-slate-900 dark:text-slate-100">
                <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Users className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                </div>
                <span className="font-semibold">Gestión de Citas</span>
                {(isLoadingAppointments || isPending) && (
                  <div className="ml-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent text-slate-600 dark:text-slate-400" />
                )}
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-400">
                Control de admisión y seguimiento de pacientes
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="p-4 sm:p-6">
              <div className="mb-6">
                {isMobile ? (
                  <MobileTabs
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    appointmentCounts={appointmentCounts}
                    isLoading={isLoadingAppointments}
                  />
                ) : (
                  <TabsList className="grid w-full grid-cols-4 h-auto rounded-xl bg-slate-100 dark:bg-slate-800/50 p-1.5 border border-slate-200 dark:border-slate-700">
                    {tabsConfig.map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm py-3 px-4 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-400 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100"
                      >
                        <div className="flex items-center justify-center gap-2.5">
                          <tab.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span className={cn(
                            isTablet && tab.value !== "newPatient" ? "hidden lg:inline" : "inline"
                          )}>
                            {tab.label}
                          </span>
                          {tab.count !== null && tab.count > 0 && !isLoadingAppointments && (
                            <Badge 
                              variant="secondary" 
                              className="h-5 px-2 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                            >
                              {tab.count > 99 ? "99+" : tab.count}
                            </Badge>
                          )}
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                )}
              </div>

              {["today", "future", "past"].includes(activeTab) && (
                <div className="mb-6">
                  <Suspense fallback={<ComponentLoadingFallback />}>
                    <FilterControlsAdapter
                      filters={filters}
                      onUpdateFilters={handleUpdateFilters}
                      onClearFilters={handleClearFilters}
                      onRefresh={handleRefresh}
                      isLoading={isLoadingAppointments || isPending}
                    />
                  </Suspense>
                </div>
              )}
            </div>

            <div className="px-4 sm:px-6 pb-6">
              {/* ... */}
              <TabsContent value="newPatient" className="mt-0">
                <Suspense fallback={<div className="p-6 flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent text-slate-600 dark:text-slate-400" />
                </div>}>
                  <NewPatientForm onSuccess={handleNewPatientSuccess} />
                </Suspense>
              </TabsContent>

              <TabsContent value="today" className="mt-0">
                {renderAppointmentsContent(classifiedAndFilteredAppointments.today, "today")}
              </TabsContent>

              <TabsContent value="future" className="mt-0">
                {renderAppointmentsContent(classifiedAndFilteredAppointments.future, "future")}
              </TabsContent>

              <TabsContent value="past" className="mt-0">
                {renderAppointmentsContent(classifiedAndFilteredAppointments.past, "past")}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {surveyDialog.isOpen && (
        <Suspense fallback={<ComponentLoadingFallback />}>
          <SurveyShareDialog
            isOpen={surveyDialog.isOpen}
            patient={{
              id: surveyDialog.patientId,
              nombre: surveyDialog.patientName,
              apellidos: surveyDialog.patientLastName,
              telefono: surveyDialog.patientPhone
            }}
            surveyLink={surveyDialog.surveyLink}
            onStartInternal={() => {
              toast.success(`Encuesta iniciada para ${surveyDialog.patientName}`)
              setSurveyDialog(prev => ({ ...prev, isOpen: false }))
            }}
            onClose={() => setSurveyDialog(prev => ({ ...prev, isOpen: false }))}
          />
        </Suspense>
      )}

      <AlertDialog 
        open={confirmDialog.isOpen} 
        onOpenChange={(open) => !open && setConfirmDialog({
          isOpen: false,
          action: null,
          appointmentId: null,
          appointmentData: null
        })}
      >
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              {confirmDialog.action === "checkIn" && <CheckCircle className="h-6 w-6 text-emerald-600" />}
              {confirmDialog.action === "cancel" && <XCircle className="h-6 w-6 text-red-600" />}
              {confirmDialog.action === "complete" && <ClipboardCheck className="h-6 w-6 text-green-600" />}
              {confirmDialog.action === "noShow" && <AlertCircle className="h-6 w-6 text-amber-600" />}
              {confirmDialog.action === "reschedule" && <CalendarDaysIcon className="h-6 w-6 text-primary" />}
              
              <AlertDialogTitle className="text-lg font-semibold">
                {confirmDialog.action === "checkIn" && "Registrar Llegada"}
                {confirmDialog.action === "cancel" && "Cancelar Cita"}
                {confirmDialog.action === "complete" && "Completar Consulta"}
                {confirmDialog.action === "noShow" && "Marcar No Asistió"}
                {confirmDialog.action === "reschedule" && "Reagendar Cita"}
              </AlertDialogTitle>
            </div>
            
            <AlertDialogDescription asChild>
              <div className="pt-2 space-y-4 text-sm">
                {confirmDialog.appointmentData && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="font-medium mb-2 text-slate-900 dark:text-slate-100">
                      {confirmDialog.appointmentData.nombre} {confirmDialog.appointmentData.apellidos}
                    </p>
                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <p className="flex items-center gap-2">
                        <CalendarIcon className="h-3 w-3" />
                        {dateUtils.formatDisplay(confirmDialog.appointmentData.dateTime)}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {confirmDialog.appointmentData.horaConsulta}
                      </p>
                    </div>
                  </div>
                )}
                
                {confirmDialog.action === "reschedule" ? (
                  <Suspense fallback={<ComponentLoadingFallback />}>
                    <RescheduleDatePicker
                      rescheduleState={rescheduleState}
                      onStateChange={handleRescheduleStateChange}
                    />
                  </Suspense>
                ) : (
                  <p className="text-slate-600 dark:text-slate-400">
                    {confirmDialog.action === "checkIn" && 
                     "El paciente se marcará como presente."}
                    {confirmDialog.action === "cancel" && 
                     "Esta acción cancelará la cita. ¿Continuar?"}
                    {confirmDialog.action === "complete" && 
                     "La consulta se marcará como completada."}
                    {confirmDialog.action === "noShow" && 
                     "Se registrará que el paciente no asistió."}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={(confirmDialog.action === "reschedule" && 
                        (!rescheduleState.date || !rescheduleState.time)) || isPending}
              className={cn(
                confirmDialog.action === "cancel" && "bg-red-600 hover:bg-red-700",
                confirmDialog.action === "complete" && "bg-green-600 hover:bg-green-700",
                confirmDialog.action === "noShow" && "bg-amber-600 hover:bg-amber-700"
              )}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Procesando...
                </span>
              ) : (
                "Confirmar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
})

PatientAdmission.displayName = "PatientAdmission"

export default PatientAdmission