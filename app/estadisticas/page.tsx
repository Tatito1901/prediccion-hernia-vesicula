"use client"

import React, { useState, useMemo, Suspense } from "react"
import dynamic from "next/dynamic"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileBarChart, PieChartIcon, ActivitySquare, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile, useCurrentBreakpoint } from "@/hooks/use-breakpoint"
import { useAppContext } from "@/lib/context/app-context";
import { MetricsResult, PatientData, ChartData, DiagnosticInsight, LocalDiagnosisCategory } from "@/components/charts/chart-diagnostic";
import { DiagnosisEnum } from '@/app/dashboard/data-model';


// Importaciones dinámicas para mejor rendimiento
const AppointmentStatistics = dynamic(
  () => import("@/components/patient-admision/appointment-statistics").then(mod => ({ default: mod.AppointmentStatistics })),
  {
    loading: () => <StatisticsLoadingSkeleton />,
    ssr: false
  }
)

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
  
  // Detección de dispositivo móvil usando el hook optimizado
  const isMobile = useIsMobile()
  const currentBreakpoint = useCurrentBreakpoint()
  const { patients } = useAppContext();

  // Helper function to standardize diagnosis names
  const formatDiagnosisName = (name: string | undefined): LocalDiagnosisCategory => {
    if (!name) return DiagnosisEnum.OTRO;
    const lowerCaseName = name.toLowerCase();
    if (lowerCaseName.includes('hernia inguinal recidivante')) return DiagnosisEnum.HERNIA_INGUINAL_RECIDIVANTE;
    if (lowerCaseName.includes('hernia inguinal bilateral')) return DiagnosisEnum.HERNIA_INGUINAL_BILATERAL; // Or HERNIA_INGUINAL if preferred
    if (lowerCaseName.includes('hernia inguinal')) return DiagnosisEnum.HERNIA_INGUINAL;
    if (lowerCaseName.includes('hernia umbilical')) return DiagnosisEnum.HERNIA_UMBILICAL;
    if (lowerCaseName.includes('hernia incisional')) return DiagnosisEnum.HERNIA_INCISIONAL;
    if (lowerCaseName.includes('hernia hiatal')) return DiagnosisEnum.HERNIA_HIATAL;
    if (lowerCaseName.includes('eventracion abdominal')) return DiagnosisEnum.EVENTRACION_ABDOMINAL;
    // Mapping 'vesicula' or 'colelitiasis' to COLELITIASIS. Adjust if COLECISTITIS is more appropriate.
    if (lowerCaseName.includes('vesicula') || lowerCaseName.includes('colelitiasis')) return DiagnosisEnum.COLELITIASIS; 
    if (lowerCaseName.includes('apendicitis')) return DiagnosisEnum.APENDICITIS;
    if (lowerCaseName.includes('lipoma')) return DiagnosisEnum.LIPOMA_GRANDE;
    if (lowerCaseName.includes('quiste sebaceo')) return DiagnosisEnum.QUISTE_SEBACEO_INFECTADO;
    // Consider if other specific enums like HERNIA_DE_SPIGEL, HERNIA_VENTRAL, COLANGITIS, COLEDOCOLITIASIS should be mapped here
    return DiagnosisEnum.OTRO;
  };

  const initialMetricsResult = useMemo<MetricsResult>(() => {
    const allDiagnoses: ChartData[] = [];
    const timelineData: { [key: string]: number } = {};

    patients.forEach(patient => {
      const formattedDiagnosis = formatDiagnosisName(patient.diagnostico_principal);
      if (formattedDiagnosis) {
        allDiagnoses.push({
          tipo: formattedDiagnosis,
          cantidad: 1
        });
      }
      if (patient.fecha_registro) {
        const date = new Date(patient.fecha_registro).toISOString().split('T')[0];
        timelineData[date] = (timelineData[date] || 0) + 1;
      }
    });

    // Aggregate common diagnoses
    const aggregatedDiagnoses = allDiagnoses.reduce((acc, curr) => {
      const existing = acc.find(item => item.tipo === curr.tipo);
      if (existing) {
        existing.cantidad += curr.cantidad;
      } else {
        acc.push({ ...curr });
      }
      return acc;
    }, [] as ChartData[]).sort((a, b) => b.cantidad - a.cantidad);

    const totalPacientes = patients.length;
    const totalHernias = patients.filter(p => p.diagnostico_principal?.toLowerCase().includes('hernia')).length;
    const totalVesicula = patients.filter(p => p.diagnostico_principal?.toLowerCase().includes('vesícula') || p.diagnostico_principal?.toLowerCase().includes('colelitiasis')).length;
    const totalApendicitis = patients.filter(p => p.diagnostico_principal?.toLowerCase().includes('apendicitis')).length;

    const porcentajeHernias = totalPacientes > 0 ? (totalHernias / totalPacientes) * 100 : 0;
    const porcentajeVesicula = totalPacientes > 0 ? (totalVesicula / totalPacientes) * 100 : 0;
    const porcentajeApendicitis = totalPacientes > 0 ? (totalApendicitis / totalPacientes) * 100 : 0;

    const ratioHerniaVesicula = totalVesicula > 0 ? totalHernias / totalVesicula : 0;

    // Calculate distribucionHernias
    const herniasData = patients
      .filter(patient => patient.diagnostico_principal?.toLowerCase().includes('hernia'))
      .map(patient => formatDiagnosisName(patient.diagnostico_principal))
      .reduce((acc, curr) => {
        const existing = acc.find(item => item.tipo === curr);
        if (existing) {
          existing.cantidad += 1;
        } else {
          acc.push({ tipo: curr, cantidad: 1 });
        }
        return acc;
      }, [] as ChartData[])
      .sort((a, b) => b.cantidad - a.cantidad);

    // Format timeline data
    const formattedTimeline = Object.entries(timelineData).map(([date, cantidad]) => ({
      date,
      cantidad,
      formattedDate: new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Typed placeholders for metrics that require more complex calculations
    const diversidadDiagnosticaPlaceholder = 0; 
    const riesgoPromedioPlaceholder: 'baja' | 'media' | 'alta' = 'baja'; 
    const tendenciaGeneralPlaceholder = 0;

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
      diversidadDiagnostica: diversidadDiagnosticaPlaceholder,
      riesgoPromedio: riesgoPromedioPlaceholder,
      tendenciaGeneral: tendenciaGeneralPlaceholder
    };

    const insights: DiagnosticInsight[] = []; // Placeholder

    return {
      metrics,
      timeline: formattedTimeline,
      insights,
    };
  }, [patients]);

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
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                      <AppointmentStatistics />
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
                      <ChartDiagnostic
                        initialMetricsResult={initialMetricsResult}
                        initialPatientsData={patients as PatientData[]}
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
                        <div className="h-80 flex items-center justify-center border border-dashed rounded-md">
                          <div className="text-center p-6">
                            <ActivitySquare className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" />
                            <h3 className="text-lg font-medium mb-2">Análisis de Actividad</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Esta vista estará disponible próximamente con datos detallados sobre la
                              actividad clínica, procedimientos e indicadores clave de rendimiento.
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
                        <div className="h-80 flex items-center justify-center border border-dashed rounded-md">
                          <div className="text-center p-6">
                            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" />
                            <h3 className="text-lg font-medium mb-2">Análisis Predictivo</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Esta vista mostrará próximamente predicciones basadas en datos históricos
                              para ayudar en la planificación estratégica y toma de decisiones.
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
