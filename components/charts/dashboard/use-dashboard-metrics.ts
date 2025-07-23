import { useMemo } from 'react';

// Definir un tipo claro para los datos de entrada
interface PatientData {
  main_diagnosis: string;
  created_at: string; // Formato ISO 8601
}

const categorizePathology = (diagnosis: string): string => {
  const lower = diagnosis.toLowerCase();
  if (lower.includes('hernia')) return 'Hernias';
  if (lower.includes('vesícula')) return 'Vesículas';
  return 'Otras';
};

export const useDashboardMetrics = (patientData: PatientData[] = []) => {
  return useMemo(() => {
    if (!patientData || patientData.length === 0) {
      return { timelineData: [], commonDiagnoses: [], pathologyDistribution: [] };
    }

    const timelineCounts = patientData.reduce((acc, { created_at }) => {
      const date = new Date(created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const timelineData = Object.entries(timelineCounts).map(([date, count]) => ({ date, count })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const diagnosisCounts = patientData.reduce((acc, { main_diagnosis }) => {
      acc[main_diagnosis] = (acc[main_diagnosis] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const commonDiagnoses = Object.entries(diagnosisCounts).map(([name, total]) => ({ name, total })).sort((a,b) => b.total - a.total).slice(0, 5);

    const categoryCounts = patientData.reduce((acc, { main_diagnosis }) => {
      const category = categorizePathology(main_diagnosis);
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const pathologyDistribution = Object.entries(categoryCounts).map(([name, total]) => ({ name, total }));

    return { timelineData, commonDiagnoses, pathologyDistribution };
  }, [patientData]);
};
