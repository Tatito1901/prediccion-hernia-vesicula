"use client"

import { useRef, useCallback, useMemo, memo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Brush,
  ScatterChart,
  Scatter,
  ZAxis,
  Label as RechartsLabel,
  LabelList,
  type TooltipProps,
} from "recharts"

import { ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// --- Types ---
export type ChartType = "pie" | "bar" | "line" | "area" | "radar" | "scatter" | "radial"
export type AppointmentStatus = "completada" | "cancelada" | "pendiente" | "presente" | "reprogramada" | "no_asistio"

// Simplificado: solo mantiene opciones esenciales
export interface ChartOptions {
  showLegend: boolean
  showTooltip: boolean
  showGrid: boolean
  animation: boolean
  showLabels: boolean
}

export type StatusColorMap = Record<AppointmentStatus, string>

export interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  description: string
  color?: string
  animationDelay?: number
  changePercent?: number
  previousValue?: string | number
  trendLabel?: string
  animated?: boolean
  onClick?: () => void
  className?: string
}

export interface GeneralStats {
  total: number
  attendance: number
  cancellation: number
  pending: number
  present: number
  completed: number
  cancelled: number
  pendingCount: number
  presentCount: number
  changeFromPrevious?: number
  period?: string
}

export interface StatusChartData {
  name: AppointmentStatus
  value: number
  color: string
}

export interface MotiveChartData {
  motive: string
  count: number
}

export interface TrendChartData {
  date: string
  formattedDate: string
  completada?: number
  cancelada?: number
  pendiente?: number
  presente?: number
  reprogramada?: number
  no_asistio?: number
}

export interface WeekdayChartData {
  name: string
  total: number
  attended: number
  rate: number
}

export interface ScatterPoint {
  day: number
  hour: number
  count: number
  dayName: string
}

export type ScatterData = Record<AppointmentStatus, ScatterPoint[]>

// --- Constants ---
// Paleta optimizada: menos colores y más distintivos para mejor rendimiento y accesibilidad
const COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // green-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#6b7280", // slate-500
];

export const STATUS_COLORS: Readonly<StatusColorMap> = {
  completada: "#10b981", // green-500
  cancelada: "#ef4444",  // red-500
  pendiente: "#f59e0b",  // amber-500
  presente: "#3b82f6",   // blue-500
  reprogramada: "#8b5cf6", // violet-500
  no_asistio: "#6b7280", // slate-500
}

export const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

// Tema simplificado para reducir el cálculo
export const CHART_THEME = {
  colors: {
    primary: "#3b82f6",
    secondary: "#10b981",
    tertiary: "#f59e0b",
    danger: "#ef4444",
    neutral: "#6b7280",
  },
  grid: {
    stroke: "var(--border)",
    strokeDasharray: "3 3",
  },
  text: {
    color: "var(--muted-foreground)",
    fontSize: 12,
  },
}

