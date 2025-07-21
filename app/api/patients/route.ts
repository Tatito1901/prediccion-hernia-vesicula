import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const cacheConfig = {
  // 10 minutos de cache del navegador, 1 hora en CDN, 6 horas de stale-while-revalidate
  'Cache-Control': 'max-age=600, s-maxage=3600, stale-while-revalidate=21600',
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// --- GET: OBTENER LISTA PAGINADA DE PACIENTES CON BÚSQUEDA Y ESTADÍSTICAS ---
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // 1. Recolectar y sanitizar parámetros de la URL
    const estado = searchParams.get('estado');
    const searchTerm = searchParams.get('search'); // ✅ Búsqueda habilitada
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    let pageSize = parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE));
    pageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);

    // 2. Obtener pacientes paginados con búsqueda y filtros
    let query = supabase
      .from('patients')
      .select(`
        *,
        assigned_surveys!left(id, completed_at),
        appointments!left(id, fecha_hora_cita, estado_cita)
      `, { count: 'exact' });

    // Aplicar filtros
    if (estado && estado !== 'all') {
      query = query.eq('estado_paciente', estado);
    }

    if (searchTerm) {
      query = query.or(`
        nombre.ilike.%${searchTerm}%,
        apellidos.ilike.%${searchTerm}%,
        telefono.ilike.%${searchTerm}%,
        email.ilike.%${searchTerm}%,
        diagnostico_principal.ilike.%${searchTerm}%
      `);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Aplicar paginación
    const start = (page - 1) * pageSize;
    query = query.range(start, start + pageSize - 1);

    const { data: patients, error, count } = await query;
    
    if (error) {
      console.error('Supabase error fetching patients:', error);
      throw error;
    }

    // 3. Enriquecer datos en el backend
    const enrichedPatients = patients?.map(patient => ({
      ...patient,
      nombreCompleto: `${patient.nombre || ''} ${patient.apellidos || ''}`.trim(),
      displayDiagnostico: patient.diagnostico_principal || 'Sin diagnóstico',
      encuesta_completada: patient.assigned_surveys?.some((s: any) => s.completed_at) || false,
      encuesta: patient.assigned_surveys?.[0] || null,
      fecha_proxima_cita_iso: patient.appointments
        ?.filter((a: any) => new Date(a.fecha_hora_cita) > new Date())
        ?.sort((a: any, b: any) => new Date(a.fecha_hora_cita).getTime() - new Date(b.fecha_hora_cita).getTime())
        ?.[0]?.fecha_hora_cita
    })) || [];

    // 4. Calcular estadísticas en el backend (solo si es la primera página)
    let stats = null;
    if (page === 1) {
      const { data: statsData } = await supabase
        .from('patients')
        .select('estado_paciente, assigned_surveys!left(completed_at)')
        .not('estado_paciente', 'is', null);

      const statusStats = statsData?.reduce((acc, patient) => {
        if (patient.estado_paciente) {
          acc[patient.estado_paciente] = (acc[patient.estado_paciente] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      const totalPatients = statsData?.length || 0;
      const surveyCompleted = statsData?.filter(p => p.assigned_surveys?.some((s: any) => s.completed_at))?.length || 0;
      const surveyRate = totalPatients > 0 ? Math.round((surveyCompleted / totalPatients) * 100) : 0;

      stats = {
        totalPatients,
        surveyRate,
        pendingConsults: statusStats['PENDIENTE_DE_CONSULTA'] || 0,
        operatedPatients: statusStats['OPERADO'] || 0,
        statusStats: { ...statusStats, all: totalPatients }
      };
    }

    // 5. Construir respuesta con datos enriquecidos y estadísticas
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      data: enrichedPatients,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
      stats, // ✅ Estadísticas calculadas en backend
    }, { headers: cacheConfig });

  } catch (error: any) {
    console.error('Error in patients API route (GET):', error);
    return NextResponse.json({ 
      message: 'Error al obtener pacientes', 
      error: error.message 
    }, { status: 500 });
  }
}