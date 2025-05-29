"use client"

import type React from "react"
import { useState, useMemo, useEffect, useCallback, memo, lazy, Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  format,
  isAfter,
  isBefore,
  parseISO,
  isValid,
  startOfDay,
  endOfDay,
  addDays,
  isSameDay,
  subDays,
} from "date-fns"
import { es } from "date-fns/locale"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  FileBarChart,
  RefreshCw,
  AlertCircle,
  Download,
  Info,
  CalendarIcon,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { mockAppointments } from "@/app/admision/mock-data"

// Import chart configuration hook
import useChartConfig, {
  StatCard,
  type GeneralStats,
  type StatusChartData,
  type MotiveChartData,
  type TrendChartData,
  type WeekdayChartData,
  type ScatterPoint,
  type ScatterData,
  STATUS_COLORS,
  WEEKDAYS,
} from "@/components/patient-admision/use-chart-config"

// ============= TYPES & CONSTANTS =============

export const APPOINTMENT_STATUSES = [
  "completada",
  "cancelada",
  "pendiente",
  "presente",
  "reprogramada",
  "no_asistio",
] as const

export const APPOINTMENT_SORT_KEYS = ["fechaConsulta", "horaConsulta", "nombre", "motivoConsulta"] as const

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]
export type AppointmentSortKey = (typeof APPOINTMENT_SORT_KEYS)[number]
export type SortOrder = "asc" | "desc"

export interface DateRange {
  from: Date | null
  to: Date | null
}

export interface Appointment {
  readonly id: string
  readonly nombre: string
  readonly apellidos: string
  readonly fechaConsulta: string
  readonly horaConsulta: string
  readonly motivoConsulta: string
  readonly estado: AppointmentStatus
  readonly notas: string
  readonly duracion?: number
  readonly costoConsulta?: number
  readonly seguroMedico?: string
  readonly telefono?: string
  readonly email?: string
}

export interface AppointmentFilters {
  dateRange: DateRange | undefined
  motiveFilter: string
  statusFilter: readonly AppointmentStatus[]
  searchTerm: string
  sortBy: AppointmentSortKey
  sortOrder: SortOrder
  timeRange: readonly [number, number]
  showDatePickerAdvanced?: boolean
}

// ============= UTILITIES =============

export const formatDate = (date: Date | string | undefined, formatStr = "dd/MM/yyyy"): string => {
  if (!date) return "Fecha no definida"

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date
    return isValid(dateObj) ? format(dateObj, formatStr, { locale: es }) : "Fecha inválida"
  } catch {
    return "Error de formato"
  }
}

export const hourToDecimal = (timeStr: string): number => {
  if (!timeStr || typeof timeStr !== "string") return 0

  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return 0

  const hours = Number.parseInt(match[1], 10)
  const minutes = Number.parseInt(match[2], 10)

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return 0

  return hours + minutes / 60
}

// ============= FILTER COMPONENTS =============

interface AdvancedFiltersProps {
  readonly filters: AppointmentFilters
  readonly updateFilter: <K extends keyof AppointmentFilters>(key: K, value: AppointmentFilters[K]) => void
  readonly resetFilters: () => void
  readonly uniqueMotives: readonly string[]
  readonly onClose: () => void
  readonly className?: string
}

