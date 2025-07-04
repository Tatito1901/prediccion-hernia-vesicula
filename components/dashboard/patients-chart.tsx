"use client";

import React, { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useChartData } from "@/hooks/use-chart-data";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- Definición de Tipos ---
// Aseguramos un código robusto y libre de errores con tipado estricto.

interface Patient {
  fecha_registro: string; // Se asume formato ISO 8601
  estado_paciente?: 'OPERADO' | string;
  fecha_cirugia_programada?: string; // Se asume formato ISO 8601
}

interface DataPoint {
  name: string; // Nombre del día o mes (ej. "23 Jun", "Jun")
  pacientes: number;
  operados: number;
}

type DateRange = "7dias" | "30dias" | "90dias" | "ytd";

// --- Lógica de Fechas Centralizada ---
// Funciones de ayuda para mantener el código limpio y reutilizable.

/**
 * Formatea una fecha para usarla como clave en el mapa de datos (ej. "2023-05-23").
 * @param date - El objeto Date a formatear.
 * @returns La fecha en formato YYYY-MM-DD.
 */
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Genera el conjunto de datos base para el gráfico según el rango de fechas.
 * @param range - El rango de fechas seleccionado ("7dias", "30dias", etc.).
 * @returns Un Map con las fechas/meses inicializados a cero.
 */
const generateDateMap = (range: DateRange): Map<string, DataPoint> => {
  const map = new Map<string, DataPoint>();
  const today = new Date();
  
  const addDays = (days: number) => {
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (days - 1 - i));
      const key = formatDateKey(date);
      map.set(key, { name: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), pacientes: 0, operados: 0 });
    }
  };

  const addMonths = (months: number) => {
    for (let i = 0; i < months; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - (months - 1 - i), 1);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const name = date.toLocaleString('es-ES', { month: 'short' });
        map.set(key, { name: name.charAt(0).toUpperCase() + name.slice(1), pacientes: 0, operados: 0 });
    }
  }

  switch (range) {
    case '7dias':
      addDays(7);
      break;
    case '30dias':
      addDays(30);
      break;
    case '90dias':
      addMonths(3);
      break;
    case 'ytd':
    default:
      addMonths(12);
      break;
  }
  return map;
};


// --- Componente Principal del Gráfico ---

const PatientsChart: React.FC<{ dateRange: DateRange }> = ({ dateRange }) => {
  // 1. OBTENCIÓN DE DATOS
  // El hook ahora recibe el `dateRange` para buscar los datos correctos.
  const { rawData: { patients = [] }, loading, error } = useChartData({ dateRange }) as {
      rawData: { patients: Patient[] };
      loading: boolean;
      error: Error | null;
  };

  // 2. PROCESAMIENTO DE DATOS OPTIMIZADO
  // `useMemo` recalcula solo si los pacientes o el rango cambian.
  const chartData = useMemo((): DataPoint[] => {
    const dataMap = generateDateMap(dateRange);
    const isDaily = dateRange === '7dias' || dateRange === '30dias';

    patients.forEach(patient => {
      // Conteo de pacientes nuevos
      if (patient.fecha_registro) {
        const regDate = new Date(patient.fecha_registro);
        if (isNaN(regDate.getTime())) return;

        const key = isDaily ? formatDateKey(regDate) : `${regDate.getFullYear()}-${regDate.getMonth()}`;
        if (dataMap.has(key)) {
          dataMap.get(key)!.pacientes += 1;
        }
      }

      // Conteo de pacientes operados
      if (patient.estado_paciente === 'OPERADO' && patient.fecha_cirugia_programada) {
        const surgDate = new Date(patient.fecha_cirugia_programada);
        if (isNaN(surgDate.getTime())) return;

        const key = isDaily ? formatDateKey(surgDate) : `${surgDate.getFullYear()}-${surgDate.getMonth()}`;
        if (dataMap.has(key)) {
          dataMap.get(key)!.operados += 1;
        }
      }
    });

    return Array.from(dataMap.values());
  }, [patients, dateRange]);

  // 3. RENDERIZADO CONDICIONAL
  if (loading) {
    return <Skeleton className="h-[350px] w-full rounded-lg" />;
  }

  if (error) {
    return (
      <div className="flex h-[350px] w-full items-center justify-center rounded-lg bg-muted/50">
        <p className="text-center text-sm text-destructive">
          Error al cargar los datos del gráfico.<br/>
          <span className="text-xs">{error.message}</span>
        </p>
      </div>
    );
  }

  // 4. VISUALIZACIÓN DEL GRÁFICO
  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPacientes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorOperados" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--secondary-foreground))" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="hsl(var(--secondary-foreground))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              borderColor: 'hsl(var(--border))',
              borderRadius: '0.75rem',
            }}
          />
          <Area type="monotone" dataKey="pacientes" name="Nuevos" stroke="hsl(var(--primary))" fill="url(#colorPacientes)" strokeWidth={2} />
          <Area type="monotone" dataKey="operados" name="Operados" stroke="hsl(var(--secondary-foreground))" fill="url(#colorOperados)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};


// --- Componente Contenedor con Lógica de UI ---
// Este componente envuelve todo, proporcionando el título y las pestañas.

export const PatientTrendsChart: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>("30dias");

  const description = {
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
            <CardDescription>{description[dateRange]}</CardDescription>
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
        <PatientsChart dateRange={dateRange} />
      </CardContent>
    </Card>
  );
};

export default PatientTrendsChart;
