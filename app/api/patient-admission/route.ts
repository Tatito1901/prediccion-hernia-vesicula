import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { ADMISSION_BUSINESS_RULES } from '@/lib/admission-business-rules'
import { createApiResponse, createApiError } from '@/lib/api-response-types'
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
        code: i.code,
      }))
      const errorResponse = createApiError('Errores de validación', {
        validation_errors,
        code: 'VALIDATION_ERROR',
      })
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const payload = parse.data
    const appointmentDate = new Date(payload.fecha_hora_cita)
    if (appointmentDate.getTime() < Date.now()) {
      const errorResponse = createApiError('La fecha de la cita no puede ser en el pasado.', {
        code: 'INVALID_DATE',
        details: { provided_date: payload.fecha_hora_cita, current_date: new Date().toISOString() }
      });
      return NextResponse.json(errorResponse, { status: 422 });
    }

    const supabase = await createClient()

    // Conflicto de horario por doctor (si se especifica)
    if (payload.doctor_id) {
      const { data: conflicting } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', payload.doctor_id)
        .eq('fecha_hora_cita', payload.fecha_hora_cita)
        .limit(1)
      if (conflicting && conflicting.length > 0) {
        const errorResponse = createApiError('Conflicto de horario', {
          code: 'SCHEDULE_CONFLICT',
          details: { conflicting_appointment_id: conflicting[0].id },
          suggested_actions: ['Seleccionar otro horario', 'Contactar al doctor']
        });
        return NextResponse.json(errorResponse, { status: 409 });
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
        const errorResponse = createApiError('Paciente duplicado', {
          code: 'DUPLICATE_PATIENT',
          details: { existing_patient: existing[0] },
          suggested_actions: ['Verificar datos del paciente', 'Actualizar registro existente']
        });
        return NextResponse.json(errorResponse, { status: 409 });
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
      const errorResponse = createApiError(patientError.message, {
        code: 'PATIENT_CREATION_ERROR',
        details: { supabase_error: patientError }
      });
      return NextResponse.json(errorResponse, { status: 400 });
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
      const errorResponse = createApiError(apptError.message, {
        code: 'APPOINTMENT_CREATION_ERROR',
        details: { supabase_error: apptError, patient_id }
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const successResponse = createApiResponse({
      patient_id,
      appointment_id: apptData!.id as string,
      next_steps: ['confirmar_cita', 'enviar_recordatorio'],
    }, {
      message: 'Admisión creada exitosamente'
    });
    
    return NextResponse.json(successResponse, { status: 201 });
  } catch (error: any) {
    const errorResponse = createApiError(error?.message || 'Error interno del servidor', {
      code: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? { stack: error?.stack } : undefined
    });
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
