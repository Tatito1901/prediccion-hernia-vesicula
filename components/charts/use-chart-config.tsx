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
import { format, parseISO, isValid } from "date-fns"
import { es } from "date-fns/locale/es"
import { ChevronDown, ChevronUp, AlertTriangle, Loader2, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CHART_STYLES, getChartColors, STATUS_COLORS, getAdaptiveBackground, isDarkTheme } from "@/components/charts/chart-theme"
import type { AppointmentStatus } from "@/app/dashboard/data-model"

export { STATUS_COLORS }

/* ============================================================================
 * TIPOS UNIFICADOS Y CENTRALIZADOS
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
  responsive?: boolean
}

// TIPOS UNIFICADOS PARA TODOS LOS COMPONENTES
export interface PatientData {
  id: string
  diagnostico?: string
  diagnostico_principal?: string
  fecha_registro?: string
  fecha_primera_consulta?: string
  edad?: number
  genero?: 'M' | 'F'
  paciente?: string
  fechaConsulta?: Date | string
  horaConsulta?: string
  motivoConsulta?: string
  estado?: AppointmentStatus
  notas?: string
  telefono?: string
  email?: string
}

export interface DiagnosisData {
  tipo: string
  cantidad: number
  porcentaje?: number
  percentage?: number
  tendencia?: number
  descripcion?: string
  color?: string
  categoria?: string
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
  [key: string]: string | number | undefined
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

export interface ResponsiveConfig {
  breakpoints: {
    mobile: number
    tablet: number
    desktop: number
  }
  chartSizes: {
    mobile: { width: string; height: number }
    tablet: { width: string; height: number }
    desktop: { width: string; height: number }
  }
}

/* ============================================================================
 * UTILIDADES CENTRALIZADAS Y OPTIMIZADAS
 * ========================================================================== */

export const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

export const MAIN_DIAGNOSES = [
  'Hernia Inguinal', 'Hernia Umbilical', 'Hernia Incisional', 'Hernia Hiatal', 'Hernia Epigástrica',
  'Colecistitis Aguda', 'Colelitiasis Sintomática', 'Vesícula Biliar y Vías Biliares',
  'Consulta General', 'Revisión Postoperatoria', 'Apendicitis'
] as const

// Cache global para funciones pesadas
const globalUtilsCache = new Map<string, any>()

// Función unificada y optimizada para formateo de fechas
export const formatDateUtil = (
  date: Date | string | undefined | null,
  formatStr = "dd/MM/yyyy"
): string => {
  if (!date) return "Fecha no definida"
  
  const cacheKey = `date-${date}-${formatStr}`
  const cached = globalUtilsCache.get(cacheKey)
  if (cached) return cached
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date
    if (!isValid(dateObj)) {
      const fallbackDateObj = new Date(date as string)
      if (isValid(fallbackDateObj)) {
        const result = format(fallbackDateObj, formatStr, { locale: es })
        globalUtilsCache.set(cacheKey, result)
        return result
      }
      return "Fecha inválida"
    }
    const result = format(dateObj, formatStr, { locale: es })
    globalUtilsCache.set(cacheKey, result)
    return result
  } catch {
    return "Error de formato"
  }
}

