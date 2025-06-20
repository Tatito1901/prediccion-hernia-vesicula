// app/api/patients/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; // O tu ruta al cliente Supabase del lado del servidor

// Configuración de cache para las rutas GET de la API
const cacheConfig = {
  // Tiempo de validez de la caché del navegador (60 segundos)
  'Cache-Control': 'max-age=60, s-maxage=60, stale-while-revalidate=300',
};

// Tamaño de página predeterminado y máximo para la paginación de pacientes
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  
  // Filtros
  const estado = searchParams.get('estado');

  // Paginación
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  let pageSize = parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE));
  pageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
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
      diagnostico_principal_detalle,
      doctor_asignado_id,
      fecha_primera_consulta,
      comentarios_registro,
      origen_paciente,
      probabilidad_cirugia,
      ultimo_contacto,
      proximo_contacto,
      etiquetas,
      fecha_cirugia_programada,
      creado_por_id,
      doctor:profiles!patients_doctor_asignado_id_fkey(id, full_name),
      creator:profiles!patients_creado_por_id_fkey(id, full_name)
    `, { count: 'exact' });

    if (estado && estado !== 'todos') {
      query = query.eq('estado_paciente', estado);
    }
    
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

export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    
    // Validar body aquí con Zod o similar si es necesario
    // Ejemplo de campos esperados del frontend (ajusta según tu NewPatientForm)
    const {
      nombre,
      apellidos,
      edad,
      telefono,
      email,
      // fecha_registro se tomará por defecto en la BD
      estado_paciente, // e.g., "PENDIENTE DE CONSULTA"
      diagnostico_principal, // Este sería el 'motivoConsulta' del form
      comentarios_registro, // Este serían las 'notas' del form
      creado_por_id, // ID del usuario autenticado que lo registra
      doctor_asignado_id,
      origen_paciente,
      notas_paciente,
      // ...otros campos necesarios
    } = body;
    
    // Ya no necesitamos transformar el diagnóstico, ya que los valores en DiagnosisEnum
    // ahora coinciden con los valores esperados por la base de datos
    console.log('Diagnostic:', diagnostico_principal);

    const { data: newPatient, error } = await supabase
      .from('patients')
      .insert([{
        nombre,
        apellidos,
        edad: edad ? parseInt(edad, 10) : null,
        telefono,
        email,
        estado_paciente,
        diagnostico_principal, // Ya no necesitamos transformar el valor
        comentarios_registro: notas_paciente || comentarios_registro, // Usar comentarios_registro para almacenar las notas
        creado_por_id, // Asegúrate de obtener esto del usuario autenticado
        doctor_asignado_id,
        origen_paciente
      }])
      .select()
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