
import type React from "react"

import { useRef, useState, useCallback, useMemo, memo } from "react"
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
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Brush,
  RadialBarChart,
  RadialBar,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  Label as RechartsLabel,
  LabelList,
  type TooltipProps,
} from "recharts"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Label } from "@/components/ui/label"
import { FileBarChart, BarChart2, PieChartIcon, Settings, Info, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

// --- Types ---
export type ChartType = "pie" | "bar" | "line" | "area" | "radar" | "scatter" | "radial"
export type ColorScheme = "categorical" | "sequential" | "divergent"
export type Orientation = "vertical" | "horizontal"
export type AppointmentStatus = "completada" | "cancelada" | "pendiente" | "presente" | "reprogramada" | "no_asistio"

export interface ChartConfig {
  type: ChartType
  showLegend: boolean
  showTooltip: boolean
  showGrid: boolean
  animation: boolean
  stacked: boolean
  darkMode?: boolean
  showLabels?: boolean
  primaryColor?: string
  colorScheme?: ColorScheme
  orientation?: Orientation
  refreshInterval?: number | null
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

export interface TrendChartData extends Record<AppointmentStatus, number> {
  date: string
  formattedDate: string
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

export interface ChartConfigPanelProps {
  chartConfig: ChartConfig
  updateChartConfig: <K extends keyof ChartConfig>(key: K, value: ChartConfig[K]) => void
  options?: {
    allowTypeChange?: boolean
    availableTypes?: ChartType[]
    availableColorSchemes?: ColorScheme[]
  }
  className?: string
}

// --- Constants ---
// Define color palettes once to avoid recreations
const chartPalette = {
  categorical: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280", "#ec4899", "#06b6d4"],
  sequential: ["#0ea5e9", "#0284c7", "#0369a1", "#075985", "#0c4a6e", "#082f49", "#172554", "#0f172a"],
  divergent: ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"],
}

// Predefined chart styles
const chartStyles = {
  animation: {
    duration: 800,
    easing: "ease-in-out",
  },
  bar: {
    radius: 4,
    strokeWidth: 2,
  },
  line: {
    strokeWidth: 2,
    dotSize: 4,
    activeDotSize: 6,
  },
  radar: {
    fillOpacity: 0.5,
    strokeWidth: 2,
  },
  pie: {
    paddingAngle: 2,
  },
  axis: {
    labelColor: "#6b7280",
    fontSize: 12,
  },
}

// Get color set based on scheme - memoized to avoid recreations
const getChartColorSet = (scheme: ColorScheme = "categorical"): readonly string[] => {
  return chartPalette[scheme] || chartPalette.categorical
}

export const COLORS = chartPalette.categorical

// Status colors as immutable object
export const STATUS_COLORS: Readonly<StatusColorMap> = {
  completada: "#10b981",
  cancelada: "#ef4444",
  pendiente: "#f59e0b",
  presente: "#3b82f6",
  reprogramada: "#8b5cf6",
  no_asistio: "#6b7280",
}

// Weekday constants as frozen objects to prevent modifications
export const WEEKDAYS = Object.freeze(["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"])
export const WEEKDAYS_SHORT = Object.freeze(["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"])

// Chart theme as frozen object
export const CHART_THEME = Object.freeze({
  colors: {
    primary: "#3b82f6",
    secondary: "#10b981",
    tertiary: "#f59e0b",
    danger: "#ef4444",
    neutral: "#6b7280",
  },
  chart: {
    fontFamily: "inherit",
    backgroundColor: "transparent",
    textColor: "#6b7280",
    fontSize: 12,
  },
  grid: {
    stroke: "#e5e7eb",
    strokeDasharray: "3 3",
  },
  tooltip: {
    backgroundColor: "white",
    borderRadius: 6,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    fontSize: 12,
    padding: 8,
  },
})

// Helper function for card styles - extracted to avoid recreations
const getCardStyles = (title: string, changePercent?: number) => {
  let bgColor = "bg-blue-50 dark:bg-blue-950/20"
  let iconColor = "text-blue-600 dark:text-blue-400"
  let borderColor = "border-blue-100 dark:border-blue-800/30"
  let ringColor = "ring-blue-100/50 dark:ring-blue-700/10"

  if (title.includes("Asistencia")) {
    bgColor = "bg-green-50 dark:bg-green-950/20"
    iconColor = "text-green-600 dark:text-green-400"
    borderColor = "border-green-100 dark:border-green-800/30"
    ringColor = "ring-green-100/50 dark:ring-green-700/10"
  } else if (title.includes("Cancelación")) {
    bgColor = "bg-red-50 dark:bg-red-950/20"
    iconColor = "text-red-600 dark:text-red-400"
    borderColor = "border-red-100 dark:border-red-800/30"
    ringColor = "ring-red-100/50 dark:ring-red-700/10"
  } else if (title.includes("Pendientes")) {
    bgColor = "bg-amber-50 dark:bg-amber-950/20"
    iconColor = "text-amber-600 dark:text-amber-400"
    borderColor = "border-amber-100 dark:border-amber-800/30"
    ringColor = "ring-amber-100/50 dark:ring-amber-700/10"
  }

  const trendColor =
    changePercent === undefined
      ? "text-gray-500"
      : changePercent > 0
        ? "text-green-600 dark:text-green-400"
        : changePercent < 0
          ? "text-red-600 dark:text-red-400"
          : "text-gray-500"

  return { bgColor, iconColor, borderColor, ringColor, trendColor }
}

// Helper function for tooltip formatting
const formatTooltipValue = (value: number | string, name: string, unit?: string): [string, string] => {
  // Format value
  const formattedValue =
    typeof value === "number"
      ? name === "rate" || name.includes("porcentaje")
        ? `${value.toFixed(1)}%`
        : String(value)
      : String(value)

  // Format name
  const formattedName =
    name === "total"
      ? "Total"
      : name === "completada"
        ? "Completadas"
        : name === "cancelada"
          ? "Canceladas"
          : name === "presente"
            ? "Presentes"
            : name === "reprogramada"
              ? "Reprogramadas"
              : name === "no_asistio"
                ? "No Asistieron"
                : name === "rate"
                  ? "Tasa de asistencia"
                  : name === "attended"
                    ? "Asistencias"
                    : name

  return [`${formattedValue}${unit ? ` ${unit}` : ""}`, formattedName]
}

// Stat Card Component - Memoized to prevent unnecessary re-renders
export const StatCard = memo<StatCardProps>(
  ({
    title,
    value,
    icon,
    description,
    color,
    animationDelay = 0,
    changePercent,
    previousValue,
    trendLabel,
    animated = true,
    onClick,
    className = "",
  }) => {
    // Memoize card styles to prevent recalculation
    const cardStyles = useMemo(() => getCardStyles(title, changePercent), [title, changePercent])

    // Memoize trend icon to prevent recreation
    const trendIcon = useMemo(() => {
      if (changePercent === undefined) return null
      return changePercent > 0 ? (
        <ChevronUp className="h-3 w-3" aria-hidden="true" />
      ) : changePercent < 0 ? (
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      ) : null
    }, [changePercent])

    // Only define animation props if needed
    const animationProps = animated
      ? {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.3,
            delay: animationDelay * 0.1,
            ease: [0.23, 1, 0.32, 1],
          },
          whileHover: { y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
        }
      : {}

    return (
      <div
        onClick={onClick}
        className={cn(
          "transition-all",
          onClick && "cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-offset-background",
          className,
        )}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <Card
          className={cn(
            "overflow-hidden transition-all duration-200 border h-full",
            "hover:shadow-md group",
            cardStyles.ringColor,
            cardStyles.borderColor,
          )}
        >
          <CardHeader className={cn("pb-2", color || cardStyles.bgColor)}>
            <div className="flex justify-between items-start">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <div
                className={cn(
                  "rounded-full p-1.5 transition-transform group-hover:scale-110",
                  cardStyles.bgColor,
                  cardStyles.iconColor,
                )}
                aria-hidden="true"
              >
                {icon}
              </div>
            </div>

            <div className="flex items-baseline mt-1 space-x-1">
              <span className="text-2xl font-bold">{value}</span>

              {changePercent !== undefined && (
                <div
                  className={cn("flex items-center text-xs font-medium ml-2", cardStyles.trendColor)}
                  aria-label={`${Math.abs(changePercent).toFixed(1)}% ${changePercent > 0 ? "aumento" : "disminución"}`}
                >
                  {trendIcon}
                  <span>{Math.abs(changePercent).toFixed(1)}%</span>
                </div>
              )}
            </div>

            {previousValue !== undefined && (
              <div className="text-xs text-muted-foreground mt-1">
                {trendLabel || "Anterior"}: {previousValue}
              </div>
            )}
          </CardHeader>

          <CardContent>
            <CardDescription>{description}</CardDescription>
          </CardContent>
        </Card>
      </div>
    )
  },
)

StatCard.displayName = "StatCard"

// Chart Config Panel Component - Memoized to prevent unnecessary re-renders
export const ChartConfigPanel = memo<ChartConfigPanelProps>(
  ({ chartConfig, updateChartConfig, options = {}, className = "" }) => {
    const {
      allowTypeChange = true,
      availableTypes = ["pie", "bar", "line", "area", "radar", "scatter"],
      availableColorSchemes = ["categorical", "sequential", "divergent"],
    } = options

    // Predefined color scheme labels
    const colorSchemeLabels: Record<ColorScheme, string> = {
      categorical: "Categórica",
      sequential: "Secuencial",
      divergent: "Divergente",
    }

    return (
      <div className={`bg-white dark:bg-gray-950 rounded-lg shadow-sm border p-4 space-y-5 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center">
            <Settings className="h-4 w-4 mr-2 text-muted-foreground" aria-hidden="true" />
            Configuración del Gráfico
          </h3>
        </div>

        <ScrollArea className="pr-4 max-h-[calc(100vh-300px)]">
          <div className="space-y-4">
            {/* Visual Options Section */}
            <div className="space-y-2.5">
              <h4 className="text-xs uppercase text-muted-foreground font-medium tracking-wide mb-2">
                Opciones Visuales
              </h4>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="showLegend" className="text-xs cursor-pointer select-none">
                    Mostrar Leyenda
                  </Label>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" aria-label="Información sobre leyenda" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Muestra u oculta la leyenda del gráfico</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>

                <Switch
                  id="showLegend"
                  checked={chartConfig.showLegend}
                  onCheckedChange={(checked) => updateChartConfig("showLegend", checked)}
                  aria-label="Activar leyenda del gráfico"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="showTooltip" className="text-xs cursor-pointer select-none">
                    Mostrar Tooltip
                  </Label>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" aria-label="Información sobre tooltips" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Muestra información al pasar el cursor</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  id="showTooltip"
                  checked={chartConfig.showTooltip}
                  onCheckedChange={(checked) => updateChartConfig("showTooltip", checked)}
                  aria-label="Activar tooltips del gráfico"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="showGrid" className="text-xs cursor-pointer select-none">
                    Mostrar Cuadrícula
                  </Label>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" aria-label="Información sobre cuadrícula" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Muestra líneas de cuadrícula para facilitar la lectura</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  id="showGrid"
                  checked={chartConfig.showGrid}
                  onCheckedChange={(checked) => updateChartConfig("showGrid", checked)}
                  aria-label="Activar cuadrícula del gráfico"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="showLabels" className="text-xs cursor-pointer select-none">
                    Mostrar Etiquetas
                  </Label>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" aria-label="Información sobre etiquetas" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Muestra etiquetas con valores en el gráfico</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  id="showLabels"
                  checked={chartConfig.showLabels ?? false}
                  onCheckedChange={(checked) => updateChartConfig("showLabels", checked)}
                  aria-label="Activar etiquetas del gráfico"
                />
              </div>
            </div>

            {/* Behavior Section */}
            <div className="space-y-2.5">
              <h4 className="text-xs uppercase text-muted-foreground font-medium tracking-wide mb-2">Comportamiento</h4>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="animation" className="text-xs cursor-pointer select-none">
                    Animación
                  </Label>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" aria-label="Información sobre animaciones" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Habilita o deshabilita las animaciones</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  id="animation"
                  checked={chartConfig.animation}
                  onCheckedChange={(checked) => updateChartConfig("animation", checked)}
                  aria-label="Activar animaciones del gráfico"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="stacked" className="text-xs cursor-pointer select-none">
                    Apilar Datos
                  </Label>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" aria-label="Información sobre apilamiento" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Muestra series apiladas en gráficos de barras o área</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  id="stacked"
                  checked={chartConfig.stacked}
                  onCheckedChange={(checked) => updateChartConfig("stacked", checked)}
                  aria-label="Activar apilamiento de datos"
                />
              </div>

              {/* Color Scheme Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs">Esquema de Color</Label>
                <Tabs
                  value={chartConfig.colorScheme || "categorical"}
                  onValueChange={(value) => updateChartConfig("colorScheme", value as ColorScheme)}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-3 mb-2 h-7">
                    {availableColorSchemes.map((scheme) => (
                      <TabsTrigger key={scheme} value={scheme} className="text-xs py-0.5">
                        {colorSchemeLabels[scheme as ColorScheme] || scheme}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              {/* Orientation Selector for compatible charts */}
              {(chartConfig.type === "bar" || chartConfig.type === "line") && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Orientación</Label>
                  <Tabs
                    value={chartConfig.orientation || "vertical"}
                    onValueChange={(value) => updateChartConfig("orientation", value as Orientation)}
                    className="w-full"
                  >
                    <TabsList className="grid grid-cols-2 mb-2 h-7">
                      <TabsTrigger value="vertical" className="text-xs py-0.5">
                        Vertical
                      </TabsTrigger>
                      <TabsTrigger value="horizontal" className="text-xs py-0.5">
                        Horizontal
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    )
  },
)

ChartConfigPanel.displayName = "ChartConfigPanel"

// Custom Tooltip Component - Memoized to prevent unnecessary re-renders
const CustomTooltip = memo<TooltipProps<number, string>>(({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div
      className="bg-white dark:bg-gray-900 shadow-lg rounded-lg p-3 border border-gray-200 dark:border-gray-800 text-sm"
      role="tooltip"
    >
      <div className="font-medium mb-1 text-gray-900 dark:text-gray-100">{label}</div>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={`tooltip-item-${index}`} className="flex items-center gap-2" style={{ color: entry.color }}>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden="true" />
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

// Main hook for chart configuration
export function useChartConfig() {
  // Chart configuration state
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: "pie",
    showLegend: true,
    showTooltip: true,
    showGrid: true,
    animation: true,
    stacked: true,
    showLabels: false,
    colorScheme: "categorical",
    orientation: "vertical",
  })

  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false)
  const chartRef = useRef<HTMLDivElement>(null)

  // Memoized function to update chart configuration
  const updateChartConfig = useCallback(<K extends keyof ChartConfig>(key: K, value: ChartConfig[K]): void => {
    setChartConfig((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Memoized current color set based on configuration
  const getCurrentColorSet = useMemo(
    (): readonly string[] => getChartColorSet(chartConfig.colorScheme as ColorScheme),
    [chartConfig.colorScheme],
  )

  // Chart Configuration Control Component
  const ChartConfigControl = useCallback(() => {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 transition-colors hover:bg-muted"
            aria-label="Abrir panel de configuración de gráfico"
          >
            <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
            Configuración
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 sm:w-96">
          <SheetHeader>
            <SheetTitle>Configuración del Gráfico</SheetTitle>
            <SheetDescription>Personaliza la apariencia y comportamiento del gráfico</SheetDescription>
          </SheetHeader>

          <div className="py-4">
            <ChartConfigPanel chartConfig={chartConfig} updateChartConfig={updateChartConfig} />
          </div>

          <SheetFooter>
            <SheetClose asChild>
              <Button type="submit">Aplicar Cambios</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }, [chartConfig, updateChartConfig])

  // Utility for handling loading and empty states consistently
  const withLoadingState = useCallback(
    <T,>(
      renderFn: (data: T) => React.ReactNode,
      data: T,
      isLoading: boolean,
      isEmpty: (data: T) => boolean,
      height = 300,
    ): React.ReactNode => {
      if (isLoading) {
        return (
          <Skeleton className={`h-[${height}px] w-full rounded-lg`} role="progressbar" aria-label="Cargando gráfico" />
        )
      }

      if (isEmpty(data)) {
        return (
          <div
            className={`h-[${height}px] flex items-center justify-center text-muted-foreground`}
            role="status"
            aria-label="No hay datos disponibles"
          >
            No hay datos disponibles
          </div>
        )
      }

      return renderFn(data)
    },
    [],
  )

  // Render Pie Chart
  const renderPieChart = useCallback(
    (statusChartData: StatusChartData[], generalStats: GeneralStats, isLoading: boolean): React.ReactNode => {
      return withLoadingState(
        (data) => (
          <div
            className="relative h-[300px]"
            ref={chartRef}
            id="exportable-chart"
            role="figure"
            aria-label={`Gráfico ${chartConfig.type === "pie" ? "circular" : "radial"} de distribución de citas`}
          >
            <div className="absolute right-0 top-0 flex space-x-2 z-10">
              <ToggleGroup
                type="single"
                value={chartConfig.type}
                onValueChange={(value) => value && updateChartConfig("type", value as ChartType)}
                aria-label="Tipo de gráfico"
              >
                <ToggleGroupItem value="pie" aria-label="Gráfico Circular">
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <PieChartIcon className="h-4 w-4" aria-hidden="true" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Gráfico Circular</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </ToggleGroupItem>
                <ToggleGroupItem value="radial" aria-label="Gráfico Radial">
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <BarChart2 className="h-4 w-4" aria-hidden="true" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Gráfico Radial</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {chartConfig.type === "pie" ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={chartConfig.showLabels}
                    outerRadius={100}
                    innerRadius={chartConfig.type === "pie" ? 0 : 60}
                    fill="#8884d8"
                    dataKey="value"
                    label={
                      chartConfig.showLabels
                        ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`
                        : undefined
                    }
                    paddingAngle={chartStyles.pie.paddingAngle}
                    animationBegin={0}
                    animationDuration={chartConfig.animation ? chartStyles.animation.duration : 0}
                    animationEasing={chartStyles.animation.easing}
                    isAnimationActive={chartConfig.animation}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(255,255,255,0.8)" strokeWidth={2} />
                    ))}
                  </Pie>

                  {chartConfig.showTooltip && (
                    <Tooltip
                      content={<CustomTooltip />}
                      formatter={(value: number, name: string) => [
                        `${value} citas (${((value / generalStats.total) * 100).toFixed(1)}%)`,
                        name,
                      ]}
                    />
                  )}

                  {chartConfig.showLegend && (
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ paddingTop: "10px" }}
                      formatter={(value: string) => (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{value}</span>
                      )}
                    />
                  )}
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <RadialBarChart
                  innerRadius={20}
                  outerRadius={140}
                  data={data.sort((a, b) => b.value - a.value)}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar
                    label={chartConfig.showLabels ? { fill: "#666", position: "insideStart" } : undefined}
                    background
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={chartConfig.animation ? 1200 : 0}
                    animationEasing="ease-in-out"
                    isAnimationActive={chartConfig.animation}
                  >
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        cornerRadius={8}
                        stroke="rgba(255,255,255,0.8)"
                        strokeWidth={2}
                      />
                    ))}
                  </RadialBar>

                  {chartConfig.showLegend && (
                    <Legend
                      iconSize={10}
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      wrapperStyle={{ paddingLeft: "10px" }}
                      formatter={(value: string, entry: any, index: number) => (
                        <span className="text-sm font-medium">
                          {value}: {data[index].value} citas
                        </span>
                      )}
                    />
                  )}

                  {chartConfig.showTooltip && (
                    <Tooltip
                      content={<CustomTooltip />}
                      formatter={(value: number) => [`${value} citas`, "Cantidad"]}
                    />
                  )}
                </RadialBarChart>
              </ResponsiveContainer>
            )}
          </div>
        ),
        statusChartData,
        isLoading,
        (data) => !data.length || data.every((item) => item.value === 0),
      )
    },
    [chartConfig, updateChartConfig, withLoadingState],
  )

  // Render Bar Chart
  const renderBarChart = useCallback(
    (motiveChartData: MotiveChartData[], isLoading: boolean): React.ReactNode => {
      return withLoadingState(
        (data) => {
          // Determine if chart is horizontal
          const isHorizontal = chartConfig.orientation === "horizontal"

          return (
            <div
              className="relative h-[300px]"
              ref={chartRef}
              id="exportable-chart"
              role="figure"
              aria-label={`Gráfico de barras de motivos de consulta - orientación ${isHorizontal ? "horizontal" : "vertical"}`}
            >
              <div className="absolute right-0 top-0 flex space-x-2 z-10">
                <ToggleGroup
                  type="single"
                  value={chartConfig.orientation || "vertical"}
                  onValueChange={(value) => value && updateChartConfig("orientation", value as Orientation)}
                  aria-label="Orientación del gráfico"
                >
                  <ToggleGroupItem value="vertical" aria-label="Vertical">
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <BarChart2 className="h-4 w-4" aria-hidden="true" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Vertical</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="horizontal" aria-label="Horizontal">
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <BarChart2 className="h-4 w-4 rotate-90" aria-hidden="true" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Horizontal</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data}
                  layout={isHorizontal ? "vertical" : "horizontal"}
                  margin={{ top: 20, right: 30, left: isHorizontal ? 120 : 20, bottom: isHorizontal ? 5 : 60 }}
                  barGap={4}
                  barCategoryGap={16}
                >
                  {chartConfig.showGrid && (
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e0e0e0"
                      horizontal={!isHorizontal}
                      vertical={isHorizontal}
                    />
                  )}

                  {isHorizontal ? (
                    <>
                      <YAxis dataKey="motive" type="category" tick={{ fontSize: 12 }} width={100} />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                    </>
                  ) : (
                    <>
                      <XAxis dataKey="motive" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={70} />
                      <YAxis tick={{ fontSize: 12 }} />
                    </>
                  )}

                  {chartConfig.showTooltip && (
                    <Tooltip
                      content={<CustomTooltip />}
                      formatter={(value: number) => [`${value} citas`, "Cantidad"]}
                      cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
                    />
                  )}

                  {chartConfig.showLegend && (
                    <Legend
                      wrapperStyle={{ paddingTop: "10px" }}
                      formatter={(value: string) => (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{value}</span>
                      )}
                    />
                  )}

                  <Bar
                    dataKey="count"
                    name="Cantidad de citas"
                    fill={CHART_THEME.colors.primary}
                    animationBegin={0}
                    animationDuration={chartConfig.animation ? chartStyles.animation.duration : 0}
                    animationEasing={chartStyles.animation.easing}
                    isAnimationActive={chartConfig.animation}
                    radius={[chartStyles.bar.radius, chartStyles.bar.radius, 0, 0]}
                  >
                    {chartConfig.showLabels && (
                      <LabelList
                        dataKey="count"
                        position={isHorizontal ? "right" : "top"}
                        style={{ fontSize: "12px", fill: chartStyles.axis.labelColor }}
                      />
                    )}

                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getCurrentColorSet[index % getCurrentColorSet.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )
        },
        motiveChartData,
        isLoading,
        (data) => !data.length,
      )
    },
    [chartConfig, updateChartConfig, getCurrentColorSet, withLoadingState],
  )

  // Render Line Chart
  const renderLineChart = useCallback(
    (trendChartData: TrendChartData[], isLoading: boolean): React.ReactNode => {
      return withLoadingState(
        (data) => (
          <div
            className="relative h-[300px]"
            ref={chartRef}
            id="exportable-chart"
            role="figure"
            aria-label={`Gráfico de ${chartConfig.type === "line" ? "líneas" : "área"} de tendencia temporal`}
          >
            <div className="absolute right-0 top-0 flex space-x-2 z-10">
              <ToggleGroup
                type="single"
                value={chartConfig.type}
                onValueChange={(value) => value && updateChartConfig("type", value as ChartType)}
                aria-label="Tipo de gráfico"
              >
                <ToggleGroupItem value="line" aria-label="Gráfico de Líneas">
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <FileBarChart className="h-4 w-4" aria-hidden="true" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Gráfico de Líneas</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </ToggleGroupItem>
                <ToggleGroupItem value="area" aria-label="Gráfico de Área">
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <BarChart2 className="h-4 w-4" aria-hidden="true" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Gráfico de Área</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {chartConfig.type === "line" ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.7} />}

                  <XAxis dataKey="formattedDate" tick={{ fontSize: 12 }} padding={{ left: 10, right: 10 }} />

                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />

                  {chartConfig.showTooltip && (
                    <Tooltip
                      content={<CustomTooltip />}
                      formatter={(value: number, name: string) => formatTooltipValue(value, name, "citas")}
                      labelFormatter={(label: string) => `Fecha: ${label}`}
                    />
                  )}

                  {chartConfig.showLegend && (
                    <Legend
                      verticalAlign="top"
                      height={36}
                      wrapperStyle={{ paddingBottom: "10px" }}
                      formatter={(value: string) => (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {value === "total"
                            ? "Total"
                            : value === "completada"
                              ? "Completadas"
                              : value === "cancelada"
                                ? "Canceladas"
                                : value === "presente"
                                  ? "Presentes"
                                  : value === "reprogramada"
                                    ? "Reprogramadas"
                                    : value === "no_asistio"
                                      ? "No Asistieron"
                                      : value}
                        </span>
                      )}
                    />
                  )}

                  {/* Using an array of definitions instead of repeating similar components */}
                  {[
                    {
                      key: "total",
                      color: CHART_THEME.colors.primary,
                      strokeWidth: chartStyles.line.strokeWidth + 1,
                      delay: 0,
                    },
                    { key: "completada", color: STATUS_COLORS.completada, delay: 200 },
                    { key: "cancelada", color: STATUS_COLORS.cancelada, delay: 400 },
                    { key: "presente", color: STATUS_COLORS.presente, delay: 600 },
                    { key: "reprogramada", color: STATUS_COLORS.reprogramada, delay: 800 },
                    { key: "no_asistio", color: STATUS_COLORS.no_asistio, delay: 1000 },
                  ].map((item) => (
                    <Line
                      key={item.key}
                      type="monotone"
                      dataKey={item.key}
                      name={item.key}
                      stroke={item.color}
                      strokeWidth={item.strokeWidth || chartStyles.line.strokeWidth}
                      dot={{ r: item.key === "total" ? chartStyles.line.dotSize : chartStyles.line.dotSize - 1 }}
                      activeDot={{
                        r: item.key === "total" ? chartStyles.line.activeDotSize : chartStyles.line.activeDotSize - 1,
                        stroke: item.key === "total" ? item.color : undefined,
                        strokeWidth: item.key === "total" ? 2 : undefined,
                        fill: item.key === "total" ? "#fff" : undefined,
                      }}
                      connectNulls={true}
                      animationBegin={item.delay}
                      animationDuration={chartConfig.animation ? chartStyles.animation.duration : 0}
                      animationEasing={chartStyles.animation.easing}
                      isAnimationActive={chartConfig.animation}
                    />
                  ))}

                  <Brush
                    dataKey="formattedDate"
                    height={20}
                    stroke="#8884d8"
                    startIndex={Math.max(0, data.length - Math.min(10, data.length))}
                  />

                  {data.length > 0 && (
                    <ReferenceLine
                      y={data.reduce((sum, item) => sum + item.total, 0) / data.length}
                      stroke="#666"
                      strokeDasharray="3 3"
                    >
                      <RechartsLabel value="Promedio" position="right" />
                    </ReferenceLine>
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.7} />}

                  <XAxis dataKey="formattedDate" tick={{ fontSize: 12 }} padding={{ left: 10, right: 10 }} />

                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />

                  {chartConfig.showTooltip && (
                    <Tooltip
                      content={<CustomTooltip />}
                      formatter={(value: number, name: string) => formatTooltipValue(value, name, "citas")}
                      labelFormatter={(label: string) => `Fecha: ${label}`}
                    />
                  )}

                  {chartConfig.showLegend && (
                    <Legend
                      verticalAlign="top"
                      height={36}
                      wrapperStyle={{ paddingBottom: "10px" }}
                      formatter={(value: string) => (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {value === "total"
                            ? "Total"
                            : value === "completada"
                              ? "Completadas"
                              : value === "cancelada"
                                ? "Canceladas"
                                : value === "presente"
                                  ? "Presentes"
                                  : value === "reprogramada"
                                    ? "Reprogramadas"
                                    : value === "no_asistio"
                                      ? "No Asistieron"
                                      : value}
                        </span>
                      )}
                    />
                  )}

                  {/* Using an array of definitions instead of repeating similar components */}
                  {[
                    { key: "total", color: CHART_THEME.colors.primary, delay: 0 },
                    { key: "completada", color: STATUS_COLORS.completada, delay: 200 },
                    { key: "cancelada", color: STATUS_COLORS.cancelada, delay: 400 },
                    { key: "presente", color: STATUS_COLORS.presente, delay: 600 },
                    { key: "reprogramada", color: STATUS_COLORS.reprogramada, delay: 800 },
                    { key: "no_asistio", color: STATUS_COLORS.no_asistio, delay: 1000 },
                  ].map((item) => (
                    <Area
                      key={item.key}
                      type="monotone"
                      dataKey={item.key}
                      name={item.key}
                      stackId={chartConfig.stacked ? "1" : item.key}
                      stroke={item.color}
                      fill={item.color}
                      fillOpacity={0.6}
                      connectNulls={true}
                      animationBegin={item.delay}
                      animationDuration={chartConfig.animation ? chartStyles.animation.duration : 0}
                      animationEasing={chartStyles.animation.easing}
                      isAnimationActive={chartConfig.animation}
                    />
                  ))}

                  <Brush
                    dataKey="formattedDate"
                    height={20}
                    stroke="#8884d8"
                    startIndex={Math.max(0, data.length - Math.min(10, data.length))}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        ),
        trendChartData,
        isLoading,
        (data) => !data.length,
      )
    },
    [chartConfig, updateChartConfig, withLoadingState],
  )

  // Render Weekday Chart
  const renderWeekdayChart = useCallback(
    (weekdayChartData: WeekdayChartData[], isLoading: boolean): React.ReactNode => {
      return withLoadingState(
        (data) => (
          <div
            className="relative h-[300px]"
            ref={chartRef}
            id="exportable-chart"
            role="figure"
            aria-label={`Gráfico de ${chartConfig.type === "bar" ? "barras" : "radar"} por día de la semana`}
          >
            <div className="absolute right-0 top-0 flex space-x-2 z-10">
              <ToggleGroup
                type="single"
                value={chartConfig.type}
                onValueChange={(value) => value && updateChartConfig("type", value as ChartType)}
                aria-label="Tipo de gráfico"
              >
                <ToggleGroupItem value="bar" aria-label="Gráfico de Barras">
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <BarChart2 className="h-4 w-4" aria-hidden="true" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Gráfico de Barras</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </ToggleGroupItem>
                <ToggleGroupItem value="radar" aria-label="Gráfico de Radar">
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <FileBarChart className="h-4 w-4" aria-hidden="true" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Gráfico de Radar</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {chartConfig.type === "bar" ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  barGap={4}
                  barCategoryGap={16}
                >
                  {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.7} />}

                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />

                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    stroke={CHART_THEME.colors.primary}
                    tick={{ fontSize: 12 }}
                    label={
                      chartConfig.showLabels
                        ? {
                            value: "Citas",
                            angle: -90,
                            position: "insideLeft",
                            style: { textAnchor: "middle", fontSize: 12 },
                          }
                        : undefined
                    }
                  />

                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke={CHART_THEME.colors.secondary}
                    tick={{ fontSize: 12 }}
                    label={
                      chartConfig.showLabels
                        ? {
                            value: "Porcentaje",
                            angle: 90,
                            position: "insideRight",
                            style: { textAnchor: "middle", fontSize: 12 },
                          }
                        : undefined
                    }
                  />

                  {chartConfig.showTooltip && (
                    <Tooltip
                      content={<CustomTooltip />}
                      formatter={(value: number, name: string) => [
                        name === "rate" ? `${value.toFixed(1)}%` : String(value),
                        name === "total"
                          ? "Total de citas"
                          : name === "attended"
                            ? "Asistencias"
                            : name === "rate"
                              ? "Tasa de asistencia"
                              : name,
                      ]}
                      cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
                    />
                  )}

                  {chartConfig.showLegend && (
                    <Legend
                      wrapperStyle={{ paddingTop: "10px" }}
                      formatter={(value: string) => (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {value === "total"
                            ? "Total de citas"
                            : value === "attended"
                              ? "Asistencias"
                              : value === "rate"
                                ? "Tasa de asistencia (%)"
                                : value}
                        </span>
                      )}
                    />
                  )}

                  <Bar
                    yAxisId="left"
                    dataKey="total"
                    name="total"
                    fill={CHART_THEME.colors.primary}
                    radius={[4, 4, 0, 0]}
                    animationBegin={0}
                    animationDuration={chartConfig.animation ? 800 : 0}
                    animationEasing="ease-out"
                    isAnimationActive={chartConfig.animation}
                  />

                  <Bar
                    yAxisId="left"
                    dataKey="attended"
                    name="attended"
                    fill={CHART_THEME.colors.secondary}
                    radius={[4, 4, 0, 0]}
                    animationBegin={200}
                    animationDuration={chartConfig.animation ? 800 : 0}
                    animationEasing="ease-out"
                    isAnimationActive={chartConfig.animation}
                  />

                  <Bar
                    yAxisId="right"
                    dataKey="rate"
                    name="rate"
                    fill={CHART_THEME.colors.tertiary}
                    radius={[4, 4, 0, 0]}
                    animationBegin={400}
                    animationDuration={chartConfig.animation ? 800 : 0}
                    animationEasing="ease-out"
                    isAnimationActive={chartConfig.animation}
                  >
                    {chartConfig.showLabels && (
                      <LabelList
                        dataKey="rate"
                        position="top"
                        formatter={(value: number) => `${value.toFixed(0)}%`}
                        style={{ fontSize: "11px", fill: "#666" }}
                      />
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart outerRadius={120} data={data}>
                  <PolarGrid
                    gridType="polygon"
                    stroke={chartConfig.showGrid ? "#e0e0e0" : "transparent"}
                    strokeDasharray={chartConfig.showGrid ? "3 3" : "0 0"}
                  />

                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 12, fill: "#666" }} tickLine={false} />

                  <PolarRadiusAxis angle={30} domain={[0, "auto"]} tick={{ fontSize: 10 }} />

                  <Radar
                    name="Total de citas"
                    dataKey="total"
                    stroke={CHART_THEME.colors.primary}
                    fill={CHART_THEME.colors.primary}
                    fillOpacity={chartStyles.radar.fillOpacity}
                    strokeWidth={chartStyles.radar.strokeWidth}
                    animationBegin={0}
                    animationDuration={chartConfig.animation ? chartStyles.animation.duration : 0}
                    animationEasing={chartStyles.animation.easing}
                    isAnimationActive={chartConfig.animation}
                    dot={chartConfig.showLabels}
                  />

                  <Radar
                    name="Asistencias"
                    dataKey="attended"
                    stroke={CHART_THEME.colors.secondary}
                    fill={CHART_THEME.colors.secondary}
                    fillOpacity={chartStyles.radar.fillOpacity}
                    strokeWidth={chartStyles.radar.strokeWidth}
                    animationBegin={200}
                    animationDuration={chartConfig.animation ? chartStyles.animation.duration : 0}
                    animationEasing={chartStyles.animation.easing}
                    isAnimationActive={chartConfig.animation}
                    dot={chartConfig.showLabels}
                  />

                  {chartConfig.showTooltip && (
                    <Tooltip
                      content={<CustomTooltip />}
                      formatter={(value: number, name: string) => [String(value), name]}
                    />
                  )}

                  {chartConfig.showLegend && (
                    <Legend
                      wrapperStyle={{ paddingTop: "10px" }}
                      formatter={(value: string) => (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{value}</span>
                      )}
                    />
                  )}
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        ),
        weekdayChartData,
        isLoading,
        (data) => !data.length,
      )
    },
    [chartConfig, updateChartConfig, withLoadingState],
  )

  // Render Scatter Chart
  const renderScatterChart = useCallback(
    (scatterData: ScatterData, timeRange: [number, number], isLoading: boolean): React.ReactNode => {
      return withLoadingState(
        (data) => (
          <div
            className="relative"
            ref={chartRef}
            id="exportable-chart"
            role="figure"
            aria-label="Gráfico de dispersión para análisis de correlación hora-día"
          >
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
                {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.7} />}

                <XAxis
                  dataKey="day"
                  name="Día"
                  type="number"
                  domain={[0, 6]}
                  tickCount={7}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value: number) => WEEKDAYS_SHORT[value]}
                  label={
                    chartConfig.showLabels
                      ? {
                          value: "Día de la semana",
                          position: "insideBottom",
                          offset: -5,
                          style: { textAnchor: "middle", fontSize: 12 },
                        }
                      : undefined
                  }
                />

                <YAxis
                  dataKey="hour"
                  name="Hora"
                  type="number"
                  domain={[timeRange[0], timeRange[1]]}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value: number) => `${value}:00`}
                  label={
                    chartConfig.showLabels
                      ? {
                          value: "Hora del día",
                          angle: -90,
                          position: "insideLeft",
                          style: { textAnchor: "middle", fontSize: 12 },
                        }
                      : undefined
                  }
                />

                <ZAxis dataKey="count" range={[50, 400]} name="Cantidad" />

                {chartConfig.showTooltip && (
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

                {chartConfig.showLegend && (
                  <Legend
                    wrapperStyle={{ paddingTop: "10px" }}
                    formatter={(value: string) => (
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{value}</span>
                    )}
                  />
                )}

                {/* Using an array of definitions to improve maintainability */}
                {[
                  { key: "completada", label: "Completadas", color: STATUS_COLORS.completada, delay: 0 },
                  { key: "cancelada", label: "Canceladas", color: STATUS_COLORS.cancelada, delay: 200 },
                  { key: "pendiente", label: "Pendientes", color: STATUS_COLORS.pendiente, delay: 400 },
                  { key: "presente", label: "Presentes", color: STATUS_COLORS.presente, delay: 600 },
                  { key: "reprogramada", label: "Reprogramadas", color: STATUS_COLORS.reprogramada, delay: 800 },
                  { key: "no_asistio", label: "No Asistieron", color: STATUS_COLORS.no_asistio, delay: 1000 },
                ].map((item) => (
                  <Scatter
                    key={item.key}
                    name={item.label}
                    data={data[item.key as AppointmentStatus] || []}
                    fill={item.color}
                    animationBegin={item.delay}
                    animationDuration={chartConfig.animation ? 1000 : 0}
                    animationEasing="ease-out"
                    isAnimationActive={chartConfig.animation}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>

            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
              <h4 className="font-medium mb-1 text-gray-900 dark:text-gray-100">Interpretación del Gráfico</h4>
              <p className="mb-2">
                Este gráfico muestra la distribución de citas según el día de la semana y la hora del día. El tamaño de
                cada punto representa la cantidad de citas en ese horario específico.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Las zonas con mayor concentración de puntos indican horarios populares para citas.</li>
                <li>
                  Los puntos rojos muestran patrones de cancelación que pueden ayudar a identificar horarios
                  problemáticos.
                </li>
                <li>Use esta información para optimizar la programación de citas y reducir cancelaciones.</li>
              </ul>
            </div>
          </div>
        ),
        scatterData,
        isLoading,
        (data) => Object.values(data).every((arr) => arr.length === 0),
        350, // Specific height for this chart
      )
    },
    [chartConfig, updateChartConfig, withLoadingState],
  )

  return {
    chartConfig,
    updateChartConfig,
    isConfigOpen,
    setIsConfigOpen,
    chartRef,
    ChartConfigControl,
    renderPieChart,
    renderBarChart,
    renderLineChart,
    renderWeekdayChart,
    renderScatterChart,
    CHART_THEME,
  }
}

export default useChartConfig
