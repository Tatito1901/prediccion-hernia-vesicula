// app/api/patient-admission/route.ts
// API CORREGIDA PARA TU ESQUEMA REAL DE BASE DE DATOS

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

// Definición del enum de diagnóstico (debe coincidir con el enum en la base de datos)
const DIAGNOSIS_ENUM = [
  'HERNIA_INGUINAL',
  'HERNIA_UMBILICAL', 
  'COLECISTITIS',
  'COLEDOCOLITIASIS',
  'COLANGITIS',
  'APENDICITIS',
  'HERNIA_HIATAL',
  'LIPOMA_GRANDE',
  'HERNIA_INGUINAL_RECIDIVANTE',
  'QUISTE_SEBACEO_INFECTADO',
  'EVENTRACION_ABDOMINAL',
  'VESICULA',
  'OTRO',
  'HERNIA_SPIGEL'
] as const;

// ==================== VALIDACIÓN CORREGIDA PARA TU ESQUEMA ====================
const PatientAdmissionSchema = z.object({
  // ✅ Parámetros exactos de tu función RPC
  p_nombre: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  p_apellidos: z.string().min(2, "Apellidos debe tener al menos 2 caracteres"),
  p_telefono: z.string().nullable().optional(),
  p_email: z.string().email("Email inválido").nullable().optional(),
  p_edad: z.number().min(0).max(120).nullable().optional(),
  p_diagnostico_principal: z.enum(DIAGNOSIS_ENUM, {
    required_error: "Diagnóstico es requerido",
    invalid_type_error: "El diagnóstico debe ser uno de los valores permitidos"
  }),
  p_comentarios_registro: z.string().nullable().optional(),
  p_probabilidad_cirugia: z.number().min(0).max(1).nullable().optional(),
  p_fecha_hora_cita: z.string().datetime("Fecha y hora inválida"),
  p_motivo_cita: z.string().min(1, "Motivo de consulta requerido"),
  p_doctor_id: z.string().uuid().nullable().optional(),
  p_creado_por_id: z.string().uuid().nullable().optional(),
});

type PatientAdmissionData = z.infer<typeof PatientAdmissionSchema>;

// ==================== BUSINESS RULES ====================
const validateAppointmentTime = (dateTimeStr: string): { valid: boolean; reason?: string } => {
  try {
    const appointmentTime = new Date(dateTimeStr);
    const now = new Date();
    
    // No puede ser en el pasado
    if (appointmentTime < now) {
      return { valid: false, reason: 'La cita no puede ser programada en el pasado' };
    }
    
    // Debe estar en horario laboral (8 AM - 6 PM)
    const hour = appointmentTime.getHours();
    if (hour < 8 || hour >= 18) {
      return { valid: false, reason: 'Las citas solo pueden programarse entre 8:00 AM y 6:00 PM' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Formato de fecha y hora inválido' };
  }
};

// ==================== ENDPOINT PRINCIPAL ====================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    console.log('🏥 [Patient Admission] Starting admission process...');
    console.log('📥 [Patient Admission] Request body:', body);
    
    // ✅ 1. VALIDAR DATOS DE ENTRADA
    const validationResult = PatientAdmissionSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.warn('⚠️ [Patient Admission] Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { 
          error: 'Datos de admisión inválidos',
          validation_errors: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // ✅ 2. VALIDAR REGLAS DE NEGOCIO
    const timeValidation = validateAppointmentTime(data.p_fecha_hora_cita);
    if (!timeValidation.valid) {
      return NextResponse.json(
        { error: timeValidation.reason },
        { status: 422 }
      );
    }
    
    // ✅ 3. OBTENER USUARIO ACTUAL PARA creado_por_id
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    // ✅ 4. PREPARAR PARÁMETROS EXACTOS PARA LA RPC
    const rpcParams = {
      p_nombre: data.p_nombre,
      p_apellidos: data.p_apellidos,
      p_telefono: data.p_telefono,
      p_email: data.p_email,
      p_edad: data.p_edad,
      // Ya no necesitamos cast, la RPC ahora acepta un string directamente
      p_diagnostico_principal: data.p_diagnostico_principal,
      p_comentarios_registro: data.p_comentarios_registro,
      p_probabilidad_cirugia: data.p_probabilidad_cirugia,
      p_fecha_hora_cita: data.p_fecha_hora_cita,
      p_motivo_cita: data.p_motivo_cita,
      p_doctor_id: data.p_doctor_id,
      p_creado_por_id: userId || null,
    };
    
    console.log('📞 [Patient Admission] Calling RPC with params:', rpcParams);
    
    // ✅ 5. LLAMAR A LA FUNCIÓN RPC CORREGIDA
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'create_patient_and_appointment',
      rpcParams
    );
    
    // ✅ 6. PROCESAR RESULTADO
    if (rpcError) {
      console.error('❌ [Patient Admission] RPC error:', rpcError);
      return NextResponse.json(
        { error: `Error interno al registrar el paciente: ${rpcError.message}` },
        { status: 400 }
      );
    }
    // Procesar el nuevo formato de respuesta (success, message, ids)
    if (rpcResult) {
      // La RPC devuelve un objeto, no un array
      if (!rpcResult.success) {
        console.warn('⚠️ [Patient Admission] RPC returned failure:', rpcResult.message);
        return NextResponse.json(
          { error: rpcResult.message },
          { status: 400 }
        );
      }
      
      // ✅ 7. RETORNAR RESPUESTA EXITOSA
      console.log('✅ [Patient Admission] RPC success!');
      return NextResponse.json(
        { 
          message: 'Paciente registrado y cita creada con éxito',
          patient_id: rpcResult.created_patient_id,
          appointment_id: rpcResult.created_appointment_id,
          next_steps: [
            'El paciente ha sido registrado en el sistema',
            'La cita ha sido programada automáticamente',
            'El paciente aparecerá en la lista de citas correspondiente',
          ],
        },
        { status: 201 }
      );
    } else {
      console.error('❌ [Patient Admission] RPC returned empty or unexpected result:', rpcResult);
      return NextResponse.json(
        { error: 'No se obtuvo respuesta válida de la base de datos' },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('💥 [Patient Admission] Unexpected error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Error al procesar la admisión',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}