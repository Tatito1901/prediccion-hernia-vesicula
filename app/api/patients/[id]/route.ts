import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PatientStatusEnum } from '@/lib/types';
import { isTerminalPatientStatus } from '@/lib/patient-state-rules';

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
        { message: 'ID de paciente requerido' },
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
          { message: 'Paciente no encontrado' },
          { status: 404 }
        );
      }
      console.error('Error fetching patient:', error);
      return NextResponse.json(
        { message: 'Error al obtener el paciente', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(patient);

  } catch (error: any) {
    console.error('Error in GET /api/patients/[id]:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor', error: error.message },
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
        { message: 'ID de paciente requerido' },
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
          { message: 'Paciente no encontrado' },
          { status: 404 }
        );
      }
      console.error('Error checking patient existence:', fetchError);
      return NextResponse.json(
        { message: 'Error al verificar el paciente', error: fetchError.message },
        { status: 500 }
      );
    }

    // Guardas de estado de paciente: evitar degradaciones o sobrescrituras inválidas
    const safeBody: Record<string, any> = { ...body };

    if (Object.prototype.hasOwnProperty.call(safeBody, 'estado_paciente')) {
      const desiredRaw = safeBody.estado_paciente;
      const desired = typeof desiredRaw === 'string' ? desiredRaw.toLowerCase() : desiredRaw;
      const validValues = Object.values(PatientStatusEnum) as string[];

      if (desired != null && !validValues.includes(desired)) {
        return NextResponse.json(
          { message: 'Valor de estado_paciente inválido' },
          { status: 400 }
        );
      }

      const currentStatus = (existingPatient as any)?.estado_paciente ?? null;

      // No permitir cambiar estados terminales
      if (isTerminalPatientStatus(currentStatus) && desired !== currentStatus) {
        delete safeBody.estado_paciente;
      }

      // No permitir degradar a POTENCIAL desde un estado ya establecido distinto a POTENCIAL
      if (
        desired === PatientStatusEnum.POTENCIAL &&
        currentStatus &&
        currentStatus !== PatientStatusEnum.POTENCIAL
      ) {
        delete safeBody.estado_paciente;
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
      console.error('Error updating patient:', updateError);
      return NextResponse.json(
        { message: 'Error al actualizar el paciente', error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedPatient);

  } catch (error: any) {
    console.error('Error in PATCH /api/patients/[id]:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor', error: error.message },
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
        { message: 'ID de paciente requerido' },
        { status: 400 }
      );
    }

    // Eliminar el paciente
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting patient:', error);
      return NextResponse.json(
        { message: 'Error al eliminar el paciente', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Paciente eliminado exitosamente' });

  } catch (error: any) {
    console.error('Error in DELETE /api/patients/[id]:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor', error: error.message },
      { status: 500 }
    );
  }
}
