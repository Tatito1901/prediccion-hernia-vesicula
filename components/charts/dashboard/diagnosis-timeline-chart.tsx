import React from 'react';
import { GenericLineChart } from '../common/generic-line-chart';
import { useChartConfig } from '../common/use-chart-config';

interface ChartProps { data: { date: string; count: number }[]; }

export const DiagnosisTimelineChart: React.FC<ChartProps> = ({ data }) => {
  const { getChartColors } = useChartConfig();
  return (
    <GenericLineChart 
      data={data} 
      xAxisKey="date" 
      yAxisKey="count" 
      lineColor={getChartColors('medical')[0]} 
      area={true}
      showTrend={true}
      animated={true}
      smooth={true}
      showDots={true}
    />
  );
};
