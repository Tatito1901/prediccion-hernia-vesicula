import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { z } from 'zod'

export const runtime = 'nodejs'

const PatchSchema = z.object({
  fecha_hora_cita: z.string().datetime().optional(),
  motivos_consulta: z.array(z.string().min(1)).min(1).optional(),
  notas_breves: z.string().optional(),
  doctor_id: z.string().uuid().nullable().optional(),
  es_primera_vez: z.boolean().optional(),
})

// Nota: el estado de la cita se actualiza en subruta dedicada `/status`
function hasForbiddenStatusField(body: any): boolean {
  return body && Object.prototype.hasOwnProperty.call(body, 'estado_cita')
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const raw = await req.json().catch(() => ({}))

    if (hasForbiddenStatusField(raw)) {
      return NextResponse.json({
        error: 'El estado de la cita no puede modificarse en este endpoint. Usa /api/appointments/[id]/status',
      }, { status: 422 })
    }

    const parsed = PatchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Datos inválidos',
        details: parsed.error.issues,
      }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Obtener la cita actual para validar conflictos y completar valores faltantes
    const { data: current, error: fetchError } = await supabase
      .from('appointments')
      .select('id, doctor_id, fecha_hora_cita')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }

    const targetDoctorId = parsed.data.doctor_id !== undefined ? parsed.data.doctor_id : current.doctor_id
    const targetDateTime = parsed.data.fecha_hora_cita ?? current.fecha_hora_cita

    // Validación de conflicto de agenda por doctor/fecha
    if (targetDoctorId) {
      const { data: conflict, error: conflictErr } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', targetDoctorId)
        .eq('fecha_hora_cita', targetDateTime)
        .neq('id', id)
        .limit(1)

      if (conflictErr) {
        return NextResponse.json({ error: 'Error validando conflictos', details: conflictErr.message }, { status: 500 })
      }
      if (conflict && conflict.length > 0) {
        return NextResponse.json({ error: 'Conflicto de horario con el doctor' }, { status: 409 })
      }
    }

    // Construir payload de actualización solo con campos presentes
    const updatePayload: Record<string, any> = {}
    if (parsed.data.fecha_hora_cita !== undefined) updatePayload.fecha_hora_cita = parsed.data.fecha_hora_cita
    if (parsed.data.motivos_consulta !== undefined) updatePayload.motivos_consulta = parsed.data.motivos_consulta
    if (parsed.data.notas_breves !== undefined) updatePayload.notas_breves = parsed.data.notas_breves
    if (parsed.data.doctor_id !== undefined) updatePayload.doctor_id = parsed.data.doctor_id
    if (parsed.data.es_primera_vez !== undefined) updatePayload.es_primera_vez = parsed.data.es_primera_vez

    const { data: updated, error: updateError } = await supabase
      .from('appointments')
      .update(updatePayload)
      .eq('id', id)
      .select(`
        id,
        patient_id,
        doctor_id,
        created_at,
        updated_at,
        fecha_hora_cita,
        motivos_consulta,
        estado_cita,
        notas_breves,
        es_primera_vez,
        patients:patient_id (
          id, nombre, apellidos, telefono, email, diagnostico_principal, estado_paciente
        )
      `)
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Error al actualizar la cita' }, { status: 400 })
    }

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error inesperado' }, { status: 500 })
  }
}
