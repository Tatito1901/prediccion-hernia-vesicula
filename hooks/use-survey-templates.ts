// hooks/use-survey-templates.ts - HOOK CENTRALIZADO PARA SURVEY TEMPLATES
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

// ==================== TIPOS ====================
interface SurveyTemplate {
  id: number;
  title: string;
  description: string;
}

// ==================== HOOK CENTRALIZADO ====================
export const useSurveyTemplates = () => {
  return useQuery({
    queryKey: ['surveyTemplates'],
    queryFn: async (): Promise<SurveyTemplate[]> => {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('survey_templates')
        .select('id, title, description')
        .order('id', { ascending: true });

      if (error) {
        toast.error('Error al cargar las plantillas de encuesta.');
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - los templates no cambian frecuentemente
    gcTime: 10 * 60 * 1000,   // 10 minutos en caché
    retry: 2,
    retryDelay: 1000,
  });
};

// ==================== HOOK PARA ASIGNAR SURVEY ====================
export const useAssignSurvey = () => {
  return async (patientId: string, templateId: number) => {
    const response = await fetch('/api/assign-survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, templateId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error desconocido al asignar la encuesta.');
    }

    return result;
  };
};
