// hooks/use-survey-templates.ts - REFACTORIZADO
import { useQuery } from '@tanstack/react-query';
import { queryFetcher } from '@/lib/http';
import { endpoints } from '@/lib/api-endpoints';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';

// ==================== TIPOS ====================
interface SurveyTemplate {
  id: number;
  title: string;
  description: string | null;
}

// ==================== HOOK CENTRALIZADO ====================
export const useSurveyTemplates = () => {
  return useQuery({
    queryKey: queryKeys.surveys.templates,
    queryFn: async (): Promise<SurveyTemplate[]> => {
      try {
        const data = await queryFetcher<SurveyTemplate[]>(
          endpoints.surveys.templates()
        );
        return data || [];
      } catch (error) {
        toast.error('Error al cargar las plantillas de encuesta.');
        throw error;
      }
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
    const response = await fetch(endpoints.assignSurvey(), {
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
