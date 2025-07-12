import React, { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useDashboard } from '@/contexts/dashboard-context';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, AlertTriangle, Calendar, LineChart } from 'lucide-react';

// --- TIPOS Y CONSTANTES ---

type DateRange = '7dias' | '30dias' | '60dias' | '90dias' | 'ytd';

const DATE_RANGE_DESCRIPTIONS: Record<DateRange, string> = {
  '7dias': 'Mostrando datos de los últimos 7 días',
  '30dias': 'Mostrando datos de los últimos 30 días',
  '60dias': 'Mostrando datos de los últimos 60 días',
  '90dias': 'Mostrando datos de los últimos 90 días',
  'ytd': 'Mostrando datos de todo el año actual',
};

interface ChartDataPoint {
  date: string;
  label: string;
  pacientes: number;
  operados: number;
  consultas: number;
  seguimiento: number;
}

// --- FUNCIONES AUXILIARES ---

// Función optimizada para generar datos mock (solo para desarrollo)
function generateMockChartData(dateRange: DateRange): ChartDataPoint[] {
  if (process.env.NODE_ENV === 'production') return [];
  
  const today = new Date();
  const isYearView = dateRange === 'ytd';
  const numPoints = isYearView ? 12 : 
    dateRange === '7dias' ? 7 : 
    dateRange === '30dias' ? 30 : 90;

  const data: ChartDataPoint[] = [];
  
  for (let i = 0; i < numPoints; i++) {
    let label: string;
    
    if (isYearView) {
      const date = new Date(today.getFullYear(), i, 1);
      label = date.toLocaleDateString('es', { month: 'short' });
      label = label.charAt(0).toUpperCase() + label.slice(1);
    } else {
      const date = new Date(today);
      date.setDate(date.getDate() - (numPoints - 1 - i));
      label = date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
    }

    data.push({
      date: `day-${i}`,
      label,
      consultas: Math.floor(Math.random() * 20) + 5,
      operados: Math.floor(Math.random() * 15) + 3,
      pacientes: Math.floor(Math.random() * 30) + 10,
      seguimiento: Math.floor(Math.random() * 12) + 2
    });
  }
  
  return data;
}

// Función para transformar datos reales del chart
function transformRealChartData(chart: any, dateRange: DateRange): ChartDataPoint[] {
  if (!chart?.series || !chart.categories || chart.series.length === 0) return [];
  
  const isYearView = dateRange === 'ytd';
  
  return chart.categories.map((label: string, index: number) => {
    const formattedLabel = isYearView ? 
      label.charAt(0).toUpperCase() + label.slice(1) : 
      label;
    
    return {
      date: `day-${index}`,
      label: formattedLabel,
      pacientes: chart.series[2]?.data[index] || 0,
      operados: chart.series[1]?.data[index] || 0, 
      consultas: chart.series[0]?.data[index] || 0,
      seguimiento: chart.series[3]?.data[index] || 0,
    };
  });
}

// --- COMPONENTES AUXILIARES ---

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 min-w-[200px] transition-all duration-300">
      <p className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <p className="text-xs text-slate-600 dark:text-slate-300">{entry.name}</p>
            </div>
            <p className="font-medium text-sm text-slate-800 dark:text-slate-100">{entry.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingState() {
  return <Skeleton className="h-[300px] w-full rounded-xl bg-slate-100 dark:bg-slate-700/50" />;
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center h-[300px] text-center p-8 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
      <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/50 mb-4">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
      </div>
      <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-1">Error al cargar datos</h3>
      <p className="text-sm text-amber-700 dark:text-amber-400 max-w-md">
        No se pudo recuperar la información. Intente de nuevo más tarde.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-[300px] text-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
      <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
        <LineChart className="h-10 w-10 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">Sin datos disponibles</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
        No hay registros en el período seleccionado para generar un gráfico.
      </p>
    </div>
  );
}

// Hook simplificado para datos mock (solo desarrollo)
function useMockData(dateRange: DateRange) {
  return {
    loading: false,
    error: null,
    chart: null, // No hay datos reales en mock
    dateRange,
    setDateRange: () => {},
  };
}

