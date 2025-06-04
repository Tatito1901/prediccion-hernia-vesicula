"use client"

import React, { useState, ReactNode } from "react";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon,
  ClockIcon,
  TrendingUpIcon,
  InfoIcon,
  XIcon,
  BarChart4Icon,
} from "lucide-react";
// Asumo que los componentes de ui son de shadcn/ui o similar y están correctamente importados
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  PatientOrigin,
  DiagnosisType,
  type ClinicMetrics // Import ClinicMetrics type
} from "@/app/dashboard/data-model"; // Asegúrate que esta ruta sea correcta

// --- Tipos Definidos ---

// Define un tipo para los detalles de cada métrica, permitiendo flexibilidad en las propiedades adicionales.
type MetricDetail = {
  fuente: string;
  significado: string;
  [key: string]: string | undefined; // Permite otras propiedades como fórmula, actualización, etc.
};

// Define un tipo para el objeto metricInfo, asegurando que las claves sean conocidas.
type MetricInfoType = {
  tasaConversion: MetricDetail;
  totalPacientes: MetricDetail;
  tiempoPromedioDecision: MetricDetail;
  fuentePrincipalPacientes: MetricDetail;
  pacientesOperados: MetricDetail;
  pacientesNoOperados: MetricDetail;
  pacientesSeguimiento: MetricDetail;
  pacientesNuevosMes: MetricDetail;
};

// Crea un tipo para las claves de las métricas, derivado de MetricInfoType.
type MetricKey = keyof MetricInfoType;

// Interfaz para las props del InfoModal
interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricKey: MetricKey;
  title: string;
  value: string | number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  badge?: ReactNode;
  footer: ReactNode;
  footerDetail: string;
  metricKey: MetricKey;
}

interface DashboardMetricsProps {
  metrics?: ClinicMetrics;
}

// --- Información Detallada de Métricas ---
// Esta información es estática y describe cada métrica.
const metricInfo: MetricInfoType = {
  tasaConversion: {
    fuente: "Calculada a partir de pacientes totales vs. pacientes que programan cirugía.",
    significado: "Mide el porcentaje de pacientes que deciden operarse después de una consulta inicial. Es un indicador clave de la efectividad de las consultas y del proceso de toma de decisiones.",
    fórmula: "Pacientes operados ÷ Pacientes totales × 100"
  },
  totalPacientes: {
    fuente: "Base de datos de pacientes activos en el sistema.",
    significado: "Representa el número total de pacientes registrados en la clínica. Incluye tanto pacientes nuevos como recurrentes y permite evaluar el crecimiento de la base de pacientes a lo largo del tiempo.",
    actualización: "Este dato se actualiza diariamente al cierre del día."
  },
  tiempoPromedioDecision: {
    fuente: "Calculado entre la fecha de primera consulta y fecha de decisión.",
    significado: "Indica cuánto tiempo tardan en promedio los pacientes para decidir si proceder con la cirugía. Un tiempo menor sugiere mayor efectividad en la comunicación de beneficios.",
    metodología: "Promedio calculado con los últimos 90 días de consultas."
  },
  fuentePrincipalPacientes: {
    fuente: "Datos de formularios de admisión y seguimiento de campañas.",
    significado: "Identifica el canal de marketing o referencia que genera más pacientes. Permite optimizar estrategias de captación y asignar presupuestos de manera más efectiva.",
    detalle: "Se obtiene de los formularios de admisión de pacientes."
  },
  pacientesOperados: {
    fuente: "Sistema de programación quirúrgica y registros médicos.",
    significado: "Total de pacientes que han completado un procedimiento quirúrgico. Refleja directamente el volumen de operaciones y es un indicador del rendimiento del negocio.",
    período: "Acumulativo de los últimos 12 meses."
  },
  pacientesNoOperados: {
    fuente: "Registros de seguimiento de consultas y cancelaciones.",
    significado: "Pacientes que decidieron no proceder con la cirugía después de la consulta. Analizar este grupo puede revelar oportunidades para mejorar la comunicación o abordar preocupaciones comunes.",
    análisis: "Se realiza seguimiento con encuestas para comprender razones de cancelación."
  },
  pacientesSeguimiento: {
    fuente: "Sistema CRM de seguimiento de pacientes.",
    significado: "Pacientes que aún están en proceso de decisión. Este grupo representa potenciales conversiones futuras y requiere estrategias de seguimiento personalizadas.",
    acciones: "El equipo de seguimiento contacta a estos pacientes según protocolos establecidos."
  },
  pacientesNuevosMes: {
    fuente: "Registros de nuevas consultas del mes en curso.",
    significado: "Mide la cantidad de nuevos pacientes registrados durante el mes actual. Es un indicador clave de la efectividad de las campañas de marketing y la capacidad de atraer nuevos pacientes.",
    comparación: "Se compara mes a mes para identificar tendencias."
  }
};

