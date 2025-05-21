"use client";
import React, { useRef, useState, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  TooltipProps,
} from "recharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileBarChart, BarChart2, PieChartIcon, Settings, Info, ChevronDown, ChevronUp, Download, Share } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/src/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AppointmentStatus } from "./appointment-filter";

// --- Tipos mejorados ---

/** Configuración de un gráfico */
export interface ChartConfig {
  /** Tipo de gráfico */
  type: 'pie' | 'bar' | 'line' | 'area' | 'radar' | 'scatter' | 'radial';
  /** Mostrar leyenda */
  showLegend: boolean;
  /** Mostrar tooltips */
  showTooltip: boolean;
  /** Mostrar cuadrícula */
  showGrid: boolean;
  /** Habilitar animaciones */
  animation: boolean;
  /** Apilar datos */
  stacked: boolean;
  /** Modo oscuro */
  darkMode?: boolean;
  /** Mostrar etiquetas de datos */
  showLabels?: boolean;
  /** Color primario */
  primaryColor?: string;
  /** Paleta de colores */
  colorScheme?: 'categorical' | 'sequential' | 'divergent';
  /** Orientación */
  orientation?: 'vertical' | 'horizontal';
  /** Intervalo para actualización automática (ms) */
  refreshInterval?: number | null;
}

/** Mapa de colores por estado */
export type StatusColorMap = Record<AppointmentStatus, string>;

/** Props para tarjetas de estadísticas */
export interface StatCardProps {
  /** Título de la tarjeta */
  title: string;
  /** Valor principal */
  value: string | number;
  /** Ícono */
  icon: React.ReactNode;
  /** Descripción */
  description: string;
  /** Color de fondo personalizado */
  color?: string;
  /** Retraso para animación de entrada */
  animationDelay?: number;
  /** Cambio porcentual respecto a periodo anterior */
  changePercent?: number;
  /** Valor del periodo anterior */
  previousValue?: string | number;
  /** Etiqueta de tendencia */
  trendLabel?: string;
  /** Habilitar animaciones */
  animated?: boolean;
  /** Acción al hacer clic */
  onClick?: () => void;
  /** Clase CSS personalizada */
  className?: string;
}

/** Estadísticas generales */
export interface GeneralStats {
  /** Total de citas */
  total: number;
  /** Tasa de asistencia (%) */
  attendance: number;
  /** Tasa de cancelación (%) */
  cancellation: number;
  /** Porcentaje de citas pendientes */
  pending: number;
  /** Porcentaje de citas presentes */
  present: number;
  /** Número de citas completadas */
  completed: number;
  /** Número de citas canceladas */
  cancelled: number;
  /** Número de citas pendientes */
  pendingCount: number;
  /** Número de citas presentes */
  presentCount: number;
  /** Cambio porcentual respecto al período anterior */
  changeFromPrevious?: number;
  /** Periodo de tiempo analizado */
  period?: string;
}

/** Estructura de datos para gráfico circular de estados */
export interface StatusChartData {
  name: AppointmentStatus;
  /** Cantidad de citas */
  value: number;
  /** Color asociado */
  color: string;
}

/** Estructura de datos para gráfico de barras de motivos */
export interface MotiveChartData {
  /** Motivo de consulta */
  motive: string;
  /** Cantidad de citas */
  count: number;
}

/** Estructura de datos para gráfico de tendencia temporal */
export interface TrendChartData extends Record<AppointmentStatus, number> {
  /** Fecha en formato YYYY-MM-DD */
  date: string;
  /** Fecha formateada para visualización */
  formattedDate: string;
}

/** Estructura de datos para gráfico por día de la semana */
export interface WeekdayChartData {
  /** Nombre del día */
  name: string;
  /** Total de citas */
  total: number;
  /** Citas con asistencia */
  attended: number;
  /** Tasa de asistencia (%) */
  rate: number;
}

/** Punto para gráfico de dispersión */
export interface ScatterPoint {
  /** Día de la semana (0-6) */
  day: number;
  /** Hora del día (0-23) */
  hour: number;
  /** Cantidad de citas */
  count: number;
  /** Nombre del día */
  dayName: string;
}

/** Estructura de datos para gráfico de dispersión */
export type ScatterData = Record<AppointmentStatus, ScatterPoint[]>;

/** Props para panel de configuración de gráficos */
export interface ChartConfigPanelProps {
  /** Configuración actual */
  chartConfig: ChartConfig;
  /** Función para actualizar configuración */
  updateChartConfig: <K extends keyof ChartConfig>(key: K, value: ChartConfig[K]) => void;
  /** Opciones disponibles */
  options?: {
    /** Permitir cambio de tipo de gráfico */
    allowTypeChange?: boolean;
    /** Tipos de gráficos disponibles */
    availableTypes?: string[];
    /** Esquemas de color disponibles */
    availableColorSchemes?: string[];
  };
  /** Clase CSS personalizada */
  className?: string;
}

