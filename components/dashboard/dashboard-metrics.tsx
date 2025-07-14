"use client"

import React, { useMemo, memo } from "react"
import {
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon,
  ClockIcon,
  TrendingUpIcon,
  InfoIcon,
  BarChart4Icon,
  PercentIcon,
  CheckCircleIcon,
  XCircleIcon,
  ActivityIcon,
  UserPlusIcon,
  CalendarIcon,
  RefreshCwIcon,
  type LucideProps,
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboard } from "@/contexts/dashboard-context"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export enum PatientOriginEnum {
  GOOGLE = "Google",
  FACEBOOK = "Facebook",
  INSTAGRAM = "Instagram",
  REFERRAL = "Referencia",
  OTHER = "Otro",
}

export interface ClinicMetrics {
  totalPacientes: number
  pacientesNuevosMes: number
  pacientesOperados: number
  pacientesNoOperados: number
  pacientesSeguimiento: number
  tasaConversion: number
  tiempoPromedioDecision: number
  fuentePrincipalPacientes: PatientOriginEnum
  lastUpdated?: string | number | Date
}

const METRIC_INFO = {
  tasaConversion: {
    fuente: "Cálculo interno basado en conversiones",
    significado: "Porcentaje de pacientes que deciden operarse del total consultado",
    description: "Tasa de Conversión",
    category: "performance",
  },
  totalPacientes: {
    fuente: "Base de datos principal de pacientes",
    significado: "Número total de pacientes registrados en el sistema",
    description: "Pacientes Totales",
    category: "volume",
  },
  tiempoPromedioDecision: {
    fuente: "Análisis de registro de citas y seguimientos",
    significado: "Días promedio que toma un paciente en decidir sobre la cirugía",
    description: "Tiempo de Decisión",
    category: "efficiency",
  },
  fuentePrincipalPacientes: {
    fuente: "Formularios de registro y análisis de marketing",
    significado: "Canal de adquisición de pacientes más efectivo",
    description: "Fuente Principal",
    category: "acquisition",
  },
  pacientesOperados: {
    fuente: "Registros quirúrgicos y procedimientos completados",
    significado: "Pacientes que han completado exitosamente su cirugía",
    description: "Pacientes Operados",
    category: "success",
  },
  pacientesNoOperados: {
    fuente: "Registros de seguimiento y decisiones de pacientes",
    significado: "Pacientes que decidieron posponer o declinar la cirugía",
    description: "Pacientes No Operados",
    category: "opportunity",
  },
  pacientesSeguimiento: {
    fuente: "Sistema CRM y seguimiento activo",
    significado: "Pacientes en proceso activo de toma de decisión",
    description: "En Seguimiento",
    category: "pipeline",
  },
  pacientesNuevosMes: {
    fuente: "Citas registradas y consultas iniciales",
    significado: "Nuevos pacientes que se registraron en el período actual",
    description: "Nuevos Pacientes",
    category: "growth",
  },
} as const

export type MetricKey = keyof typeof METRIC_INFO

interface MetricCardProps {
  metricKey: MetricKey
  value: string | number
  footerContent: React.ReactNode
  badge?: React.ReactNode
  trend?: "up" | "down" | "neutral"
}

const MetricIcon = memo(({ metricKey, ...props }: { metricKey: MetricKey } & LucideProps) => {
  const IconComponent = useMemo(
    () =>
      ({
        tasaConversion: PercentIcon,
        totalPacientes: UsersIcon,
        tiempoPromedioDecision: ClockIcon,
        fuentePrincipalPacientes: TrendingUpIcon,
        pacientesOperados: CheckCircleIcon,
        pacientesNoOperados: XCircleIcon,
        pacientesSeguimiento: ActivityIcon,
        pacientesNuevosMes: UserPlusIcon,
      })[metricKey],
    [metricKey],
  )

  return <IconComponent {...props} />
})

