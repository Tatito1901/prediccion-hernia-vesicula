import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { UpdateLead } from '@/lib/types';
import { LEAD_MOTIVE_VALUES, CONTACT_CHANNEL_VALUES } from '@/lib/validation/enums';

// GET /api/leads/[id] - Obtener lead específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: lead, error } = await supabase
      .from('leads')
      .select(`
        *,
        conversion_patient:patients!patients_lead_id_fkey(
          id,
          nombre,
          apellidos,
          telefono,
          estado_paciente
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching lead:', error);
      return NextResponse.json(
        { error: 'Error fetching lead', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Unexpected error in GET /api/leads/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/leads/[id] - Actualizar lead
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body: UpdateLead = await request.json();

    // Autenticación requerida
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: user not authenticated' },
        { status: 401 }
      );
    }

    // Verificar que el lead existe
    const { data: existingLead, error: fetchError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingLead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Validar enums si vienen en el payload
    if (body.channel && !CONTACT_CHANNEL_VALUES.includes(body.channel as any)) {
      return NextResponse.json(
        { error: 'Invalid channel value' },
        { status: 400 }
      );
    }

    if (body.motive && !LEAD_MOTIVE_VALUES.includes(body.motive as any)) {
      return NextResponse.json(
        { error: 'Invalid motive value' },
        { status: 400 }
      );
    }

    // Preparar datos de actualización
    const updateData: UpdateLead = {
      ...body,
      updated_at: new Date().toISOString(),
      // No modificar registered_by en actualizaciones; asignar assigned_to por defecto al usuario autenticado
      assigned_to: body.assigned_to || user.id,
    };

    // Remover campos que no deben actualizarse
    delete (updateData as any).id;
    delete (updateData as any).created_at;
    delete (updateData as any).registered_by;

    const { data: updatedLead, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating lead:', error);
      return NextResponse.json(
        { error: 'Error updating lead', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Lead updated successfully',
      lead: updatedLead
    });
  } catch (error) {
    console.error('Unexpected error in PUT /api/leads/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/leads/[id] - Eliminar lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Verificar que el lead existe y no está convertido
    const { data: existingLead, error: fetchError } = await supabase
      .from('leads')
      .select('id, status, converted_at')
      .eq('id', id)
      .single();

    if (fetchError || !existingLead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // No permitir eliminar leads convertidos
    if (existingLead.converted_at) {
      return NextResponse.json(
        { error: 'Cannot delete converted lead. Please archive instead.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting lead:', error);
      return NextResponse.json(
        { error: 'Error deleting lead', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/leads/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
