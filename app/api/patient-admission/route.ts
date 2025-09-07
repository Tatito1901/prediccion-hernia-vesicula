import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { parseISO, isValid as isValidDate } from 'date-fns'
import { createClient } from '@/utils/supabase/server'
import { createApiResponse, createApiError } from '@/lib/api-response-types'
import { ZDiagnosisDb } from '@/lib/constants'
import { mxNow } from '@/utils/datetime'

export const runtime = 'nodejs'

// Minimal GET to satisfy Next.js module requirements (not used by UI)
export async function GET() {
  return NextResponse.json({ message: 'patient-admission API' })
}

// Helpers
const hasTimezone = (value: string) => /([zZ]|[+-]\d{2}:\d{2})$/.test(value)

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
  diagnostico_principal: ZDiagnosisDb,
  fecha_hora_cita: z
    .string()
    .refine((s) => {
      // Debe ser ISO 8601 válido y contener zona horaria explícita (Z u offset)
      if (!hasTimezone(s)) return false
      const d = parseISO(s)
      return isValidDate(d)
    }, 'fecha_hora_cita debe ser ISO 8601 con zona horaria (p.ej. 2025-01-01T10:00:00-06:00)'),
  motivos_consulta: z.array(ZDiagnosisDb).min(1),
  diagnostico_principal_detalle: z.string().optional(),
  telefono: z
    .string()
    .regex(/^[0-9+\-\s()]{10,15}$/i, 'Teléfono inválido')
    .optional(),
  email: z.string().email().optional(),
  genero: z.enum(['Masculino', 'Femenino', 'Otro']).optional(),
  // Permitir fecha YYYY-MM-DD o ISO con zona horaria; se normaliza en SQL
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
    const appointmentDate = parseISO(payload.fecha_hora_cita)
    if (!isValidDate(appointmentDate)) {
      const errorResponse = createApiError('fecha_hora_cita inválida', {
        code: 'INVALID_DATE',
        details: { provided_date: payload.fecha_hora_cita }
      })
      return NextResponse.json(errorResponse, { status: 400 })
    }
    if (appointmentDate.getTime() < mxNow().getTime()) {
      const errorResponse = createApiError('La fecha de la cita no puede ser en el pasado.', {
        code: 'INVALID_DATE',
        details: { provided_date: payload.fecha_hora_cita, current_date: mxNow().toISOString() }
      });
      return NextResponse.json(errorResponse, { status: 422 });
    }

    const supabase = await createClient()

    // Crear paciente + cita de forma atómica vía RPC transaccional (security definer)
    const admin = supabase

    const p_motivo_cita = (
      (payload.diagnostico_principal_detalle && payload.diagnostico_principal_detalle.trim()) ||
      (Array.isArray(payload.motivos_consulta) && payload.motivos_consulta.length > 0
        ? payload.motivos_consulta.join(', ')
        : payload.diagnostico_principal)
    ) as string

    // Construcción de argumentos para RPC (incluyendo edad requerida por la función SQL)
    const p_edad_calculada = (() => {
      const dob = payload.fecha_nacimiento;
      if (!dob) return 0;
      const birth = new Date(dob);
      if (Number.isNaN(birth.getTime())) return 0;
      const diffMs = Date.now() - birth.getTime();
      const years = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
      return Math.max(0, years);
    })();

    const rpcArgs: any = {
      p_nombre: payload.nombre,
      p_apellidos: payload.apellidos,
      p_telefono: payload.telefono ?? '',
      p_email: payload.email ?? '',
      p_edad: p_edad_calculada,
      p_fecha_nacimiento: payload.fecha_nacimiento ?? null,
      p_diagnostico_principal: payload.diagnostico_principal,
      p_comentarios_registro: payload.comentarios_registro ?? '',
      p_probabilidad_cirugia: payload.probabilidad_cirugia ?? 0,
      p_fecha_hora_cita: payload.fecha_hora_cita,
      p_motivo_cita,
      p_doctor_id: payload.doctor_id ?? undefined,
      p_creado_por_id: payload.creado_por_id ?? undefined,
    }

    const { data: rpcData, error: rpcError } = await admin.rpc('create_patient_and_appointment', rpcArgs)

    if (rpcError) {
      // Map some known errors to HTTP status codes
      const msg = (rpcError.message || '').toLowerCase()
      const isDuplicate = msg.includes('paciente duplicado') || msg.includes('duplicate patient')
      const isScheduleConflict = msg.includes('horario no disponible')
      const isPastDate = msg.includes('pasado')
      const status = isDuplicate ? 409 : isScheduleConflict ? 409 : isPastDate ? 422 : 400
      const errorResponse = createApiError(rpcError.message, {
        code: isDuplicate ? 'DUPLICATE_PATIENT' : isScheduleConflict ? 'SCHEDULE_CONFLICT' : 'ADMISSION_RPC_ERROR',
        details: { supabase_error: rpcError }
      })
      return NextResponse.json(errorResponse, { status })
    }

    const result = rpcData && rpcData[0]
    if (!result || !result.success) {
      const errorResponse = createApiError(result?.message || 'No se pudo completar la admisión', {
        code: 'ADMISSION_FAILED'
      })
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const successResponse = createApiResponse({
      patient_id: result.created_patient_id,
      appointment_id: result.created_appointment_id,
      next_steps: ['confirmar_cita', 'enviar_recordatorio'],
    }, {
      message: 'Admisión creada exitosamente'
    })

    return NextResponse.json(successResponse, { status: 201 })
  } catch (error: any) {
    const errorResponse = createApiError(error?.message || 'Error interno del servidor', {
      code: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? { stack: error?.stack } : undefined
    });
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
