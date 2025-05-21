'use client';

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { ClinicMetrics } from '@/app/dashboard/data-model';
import { clinicMetrics } from '@/app/pacientes/sample-data';

// Paleta de colores vibrante para el entorno médico
const COLORS = [
  '#4285F4', // Azul médico
  '#34A853', // Verde salud
  '#FBBC05', // Amarillo atención
  '#EA4335', // Rojo alerta
  '#8E24AA', // Púrpura diagnóstico
  '#0097A7', // Turquesa clínico
];

interface DiagnosisChartProps {
  metrics?: ClinicMetrics;
}

export function DiagnosisChart({ metrics }: DiagnosisChartProps) {
  // Fallback a datos de ejemplo
  const data = useMemo(
    () =>
      (metrics ?? clinicMetrics).diagnosticosMasComunes.map((item) => ({
        name: item.tipo,
        value: item.cantidad,
      })),
    [metrics]
  );

  // Render de etiqueta personalizada: afuera del slice, con línea guía
  const renderLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    index,
  }: any) => {
    const RAD = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.1;
    const x = cx + radius * Math.cos(-midAngle * RAD);
    const y = cy + radius * Math.sin(-midAngle * RAD);
    const textAnchor = x > cx ? 'start' : 'end';

    return (
      <g>
        {/* Línea guía */}
        <polyline
          points={`${cx},${cy} ${cx + innerRadius * Math.cos(-midAngle * RAD)},${
            cy + innerRadius * Math.sin(-midAngle * RAD)
          } ${x},${y}`}
          stroke="#ccc"
          fill="none"
        />
        {/* Texto de etiqueta */}
        <text
          x={x}
          y={y}
          textAnchor={textAnchor}
          dominantBaseline="central"
          style={{ fontSize: '0.75rem', fill: '#333' }}
        >
          <tspan x={x} dy="0">{`${data[index].name}`}</tspan>
          <tspan x={x} dy="1.2em">{`${data[index].value}`}</tspan>
        </text>
      </g>
    );
  };

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Diagnósticos Más Comunes</CardTitle>
        <CardDescription>
          Distribución porcentual y absoluta
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center">
        {/* Contenedor responsive: h-64 en móvil, h-80 en md, h-96 en lg */}
        <div className="w-full h-64 sm:h-72 md:h-80 lg:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                dataKey="value"
                outerRadius="60%"
                innerRadius="35%"
                label={renderLabel}
                labelLine={false}
                paddingAngle={4}
                cornerRadius={4}
              >
                {data.map((_, idx) => (
                  <Cell
                    key={`slice-${idx}`}
                    fill={COLORS[idx % COLORS.length]}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: any) => [`${val} pacientes`, 'Cantidad']}
                wrapperStyle={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda custom adaptativa */}
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          {data.map((entry, idx) => (
            <div
              key={`legend-${idx}`}
              className="flex items-center space-x-2 text-sm"
            >
              <span
                className="inline-block w-3 h-3 rounded"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span>{`${entry.name} (${entry.value})`}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
