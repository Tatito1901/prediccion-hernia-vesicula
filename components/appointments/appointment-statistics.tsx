"use client"

import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  memo,
  lazy,
  Suspense,
  ReactNode,
} from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  FileBarChart,
  RefreshCw,
  AlertCircle,
  CalendarIcon,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { mockAppointments } from "@/app/admision/mock-data"
import useChartConfig, {
  StatCard,
  type GeneralStats as OriginalGeneralStats, // Renombrar para evitar conflicto con la nueva interfaz
  type StatusChartData,
  type MotiveChartData,
  type TrendChartData,
  type WeekdayChartData,
  type ScatterPoint,
  type ScatterData,
  STATUS_COLORS,
  WEEKDAYS,
} from "@/components/patient-admision/use-chart-config"

/** ====== TYPES & CONSTANTS ====== **/

export const APPOINTMENT_STATUSES = [
  "completada",
  "cancelada",
  "pendiente",
  "presente",
  "reprogramada",
  "no_asistio",
] as const

export const APPOINTMENT_SORT_KEYS = [
  "fechaConsulta",
  "horaConsulta",
  "nombre",
  "motivoConsulta",
] as const

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
  readonly fechaConsulta: string | Date; // Se espera como YYYY-MM-DD o parseable por new Date()
  readonly horaConsulta: string // Se espera como HH:mm
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
  sortBy: AppointmentSortKey
  sortOrder: SortOrder
  timeRange: readonly [number, number]
  showDatePickerAdvanced?: boolean
}

// Nueva interfaz para GeneralStats que incluye allStatusCounts
export interface GeneralStats extends OriginalGeneralStats {
  allStatusCounts: Record<AppointmentStatus, number>;
}


/** ====== UTILITIES ====== **/

export const formatDate = (
  date: Date | string | undefined,
  formatStr = "dd/MM/yyyy"
): string => {
  if (!date) return "Fecha no definida"
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date // Usar parseISO para strings
    if (!isValid(dateObj)) { // Verificar si la fecha es válida después de parsear
        // Si el string original no es ISO, intentar con new Date como fallback, aunque es menos robusto
        const fallbackDateObj = new Date(date);
        if(isValid(fallbackDateObj)) return format(fallbackDateObj, formatStr, { locale: es });
        return "Fecha inválida"
    }
    return format(dateObj, formatStr, { locale: es })
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

/** ====== ADVANCED FILTERS COMPONENT ====== **/

interface AdvancedFiltersProps {
  filters: AppointmentFilters
  updateFilter: <K extends keyof AppointmentFilters>(
    key: K,
    value: AppointmentFilters[K]
  ) => void
  resetFilters: () => void
  uniqueMotives: readonly string[]
  onClose: () => void
  className?: string
}

const AdvancedFilters = memo<AdvancedFiltersProps>(
  ({
    filters,
    updateFilter,
    resetFilters,
    uniqueMotives,
    onClose,
    className = "",
  }) => {
    const handleStatusChange = useCallback(
      (status: AppointmentStatus, checked: boolean) => {
        const newStatus = checked
          ? [...filters.statusFilter, status]
          : filters.statusFilter.filter((s) => s !== status)
        updateFilter("statusFilter", newStatus as readonly AppointmentStatus[])
      },
      [filters.statusFilter, updateFilter]
    )

    const handleDateRangeSelect = useCallback(
      (range: DateRange | undefined) => {
        updateFilter("dateRange", range)
      },
      [updateFilter]
    )

    const toggleDatePicker = useCallback(() => {
      updateFilter("showDatePickerAdvanced", !filters.showDatePickerAdvanced)
    }, [filters.showDatePickerAdvanced, updateFilter])

    const datePickerKey = useMemo(
      () =>
        `${filters.dateRange?.from?.getTime() || 0}-${
          filters.dateRange?.to?.getTime() || 0
        }`,
      [filters.dateRange]
    )

    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-950 rounded-lg shadow-sm border p-4 mb-4 transition-all duration-200",
          className
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
                  "w-full justify-start text-left font-normal pr-8",
                  !filters.dateRange?.from && "text-muted-foreground"
                )}
                onClick={toggleDatePicker}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange?.from ? (
                  filters.dateRange.to ? (
                    <>
                      {formatDate(filters.dateRange.from)} -{" "}
                      {formatDate(filters.dateRange.to)}
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
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => updateFilter("showDatePickerAdvanced", false)}
                        >
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
            <Select
              value={filters.motiveFilter}
              onValueChange={(value) => updateFilter("motiveFilter", value)}
            >
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
                    onCheckedChange={(checked) =>
                      handleStatusChange(status, !!checked)
                    }
                  />
                  <Label
                    htmlFor={`status-${status}`}
                    className="capitalize select-none cursor-pointer font-normal"
                  >
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
                onValueChange={(value) =>
                  updateFilter("sortBy", value as AppointmentSortKey)
                }
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
                onValueChange={(value) =>
                  updateFilter("sortOrder", value as SortOrder)
                }
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
          <Button
            variant="outline"
            onClick={resetFilters}
            className="transition-colors hover:bg-muted"
          >
            Restablecer Filtros
          </Button>
          <Button onClick={onClose} className="shadow-sm transition-all hover:shadow-md">
            Aplicar
          </Button>
        </div>
      </div>
    )
  }
)

