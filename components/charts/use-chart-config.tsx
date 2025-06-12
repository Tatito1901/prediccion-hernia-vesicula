import type React from "react"
import { useRef, useCallback, memo, useMemo, useState, useEffect } from "react"
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
  LabelList,
  type TooltipProps,
} from "recharts"

import { ChevronDown, ChevronUp, AlertTriangle, Loader2, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CHART_STYLES, getChartColors, STATUS_COLORS, getAdaptiveBackground, isDarkTheme } from "@/components/charts/chart-theme"
import type { AppointmentStatus } from "@/app/dashboard/data-model"

export { STATUS_COLORS }

/* ============================================================================
 * TIPOS OPTIMIZADOS Y EXPANDIDOS
 * ========================================================================== */

export type ChartType = "pie" | "bar" | "line" | "area" | "radar" | "scatter" | "radial"

export interface ChartOptions {
  showLegend: boolean
  showTooltip: boolean
  showGrid: boolean
  animation: boolean
  showLabels: boolean
  showBrush?: boolean
  interactive?: boolean
  theme?: 'medical' | 'dashboard' | 'comparison'
  colorScheme?: 'medical' | 'diagnosis' | 'patients' | 'trends' | 'comparison'
  innerRadius?: number
  outerRadius?: number
}

export type StatusColorMap = Record<AppointmentStatus, string>

export interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  description: string
  color?: string
  trendPercent?: number
  previousValue?: string | number
  trendLabel?: string
  onClick?: () => void
  className?: string
  isLoading?: boolean
  size?: 'sm' | 'md' | 'lg'
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
  allStatusCounts?: Record<AppointmentStatus, number>
}

export interface StatusChartData {
  name: string
  value: number
  color: string
  percentage?: number
}

export interface MotiveChartData {
  motive: string
  count: number
  percentage?: number
}

export interface TrendChartData {
  date: string
  formattedDate: string
  COMPLETADA?: number
  CANCELADA?: number
  PROGRAMADA?: number
  PRESENTE?: number
  REAGENDADA?: number
  "NO ASISTIO"?: number
  CONFIRMADA?: number
  total?: number
}

export interface WeekdayChartData {
  name: string
  total: number
  attended: number
  rate: number
  shortName?: string
}

export interface ScatterPoint {
  day: number
  hour: number
  count: number
  dayName: string
  intensity?: number
}

export type ScatterData = Record<AppointmentStatus, ScatterPoint[]>

// NUEVOS TIPOS PARA DIAGNÓSTICOS
export interface DiagnosisChartData {
  tipo: string
  cantidad: number
  porcentaje?: number
  tendencia?: number
  descripcion?: string
  color?: string
}

export interface TimelineChartData {
  date: string
  formattedDate: string
  [key: string]: string | number | undefined
}

/* ============================================================================
 * CONSTANTES ESTÁTICAS EXPANDIDAS
 * ========================================================================== */

const COLORS_PROFESSIONAL = getChartColors('medical', 12) // Más colores disponibles
export const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

const SIZE_CLASSES = {
  sm: "p-4",
  md: "p-6", 
  lg: "p-8"
} as const

const DEFAULT_CHART_OPTIONS: ChartOptions = {
  showLegend: true,
  showTooltip: true,
  showGrid: true,
  animation: true,
  showLabels: false,
  showBrush: false,
  interactive: true,
  theme: 'medical',
  colorScheme: 'medical',
  innerRadius: 60,
  outerRadius: 85,
}

/* ============================================================================
 * COMPONENTE STATCARD ULTRA-OPTIMIZADO (SIN CAMBIOS)
 * ========================================================================== */

