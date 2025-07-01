// app/dashboard/components/DashboardMetrics.tsx
"use client";

import React, { useMemo, ReactNode, memo } from "react";
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

//#region Types
export type MetricDetail = {
  fuente: string;
  significado: string;
  [key: string]: string | undefined;
};

export type MetricKey = keyof typeof metricInfo;

interface MetricCardProps {
  metricKey: MetricKey;
  value: string | number;
  description: string;
  badge?: ReactNode;
  footerContent: ReactNode;
  footerDetail: string;
}

export interface DashboardMetricsProps {
  metrics?: ClinicMetrics;
  loading?: boolean;
}
//#endregion

//#region Constants
const metricInfo = {
  tasaConversion: { fuente: "Cálculo interno", significado: "% de pacientes que deciden operarse" },
  totalPacientes: { fuente: "Base de datos", significado: "Pacientes registrados" },
  tiempoPromedioDecision: { fuente: "Registro de citas", significado: "Días hasta decidir cirugía" },
  fuentePrincipalPacientes: { fuente: "Formularios", significado: "Canal más común" },
  pacientesOperados: { fuente: "Registros quirúrgicos", significado: "Pacientes con cirugía" },
  pacientesNoOperados: { fuente: "Registros quirúrgicos", significado: "Pacientes sin cirugía" },
  pacientesSeguimiento: { fuente: "CRM", significado: "Pacientes en seguimiento" },
  pacientesNuevosMes: { fuente: "Citas", significado: "Pacientes nuevos este mes" },
} as const;



const pct = (numerator: number, denominator: number): string =>
  denominator === 0 ? "N/A" : `${((numerator / denominator) * 100).toFixed(0)}%`;
//#endregion

//#region Skeleton
const MetricCardSkeleton = (): JSX.Element => (
  <Card className="flex flex-col justify-between">
    <CardHeader className="pb-3 pt-4 px-4">
      <div className="flex justify-between items-start gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
      <Skeleton className="h-7 w-1/2 mt-1" />
    </CardHeader>
    <CardFooter className="flex-col items-start gap-1 text-xs pt-2 pb-3 px-4">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-3/4" />
    </CardFooter>
  </Card>
);
//#endregion

//#region MetricCard
const MemoizedMetricCard = memo(function MetricCard({
  metricKey,
  value,
  description,
  badge,
  footerContent,
  footerDetail,
}: MetricCardProps): JSX.Element {
  const info = metricInfo[metricKey];

  return (
    <Dialog>
      <Card className="@container/card relative flex flex-col justify-between hover:shadow-lg transition-all">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex justify-between items-start gap-2">
            <CardDescription className="text-xs @[200px]/card:text-sm">{description}</CardDescription>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 bg-primary/10 text-primary hover:bg-primary/20">
                <InfoIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </div>
          <CardTitle className="text-xl @[220px]/card:text-2xl font-bold tabular-nums">{value}</CardTitle>
          {badge && <div className="absolute right-4 top-14">{badge}</div>}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-xs pt-2 pb-3 px-4">
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
}, (prev, next) => prev.value === next.value);

MemoizedMetricCard.displayName = "MetricCard";
//#endregion

//#region Main
export const DashboardMetrics = ({ metrics, loading = false }: DashboardMetricsProps): JSX.Element => {
  const DEFAULT_METRICS: ClinicMetrics = {
    totalPacientes: 0,
    pacientesNuevosMes: 0,
    pacientesOperados: 0,
    pacientesNoOperados: 0,
    pacientesSeguimiento: 0,
    tasaConversion: 0,
    tiempoPromedioDecision: 0,
    fuentePrincipalPacientes: PatientOriginEnum.GOOGLE,
    diagnosticosMasComunes: [],
  };
  const metricsData = useMemo(() => metrics ?? DEFAULT_METRICS, [metrics]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-4">
          <Skeleton className="h-10 w-40 sm:w-48" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 @3xl/main:grid-cols-3 @5xl/main:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <MetricCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center h-64">
        <p className="text-muted-foreground">No hay datos de métricas disponibles.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 @container/main">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-2 sm:inline-flex">
          <TabsTrigger value="general" className="text-xs sm:text-sm">General</TabsTrigger>
          <TabsTrigger value="pacientes" className="text-xs sm:text-sm">Pacientes</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 @3xl/main:grid-cols-3 @5xl/main:grid-cols-4">
            <MemoizedMetricCard
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
              footerDetail="Crecimiento constante de la base"
            />
            <MemoizedMetricCard
              metricKey="tiempoPromedioDecision"
              value={`${metricsData.tiempoPromedioDecision} días`}
              description="Tiempo Promedio Decisión"
              badge={<ClockIcon className="h-5 w-5 text-muted-foreground" />}
              footerContent={<><ArrowDownIcon className="h-3 w-3 text-green-600" /> 2 días menos</>}
              footerDetail="vs. mes anterior"
            />
            <MemoizedMetricCard
              metricKey="fuentePrincipalPacientes"
              value={String(metricsData.fuentePrincipalPacientes)}
              description="Fuente Principal"
              badge={<ArrowUpIcon className="h-4 w-4 text-muted-foreground" />}
              footerContent="Canal más efectivo"
              footerDetail="Optimizar inversión en marketing"
            />
          </div>
        </TabsContent>
        <TabsContent value="pacientes">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 @3xl/main:grid-cols-3 @5xl/main:grid-cols-4">
            <MemoizedMetricCard
              metricKey="pacientesOperados"
              value={metricsData.pacientesOperados.toLocaleString()}
              description="Pacientes Operados"
              badge={<Badge variant="outline" className="text-xs">{pct(metricsData.pacientesOperados, metricsData.totalPacientes)}</Badge>}
              footerContent="Del total de pacientes"
              footerDetail="Cirugías realizadas"
            />
            <MemoizedMetricCard
              metricKey="pacientesNoOperados"
              value={metricsData.pacientesNoOperados.toLocaleString()}
              description="Pacientes No Operados"
              badge={<Badge variant="outline" className="text-xs">{pct(metricsData.pacientesNoOperados, metricsData.totalPacientes)}</Badge>}
              footerContent="Del total de pacientes"
              footerDetail="Decidieron no operarse"
            />
            <MemoizedMetricCard
              metricKey="pacientesSeguimiento"
              value={metricsData.pacientesSeguimiento.toLocaleString()}
              description="En Seguimiento"
              badge={<Badge variant="outline" className="text-xs">{pct(metricsData.pacientesSeguimiento, metricsData.totalPacientes)}</Badge>}
              footerContent="Potenciales conversiones"
              footerDetail="Pacientes en decisión"
            />
            <MemoizedMetricCard
              metricKey="pacientesNuevosMes"
              value={metricsData.pacientesNuevosMes.toLocaleString()}
              description="Nuevos Pacientes (Mes)"
              badge={<TrendingUpIcon className="h-4 w-4 text-muted-foreground" />}
              footerContent="Este mes vs. anterior"
              footerDetail="Crecimiento en adquisición"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
//#endregion

export default DashboardMetrics;
