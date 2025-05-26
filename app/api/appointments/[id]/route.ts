// app/api/appointments/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const appointmentId = params.id;
  try {
    const body = await request.json();
    const { id, patient_id, created_at, ...updateData } = body; // No permitir actualizar estas
    updateData.updated_at = new Date().toISOString();

    const { data: updatedAppointment, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(updatedAppointment);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error al actualizar cita', error: error.message }, { status: 500 });
  }
}

// Puedes añadir un DELETE handler si es necesario
// export async function DELETE(...) { ... }