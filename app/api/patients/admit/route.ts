import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();

    const {
      nombre,
      apellidos,
      telefono,
      edad,
      diagnostico_principal,
      comentarios_registro,
      fecha_hora_cita,
      motivo_cita,
    } = body;

    // Validar datos requeridos
    if (!nombre || !apellidos || !telefono || !fecha_hora_cita || !motivo_cita) {
      return NextResponse.json(
        { message: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // 1. Crear el paciente primero
    const { data: patientData, error: patientError } = await supabase
      .from('patients')
      .insert({
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        telefono: telefono.trim(),
        edad: edad || null,
        diagnostico_principal: diagnostico_principal?.trim() || null,
        comentarios_registro: comentarios_registro?.trim() || null,
        estado: 'activo',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (patientError) {
      console.error('Error creating patient:', patientError);
      return NextResponse.json(
        { message: 'Error al crear el paciente', error: patientError.message },
        { status: 500 }
      );
    }

    // 2. Crear la cita para el paciente
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        patient_id: patientData.id,
        fecha_hora_cita: fecha_hora_cita,
        motivo_cita: motivo_cita.trim(),
        estado_cita: 'programada',
        es_primera_vez: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError);
      
      // Si falla la cita, eliminar el paciente creado para mantener consistencia
      await supabase
        .from('patients')
        .delete()
        .eq('id', patientData.id);

      return NextResponse.json(
        { message: 'Error al crear la cita', error: appointmentError.message },
        { status: 500 }
      );
    }

    // 3. Retornar los datos combinados
    return NextResponse.json({
      patient: patientData,
      appointment: appointmentData,
      message: 'Paciente admitido exitosamente',
    });

  } catch (error: any) {
    console.error('Error in patients admit API route:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor', error: error.message },
      { status: 500 }
    );
  }
}
