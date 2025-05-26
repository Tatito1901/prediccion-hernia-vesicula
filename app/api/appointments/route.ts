// app/api/appointments/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');
  const doctorId = searchParams.get('doctorId');
  const startDate = searchParams.get('startDate'); // YYYY-MM-DD
  const endDate = searchParams.get('endDate');   // YYYY-MM-DD
  const estado = searchParams.get('estado');

  try {
    let query = supabase.from('appointments').select(`
      id,
      patient_id,
      doctor_id,
      fecha_hora_cita,
      motivo_cita,
      estado_cita,
      es_primera_vez,
      notas_cita_seguimiento,
      patients (id, nombre, apellidos, telefono),
      doctor:profiles!appointments_doctor_id_fkey(id, full_name)
    `);

    if (patientId) query = query.eq('patient_id', patientId);
    if (doctorId) query = query.eq('doctor_id', doctorId);
    if (startDate) query = query.gte('fecha_hora_cita', `${startDate}T00:00:00Z`);
    if (endDate) query = query.lte('fecha_hora_cita', `${endDate}T23:59:59Z`);
    if (estado && estado !== 'todos') query = query.eq('estado_cita', estado);
    
    query = query.order('fecha_hora_cita', { ascending: true });

    const { data: appointments, error } = await query;

    if (error) throw error;
    return NextResponse.json(appointments);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error al obtener citas', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    // Validar body
    const {
      patient_id, // Este ID debe existir en la tabla patients
      doctor_id,
      fecha_hora_cita, // Asegúrate que llegue como un string ISO 8601 o un objeto Date
      motivo_cita,
      estado_cita,
      es_primera_vez,
      notas_cita_seguimiento,
    } = body;

    // Aquí deberías verificar que patient_id existe en la tabla 'patients'
    // antes de insertar la cita, o manejar el caso de crear paciente si no existe.
    // Por simplicidad, asumimos que patient_id ya es válido.

    const { data: newAppointment, error } = await supabase
      .from('appointments')
      .insert([{
        patient_id,
        doctor_id,
        fecha_hora_cita,
        motivo_cita,
        estado_cita: estado_cita || 'PROGRAMADA',
        es_primera_vez: es_primera_vez !== undefined ? es_primera_vez : true,
        notas_cita_seguimiento,
      }])
      .select()
      .single();

    if (error) throw error;

    // Si es la primera cita, actualiza patients.fecha_primera_consulta
    if (es_primera_vez || es_primera_vez === undefined) { // Si es_primera_vez es true o no se proporcionó (default true)
        const { error: patientUpdateError } = await supabase
            .from('patients')
            .update({ fecha_primera_consulta: new Date(fecha_hora_cita).toISOString().split('T')[0] })
            .eq('id', patient_id)
            .is('fecha_primera_consulta', null); // Solo actualizar si aún no tiene una
        
        if (patientUpdateError) {
            console.warn("Error actualizando fecha_primera_consulta del paciente:", patientUpdateError);
            // No es un error crítico para la creación de la cita, pero sí para registrar
        }
    }

    return NextResponse.json(newAppointment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error al crear cita', error: error.message }, { status: 500 });
  }
}