"use client"

import React, { useState, useMemo, Suspense } from "react"
import dynamic from "next/dynamic"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileBarChart, PieChartIcon, ActivitySquare, TrendingUp, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile, useCurrentBreakpoint } from "@/hooks/use-breakpoint"
import { useAppContext } from "@/lib/context/app-context";
import type { PatientData, ChartData, DiagnosticInsight } from "@/components/charts/chart-diagnostic";

// Definición local de la interfaz MetricsResult anteriormente importada
interface MetricsResult {
  metrics: {
    totalPacientes: number;
    totalHernias: number;
    totalVesicula: number;
    totalApendicitis: number;
    diagnosticosMasComunes: ChartData[];
    distribucionHernias: ChartData[];
    porcentajeHernias: number;
    porcentajeVesicula: number;
    porcentajeApendicitis: number;
    ratioHerniaVesicula: number;
    diversidadDiagnostica: number;
    riesgoPromedio: 'baja' | 'media' | 'alta';
    tendenciaGeneral: number;
  };
  timeline: Array<{
    date: string;
    cantidad: number;
    formattedDate: string;
  }>;
  insights: DiagnosticInsight[];
}
import { DiagnosisEnum } from '@/app/dashboard/data-model';


import { useChartData, type DateRangeOption } from '@/hooks/use-chart-data';
import { Alert, AlertDescription } from "@/components/ui/alert"


// Importaciones dinámicas para mejor rendimiento con estrategias optimizadas
const AppointmentStatistics = dynamic(
  () => import("@/components/charts/appointment-statistics")
    .then(mod => ({ default: mod.AppointmentStatistics })),
  {
    loading: () => <StatisticsLoadingSkeleton />,
    ssr: false, // No renderizar en servidor para reducir el tiempo de carga inicial
    // Next.js 15 ya maneja suspense internamente con mejor rendimiento
  }
)

// Prefetch de datos comunes para mejorar experiencia del usuario
function usePrefetchCommonData() {
  const appContext = useAppContext();
  const chartData = useChartData();
  
  // Prefetch datos frecuentes cuando se cargue la página
  React.useEffect(() => {
    // Solo si tenemos acceso al cliente de queries
    if (!appContext) return;
    
    // Usar el cliente de React Query desde el contexto global
    const queryClient = (appContext as any).queryClient;
    if (!queryClient) return;
    
    // Usar una fecha estándar como rango si no está disponible en chartData
    const dateRange = (chartData as any)?.currentDateRange || 'week';
    
    // Prefetching de datos que se necesitarán pronto
    queryClient.prefetchQuery({
      queryKey: ['estadisticasComunes', dateRange],
      queryFn: () => fetch('/api/statistics/common').then(res => res.json()),
      staleTime: 5 * 60 * 1000, // 5 minutos
    });
  }, [appContext, chartData]);
}

// Componente para carga progresiva con Intersection Observer
function ProgressiveLoadWrapper({ 
  children, 
  threshold = 0.1 
}: { 
  children: React.ReactNode;
  threshold?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div ref={ref} className="w-full h-full min-h-[200px]">
      {isVisible ? children : <StatisticsLoadingSkeleton />}
    </div>
  );
}

const ChartDiagnostic = dynamic(
  () => import("@/components/charts/chart-diagnostic"),
  {
    loading: () => <DiagnosticLoadingSkeleton />,
    ssr: false
  }
)

// Componentes de carga
const StatisticsLoadingSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 w-48 bg-muted rounded-md mb-6"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-28 bg-muted rounded-lg"></div>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-64 bg-muted rounded-lg"></div>
      <div className="h-64 bg-muted rounded-lg"></div>
    </div>
  </div>
)

const DiagnosticLoadingSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 w-64 bg-muted rounded-md mb-6"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 bg-muted rounded-lg"></div>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-80 bg-muted rounded-lg"></div>
      <div className="h-80 bg-muted rounded-lg"></div>
    </div>
  </div>
)

// Props del TabTrigger responsivo
interface TabTriggerProps {
  value: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  shortLabel: string
  isActive: boolean
  isMobile: boolean
}