// --- Componente InfoModal ---
// Muestra información detallada sobre una métrica específica.
// Se han añadido clases 'break-words' para mejorar el manejo de texto largo en el modal.
const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, metricKey, title, value }) => {
  if (!isOpen) return null;

  const info = metricInfo[metricKey];

  const capitalizeFirstLetter = (string: string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border shadow-xl rounded-xl max-w-lg w-full transform transition-all animate-in fade-in-90 zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 md:p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 bg-primary/10 p-2.5 rounded-lg">
              <BarChart4Icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-semibold text-card-foreground">{title}</h3>
              <p className="text-xs md:text-sm text-muted-foreground">Detalles de la métrica</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full h-8 w-8 hover:bg-muted/50 dark:hover:bg-muted/20"
            aria-label="Cerrar modal"
          >
            <XIcon className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>

        <div className="p-4 md:p-6 bg-muted/30 dark:bg-muted/10 border-b">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-xs md:text-sm text-muted-foreground mb-1">Valor actual</p>
            <div className="text-2xl md:text-3xl font-bold text-primary">{value}</div>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4 max-h-[50vh] overflow-y-auto">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 bg-primary/70 rounded-full"></div>
              <h4 className="font-medium text-sm text-card-foreground">Fuente de datos</h4>
            </div>
            {/* Se añade break-words para mejor manejo de texto largo */}
            <p className="text-xs md:text-sm pl-3 text-muted-foreground break-words">{info.fuente}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 bg-primary/70 rounded-full"></div>
              <h4 className="font-medium text-sm text-card-foreground">Significado</h4>
            </div>
            {/* Se añade break-words para mejor manejo de texto largo */}
            <p className="text-xs md:text-sm pl-3 text-muted-foreground break-words">{info.significado}</p>
          </div>

          {Object.entries(info).map(([key, detailValue]) => {
            if (key !== 'fuente' && key !== 'significado' && detailValue) {
              return (
                <div className="space-y-1" key={key}>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-1 bg-primary/70 rounded-full"></div>
                    <h4 className="font-medium text-sm text-card-foreground">{capitalizeFirstLetter(key)}</h4>
                  </div>
                  {/* Se añade break-words para mejor manejo de texto largo */}
                  <p className="text-xs md:text-sm pl-3 text-muted-foreground break-words">{detailValue}</p>
                </div>
              );
            }
            return null;
          })}
        </div>

        <div className="flex items-center justify-end gap-2 p-3 md:p-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- Componente MetricCard ---
// Muestra una métrica individual en una tarjeta.
// Utiliza consultas de contenedor (@container/card) para adaptar su contenido.
const MetricCard: React.FC<MetricCardProps> = ({ title, value, description, badge, footer, footerDetail, metricKey }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <>
      {/* La clase @container/card define un contexto de contenedor para esta tarjeta */}
      <Card className="relative flex flex-col justify-between transition-all duration-300 hover:shadow-lg dark:hover:shadow-primary/10 @container/card">
        <CardHeader className="pb-3 pt-4 px-4 md:pb-4 md:pt-5 md:px-5">
          <div className="flex items-start justify-between gap-2">
            {/* El tamaño del texto de la descripción se ajusta según el ancho del contenedor de la tarjeta */}
            <CardDescription className="text-xs @[200px]/card:text-sm">{description}</CardDescription>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenModal}
              className="h-7 w-7 flex-shrink-0 rounded-md bg-primary/10 hover:bg-primary/20 text-primary -mt-1 -mr-1"
              aria-label={`Ver información detallada de ${description}`}
            >
              <InfoIcon className="h-4 w-4" />
            </Button>
          </div>
          {/* El tamaño del texto del título se ajusta según el ancho del contenedor de la tarjeta */}
          <CardTitle className="text-xl @[220px]/card:text-2xl @[280px]/card:text-3xl font-bold tabular-nums">
            {value}
          </CardTitle>
          {/* El posicionamiento del badge se ajusta según el ancho del contenedor y el breakpoint md */}
          {badge && <div className="absolute right-4 top-14 @[280px]/card:top-16 md:right-5 md:top-16">{badge}</div>}
        </CardHeader>
        
        <CardFooter className="flex-col items-start gap-1 text-xs @[200px]/card:text-sm pt-2 pb-3 px-4 md:pt-3 md:pb-4 md:px-5">
          <div className="flex items-center gap-1.5 font-medium text-card-foreground">
            {footer}
          </div>
          {/* line-clamp-1 previene que el texto del detalle del footer ocupe múltiples líneas */}
          <div className="text-muted-foreground line-clamp-1">{footerDetail}</div>
        </CardFooter>
      </Card>

      <InfoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        metricKey={metricKey}
        title={description}
        value={value}
      />
    </>
  );
};