// Función unificada para formateo de estados
export const titleCaseStatus = (status: string): string => {
  if (status === "NO ASISTIO") return "No Asistió"
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

// Función unificada para abreviar texto con cache
export const ABBR = (s: string, n = 16) => {
  if (s.length <= n) return s
  const cacheKey = `abbr-${s}-${n}`
  const cached = globalUtilsCache.get(cacheKey)
  if (cached) return cached
  
  const result = `${s.slice(0, n - 1)}…`
  globalUtilsCache.set(cacheKey, result)
  return result
}

// Función unificada para convertir hora a decimal
export const hourToDecimal = (timeStr: string | undefined): number | null => {
  if (!timeStr || typeof timeStr !== "string") return null
  
  const cached = globalUtilsCache.get(`hour-${timeStr}`)
  if (cached !== undefined) return cached
  
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number.parseInt(match[1], 10)
  const minutes = Number.parseInt(match[2], 10)
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  
  const result = hours + minutes / 60
  globalUtilsCache.set(`hour-${timeStr}`, result)
  return result
}

// Función unificada para categorizar diagnósticos médicos
export const categorizeMainDiagnosis = (diagnosis?: string): string => {
  if (!diagnosis) return 'Otro'
  
  const cached = globalUtilsCache.get(`cat-${diagnosis}`)
  if (cached) return cached
  
  const lower = diagnosis.toLowerCase()
  
  for (const mainDiag of MAIN_DIAGNOSES) {
    if (lower.includes(mainDiag.toLowerCase())) {
      globalUtilsCache.set(`cat-${diagnosis}`, mainDiag)
      return mainDiag
    }
  }
  
  globalUtilsCache.set(`cat-${diagnosis}`, 'Otro')
  return 'Otro'
}

// Función unificada para obtener categoría médica con color
export const getMedicalCategory = (tipo: string): { categoria: string; color: number } => {
  const cached = globalUtilsCache.get(`medcat-${tipo}`)
  if (cached) return cached
  
  const lower = tipo.toLowerCase()
  
  let result: { categoria: string; color: number }
  
  if (lower.includes("hernia")) result = { categoria: 'Cirugía General', color: 1 }
  else if (lower.includes("vesícul") || lower.includes("colelit") || lower.includes("colecist")) 
    result = { categoria: 'Gastroenterología', color: 2 }
  else if (lower.includes("cardio")) result = { categoria: 'Cardiología', color: 3 }
  else if (lower.includes("apendicitis")) result = { categoria: 'Cirugía General', color: 1 }
  else result = { categoria: 'Medicina General', color: 4 }
  
  globalUtilsCache.set(`medcat-${tipo}`, result)
  return result
}

// Función unificada para procesar datos de pacientes - OPTIMIZADA
export const processPatientData = (patients: PatientData[]): {
  totalPatients: number
  diagnosisCounts: Map<string, number>
  medicalCategories: Map<string, number>
  ageStats: { average: number; count: number }
  genderStats: { male: number; female: number }
} => {
  if (!patients?.length) {
    return {
      totalPatients: 0,
      diagnosisCounts: new Map(),
      medicalCategories: new Map(),
      ageStats: { average: 0, count: 0 },
      genderStats: { male: 0, female: 0 }
    }
  }

  const diagnosisCounts = new Map<string, number>()
  const medicalCategories = new Map<string, number>()
  let totalAge = 0
  let ageCount = 0
  let maleCount = 0
  let femaleCount = 0

  for (let i = 0; i < patients.length; i++) {
    const p = patients[i]
    
    const diagnosis = p.diagnostico_principal || p.diagnostico || p.motivoConsulta || 'Sin diagnóstico'
    diagnosisCounts.set(diagnosis, (diagnosisCounts.get(diagnosis) || 0) + 1)
    
    const { categoria } = getMedicalCategory(diagnosis)
    medicalCategories.set(categoria, (medicalCategories.get(categoria) || 0) + 1)
    
    if (p.edad != null) {
      totalAge += p.edad
      ageCount++
    }
    
    if (p.genero === 'M') maleCount++
    else if (p.genero === 'F') femaleCount++
  }

  return {
    totalPatients: patients.length,
    diagnosisCounts,
    medicalCategories,
    ageStats: { average: ageCount > 0 ? Math.round(totalAge / ageCount) : 0, count: ageCount },
    genderStats: { male: maleCount, female: femaleCount }
  }
}

// Hook para detectar tamaño de pantalla - OPTIMIZADO
export const useResponsiveBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth
      if (width < 768) setBreakpoint('mobile')
      else if (width < 1024) setBreakpoint('tablet')
      else setBreakpoint('desktop')
    }

    updateBreakpoint()
    
    let timeoutId: NodeJS.Timeout
    const throttledUpdate = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(updateBreakpoint, 150)
    }
    
    window.addEventListener('resize', throttledUpdate)
    return () => {
      window.removeEventListener('resize', throttledUpdate)
      clearTimeout(timeoutId)
    }
  }, [])

  return breakpoint
}

/* ============================================================================
 * CONFIGURACIÓN RESPONSIVA
 * ========================================================================== */

const DEFAULT_RESPONSIVE_CONFIG: ResponsiveConfig = {
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1200
  },
  chartSizes: {
    mobile: { width: '100%', height: 250 },
    tablet: { width: '100%', height: 300 },
    desktop: { width: '100%', height: 350 }
  }
}

/* ============================================================================
 * CONSTANTES Y CONFIG POR DEFECTO
 * ========================================================================== */

const COLORS_PROFESSIONAL = getChartColors('medical', 12)

const SIZE_CLASSES = {
  sm: "p-3",
  md: "p-4", 
  lg: "p-6"
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
  responsive: true,
}