// Componente de TabTrigger responsivo
const ResponsiveTabTrigger = React.memo<TabTriggerProps>(({
  value,
  icon: Icon,
  label,
  shortLabel,
  isActive,
  isMobile
}) => (
  <TabsTrigger 
    value={value}
    className={cn(
      "flex items-center gap-2",
      isActive && "font-medium",
      isMobile ? "text-xs py-1.5 px-2.5" : "text-sm py-2 px-3"
    )}
  >
    <Icon className={cn("h-4 w-4", isMobile ? "mr-0 sm:mr-1" : "mr-1.5")} />
    <span className={isMobile ? "hidden sm:inline" : "inline"}>
      {isMobile ? shortLabel : label}
    </span>
  </TabsTrigger>
))
ResponsiveTabTrigger.displayName = "ResponsiveTabTrigger"

// Componente de encabezado de página responsivo
const PageHeader = React.memo(() => {
  const isMobile = useIsMobile()

  return (
    <div className="flex flex-col gap-2 mb-4 sm:mb-6">
      <h1 className={cn(
        "font-bold tracking-tight text-center sm:text-left",
        isMobile ? "text-xl" : "text-2xl"
      )}>
        Estadísticas y Analíticas
      </h1>
      {!isMobile && (
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          Panel centralizado de análisis estadísticos para la toma de decisiones
        </p>
      )}
    </div>
  )
})
PageHeader.displayName = "PageHeader"

