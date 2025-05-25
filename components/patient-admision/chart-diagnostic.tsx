import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppContext } from '@/lib/context/app-context';
import { DiagnosisChart } from '@/components/charts/diagnosis-chart';
import { DiagnosisTimelineChart } from '@/components/charts/diagnosis-timeline-chart';
import { Activity, PieChartIcon, LineChart as LineChartIcon } from 'lucide-react';
import type { PatientData, DiagnosisType as DataModelDiagnosisType } from '@/app/dashboard/data-model';

// === TIPOS SIMPLIFICADOS ===
// Extendemos los tipos de diagnósticos para incluir 'Colelitiasis' que usamos localmente
export type LocalDiagnosisCategory = 
  | 'Hernia Inguinal' 
  | 'Hernia Umbilical' 
  | 'Hernia Incisional'
  | 'Vesícula'
  | 'Colelitiasis' // Aunque no está en el modelo oficial, lo usamos para categorización
  | 'Hernia Hiatal'
  | 'Lipoma Grande'
  | 'Hernia Inguinal Recidivante'
  | 'Quiste Sebáceo Infectado'
  | 'Eventración Abdominal'
  | 'Vesícula (Colecistitis Crónica)'
  | 'Apendicitis'
  | 'Otro';

export interface DiagnosisData {
  tipo: LocalDiagnosisCategory; 
  cantidad: number;
}

export interface DiagnosisMetrics {
  totalPacientes: number;
  totalHernias: number;
  totalVesicula: number;
  diagnosticosMasComunes: DiagnosisData[];
  porcentajeHernias: number;
  porcentajeVesicula: number;
  ratioHerniaVesicula: number;
}

// === TIPOS PARA EL COMPONENTE METRICCARD ===
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  borderColor: string;
}

