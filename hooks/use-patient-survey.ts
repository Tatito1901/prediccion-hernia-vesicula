// hooks/use-patient-survey.ts
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import type { PatientSurveyData } from '@/lib/types';

export function usePatientSurvey(patientId: string | undefined) {
  return useQuery({
    queryKey: ['patient-survey', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      
      const supabase = createClient();
      
      // Get the most recent survey for this patient
      const { data, error } = await supabase
        .from('patient_surveys')
        .select(`
          *,
          answers:survey_answers(
            *,
            question:survey_questions(*)
          )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No survey found for patient
          return null;
        }
        throw error;
      }
      
      return data as PatientSurveyData;
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection time)
  });
}