// Página principal de estadísticas
export default function EstadisticasPage() {
  const [activeTab, setActiveTab] = useState("citas")
  const [dateRange, setDateRange] = useState<DateRangeOption>('30dias')
  const [estado, setEstado] = useState<string>('todos')
  
  // Detección de dispositivo móvil usando el hook optimizado
  const isMobile = useIsMobile()
  const currentBreakpoint = useCurrentBreakpoint()
  
  // Usar contexto para compatibilidad con la implementación actual
  const { patients } = useAppContext();
  
  // Obtener datos reales de la API usando nuestro hook personalizado
  const {
    loading,
    error,
    chartData,
    refresh
  } = useChartData({
    dateRange,
    estado,
    refreshInterval: 0 // Sin actualización automática
  });

  // Helper function to standardize diagnosis names - optimizado y memoizado fuera del render loop
  const formatDiagnosisName = useMemo(() => {
    // Creamos un mapa de diagnósticos para búsqueda más rápida en O(1) en lugar de múltiples includes O(n)
    const diagnosisMap: Record<string, DiagnosisEnum> = {
      'hernia inguinal recidivante': DiagnosisEnum.HERNIA_INGUINAL_RECIDIVANTE,
      'hernia inguinal bilateral': DiagnosisEnum.HERNIA_INGUINAL_BILATERAL,
      'hernia inguinal': DiagnosisEnum.HERNIA_INGUINAL,
      'hernia umbilical': DiagnosisEnum.HERNIA_UMBILICAL,
      'hernia incisional': DiagnosisEnum.HERNIA_INCISIONAL,
      'hernia hiatal': DiagnosisEnum.HERNIA_HIATAL,
      'eventracion abdominal': DiagnosisEnum.EVENTRACION_ABDOMINAL,
      'vesicula': DiagnosisEnum.COLELITIASIS,
      'colelitiasis': DiagnosisEnum.COLELITIASIS,
      'apendicitis': DiagnosisEnum.APENDICITIS,
      'lipoma': DiagnosisEnum.LIPOMA_GRANDE,
      'quiste sebaceo': DiagnosisEnum.QUISTE_SEBACEO_INFECTADO
    };
    
    // Función optimizada que usa el mapa
    return (name: string | undefined): DiagnosisEnum => {
      if (!name) return DiagnosisEnum.OTRO;
      const lowerCaseName = name.toLowerCase();
      
      // Buscar en las claves del mapa
      for (const [key, value] of Object.entries(diagnosisMap)) {
        if (lowerCaseName.includes(key)) {
          return value;
        }
      }
      return DiagnosisEnum.OTRO;
    };
  }, []); // No hay dependencias, solo se crea una vez

  const initialMetricsResult = useMemo<MetricsResult>(() => {
    // Optimizando: pre-calculamos los contadores para reducir bucles repetitivos
    const timelineData: { [key: string]: number } = {};
    const diagnosisCounts = new Map<string, number>();
    let totalHernias = 0;
    let totalVesicula = 0;
    let totalApendicitis = 0;

    // Un solo bucle para procesar todos los datos
    patients.forEach(patient => {
      // Contar diagnósticos por tipo
      if (patient.diagnostico_principal) {
        const formattedDiagnosis = formatDiagnosisName(patient.diagnostico_principal);
        const diagnosisKey = formattedDiagnosis.toString();
        diagnosisCounts.set(diagnosisKey, (diagnosisCounts.get(diagnosisKey) || 0) + 1);
        
        // Contadores específicos
        const lowerDiag = patient.diagnostico_principal.toLowerCase();
        if (lowerDiag.includes('hernia')) totalHernias++;
        if (lowerDiag.includes('vesícula') || lowerDiag.includes('colelitiasis')) totalVesicula++;
        if (lowerDiag.includes('apendicitis')) totalApendicitis++;
      }
      
      // Datos de timeline
      if (patient.fecha_registro) {
        const date = new Date(patient.fecha_registro).toISOString().split('T')[0];
        timelineData[date] = (timelineData[date] || 0) + 1;
      }
    });

    const totalPacientes = patients.length;
    
    // Cálculos de porcentajes
    const porcentajeHernias = totalPacientes > 0 ? (totalHernias / totalPacientes) * 100 : 0;
    const porcentajeVesicula = totalPacientes > 0 ? (totalVesicula / totalPacientes) * 100 : 0;
    const porcentajeApendicitis = totalPacientes > 0 ? (totalApendicitis / totalPacientes) * 100 : 0;
    const ratioHerniaVesicula = totalVesicula > 0 ? totalHernias / totalVesicula : 0;

    // Convertir Map a array para aggregatedDiagnoses
    const aggregatedDiagnoses: ChartData[] = Array.from(diagnosisCounts.entries())
      .map(([tipo, cantidad]) => ({ tipo, cantidad }))
      .sort((a: ChartData, b: ChartData) => b.cantidad - a.cantidad);

    // Filtrar solo diagnósticos de hernias para distribucionHernias
    const herniasData: ChartData[] = aggregatedDiagnoses
      .filter(item => item.tipo.toLowerCase().includes('hernia'))
      .sort((a: ChartData, b: ChartData) => b.cantidad - a.cantidad);

    // Format timeline data
    const formattedTimeline = Object.entries(timelineData)
      .map(([date, cantidad]: [string, number]) => ({
        date,
        cantidad,
        formattedDate: new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Cálculo simplificado de diversidad (Shannon Index)
    const diversidadDiagnostica = Math.log2(Math.max(1, diagnosisCounts.size));
    const riesgoPromedio: 'baja' | 'media' | 'alta' = 'baja'; // Placeholder
    const tendenciaGeneral = 0; // Placeholder

    const metrics = {
      totalPacientes,
      totalHernias,
      totalVesicula,
      totalApendicitis,
      diagnosticosMasComunes: aggregatedDiagnoses,
      distribucionHernias: herniasData,
      porcentajeHernias,
      porcentajeVesicula,
      porcentajeApendicitis,
      ratioHerniaVesicula,
      diversidadDiagnostica,
      riesgoPromedio,
      tendenciaGeneral
    };

    const insights: DiagnosticInsight[] = []; // Placeholder

    return {
      metrics,
      timeline: formattedTimeline,
      insights,
    };
  }, [patients, formatDiagnosisName]); // Añadimos formatDiagnosisName como dependencia

  const lastUpdated = useMemo(() => new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }), [patients]);

  // Configuración de pestañas
  const tabsConfig = useMemo(() => [
    {
      value: "citas",
      icon: FileBarChart,
      label: "Estadísticas de Citas",
      shortLabel: "Citas",
    },
    {
      value: "diagnosticos",
      icon: PieChartIcon,
      label: "Análisis de Diagnósticos",
      shortLabel: "Diagnósticos",
    },
    {
      value: "actividad",
      icon: ActivitySquare,
      label: "Actividad Clínica",
      shortLabel: "Actividad",
    },
    {
      value: "tendencias",
      icon: TrendingUp,
      label: "Tendencias y Predicciones",
      shortLabel: "Tendencias",
    }
  ], [])

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300 px-2 sm:px-0">
      <PageHeader />
      
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            {/* Navegación de pestañas responsiva */}
            <div className="bg-muted/30 border-b px-1 sm:px-3 py-1 sm:py-2 overflow-x-auto scrollbar-hide">
              <TabsList className={cn(
                "bg-background w-full min-w-max sm:min-w-0 justify-start rounded-none border-b border-b-transparent p-0",
                isMobile ? "h-9 gap-0.5" : "h-10 sm:h-11 gap-0.5 sm:gap-1"
              )}>
                {tabsConfig.map((tab) => (
                  <ResponsiveTabTrigger
                    key={tab.value}
                    value={tab.value}
                    icon={tab.icon}
                    label={tab.label}
                    shortLabel={tab.shortLabel}
                    isActive={activeTab === tab.value}
                    isMobile={isMobile}
                  />
                ))}
              </TabsList>
            </div>

            {/* Contenido de las pestañas */}
            <div className={cn(
              "transition-opacity duration-300 ease-in-out",
              isMobile ? "p-3" : "p-4 lg:p-6"
            )}>
              <Suspense fallback={<StatisticsLoadingSkeleton />}>
                <TabsContent 
                  value="citas"
                  className="mt-0 border-none p-0 data-[state=inactive]:hidden"
                >
                  {activeTab === "citas" && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                      {error && (
                        <Alert className="border-l-4 border-l-destructive mb-6">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Error al cargar datos:</strong> {error}
                            <button 
                              onClick={refresh}
                              className="ml-3 px-2 py-0.5 bg-primary text-primary-foreground rounded-md text-xs"
                            >
                              Reintentar
                            </button>
                          </AlertDescription>
                        </Alert>
                      )}
                      <AppointmentStatistics 
                        generalStats={chartData.generalStats}
                        weekdayDistribution={chartData.weekdayDistribution}
                        isLoading={loading}
                        lastUpdated={lastUpdated}
                        onRefresh={refresh}
                      />
                    </div>
                  )}
                </TabsContent>
              </Suspense>
              
              <Suspense fallback={<DiagnosticLoadingSkeleton />}>
                <TabsContent 
                  value="diagnosticos" 
                  className="mt-0 border-none p-0 data-[state=inactive]:hidden"
                >
                  {activeTab === "diagnosticos" && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                      {error && (
                        <Alert className="border-l-4 border-l-destructive mb-6">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Error al cargar datos:</strong> {error}
                            <button 
                              onClick={refresh}
                              className="ml-3 px-2 py-0.5 bg-primary text-primary-foreground rounded-md text-xs"
                            >
                              Reintentar
                            </button>
                          </AlertDescription>
                        </Alert>
                      )}
                  
                  <ChartDiagnostic 
                    initialPatientsData={patients}
                    apiPatients={chartData.transformedPatients}
                    diagnosisData={chartData.diagnosisData}
                    isLoading={loading}
                    lastUpdated={lastUpdated}
                  />
                    </div>
                  )}
                </TabsContent>
              </Suspense>
              
              <TabsContent 
                value="actividad" 
                className="mt-0 border-none p-0 data-[state=inactive]:hidden"
              >
                {activeTab === "actividad" && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <Card className="border-none">
                      <CardHeader>
                        <CardTitle>Actividad Clínica</CardTitle>
                        <CardDescription>
                          Análisis de actividad clínica diaria, semanal y mensual
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Placeholder simplificado para mejor rendimiento */}
                        <div className="h-60 flex items-center justify-center border border-dashed rounded-md">
                          <div className="text-center p-4 max-w-md">
                            <ActivitySquare className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
                            <h3 className="text-base font-medium mb-2">Análisis de Actividad</h3>
                            <p className="text-sm text-muted-foreground">
                              Vista en desarrollo
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent 
                value="tendencias" 
                className="mt-0 border-none p-0 data-[state=inactive]:hidden"
              >
                {activeTab === "tendencias" && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <Card className="border-none">
                      <CardHeader>
                        <CardTitle>Tendencias y Predicciones</CardTitle>
                        <CardDescription>
                          Análisis predictivo y tendencias para planificación estratégica
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Placeholder optimizado y simplificado */}
                        <div className="h-60 flex items-center justify-center border border-dashed rounded-md">
                          <div className="text-center p-4 max-w-md">
                            <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
                            <h3 className="text-base font-medium mb-2">Análisis Predictivo</h3>
                            <p className="text-sm text-muted-foreground">
                              Módulo en desarrollo
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
