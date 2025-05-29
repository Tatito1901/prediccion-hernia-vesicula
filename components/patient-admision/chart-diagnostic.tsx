import React, { useMemo, memo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppContext } from '@/lib/context/app-context'
import { DiagnosisChart } from '@/components/charts/diagnosis-chart'
import { DiagnosisTimelineChart } from '@/components/charts/diagnosis-timeline-chart'
import { Activity, PieChart, ChartLine, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'

// Tipos mejorados con readonly
export type LocalDiagnosisCategory = 
  | 'Hernia Inguinal' 
  | 'Hernia Umbilical' 
  | 'Hernia Incisional'
  | 'Vesícula'
  | 'Colelitiasis'
  | 'Hernia Hiatal'
  | 'Lipoma Grande'
  | 'Hernia Inguinal Recidivante'
  | 'Quiste Sebáceo Infectado'
  | 'Eventración Abdominal'
  | 'Vesícula (Colecistitis Crónica)'
  | 'Apendicitis'
  | 'Otro'

export interface DiagnosisData {
  readonly tipo: LocalDiagnosisCategory
  readonly cantidad: number
}

export interface DiagnosisMetrics {
  readonly totalPacientes: number
  readonly totalHernias: number
  readonly totalVesicula: number
  readonly diagnosticosMasComunes: readonly DiagnosisData[]
  readonly distribucionHernias: readonly DiagnosisData[]
  readonly porcentajeHernias: number
  readonly porcentajeVesicula: number
  readonly ratioHerniaVesicula: number
  readonly tendencia?: 'up' | 'down' | 'stable'
}

interface PatientData {
  readonly id: string
  readonly fechaConsulta?: string
  readonly diagnostico?: string
  readonly nombre?: string
  readonly apellidos?: string
  readonly edad?: number
  readonly telefono?: string
  readonly estado?: string
}

interface MetricCardProps {
  readonly title: string
  readonly value: string | number
  readonly subtitle: string
  readonly icon: React.ReactNode
  readonly borderColor: string
  readonly trend?: 'up' | 'down' | 'stable'
  readonly previousValue?: number
  readonly loading?: boolean
}

// Componente de tarjeta métrica optimizado
const MetricCard = memo<MetricCardProps>(({ 
  title, 
  value, 
  subtitle, 
  icon, 
  borderColor,
  trend,
  previousValue,
  loading = false
}) => {
  if (loading) {
    return (
      <Card className="border-l-4 animate-pulse">
        <CardContent className="p-6">
          <div className="flex justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const trendIcon = trend === 'up' ? (
    <TrendingUp className="h-3 w-3 text-green-500" />
  ) : trend === 'down' ? (
    <TrendingDown className="h-3 w-3 text-red-500" />
  ) : null

  return (
    <Card className={cn(
      "border-l-4 hover:shadow-md transition-all duration-300",
      borderColor
    )}>
      <CardContent className="p-6">
        <div className="flex justify-between">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{title}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                {value}
              </p>
              {trendIcon}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
            {previousValue !== undefined && (
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                Anterior: {previousValue}
              </p>
            )}
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 h-12 w-12 rounded-full flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

MetricCard.displayName = "MetricCard"

// Categorías de hernias predefinidas
const HERNIA_CATEGORIES = [
  'Hernia Inguinal',
  'Hernia Umbilical',
  'Hernia Incisional',
  'Hernia Hiatal',
  'Hernia Inguinal Recidivante'
] as const

const VESICULA_CATEGORIES = [
  'Vesícula',
  'Vesícula (Colecistitis Crónica)',
  'Colelitiasis'
] as const

// Función helper para clasificar diagnósticos
const classifyDiagnosis = (diagnosis: string): LocalDiagnosisCategory => {
  if (HERNIA_CATEGORIES.includes(diagnosis as any)) {
    return diagnosis as LocalDiagnosisCategory
  }
  
  if (VESICULA_CATEGORIES.includes(diagnosis as any)) {
    return 'Vesícula'
  }
  
  if (diagnosis === 'Apendicitis') return 'Apendicitis'
  
  if (['Lipoma Grande', 'Quiste Sebáceo Infectado', 'Eventración Abdominal'].includes(diagnosis)) {
    return diagnosis as LocalDiagnosisCategory
  }
  
  if (diagnosis.toLowerCase().includes('colelitiasis')) {
    return 'Colelitiasis'
  }
  
  return 'Otro'
}

// Helper para generar datos de línea de tiempo optimizado
const generateTimelineData = (
  patients: readonly PatientData[]
): Array<{ date: string; cantidad: number }> => {
  const dateMap = new Map<string, number>()
  
  patients.forEach(patient => {
    if (patient.fechaConsulta && patient.diagnostico) {
      const date = new Date(patient.fechaConsulta).toLocaleDateString()
      dateMap.set(date, (dateMap.get(date) || 0) + 1)
    }
  })
  
  return Array.from(dateMap.entries())
    .map(([date, cantidad]) => ({ date, cantidad }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export const ChartDiagnostic = memo(() => {
  const { patients, isLoadingPatients } = useAppContext()

  // Cálculo optimizado de métricas con memoización
  const metrics = useMemo<DiagnosisMetrics>(() => {
    // Ensure patients is an array before processing
    const patientsArray = Array.isArray(patients) ? patients : []
    const totalPacientes = patientsArray.length
    
    if (totalPacientes === 0) {
      return {
        totalPacientes: 0,
        totalHernias: 0,
        totalVesicula: 0,
        diagnosticosMasComunes: [],
        distribucionHernias: [],
        porcentajeHernias: 0,
        porcentajeVesicula: 0,
        ratioHerniaVesicula: 0,
        tendencia: 'stable'
      }
    }

    // Usar Map para conteo eficiente
    const countsMap = new Map<LocalDiagnosisCategory, number>()
    
    patientsArray.forEach(patient => {
      const diagnosis = patient.diagnostico
      if (!diagnosis) return
      
      const category = classifyDiagnosis(diagnosis)
      countsMap.set(category, (countsMap.get(category) || 0) + 1)
    })

    // Calcular totales de hernias
    const totalHernias = HERNIA_CATEGORIES.reduce(
      (sum, cat) => sum + (countsMap.get(cat) || 0), 
      0
    )
    
    // Calcular totales de vesícula (considerar todas las categorías)
    const totalVesicula = VESICULA_CATEGORIES.reduce(
      (sum, cat) => sum + (countsMap.get(cat as any) || 0),
      0
    ) + (countsMap.get('Colelitiasis') || 0)

    // Convertir a array y ordenar
    const diagnosticosMasComunes = Array.from(countsMap.entries())
      .map(([tipo, cantidad]) => ({ tipo, cantidad }))
      .filter(item => item.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad)

    // Distribución de hernias
    const distribucionHernias = HERNIA_CATEGORIES
      .map(tipo => ({ tipo, cantidad: countsMap.get(tipo) || 0 }))
      .filter(item => item.cantidad > 0)

    return {
      totalPacientes,
      totalHernias,
      totalVesicula,
      diagnosticosMasComunes,
      distribucionHernias,
      porcentajeHernias: Math.round((totalHernias / totalPacientes) * 100),
      porcentajeVesicula: Math.round((totalVesicula / totalPacientes) * 100),
      ratioHerniaVesicula: totalVesicula > 0 
        ? parseFloat((totalHernias / totalVesicula).toFixed(1))
        : 0,
      tendencia: 'stable' // Podría calcularse comparando con período anterior
    }
  }, [patients])

  // Datos de línea de tiempo memoizados
  const timelineData = useMemo(() => {
    // Ensure patients is an array before processing
    const patientsArray = Array.isArray(patients) ? patients : []
    return generateTimelineData(patientsArray)
  }, [patients])

  // Datos de proporción para visualización
  const proportionData = useMemo(() => [
    { 
      label: 'Hernias', 
      value: metrics.porcentajeHernias, 
      colorClass: 'bg-blue-500' 
    },
    { 
      label: 'Vesícula', 
      value: metrics.porcentajeVesicula, 
      colorClass: 'bg-green-500' 
    },
    { 
      label: 'Otros', 
      value: 100 - metrics.porcentajeHernias - metrics.porcentajeVesicula, 
      colorClass: 'bg-gray-500' 
    }
  ], [metrics.porcentajeHernias, metrics.porcentajeVesicula])

  const handleTabChange = useCallback((value: string) => {
    // Analytics o logging
    console.log('Tab changed to:', value)
  }, [])

  return (
    <div className="space-y-6">
      {/* Encabezado responsivo */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <Activity className="h-6 w-6 text-primary" />
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
          Diagnósticos
        </h2>
        <span className="text-sm text-slate-600 dark:text-slate-400 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
          {metrics.totalPacientes} pacientes
        </span>
      </div>

      {/* Métricas principales responsivas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Hernias"
          value={metrics.totalHernias}
          subtitle={`${metrics.porcentajeHernias}% del total`}
          icon={<PieChart className="h-6 w-6" />}
          borderColor="border-l-blue-500"
          trend="stable"
          loading={isLoadingPatients}
        />
        <MetricCard
          title="Vesícula"
          value={metrics.totalVesicula}
          subtitle={`${metrics.porcentajeVesicula}% del total`}
          icon={<PieChart className="h-6 w-6" />}
          borderColor="border-l-green-500"
          trend="stable"
          loading={isLoadingPatients}
        />
        <MetricCard
          title="Ratio H:V"
          value={metrics.ratioHerniaVesicula.toFixed(1)}
          subtitle="Hernias por caso de vesícula"
          icon={<Activity className="h-6 w-6" />}
          borderColor="border-l-purple-500"
          trend="stable"
          loading={isLoadingPatients}
        />
      </div>

      {/* Pestañas responsivas */}
      <Tabs 
        defaultValue="distribucion" 
        className="w-full"
        onValueChange={handleTabChange}
      >
        <TabsList className="grid grid-cols-2 w-full bg-slate-100 dark:bg-slate-800">
          <TabsTrigger
            value="distribucion"
            className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
          >
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Distribución</span>
            <span className="sm:hidden">Dist.</span>
          </TabsTrigger>
          <TabsTrigger
            value="tendencia"
            className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
          >
            <ChartLine className="h-4 w-4" />
            <span className="hidden sm:inline">Tendencia</span>
            <span className="sm:hidden">Tend.</span>
          </TabsTrigger>
        </TabsList>

        {/* Contenido de distribución */}
        <TabsContent value="distribucion">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="lg:col-span-2 border-blue-100 dark:border-slate-700 hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-blue-950">
                <CardTitle className="text-blue-800 dark:text-blue-300">
                  Distribución de Diagnósticos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPatients ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">Cargando datos...</p>
                    </div>
                  </div>
                ) : (
                  <DiagnosisChart
                    data={metrics.diagnosticosMasComunes as DiagnosisData[]}
                    title="Desglose por tipo de diagnóstico"
                  />
                )}
              </CardContent>
            </Card>

            {metrics.distribucionHernias.length > 0 && (
              <Card className="border-blue-100 dark:border-slate-700 hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-blue-950">
                  <CardTitle className="text-blue-800 dark:text-blue-300">
                    Distribución de Tipos de Hernia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {isLoadingPatients ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      </div>
                    ) : (
                      <DiagnosisChart
                        data={metrics.distribucionHernias as DiagnosisData[]}
                        totalLabel="Distribución de Hernias"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Proporciones con animación */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Proporciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {proportionData.map(({ label, value, colorClass }) => (
                <div key={label} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{label}</span>
                    <span className="text-sm font-medium">{value}%</span>
                  </div>
                  <Progress value={value} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contenido de tendencia */}
        <TabsContent value="tendencia">
          <Card className="border-blue-100 dark:border-slate-700 hover:shadow-md transition-all duration-300">
            <CardHeader>
              <CardTitle>Tendencia Temporal</CardTitle>
              <CardDescription>
                Evolución de diagnósticos en el tiempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPatients ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : timelineData.length > 0 ? (
                <DiagnosisTimelineChart
                  data={timelineData}
                  className="h-[300px]"
                  // Add any additional required props here
                  yAxisLabel="Cantidad"
                  xAxisLabel="Fecha"
                />
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-muted-foreground">No hay datos disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Fecha de actualización */}
      <div className="text-xs text-muted-foreground text-right">
        Actualizado: {new Date().toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    </div>
  )
})

ChartDiagnostic.displayName = "ChartDiagnostic"

export default ChartDiagnostic