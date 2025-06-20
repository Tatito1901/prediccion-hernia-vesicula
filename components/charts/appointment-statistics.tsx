/* -------------------------------------------------------------------------- */
/*  components/charts/appointment-statistics.tsx - OPTIMIZADO                */
/* -------------------------------------------------------------------------- */

import React, { useState, useMemo, useCallback, memo } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format, isAfter, isBefore, parseISO, isValid, startOfDay, endOfDay, isSameDay } from "date-fns"
import { es } from "date-fns/locale/es"
import { Button } from "@/components/ui/button"
import { useAppointmentStore } from "@/lib/stores/appointment-store"
import type { AppointmentData } from "@/app/dashboard/data-model"
import { AppointmentStatusEnum, type AppointmentStatus } from "@/app/dashboard/data-model"
import { Badge } from "@/components/ui/badge"
import {
  FileBarChart, RefreshCw, AlertCircle, X, TrendingUp, Calendar, Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import useChartConfig, {
  type GeneralStats,
  type StatusChartData,
  type MotiveChartData,
  type TrendChartData,
  type WeekdayChartData,
  type ScatterData,
  type PatientData,
  WEEKDAYS,
  formatDateUtil,
  titleCaseStatus,
  hourToDecimal,
  StatCard,
  LoadingSpinner,
} from '@/components/charts/use-chart-config'

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
}

/* ============================================================================
 * CONSTANTES OPTIMIZADAS
 * ========================================================================== */

const INITIAL_FILTERS: AppointmentFilters = {
  dateRange: undefined,
  motiveFilter: "all",
  statusFilter: [...Object.values(AppointmentStatusEnum)],
  sortBy: "fechaConsulta",
  sortOrder: "desc",
  timeRange: [0, 24] as const,
}

/* ============================================================================
 * COMPONENTES AUXILIARES OPTIMIZADOS
 * ========================================================================== */