// --- Componente Principal DashboardMetrics ---
// Organiza y muestra las métricas en pestañas.
// Utiliza prefijos responsivos (sm:, lg:) y consultas de contenedor (@container/main).
export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ metrics }) => {
  const metricsData = metrics;

  if (!metricsData) {
    return <div className="p-4 text-center text-muted-foreground">Cargando métricas...</div>;
  }

  const calculatePercentage = (numerator: number, denominator: number): string => {
    if (denominator === 0) return "N/A";
    return ((numerator / denominator) * 100).toFixed(0) + "%";
  };
  
  return (
    // @container/main define un contexto de contenedor para todo el dashboard.
    // El padding se ajusta responsivamente (p-4, sm:p-6, lg:p-8).
    <div className="p-4 sm:p-6 lg:p-8 @container/main">
      <Tabs defaultValue="general" className="w-full">
        {/* El TabsList cambia de un grid de 2 columnas a un layout inline en pantallas sm y mayores. */}
        {/* El tamaño del texto de los TabsTrigger también es responsivo. */}
        <TabsList className="mb-4 grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
          <TabsTrigger value="general" className="text-xs sm:text-sm">General</TabsTrigger>
          <TabsTrigger value="pacientes" className="text-xs sm:text-sm">Pacientes</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          {/* El grid de métricas se ajusta: 1 columna por defecto, 2 en sm:, 3 en @3xl/main, 4 en @5xl/main. */}
          {/* Esto combina breakpoints de viewport (sm:) con breakpoints de contenedor (@3xl/main, @5xl/main). */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 @3xl/main:grid-cols-3 @5xl/main:grid-cols-4">
            <MetricCard
              title="Tasa de Conversión"
              value={`${(metricsData.tasaConversion * 100).toFixed(1)}%`}
              description="Tasa de Conversión"
              badge={
                <Badge variant="outline" className="flex items-center gap-1 rounded-md text-xs py-0.5 px-1.5">
                  <TrendingUpIcon className="h-3 w-3" />
                  +5.2% {/* Ejemplo de dato estático, idealmente sería dinámico */}
                </Badge>
              }
              footer="Mejora vs. mes anterior"
              footerDetail="Pacientes que deciden operarse"
              metricKey="tasaConversion"
            />
            <MetricCard
              title="Pacientes Totales"
              value={metricsData.totalPacientes.toLocaleString()}
              description="Pacientes Totales"
              badge={<UsersIcon className="h-5 w-5 text-muted-foreground" />}
              footer={`${metricsData.pacientesNuevosMes.toLocaleString()} nuevos este mes`}
              footerDetail="Crecimiento constante de la base"
              metricKey="totalPacientes"
            />
            <MetricCard
              title="Tiempo Promedio Decisión"
              value={`${metricsData.tiempoPromedioDecision} días`}
              description="Tiempo Promedio Decisión"
              badge={<ClockIcon className="h-5 w-5 text-muted-foreground" />}
              footer={
                <span className="flex items-center gap-1">
                  <ArrowDownIcon className="h-3.5 w-3.5 text-green-600 dark:text-green-500" /> 2 días menos {/* Ejemplo */}
                </span>
              }
              footerDetail="vs. mes anterior"
              metricKey="tiempoPromedioDecision"
            />
            <MetricCard
              title="Fuente Principal"
              value={String(metricsData.fuentePrincipalPacientes)} // Asegurarse que sea un string
              description="Fuente Principal"
              badge={
                <Badge variant="outline" className="flex items-center gap-1 rounded-md text-xs py-0.5 px-1.5">
                  <ArrowUpIcon className="h-3 w-3" />
                  +15% {/* Ejemplo */}
                </Badge>
              }
              footer="Canal más efectivo"
              footerDetail="Optimizar inversión en marketing"
              metricKey="fuentePrincipalPacientes"
            />
          </div>
        </TabsContent>

        <TabsContent value="pacientes">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 @3xl/main:grid-cols-3 @5xl/main:grid-cols-4">
            <MetricCard
              title="Pacientes Operados"
              value={metricsData.pacientesOperados.toLocaleString()}
              description="Pacientes Operados"
              badge={
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-400 text-xs py-0.5 px-1.5 rounded-md"
                >
                  {calculatePercentage(metricsData.pacientesOperados, metricsData.totalPacientes)}
                </Badge>
              }
              footer="Del total de pacientes"
              footerDetail="Cirugías realizadas con éxito"
              metricKey="pacientesOperados"
            />
            <MetricCard
              title="Pacientes No Operados"
              value={metricsData.pacientesNoOperados.toLocaleString()}
              description="Pacientes No Operados"
              badge={
                <Badge
                  variant="outline"
                  className="bg-red-100 text-red-700 dark:bg-red-700/20 dark:text-red-400 text-xs py-0.5 px-1.5 rounded-md"
                >
                  {calculatePercentage(metricsData.pacientesNoOperados, metricsData.totalPacientes)}
                </Badge>
              }
              footer="Del total de pacientes"
              footerDetail="Decidieron no operarse o posponer"
              metricKey="pacientesNoOperados"
            />
            <MetricCard
              title="En Seguimiento"
              value={metricsData.pacientesSeguimiento.toLocaleString()}
              description="En Seguimiento"
              badge={
                <Badge
                  variant="outline"
                  className="bg-blue-100 text-blue-700 dark:bg-blue-700/20 dark:text-blue-400 text-xs py-0.5 px-1.5 rounded-md"
                >
                  {calculatePercentage(metricsData.pacientesSeguimiento, metricsData.totalPacientes)}
                </Badge>
              }
              footer="Potenciales conversiones"
              footerDetail="Pacientes en proceso de decisión"
              metricKey="pacientesSeguimiento"
            />
            <MetricCard
              title="Nuevos Pacientes (Mes)"
              value={metricsData.pacientesNuevosMes.toLocaleString()}
              description="Nuevos Pacientes (Mes)"
              badge={
                <Badge variant="outline" className="flex items-center gap-1 rounded-md text-xs py-0.5 px-1.5">
                  <ArrowUpIcon className="h-3 w-3" />
                  +12% {/* Ejemplo */}
                </Badge>
              }
              footer="Este mes vs. anterior"
              footerDetail="Crecimiento en adquisición"
              metricKey="pacientesNuevosMes"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardMetrics;