// app/api/appointments/[id]/status/route.ts - API CORREGIDA PARA TU ESQUEMA REAL
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { ZAppointmentStatus } from '@/lib/validation/enums';
import {
  canTransitionToStatus,
  canCheckIn,
  canCompleteAppointment,
  canCancelAppointment,
  canMarkNoShow,
  canRescheduleAppointment,
} from '@/lib/admission-business-rules';

// ==================== VALIDACIÓN CORREGIDA PARA TU ESQUEMA ====================
const UpdateStatusSchema = z.object({
  // estado_cita debe coincidir EXACTAMENTE con appointment_status_enum de la BD
  newStatus: ZAppointmentStatus,
  motivo_cambio: z.string().optional(),
  nuevaFechaHora: z.string().datetime().optional(),
  // Alias para compatibilidad con payloads antiguos del frontend
  fecha_hora_cita: z.string().datetime().optional(),
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
  
  // Nota: fechas de reagendamiento se manejan en la tabla appointments, no en appointment_history
  
  const { error } = await supabase
    .from('appointment_history')
    .insert(auditData);
  
  if (error) {
    console.error('⚠️ [Status Update] Audit trail error:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
};

// Nota: La validación de transición y acciones ahora se importa desde
// '@/lib/admission-business-rules' para evitar duplicación.

// ==================== ENDPOINT PRINCIPAL ====================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: appointmentId } = await params;
    const rawBody = await request.json();
    
    // Backward-compat: aceptar claves antiguas del frontend
    // - estado_cita -> newStatus
    // - fecha_hora_cita -> nuevaFechaHora
    const body = {
      ...rawBody,
      newStatus: rawBody?.newStatus ?? rawBody?.estado_cita,
      nuevaFechaHora: rawBody?.nuevaFechaHora ?? rawBody?.fecha_hora_cita,
    };
    
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
    
    const { newStatus, motivo_cambio, nuevaFechaHora, fecha_hora_cita, notas_adicionales } = validationResult.data;
    const effectiveNewDateTime = nuevaFechaHora ?? fecha_hora_cita;
    
    // 2. OBTENER CITA ACTUAL (según tu esquema real)
    const { data: currentAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        doctor_id,
        fecha_hora_cita,
        motivos_consulta,
        estado_cita,
        es_primera_vez,
        notas_breves,
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
    
    // 4. VALIDAR TRANSICIÓN DE ESTADO (FUENTE ÚNICA DE VERDAD)
    const transitionValidation = canTransitionToStatus(
      currentStatus as any,
      newStatus as any
    );
    
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

    // 4.1 VALIDAR REGLAS ESPECÍFICAS SEGÚN LA ACCIÓN
    // Mapeamos el nuevo estado a la acción correspondiente para reutilizar
    // los mismos validadores de la UI en el backend.
    const now = new Date();
    let actionValidation: { valid: boolean; reason?: string } = { valid: true };

    switch (newStatus) {
      case 'PRESENTE': {
        const res = canCheckIn(currentAppointment as any, now);
        actionValidation = { valid: res.valid, reason: res.reason };
        break;
      }
      case 'COMPLETADA': {
        const res = canCompleteAppointment(currentAppointment as any, now);
        actionValidation = { valid: res.valid, reason: res.reason };
        break;
      }
      case 'CANCELADA': {
        const res = canCancelAppointment(currentAppointment as any, now);
        actionValidation = { valid: res.valid, reason: res.reason };
        break;
      }
      case 'NO_ASISTIO': {
        const res = canMarkNoShow(currentAppointment as any, now);
        actionValidation = { valid: res.valid, reason: res.reason };
        break;
      }
      case 'REAGENDADA': {
        const res = canRescheduleAppointment(currentAppointment as any, now);
        actionValidation = { valid: res.valid, reason: res.reason };
        break;
      }
      default:
        // Estados como 'CONFIRMADA' no requieren validador específico distinto
        actionValidation = { valid: true };
    }

    if (!actionValidation.valid) {
      return NextResponse.json(
        {
          error: 'Acción no permitida por reglas de negocio',
          reason: actionValidation.reason,
          currentStatus,
          attemptedStatus: newStatus,
        },
        { status: 422 }
      );
    }
    
    // 5. OBTENER INFORMACIÓN DEL USUARIO PARA AUDITORÍA
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;
    
    // Obtener información adicional de la request
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || undefined;
    
    // 6. PREPARAR DATOS DE ACTUALIZACIÓN
    const updateData: any = {
      estado_cita: newStatus, // TEXT en tu esquema
      updated_at: new Date().toISOString(),
    };
    
    // Agregar nueva fecha/hora si es reagendamiento
    if (newStatus === 'REAGENDADA' && effectiveNewDateTime) {
      updateData.fecha_hora_cita = effectiveNewDateTime;
    }
    
    // Agregar notas adicionales
    if (notas_adicionales) {
      const existingNotes = currentAppointment.notas_breves || '';
      const timestamp = new Date().toLocaleString('es-MX');
      updateData.notas_breves = existingNotes 
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
        motivos_consulta,
        estado_cita,
        es_primera_vez,
        notas_breves,
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
      effectiveNewDateTime,
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
          estado_paciente: 'en_seguimiento', // Valor válido en patient_status_enum
          fecha_primera_consulta: currentAppointment.fecha_hora_cita.split('T')[0],
          ultimo_contacto: new Date().toISOString().split('T')[0], // DATE field
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentAppointment.patient_id);
    }
    
    // 10. LOG PARA MONITOREO
    const patientObj: any = Array.isArray(currentAppointment.patients)
      ? currentAppointment.patients[0]
      : currentAppointment.patients;
    const patientName = patientObj
      ? `${patientObj.nombre ?? ''} ${patientObj.apellidos ?? ''}`.trim() || 'Paciente sin nombre'
      : 'Paciente desconocido';
    
    console.log(`✅ [Status Update] Success:`, {
      appointmentId,
      patient: patientName,
      statusChange: `${currentStatus} → ${newStatus}`,
      datetime: effectiveNewDateTime || 'sin cambio',
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
    const msg = String(error?.message || error || '');
    const transient =
      msg.includes('ECONNRESET') ||
      msg.includes('ETIMEDOUT') ||
      msg.includes('EPIPE') ||
      msg.includes('broken pipe') ||
      msg.includes('fetch failed') ||
      msg.toLowerCase().includes('network');

    if (transient) {
      return NextResponse.json(
        {
          error: 'Servicio temporalmente no disponible',
          message: process.env.NODE_ENV === 'development' ? msg : undefined,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? msg : undefined,
      },
      { status: 500 }
    );
  }
}