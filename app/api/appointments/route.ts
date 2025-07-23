// app/api/appointments/route.ts - REFACTORED TO USE ENRICHED_APPOINTMENTS RPC
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Configuración de cache optimizada
const cacheConfig = {
  'Cache-Control': 'max-age=60, s-maxage=300, stale-while-revalidate=600',
};

// Configuración de paginación
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  // Parámetros para la función RPC
  const dateFilter = searchParams.get('dateFilter');
  const patientId = searchParams.get('patientId');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  try {
    let query = supabase
      .from('appointments')
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
      `, { count: 'exact' });

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    // Implementar la lógica de dateFilter aquí si es necesario
    // Por ahora, traemos todos y que el frontend filtre.
    // Esto se puede optimizar después si es necesario.

    query = query.range((page - 1) * pageSize, page * pageSize - 1);
    query = query.order('fecha_hora_cita', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error en GET /api/appointments RPC:', error);
      throw error;
    }

    // La función RPC devuelve los datos listos para consumir
    return NextResponse.json(data || [], {
      headers: cacheConfig
    });

  } catch (error: any) {
    console.error('Error en GET /api/appointments:', error);
    return NextResponse.json({ 
      message: 'Error al obtener citas', 
      error: error.message 
    }, { status: 500 });
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