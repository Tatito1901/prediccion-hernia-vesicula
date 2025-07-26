// app/api/appointments/[id]/status/route.ts - API CORREGIDA PARA TU ESQUEMA REAL
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

// ==================== VALIDACIÓN CORREGIDA PARA TU ESQUEMA ====================
const UpdateStatusSchema = z.object({
  // estado_cita es TEXT en tu esquema, no ENUM
  newStatus: z.enum([
    'PROGRAMADA',
    'CONFIRMADA', 
    'EN_SALA',
    'EN_CONSULTA',
    'COMPLETADA',
    'CANCELADA',
    'NO_ASISTIO',
    'REAGENDADA',
    'PRESENTE'
  ] as const),
  motivo_cambio: z.string().optional(),
  nuevaFechaHora: z.string().datetime().optional(),
  notas_adicionales: z.string().max(500).optional(),
});

// ==================== HELPERS CORREGIDOS ====================
const createAuditRecord = async (
  supabase: any,
  appointmentId: string,
  userId: string | null,
  oldStatus: string,
  newStatus: string,
  oldDateTime?: string,
  newDateTime?: string,
  motivo?: string,
  userAgent?: string,
  ipAddress?: string
) => {
  // Datos de auditoría según tu esquema real
  const auditData = {
    appointment_id: appointmentId,
    estado_cita_anterior: oldStatus, // USER-DEFINED en tu esquema
    estado_cita_nuevo: newStatus,    // USER-DEFINED en tu esquema
    fecha_cambio: new Date().toISOString(),
    modificado_por_id: userId,
    motivo_cambio: motivo || `Cambio de estado: ${oldStatus} → ${newStatus}`,
    notas: `Actualización realizada desde sistema de admisión`,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
    created_at: new Date().toISOString(),
  };
  
  // Agregar fechas si es reagendamiento
  if (newStatus === 'REAGENDADA' && oldDateTime && newDateTime) {
    auditData['fecha_cita_anterior'] = oldDateTime;
    auditData['fecha_cita_nueva'] = newDateTime;
  }
  
  const { error } = await supabase
    .from('appointment_history')
    .insert(auditData);
  
  if (error) {
    console.error('⚠️ [Status Update] Audit trail error:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
};

const validateStatusTransition = (
  currentStatus: string,
  newStatus: string
): { valid: boolean; reason?: string } => {
  // Transiciones permitidas según tu workflow
  const allowedTransitions: Record<string, string[]> = {
    'PROGRAMADA': ['CONFIRMADA', 'EN_SALA', 'CANCELADA', 'NO_ASISTIO', 'REAGENDADA'],
    'CONFIRMADA': ['EN_SALA', 'CANCELADA', 'NO_ASISTIO', 'REAGENDADA'],
    'EN_SALA': ['EN_CONSULTA', 'CANCELADA'],
    'EN_CONSULTA': ['COMPLETADA', 'REAGENDADA'],
    'COMPLETADA': [], // Estado final
    'CANCELADA': ['REAGENDADA'],
    'NO_ASISTIO': ['REAGENDADA'],
    'REAGENDADA': ['PROGRAMADA'], // Reinicia el ciclo
  };
  
  const allowed = allowedTransitions[currentStatus] || [];
  
  if (!allowed.includes(newStatus)) {
    return {
      valid: false,
      reason: `No se puede cambiar de ${currentStatus} a ${newStatus}. Transiciones permitidas: ${allowed.join(', ')}`
    };
  }
  
  return { valid: true };
};

// ==================== ENDPOINT PRINCIPAL ====================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: appointmentId } = await params;
    const body = await request.json();
    
    console.log(`🔄 [Status Update] Processing update for appointment: ${appointmentId}`);
    
    // 1. VALIDAR PAYLOAD
    const validationResult = UpdateStatusSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }
    
    const { newStatus, motivo_cambio, nuevaFechaHora, notas_adicionales } = validationResult.data;
    
    // 2. OBTENER CITA ACTUAL (según tu esquema real)
    const { data: currentAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        doctor_id,
        fecha_hora_cita,
        motivo_cita,
        estado_cita,
        es_primera_vez,
        notas_cita_seguimiento,
        created_at,
        patients!inner (
          id,
          nombre,
          apellidos,
          telefono,
          email,
          estado_paciente
        )
      `)
      .eq('id', appointmentId)
      .single();
    
    if (fetchError || !currentAppointment) {
      console.error('❌ [Status Update] Appointment not found:', fetchError);
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }
    
    const currentStatus = currentAppointment.estado_cita;
    
    // 3. VALIDAR QUE EL ESTADO REALMENTE CAMBIÓ
    if (currentStatus === newStatus) {
      return NextResponse.json(
        { error: 'El estado ya es el mismo' },
        { status: 400 }
      );
    }
    
    // 4. VALIDAR TRANSICIÓN DE ESTADO
    const transitionValidation = validateStatusTransition(currentStatus, newStatus);
    
    if (!transitionValidation.valid) {
      console.warn('⚠️ [Status Update] Invalid transition:', transitionValidation.reason);
      return NextResponse.json(
        { 
          error: 'Transición de estado no permitida',
          reason: transitionValidation.reason,
          currentStatus,
          attemptedStatus: newStatus,
        },
        { status: 422 }
      );
    }
    
    // 5. OBTENER INFORMACIÓN DEL USUARIO PARA AUDITORÍA
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    // Obtener información adicional de la request
    const userAgent = request.headers.get('user-agent');
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown';
    
    // 6. PREPARAR DATOS DE ACTUALIZACIÓN
    const updateData: any = {
      estado_cita: newStatus, // TEXT en tu esquema
      updated_at: new Date().toISOString(),
    };
    
    // Agregar nueva fecha/hora si es reagendamiento
    if (newStatus === 'REAGENDADA' && nuevaFechaHora) {
      updateData.fecha_hora_cita = nuevaFechaHora;
    }
    
    // Agregar notas adicionales
    if (notas_adicionales) {
      const existingNotes = currentAppointment.notas_cita_seguimiento || '';
      const timestamp = new Date().toLocaleString('es-MX');
      updateData.notas_cita_seguimiento = existingNotes 
        ? `${existingNotes} | [${timestamp}] ${notas_adicionales}`
        : `[${timestamp}] ${notas_adicionales}`;
    }
    
    // 7. REALIZAR ACTUALIZACIÓN EN LA BASE DE DATOS
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .select(`
        id,
        patient_id,
        doctor_id,
        fecha_hora_cita,
        motivo_cita,
        estado_cita,
        es_primera_vez,
        notas_cita_seguimiento,
        created_at,
        patients!inner (
          id,
          nombre,
          apellidos,
          telefono,
          email,
          estado_paciente
        )
      `)
      .single();
    
    if (updateError) {
      console.error('❌ [Status Update] Database update error:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar el estado de la cita' },
        { status: 500 }
      );
    }
    
    // 8. CREAR REGISTRO DE AUDITORÍA
    const auditResult = await createAuditRecord(
      supabase,
      appointmentId,
      userId,
      currentStatus,
      newStatus,
      currentAppointment.fecha_hora_cita,
      nuevaFechaHora,
      motivo_cambio,
      userAgent,
      ipAddress
    );
    
    // 9. ACTUALIZAR ESTADO DEL PACIENTE SI ES NECESARIO
    if (newStatus === 'COMPLETADA') {
      // Actualizar estado del paciente según tu enum real
      await supabase
        .from('patients')
        .update({ 
          estado_paciente: 'CONSULTADO', // Valor según tu enum patient_status_enum
          fecha_primera_consulta: currentAppointment.fecha_hora_cita.split('T')[0],
          ultimo_contacto: new Date().toISOString().split('T')[0], // DATE field
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentAppointment.patient_id);
    }
    
    // 10. LOG PARA MONITOREO
    const patientName = currentAppointment.patients 
      ? `${currentAppointment.patients.nombre} ${currentAppointment.patients.apellidos}`.trim()
      : 'Paciente desconocido';
    
    console.log(`✅ [Status Update] Success:`, {
      appointmentId,
      patient: patientName,
      statusChange: `${currentStatus} → ${newStatus}`,
      datetime: nuevaFechaHora || 'sin cambio',
      userId: userId || 'usuario no disponible',
      auditCreated: auditResult.success,
      ipAddress,
    });
    
    // 11. RESPUESTA EXITOSA CON METADATOS
    return NextResponse.json({
      ...updatedAppointment,
      _meta: {
        previous_status: currentStatus,
        status_changed_at: new Date().toISOString(),
        changed_by_user: userId || null,
        audit_trail_created: auditResult.success,
        transition_validated: true,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });
    
  } catch (error: any) {
    console.error('💥 [Status Update] Unexpected error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}