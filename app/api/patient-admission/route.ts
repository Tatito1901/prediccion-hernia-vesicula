// app/api/patient-admission/route.ts - API CORREGIDA PARA TU ESQUEMA REAL
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { addMinutes, isBefore, isWeekend, isAfter } from 'date-fns';

// ==================== VALIDACIÓN CORREGIDA PARA TU ESQUEMA ====================
const PatientAdmissionSchema = z.object({
  // Campos del paciente según tu esquema
  nombre: z.string().min(2, "Nombre debe tener al menos 2 caracteres").max(50),
  apellidos: z.string().min(2, "Apellidos debe tener al menos 2 caracteres").max(50),
  telefono: z.string().optional(), // Opcional en tu esquema
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  edad: z.number().min(0).max(120).optional(),
  
  // Diagnóstico usando valores reales de tu enum
  diagnostico_principal: z.enum([
    'HERNIA INGUINAL',
    'HERNIA UMBILICAL', 
    'COLECISTITIS',
    'COLEDOCOLITIASIS',
    'COLANGITIS',
    'APENDICITIS',
    'HERNIA HIATAL',
    'LIPOMA GRANDE',
    'HERNIA INGUINAL RECIDIVANTE',
    'QUISTE SEBACEO INFECTADO',
    'EVENTRACION ABDOMINAL',
    'VESICULA (COLECISTITIS CRONICA)',
    'OTRO',
    'HERNIA SPIGEL'
  ]),
  comentarios_registro: z.string().max(500).optional(),
  
  // CORREGIDO: probabilidad como decimal 0-1 (tu esquema es NUMERIC)
  probabilidad_cirugia: z.number().min(0).max(1).optional(),
  
  // Datos de la cita
  fecha_hora_cita: z.string().datetime("Fecha y hora inválida"),
  motivo_cita: z.string().min(1, "Motivo de consulta requerido"),
  doctor_id: z.string().uuid().optional().nullable(),
});

type PatientAdmissionData = z.infer<typeof PatientAdmissionSchema>;

