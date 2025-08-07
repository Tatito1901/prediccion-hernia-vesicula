import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { 
  Lead, 
  ExtendedLead, 
  LeadFormData, 
  LeadStats, 
  LeadStatus, 
  Channel, 
  Motive,
  PaginatedResponse 
} from '@/lib/types';

// Interfaces for hook parameters
interface UseLeadsParams {
  page?: number;
  pageSize?: number;
  status?: LeadStatus;
  channel?: Channel;
  motive?: Motive;
  search?: string;
  priority?: number;
  overdue?: boolean;
}

interface UseLeadParams {
  id: string;
  enabled?: boolean;
}

// Hook for fetching paginated leads
export function useLeads(params: UseLeadsParams = {}) {
  const {
    page = 1,
    pageSize = 20,
    status,
    channel,
    motive,
    search,
    priority,
    overdue
  } = params;

  const queryKey = ['leads', { page, pageSize, status, channel, motive, search, priority, overdue }];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<PaginatedResponse<Lead>> => {
      const searchParams = new URLSearchParams();
      
      searchParams.set('page', page.toString());
      searchParams.set('pageSize', pageSize.toString());
      
      if (status) searchParams.set('status', status);
      if (channel) searchParams.set('channel', channel);
      if (motive) searchParams.set('motive', motive);
      if (search) searchParams.set('search', search);
      if (priority) searchParams.set('priority', priority.toString());
      if (overdue) searchParams.set('overdue', 'true');

      const response = await fetch(`/api/leads?${searchParams.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch leads');
      }
      
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for fetching single lead
export function useLead({ id, enabled = true }: UseLeadParams) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async (): Promise<ExtendedLead> => {
      const response = await fetch(`/api/leads/${id}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch lead');
      }
      
      const { lead } = await response.json();
      
      // Add computed properties for UI
      const now = new Date();
      const createdAt = new Date(lead.created_at);
      const followUpDate = lead.next_follow_up_date ? new Date(lead.next_follow_up_date) : null;
      
      return {
        ...lead,
        days_since_created: Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        days_until_follow_up: followUpDate 
          ? Math.floor((followUpDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : undefined,
        is_overdue: followUpDate ? now > followUpDate : false,
      };
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook for creating leads
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadData: LeadFormData): Promise<Lead> => {
      console.log('🚀 Enviando datos del lead:', leadData);
      
      try {
        // Validar datos requeridos antes de enviar
        if (!leadData.full_name || !leadData.phone_number || !leadData.channel || !leadData.motive) {
          throw new Error('Faltan campos requeridos: nombre completo, teléfono, canal o motivo');
        }

        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(leadData),
        });

        console.log('📡 Respuesta del servidor:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (!response.ok) {
          let errorMessage = `Error HTTP ${response.status}: ${response.statusText}`;
          
          try {
            const errorData = await response.json();
            console.error('❌ Error del servidor:', errorData);
            errorMessage = errorData.error || errorData.message || errorMessage;
            
            // Si hay detalles adicionales del error, incluirlos
            if (errorData.details) {
              console.error('🔍 Detalles del error:', errorData.details);
              errorMessage += ` - ${errorData.details}`;
            }
          } catch (parseError) {
            console.error('❌ No se pudo parsear el error del servidor:', parseError);
          }
          
          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('✅ Lead creado exitosamente:', result);
        
        if (!result.lead) {
          throw new Error('El servidor no devolvió los datos del lead creado');
        }
        
        return result.lead;
      } catch (error) {
        console.error('💥 Error completo en useCreateLead:', error);
        throw error;
      }
    },
    onSuccess: (newLead) => {
      console.log('🎉 Hook onSuccess ejecutado:', newLead);
      
      // Invalidar queries para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      
      // Actualizar el cache con el nuevo lead
      if (newLead?.id) {
        queryClient.setQueryData(['lead', newLead.id], newLead);
      }
      
      toast.success(`Lead "${newLead.full_name}" creado exitosamente`);
    },
    onError: (error: Error) => {
      console.error('🚨 Hook onError ejecutado:', error);
      
      // Crear mensaje de error más descriptivo
      let userMessage = 'Error al crear el lead';
      
      if (error.message.includes('Faltan campos requeridos')) {
        userMessage = error.message;
      } else if (error.message.includes('already exists')) {
        userMessage = 'Ya existe un lead con este número de teléfono';
      } else if (error.message.includes('HTTP 500')) {
        userMessage = 'Error interno del servidor. Intenta nuevamente.';
      } else if (error.message.includes('HTTP 400')) {
        userMessage = 'Datos inválidos. Revisa el formulario.';
      } else if (error.message) {
        userMessage = error.message;
      }
      
      toast.error(userMessage);
    },
  });
}

