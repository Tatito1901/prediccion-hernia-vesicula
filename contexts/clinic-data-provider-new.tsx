// contexts/clinic-data-provider.tsx - REFACTORIZACIÓN RADICAL: BACKEND-FIRST DATA FETCHING
'use client';

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Appointment, EnrichedPatient } from '@/lib/types';

// ==================== INTERFAZ RADICAL - SOLO DATOS ESPECÍFICOS ====================
interface ClinicDataContextType {
  // 🎯 APPOINTMENTS - Solo queries específicas, nunca arrays completos
  fetchAppointments: (params: {
    dateFilter?: 'today' | 'future' | 'past' | 'all';
    patientId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    status?: string;
  }) => Promise<{
    data: Appointment[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
    summary?: {
      total_appointments: number;
      today_count: number;
      future_count: number;
      past_count: number;
    };
  }>;
  
  // 🎯 PATIENTS - Solo queries específicas, nunca arrays completos
  fetchPatients: (params: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => Promise<{
    data: EnrichedPatient[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
    stats: {
      totalPatients: number;
      surveyRate: number;
      pendingConsults: number;
      operatedPatients: number;
      statusStats: Record<string, number>;
    };
  }>;
  
  // 🎯 DASHBOARD SUMMARY - Solo métricas específicas
  fetchDashboardSummary: () => Promise<{
    todayAppointments: number;
    totalPatients: number;
    pendingConsults: number;
    completedSurveys: number;
    recentActivity: {
      newPatients: number;
      completedAppointments: number;
      pendingSurveys: number;
    };
  }>;
  
  // 🎯 CACHE INVALIDATION - Invalidación granular
  invalidateAppointments: (filters?: {
    dateFilter?: string;
    patientId?: string;
  }) => void;
  invalidatePatients: (filters?: {
    search?: string;
    status?: string;
  }) => void;
  invalidateDashboard: () => void;
}

// ==================== CREACIÓN DEL CONTEXTO ====================
const ClinicDataContext = createContext<ClinicDataContextType | undefined>(undefined);

// ==================== FUNCIONES DE FETCH BACKEND-FIRST ====================

/**
 * 🎯 Fetch de citas con parámetros específicos - NUNCA arrays completos
 */
const fetchAppointmentsFromAPI = async (params: {
  dateFilter?: 'today' | 'future' | 'past' | 'all';
  patientId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  status?: string;
}) => {
  const searchParams = new URLSearchParams();
  
  // Solo agregar parámetros que tienen valor
  if (params.dateFilter) searchParams.set('dateFilter', params.dateFilter);
  if (params.patientId) searchParams.set('patientId', params.patientId);
  if (params.search) searchParams.set('search', params.search);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
  if (params.status) searchParams.set('status', params.status);
  
  const response = await fetch(`/api/appointments?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch appointments: ${response.statusText}`);
  }
  
  return response.json();
};

/**
 * 🎯 Fetch de pacientes con parámetros específicos - NUNCA arrays completos
 */
const fetchPatientsFromAPI = async (params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const searchParams = new URLSearchParams();
  
  // Solo agregar parámetros que tienen valor
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('estado', params.status);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  
  const response = await fetch(`/api/patients?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch patients: ${response.statusText}`);
  }
  
  return response.json();
};

/**
 * 🎯 Fetch de resumen del dashboard - Solo métricas específicas
 */
const fetchDashboardSummaryFromAPI = async () => {
  const response = await fetch('/api/dashboard/summary');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard summary: ${response.statusText}`);
  }
  
  return response.json();
};

// ==================== PROVEEDOR RADICAL - BACKEND-FIRST ====================
export function ClinicDataProvider({ children }: { children: ReactNode }) {
  
  // 🎯 Función para fetch de citas con memoización
  const fetchAppointments = useCallback(async (params: Parameters<ClinicDataContextType['fetchAppointments']>[0]) => {
    return fetchAppointmentsFromAPI(params);
  }, []);
  
  // 🎯 Función para fetch de pacientes con memoización
  const fetchPatients = useCallback(async (params: Parameters<ClinicDataContextType['fetchPatients']>[0]) => {
    return fetchPatientsFromAPI(params);
  }, []);
  
  // 🎯 Función para fetch de resumen del dashboard
  const fetchDashboardSummary = useCallback(async () => {
    return fetchDashboardSummaryFromAPI();
  }, []);
  
  // 🎯 Funciones de invalidación granular
  const invalidateAppointments = useCallback((filters?: {
    dateFilter?: string;
    patientId?: string;
  }) => {
    // Implementar invalidación específica basada en filtros
    console.log('Invalidating appointments with filters:', filters);
  }, []);
  
  const invalidatePatients = useCallback((filters?: {
    search?: string;
    status?: string;
  }) => {
    // Implementar invalidación específica basada en filtros
    console.log('Invalidating patients with filters:', filters);
  }, []);
  
  const invalidateDashboard = useCallback(() => {
    // Implementar invalidación del dashboard
    console.log('Invalidating dashboard');
  }, []);
  
  // 🎯 Valor del contexto - Solo funciones de fetch específicas
  const contextValue: ClinicDataContextType = {
    fetchAppointments,
    fetchPatients,
    fetchDashboardSummary,
    invalidateAppointments,
    invalidatePatients,
    invalidateDashboard,
  };
  
  return (
    <ClinicDataContext.Provider value={contextValue}>
      {children}
    </ClinicDataContext.Provider>
  );
}

// ==================== HOOK PARA CONSUMIR EL CONTEXTO ====================
export function useClinic() {
  const context = useContext(ClinicDataContext);
  
  if (context === undefined) {
    throw new Error('useClinic debe ser utilizado dentro de un ClinicDataProvider');
  }
  
  return context;
}

// ==================== HOOKS ESPECÍFICOS PARA COMPONENTES ====================

/**
 * 🎯 Hook para obtener citas específicas con React Query
 */
export function useSpecificAppointments(params: {
  dateFilter?: 'today' | 'future' | 'past' | 'all';
  patientId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  status?: string;
  enabled?: boolean;
}) {
  const { fetchAppointments } = useClinic();
  
  return useQuery({
    queryKey: ['appointments', params],
    queryFn: () => fetchAppointments(params),
    enabled: params.enabled !== false,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * 🎯 Hook para obtener pacientes específicos con React Query
 */
export function useSpecificPatients(params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  enabled?: boolean;
}) {
  const { fetchPatients } = useClinic();
  
  return useQuery({
    queryKey: ['patients', params],
    queryFn: () => fetchPatients(params),
    enabled: params.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * 🎯 Hook para obtener resumen del dashboard
 */
export function useDashboardSummary(enabled = true) {
  const { fetchDashboardSummary } = useClinic();
  
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
    enabled,
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 3 * 60 * 1000, // 3 minutos
  });
}
