import React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { TimelineData } from './types';

interface TimelineChartProps {
  data: TimelineData[];
}

export const TimelineChart: React.FC<TimelineChartProps> = ({ data }) => (
  <ResponsiveContainer width="100%" height={350}>
    <BarChart data={data}>
      <XAxis dataKey="formattedDate" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
      <Bar dataKey="cantidad" fill="#adfa1d" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);
