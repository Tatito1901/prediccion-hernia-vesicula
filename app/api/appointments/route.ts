// app/api/appointments/route.ts - REFACTORED TO USE ENRICHED_APPOINTMENTS RPC
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { startOfDay, endOfDay } from 'date-fns';
import { ZNewAppointmentSchema, normalizeNewAppointment } from '@/lib/validation/appointments';

// Ensure Node.js runtime for access to process.env and server-only libs
export const runtime = 'nodejs';

// Configuración de cache optimizada
const cacheConfig = {
  'Cache-Control': 'max-age=60, s-maxage=300, stale-while-revalidate=600',
};

// Configuración de paginación
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createServerClient();
  // Debug: confirm which client path is used and env presence
  console.log('🔐 [/api/appointments][GET] client:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'admin' : 'server', {
    hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasService: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  });
  const { searchParams } = new URL(request.url);

  // ✅ SOLUCIÓN: Parámetros optimizados para la función RPC
  const dateFilter = searchParams.get('dateFilter'); // 'today', 'future', 'past', o null para todos
  const patientId = searchParams.get('patientId');
  const onDate = searchParams.get('onDate'); // YYYY-MM-DD para filtrar por un día específico
  const startDateParam = searchParams.get('startDate'); // YYYY-MM-DD para rango (inicio)
  const endDateParam = searchParams.get('endDate');   // YYYY-MM-DD para rango (fin)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));

  try {
    // Helper para parsear fechas YYYY-MM-DD como fechas locales (evitar desplazamiento UTC)
    const parseDateOnly = (s: string) => {
      const [y, m, d] = s.split('-').map((v) => parseInt(v, 10));
      return new Date(y, (m || 1) - 1, d || 1);
    };
    // ✅ SOLUCIÓN: Usar consulta enriquecida con JOIN correctamente estructurado
    console.log('📊 API Appointments llamado con parámetros:', { dateFilter, patientId, onDate, startDateParam, endDateParam, pageSize, page });
    
    // Seleccionamos solo columnas base para evitar errores por columnas/relaciones inexistentes
    let query = supabase
      .from('appointments')
      .select(`
        id,
        fecha_hora_cita,
        estado_cita,
        patient_id,
        doctor_id,
        motivos_consulta
      `, { count: 'exact' });

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    // ✅ Filtro por RANGO específico (tiene mayor precedencia)
    if (startDateParam || endDateParam) {
      try {
        if (startDateParam) {
          const start = startOfDay(parseDateOnly(startDateParam));
          query = query.gte('fecha_hora_cita', start.toISOString());
        }
        if (endDateParam) {
          const end = endOfDay(parseDateOnly(endDateParam));
          query = query.lt('fecha_hora_cita', end.toISOString());
        }
      } catch (e) {
        console.warn('⚠️ Parámetros de rango inválidos:', { startDateParam, endDateParam });
      }
    }
    // ✅ Filtro por día específico (onDate)
    else if (onDate) {
      try {
        const start = startOfDay(parseDateOnly(onDate));
        const end = endOfDay(parseDateOnly(onDate));
        query = query
          .gte('fecha_hora_cita', start.toISOString())
          .lt('fecha_hora_cita', end.toISOString());
      } catch (e) {
        console.warn('⚠️ Parametro onDate inválido:', onDate);
      }
    }

    // ✅ Filtro general por tipo: hoy, futuras, pasadas
    if (!onDate && !startDateParam && !endDateParam && dateFilter) {
      const now = new Date();
      const startToday = startOfDay(now).toISOString();
      const endToday = endOfDay(now).toISOString();
      if (dateFilter === 'today') {
        query = query.gte('fecha_hora_cita', startToday).lt('fecha_hora_cita', endToday);
      } else if (dateFilter === 'future') {
        query = query.gte('fecha_hora_cita', endToday);
      } else if (dateFilter === 'past') {
        query = query.lt('fecha_hora_cita', startToday);
      }
    }

    query = query.range((page - 1) * pageSize, page * pageSize - 1);
    query = query.order('fecha_hora_cita', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error en GET /api/appointments:', error);
      throw error;
    }

    console.log(`✅ Citas obtenidas: ${data?.length || 0} de ${count || 0} total`);

    // Construir resumen simple para compatibilidad con hooks existentes
    const now = new Date();
    const startToday = startOfDay(now).toISOString();
    const endToday = endOfDay(now).toISOString();
    const summary = {
      total_appointments: count || 0,
      today_count: (data || []).filter(a => a.fecha_hora_cita >= startToday && a.fecha_hora_cita < endToday).length,
      future_count: (data || []).filter(a => a.fecha_hora_cita >= endToday).length,
      past_count: (data || []).filter(a => a.fecha_hora_cita < startToday).length,
    };

    const totalPages = Math.ceil((count || 0) / pageSize);
    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages,
        hasMore: page < totalPages
      },
      summary
    }, { headers: { ...cacheConfig } });

  } catch (error: any) {
    console.error('Error en GET /api/appointments:', error);
    return NextResponse.json({ 
      message: 'Error al obtener citas', 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createServerClient();
  // Debug: confirm which client path is used and env presence
  console.log('🔐 [/api/appointments][POST] client:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'admin' : 'server', {
    hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasService: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  });
  try {
    const raw = await request.json();
    // Validación estricta de payload
    const parsed = ZNewAppointmentSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Validation failed', issues: parsed.error.issues },
        { status: 422 }
      );
    }
    const input = parsed.data;
    const payload = normalizeNewAppointment(input);

    // Verificar que el paciente exista
    const { data: existingPatient, error: patientErr } = await supabase
      .from('patients')
      .select('id')
      .eq('id', payload.patient_id)
      .single();
    if (patientErr || !existingPatient) {
      return NextResponse.json(
        { message: 'Paciente no existe', details: patientErr?.message },
        { status: 422 }
      );
    }

    // Prevenir conflictos básicos de agenda por doctor y slot exacto
    if (payload.doctor_id) {
      const { data: conflict } = await supabase
        .from('appointments')
        .select('id, estado_cita')
        .eq('doctor_id', payload.doctor_id)
        .eq('fecha_hora_cita', payload.fecha_hora_cita)
        .neq('estado_cita', 'CANCELADA')
        .maybeSingle();
      if (conflict) {
        return NextResponse.json(
          { message: 'Conflicto de agenda: el doctor ya tiene una cita en ese horario' },
          { status: 409 }
        );
      }
    }

    const { data: newAppointment, error } = await supabase
      .from('appointments')
      .insert([{
        patient_id: payload.patient_id,
        doctor_id: payload.doctor_id,
        fecha_hora_cita: payload.fecha_hora_cita,
        motivos_consulta: payload.motivos_consulta,
        estado_cita: payload.estado_cita,
        es_primera_vez: payload.es_primera_vez,
        notas_breves: payload.notas_breves,
      }])
      .select()
      .single();

    if (error) throw error;

    // Si es la primera cita, actualiza patients.fecha_primera_consulta
    if (payload.es_primera_vez || payload.es_primera_vez === undefined) { // Si es_primera_vez es true o no se proporcionó (default true)
        const { error: patientUpdateError } = await supabase
            .from('patients')
            .update({ fecha_primera_consulta: new Date(payload.fecha_hora_cita).toISOString().split('T')[0] })
            .eq('id', payload.patient_id)
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