/* ============================================================================
 * COMPONENTES REUTILIZABLES ULTRA-OPTIMIZADOS
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
        "border-l-4 group transition-all duration-200 hover:shadow-lg",
        onClick && "cursor-pointer hover:scale-[1.02]",
        className
      )}
      style={borderStyle}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <CardHeader className={cn("pb-3", SIZE_CLASSES[size])}>
        <div className="flex justify-between items-start">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-sm font-medium text-muted-foreground truncate">
              {title}
            </CardTitle>
            
            <div className="flex items-baseline space-x-2">
              <span className={cn(
                "font-bold tracking-tight",
                size === 'sm' ? "text-lg" : size === 'lg' ? "text-3xl" : "text-2xl"
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
          
          <div className={cn("rounded-xl p-2.5 bg-primary/10 shrink-0", iconColorClass)}>
            {icon}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 pb-3">
        <CardDescription className="text-xs leading-relaxed">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  )
})

StatCard.displayName = "StatCard"

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
 * TOOLTIP UNIVERSAL MEJORADO
 * ========================================================================== */

const UniversalTooltip = memo<TooltipProps<number, string> & { 
  isDark?: boolean;
  showTrend?: boolean;
  showDescription?: boolean;
  responsive?: boolean;
}>(({ active, payload, label, isDark, showTrend = false, showDescription = false, responsive = true }) => {
  const breakpoint = useResponsiveBreakpoint()
  
  if (!active || !payload?.length) return null

  const data = payload[0].payload
  const isPrediction = data?.periodKey?.startsWith?.('pred-') || false
  const tooltipSize = responsive && breakpoint === 'mobile' ? 'compact' : 'full'

  return (
    <div 
      className={cn(
        "rounded-lg shadow-lg border bg-background/95 backdrop-blur-sm text-sm animate-in fade-in zoom-in-95 duration-200",
        tooltipSize === 'compact' ? 'p-2' : 'p-3'
      )}
      style={{
        backgroundColor: getAdaptiveBackground(0.95),
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      }}
    >
      <div className={cn(
        "font-semibold flex items-center gap-2",
        tooltipSize === 'compact' ? 'mb-1 text-xs' : 'mb-2'
      )}>
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
              <span className={tooltipSize === 'compact' ? 'text-xs' : 'text-sm'}>
                {entry.name}
              </span>
            </div>
            <span className="font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
      
      {showTrend && data?.trend !== undefined && tooltipSize === 'full' && (
        <div className="pt-2 mt-2 border-t border-border text-xs">
          <span className="text-muted-foreground">Tendencia: </span>
          <span className="font-medium">{Math.round(data.trend)}</span>
        </div>
      )}
      
      {showDescription && data?.descripcion && tooltipSize === 'full' && (
        <div className="pt-2 mt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">{data.descripcion}</p>
        </div>
      )}
    </div>
  )
})

UniversalTooltip.displayName = "UniversalTooltip"

/* ============================================================================
 * HOOK PRINCIPAL ULTRA-OPTIMIZADO CON RESPONSIVIDAD
 * ========================================================================== */

