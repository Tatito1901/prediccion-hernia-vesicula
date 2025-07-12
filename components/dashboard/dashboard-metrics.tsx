// app/dashboard/components/DashboardMetrics.tsx

import React from "react";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon,
  ClockIcon,
  TrendingUpIcon,
  InfoIcon,
  BarChart4Icon,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

// --- Tipos y Constantes (Movidas fuera para evitar recreación) ---

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

export enum PatientOriginEnum {
  GOOGLE = "Google",
  FACEBOOK = "Facebook",
  INSTAGRAM = "Instagram",
  REFERRAL = "Referral",
  OTHER = "Other",
}

// Información de métricas como constante estática
const METRIC_INFO = {
  tasaConversion: { fuente: "Cálculo interno", significado: "% de pacientes que deciden operarse" },
  totalPacientes: { fuente: "Base de datos", significado: "Pacientes registrados" },
  tiempoPromedioDecision: { fuente: "Registro de citas", significado: "Días hasta decidir cirugía" },
  fuentePrincipalPacientes: { fuente: "Formularios", significado: "Canal más común" },
  pacientesOperados: { fuente: "Registros quirúrgicos", significado: "Pacientes con cirugía" },
  pacientesNoOperados: { fuente: "Registros quirúrgicos", significado: "Pacientes sin cirugía" },
  pacientesSeguimiento: { fuente: "CRM", significado: "Pacientes en seguimiento" },
  pacientesNuevosMes: { fuente: "Citas", significado: "Pacientes nuevos este mes" },
} as const;

// Función pura para calcular porcentajes
const calculatePercentage = (numerator: number, denominator: number): string =>
  denominator === 0 ? "N/A" : `${Math.round((numerator / denominator) * 100)}%`;

// Métricas por defecto como constante
const DEFAULT_METRICS: ClinicMetrics = {
  totalPacientes: 0,
  pacientesNuevosMes: 0,
  pacientesOperados: 0,
  pacientesNoOperados: 0,
  pacientesSeguimiento: 0,
  tasaConversion: 0,
  tiempoPromedioDecision: 0,
  fuentePrincipalPacientes: PatientOriginEnum.OTHER,
  diagnosticosMasComunes: [],
};

// --- Componentes Simplificados ---

// Skeleton simplificado sin memoización innecesaria
function MetricCardSkeleton() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3 pt-4 px-4">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-8 w-1/2" />
      </CardHeader>
      <CardFooter className="flex-col items-start gap-2 pt-2 pb-3 px-4 mt-auto">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </CardFooter>
    </Card>
  );
}

