// app/api/patients/route.ts - REFACTORIZACIÓN RADICAL: VALIDACIÓN ROBUSTA CON ZOD
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// ==================== ESQUEMAS DE VALIDACIÓN ROBUSTA ====================

const PatientQuerySchema = z.object({
  // Filtros específicos
  estado: z.enum(['activo', 'inactivo', 'operado', 'seguimiento', 'all']).default('all'),
  
  // Búsqueda
  search: z.string().min(1).max(100).optional(),
  
  // Filtros de fecha
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  
  // Paginación
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  
  // Ordenamiento
  sortBy: z.enum(['created_at', 'nombre', 'apellidos', 'fecha_nacimiento', 'estado_paciente']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  // Incluir estadísticas
  includeStats: z.coerce.boolean().default(false),
}).strict();

const PatientCreateSchema = z.object({
  nombre: z.string().min(1).max(100),
  apellidos: z.string().min(1).max(100),
  fecha_nacimiento: z.string().date(),
  telefono: z.string().min(10).max(20).regex(/^[\d\s\-\+\(\)]+$/, 'Formato de teléfono inválido'),
  email: z.string().email().optional(),
  direccion: z.string().max(500).optional(),
  estado_paciente: z.enum(['activo', 'inactivo', 'operado', 'seguimiento']).default('activo'),
  diagnostico_principal: z.string().max(500).optional(),
  notas_medicas: z.string().max(2000).optional(),
  contacto_emergencia_nombre: z.string().max(100).optional(),
  contacto_emergencia_telefono: z.string().max(20).optional(),
}).strict();

const PatientUpdateSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  apellidos: z.string().min(1).max(100).optional(),
  fecha_nacimiento: z.string().date().optional(),
  telefono: z.string().min(10).max(20).regex(/^[\d\s\-\+\(\)]+$/, 'Formato de teléfono inválido').optional(),
  email: z.string().email().optional(),
  direccion: z.string().max(500).optional(),
  estado_paciente: z.enum(['activo', 'inactivo', 'operado', 'seguimiento']).optional(),
  diagnostico_principal: z.string().max(500).optional(),
  notas_medicas: z.string().max(2000).optional(),
  contacto_emergencia_nombre: z.string().max(100).optional(),
  contacto_emergencia_telefono: z.string().max(20).optional(),
}).strict();

// ==================== FUNCIONES DE VALIDACIÓN ====================