/**
 * Props para componente de exportación
 */
export interface ExportOptionsProps {
  /** Función para exportar a imagen */
  onExportImage: () => void;
  /** Función para exportar a CSV */
  onExportCSV: () => void;
  /** Función para exportar a PDF */
  onExportPDF: () => void;
  /** Opciones habilitadas */
  enabledOptions?: {
    image?: boolean;
    csv?: boolean;
    pdf?: boolean;
    clipboard?: boolean;
  };
}

// Constantes de estilos y configuración mejoradas
const chartPalette = {
  categorical: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280", "#ec4899", "#06b6d4"],
  sequential: ["#0ea5e9", "#0284c7", "#0369a1", "#075985", "#0c4a6e", "#082f49", "#172554", "#0f172a"],
  divergent: ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"]
};

const chartStyles = {
  animation: {
    duration: 800,
    easing: "ease-in-out"
  },
  bar: {
    radius: 4,
    strokeWidth: 2
  },
  line: {
    strokeWidth: 2,
    dotSize: 4,
    activeDotSize: 6
  },
  radar: {
    fillOpacity: 0.5,
    strokeWidth: 2
  },
  pie: {
    paddingAngle: 2
  },
  axis: {
    labelColor: "#6b7280",
    fontSize: 12
  }
};

// Función para obtener un conjunto de colores según el esquema
const getChartColorSet = (scheme: string = "categorical") => {
  return chartPalette[scheme as keyof typeof chartPalette] || chartPalette.categorical;
};

// Conjunto de colores para gráficos
export const COLORS = getChartColorSet("categorical");

// Definir una paleta de colores mejorada para estados
export const STATUS_COLORS: StatusColorMap = {
  completada: "#10b981", // Verde más vibrante
  cancelada: "#ef4444", // Rojo más vibrante
  pendiente: "#f59e0b", // Naranja más vibrante
  presente: "#3b82f6", // Azul más vibrante
  reprogramada: "#8b5cf6", // Púrpura más vibrante
  no_asistio: "#6b7280", // Gris más vibrante
};

// Constantes de día de la semana
export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Tema de gráficos común para mantener consistencia visual
export const CHART_THEME = {
  // Colores base
  colors: {
    primary: "#3b82f6",
    secondary: "#10b981",
    tertiary: "#f59e0b",
    danger: "#ef4444",
    neutral: "#6b7280",
  },
  // Estilos del gráfico
  chart: {
    fontFamily: 'inherit',
    backgroundColor: 'transparent',
    textColor: '#6b7280',
    fontSize: 12,
  },
  // Estilos de la cuadrícula
  grid: {
    stroke: '#e5e7eb',
    strokeDasharray: '3 3',
  },
  // Estilos para tooltip
  tooltip: {
    backgroundColor: 'white',
    borderRadius: 6,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    fontSize: 12,
    padding: 8,
  }
};

/**
 * Componente de Tarjeta de Estadística - versión mejorada y optimizada
 * Muestra un indicador estadístico con animación y diseño mejorado
 */
