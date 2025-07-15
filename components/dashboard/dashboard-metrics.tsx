"use client"

import React, { useMemo, memo } from "react"
import {
<<<<<<< HEAD
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
=======
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
  LucideProps,
} from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { useDashboard } from '@/contexts/dashboard-context';
import { format } from 'date-fns';

// --- Tipos y Constantes (Sin cambios) ---

export interface ClinicMetrics {
  totalPacientes: number;
  pacientesNuevosMes: number;
  pacientesOperados: number;
  pacientesNoOperados: number;
  pacientesSeguimiento: number;
  tasaConversion: number;
  tiempoPromedioDecision: number;
  fuentePrincipalPacientes: PatientOriginEnum;
  diagnosticosMasComunes: { tipo: string; cantidad: number }[];
}
>>>>>>> feature/nombre-de-la-feature

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
    <CardHeader className="pb-3">
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

<<<<<<< HEAD
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
=======
/**
 * Tarjeta de Métrica Memoizada y Optimizada para Responsividad.
 * - Usa `@container` para adaptar su contenido interno.
 * - El layout de Flexbox previene el desbordamiento de contenido.
 */
const MemoizedMetricCard = memo(function MetricCard({
  metricKey,
  value,
  footerContent,
  footerDetail,
}: MetricCardProps): JSX.Element {
  const info = metricInfo[metricKey];
>>>>>>> feature/nombre-de-la-feature

  return (
    <Dialog>
      <Card className="group border border-border/50 bg-card hover:border-border transition-colors duration-200">
        <CardHeader className="pb-3">
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
<<<<<<< HEAD

        <CardContent className="pb-3">
          <div className="flex items-baseline gap-3">
            <div className="text-2xl font-semibold text-foreground">
              {value}
            </div>
            {badge && <div>{badge}</div>}
          </div>
        </CardContent>

        <CardFooter className="pt-3 border-t border-border/30">
          <div className={`flex items-center gap-2 text-sm ${trendConfig.color}`}>
            {trendConfig.icon && <trendConfig.icon className="h-4 w-4" />}
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
=======
        {/* mt-auto empuja el footer hacia abajo, asegurando altura consistente */}
        <CardFooter className="flex-col items-start gap-1 text-xs pt-2 pb-3 px-4 mt-auto">
          <div className="flex items-center gap-1.5">{footerContent}</div>
          <div className="text-muted-foreground line-clamp-1">{footerDetail}</div>
        </CardFooter>

        {badge && <div className="absolute top-4 right-4">{badge}</div>}
      </Card>
      
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
               <MetricIcon metricKey={metricKey} className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-semibold">{description}</DialogTitle>
          </div>
          <DialogDescription as="div" className="space-y-4 text-sm">
            <div className="flex items-baseline gap-2 p-4 bg-muted rounded-lg">
              <span className="font-bold text-3xl text-primary">{value}</span>
              {badge && <span>{badge}</span>}
            </div>
            <div className="space-y-2 pt-2">
              <div>
                <span className="font-semibold text-foreground">Fuente de Datos:</span> 
                <span className="ml-2 text-muted-foreground">{fuente}</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">Significado:</span> 
                <span className="ml-2 text-muted-foreground">{significado}</span>
              </div>
              <div className="pt-3 text-xs text-muted-foreground italic">
                {footerDetail}
              </div>
            </div>
          </DialogDescription>
>>>>>>> feature/nombre-de-la-feature
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
<<<<<<< HEAD
      <div className="flex flex-col items-center justify-center min-h-[300px] bg-card border rounded-lg p-8 text-center">
        <div className="p-4 rounded-full bg-red-50 dark:bg-red-950/20 mb-6">
          <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
=======
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-6 w-40 rounded-full" />
>>>>>>> feature/nombre-de-la-feature
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

<<<<<<< HEAD
=======
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] rounded-xl bg-card border p-6 text-center">
        <div className="p-3 rounded-full bg-destructive/10 text-destructive mb-4">
          <XCircleIcon className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Error al Cargar Métricas</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          No pudimos obtener las métricas del dashboard.
        </p>
        <Button 
          variant="outline" 
          onClick={reloadData}
          aria-label="Reintentar cargar datos"
        >
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  // lastUpdated hook moved to the top of the component

>>>>>>> feature/nombre-de-la-feature
  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-muted">
            <BarChart4 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Métricas de la Clínica</h1>
            <p className="text-muted-foreground">Resumen ejecutivo de rendimiento</p>
          </div>
        </div>

<<<<<<< HEAD
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{lastUpdated}</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-muted/50 h-auto p-1">
            <TabsTrigger value="general" className="px-4 py-2 data-[state=active]:bg-background">
              <BarChart className="h-4 w-4 mr-2" />
              Visión General
            </TabsTrigger>
            <TabsTrigger value="pacientes" className="px-4 py-2 data-[state=active]:bg-background">
              <Users className="h-4 w-4 mr-2" />
              Análisis de Pacientes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

          <TabsContent value="pacientes" className="space-y-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <Badge variant="secondary" className="text-xs">
                    {formatPercentage(metricsData.pacientesOperados, metricsData.totalPacientes)}
                  </Badge>
                }
              />
              <MetricCard
                metricKey="pacientesSeguimiento"
                value={metricsData.pacientesSeguimiento.toLocaleString()}
                footerContent="Potenciales conversiones"
                badge={
                  <Badge variant="secondary" className="text-xs">
                    {formatPercentage(metricsData.pacientesSeguimiento, metricsData.totalPacientes)}
                  </Badge>
                }
              />
              <MetricCard
                metricKey="pacientesNoOperados"
                value={metricsData.pacientesNoOperados.toLocaleString()}
                footerContent="Oportunidad de re-contacto"
                badge={
                  <Badge variant="destructive" className="text-xs">
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
=======
        <TabsContent value="general">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6">
            <MetricCard
              metricKey="tasaConversion"
              value={`${(metricsData.tasaConversion * 100).toFixed(1)}%`}
              description="Tasa de Conversión"
              badge={<Badge variant="outline" className="text-xs">+5%</Badge>}
              footerContent="Mejora vs. mes anterior"
              footerDetail="Pacientes que deciden operarse"
            />
            <MemoizedMetricCard
              metricKey="totalPacientes"
              value={metricsData.totalPacientes.toLocaleString()}
              description="Pacientes Totales"
              badge={<UsersIcon className="h-5 w-5 text-muted-foreground" />}
              footerContent={`${metricsData.pacientesNuevosMes.toLocaleString()} nuevos este mes`}
              footerDetail="Base de datos histórica"
            />
            <MetricCard
              metricKey="tiempoPromedioDecision"
              value={`${metricsData.tiempoPromedioDecision} días`}
              description="Tiempo Promedio Decisión"
              badge={<ClockIcon className="h-5 w-5 text-muted-foreground" />}
              footerContent={<><ArrowDownIcon className="h-3 w-3 text-green-600" /> 2 días menos</>}
              footerDetail="vs. mes anterior"
            />
            <MetricCard
              metricKey="fuentePrincipalPacientes"
              value={String(metricsData.fuentePrincipalPacientes)}
              description="Fuente Principal"
              badge={<TrendingUpIcon className="h-4 w-4 text-muted-foreground" />}
              footerContent="Canal de adquisición más efectivo"
              footerDetail="Oportunidad de optimización"
            />
          </div>
        </TabsContent>

        <TabsContent value="pacientes">
          <div className={responsiveGridClasses}>
            <MemoizedMetricCard
              metricKey="pacientesOperados"
              value={metricsData.pacientesOperados.toLocaleString()}
              description="Pacientes Operados"
              badge={<Badge variant="outline" className="text-xs">{pct(metricsData.pacientesOperados, metricsData.totalPacientes)}</Badge>}
              footerContent="Del total de pacientes"
              footerDetail="Cirugías realizadas con éxito"
            />
            <MemoizedMetricCard
              metricKey="pacientesNoOperados"
              value={metricsData.pacientesNoOperados.toLocaleString()}
              description="Pacientes No Operados"
              badge={<Badge variant="outline" className="text-xs">{pct(metricsData.pacientesNoOperados, metricsData.totalPacientes)}</Badge>}
              footerContent="Del total de pacientes"
              footerDetail="Decidieron no operarse o posponer"
            />
            <MemoizedMetricCard
              metricKey="pacientesSeguimiento"
              value={metricsData.pacientesSeguimiento.toLocaleString()}
              description="En Seguimiento"
              badge={<Badge variant="outline" className="text-xs">{pct(metricsData.pacientesSeguimiento, metricsData.totalPacientes)}</Badge>}
              footerContent="Potenciales conversiones futuras"
              footerDetail="Pacientes en proceso de decisión"
            />
            <MemoizedMetricCard
              metricKey="pacientesNuevosMes"
              value={metricsData.pacientesNuevosMes.toLocaleString()}
              description="Nuevos Pacientes (Mes)"
              badge={<TrendingUpIcon className="h-4 w-4 text-muted-foreground" />}
              footerContent="Comparado con el mes anterior"
              footerDetail="Indicador de crecimiento actual"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DashboardMetrics;
>>>>>>> feature/nombre-de-la-feature