AdvancedFilters.displayName = "AdvancedFilters"

/** ====== FILTER SUMMARY COMPONENT ====== **/

interface FilterSummaryProps {
  filters: AppointmentFilters
  updateFilter: <K extends keyof AppointmentFilters>(
    key: K,
    value: AppointmentFilters[K]
  ) => void
  className?: string
}

const FilterSummary = memo<FilterSummaryProps>(
  ({ filters, updateFilter, className = "" }) => {
    const activeFiltersCount = useMemo(() => {
      const allStatusesSelected =
        filters.statusFilter.length === APPOINTMENT_STATUSES.length || filters.statusFilter.length === 0
      
      return (
        (filters.dateRange?.from ? 1 : 0) +
        (filters.motiveFilter !== "all" ? 1 : 0) +
        (!allStatusesSelected ? 1 : 0)
      )
    }, [filters])

    if (activeFiltersCount === 0) return null

    return (
      <div
        className={cn(
          "flex flex-wrap gap-2 mb-4 items-center animate-in fade-in-0 slide-in-from-top-2",
          className
        )}
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filtros aplicados:
        </span>

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

        {filters.statusFilter.length > 0 &&
          filters.statusFilter.length < APPOINTMENT_STATUSES.length && (
            <Badge variant="secondary" className="flex items-center gap-1 group py-1.5">
              Estados:{" "}
              {filters.statusFilter
                .map((s) => s.replace(/_/g, " "))
                .slice(0, 2)
                .join(", ")}
              {filters.statusFilter.length > 2 &&
                ` y ${filters.statusFilter.length - 2} más`}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 ml-1 opacity-70 group-hover:opacity-100"
                onClick={() =>
                  updateFilter("statusFilter", [...APPOINTMENT_STATUSES])
                }
                aria-label="Restablecer filtros de estado"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
      </div>
    )
  }
)

FilterSummary.displayName = "FilterSummary"

/** ====== STAT CARDS COMPONENT ====== **/

interface StatCardsProps {
  generalStats: GeneralStats
  animationEnabled: boolean
}

const StatCards = memo<StatCardsProps>(({ generalStats, animationEnabled }) => {
  const delays = [0, 100, 200, 300]
  const stats = [
    {
      title: "Total de Citas",
      value: generalStats.total,
      icon: <FileBarChart className="h-4 w-4" />,
      description: "Número total de citas en el rango seleccionado",
      color: "",
    },
    {
      title: "Tasa de Asistencia",
      value: `${generalStats.attendance.toFixed(1)}%`,
      icon: <FileBarChart className="h-4 w-4" />,
      description: "Porcentaje de citas completadas o presentes",
      color: "bg-green-50 dark:bg-green-950/20",
    },
    {
      title: "Tasa de Cancelación",
      value: `${generalStats.cancellation.toFixed(1)}%`,
      icon: <FileBarChart className="h-4 w-4" />,
      description: "Porcentaje de citas canceladas",
      color: "bg-red-50 dark:bg-red-950/20",
    },
    {
      title: "Citas Pendientes",
      value: generalStats.pendingCount,
      icon: <FileBarChart className="h-4 w-4" />,
      description: "Número de citas aún pendientes",
      color: "bg-amber-50 dark:bg-amber-950/20",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, idx) => (
        <div
          key={stat.title}
          className={cn(animationEnabled ? "animate-in fade-in" : "")}
          style={{ animationDelay: `${delays[idx]}ms` }}
        >
          <StatCard
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            description={stat.description}
            color={stat.color}
            animated={animationEnabled}
          />
        </div>
      ))}
    </div>
  )
})

StatCards.displayName = "StatCards"

/** ====== TAB CONTENT COMPONENTS ====== **/

interface TabContentProps {
  generalStats: GeneralStats
  statusChartData: StatusChartData[]
  motiveChartData: MotiveChartData[]
  trendChartData: TrendChartData[]
  weekdayChartData: WeekdayChartData[]
  scatterData: ScatterData
  timeRange: readonly [number, number]
  isLoading: boolean
  renderPieChart: (data: StatusChartData[], stats: GeneralStats, loading: boolean) => ReactNode
  renderBarChart: (data: MotiveChartData[], loading: boolean) => ReactNode
  renderLineChart: (data: TrendChartData[], loading: boolean) => ReactNode
  renderWeekdayChart: (data: WeekdayChartData[], loading: boolean) => ReactNode
  renderScatterChart: (data: ScatterData, range: readonly [number, number], loading: boolean) => ReactNode
  progress: number
  isFirstLoad: boolean
}

const GeneralTabContent: React.FC<
  Pick<
    TabContentProps,
    | "generalStats"
    | "statusChartData"
    | "motiveChartData"
    | "renderPieChart"
    | "renderBarChart"
    | "isLoading"
    | "isFirstLoad"
  >
