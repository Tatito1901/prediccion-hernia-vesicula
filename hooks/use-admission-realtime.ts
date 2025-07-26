// hooks/use-patient-admission-real.ts
// HOOK CORREGIDO PARA TU ESQUEMA REAL DE BASE DE DATOS

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ==================== TIPOS CORREGIDOS ====================
interface AdmissionPayload {
  p_nombre: string;
  p_apellidos: string;
  p_telefono?: string | null;
  p_email?: string | null;
  p_edad?: number | null;
  p_diagnostico_principal: string;
  p_comentarios_registro?: string | null;
  p_probabilidad_cirugia?: number | null;
  p_fecha_hora_cita: string;
  p_motivo_cita: string;
  p_doctor_id?: string | null;
  p_creado_por_id?: string | null;
}

interface AdmissionResponse {
  success: boolean;
  message: string;
  created_patient_id: string;
  created_appointment_id: string;
}

// ==================== CACHE KEYS ====================
export const CACHE_KEYS = {
  APPOINTMENTS: 'admission-appointments',
  COUNTS: 'admission-counts',
  PATIENTS: 'patients',
} as const;

// ==================== API FUNCTION CORREGIDA ====================
const submitAdmission = async (data: AdmissionPayload): Promise<AdmissionResponse> => {
  console.log('🚀 [Admission Hook] Submitting admission:', {
    patient: `${data.p_nombre} ${data.p_apellidos}`,
    date: data.p_fecha_hora_cita,
  });

  // Enviar el payload directamente ya que viene con los prefijos correctos
  console.log('📞 [Admission Hook] API payload:', data);

  const response = await fetch('/api/patient-admission', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = `Error ${response.status}: No se pudo crear el paciente`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || JSON.stringify(errorData);
    } catch (e) {
      // Si la respuesta no es JSON, intenta leerla como texto
      errorMessage = await response.text();
    }

    console.error('❌ [Admission Hook] API Error:', {
      status: response.status,
      statusText: response.statusText,
      errorMessage,
    });

    throw new Error(errorMessage);
  }

  const result = await response.json();
  
  console.log('✅ [Admission Hook] API Response:', result);
  
  if (!result.created_patient_id || !result.created_appointment_id) {
    throw new Error('Respuesta inválida del servidor');
  }

  return result;
};

// ==================== HOOK PRINCIPAL ====================
export const usePatientAdmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitAdmission,
    
    onMutate: async () => {
      console.log('🔄 [Admission Hook] Starting admission mutation...');
    },

    onSuccess: async (data, variables) => {
      console.log('✅ [Admission Hook] Admission successful:', {
        patientId: data.created_patient_id,
        appointmentId: data.created_appointment_id,
      });

      // ✅ INVALIDAR CACHÉS DE FORMA INTELIGENTE
      const invalidationPromises = [
        // Invalidar citas por categoría
        queryClient.invalidateQueries({ 
          queryKey: [CACHE_KEYS.APPOINTMENTS, 'today'] 
        }),
        queryClient.invalidateQueries({ 
          queryKey: [CACHE_KEYS.APPOINTMENTS, 'future'] 
        }),
        queryClient.invalidateQueries({ 
          queryKey: [CACHE_KEYS.APPOINTMENTS, 'all'] 
        }),

        // Invalidar contadores
        queryClient.invalidateQueries({ 
          queryKey: [CACHE_KEYS.COUNTS] 
        }),

        // Invalidar lista de pacientes
        queryClient.invalidateQueries({ 
          queryKey: [CACHE_KEYS.PATIENTS] 
        }),
      ];

      await Promise.all(invalidationPromises);

      // ✅ REFRESCAR INMEDIATAMENTE
      await queryClient.refetchQueries({ 
        queryKey: [CACHE_KEYS.APPOINTMENTS, 'today'] 
      });

      // ✅ MOSTRAR TOAST DE ÉXITO
      toast.success('¡Paciente registrado exitosamente!', {
        description: `${variables.p_nombre} ${variables.p_apellidos} ha sido admitido y su cita ha sido programada.`,
        duration: 5000,
      });
    },

    onError: (error: Error, variables) => {
      console.error('❌ [Admission Hook] Admission failed:', {
        error: error.message,
        patient: `${variables.p_nombre} ${variables.p_apellidos}`,
        stack: error.stack,
      });
      
      toast.error('Error al registrar paciente', {
        description: error.message,
        duration: 6000,
      });
    },

    retry: (failureCount, error) => {
      // No reintentar en casos específicos
      if (error.message.includes('Conflicto') || 
          error.message.includes('inválidos') ||
          error.message.includes('enum') ||
          error.message.includes('ya existe')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};