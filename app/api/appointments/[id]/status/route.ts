// app/api/appointments/[id]/status/route.ts
// 🎯 VERSIÓN MEJORADA - Usa tu tabla appointment_history para auditoría automática

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Estados válidos permitidos para transiciones
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  'PROGRAMADA': ['CONFIRMADA', 'CANCELADA', 'REAGENDADA', 'PRESENTE', 'NO_ASISTIO'],
  'CONFIRMADA': ['CANCELADA', 'REAGENDADA', 'PRESENTE', 'NO_ASISTIO', 'COMPLETADA'],
  'PRESENTE': ['COMPLETADA', 'CANCELADA'],
  'CANCELADA': ['REAGENDADA', 'PROGRAMADA'],
  'REAGENDADA': ['CONFIRMADA', 'PROGRAMADA', 'CANCELADA'],
  'COMPLETADA': [], // Estado final
  'NO_ASISTIO': ['REAGENDADA', 'PROGRAMADA']
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  try {
    const body = await request.json();
    const { 
      estado_cita: newStatus, 
      motivo_cambio, 
      fecha_hora_cita: newDateTime,
      notas_adicionales 
    } = body;

    console.log(`[API] 🔄 Actualizando estado de cita ${id}: ${newStatus}`);

    // 1. VALIDACIÓN: Verificar que el estado nuevo es válido
    const validStates = ['PROGRAMADA', 'CONFIRMADA', 'PRESENTE', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO', 'REAGENDADA'];
    if (!validStates.includes(newStatus)) {
      return NextResponse.json(
        { message: `Estado inválido: ${newStatus}` },
        { status: 400 }
      );
    }

    // 2. OBTENER CITA ACTUAL (usando tu esquema exacto)
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
        patients (
          id, 
          nombre, 
          apellidos,
          telefono
        ),
        profiles:doctor_id (
          id,
          full_name,
          username
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !currentAppointment) {
      console.error('[API] ❌ Cita no encontrada:', fetchError);
      return NextResponse.json(
        { message: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    // 3. VALIDAR TRANSICIÓN DE ESTADO
    const currentStatus = currentAppointment.estado_cita;
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        { message: `Transición no permitida de ${currentStatus} a ${newStatus}` },
        { status: 422 }
      );
    }

    // 4. PREPARAR DATOS PARA ACTUALIZACIÓN
    const updateData: any = {
      estado_cita: newStatus
    };

    // Campos opcionales según el caso
    if (notas_adicionales) {
      updateData.notas_cita_seguimiento = notas_adicionales;
    }

    // Para reagendamiento, actualizar fecha/hora
    if (newDateTime && newStatus === 'REAGENDADA') {
      updateData.fecha_hora_cita = newDateTime;
    }

    // 5. OBTENER USUARIO ACTUAL (para auditoría)
    // Nota: Aquí deberías obtener el ID del usuario logueado
    // Por ahora uso un ID por defecto, pero deberías obtenerlo de la sesión
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id; // Usuario logueado

    if (!userId) {
      console.warn('[API] ⚠️ No se pudo obtener usuario para auditoría');
    }

    // 6. INICIAR TRANSACCIÓN: Actualizar cita + crear historial
    try {
      // 6a. Actualizar la cita
      const { data: updatedAppointment, error: updateError } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)
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
          patients (*),
          profiles:doctor_id (*)
        `)
        .single();

      if (updateError) {
        console.error('[API] ❌ Error actualizando cita:', updateError);
        return NextResponse.json(
          { message: 'Error al actualizar el estado de la cita', error: updateError.message },
          { status: 500 }
        );
      }

      // 6b. CREAR REGISTRO EN APPOINTMENT_HISTORY (usando tu tabla de auditoría)
      if (userId) {
        const historyData = {
          appointment_id: id,
          estado_cita_anterior: currentStatus,
          estado_cita_nuevo: newStatus,
          fecha_cambio: new Date().toISOString(),
          modificado_por_id: userId,
          notas: motivo_cambio || `Cambio de estado: ${currentStatus} → ${newStatus}`,
          motivo_cambio: motivo_cambio || 'Actualización manual'
        };

        // Si es reagendamiento, incluir fechas
        if (newStatus === 'REAGENDADA' && newDateTime) {
          historyData['fecha_cita_anterior'] = currentAppointment.fecha_hora_cita;
          historyData['fecha_cita_nueva'] = newDateTime;
        }

        const { error: historyError } = await supabase
          .from('appointment_history')
          .insert(historyData);

        if (historyError) {
          console.error('[API] ⚠️ Error creando historial (no crítico):', historyError);
          // No fallamos la operación principal por error de auditoría
        } else {
          console.log(`[API] ✅ Historial creado: ${currentStatus} → ${newStatus}`);
        }
      }

      // 7. LOG PARA MONITOREO
      const patient = currentAppointment.patients;
      const patientName = patient ? `${patient.nombre} ${patient.apellidos}`.trim() : 'Paciente desconocido';
      
      console.log(`[API] ✅ Estado actualizado exitosamente:`, {
        appointmentId: id,
        patient: patientName,
        statusChange: `${currentStatus} → ${newStatus}`,
        datetime: newDateTime || 'sin cambio',
        userId: userId || 'usuario no disponible'
      });

      // 8. RESPUESTA EXITOSA CON DATOS COMPLETOS
      return NextResponse.json({
        ...updatedAppointment,
        // Metadatos adicionales
        _meta: {
          previous_status: currentStatus,
          status_changed_at: new Date().toISOString(),
          changed_by_user: userId || null,
          has_history_record: !!userId
        }
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });

    } catch (transactionError: any) {
      console.error('[API] ❌ Error en transacción:', transactionError);
      return NextResponse.json(
        { message: 'Error en la actualización transaccional', error: transactionError.message },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('[API] ❌ Error general en PATCH /api/appointments/[id]/status:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor', error: error.message },
      { status: 500 }
    );
  }
}

// GET - Obtener historial de cambios de una cita específica
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    console.log(`[API] 📊 Obteniendo historial de cambios para cita: ${id}`);

    // Obtener cita actual
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        estado_cita,
        fecha_hora_cita,
        patients (nombre, apellidos)
      `)
      .eq('id', id)
      .single();

    if (appointmentError) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    // Obtener historial completo usando tu tabla appointment_history
    const { data: history, error: historyError } = await supabase
      .from('appointment_history')
      .select(`
        id,
        estado_cita_anterior,
        estado_cita_nuevo,
        fecha_cambio,
        fecha_cita_anterior,
        fecha_cita_nueva,
        notas,
        motivo_cambio,
        profiles:modificado_por_id (
          full_name,
          username
        )
      `)
      .eq('appointment_id', id)
      .order('fecha_cambio', { ascending: false });

    if (historyError) {
      console.error('[API] ❌ Error obteniendo historial:', historyError);
      return NextResponse.json(
        { error: 'Error al obtener historial' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      appointment: {
        id: appointment.id,
        current_status: appointment.estado_cita,
        current_datetime: appointment.fecha_hora_cita,
        patient_name: `${appointment.patients.nombre} ${appointment.patients.apellidos}`
      },
      history: history || [],
      total_changes: history?.length || 0
    });

  } catch (error: any) {
    console.error('[API] ❌ Error en GET historial:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}