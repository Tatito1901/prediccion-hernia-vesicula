// app/api/appointments/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

type RouteParams = {
  params: {
    id: string;
  };
};

/**
 * Obtener una cita específica por su ID.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { id } = params;

  if (!id) {
    return NextResponse.json({ message: 'El ID de la cita es requerido.' }, { status: 400 });
  }

  try {
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients (id, nombre, apellidos, telefono),
        doctor:profiles!appointments_doctor_id_fkey(id, full_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ message: 'Cita no encontrada.' }, { status: 404 });
      }
      throw error;
    }

    if (!appointment) {
      return NextResponse.json({ message: 'Cita no encontrada.' }, { status: 404 });
    }

    return NextResponse.json(appointment);
  } catch (error: any) {
    console.error('Error en GET /api/appointments/[id]:', error);
    return NextResponse.json({ message: 'Error al obtener la cita.', error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const appointmentId = resolvedParams.id;
  try {
    // Ensure we have a valid request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('Error parsing JSON body:', jsonError);
      return NextResponse.json({ message: 'Error en formato JSON del cuerpo de la solicitud' }, { status: 400 });
    }
    
    // Ensure appointmentId exists in the database before trying to update
    const { data: existingAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, estado_cita, fecha_hora_cita')
      .eq('id', appointmentId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching appointment before update:', fetchError);
      return NextResponse.json({ message: 'Cita no encontrada', error: fetchError.message }, { status: 404 });
    }
    
    const { id, patient_id, created_at, ...rawUpdateData } = body; // No permitir actualizar estas
    
    // Create a clean object with only fields that exist in the database
    const updateData: Record<string, any> = {};
    
    // Copy estado_cita which appears to be a valid field based on the error logs
    if ('estado_cita' in rawUpdateData) {
      updateData.estado_cita = rawUpdateData.estado_cita;
    }
    
    // Add any other fields that exist in the appointments table
    // Example fields that might exist (adjust based on your actual schema)
    const potentialFields = [
      'fecha_cita', 'hora_cita', 'notas', 'doctor_id', 'tipo_cita', 'duracion'
    ];
    
    for (const field of potentialFields) {
      if (field in rawUpdateData) {
        updateData[field] = rawUpdateData[field];
      }
    }
    
    // Do NOT include updated_at as it doesn't exist in your schema
    
    console.log('Updating appointment with data:', { appointmentId, updateFields: Object.keys(updateData) });
    
    const { data: updatedAppointment, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }
    
    // Log history entry
    try {
      const historyEntry: any = {
        appointment_id: appointmentId,
        estado_cita_anterior: existingAppointment?.estado_cita,
        estado_cita_nuevo: updateData.estado_cita ?? existingAppointment?.estado_cita,
        fecha_cambio: new Date().toISOString(),
        fecha_cita_anterior: existingAppointment?.fecha_hora_cita,
        fecha_cita_nueva: rawUpdateData.fecha_hora_cita || existingAppointment?.fecha_hora_cita,
        modificado_por_id: body.actor_id || "5e4d29a2-5eec-49ee-ac0f-8d349d5660ed", // ID de usuario por defecto hasta implementar auth
        notas: rawUpdateData.notas ?? null,
        motivo_cambio: rawUpdateData.motivo_cambio ?? null,
        ip_address: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      };
      const { error: historyError } = await supabase
        .from('appointment_history')
        .insert([historyEntry]);
      if (historyError) console.error('Error logging appointment history:', historyError);
    } catch (hErr) {
      console.error('Unexpected error logging history:', hErr);
    }
    
    return NextResponse.json(updatedAppointment);
  } catch (error: any) {
    console.error('Error detallado en PUT /api/appointments/[id]:', error);
    return NextResponse.json({ 
      message: 'Error al actualizar cita', 
      error: error.message, 
      stack: error.stack,
      details: JSON.stringify(error)
    }, { status: 500 });
  }
}

/**
 * Eliminar una cita específica por su ID.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { id } = params;

  if (!id) {
    return NextResponse.json({ message: 'El ID de la cita es requerido.' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Cita eliminada exitosamente.' }, { status: 200 });
  } catch (error: any) {
    console.error('Error en DELETE /api/appointments/[id]:', error);
    return NextResponse.json({ message: 'Error al eliminar la cita.', error: error.message }, { status: 500 });
  }
}
