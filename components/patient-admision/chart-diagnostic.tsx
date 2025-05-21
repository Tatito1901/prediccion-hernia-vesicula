'use client';

import React, { useState, useMemo, memo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppContext } from '@/lib/context/app-context';
import { DiagnosisChart } from '@/components/charts/diagnosis-chart';
import { DiagnosisTimelineChart } from '@/components/charts/diagnosis-timeline-chart';
import { DiagnosisSeverityChart } from '@/components/charts/diagnosis-severity-chart';
import { DiagnosisTypeDistribution } from '@/components/charts/diagnosis-type-distribution';
import { Button } from '@/components/ui/button';
import { BarChart2, PieChartIcon, LineChart, Activity, Download, Filter } from 'lucide-react';
import type { DiagnosisType } from '@/app/dashboard/data-model';

// Typado completo de métricas
interface DiagnosisData {
  tipo: DiagnosisType;
  cantidad: number;
}

interface DiagnosisMetrics {
  totalPacientes: number;
  totalHernias: number;
  totalVesicula: number;
  diagnosticosMasComunes: DiagnosisData[];
  porcentajeHernias: number;
  porcentajeVesicula: number;
  distribucionHernias: DiagnosisData[];
  ratioHerniaVesicula: number;
}

// Componente memoizado para las tarjetas de estadística
const StatCard = memo(({
  title,
  value,
  description,
  icon,
  className = '',
}: {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
  className?: string;
}) => (
  <Card className={`${className} transition-all duration-200 hover:shadow-md`}>
    <CardHeader className="pb-2">
      <div className="flex justify-between items-start">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <div className="rounded-full p-2 bg-muted/50">{icon}</div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
      <p className="text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
));

StatCard.displayName = 'StatCard';

export function ChartDiagnostic() {
  const { patients } = useAppContext();

  // Solo un nivel de Tabs para estadísticas
  const [statsTab, setStatsTab] = useState<'distribucion' | 'tendencia' | 'severidad' | 'tipos'>('distribucion');

  // Cálculo de métricas con useMemo
  const metrics = useMemo<DiagnosisMetrics>(() => {
    const dist = patients.reduce<Record<DiagnosisType, number>>((acc, { diagnostico }) => {
      acc[diagnostico] = (acc[diagnostico] || 0) + 1;
      return acc;
    }, {});

    const data = Object.entries(dist)
      .map(([tipo, cantidad]) => ({ tipo: tipo as DiagnosisType, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const totalPacientes = patients.length;
    const totalHernias = data.filter(d => d.tipo.includes('Hernia')).reduce((s, d) => s + d.cantidad, 0);
    const totalVesicula = data.find(d => d.tipo === 'Vesícula')?.cantidad ?? 0;
    const porcentaje = (n: number) => (totalPacientes > 0 ? (n / totalPacientes) * 100 : 0);

    return {
      totalPacientes,
      totalHernias,
      totalVesicula,
      diagnosticosMasComunes: data,
      porcentajeHernias: porcentaje(totalHernias),
      porcentajeVesicula: porcentaje(totalVesicula),
      distribucionHernias: data.filter(d => d.tipo.includes('Hernia')),
      ratioHerniaVesicula: totalHernias > 0 ? totalVesicula / totalHernias : 0,
    };
  }, [patients]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Botones de Exportar y Filtros */}
      <div className="flex justify-end mb-6 gap-2">
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" /> Exportar Datos
        </Button>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" /> Filtros
        </Button>
      </div>

      {/* Panel de estadísticas resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Hernias"
          value={metrics.totalHernias}
          description={`${metrics.porcentajeHernias.toFixed(1)}% del total`}
          icon={<PieChartIcon className="h-5 w-5 text-blue-600" />}
          className="border-l-4 border-l-blue-500"
        />
        <StatCard
          title="Vesícula"
          value={metrics.totalVesicula}
          description={`${metrics.porcentajeVesicula.toFixed(1)}% del total`}
          icon={<PieChartIcon className="h-5 w-5 text-green-600" />}
          className="border-l-4 border-l-green-500"
        />
        <StatCard
          title="Ratio H:V"
          value={metrics.ratioHerniaVesicula.toFixed(2)}
          description={`${metrics.totalHernias} hernias por cada ${metrics.totalVesicula > 0 ? '1 vesícula' : 'caso de vesícula'}`}
          icon={<Activity className="h-5 w-5 text-purple-600" />}
          className="border-l-4 border-l-purple-500"
        />
      </div>

      {/* Detalle de gráficas */}
      <Tabs value={statsTab} onValueChange={setStatsTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="distribucion" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Distribución</span>
            <span className="sm:hidden">Dist.</span>
          </TabsTrigger>
          <TabsTrigger value="tendencia" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            <span className="hidden sm:inline">Tendencia</span>
            <span className="sm:hidden">Tend.</span>
          </TabsTrigger>
          <TabsTrigger value="severidad" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            <span className="hidden sm:inline">Severidad</span>
            <span className="sm:hidden">Sev.</span>
          </TabsTrigger>
          <TabsTrigger value="tipos" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Tipos de Hernias</span>
            <span className="sm:hidden">Tipos</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 bg-card rounded-lg border p-1">
          <TabsContent value="distribucion" className="p-3">
            <DiagnosisChart metrics={metrics} />
          </TabsContent>
          <TabsContent value="tendencia" className="p-3">
            <DiagnosisTimelineChart patients={patients} />
          </TabsContent>
          <TabsContent value="severidad" className="p-3">
            <DiagnosisSeverityChart patients={patients} />
          </TabsContent>
          <TabsContent value="tipos" className="p-3">
            <DiagnosisTypeDistribution patients={patients} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
