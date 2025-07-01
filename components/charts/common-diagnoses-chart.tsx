import React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { ChartData } from './types';

interface CommonDiagnosesChartProps {
  data: ChartData[];
}

export const CommonDiagnosesChart: React.FC<CommonDiagnosesChartProps> = ({ data }) => (
  <ResponsiveContainer width="100%" height={350}>
    <BarChart data={data}>
      <XAxis dataKey="tipo" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
      <Bar dataKey="cantidad" fill="#82ca9d" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);
