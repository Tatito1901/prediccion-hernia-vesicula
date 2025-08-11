'use client';
import React from 'react';
import { useDashboardCharts } from '@/hooks/use-dashboard-charts';
import { ChartWrapper } from '../common/chart-wrapper';
import { CommonDiagnosesChart } from './common-diagnoses-chart';
import { PathologyDistributionChart } from './pathology-distribution-chart';
import { DiagnosisTimelineChart } from './diagnosis-timeline-chart';

export const DashboardContainer: React.FC = () => {
  const { data, isLoading, isFetching } = useDashboardCharts();
  const timelineData = data?.timelineData ?? [];
  const commonDiagnoses = data?.commonDiagnoses ?? [];
  const pathologyDistribution = data?.pathologyDistribution ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartWrapper title="Diagnósticos Más Comunes" isLoading={isLoading || isFetching}>
        <CommonDiagnosesChart data={commonDiagnoses} />
      </ChartWrapper>
      <ChartWrapper title="Distribución de Patologías" isLoading={isLoading || isFetching}>
        <PathologyDistributionChart data={pathologyDistribution} />
      </ChartWrapper>
      <div className="lg:col-span-2">
        <ChartWrapper title="Línea de Tiempo de Diagnósticos" isLoading={isLoading || isFetching}>
          <DiagnosisTimelineChart data={timelineData} />
        </ChartWrapper>
      </div>
    </div>
  );
};
