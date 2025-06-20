// app/api/appointments/[id]/status/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * PATCH /api/appointments/[id]/status
 *
 * Actualiza únicamente el estado (y opcionalmente la fecha) de una cita.
 * El store de la aplicación hace esta petición desde `updateAppointmentStatus`.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: appointmentId } = await params;

  // 1. Parsear body de la petición
  let body: any = {};
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ message: 'Cuerpo JSON inválido' }, { status: 400 });
  }

  const {
    estado_cita,          // Nuevo estado obligatorio
    motivo_cambio,        // Motivo del cambio (opcional)
    actor_id,             // Usuario que realiza la acción (opcional)
    fecha_hora_cita       // Nueva fecha opcional
  } = body;

  if (!estado_cita) {
    return NextResponse.json({ message: 'El campo "estado_cita" es obligatorio' }, { status: 400 });
  }

  // 2. Obtener cita existente para registrar cambios y validar existencia
  const { data: existing, error: fetchError } = await supabase
    .from('appointments')
    .select('id, estado_cita, fecha_hora_cita')
    .eq('id', appointmentId)
    .single();

  if (fetchError) {
    return NextResponse.json({ message: 'Cita no encontrada', error: fetchError.message }, { status: 404 });
  }

  // 3. Construir payload de actualización
  const updatePayload: Record<string, any> = { estado_cita };
  if (fecha_hora_cita) updatePayload.fecha_hora_cita = fecha_hora_cita;

  // 4. Ejecutar actualización en la tabla appointments
  const { data: updatedAppointment, error: updateError } = await supabase
    .from('appointments')
    .update(updatePayload)
    .eq('id', appointmentId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ message: 'Error al actualizar cita', error: updateError.message }, { status: 500 });
  }

  // 5. Registrar historial del cambio (best effort)
  try {
    const historyEntry = {
      appointment_id: appointmentId,
      estado_cita_anterior: existing?.estado_cita,
      estado_cita_nuevo: updatePayload.estado_cita,
      fecha_cambio: new Date().toISOString(),
      fecha_cita_anterior: existing?.fecha_hora_cita,
      fecha_cita_nueva: fecha_hora_cita || existing?.fecha_hora_cita,
      modificado_por_id: actor_id || 'unknown',
      motivo_cambio: motivo_cambio ?? null,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    };

    await supabase.from('appointment_history').insert([historyEntry]);
  } catch (histErr) {
    console.warn('Error registrando historial de cita:', histErr);
    // No interrumpir respuesta al cliente
  }

  // 6. Responder con la cita actualizada
  return NextResponse.json(updatedAppointment);
}
