"use client"

import React, { useMemo, memo } from "react"
import {
  ArrowUp, ArrowDown, Users, Clock, TrendingUp, 
  Info, BarChart, PercentCircle, CheckCircle2, 
  XCircle, Activity, UserPlus, Calendar, RefreshCw,
  BarChart4
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
    icon: PercentCircle,
  },
  totalPacientes: {
    fuente: "Base de datos principal de pacientes",
    significado: "Número total de pacientes registrados en el sistema",
    description: "Pacientes Totales",
    icon: Users,
  },
  tiempoPromedioDecision: {
    fuente: "Análisis de registro de citas y seguimientos",
    significado: "Días promedio que toma un paciente en decidir sobre la cirugía",
    description: "Tiempo de Decisión",
    icon: Clock,
  },
  fuentePrincipalPacientes: {
    fuente: "Formularios de registro y análisis de marketing",
    significado: "Canal de adquisición de pacientes más efectivo",
    description: "Fuente Principal",
    icon: TrendingUp,
  },
  pacientesOperados: {
    fuente: "Registros quirúrgicos y procedimientos completados",
    significado: "Pacientes que han completado exitosamente su cirugía",
    description: "Pacientes Operados",
    icon: CheckCircle2,
  },
  pacientesNoOperados: {
    fuente: "Registros de seguimiento y decisiones de pacientes",
    significado: "Pacientes que decidieron posponer o declinar la cirugía",
    description: "Pacientes No Operados",
    icon: XCircle,
  },
  pacientesSeguimiento: {
    fuente: "Sistema CRM y seguimiento activo",
    significado: "Pacientes en proceso activo de toma de decisión",
    description: "En Seguimiento",
    icon: Activity,
  },
  pacientesNuevosMes: {
    fuente: "Citas registradas y consultas iniciales",
    significado: "Nuevos pacientes que se registraron en el período actual",
    description: "Nuevos Pacientes",
    icon: UserPlus,
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

const MetricIcon = memo(({ metricKey, ...props }: { metricKey: MetricKey } & React.SVGAttributes<SVGElement>) => {
  const IconComponent = METRIC_INFO[metricKey].icon
  return <IconComponent {...props} />
})

MetricIcon.displayName = "MetricIcon"

const MetricCardSkeleton = memo(() => (
  <Card className="border border-border/50">
    <CardHeader className="pb-2">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
    </CardHeader>
    <CardContent className="pb-2">
      <Skeleton className="h-8 w-16 mb-2" />
    </CardContent>
    <CardFooter>
      <Skeleton className="h-3 w-full" />
    </CardFooter>
  </Card>
))

MetricCardSkeleton.displayName = "MetricCardSkeleton"

const MetricCard = memo(({ metricKey, value, footerContent, badge, trend = "neutral" }: MetricCardProps) => {
  const { description, fuente, significado } = METRIC_INFO[metricKey]
  
  const trendConfig = useMemo(() => ({
    up: { 
      color: "text-emerald-600 dark:text-emerald-400", 
      icon: ArrowUp,
    },
    down: { 
      color: "text-red-600 dark:text-red-400", 
      icon: ArrowDown,
    },
    neutral: { 
      color: "text-muted-foreground", 
      icon: null,
    }
  }), [])[trend]

  return (
    <Dialog>
      <Card className="group border border-border/50 bg-card hover:border-border transition-colors duration-200">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {description}
            </CardTitle>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity duration-200"
              >
                <Info className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </div>
        </CardHeader>

        <CardContent className="pb-2">
          <div className="flex items-baseline gap-3">
            <div className="text-xl font-semibold text-foreground">
              {value}
            </div>
            {badge && <div>{badge}</div>}
          </div>
        </CardContent>

        <CardFooter className="pt-2 border-t border-border/30">
          <div className={`flex items-center gap-1 text-xs ${trendConfig.color}`}>
            {trendConfig.icon && <trendConfig.icon className="h-3 w-3" />}
            <span>{footerContent}</span>
          </div>
        </CardFooter>

        <div className="absolute top-4 right-12 opacity-30 group-hover:opacity-50 transition-opacity duration-200">
          <MetricIcon metricKey={metricKey} className="h-5 w-5" />
        </div>
      </Card>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-lg bg-muted">
              <MetricIcon metricKey={metricKey} className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                {description}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">Información detallada</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="text-2xl font-semibold mb-2">{value}</div>
              {badge && <div>{badge}</div>}
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-muted/30">
                <h4 className="font-medium mb-2">Fuente de Datos</h4>
                <p className="text-sm text-muted-foreground">{fuente}</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/30">
                <h4 className="font-medium mb-2">Significado</h4>
                <p className="text-sm text-muted-foreground">{significado}</p>
              </div>
            </div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
})

MetricCard.displayName = "MetricCard"

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

  const metricsData = useMemo(() => clinicMetrics ?? DEFAULT_METRICS, [clinicMetrics])

  const formatPercentage = useMemo(() => 
    (num: number, den: number) => den === 0 ? "0%" : `${Math.round((num / den) * 100)}%`,
  [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] bg-card border rounded-lg p-8 text-center">
        <div className="p-4 rounded-full bg-red-50 dark:bg-red-950/20 mb-6">
          <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <div className="space-y-3 max-w-md">
          <h3 className="text-lg font-semibold">Error al cargar métricas</h3>
          <p className="text-muted-foreground">
            No se pudieron obtener los datos del dashboard.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refresh}
          className="mt-6 gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-muted">
            <h1 className="text-xl font-semibold">Métricas de la Clínica</h1>
            <p className="text-muted-foreground">Resumen ejecutivo de rendimiento</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 h-auto p-2 rounded-md">
          <BarChart className="h-4 w-4" />
          <span className="text-sm font-medium">Visión General</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <MetricCard
            metricKey="totalPacientes"
            value={metricsData.totalPacientes}
            footerContent="Total de pacientes registrados"
            trend="neutral"
          />
          <MetricCard
            metricKey="pacientesNuevosMes"
            value={metricsData.pacientesNuevosMes}
            footerContent="Total de pacientes consultados"
            trend="neutral"
          />
          <MetricCard
            metricKey="pacientesOperados"
            value={metricsData.pacientesOperados}
            footerContent="Cirugías realizadas"
            trend="neutral"
          />
          <MetricCard
            metricKey="fuentePrincipalPacientes"
            value={metricsData.fuentePrincipalPacientes}
            footerContent="Canal más efectivo"
            badge={<Badge variant="outline">{metricsData.fuentePrincipalPacientes}</Badge>}
          />
        </div>
      )}
    </div>
  )
}

export default memo(DashboardMetrics)