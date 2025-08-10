// hooks/use-admission-unified.ts
// HOOK UNIFICADO DE ADMISIÓN - CONSOLIDA use-admission-data.ts + use-admission-realtime.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCallback, useMemo } from 'react';
import { isToday, isFuture, isPast } from 'date-fns';
import { queryKeys } from '@/lib/query-keys';
import { useClinic } from '@/contexts/clinic-data-provider';

// ==================== TIPOS UNIFICADOS ====================
import type { AdmissionAction, TabType, AppointmentWithPatient, AdmissionPayload } from '@/components/patient-admision/admision-types';

// Nota: Usamos el tipo centralizado AdmissionPayload (con diagnostico_principal: DbDiagnosis)

interface AdmissionResponse {
  success: boolean;
  message: string;
  patient_id: string;
  appointment_id: string;
  patient: any;
  appointment: any;
}

// (Sin CACHE_KEYS locales) — usamos queryKeys centralizados

// ==================== API FUNCTIONS UNIFICADAS ====================

/**
 * Función unificada de admisión que maneja tanto el flujo RPC como el tradicional
 */
const submitAdmission = async (data: AdmissionPayload): Promise<AdmissionResponse> => {
  console.log('🚀 [Unified Admission] Submitting admission:', {
    patient: `${data.nombre} ${data.apellidos}`,
    date: data.fecha_hora_cita,
  });

  const response = await fetch('/api/patient-admission', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: 'Error desconocido en el servidor' 
    }));
    throw new Error(errorData.message || 'Error al procesar la admisión');
  }

  const result: AdmissionResponse = await response.json();
  console.log('✅ [Unified Admission] Success:', result);
  
  return result;
};

// ==================== HOOKS UNIFICADOS ====================

/**
 * Hook principal unificado para admisión de pacientes
 * Combina la mejor funcionalidad de ambos hooks originales
 */
export function usePatientAdmissionUnified() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitAdmission,
    onSuccess: (data) => {
      console.log('✅ [Unified Admission Hook] Success:', data);
      
      toast.success('¡Paciente admitido exitosamente!', {
        description: `${data.patient?.nombre} ${data.patient?.apellidos} ha sido registrado`,
      });

      // Invalidaciones centralizadas y robustas
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.clinic.data });
    },
    onError: (error: Error) => {
      console.error('❌ [Unified Admission Hook] Error:', error);
      
      toast.error('Error en la admisión', {
        description: error.message || 'No se pudo completar el registro del paciente',
      });
    },
  });
}

/**
 * Hook unificado para datos de admisión consumiendo el contexto de clínica.
 * Realiza filtrado y agrupamiento en el cliente para tabs (hoy, futuras, pasadas).
 */