export const StatCard = memo<StatCardProps>(({
  title,
  value,
  icon,
  description,
  color = "bg-primary",
  trendPercent,
  previousValue,
  trendLabel = "vs anterior",
  onClick,
  className = "",
  isLoading,
  size = 'md',
}) => {
  const { trendIcon, trendColor, borderStyle, iconColorClass } = useMemo(() => {
    const trendIcon = trendPercent === undefined ? null :
      trendPercent > 0 ? <ChevronUp className="h-3.5 w-3.5" /> :
      trendPercent < 0 ? <ChevronDown className="h-3.5 w-3.5" /> : null

    const trendColor = trendPercent === undefined ? "text-muted-foreground" :
      trendPercent > 0 ? "text-emerald-600 dark:text-emerald-400" :
      "text-red-600 dark:text-red-400"

    const colorName = color.split("-")[1] || "primary"
    const iconColorClass = `text-${colorName}-600 dark:text-${colorName}-400`
    const borderStyle = { borderLeftColor: `hsl(var(--${colorName}))` }

    return { trendIcon, trendColor, borderStyle, iconColorClass }
  }, [color, trendPercent])

  if (isLoading) {
    return (
      <Card className={cn("border-l-4 border-transparent", SIZE_CLASSES[size], className)}>
        <CardHeader className="pb-2 space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
              <div className="h-8 bg-muted rounded w-1/2 animate-pulse" />
            </div>
            <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-3 bg-muted rounded w-full animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        "border-l-4 group cursor-pointer transition-shadow duration-200 hover:shadow-lg",
        onClick && "cursor-pointer",
        className
      )}
      style={borderStyle}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <CardHeader className={cn("pb-3", SIZE_CLASSES[size])}>
        <div className="flex justify-between items-start">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
            
            <div className="flex items-baseline space-x-2">
              <span className={cn(
                "font-bold tracking-tight",
                size === 'sm' ? "text-xl" : size === 'lg' ? "text-4xl" : "text-2xl"
              )}>
                {value}
              </span>
              
              {trendPercent !== undefined && (
                <div className={cn("flex items-center text-xs font-semibold", trendColor)}>
                  {trendIcon}
                  <span className="ml-1">{Math.abs(trendPercent).toFixed(1)}%</span>
                </div>
              )}
            </div>
            
            {previousValue !== undefined && (
              <p className="text-xs text-muted-foreground">
                {trendLabel}: <span className="font-medium">{previousValue}</span>
              </p>
            )}
          </div>
          
          <div className={cn("rounded-xl p-3 bg-primary/10", iconColorClass)}>
            {icon}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 pb-4">
        <CardDescription className="text-xs leading-relaxed">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  )
})

StatCard.displayName = "StatCard"

/* ============================================================================
 * TOOLTIP UNIVERSAL OPTIMIZADO
 * ========================================================================== */

const UniversalTooltip = memo<TooltipProps<number, string> & { 
  isDark?: boolean;
  showTrend?: boolean;
}>(({ active, payload, label, isDark, showTrend = false }) => {
  if (!active || !payload?.length) return null

  const data = payload[0].payload
  const isPrediction = data?.periodKey?.startsWith?.('pred-') || false

  return (
    <div 
      className="p-3 rounded-lg shadow-lg border bg-background/95 backdrop-blur-sm text-sm animate-in fade-in zoom-in-95 duration-200"
      style={{
        backgroundColor: getAdaptiveBackground(0.95),
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      }}
    >
      <div className="font-semibold mb-2 flex items-center gap-2">
        {isPrediction && <div className="h-2 w-2 rounded-full bg-purple-500" />}
        <span className="text-foreground">{isPrediction ? '🔮 Predicción' : label}</span>
      </div>
      
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm">{entry.name}</span>
            </div>
            <span className="font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
      
      {showTrend && data?.trend !== undefined && (
        <div className="pt-2 mt-2 border-t border-border text-xs">
          <span className="text-muted-foreground">Tendencia: </span>
          <span className="font-medium">{Math.round(data.trend)}</span>
        </div>
      )}
      
      {data?.descripcion && (
        <div className="pt-2 mt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">{data.descripcion}</p>
        </div>
      )}
    </div>
  )
})

UniversalTooltip.displayName = "UniversalTooltip"

/* ============================================================================
 * COMPONENTES DE ESTADO OPTIMIZADOS (SIN CAMBIOS MAYORES)
 * ========================================================================== */

const LoadingSpinner = memo(({ className }: { className?: string }) => (
  <div className={cn("flex items-center justify-center py-8", className)}>
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
))

LoadingSpinner.displayName = "LoadingSpinner"