// StatCard optimizado con menos procesamiento
export const StatCard = memo<StatCardProps>(({
  title,
  value,
  icon,
  description,
  color,
  changePercent,
  previousValue,
  trendLabel,
  onClick,
  className = "",
}) => {
  // Computar estilos basados en el título - simplificado para reducir procesamiento
  const getCardStyle = () => {
    if (title.includes("Asistencia")) {
      return {
        bg: "bg-green-50 dark:bg-green-950/20",
        icon: "text-green-600 dark:text-green-400",
        border: "border-green-100 dark:border-green-800/30",
        trend: changePercent === undefined ? "text-gray-500 dark:text-gray-400" :
               changePercent > 0 ? "text-green-600 dark:text-green-400" :
               "text-red-600 dark:text-red-400"
      }
    }
    if (title.includes("Cancelación")) {
      return {
        bg: "bg-red-50 dark:bg-red-950/20",
        icon: "text-red-600 dark:text-red-400",
        border: "border-red-100 dark:border-red-800/30",
        trend: changePercent === undefined ? "text-gray-500 dark:text-gray-400" :
               changePercent > 0 ? "text-green-600 dark:text-green-400" :
               "text-red-600 dark:text-red-400"
      }
    }
    if (title.includes("Pendientes")) {
      return {
        bg: "bg-amber-50 dark:bg-amber-950/20",
        icon: "text-amber-600 dark:text-amber-400",
        border: "border-amber-100 dark:border-amber-800/30",
        trend: changePercent === undefined ? "text-gray-500 dark:text-gray-400" :
               changePercent > 0 ? "text-green-600 dark:text-green-400" :
               "text-red-600 dark:text-red-400"
      }
    }
    // Default - azul
    return {
      bg: "bg-blue-50 dark:bg-blue-950/20",
      icon: "text-blue-600 dark:text-blue-400",
      border: "border-blue-100 dark:border-blue-800/30",
      trend: changePercent === undefined ? "text-gray-500 dark:text-gray-400" :
             changePercent > 0 ? "text-green-600 dark:text-green-400" :
             "text-red-600 dark:text-red-400"
    }
  }
  
  const styles = getCardStyle()
  
  // Determinar el icono de tendencia solo cuando se necesita
  const trendIcon = changePercent === undefined ? null :
                    changePercent > 0 ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> :
                    changePercent < 0 ? <ChevronDown className="h-3 w-3" aria-hidden="true" /> : null

  return (
    <div
      onClick={onClick}
      className={cn(
        "transition-all",
        onClick && "cursor-pointer hover:ring-1 hover:ring-offset-2 hover:ring-offset-background dark:hover:ring-offset-slate-900",
        className,
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <Card
        className={cn(
          "overflow-hidden border h-full",
          "hover:shadow-md group",
          styles.border,
        )}
      >
        <CardHeader className={cn("pb-2", color || styles.bg)}>
          <div className="flex justify-between items-start">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</CardTitle>
            <div
              className={cn(
                "rounded-full p-1.5",
                styles.bg,
                styles.icon,
              )}
              aria-hidden="true"
            >
              {icon}
            </div>
          </div>

          <div className="flex items-baseline mt-1 space-x-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</span>
            {changePercent !== undefined && (
              <div
                className={cn("flex items-center text-xs font-medium ml-2", styles.trend)}
                aria-label={`${Math.abs(changePercent).toFixed(1)}% ${changePercent > 0 ? "aumento" : "disminución"}`}
              >
                {trendIcon}
                <span>{Math.abs(changePercent).toFixed(1)}%</span>
              </div>
            )}
          </div>

          {previousValue !== undefined && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {trendLabel || "Anterior"}: {previousValue}
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-2">
          <CardDescription className="text-slate-600 dark:text-slate-300">{description}</CardDescription>
        </CardContent>
      </Card>
    </div>
  )
})
StatCard.displayName = "StatCard"

// Tooltip optimizado y simplificado
const CustomTooltip = memo<TooltipProps<number, string>>(({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div
      className="bg-card shadow-md rounded-md p-2 border text-sm"
      role="tooltip"
    >
      <div className="font-semibold mb-1 text-foreground">{label}</div>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={`tooltip-item-${index}`} className="flex items-center gap-2" style={{ color: entry.color || "inherit" }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || CHART_THEME.colors.neutral }} aria-hidden="true" />
            <span className="font-medium">{entry.name}: </span>
            <span>
              {entry.value} {entry.unit || ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})
CustomTooltip.displayName = "CustomTooltip"

// Hook principal optimizado
export function useChartConfig() {
  // Configuración global fija para todos los gráficos - evita recreación
  const chartOptions: Readonly<ChartOptions> = {
    showLegend: true,
    showTooltip: true,
    showGrid: true,
    animation: true,
    showLabels: false,
  }

  const chartRef = useRef<HTMLDivElement>(null)

  // Componente para estado de carga/vacío
  const LoadingOrEmpty = useCallback(({ isEmpty, height = 300 }: { isEmpty: boolean, height?: number }) => (
    <div
      className={`h-[${height}px] flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-lg ${isEmpty ? 'bg-slate-50 dark:bg-slate-800/30' : 'bg-slate-200 dark:bg-slate-800'}`}
    >
      {isEmpty ? (
        <>
          <svg className="h-12 w-12 mb-2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="20" height="20" rx="2" />
            <line x1="6" y1="6" x2="6" y2="18" />
            <line x1="10" y1="10" x2="10" y2="18" />
            <line x1="14" y1="14" x2="14" y2="18" />
            <line x1="18" y1="8" x2="18" y2="18" />
          </svg>
          <p className="text-sm font-medium">No hay datos disponibles</p>
        </>
      ) : (
        <div className="animate-pulse w-full h-full" />
      )}
    </div>
  ), [])

  // Función optimizada para estado de carga/vacío
  const withLoadingState = useCallback(
    <T,>(
      renderFn: (data: T) => React.ReactNode,
      data: T,
      isLoading: boolean,
      isEmpty: (data: T) => boolean,
      height = 300,
    ): React.ReactNode => {
      if (isLoading) {
        return <LoadingOrEmpty isEmpty={false} height={height} />
      }

      if (isEmpty(data)) {
        return <LoadingOrEmpty isEmpty={true} height={height} />
      }
      
      return renderFn(data)
    },
    [LoadingOrEmpty],
  )

  // Funciones de renderizado simplificadas

  // Pie Chart optimizado
  const renderPieChart = useCallback(
    (statusChartData: StatusChartData[], generalStats: GeneralStats, isLoading: boolean): React.ReactNode => {
      return withLoadingState(
        (data) => (
          <div className="relative h-[300px]" ref={chartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={chartOptions.showLabels}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                  isAnimationActive={chartOptions.animation}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--background)" strokeWidth={2} />
                  ))}
                </Pie>

                {chartOptions.showTooltip && (
                  <Tooltip
                    content={<CustomTooltip />}
                    formatter={(value: number, name: string) => [
                      `${value} citas (${((value / generalStats.total) * 100).toFixed(1)}%)`,
                      name,
                    ]}
                  />
                )}

                {chartOptions.showLegend && (
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ paddingTop: "15px" }}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
          </div>
        ),
        statusChartData,
        isLoading,
        (data) => !data.length || data.every((item) => item.value === 0),
        300
      )
    },
    [chartOptions, withLoadingState],
  )

  // Bar Chart optimizado
  const renderBarChart = useCallback(
    (motiveChartData: MotiveChartData[], isLoading: boolean): React.ReactNode => {
      return withLoadingState(
        (data) => (
          <div className="relative h-[300px]" ref={chartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                barGap={4}
                barCategoryGap="20%"
              >
                {chartOptions.showGrid && (
                  <CartesianGrid
                    strokeDasharray={CHART_THEME.grid.strokeDasharray}
                    stroke={CHART_THEME.grid.stroke}
                  />
                )}

                <XAxis 
                  dataKey="motive" 
                  angle={-45} 
                  textAnchor="end" 
                  height={70} 
                  interval={0} 
                  tick={{ fontSize: CHART_THEME.text.fontSize, fill: CHART_THEME.text.color }}
                />
                <YAxis tick={{ fontSize: CHART_THEME.text.fontSize, fill: CHART_THEME.text.color }} />

                {chartOptions.showTooltip && (
                  <Tooltip
                    content={<CustomTooltip />}
                    formatter={(value: number) => [`${value} citas`, "Cantidad"]}
                    cursor={{ fill: "rgba(128, 128, 128, 0.1)" }}
                  />
                )}

                {chartOptions.showLegend && (
                  <Legend wrapperStyle={{ paddingTop: "10px" }} />
                )}

                <Bar
                  dataKey="count"
                  name="Cantidad de citas"
                  isAnimationActive={chartOptions.animation}
                  radius={[4, 4, 0, 0]}
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                  {chartOptions.showLabels && (
                    <LabelList
                      dataKey="count"
                      position="top"
                      style={{ fontSize: "11px", fill: CHART_THEME.text.color }}
                    />
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ),
        motiveChartData,
        isLoading,
        (data) => !data.length,
        300
      )
    },
    [chartOptions, withLoadingState],
  )

  // Line Chart optimizado
  const renderLineChart = useCallback(
    (trendChartData: TrendChartData[], isLoading: boolean): React.ReactNode => {
      return withLoadingState(
        (data) => (
          <div className="relative h-[300px]" ref={chartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={data} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                {chartOptions.showGrid && (
                  <CartesianGrid 
                    strokeDasharray={CHART_THEME.grid.strokeDasharray} 
                    stroke={CHART_THEME.grid.stroke} 
                  />
                )}
                
                <XAxis 
                  dataKey="formattedDate" 
                  tick={{ fontSize: CHART_THEME.text.fontSize, fill: CHART_THEME.text.color }} 
                  padding={{ left: 10, right: 10 }} 
                />
                
                <YAxis 
                  tick={{ fontSize: CHART_THEME.text.fontSize, fill: CHART_THEME.text.color }} 
                  allowDecimals={false} 
                />

                {chartOptions.showTooltip && (
                  <Tooltip
                    content={<CustomTooltip />}
                    labelFormatter={(label: string) => `Fecha: ${label}`}
                  />
                )}

                {chartOptions.showLegend && (
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ paddingBottom: "10px" }}
                  />
                )}

                {/* Líneas principales - simplificadas */}
                <Line
                  type="monotone"
                  dataKey="completada"
                  name="Completadas"
                  stroke={STATUS_COLORS.completada}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls={true}
                  isAnimationActive={chartOptions.animation}
                />
                
                <Line
                  type="monotone"
                  dataKey="cancelada"
                  name="Canceladas"
                  stroke={STATUS_COLORS.cancelada}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls={true}
                  isAnimationActive={chartOptions.animation}
                />

                <Brush
                  dataKey="formattedDate"
                  height={25}
                  stroke={CHART_THEME.colors.primary}
                  fill="var(--primary-light)"
                  startIndex={Math.max(0, data.length - Math.min(10, data.length))}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ),
        trendChartData,
        isLoading,
        (data) => !data.length,
        300
      )
    },
    [chartOptions, withLoadingState],
  )

  // Weekday Chart optimizado
  const renderWeekdayChart = useCallback(
    (weekdayChartData: WeekdayChartData[], isLoading: boolean): React.ReactNode => {
      return withLoadingState(
        (data) => (
          <div className="relative h-[300px]" ref={chartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                barGap={4}
                barCategoryGap="20%"
              >
                {chartOptions.showGrid && (
                  <CartesianGrid 
                    strokeDasharray={CHART_THEME.grid.strokeDasharray} 
                    stroke={CHART_THEME.grid.stroke} 
                  />
                )}
                
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: CHART_THEME.text.fontSize, fill: CHART_THEME.text.color }} 
                />
                
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke={CHART_THEME.colors.primary}
                  tick={{ fontSize: CHART_THEME.text.fontSize, fill: CHART_THEME.text.color }}
                />
                
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={CHART_THEME.colors.secondary}
                  tick={{ fontSize: CHART_THEME.text.fontSize, fill: CHART_THEME.text.color }}
                />

                {chartOptions.showTooltip && (
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(128, 128, 128, 0.1)" }}
                  />
                )}

                {chartOptions.showLegend && (
                  <Legend wrapperStyle={{ paddingTop: "10px" }} />
                )}

                <Bar 
                  yAxisId="left" 
                  dataKey="total" 
                  name="Total de citas" 
                  fill={CHART_THEME.colors.primary} 
                  radius={[4, 4, 0, 0]} 
                  isAnimationActive={chartOptions.animation} 
                />
                
                <Bar 
                  yAxisId="left" 
                  dataKey="attended" 
                  name="Asistencias" 
                  fill={CHART_THEME.colors.secondary} 
                  radius={[4, 4, 0, 0]} 
                  isAnimationActive={chartOptions.animation} 
                />
                
                <Bar 
                  yAxisId="right" 
                  dataKey="rate" 
                  name="Tasa de asistencia (%)" 
                  fill={CHART_THEME.colors.tertiary} 
                  radius={[4, 4, 0, 0]} 
                  isAnimationActive={chartOptions.animation}
                >
                  {chartOptions.showLabels && (
                    <LabelList 
                      dataKey="rate" 
                      position="top" 
                      formatter={(value: number) => `${value.toFixed(0)}%`} 
                      style={{ fontSize: "10px", fill: CHART_THEME.text.color }} 
                    />
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ),
        weekdayChartData,
        isLoading,
        (data) => !data.length,
        300
      )
    },
    [chartOptions, withLoadingState],
  )

  // Scatter Chart optimizado
  const renderScatterChart = useCallback(
    (scatterData: ScatterData, timeRange: readonly [number, number], isLoading: boolean): React.ReactNode => {
      return withLoadingState(
        (data) => (
          <div className="relative" ref={chartRef}>
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
                {chartOptions.showGrid && (
                  <CartesianGrid 
                    strokeDasharray={CHART_THEME.grid.strokeDasharray} 
                    stroke={CHART_THEME.grid.stroke} 
                  />
                )}
                
                <XAxis
                  dataKey="day"
                  name="Día"
                  type="number"
                  domain={[0, 6]}
                  tickCount={7}
                  tick={{ fontSize: CHART_THEME.text.fontSize, fill: CHART_THEME.text.color }}
                  tickFormatter={(value: number) => WEEKDAYS_SHORT[value]}
                />
                
                <YAxis
                  dataKey="hour"
                  name="Hora"
                  type="number"
                  domain={[timeRange[0], timeRange[1]]}
                  tick={{ fontSize: CHART_THEME.text.fontSize, fill: CHART_THEME.text.color }}
                  tickFormatter={(value: number) => `${value}:00`}
                />
                
                <ZAxis dataKey="count" range={[60, 400]} name="Cantidad" />

                {chartOptions.showTooltip && (
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ strokeDasharray: "3 3" }}
                    formatter={(value: number, name: string) => {
                      if (name === "Día") return WEEKDAYS[value]
                      if (name === "Hora") return `${value}:00`
                      return value
                    }}
                  />
                )}

                {chartOptions.showLegend && (
                  <Legend wrapperStyle={{ paddingTop: "10px" }} />
                )}

                {/* Simplificado: solo mostramos los 3 estados más importantes */}
                <Scatter
                  name="Completadas"
                  data={data.completada || []}
                  fill={STATUS_COLORS.completada}
                  isAnimationActive={chartOptions.animation}
                />
                
                <Scatter
                  name="Canceladas"
                  data={data.cancelada || []}
                  fill={STATUS_COLORS.cancelada}
                  isAnimationActive={chartOptions.animation}
                />
                
                <Scatter
                  name="Pendientes"
                  data={data.pendiente || []}
                  fill={STATUS_COLORS.pendiente}
                  isAnimationActive={chartOptions.animation}
                />
              </ScatterChart>
            </ResponsiveContainer>
            
            {/* Texto explicativo */}
            <div className="mt-4 text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold mb-1">Interpretación del Gráfico</h4>
              <p className="mb-1">
                Este gráfico muestra la distribución de citas según el día y hora. El tamaño de cada punto representa la cantidad.
              </p>
            </div>
          </div>
        ),
        scatterData,
        isLoading,
        (data) => Object.values(data).every((arr) => arr.length === 0),
        350,
      )
    },
    [chartOptions, withLoadingState],
  )

  return {
    chartOptions,
    chartRef,
    renderPieChart,
    renderBarChart,
    renderLineChart,
    renderWeekdayChart,
    renderScatterChart,
    CHART_THEME,
  }
}

export default useChartConfig