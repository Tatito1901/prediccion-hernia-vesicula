import { useMemo, useCallback, useState, useEffect } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Label } from 'recharts'
import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label as UILabel } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChartConfig as BaseChartConfig } from '@/lib/types/charts'
import { cn } from '@/lib/utils'
import { getChartColors } from '@/lib/utils/charts'
import { ABBR } from '@/lib/utils/string'
import { DiagnosisData, DiagnosisEnum } from '@/lib/types/diagnosis'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  InfoIcon,
  Maximize2,
  PieChart as PieChartIcon,
  Settings,
  Trash2,
  TrendingDown,
  TrendingUp,
  FilePieChart,
  Brain,
  BarChart4
} from 'lucide-react'

import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { useTheme } from "next-themes"
import { CHART_STYLES, getChartColors, getAdaptiveBackground } from "@/components/charts/chart-theme"

/* ============================================================================
 * TIPOS Y INTERFACES ESPECIALIZADAS
 * ========================================================================== */

export interface DiagnosisData {
  tipo: string
  cantidad: number
  porcentaje?: number
  categoria?: string
  descripcion?: string
}

interface EnhancedDiagnosisData extends DiagnosisData {
  id: string
  fill: string
  isVisible: boolean
  isHighlighted: boolean
  rank: number
  normalizedValue: number // Para animaciones
}

interface ChartConfig {
  showPercentages: boolean;
  showLabels: boolean;
  innerRadius: number;
  outerRadius: number;
  animationDuration: number;
  colorScheme: 'medical' | 'diagnosis' | 'patients' | 'trends' | 'comparison' | 'appointments' | 'surgery' | 'emergency' | 'recovery';
  labelPosition: 'outside' | 'inside' | 'none';
  sortBy: 'valor' | 'alfabetico';
  maxCategories: number;
}

interface PieChartStats {
  total: number
}

interface Props {
  data: readonly DiagnosisData[]
  title?: string
  description?: string
  className?: string
  chartColorsName?: 'diagnosis' | 'patients' | 'medical' | 'generic'
  maxCategories?: number
  interactive?: boolean
  showControls?: boolean
  showStats?: boolean
  onSegmentClick?: (segment: DiagnosisData) => void
  onExport?: (format: 'png' | 'svg' | 'json') => void
}

/* ============================================================================
 * FUNCIONES AUXILIARES OPTIMIZADAS
 * ========================================================================== */

const ABBR = (s: string, n = 18) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

const getMedicalCategory = (tipo: string): { 
  categoria: string, 
  color: number 
} => {
  const lower = tipo.toLowerCase()
  
  if (lower.includes("cardio")) return { categoria: 'Cardiología', color: 1 }
  if (lower.includes("hernia")) return { categoria: 'Cirugía General', color: 2 }
  if (lower.includes("vesícul") || lower.includes("colelit")) return { categoria: 'Gastroenterología', color: 3 }
  
  return { categoria: 'Medicina General', color: 4 }
}

// Función para detectar segmento activo en hover
const renderActiveShape = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props
  const RADIAN = Math.PI / 180
  const sin = Math.sin(-midAngle * RADIAN)
  const cos = Math.cos(-midAngle * RADIAN)
  const sx = cx + (outerRadius + 10) * cos
  const sy = cy + (outerRadius + 10) * sin
  const mx = cx + (outerRadius + 30) * cos
  const my = cy + (outerRadius + 30) * sin
  const ex = mx + (cos >= 0 ? 1 : -1) * 22
  const ey = my
  const textAnchor = cos >= 0 ? 'start' : 'end'

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#666" className="text-sm font-medium">
        {payload.tipo}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#fff"
        strokeWidth={3}
        className="drop-shadow-lg"
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        fill={fill}
        opacity={0.3}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={2} />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text 
        x={ex + (cos >= 0 ? 1 : -1) * 12} 
        y={ey} 
        textAnchor={textAnchor} 
        fill="#333"
        className="text-sm font-semibold"
      >
        {`${payload.cantidad} casos`}
      </text>
      <text 
        x={ex + (cos >= 0 ? 1 : -1) * 12} 
        y={ey} 
        dy={18} 
        textAnchor={textAnchor} 
        fill="#666"
        className="text-xs"
      >
        {`${payload.porcentaje}%`}
      </text>
    </g>
  )
}

