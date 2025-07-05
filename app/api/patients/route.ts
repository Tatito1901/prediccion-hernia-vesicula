// app/api/patients/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Cache agresivo para datos de pacientes - estas son vistas que cambian poco
const cacheConfig = {
  // 10 minutos de cache del navegador, 1 hora en CDN, 6 horas de stale-while-revalidate
  'Cache-Control': 'max-age=600, s-maxage=3600, stale-while-revalidate=21600',
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  
  const estado = searchParams.get('estado');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  let pageSize = parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE));
  pageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    // OPTIMIZACIÓN CRÍTICA 1: Query minimalista - solo campos necesarios para la vista
    let query = supabase.from('patients').select(`
      id,
      nombre,
      apellidos,
      edad,
      telefono,
      email,
      fecha_registro,
      estado_paciente,
      diagnostico_principal,
      comentarios_registro
    `, { count: 'exact' });

    // OPTIMIZACIÓN CRÍTICA 2: Usar el índice correctamente
    if (estado && estado !== 'all') {
      query = query.eq('estado_paciente', estado);
    }

    // Filtrado por rango de fechas
    if (startDate) {
      query = query.gte('fecha_registro', startDate);
    }
    if (endDate) {
      query = query.lte('fecha_registro', endDate);
    }
    
    // OPTIMIZACIÓN CRÍTICA 3: Order by con índice optimizado
    query = query.order('fecha_registro', { ascending: false });
    query = query.range(from, to);

    const { data: patients, error, count } = await query;

    if (error) {
      console.error('Supabase error fetching patients:', error);
      throw error;
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      data: patients,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasMore: page < totalPages
      }
    }, { headers: cacheConfig });
  } catch (error: any) {
    console.error('Error in patients API route:', error);
    return NextResponse.json({ 
      message: 'Error al obtener pacientes', 
      error: error.message 
    }, { status: 500 });
  }
}

// NUEVA RUTA OPTIMIZADA: Para obtener detalles completos de un paciente específico
export async function GET_PATIENT_DETAILS(patientId: string) {
  const supabase = await createClient();
  
  try {
    // Solo cargar detalles completos cuando se necesiten
    const query = supabase.from('patients').select(`
      id,
      nombre,
      apellidos,
      edad,
      telefono,
      email,
      fecha_registro,
      estado_paciente,
      diagnostico_principal,
      diagnostico_principal_detalle,
      comentarios_registro,
      doctor_asignado_id,
      fecha_primera_consulta,
      origen_paciente,
      probabilidad_cirugia,
      ultimo_contacto,
      proximo_contacto,
      etiquetas,
      fecha_cirugia_programada,
      creado_por_id,
      created_at,
      updated_at,
      doctor:profiles!patients_doctor_asignado_id_fkey(id, full_name),
      creator:profiles!patients_creado_por_id_fkey(id, full_name)
    `).eq('id', patientId).single();

    const { data: patient, error } = await query;

    if (error) throw error;

    return NextResponse.json(patient, { 
      headers: {
        'Cache-Control': 'max-age=300, s-maxage=900, stale-while-revalidate=3600',
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      message: 'Error al obtener paciente', 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    
    const {
      nombre,
      apellidos,
      edad,
      telefono,
      email,
      estado_paciente,
      diagnostico_principal,
      comentarios_registro,
      creado_por_id,
      doctor_asignado_id,
      origen_paciente,
      notas_paciente,
    } = body;

    // OPTIMIZACIÓN: Insert minimalista sin JOIN innecesario
    const { data: newPatient, error } = await supabase
      .from('patients')
      .insert([{
        nombre,
        apellidos,
        edad: edad ? parseInt(edad, 10) : null,
        telefono,
        email,
        estado_paciente,
        diagnostico_principal,
        comentarios_registro: notas_paciente || comentarios_registro,
        creado_por_id,
        doctor_asignado_id,
        origen_paciente
      }])
      .select(`
        id,
        nombre,
        apellidos,
        edad,
        telefono,
        email,
        fecha_registro,
        estado_paciente,
        diagnostico_principal,
        comentarios_registro
      `)
      .single();

    if (error) {
      console.error('Supabase error creating patient:', error);
      throw error;
    }
    return NextResponse.json(newPatient, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error al crear paciente', error: error.message }, { status: 500 });
  }
}