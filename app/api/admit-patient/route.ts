import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validar que los datos necesarios están presentes
    if (!body.nombre || !body.apellidos || !body.fecha_hora_cita) {
      return NextResponse.json({ message: 'Faltan datos requeridos para la admisión.' }, { status: 400 });
    }

    // Llamar a la función RPC 'create_patient_and_appointment' que creamos en la base de datos
    const { data, error } = await supabase.rpc('create_patient_and_appointment', {
      p_nombre: body.nombre,
      p_apellidos: body.apellidos,
      p_telefono: body.telefono,
      p_edad: body.edad,
      p_motivo_cita: body.motivo_cita,
      p_fecha_hora_cita: body.fecha_hora_cita,
      p_diagnostico_principal: body.diagnostico_principal,
      p_comentarios_registro: body.comentarios_registro
    });

    if (error) {
        // Si hay un error en la RPC, lo lanzamos para que sea capturado por el bloque catch
        throw error;
    }

    return NextResponse.json({ 
        message: 'Paciente y cita creados exitosamente.', 
        patientId: data[0].created_patient_id 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error en el endpoint de admisión:', error);
    return NextResponse.json({ message: 'Error en el proceso de admisión.', error: error.message }, { status: 500 });
  }
}
