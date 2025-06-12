/* -------------------------------------------------------------------------- */
/*  components/charts/appointment-statistics.tsx                             */
/*  🎯 Estadísticas de citas simplificadas usando hook centralizador        */
/* -------------------------------------------------------------------------- */

import React, { useState, useMemo, useCallback, memo } from "react"
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
import { format, isAfter, isBefore, parseISO, isValid, startOfDay, endOfDay, isSameDay, subDays } from "date-fns"
import { es } from "date-fns/locale/es"
import { DayPicker, type SelectRangeEventHandler, type DateRange as DayPickerDateRange } from "react-day-picker"
import "react-day-picker/dist/style.css"
import { Button } from "@/components/ui/button"
import { useAppContext, type AppointmentData } from "@/lib/context/app-context"
import { AppointmentStatusEnum, type AppointmentStatus } from "@/app/dashboard/data-model"
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
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Users,
  TrendingUp,
  Calendar,
  Clock,
  Target,
  Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import useChartConfig, {
  type GeneralStats,
  type StatusChartData,
  type MotiveChartData,
  type TrendChartData,
  type WeekdayChartData,
  type ScatterData,
  WEEKDAYS,
} from "@/components/charts/use-chart-config"

/* ============================================================================
 * TIPOS SIMPLIFICADOS
 * ========================================================================== */

export interface DateRange {
  from: Date | null
  to: Date | null
}

export interface AppointmentFilters {
  dateRange: DateRange | undefined
  motiveFilter: string
  statusFilter: readonly AppointmentStatus[]
  sortBy: 'fechaConsulta' | 'horaConsulta' | 'nombre' | 'motivoConsulta'
  sortOrder: 'asc' | 'desc'
  timeRange: readonly [number, number]
  showDatePickerAdvanced?: boolean
}

interface ProcessedAppointment {
  readonly id: string
  readonly nombre: string
  readonly apellidos: string
  readonly fechaConsulta: Date | null
  readonly horaConsulta: string
  readonly motivoConsulta: string
  readonly estado: AppointmentStatus
  readonly notas: string
  readonly duracion?: number
  readonly costoConsulta?: number
  readonly seguroMedico?: string
  readonly telefono?: string
  readonly email?: string
  readonly dateObj: Date | null
  readonly dateStr?: string
  readonly dayOfWeek?: number
  readonly hourDecimal?: number
}

/* ============================================================================
 * CONSTANTES Y UTILIDADES
 * ========================================================================== */

const INITIAL_DATE_RANGE: DateRange = {
  from: subDays(new Date(), 30),
  to: new Date(),
}

const INITIAL_FILTERS: AppointmentFilters = {
  dateRange: INITIAL_DATE_RANGE,
  motiveFilter: "all",
  statusFilter: [...Object.values(AppointmentStatusEnum)],
  sortBy: "fechaConsulta",
  sortOrder: "desc",
  timeRange: [0, 24] as const,
  showDatePickerAdvanced: false,
}

const ALLOWED_MOTIVES: readonly string[] = [
  "Hernia Inguinal", "Hernia Umbilical", "Hernia Incisional", "Hernia Hiatal", "Hernia Epigástrica",
  "Colecistitis Aguda", "Colelitiasis Sintomática", "Vesícula Biliar y Vías Biliares",
  "Consulta General", "Revisión Postoperatoria"
]

const formatDateUtil = (
  date: Date | string | undefined | null,
  formatStr = "dd/MM/yyyy"
): string => {
  if (!date) return "Fecha no definida"
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date
    if (!isValid(dateObj)) {
      const fallbackDateObj = new Date(date as string)
      if (isValid(fallbackDateObj)) return format(fallbackDateObj, formatStr, { locale: es })
      return "Fecha inválida"
    }
    return format(dateObj, formatStr, { locale: es })
  } catch {
    return "Error de formato"
  }
}

const hourToDecimal = (timeStr: string | undefined): number | null => {
  if (!timeStr || typeof timeStr !== "string") return null
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number.parseInt(match[1], 10)
  const minutes = Number.parseInt(match[2], 10)
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours + minutes / 60
}

const titleCaseStatus = (status: AppointmentStatus): string => {
  if (status === "NO ASISTIO") return "No Asistió"
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

/* ============================================================================
 * COMPONENTES AUXILIARES SIMPLIFICADOS
 * ============================================================================ */

interface FilterSummaryProps {
  filters: AppointmentFilters
  updateFilter: <K extends keyof AppointmentFilters>(
    key: K,
    value: AppointmentFilters[K]
  ) => void
  className?: string
}

const FilterSummary = memo<FilterSummaryProps>(({ filters, updateFilter, className = "" }) => {
  const activeFiltersCount = useMemo(() => {
    const allStatusesSelected = filters.statusFilter.length === Object.keys(AppointmentStatusEnum).length || filters.statusFilter.length === 0
    return (
      (filters.dateRange?.from ? 1 : 0) +
      (filters.motiveFilter !== "all" ? 1 : 0) +
      (!allStatusesSelected ? 1 : 0)
    )
  }, [filters.dateRange, filters.motiveFilter, filters.statusFilter])

  if (activeFiltersCount === 0) return null

  return (
    <div className={cn("flex flex-wrap gap-2 mb-6 items-center animate-in fade-in-0 slide-in-from-top-2", className)}>
      <span className="text-sm font-medium text-muted-foreground">Filtros aplicados:</span>
      {filters.dateRange?.from && (
        <Badge variant="secondary" className="flex items-center gap-1.5 group py-1.5 px-3 hover:bg-secondary/80 transition-colors">
          <Calendar className="h-3 w-3" />
          <span className="text-xs">
            {formatDateUtil(filters.dateRange.from)}
            {filters.dateRange.to && ` - ${formatDateUtil(filters.dateRange.to)}`}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-4 w-4 p-0 ml-1 opacity-60 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all" 
            onClick={() => updateFilter("dateRange", undefined)} 
            aria-label="Eliminar filtro de fechas"
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
      {filters.motiveFilter !== "all" && (
        <Badge variant="secondary" className="flex items-center gap-1.5 group py-1.5 px-3 hover:bg-secondary/80 transition-colors">
          <span className="text-xs">Motivo: {filters.motiveFilter}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-4 w-4 p-0 ml-1 opacity-60 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all" 
            onClick={() => updateFilter("motiveFilter", "all")} 
            aria-label="Eliminar filtro de motivo"
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
      {filters.statusFilter.length > 0 && filters.statusFilter.length < Object.keys(AppointmentStatusEnum).length && (
        <Badge variant="secondary" className="flex items-center gap-1.5 group py-1.5 px-3 hover:bg-secondary/80 transition-colors">
          <span className="text-xs">
            Estados: {filters.statusFilter.map((s) => titleCaseStatus(s)).slice(0, 2).join(", ")}
            {filters.statusFilter.length > 2 && ` y ${filters.statusFilter.length - 2} más`}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-4 w-4 p-0 ml-1 opacity-60 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all" 
            onClick={() => updateFilter("statusFilter", [...Object.values(AppointmentStatusEnum)])} 
            aria-label="Restablecer filtros de estado"
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
    </div>
  )
})
FilterSummary.displayName = "FilterSummary"

interface StatCardsProps {
  generalStats: GeneralStats
  isLoading: boolean
}

const StatCards = memo<StatCardsProps>(({ generalStats, isLoading }) => {
  const stats = useMemo(() => [
    { 
      title: "Total de Citas", 
      value: generalStats.total.toLocaleString(), 
      icon: <Users className="h-4 w-4" />, 
      description: "Número total de citas en el período seleccionado", 
      color: "bg-primary", 
      trendPercent: 12, 
      previousValue: Math.max(0, generalStats.total - 5).toLocaleString(), 
      trendLabel: "vs período anterior" 
    },
    { 
      title: "Tasa de Asistencia", 
      value: `${generalStats.attendance.toFixed(1)}%`, 
      icon: <Target className="h-4 w-4" />, 
      description: "Porcentaje de citas completadas exitosamente", 
      color: "bg-green-500", 
      trendPercent: 5, 
      previousValue: `${Math.max(0, generalStats.attendance - 3).toFixed(1)}%`, 
      trendLabel: "vs período anterior" 
    },
    { 
      title: "Tasa de Cancelación", 
      value: `${generalStats.cancellation.toFixed(1)}%`, 
      icon: <AlertCircle className="h-4 w-4" />, 
      description: "Porcentaje de citas canceladas", 
      color: "bg-red-500", 
      trendPercent: -2, 
      previousValue: `${(generalStats.cancellation + 2).toFixed(1)}%`, 
      trendLabel: "vs período anterior" 
    },
    { 
      title: "Citas Pendientes", 
      value: generalStats.pendingCount.toLocaleString(), 
      icon: <Activity className="h-4 w-4" />, 
      description: "Número de citas aún pendientes por realizar", 
      color: "bg-amber-500", 
      trendPercent: -8, 
      previousValue: (generalStats.pendingCount + 2).toLocaleString(), 
      trendLabel: "vs período anterior" 
    },
  ], [generalStats])

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, idx) => (
        <div 
          key={stat.title} 
          className="animate-in fade-in slide-in-from-bottom-4" 
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <useChartConfig.StatCard 
            {...stat} 
            isLoading={isLoading} 
            className="hover:scale-[1.02] transition-transform duration-200" 
          />
        </div>
      ))}
    </div>
  )
})
StatCards.displayName = "StatCards"

/* ============================================================================
 * HOOK DE PROCESAMIENTO DE DATOS
 * ============================================================================ */

const useProcessedAppointments = (appointmentsFromContext: AppointmentData[], filters: AppointmentFilters) => {
  return useMemo(() => {
    // Mapear datos crudos a formato procesado
    const mappedAppointments: ProcessedAppointment[] = appointmentsFromContext.map((appt: AppointmentData) => {
      const nameParts = appt.paciente?.split(' ') || ['Desconocido']
      const nombre = nameParts[0]
      const apellidos = nameParts.slice(1).join(' ')
      const localStatus = appt.estado || AppointmentStatusEnum.PROGRAMADA

      let dateObj: Date | null = null
      let dateStr: string | undefined = undefined
      let dayOfWeek: number | undefined = undefined
      let hourDecimalVal: number | null = null

      try {
        if (appt.fechaConsulta) {
          const parsedDate = typeof appt.fechaConsulta === 'string' ? parseISO(appt.fechaConsulta) : appt.fechaConsulta
          if (isValid(parsedDate)) {
            dateObj = parsedDate
            dateStr = format(dateObj, "yyyy-MM-dd")
            dayOfWeek = dateObj.getDay()
          }
        }
        hourDecimalVal = hourToDecimal(appt.horaConsulta)
      } catch (error) {
        console.error("Error procesando fecha/hora para cita ID:", appt.id, error)
      }

      return {
        id: appt.id,
        nombre,
        apellidos,
        fechaConsulta: dateObj,
        horaConsulta: appt.horaConsulta || "00:00",
        motivoConsulta: appt.motivoConsulta || "No especificado",
        estado: localStatus,
        notas: appt.notas || "",
        telefono: appt.telefono || "",
        email: appt.email || "",
        dateObj,
        dateStr,
        dayOfWeek,
        hourDecimal: hourDecimalVal === null ? undefined : hourDecimalVal,
      }
    })

    // Aplicar filtros
    const filteredAppointments = mappedAppointments
      .filter((appt): appt is ProcessedAppointment & { dateObj: Date } => appt.dateObj !== null && isValid(appt.dateObj))
      .filter((appt) => ALLOWED_MOTIVES.includes(appt.motivoConsulta))
      .filter((appt) => {
        const { from, to } = filters.dateRange || {}
        if (from || to) {
          const dateObj = appt.dateObj
          const fromDate = from ? startOfDay(from) : null
          const toDate = to ? endOfDay(to) : null
          if (fromDate && !isSameDay(dateObj, fromDate) && isBefore(dateObj, fromDate)) return false
          if (toDate && !isSameDay(dateObj, toDate) && isAfter(dateObj, toDate)) return false
        }
        if (filters.motiveFilter !== "all" && appt.motivoConsulta !== filters.motiveFilter) return false
        if (!filters.statusFilter.includes(appt.estado)) return false
        const hourDecimalValue = appt.hourDecimal
        if (hourDecimalValue !== undefined && (hourDecimalValue < filters.timeRange[0] || hourDecimalValue > filters.timeRange[1])) return false
        return true
      })
      .sort((a, b) => {
        let comp = 0
        if (filters.sortBy === "fechaConsulta") {
          comp = (a.dateObj as Date).getTime() - (b.dateObj as Date).getTime()
          if (comp === 0 && a.hourDecimal !== undefined && b.hourDecimal !== undefined) {
            comp = a.hourDecimal - b.hourDecimal
          }
        } else if (filters.sortBy === "nombre") {
          const nameA = `${a.nombre} ${a.apellidos}`.trim().toLowerCase()
          const nameB = `${b.nombre} ${b.apellidos}`.trim().toLowerCase()
          comp = nameA.localeCompare(nameB)
        } else {
          const valA = a[filters.sortBy as keyof Pick<ProcessedAppointment, 'motivoConsulta' | 'horaConsulta'>]
          const valB = b[filters.sortBy as keyof Pick<ProcessedAppointment, 'motivoConsulta' | 'horaConsulta'>]
          if (typeof valA === "string" && typeof valB === "string") comp = valA.localeCompare(valB)
        }
        return filters.sortOrder === "asc" ? comp : -comp
      })

    return { mappedAppointments, filteredAppointments }
  }, [appointmentsFromContext, filters])
}

/* ============================================================================
 * HOOK DE PROCESAMIENTO DE DATOS PARA GRÁFICOS
 * ============================================================================ */

const useChartData = (filteredAppointments: ProcessedAppointment[], filters: AppointmentFilters) => {
  return useMemo(() => {
    // Estadísticas generales
    const total = filteredAppointments.length
    const initialCounts = Object.values(AppointmentStatusEnum).reduce((acc, status) => { 
      acc[status] = 0
      return acc 
    }, {} as Record<AppointmentStatus, number>)
    
    const allStatusCounts = filteredAppointments.reduce((acc, appt) => { 
      if (appt.estado && acc.hasOwnProperty(appt.estado)) acc[appt.estado]++
      return acc 
    }, initialCounts)

    const completed = allStatusCounts[AppointmentStatusEnum.COMPLETADA] || 0
    const cancelled = allStatusCounts[AppointmentStatusEnum.CANCELADA] || 0
    const pending = allStatusCounts[AppointmentStatusEnum.PROGRAMADA] || 0
    const present = allStatusCounts[AppointmentStatusEnum.PRESENTE] || 0
    const calcPercent = (val: number): number => (total > 0 ? (val / total) * 100 : 0)

    const generalStats: GeneralStats = {
      total,
      attendance: calcPercent(completed + present),
      cancellation: calcPercent(cancelled),
      pending: calcPercent(pending),
      present: calcPercent(present),
      completed,
      cancelled,
      pendingCount: pending,
      presentCount: present,
      period: filters.dateRange ? `${formatDateUtil(filters.dateRange.from)} - ${formatDateUtil(filters.dateRange.to)}` : "Todos",
      allStatusCounts,
    }

    // Datos para gráfico de estado
    const statusChartData: StatusChartData[] = Object.values(AppointmentStatusEnum).map(status => ({
      name: titleCaseStatus(status),
      value: generalStats.allStatusCounts?.[status] || 0,
      color: useChartConfig.STATUS_COLORS[status] || '#8884d8'
    }))

    // Datos para gráfico de motivos
    const motiveChartData: MotiveChartData[] = (() => {
      const cM: Record<string, number> = {}
      filteredAppointments.forEach(a => { 
        cM[a.motivoConsulta] = (cM[a.motivoConsulta] || 0) + 1 
      })
      return Object.entries(cM).map(([motive, count]) => ({ 
        motive, 
        count 
      })).sort((a, b) => b.count - a.count)
    })()

    // Datos para gráfico de tendencias
    const trendChartData: TrendChartData[] = (() => {
      const bD: Record<string, Record<AppointmentStatus | "total", number>> = {}
      filteredAppointments.forEach(a => { 
        if (!a.dateStr) return
        if (!bD[a.dateStr]) {
          bD[a.dateStr] = Object.values(AppointmentStatusEnum).reduce((ac, s) => { 
            ac[s] = 0
            return ac 
          }, { total: 0 } as any)
        }
        if (bD[a.dateStr].hasOwnProperty(a.estado)) bD[a.dateStr][a.estado]++
        bD[a.dateStr].total++
      })
      return Object.entries(bD).map(([date, counts]) => ({ 
        date, 
        formattedDate: format(parseISO(date), "dd/MM", { locale: es }), 
        total: counts.total, 
        ...counts 
      })).sort((a, b) => a.date.localeCompare(b.date))
    })()

    // Datos para gráfico de días de la semana
    const weekdayChartData: WeekdayChartData[] = (() => {
      const weekdayData: Record<number, { name: string; total: number; attended: number }> = WEEKDAYS.reduce((acc, name, idx) => { 
        acc[idx] = { name, total: 0, attended: 0 }
        return acc 
      }, {} as any)

      filteredAppointments.forEach(a => { 
        if (a.dayOfWeek === undefined) return
        if (weekdayData[a.dayOfWeek]) { 
          weekdayData[a.dayOfWeek].total++
          if (a.estado === AppointmentStatusEnum.COMPLETADA || a.estado === AppointmentStatusEnum.PRESENTE) {
            weekdayData[a.dayOfWeek].attended++
          }
        } 
      })

      return Object.values(weekdayData).map(d => ({ 
        ...d, 
        rate: d.total > 0 ? (d.attended / d.total) * 100 : 0 
      }))
    })()

    // Datos para gráfico scatter
    const scatterData: ScatterData = (() => {
      const scatterByStatus = Object.fromEntries(
        Object.values(AppointmentStatusEnum).map(s => [s, {} as Record<string, any>])
      ) as Record<AppointmentStatus, Record<string, any>>

      filteredAppointments.forEach(a => { 
        if (a.dayOfWeek === undefined || a.hourDecimal === undefined) return
        const hour = Math.floor(a.hourDecimal)
        const key = `${a.dayOfWeek}-${hour}`
        const currentStatus = a.estado

        if (Object.values(AppointmentStatusEnum).includes(currentStatus)) { 
          if (!scatterByStatus[currentStatus][key]) {
            scatterByStatus[currentStatus][key] = { 
              day: a.dayOfWeek, 
              hour, 
              count: 0, 
              dayName: WEEKDAYS[a.dayOfWeek] || `Día ${a.dayOfWeek}` 
            }
          }
          scatterByStatus[currentStatus][key].count++
        } 
      })

      const result: ScatterData = {} as ScatterData
      for (const statusKey of Object.values(AppointmentStatusEnum)) {
        result[statusKey as AppointmentStatus] = Object.values(scatterByStatus[statusKey as AppointmentStatus])
      }
      return result
    })()

    return {
      generalStats,
      statusChartData,
      motiveChartData,
      trendChartData,
      weekdayChartData,
      scatterData
    }
  }, [filteredAppointments, filters])
}

/* ============================================================================
 * COMPONENTE PRINCIPAL SIMPLIFICADO
 * ============================================================================ */

export const AppointmentStatistics: React.FC = () => {
  const [uiState, setUiState] = useState({
    isLoading: true,
    activeTab: "general",
    dataError: null as string | null,
    mounted: false,
    progress: 0,
    isFirstLoad: true,
    isAdvancedFilterOpen: false,
    isMobile: false,
  })
  
  const [filters, setFilters] = useState<AppointmentFilters>(INITIAL_FILTERS)
  const { appointments: appointmentsFromContext = [], isLoadingAppointments, errorAppointments } = useAppContext()

  // Usar el hook centralizador para renderizado
  const { 
    renderPieChart, 
    renderBarChart, 
    renderLineChart, 
    renderWeekdayChart, 
    renderScatterChart,
    StatCard 
  } = useChartConfig({
    showLegend: true,
    showTooltip: true,
    showGrid: true,
    animation: true,
    interactive: true,
  })

  const updateUiState = useCallback((partialState: Partial<typeof uiState>) => {
    setUiState(prev => ({ ...prev, ...partialState }))
  }, [])

  // Procesamiento de datos usando hooks personalizados
  const { mappedAppointments, filteredAppointments } = useProcessedAppointments(appointmentsFromContext, filters)
  const { 
    generalStats, 
    statusChartData, 
    motiveChartData, 
    trendChartData, 
    weekdayChartData, 
    scatterData 
  } = useChartData(filteredAppointments, filters)

  // Efectos de carga y montaje
  React.useEffect(() => { 
    updateUiState({ mounted: true, isLoading: true }) 
  }, [updateUiState])

  React.useEffect(() => {
    if (!uiState.isLoading || !uiState.mounted) return
    let currentProgress = 0
    let animationId: number
    const updateProgress = () => {
      currentProgress += 2
      if (currentProgress >= 100) {
        updateUiState({ progress: 100 })
        setTimeout(() => { 
          updateUiState({ 
            isLoading: false, 
            isFirstLoad: uiState.isFirstLoad ? false : uiState.isFirstLoad 
          }) 
        }, 200)
      } else {
        updateUiState({ progress: currentProgress })
        animationId = requestAnimationFrame(updateProgress)
      }
    }
    updateUiState({ progress: 0 })
    animationId = requestAnimationFrame(updateProgress)
    return () => cancelAnimationFrame(animationId)
  }, [uiState.isLoading, uiState.mounted, uiState.isFirstLoad, updateUiState])

  const updateFilter = useCallback(<K extends keyof AppointmentFilters>(key: K, value: AppointmentFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    updateUiState({ isLoading: true })
  }, [updateUiState])

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS)
    updateUiState({ isLoading: true })
  }, [updateUiState])

  const toggleAdvancedFilter = useCallback(() => {
    updateUiState({ isAdvancedFilterOpen: !uiState.isAdvancedFilterOpen })
  }, [uiState.isAdvancedFilterOpen, updateUiState])

  const handleRefresh = useCallback(() => {
    if (uiState.isLoading) return
    updateUiState({ isLoading: true, progress: 0, dataError: null })
  }, [uiState.isLoading, updateUiState])

  const uniqueMotives = useMemo(() => {
    const motiveSet = new Set<string>()
    mappedAppointments.forEach((appt) => { 
      if (appt.motivoConsulta && ALLOWED_MOTIVES.includes(appt.motivoConsulta)) {
        motiveSet.add(appt.motivoConsulta)
      }
    })
    return Array.from(motiveSet).sort()
  }, [mappedAppointments])

  if (!uiState.mounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const { isLoading, activeTab, dataError, progress, isAdvancedFilterOpen } = uiState

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 transition-all duration-500">
      <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Estadísticas de Citas
              </h1>
              <p className="text-muted-foreground mt-2">Panel de control y análisis de citas médicas</p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleRefresh} 
              className="bg-background/50 backdrop-blur-sm hover:bg-background transition-all hover:scale-105 shadow-sm" 
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              {isLoading ? "Actualizando..." : "Actualizar"}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => updateUiState({ activeTab: value })} className="space-y-6">
          
          {/* Tabs Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <TabsList className="grid w-full lg:w-auto grid-cols-2 sm:grid-cols-4 h-auto sm:h-12 p-1 bg-muted/50 backdrop-blur-sm">
              {[
                { id: "general", label: "General", icon: <FileBarChart className="h-4 w-4" /> },
                { id: "trends", label: "Tendencias", icon: <TrendingUp className="h-4 w-4" /> },
                { id: "weekday", label: "Día Semana", icon: <Calendar className="h-4 w-4" /> },
                { id: "correlation", label: "Correlación", icon: <Clock className="h-4 w-4" /> }
              ].map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id} 
                  className="flex items-center justify-center sm:justify-start gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all hover:scale-105 py-2 sm:py-0"
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Filter Summary */}
          <FilterSummary filters={filters} updateFilter={updateFilter} />

          {/* Error Alert */}
          {dataError && (
            <Alert variant="destructive" className="animate-in slide-in-from-top-3 duration-300">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error en los Datos</AlertTitle>
              <AlertDescription>{dataError}</AlertDescription>
            </Alert>
          )}

          {/* Loading Progress */}
          {isLoading && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Cargando datos...</span>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Content Tabs */}
          <div className="min-h-[400px]">
            
            <TabsContent value="general" className="space-y-6 m-0">
              {activeTab === "general" && (
                <>
                  <StatCards generalStats={generalStats} isLoading={isLoading} />
                  <div className="grid gap-6 lg:grid-cols-2">
                    
                    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                      <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10">
                        <CardTitle className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          Distribución de Estados
                        </CardTitle>
                        <CardDescription>
                          Proporción de cada estado de cita en el período {generalStats.period}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        {renderPieChart(statusChartData, generalStats, isLoading)}
                      </CardContent>
                    </Card>

                    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                      <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10">
                        <CardTitle className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          Motivos de Consulta
                        </CardTitle>
                        <CardDescription>
                          Distribución de los diferentes motivos de consulta
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        {renderBarChart(motiveChartData, isLoading)}
                      </CardContent>
                    </Card>

                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="trends" className="space-y-6 m-0">
              {activeTab === "trends" && (
                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10">
                    <CardTitle className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      Tendencia de Citas
                    </CardTitle>
                    <CardDescription>
                      Evolución temporal de las citas por estado
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {renderLineChart(trendChartData, isLoading)}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="weekday" className="space-y-6 m-0">
              {activeTab === "weekday" && (
                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10">
                    <CardTitle className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      Asistencia por Día de la Semana
                    </CardTitle>
                    <CardDescription>
                      Análisis de patrones de asistencia según el día
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {renderWeekdayChart(weekdayChartData, isLoading)}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="correlation" className="space-y-6 m-0">
              {activeTab === "correlation" && (
                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10">
                    <CardTitle className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      Correlación Hora vs Día
                    </CardTitle>
                    <CardDescription>
                      Mapa de calor de citas por hora y día de la semana
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {renderScatterChart(scatterData, filters.timeRange, isLoading)}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

          </div>
        </Tabs>
      </div>
    </div>
  )
}

export default memo(AppointmentStatistics)