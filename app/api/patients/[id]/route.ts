// app/api/patients/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const estado = searchParams.get('estado');

  try {
    // ← CORREGIDO: Asegurar que se seleccionen TODOS los campos necesarios
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
      fecha_nacimiento,
      correo_electronico,
      direccion,
      historial_medico_relevante,
      notas_paciente,
      created_at,
      updated_at,
      doctor:profiles!patients_doctor_asignado_id_fkey(id, full_name),
      creator:profiles!patients_creado_por_id_fkey(id, full_name)
    `);

    if (estado && estado !== 'todos') {
      query = query.eq('estado_paciente', estado);
    }
    
    // Ordenar por fecha de registro más reciente primero
    query = query.order('fecha_registro', { ascending: false });

    const { data: patients, error } = await query;

    if (error) {
      console.error('Supabase error fetching patients:', error);
      throw error;
    }

    // DEBUG: Log para verificar datos de Supabase
    console.log('PATIENTS API DEBUG - Sample patient from DB:', patients?.[0] ? {
      id: patients[0].id,
      nombre: patients[0].nombre,
      apellidos: patients[0].apellidos,
      edad: patients[0].edad,
      fecha_registro: patients[0].fecha_registro,
      diagnostico_principal: patients[0].diagnostico_principal,
      estado_paciente: patients[0].estado_paciente
    } : 'No patients found');
    
    return NextResponse.json(patients);
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
    
    // ← CORREGIDO: Mapeo mejorado de campos del frontend a la base de datos
    const {
      nombre,
      apellidos,
      edad,
      telefono,
      email,
      estado_paciente = 'PENDIENTE_DE_CONSULTA', // Default si no se proporciona
      diagnostico_principal, // Este viene del form como 'motivoConsulta'
      comentarios_registro, // Este viene del form como 'notas'
      notas_paciente, // Alternate field for notes
      creado_por_id,
      doctor_asignado_id,
      origen_paciente,
      probabilidad_cirugia,
      fecha_nacimiento,
      direccion,
      historial_medico_relevante,
      // ...otros campos opcionales
    } = body;
    
    console.log('CREATING PATIENT with data:', {
      nombre,
      apellidos,
      edad,
      diagnostico_principal,
      estado_paciente
    });

    // Preparar datos para insertar
    const insertData: any = {
      nombre,
      apellidos,
      telefono,
      email,
      estado_paciente: estado_paciente.toUpperCase(), // Asegurar mayúsculas para el enum
      diagnostico_principal,
      creado_por_id,
    };

    // Solo agregar campos opcionales si tienen valor
    if (edad) insertData.edad = parseInt(edad, 10);
    if (comentarios_registro || notas_paciente) {
      insertData.comentarios_registro = comentarios_registro || notas_paciente;
    }
    if (doctor_asignado_id) insertData.doctor_asignado_id = doctor_asignado_id;
    if (origen_paciente) insertData.origen_paciente = origen_paciente;
    if (probabilidad_cirugia) insertData.probabilidad_cirugia = probabilidad_cirugia;
    if (fecha_nacimiento) insertData.fecha_nacimiento = fecha_nacimiento;
    if (direccion) insertData.direccion = direccion;
    if (historial_medico_relevante) insertData.historial_medico_relevante = historial_medico_relevante;

    const { data: newPatient, error } = await supabase
      .from('patients')
      .insert([insertData])
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
        diagnostico_principal_detalle,
        comentarios_registro,
        creado_por_id,
        doctor_asignado_id,
        origen_paciente,
        probabilidad_cirugia,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      console.error('Supabase error creating patient:', error);
      throw error;
    }

    console.log('PATIENT CREATED successfully:', {
      id: newPatient.id,
      nombre: newPatient.nombre,
      diagnostico: newPatient.diagnostico_principal,
      fecha_registro: newPatient.fecha_registro
    });
    
    return NextResponse.json(newPatient, { status: 201 });
  } catch (error: any) {
    console.error('Error in create patient API:', error);
    return NextResponse.json({ 
      message: 'Error al crear paciente', 
      error: error.message,
      details: error
    }, { status: 500 });
  }
}