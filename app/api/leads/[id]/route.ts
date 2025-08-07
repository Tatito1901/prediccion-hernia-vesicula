import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { UpdateLead } from '@/lib/types';

// GET /api/leads/[id] - Obtener lead específico
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = context.params;

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
  context: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = context.params;
    const body: UpdateLead = await request.json();

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

    // Fausto Mario Medina's profile ID as default
    const FAUSTO_PROFILE_ID = 'fbc26deb-e467-4f9d-92a9-904312229002';
    
    // Preparar datos de actualización
    const updateData: UpdateLead = {
      ...body,
      updated_at: new Date().toISOString(),
      registered_by: body.registered_by || FAUSTO_PROFILE_ID,
      assigned_to: body.assigned_to || FAUSTO_PROFILE_ID
    };

    // Remover campos que no deben actualizarse
    delete updateData.id;
    delete updateData.created_at;

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
  context: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = context.params;

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