function validateQueryParams(searchParams: URLSearchParams) {
  const rawParams = Object.fromEntries(searchParams.entries());
  
  try {
    return PatientQuerySchema.parse(rawParams);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Parámetros inválidos: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}

function validateCreateData(data: unknown) {
  try {
    return PatientCreateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Datos de creación inválidos: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}

function validateUpdateData(data: unknown) {
  try {
    return PatientUpdateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Datos de actualización inválidos: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}

// ==================== FUNCIONES DE CONSTRUCCIÓN DE QUERIES ====================

function buildPatientsQuery(supabase: any, params: z.infer<typeof PatientQuerySchema>) {
  let query = supabase
    .from('patients')
    .select(`
      id,
      created_at,
      nombre,
      apellidos,
      fecha_nacimiento,
      telefono,
      email,
      direccion,
      estado_paciente,
      diagnostico_principal,
      notas_medicas,
      contacto_emergencia_nombre,
      contacto_emergencia_telefono,
      surveys!left(
        id,
        completed_at,
        survey_template_id
      ),
      appointments!left(
        id,
        fecha_hora_cita,
        estado_cita
      )
    `, { count: 'exact' });

  // Aplicar filtros de estado
  if (params.estado !== 'all') {
    query = query.eq('estado_paciente', params.estado);
  }

  // Aplicar búsqueda
  if (params.search) {
    query = query.or(`
      nombre.ilike.%${params.search}%,
      apellidos.ilike.%${params.search}%,
      telefono.ilike.%${params.search}%,
      email.ilike.%${params.search}%,
      diagnostico_principal.ilike.%${params.search}%
    `);
  }

  // Aplicar filtros de fecha
  if (params.startDate) {
    query = query.gte('created_at', params.startDate);
  }
  if (params.endDate) {
    query = query.lte('created_at', params.endDate);
  }

  // Aplicar ordenamiento
  query = query.order(params.sortBy, { ascending: params.sortOrder === 'asc' });

  // Aplicar paginación
  const offset = (params.page - 1) * params.pageSize;
  query = query.range(offset, offset + params.pageSize - 1);

  return query;
}

async function calculatePatientStats(supabase: any) {
  // Obtener estadísticas básicas
  const { data: allPatients } = await supabase
    .from('patients')
    .select('estado_paciente, surveys!left(completed_at), appointments!left(estado_cita)');

  if (!allPatients) {
    return null;
  }

  const totalPatients = allPatients.length;
  const completedSurveys = allPatients.filter((p: any) => 
    p.surveys && p.surveys.some((s: any) => s.completed_at)
  ).length;
  const surveyRate = totalPatients > 0 ? (completedSurveys / totalPatients) * 100 : 0;
  
  const pendingConsults = allPatients.filter(p => 
    p.appointments && p.appointments.some((a: any) => a.estado_cita === 'programada')
  ).length;
  
  const operatedPatients = allPatients.filter((p: any) => 
    p.estado_paciente === 'operado'
  ).length;
  
  const followUpPatients = allPatients.filter((p: any) => 
    p.estado_paciente === 'seguimiento'
  ).length;

  const patientsWithNextAppointment = allPatients.filter((patient: any) => 
    patient.appointments && patient.appointments.some((apt: any) => 
      new Date(apt.fecha_hora_cita) > new Date()
    )
  ).length;
  
  // Calcular estadísticas por estado
  const statusStats = allPatients.reduce((acc: Record<string, number>, patient: any) => {
  const statusStats = allPatients.reduce((acc: Record<string, number>, patient) => {
    const status = patient.estado_paciente || 'sin_estado';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return {
    totalPatients,
    surveyRate: Math.round(surveyRate * 100) / 100,
    pendingConsults,
    operatedPatients,
    statusStats,
  };
}

// ==================== HANDLERS DE LA API ====================

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // 🔒 VALIDACIÓN ROBUSTA DE PARÁMETROS
    const params = validateQueryParams(searchParams);
    
    // 🎯 CONSTRUCCIÓN DE QUERY ESPECÍFICA
    const query = buildPatientsQuery(supabase, params);
    
    // 📊 EJECUCIÓN DE QUERY
    const { data: patients, error, count } = await query;
    
    if (error) {
      console.error('Error fetching patients:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor al obtener pacientes' },
        { status: 500 }
      );
    }

    // 📈 CÁLCULO DE ESTADÍSTICAS (solo si se solicita)
    let stats = null;
    if (params.includeStats) {
      stats = await calculatePatientStats(supabase);
    }

    // 📦 RESPUESTA ESTRUCTURADA
    const totalPages = Math.ceil((count || 0) / params.pageSize);
    
    return NextResponse.json({
      data: patients || [],
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        total: count || 0,
        totalPages,
        hasMore: params.page < totalPages,
      },
      stats,
    }, {
      headers: {
        'Cache-Control': 'max-age=300, s-maxage=600, stale-while-revalidate=1800',
      },
    });
    
  } catch (error) {
    console.error('Patients API Error:', error);
    
    if (error instanceof Error && error.message.includes('Parámetros inválidos')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    // 🔒 VALIDACIÓN ROBUSTA DE DATOS
    const validatedData = validateCreateData(body);
    
    // 🎯 VERIFICAR DUPLICADOS
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id')
      .eq('telefono', validatedData.telefono)
      .single();
    
    if (existingPatient) {
      return NextResponse.json(
        { error: 'Ya existe un paciente con este número de teléfono' },
        { status: 409 }
      );
    }
    
    // 🎯 CREACIÓN DE PACIENTE
    const { data: patient, error } = await supabase
      .from('patients')
      .insert([validatedData])
      .select(`
        id,
        created_at,
        nombre,
        apellidos,
        fecha_nacimiento,
        telefono,
        email,
        direccion,
        estado_paciente,
        diagnostico_principal,
        notas_medicas,
        contacto_emergencia_nombre,
        contacto_emergencia_telefono
      `)
      .single();
    
    if (error) {
      console.error('Error creating patient:', error);
      return NextResponse.json(
        { error: 'Error al crear el paciente' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data: patient,
      message: 'Paciente creado exitosamente',
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create Patient API Error:', error);
    
    if (error instanceof Error && error.message.includes('Datos de creación inválidos')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('id');
    
    if (!patientId) {
      return NextResponse.json(
        { error: 'ID de paciente requerido' },
        { status: 400 }
      );
    }
    
    // Validar UUID
    if (!z.string().uuid().safeParse(patientId).success) {
      return NextResponse.json(
        { error: 'ID de paciente inválido' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // 🔒 VALIDACIÓN ROBUSTA DE DATOS
    const validatedData = validateUpdateData(body);
    
    // 🎯 VERIFICAR DUPLICADOS (si se actualiza el teléfono)
    if (validatedData.telefono) {
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('telefono', validatedData.telefono)
        .neq('id', patientId)
        .single();
      
      if (existingPatient) {
        return NextResponse.json(
          { error: 'Ya existe otro paciente con este número de teléfono' },
          { status: 409 }
        );
      }
    }
    
    // 🎯 ACTUALIZACIÓN DE PACIENTE
    const { data: patient, error } = await supabase
      .from('patients')
      .update(validatedData)
      .eq('id', patientId)
      .select(`
        id,
        created_at,
        nombre,
        apellidos,
        fecha_nacimiento,
        telefono,
        email,
        direccion,
        estado_paciente,
        diagnostico_principal,
        notas_medicas,
        contacto_emergencia_nombre,
        contacto_emergencia_telefono
      `)
      .single();
    
    if (error) {
      console.error('Error updating patient:', error);
      return NextResponse.json(
        { error: 'Error al actualizar el paciente' },
        { status: 500 }
      );
    }
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      data: patient,
      message: 'Paciente actualizado exitosamente',
    });
    
  } catch (error) {
    console.error('Update Patient API Error:', error);
    
    if (error instanceof Error && error.message.includes('Datos de actualización inválidos')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
