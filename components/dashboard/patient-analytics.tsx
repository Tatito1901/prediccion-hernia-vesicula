import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Users, Activity, Percent, BarChartHorizontal, Clock, Users2 } from "lucide-react";
import { useDashboard } from '@/contexts/dashboard-context';
import { format, differenceInDays } from 'date-fns';

// --- INTERFACES Y TIPOS ---
interface ChartDataPoint {
  name: string;
  consultas: number;
  operados: number;
}

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: string;
  colorClass: string;
  description?: string;
}

// --- COMPONENTES REUTILIZABLES ---

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/70 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-md rounded-xl overflow-hidden p-4 min-w-[180px]">
        <p className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between">
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

const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, label, value, trend, colorClass, description }) => (
  <Card className="group bg-white/60 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out h-full">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <span><span className="font-medium text-emerald-500">{trend}</span> vs mes anterior</span>
        </div>
      )}
    </CardContent>
  </Card>
);

// --- COMPONENTE PRINCIPAL ---

export const PatientAnalytics: React.FC = () => {
  const { loading, error, chart, clinicMetrics, dateRange } = useDashboard();

  // Transform chart data for the area chart
  const transformedChartData = useMemo((): ChartDataPoint[] => {
    if (!chart?.series || !chart.categories || chart.series.length === 0) {
      return [];
    }

    // Find indices for the series we need
    const consultasIndex = chart.series.findIndex(s => s.name === 'Consultas');
    const operadosIndex = chart.series.findIndex(s => s.name === 'Operados');
    
    return chart.categories.map((category, index) => ({
      name: category,
      consultas: consultasIndex >= 0 ? chart.series[consultasIndex]?.data[index] || 0 : 0,
      operados: operadosIndex >= 0 ? chart.series[operadosIndex]?.data[index] || 0 : 0,
    }));
  }, [chart]);

  // Calculate metrics from real data
  const metrics = useMemo(() => {
    // Default values
    const defaults = {
      totalConsultas: 0, 
      totalOperados: 0, 
      conversionRate: 0,
      avgDecisionTime: 0,
      mainSource: 'No disponible'
    };
    
    // Fallback to calculated metrics if API metrics are not available
    if (!clinicMetrics) {
      if (transformedChartData.length > 0) {
        const totalConsultas = transformedChartData.reduce((sum, item) => sum + item.consultas, 0);
        const totalOperados = transformedChartData.reduce((sum, item) => sum + item.operados, 0);
        const conversionRate = totalConsultas > 0 ? Math.round((totalOperados / totalConsultas) * 100) : 0;
        return { 
          ...defaults, 
          totalConsultas, 
          totalOperados, 
          conversionRate 
        };
      }
      return defaults;
    }

    // Use metrics directly from the API if available
    const totalConsultas = clinicMetrics.totalPacientes || 0;
    const totalOperados = clinicMetrics.pacientesOperados || 0;
    const conversionRate = clinicMetrics.tasaConversion || 0;
    const avgDecisionTime = clinicMetrics.tiempoPromedioDecision || 0;
    const mainSource = clinicMetrics.fuentePrincipalPacientes || 'No disponible';
    
    return { totalConsultas, totalOperados, conversionRate, avgDecisionTime, mainSource };
  }, [clinicMetrics, transformedChartData]);

  // --- ESTADOS DE UI ---

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <Skeleton className="h-4 w-80 rounded-md bg-slate-200 dark:bg-slate-700" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-white/60 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-pulse">
              <CardContent className="p-5">
                <Skeleton className="h-4 w-32 mb-2 bg-slate-200 dark:bg-slate-700" />
                <Skeleton className="h-8 w-24 mb-3 bg-slate-200 dark:bg-slate-700" />
                <Skeleton className="h-4 w-48 bg-slate-200 dark:bg-slate-700" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-3xl">
        <CardContent className="flex flex-col items-center justify-center h-[500px] text-center p-8">
          <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/20 mb-4">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-amber-900 dark:text-amber-200 mb-2">Error al cargar datos</h3>
          <p className="text-sm text-amber-700 dark:text-amber-400 max-w-md">
            No pudimos recuperar la información de analíticas. Por favor, intenta refrescar la página o contacta a soporte si el problema persiste.
          </p>
          <pre className="mt-4 text-xs text-amber-600 dark:text-amber-500 bg-amber-100 dark:bg-amber-900/20 p-2 rounded-md max-w-md overflow-x-auto">
            {String(error)}
          </pre>
        </CardContent>
      </Card>
    );
  }

  if (!transformedChartData || transformedChartData.length === 0) {
    return (
      <Card className="bg-slate-50 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-800 rounded-3xl">
        <CardContent className="flex flex-col items-center justify-center h-[500px] text-center p-8">
          <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
            <BarChartHorizontal className="h-10 w-10 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">No hay datos para mostrar</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
            Aún no hay suficientes registros de pacientes en este período para generar un análisis de tendencias.
          </p>
          <Badge variant="outline" className="mt-6 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            Esperando datos
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/10 rounded-3xl w-full font-sans">
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl text-blue-500 dark:text-blue-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Análisis de Tendencias
              </CardTitle>
              <CardDescription className="mt-2 text-slate-600 dark:text-slate-400 text-base">
                Seguimiento detallado de consultas y pacientes operados en los últimos 7 meses.
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 h-fit py-2 px-4">
            {dateRange === '7dias' ? 'Últimos 7 días' : 
             dateRange === '30dias' ? 'Últimos 30 días' : 
             dateRange === '90dias' ? 'Últimos 90 días' : 
             dateRange === 'ytd' ? 'Este año' : 'Todos los datos'}
          </Badge>
        </div>
      </header>
      
      {/* Grid de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <MetricCard
          icon={Users}
          label="Total de Consultas"
          value={metrics.totalConsultas.toLocaleString()}
          trend="+15.2%"
          colorClass="text-blue-500 bg-blue-500"
        />
        <MetricCard
          icon={Activity}
          label="Pacientes Operados"
          value={metrics.totalOperados.toLocaleString()}
          trend="+9.8%"
          colorClass="text-emerald-500 bg-emerald-500"
        />
        <MetricCard
          icon={Percent}
          label="Tasa de Conversión"
          value={`${metrics.conversionRate}%`}
          colorClass="text-indigo-500 bg-indigo-500"
          description="Porcentaje de consultas que resultaron en operación"
        />
        <MetricCard
          icon={Clock}
          label="Tiempo Promedio de Decisión"
          value={`${metrics.avgDecisionTime} días`}
          colorClass="text-amber-500 bg-amber-500"
          description="Tiempo promedio entre consulta y operación"
        />
      </div>

      {/* Gráfico */}
      <Card className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <CardContent className="p-0">
          <div className="h-[400px] w-full p-4 sm:p-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={transformedChartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="colorConsultas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOperados" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                  className="dark:tick-fill-slate-400"
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                  className="dark:tick-fill-slate-400"
                  tickFormatter={(value: number) => value.toLocaleString()}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3', strokeOpacity: 0.3 }} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={50}
                  iconType="circle"
                  iconSize={10}
                  wrapperStyle={{ fontSize: '14px', fontWeight: '500' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="consultas" 
                  name="Consultas"
                  stroke="#3b82f6" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorConsultas)" 
                  activeDot={{ r: 6, strokeWidth: 2, fill: '#fff', stroke: '#3b82f6' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="operados" 
                  name="Operados"
                  stroke="#10b981" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorOperados)" 
                  activeDot={{ r: 6, strokeWidth: 2, fill: '#fff', stroke: '#10b981' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

PatientAnalytics.displayName = 'PatientAnalytics';
export default PatientAnalytics;