export function useChartConfig(options?: Partial<ChartOptions>) {
  const chartOptions = useMemo(() => ({
    ...DEFAULT_CHART_OPTIONS,
    ...options,
  }), [options])

  const chartRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(true) // Simplificado, asume visible por defecto
  const isDark = isDarkTheme()
  const breakpoint = useResponsiveBreakpoint()

  // Configuración responsiva
  const responsiveConfig = useMemo(() => {
    if (!chartOptions.responsive) return DEFAULT_RESPONSIVE_CONFIG
    
    return {
      ...DEFAULT_RESPONSIVE_CONFIG,
      chartSizes: {
        mobile: { width: '100%', height: 250 },
        tablet: { width: '100%', height: 300 },
        desktop: { width: '100%', height: chartOptions.showLegend ? 380 : 350 }
      }
    }
  }, [chartOptions.responsive, chartOptions.showLegend])

  /* ============================================================================
   * RENDERIZADORES DE GRÁFICOS ULTRA-OPTIMIZADOS
   * ========================================================================== */

  const renderPieChart = useCallback(
    (
      data: StatusChartData[] | DiagnosisData[], 
      generalStats: GeneralStats, 
      isLoading: boolean,
      customOptions?: Partial<ChartOptions>
    ): React.ReactNode => {
      if (isLoading) return <LoadingSpinner />

      if (!data?.length || data.every(item => ('value' in item ? item.value : item.cantidad) === 0)) {
        return <EmptyState message="No hay datos disponibles para mostrar" />
      }

      const mergedOptions = { ...chartOptions, ...customOptions }
      const colors = getChartColors(mergedOptions.colorScheme || 'medical', data.length)
      const chartSize = responsiveConfig.chartSizes[breakpoint]

      const normalizedData = data.map((item, index) => ({
        name: 'name' in item ? item.name : titleCaseStatus(item.tipo),
        value: 'value' in item ? item.value : item.cantidad,
        color: item.color || colors[index % colors.length],
        percentage: 'percentage' in item && item.percentage !== undefined ? item.percentage : ('porcentaje' in item ? item.porcentaje : undefined),
        descripcion: 'descripcion' in item ? item.descripcion : undefined,
      }))

      return (
        <div style={{ height: chartSize.height }} ref={chartRef}>
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
                paddingAngle={breakpoint === 'mobile' ? 2 : 3}
                cornerRadius={breakpoint === 'mobile' ? 3 : 4}
                isAnimationActive={mergedOptions.animation && isVisible}
                animationDuration={600}
                stroke={isDark ? 'hsl(var(--card))' : 'hsl(var(--background))'}
                strokeWidth={breakpoint === 'mobile' ? 1 : 2}
              >
                {normalizedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    stroke="hsl(var(--background))" 
                    strokeWidth={breakpoint === 'mobile' ? 1 : 2}
                    className="hover:opacity-80 transition-opacity duration-200"
                  />
                ))}
                
                {mergedOptions.showLabels && breakpoint !== 'mobile' && (
                  <LabelList
                    dataKey="percentage"
                    position="outside"
                    offset={10}
                    formatter={(value: number) => value > 5 ? `${value}%` : ''}
                    style={{ 
                      fontSize: breakpoint === 'tablet' ? '10px' : '11px', 
                      fill: CHART_STYLES.axis.labelColor, 
                      fontWeight: 500 
                    }}
                  />
                )}
              </Pie>
              
              {mergedOptions.showTooltip && (
                <Tooltip
                  content={<UniversalTooltip isDark={isDark} showDescription responsive />}
                  formatter={(value: number, name: string) => [
                    `${value} casos (${generalStats.total > 0 ? ((value / generalStats.total) * 100).toFixed(1) : 0}%)`,
                    name,
                  ]}
                />
              )}
              
              {mergedOptions.showLegend && normalizedData.length <= 8 && breakpoint !== 'mobile' && (
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ 
                    paddingTop: "16px", 
                    fontSize: breakpoint === 'tablet' ? "11px" : "12px" 
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>
      )
    },
    [chartOptions, isDark, breakpoint, responsiveConfig, isVisible]
  )

  const renderBarChart = useCallback(
    (
      data: MotiveChartData[] | DiagnosisData[], 
      isLoading: boolean,
      customOptions?: Partial<ChartOptions>
    ): React.ReactNode => {
      if (isLoading) return <LoadingSpinner />

      if (!data?.length) {
        return <EmptyState message="No hay datos disponibles para mostrar" />
      }

      const mergedOptions = { ...chartOptions, ...customOptions }
      const chartSize = responsiveConfig.chartSizes[breakpoint]
      const hasLongLabels = data.length > 6

      const normalizedData = data.map(item => ({
        name: ABBR('motive' in item ? item.motive : item.tipo, 
          breakpoint === 'mobile' ? 10 : hasLongLabels ? 15 : 25),
        value: 'count' in item ? item.count : item.cantidad,
      }))

      return (
        <div style={{ height: chartSize.height }} ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={normalizedData} 
              margin={{ 
                top: 20, 
                right: breakpoint === 'mobile' ? 10 : 20, 
                left: breakpoint === 'mobile' ? -5 : -10, 
                bottom: hasLongLabels ? (breakpoint === 'mobile' ? 60 : 80) : 30 
              }}
            >
              {mergedOptions.showGrid && (
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              )}
              
              <XAxis
                dataKey="name"
                angle={hasLongLabels ? -35 : 0}
                textAnchor={hasLongLabels ? "end" : "middle"}
                height={hasLongLabels ? (breakpoint === 'mobile' ? 60 : 80) : 40}
                interval={0}
                tick={{ fontSize: breakpoint === 'mobile' ? 10 : 11 }}
              />
              
              <YAxis 
                tick={{ fontSize: breakpoint === 'mobile' ? 10 : 11 }} 
                axisLine={false} 
                tickLine={false} 
              />
              
              {mergedOptions.showTooltip && (
                <Tooltip
                  content={<UniversalTooltip isDark={isDark} responsive />}
                  formatter={(value: number) => [`${value} casos`, "Cantidad"]}
                />
              )}
              
              <Bar 
                dataKey="value" 
                name="Cantidad" 
                radius={[4, 4, 0, 0]}
                isAnimationActive={mergedOptions.animation && isVisible}
                animationDuration={500}
              >
                {normalizedData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS_PROFESSIONAL[index % COLORS_PROFESSIONAL.length]}
                  />
                ))}
                
                {mergedOptions.showLabels && breakpoint === 'desktop' && (
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
    [chartOptions, isDark, breakpoint, responsiveConfig, isVisible]
  )

  const renderLineChart = useCallback(
    (
      data: TrendChartData[], 
      isLoading: boolean,
      customOptions?: Partial<ChartOptions>
    ): React.ReactNode => {
      if (isLoading) return <LoadingSpinner />

      if (!data?.length) {
        return (
          <EmptyState 
            message="No hay datos de tendencias para mostrar"
            icon={<TrendingUp className="h-8 w-8 text-muted-foreground" />}
          />
        )
      }

      const mergedOptions = { ...chartOptions, ...customOptions }
      const chartSize = responsiveConfig.chartSizes[breakpoint]

      const dataKeys = Object.keys(data[0] || {})
        .filter(key => 
          key !== 'date' && 
          key !== 'formattedDate' && 
          key !== 'total' &&
          typeof data[0]?.[key] === 'number'
        )
        .slice(0, breakpoint === 'mobile' ? 3 : 5)

      return (
        <div style={{ height: chartSize.height }} ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={data} 
              margin={{ 
                top: 20, 
                right: breakpoint === 'mobile' ? 10 : 30, 
                left: 0, 
                bottom: 10 
              }}
            >
              {mergedOptions.showGrid && (
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              )}
              
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fontSize: breakpoint === 'mobile' ? 10 : 11 }} 
              />
              <YAxis 
                tick={{ fontSize: breakpoint === 'mobile' ? 10 : 11 }} 
                allowDecimals={false} 
                axisLine={false} 
              />
              
              {mergedOptions.showTooltip && (
                <Tooltip 
                  content={<UniversalTooltip isDark={isDark} showTrend responsive />} 
                  labelFormatter={(label: string) => `Fecha: ${label}`}
                />
              )}
              
              {mergedOptions.showLegend && breakpoint !== 'mobile' && (
                <Legend 
                  verticalAlign="top" 
                  height={40} 
                  wrapperStyle={{ fontSize: breakpoint === 'tablet' ? '11px' : '12px' }} 
                />
              )}
              
              {dataKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={titleCaseStatus(key)}
                  stroke={STATUS_COLORS[key as AppointmentStatus] || COLORS_PROFESSIONAL[index % COLORS_PROFESSIONAL.length]}
                  strokeWidth={breakpoint === 'mobile' ? 2 : 2.5}
                  dot={{ r: breakpoint === 'mobile' ? 2 : 3 }}
                  activeDot={{ r: breakpoint === 'mobile' ? 3 : 4 }}
                  isAnimationActive={mergedOptions.animation && isVisible}
                  animationDuration={600 + index * 100}
                  connectNulls={false}
                />
              ))}

              {mergedOptions.showBrush && data.length > 15 && breakpoint === 'desktop' && (
                <Brush dataKey="formattedDate" height={30} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )
    },
    [chartOptions, isDark, breakpoint, responsiveConfig, isVisible]
  )

  const renderWeekdayChart = useCallback(
    (data: WeekdayChartData[], isLoading: boolean): React.ReactNode => {
      if (isLoading) return <LoadingSpinner />

      if (!data?.length) {
        return <EmptyState message="No hay datos de asistencia por día" />
      }

      const chartSize = responsiveConfig.chartSizes[breakpoint]

      return (
        <div style={{ height: chartSize.height }} ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              margin={{ 
                top: 20, 
                right: breakpoint === 'mobile' ? 10 : 20, 
                left: -10, 
                bottom: 10 
              }}
            >
              {chartOptions.showGrid && (
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              )}
              
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: breakpoint === 'mobile' ? 10 : 11 }} 
              />
              <YAxis 
                tick={{ fontSize: breakpoint === 'mobile' ? 10 : 11 }} 
                axisLine={false} 
              />
              
              {chartOptions.showTooltip && (
                <Tooltip content={<UniversalTooltip isDark={isDark} responsive />} />
              )}
              
              {chartOptions.showLegend && breakpoint !== 'mobile' && (
                <Legend 
                  verticalAlign="top" 
                  height={40} 
                  wrapperStyle={{ fontSize: breakpoint === 'tablet' ? '11px' : '12px' }} 
                />
              )}
              
              <Bar
                dataKey="total"
                name="Total Citas"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                isAnimationActive={chartOptions.animation && isVisible}
                animationDuration={500}
              />
              
              <Bar
                dataKey="attended"
                name="Asistencias"
                fill="hsl(var(--secondary))"
                radius={[4, 4, 0, 0]}
                isAnimationActive={chartOptions.animation && isVisible}
                animationDuration={600}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    },
    [chartOptions, isDark, breakpoint, responsiveConfig, isVisible]
  )

  const renderScatterChart = useCallback(
    (scatterData: ScatterData, timeRange: readonly [number, number], isLoading: boolean): React.ReactNode => {
      if (isLoading) return <LoadingSpinner />

      if (!scatterData || Object.values(scatterData).every(arr => arr.length === 0)) {
        return <EmptyState message="No hay datos de correlación para mostrar" />
      }

      const chartSize = responsiveConfig.chartSizes[breakpoint]

      return (
        <div className="space-y-4">
          <div style={{ height: chartSize.height + 50 }} ref={chartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ 
                top: 20, 
                right: breakpoint === 'mobile' ? 10 : 20, 
                bottom: 20, 
                left: 10 
              }}>
                {chartOptions.showGrid && (
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                )}
                
                <XAxis
                  dataKey="day"
                  name="Día"
                  type="number"
                  domain={[0, 6]}
                  tick={{ fontSize: breakpoint === 'mobile' ? 10 : 11 }}
                  tickFormatter={(value: number) => WEEKDAYS_SHORT[value] || ""}
                />
                
                <YAxis
                  dataKey="hour"
                  name="Hora"
                  type="number"
                  domain={[Math.max(0, timeRange[0] - 1), Math.min(23, timeRange[1] + 1)]}
                  tick={{ fontSize: breakpoint === 'mobile' ? 10 : 11 }}
                  tickFormatter={(value: number) => `${value}:00`}
                />
                
                <ZAxis 
                  dataKey="count" 
                  range={breakpoint === 'mobile' ? [20, 200] : [40, 400]} 
                  name="Cantidad" 
                />
                
                {chartOptions.showTooltip && (
                  <Tooltip
                    content={<UniversalTooltip isDark={isDark} responsive />}
                    formatter={(value: number, name: string) => {
                      if (name === "Día") return WEEKDAYS[value] || value
                      if (name === "Hora") return `${value}:00`
                      return value
                    }}
                  />
                )}
                
                {chartOptions.showLegend && breakpoint !== 'mobile' && (
                  <Legend 
                    verticalAlign="top" 
                    height={40} 
                    wrapperStyle={{ fontSize: breakpoint === 'tablet' ? '11px' : '12px' }} 
                  />
                )}
                
                {Object.entries(scatterData).map(([status, data], index) => (
                  <Scatter
                    key={status}
                    name={titleCaseStatus(status)}
                    data={data}
                    fill={STATUS_COLORS[status as AppointmentStatus] || COLORS_PROFESSIONAL[index % COLORS_PROFESSIONAL.length]}
                    isAnimationActive={chartOptions.animation && isVisible}
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
    [chartOptions, isDark, breakpoint, responsiveConfig, isVisible]
  )

  // Cleanup optimizado
  useEffect(() => {
    return () => {
      // Limpiar cache cuando el componente se desmonta si crece demasiado
      if (globalUtilsCache.size > 1000) {
        globalUtilsCache.clear()
      }
    }
  }, [])

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
    breakpoint,
    responsiveConfig,
    // Utilidades centralizadas
    formatDateUtil,
    titleCaseStatus,
    ABBR,
    hourToDecimal,
    categorizeMainDiagnosis,
    getMedicalCategory,
    processPatientData,
    WEEKDAYS,
    WEEKDAYS_SHORT,
    MAIN_DIAGNOSES,
    useResponsiveBreakpoint,
  }), [
    chartOptions,
    renderPieChart,
    renderBarChart,
    renderLineChart,
    renderWeekdayChart,
    renderScatterChart,
    isVisible,
    isDark,
    breakpoint,
    responsiveConfig,
  ])
}

export default useChartConfig

export { LoadingSpinner, EmptyState, UniversalTooltip }