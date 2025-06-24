// lib/hooks/use-patients.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PatientData } from '@/app/dashboard/data-model';

// 1. Definir llaves para el caché de React Query (buena práctica)
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (filters: { page?: number; pageSize?: number; estado?: string }) => 
    [...patientKeys.lists(), filters] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
};

// 2. Hook para obtener la lista de pacientes (con paginación y filtros)
export const usePatients = (page = 1, pageSize = 15, estado = 'all') => {
  return useQuery({
    queryKey: patientKeys.list({ page, pageSize, estado }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        estado,
      });
      
      const response = await fetch(`/api/patients?${params.toString()}`);
      if (!response.ok) {
        throw new Error('No se pudieron obtener los pacientes.');
      }
      const data = await response.json();
      // Asumimos que la API devuelve un objeto con { data: PatientData[], pagination: {...} }
      return data; 
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de caché "fresco"
  });
};

// 3. Hook para obtener un solo paciente por ID
export const usePatient = (id: string | null) => {
  return useQuery({
    queryKey: patientKeys.detail(id!),
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/patients/${id}`);
      if (!response.ok) {
        throw new Error('Paciente no encontrado.');
      }
      return response.json();
    },
    enabled: !!id, // El query solo se ejecutará si el ID existe
  });
};

// 4. Hook para crear un nuevo paciente (mutación)
export const useCreatePatient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newPatientData: Omit<PatientData, 'id'>) => {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatientData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear el paciente.');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Paciente creado exitosamente.');
      // Invalida el caché de la lista de pacientes para que se actualice automáticamente
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
    onError: (error) => {
      toast.error('Fallo al crear paciente', { description: error.message });
    },
  });
};
