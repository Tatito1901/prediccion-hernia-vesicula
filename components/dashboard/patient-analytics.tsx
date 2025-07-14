"use client"

import type React from "react"
import { useMemo, memo, useState } from "react"
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
  Download,
  Filter,
  MoreHorizontal,
  Zap,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ChartDataPoint {
  name: string
  consultas: number
  operados: number
}

const mockChart = {
  categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago"],
  series: [
    { name: "Consultas", data: [120, 150, 180, 140, 200, 170, 190, 210] },
    { name: "Operados", data: [80, 95, 110, 85, 130, 105, 125, 140] },
  ],
}

const useDashboard = () => ({
  loading: false,
  error: null,
  chart: mockChart,
})

const ElegantTooltip = memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-2xl p-6 min-w-[240px]">
        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">{label}</div>
        <div className="space-y-3">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{entry.name}</span>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
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
      <Card className="group relative overflow-hidden border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent dark:from-slate-800/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <CardContent className="p-8 relative">
          <div className="flex items-start justify-between mb-6">
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors duration-300">
              <Icon className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </div>
            {change && (
              <Badge
                variant="secondary"
                className={`${
                  trend === "up"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
                } font-medium`}
              >
                {trend === "up" ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                {change}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{value}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{subtitle}</p>
          </div>
        </CardContent>
      </Card>
    )
  },
)

const LoadingSkeleton = memo(() => (
  <div className="space-y-8">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>
      <Skeleton className="h-10 w-48" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-8">
          <div className="flex items-start justify-between mb-6">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-full" />
          </div>
        </Card>
      ))}
    </div>

    <Card className="p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="h-80 w-full" />
    </Card>
  </div>
))

export const PatientAnalytics: React.FC = () => {
  const { loading, error, chart } = useDashboard()
  const [timeRange, setTimeRange] = useState("8meses")

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
    const totalConsultas = transformedChartData.reduce((sum, item) => sum + item.consultas, 0)
    const totalOperados = transformedChartData.reduce((sum, item) => sum + item.operados, 0)
    const conversionRate = totalConsultas > 0 ? Math.round((totalOperados / totalConsultas) * 100) : 0

    return {
      totalConsultas,
      totalOperados,
      conversionRate,
    }
  }, [transformedChartData])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <LoadingSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-6">
              <div className="p-4 rounded-full bg-red-50 dark:bg-red-950/30">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Error al cargar datos</h3>
                <p className="text-slate-600 dark:text-slate-400 max-w-md">
                  No se pudieron cargar los datos del análisis. Por favor, intenta nuevamente.
                </p>
              </div>
              <Button variant="outline" className="gap-2 bg-transparent">
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
      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-6">
              <div className="p-4 rounded-full bg-slate-50 dark:bg-slate-800">
                <BarChart3 className="h-8 w-8 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Sin datos disponibles</h3>
                <p className="text-slate-600 dark:text-slate-400 max-w-md">
                  No hay datos suficientes para mostrar el análisis en este momento.
                </p>
              </div>
              <Button variant="outline" className="gap-2 bg-transparent">
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
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Análisis de Pacientes
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Seguimiento de consultas y procedimientos médicos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Tabs value={timeRange} onValueChange={setTimeRange}>
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
              <TabsTrigger value="3meses" className="text-sm">
                3M
              </TabsTrigger>
              <TabsTrigger value="6meses" className="text-sm">
                6M
              </TabsTrigger>
              <TabsTrigger value="8meses" className="text-sm">
                8M
              </TabsTrigger>
              <TabsTrigger value="ano" className="text-sm">
                1A
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>

          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          icon={Users}
          title="Total Consultas"
          value={metrics.totalConsultas.toLocaleString()}
          change="+12.5%"
          trend="up"
          subtitle="Consultas médicas realizadas en el período"
        />
        <MetricCard
          icon={Activity}
          title="Procedimientos"
          value={metrics.totalOperados.toLocaleString()}
          change="+8.3%"
          trend="up"
          subtitle="Pacientes que completaron procedimientos"
        />
        <MetricCard
          icon={Zap}
          title="Tasa Conversión"
          value={`${metrics.conversionRate}%`}
          subtitle="Porcentaje de consultas convertidas"
        />
      </div>

      {/* Chart */}
      <Card className="border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl">
        <CardHeader className="pb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Tendencia Mensual
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Evolución de consultas y procedimientos a lo largo del tiempo
              </CardDescription>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Consultas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Procedimientos</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-8">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={transformedChartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="consultasGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="operadosGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-slate-200 dark:stroke-slate-700"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "currentColor" }}
                  className="text-slate-500 dark:text-slate-400"
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "currentColor" }}
                  className="text-slate-500 dark:text-slate-400"
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

      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
        <div className="space-y-1">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Exportar Datos</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Descarga el análisis completo en diferentes formatos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 bg-transparent">
            <Eye className="h-4 w-4" />
            Vista Detallada
          </Button>
          <Button className="gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900">
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
