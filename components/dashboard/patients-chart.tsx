import React, { useMemo } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { useDashboard } from '@/contexts/dashboard-context';
import { 
  Skeleton 
} from "@/components/ui/skeleton";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { format } from 'date-fns';
import { 
  AlertTriangle, 
  Users, 
  Activity, 
  Calendar, 
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// --- Tipos de Datos ---
type DateRange = '7dias' | '30dias' | '90dias' | 'ytd';

interface ChartDataPoint {
  date: string;
  label: string;
  pacientes: number;
  operados: number;
}

// --- Componente Personalizado del Tooltip ---
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

// --- Componente Principal del Gráfico ---
function PatientsChart() {
  const { loading, error, patients = [], dateRange } = useDashboard();

  const chartData = useMemo(() => {
    if (!patients || patients.length === 0) return [];
    
    const isDaily = dateRange === '7dias' || dateRange === '30dias';
    const dataMap = new Map<string, ChartDataPoint>();
    const today = new Date();
    const endDate = new Date();
    let startDate: Date;
    
    if (dateRange === '7dias') {
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    } else if (dateRange === '30dias') {
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
    } else if (dateRange === '90dias') {
      startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    } else {
      startDate = new Date(today.getFullYear(), 0, 1);
    }
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = isDaily
        ? format(currentDate, 'yyyy-MM-dd')
        : format(currentDate, 'yyyy-MM');
        
      const labelFormat = isDaily ? 'dd MMM' : 'MMM yyyy';
      
      dataMap.set(dateKey, {
        date: dateKey,
        label: format(currentDate, labelFormat),
        pacientes: 0,
        operados: 0
      });
      
      if (isDaily) {
        currentDate.setDate(currentDate.getDate() + 1);
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }
    
    patients.forEach((patient) => {
      if (patient.fecha_registro) {
        const regDate = new Date(patient.fecha_registro);
        const dateKey = isDaily
          ? format(regDate, 'yyyy-MM-dd')
          : format(regDate, 'yyyy-MM');
          
        if (dataMap.has(dateKey)) {
          const data = dataMap.get(dateKey)!;
          data.pacientes += 1;
        }
      }
      
      if (patient.estado_paciente === 'OPERADO' && patient.updated_at) {
        const opDate = new Date(patient.updated_at);
        const dateKey = isDaily
          ? format(opDate, 'yyyy-MM-dd')
          : format(opDate, 'yyyy-MM');
          
        if (dataMap.has(dateKey)) {
          const data = dataMap.get(dateKey)!;
          data.operados += 1;
        }
      }
    });
    
    return Array.from(dataMap.values());
  }, [patients, dateRange]);
  
  // Calcular totales para la leyenda
  const totals = useMemo(() => {
    return chartData.reduce((acc, data) => {
      acc.pacientes += data.pacientes;
      acc.operados += data.operados;
      return acc;
    }, { pacientes: 0, operados: 0 });
  }, [chartData]);

  if (loading) {
    return (
      <div className="h-[350px] flex flex-col">
        <div className="flex justify-between mb-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] text-center p-8">
        <div className="p-4 rounded-full bg-destructive/20 mb-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="font-semibold mb-2">Error al cargar datos</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          No se pudieron cargar los datos para el gráfico.
        </p>
        <Button variant="outline" className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Recargar datos
        </Button>
      </div>
    );
  }
  
  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] text-center p-8">
        <div className="p-4 rounded-full bg-primary/10 mb-4">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-semibold mb-2">Sin datos disponibles</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          No hay suficientes datos para mostrar tendencias de pacientes en este período.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[350px] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-semibold">Tendencia de pacientes</h3>
          <p className="text-sm text-muted-foreground">
            Evolución de nuevos pacientes y operados
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm">Nuevos: {totals.pacientes}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm">Operados: {totals.operados}</span>
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 5, left: 0, bottom: 20 }}
        >
          <defs>
            <linearGradient id="pacientesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="operadosGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            className="stroke-muted"
          />
          
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            className="fill-muted-foreground"
          />
          
          <YAxis 
            width={30}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Area
            type="monotone"
            dataKey="pacientes"
            stroke="#3b82f6"
            fill="url(#pacientesGradient)"
            strokeWidth={2}
            name="Nuevos Pacientes"
          />
          <Area
            type="monotone"
            dataKey="operados"
            stroke="#10b981"
            fill="url(#operadosGradient)"
            strokeWidth={2}
            name="Pacientes Operados"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- Componente Contenedor con Lógica de UI ---
export const PatientTrendsChart: React.FC = () => {
  const { dateRange, setDateRange } = useDashboard();
  
  const descriptions: Record<string, string> = {
    '7dias': 'Datos de la última semana',
    '30dias': 'Datos del último mes',
    '90dias': 'Datos de los últimos 3 meses',
    'ytd': 'Datos del último año'
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Activity className="h-5 w-5" />
              </div>
              Tendencia de Pacientes
            </CardTitle>
            <CardDescription className="mt-1">
              {descriptions[dateRange as keyof typeof descriptions]}
            </CardDescription>
          </div>
          
          <Tabs 
            value={dateRange} 
            onValueChange={(value) => setDateRange(value as DateRange)}
          >
            <TabsList className="bg-muted p-1 h-auto rounded-lg">
              <TabsTrigger 
                value="7dias" 
                className="px-3 py-1.5 text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                7 días
              </TabsTrigger>
              <TabsTrigger 
                value="30dias" 
                className="px-3 py-1.5 text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                30 días
              </TabsTrigger>
              <TabsTrigger 
                value="90dias" 
                className="px-3 py-1.5 text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                90 días
              </TabsTrigger>
              <TabsTrigger 
                value="ytd" 
                className="px-3 py-1.5 text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Año actual
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      
      <CardContent>
        <PatientsChart />
      </CardContent>
      
      <div className="px-6 pb-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t border-border">
          <div>
            <h4 className="font-medium">Resumen</h4>
            <p className="text-sm text-muted-foreground">
              Comparativa entre nuevos pacientes y operados
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Nuevos pacientes</p>
              <p className="font-bold">1,240</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Pacientes operados</p>
              <p className="font-bold">782</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Ratio de operación</p>
              <p className="font-bold">63.1%</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PatientTrendsChart;