// app/api/appointments/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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
      .select('id')
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

// Puedes añadir un DELETE handler si es necesario
// export async function DELETE(...) { ... }