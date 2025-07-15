<<<<<<< HEAD
"use client"

import type React from "react"
import { useMemo, memo } from "react"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
=======
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
>>>>>>> feature/nombre-de-la-feature
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
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDashboard } from "@/contexts/dashboard-context"

interface ChartDataPoint {
  name: string
  consultas: number
  operados: number
}

const ElegantTooltip = memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border/50 rounded-lg shadow-lg p-4 min-w-[200px]">
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
      <Card className="border border-border/50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            {change && (
              <Badge
                variant="secondary"
                className={`${
                  trend === "up"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400"
                } text-xs`}
              >
                {trend === "up" ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                {change}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {title}
            </h3>
            <p className="text-2xl font-semibold text-foreground">
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
      <Skeleton className="h-10 w-48" />
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
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="h-80 w-full" />
    </Card>
  </div>
))

LoadingSkeleton.displayName = "LoadingSkeleton"

export const PatientAnalytics: React.FC = () => {
  const { loading, error, chart, generalStats, dateRange, setDateRange } = useDashboard()

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
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-6">
              <div className="p-4 rounded-full bg-red-50 dark:bg-red-950/20">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Error al cargar datos</h3>
                <p className="text-muted-foreground max-w-md">
                  No se pudieron cargar los datos del análisis.
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
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-6">
              <div className="p-4 rounded-full bg-muted">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Sin datos disponibles</h3>
                <p className="text-muted-foreground max-w-md">
                  No hay datos suficientes para mostrar el análisis.
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
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">
            Análisis de Pacientes
          </h1>
          <p className="text-lg text-muted-foreground">
            Seguimiento de consultas y procedimientos médicos
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Tabs value={dateRange} onValueChange={setDateRange}>
            <TabsList className="bg-muted/50 p-1 w-full sm:w-auto">
              <TabsTrigger value="30dias" className="text-sm">
                30D
              </TabsTrigger>
              <TabsTrigger value="60dias" className="text-sm">
                60D
              </TabsTrigger>
              <TabsTrigger value="90dias" className="text-sm">
                90D
              </TabsTrigger>
              <TabsTrigger value="ytd" className="text-sm">
                1A
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filtros</span>
          </Button>
        </div>
      </div>

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
          icon={TrendingUp}
          title="Tasa Conversión"
          value={`${metrics.conversionRate}%`}
          subtitle="Porcentaje de consultas convertidas"
        />
      </div>

      <Card>
        <CardHeader className="pb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold">
                Tendencia Mensual
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Evolución de consultas y procedimientos a lo largo del tiempo
              </CardDescription>
            </div>

            <div className="flex gap-6">
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

        <CardContent className="pb-8">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={transformedChartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="consultasGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="operadosGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
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
<<<<<<< HEAD

                <Area
                  type="monotone"
                  dataKey="operados"
                  stroke="#10b981"
                  strokeWidth={2}
=======
                <Area 
                  type="monotone" 
                  dataKey="operados" 
                  stroke="#10B981"
                  strokeWidth={3}
>>>>>>> feature/nombre-de-la-feature
                  fill="url(#operadosGradient)"
                  name="Procedimientos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-border/50">
        <div className="space-y-1">
          <h3 className="font-semibold">Exportar Datos</h3>
          <p className="text-sm text-muted-foreground">
            Descarga el análisis completo en diferentes formatos
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Eye className="h-4 w-4" />
            Vista Detallada
          </Button>
          <Button className="gap-2">
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