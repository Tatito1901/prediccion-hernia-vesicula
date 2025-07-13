// app/dashboard/components/DashboardMetrics.tsx

import React, { useMemo, memo } from "react";
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
import { es } from 'date-fns/locale';

// --- Tipos y Constantes Mejoradas ---
export enum PatientOriginEnum {
  GOOGLE = "Google",
  FACEBOOK = "Facebook",
  INSTAGRAM = "Instagram",
  REFERRAL = "Referral",
  OTHER = "Other",
}

export interface ClinicMetrics {
  totalPacientes: number;
  pacientesNuevosMes: number;
  pacientesOperados: number;
  pacientesNoOperados: number;
  pacientesSeguimiento: number;
  tasaConversion: number;
  tiempoPromedioDecision: number;
  fuentePrincipalPacientes: PatientOriginEnum;
  lastUpdated?: string | number | Date;
}

// Mover objeto fuera del componente para evitar recreación
const METRIC_INFO = {
  tasaConversion: { fuente: "Cálculo interno", significado: "% de pacientes que deciden operarse", description: "Tasa de Conversión" },
  totalPacientes: { fuente: "Base de datos", significado: "Pacientes totales registrados en la historia", description: "Pacientes Totales" },
  tiempoPromedioDecision: { fuente: "Registro de citas", significado: "Días promedio desde la primera consulta hasta la decisión de cirugía", description: "Tiempo de Decisión" },
  fuentePrincipalPacientes: { fuente: "Formularios de registro", significado: "Canal de adquisición más común de nuevos pacientes", description: "Fuente Principal" },
  pacientesOperados: { fuente: "Registros quirúrgicos", significado: "Pacientes que han completado su cirugía", description: "Pacientes Operados" },
  pacientesNoOperados: { fuente: "Registros de seguimiento", significado: "Pacientes que decidieron no operarse o pospusieron", description: "Pacientes No Operados" },
  pacientesSeguimiento: { fuente: "CRM", significado: "Pacientes en proceso de decisión o seguimiento activo", description: "En Seguimiento" },
  pacientesNuevosMes: { fuente: "Citas registradas", significado: "Nuevos pacientes registrados en el rango de fechas seleccionado", description: "Nuevos Pacientes (Mes)" },
} as const;

export type MetricKey = keyof typeof METRIC_INFO;