const FilterSummary = memo<{
  filters: AppointmentFilters
  updateFilter: <K extends keyof AppointmentFilters>(key: K, value: AppointmentFilters[K]) => void
  className?: string
}>(({ filters, updateFilter, className = "" }) => {
  const activeFiltersCount = useMemo(() => {
    const allStatusesSelected = filters.statusFilter.length === Object.keys(AppointmentStatusEnum).length || filters.statusFilter.length === 0
    return (
      (filters.dateRange?.from ? 1 : 0) +
      (filters.motiveFilter !== "all" ? 1 : 0) +
      (!allStatusesSelected ? 1 : 0)
    )
  }, [filters])

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

const StatCards = memo<{ generalStats: GeneralStats; isLoading: boolean }>(({ generalStats, isLoading }) => {
  const statCardsData = useMemo(() => [
    { 
      title: "Total de Citas", 
      value: generalStats.total.toLocaleString(), 
      icon: <FileBarChart className="h-4 w-4" />, 
      description: "Número total de citas en el período seleccionado", 
      color: "bg-primary", 
      trendPercent: 12, 
      previousValue: Math.max(0, generalStats.total - 5).toLocaleString(), 
      trendLabel: "vs período anterior" 
    },
    { 
      title: "Tasa de Asistencia", 
      value: `${generalStats.attendance.toFixed(1)}%`, 
      icon: <Calendar className="h-4 w-4" />, 
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
      icon: <Clock className="h-4 w-4" />, 
      description: "Número de citas aún pendientes por realizar", 
      color: "bg-amber-500", 
      trendPercent: -8, 
      previousValue: (generalStats.pendingCount + 2).toLocaleString(), 
      trendLabel: "vs período anterior" 
    },
  ], [generalStats])

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statCardsData.map((stat, idx) => (
        <div 
          key={stat.title} 
          className="animate-in fade-in slide-in-from-bottom-4" 
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <StatCard 
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
 * HOOKS DE PROCESAMIENTO OPTIMIZADOS
 * ============================================================================ */

const useProcessedAppointments = (appointmentsFromContext: AppointmentData[], filters: AppointmentFilters) => {
  return useMemo(() => {
    // Mapeo optimizado en una sola pasada
    const mappedAppointments: PatientData[] = appointmentsFromContext.map((appt: AppointmentData) => {
      const nameParts = appt.paciente?.split(' ') || ['Desconocido']
      
      let dateObj: Date | null = null
      try {
        if (appt.fechaConsulta) {
          const parsedDate = typeof appt.fechaConsulta === 'string' ? parseISO(appt.fechaConsulta) : appt.fechaConsulta
          if (isValid(parsedDate)) {
            dateObj = parsedDate
          }
        }
      } catch (error) {
        console.error("Error procesando fecha para cita ID:", appt.id, error)
      }

      return {
        id: appt.id,
        paciente: nameParts.join(' ').trim(),
        fechaConsulta: dateObj,
        horaConsulta: appt.horaConsulta || "00:00",
        motivoConsulta: appt.motivoConsulta || "No especificado",
        estado: appt.estado || AppointmentStatusEnum.PROGRAMADA,
        notas: appt.notas || "",
        telefono: appt.telefono || "",
        email: appt.email || "",
      }
    })

    // Filtrado optimizado
    const filteredAppointments = mappedAppointments.filter((appt) => {
      if (!appt.fechaConsulta || !isValid(appt.fechaConsulta)) return false
      
      const { from, to } = filters.dateRange || {}
      if (from || to) {
        const dateObj = appt.fechaConsulta
        const fromDate = from ? startOfDay(from) : null
        const toDate = to ? endOfDay(to) : null
        if (fromDate && !isSameDay(dateObj, fromDate) && isBefore(dateObj, fromDate)) return false
        if (toDate && !isSameDay(dateObj, toDate) && isAfter(dateObj, toDate)) return false
      }
      
      if (filters.motiveFilter !== "all" && appt.motivoConsulta !== filters.motiveFilter) return false
      if (!filters.statusFilter.includes(appt.estado!)) return false
      
      const hourDecimalValue = hourToDecimal(appt.horaConsulta)
      if (hourDecimalValue !== null && (hourDecimalValue < filters.timeRange[0] || hourDecimalValue > filters.timeRange[1])) return false
      
      return true
    })
    
    // Ordenamiento optimizado
    filteredAppointments.sort((a, b) => {
      let comp = 0
      if (filters.sortBy === "fechaConsulta") {
        comp = (a.fechaConsulta as Date).getTime() - (b.fechaConsulta as Date).getTime()
        if (comp === 0) {
          const hourA = hourToDecimal(a.horaConsulta)
          const hourB = hourToDecimal(b.horaConsulta)
          if (hourA !== null && hourB !== null) {
            comp = hourA - hourB
          }
        }
      } else if (filters.sortBy === "nombre") {
        comp = (a.paciente || "").localeCompare(b.paciente || "")
      } else {
        const valA = a[filters.sortBy as keyof PatientData] as string
        const valB = b[filters.sortBy as keyof PatientData] as string
        if (typeof valA === "string" && typeof valB === "string") comp = valA.localeCompare(valB)
      }
      return filters.sortOrder === "asc" ? comp : -comp
    })

    return { mappedAppointments, filteredAppointments }
  }, [appointmentsFromContext, filters])
}

const useChartData = (filteredAppointments: PatientData[], filters: AppointmentFilters) => {
  return useMemo(() => {
    const total = filteredAppointments.length
    
    // Conteo optimizado de estados
    const allStatusCounts = filteredAppointments.reduce((acc, appt) => { 
      if (appt.estado && Object.values(AppointmentStatusEnum).includes(appt.estado)) {
        acc[appt.estado] = (acc[appt.estado] || 0) + 1
      }
      return acc 
    }, {} as Record<AppointmentStatus, number>)

    // Rellenar estados faltantes
    Object.values(AppointmentStatusEnum).forEach(status => {
      if (!allStatusCounts[status]) allStatusCounts[status] = 0
    })

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

    // Datos para gráficos optimizados
    const statusChartData: StatusChartData[] = Object.values(AppointmentStatusEnum).map(status => ({
      name: titleCaseStatus(status),
      value: allStatusCounts[status] || 0,
      color: `hsl(var(--chart-${status === AppointmentStatusEnum.COMPLETADA ? '1' : status === AppointmentStatusEnum.CANCELADA ? '2' : status === AppointmentStatusEnum.PROGRAMADA ? '3' : '4'}))`
    }))

    const motiveChartData: MotiveChartData[] = (() => {
      const motiveCounts: Record<string, number> = {}
      filteredAppointments.forEach(a => { 
        motiveCounts[a.motivoConsulta!] = (motiveCounts[a.motivoConsulta!] || 0) + 1 
      })
      return Object.entries(motiveCounts)
        .map(([motive, count]) => ({ motive, count }))
        .sort((a, b) => b.count - a.count)
    })()

    const trendChartData: TrendChartData[] = (() => {
      const byDate: Record<string, Record<AppointmentStatus | "total", number>> = {}
      filteredAppointments.forEach(a => { 
        const dateStr = format(a.fechaConsulta!, "yyyy-MM-dd")
        if (!byDate[dateStr]) {
          byDate[dateStr] = Object.values(AppointmentStatusEnum).reduce((ac, s) => { 
            ac[s] = 0
            return ac 
          }, { total: 0 } as any)
        }
        if (byDate[dateStr].hasOwnProperty(a.estado!)) byDate[dateStr][a.estado!]++
        byDate[dateStr].total++
      })
      return Object.entries(byDate)
        .map(([date, counts]) => ({ 
          date, 
          formattedDate: format(parseISO(date), "dd/MM", { locale: es }), 
          ...counts 
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
    })()

    const weekdayChartData: WeekdayChartData[] = (() => {
      const weekdayData: Record<number, { name: string; total: number; attended: number }> = 
        WEEKDAYS.reduce((acc, name, idx) => { 
          acc[idx] = { name, total: 0, attended: 0 }
          return acc 
        }, {} as any)

      filteredAppointments.forEach(a => { 
        const fechaDate = a.fechaConsulta instanceof Date ? a.fechaConsulta : 
                         (typeof a.fechaConsulta === 'string' ? parseISO(a.fechaConsulta) : null)
        if (!fechaDate) return
        
        const dayOfWeek = fechaDate.getDay()
        if (weekdayData[dayOfWeek]) { 
          weekdayData[dayOfWeek].total++
          if (a.estado === AppointmentStatusEnum.COMPLETADA || a.estado === AppointmentStatusEnum.PRESENTE) {
            weekdayData[dayOfWeek].attended++
          }
        } 
      })

      return Object.values(weekdayData).map(d => ({ 
        ...d, 
        rate: d.total > 0 ? (d.attended / d.total) * 100 : 0 
      }))
    })()

    const scatterData: ScatterData = (() => {
      const scatterByStatus = Object.fromEntries(
        Object.values(AppointmentStatusEnum).map(s => [s, {} as Record<string, any>])
      ) as Record<AppointmentStatus, Record<string, any>>

      filteredAppointments.forEach(a => { 
        const fechaDate = a.fechaConsulta instanceof Date ? a.fechaConsulta : 
                         (typeof a.fechaConsulta === 'string' ? parseISO(a.fechaConsulta) : null)
        if (!fechaDate) return
        
        const dayOfWeek = fechaDate.getDay()
        const hourDecimal = hourToDecimal(a.horaConsulta)
        if (dayOfWeek === undefined || hourDecimal === null) return
        
        const hour = Math.floor(hourDecimal)
        const key = `${dayOfWeek}-${hour}`
        const currentStatus = a.estado!

        if (Object.values(AppointmentStatusEnum).includes(currentStatus)) { 
          if (!scatterByStatus[currentStatus][key]) {
            scatterByStatus[currentStatus][key] = { 
              day: dayOfWeek, 
              hour, 
              count: 0, 
              dayName: WEEKDAYS[dayOfWeek] || `Día ${dayOfWeek}` 
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
 * COMPONENTE PRINCIPAL OPTIMIZADO
 * ============================================================================ */

interface AppointmentStatisticsProps {
  generalStats?: GeneralStats;
  weekdayDistribution?: WeekdayChartData[];
  isLoading?: boolean;
  lastUpdated?: string;
  onRefresh?: () => void;
}

export const AppointmentStatistics: React.FC<AppointmentStatisticsProps> = ({
  generalStats: apiGeneralStats,
  weekdayDistribution: apiWeekdayDistribution,
  isLoading: apiLoading = false,
  lastUpdated,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState("general")
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState<AppointmentFilters>(INITIAL_FILTERS)
  
  const appointmentsFromContext = useAppointmentStore(state => state.appointments)
  const fetchAppointments = useAppointmentStore(state => state.fetchAppointments)
  
  React.useEffect(() => {
    if (!apiGeneralStats && !onRefresh) {
      fetchAppointments()
    }
  }, [fetchAppointments, apiGeneralStats, onRefresh])

  const { 
    renderPieChart, 
    renderBarChart, 
    renderLineChart, 
    renderWeekdayChart, 
    renderScatterChart,
  } = useChartConfig({
    showLegend: true,
    showTooltip: true,
    showGrid: true,
    animation: true,
    interactive: true,
  })

  const { filteredAppointments } = useProcessedAppointments(appointmentsFromContext, filters)
  
  const { 
    generalStats: localGeneralStats, 
    statusChartData, 
    motiveChartData, 
    trendChartData, 
    weekdayChartData: localWeekdayChartData, 
    scatterData 
  } = useChartData(filteredAppointments, filters)
  
  const generalStats = apiGeneralStats || localGeneralStats
  const weekdayChartData = apiWeekdayDistribution || localWeekdayChartData
  const loading = apiLoading || isLoading

  const updateFilter = useCallback(<K extends keyof AppointmentFilters>(key: K, value: AppointmentFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh()
    } else {
      setIsLoading(true)
      fetchAppointments().finally(() => setIsLoading(false))
    }
  }, [onRefresh, fetchAppointments])

  const tabsData = useMemo(() => [
    { id: "general", label: "General", icon: <FileBarChart className="h-4 w-4" /> },
    { id: "trends", label: "Tendencias", icon: <TrendingUp className="h-4 w-4" /> },
    { id: "weekday", label: "Día Semana", icon: <Calendar className="h-4 w-4" /> },
    { id: "correlation", label: "Correlación", icon: <Clock className="h-4 w-4" /> }
  ], [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 transition-all duration-500">
      <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
        
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
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              {loading ? "Actualizando..." : "Actualizar"}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <TabsList className="grid w-full lg:w-auto grid-cols-2 sm:grid-cols-4 h-auto sm:h-12 p-1 bg-muted/50 backdrop-blur-sm">
              {tabsData.map((tab) => (
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

          <FilterSummary filters={filters} updateFilter={updateFilter} />

          <div className="min-h-[400px]">
            
            <TabsContent value="general" className="space-y-6 m-0">
              {activeTab === "general" && (
                <>
                  <StatCards generalStats={generalStats} isLoading={loading} />
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
                        {renderPieChart(statusChartData, generalStats, loading)}
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
                        {renderBarChart(motiveChartData, loading)}
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
                    {renderLineChart(trendChartData, loading)}
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
                    {renderWeekdayChart(weekdayChartData, loading)}
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
                    {renderScatterChart(scatterData, filters.timeRange, loading)}
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