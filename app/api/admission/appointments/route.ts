// app/api/admission/appointments/route.ts - API ESPECIALIZADA PARA ADMISIÓN
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import type { AppointmentStatus } from '@/types/admission-types';

// ==================== CONFIGURACIÓN ====================
const CACHE_CONFIG = {
  'Cache-Control': 'max-age=30, s-maxage=60, stale-while-revalidate=120',
};

const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 50,
};

// ==================== VALIDACIÓN ====================
const QueryParamsSchema = z.object({
  filter: z.enum(['today', 'future', 'past']).optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(PAGINATION_CONFIG.MAX_PAGE_SIZE).default(PAGINATION_CONFIG.DEFAULT_PAGE_SIZE),
  search: z.string().optional(),
});

// ==================== HELPERS ====================
const getDateFilters = (filter: 'today' | 'future' | 'past') => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  switch (filter) {
    case 'today':
      return {
        gte: todayStart.toISOString(),
        lt: todayEnd.toISOString(),
      };
    case 'future':
      return {
        gte: todayEnd.toISOString(),
      };
    case 'past':
      return {
        lt: todayStart.toISOString(),
      };
  }
};

const buildSearchFilter = (search: string) => {
  // Búsqueda en nombre, apellidos, teléfono del paciente
  return `
    patients.nombre.ilike.%${search}%,
    patients.apellidos.ilike.%${search}%,
    patients.telefono.ilike.%${search}%,
    motivo_cita.ilike.%${search}%
  `;
};

// ==================== ENDPOINT PRINCIPAL ====================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // 1. VALIDAR PARÁMETROS
    const validationResult = QueryParamsSchema.safeParse({
      filter: searchParams.get('filter'),
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      search: searchParams.get('search'),
    });
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Parámetros inválidos',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }
    
    const { filter, page, pageSize, search } = validationResult.data;
    
    console.log(`📊 [Admission API] Fetching appointments:`, { filter, page, pageSize, search });
    
    // 2. CONSTRUIR QUERY BASE
    let query = supabase
      .from('appointments')
      .select(`
        id,
        fecha_hora_cita,
        motivo_cita,
        estado_cita,
        es_primera_vez,
        notas_cita_seguimiento,
        created_at,
        patient_id,
        doctor_id,
        patients:patient_id (
          id,
          nombre,
          apellidos,
          telefono,
          email,
          estado_paciente,
          edad,
          diagnostico_principal
        ),
        profiles:doctor_id (
          id,
          full_name,
          username
        )
      `, { count: 'exact' });
    
    // 3. APLICAR FILTROS DE FECHA
    if (filter) {
      const dateFilters = getDateFilters(filter);
      
      if (dateFilters.gte) {
        query = query.gte('fecha_hora_cita', dateFilters.gte);
      }
      if (dateFilters.lt) {
        query = query.lt('fecha_hora_cita', dateFilters.lt);
      }
    }
    
    // 4. APLICAR FILTRO DE BÚSQUEDA
    if (search && search.trim()) {
      query = query.or(buildSearchFilter(search.trim()));
    }
    
    // 5. APLICAR PAGINACIÓN Y ORDENAMIENTO
    const start = (page - 1) * pageSize;
    query = query
      .range(start, start + pageSize - 1)
      .order('fecha_hora_cita', { 
        ascending: filter === 'past' ? false : true // Past appointments: newest first
      });
    
    // 6. EJECUTAR QUERY
    const { data: appointments, error, count } = await query;
    
    if (error) {
      console.error('❌ [Admission API] Database error:', error);
      return NextResponse.json(
        { error: 'Error al consultar las citas' },
        { status: 500 }
      );
    }
    
    // 7. VALIDAR Y LIMPIAR DATOS
    const validAppointments = appointments?.filter(appointment => {
      // Validar estructura básica
      if (!appointment.id || !appointment.fecha_hora_cita || !appointment.patients) {
        console.warn('⚠️ [Admission API] Invalid appointment structure:', appointment.id);
        return false;
      }
      
      // Validar datos del paciente
      const patient = appointment.patients;
      if (!patient.nombre || !patient.apellidos) {
        console.warn('⚠️ [Admission API] Invalid patient data:', patient.id);
        return false;
      }
      
      return true;
    }) || [];
    
    // 8. CALCULAR METADATOS DE PAGINACIÓN
    const totalPages = Math.ceil((count || 0) / pageSize);
    const hasMore = page < totalPages;
    
    // 9. RESPUESTA ESTRUCTURADA
    const response = {
      data: validAppointments,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages,
        hasMore,
      },
      meta: {
        filter,
        search: search || null,
        timestamp: new Date().toISOString(),
        cached: false,
      },
    };
    
    console.log(`✅ [Admission API] Returning ${validAppointments.length} appointments (page ${page}/${totalPages})`);
    
    return NextResponse.json(response, {
      status: 200,
      headers: CACHE_CONFIG,
    });
    
  } catch (error: any) {
    console.error('💥 [Admission API] Unexpected error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}