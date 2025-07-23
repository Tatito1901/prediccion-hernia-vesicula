import React from 'react';
import { GenericBarChart } from '../common/generic-bar-chart';
import { useChartConfig } from '../common/use-chart-config';

interface ChartProps { data: { name: string; total: number }[]; }

export const CommonDiagnosesChart: React.FC<ChartProps> = ({ data }) => {
  const { getChartColors } = useChartConfig();
  return <GenericBarChart data={data} xAxisKey="name" yAxisKey="total" colors={getChartColors('medical')} gradient={true} animated={true} />;
};
