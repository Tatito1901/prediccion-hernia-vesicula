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
  
  // Parámetros de filtro optimizados
  const dateFilter = searchParams.get('dateFilter'); // 'today', 'future', 'past'
  const patientId = searchParams.get('patientId');
  const doctorId = searchParams.get('doctorId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const estado = searchParams.get('estado');
  const searchTerm = searchParams.get('search');
  
  // Parámetros de paginación
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  let pageSize = parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE));
  pageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);

  try {
    // Usar la nueva función RPC enriched_appointments
    const { data, error } = await supabase.rpc('get_enriched_appointments', {
      p_date_filter: dateFilter,
      p_status_filter: estado,
      p_patient_id: patientId,
      p_doctor_id: doctorId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_search_term: searchTerm,
      p_page_num: page,
      p_page_size: pageSize
    });

    if (error) {
      console.error('Error calling enriched_appointments RPC:', error);
      throw error;
    }

    // La función RPC ya retorna el formato correcto con data, pagination y summary
    return NextResponse.json(data, {
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