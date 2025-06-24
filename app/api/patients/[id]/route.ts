// app/api/patients/[id]/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

type RouteParams = {
  params: {
    id: string;
  };
};

/**
 * Obtener un paciente específico por su ID.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { id } = params;

  if (!id) {
    return NextResponse.json({ message: 'El ID del paciente es requerido.' }, { status: 400 });
  }

  try {
    const { data: patient, error } = await supabase
      .from('patients')
      .select(`
        *,
        doctor:profiles!patients_doctor_asignado_id_fkey(id, full_name),
        creator:profiles!patients_creado_por_id_fkey(id, full_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // "Not a single row" - significa que no se encontró
        return NextResponse.json({ message: 'Paciente no encontrado.' }, { status: 404 });
      }
      throw error;
    }

    if (!patient) {
      return NextResponse.json({ message: 'Paciente no encontrado.' }, { status: 404 });
    }

    return NextResponse.json(patient);
  } catch (error: any) {
    console.error('Error en GET /api/patients/[id]:', error);
    return NextResponse.json({ message: 'Error al obtener el paciente.', error: error.message }, { status: 500 });
  }
}

/**
 * Actualizar un paciente específico por su ID.
 * Se utiliza PATCH para permitir actualizaciones parciales.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { id } = params;
  let body;

  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ message: 'Cuerpo de la solicitud inválido.' }, { status: 400 });
  }

  if (!id) {
    return NextResponse.json({ message: 'El ID del paciente es requerido.' }, { status: 400 });
  }

  try {
    const { data: updatedPatient, error } = await supabase
      .from('patients')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(updatedPatient);
  } catch (error: any) {
    console.error('Error en PATCH /api/patients/[id]:', error);
    return NextResponse.json({ message: 'Error al actualizar el paciente.', error: error.message }, { status: 500 });
  }
}

/**
 * Eliminar un paciente específico por su ID.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { id } = params;

  if (!id) {
    return NextResponse.json({ message: 'El ID del paciente es requerido.' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Paciente eliminado exitosamente.' }, { status: 200 });
  } catch (error: any) {
    console.error('Error en DELETE /api/patients/[id]:', error);
    return NextResponse.json({ message: 'Error al eliminar el paciente.', error: error.message }, { status: 500 });
  }
}