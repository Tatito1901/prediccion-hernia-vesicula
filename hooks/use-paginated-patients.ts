// hooks/use-paginated-patients.ts - HOOK ROBUSTO PARA PAGINACIÓN REAL
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { toast } from 'sonner';

// ==================== TIPOS ====================
export interface PaginatedPatientsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedPatientsResponse {
  data: any[]; // Pacientes enriquecidos
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  stats?: {
    totalPatients: number;
    surveyRate: number;
    pendingConsults: number;
    operatedPatients: number;
    statusStats: Record<string, number>;
  };
}

// ==================== FUNCIÓN DE FETCH ====================
const fetchPaginatedPatients = async (params: PaginatedPatientsParams): Promise<PaginatedPatientsResponse> => {
  try {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', String(params.page));
    if (params.pageSize) searchParams.append('pageSize', String(params.pageSize));
    if (params.search) searchParams.append('search', params.search);
    if (params.status && params.status !== 'all') searchParams.append('estado', params.status);
    if (params.startDate) searchParams.append('startDate', params.startDate);
    if (params.endDate) searchParams.append('endDate', params.endDate);

    const response = await fetch(`/api/patients?${searchParams.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch patients');
    }
    
    return response.json();
  } catch (error) {
    toast.error('Error al cargar pacientes', {
      description: 'No se pudieron cargar los pacientes. Por favor, intente nuevamente.',
    });
    throw error;
  }
};

// ==================== HOOK PRINCIPAL ====================
/**
 * Hook robusto para gestión de pacientes con paginación real.
 * Elimina arrays completos del cliente y usa solo datos paginados del backend.
 */
export const usePaginatedPatients = (params: PaginatedPatientsParams = {}) => {
  const {
    page = 1,
    pageSize = 15,
    search = '',
    status = 'all',
    startDate,
    endDate
  } = params;

  // Query con parámetros dinámicos
  const {
    data: response,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['paginatedPatients', { page, pageSize, search, status, startDate, endDate }],
    queryFn: () => fetchPaginatedPatients({ page, pageSize, search, status, startDate, endDate }),
    staleTime: 2 * 60 * 1000, // 2 minutos de caché
    refetchOnWindowFocus: false, // No refetch automático para evitar saltos de página
  });

  // Extraer datos de la respuesta con tipos seguros
  const patients = useMemo(() => response?.data ?? [], [response]);
  const pagination = useMemo(() => response?.pagination ?? {
    page: 1,
    pageSize: 15,
    totalCount: 0,
    totalPages: 1,
    hasMore: false
  }, [response]);
  
  const stats = useMemo(() => response?.stats ?? null, [response]);

  return {
    // ✅ Solo datos de la página actual (no arrays completos)
    patients,
    pagination,
    stats,
    
    // Estados
    isLoading,
    isFetching,
    error: error ? (error as Error) : null,
    
    // Acciones
    refetch,
    
    // Helpers para navegación
    hasNextPage: pagination.hasMore,
    hasPreviousPage: pagination.page > 1,
    totalCount: pagination.totalCount,
    totalPages: pagination.totalPages,
    currentPage: pagination.page,
  };
};

// ==================== HOOK PARA ESTADÍSTICAS GLOBALES ====================
/**
 * Hook separado para estadísticas globales (solo cuando se necesiten)
 */
export const usePatientStats = () => {
  return useQuery({
    queryKey: ['patientStats'],
    queryFn: () => fetchPaginatedPatients({ page: 1, pageSize: 1 }), // Solo para obtener stats
    select: (data) => data.stats, // Solo extraer las estadísticas
    staleTime: 5 * 60 * 1000, // 5 minutos de caché para estadísticas
    refetchOnWindowFocus: false,
  });
};