> = ({
  generalStats,
  statusChartData,
  motiveChartData,
  renderPieChart,
  renderBarChart,
  isLoading,
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
        <CardDescription>
          Visualización de la proporción de cada estado de cita.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {renderPieChart(statusChartData, generalStats, isLoading)}
      </CardContent>
    </Card>

    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="bg-muted/20">
        <CardTitle className="text-xl">Motivos de Consulta</CardTitle>
        <CardDescription>
          Distribución de los diferentes motivos de consulta.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">{renderBarChart(motiveChartData, isLoading)}</CardContent>
    </Card>
  </>
)

const TrendsTabContent: React.FC<
  Pick<TabContentProps, "trendChartData" | "renderLineChart" | "isLoading" | "progress">
> = ({ trendChartData, renderLineChart, isLoading, progress }) => (
  <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
    <CardHeader className="bg-muted/20">
      <CardTitle className="text-xl">Tendencia de Citas</CardTitle>
      <CardDescription>
        Visualización de la tendencia de citas a lo largo del tiempo.
      </CardDescription>
    </CardHeader>
    <CardContent className="p-6">
      {isLoading && progress < 100 ? ( // Mostrar progreso solo si está cargando activamente
        <div className="w-full h-[300px] flex flex-col items-center justify-center">
          <p className="text-sm text-muted-foreground mb-2">
            Cargando datos de tendencias...
          </p>
          <Progress value={progress} className="h-2 w-1/2" />
        </div>
      ) : (
        renderLineChart(trendChartData, isLoading)
      )}
    </CardContent>
  </Card>
)

const WeekdayTabContent: React.FC<
  Pick<TabContentProps, "weekdayChartData" | "renderWeekdayChart" | "isLoading" | "progress">
> = ({ weekdayChartData, renderWeekdayChart, isLoading, progress }) => (
  <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
    <CardHeader className="bg-muted/20">
      <CardTitle className="text-xl">Asistencia por Día de la Semana</CardTitle>
      <CardDescription>
        Análisis de la asistencia a citas según el día de la semana.
      </CardDescription>
    </CardHeader>
    <CardContent className="p-6">
      {isLoading && progress < 100 ? (
        <div className="w-full h-[300px] flex flex-col items-center justify-center">
          <p className="text-sm text-muted-foreground mb-2">
            Cargando datos de asistencia...
          </p>
          <Progress value={progress} className="h-2 w-1/2" />
        </div>
      ) : (
        renderWeekdayChart(weekdayChartData, isLoading)
      )}
    </CardContent>
  </Card>
)

const CorrelationTabContent: React.FC<
  Pick<
    TabContentProps,
    "scatterData" | "timeRange" | "renderScatterChart" | "isLoading" | "progress"
  >
> = ({ scatterData, timeRange, renderScatterChart, isLoading, progress }) => (
  <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
    <CardHeader className="bg-muted/20">
      <CardTitle className="text-xl">Correlación Hora vs Día</CardTitle>
      <CardDescription>
        Análisis de la correlación entre la hora del día y el día de la semana para
        las citas.
      </CardDescription>
    </CardHeader>
    <CardContent className="p-6">
      {isLoading && progress < 100 ? (
        <div className="w-full h-[350px] flex flex-col items-center justify-center">
          <p className="text-sm text-muted-foreground mb-2">
            Cargando datos de correlación...
          </p>
          <Progress value={progress} className="h-2 w-1/2" />
        </div>
      ) : (
        renderScatterChart(scatterData, timeRange, isLoading)
      )}
    </CardContent>
  </Card>
)

const LazyGeneralTabContent = lazy(() =>
  Promise.resolve({ default: GeneralTabContent })
)
const LazyTrendsTabContent = lazy(() =>
  Promise.resolve({ default: TrendsTabContent })
)
const LazyWeekdayTabContent = lazy(() =>
  Promise.resolve({ default: WeekdayTabContent })
)
const LazyCorrelationTabContent = lazy(() =>
  Promise.resolve({ default: CorrelationTabContent })
)

const TabLoadingFallback = () => (
  <div className="w-full py-8 flex flex-col items-center justify-center min-h-[300px]">
    <RefreshCw className="h-6 w-6 animate-spin text-primary mb-3" />
    <p className="text-sm text-muted-foreground">
      Cargando contenido de la pestaña...
    </p>
  </div>
)

/** ====== FILTER CONTROLS COMPONENT ====== **/

interface FilterControlsProps {
  uniqueMotives: readonly string[]
  isAdvancedFilterOpen: boolean
  toggleAdvancedFilter: () => void
  filters: AppointmentFilters
  updateFilter: <K extends keyof AppointmentFilters>(
    key: K,
    value: AppointmentFilters[K]
  ) => void
  resetFilters: () => void
  isMobile: boolean
}

const FilterControls = memo<FilterControlsProps>(
  ({
    uniqueMotives,
    isAdvancedFilterOpen,
    toggleAdvancedFilter,
    filters,
    updateFilter,
    resetFilters,
    isMobile,
  }) => {
    const buttonClasses = cn(
      "transition-colors",
      isAdvancedFilterOpen &&
        "bg-primary text-primary-foreground hover:bg-primary/90"
    )

    const handleDateRangeSelectPopover = useCallback(
      (range: DateRange | undefined) => {
        updateFilter("dateRange", range);
      },
      [updateFilter]
    );
    
    const datePickerKeyPopover = useMemo(
      () =>
        `popover-${filters.dateRange?.from?.getTime() || "none"}-${
          filters.dateRange?.to?.getTime() || "none"
        }`,
      [filters.dateRange]
    );


    return (
      <>
        <div className="bg-white dark:bg-gray-950 rounded-lg p-4 mb-4 shadow-sm border">
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
                        "w-full sm:w-auto justify-start text-left font-normal h-9", // sm:w-auto para que no ocupe todo el ancho en mobile
                        !filters.dateRange?.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange?.from ? (
                        filters.dateRange.to ? (
                          <>
                            {formatDate(filters.dateRange.from)} -{" "}
                            {formatDate(filters.dateRange.to)}
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
                        key={datePickerKeyPopover} // Usar key diferente para el popover
                        mode="range"
                        defaultMonth={filters.dateRange?.from || new Date()}
                        selected={filters.dateRange as any}
                        onSelect={handleDateRangeSelectPopover as any}
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
                             {/* Podrías añadir un botón "Aplicar" si el popover no se cierra al seleccionar */}
                          </div>
                        }
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </div>

        <FilterSummary filters={filters} updateFilter={updateFilter} />

        <div
          id="advanced-filters-panel"
          className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden", //  ease-in-out para suavizar
            isAdvancedFilterOpen
              ? "opacity-100 max-h-[1000px] " // Aumentar max-h para asegurar que quepa todo
              : "opacity-0 max-h-0"
          )}
        >
          {/* Renderizar condicionalmente para mejor rendimiento de la animación */}
          {isAdvancedFilterOpen && (
            <AdvancedFilters
                filters={filters}
                updateFilter={updateFilter}
                resetFilters={resetFilters}
                uniqueMotives={uniqueMotives}
                onClose={toggleAdvancedFilter}
                className="animate-in fade-in-0 slide-in-from-top-2 duration-300" // Animación al aparecer
            />
          )}
        </div>
      </>
    )
  }
)