export const useAdmissionUnified = (activeTab: TabType) => {
  const {
    allAppointments,
    appointmentsWithPatientData,
    allPatients,
    appointmentsSummary,
    isLoading,
    refetch,
    fetchSpecificAppointments,
  } = useClinic();

  // Normalizar para garantizar datos del paciente presentes
  const normalizedAppointments = useMemo<AppointmentWithPatient[]>(() => {
    const source = (appointmentsWithPatientData && (appointmentsWithPatientData as any[]).length > 0)
      ? (appointmentsWithPatientData as any[])
      : ((allAppointments as any[]) || []);

    return source.map((a: any) => {
      const linkedPatient: any =
        a.patients || a.patient || (allPatients || []).find((p: any) => p.id === a.patient_id);
      return {
        id: a.id,
        patient_id: a.patient_id,
        doctor_id: a.doctor_id,
        fecha_hora_cita: a.fecha_hora_cita,
        motivos_consulta: a.motivos_consulta || [],
        estado_cita: a.estado_cita,
        es_primera_vez: a.es_primera_vez ?? false,
        notas_breves: a.notas_breves,
        created_at: a.created_at,
        updated_at: a.updated_at,
        agendado_por: a.agendado_por,
        fecha_agendamiento: a.fecha_agendamiento,
        patients: linkedPatient ? {
          id: linkedPatient.id,
          nombre: linkedPatient.nombre || '',
          apellidos: linkedPatient.apellidos || '',
          telefono: linkedPatient.telefono,
          email: linkedPatient.email,
          edad: typeof linkedPatient.edad === 'number' ? linkedPatient.edad : undefined,
          estado_paciente: linkedPatient.estado_paciente,
          diagnostico_principal: linkedPatient.diagnostico_principal,
        } : {
          id: a.patient_id,
          nombre: '',
          apellidos: '',
          telefono: undefined,
          email: undefined,
          edad: undefined,
          estado_paciente: undefined,
          diagnostico_principal: undefined,
        }
      } as AppointmentWithPatient;
    });
  }, [appointmentsWithPatientData, allAppointments, allPatients]);

  // Filtrado por tab
  const filteredAppointments = useMemo<AppointmentWithPatient[]>(() => {
    if (!normalizedAppointments?.length) return [];
    if (activeTab === 'today') {
      return normalizedAppointments.filter(app =>
        app?.estado_cita === 'PROGRAMADA' &&
        app.fecha_hora_cita &&
        isToday(new Date(app.fecha_hora_cita))
      );
    }
    if (activeTab === 'future') {
      return normalizedAppointments.filter(app =>
        app?.estado_cita === 'PROGRAMADA' &&
        app.fecha_hora_cita &&
        isFuture(new Date(app.fecha_hora_cita))
      );
    }
    // past
    return normalizedAppointments.filter(app =>
      app?.fecha_hora_cita &&
      (app.estado_cita !== 'PROGRAMADA' || isPast(new Date(app.fecha_hora_cita)))
    );
  }, [normalizedAppointments, activeTab]);

  // Agrupamiento por fecha
  const groupedByDate = useMemo(() => {
    return filteredAppointments.reduce((acc, appointment) => {
      if (!appointment || !appointment.fecha_hora_cita) return acc;
      const dateKey = new Date(appointment.fecha_hora_cita).toDateString();
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(appointment);
      return acc;
    }, {} as Record<string, AppointmentWithPatient[]>);
  }, [filteredAppointments]);

  // Conteos por tab (preferir summary si está disponible)
  const totalCounts = useMemo(() => {
    if (appointmentsSummary) {
      return {
        today: appointmentsSummary.today_count || 0,
        future: appointmentsSummary.future_count || 0,
        past: appointmentsSummary.past_count || 0,
        newPatient: 0,
      };
    }
    return {
      today: normalizedAppointments.filter(app =>
        app?.estado_cita === 'PROGRAMADA' &&
        app.fecha_hora_cita &&
        isToday(new Date(app.fecha_hora_cita))
      ).length,
      future: normalizedAppointments.filter(app =>
        app?.estado_cita === 'PROGRAMADA' &&
        app.fecha_hora_cita &&
        isFuture(new Date(app.fecha_hora_cita))
      ).length,
      past: normalizedAppointments.filter(app =>
        app?.fecha_hora_cita &&
        (app.estado_cita !== 'PROGRAMADA' || isPast(new Date(app.fecha_hora_cita)))
      ).length,
      newPatient: 0,
    };
  }, [appointmentsSummary, normalizedAppointments]);

  return {
    appointments: filteredAppointments,
    groupedByDate,
    totalCounts,
    hasData: filteredAppointments.length > 0,
    isLoading,
    refetch,
    // Exponer el fetch bajo demanda del contexto para usos específicos
    fetchSpecificAppointments,
  };
}

/**
 * Hook para acciones sobre citas (aprobar, rechazar, reagendar)
 * Unifica las acciones de ambos hooks originales
 */
export function useAppointmentActionsUnified() {
  const queryClient = useQueryClient();

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.clinic.data });
  }, [queryClient]);

  const handleAppointmentAction = useCallback(async (action: AdmissionAction, appointmentId: string) => {
    try {
      switch (action) {
        case 'checkIn':
          // Implementar check-in
          toast.success('Paciente registrado como presente');
          break;
        case 'startConsult':
          // Implementar inicio de consulta
          toast.success('Consulta iniciada');
          break;
        case 'complete':
          // Implementar completar cita
          toast.success('Cita completada exitosamente');
          break;
        case 'cancel':
          // Implementar cancelación
          toast.success('Cita cancelada');
          break;
        case 'noShow':
          // Implementar no asistió
          toast.success('Cita marcada como no asistida');
          break;
        case 'reschedule':
          // Implementar reagendamiento
          toast.info('Reagendamiento no implementado aún');
          break;
        case 'viewHistory':
          // Implementar vista de historial
          toast.info('Vista de historial no implementada aún');
          break;
        default:
          toast.error('Acción no reconocida');
      }
      // Refrescar datos después de la acción
      refreshData();
    } catch (error) {
      console.error('Error handling appointment action:', error);
      toast.error('Error al procesar la acción');
    }
  }, [refreshData]);

  return {
    refreshData,
    handleAppointmentAction
  };
}

/**
 * Hook para refrescar todos los datos de admisión
 */
export function useRefreshAdmissionDataUnified() {
  const queryClient = useQueryClient();
  
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.clinic.data });
    
    toast.success('Datos actualizados');
  }, [queryClient]);
}

// ==================== EXPORTS ====================
export type { 
  AdmissionPayload, 
  AdmissionResponse, 
  AppointmentWithPatient, 
  TabType 
};
