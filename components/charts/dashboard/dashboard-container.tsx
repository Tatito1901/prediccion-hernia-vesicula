'use client';
import React from 'react';
import { useDashboardMetrics } from './use-dashboard-metrics';
import { ChartWrapper } from '../common/chart-wrapper';
import { CommonDiagnosesChart } from './common-diagnoses-chart';
import { PathologyDistributionChart } from './pathology-distribution-chart';
import { DiagnosisTimelineChart } from './diagnosis-timeline-chart';

interface DashboardContainerProps {
  patientData: any[]; // Se recomienda usar un tipo más específico en producción
  isLoading: boolean;
}

export const DashboardContainer: React.FC<DashboardContainerProps> = ({ patientData, isLoading }) => {
  const { timelineData, commonDiagnoses, pathologyDistribution } = useDashboardMetrics(patientData);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartWrapper title="Diagnósticos Más Comunes" isLoading={isLoading}>
        <CommonDiagnosesChart data={commonDiagnoses} />
      </ChartWrapper>
      <ChartWrapper title="Distribución de Patologías" isLoading={isLoading}>
        <PathologyDistributionChart data={pathologyDistribution} />
      </ChartWrapper>
      <div className="lg:col-span-2">
        <ChartWrapper title="Línea de Tiempo de Diagnósticos" isLoading={isLoading}>
          <DiagnosisTimelineChart data={timelineData} />
        </ChartWrapper>
      </div>
    </div>
  );
};
