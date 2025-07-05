import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, TrendingUp, Users, Activity, BarChart3 } from "lucide-react";

interface ChartDataPoint {
  name: string;
  consultas: number;
  operados: number;
}

// Mock data for demonstration
const mockChart = {
  categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
  series: [
    { name: 'Consultas', data: [120, 150, 180, 140, 200, 170] },
    { name: 'Operados', data: [80, 95, 110, 85, 130, 105] }
  ]
};

const useDashboard = () => ({
  loading: false,
  error: null,
  appointments: [],
  patients: [],
  chart: mockChart,
});

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-4 min-w-[180px]">
        <p className="font-semibold text-gray-900 mb-2">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">{entry.name}</span>
            </div>
            <span className="font-semibold text-gray-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Metric Card Component
const MetricCard = ({ icon: Icon, label, value, trend, color }: {
  icon: any;
  label: string;
  value: string | number;
  trend?: string;
  color: string;
}) => (
  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-300">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
      {trend && (
        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
          {trend}
        </Badge>
      )}
    </div>
  </div>
);

export const PatientAnalytics: React.FC = () => {
  const { 
    loading, 
    error, 
    appointments = [],
    patients = [],
    chart,
  } = useDashboard();

  const transformedChartData = useMemo((): ChartDataPoint[] => {
    if (!chart || !chart.series || !chart.categories || chart.series.length < 2) {
      return [];
    }
    
    const consultasSeries = chart.series.find((s: {name: string; data: number[]}) => s.name === 'Consultas');
    const operadosSeries = chart.series.find((s: {name: string; data: number[]}) => s.name === 'Operados');
    
    if (!consultasSeries || !operadosSeries) {
      return [];
    }
    
    return chart.categories.map((category: string, index: number) => ({
      name: category,
      consultas: consultasSeries.data[index] || 0,
      operados: operadosSeries.data[index] || 0,
    }));
  }, [chart]);

  // Loading State
  if (loading) {
    return (
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-[280px] rounded-lg" />
              <Skeleton className="h-4 w-[350px] rounded-md" />
            </div>
            <Skeleton className="h-10 w-[120px] rounded-lg" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[100px] rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[350px] w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  // Error State
  if (error) {
    return (
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <span className="text-red-900">Error al cargar datos</span>
          </CardTitle>
          <CardDescription className="text-red-700">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[200px] text-center p-8">
            <div className="p-4 rounded-full bg-red-200 mb-4">
              <BarChart3 className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="font-semibold text-red-900 mb-2">No se pudieron cargar los datos</h3>
            <p className="text-sm text-red-700 max-w-md">
              Intente refrescar la página o contacte al soporte si el problema persiste.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No Data State
  if (!transformedChartData || transformedChartData.length === 0) {
    return (
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-blue-50">
        <CardHeader className="pb-6">
          <CardTitle className="text-xl font-bold text-gray-900">Tendencia de Pacientes</CardTitle>
          <CardDescription className="text-gray-600">No hay datos disponibles para mostrar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-center p-8">
            <div className="p-6 rounded-full bg-blue-100 mb-6">
              <TrendingUp className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Sin datos disponibles</h3>
            <p className="text-sm text-gray-600 max-w-md">
              No hay suficientes datos para mostrar tendencias de pacientes en este período.
            </p>
            <Badge variant="outline" className="mt-4 bg-blue-50 text-blue-700 border-blue-200">
              Esperando datos
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate metrics
  const { totalConsultas, totalOperados, conversionRate } = useMemo(() => {
    const totalConsultas = transformedChartData.reduce((sum, item) => sum + item.consultas, 0);
    const totalOperados = transformedChartData.reduce((sum, item) => sum + item.operados, 0);
    const conversionRate = totalConsultas > 0 ? Math.round((totalOperados / totalConsultas) * 100) : 0;
    
    return { totalConsultas, totalOperados, conversionRate };
  }, [transformedChartData]);

  return (
    <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-gray-50 to-blue-50">
      <CardHeader className="pb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <TrendingUp className="h-6 w-6" />
              </div>
              Análisis de Pacientes
            </CardTitle>
            <CardDescription className="text-blue-100 mt-2">
              Seguimiento detallado de consultas y operaciones
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
            Últimos 6 meses
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            icon={Users}
            label="Total Consultas"
            value={totalConsultas.toLocaleString()}
            trend="+12.5%"
            color="from-blue-500 to-blue-600"
          />
          <MetricCard
            icon={Activity}
            label="Pacientes Operados"
            value={totalOperados.toLocaleString()}
            trend="+8.3%"
            color="from-green-500 to-green-600"
          />
          <MetricCard
            icon={BarChart3}
            label="Tasa de Conversión"
            value={`${conversionRate}%`}
            color="from-purple-500 to-purple-600"
          />
        </div>

        {/* Chart Container */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={transformedChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="consultasGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="operadosGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#E5E7EB" 
                  strokeOpacity={0.6}
                />
                
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  fontWeight={500}
                  fill="#6B7280"
                />
                
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  fontWeight={500}
                  fill="#6B7280"
                  tickFormatter={(value: number) => `${value}`}
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: '20px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }} 
                />
                
                <Area
                  name="Consultas"
                  type="monotone"
                  dataKey="consultas"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  fill="url(#consultasGradient)"
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, stroke: '#3B82F6', strokeWidth: 2, fill: '#fff' }}
                />
                
                <Area 
                  name="Operados" 
                  type="monotone" 
                  dataKey="operados" 
                  stroke="#10B981"
                  strokeWidth={3}
                  fill="url(#operadosGradient)"
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, stroke: '#10B981', strokeWidth: 2, fill: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

PatientAnalytics.displayName = 'PatientAnalytics';
export default PatientAnalytics;