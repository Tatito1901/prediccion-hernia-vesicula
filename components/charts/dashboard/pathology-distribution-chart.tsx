import React from 'react';
import { GenericPieChart } from '../common/generic-pie-chart';
import { useChartConfig } from '../common/use-chart-config';

interface ChartProps { data: { name: string; total: number }[]; }

export const PathologyDistributionChart: React.FC<ChartProps> = ({ data }) => {
  const { getChartColors } = useChartConfig();
  return (
    <GenericPieChart 
      data={data} 
      dataKey="total" 
      nameKey="name" 
      colors={getChartColors('diagnostic')} 
      showLabels={true}
      donut={false}
      animated={true}
    />
  );
};
