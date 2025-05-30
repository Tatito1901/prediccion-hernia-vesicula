"use client"

import React from "react"; // Importar React.memo
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Asumo que estos componentes de ui son de shadcn/ui o similar
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Datos de ejemplo para el gráfico.
// Si estos datos vinieran de props o estado, considera usar React.useMemo para optimizar.
const chartData = [
  { name: "Ene", pacientes: 12, operados: 8 },
  { name: "Feb", pacientes: 19, operados: 12 },
  { name: "Mar", pacientes: 15, operados: 10 },
  { name: "Abr", pacientes: 22, operados: 15 },
  { name: "May", pacientes: 28, operados: 20 },
  { name: "Jun", pacientes: 25, operados: 18 },
  // Podrías añadir más meses para ver mejor el comportamiento del gráfico
  { name: "Jul", pacientes: 30, operados: 22 },
  { name: "Ago", pacientes: 27, operados: 19 },
  { name: "Sep", pacientes: 35, operados: 25 },
  { name: "Oct", pacientes: 32, operados: 24 },
  { name: "Nov", pacientes: 40, operados: 30 },
  { name: "Dic", pacientes: 38, operados: 28 },
];

// Props para el componente PatientAnalytics, si fueran necesarias en el futuro.
interface PatientAnalyticsProps {
  // Ejemplo: data?: typeof chartData; si los datos fueran dinámicos.
}

// El componente PatientAnalytics, envuelto en React.memo para optimización.
// React.memo previene re-renderizados si las props no cambian.
export const PatientAnalytics: React.FC<PatientAnalyticsProps> = React.memo(() => {
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