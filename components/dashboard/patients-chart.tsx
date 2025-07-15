"use client"

import { useMemo, memo } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useDashboard } from "@/contexts/dashboard-context"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { AlertTriangle, Users, Activity, TrendingUp, RefreshCw, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type DateRange = "7dias" | "30dias" | "90dias" | "ytd"

interface ChartDataPoint {
  date: string
  label: string
  pacientes: number
  operados: number
}

const CustomTooltip = memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border/50 rounded-lg shadow-lg p-4 min-w-[180px]">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <p className="font-medium text-foreground text-sm">{label}</p>
        </div>
        <div className="space-y-2">
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-semibold text-foreground text-sm">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
})

CustomTooltip.displayName = "CustomTooltip"

const PatientsChart = memo(() => {
  const { loading, error, patients = [], dateRange, chart } = useDashboard()

  const { chartData, metrics } = useMemo(() => {
    if (chart?.series && chart.categories) {
      const consultasSeries = chart.series.find(s => s.name === "Consultas")
      const operadosSeries = chart.series.find(s => s.name === "Operados")
      
      if (consultasSeries && operadosSeries) {
        const chartData = chart.categories.map((category, index) => ({
          date: category,
          label: category,
          pacientes: consultasSeries.data[index] || 0,
          operados: operadosSeries.data[index] || 0,
        }))
        
        const pacientesTotal = consultasSeries.data.reduce((sum, val) => sum + val, 0)
        const operadosTotal = operadosSeries.data.reduce((sum, val) => sum + val, 0)
        const ratio = pacientesTotal > 0 ? (operadosTotal / pacientesTotal * 100).toFixed(1) : "0.0"
        
        return {
          chartData,
          metrics: {
            pacientes: pacientesTotal,
            operados: operadosTotal,
            ratio
          }
        }
      }
    }
    
    if (!patients || patients.length === 0) return { chartData: [], metrics: null }
    
    const today = new Date()
    const startDate = new Date()
    let dateInterval = 1
    
    switch (dateRange) {
      case "7dias":
        startDate.setDate(today.getDate() - 7)
        break
      case "30dias":
        startDate.setDate(today.getDate() - 30)
        break
      case "90dias":
        startDate.setDate(today.getDate() - 90)
        dateInterval = 3
        break
      case "ytd":
        startDate.setMonth(0, 1)
        break
    }
    
    const isDaily = dateRange !== "ytd" && dateRange !== "90dias"
    const dataMap = new Map<string, ChartDataPoint>()
    const currentDate = new Date(startDate)
    
    while (currentDate <= today) {
      const dateKey = isDaily 
        ? format(currentDate, "yyyy-MM-dd") 
        : format(currentDate, "yyyy-MM")
        
      const labelFormat = isDaily ? "dd MMM" : "MMM yy"
      
      dataMap.set(dateKey, {
        date: dateKey,
        label: format(currentDate, labelFormat),
        pacientes: 0,
        operados: 0,
      })
      
      isDaily 
        ? currentDate.setDate(currentDate.getDate() + dateInterval)
        : currentDate.setMonth(currentDate.getMonth() + dateInterval)
    }
    
    patients.forEach(patient => {
      if (patient.fecha_registro) {
        const regDate = new Date(patient.fecha_registro)
        const dateKey = isDaily 
          ? format(regDate, "yyyy-MM-dd") 
          : format(regDate, "yyyy-MM")
          
        const dataPoint = dataMap.get(dateKey)
        if (dataPoint) dataPoint.pacientes += 1
      }
      
      if (patient.estado_paciente === "OPERADO" && patient.updated_at) {
        const opDate = new Date(patient.updated_at)
        const dateKey = isDaily 
          ? format(opDate, "yyyy-MM-dd") 
          : format(opDate, "yyyy-MM")
          
        const dataPoint = dataMap.get(dateKey)
        if (dataPoint) dataPoint.operados += 1
      }
    })
    
    const chartData = Array.from(dataMap.values())
    const pacientesTotal = chartData.reduce((sum, d) => sum + d.pacientes, 0)
    const operadosTotal = chartData.reduce((sum, d) => sum + d.operados, 0)
    const ratio = pacientesTotal > 0 ? (operadosTotal / pacientesTotal * 100).toFixed(1) : "0.0"
    
    return {
      chartData,
      metrics: {
        pacientes: pacientesTotal,
        operados: operadosTotal,
        ratio
      }
    }
  }, [patients, dateRange, chart])

  if (loading) {
    return (
      <div className="h-[350px] flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] text-center p-6 space-y-4">
        <div className="p-4 rounded-full bg-red-50 dark:bg-red-950/20">
          <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Error al cargar datos</h3>
          <p className="text-muted-foreground max-w-md">
            No se pudieron cargar los datos para el gráfico
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Recargar datos
        </Button>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] text-center p-6 space-y-4">
        <div className="p-4 rounded-full bg-muted">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Sin datos disponibles</h3>
          <p className="text-muted-foreground max-w-md">
            No hay suficientes datos para mostrar tendencias
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[350px] flex flex-col space-y-6">
      <div className="flex flex-col lg:flex-row justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">Tendencia de Pacientes</h3>
          </div>
          <p className="text-muted-foreground">Evolución de nuevos pacientes y operaciones</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
              <span className="text-xs font-medium text-muted-foreground">Nuevos</span>
            </div>
            <p className="text-lg font-semibold">{metrics?.pacientes.toLocaleString()}</p>
          </div>

          <div className="text-center p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-medium text-muted-foreground">Operados</span>
            </div>
            <p className="text-lg font-semibold">
              {metrics?.operados.toLocaleString()}
            </p>
          </div>

          <div className="text-center p-3 rounded-lg bg-muted/30 border border-border/50">
            <span className="text-xs font-medium text-muted-foreground mb-1 block">Ratio</span>
            <p className="text-lg font-semibold">{metrics?.ratio}%</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <defs>
              <linearGradient id="pacientesGradient" x1="0" y1="0" x2="0" y2="1">
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
              vertical={false} 
              className="stroke-border/30" 
            />

            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              className="fill-muted-foreground"
              interval="preserveStartEnd"
            />

            <YAxis
              width={35}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
            />

            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="pacientes"
              stroke="#3b82f6"
              fill="url(#pacientesGradient)"
              strokeWidth={2}
              name="Nuevos Pacientes"
            />

            <Area
              type="monotone"
              dataKey="operados"
              stroke="#10b981"
              fill="url(#operadosGradient)"
              strokeWidth={2}
              name="Pacientes Operados"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})

PatientsChart.displayName = "PatientsChart"

export const PatientTrendsChart: React.FC = () => {
  const { dateRange, setDateRange, generalStats } = useDashboard()

  const descriptions = useMemo(() => ({
    "7dias": "Análisis de la última semana",
    "30dias": "Tendencias del último mes",
    "90dias": "Evolución trimestral",
    ytd: "Resumen anual completo",
  }), [])

  const summaryMetrics = useMemo(() => {
    if (generalStats) {
      return {
        totalNuevos: generalStats.nuevos || 0,
        totalOperados: generalStats.operados || 0,
        eficiencia: generalStats.total > 0 ? 
          ((generalStats.operados / generalStats.total) * 100).toFixed(1) : "0.0"
      }
    }
    return {
      totalNuevos: 0,
      totalOperados: 0,
      eficiencia: "0.0"
    }
  }, [generalStats])

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-3 text-2xl font-semibold">
              <div className="p-3 rounded-lg bg-muted">
                <Activity className="h-6 w-6 text-muted-foreground" />
              </div>
              Análisis de Tendencias
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {descriptions[dateRange as keyof typeof descriptions]}
            </CardDescription>
          </div>

          <Tabs
            value={dateRange}
            onValueChange={(value) => setDateRange(value as DateRange)}
            className="w-full xl:w-auto"
          >
            <TabsList className="grid w-full grid-cols-2 xl:grid-cols-4 bg-muted/50 p-1 h-auto">
              <TabsTrigger value="7dias" className="px-4 py-2 text-sm">
                7 días
              </TabsTrigger>
              <TabsTrigger value="30dias" className="px-4 py-2 text-sm">
                30 días
              </TabsTrigger>
              <TabsTrigger value="90dias" className="px-4 py-2 text-sm">
                90 días
              </TabsTrigger>
              <TabsTrigger value="ytd" className="px-4 py-2 text-sm">
                Año actual
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <PatientsChart />
      </CardContent>

      <div className="px-6 pb-6">
        <div className="flex flex-col lg:flex-row justify-between gap-6 pt-6 border-t border-border/50">
          <div className="space-y-1">
            <h4 className="font-semibold text-lg">Resumen Ejecutivo</h4>
            <p className="text-muted-foreground">
              Análisis comparativo del flujo de pacientes
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-sm font-medium text-muted-foreground">Total Nuevos</p>
              <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                {summaryMetrics.totalNuevos.toLocaleString()}
              </p>
              <Badge variant="secondary" className="text-xs mt-1">
                +12.5%
              </Badge>
            </div>

            <div className="text-center p-3 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-sm font-medium text-muted-foreground">Total Operados</p>
              <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                {summaryMetrics.totalOperados.toLocaleString()}
              </p>
              <Badge variant="secondary" className="text-xs mt-1">
                +8.3%
              </Badge>
            </div>

            <div className="text-center p-3 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-sm font-medium text-muted-foreground">Eficiencia</p>
              <p className="text-xl font-semibold text-amber-600 dark:text-amber-400">{summaryMetrics.eficiencia}%</p>
              <Badge variant="outline" className="text-xs mt-1">
                Óptimo
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default memo(PatientTrendsChart)