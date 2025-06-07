import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Tipos para las props del componente
interface PatientsChartProps {
  data: Array<{
    name: string;
    pacientes: number;
    operados: number;
    [key: string]: string | number;
  }>;
}

// Componente que contiene el gráfico de Recharts
export const PatientsChart: React.FC<PatientsChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={data}
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
