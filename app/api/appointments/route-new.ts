// app/api/appointments/route.ts - REFACTORIZACIÓN RADICAL: VALIDACIÓN ROBUSTA CON ZOD
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// ==================== ESQUEMAS DE VALIDACIÓN ROBUSTA ====================

const AppointmentQuerySchema = z.object({
  // Filtros de fecha
  dateFilter: z.enum(['today', 'future', 'past', 'all']).optional(),
  
  // Filtros específicos
  patientId: z.string().uuid().optional(),
  status: z.enum(['programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio']).optional(),
  
  // Búsqueda
  search: z.string().min(1).max(100).optional(),
  
  // Paginación
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  
  // Ordenamiento
  sortBy: z.enum(['fecha_hora_cita', 'created_at', 'estado_cita']).default('fecha_hora_cita'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
}).strict();

const AppointmentCreateSchema = z.object({
  patient_id: z.string().uuid(),
  fecha_hora_cita: z.string().datetime(),
  motivo_cita: z.string().min(1).max(500),
  doctor_id: z.string().uuid().optional(),
  notas_cita_seguimiento: z.string().max(1000).optional(),
  es_primera_vez: z.boolean().default(false),
}).strict();

const AppointmentUpdateSchema = z.object({
  fecha_hora_cita: z.string().datetime().optional(),
  motivo_cita: z.string().min(1).max(500).optional(),
  estado_cita: z.enum(['programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio']).optional(),
  doctor_id: z.string().uuid().optional(),
  notas_cita_seguimiento: z.string().max(1000).optional(),
}).strict();

// ==================== FUNCIONES DE VALIDACIÓN ====================

function validateQueryParams(searchParams: URLSearchParams) {
  const rawParams = Object.fromEntries(searchParams.entries());
  
  try {
    return AppointmentQuerySchema.parse(rawParams);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Parámetros inválidos: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}

function validateCreateData(data: unknown) {
  try {
    return AppointmentCreateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Datos de creación inválidos: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}

function validateUpdateData(data: unknown) {
  try {
    return AppointmentUpdateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Datos de actualización inválidos: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}

// ==================== FUNCIONES DE CONSTRUCCIÓN DE QUERIES ====================

function buildAppointmentsQuery(supabase: any, params: z.infer<typeof AppointmentQuerySchema>) {
  let query = supabase
    .from('appointments')
    .select(`
      id,
      created_at,
      fecha_hora_cita,
      motivo_cita,
      estado_cita,
      notas_cita_seguimiento,
      es_primera_vez,
      patients!inner(
        id,
        nombre,
        apellidos,
        telefono,
        email
      ),
      doctors(
        id,
        full_name
      )
    `, { count: 'exact' });

  // Aplicar filtros de fecha
  if (params.dateFilter) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (params.dateFilter) {
      case 'today':
        query = query
          .gte('fecha_hora_cita', today.toISOString())
          .lt('fecha_hora_cita', tomorrow.toISOString());
        break;
      case 'future':
        query = query.gte('fecha_hora_cita', tomorrow.toISOString());
        break;
      case 'past':
        query = query.lt('fecha_hora_cita', today.toISOString());
        break;
      // 'all' no aplica filtro de fecha
    }
  }

  // Aplicar filtros específicos
  if (params.patientId) {
    query = query.eq('patient_id', params.patientId);
  }

  if (params.status) {
    query = query.eq('estado_cita', params.status);
  }

  // Aplicar búsqueda
  if (params.search) {
    query = query.or(`
      motivo_cita.ilike.%${params.search}%,
      notas_cita_seguimiento.ilike.%${params.search}%,
      patients.nombre.ilike.%${params.search}%,
      patients.apellidos.ilike.%${params.search}%,
      patients.telefono.ilike.%${params.search}%
    `);
  }

  // Aplicar ordenamiento
  query = query.order(params.sortBy, { ascending: params.sortOrder === 'asc' });

  // Aplicar paginación
  const offset = (params.page - 1) * params.pageSize;
  query = query.range(offset, offset + params.pageSize - 1);

  return query;
}

// ==================== HANDLERS DE LA API ====================

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // 🔒 VALIDACIÓN ROBUSTA DE PARÁMETROS
    const params = validateQueryParams(searchParams);
    
    // 🎯 CONSTRUCCIÓN DE QUERY ESPECÍFICA
    const query = buildAppointmentsQuery(supabase, params);
    
    // 📊 EJECUCIÓN DE QUERY
    const { data: appointments, error, count } = await query;
    
    if (error) {
      console.error('Error fetching appointments:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor al obtener citas' },
        { status: 500 }
      );
    }

    // 📈 CÁLCULO DE MÉTRICAS (solo si se solicita)
    let summary = undefined;
    if (params.dateFilter === 'all' || !params.patientId) {
      const summaryQuery = supabase
        .from('appointments')
        .select('fecha_hora_cita, estado_cita');
      
      const { data: allAppointments } = await summaryQuery;
      
      if (allAppointments) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        summary = {
          total_appointments: allAppointments.length,
          today_count: allAppointments.filter(a => {
            const appointmentDate = new Date(a.fecha_hora_cita);
            return appointmentDate >= today && appointmentDate < tomorrow;
          }).length,
          future_count: allAppointments.filter(a => 
            new Date(a.fecha_hora_cita) >= tomorrow
          ).length,
          past_count: allAppointments.filter(a => 
            new Date(a.fecha_hora_cita) < today
          ).length,
        };
      }
    }

    // 📦 RESPUESTA ESTRUCTURADA
    const totalPages = Math.ceil((count || 0) / params.pageSize);
    
    return NextResponse.json({
      data: appointments || [],
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        total: count || 0,
        totalPages,
        hasMore: params.page < totalPages,
      },
      summary,
    }, {
      headers: {
        'Cache-Control': 'max-age=60, s-maxage=300, stale-while-revalidate=600',
      },
    });
    
  } catch (error) {
    console.error('Appointments API Error:', error);
    
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
    
    // 🎯 CREACIÓN DE CITA
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert([validatedData])
      .select(`
        id,
        created_at,
        fecha_hora_cita,
        motivo_cita,
        estado_cita,
        notas_cita_seguimiento,
        es_primera_vez,
        patients!inner(
          id,
          nombre,
          apellidos,
          telefono,
          email
        ),
        doctors(
          id,
          full_name
        )
      `)
      .single();
    
    if (error) {
      console.error('Error creating appointment:', error);
      return NextResponse.json(
        { error: 'Error al crear la cita' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data: appointment,
      message: 'Cita creada exitosamente',
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create Appointment API Error:', error);
    
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
    const appointmentId = searchParams.get('id');
    
    if (!appointmentId) {
      return NextResponse.json(
        { error: 'ID de cita requerido' },
        { status: 400 }
      );
    }
    
    // Validar UUID
    if (!z.string().uuid().safeParse(appointmentId).success) {
      return NextResponse.json(
        { error: 'ID de cita inválido' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // 🔒 VALIDACIÓN ROBUSTA DE DATOS
    const validatedData = validateUpdateData(body);
    
    // 🎯 ACTUALIZACIÓN DE CITA
    const { data: appointment, error } = await supabase
      .from('appointments')
      .update(validatedData)
      .eq('id', appointmentId)
      .select(`
        id,
        created_at,
        fecha_hora_cita,
        motivo_cita,
        estado_cita,
        notas_cita_seguimiento,
        es_primera_vez,
        patients!inner(
          id,
          nombre,
          apellidos,
          telefono,
          email
        ),
        doctors(
          id,
          full_name
        )
      `)
      .single();
    
    if (error) {
      console.error('Error updating appointment:', error);
      return NextResponse.json(
        { error: 'Error al actualizar la cita' },
        { status: 500 }
      );
    }
    
    if (!appointment) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      data: appointment,
      message: 'Cita actualizada exitosamente',
    });
    
  } catch (error) {
    console.error('Update Appointment API Error:', error);
    
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
