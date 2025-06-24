// lib/hooks/use-patient-stats.ts

import { useQuery } from '@tanstack/react-query';

interface PatientStats {
  totalPatients: number;
  surveyCompletionRate: number;
  pendingConsults: number;
  operatedPatients: number;
}

const fetchPatientStats = async (): Promise<PatientStats> => {
  const response = await fetch('/api/statistics/patients');
  if (!response.ok) {
    throw new Error('No se pudieron obtener las estadísticas de pacientes.');
  }
  return response.json();
};

export const usePatientStats = () => {
  return useQuery({
    queryKey: ['patient-stats'],
    queryFn: fetchPatientStats,
    staleTime: 5 * 60 * 1000, // 5 minutos de caché
  });
};