// === COMPONENTE PRINCIPAL OPTIMIZADO ===
export function ChartDiagnostic() {
  const { patients } = useAppContext();

  // Cálculo de métricas simplificado
  const metrics = useMemo<DiagnosisMetrics>(() => {
    const totalPacientes = patients.length;
    if (totalPacientes === 0) {
      return {
        totalPacientes: 0,
        totalHernias: 0,
        totalVesicula: 0,
        diagnosticosMasComunes: [],
        porcentajeHernias: 0,
        porcentajeVesicula: 0,
        ratioHerniaVesicula: 0
      };
    }

    // Mapeo y conteo simplificado
    const counts = patients.reduce((acc, patient: PatientData) => {
      const diagnosis = patient.diagnostico;
      if (!diagnosis) return acc; // Ignorar pacientes sin diagnóstico
      
      let category: LocalDiagnosisCategory = 'Otro';

      // Asignar categoría basada en el diagnóstico
      if (diagnosis === 'Hernia Inguinal' || 
          diagnosis === 'Hernia Umbilical' || 
          diagnosis === 'Hernia Incisional' || 
          diagnosis === 'Hernia Hiatal' ||
          diagnosis === 'Hernia Inguinal Recidivante') {
        category = diagnosis as LocalDiagnosisCategory;
      } else if (diagnosis === 'Vesícula' || diagnosis === 'Vesícula (Colecistitis Crónica)') {
        category = 'Vesícula';
      } else if (diagnosis === 'Apendicitis') {
        category = 'Apendicitis';
      } else if (diagnosis === 'Lipoma Grande' || 
                diagnosis === 'Quiste Sebáceo Infectado' || 
                diagnosis === 'Eventración Abdominal') {
        category = diagnosis as LocalDiagnosisCategory;
      } else {
        category = 'Otro';
      }
      
      // Si queremos rastrear 'Colelitiasis' específicamente, podemos hacerlo así:
      // (nota: 'Colelitiasis' no está en DiagnosisType pero lo manejamos como categoría local)
      if (diagnosis && diagnosis.toLowerCase().includes('colelitiasis')) {
        category = 'Colelitiasis';
      }
      
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<LocalDiagnosisCategory, number>);

    // Cálculos finales
    const totalHernias = (counts['Hernia Inguinal'] || 0) + (counts['Hernia Umbilical'] || 0) + (counts['Hernia Incisional'] || 0);
    const totalVesicula = (counts['Vesícula'] || 0) + (counts['Colelitiasis'] || 0);
    
    const diagnosticosMasComunes = Object.entries(counts)
      .map(([tipo, cantidad]) => ({ tipo: tipo as LocalDiagnosisCategory, cantidad }))
      .filter(item => item.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad);

    return {
      totalPacientes,
      totalHernias,
      totalVesicula,
      diagnosticosMasComunes,
      porcentajeHernias: Math.round((totalHernias / totalPacientes) * 100),
      porcentajeVesicula: Math.round((totalVesicula / totalPacientes) * 100),
      ratioHerniaVesicula: totalVesicula > 0 ? parseFloat((totalHernias / totalVesicula).toFixed(1)) : 0
    };
  }, [patients]);

  // Componente de métrica simplificado
  const MetricCard = ({ title, value, subtitle, icon, borderColor }: MetricCardProps) => (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardContent className="p-6">
        <div className="flex justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="bg-muted h-12 w-12 rounded-full flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Encabezado simplificado */}
      <div className="flex items-center gap-2">
        <Activity className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Diagnósticos</h2>
        <span className="text-sm text-muted-foreground">
          ({metrics.totalPacientes} pacientes)
        </span>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Hernias"
          value={metrics.totalHernias}
          subtitle={`${metrics.porcentajeHernias}% del total`}
          icon={<PieChartIcon className="h-6 w-6" />}
          borderColor="border-l-blue-500"
        />
        <MetricCard
          title="Vesícula"
          value={metrics.totalVesicula}
          subtitle={`${metrics.porcentajeVesicula}% del total`}
          icon={<PieChartIcon className="h-6 w-6" />}
          borderColor="border-l-green-500"
        />
        <MetricCard
          title="Ratio H:V"
          value={metrics.ratioHerniaVesicula.toFixed(1)}
          subtitle="Hernias por cada caso de vesícula"
          icon={<Activity className="h-6 w-6" />}
          borderColor="border-l-purple-500"
        />
      </div>

      {/* Gráficos simplificados */}
      <Tabs defaultValue="distribucion" className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="distribucion" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Distribución
          </TabsTrigger>
          <TabsTrigger value="tendencia" className="flex items-center gap-2">
            <LineChartIcon className="h-4 w-4" />
            Tendencia
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="distribucion">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle>Distribución de Diagnósticos</CardTitle>
                </CardHeader>
                <CardContent>
                  <DiagnosisChart 
                    data={metrics.diagnosticosMasComunes} 
                    title="Desglose por tipo de diagnóstico"
                  />
                </CardContent>
              </Card>
              
              {/* Desglose por Categorías */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Desglose por Categorías</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Categoría Hernias */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center">
                        <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                        Hernias ({metrics.totalHernias} casos)
                      </h4>
                      <div className="pl-5 space-y-1">
                        {metrics.diagnosticosMasComunes
                          .filter(d => d.tipo.includes('Hernia'))
                          .map(diagnosis => (
                            <div key={diagnosis.tipo} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{diagnosis.tipo}</span>
                              <span className="font-medium">{diagnosis.cantidad} casos</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                    
                    {/* Categoría Vesícula */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center">
                        <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                        Vesícula ({metrics.totalVesicula} casos)
                      </h4>
                      <div className="pl-5 space-y-1">
                        {metrics.diagnosticosMasComunes
                          .filter(d => d.tipo.includes('Vesícula') || d.tipo === 'Colelitiasis')
                          .map(diagnosis => (
                            <div key={diagnosis.tipo} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{diagnosis.tipo}</span>
                              <span className="font-medium">{diagnosis.cantidad} casos</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                    
                    {/* Otros Diagnósticos */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center">
                        <span className="inline-block w-3 h-3 bg-gray-500 rounded-full mr-2"></span>
                        Otros Diagnósticos
                      </h4>
                      <div className="pl-5 space-y-1">
                        {metrics.diagnosticosMasComunes
                          .filter(d => !d.tipo.includes('Hernia') && 
                                   !d.tipo.includes('Vesícula') && 
                                   d.tipo !== 'Colelitiasis')
                          .map(diagnosis => (
                            <div key={diagnosis.tipo} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{diagnosis.tipo}</span>
                              <span className="font-medium">{diagnosis.cantidad} casos</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Resumen Numérico */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Resumen Diagnósticos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Resumen General */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted rounded-md p-3">
                        <p className="text-sm text-muted-foreground">Total Diagnósticos</p>
                        <p className="text-2xl font-bold">{metrics.totalPacientes}</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-3">
                        <p className="text-sm text-muted-foreground">Tipos Diferentes</p>
                        <p className="text-2xl font-bold">{metrics.diagnosticosMasComunes.length}</p>
                      </div>
                    </div>
                    
                    {/* Tabla de Proporciones */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Proporciones</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Hernias</span>
                          <div className="w-3/5 bg-muted rounded-full h-2.5">
                            <div 
                              className="bg-blue-500 h-2.5 rounded-full" 
                              style={{ width: `${metrics.porcentajeHernias}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{metrics.porcentajeHernias}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Vesícula</span>
                          <div className="w-3/5 bg-muted rounded-full h-2.5">
                            <div 
                              className="bg-green-500 h-2.5 rounded-full" 
                              style={{ width: `${metrics.porcentajeVesicula}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{metrics.porcentajeVesicula}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Otros</span>
                          <div className="w-3/5 bg-muted rounded-full h-2.5">
                            <div 
                              className="bg-gray-500 h-2.5 rounded-full" 
                              style={{ width: `${100 - metrics.porcentajeHernias - metrics.porcentajeVesicula}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{100 - metrics.porcentajeHernias - metrics.porcentajeVesicula}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="tendencia">
            <Card>
              <CardHeader>
                <CardTitle>Tendencia Temporal</CardTitle>
              </CardHeader>
              <CardContent>
                {patients && patients.length > 0 ? (
                  <DiagnosisTimelineChart patients={patients.filter(p => p.fechaConsulta && p.diagnostico)} />
                ) : (
                  <div className="flex items-center justify-center h-[220px]">
                    <p className="text-muted-foreground">No hay datos disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
      
      {/* Información de actualización */}
      <div className="text-xs text-muted-foreground text-right">
        Actualizado: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}