/* ============================================================================
 * COMPONENTE PRINCIPAL MEJORADO
 * ============================================================================ */

export default function DiagnosisPieChart({
  data,
  title = "Distribución de Diagnósticos",
  description = "Análisis detallado con métricas avanzadas",
  className,
  chartColorsName = "diagnosis",
  maxCategories = 8,
  interactive = true,
  showControls = true,
  showStats = true,
  onSegmentClick,
  onExport,
}: Props) {
  
  /* ============================== ESTADO =============================== */
  
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  
  const [config, setConfig] = useState<ChartConfig>({
    showPercentages: true,
    showLabels: true,
    innerRadius: 60,
    outerRadius: 140,
    animationDuration: 800,
    colorScheme: chartColorsName as 'medical' | 'diagnosis' | 'patients' | 'trends' | 'comparison' | 'appointments' | 'surgery' | 'emergency' | 'recovery',
    labelPosition: 'outside',
    sortBy: 'valor',
    maxCategories,
  })
  
  const [hiddenSegments, setHiddenSegments] = useState<Set<string>>(new Set())
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)

  /* ========================= EFECTOS Y SETUP ========================== */
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
      setIsVisible(true)
    }, 200)
    
    return () => clearTimeout(timer)
  }, [data, config])

  /* ======================== PROCESAMIENTO DE DATOS ====================== */
  
  const { processedData, chartStats, visibleData } = useMemo(() => {
    if (!data?.length) {
      return { 
        processedData: [], 
        chartStats: {
          total: 0
        },
        visibleData: []
      }
    }

    // Ordenar datos según configuración
    let sortedData = [...data]
    switch (config.sortBy) {
      case 'valor':
        sortedData.sort((a, b) => b.cantidad - a.cantidad)
        break
      case 'alfabetico':
        sortedData.sort((a, b) => a.tipo.localeCompare(b.tipo))
        break
    }

    const total = sortedData.reduce((sum, d) => sum + d.cantidad, 0)

    // Manejar categorías en exceso
    let finalData = sortedData
    if (sortedData.length > config.maxCategories) {
      const topItems = sortedData.slice(0, config.maxCategories - 1)
      const otherItems = sortedData.slice(config.maxCategories - 1)
      const otherSum = otherItems.reduce((sum, d) => sum + d.cantidad, 0)
      
      if (otherSum > 0) {
        finalData = [
          ...topItems,
          {
            tipo: 'Otros diagnósticos',
            cantidad: otherSum,
            descripcion: `Incluye ${otherItems.length} diagnósticos adicionales`,
            categoria: 'Varios'
          }
        ]
      }
    }

    // Obtener colores
    const palette = getChartColors(config.colorScheme, finalData.length + 2)

    // Procesar datos con metadatos
    const processed: EnhancedDiagnosisData[] = finalData.map((item, index) => {
      const isOther = item.tipo === 'Otros diagnósticos'
      const medicalInfo = isOther ? 
        { categoria: 'Varios', color: palette.length - 1 } : 
        getMedicalCategory(item.tipo)
      
      const porcentaje = total > 0 ? Math.round((item.cantidad / total) * 100) : 0
      
      return {
        ...item,
        id: `segment-${index}`,
        fill: palette[medicalInfo.color % palette.length],
        porcentaje,
        categoria: item.categoria || medicalInfo.categoria,
        isVisible: !hiddenSegments.has(item.tipo),
        isHighlighted: selectedSegment === item.tipo,
        rank: index + 1,
        normalizedValue: item.cantidad,
      }
    })

    // Datos visibles para el gráfico
    const visible = processed.filter(d => d.isVisible)

    // Calcular estadísticas
    const stats: PieChartStats = {
      total: visible.reduce((sum, d) => sum + d.cantidad, 0)
    }

    return {
      processedData: processed,
      chartStats: stats,
      visibleData: visible
    }
  }, [data, config, hiddenSegments, selectedSegment])

  /* ======================== FUNCIONES AUXILIARES ======================== */

  const calculateStats = useCallback((data: DiagnosisData[]): PieChartStats => {
    if (!data.length) {
      return {
        total: 0
      };
    }

    const total = data.reduce((sum, item) => sum + item.cantidad, 0);
    
    return {
      total
    };
  }, []);

  /* ======================= MANEJADORES DE EVENTOS ======================= */
  
  const updateConfig = useCallback((updates: Partial<ChartConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }, [])

  const handleSegmentClick = useCallback((data: EnhancedDiagnosisData, index: number) => {
    if (!interactive) return
    
    const newSelected = selectedSegment === data.tipo ? null : data.tipo
    setSelectedSegment(newSelected)
    setActiveIndex(index)
    
    onSegmentClick?.(data)
  }, [interactive, selectedSegment, onSegmentClick])

  const toggleSegmentVisibility = useCallback((tipo: string) => {
    setHiddenSegments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tipo)) {
        newSet.delete(tipo)
      } else {
        newSet.add(tipo)
      }
      return newSet
    })
  }, [])

  const handleExport = useCallback((format: 'png' | 'svg' | 'json') => {
    onExport?.(format)
    // En implementación real, aquí iría la lógica de exportación
  }, [onExport])

  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null
    
    const data = payload[0].payload as EnhancedDiagnosisData
    
    return (
      <div 
        className="p-4 rounded-xl shadow-2xl border backdrop-blur-md text-sm animate-in fade-in zoom-in-95 duration-200"
        style={{
          backgroundColor: getAdaptiveBackground(0.95),
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        }}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.fill }} />
            <span className="font-semibold text-foreground">{data.tipo}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Casos:</span>
              <div className="font-bold text-base">{data.cantidad}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Porcentaje:</span>
              <div className="font-bold text-base">{data.porcentaje}%</div>
            </div>
            <div>
              <span className="text-muted-foreground">Ranking:</span>
              <div className="font-bold text-base">#{data.rank}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Categoría:</span>
              <div className="font-medium text-xs">{data.categoria}</div>
            </div>
          </div>
          
          {data.descripcion && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">{data.descripcion}</p>
            </div>
          )}
        </div>
      </div>
    )
  }, [isDark])

  /* ========================== COMPONENTE DE CARGA ========================= */
  
  if (isLoading) {
    return (
      <Card className={cn('shadow-lg hover:shadow-xl transition-all duration-300', className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <CardTitle>Procesando Diagnósticos</CardTitle>
          </div>
          <CardDescription>Generando análisis visual interactivo...</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="space-y-4 text-center">
            <Progress value={85} className="w-56" />
            <p className="text-sm text-muted-foreground">Aplicando algoritmos de visualización médica</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  /* ========================== ESTADO VACÍO ============================ */
  
  if (!processedData.length) {
    return (
      <Card className={cn('shadow-lg hover:shadow-xl transition-all duration-300', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] flex flex-col items-center justify-center space-y-4">
          <div className="p-4 rounded-full bg-muted/50">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center space-y-2">
            <p className="font-medium text-muted-foreground">Sin datos para visualizar</p>
            <p className="text-sm text-muted-foreground">
              No hay diagnósticos disponibles en el período seleccionado
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  /* ========================== RENDERIZADO PRINCIPAL ======================== */
  
  const ChartComponent = () => (
    <div className="h-[350px] sm:h-[420px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            activeIndex={activeIndex}
            activeShape={interactive ? renderActiveShape : undefined}
            data={visibleData}
            dataKey="cantidad"
            nameKey="tipo"
            cx="50%"
            cy="50%"
            innerRadius={`${config.innerRadius}%`}
            outerRadius={`${config.outerRadius}%`}
            paddingAngle={3}
            cornerRadius={6}
            stroke={isDark ? 'hsl(var(--card))' : 'hsl(var(--background))'}
            strokeWidth={2}
            isAnimationActive={isVisible}
            animationDuration={config.animationDuration}
            animationBegin={0}
            onMouseEnter={(_, index) => interactive && setActiveIndex(index)}
            onMouseLeave={() => interactive && setActiveIndex(-1)}
            onClick={(data, index) => handleSegmentClick(data.payload, index)}
            className={cn(interactive && "cursor-pointer")}
          >
            {visibleData.map((entry) => (
              <Cell 
                key={entry.id}
                fill={entry.fill}
                fillOpacity={entry.isHighlighted ? 1 : 0.85}
                stroke={entry.isHighlighted ? entry.fill : undefined}
                strokeWidth={entry.isHighlighted ? 4 : 2}
                className={cn(
                  interactive && "hover:opacity-90 transition-all duration-300",
                  entry.isHighlighted && "drop-shadow-xl"
                )}
              />
            ))}
            
            {config.labelPosition === 'outside' && config.showLabels && config.showPercentages && (
              <LabelList
                dataKey="porcentaje"
                position="outside"
                formatter={(value: number, entry: any) => 
                  value > 4 ? `${ABBR(entry.tipo, 12)}\n${value}%` : value > 2 ? `${value}%` : ''
                }
                style={{ 
                  fontSize: '11px', 
                  fill: isDark ? '#e2e8f0' : '#475569',
                  fontWeight: 600,
                  textAnchor: 'middle'
                }}
              />
            )}
          </Pie>

          <Legend
            wrapperStyle={{
              color: CHART_STYLES.legend.color,
              fontSize: CHART_STYLES.legend.fontSize,
              paddingTop: '24px',
              lineHeight: 1.6
            }}
            iconType="circle"
            iconSize={CHART_STYLES.legend.iconSize}
            verticalAlign="bottom"
            height={60}
            formatter={(value, entry) => {
              const item = processedData.find(d => d.tipo === value)
              return (
                <span 
                  style={{ color: entry.color }}
                  className={cn(
                    "text-sm",
                    selectedSegment === value && "font-semibold underline"
                  )}
                >
                  {ABBR(value, 22)} ({item?.porcentaje}%)
                </span>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )

  return (
    <Card className={cn(
      'shadow-lg hover:shadow-xl transition-all duration-300 border overflow-hidden',
      className
    )}>
      
      {/* ==================== HEADER CON CONTROLES ==================== */}
      
      <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <PieChartIcon className="h-5 w-5 text-primary" />
              {title}
              <Badge variant="secondary" className="ml-2">
                {chartStats.total} casos
              </Badge>
            </CardTitle>
            <CardDescription>
              {description}
            </CardDescription>
          </div>
          
          {showControls && (
            <div className="flex items-center gap-2">
              {/* Configuración */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Configurar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Visualización</DropdownMenuLabel>
                  
                  <DropdownMenuItem>
                    <div className="flex items-center justify-between w-full">
                      <Label htmlFor="percentages" className="text-sm">Porcentajes</Label>
                      <Switch
                        id="percentages"
                        checked={config.showPercentages}
                        onCheckedChange={(checked) => updateConfig({ showPercentages: checked })}
                      />
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Ordenamiento</DropdownMenuLabel>
                  
                  <DropdownMenuCheckboxItem
                    checked={config.sortBy === 'valor'}
                    onCheckedChange={() => updateConfig({ sortBy: 'valor' })}
                  >
                    Por valor
                  </DropdownMenuCheckboxItem>
                  
                  <DropdownMenuCheckboxItem
                    checked={config.sortBy === 'alfabetico'}
                    onCheckedChange={() => updateConfig({ sortBy: 'alfabetico' })}
                  >
                    Alfabético
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Pantalla completa */}
              <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>{title} - Vista Expandida</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1">
                    <ChartComponent />
                  </div>
                </DialogContent>
              </Dialog>

              {/* Exportar */}
              {onExport && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport('png')}>
                      Exportar como PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('svg')}>
                      Exportar como SVG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('json')}>
                      Exportar datos JSON
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        
        {/* ================== CONTROLES DE VISIBILIDAD ================== */}
        
        {interactive && processedData.length > 4 && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Mostrar/Ocultar segmentos:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {processedData.map((item) => (
                <Button
                  key={item.id}
                  variant={item.isVisible ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => toggleSegmentVisibility(item.tipo)}
                  className="h-8 px-3 text-xs gap-2 transition-all hover:scale-105"
                >
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: item.fill }}
                  />
                  {ABBR(item.tipo, 15)}
                  {!item.isVisible && <EyeOff className="h-3 w-3" />}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* ==================== GRÁFICO PRINCIPAL ==================== */}
        
        <ChartComponent />

        {/* ================ INFORMACIÓN DETALLADA ================= */}
        
        {showStats && selectedSegment && (
          <div className="rounded-lg bg-muted/10 border mt-6 p-4">
            <Tabs defaultValue="basic">
              <div className="flex items-center mb-4">
                <TabsList>
                  <TabsTrigger value="basic">Información Básica</TabsTrigger>
                  <TabsTrigger value="stats">Estadísticas</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="basic">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      Análisis de diagnósticos
                    </h3>
                    <Badge variant="outline">
                      {chartStats.total} casos analizados
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border hover:bg-muted/10 transition-colors space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <PieChartIcon className="h-4 w-4 text-primary" />
                        Distribución
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <div className="text-xs text-muted-foreground">Total diagnósticos</div>
                          <div className="font-semibold flex items-center gap-1">
                            {visibleData.length} categorías
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-muted-foreground">Total casos</div>
                          <div className="font-semibold flex items-center gap-1">
                            {chartStats.total}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg border hover:bg-muted/10 transition-colors space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <BarChart4 className="h-4 w-4 text-primary" />
                        Diagnósticos clave
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 rounded bg-background border">
                          <div className="text-2xl font-bold text-primary">{selectedData.cantidad}</div>
                          <div className="text-xs text-muted-foreground">Casos</div>
                        </div>
                        
                        <div className="text-center p-3 rounded bg-background border">
                          <div className="text-2xl font-bold text-primary">{selectedData.porcentaje}%</div>
                          <div className="text-xs text-muted-foreground">Del Total</div>
                        </div>
                      </div>
                      {selectedData.tendencia !== undefined && (
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <span className="text-muted-foreground text-xs">Tendencia:</span>
                          <div className={cn(
                            "flex items-center gap-1 font-semibold text-xs",
                            selectedData.tendencia > 0 ? "text-red-500" : "text-green-500"
                          )}>
                            {selectedData.tendencia > 0 ? 
                              <TrendingUp className="h-5 w-5" /> : 
                              <TrendingDown className="h-5 w-5" />
                            }
                            {Math.abs(selectedData.tendencia).toFixed(1)}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {selectedData.descripcion && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-2">
                        <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          {selectedData.descripcion}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}

      </CardContent>

      {/* ===================== FOOTER CON ESTADÍSTICAS ===================== */}
      
      {showStats && (
        <CardFooter className="bg-muted/20 border-t">
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Segmentos visibles:</span>
              <span className="font-bold">{visibleData.length}</span>
            </div>
            
            <div className="flex items-center gap-2 justify-end">
              <span className="text-muted-foreground">Total casos:</span>
              <span className="font-bold">{chartStats.total}</span>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}