export const StatCard = memo(({ 
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
  className = ""
}: StatCardProps) => {
  // Determinar los colores de fondo y texto según el título
  const cardStyles = useMemo(() => {
    let bgColor = "bg-blue-50 dark:bg-blue-950/20";
    let iconColor = "text-blue-600 dark:text-blue-400";
    let borderColor = "border-blue-100 dark:border-blue-800/30";
    let ringColor = "ring-blue-100/50 dark:ring-blue-700/10";
    
    if (title.includes("Asistencia")) {
      bgColor = "bg-green-50 dark:bg-green-950/20";
      iconColor = "text-green-600 dark:text-green-400";
      borderColor = "border-green-100 dark:border-green-800/30";
      ringColor = "ring-green-100/50 dark:ring-green-700/10";
    } else if (title.includes("Cancelación")) {
      bgColor = "bg-red-50 dark:bg-red-950/20";
      iconColor = "text-red-600 dark:text-red-400";
      borderColor = "border-red-100 dark:border-red-800/30";
      ringColor = "ring-red-100/50 dark:ring-red-700/10";
    } else if (title.includes("Pendientes")) {
      bgColor = "bg-amber-50 dark:bg-amber-950/20";
      iconColor = "text-amber-600 dark:text-amber-400";
      borderColor = "border-amber-100 dark:border-amber-800/30";
      ringColor = "ring-amber-100/50 dark:ring-amber-700/10";
    }

    // Determinar el color de tendencia para el cambio porcentual
    const trendColor = changePercent === undefined 
      ? "text-gray-500"
      : changePercent > 0 
        ? "text-green-600 dark:text-green-400" 
        : changePercent < 0 
          ? "text-red-600 dark:text-red-400"
          : "text-gray-500";

    return { bgColor, iconColor, borderColor, ringColor, trendColor };
  }, [title, changePercent]);

  // Icono de tendencia
  const trendIcon = useMemo(() => {
    if (changePercent === undefined) return null;
    return changePercent > 0 
      ? <ChevronUp className="h-3 w-3" />
      : changePercent < 0 
        ? <ChevronDown className="h-3 w-3"/>
        : null;
  }, [changePercent]);

  // Componente memoizado para mejor rendimiento
  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 20 } : false}
      animate={animated ? { opacity: 1, y: 0 } : false}
      transition={{ 
        duration: 0.3, 
        delay: animationDelay * 0.1,
        ease: [0.23, 1, 0.32, 1] // Ease-out cubic
      }}
      whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
      onClick={onClick}
      className={cn(
        "cursor-pointer",
        onClick && "hover:ring-2 hover:ring-offset-2 hover:ring-offset-background transition-all",
        className
      )}
    >
      <Card className={cn(
        "overflow-hidden transition-all duration-200 border h-full",
        "hover:shadow-md group", 
        cardStyles.ringColor,
        cardStyles.borderColor
      )}>
        <CardHeader className={cn("pb-2", color || cardStyles.bgColor)}>
          <div className="flex justify-between items-start">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <div className={cn(
              "rounded-full p-1.5 transition-transform group-hover:scale-110",
              cardStyles.bgColor, 
              cardStyles.iconColor
            )}>
              {icon}
            </div>
          </div>
          
          <div className="flex items-baseline mt-1 space-x-1">
            <span className="text-2xl font-bold">{value}</span>
            
            {changePercent !== undefined && (
              <div className={cn(
                "flex items-center text-xs font-medium ml-2",
                cardStyles.trendColor
              )}>
                {trendIcon}
                <span>{Math.abs(changePercent).toFixed(1)}%</span>
              </div>
            )}
          </div>
          
          {previousValue !== undefined && (
            <div className="text-xs text-muted-foreground mt-1">
              {trendLabel || 'Anterior'}: {previousValue}
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          <CardDescription>{description}</CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  );
});

StatCard.displayName = "StatCard";

/**
 * Componente de Panel de Configuración de Gráficos - versión mejorada
 * Permite personalizar aspectos visuales y técnicos de gráficos
 */
