import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { getAvailableActions, suggestNextAction, type AppointmentLike } from '@/lib/admission-business-rules'
import { mxNow } from '@/utils/datetime'
import type { AppointmentStatus } from '@/lib/types'

export const runtime = 'nodejs'

const PatchSchema = z.object({
  fecha_hora_cita: z.string().datetime().optional(),
  motivos_consulta: z.array(z.string().min(1)).min(1).optional(),
  notas_breves: z.string().optional(),
  doctor_id: z.string().uuid().nullable().optional(),
  es_primera_vez: z.boolean().optional(),
})

// Nota: el estado de la cita se actualiza en subruta dedicada `/status`
function hasForbiddenStatusField(body: unknown): boolean {
  return body !== null && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'estado_cita')
}

// GET /api/appointments/[id] - devuelve una cita enriquecida con acciones calculadas
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
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

    if (error) {
      const status = /not found|no rows/i.test(String(error.message)) ? 404 : 400
      return NextResponse.json({ error: error.message || 'Error al consultar cita' }, { status })
    }

    // Enriquecer con flags de acciones
    const now = mxNow()
    const appointmentData = data as { fecha_hora_cita: string; estado_cita: AppointmentStatus; updated_at?: string | null }
    const apptLike: AppointmentLike = {
      fecha_hora_cita: appointmentData.fecha_hora_cita,
      estado_cita: appointmentData.estado_cita,
      updated_at: appointmentData.updated_at ?? null,
    }
    const actionList = getAvailableActions(apptLike, now)
    const available = actionList.filter(a => a.valid).map(a => a.action)
    const action_reasons = Object.fromEntries(
      actionList.filter(a => !a.valid && a.reason).map(a => [a.action, a.reason as string])
    )
    const primary = suggestNextAction(apptLike, now)

    return NextResponse.json({
      ...appointmentData,
      actions: {
        canCheckIn: available.includes('checkIn'),
        canComplete: available.includes('complete'),
        canCancel: available.includes('cancel'),
        canNoShow: available.includes('noShow'),
        canReschedule: available.includes('reschedule'),
        available,
        primary,
      },
      action_reasons,
      suggested_action: primary,
    })
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Error inesperado'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
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

    const supabase = await createClient()

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

    type RpcResponse = Array<{ success: boolean; appointment_id?: string; message?: string }>;
    const { data: rpcData, error: rpcError } = await supabase.rpc('schedule_appointment', rpcArgs) as { data: RpcResponse | null; error: unknown }
    if (rpcError) {
      return NextResponse.json({ error: (rpcError as { message?: string })?.message || 'Error al actualizar la cita' }, { status: 400 })
    }
    const result = rpcData?.[0]
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

    // Enrich with backend-calculated business-rule action flags
    try {
      const now = mxNow()
      const updatedData = updated as { fecha_hora_cita: string; estado_cita: AppointmentStatus; updated_at?: string | null }
      const apptLike: AppointmentLike = {
        fecha_hora_cita: updatedData.fecha_hora_cita,
        estado_cita: updatedData.estado_cita,
        updated_at: updatedData.updated_at ?? null,
      }
      const actionList = getAvailableActions(apptLike, now)
      const available = actionList.filter(a => a.valid).map(a => a.action)
      const action_reasons = Object.fromEntries(
        actionList.filter(a => !a.valid && a.reason).map(a => [a.action, a.reason as string])
      )
      const primary = suggestNextAction(apptLike, now)
      const actions = {
        canCheckIn: available.includes('checkIn'),
        canComplete: available.includes('complete'),
        canCancel: available.includes('cancel'),
        canNoShow: available.includes('noShow'),
        canReschedule: available.includes('reschedule'),
        available,
        primary,
      }
      return NextResponse.json({ ...updatedData, actions, action_reasons, suggested_action: primary })
    } catch (error) {
      console.error('Error enriching updated appointment:', error)
      return NextResponse.json(updated)
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Error inesperado'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
