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

    // Actualización atómica vía RPC con verificación de traslapes
    const rpcArgs: any = {
      p_action: 'update',
      p_appointment_id: id,
      p_doctor_id: parsed.data.doctor_id !== undefined ? parsed.data.doctor_id : undefined,
      p_fecha_hora_cita: parsed.data.fecha_hora_cita ?? undefined,
      p_motivos_consulta: parsed.data.motivos_consulta ?? undefined,
      p_notas_breves: parsed.data.notas_breves ?? undefined,
      p_es_primera_vez: parsed.data.es_primera_vez ?? undefined,
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc('schedule_appointment', rpcArgs)
    if (rpcError) {
      return NextResponse.json({ error: rpcError.message || 'Error al actualizar la cita' }, { status: 400 })
    }
    const result = rpcData && rpcData[0]
    if (!result || !result.success) {
      const msg = result?.message || 'No se pudo actualizar la cita'
      const status = /no encontrada/i.test(msg)
        ? 404
        : /horario no disponible/i.test(msg)
          ? 409
          : 400
      return NextResponse.json({ error: msg }, { status })
    }

    // Obtener la cita actualizada con datos del paciente
    const { data: updated, error: fetchUpdatedError } = await supabase
      .from('appointments')
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
      .eq('id', id)
      .single()

    if (fetchUpdatedError) {
      return NextResponse.json({ error: fetchUpdatedError.message || 'Error al consultar cita actualizada' }, { status: 400 })
    }

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error inesperado' }, { status: 500 })
  }
}