// ==================== BUSINESS RULES (sin cambios) ====================
const validateAppointmentTime = (dateTimeStr: string): { valid: boolean; reason?: string } => {
  try {
    const appointmentDate = new Date(dateTimeStr);
    const now = new Date();
    
    if (isBefore(appointmentDate, addMinutes(now, -5))) {
      return { valid: false, reason: 'La cita no puede ser en el pasado' };
    }
    
    if (isWeekend(appointmentDate)) {
      return { valid: false, reason: 'No se pueden agendar citas en fines de semana' };
    }
    
    const hour = appointmentDate.getHours();
    if (hour < 8 || hour >= 18) {
      return { valid: false, reason: 'Las citas solo pueden agendarse entre 8:00 y 18:00' };
    }
    
    if (hour >= 12 && hour < 13) {
      return { valid: false, reason: 'No se pueden agendar citas en horario de almuerzo (12:00-13:00)' };
    }
    
    const maxDate = addMinutes(now, 90 * 24 * 60);
    if (isAfter(appointmentDate, maxDate)) {
      return { valid: false, reason: 'No se pueden agendar citas con más de 90 días de anticipación' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Formato de fecha/hora inválido' };
  }
};

const checkAppointmentConflicts = async (
  supabase: any,
  dateTime: string,
  doctorId?: string | null
): Promise<{ hasConflict: boolean; conflictingAppointment?: any }> => {
  const appointmentDate = new Date(dateTime);
  const startWindow = new Date(appointmentDate.getTime() - 15 * 60 * 1000);
  const endWindow = new Date(appointmentDate.getTime() + 15 * 60 * 1000);
  
  let query = supabase
    .from('appointments')
    .select(`
      id, 
      fecha_hora_cita, 
      patients!inner(nombre, apellidos)
    `)
    .gte('fecha_hora_cita', startWindow.toISOString())
    .lte('fecha_hora_cita', endWindow.toISOString())
    .not('estado_cita', 'in', '(CANCELADA,NO_ASISTIO)');
  
  if (doctorId) {
    query = query.eq('doctor_id', doctorId);
  }
  
  const { data: conflicts, error } = await query;
  
  if (error) {
    console.error('Error checking appointment conflicts:', error);
    throw new Error('Error al verificar conflictos de horario');
  }
  
  return {
    hasConflict: conflicts && conflicts.length > 0,
    conflictingAppointment: conflicts?.[0],
  };
};

const checkExistingPatient = async (
  supabase: any,
  telefono?: string,
  email?: string
): Promise<{ exists: boolean; patient?: any }> => {
  if (!telefono && !email) {
    return { exists: false };
  }
  
  let query = supabase
    .from('patients')
    .select('id, nombre, apellidos, telefono, email, estado_paciente');
  
  const orConditions = [];
  if (telefono) orConditions.push(`telefono.eq.${telefono.trim()}`);
  if (email) orConditions.push(`email.eq.${email.trim()}`);
  
  if (orConditions.length > 0) {
    query = query.or(orConditions.join(','));
  }
  
  const { data: existingPatients, error } = await query;
  
  if (error) {
    console.error('Error checking existing patient:', error);
    throw new Error('Error al verificar paciente existente');
  }
  
  return {
    exists: existingPatients && existingPatients.length > 0,
    patient: existingPatients?.[0],
  };
};

// ==================== ENDPOINT PRINCIPAL ====================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    console.log('🏥 [Patient Admission] Starting admission process (corrected)...');
    
    // 1. VALIDAR DATOS DE ENTRADA
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
    
    // 2. VALIDAR REGLAS DE NEGOCIO PARA LA CITA
    const timeValidation = validateAppointmentTime(data.fecha_hora_cita);
    if (!timeValidation.valid) {
      return NextResponse.json(
        { error: timeValidation.reason },
        { status: 422 }
      );
    }
    
    // 3. VERIFICAR CONFLICTOS DE HORARIO
    const conflictCheck = await checkAppointmentConflicts(
      supabase,
      data.fecha_hora_cita,
      data.doctor_id
    );
    
    if (conflictCheck.hasConflict) {
      const conflicting = conflictCheck.conflictingAppointment;
      const patientName = conflicting?.patients 
        ? `${conflicting.patients.nombre} ${conflicting.patients.apellidos}`.trim()
        : 'Otro paciente';
      
      return NextResponse.json(
        { 
          error: 'Conflicto de horario detectado',
          conflicting_appointment: {
            patient: patientName,
            time: conflicting.fecha_hora_cita,
          },
        },
        { status: 409 }
      );
    }
    
    // 4. VERIFICAR SI EL PACIENTE YA EXISTE
    const existingPatientCheck = await checkExistingPatient(
      supabase, 
      data.telefono, 
      data.email
    );
    
    if (existingPatientCheck.exists) {
      return NextResponse.json(
        {
          error: 'Paciente ya existe en el sistema',
          existing_patient: existingPatientCheck.patient,
          suggestion: 'Use "Agendar Cita" en lugar de "Nuevo Paciente"',
        },
        { status: 409 }
      );
    }
    
    // 5. OBTENER USUARIO ACTUAL
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    // 6. USAR RPC FUNCTION CORREGIDA
    console.log('📞 [Patient Admission] Calling corrected RPC function...');
    
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'create_patient_and_appointment',
      {
        p_nombre: data.nombre.trim(),
        p_apellidos: data.apellidos.trim(),
        p_telefono: data.telefono?.trim() || null,
        p_email: data.email?.trim() || null,
        p_edad: data.edad || null,
        p_diagnostico_principal: data.diagnostico_principal,
        p_comentarios_registro: data.comentarios_registro?.trim() || null,
        p_probabilidad_cirugia: data.probabilidad_cirugia || null, // Ya en formato 0-1
        p_fecha_hora_cita: data.fecha_hora_cita,
        p_motivo_cita: data.motivo_cita.trim(),
        p_doctor_id: data.doctor_id || null,
        p_creado_por_id: userId,
      }
    );
    
    if (rpcError) {
      console.error('❌ [Patient Admission] RPC error:', rpcError);
      throw new Error(`Error en base de datos: ${rpcError.message}`);
    }
    
    if (!rpcResult || rpcResult.length === 0) {
      throw new Error('No se obtuvo respuesta válida de la base de datos');
    }
    
    const result = rpcResult[0];
    
    // 7. VERIFICAR RESULTADO DE LA RPC
    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.message || 'Error al crear paciente y cita',
        },
        { status: 400 }
      );
    }
    
    const patientId = result.created_patient_id;
    const appointmentId = result.created_appointment_id;
    
    if (!patientId || !appointmentId) {
      throw new Error('IDs de paciente o cita no recibidos');
    }
    
    // 8. OBTENER DATOS COMPLETOS CREADOS
    const { data: createdPatient, error: fetchError } = await supabase
      .from('patients')
      .select(`
        id,
        nombre,
        apellidos,
        telefono,
        email,
        edad,
        diagnostico_principal,
        estado_paciente,
        fecha_registro,
        probabilidad_cirugia
      `)
      .eq('id', patientId)
      .single();
    
    if (fetchError) {
      console.error('⚠️ [Patient Admission] Error fetching created patient:', fetchError);
    }
    
    const { data: createdAppointment, error: appointmentFetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        fecha_hora_cita,
        motivo_cita,
        estado_cita,
        es_primera_vez
      `)
      .eq('id', appointmentId)
      .single();
    
    if (appointmentFetchError) {
      console.error('⚠️ [Patient Admission] Error fetching created appointment:', appointmentFetchError);
    }
    
    // 9. LOG PARA AUDITORÍA
    console.log(`✅ [Patient Admission] Success (corrected):`, {
      patientId,
      appointmentId,
      patientName: `${data.nombre} ${data.apellidos}`.trim(),
      appointmentTime: data.fecha_hora_cita,
      createdBy: userId || 'unknown',
      timestamp: new Date().toISOString(),
    });
    
    // 10. RESPUESTA EXITOSA
    return NextResponse.json({
      message: 'Paciente y cita creados exitosamente',
      patient_id: patientId,
      appointment_id: appointmentId,
      patient: createdPatient || {
        id: patientId,
        nombre: data.nombre,
        apellidos: data.apellidos,
        telefono: data.telefono,
        email: data.email,
        diagnostico_principal: data.diagnostico_principal,
      },
      appointment: createdAppointment || {
        id: appointmentId,
        fecha_hora_cita: data.fecha_hora_cita,
        motivo_cita: data.motivo_cita,
        estado_cita: 'PROGRAMADA',
        es_primera_vez: true,
      },
      next_steps: [
        'El paciente ha sido registrado en el sistema',
        'La cita ha sido programada automáticamente',
        'El paciente aparecerá en la lista de citas correspondiente',
      ],
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('💥 [Patient Admission] Unexpected error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Error al procesar la admisión',
      },
      { status: 500 }
    );
  }
}