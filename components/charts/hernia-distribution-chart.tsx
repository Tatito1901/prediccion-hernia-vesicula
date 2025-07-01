import React from 'react';
import { Pie, PieChart, ResponsiveContainer, Cell } from 'recharts';
import { ChartData } from './types';

interface HerniaDistributionChartProps {
  data: ChartData[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const HerniaDistributionChart: React.FC<HerniaDistributionChartProps> = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie data={data} dataKey="cantidad" nameKey="tipo" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
    </PieChart>
  </ResponsiveContainer>
);
