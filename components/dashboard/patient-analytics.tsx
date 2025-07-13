import React, { useMemo } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend
} from 'recharts';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card"
import { 
  Skeleton 
} from "@/components/ui/skeleton"
import { 
  Badge 
} from "@/components/ui/badge"
import { 
  Users, 
  Activity, 
  BarChart3, 
  TrendingUp, 
  AlertCircle, 
  Calendar, 
  RefreshCw,
  Info,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChartDataPoint {
  name: string;
  consultas: number;
  operados: number;
}

// Mock data for demonstration
const mockChart = {
  categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'],
  series: [
    { name: 'Consultas', data: [120, 150, 180, 140, 200, 170, 190, 210] },
    { name: 'Operados', data: [80, 95, 110, 85, 130, 105, 125, 140] }
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
      <div className="bg-background border border-border rounded-lg shadow-lg p-4 min-w-[180px]">
        <p className="font-semibold text-foreground mb-3">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-semibold text-foreground">{entry.value}</span>
            </div>
          ))}
        </div>
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
  <div className="bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 group">
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
      </div>
      {trend && (
        <Badge 
          variant={trend.includes('+') ? "success" : "destructive"} 
          className="text-xs"
        >
          {trend}
        </Badge>
      )}
    </div>
    <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
      <Info className="h-3 w-3" />
      <span className="text-xs">
        {label.includes('Tasa') ? 'Conversión consulta a cirugía' : 'Últimos 8 meses'}
      </span>
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

  const [timeRange, setTimeRange] = React.useState('8meses');
  
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
      <Card className="overflow-hidden">
        <CardHeader className="pb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Skeleton className="h-8 w-48 rounded-lg mb-2" />
              <Skeleton className="h-5 w-64 rounded-md" />
            </div>
            <Skeleton className="h-10 w-40 rounded-lg" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-7 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full mt-3" />
              </div>
            ))}
          </div>
          <div className="bg-card border rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error State
  if (error) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive text-destructive-foreground">
              <AlertCircle className="h-5 w-5" />
            </div>
            <span>Error al cargar datos</span>
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-center p-8">
            <div className="p-4 rounded-full bg-destructive/20 mb-4">
              <BarChart3 className="h-10 w-10 text-destructive" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Error en la carga de datos</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              No se pudieron cargar los datos de pacientes. Por favor, inténtalo de nuevo.
            </p>
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Recargar datos
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No Data State
  if (!transformedChartData || transformedChartData.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-6">
          <CardTitle className="text-xl font-bold">Análisis de Pacientes</CardTitle>
          <CardDescription>No hay datos disponibles para mostrar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-center p-8">
            <div className="p-6 rounded-full bg-primary/10 mb-6">
              <TrendingUp className="h-12 w-12 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Sin datos disponibles</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              No hay suficientes datos para mostrar tendencias de pacientes.
            </p>
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Intentar de nuevo
            </Button>
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

  // Calculate averages
  const { avgConsultas, avgOperados, avgRatio } = useMemo(() => {
    const validData = transformedChartData.filter(item => item.consultas > 0 || item.operados > 0);
    if (validData.length === 0) return { avgConsultas: 0, avgOperados: 0, avgRatio: 0 };
    
    const totalConsultas = validData.reduce((sum, item) => sum + item.consultas, 0);
    const totalOperados = validData.reduce((sum, item) => sum + item.operados, 0);
    
    return {
      avgConsultas: Math.round(totalConsultas / validData.length),
      avgOperados: Math.round(totalOperados / validData.length),
      avgRatio: Math.round((totalOperados / totalConsultas) * 100)
    };
  }, [transformedChartData]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold">Análisis de Pacientes</CardTitle>
            </div>
            <CardDescription className="mt-2 ml-10">
              Seguimiento detallado de consultas y operaciones
            </CardDescription>
          </div>
          
          <Tabs 
            value={timeRange} 
            onValueChange={setTimeRange}
            className="w-full md:w-auto"
          >
            <TabsList className="bg-muted p-1 h-auto rounded-lg">
              <TabsTrigger 
                value="3meses" 
                className="px-3 py-1.5 text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                3 meses
              </TabsTrigger>
              <TabsTrigger 
                value="6meses" 
                className="px-3 py-1.5 text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                6 meses
              </TabsTrigger>
              <TabsTrigger 
                value="8meses" 
                className="px-3 py-1.5 text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                8 meses
              </TabsTrigger>
              <TabsTrigger 
                value="ano" 
                className="px-3 py-1.5 text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                1 año
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <MetricCard
            icon={Users}
            label="Total Consultas"
            value={totalConsultas.toLocaleString()}
            trend="+12.5%"
            color="bg-blue-500"
          />
          <MetricCard
            icon={Activity}
            label="Pacientes Operados"
            value={totalOperados.toLocaleString()}
            trend="+8.3%"
            color="bg-green-500"
          />
          <MetricCard
            icon={BarChart3}
            label="Tasa de Conversión"
            value={`${conversionRate}%`}
            color="bg-purple-500"
          />
        </div>

        {/* Chart Container */}
        <div className="bg-card border rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
            <div>
              <h3 className="text-lg font-semibold">Tendencia Mensual</h3>
              <p className="text-sm text-muted-foreground">
                Evolución de consultas y operaciones en el tiempo
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Consultas</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Operados</span>
              </div>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={transformedChartData}
                margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="consultasGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="operadosGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  strokeOpacity={0.2}
                  className="stroke-muted"
                />
                
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  fontWeight={500}
                  className="fill-muted-foreground"
                />
                
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  fontWeight={500}
                  className="fill-muted-foreground"
                  tickFormatter={(value: number) => `${value}`}
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                <Area
                  name="Consultas"
                  type="monotone"
                  dataKey="consultas"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#consultasGradient)"
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2, fill: '#fff' }}
                />
                
                <Area 
                  name="Operados" 
                  type="monotone" 
                  dataKey="operados" 
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#operadosGradient)"
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-medium">Resumen estadístico</h3>
                <p className="text-sm text-muted-foreground">
                  Promedios mensuales del período seleccionado
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="text-center min-w-[100px]">
                  <p className="text-sm text-muted-foreground">Consultas</p>
                  <p className="font-bold text-xl">{avgConsultas}</p>
                  <p className="text-xs text-green-600 flex items-center justify-center mt-1">
                    <ArrowUpRight className="h-3 w-3 mr-1" /> 12.5%
                  </p>
                </div>
                <div className="text-center min-w-[100px]">
                  <p className="text-sm text-muted-foreground">Operaciones</p>
                  <p className="font-bold text-xl">{avgOperados}</p>
                  <p className="text-xs text-green-600 flex items-center justify-center mt-1">
                    <ArrowUpRight className="h-3 w-3 mr-1" /> 8.3%
                  </p>
                </div>
                <div className="text-center min-w-[100px]">
                  <p className="text-sm text-muted-foreground">Ratio</p>
                  <p className="font-bold text-xl">{avgRatio}%</p>
                  <p className="text-xs text-green-600 flex items-center justify-center mt-1">
                    <ArrowUpRight className="h-3 w-3 mr-1" /> 3.2%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardContent className="px-6 pb-6">
        <div className="flex flex-col md:flex-row justify-between gap-4 pt-4 border-t border-border">
          <div>
            <h3 className="font-medium">Informe de tendencias</h3>
            <p className="text-sm text-muted-foreground">
              Descargar análisis completo en formato PDF
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Comparar con período anterior
            </Button>
            <Button>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Exportar informe
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

PatientAnalytics.displayName = 'PatientAnalytics';
export default PatientAnalytics;