const AdvancedFilters = memo<AdvancedFiltersProps>(
  ({ filters, updateFilter, resetFilters, uniqueMotives, onClose, className = "" }) => {
    const handleStatusChange = useCallback(
      (status: AppointmentStatus, checked: boolean) => {
        const newStatusFilter = checked
          ? [...filters.statusFilter, status]
          : filters.statusFilter.filter((s) => s !== status)

        updateFilter("statusFilter", newStatusFilter)
      },
      [filters.statusFilter, updateFilter],
    )

    const handleDateRangeSelect = useCallback(
      (range: DateRange | undefined) => {
        updateFilter("dateRange", range)
      },
      [updateFilter],
    )

    const toggleDatePicker = useCallback(() => {
      updateFilter("showDatePickerAdvanced", !filters.showDatePickerAdvanced)
    }, [filters.showDatePickerAdvanced, updateFilter])

    const datePickerKey = useMemo(
      () => `${filters.dateRange?.from?.getTime() || 0}-${filters.dateRange?.to?.getTime() || 0}`,
      [filters.dateRange],
    )

    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-950 rounded-lg shadow-sm border p-4 mb-4",
          "transition-all duration-200",
          className,
        )}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Filtros Avanzados</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Cerrar filtros"
            className="hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date Range Selector */}
          <div className="space-y-2">
            <Label htmlFor="dateRangeAdvanced" className="font-medium">
              Rango de Fechas
            </Label>
            <div className="relative">
              <Button
                id="dateRangeAdvanced"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dateRange?.from && "text-muted-foreground",
                  "pr-8",
                )}
                onClick={toggleDatePicker}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange?.from ? (
                  filters.dateRange.to ? (
                    <>
                      {formatDate(filters.dateRange.from)} - {formatDate(filters.dateRange.to)}
                    </>
                  ) : (
                    formatDate(filters.dateRange.from)
                  )
                ) : (
                  <span>Seleccionar rango de fechas</span>
                )}
              </Button>

              {filters.dateRange?.from && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 p-0"
                  onClick={() => updateFilter("dateRange", undefined)}
                  aria-label="Limpiar fechas"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}

              {filters.showDatePickerAdvanced && (
                <div className="absolute z-50 mt-1 bg-popover shadow-lg rounded-md border p-3">
                  <DayPicker
                    key={datePickerKey}
                    mode="range"
                    defaultMonth={filters.dateRange?.from || new Date()}
                    selected={filters.dateRange as any}
                    onSelect={handleDateRangeSelect as any}
                    locale={es}
                    numberOfMonths={2}
                    disabled={{ after: new Date() }}
                    className="rounded-md"
                    footer={
                      <div className="mt-3 flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            updateFilter("dateRange", undefined)
                            updateFilter("showDatePickerAdvanced", false)
                          }}
                        >
                          Limpiar
                        </Button>
                        <Button type="button" size="sm" onClick={() => updateFilter("showDatePickerAdvanced", false)}>
                          Aplicar
                        </Button>
                      </div>
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* Motive Filter */}
          <div className="space-y-2">
            <Label htmlFor="motiveFilterAdvanced" className="font-medium">
              Motivo de Consulta
            </Label>
            <Select value={filters.motiveFilter} onValueChange={(value) => updateFilter("motiveFilter", value)}>
              <SelectTrigger id="motiveFilterAdvanced" className="w-full">
                <SelectValue placeholder="Filtrar por motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los motivos</SelectItem>
                {uniqueMotives.map((motive) => (
                  <SelectItem key={motive} value={motive}>
                    {motive}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Checkboxes */}
          <div className="space-y-2 md:col-span-2">
            <Label className="font-medium">Estado de Cita</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-2">
              {APPOINTMENT_STATUSES.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={filters.statusFilter.includes(status)}
                    onCheckedChange={(checked) => handleStatusChange(status, !!checked)}
                  />
                  <Label htmlFor={`status-${status}`} className="capitalize select-none cursor-pointer font-normal">
                    {status.replace(/_/g, " ")}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Info */}
          <div className="space-y-2">
            <Label className="font-medium">Horario de consulta</Label>
            <div className="p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
              <p>Las consultas se realizan de lunes a sábado de 9:00 am a 2:00 pm.</p>
            </div>
          </div>

          {/* Sort Options */}
          <div className="space-y-2">
            <Label className="font-medium">Ordenar Por</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={filters.sortBy}
                onValueChange={(value) => updateFilter("sortBy", value as AppointmentSortKey)}
              >
                <SelectTrigger aria-label="Campo para ordenar">
                  <SelectValue placeholder="Campo" />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_SORT_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {key === "fechaConsulta"
                        ? "Fecha"
                        : key === "horaConsulta"
                          ? "Hora"
                          : key === "nombre"
                            ? "Nombre"
                            : "Motivo"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.sortOrder}
                onValueChange={(value) => updateFilter("sortOrder", value as SortOrder)}
              >
                <SelectTrigger aria-label="Orden de clasificación">
                  <SelectValue placeholder="Orden" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascendente</SelectItem>
                  <SelectItem value="desc">Descendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={resetFilters} className="transition-colors hover:bg-muted">
            Restablecer Filtros
          </Button>
          <Button onClick={onClose} className="shadow-sm transition-all hover:shadow-md">
            Aplicar
          </Button>
        </div>
      </div>
    )
  },
)

AdvancedFilters.displayName = "AdvancedFilters"

// Filter Summary Component
interface FilterSummaryProps {
  readonly filters: AppointmentFilters
  readonly updateFilter: <K extends keyof AppointmentFilters>(key: K, value: AppointmentFilters[K]) => void
  readonly className?: string
}

