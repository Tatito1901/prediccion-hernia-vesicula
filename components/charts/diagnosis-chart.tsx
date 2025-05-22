'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Define the types for the component
export interface DiagnosisData {
  tipo: string;
  cantidad: number;
  porcentaje?: number;
}

interface DiagnosisChartProps {
  data: DiagnosisData[];
  title?: string;
  description?: string;
}

// Colors for the chart segments
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Custom tooltip to display the diagnosis information
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-2 border rounded shadow-sm text-sm">
        <p className="font-medium">{data.tipo}</p>
        <p>Casos: {data.cantidad}</p>
        {data.porcentaje !== undefined && (
          <p>Porcentaje: {data.porcentaje}%</p>
        )}
      </div>
    );
  }
  return null;
};

export function DiagnosisChart({ data, title = "Distribución de Diagnósticos", description = "Desglose por tipo de diagnóstico" }: DiagnosisChartProps) {
  // Add percentage calculation if not already present
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const total = data.reduce((sum, item) => sum + item.cantidad, 0);
    
    return data.map((item) => ({
      ...item,
      porcentaje: item.porcentaje ?? Math.round((item.cantidad / total) * 100)
    }));
  }, [data]);

  // Don't render if no data
  if (!processedData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[220px]">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={processedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="cantidad"
                nameKey="tipo"
                label={({ tipo, porcentaje }) => `${tipo}: ${porcentaje}%`}
              >
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
