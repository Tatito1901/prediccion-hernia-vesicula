// lib/hooks/use-patient-stats.ts

import { useQuery } from '@tanstack/react-query';

interface PatientStats {
  total_patients: number;
  survey_completion_rate: number;
  pending_consults: number;
  operated_patients: number;
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