const EmptyState = memo<{ 
  message?: string
  icon?: React.ReactNode
  action?: { label: string; onClick: () => void }
}>(({ message = "No hay datos disponibles", icon, action }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
    <div className="p-4 rounded-full bg-muted/50">
      {icon || <AlertTriangle className="h-8 w-8 text-muted-foreground" />}
    </div>
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/70">
        Intente ajustar los filtros o verificar la fuente de datos
      </p>
    </div>
    {action && (
      <Button variant="outline" size="sm" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
))

EmptyState.displayName = "EmptyState"

/* ============================================================================
 * HOOK PRINCIPAL ULTRA-OPTIMIZADO Y EXPANDIDO
 * ========================================================================== */

export function useChartConfig(options?: Partial<ChartOptions>) {
  const chartOptions = useMemo(() => ({
    ...DEFAULT_CHART_OPTIONS,
    ...options,
  }), [options])

  const chartRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const isDark = isDarkTheme()

  useEffect(() => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
          }
        },
        { threshold: 0.1 }
      )
    }

    const currentRef = chartRef.current
    const observer = observerRef.current

    if (currentRef && observer) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef && observer) {
        observer.unobserve(currentRef)
      }
    }
  }, [])

  /* ============================================================================
   * RENDERIZADOR DE PIE CHART MEJORADO
   * ========================================================================== */

  const renderPieChart = useCallback(
    (
      statusChartData: StatusChartData[] | DiagnosisChartData[], 
      generalStats: GeneralStats, 
      isLoading: boolean,
      customOptions?: Partial<ChartOptions>
    ): React.ReactNode => {
      if (isLoading) return <LoadingSpinner />

      if (!statusChartData?.length || statusChartData.every(item => item.value === 0)) {
        return <EmptyState message="No hay datos disponibles para mostrar" />
      }

      const mergedOptions = { ...chartOptions, ...customOptions }
      const colors = getChartColors(mergedOptions.colorScheme || 'medical', statusChartData.length)

      // Normalizar datos para que funcionen con ambos tipos
      const normalizedData = statusChartData.map((item, index) => ({
        name: 'name' in item ? item.name : item.tipo,
        value: 'value' in item ? item.value : item.cantidad,
        color: item.color || colors[index % colors.length],
        percentage: item.percentage || ('porcentaje' in item ? item.porcentaje : undefined),
      }))

      return (
        <div className="h-[350px]" ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={normalizedData}
                cx="50%"
                cy="50%"
                outerRadius={`${mergedOptions.outerRadius}%`}
                innerRadius={`${mergedOptions.innerRadius}%`}
                dataKey="value"
                nameKey="name"
                paddingAngle={3}
                cornerRadius={4}
                isAnimationActive={mergedOptions.animation}
                animationDuration={600}
                stroke={isDark ? 'hsl(var(--card))' : 'hsl(var(--background))'}
                strokeWidth={2}
              >
                {normalizedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    stroke="hsl(var(--background))" 
                    strokeWidth={2}
                    className="hover:opacity-80 transition-opacity duration-200"
                  />
                ))}
                
                {mergedOptions.showLabels && (
                  <LabelList
                    dataKey="percentage"
                    position="outside"
                    offset={10}
                    formatter={(value: number) => value > 3 ? `${value}%` : ''}
                    style={{ 
                      fontSize: '11px', 
                      fill: CHART_STYLES.axis.labelColor, 
                      fontWeight: 500 
                    }}
                  />
                )}
              </Pie>
              
              {mergedOptions.showTooltip && (
                <Tooltip
                  content={<UniversalTooltip isDark={isDark} />}
                  formatter={(value: number, name: string) => [
                    `${value} casos (${generalStats.total > 0 ? ((value / generalStats.total) * 100).toFixed(1) : 0}%)`,
                    name,
                  ]}
                />
              )}
              
              {mergedOptions.showLegend && normalizedData.length <= 8 && (
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>
      )
    },
    [chartOptions, isDark]
  )

  /* ============================================================================
   * RENDERIZADOR DE BAR CHART MEJORADO
   * ========================================================================== */

  const renderBarChart = useCallback(
    (
      motiveChartData: MotiveChartData[] | DiagnosisChartData[], 
      isLoading: boolean,
      customOptions?: Partial<ChartOptions>
    ): React.ReactNode => {
      if (isLoading) return <LoadingSpinner />

      if (!motiveChartData?.length) {
        return <EmptyState message="No hay datos disponibles para mostrar" />
      }

      const mergedOptions = { ...chartOptions, ...customOptions }
      const hasLongLabels = motiveChartData.length > 6

      // Normalizar datos
      const normalizedData = motiveChartData.map(item => ({
        name: 'motive' in item ? item.motive : item.tipo,
        value: 'count' in item ? item.count : item.cantidad,
      }))

      return (
        <div className="h-[350px]" ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={normalizedData}
              margin={{ 
                top: 20, 
                right: 20, 
                left: -10, 
                bottom: hasLongLabels ? 80 : 30 
              }}
            >
              {mergedOptions.showGrid && (
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              )}
              
              <XAxis
                dataKey="name"
                angle={hasLongLabels ? -35 : 0}
                textAnchor={hasLongLabels ? "end" : "middle"}
                height={hasLongLabels ? 80 : 40}
                interval={0}
                tick={{ fontSize: 11 }}
              />
              
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              
              {mergedOptions.showTooltip && (
                <Tooltip
                  content={<UniversalTooltip isDark={isDark} />}
                  formatter={(value: number) => [`${value} casos`, "Cantidad"]}
                />
              )}
              
              <Bar 
                dataKey="value" 
                name="Cantidad" 
                radius={[4, 4, 0, 0]}
                isAnimationActive={mergedOptions.animation}
                animationDuration={500}
              >
                {normalizedData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS_PROFESSIONAL[index % COLORS_PROFESSIONAL.length]}
                  />
                ))}
                
                {mergedOptions.showLabels && (
                  <LabelList
                    dataKey="value"
                    position="top"
                    style={{ fontSize: "10px", fontWeight: 600 }}
                  />
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    },
    [chartOptions, isDark]
  )

  /* ============================================================================
   * RENDERIZADOR DE LINE CHART MEJORADO
   * ========================================================================== */

  const renderLineChart = useCallback(
    (
      trendChartData: TrendChartData[] | TimelineChartData[], 
      isLoading: boolean,
      customOptions?: Partial<ChartOptions>
    ): React.ReactNode => {
      if (isLoading) return <LoadingSpinner />

      if (!trendChartData?.length) {
        return (
          <EmptyState 
            message="No hay datos de tendencias para mostrar"
            icon={<TrendingUp className="h-8 w-8 text-muted-foreground" />}
          />
        )
      }

      const mergedOptions = { ...chartOptions, ...customOptions }

      // Detectar automáticamente las líneas a mostrar
      const dataKeys = Object.keys(trendChartData[0] || {})
        .filter(key => 
          key !== 'date' && 
          key !== 'formattedDate' && 
          key !== 'total' &&
          typeof trendChartData[0]?.[key] === 'number'
        )
        .slice(0, 5) // Máximo 5 líneas para legibilidad

      return (
        <div className="h-[350px]" ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendChartData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
              {mergedOptions.showGrid && (
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              )}
              
              <XAxis dataKey="formattedDate" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} />
              
              {mergedOptions.showTooltip && (
                <Tooltip 
                  content={<UniversalTooltip isDark={isDark} showTrend />} 
                  labelFormatter={(label: string) => `Fecha: ${label}`}
                />
              )}
              
              {mergedOptions.showLegend && (
                <Legend verticalAlign="top" height={40} wrapperStyle={{ fontSize: "12px" }} />
              )}
              
              {dataKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key.charAt(0).toUpperCase() + key.slice(1)}
                  stroke={STATUS_COLORS[key as AppointmentStatus] || COLORS_PROFESSIONAL[index % COLORS_PROFESSIONAL.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={mergedOptions.animation}
                  animationDuration={600 + index * 100}
                  connectNulls={false}
                />
              ))}

              {mergedOptions.showBrush && trendChartData.length > 15 && (
                <Brush dataKey="formattedDate" height={30} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )
    },
    [chartOptions, isDark]
  )

  /* ============================================================================
   * RENDERIZADORES WEEKDAY Y SCATTER (SIN CAMBIOS MAYORES)
   * ========================================================================== */

  const renderWeekdayChart = useCallback(
    (weekdayChartData: WeekdayChartData[], isLoading: boolean): React.ReactNode => {
      if (isLoading) return <LoadingSpinner />

      if (!weekdayChartData?.length) {
        return <EmptyState message="No hay datos de asistencia por día" />
      }

      return (
        <div className="h-[350px]" ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekdayChartData} margin={{ top: 20, right: 20, left: -10, bottom: 10 }}>
              {chartOptions.showGrid && (
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              )}
              
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} />
              
              {chartOptions.showTooltip && (
                <Tooltip content={<UniversalTooltip isDark={isDark} />} />
              )}
              
              {chartOptions.showLegend && (
                <Legend verticalAlign="top" height={40} wrapperStyle={{ fontSize: "12px" }} />
              )}
              
              <Bar
                dataKey="total"
                name="Total Citas"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                isAnimationActive={chartOptions.animation}
                animationDuration={500}
              />
              
              <Bar
                dataKey="attended"
                name="Asistencias"
                fill="hsl(var(--secondary))"
                radius={[4, 4, 0, 0]}
                isAnimationActive={chartOptions.animation}
                animationDuration={600}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    },
    [chartOptions, isDark]
  )

  const renderScatterChart = useCallback(
    (scatterData: ScatterData, timeRange: readonly [number, number], isLoading: boolean): React.ReactNode => {
      if (isLoading) return <LoadingSpinner />

      if (!scatterData || Object.values(scatterData).every(arr => arr.length === 0)) {
        return <EmptyState message="No hay datos de correlación para mostrar" />
      }

      return (
        <div className="space-y-4">
          <div className="h-[400px]" ref={chartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                {chartOptions.showGrid && (
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                )}
                
                <XAxis
                  dataKey="day"
                  name="Día"
                  type="number"
                  domain={[0, 6]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value: number) => WEEKDAYS_SHORT[value] || ""}
                />
                
                <YAxis
                  dataKey="hour"
                  name="Hora"
                  type="number"
                  domain={[Math.max(0, timeRange[0] - 1), Math.min(23, timeRange[1] + 1)]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value: number) => `${value}:00`}
                />
                
                <ZAxis dataKey="count" range={[40, 400]} name="Cantidad" />
                
                {chartOptions.showTooltip && (
                  <Tooltip
                    content={<UniversalTooltip isDark={isDark} />}
                    formatter={(value: number, name: string) => {
                      if (name === "Día") return WEEKDAYS[value] || value
                      if (name === "Hora") return `${value}:00`
                      return value
                    }}
                  />
                )}
                
                {chartOptions.showLegend && (
                  <Legend verticalAlign="top" height={40} wrapperStyle={{ fontSize: "12px" }} />
                )}
                
                {Object.entries(scatterData).map(([status, data], index) => (
                  <Scatter
                    key={status}
                    name={status}
                    data={data}
                    fill={STATUS_COLORS[status as AppointmentStatus] || COLORS_PROFESSIONAL[index % COLORS_PROFESSIONAL.length]}
                    isAnimationActive={chartOptions.animation}
                    animationDuration={600 + index * 100}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          
          <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded border text-center">
            <p>💡 El tamaño indica cantidad de citas. Optimiza horarios según patrones.</p>
          </div>
        </div>
      )
    },
    [chartOptions, isDark]
  )

  /* ============================================================================
   * CLEANUP AL DESMONTAR
   * ========================================================================== */

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [])

  /* ============================================================================
   * RETORNO OPTIMIZADO Y EXPANDIDO
   * ========================================================================== */

  return useMemo(() => ({
    chartOptions,
    chartRef,
    renderPieChart,
    renderBarChart,
    renderLineChart,
    renderWeekdayChart,
    renderScatterChart,
    CHART_STYLES,
    StatCard,
    LoadingSpinner,
    EmptyState,
    UniversalTooltip,
    isVisible,
    isDark,
  }), [
    chartOptions,
    renderPieChart,
    renderBarChart,
    renderLineChart,
    renderWeekdayChart,
    renderScatterChart,
    isVisible,
    isDark,
  ])
}

export default useChartConfig