const MetricCardSkeleton = memo(() => (
  <Card className="relative overflow-hidden border-0 bg-background shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
    </CardHeader>
    <CardContent className="pb-2">
      <Skeleton className="h-10 w-24 mb-2" />
    </CardContent>
    <CardFooter className="pt-4 border-t border-border/20">
      <div className="space-y-2 w-full">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </CardFooter>
  </Card>
))

const MetricCard = memo(({ metricKey, value, footerContent, badge, trend = "neutral" }: MetricCardProps) => {
  const { description, fuente, significado, category } = METRIC_INFO[metricKey]

  const trendConfig = useMemo(
    () =>
      ({
        up: {
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
          Icon: ArrowUpIcon,
        },
        down: {
          color: "text-red-600",
          bgColor: "bg-red-50",
          Icon: ArrowDownIcon,
        },
        neutral: {
          color: "text-muted-foreground",
          bgColor: "bg-muted/20",
          Icon: null,
        },
      })[trend],
    [trend],
  )

  const categoryColors = useMemo(
    () =>
      ({
        performance: "border-blue-200",
        volume: "border-purple-200",
        efficiency: "border-emerald-200",
        acquisition: "border-amber-200",
        success: "border-green-200",
        opportunity: "border-red-200",
        pipeline: "border-cyan-200",
        growth: "border-violet-200",
      })[category],
    [category],
  )

  return (
    <Dialog>
      <Card
        className={`relative overflow-hidden border bg-background shadow-sm hover:shadow-md transition-all duration-300 group ${categoryColors}`}
      >
        <CardHeader className="pb-3 relative">
          <div className="flex justify-between items-start">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {description}
            </CardTitle>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary rounded-full opacity-80 group-hover:opacity-100 transition-all duration-200"
                aria-label={`Información sobre ${description}`}
              >
                <InfoIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </div>
        </CardHeader>

        <CardContent className="pb-2 relative">
          <div className="flex items-baseline gap-3">
            <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
            {badge && <div className="flex-shrink-0">{badge}</div>}
          </div>
        </CardContent>

        <CardFooter className="pt-4 border-t border-border/20 relative">
          <div
            className={`flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-1.5 ${trendConfig.bgColor} ${trendConfig.color} w-full`}
          >
            {trendConfig.Icon && <trendConfig.Icon className="h-4 w-4 flex-shrink-0" />}
            <span className="truncate">{footerContent}</span>
          </div>
        </CardFooter>

        <div className="absolute top-4 right-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <MetricIcon metricKey={metricKey} className="h-5 w-5" />
          </div>
        </div>
      </Card>

      <DialogContent className="sm:max-w-lg rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <MetricIcon metricKey={metricKey} className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">{description}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Información detallada</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-xl border border-border">
              <div className="text-3xl font-bold text-primary tabular-nums">{value}</div>
              {badge && <div className="flex-shrink-0">{badge}</div>}
            </div>

            <div className="grid gap-3">
              <div className="p-4 rounded-lg bg-muted/20 border border-border">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Fuente de Datos
                </h4>
                <p className="text-muted-foreground text-sm">{fuente}</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/20 border border-border">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <InfoIcon className="h-4 w-4 text-primary" />
                  Significado
                </h4>
                <p className="text-muted-foreground text-sm">{significado}</p>
              </div>
            </div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
})

const DEFAULT_METRICS: ClinicMetrics = {
  totalPacientes: 0,
  pacientesNuevosMes: 0,
  pacientesOperados: 0,
  pacientesNoOperados: 0,
  pacientesSeguimiento: 0,
  tasaConversion: 0,
  tiempoPromedioDecision: 0,
  fuentePrincipalPacientes: PatientOriginEnum.OTHER,
}

export function DashboardMetrics() {
  const { loading, error, clinicMetrics, refresh } = useDashboard()

  const lastUpdated = useMemo(() => {
    if (!clinicMetrics?.lastUpdated) return "Actualizando..."
    try {
      const date = new Date(clinicMetrics.lastUpdated)
      return isNaN(date.getTime())
        ? "Actualizando..."
        : `Actualizado: ${format(date, "dd 'de' MMMM, yyyy HH:mm", { locale: es })}`
    } catch {
      return "Actualizando..."
    }
  }, [clinicMetrics?.lastUpdated])

  const metricsData = clinicMetrics ?? DEFAULT_METRICS

  const formatPercentage = (num: number, den: number) => (den === 0 ? "0%" : `${Math.round((num / den) * 100)}%`)

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] rounded-xl bg-background border p-6 text-center">
        <div className="mb-6">
          <div className="p-6 rounded-full bg-red-100">
            <XCircleIcon className="h-12 w-12 text-red-600" />
          </div>
        </div>
        <div className="space-y-3 max-w-md">
          <h3 className="text-xl font-bold text-foreground">Error al cargar métricas</h3>
          <p className="text-muted-foreground">
            No se pudieron obtener los datos del dashboard. Por favor, verifica tu conexión.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refresh}
          aria-label="Reintentar cargar datos"
          className="mt-6 gap-2"
        >
          <RefreshCwIcon className="h-4 w-4" />
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
            <BarChart4Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Métricas de la Clínica</h1>
            <p className="text-muted-foreground">Resumen ejecutivo de rendimiento</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-muted/20 rounded-full border border-border">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">{lastUpdated}</span>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-muted/20 p-1 rounded-lg border border-border">
            <TabsTrigger
              value="general"
              className="px-4 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <BarChart4Icon className="h-4 w-4" />
                <span>Visión General</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="pacientes"
              className="px-4 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                <span>Análisis de Pacientes</span>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                metricKey="tasaConversion"
                value={`${(metricsData.tasaConversion * 100).toFixed(1)}%`}
                footerContent="Mejora vs. mes anterior"
                trend="up"
              />
              <MetricCard
                metricKey="tiempoPromedioDecision"
                value={`${metricsData.tiempoPromedioDecision} días`}
                footerContent="Reducción de 2 días"
                trend="down"
              />
              <MetricCard
                metricKey="pacientesNuevosMes"
                value={metricsData.pacientesNuevosMes.toLocaleString()}
                footerContent="+15% vs mes anterior"
                trend="up"
              />
              <MetricCard
                metricKey="fuentePrincipalPacientes"
                value={metricsData.fuentePrincipalPacientes}
                footerContent="Canal más efectivo"
              />
            </div>
          </TabsContent>

          <TabsContent value="pacientes">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                metricKey="totalPacientes"
                value={metricsData.totalPacientes.toLocaleString()}
                footerContent={`${metricsData.pacientesNuevosMes.toLocaleString()} nuevos este mes`}
              />
              <MetricCard
                metricKey="pacientesOperados"
                value={metricsData.pacientesOperados.toLocaleString()}
                footerContent="Del total de pacientes"
                badge={
                  <Badge variant="secondary">
                    {formatPercentage(metricsData.pacientesOperados, metricsData.totalPacientes)}
                  </Badge>
                }
              />
              <MetricCard
                metricKey="pacientesSeguimiento"
                value={metricsData.pacientesSeguimiento.toLocaleString()}
                footerContent="Potenciales conversiones"
                badge={
                  <Badge variant="secondary">
                    {formatPercentage(metricsData.pacientesSeguimiento, metricsData.totalPacientes)}
                  </Badge>
                }
              />
              <MetricCard
                metricKey="pacientesNoOperados"
                value={metricsData.pacientesNoOperados.toLocaleString()}
                footerContent="Oportunidad de re-contacto"
                badge={
                  <Badge variant="destructive">
                    {formatPercentage(metricsData.pacientesNoOperados, metricsData.totalPacientes)}
                  </Badge>
                }
                trend="down"
              />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

export default memo(DashboardMetrics)