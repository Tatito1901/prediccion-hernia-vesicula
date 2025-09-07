import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validatePatientStatusChange } from '@/lib/patient-state-rules';
import { createApiError, createApiResponse } from '@/lib/api-response-types';

// GET /api/patients/[id] - Obtener un paciente específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        createApiError('ID de paciente requerido', { code: 'BAD_REQUEST' }),
        { status: 400 }
      );
    }

    // Obtener el paciente por ID
    const { data: patient, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          createApiError('Paciente no encontrado', { code: 'PATIENT_NOT_FOUND' }),
          { status: 404 }
        );
      }
      return NextResponse.json(
        createApiError('Error al obtener el paciente', { details: error.message, code: 'INTERNAL_ERROR' }),
        { status: 500 }
      );
    }

    return NextResponse.json(createApiResponse(patient));

  } catch (error: any) {
    return NextResponse.json(
      createApiError('Error interno del servidor', { details: error.message, code: 'INTERNAL_ERROR' }),
      { status: 500 }
    );
  }
}

// PATCH /api/patients/[id] - Actualizar un paciente específico
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        createApiError('ID de paciente requerido', { code: 'BAD_REQUEST' }),
        { status: 400 }
      );
    }

    // Validar que el paciente existe primero
    const { data: existingPatient, error: fetchError } = await supabase
      .from('patients')
      .select('id, estado_paciente')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          createApiError('Paciente no encontrado', { code: 'PATIENT_NOT_FOUND' }),
          { status: 404 }
        );
      }
      return NextResponse.json(
        createApiError('Error al verificar el paciente', { details: fetchError.message, code: 'INTERNAL_ERROR' }),
        { status: 500 }
      );
    }

    // Guardas de estado de paciente: evitar degradaciones o sobrescrituras inválidas
    const safeBody: Record<string, any> = { ...body };

    if (Object.prototype.hasOwnProperty.call(safeBody, 'estado_paciente')) {
      const desiredRaw = safeBody.estado_paciente;
      // Si el valor es null/undefined, omitir el cambio de estado explícito
      if (desiredRaw == null) {
        delete safeBody.estado_paciente;
      } else {
        const currentStatus = (existingPatient as any)?.estado_paciente ?? null;
        const result = validatePatientStatusChange(currentStatus, desiredRaw);
        if (!result.allowed) {
          const code = result.code || 'INVALID_VALUE';
          const message =
            code === 'INVALID_VALUE'
              ? 'Valor de estado_paciente inválido'
              : code === 'BLOCKED_TERMINAL'
              ? 'No se puede modificar un estado de paciente terminal'
              : code === 'DOWNGRADE_NOT_ALLOWED'
              ? 'No se permite degradar el estado del paciente'
              : 'Cambio de estado de paciente no permitido';
          return NextResponse.json(
            createApiError(message, { code, details: { reason: result.reason } }),
            { status: 422 }
          );
        }
        // Aplicar valor normalizado (incluye caso NO_CHANGE)
        safeBody.estado_paciente = result.normalized;
      }
    }

    // Actualizar el paciente
    const { data: updatedPatient, error: updateError } = await supabase
      .from('patients')
      .update({
        ...safeBody,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        createApiError('Error al actualizar el paciente', { details: updateError.message, code: 'INTERNAL_ERROR' }),
        { status: 500 }
      );
    }

    return NextResponse.json(createApiResponse(updatedPatient));

  } catch (error: any) {
    return NextResponse.json(
      createApiError('Error interno del servidor', { details: error.message, code: 'INTERNAL_ERROR' }),
      { status: 500 }
    );
  }
}

// DELETE /api/patients/[id] - Eliminar un paciente específico (opcional)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        createApiError('ID de paciente requerido', { code: 'BAD_REQUEST' }),
        { status: 400 }
      );
    }

    // Eliminar el paciente
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        createApiError('Error al eliminar el paciente', { details: error.message, code: 'INTERNAL_ERROR' }),
        { status: 500 }
      );
    }

    return NextResponse.json(createApiResponse({ id }, { message: 'Paciente eliminado exitosamente' }));

  } catch (error: any) {
    return NextResponse.json(
      createApiError('Error interno del servidor', { details: error.message, code: 'INTERNAL_ERROR' }),
      { status: 500 }
    );
  }
}
