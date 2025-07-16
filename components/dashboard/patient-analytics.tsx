import type React from "react"
import { useMemo, memo } from "react"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Activity,
  BarChart3,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  Eye,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ChartDataPoint {
  name: string
  consultas: number
  operados: number
}

interface PatientAnalyticsProps {
  loading?: boolean
  error?: boolean
  chart?: {
    series: Array<{ name: string; data: number[] }>
    categories: string[]
  }
  generalStats?: {
    total: number
    operados: number
    nuevos: number
  }
  dateRange?: '7d' | '30d' | '90d' | 'ytd'
  setDateRange?: (range: '7d' | '30d' | '90d' | 'ytd') => void
  lastUpdated?: string | number | Date
}

const ElegantTooltip = memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-4 min-w-[200px]">
        <div className="text-sm font-medium text-muted-foreground mb-3">
          {label}
        </div>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-sm text-foreground">
                  {entry.name}
                </span>
              </div>
              <span className="text-sm font-semibold text-foreground">
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
})

ElegantTooltip.displayName = "ElegantTooltip"

const MetricCard = memo(
  ({
    icon: Icon,
    title,
    value,
    change,
    trend,
    subtitle,
  }: {
    icon: React.ElementType
    title: string
    value: string | number
    change?: string
    trend?: "up" | "down"
    subtitle: string
  }) => {
    return (
      <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg bg-muted/50">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            {change && trend && (
              <Badge
                variant="secondary"
                className={`${
                  trend === "up"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400"
                } text-xs`}
              >
                {trend === "up" ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                {change}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {title}
            </h3>
            <p className="text-2xl font-bold text-foreground">
              {value}
            </p>
            <p className="text-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  },
)

MetricCard.displayName = "MetricCard"

const LoadingSkeleton = memo(() => (
  <div className="space-y-8">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-6">
          <div className="flex items-start justify-between mb-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-6 w-16 rounded" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-full" />
          </div>
        </Card>
      ))}
    </div>

    <Card className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <Skeleton className="h-80 w-full" />
    </Card>
  </div>
))

LoadingSkeleton.displayName = "LoadingSkeleton"

export const PatientAnalytics: React.FC<PatientAnalyticsProps> = ({
  loading = false,
  error = false,
  chart,
  generalStats,
  dateRange = '30d',
  setDateRange,
  lastUpdated
}) => {
  const transformedChartData = useMemo((): ChartDataPoint[] => {
    if (!chart?.series || !chart.categories || chart.series.length < 2) {
      return []
    }

    const consultasSeries = chart.series.find((s) => s.name === "Consultas")
    const operadosSeries = chart.series.find((s) => s.name === "Operados")

    if (!consultasSeries || !operadosSeries) {
      return []
    }

    return chart.categories.map((category, index) => ({
      name: category,
      consultas: consultasSeries.data[index] || 0,
      operados: operadosSeries.data[index] || 0,
    }))
  }, [chart])

  const metrics = useMemo(() => {
    if (generalStats) {
      const totalConsultas = generalStats.total || 0
      const totalOperados = generalStats.operados || 0
      const conversionRate = totalConsultas > 0 ? Math.round((totalOperados / totalConsultas) * 100) : 0

      return {
        totalConsultas,
        totalOperados,
        conversionRate,
        nuevos: generalStats.nuevos || 0,
      }
    }

    const totalConsultas = transformedChartData.reduce((sum, item) => sum + item.consultas, 0)
    const totalOperados = transformedChartData.reduce((sum, item) => sum + item.operados, 0)
    const conversionRate = totalConsultas > 0 ? Math.round((totalOperados / totalConsultas) * 100) : 0

    return {
      totalConsultas,
      totalOperados,
      conversionRate,
      nuevos: 0,
    }
  }, [generalStats, transformedChartData])

  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return "Actualizando..."
    try {
      const date = new Date(lastUpdated)
      return isNaN(date.getTime()) 
        ? "Actualizando..." 
        : `Actualizado: ${format(date, "dd 'de' MMMM, yyyy HH:mm", { locale: es })}`
    } catch {
      return "Actualizando..."
    }
  }, [lastUpdated])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border border-border/50 shadow-sm">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-6">
              <div className="p-4 rounded-full bg-red-50 dark:bg-red-950/20">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Error al cargar datos</h3>
                <p className="text-muted-foreground max-w-md">
                  No se pudieron cargar los datos del análisis. Por favor, inténtalo de nuevo.
                </p>
              </div>
              <Button variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!transformedChartData || transformedChartData.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border border-border/50 shadow-sm">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-6">
              <div className="p-4 rounded-full bg-muted">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Sin datos disponibles</h3>
                <p className="text-muted-foreground max-w-md">
                  No hay datos suficientes para mostrar el análisis en este momento.
                </p>
              </div>
              <Button variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Análisis de Pacientes
          </h1>
          <p className="text-lg text-muted-foreground">
            Seguimiento de consultas y procedimientos médicos
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            {formattedLastUpdated}
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Tabs 
              value={dateRange} 
              onValueChange={(value) => setDateRange?.(value as '7d' | '30d' | '90d' | 'ytd')}
              className="w-full sm:w-auto"
            >
              <TabsList className="bg-muted/50 p-1 w-full sm:w-auto">
                <TabsTrigger value="7d" className="text-xs sm:text-sm">
                  7D
                </TabsTrigger>
                <TabsTrigger value="30d" className="text-xs sm:text-sm">
                  30D
                </TabsTrigger>
                <TabsTrigger value="90d" className="text-xs sm:text-sm">
                  90D
                </TabsTrigger>
                <TabsTrigger value="ytd" className="text-xs sm:text-sm">
                  Año
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          icon={Users}
          title="Total Consultas"
          value={metrics.totalConsultas.toLocaleString()}
          change="+12.5%"
          trend="up"
          subtitle="Consultas médicas realizadas"
        />
        <MetricCard
          icon={Activity}
          title="Procedimientos"
          value={metrics.totalOperados.toLocaleString()}
          change="+8.3%"
          trend="up"
          subtitle="Pacientes con procedimientos completados"
        />
        <MetricCard
          icon={TrendingUp}
          title="Tasa Conversión"
          value={`${metrics.conversionRate}%`}
          change={`${metrics.conversionRate >= 0 ? '+' : ''}${metrics.conversionRate}%`}
          trend={metrics.conversionRate >= 0 ? "up" : "down"}
          subtitle="Porcentaje de consultas convertidas"
        />
      </div>

      <Card className="border border-border/50 shadow-sm">
        <CardHeader className="pb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <CardTitle className="text-xl font-bold">
                Tendencia Mensual
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Evolución de consultas y procedimientos
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm font-medium">Consultas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium">Procedimientos</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={transformedChartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="consultasGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="operadosGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border/30"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                  width={40}
                />

                <Tooltip content={<ElegantTooltip />} />

                <Area
                  type="monotone"
                  dataKey="consultas"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#consultasGradient)"
                  name="Consultas"
                />

                <Area
                  type="monotone"
                  dataKey="operados"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#operadosGradient)"
                  name="Procedimientos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-border/30">
        <div className="space-y-1">
          <h3 className="font-semibold">Exportar Datos</h3>
          <p className="text-sm text-muted-foreground">
            Descarga el análisis completo en diferentes formatos
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button variant="outline" className="gap-2 w-full sm:w-auto">
            <Eye className="h-4 w-4" />
            Vista Detallada
          </Button>
          <Button className="gap-2 w-full sm:w-auto">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>
    </div>
  )
}

PatientAnalytics.displayName = "PatientAnalytics"

export default memo(PatientAnalytics)