// Hook for updating leads
export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lead> }): Promise<Lead> => {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update lead');
      }

      const { lead } = await response.json();
      return lead;
    },
    onSuccess: (updatedLead, { id }) => {
      // Update the specific lead in cache
      queryClient.setQueryData(['lead', id], updatedLead);
      
      // Invalidate leads queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      
      toast.success('Lead actualizado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error updating lead:', error);
      toast.error(error.message || 'Error al actualizar lead');
    },
  });
}

// Hook for deleting leads
export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete lead');
      }
    },
    onSuccess: (_, id) => {
      // Remove the lead from cache
      queryClient.removeQueries({ queryKey: ['lead', id] });
      
      // Invalidate leads queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      
      toast.success('Lead eliminado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error deleting lead:', error);
      toast.error(error.message || 'Error al eliminar lead');
    },
  });
}

// Hook for converting lead to patient (will be implemented when we connect with patient flow)
export function useConvertLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, patientData }: { 
      leadId: string; 
      patientData: any; // TODO: Define proper patient creation data type
    }): Promise<{ patient: any; lead: Lead }> => {
      // TODO: Implement conversion API endpoint
      // This will create a patient from lead data and update lead status
      throw new Error('Lead conversion not implemented yet');
    },
    onSuccess: (result, { leadId }) => {
      // Update lead cache
      queryClient.setQueryData(['lead', leadId], result.lead);
      
      // Invalidate both leads and patients queries
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['clinicData'] }); // For patients
      
      toast.success('Lead convertido a paciente exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error converting lead:', error);
      toast.error(error.message || 'Error al convertir lead');
    },
  });
}

// Hook for lead statistics (for dashboard)
export function useLeadStats() {
  return useQuery({
    queryKey: ['leadStats'],
    queryFn: async (): Promise<LeadStats> => {
      // For now, we'll calculate stats client-side
      // Later this can be moved to a dedicated API endpoint
      const response = await fetch('/api/leads?pageSize=1000'); // Get all leads for stats
      
      if (!response.ok) {
        throw new Error('Failed to fetch leads for statistics');
      }
      
      const { data: leads }: PaginatedResponse<Lead> = await response.json();
      
      // Calculate statistics
      const total_leads = leads.length;
      const new_leads = leads.filter(lead => lead.status === 'NUEVO').length;
      const in_follow_up = leads.filter(lead => lead.status === 'SEGUIMIENTO_PENDIENTE').length;
      const converted_leads = leads.filter(lead => lead.status === 'CONVERTIDO').length;
      const conversion_rate = total_leads > 0 ? (converted_leads / total_leads) * 100 : 0;
      
      // Group by channel
      const leads_by_channel = leads.reduce((acc, lead) => {
        acc[lead.channel] = (acc[lead.channel] || 0) + 1;
        return acc;
      }, {} as Record<Channel, number>);
      
      // Group by status
      const leads_by_status = leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<LeadStatus, number>);
      
      return {
        total_leads,
        new_leads,
        in_follow_up,
        converted_leads,
        conversion_rate,
        leads_by_channel,
        leads_by_status,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