FilterControls.displayName = "FilterControls"

/** ====== MAIN COMPONENT ====== **/

const INITIAL_DATE_RANGE: DateRange = {
  from: subDays(new Date(), 30),
  to: new Date(),
}

const INITIAL_FILTERS: AppointmentFilters = {
  dateRange: INITIAL_DATE_RANGE,
  motiveFilter: "all",
  statusFilter: [...APPOINTMENT_STATUSES],
  sortBy: "fechaConsulta",
  sortOrder: "desc",
  timeRange: [0, 24] as const,
  showDatePickerAdvanced: false,
} as const

export function AppointmentStatistics() {
  /** STATE **/
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<string>("general")
  const [dataError, setDataError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const [filters, setFilters] = useState<AppointmentFilters>(INITIAL_FILTERS)

  const {
    renderPieChart,
    renderBarChart,
    renderLineChart,
    renderWeekdayChart,
    renderScatterChart,
  } = useChartConfig()

  /** RESPONSIVENESS CHECK **/
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  /** MOUNT FLAG **/
  useEffect(() => {
    setMounted(true)
    // Simular carga inicial solo una vez al montar
    setIsLoading(true);
  }, [])

  /** LOADING SIMULATION **/
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading && mounted) {
      setProgress(0);
      let currentProgress = 0;
      timer = setInterval(() => {
        currentProgress += 10; // Ajustar para velocidad deseada
        if (currentProgress >= 100) {
          clearInterval(timer);
          setProgress(100);
          // Pequeño delay antes de quitar el loading para que se vea el 100%
          setTimeout(() => {
            setIsLoading(false);
            if (isFirstLoad) setIsFirstLoad(false);
          }, 300);
        } else {
          setProgress(currentProgress);
        }
      }, 100); // Intervalo más corto para progreso más rápido
    }
    return () => clearInterval(timer);
  }, [isLoading, mounted]); // Quitar isFirstLoad de aquí, ya que la carga se dispara con isLoading

  /** FILTER HANDLERS **/
  const updateFilter = useCallback(
    <K extends keyof AppointmentFilters>(key: K, value: AppointmentFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }))
      setIsLoading(true); // Disparar carga al cambiar filtros
    },
    []
  )

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS)
    setIsLoading(true); // Disparar carga al resetear filtros
  }, [])

  const toggleAdvancedFilter = useCallback(() => {
    setIsAdvancedFilterOpen((prev) => !prev)
  }, [])

  /** UNIQUE MOTIVES **/
  const uniqueMotives = useMemo(() => {
    const setMotives = new Set<string>()
    appointments.forEach((appt) => {
      if (appt.motivoConsulta) setMotives.add(appt.motivoConsulta)
    })
    return Array.from(setMotives).sort()
  }, [appointments])

  /** FILTER AND SORT APPOINTMENTS **/
  const filteredAppointments = useMemo(() => {
    try {
      if (!Array.isArray(appointments)) {
        console.warn("Appointments data not available or invalid.")
        setDataError("Los datos de citas no están disponibles o tienen un formato incorrecto.")
        return []
      }
      // Asegurarse de que mockAppointments es un array antes de copiar
      const temp = Array.isArray(appointments) ? [...appointments] : [];
      setDataError(null)

      return temp
        .filter((appt): appt is Appointment => appt != null) // Type guard
        .filter((appt) => {
          // Validar formato de hora HH:mm
          if (!/^\d{2}:\d{2}$/.test(appt.horaConsulta)) {
            console.warn(`Formato de hora inválido para cita ID ${appt.id}: ${appt.horaConsulta}`);
            return false;
          }
          // Intentar parsear fechaConsulta. Asumir que es un string que parseISO puede manejar.
          // Si fechaConsulta ya es un objeto Date, format lo manejará.
          let apptDateObj: Date;
          if (typeof appt.fechaConsulta === 'string') {
            // Combinar fecha y hora para un ISO string completo
            const isoString = `${appt.fechaConsulta}T${appt.horaConsulta}:00`;
            apptDateObj = parseISO(isoString);
          } else if (appt.fechaConsulta instanceof Date) {
             // Si ya es Date, clonarlo para evitar mutaciones si es necesario y combinar con horaConsulta
            const datePart = format(appt.fechaConsulta, "yyyy-MM-dd");
            apptDateObj = parseISO(`${datePart}T${appt.horaConsulta}:00`);
          } 
          else {
            console.warn(`Tipo de fechaConsulta no manejado para cita ID ${appt.id}: ${typeof appt.fechaConsulta}`);
            return false;
          }
          
          if (!isValid(apptDateObj)) {
            console.warn(`Fecha/hora inválida para cita ID ${appt.id}: ${appt.fechaConsulta} ${appt.horaConsulta}`);
            return false;
          }
          const { from, to } = filters.dateRange || {}
          if (from || to) {
            const fromDate = from ? startOfDay(from) : null;
            const toDate = to ? endOfDay(to) : null;

            if (fromDate && !toDate) {
              return isAfter(apptDateObj, fromDate) || isSameDay(apptDateObj, fromDate)
            }
            if (!fromDate && toDate) {
              return isBefore(apptDateObj, toDate) || isSameDay(apptDateObj, toDate)
            }
            if (fromDate && toDate) {
              return (
                (isAfter(apptDateObj, fromDate) || isSameDay(apptDateObj, fromDate)) &&
                (isBefore(apptDateObj, toDate) || isSameDay(apptDateObj, toDate))
              )
            }
          }
          return true
        })
        .filter(
          (appt) =>
            filters.motiveFilter === "all" ||
            (appt.motivoConsulta || "") === filters.motiveFilter
        )
        .filter((appt) => filters.statusFilter.includes(appt.estado))
        .filter((appt) => {
          const hour = hourToDecimal(appt.horaConsulta)
          return hour >= filters.timeRange[0] && hour <= filters.timeRange[1]
        })
        .sort((a, b) => {
          let comp = 0
          const valA = a[filters.sortBy]
          const valB = b[filters.sortBy]

          if (filters.sortBy === "fechaConsulta") {
            // Usar los objetos Date ya parseados si se implementa la sugerencia de pre-procesamiento
            // Por ahora, parsear de nuevo como se hacía:
            const dateA = parseISO(`${(typeof a.fechaConsulta === 'string' ? format(parseISO(a.fechaConsulta), "yyyy-MM-dd") : format(a.fechaConsulta, "yyyy-MM-dd"))}T${a.horaConsulta || "00:00"}:00`);
            const dateB = parseISO(`${(typeof b.fechaConsulta === 'string' ? format(parseISO(b.fechaConsulta), "yyyy-MM-dd") : format(b.fechaConsulta, "yyyy-MM-dd"))}T${b.horaConsulta || "00:00"}:00`);

            if (isValid(dateA) && isValid(dateB)) {
              comp = dateA.getTime() - dateB.getTime()
            } else if (isValid(dateA)) {
              comp = -1 // a antes que b si b es inválido
            } else if (isValid(dateB)) {
              comp = 1  // b antes que a si a es inválido
            }
          } else if (filters.sortBy === "nombre") {
            const nameA = `${a.nombre || ""} ${a.apellidos || ""}`
              .trim()
              .toLowerCase()
            const nameB = `${b.nombre || ""} ${b.apellidos || ""}`
              .trim()
              .toLowerCase()
            comp = nameA.localeCompare(nameB)
          } else if (typeof valA === "string" && typeof valB === "string") {
            comp = valA.localeCompare(valB)
          } else if (typeof valA === "number" && typeof valB === "number") {
            comp = valA - valB
          }
          // No cambiar nada si comp es 0, los tiebreakers se encargarán
          
          const result = filters.sortOrder === "asc" ? comp : -comp;

          // Tiebreakers solo si el resultado primario es 0
          if (result === 0) {
            // Tiebreaker 1: fechaConsulta (si no es el sortBy primario)
            if (filters.sortBy !== "fechaConsulta") {
              const dateA = parseISO(`${(typeof a.fechaConsulta === 'string' ? format(parseISO(a.fechaConsulta), "yyyy-MM-dd") : format(a.fechaConsulta, "yyyy-MM-dd"))}T${a.horaConsulta || "00:00"}:00`);
              const dateB = parseISO(`${(typeof b.fechaConsulta === 'string' ? format(parseISO(b.fechaConsulta), "yyyy-MM-dd") : format(b.fechaConsulta, "yyyy-MM-dd"))}T${b.horaConsulta || "00:00"}:00`);
              if (isValid(dateA) && isValid(dateB)) {
                const dateComp = dateA.getTime() - dateB.getTime();
                if (dateComp !== 0) return dateComp; // Orden ascendente por fecha como tiebreaker
              } else if (isValid(dateA)) {
                return -1;
              } else if (isValid(dateB)) {
                return 1;
              }
            }
            // Tiebreaker 2: nombre (si no es el sortBy primario y no es fechaConsulta)
            if (filters.sortBy !== "nombre" && filters.sortBy !== "fechaConsulta") {
              const nameA = `${a.nombre || ""} ${a.apellidos || ""}`.trim().toLowerCase();
              const nameB = `${b.nombre || ""} ${b.apellidos || ""}`.trim().toLowerCase();
              const nameComp = nameA.localeCompare(nameB);
              if (nameComp !== 0) return nameComp; // Orden alfabético por nombre como tiebreaker
            }
          }
          return result;
        })
    } catch (error) {
      console.error("Error al filtrar citas:", error)
      setDataError("Error al procesar los datos. Por favor, actualice la página o verifique los filtros.")
      return []
    }
  }, [appointments, filters])

  /** GENERAL STATS (MODIFICADO) **/
  const generalStats = useMemo((): GeneralStats => {
    const total = filteredAppointments.length
    
    // Inicializar allStatusCounts con todos los estados a 0
    const initialCounts: Record<AppointmentStatus, number> = 
      APPOINTMENT_STATUSES.reduce((acc, status) => {
        acc[status] = 0;
        return acc;
      }, {} as Record<AppointmentStatus, number>);

    const allStatusCounts = filteredAppointments.reduce((acc, appt) => {
      if (appt && appt.estado && APPOINTMENT_STATUSES.includes(appt.estado)) {
        acc[appt.estado]++;
      }
      return acc;
    }, initialCounts);

    if (total === 0) {
      const period = filters.dateRange
        ? `${
            filters.dateRange.from
              ? formatDate(filters.dateRange.from)
              : "Inicio"
          } - ${
            filters.dateRange.to
              ? formatDate(filters.dateRange.to)
              : "Actual"
          }`
        : "Todos los datos"
      return {
        total: 0,
        attendance: 0,
        cancellation: 0,
        pending: 0,
        present: 0,
        completed: 0, // specific count
        cancelled: 0, // specific count
        pendingCount: 0, // specific count for stat card
        presentCount: 0, // specific count for stat card
        period,
        allStatusCounts: initialCounts, // Devolver conteos inicializados a 0
      }
    }

    const completed = allStatusCounts.completada;
    const cancelled = allStatusCounts.cancelada;
    const pending = allStatusCounts.pendiente;
    const present = allStatusCounts.presente;

    const calcPercent = (val: number): number => (total > 0 ? (val / total) * 100 : 0)

    const period = filters.dateRange
      ? `${
          filters.dateRange.from
            ? formatDate(filters.dateRange.from)
            : "Inicio"
        } - ${
          filters.dateRange.to
            ? formatDate(filters.dateRange.to)
            : "Actual"
        }`
      : "Todos los datos"

    return {
      total,
      attendance: calcPercent(completed + present),
      cancellation: calcPercent(cancelled),
      pending: calcPercent(pending),
      present: calcPercent(present),
      completed, // specific count
      cancelled, // specific count
      pendingCount: pending, // specific count for stat card
      presentCount: present, // specific count for stat card
      period,
      allStatusCounts, // Devolver todos los conteos
    }
  }, [filteredAppointments, filters.dateRange])

  /** STATUS CHART DATA (MODIFICADO) **/
  const statusChartData = useMemo((): StatusChartData[] => {
    const { allStatusCounts } = generalStats;
    return APPOINTMENT_STATUSES.map(status => ({
      name: status,
      value: allStatusCounts[status] || 0, // Usar el conteo de allStatusCounts
      color: STATUS_COLORS[status],
    }));
  }, [generalStats]); // Depender solo de generalStats

  /** MOTIVE CHART DATA **/
  const motiveChartData = useMemo((): MotiveChartData[] => {
    const countMap: Record<string, number> = {}
    filteredAppointments.forEach((appt) => {
      const motive = appt.motivoConsulta || "Desconocido"
      countMap[motive] = (countMap[motive] || 0) + 1
    })
    return Object.entries(countMap)
      .map(([motive, count]) => ({ motive, count }))
      .sort((a, b) => b.count - a.count)
  }, [filteredAppointments])

  /** TREND CHART DATA **/
  const trendChartData = useMemo((): TrendChartData[] => {
    const byDate: Record<string, Record<AppointmentStatus | "total", number>> = {}
    filteredAppointments.forEach((appt) => {
      // Asumir que appt.fechaConsulta es un string parseable por parseISO o un objeto Date
      const dateObj = typeof appt.fechaConsulta === 'string' ? parseISO(appt.fechaConsulta) : appt.fechaConsulta;
      if (!isValid(dateObj)) return; // Saltar si la fecha es inválida
      const dateStr = format(dateObj, "yyyy-MM-dd")
      
      if (!byDate[dateStr]) {
        byDate[dateStr] = {
          total: 0, // Aunque no se usa directamente en el gráfico de líneas por estado, es bueno tenerlo
          completada: 0,
          cancelada: 0,
          pendiente: 0,
          presente: 0,
          reprogramada: 0,
          no_asistio: 0,
        }
      }
      // byDate[dateStr].total++ // No es necesario para el gráfico de líneas por estado
      if (APPOINTMENT_STATUSES.includes(appt.estado)) {
        byDate[dateStr][appt.estado]++;
      }
    })

    const entries = Object.entries(byDate).map(([date, counts]) => ({
      date,
      // total: counts.total, // No es necesario para el gráfico de líneas por estado
      completada: counts.completada,
      cancelada: counts.cancelada,
      pendiente: counts.pendiente,
      presente: counts.presente,
      reprogramada: counts.reprogramada,
      no_asistio: counts.no_asistio,
      formattedDate: format(parseISO(date), "dd/MM", { locale: es }), // Usar locale es
    }))

    const sorted = entries.sort((a, b) => a.date.localeCompare(b.date))

    if (sorted.length > 0 && filters.dateRange?.from && filters.dateRange?.to) {
      const filled: TrendChartData[] = []
      let curr = startOfDay(filters.dateRange.from)
      const end = endOfDay(filters.dateRange.to) // Usar endOfDay para incluir el último día

      while (isBefore(curr, end) || isSameDay(curr, end)) {
        const dStr = format(curr, "yyyy-MM-dd")
        const existing = sorted.find((item) => item.date === dStr)
        if (existing) {
          filled.push(existing)
        } else {
          filled.push({
            date: dStr,
            completada: 0,
            cancelada: 0,
            pendiente: 0,
            presente: 0,
            reprogramada: 0,
            no_asistio: 0,
            formattedDate: format(curr, "dd/MM", { locale: es }), // Usar locale es
          })
        }
        curr = addDays(curr, 1)
      }
      return filled
    }
    return sorted
  }, [filteredAppointments, filters.dateRange])

  /** WEEKDAY CHART DATA **/
  const weekdayChartData = useMemo((): WeekdayChartData[] => {
    const init: Record<number, { name: string; total: number; attended: number }> = {
      // Usar nombres de WEEKDAYS para consistencia, ajustando el índice (Date.getDay() es 0 para Domingo)
      0: { name: WEEKDAYS[0], total: 0, attended: 0 }, // Domingo
      1: { name: WEEKDAYS[1], total: 0, attended: 0 }, // Lunes
      2: { name: WEEKDAYS[2], total: 0, attended: 0 }, // Martes
      3: { name: WEEKDAYS[3], total: 0, attended: 0 }, // Miércoles
      4: { name: WEEKDAYS[4], total: 0, attended: 0 }, // Jueves
      5: { name: WEEKDAYS[5], total: 0, attended: 0 }, // Viernes
      6: { name: WEEKDAYS[6], total: 0, attended: 0 }, // Sábado
    }
    filteredAppointments.forEach((appt) => {
      const dateObj = typeof appt.fechaConsulta === 'string' ? parseISO(appt.fechaConsulta) : appt.fechaConsulta;
      if (!isValid(dateObj)) return;
      const dow = dateObj.getDay() // 0 (Domingo) a 6 (Sábado)
      
      if (init[dow]) { // Asegurarse que el día existe en init
        init[dow].total++
        if (appt.estado === "completada" || appt.estado === "presente") {
          init[dow].attended++
        }
      }
    })
    return Object.values(init).map((day) => ({
      ...day,
      rate: day.total > 0 ? (day.attended / day.total) * 100 : 0,
    }))
  }, [filteredAppointments])

  /** SCATTER DATA **/
  const scatterData = useMemo((): ScatterData => {
    const mapByStatus: Record<AppointmentStatus, Record<string, ScatterPoint>> = 
      APPOINTMENT_STATUSES.reduce((acc, status) => {
        acc[status] = {};
        return acc;
      }, {} as Record<AppointmentStatus, Record<string, ScatterPoint>>);

    filteredAppointments.forEach((appt) => {
      const dateObj = typeof appt.fechaConsulta === 'string' ? parseISO(appt.fechaConsulta) : appt.fechaConsulta;
      if (!isValid(dateObj) || !appt.horaConsulta || !/^\d{1,2}:\d{2}$/.test(appt.horaConsulta)) return;

      const hour = Number.parseInt(appt.horaConsulta.split(":")[0], 10)
      const dow = dateObj.getDay() // 0 (Domingo) a 6 (Sábado)
      const key = `${dow}-${hour}`

      if (APPOINTMENT_STATUSES.includes(appt.estado)) {
        if (!mapByStatus[appt.estado][key]) {
          mapByStatus[appt.estado][key] = {
            day: dow,
            hour,
            count: 0,
            dayName: WEEKDAYS[dow] || `Día ${dow}`, // Fallback por si WEEKDAYS no está completo
          }
        }
        mapByStatus[appt.estado][key].count++
      }
    })
    
    const result: ScatterData = {
        completada: [],
        cancelada: [],
        pendiente: [],
        presente: [],
        reprogramada: [],
        no_asistio: [],
    };

    APPOINTMENT_STATUSES.forEach(status => {
        result[status] = Object.values(mapByStatus[status]);
    });
    
    return result;

  }, [filteredAppointments])

  /** REFRESH HANDLER **/
  const handleRefresh = useCallback(() => {
    if (isLoading) return
    setIsLoading(true) // Activar el estado de carga
    // Simular una recarga de datos. En una app real, aquí harías una llamada a la API.
    setTimeout(() => {
      // Crear nuevos IDs para simular datos "frescos" y forzar re-renderizados si es necesario
      const newMockAppointments = mockAppointments.map((a) => ({ ...a, id: `${a.id}-${Date.now()}` }));
      setAppointments(newMockAppointments);
      // setIsLoading(false) se manejará por el useEffect de la simulación de carga
    }, 300) // Pequeño delay para que el usuario vea el feedback de "Actualizando..."
  }, [isLoading]) // isLoading como dependencia para evitar múltiples llamadas si ya está cargando

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  /** TAB CONTENT COMMON PROPS **/
  const tabContentPropsBase = {
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
    isFirstLoad, // Mantener para animaciones iniciales si se desea
  }

  return (
    <div
      className={`animate-in fade-in duration-300 ${
        isFirstLoad && !isLoading ? "opacity-100" : isLoading && isFirstLoad ? "opacity-0" : "opacity-100" // Ajustar opacidad para carga inicial
      }`}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <TabsList className="h-10 p-1 bg-muted text-muted-foreground rounded-md">
            {["general", "trends", "weekday", "correlation"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="flex items-center gap-1 relative data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-sm px-3 py-1.5 text-sm font-medium transition-all"
              >
                <span>{tab === "weekday" ? "Día Semana" : tab === "trends" ? "Tendencias" : tab === "correlation" ? "Correlación" : "General"}</span>
                {/* La animación de la línea inferior puede ser opcional o ajustada */}
                {/* {activeTab === tab && (
                  <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary rounded-full animate-in slide-in-from-left-1/2" />
                )} */}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-9 transition-all hover:bg-muted/80 border-border"
              disabled={isLoading}
            >
              <RefreshCw
                className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")}
              />
              {isLoading ? "Actualizando..." : "Actualizar"}
            </Button>
          </div>
        </div>

        <FilterControls
          uniqueMotives={uniqueMotives}
          isAdvancedFilterOpen={isAdvancedFilterOpen}
          toggleAdvancedFilter={toggleAdvancedFilter}
          filters={filters}
          updateFilter={updateFilter}
          resetFilters={resetFilters}
          isMobile={isMobile}
        />

        {dataError && (
          <Alert
            variant="destructive"
            className="my-4 animate-in slide-in-from-top duration-300"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error en los Datos</AlertTitle>
            <AlertDescription>{dataError}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6 relative min-h-[350px]">
          <Suspense fallback={<TabLoadingFallback />}>
            <TabsContent value="general" className="space-y-8 m-0 outline-none">
              {isLoading && activeTab === "general" ? (
                <div className="w-full py-8 flex flex-col items-center justify-center min-h-[300px]">
                  <p className="text-sm text-muted-foreground mb-2 text-center">
                    Cargando datos generales...
                  </p>
                  <Progress value={progress} className="h-2 mx-auto max-w-md" />
                </div>
              ) : (
                <LazyGeneralTabContent
                  {...tabContentPropsBase}
                  isLoading={isLoading} // Pasar isLoading para que el componente hijo decida si mostrar su propio loader
                />
              )}
            </TabsContent>

            <TabsContent value="trends" className="space-y-8 m-0 outline-none">
              <LazyTrendsTabContent
                {...tabContentPropsBase}
                isLoading={isLoading}
                progress={progress}
              />
            </TabsContent>

            <TabsContent value="weekday" className="space-y-8 m-0 outline-none">
              <LazyWeekdayTabContent
                {...tabContentPropsBase}
                isLoading={isLoading}
                progress={progress}
              />
            </TabsContent>

            <TabsContent value="correlation" className="space-y-8 m-0 outline-none">
              <LazyCorrelationTabContent
                {...tabContentPropsBase}
                isLoading={isLoading}
                progress={progress}
              />
            </TabsContent>
          </Suspense>
        </div>
      </Tabs>
    </div>
  )
}

export default memo(AppointmentStatistics)
