import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { getAvailableActions, suggestNextAction } from '@/lib/admission-business-rules'
import { mxNow } from '@/utils/datetime'
import type { AppointmentStatus } from '@/lib/types'

export const runtime = 'nodejs'

interface AppointmentWithPatient {
  id: string
  patient_id: string
  doctor_id?: string | null
  created_at: string
  updated_at?: string | null
  fecha_hora_cita: string
  motivos_consulta: string[]
  estado_cita: AppointmentStatus
  notas_breves?: string | null
  es_primera_vez?: boolean | null
  patients?: {
    id: string
    nombre: string
    apellidos: string
    telefono?: string | null
    email?: string | null
    diagnostico_principal?: string | null
    estado_paciente?: string | null
  } | null
}

interface AppointmentLike {
  fecha_hora_cita: string
  estado_cita: AppointmentStatus
  updated_at?: string | null
}

interface UpdateAppointmentArgs {
  p_action: 'update'
  p_appointment_id: string
  p_doctor_id?: string | null
  p_fecha_hora_cita?: string
  p_motivos_consulta?: string[]
  p_notas_breves?: string
  p_es_primera_vez?: boolean
}

interface UpdateAppointmentResult {
  success: boolean
  message?: string
}

const PatchSchema = z.object({
  fecha_hora_cita: z.string().datetime().optional(),
  motivos_consulta: z.array(z.string().min(1)).min(1).optional(),
  notas_breves: z.string().optional(),
  doctor_id: z.string().uuid().nullable().optional(),
  es_primera_vez: z.boolean().optional(),
})

// Nota: el estado de la cita se actualiza en subruta dedicada `/status`
function hasForbiddenStatusField(body: unknown): boolean {
  return typeof body === 'object' && body !== null && Object.prototype.hasOwnProperty.call(body, 'estado_cita')
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
    const appointment = data as unknown as AppointmentWithPatient
    const apptLike: AppointmentLike = {
      fecha_hora_cita: appointment.fecha_hora_cita,
      estado_cita: appointment.estado_cita,
      updated_at: appointment.updated_at ?? null,
    }
    const actionList = getAvailableActions(apptLike, now)
    const available = actionList.filter(a => a.valid).map(a => a.action)
    const action_reasons = Object.fromEntries(
      actionList.filter(a => !a.valid && a.reason).map(a => [a.action, a.reason as string])
    )
    const primary = suggestNextAction(apptLike, now)

    return NextResponse.json({
      ...appointment,
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
  } catch (e: unknown) {
    const error = e as Error
    return NextResponse.json({ error: error?.message || 'Error inesperado' }, { status: 500 })
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
    const rpcArgs: UpdateAppointmentArgs = {
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
    const resultArray = (rpcData as unknown) as UpdateAppointmentResult[]
    const result = resultArray?.[0]
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
      const appointment = updated as unknown as AppointmentWithPatient
      const apptLike: AppointmentLike = {
        fecha_hora_cita: appointment.fecha_hora_cita,
        estado_cita: appointment.estado_cita,
        updated_at: appointment.updated_at ?? null,
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
      return NextResponse.json({ ...appointment, actions, action_reasons, suggested_action: primary })
    } catch {
      return NextResponse.json(updated)
    }
  } catch (e: unknown) {
    const error = e as Error
    return NextResponse.json({ error: error?.message || 'Error inesperado' }, { status: 500 })
  }
}
