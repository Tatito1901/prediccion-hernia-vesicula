import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/admin'
import { AppointmentStatusEnum } from '@/lib/types'

export const runtime = 'nodejs'

// Minimal GET to satisfy Next.js module requirements (not used by UI)
export async function GET() {
  return NextResponse.json({ message: 'patient-admission API' })
}

// Helpers
const isIsoDate = (value: string) => {
  const d = new Date(value)
  return !Number.isNaN(d.getTime())
}

const emptyToUndefined = <T extends Record<string, any>>(obj: T): T => {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && v.trim() === '') out[k] = undefined
    else out[k] = v
  }
  return out as T
}

const AdmissionSchema = z.object({
  nombre: z.string().min(2),
  apellidos: z.string().min(2),
  diagnostico_principal: z.string().min(1),
  fecha_hora_cita: z.string().refine(isIsoDate, 'fecha_hora_cita debe ser ISO 8601'),
  motivos_consulta: z.array(z.string().min(1)).min(1),
  diagnostico_principal_detalle: z.string().optional(),
  telefono: z
    .string()
    .regex(/^[0-9+\-\s()]{10,15}$/i, 'Teléfono inválido')
    .optional(),
  email: z.string().email().optional(),
  edad: z.number().int().min(0).max(120).optional(),
  genero: z.enum(['Masculino', 'Femenino', 'Otro']).optional(),
  fecha_nacimiento: z.string().optional(),
  ciudad: z.string().optional(),
  estado: z.string().optional(),
  antecedentes_medicos: z.string().optional(),
  numero_expediente: z.string().optional(),
  seguro_medico: z.string().optional(),
  comentarios_registro: z.string().optional(),
  probabilidad_cirugia: z.number().min(0).max(1).optional(),
  doctor_id: z.string().uuid().optional(),
  contacto_emergencia_nombre: z.string().optional(),
  contacto_emergencia_telefono: z
    .string()
    .regex(/^[0-9+\-\s()]{10,15}$/i, 'Teléfono inválido')
    .optional(),
  creado_por_id: z.string().uuid().optional(),
  creation_source: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => ({}))
    const input = emptyToUndefined(raw)

    // Validación
    const parse = AdmissionSchema.safeParse(input)
    if (!parse.success) {
      const validation_errors = parse.error.issues.map((i) => ({
        field: i.path.join('.') || 'root',
        message: i.message,
      }))
      return NextResponse.json({ validation_errors }, { status: 400 })
    }

    const payload = parse.data
    const appointmentDate = new Date(payload.fecha_hora_cita)
    if (appointmentDate.getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'La fecha de la cita no puede ser en el pasado.' },
        { status: 422 }
      )
    }

    const supabase = await createAdminClient()

    // Conflicto de horario por doctor (si se especifica)
    if (payload.doctor_id) {
      const { data: conflicting } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', payload.doctor_id)
        .eq('fecha_hora_cita', payload.fecha_hora_cita)
        .limit(1)
      if (conflicting && conflicting.length > 0) {
        return NextResponse.json(
          { error: 'Conflicto de horario', suggested_times: [] },
          { status: 409 }
        )
      }
    }

    // Duplicado de paciente por nombre+apellidos+fecha_nacimiento (si viene)
    if (payload.fecha_nacimiento) {
      const { data: existing } = await supabase
        .from('patients')
        .select('id,nombre,apellidos')
        .eq('nombre', payload.nombre)
        .eq('apellidos', payload.apellidos)
        .eq('fecha_nacimiento', payload.fecha_nacimiento)
        .limit(1)

      if (existing && existing.length > 0) {
        return NextResponse.json(
          {
            error: 'Paciente duplicado',
            code: 'duplicate_patient',
            existing_patient: existing[0],
          },
          { status: 409 }
        )
      }
    }

    // Insertar paciente
    const patientInsert = {
      nombre: payload.nombre,
      apellidos: payload.apellidos,
      telefono: payload.telefono,
      email: payload.email,
      edad: payload.edad,
      genero: payload.genero,
      fecha_nacimiento: payload.fecha_nacimiento,
      ciudad: payload.ciudad,
      estado: payload.estado,
      antecedentes_medicos: payload.antecedentes_medicos,
      numero_expediente: payload.numero_expediente,
      seguro_medico: payload.seguro_medico,
      comentarios_registro: payload.comentarios_registro,
      diagnostico_principal: payload.diagnostico_principal,
      diagnostico_principal_detalle: payload.diagnostico_principal_detalle,
      probabilidad_cirugia: payload.probabilidad_cirugia,
      contacto_emergencia_nombre: payload.contacto_emergencia_nombre,
      contacto_emergencia_telefono: payload.contacto_emergencia_telefono,
      creation_source: payload.creation_source,
    }

    const { data: patientData, error: patientError } = await supabase
      .from('patients')
      .insert(patientInsert)
      .select('id')
      .single()

    if (patientError) {
      // Duplicado por teléfono u otros constraints
      return NextResponse.json(
        { error: patientError.message },
        { status: 400 }
      )
    }

    const patient_id = patientData!.id as string

    // Insertar cita
    const appointmentInsert = {
      patient_id,
      doctor_id: payload.doctor_id,
      fecha_hora_cita: payload.fecha_hora_cita,
      motivos_consulta: payload.motivos_consulta,
      estado_cita: AppointmentStatusEnum.PROGRAMADA,
      agendado_por: payload.creado_por_id,
    }

    const { data: apptData, error: apptError } = await supabase
      .from('appointments')
      .insert(appointmentInsert)
      .select('id')
      .single()

    if (apptError) {
      // rollback básico
      await supabase.from('patients').delete().eq('id', patient_id)
      return NextResponse.json(
        { error: apptError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Admisión creada',
      patient_id,
      appointment_id: apptData!.id as string,
      next_steps: ['confirmar_cita', 'enviar_recordatorio'],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
