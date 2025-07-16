
import { useMemo, memo, useState, useEffect } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useDashboard } from "@/contexts/dashboard-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, TrendingUp, Activity, Users } from "lucide-react"

// Utilizamos los valores de DateRange directamente desde el contexto en vez de un enum local

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // Calcular el ratio para este punto específico
    const consultas = payload.find((p: any) => p.name === "Nuevos Pacientes")?.value || 0
    const operados = payload.find((p: any) => p.name === "Pacientes Operados")?.value || 0
    const ratioValue = consultas > 0 ? operados / consultas : 0
    const ratio = `${ratioValue.toFixed(2)} (${(ratioValue * 100).toFixed(1)}%)`
    
    return (
      <div className="bg-white/95 dark:bg-black/95 border shadow-sm rounded-lg px-3 py-2 text-sm">
        <p className="font-medium">{label}</p>
        <div className="grid grid-cols-1 gap-y-1 mt-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">{entry.value}</span>
            </div>
          ))}
          {/* Añadir el ratio para este punto específico */}
          <div className="flex items-center gap-2 mt-1 pt-1 border-t">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Ratio:</span>
            <span className="font-medium">{ratio}</span>
          </div>
        </div>
      </div>
    )
  }

  return null
};

CustomTooltip.displayName = 'CustomTooltip';

export const PatientTrendsChart: React.FC = () => {
  const { loading, error, chart, dateRange, setDateRange } = useDashboard()
  


  const { chartData, metrics } = useMemo(() => {
    if (!chart?.series || !chart.categories) {
      return { chartData: [], metrics: { pacientes: 0, operados: 0, ratio: "0.0" } }
    }

    const consultasSeries = chart.series.find(s => s.name === "Consultas")
    const operadosSeries = chart.series.find(s => s.name === "Operados")

    if (!consultasSeries || !operadosSeries) {
      return { chartData: [], metrics: { pacientes: 0, operados: 0, ratio: "0.0" } }
    }

    const data = chart.categories.map((category, index) => ({
      date: category,
      label: category,
      pacientes: consultasSeries.data[index] || 0,
      operados: operadosSeries.data[index] || 0,
    }))

    const pacientesTotal = consultasSeries.data.reduce((sum, val) => sum + val, 0)
    const operadosTotal = operadosSeries.data.reduce((sum, val) => sum + val, 0)
    const ratioValue = pacientesTotal > 0 ? operadosTotal / pacientesTotal : 0
    const ratio = `${ratioValue.toFixed(2)} (${(ratioValue * 100).toFixed(1)}%)`

    return { chartData: data, metrics: { pacientes: pacientesTotal, operados: operadosTotal, ratio, ratioValue } }
  }, [chart])

  if (loading) {
    return (
      <Card className="border border-border/50">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/2 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Error al Cargar Datos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[350px] text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-semibold">No se pudieron obtener las tendencias.</p>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!chartData.length) {
    return (
      <Card className="border border-border/50">
        <CardContent className="flex flex-col items-center justify-center h-[450px] text-center p-6 space-y-4">
          <div className="p-4 rounded-full bg-muted">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Sin datos disponibles</h3>
            <p className="text-muted-foreground max-w-md">
              No hay suficientes datos para mostrar tendencias en el período seleccionado.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold">
            <div className="p-2 rounded-lg bg-muted">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
            Tendencia de Pacientes
          </CardTitle>
          <Tabs
            value={dateRange}
            onValueChange={(value) => {
              setDateRange(value as '7d' | '30d' | '90d' | 'ytd')
              // La animación se manejará en el efecto
            }}
            className="w-full md:w-auto"
          >
            <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 h-auto gap-1">
              <TabsTrigger value="7d" className="px-2 py-1 text-xs sm:text-sm">7D</TabsTrigger>
              <TabsTrigger value="30d" className="px-2 py-1 text-xs sm:text-sm">30D</TabsTrigger>
              <TabsTrigger value="90d" className="px-2 py-1 text-xs sm:text-sm">90D</TabsTrigger>
              <TabsTrigger value="ytd" className="px-2 py-1 text-xs sm:text-sm">Año</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex justify-center">
            <div className={`text-center p-4 rounded-lg border min-w-[250px] transition-all duration-300 ${loading ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50' : 'bg-muted/30 border-border/50'}`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-sm font-medium text-muted-foreground">Ratio de Efectividad</span>
              </div>
              <p className="text-2xl font-semibold">
                {loading ? (
                  <span className="inline-block animate-pulse">...</span>
                ) : (
                  metrics.ratio
                )}
              </p>
              <p className="text-xs text-muted-foreground">Operados por consulta | {`Período: ${dateRange}`}</p>
            </div>
          </div>
          <div className="h-[300px] md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="pacientesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="operadosGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  className="fill-muted-foreground"
                  interval="preserveStartEnd"
                />
                <YAxis width={35} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
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
      </CardContent>
    </Card>
  )
}

export default memo(PatientTrendsChart);