export const ChartConfigPanel = memo(({ 
  chartConfig, 
  updateChartConfig,
  options = {},
  className = ""
}: ChartConfigPanelProps) => {
  // Opciones disponibles
  const {
    allowTypeChange = true,
    availableTypes = ['pie', 'bar', 'line', 'area', 'radar', 'scatter'],
    availableColorSchemes = ['categorical', 'sequential', 'divergent']
  } = options;

  // Etiquetas amigables para esquemas de color
  const colorSchemeLabels = {
    categorical: 'Categórica',
    sequential: 'Secuencial',
    divergent: 'Divergente'
  };

  return (
    <div className={`bg-white dark:bg-gray-950 rounded-lg shadow-sm border p-4 space-y-5 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center">
          <Settings className="h-4 w-4 mr-2 text-muted-foreground" />
          Configuración del Gráfico
        </h3>
      </div>
      
      <ScrollArea className="pr-4 max-h-[calc(100vh-300px)]">
        <div className="space-y-4">
          {/* Sección de opciones visuales */}
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
                      <Info className="h-3 w-3 text-muted-foreground" />
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
                      <Info className="h-3 w-3 text-muted-foreground" />
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
                      <Info className="h-3 w-3 text-muted-foreground" />
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
                      <Info className="h-3 w-3 text-muted-foreground" />
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
              />
            </div>
          </div>
          
          {/* Sección de comportamiento */}
          <div className="space-y-2.5">
            <h4 className="text-xs uppercase text-muted-foreground font-medium tracking-wide mb-2">
              Comportamiento
            </h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Label htmlFor="animation" className="text-xs cursor-pointer select-none">
                  Animación
                </Label>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground" />
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
                      <Info className="h-3 w-3 text-muted-foreground" />
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
              />
            </div>
            
            {/* Selector de esquema de color */}
            <div className="space-y-1.5">
              <Label className="text-xs">Esquema de Color</Label>
              <Tabs 
                value={chartConfig.colorScheme || 'categorical'} 
                onValueChange={(value) => updateChartConfig('colorScheme', value as 'categorical' | 'sequential' | 'divergent')}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 mb-2 h-7">
                  {availableColorSchemes.map(scheme => (
                    <TabsTrigger 
                      key={scheme}
                      value={scheme} 
                      className="text-xs py-0.5"
                    >
                      {colorSchemeLabels[scheme as keyof typeof colorSchemeLabels] || scheme}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            
            {/* Selector de orientación para gráficos compatibles */}
            {(chartConfig.type === 'bar' || chartConfig.type === 'line') && (
              <div className="space-y-1.5">
                <Label className="text-xs">Orientación</Label>
                <Tabs 
                  value={chartConfig.orientation || 'vertical'} 
                  onValueChange={(value) => updateChartConfig('orientation', value as 'vertical' | 'horizontal')}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-2 mb-2 h-7">
                    <TabsTrigger value="vertical" className="text-xs py-0.5">Vertical</TabsTrigger>
                    <TabsTrigger value="horizontal" className="text-xs py-0.5">Horizontal</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}
          </div>
          
          {/* Sección de exportación */}
          <div className="space-y-2.5">
            <h4 className="text-xs uppercase text-muted-foreground font-medium tracking-wide mb-2">
              Exportación
            </h4>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs w-full transition-colors hover:bg-muted"
                onClick={() => {
                  // Usar html-to-image o dom-to-image aquí
                  const chartNode = document.getElementById('exportable-chart');
                  if (chartNode) {
                    // Implementar exportación
                    alert("Funcionalidad de exportación a implementar");
                  }
                }}
              >
                <Download className="h-3 w-3 mr-1" />
                PNG
              </Button>
              
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs w-full transition-colors hover:bg-muted"
                onClick={() => {
                  // Implementar exportación a SVG
                  alert("Funcionalidad de exportación a implementar");
                }}
              >
                <Download className="h-3 w-3 mr-1" />
                SVG
              </Button>
              
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs w-full col-span-2 transition-colors hover:bg-muted"
                onClick={() => {
                  // Implementar exportación a datos (CSV)
                  alert("Funcionalidad de exportación a implementar");
                }}
              >
                <Download className="h-3 w-3 mr-1" />
                Datos (CSV)
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
});

ChartConfigPanel.displayName = "ChartConfigPanel";

/**
 * Componente de Tooltip personalizado para gráficos - mejora la apariencia y accesibilidad
 */
const CustomTooltip = memo(({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg p-3 border border-gray-200 dark:border-gray-800 text-sm">
      <div className="font-medium mb-1 text-gray-900 dark:text-gray-100">{label}</div>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div 
            key={`tooltip-item-${index}`} 
            className="flex items-center gap-2"
            style={{ color: entry.color }}
          >
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }} 
            />
            <span className="font-medium">{entry.name}: </span>
            <span>{entry.value} {entry.unit || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

CustomTooltip.displayName = "CustomTooltip";

/**
 * Hook personalizado para la gestión de configuración de gráficos
 * Proporciona estado, funciones y componentes para configurar gráficos
 */
export function useChartConfig() {
  // Estado para la configuración de gráficos
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: "pie",
    showLegend: true,
    showTooltip: true,
    showGrid: true,
    animation: true,
    stacked: true,
    showLabels: false,
    colorScheme: 'categorical',
    orientation: 'vertical',
  });
  
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Función para actualizar configuración de gráficos
  const updateChartConfig = useCallback(<K extends keyof ChartConfig>(
    key: K, 
    value: ChartConfig[K]
  ) => {
    setChartConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Función para exportar gráfico como imagen
  const exportChartAsImage = useCallback(() => {
    if (!chartRef.current) return;

    // Aquí iría la lógica para exportar a imagen
    console.log("Exportando gráfico como imagen...");
    alert("Funcionalidad de exportación a implementar");
  }, []);

  /**
   * Componente de Control de Configuración de Gráficos
   * Permite acceder al panel de configuración
   */
  const ChartConfigControl = useCallback(() => {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 transition-colors hover:bg-muted">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 sm:w-96">
          <SheetHeader>
            <SheetTitle>Configuración del Gráfico</SheetTitle>
            <SheetDescription>
              Personaliza la apariencia y comportamiento del gráfico
            </SheetDescription>
          </SheetHeader>
          
          <div className="py-4">
            <ChartConfigPanel 
              chartConfig={chartConfig} 
              updateChartConfig={updateChartConfig}
            />
          </div>
          
          <SheetFooter>
            <SheetClose asChild>
              <Button type="submit">Aplicar Cambios</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }, [chartConfig, updateChartConfig]);

  /**
   * Renderiza un gráfico circular o de anillo según la configuración
   */
  const renderPieChart = useCallback((
    statusChartData: StatusChartData[], 
    generalStats: GeneralStats, 
    isLoading: boolean
  ) => {
    if (isLoading) {
      return <Skeleton className="h-[300px] w-full rounded-lg" />;
    }
    
    if (!statusChartData.length || statusChartData.every(item => item.value === 0)) {
      return (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          No hay datos disponibles
        </div>
      );
    }
    
    return (
      <div className="relative h-[300px]" ref={chartRef} id="exportable-chart">
        <div className="absolute right-0 top-0 flex space-x-2 z-10">
          <ToggleGroup
            type="single"
            value={chartConfig.type}
            onValueChange={(value) => value && updateChartConfig("type", value as any)}
            aria-label="Tipo de gráfico"
          >
            <ToggleGroupItem value="pie" aria-label="Gráfico Circular">
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <PieChartIcon className="h-4 w-4" />
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
                    <BarChart2 className="h-4 w-4" />
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
                data={statusChartData}
                cx="50%"
                cy="50%"
                labelLine={chartConfig.showLabels}
                outerRadius={100}
                innerRadius={chartConfig.type === "pie" ? 0 : 60}
                fill="#8884d8"
                dataKey="value"
                label={chartConfig.showLabels 
                  ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` 
                  : undefined}
                paddingAngle={chartStyles.pie.paddingAngle}
                animationBegin={0}
                animationDuration={chartConfig.animation ? chartStyles.animation.duration : 0}
                animationEasing={chartStyles.animation.easing}
              >
                {statusChartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    stroke="rgba(255,255,255,0.8)" 
                    strokeWidth={2} 
                  />
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
              data={statusChartData.sort((a, b) => b.value - a.value)}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                label={chartConfig.showLabels 
                  ? { fill: "#666", position: "insideStart" } 
                  : undefined}
                background
                dataKey="value"
                animationBegin={0}
                animationDuration={chartConfig.animation ? 1200 : 0}
                animationEasing="ease-in-out"
              >
                {statusChartData.map((entry, index) => (
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
                      {value}: {statusChartData[index].value} citas
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
    );
  }, [chartConfig, updateChartConfig]);

  /**
   * Renderiza un gráfico de barras para mostrar motivos de consulta
   */
  const renderBarChart = useCallback((
    motiveChartData: MotiveChartData[], 
    isLoading: boolean
  ) => {
    if (isLoading) {
      return <Skeleton className="h-[300px] w-full rounded-lg" />;
    }
    
    if (!motiveChartData.length) {
      return (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          No hay datos disponibles
        </div>
      );
    }
    
    // Determinar si el gráfico es horizontal
    const isHorizontal = chartConfig.orientation === 'horizontal';
    
    return (
      <div className="relative h-[300px]" ref={chartRef} id="exportable-chart">
        <div className="absolute right-0 top-0 flex space-x-2 z-10">
          <ToggleGroup
            type="single"
            value={chartConfig.orientation || 'vertical'}
            onValueChange={(value) => value && updateChartConfig("orientation", value as 'vertical' | 'horizontal')}
            aria-label="Orientación del gráfico"
          >
            <ToggleGroupItem value="vertical" aria-label="Vertical">
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <BarChart2 className="h-4 w-4" />
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
                    <BarChart2 className="h-4 w-4 rotate-90" />
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
            data={motiveChartData}
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
                <YAxis 
                  dataKey="motive" 
                  type="category" 
                  tick={{ fontSize: 12 }}
                  width={100}
                />
                <XAxis type="number" tick={{ fontSize: 12 }} />
              </>
            ) : (
              <>
                <XAxis 
                  dataKey="motive" 
                  tick={{ fontSize: 12 }} 
                  angle={-45} 
                  textAnchor="end" 
                  height={70} 
                />
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
              radius={[chartStyles.bar.radius, chartStyles.bar.radius, 0, 0]}
            >
              {chartConfig.showLabels && (
                <LabelList
                  dataKey="count"
                  position={isHorizontal ? "right" : "top"}
                  style={{ fontSize: "12px", fill: chartStyles.axis.labelColor }}
                />
              )}
              
              {motiveChartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={getChartColorSet(chartConfig.colorScheme || "categorical")[index % getChartColorSet(chartConfig.colorScheme || "categorical").length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }, [chartConfig, updateChartConfig]);

  /**
   * Renderiza un gráfico de línea o área según la configuración
   */
  const renderLineChart = useCallback((
    trendChartData: TrendChartData[], 
    isLoading: boolean
  ) => {
    if (isLoading) {
      return <Skeleton className="h-[300px] w-full rounded-lg" />;
    }
    
    if (!trendChartData.length) {
      return (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          No hay datos disponibles
        </div>
      );
    }
    
    return (
      <div className="relative h-[300px]" ref={chartRef} id="exportable-chart">
        <div className="absolute right-0 top-0 flex space-x-2 z-10">
          <ToggleGroup
            type="single"
            value={chartConfig.type}
            onValueChange={(value) => value && updateChartConfig("type", value as any)}
            aria-label="Tipo de gráfico"
          >
            <ToggleGroupItem value="line" aria-label="Gráfico de Líneas">
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <FileBarChart className="h-4 w-4" />
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
                    <BarChart2 className="h-4 w-4" />
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
            <LineChart 
              data={trendChartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              {chartConfig.showGrid && (
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e0e0e0" 
                  opacity={0.7} 
                />
              )}
              
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fontSize: 12 }} 
                padding={{ left: 10, right: 10 }} 
              />
              
              <YAxis 
                tick={{ fontSize: 12 }} 
                allowDecimals={false}
              />
              
              {chartConfig.showTooltip && (
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={(value: number, name: string) => [
                    `${value} citas`,
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
                                : name,
                  ]}
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
              
              <Line
                type="monotone"
                dataKey="total"
                name="total"
                stroke={CHART_THEME.colors.primary}
                strokeWidth={chartStyles.line.strokeWidth + 1}
                dot={{ r: chartStyles.line.dotSize }}
                activeDot={{
                  r: chartStyles.line.activeDotSize,
                  stroke: CHART_THEME.colors.primary,
                  strokeWidth: 2,
                  fill: "#fff",
                }}
                connectNulls={true}
                animationBegin={0}
                animationDuration={chartConfig.animation ? chartStyles.animation.duration : 0}
                animationEasing={chartStyles.animation.easing}
              />
              
              <Line
                type="monotone"
                dataKey="completada"
                name="completada"
                stroke={STATUS_COLORS.completada}
                strokeWidth={chartStyles.line.strokeWidth}
                dot={{ r: chartStyles.line.dotSize - 1 }}
                activeDot={{ r: chartStyles.line.activeDotSize - 1 }}
                connectNulls={true}
                animationBegin={200}
                animationDuration={chartConfig.animation ? chartStyles.animation.duration : 0}
              />
              
              <Line
                type="monotone"
                dataKey="cancelada"
                name="cancelada"
                stroke={STATUS_COLORS.cancelada}
                strokeWidth={chartStyles.line.strokeWidth}
                dot={{ r: chartStyles.line.dotSize - 1 }}
                activeDot={{ r: chartStyles.line.activeDotSize - 1 }}
                connectNulls={true}
                animationBegin={400}
                animationDuration={chartConfig.animation ? chartStyles.animation.duration : 0}
              />
              
              <Line
                type="monotone"
                dataKey="presente"
                name="presente"
                stroke={STATUS_COLORS.presente}
                strokeWidth={chartStyles.line.strokeWidth}
                dot={{ r: chartStyles.line.dotSize - 1 }}
                activeDot={{ r: chartStyles.line.activeDotSize - 1 }}
                connectNulls={true}
                animationBegin={600}
                animationDuration={chartConfig.animation ? chartStyles.animation.duration : 0}
              />
              
              <Line
                type="monotone"
                dataKey="reprogramada"
                name="reprogramada"
                stroke={STATUS_COLORS.reprogramada}
                strokeWidth={chartStyles.line.strokeWidth}
                dot={{ r: chartStyles.line.dotSize - 1 }}
                activeDot={{ r: chartStyles.line.activeDotSize - 1 }}
                connectNulls={true}
                animationBegin={800}
                animationDuration={chartConfig.animation ? chartStyles.animation.duration : 0}
              />
              
              <Line
                type="monotone"
                dataKey="no_asistio"
                name="no_asistio"
                stroke={STATUS_COLORS.no_asistio}
                strokeWidth={chartStyles.line.strokeWidth}
                dot={{ r: chartStyles.line.dotSize - 1 }}
                activeDot={{ r: chartStyles.line.activeDotSize - 1 }}
                connectNulls={true}
                animationBegin={1000}
                animationDuration={chartConfig.animation ? chartStyles.animation.duration : 0}
              />
              
              <Brush
                dataKey="formattedDate"
                height={20}
                stroke="#8884d8"
                startIndex={Math.max(0, trendChartData.length - Math.min(10, trendChartData.length))}
              />
              
              {trendChartData.length > 0 && (
                <ReferenceLine
                  y={trendChartData.reduce((sum, item) => sum + item.total, 0) / trendChartData.length}
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
            <AreaChart 
              data={trendChartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              {chartConfig.showGrid && (
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e0e0e0" 
                  opacity={0.7} 
                />
              )}
              
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fontSize: 12 }} 
                padding={{ left: 10, right: 10 }} 
              />
              
              <YAxis 
                tick={{ fontSize: 12 }} 
                allowDecimals={false}
              />
              
              {chartConfig.showTooltip && (
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={(value: number, name: string) => [
                    `${value} citas`,
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
                                : name,
                  ]}
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
              
              <Area
                type="monotone"
                dataKey="total"
                name="total"
                stackId={chartConfig.stacked ? "1" : "a"}
                stroke={CHART_THEME.colors.primary}
                fill={CHART_THEME.colors.primary}
                fillOpacity={0.6}
                connectNulls={true}
                animationBegin={0}
                animationDuration={chartConfig.animation ? 1200 : 0}
              />
              
              <Area
                type="monotone"
                dataKey="completada"
                name="completada"
                stackId={chartConfig.stacked ? "1" : "b"}
                stroke={STATUS_COLORS.completada}
                fill={STATUS_COLORS.completada}
                fillOpacity={0.6}
                connectNulls={true}
                animationBegin={200}
                animationDuration={chartConfig.animation ? 1200 : 0}
              />
              
              <Area
                type="monotone"
                dataKey="cancelada"
                name="cancelada"
                stackId={chartConfig.stacked ? "1" : "c"}
                stroke={STATUS_COLORS.cancelada}
                fill={STATUS_COLORS.cancelada}
                fillOpacity={0.6}
                connectNulls={true}
                animationBegin={400}
                animationDuration={chartConfig.animation ? 1200 : 0}
              />
              
              <Area
                type="monotone"
                dataKey="presente"
                name="presente"
                stackId={chartConfig.stacked ? "1" : "d"}
                stroke={STATUS_COLORS.presente}
                fill={STATUS_COLORS.presente}
                fillOpacity={0.6}
                connectNulls={true}
                animationBegin={600}
                animationDuration={chartConfig.animation ? 1200 : 0}
              />
              
              <Area
                type="monotone"
                dataKey="reprogramada"
                name="reprogramada"
                stackId={chartConfig.stacked ? "1" : "e"}
                stroke={STATUS_COLORS.reprogramada}
                fill={STATUS_COLORS.reprogramada}
                fillOpacity={0.6}
                connectNulls={true}
                animationBegin={800}
                animationDuration={chartConfig.animation ? 1200 : 0}
              />
              
              <Area
                type="monotone"
                dataKey="no_asistio"
                name="no_asistio"
                stackId={chartConfig.stacked ? "1" : "f"}
                stroke={STATUS_COLORS.no_asistio}
                fill={STATUS_COLORS.no_asistio}
                fillOpacity={0.6}
                connectNulls={true}
                animationBegin={1000}
                animationDuration={chartConfig.animation ? 1200 : 0}
              />
              
              <Brush
                dataKey="formattedDate"
                height={20}
                stroke="#8884d8"
                startIndex={Math.max(0, trendChartData.length - Math.min(10, trendChartData.length))}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  }, [chartConfig, updateChartConfig]);

  /**
   * Renderiza un gráfico de barras o radar para días de la semana
   */
  const renderWeekdayChart = useCallback((
    weekdayChartData: WeekdayChartData[], 
    isLoading: boolean
  ) => {
    if (isLoading) {
      return <Skeleton className="h-[300px] w-full rounded-lg" />;
    }
    
    if (!weekdayChartData.length) {
      return (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          No hay datos disponibles
        </div>
      );
    }
    
    return (
      <div className="relative h-[300px]" ref={chartRef} id="exportable-chart">
        <div className="absolute right-0 top-0 flex space-x-2 z-10">
          <ToggleGroup
            type="single"
            value={chartConfig.type}
            onValueChange={(value) => value && updateChartConfig("type", value as any)}
            aria-label="Tipo de gráfico"
          >
            <ToggleGroupItem value="bar" aria-label="Gráfico de Barras">
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <BarChart2 className="h-4 w-4" />
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
                    <FileBarChart className="h-4 w-4" />
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
              data={weekdayChartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              barGap={4}
              barCategoryGap={16}
            >
              {chartConfig.showGrid && (
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e0e0e0" 
                  opacity={0.7}
                />
              )}
              
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }} 
              />
              
              <YAxis
                yAxisId="left"
                orientation="left"
                stroke={CHART_THEME.colors.primary}
                tick={{ fontSize: 12 }}
                label={chartConfig.showLabels ? { 
                  value: "Citas", 
                  angle: -90, 
                  position: "insideLeft", 
                  style: { textAnchor: "middle", fontSize: 12 } 
                } : undefined}
              />
              
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke={CHART_THEME.colors.secondary}
                tick={{ fontSize: 12 }}
                label={chartConfig.showLabels ? { 
                  value: "Porcentaje", 
                  angle: 90, 
                  position: "insideRight", 
                  style: { textAnchor: "middle", fontSize: 12 } 
                } : undefined}
              />
              
              {chartConfig.showTooltip && (
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={(value: number, name: string) => [
                    name === "rate" ? `${value.toFixed(1)}%` : value,
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
            <RadarChart outerRadius={120} data={weekdayChartData}>
              <PolarGrid 
                gridType="polygon"
                stroke={chartConfig.showGrid ? "#e0e0e0" : "transparent"}
                strokeDasharray={chartConfig.showGrid ? "3 3" : "0 0"}
              />
              
              <PolarAngleAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: "#666" }} 
                tickLine={false} 
              />
              
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, "auto"]} 
                tick={{ fontSize: 10 }} 
              />
              
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
                dot={chartConfig.showLabels ? true : false}
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
                dot={chartConfig.showLabels ? true : false}
              />
              
              {chartConfig.showTooltip && (
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={(value: number, name: string) => [value, name]}
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
    );
  }, [chartConfig, updateChartConfig]);

  /**
   * Renderiza un gráfico de dispersión para análisis de correlación
   */
  const renderScatterChart = useCallback((
    scatterData: ScatterData, 
    timeRange: [number, number], 
    isLoading: boolean
  ) => {
    if (isLoading) {
      return <Skeleton className="h-[350px] w-full rounded-lg" />;
    }
    
    if (Object.values(scatterData).every((arr) => arr.length === 0)) {
      return (
        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
          No hay datos disponibles para el análisis de correlación
        </div>
      );
    }
    
    return (
      <div className="relative" ref={chartRef} id="exportable-chart">
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
            {chartConfig.showGrid && (
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#e0e0e0" 
                opacity={0.7}
              />
            )}
            
            <XAxis
              dataKey="day"
              name="Día"
              type="number"
              domain={[0, 6]}
              tickCount={7}
              tick={{ fontSize: 12 }}
              tickFormatter={(value: number) => WEEKDAYS_SHORT[value]}
              label={chartConfig.showLabels ? { 
                value: "Día de la semana", 
                position: "insideBottom", 
                offset: -5, 
                style: { textAnchor: "middle", fontSize: 12 } 
              } : undefined}
            />
            
            <YAxis
              dataKey="hour"
              name="Hora"
              type="number"
              domain={[timeRange[0], timeRange[1]]}
              tick={{ fontSize: 12 }}
              tickFormatter={(value: number) => `${value}:00`}
              label={chartConfig.showLabels ? { 
                value: "Hora del día", 
                angle: -90, 
                position: "insideLeft", 
                style: { textAnchor: "middle", fontSize: 12 } 
              } : undefined}
            />
            
            <ZAxis 
              dataKey="count" 
              range={[50, 400]} 
              name="Cantidad" 
            />
            
            {chartConfig.showTooltip && (
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(value: number, name: string) => {
                  if (name === "Día") return WEEKDAYS[value];
                  if (name === "Hora") return `${value}:00`;
                  return value;
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
            
            <Scatter
              name="Completadas"
              data={scatterData.completada}
              fill={STATUS_COLORS.completada}
              animationBegin={0}
              animationDuration={chartConfig.animation ? 1000 : 0}
            />
            
            <Scatter
              name="Canceladas"
              data={scatterData.cancelada}
              fill={STATUS_COLORS.cancelada}
              animationBegin={200}
              animationDuration={chartConfig.animation ? 1000 : 0}
            />
            
            <Scatter
              name="Pendientes"
              data={scatterData.pendiente}
              fill={STATUS_COLORS.pendiente}
              animationBegin={400}
              animationDuration={chartConfig.animation ? 1000 : 0}
            />
            
            <Scatter
              name="Presentes"
              data={scatterData.presente}
              fill={STATUS_COLORS.presente}
              animationBegin={600}
              animationDuration={chartConfig.animation ? 1000 : 0}
            />
            
            <Scatter
              name="Reprogramadas"
              data={scatterData.reprogramada}
              fill={STATUS_COLORS.reprogramada}
              animationBegin={800}
              animationDuration={chartConfig.animation ? 1000 : 0}
            />
            
            <Scatter
              name="No Asistieron"
              data={scatterData.no_asistio}
              fill={STATUS_COLORS.no_asistio}
              animationBegin={1000}
              animationDuration={chartConfig.animation ? 1000 : 0}
            />
          </ScatterChart>
        </ResponsiveContainer>
        
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
          <h4 className="font-medium mb-1 text-gray-900 dark:text-gray-100">Interpretación del Gráfico</h4>
          <p className="mb-2">
            Este gráfico muestra la distribución de citas según el día de la semana y la hora del día. El tamaño de cada
            punto representa la cantidad de citas en ese horario específico.
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Las zonas con mayor concentración de puntos indican horarios populares para citas.</li>
            <li>
              Los puntos rojos muestran patrones de cancelación que pueden ayudar a identificar horarios problemáticos.
            </li>
            <li>Use esta información para optimizar la programación de citas y reducir cancelaciones.</li>
          </ul>
        </div>
      </div>
    );
  }, [chartConfig, updateChartConfig]);

  return {
    chartConfig,
    updateChartConfig,
    isConfigOpen,
    setIsConfigOpen,
    ChartConfigControl,
    renderPieChart,
    renderBarChart,
    renderLineChart,
    renderWeekdayChart,
    renderScatterChart,
    exportChartAsImage,
    CHART_THEME
  };
}

export default useChartConfig;