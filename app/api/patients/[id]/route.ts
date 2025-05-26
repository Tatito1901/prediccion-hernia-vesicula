// app/api/patients/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const patientId = params.id;

  try {
    const { data: patient, error } = await supabase
      .from('patients')
      .select(`
        *, 
        profiles!patients_doctor_asignado_id_fkey ( id, full_name ),
        creador:profiles!patients_creado_por_id_fkey (id, full_name)
      `) // Ajusta los joins según los nombres de tus FKs
      .eq('id', patientId)
      .single();

    if (error) throw error;
    if (!patient) return NextResponse.json({ message: 'Paciente no encontrado' }, { status: 404 });
    
    return NextResponse.json(patient);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error al obtener paciente', error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const patientId = params.id;
  try {
    const body = await request.json();
    // Validar body
    // No permitir actualizar 'id' o 'created_at'
    const { id, created_at, ...updateData } = body;
    updateData.updated_at = new Date().toISOString(); // Actualizar timestamp

    const { data: updatedPatient, error } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', patientId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(updatedPatient);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error al actualizar paciente', error: error.message }, { status: 500 });
  }
}