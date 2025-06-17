import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useChartData } from "@/hooks/use-chart-data";
import { Skeleton } from "@/components/ui/skeleton";

// Tipos para las props del componente
interface PatientsChartProps {
  data?: Array<{
    name: string;
    pacientes: number;
    operados: number;
    [key: string]: string | number;
  }>;
  dateRange?: "7dias" | "30dias" | "90dias" | "ytd" | "todos";
}

// Componente que contiene el gráfico de Recharts
export const PatientsChart: React.FC<PatientsChartProps> = ({ data, dateRange = "ytd" }) => {
  // Si no se proporcionan datos desde props, usamos los datos reales del API
  const { rawData: { patients }, loading, error } = useChartData({ dateRange });

  const chartData = useMemo(() => {
    if (data && data.length) return data;

    // Construir base de los últimos 12 meses
    const today = new Date();
    const months = Array.from({ length: 12 }).map((_, idx) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (11 - idx), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        name: date.toLocaleString('es-ES', { month: 'short' }),
        pacientes: 0,
        operados: 0,
      };
    });

    patients.forEach((p: any) => {
      // Pacientes nuevos por fecha de registro
      if (p.fecha_registro) {
        const fechaRegistro = new Date(p.fecha_registro);
        const key = `${fechaRegistro.getFullYear()}-${fechaRegistro.getMonth()}`;
        const monthEntry = months.find(m => m.key === key);
        if (monthEntry) monthEntry.pacientes += 1;
      }

      // Pacientes operados por fecha de cirugía programada
      if (p.estado_paciente === 'OPERADO' && p.fecha_cirugia_programada) {
        const fechaCirugia = new Date(p.fecha_cirugia_programada);
        const key = `${fechaCirugia.getFullYear()}-${fechaCirugia.getMonth()}`;
        const monthEntry = months.find(m => m.key === key);
        if (monthEntry) monthEntry.operados += 1;
      }
    });

    return months.map(({ name, pacientes, operados }) => ({ name, pacientes, operados }));
  }, [data, patients]);

  // Estados de carga y error solo aplican si no se pasó data desde props
  if (!data) {
    if (loading) return <Skeleton className="h-[300px] w-full" />;
    if (error) return <div className="text-destructive text-sm">{error}</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={chartData}
        margin={{
          top: 10,
          right: 10,
          left: 0,
          bottom: 0,
        }}
      >
        <defs>
          <linearGradient id="colorPacientes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="colorOperados" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#4ade80" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="name" 
          className="text-xs md:text-sm text-muted-foreground" 
          tick={{ fontSize: 12 }} 
        />
        <YAxis 
          className="text-xs md:text-sm text-muted-foreground" 
          tick={{ fontSize: 12 }} 
          tickFormatter={(value: number) => `${value}`} 
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'var(--background)', 
            borderColor: 'var(--border)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
          labelStyle={{ color: 'var(--foreground)', fontWeight: 'bold' }}
          itemStyle={{ padding: '2px 0' }}
        />
        <Area
          type="monotone"
          dataKey="pacientes"
          stroke="#2563eb"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorPacientes)"
          name="Pacientes"
        />
        <Area
          type="monotone"
          dataKey="operados"
          stroke="#4ade80"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorOperados)"
          name="Operados"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
