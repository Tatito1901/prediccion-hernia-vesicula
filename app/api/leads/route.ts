import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { 
  Lead, 
  NewLead, 
  LeadStats, 
  LeadStatus, 
  Channel, 
  Motive,
  // LeadIntent, // Eliminado: no existe en el esquema de la BD
  PaginatedResponse 
} from '@/lib/types';

// GET /api/leads - Obtener leads con filtros y paginación
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parámetros de paginación
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    // Parámetros de filtro
    const status = searchParams.get('status') as LeadStatus | null;
    const channel = searchParams.get('channel') as Channel | null;
    const motive = searchParams.get('motive') as Motive | null;
    // lead_intent eliminado del esquema; ignoramos cualquier query param relacionado
    const search = searchParams.get('search') || '';
    const overdue = searchParams.get('overdue') === 'true';

    // Construir query base
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status);
    }

    if (channel) {
      query = query.eq('channel', channel);
    }

    if (motive) {
      query = query.eq('motive', motive);
    }

    // Nota: no aplicar filtro por lead_intent ya que no existe en la tabla

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone_number.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (overdue) {
      const now = new Date().toISOString();
      query = query.lt('next_follow_up_date', now).not('next_follow_up_date', 'is', null);
    }

    // Aplicar paginación
    query = query.range(offset, offset + pageSize - 1);

    const { data: leads, error, count } = await query;

    if (error) {
      console.error('Error fetching leads:', error);
      return NextResponse.json(
        { error: 'Error fetching leads', details: error.message },
        { status: 500 }
      );
    }

    const response: PaginatedResponse<Lead> = {
      data: leads || [],
      pagination: {
        page,
        pageSize,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        hasMore: (count || 0) > offset + pageSize
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in GET /api/leads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/leads - Crear nuevo lead
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validar datos requeridos
    const { full_name, phone_number, channel } = body as {
      full_name?: string;
      phone_number?: string;
      channel?: Channel;
      motive?: Motive; // opcional en request; vamos a inferir si falta
      call_reason?: 'ONLY_WANTS_INFORMATION' | 'WANTS_TO_SCHEDULE_APPOINTMENT' | 'WANTS_TO_COMPARE_PRICES' | 'OTHER';
      problem_specification?: string;
      notes?: string;
      assigned_to?: string;
    };

    if (!full_name || !phone_number || !channel) {
      return NextResponse.json(
        { error: 'Missing required fields: full_name, phone_number, channel' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un lead con el mismo teléfono
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, full_name, status')
      .eq('phone_number', phone_number)
      .single();

    if (existingLead) {
      return NextResponse.json(
        { 
          error: 'Lead already exists with this phone number',
          existing_lead: existingLead
        },
        { status: 409 }
      );
    }

    // Preparar datos del lead
    // Si hay especificación del problema, la agregamos a las notas
    let notesContent = (body.notes?.trim?.() as string) || '';
    if ((body.problem_specification as string | undefined)?.trim()) {
      const problemSpec = `Especificación del problema: ${(body.problem_specification as string).trim()}`;
      notesContent = notesContent ? `${notesContent}\n\n${problemSpec}` : problemSpec;
    }

    // Inferencia de motive si no viene o si es inconsistente
    const allowedMotives: Motive[] = [
      'INFORMES',
      'AGENDAR_CITA',
      'URGENCIA_MEDICA',
      'SEGUIMIENTO',
      'CANCELACION',
      'REAGENDAMIENTO',
      'OTRO',
    ];

    const normalizeMotive = (m?: unknown): Motive | undefined =>
      allowedMotives.includes(m as Motive) ? (m as Motive) : undefined;

    const inferFromCallReason = (
      cr?: 'ONLY_WANTS_INFORMATION' | 'WANTS_TO_SCHEDULE_APPOINTMENT' | 'WANTS_TO_COMPARE_PRICES' | 'OTHER'
    ): Motive | undefined => {
      switch (cr) {
        case 'WANTS_TO_SCHEDULE_APPOINTMENT':
          return 'AGENDAR_CITA';
        case 'ONLY_WANTS_INFORMATION':
        case 'WANTS_TO_COMPARE_PRICES':
          return 'INFORMES';
        default:
          return undefined;
      }
    };

    const inferFromText = (text?: string): Motive | undefined => {
      if (!text) return undefined;
      const t = text.toLowerCase();
      if (/(urgenc|emergenc|fiebre alta|sangr|insoportable|apendicitis|peritonitis)/i.test(t)) return 'URGENCIA_MEDICA';
      if (/(cancel|anular)/i.test(t)) return 'CANCELACION';
      if (/(reagend|cambiar hora|mover cita)/i.test(t)) return 'REAGENDAMIENTO';
      if (/(seguimiento|control|resultado)/i.test(t)) return 'SEGUIMIENTO';
      if (/(agendar|cita|programar)/i.test(t)) return 'AGENDAR_CITA';
      if (/(inform|precio|costo|coste|promoc|paquete)/i.test(t)) return 'INFORMES';
      return undefined;
    };

    const providedMotive = normalizeMotive((body as any).motive);
    const inferredFromCall = inferFromCallReason((body as any).call_reason);
    const inferredFromText = inferFromText(notesContent);
    const finalMotive: Motive =
      providedMotive || inferredFromCall || inferredFromText || 'INFORMES';

    // Fausto Mario Medina's profile ID as default
    const FAUSTO_PROFILE_ID = 'fbc26deb-e467-4f9d-92a9-904312229002';
    
    const newLeadData: NewLead = {
      full_name: full_name.trim(),
      phone_number: phone_number.trim(),
      email: null, // Campo eliminado del formulario pero mantenido en BD
      channel,
      motive: finalMotive,
      notes: notesContent || null,
      status: 'NUEVO',
      registered_by: FAUSTO_PROFILE_ID,
      assigned_to: (body as any).assigned_to || FAUSTO_PROFILE_ID
    };

    const { data: lead, error } = await supabase
      .from('leads')
      .insert(newLeadData)
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      return NextResponse.json(
        { error: 'Error creating lead', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Lead created successfully',
      lead 
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/leads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
