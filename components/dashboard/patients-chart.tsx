"use client";

import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDashboard } from '@/contexts/dashboard-context';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

// --- Tipos de Datos ---

type DateRange = '7dias' | '30dias' | '90dias' | 'ytd';

interface ChartDataPoint {
  date: string;
  label: string;
  pacientes: number;
  operados: number;
}

// --- Componente Principal del Gráfico ---

export function PatientsChart() {
  // Use the centralized dashboard context
  const { loading, error, patients = [], dateRange, setDateRange } = useDashboard();

  // Process data for chart display with appropriate date format
  const chartData = useMemo(() => {
    if (!patients || patients.length === 0) return [];
    
    // Determine if we should use daily or monthly grouping
    const isDaily = dateRange === '7dias' || dateRange === '30dias';
    
    // Create a map to hold our data points by date
    const dataMap = new Map<string, ChartDataPoint>();
    
    // Initialize date range based on selected range
    const today = new Date();
    const endDate = new Date();
    let startDate: Date;
    
    if (dateRange === '7dias') {
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    } else if (dateRange === '30dias') {
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
    } else if (dateRange === '90dias') {
      startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    } else { // ytd
      startDate = new Date(today.getFullYear(), 0, 1); // January 1st of current year
    }
    
    // Initialize the date map with all dates in the range
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
    
    // Count patients and operated patients by date
    patients.forEach((patient) => {
      // Count new patients
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
      
      // Count operated patients
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
    
    // Convert map to array for the chart
    return Array.from(dataMap.values());
  }, [patients, dateRange]);
  
  // Render skeleton while loading
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
            <CardTitle>Error al cargar datos</CardTitle>
          </div>
          <CardDescription>{typeof error === 'string' ? error : 'Error al cargar los datos de pacientes'}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-12 text-muted-foreground">No se pudieron cargar los datos para el gráfico.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Render empty state
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pacientes por período</CardTitle>
          <CardDescription>No hay datos disponibles para el período seleccionado</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-12 text-muted-foreground">No hay datos suficientes para mostrar el gráfico.</p>
        </CardContent>
      </Card>
    );
  }

  // Render chart with data
  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 5, left: 0, bottom: 0 }}
        >
          {/* Grid background */}
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          
          {/* Axis configuration */}
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            width={30}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11 }}
          />
          
          {/* Tooltip with friendly format */}
          <Tooltip
            contentStyle={{ 
              backgroundColor: 'white', 
              borderColor: '#e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            formatter={(value: number) => [value, '']} 
          />
          
          {/* Chart areas */}
          <Area
            type="monotone"
            dataKey="pacientes"
            stroke="#93c5fd" // Light blue
            fill="#dbeafe" // Very light blue
            strokeWidth={2}
            name="Pacientes Nuevos"
          />
          <Area
            type="monotone"
            dataKey="operados"
            stroke="#4ade80" // Light green
            fill="#d1fae5" // Very light green
            strokeWidth={2}
            name="Pacientes Operados"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- Componente Contenedor con Lógica de UI ---
// Este componente envuelve todo, proporcionando el título y las pestañas.

export const PatientTrendsChart: React.FC = () => {
  const { dateRange, setDateRange } = useDashboard();
  
  const description: Record<string, string> = {
    '7dias': 'Datos de la última semana.',
    '30dias': 'Datos del último mes.',
    '90dias': 'Datos de los últimos 3 meses.',
    'ytd': 'Datos del último año.',
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>Tendencia de Pacientes</CardTitle>
            <CardDescription>{description[dateRange as keyof typeof description]}</CardDescription>
          </div>
          <Tabs value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4 h-auto">
              <TabsTrigger value="7dias">7d</TabsTrigger>
              <TabsTrigger value="30dias">30d</TabsTrigger>
              <TabsTrigger value="90dias">90d</TabsTrigger>
              <TabsTrigger value="ytd">Año</TabsTrigger>
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

PatientTrendsChart.displayName = 'PatientTrendsChart';
export default PatientTrendsChart;