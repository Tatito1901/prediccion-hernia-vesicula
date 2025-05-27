import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppContext } from '@/lib/context/app-context';
import { DiagnosisChart } from '@/components/charts/diagnosis-chart';
import { DiagnosisTimelineChart } from '@/components/charts/diagnosis-timeline-chart';
import { Activity, PieChart, ChartLine } from 'lucide-react';
import type { PatientData } from '@/app/dashboard/data-model';

// === TIPOS SIMPLIFICADOS ===
export type LocalDiagnosisCategory = 
  | 'Hernia Inguinal' 
  | 'Hernia Umbilical' 
  | 'Hernia Incisional'
  | 'Vesícula'
  | 'Colelitiasis'
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
  distribucionHernias: DiagnosisData[];
  porcentajeHernias: number;
  porcentajeVesicula: number;
  ratioHerniaVesicula: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  borderColor: string;
}

// Helper para generar datos de línea de tiempo
const generateTimelineData = (patients: PatientData[]): { date: string; cantidad: number }[] => {
  const map: Record<string, number> = {};
  patients.forEach((p) => {
    if (p.fechaConsulta && p.diagnostico) {
      const date = new Date(p.fechaConsulta).toLocaleDateString();
      map[date] = (map[date] || 0) + 1;
    }
  });
  return Object.entries(map)
    .map(([date, cantidad]) => ({ date, cantidad }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export function ChartDiagnostic() {
  const { patients } = useAppContext();

  // Cálculo de métricas
  const metrics = useMemo<DiagnosisMetrics>(() => {
    const totalPacientes = patients.length;
    if (totalPacientes === 0) {
      return {
        totalPacientes: 0,
        totalHernias: 0,
        totalVesicula: 0,
        diagnosticosMasComunes: [],
        distribucionHernias: [],
        porcentajeHernias: 0,
        porcentajeVesicula: 0,
        ratioHerniaVesicula: 0
      };
    }

    const counts = patients.reduce((acc, patient) => {
      const diagnosis = patient.diagnostico;
      if (!diagnosis) return acc;
      let category: LocalDiagnosisCategory = 'Otro';

      if (['Hernia Inguinal','Hernia Umbilical','Hernia Incisional','Hernia Hiatal','Hernia Inguinal Recidivante'].includes(diagnosis)) {
        category = diagnosis as LocalDiagnosisCategory;
      } else if (['Vesícula','Vesícula (Colecistitis Crónica)'].includes(diagnosis)) {
        category = 'Vesícula';
      } else if (diagnosis === 'Apendicitis') {
        category = 'Apendicitis';
      } else if (['Lipoma Grande','Quiste Sebáceo Infectado','Eventración Abdominal'].includes(diagnosis)) {
        category = diagnosis as LocalDiagnosisCategory;
      }

      if (diagnosis.toLowerCase().includes('colelitiasis')) {
        category = 'Colelitiasis';
      }

      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<LocalDiagnosisCategory, number>);

    const totalHernias =
      (counts['Hernia Inguinal'] || 0) +
      (counts['Hernia Umbilical'] || 0) +
      (counts['Hernia Incisional'] || 0);
    const totalVesicula =
      (counts['Vesícula'] || 0) + (counts['Colelitiasis'] || 0);

    const diagnosticosMasComunes = Object.entries(counts)
      .map(([tipo, cantidad]) => ({ tipo: tipo as LocalDiagnosisCategory, cantidad }))
      .filter(item => item.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad);

    const distribucionHernias = [
      { tipo: 'Hernia Inguinal', cantidad: counts['Hernia Inguinal'] || 0 },
      { tipo: 'Hernia Umbilical', cantidad: counts['Hernia Umbilical'] || 0 },
      { tipo: 'Hernia Incisional', cantidad: counts['Hernia Incisional'] || 0 },
      { tipo: 'Hernia Hiatal', cantidad: counts['Hernia Hiatal'] || 0 },
      { tipo: 'Hernia Inguinal Recidivante', cantidad: counts['Hernia Inguinal Recidivante'] || 0 }
    ].filter(item => item.cantidad > 0);

    return {
      totalPacientes,
      totalHernias,
      totalVesicula,
      diagnosticosMasComunes,
      distribucionHernias,
      porcentajeHernias: Math.round((totalHernias / totalPacientes) * 100),
      porcentajeVesicula: Math.round((totalVesicula / totalPacientes) * 100),
      ratioHerniaVesicula:
        totalVesicula > 0
          ? parseFloat((totalHernias / totalVesicula).toFixed(1))
          : 0
    };
  }, [patients]);

  // Componente de tarjeta de métrica
  const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, borderColor }) => (
    <Card className={`border-l-4 ${borderColor} hover:shadow-md transition-all duration-300`}>
      <CardContent className="p-6">
        <div className="flex justify-between">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{title}</p>
            <p className="text-3xl font-bold mt-1 text-slate-800 dark:text-slate-100">{value}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{subtitle}</p>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 h-12 w-12 rounded-full flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const timelineData = generateTimelineData(patients);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Diagnósticos</h2>
        <span className="text-sm text-slate-600 dark:text-slate-400 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
          {metrics.totalPacientes} pacientes
        </span>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Hernias"
          value={metrics.totalHernias}
          subtitle={`${metrics.porcentajeHernias}% del total`}
          icon={<PieChart className="h-6 w-6" />}
          borderColor="border-l-blue-500"
        />
        <MetricCard
          title="Vesícula"
          value={metrics.totalVesicula}
          subtitle={`${metrics.porcentajeVesicula}% del total`}
          icon={<PieChart className="h-6 w-6" />}
          borderColor="border-l-green-500"
        />
        <MetricCard
          title="Ratio H:V"
          value={metrics.ratioHerniaVesicula.toFixed(1)}
          subtitle="Hernias por caso de vesícula"
          icon={<Activity className="h-6 w-6" />}
          borderColor="border-l-purple-500"
        />
      </div>

      {/* Pestañas */}
      <Tabs defaultValue="distribucion" className="w-full">
        <TabsList className="grid grid-cols-2 w-full bg-slate-100 dark:bg-slate-800">
          <TabsTrigger
            value="distribucion"
            className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
          >
            <PieChart className="h-4 w-4" />
            Distribución
          </TabsTrigger>
          <TabsTrigger
            value="tendencia"
            className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
          >
            <ChartLine className="h-4 w-4" />
            Tendencia
          </TabsTrigger>
        </TabsList>

        {/* Distribución */}
        <TabsContent value="distribucion">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="lg:col-span-2 border-blue-100 dark:border-slate-700 hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-blue-950">
                <CardTitle className="text-blue-800 dark:text-blue-300">
                  Distribución de Diagnósticos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DiagnosisChart
                  data={metrics.diagnosticosMasComunes}
                  title="Desglose por tipo de diagnóstico"
                />
              </CardContent>
            </Card>

            <Card className="border-blue-100 dark:border-slate-700 hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-blue-950">
                <CardTitle className="text-blue-800 dark:text-blue-300">
                  Distribución de Tipos de Hernia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <DiagnosisChart
                    data={metrics.distribucionHernias}
                    totalLabel="Distribución de Hernias"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Proporciones */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Proporciones</h4>
            <div className="space-y-2">
              {[
                { label: 'Hernias', value: metrics.porcentajeHernias, colorClass: 'bg-blue-500' },
                { label: 'Vesícula', value: metrics.porcentajeVesicula, colorClass: 'bg-green-500' },
                { label: 'Otros', value: 100 - metrics.porcentajeHernias - metrics.porcentajeVesicula, colorClass: 'bg-gray-500' }
              ].map(({ label, value, colorClass }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-sm">{label}</span>
                  <div className="w-3/5 bg-muted rounded-full h-2.5">
                    <div
                      className={`${colorClass} h-2.5 rounded-full`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{value}%</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Tendencia */}
        <TabsContent value="tendencia">
          <Card className="border-blue-100 dark:border-slate-700 hover:shadow-md transition-all duration-300">
            <CardHeader>
              <CardTitle>Tendencia Temporal</CardTitle>
            </CardHeader>
            <CardContent>
              {timelineData.length > 0 ? (
                <DiagnosisTimelineChart
                  data={timelineData}
                  className="h-[300px]"
                />
              ) : (
                <div className="flex items-center justify-center h-[220px]">
                  <p className="text-muted-foreground">No hay datos disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Fecha de actualización */}
      <div className="text-xs text-muted-foreground text-right">
        Actualizado: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
