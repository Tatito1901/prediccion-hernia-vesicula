import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { 
  Lead, 
  NewLead, 
  LeadStatus, 
  Channel, 
  Motive,
  PaginatedResponse 
} from '@/lib/types';
import { LEAD_MOTIVE_VALUES, CONTACT_CHANNEL_VALUES } from '@/lib/validation/enums';

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
    const priority = searchParams.get('priority');
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

    if (priority) {
      const p = Number(priority);
      if (!Number.isNaN(p)) {
        query = query.eq('priority_level', p);
      }
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

    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: user not authenticated' },
        { status: 401 }
      );
    }

    // Validar datos requeridos y enums
    const { full_name, phone_number, channel, motive, notes, assigned_to } = body as {
      full_name?: string;
      phone_number?: string;
      channel?: Channel;
      motive?: Motive;
      notes?: string;
      assigned_to?: string;
    };

    if (!full_name || !phone_number || !channel || !motive) {
      return NextResponse.json(
        { error: 'Missing required fields: full_name, phone_number, channel, motive' },
        { status: 400 }
      );
    }

    if (!CONTACT_CHANNEL_VALUES.includes(channel)) {
      return NextResponse.json(
        { error: 'Invalid channel value' },
        { status: 400 }
      );
    }

    if (!LEAD_MOTIVE_VALUES.includes(motive)) {
      return NextResponse.json(
        { error: 'Invalid motive value' },
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

    // Preparar datos del lead (sin inferencias)
    const notesContent = (notes?.trim?.() as string) || '';

    const newLeadData: NewLead = {
      full_name: full_name.trim(),
      phone_number: phone_number.trim(),
      email: null,
      channel,
      motive,
      notes: notesContent || null,
      status: 'NUEVO',
      registered_by: user.id,
      assigned_to: assigned_to || user.id,
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
