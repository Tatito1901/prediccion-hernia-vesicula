// app/api/patients/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const patientId = resolvedParams.id;

  try {
    const { data: patient, error } = await supabase
      .from('patients')
      .select(`
        *, 
        profiles!patients_doctor_asignado_id_fkey ( id, full_name ),
        creador:profiles!patients_creado_por_id_fkey (id, full_name)
      `) // Ajusta los joins según los nombres de tus FKs
      .eq('id', patientId)
      .single();

    if (error) throw error;
    if (!patient) return NextResponse.json({ message: 'Paciente no encontrado' }, { status: 404 });
    
    return NextResponse.json(patient);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error al obtener paciente', error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const patientId = resolvedParams.id;
  try {
    // Ensure we have a valid request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('Error parsing JSON body:', jsonError);
      return NextResponse.json({ message: 'Error en formato JSON del cuerpo de la solicitud' }, { status: 400 });
    }
    
    // Ensure patientId exists in the database before trying to update
    const { data: existingPatient, error: fetchError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching patient before update:', fetchError);
      return NextResponse.json({ message: 'Paciente no encontrado', error: fetchError.message }, { status: 404 });
    }
    
    // No permitir actualizar 'id' o 'created_at'
    const { id, created_at, ...rawUpdateData } = body;
    
    // Mapping of client-side field names to database column names
    const updateData: Record<string, any> = {};
    
    // Set the updated_at timestamp
    updateData.updated_at = new Date().toISOString();
    
    // Map client-side field names to database column names
    if ('estado' in rawUpdateData) {
      // Ensure estado_paciente is uppercase to match the enum values
      updateData.estado_paciente = String(rawUpdateData.estado).toUpperCase();
      console.log(`Converting estado value to uppercase: "${rawUpdateData.estado}" -> "${updateData.estado_paciente}"`);
    }
    
    if ('ultimoContacto' in rawUpdateData) {
      updateData.ultimo_contacto = rawUpdateData.ultimoContacto;
    }
    
    // Copy any other fields that match the database schema
    // Only include fields we know exist in the table
    const allowedFields = [
      'nombre', 'apellidos', 'edad', 'telefono', 'email', 'fecha_registro',
      'diagnostico_principal', 'diagnostico_principal_detalle', 'doctor_asignado_id',
      'fecha_primera_consulta', 'comentarios_registro', 'origen_paciente',
      'probabilidad_cirugia', 'proximo_contacto', 'etiquetas', 'fecha_cirugia_programada'
    ];
    
    for (const field of allowedFields) {
      if (field in rawUpdateData) {
        updateData[field] = rawUpdateData[field];
      }
    }
    
    console.log('Updating patient with data:', { patientId, updateFields: Object.keys(updateData) });
    
    const { data: updatedPatient, error } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', patientId)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }
    
    return NextResponse.json(updatedPatient);
  } catch (error: any) {
    console.error('Error detallado en PUT /api/patients/[id]:', error);
    return NextResponse.json({ 
      message: 'Error al actualizar paciente', 
      error: error.message, 
      stack: error.stack,
      details: JSON.stringify(error)
    }, { status: 500 });
  }
}