interface MetricCardProps {
  metricKey: MetricKey;
  value: string | number;
  footerContent: React.ReactNode;
  footerDetail: string;
  badge?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

// Mover función de utilidad fuera del componente
const formatPercentage = (numerator: number, denominator: number): string =>
  denominator === 0 ? "N/A" : `${((numerator / denominator) * 100).toFixed(0)}%`;

// --- Componentes Optimizados ---
const MetricIcon = ({ metricKey, ...props }: { metricKey: MetricKey } & LucideProps) => {
  const icons: Record<MetricKey, React.ElementType> = {
    tasaConversion: PercentIcon,
    totalPacientes: UsersIcon,
    tiempoPromedioDecision: ClockIcon,
    fuentePrincipalPacientes: TrendingUpIcon,
    pacientesOperados: CheckCircleIcon,
    pacientesNoOperados: XCircleIcon,
    pacientesSeguimiento: ActivityIcon,
    pacientesNuevosMes: UserPlusIcon,
  };
  
  const IconComponent = icons[metricKey] || BarChart4Icon;
  return <IconComponent {...props} />;
};

const MetricCardSkeleton = (): JSX.Element => (
  <Card className="p-5 shadow-sm h-full">
    <CardHeader className="p-0 flex-row justify-between items-start mb-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-5 w-5 rounded-full" />
    </CardHeader>
    <CardContent className="p-0 mb-4">
      <Skeleton className="h-8 w-1/2" />
    </CardContent>
    <CardFooter className="p-0 flex-col items-start space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </CardFooter>
  </Card>
);

const MemoizedMetricCard = memo(function MetricCard({
  metricKey,
  value,
  footerContent,
  footerDetail,
  badge,
  trend = 'neutral'
}: MetricCardProps): JSX.Element {
  const { description, fuente, significado } = METRIC_INFO[metricKey];

  const trendUI = useMemo(() => {
    const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
    const TrendIcon = trend === 'up' ? ArrowUpIcon : trend === 'down' ? ArrowDownIcon : null;
    
    return { color: trendColor, Icon: TrendIcon };
  }, [trend]);

  return (
    <Dialog>
      <Card className="p-5 shadow-sm hover:shadow-lg transition-shadow duration-300 h-full group flex flex-col">
        <CardHeader className="p-0 flex-row justify-between items-start gap-2 mb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {description}
          </CardTitle>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-primary rounded-full"
              aria-label={`Info sobre ${description}`}
            >
              <InfoIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </CardHeader>
        
        <CardContent className="p-0 flex-grow">
          <div className="text-2xl md:text-3xl font-bold text-foreground tabular-nums">
            {value}
          </div>
        </CardContent>

        <CardFooter className="p-0 flex-col items-start gap-1.5 pt-4 border-t">
          <div className={`flex items-center gap-1.5 text-xs font-medium ${trendUI.color}`}>
            {trendUI.Icon && <trendUI.Icon className="h-3.5 w-3.5" />}
            <span>{footerContent}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate" title={footerDetail}>
            {footerDetail}
          </p>
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
});

MemoizedMetricCard.displayName = "MetricCard";

// Mover fuera del componente para evitar recreación
const DEFAULT_METRICS: ClinicMetrics = {
  totalPacientes: 0,
  pacientesNuevosMes: 0,
  pacientesOperados: 0,
  pacientesNoOperados: 0,
  pacientesSeguimiento: 0,
  tasaConversion: 0,
  tiempoPromedioDecision: 0,
  fuentePrincipalPacientes: PatientOriginEnum.OTHER,
};

export function DashboardMetrics() {
  const { loading, error, clinicMetrics, refresh } = useDashboard();
  
  // Optimizar cálculo de fecha
  const lastUpdated = useMemo(() => {
    if (!clinicMetrics?.lastUpdated) return 'Actualización en tiempo real';
    
    try {
      const date = new Date(clinicMetrics.lastUpdated);
      return isNaN(date.getTime()) 
        ? 'Actualización en tiempo real' 
        : `Actualizado: ${format(date, "dd 'de' MMMM, yyyy HH:mm", { locale: es })}`;
    } catch {
      return 'Actualización en tiempo real';
    }
  }, [clinicMetrics?.lastUpdated]);
  
  const metricsData = clinicMetrics ?? DEFAULT_METRICS;

  // Mejorar responsividad con clases adaptativas
  const responsiveGridClasses = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6";

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-6 w-40 rounded-full" />
        </div>
        <div className={responsiveGridClasses}>
          {Array(4).fill(0).map((_, i) => (
            <MetricCardSkeleton key={i} />
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <BarChart4Icon className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-foreground truncate">
              Métricas de la Clínica
            </h2>
          </div>
          <p className="text-sm text-muted-foreground sm:ml-12 truncate">
            Resumen de rendimiento y estadísticas clave
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-full px-3 py-1.5 w-full sm:w-auto truncate">
          <CalendarIcon className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{lastUpdated}</span>
        </div>
      </header>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6 bg-muted p-1 rounded-lg h-auto flex-wrap sm:flex-nowrap">
          <TabsTrigger 
            value="general" 
            className="flex-1 px-4 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all truncate"
          >
            Visión General
          </TabsTrigger>
          <TabsTrigger 
            value="pacientes" 
            className="flex-1 px-4 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all truncate"
          >
            Análisis de Pacientes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className={responsiveGridClasses}>
            <MemoizedMetricCard
              metricKey="tasaConversion"
              value={`${(metricsData.tasaConversion * 100).toFixed(1)}%`}
              footerContent="Mejora vs. mes anterior"
              footerDetail="Porcentaje de pacientes que deciden operarse"
              trend="up"
            />
            <MemoizedMetricCard
              metricKey="tiempoPromedioDecision"
              value={`${metricsData.tiempoPromedioDecision} días`}
              footerContent="Reducción de 2 días"
              footerDetail="Comparado con el promedio anterior"
              trend="down"
            />
            <MemoizedMetricCard
              metricKey="pacientesNuevosMes"
              value={metricsData.pacientesNuevosMes.toLocaleString()}
              footerContent="+15% vs mes anterior"
              footerDetail="Indicador clave de crecimiento"
              trend="up"
            />
            <MemoizedMetricCard
              metricKey="fuentePrincipalPacientes"
              value={String(metricsData.fuentePrincipalPacientes)}
              footerContent="Canal más efectivo"
              footerDetail="Oportunidad para enfocar marketing"
            />
          </div>
        </TabsContent>
        <TabsContent value="pacientes">
          <div className={responsiveGridClasses}>
            <MemoizedMetricCard
              metricKey="totalPacientes"
              value={metricsData.totalPacientes.toLocaleString()}
              footerContent={`${metricsData.pacientesNuevosMes.toLocaleString()} nuevos este mes`}
              footerDetail="Base de datos histórica de pacientes"
            />
            <MemoizedMetricCard
              metricKey="pacientesOperados"
              value={metricsData.pacientesOperados.toLocaleString()}
              badge={<Badge variant="secondary">{formatPercentage(metricsData.pacientesOperados, metricsData.totalPacientes)}</Badge>}
              footerContent="Del total de pacientes"
              footerDetail="Cirugías realizadas con éxito"
            />
            <MemoizedMetricCard
              metricKey="pacientesSeguimiento"
              value={metricsData.pacientesSeguimiento.toLocaleString()}
              badge={<Badge variant="secondary">{formatPercentage(metricsData.pacientesSeguimiento, metricsData.totalPacientes)}</Badge>}
              footerContent="Potenciales conversiones"
              footerDetail="Pacientes en proceso de decisión activo"
            />
            <MemoizedMetricCard
              metricKey="pacientesNoOperados"
              value={metricsData.pacientesNoOperados.toLocaleString()}
              badge={<Badge variant="destructive">{formatPercentage(metricsData.pacientesNoOperados, metricsData.totalPacientes)}</Badge>}
              footerContent="Oportunidad de re-contacto"
              footerDetail="Decidieron no operarse o posponer"
              trend="down"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardMetrics;