import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const cacheConfig = {
  // 10 minutos de cache del navegador, 1 hora en CDN, 6 horas de stale-while-revalidate
  'Cache-Control': 'max-age=600, s-maxage=3600, stale-while-revalidate=21600',
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// --- GET: OBTENER LISTA PAGINADA DE PACIENTES (OPTIMIZADO CON RPC) ---
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // 1. Recolectar y sanitizar parámetros de la URL
    const estado = searchParams.get('estado');
    // const searchTerm = searchParams.get('search'); // TODO: Implementar búsqueda cuando la función RPC lo soporte
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    let pageSize = parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE));
    pageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);

    // 2. Llamar a la función de la base de datos (RPC) con los parámetros
    const { data, error } = await supabase.rpc('get_paginated_patients', {
      p_estado: estado,
      // p_search_term: searchTerm, // TODO: Añadir cuando la función RPC lo soporte
      p_start_date: startDate,
      p_end_date: endDate,
      p_page_num: page,
      p_page_size: pageSize,
    });
    
    if (error) {
      console.error('Supabase RPC error fetching patients:', error);
      throw error;
    }

    // 3. Construir la respuesta de paginación con los datos del RPC
    const totalCount = data.totalCount || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      data: data.data, // Los pacientes están en la propiedad 'data' del JSON devuelto
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    }, { headers: cacheConfig });

  } catch (error: any) {
    console.error('Error in patients API route (GET):', error);
    return NextResponse.json({ 
      message: 'Error al obtener pacientes', 
      error: error.message 
    }, { status: 500 });
  }
}

// --- POST: CREAR UN NUEVO PACIENTE (YA ESTABA BIEN OPTIMIZADO) ---
export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    
    // Desestructurar los datos del cuerpo de la petición
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
      notas_paciente, // Usado como alias para comentarios_registro
    } = body;

    // Insertar el nuevo registro y seleccionar los datos para devolverlos
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
    console.error('Error in patients API route (POST):', error);
    return NextResponse.json({ 
      message: 'Error al crear paciente', 
      error: error.message 
    }, { status: 500 });
  }
}