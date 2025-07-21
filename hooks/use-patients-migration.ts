// hooks/use-patients-migration.ts - HOOK DE MIGRACIÓN GRADUAL
// Permite transición suave del sistema actual al unificado

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys, getPatientMutationInvalidationKeys } from '@/lib/query-keys';

/**
 * Hook para migración gradual del sistema de pacientes
 * Proporciona funciones de invalidación que funcionan con ambos sistemas
 */
export const usePatientsMigration = () => {
  const queryClient = useQueryClient();

  /**
   * Función de invalidación universal que funciona con:
   * - Sistema actual (legacy keys)
   * - Sistema unificado (nuevas keys)
   * - Cualquier patrón de query relacionado con pacientes
   */
  const invalidateAllPatientData = useCallback((patientId?: string) => {
    // 🎯 INVALIDACIÓN SISTEMA UNIFICADO
    const unifiedKeys = getPatientMutationInvalidationKeys(patientId);
    unifiedKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });

    // 🔄 INVALIDACIÓN SISTEMA LEGACY (compatibilidad)
    const legacyKeys = [
      ['patients'],
      ['paginatedPatients'],
      ['clinicData', 'activePatients'],
      ['clinicData', 'todayAppointments'],
      ['dashboard', 'summary'],
      ['trends'],
      ['appointments'],
    ];

    legacyKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });

    // 🌐 INVALIDACIÓN CON PREDICADO - Captura cualquier query relacionada
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey;
        const keyString = JSON.stringify(queryKey).toLowerCase();
        
        return (
          keyString.includes('patient') ||
          keyString.includes('clinic') ||
          keyString.includes('dashboard') ||
          keyString.includes('appointment') ||
          keyString.includes('trend')
        );
      }
    });

    console.log('🔄 Invalidación universal de datos de pacientes completada');
  }, [queryClient]);

  /**
   * Función específica para invalidación tras crear paciente
   */
  const invalidateAfterPatientCreation = useCallback((newPatient?: any) => {
    invalidateAllPatientData(newPatient?.id);
    
    // Invalidación adicional específica para creación
    queryClient.invalidateQueries({ queryKey: queryKeys.patients.stats });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });
    
    console.log('✅ Invalidación tras creación de paciente completada');
  }, [invalidateAllPatientData, queryClient]);

  /**
   * Función para refrescar manualmente todas las queries de pacientes
   */
  const refetchAllPatientData = useCallback(async () => {
    await queryClient.refetchQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey;
        const keyString = JSON.stringify(queryKey).toLowerCase();
        
        return (
          keyString.includes('patient') ||
          keyString.includes('clinic') ||
          keyString.includes('dashboard')
        );
      }
    });
    
    console.log('🔄 Refetch manual de datos de pacientes completado');
  }, [queryClient]);

  return {
    invalidateAllPatientData,
    invalidateAfterPatientCreation,
    refetchAllPatientData,
  };
};