// --- COMPONENTE PRINCIPAL ---

export const PatientTrendsChart: React.FC = () => {
  const [mockDateRange, setMockDateRange] = useState<DateRange>('30dias');
  
  // Usar hook real si existe, si no, usar mock
  const dashboardData = typeof useDashboard === 'function' ? useDashboard() : useMockData(mockDateRange);
  const { loading, error, chart } = dashboardData;
  
  // Determinar qué dateRange usar
  const currentDateRange = dashboardData.dateRange || mockDateRange;
  const setDateRange = dashboardData.setDateRange || setMockDateRange;
  
  // Transformar datos del chart
  let chartData: ChartDataPoint[];
  if (chart) {
    chartData = transformRealChartData(chart, currentDateRange);
  } else {
    chartData = generateMockChartData(currentDateRange);
  }

  function handleDateRangeChange(value: string) {
    setDateRange(value as DateRange);
  }

  function renderContent() {
    if (loading) return <LoadingState />;
    if (error) return <ErrorState />;
    if (chartData.length === 0) return <EmptyState />;
    
    return (
      <Card className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg">
              <LineChart className="w-5 h-5 text-blue-500 dark:text-blue-300" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Tendencia de pacientes</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">Actividad de pacientes en la clínica</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="operadosGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="consultasGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="seguimientoGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="pacientesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis 
                  dataKey="label" 
                  tickLine={false} 
                  axisLine={false} 
                  dy={5} 
                  tick={{
                    fontSize: 12,
                    fill: currentDateRange === 'ytd' ? '#6366f1' : undefined,
                    fontWeight: currentDateRange === 'ytd' ? 'bold' : undefined
                  }}
                  tickMargin={8}
                  interval={currentDateRange === 'ytd' ? 0 : 'preserveEnd'}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  dx={-5} 
                  tick={{ fontSize: 12 }}
                  tickMargin={8}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }}
                  iconSize={10}
                  iconType="circle"
                />
                <Area 
                  type="monotone" 
                  dataKey="consultas" 
                  name="Consultas" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#consultasGradient)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="operados" 
                  name="Operados" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#operadosGradient)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="seguimiento" 
                  name="Seguimiento"
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#seguimientoGradient)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="pacientes" 
                  name="Pacientes"
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#pacientesGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 shadow-lg rounded-2xl overflow-hidden">
      <CardHeader className="p-6 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500/10 p-3 rounded-xl">
              <Activity className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Tendencias de pacientes
              </CardTitle>
              <CardDescription className="mt-1.5 text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {DATE_RANGE_DESCRIPTIONS[currentDateRange]}
              </CardDescription>
            </div>
          </div>
          <Tabs value={currentDateRange} onValueChange={handleDateRangeChange} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-5 w-full sm:w-auto h-auto p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1 shadow-sm">
              <TabsTrigger 
                value="7dias" 
                className="py-2 px-3 text-xs font-medium rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-300 data-[state=active]:shadow-sm transition-all"
              >
                7 días
              </TabsTrigger>
              <TabsTrigger 
                value="30dias" 
                className="py-2 px-3 text-xs font-medium rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-300 data-[state=active]:shadow-sm transition-all"
              >
                30 días
              </TabsTrigger>
              <TabsTrigger 
                value="60dias" 
                className="py-2 px-3 text-xs font-medium rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-300 data-[state=active]:shadow-sm transition-all"
              >
                60 días
              </TabsTrigger>
              <TabsTrigger 
                value="90dias" 
                className="py-2 px-3 text-xs font-medium rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-300 data-[state=active]:shadow-sm transition-all"
              >
                90 días
              </TabsTrigger>
              <TabsTrigger 
                value="ytd" 
                className="py-2 px-3 text-xs font-medium rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-300 data-[state=active]:shadow-sm transition-all"
              >
                Año actual
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {renderContent()}
      </CardContent>
    </Card>
  );
};

PatientTrendsChart.displayName = 'PatientTrendsChart';
export default PatientTrendsChart;