const FilterSummary = memo<FilterSummaryProps>(({ filters, updateFilter, className = "" }) => {
  const activeFiltersCount = useMemo(() => {
    const allStatusesSelected = filters.statusFilter.length === APPOINTMENT_STATUSES.length

    return (
      (filters.dateRange?.from ? 1 : 0) +
      (filters.motiveFilter !== "all" ? 1 : 0) +
      (!allStatusesSelected && filters.statusFilter.length > 0 ? 1 : 0) +
      (filters.searchTerm !== "" ? 1 : 0)
    )
  }, [filters])

  if (activeFiltersCount === 0) return null

  return (
    <div
      className={cn("flex flex-wrap gap-2 mb-4 items-center", "animate-in fade-in-0 slide-in-from-top-2", className)}
    >
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtros aplicados:</span>

      {filters.dateRange?.from && (
        <Badge variant="secondary" className="flex items-center gap-1 group py-1.5">
          <CalendarIcon className="h-3 w-3" />
          {formatDate(filters.dateRange.from)}
          {filters.dateRange.to && ` - ${formatDate(filters.dateRange.to)}`}
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 ml-1 opacity-70 group-hover:opacity-100"
            onClick={() => updateFilter("dateRange", undefined)}
            aria-label="Eliminar filtro de fechas"
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      {filters.motiveFilter !== "all" && (
        <Badge variant="secondary" className="flex items-center gap-1 group py-1.5">
          Motivo: {filters.motiveFilter}
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 ml-1 opacity-70 group-hover:opacity-100"
            onClick={() => updateFilter("motiveFilter", "all")}
            aria-label="Eliminar filtro de motivo"
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      {filters.statusFilter.length > 0 && filters.statusFilter.length < APPOINTMENT_STATUSES.length && (
        <Badge variant="secondary" className="flex items-center gap-1 group py-1.5">
          Estados:{" "}
          {filters.statusFilter
            .map((s) => s.replace(/_/g, " "))
            .slice(0, 2)
            .join(", ")}
          {filters.statusFilter.length > 2 && ` y ${filters.statusFilter.length - 2} más`}
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 ml-1 opacity-70 group-hover:opacity-100"
            onClick={() => updateFilter("statusFilter", [...APPOINTMENT_STATUSES])}
            aria-label="Restablecer filtros de estado"
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      {filters.searchTerm && (
        <Badge variant="secondary" className="flex items-center gap-1 group py-1.5">
          Búsqueda: "{filters.searchTerm.length > 15 ? `${filters.searchTerm.substring(0, 15)}...` : filters.searchTerm}
          "
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 ml-1 opacity-70 group-hover:opacity-100"
            onClick={() => updateFilter("searchTerm", "")}
            aria-label="Eliminar búsqueda"
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
    </div>
  )
})

FilterSummary.displayName = "FilterSummary"

// ============= STAT CARDS COMPONENT =============

const StatCards = memo<{ generalStats: GeneralStats; animationEnabled: boolean }>(
  ({ generalStats, animationEnabled }) => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className={animationEnabled ? "animate-in fade-in" : ""} style={{ animationDelay: "0ms" }}>
        <StatCard
          title="Total de Citas"
          value={generalStats.total}
          icon={<FileBarChart className="h-4 w-4" />}
          description="Número total de citas en el rango seleccionado"
          animated={animationEnabled}
        />
      </div>
      <div className={animationEnabled ? "animate-in fade-in" : ""} style={{ animationDelay: "100ms" }}>
        <StatCard
          title="Tasa de Asistencia"
          value={`${generalStats.attendance.toFixed(1)}%`}
          icon={<FileBarChart className="h-4 w-4" />}
          description="Porcentaje de citas completadas o presentes"
          color="bg-green-50 dark:bg-green-950/20"
          animated={animationEnabled}
        />
      </div>
      <div className={animationEnabled ? "animate-in fade-in" : ""} style={{ animationDelay: "200ms" }}>
        <StatCard
          title="Tasa de Cancelación"
          value={`${generalStats.cancellation.toFixed(1)}%`}
          icon={<FileBarChart className="h-4 w-4" />}
          description="Porcentaje de citas canceladas"
          color="bg-red-50 dark:bg-red-950/20"
          animated={animationEnabled}
        />
      </div>
      <div className={animationEnabled ? "animate-in fade-in" : ""} style={{ animationDelay: "300ms" }}>
        <StatCard
          title="Citas Pendientes"
          value={generalStats.pendingCount}
          icon={<FileBarChart className="h-4 w-4" />}
          description="Número de citas aún pendientes"
          color="bg-amber-50 dark:bg-amber-950/20"
          animated={animationEnabled}
        />
      </div>
    </div>
  ),
)
StatCards.displayName = "StatCards"

// ============= TAB CONTENT COMPONENTS =============

interface TabContentProps {
  generalStats: GeneralStats
  statusChartData: StatusChartData[]
  motiveChartData: MotiveChartData[]
  trendChartData: TrendChartData[]
  weekdayChartData: WeekdayChartData[]
  scatterData: ScatterData
  timeRange: [number, number]
  isLoading: boolean
  renderPieChart: (data: StatusChartData[], stats: GeneralStats, loading: boolean) => JSX.Element
  renderBarChart: (data: MotiveChartData[], loading: boolean) => JSX.Element
  renderLineChart: (data: TrendChartData[], loading: boolean) => JSX.Element
  renderWeekdayChart: (data: WeekdayChartData[], loading: boolean) => JSX.Element
  renderScatterChart: (data: ScatterData, range: [number, number], loading: boolean) => JSX.Element
  progress: number
  isFirstLoad: boolean
}

const GeneralTabContentComponent: React.FC<
  Pick<
    TabContentProps,
    | "generalStats"
    | "statusChartData"
    | "motiveChartData"
    | "renderPieChart"
    | "renderBarChart"
    | "isLoading"
    | "progress"
    | "isFirstLoad"
  >
> = ({
  generalStats,
  statusChartData,
  motiveChartData,
  renderPieChart,
  renderBarChart,
  isLoading,
  progress,
  isFirstLoad,
}) => (
  <>
    <StatCards generalStats={generalStats} animationEnabled={isFirstLoad} />
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="bg-muted/20">
        <CardTitle className="text-xl flex items-center">
          <span className="mr-2">Distribución de Estados</span>
          {generalStats.period && (
            <Badge variant="outline" className="text-xs font-normal ml-2">
              {generalStats.period}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Visualización de la proporción de cada estado de cita.</CardDescription>
      </CardHeader>
      <CardContent className="p-6">{renderPieChart(statusChartData, generalStats, isLoading)}</CardContent>
    </Card>
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="bg-muted/20">
        <CardTitle className="text-xl">Motivos de Consulta</CardTitle>
        <CardDescription>Distribución de los diferentes motivos de consulta.</CardDescription>
      </CardHeader>
      <CardContent className="p-6">{renderBarChart(motiveChartData, isLoading)}</CardContent>
    </Card>
  </>
)

const TrendsTabContentComponent: React.FC<
  Pick<TabContentProps, "trendChartData" | "renderLineChart" | "isLoading" | "progress">
> = ({ trendChartData, renderLineChart, isLoading, progress }) => (
  <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
    <CardHeader className="bg-muted/20">
      <CardTitle className="text-xl">Tendencia de Citas</CardTitle>
      <CardDescription>Visualización de la tendencia de citas a lo largo del tiempo.</CardDescription>
    </CardHeader>
    <CardContent className="p-6">
      {isLoading ? (
        <div className="w-full h-[300px] flex flex-col items-center justify-center">
          <p className="text-sm text-muted-foreground mb-2">Cargando datos de tendencias...</p>
          <Progress value={progress} className="h-2 w-1/2" />
        </div>
      ) : (
        renderLineChart(trendChartData, isLoading)
      )}
    </CardContent>
  </Card>
)

const WeekdayTabContentComponent: React.FC<
  Pick<TabContentProps, "weekdayChartData" | "renderWeekdayChart" | "isLoading" | "progress">
> = ({ weekdayChartData, renderWeekdayChart, isLoading, progress }) => (
  <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
    <CardHeader className="bg-muted/20">
      <CardTitle className="text-xl">Asistencia por Día de la Semana</CardTitle>
      <CardDescription>Análisis de la asistencia a citas según el día de la semana.</CardDescription>
    </CardHeader>
    <CardContent className="p-6">
      {isLoading ? (
        <div className="w-full h-[300px] flex flex-col items-center justify-center">
          <p className="text-sm text-muted-foreground mb-2">Cargando datos de asistencia...</p>
          <Progress value={progress} className="h-2 w-1/2" />
        </div>
      ) : (
        renderWeekdayChart(weekdayChartData, isLoading)
      )}
    </CardContent>
  </Card>
)

const CorrelationTabContentComponent: React.FC<
  Pick<TabContentProps, "scatterData" | "timeRange" | "renderScatterChart" | "isLoading" | "progress">
> = ({ scatterData, timeRange, renderScatterChart, isLoading, progress }) => (
  <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
    <CardHeader className="bg-muted/20">
      <CardTitle className="text-xl">Correlación Hora vs Día</CardTitle>
      <CardDescription>
        Análisis de la correlación entre la hora del día y el día de la semana para las citas.
      </CardDescription>
    </CardHeader>
    <CardContent className="p-6">
      {isLoading ? (
        <div className="w-full h-[350px] flex flex-col items-center justify-center">
          <p className="text-sm text-muted-foreground mb-2">Cargando datos de correlación...</p>
          <Progress value={progress} className="h-2 w-1/2" />
        </div>
      ) : (
        renderScatterChart(scatterData, timeRange, isLoading)
      )}
    </CardContent>
  </Card>
)

// Lazy load tab content components
const LazyGeneralTabContent = lazy(() => Promise.resolve({ default: GeneralTabContentComponent }))
const LazyTrendsTabContent = lazy(() => Promise.resolve({ default: TrendsTabContentComponent }))
const LazyWeekdayTabContent = lazy(() => Promise.resolve({ default: WeekdayTabContentComponent }))
const LazyCorrelationTabContent = lazy(() => Promise.resolve({ default: CorrelationTabContentComponent }))

// Tab Loading Fallback
const TabLoadingFallback = () => (
  <div className="w-full py-8 flex flex-col items-center justify-center min-h-[300px]">
    <RefreshCw className="h-6 w-6 animate-spin text-primary mb-3" />
    <p className="text-sm text-muted-foreground">Cargando contenido de la pestaña...</p>
  </div>
)

// ============= MAIN COMPONENT =============

const INITIAL_DATE_RANGE: DateRange = {
  from: subDays(new Date(), 30),
  to: new Date(),
}

const INITIAL_FILTERS: AppointmentFilters = {
  dateRange: INITIAL_DATE_RANGE,
  motiveFilter: "all",
  statusFilter: [...APPOINTMENT_STATUSES],
  searchTerm: "",
  sortBy: "fechaConsulta",
  sortOrder: "desc",
  timeRange: [0, 24] as const,
  showDatePickerAdvanced: false,
} as const

export function AppointmentStatistics() {
  // State management
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<string>("general")
  const [dataError, setDataError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Filter state
  const [filters, setFilters] = useState<AppointmentFilters>(INITIAL_FILTERS)

  // Chart configuration
  const {
    chartConfig,
    ChartConfigControl,
    renderPieChart,
    renderBarChart,
    renderLineChart,
    renderWeekdayChart,
    renderScatterChart,
  } = useChartConfig()

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Mount effect
  useEffect(() => {
    setMounted(true)
  }, [])

  // Loading simulation
  useEffect(() => {
    if (isLoading && mounted) {
      setProgress(0)
      const timer = setInterval(() => {
        setProgress((oldProgress) => {
          const newProgress = Math.min(oldProgress + 10, 100)
          if (newProgress === 100) {
            clearInterval(timer)
            setTimeout(() => {
              setIsLoading(false)
              if (isFirstLoad) setIsFirstLoad(false)
            }, 300)
          }
          return newProgress
        })
      }, 150)
      return () => clearInterval(timer)
    }
  }, [isLoading, mounted, isFirstLoad])

  // Filter update function
  const updateFilter = useCallback(<K extends keyof AppointmentFilters>(key: K, value: AppointmentFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS)
  }, [])

  const toggleAdvancedFilter = useCallback(() => {
    setIsAdvancedFilterOpen((prev) => !prev)
  }, [])

  // Get unique motives
  const uniqueMotives = useMemo(() => {
    const motives = new Set<string>()
    appointments.forEach((appointment) => {
      if (appointment && appointment.motivoConsulta) {
        motives.add(appointment.motivoConsulta)
      }
    })
    return Array.from(motives).sort()
  }, [appointments])

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    try {
      if (!Array.isArray(appointments)) {
        console.warn("Appointments data is not an array or not yet available for filtering.")
        setDataError("Los datos de citas no están disponibles o tienen un formato incorrecto.")
        return []
      }

      const tempAppointments = [...appointments]
      setDataError(null)

      return tempAppointments
        .filter((appointment) => appointment != null)
        .filter((appointment) => {
          const datePart = format(appointment.fechaConsulta, "yyyy-MM-dd")
          const timePart = appointment.horaConsulta
          if (!/^\d{2}:\d{2}$/.test(timePart)) {
            console.warn(`Hora inválida para la cita ID ${appointment.id}: ${timePart}`)
            return false
          }
          const fechaHoraString = `${datePart}T${timePart}:00`
          const appointmentDate = parseISO(fechaHoraString)

          if (!isValid(appointmentDate)) {
            console.warn(`Fecha inválida para la cita ID ${appointment.id}: ${fechaHoraString}`)
            return false
          }

          if (filters.dateRange?.from || filters.dateRange?.to) {
            if (filters.dateRange.from && !filters.dateRange.to) {
              return (
                isAfter(appointmentDate, startOfDay(filters.dateRange.from)) ||
                isSameDay(appointmentDate, filters.dateRange.from)
              )
            }
            if (!filters.dateRange.from && filters.dateRange.to) {
              return (
                isBefore(appointmentDate, endOfDay(filters.dateRange.to)) ||
                isSameDay(appointmentDate, filters.dateRange.to)
              )
            }
            if (filters.dateRange.from && filters.dateRange.to) {
              return (
                (isAfter(appointmentDate, startOfDay(filters.dateRange.from)) ||
                  isSameDay(appointmentDate, filters.dateRange.from)) &&
                (isBefore(appointmentDate, endOfDay(filters.dateRange.to)) ||
                  isSameDay(appointmentDate, filters.dateRange.to))
              )
            }
          }
          return true
        })
        .filter(
          (appointment) =>
            filters.motiveFilter === "all" || (appointment.motivoConsulta || "") === filters.motiveFilter,
        )
        .filter((appointment) => filters.statusFilter.includes(appointment.estado))
        .filter((appointment) => {
          const appointmentHour = appointment.horaConsulta ? hourToDecimal(appointment.horaConsulta) : -1
          if (Array.isArray(filters.timeRange) && filters.timeRange.length === 2) {
            return appointmentHour >= filters.timeRange[0] && appointmentHour <= filters.timeRange[1]
          }
          return true
        })
        .filter((appointment) => {
          if (!filters.searchTerm) return true
          const searchLower = filters.searchTerm.toLowerCase().trim()
          return (
            (appointment.nombre || "").toLowerCase().includes(searchLower) ||
            (appointment.apellidos || "").toLowerCase().includes(searchLower) ||
            (appointment.motivoConsulta || "").toLowerCase().includes(searchLower) ||
            (appointment.notas || "").toLowerCase().includes(searchLower)
          )
        })
        .sort((a, b) => {
          const horaCompare = (a.horaConsulta || "25:00").localeCompare(b.horaConsulta || "25:00")
          if (horaCompare !== 0) return horaCompare

          const motiveCompare = (a.motivoConsulta || "").localeCompare(b.motivoConsulta || "")
          if (motiveCompare !== 0) return motiveCompare

          const valA_nombre = a.nombre || ""
          const valA_apellidos = a.apellidos || ""
          const valB_nombre = b.nombre || ""
          const valB_apellidos = b.apellidos || ""
          const fullNameA = `${valA_nombre} ${valA_apellidos}`.trim()
          const fullNameB = `${valB_nombre} ${valB_apellidos}`.trim()
          const nameCompare = fullNameA.localeCompare(fullNameB)
          if (nameCompare !== 0) return nameCompare

          const datePartA = format(a.fechaConsulta, "yyyy-MM-dd")
          const timePartA = a.horaConsulta
          const datePartB = format(b.fechaConsulta, "yyyy-MM-dd")
          const timePartB = b.horaConsulta

          const validTimeA = /^\d{2}:\d{2}$/.test(timePartA)
          const validTimeB = /^\d{2}:\d{2}$/.test(timePartB)

          const dateA = validTimeA ? parseISO(`${datePartA}T${timePartA}:00`) : null
          const dateB = validTimeB ? parseISO(`${datePartB}T${timePartB}:00`) : null

          if (dateA && dateB && isValid(dateA) && isValid(dateB)) {
            return dateA.getTime() - dateB.getTime()
          } else if (dateA && isValid(dateA)) {
            return -1
          } else if (dateB && isValid(dateB)) {
            return 1
          }
          return 0
        })
    } catch (error) {
      console.error("Error al filtrar citas:", error)
      setDataError("Error al procesar los datos. Por favor, actualice la página o verifique los filtros.")
      return []
    }
  }, [appointments, filters, setDataError])

  // Calculate general stats
  const generalStats = useMemo((): GeneralStats => {
    const total = filteredAppointments.length
    if (total === 0)
      return {
        total: 0,
        attendance: 0,
        cancellation: 0,
        pending: 0,
        present: 0,
        completed: 0,
        cancelled: 0,
        pendingCount: 0,
        presentCount: 0,
        period: filters.dateRange
          ? `${filters.dateRange.from ? format(filters.dateRange.from, "dd/MM/yyyy") : "Inicio"} - ${filters.dateRange.to ? format(filters.dateRange.to, "dd/MM/yyyy") : "Actual"}`
          : "Todos los datos",
      }

    const counts = filteredAppointments.reduce(
      (acc, appointment) => {
        if (appointment && appointment.estado) {
          acc[appointment.estado] = (acc[appointment.estado] || 0) + 1
        }
        return acc
      },
      {} as Record<string, number>,
    )

    const completed = counts.completada || 0
    const cancelled = counts.cancelada || 0
    const pending = counts.pendiente || 0
    const present = counts.presente || 0

    const calcPercentage = (value: number): number => (total > 0 ? (value / total) * 100 : 0)

    return {
      total,
      attendance: calcPercentage(completed + present),
      cancellation: calcPercentage(cancelled),
      pending: calcPercentage(pending),
      present: calcPercentage(present),
      completed,
      cancelled,
      pendingCount: pending,
      presentCount: present,
      period: filters.dateRange
        ? `${filters.dateRange.from ? format(filters.dateRange.from, "dd/MM/yyyy") : "Inicio"} - ${filters.dateRange.to ? format(filters.dateRange.to, "dd/MM/yyyy") : "Actual"}`
        : "Todos los datos",
    }
  }, [filteredAppointments, filters.dateRange])

  // Status chart data
  const statusChartData = useMemo(
    (): StatusChartData[] => [
      { name: "Completadas", value: generalStats.completed, color: STATUS_COLORS.completada },
      { name: "Canceladas", value: generalStats.cancelled, color: STATUS_COLORS.cancelada },
      { name: "Pendientes", value: generalStats.pendingCount, color: STATUS_COLORS.pendiente },
      { name: "Presentes", value: generalStats.presentCount, color: STATUS_COLORS.presente },
      {
        name: "Reprogramadas",
        value: filteredAppointments.filter((a) => a.estado === "reprogramada").length,
        color: STATUS_COLORS.reprogramada,
      },
      {
        name: "No Asistieron",
        value: filteredAppointments.filter((a) => a.estado === "no_asistio").length,
        color: STATUS_COLORS.no_asistio,
      },
    ],
    [generalStats, filteredAppointments],
  )

  // Motive chart data
  const motiveChartData = useMemo((): MotiveChartData[] => {
    const motiveCount: Record<string, number> = {}
    filteredAppointments.forEach((appointment) => {
      const motive = appointment.motivoConsulta || "Desconocido"
      motiveCount[motive] = (motiveCount[motive] || 0) + 1
    })
    return Object.entries(motiveCount)
      .map(([motive, count]) => ({ motive, count }))
      .sort((a, b) => b.count - a.count)
  }, [filteredAppointments])

  // Trend chart data
  const trendChartData = useMemo((): TrendChartData[] => {
    const statusByDate: Record<string, Record<AppointmentStatus | "total", number>> = {}

    filteredAppointments.forEach((appointment) => {
      const dateStr = format(new Date(appointment.fechaConsulta), "yyyy-MM-dd")
      if (!statusByDate[dateStr]) {
        statusByDate[dateStr] = {
          total: 0,
          completada: 0,
          cancelada: 0,
          pendiente: 0,
          presente: 0,
          reprogramada: 0,
          no_asistio: 0,
        }
      }
      statusByDate[dateStr].total++
      statusByDate[dateStr][appointment.estado]++
    })

    const result = Object.entries(statusByDate)
      .map(([date, counts]) => ({
        date,
        total: counts.total,
        completada: counts.completada,
        cancelada: counts.cancelada,
        pendiente: counts.pendiente,
        presente: counts.presente,
        reprogramada: counts.reprogramada,
        no_asistio: counts.no_asistio,
        formattedDate: format(parseISO(date), "dd/MM"),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    if (result.length > 0 && filters.dateRange?.from && filters.dateRange?.to) {
      const filledDates: TrendChartData[] = []
      let currentDate = startOfDay(filters.dateRange.from)
      const endDate = endOfDay(filters.dateRange.to)

      while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
        const dateStr = format(currentDate, "yyyy-MM-dd")
        const existingData = result.find((item) => item.date === dateStr)

        if (existingData) {
          filledDates.push(existingData)
        } else {
          filledDates.push({
            date: dateStr,
            total: 0,
            completada: 0,
            cancelada: 0,
            pendiente: 0,
            presente: 0,
            reprogramada: 0,
            no_asistio: 0,
            formattedDate: format(currentDate, "dd/MM"),
          })
        }
        currentDate = addDays(currentDate, 1)
      }
      return filledDates
    }
    return result
  }, [filteredAppointments, filters.dateRange])

  // Weekday chart data
  const weekdayChartData = useMemo((): WeekdayChartData[] => {
    const weekdaysInit: Record<number, { name: string; total: number; attended: number }> = {
      0: { name: "Domingo", total: 0, attended: 0 },
      1: { name: "Lunes", total: 0, attended: 0 },
      2: { name: "Martes", total: 0, attended: 0 },
      3: { name: "Miércoles", total: 0, attended: 0 },
      4: { name: "Jueves", total: 0, attended: 0 },
      5: { name: "Viernes", total: 0, attended: 0 },
      6: { name: "Sábado", total: 0, attended: 0 },
    }

    filteredAppointments.forEach((appointment) => {
      const date = new Date(appointment.fechaConsulta)
      const dayOfWeek = date.getDay()
      if (weekdaysInit[dayOfWeek]) {
        weekdaysInit[dayOfWeek].total++
        if (appointment.estado === "completada" || appointment.estado === "presente") {
          weekdaysInit[dayOfWeek].attended++
        }
      }
    })

    return Object.values(weekdaysInit).map((day) => ({
      ...day,
      rate: day.total > 0 ? (day.attended / day.total) * 100 : 0,
    }))
  }, [filteredAppointments])

  // Scatter data
  const scatterData = useMemo((): ScatterData => {
    const dataByHourDay: Record<AppointmentStatus, Record<string, ScatterPoint>> = {
      completada: {},
      cancelada: {},
      pendiente: {},
      presente: {},
      reprogramada: {},
      no_asistio: {},
    }

    filteredAppointments.forEach((app) => {
      const date = new Date(app.fechaConsulta)
      const hourString = app.horaConsulta || "00:00"
      const hour = Number.parseInt(hourString.split(":")[0], 10)
      const dayOfWeek = date.getDay()
      const key = `${dayOfWeek}-${hour}`

      if (!dataByHourDay[app.estado][key]) {
        dataByHourDay[app.estado][key] = {
          day: dayOfWeek,
          hour,
          count: 0,
          dayName: WEEKDAYS[dayOfWeek],
        }
      }
      dataByHourDay[app.estado][key].count++
    })

    return {
      completada: Object.values(dataByHourDay.completada),
      cancelada: Object.values(dataByHourDay.cancelada),
      pendiente: Object.values(dataByHourDay.pendiente),
      presente: Object.values(dataByHourDay.presente),
      reprogramada: Object.values(dataByHourDay.reprogramada),
      no_asistio: Object.values(dataByHourDay.no_asistio),
    }
  }, [filteredAppointments])

  // Handlers
  const handleRefresh = useCallback(() => {
    if (isLoading) return
    setIsLoading(true)
    setTimeout(() => {
      setAppointments([...mockAppointments.map((a) => ({ ...a, id: `${a.id}-${Date.now()}` }))])
    }, 300)
  }, [isLoading])

  const handleExportData = useCallback(() => {
    if (filteredAppointments.length === 0) {
      setExportMessage("No hay datos filtrados para exportar.")
      setTimeout(() => setExportMessage(null), 3000)
      return
    }

    const dataToExport = filteredAppointments.map((appointment) => ({
      nombre_completo: `${appointment.nombre || ""} ${appointment.apellidos || ""}`.trim(),
      motivo_consulta: appointment.motivoConsulta,
      fecha: appointment.fechaConsulta ? format(new Date(appointment.fechaConsulta), "dd/MM/yyyy") : "N/A",
      hora: appointment.horaConsulta,
      estado: appointment.estado,
      notas: appointment.notas,
    }))

    console.log("Datos preparados para exportar:", dataToExport)
    setExportMessage(
      "Datos preparados y listados en la consola. Puede implementar aquí su lógica de exportación personalizada.",
    )
    setTimeout(() => setExportMessage(null), 7000)
  }, [filteredAppointments])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Filter Controls Component
  const FilterControls = memo<{
    uniqueMotives: readonly string[]
    className?: string
  }>(({ uniqueMotives, className = "" }) => {
    const buttonClasses = cn(
      "transition-colors",
      isAdvancedFilterOpen && "bg-primary text-primary-foreground hover:bg-primary/90",
    )

    return (
      <>
        <div className={cn("bg-white dark:bg-gray-950 rounded-lg p-4 mb-4 shadow-sm border", className)}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAdvancedFilter}
                className={buttonClasses}
                aria-expanded={isAdvancedFilterOpen}
                aria-controls="advanced-filters-panel"
              >
                <Filter className="h-4 w-4 mr-2" />
                {isAdvancedFilterOpen ? "Ocultar Filtros" : "Mostrar Filtros"}
                {isAdvancedFilterOpen ? (
                  <ChevronUp className="ml-1 h-3 w-3" />
                ) : (
                  <ChevronDown className="ml-1 h-3 w-3" />
                )}
              </Button>

              {!isMobile && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9",
                        !filters.dateRange?.from && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange?.from ? (
                        filters.dateRange.to ? (
                          <>
                            {formatDate(filters.dateRange.from)} -{formatDate(filters.dateRange.to)}
                          </>
                        ) : (
                          formatDate(filters.dateRange.from)
                        )
                      ) : (
                        <span>Seleccionar fechas</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3">
                      <DayPicker
                        mode="range"
                        defaultMonth={filters.dateRange?.from || new Date()}
                        selected={filters.dateRange as any}
                        onSelect={(range) => updateFilter("dateRange", range as DateRange)}
                        locale={es}
                        numberOfMonths={2}
                        disabled={{ after: new Date() }}
                        footer={
                          <div className="mt-3 flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateFilter("dateRange", undefined)}
                            >
                              Limpiar
                            </Button>
                          </div>
                        }
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Buscar paciente..."
                className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9"
                value={filters.searchTerm}
                onChange={(e) => updateFilter("searchTerm", e.target.value)}
              />
            </div>
          </div>
        </div>

        <FilterSummary filters={filters} updateFilter={updateFilter} />

        <div
          id="advanced-filters-panel"
          className={cn(
            "transition-all duration-200",
            isAdvancedFilterOpen ? "opacity-100 max-h-[1000px]" : "opacity-0 max-h-0",
            "overflow-hidden",
          )}
        >
          <AdvancedFilters
            filters={filters}
            updateFilter={updateFilter}
            resetFilters={resetFilters}
            uniqueMotives={uniqueMotives}
            onClose={toggleAdvancedFilter}
          />
        </div>
      </>
    )
  })

  FilterControls.displayName = "FilterControls"

  // Tab content props
  const tabContentProps: Omit<TabContentProps, "isLoading" | "progress"> = {
    generalStats,
    statusChartData,
    motiveChartData,
    trendChartData,
    weekdayChartData,
    scatterData,
    timeRange: filters.timeRange,
    renderPieChart,
    renderBarChart,
    renderLineChart,
    renderWeekdayChart,
    renderScatterChart,
    isFirstLoad,
  }

  return (
    <div className={`animate-in fade-in duration-300 ${isFirstLoad ? "opacity-0" : "opacity-100"}`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <TabsList className="h-10 p-1">
            {["general", "trends", "weekday", "correlation"].map((tabValue) => (
              <TabsTrigger
                key={tabValue}
                value={tabValue}
                className="flex items-center gap-1 relative data-[state=active]:bg-primary data-[state=active]:text-primary-foreground capitalize"
              >
                <span>{tabValue === "weekday" ? "Día Semana" : tabValue}</span>
                {activeTab === tabValue && (
                  <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary rounded-full animate-in slide-in-from-left-1/2"></span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-9 transition-all hover:bg-muted"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Actualizando..." : "Actualizar"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              className="h-9 transition-all hover:bg-muted"
              disabled={isLoading || filteredAppointments.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar Datos
            </Button>

            <ChartConfigControl />
          </div>
        </div>

        <FilterControls uniqueMotives={uniqueMotives} className="bg-card p-4 rounded-lg shadow" />

        {exportMessage && (
          <Alert
            variant="default"
            className="my-4 animate-in fade-in bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-700"
          >
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-700 dark:text-blue-300">Información de Exportación</AlertTitle>
            <AlertDescription className="text-blue-600 dark:text-blue-400">{exportMessage}</AlertDescription>
          </Alert>
        )}

        {dataError && (
          <Alert variant="destructive" className="my-4 animate-in slide-in-from-top duration-300">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error en los Datos</AlertTitle>
            <AlertDescription>{dataError}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6 relative min-h-[350px]">
          <Suspense fallback={<TabLoadingFallback />}>
            <TabsContent value="general" className="space-y-8 m-0">
              {isLoading && activeTab === "general" ? (
                <div className="w-full py-8">
                  <p className="text-sm text-muted-foreground mb-2 text-center">Cargando datos generales...</p>
                  <Progress value={progress} className="h-2 mx-auto max-w-md" />
                </div>
              ) : (
                <LazyGeneralTabContent {...tabContentProps} isLoading={isLoading} progress={progress} />
              )}
            </TabsContent>

            <TabsContent value="trends" className="space-y-8 m-0">
              <LazyTrendsTabContent {...tabContentProps} isLoading={isLoading} progress={progress} />
            </TabsContent>

            <TabsContent value="weekday" className="space-y-8 m-0">
              <LazyWeekdayTabContent {...tabContentProps} isLoading={isLoading} progress={progress} />
            </TabsContent>

            <TabsContent value="correlation" className="space-y-8 m-0">
              <LazyCorrelationTabContent {...tabContentProps} isLoading={isLoading} progress={progress} />
            </TabsContent>
          </Suspense>
        </div>
      </Tabs>
    </div>
  )
}

export default memo(AppointmentStatistics)
