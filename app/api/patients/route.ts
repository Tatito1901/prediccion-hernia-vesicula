// app/api/patients/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; // O tu ruta al cliente Supabase del lado del servidor

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const estado = searchParams.get('estado');
  // Podrías añadir más filtros como query params: nombre, fecha_registro_start, fecha_registro_end, etc.

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
    `); // Incluye explícitamente ambas relaciones con nombres personalizados

    if (estado && estado !== 'todos') {
      query = query.eq('estado_paciente', estado);
    }
    
    // Ejemplo de ordenamiento
    query = query.order('fecha_registro', { ascending: false });

    const { data: patients, error } = await query;

    if (error) {
      console.error('Supabase error fetching patients:', error);
      throw error;
    }
    return NextResponse.json(patients);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error al obtener pacientes', error: error.message }, { status: 500 });
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
      origen_paciente
      // ...otros campos necesarios
    } = body;

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
        comentarios_registro,
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