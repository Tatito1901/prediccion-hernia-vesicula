// hooks/use-patient-survey.ts - REFACTORIZADO
import { useQuery } from '@tanstack/react-query';
import { queryFetcher } from '@/lib/http';
import { endpoints } from '@/lib/api-endpoints';
import { queryKeys } from '@/lib/query-keys';
import type { PatientSurveyData } from '@/lib/types';

export function usePatientSurvey(patientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.surveys.byPatient(patientId || ''),
    queryFn: async () => {
      if (!patientId) return null;
      
      try {
        const data = await queryFetcher<PatientSurveyData>(
          endpoints.surveys.byPatient(patientId)
        );
        return data;
      } catch (error: any) {
        // Handle 404 as no survey found
        if (error?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
