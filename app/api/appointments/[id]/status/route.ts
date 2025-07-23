// app/api/appointments/[id]/status/route.ts
// 🎯 ENDPOINT CRÍTICO FALTANTE PARA ACTUALIZACIÓN DE ESTADO
// Resuelve: Check in, Reagendar, Cancelar, No asistió no funcionaban

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AppointmentStatusEnum } from '@/lib/types';

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
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { id } = params;

  try {
    const body = await request.json();
    const { estado_cita: newStatus, motivo_cambio, fecha_hora_cita } = body;

    // 🔍 VALIDACIÓN 1: Verificar que el estado nuevo es válido
    if (!Object.values(AppointmentStatusEnum).includes(newStatus)) {
      return NextResponse.json(
        { message: `Estado inválido: ${newStatus}` },
        { status: 400 }
      );
    }

    // 🔍 VALIDACIÓN 2: Obtener cita actual
    const { data: currentAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        estado_cita,
        fecha_hora_cita,
        patients (id, nombre, apellidos)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !currentAppointment) {
      return NextResponse.json(
        { message: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    // 🔍 VALIDACIÓN 3: Verificar transición de estado permitida
    const currentStatus = currentAppointment.estado_cita;
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        { message: `Transición no permitida de ${currentStatus} a ${newStatus}` },
        { status: 422 }
      );
    }

    // 🔄 PREPARAR DATOS PARA ACTUALIZACIÓN
    const updateData: any = {
      estado_cita: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Añadir campos opcionales según el caso
    if (motivo_cambio) {
      updateData.notas_cita_seguimiento = motivo_cambio;
    }

    if (fecha_hora_cita && (newStatus === 'REAGENDADA')) {
      updateData.fecha_hora_cita = fecha_hora_cita;
    }

    // ✅ ACTUALIZACIÓN EN BASE DE DATOS
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        fecha_hora_cita,
        motivo_cita,
        estado_cita,
        es_primera_vez,
        notas_cita_seguimiento,
        created_at,
        patient_id,
        doctor_id,
        patients (*),
        profiles (*)
      `)
      .single();

    if (updateError) {
      console.error('Error actualizando estado de cita:', updateError);
      return NextResponse.json(
        { message: 'Error al actualizar el estado de la cita', error: updateError.message },
        { status: 500 }
      );
    }

    // 📊 LOG PARA AUDITORIA
    const patientName = Array.isArray(currentAppointment.patients) 
      ? currentAppointment.patients[0]?.nombre 
      : currentAppointment.patients?.nombre;
    console.log(`✅ Estado actualizado: ${id} | ${currentStatus} → ${newStatus} | Paciente: ${patientName}`);

    // 🎯 RESPUESTA EXITOSA
    return NextResponse.json(updatedAppointment, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error: any) {
    console.error('Error en PATCH /api/appointments/[id]/status:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor', error: error.message },
      { status: 500 }
    );
  }
}
