import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Aquí puedes añadir validación con Zod si lo deseas

    const { data, error } = await supabase.rpc('create_patient_and_appointment', {
      nombre: body.nombre,
      apellidos: body.apellidos,
      telefono: body.telefono,
      edad: body.edad,
      diagnostico_principal: body.diagnostico_principal,
      comentarios_registro: body.comentarios_registro,
      fecha_hora_cita: body.fecha_hora_cita,
      motivo_cita: body.motivo_cita,
      doctor_id: body.doctor_id
    });

    if (error) {
      console.error('Error en RPC de Supabase:', error);
      throw new Error('No se pudo completar el registro.');
    }

    return NextResponse.json({ message: 'Paciente y cita creados con éxito', data }, { status: 201 });

  } catch (error: any) {
    console.error('Error en el endpoint de admisión:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
