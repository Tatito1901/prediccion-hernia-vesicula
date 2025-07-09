// app/api/appointments/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Helper para validar fechas ISO
function isValidISODate(dateString: string): boolean {
  if (!dateString) return false;
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

// Configuración de cache para las rutas GET de la API
const cacheConfig = {
  // Tiempo de validez de la caché del navegador (60 segundos)
  'Cache-Control': 'max-age=60, s-maxage=60, stale-while-revalidate=300',
};

// Tamaño de página predeterminado - no demasiado grande para evitar problemas de rendimiento
const DEFAULT_PAGE_SIZE = 10;
// Valor máximo permitido para page_size para evitar consultas muy pesadas
const MAX_PAGE_SIZE = 50;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  
  // Parámetros de filtro
  const patientId = searchParams.get('patientId');
  const doctorId = searchParams.get('doctorId');
  const startDate = searchParams.get('startDate'); // YYYY-MM-DD
  const endDate = searchParams.get('endDate');     // YYYY-MM-DD
  const estado = searchParams.get('estado');
  
  // Parámetros de paginación
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  let pageSize = parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE));
  // Limitar el tamaño de página para evitar consultas demasiado pesadas
  pageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
  
  // Calcular el rango para la paginación
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    // Validar que el rango de fechas no sea extremadamente amplio para prevenir sobrecarga
    if (startDate && endDate && isValidISODate(startDate) && isValidISODate(endDate)) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
      
      // Si el rango es más de 12 meses, limitar a últimos 12 meses para evitar consultas excesivas
      if (diffMonths > 12) {
        console.warn('Rango de fechas demasiado amplio (>12 meses). Limitando a últimos 12 meses.');
        const limitedStart = new Date(end);
        limitedStart.setMonth(end.getMonth() - 12);
        const limitedStartStr = limitedStart.toISOString().split('T')[0];
        searchParams.set('startDate', limitedStartStr);
      }
    }
    
    // Iniciar la consulta con count para obtener el total de registros
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
    `, { count: 'exact' });

    // Aplicar filtros
    if (patientId) query = query.eq('patient_id', patientId);
    if (doctorId) query = query.eq('doctor_id', doctorId);
    // Mejorar validación de fechas para evitar errores 500
    if (startDate && isValidISODate(startDate)) {
      try {
        query = query.gte('fecha_hora_cita', `${startDate}T00:00:00Z`);
      } catch (e) {
        console.warn(`Error al establecer fecha inicial: ${e}. Usando valor sin filtro.`);
      }
    }
    
    if (endDate && isValidISODate(endDate)) {
      try {
        query = query.lte('fecha_hora_cita', `${endDate}T23:59:59Z`);
      } catch (e) {
        console.warn(`Error al establecer fecha final: ${e}. Usando valor sin filtro.`);
      }
    }
    if (estado && estado !== 'todos') query = query.eq('estado_cita', estado);
    
    // Ordenar por fecha de consulta
    query = query.order('fecha_hora_cita', { ascending: true });
    
    // Aplicar paginación
    query = query.range(from, to);

    const { data: appointments, error, count } = await query;

    if (error) throw error;
    
    // Construir respuesta con metadatos de paginación
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    
    return NextResponse.json({
      data: appointments,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasMore: page < totalPages
      }
    }, { headers: cacheConfig });
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