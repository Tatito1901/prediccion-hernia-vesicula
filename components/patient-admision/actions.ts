// components/patient-admision/actions.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CACHE_KEYS } from '@/lib/cache-invalidation';
import type { AdmissionPayload } from './types';

/**
 * Hook de mutación para registrar un nuevo paciente y su primera cita.
 * Utiliza el endpoint transaccional para garantizar la integridad de los datos.
 */
export const useAdmitPatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AdmissionPayload) => {
      const response = await fetch('/api/patient-admission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al procesar la admisión.');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Admisión Exitosa', {
        description: 'El paciente y su primera cita han sido creados correctamente.',
      });

      // Invalidación INTELIGENTE: solo refrescamos los datos que cambiaron.
      // Esto evita el "efecto tsunami" de recargar toda la base de datos.
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.patients.lists() });
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.appointments.lists() });
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.patients.stats() });
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.dashboard.summary() });
    },
    onError: (error: Error) => {
      toast.error('Error en la Admisión', {
        description: error.message || 'No se pudo completar el registro. Intente de nuevo.',
      });
    },
  });
};