// Tarjeta de métrica simplificada
function MetricCard({
  metricKey,
  value,
  description,
  badge,
  footerContent,
  footerDetail,
}: {
  metricKey: keyof typeof METRIC_INFO;
  value: string | number;
  description: string;
  badge?: React.ReactNode;
  footerContent: React.ReactNode;
  footerDetail: string;
}) {
  const info = METRIC_INFO[metricKey];

  return (
    <Dialog>
      <Card className="group relative flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/70 backdrop-blur-sm shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex justify-between items-start gap-2">
            <CardDescription className="text-xs sm:text-sm truncate min-w-0">{description}</CardDescription>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 bg-primary/10 text-primary hover:bg-primary/20">
                <InfoIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold tabular-nums">{value}</CardTitle>
          {badge && <div className="absolute right-4 top-16">{badge}</div>}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-xs pt-2 pb-3 px-4 mt-auto">
          <div className="flex items-center gap-1.5">{footerContent}</div>
          <div className="text-muted-foreground line-clamp-1">{footerDetail}</div>
        </CardFooter>
      </Card>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-2 mb-3">
            <BarChart4Icon className="h-5 w-5 text-primary" />
            <DialogTitle>{description}</DialogTitle>
          </div>
          <DialogDescription className="space-y-3 text-sm text-foreground">
            <span className="font-medium text-lg text-primary text-center block mb-3">{value}</span>
            <span className="block"><span className="font-semibold">Fuente:</span> {info.fuente}</span>
            <span className="block"><span className="font-semibold">Significado:</span> {info.significado}</span>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

// --- Componente Principal Optimizado ---

export function DashboardMetrics({ className }: { className?: string }) {
  const { loading, error, clinicMetrics } = useDashboard();

  // Estados de carga y error simplificados
  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-6">
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </div>
    );
  }

  if (!clinicMetrics) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center h-64 rounded-lg bg-muted/50">
        <p className="text-muted-foreground text-center">No hay datos de métricas disponibles en este momento.</p>
      </div>
    );
  }

  // Usar datos reales o fallback a defaults
  const metrics = clinicMetrics || DEFAULT_METRICS;

  return (
    <div className="p-4 sm:p-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 h-auto sm:w-auto sm:inline-flex">
          <TabsTrigger value="general" className="text-xs sm:text-sm">General</TabsTrigger>
          <TabsTrigger value="pacientes" className="text-xs sm:text-sm">Pacientes</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6">
            <MetricCard
              metricKey="tasaConversion"
              value={metrics.tasaConversion ? `${Math.round(metrics.tasaConversion * 100)}%` : '0%'}
              description="Tasa de Conversión"
              badge={<Badge variant="outline" className="text-xs">+5%</Badge>}
              footerContent="Mejora vs. mes anterior"
              footerDetail="Pacientes que deciden operarse"
            />
            <MetricCard
              metricKey="totalPacientes"
              value={metrics.totalPacientes.toLocaleString()}
              description="Pacientes Totales"
              badge={<UsersIcon className="h-5 w-5 text-muted-foreground" />}
              footerContent={`${metrics.pacientesNuevosMes.toLocaleString()} nuevos este mes`}
              footerDetail="Base de datos histórica"
            />
            <MetricCard
              metricKey="tiempoPromedioDecision"
              value={`${metrics.tiempoPromedioDecision} días`}
              description="Tiempo Promedio Decisión"
              badge={<ClockIcon className="h-5 w-5 text-muted-foreground" />}
              footerContent={<><ArrowDownIcon className="h-3 w-3 text-green-600" /> 2 días menos</>}
              footerDetail="vs. mes anterior"
            />
            <MetricCard
              metricKey="fuentePrincipalPacientes"
              value={String(metrics.fuentePrincipalPacientes)}
              description="Fuente Principal"
              badge={<TrendingUpIcon className="h-4 w-4 text-muted-foreground" />}
              footerContent={metrics.fuentePrincipalPacientes === 'No disponible' 
                ? "Configure canales de adquisición" 
                : "Canal de adquisición más efectivo"}
              footerDetail={metrics.fuentePrincipalPacientes === 'No disponible' 
                ? "Datos no disponibles" 
                : "Oportunidad de optimización"}
            />
          </div>
        </TabsContent>

        <TabsContent value="pacientes">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6">
            <MetricCard
              metricKey="pacientesOperados"
              value={metrics.pacientesOperados.toLocaleString()}
              description="Pacientes Operados"
              badge={<Badge variant="outline" className="text-xs">{calculatePercentage(metrics.pacientesOperados, metrics.totalPacientes)}</Badge>}
              footerContent="Del total de pacientes"
              footerDetail="Cirugías realizadas con éxito"
            />
            <MetricCard
              metricKey="pacientesNoOperados"
              value={metrics.pacientesNoOperados.toLocaleString()}
              description="Pacientes No Operados"
              badge={<Badge variant="outline" className="text-xs">{calculatePercentage(metrics.pacientesNoOperados, metrics.totalPacientes)}</Badge>}
              footerContent="Del total de pacientes"
              footerDetail="Decidieron no operarse o posponer"
            />
            <MetricCard
              metricKey="pacientesSeguimiento"
              value={metrics.pacientesSeguimiento.toLocaleString()}
              description="En Seguimiento"
              badge={<Badge variant="outline" className="text-xs">{calculatePercentage(metrics.pacientesSeguimiento, metrics.totalPacientes)}</Badge>}
              footerContent="Potenciales conversiones futuras"
              footerDetail="Pacientes en proceso de decisión"
            />
            <MetricCard
              metricKey="pacientesNuevosMes"
              value={metrics.pacientesNuevosMes.toLocaleString()}
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