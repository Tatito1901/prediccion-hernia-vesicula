import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useChartData } from "@/hooks/use-chart-data";
import { Skeleton } from "@/components/ui/skeleton";



/**
 * Define la estructura esperada para un objeto de paciente.
 * Es crucial para asegurar que los datos del hook se manejen correctamente.
 */
interface Patient {
  // Usamos `string` asumiendo que la fecha viene en formato ISO 8601 o similar.
  fecha_registro: string;
  // El estado puede ser un conjunto de valores conocidos, usamos un `string` para flexibilidad.
  estado?: 'OPERADO' | 'EN_ESPERA' | 'CONSULTA' | string;
  estado_paciente?: 'OPERADO' | 'EN_ESPERA' | 'CONSULTA' | string;
}

/**
 * Define la estructura de los datos que se pasarán al gráfico.
 */
interface ChartDataPoint {
  name: string; // Nombre del mes (ej. "Ene")
  pacientes: number; // Total de pacientes nuevos en ese mes
  operados: number; // Total de pacientes operados en ese mes
}

// --- Componente Principal ---

export const PatientAnalytics: React.FC = React.memo(() => {
  // --- Hook de Datos ---
  // Se asume que useChartData devuelve datos con el tipado correcto.
  // Especificamos el tipo `Patient[]` para `patients` para mayor claridad.
  const {
    rawData: { patients = [] }, // Valor por defecto para evitar errores si `patients` es undefined
    loading,
    error,
  } = useChartData({ dateRange: 'ytd' }) as {
    rawData: { patients: Patient[] };
    loading: boolean;
    error: string | null;
  };

  // --- Procesamiento de Datos Memoizado ---
  // `useMemo` previene el recálculo en cada render, mejorando el rendimiento.
  // La lógica interna se ha optimizado para ser más eficiente.
  const chartData = useMemo((): ChartDataPoint[] => {
    const today = new Date();
    
    // Usamos un Map para un acceso O(1), mucho más rápido que `find` en un array (O(n)).
    const dailyDataMap = new Map<string, { name: string; pacientes: number; operados: number }>();

    // 1. Inicializamos el mapa con los días del mes actual.
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    for (let i = 0; i < daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i + 1);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      
      dailyDataMap.set(key, {
        name: `${date.getDate()}`,
        pacientes: 0,
        operados: 0,
      });
    }

    // 2. Procesamos los datos de los pacientes.
    // Este bucle es más eficiente al actualizar el mapa directamente.
    patients.forEach((patient) => {
      // Validamos que la fecha de registro exista y sea válida.
      if (!patient.fecha_registro) return;
      
      const registrationDate = new Date(patient.fecha_registro);
      // Ignoramos fechas inválidas que podrían causar errores.
      if (isNaN(registrationDate.getTime())) return;

      // Solo consideramos las entradas del mes actual
      if (registrationDate.getMonth() === today.getMonth() && 
          registrationDate.getFullYear() === today.getFullYear()) {
        const key = `${registrationDate.getFullYear()}-${registrationDate.getMonth()}-${registrationDate.getDate()}`;
        const dayEntry = dailyDataMap.get(key);

      if (dayEntry) {
        dayEntry.pacientes += 1;
        if (patient.estado === 'OPERADO' || patient.estado_paciente === 'OPERADO') {
          dayEntry.operados += 1;
        }
      }
      }
    });
    
    // 3. Convertimos el mapa a un array para el gráfico.
    return Array.from(dailyDataMap.values());

  }, [patients]); // La dependencia es `patients`, por lo que solo se recalcula si cambian.

  // --- Renderizado Condicional: Estado de Carga ---
  if (loading) {
    return (
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="pb-4 pt-5 px-5 md:px-6">
          <CardTitle className="text-lg md:text-xl">Tendencia de Pacientes</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Analizando datos...
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {/* El Skeleton se adapta a la altura responsiva definida para el gráfico */}
          <Skeleton className="h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px] w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  // --- Renderizado Condicional: Estado de Error ---
  if (error) {
    return (
      <Card className="shadow-lg rounded-xl bg-destructive/10 border-destructive/50">
        <CardHeader className="pb-4 pt-5 px-5 md:px-6">
          <CardTitle className="text-lg md:text-xl text-destructive">
            Error al Cargar Datos
          </CardTitle>
          <CardDescription className="text-sm text-destructive">
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-destructive-foreground p-4 text-center">No se pudo mostrar la gráfica. Por favor, intenta de nuevo más tarde.</p>
        </CardContent>
      </Card>
    );
  }

  // --- Renderizado Principal del Gráfico ---
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl overflow-hidden">
      <CardHeader className="pb-4 pt-5 px-5 md:px-6">
        <CardTitle className="text-lg md:text-xl">Tendencia de Pacientes</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Pacientes nuevos vs. operados en el mes actual.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {/* Contenedor responsivo para el gráfico */}
        <div className="h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 25, left: -25, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPacientes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOperados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
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
                allowDecimals={false} // Asegura que solo se muestren números enteros
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: '600' }}
              />
              <Area
                type="monotone"
                dataKey="pacientes"
                stroke="hsl(var(--primary))"
                fill="url(#colorPacientes)"
                strokeWidth={2}
                name="Pacientes Nuevos"
              />
              <Area
                type="monotone"
                dataKey="operados"
                stroke="hsl(var(--secondary))"
                fill="url(#colorOperados)"
                strokeWidth={2}
                name="Pacientes Operados"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

// Asignar un nombre para facilitar el debugging con React DevTools.
PatientAnalytics.displayName = "PatientAnalytics";

export default PatientAnalytics;
