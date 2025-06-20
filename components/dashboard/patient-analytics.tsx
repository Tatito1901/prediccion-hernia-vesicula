"use client"

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Asumo que estos componentes de ui son de shadcn/ui o similar
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useChartData } from "@/hooks/use-chart-data";
import { Skeleton } from "@/components/ui/skeleton";





// El componente PatientAnalytics, envuelto en React.memo para optimización.
// React.memo previene re-renderizados si las props no cambian.
export const PatientAnalytics: React.FC = React.memo(() => {
  // Obtener datos desde el API
  const { rawData: { patients }, loading, error } = useChartData({ dateRange: 'ytd' });


  // Calcular los datos mensuales para los últimos 12 meses
  const chartData = useMemo(() => {
    const today = new Date();

    // Construir array base con los últimos 12 meses
    const months = Array.from({ length: 12 }).map((_, idx) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (11 - idx), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        name: date.toLocaleString('es-ES', { month: 'short' }),
        pacientes: 0,
        operados: 0,
      };
    });

    // Contar pacientes nuevos y operados en cada mes
    patients.forEach((p: any) => {
      if (!p.fecha_registro) return;
      const fechaRegistro = new Date(p.fecha_registro);
      const key = `${fechaRegistro.getFullYear()}-${fechaRegistro.getMonth()}`;
      const monthEntry = months.find(m => m.key === key);
      if (monthEntry) {
        monthEntry.pacientes += 1;
        // Consideramos operado si el estado del paciente es "OPERADO"
        if (p.estado === 'OPERADO' || p.estado_paciente === 'OPERADO') {
          monthEntry.operados += 1;
        }
      }
    });

    // Formatear la salida para el gráfico
    return months.map(({ name, pacientes, operados }) => ({ name, pacientes, operados }));
  }, [patients]);

  // Estado de carga
  if (loading) {
    return (
      <div className="grid gap-4 md:gap-6">
        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-4 pt-5 px-5 md:px-6">
            <CardTitle className="text-lg md:text-xl">Tendencia de Pacientes</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">Cargando datos...</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <Skeleton className="h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado de error
  if (error) {
    return (
      <div className="grid gap-4 md:gap-6">
        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-4 pt-5 px-5 md:px-6">
            <CardTitle className="text-lg md:text-xl">Tendencia de Pacientes</CardTitle>
            <CardDescription className="text-sm text-destructive">{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:gap-6"> {/* Espaciado responsivo */}
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
        <CardHeader className="pb-4 pt-5 px-5 md:px-6"> {/* Padding responsivo */}
          <CardTitle className="text-lg md:text-xl">Tendencia de Pacientes</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Pacientes nuevos vs. operados por mes (últimos 12 meses)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 md:p-1"> {/* Ajuste de padding para el gráfico */}
          {/* Altura responsiva usando clases de Tailwind CSS.
            h-[250px] para móviles (altura base)
            sm:h-[300px] para pantallas pequeñas (tablets en vertical)
            md:h-[350px] para pantallas medianas (tablets en horizontal, laptops pequeñas)
            lg:h-[400px] para pantallas grandes (desktops)
          */}
          <div className="h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px] w-full p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 20, 
                  left: -25,
                  bottom: 0,
                }}
              >
                <defs>
                  {/* Definición de gradientes para las áreas con colores originales */}
                  <linearGradient id="colorPacientesOriginal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E0E0E0" stopOpacity={0.8}/> {/* Gris claro original */}
                    <stop offset="95%" stopColor="#E0E0E0" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorOperadosOriginal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFF8E1" stopOpacity={0.8}/> {/* Amarillo pálido original */}
                    <stop offset="95%" stopColor="#FFF8E1" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="pacientes" 
                  stroke="#9E9E9E" // Color de línea original para pacientes
                  fillOpacity={1}
                  fill="url(#colorPacientesOriginal)" // Usar el gradiente con color original
                  strokeWidth={2}
                  name="Pacientes Nuevos"
                />
                <Area 
                  type="monotone" 
                  dataKey="operados" 
                  stroke="#FFC107" // Color de línea original para operados
                  fillOpacity={1}
                  fill="url(#colorOperadosOriginal)" // Usar el gradiente con color original
                  strokeWidth={2}
                  name="Pacientes Operados"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

PatientAnalytics.displayName = "PatientAnalytics";

export default PatientAnalytics;