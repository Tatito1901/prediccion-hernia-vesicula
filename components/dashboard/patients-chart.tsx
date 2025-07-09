import React, { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useDashboard } from '@/contexts/dashboard-context';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Activity, AlertTriangle, Calendar, LineChart } from 'lucide-react';

// --- TIPOS Y DATOS MOCK (PARA DESARROLLO INDEPENDIENTE) ---

type DateRange = '7dias' | '30dias' | '90dias' | 'ytd';

interface PatientData {
  id: string;
  fecha_registro: string;
  estado_paciente: 'REGISTRADO' | 'OPERADO' | 'ALTA';
  updated_at: string;
}

interface ChartDataPoint {
  date: string;
  label: string;
  pacientes: number;
  operados: number;
  consultas?: number;
  seguimiento?: number;
}

// Definición del tipo para los datos del chart
interface ChartData {
  categories: string[];
  series: Array<{
    name: string;
    data: number[];
  }>;
}

// Hook simulado si no se proporciona uno real.
const useMockDashboard = () => {
  const [dateRange, setDateRange] = useState<DateRange>('30dias');
  
  // Generar datos de pacientes de ejemplo
  const patients = useMemo(() => {
    const data: PatientData[] = [];
    let currentDate = new Date();
    for (let i = 0; i < 200; i++) {
      const regDate = new Date(currentDate);
      regDate.setDate(currentDate.getDate() - Math.floor(Math.random() * 365));
      const isOperado = Math.random() > 0.6;
      data.push({
        id: `p${i}`,
        fecha_registro: regDate.toISOString(),
        estado_paciente: isOperado ? 'OPERADO' : 'REGISTRADO',
        updated_at: new Date(regDate.setDate(regDate.getDate() + Math.floor(Math.random() * 14))).toISOString(),
      });
    }
    return data;
  }, []);
  
  // Datos simulados para el chart basado en el rango de fecha
  const chart: ChartData = useMemo(() => {
    // Generar categorías basadas en el rango de fecha seleccionado
    const categories: string[] = [];
    const today = new Date();
    const numDays = dateRange === '7dias' ? 7 : dateRange === '30dias' ? 30 : dateRange === '90dias' ? 90 : 12;
    
    if (dateRange === 'ytd') {
      // Para año, mostrar los meses
      for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), i, 1);
        categories.push(date.toLocaleDateString('es', { month: 'short' }));
      }
    } else {
      // Para días, mostrar las fechas
      for (let i = numDays - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        categories.push(date.toLocaleDateString('es', { day: 'numeric', month: 'short' }));
      }
    }
    
    // Generar datos simulados para cada serie
    return {
      categories,
      series: [
        {
          name: 'Consultas',
          data: Array.from({ length: categories.length }, () => Math.floor(Math.random() * 20) + 5),
        },
        {
          name: 'Operados',
          data: Array.from({ length: categories.length }, () => Math.floor(Math.random() * 15) + 3),
        },
        {
          name: 'Pacientes',
          data: Array.from({ length: categories.length }, () => Math.floor(Math.random() * 30) + 10),
        },
        {
          name: 'Seguimiento',
          data: Array.from({ length: categories.length }, () => Math.floor(Math.random() * 12) + 2),
        },
      ],
    };
  }, [dateRange]);

  return {
    loading: false,
    error: null,
    patients,
    dateRange,
    setDateRange,
    chart, // Incluir los datos del chart
  };
};

// --- COMPONENTES REUTILIZABLES ---

/**
 * Tooltip personalizado para el gráfico con un diseño profesional
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
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
  return null;
};

// --- COMPONENTE PRINCIPAL ---

export const PatientTrendsChart: React.FC = () => {
  // Usar el hook real si existe, si no, el de ejemplo.
  const { loading, error, patients = [], dateRange, setDateRange, chart } = typeof useDashboard === 'function' ? useDashboard() : useMockDashboard();
  
  // Convertir los datos del chart en el formato esperado y aplicar filtro por fecha
  const chartData = useMemo(() => {
    if (!chart || !chart.series || chart.series.length === 0) return [];
    
    // Aplicar filtrado basado en dateRange y formatear etiquetas según corresponda
    const isYearView = dateRange === 'ytd';
    
    return chart.categories.map((label: string, index: number) => {
      // Para la vista de año, asegurarse que se muestren los nombres de los meses
      let formattedLabel = label;
      if (isYearView) {
        // Si es posible, formatear el mes de forma más clara
        try {
          // Si el mes ya viene formateado como 'ene', 'feb', etc.
          // lo capitalizamos para mejor presentación
          formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
        } catch (e) {
          // Mantener el formato original si hay algún error
        }
      }
      
      return {
        date: `day-${index}`,
        label: formattedLabel,
        pacientes: chart.series[2]?.data[index] || 0,
        operados: chart.series[1]?.data[index] || 0,
        consultas: chart.series[0]?.data[index] || 0,
        seguimiento: chart.series[3]?.data[index] || 0,
      };
    });
  }, [chart, dateRange]);



  const description: Record<DateRange, string> = {
    '7dias': 'Mostrando datos de los últimos 7 días',
    '30dias': 'Mostrando datos de los últimos 30 días',
    '90dias': 'Mostrando datos de los últimos 90 días',
    'ytd': 'Mostrando datos de todo el año actual',
  };
  
  // Función para manejar el cambio de rango de fecha
  const handleDateRangeChange = (value: string) => {
    // Aplicar el nuevo rango de fecha
    setDateRange(value as DateRange);
  };

  // --- RENDERIZADO DE ESTADOS ---

  const renderContent = () => {
    if (loading) {
      return <Skeleton className="h-[300px] w-full rounded-xl bg-slate-100 dark:bg-slate-700/50" />;
    }
    
    if (error) {
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
    
    if (chartData.length === 0) {
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
                    fill: dateRange === 'ytd' ? '#6366f1' : undefined,
                    fontWeight: dateRange === 'ytd' ? 'bold' : undefined
                  }}
                  tickMargin={8}
                  interval={dateRange === 'ytd' ? 0 : 'preserveEnd'}
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
  };

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
                {description[dateRange]}
              </CardDescription>
            </div>
          </div>
          <Tabs value={dateRange} onValueChange={handleDateRangeChange} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-4 w-full sm:w-auto h-auto p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1 shadow-sm">
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