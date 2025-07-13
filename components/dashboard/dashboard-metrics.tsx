// app/dashboard/components/DashboardMetrics.tsx

import React, { useMemo, ReactNode, memo } from "react";
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

export enum PatientOriginEnum {
  GOOGLE = "Google",
  FACEBOOK = "Facebook",
  INSTAGRAM = "Instagram",
  REFERRAL = "Referral",
  OTHER = "Other",
}

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
  loading?: boolean;
}

export interface DashboardMetricsProps {
  metrics?: ClinicMetrics;
  loading?: boolean;
}

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

// --- Componentes de UI Refactorizados ---

/**
 * Skeleton para la tarjeta de métrica.
 * Se ha simplificado para asegurar consistencia visual.
 */
const MetricCardSkeleton = (): JSX.Element => (
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

  return (
    <Dialog>
      <Card className="@container/card relative flex flex-col justify-between hover:shadow-lg transition-all duration-300 ease-in-out">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex justify-between items-start gap-2">
            {/* El min-w-0 es crucial para que text-truncation funcione en flexbox */}
            <CardDescription className="text-xs @[180px]/card:text-sm truncate min-w-0">{description}</CardDescription>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 bg-primary/10 text-primary hover:bg-primary/20">
                <InfoIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </div>
          <CardTitle className="text-xl @[210px]/card:text-2xl font-bold tabular-nums">{value}</CardTitle>
          {badge && <div className="absolute right-4 top-16">{badge}</div>}
        </CardHeader>
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
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}, (prev, next) => prev.value === next.value && prev.loading === next.loading); // Añadido `loading` a la comparación

MemoizedMetricCard.displayName = "MetricCard";

// --- Componente Principal con Responsividad Robusta ---

export function DashboardMetrics({
  className,
}: {
  className?: string;
}) {
  // Use the centralized dashboard context instead of making a separate API call
  const {
    loading,
    error,
    clinicMetrics,
    generalStats,
    dateRange,
  } = useDashboard();

  const DEFAULT_METRICS: ClinicMetrics = useMemo(() => ({
    totalPacientes: 0,
    pacientesNuevosMes: 0,
    pacientesOperados: 0,
    pacientesNoOperados: 0,
    pacientesSeguimiento: 0,
    tasaConversion: 0,
    tiempoPromedioDecision: 0,
    fuentePrincipalPacientes: PatientOriginEnum.OTHER,
    diagnosticosMasComunes: [],
  }), []);

  // Define lastUpdated using useMemo before any conditional returns
  const lastUpdated = useMemo(() => {
    if (clinicMetrics?.lastUpdated) {
      try {
        const date = new Date(clinicMetrics.lastUpdated);
        if (!isNaN(date.getTime())) {
          return `Actualizado: ${format(date, 'dd/MM/yyyy HH:mm')}`;
        }
      } catch (e) {
        // Handle error silently in production
        if (process.env.NODE_ENV === 'development') {
          console.error('Error al formatear fecha de actualización:', e);
        }
      }
    }
    return 'Actualizado recientemente';
  }, [clinicMetrics?.lastUpdated]);
  
  const metricsData = clinicMetrics ?? DEFAULT_METRICS;

  /**
   * MEJORA DE RESPONSIVIDAD #1: Grid Fluido
   * En lugar de breakpoints fijos (sm, md, lg), usamos `auto-fit`.
   * El grid creará tantas columnas como quepan, con un mínimo de 280px.
   * Esto es mucho más robusto y se adapta a CUALQUIER tamaño de contenedor.
   */
  const responsiveGridClasses = "grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4";

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-6 w-40 rounded-full" />
        </div>
        <div className={responsiveGridClasses}>
          {Array.from({ length: 4 }).map((_, index) => (
            <MetricCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

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

  return (
    // No necesitamos @container/main si el grid es fluido por sí mismo.
    <div className="p-4 sm:p-6">
      <Tabs defaultValue="general" className="w-full">
        {/*
         * MEJORA DE RESPONSIVIDAD #2: Tabs Adaptables
         * - En pantallas pequeñas (móviles), los tabs ocupan el ancho completo (grid-cols-2).
         * - En pantallas más grandes (`sm:`), se comportan como tabs normales (`w-auto`).
         * Esto evita que se vean apretados en móviles.
        */}
        <TabsList className="mb-6 grid w-full grid-cols-2 h-auto sm:w-auto sm:inline-flex">
          <TabsTrigger value="general" className="text-xs sm:text-sm">General</TabsTrigger>
          <TabsTrigger value="pacientes" className="text-xs sm:text-sm">Pacientes</TabsTrigger>
        </TabsList>

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