import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { clinicYmd, clinicStartOfDayUtc, addClinicDaysAsUtcStart } from '@/lib/timezone'
import { z } from 'zod'
import { ZDiagnosisDb, ZAppointmentStatus } from '@/lib/constants'
import type { Database } from '@/lib/types/database.types'
import { getAvailableActions, suggestNextAction } from '@/lib/admission-business-rules'
import { mxNow } from '@/utils/datetime'

export const runtime = 'nodejs'

// Helpers
const validatePagination = (page?: string | null, pageSize?: string | null) => {
  const p = page ? Math.max(1, parseInt(page)) : 1
  const s = pageSize ? Math.min(100, Math.max(1, parseInt(pageSize))) : 15
  return { page: p, pageSize: s }
}

const buildDateRange = (dateFilter: string, startDate?: string | null, endDate?: string | null) => {
  const todayYmd = clinicYmd(new Date())
  const todayStartUtc = clinicStartOfDayUtc(todayYmd)

  switch (dateFilter) {
    case 'all':
      // Return empty object to get all appointments
      return {}
    case 'today': {
      const tomorrowStartUtc = addClinicDaysAsUtcStart(todayYmd, 1)
      return { gte: todayStartUtc.toISOString(), lt: tomorrowStartUtc.toISOString() }
    }
    case 'week': {
      const weekEndUtc = addClinicDaysAsUtcStart(todayYmd, 7)
      return { gte: todayStartUtc.toISOString(), lt: weekEndUtc.toISOString() }
    }
    case 'month': {
      const monthEndUtc = addClinicDaysAsUtcStart(todayYmd, 30)
      return { gte: todayStartUtc.toISOString(), lt: monthEndUtc.toISOString() }
    }
    case 'future': {
      const tomorrowStartUtc = addClinicDaysAsUtcStart(todayYmd, 1)
      return { gte: tomorrowStartUtc.toISOString() }
    }
    case 'past':
      return { lt: todayStartUtc.toISOString() }
    case 'range': {
      const gte = startDate ? clinicStartOfDayUtc(startDate).toISOString() : undefined
      // Use exclusive upper bound at the start of the day AFTER the provided end date
      const lt = endDate ? addClinicDaysAsUtcStart(endDate, 1).toISOString() : undefined
      return { gte, lt }
    }
    default: {
      const tomorrowStartUtc = addClinicDaysAsUtcStart(todayYmd, 1)
      return { gte: todayStartUtc.toISOString(), lt: tomorrowStartUtc.toISOString() }
    }
  }
}

const buildSearchFilter = (q: string) => {
  const searchTerm = q.toLowerCase().trim()
  if (!searchTerm) return undefined as string | undefined
  // Nota: limitar búsqueda a columnas seguras del join de patients
  return `patients.nombre.ilike.%${searchTerm}%,patients.apellidos.ilike.%${searchTerm}%,patients.telefono.ilike.%${searchTerm}%`
}

const getCounts = async (supabase: any) => {
  const todayYmd = clinicYmd(new Date())
  const todayStart = clinicStartOfDayUtc(todayYmd).toISOString()
  const tomorrowStart = addClinicDaysAsUtcStart(todayYmd, 1).toISOString()

  const [todayRes, futureRes, pastRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('fecha_hora_cita', todayStart)
      .lt('fecha_hora_cita', tomorrowStart),
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('fecha_hora_cita', tomorrowStart),
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .lt('fecha_hora_cita', todayStart),
  ])

  const today_count = todayRes?.count || 0
  const future_count = futureRes?.count || 0
  const past_count = pastRes?.count || 0
  return { today_count, future_count, past_count, total_appointments: today_count + future_count + past_count }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dateFilter = searchParams.get('dateFilter') || 'today'
  const search = searchParams.get('search') || ''
  const patientId = searchParams.get('patientId')
  const status = searchParams.get('status') || ''
  const { page, pageSize } = validatePagination(searchParams.get('page'), searchParams.get('pageSize'))
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const includePatient = (searchParams.get('includePatient') || 'true') === 'true'

  // Debug flag to optionally include diagnostics in the response
  const debug = process.env.NODE_ENV === 'development'

  // Use user-scoped SSR client so RLS is enforced by default
  const usingAdmin = false
  const envMeta = {
    hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasService: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  }
  const range = buildDateRange(dateFilter, startDate, endDate)
  const supabase = await createClient()
  const meta = {
    usedClient: 'server' as const,
    ...envMeta,
    params: { dateFilter, search, patientId, status, page, pageSize, startDate, endDate },
    dateRange: range,
  }

  // Build dynamic select based on includePatient flag
  // If search is present, force join with patients to allow filtering by patient fields
  const includePatientFinal = includePatient || Boolean(search)
  const baseFields = [
    'id',
    'patient_id',
    'doctor_id',
    'created_at',
    'updated_at',
    'fecha_hora_cita',
    'motivos_consulta',
    'estado_cita',
    'notas_breves',
    'es_primera_vez',
  ].join(',\n      ')

  const patientJoin = `patients:patient_id (
        id, nombre, apellidos, telefono, email, diagnostico_principal, estado_paciente
      )`

  const selectClause = includePatientFinal
    ? `${baseFields},\n      ${patientJoin}`
    : baseFields

  let query = supabase
    .from('appointments')
    .select(selectClause, { count: 'exact' })

  if (range.gte) query = query.gte('fecha_hora_cita', range.gte)
  if (range.lt) query = query.lt('fecha_hora_cita', range.lt)
  if (patientId) query = query.eq('patient_id', patientId)
  if (status && status !== 'all') {
    // Validate against enum when possible; fall back to raw value
    const parsed = ZAppointmentStatus.safeParse(status)
    const validStatus = parsed.success ? parsed.data : status
    query = query.eq('estado_cita', validStatus)
  }
  const orFilter = buildSearchFilter(search)
  if (orFilter) query = query.or(orFilter)

  const start = (page - 1) * pageSize
  query = query
    .range(start, start + pageSize - 1)
    .order('fecha_hora_cita', { ascending: dateFilter !== 'past' })

  const { data, error, count } = await query
  
  if (debug) {
    // Debug: Log query results
    console.log('🔍 [/api/appointments][GET] Query result:', {
      dataLength: data?.length || 0,
      count,
      error: error?.message,
      hasData: !!data,
      firstItem: data?.[0],
      dateFilter,
      range
    });
  }
  
  if (error) {
    // Graceful fallback for dev environments without DB permissions
    const isPermission = /permission denied/i.test(error.message || '')
    if (isPermission) {
      const pagination = { page, pageSize, totalCount: 0, totalPages: 0, hasMore: false }
      const summary = { total_appointments: 0, today_count: 0, future_count: 0, past_count: 0 }
      return NextResponse.json({ data: [], pagination, summary, ...(debug ? { meta } : {}) })
    }
    // Log non-permission errors with minimal meta when debug is enabled
    return NextResponse.json({ error: 'Error al consultar citas', details: error.message }, { status: 500 })
  }

  const totalCount = count || 0
  const totalPages = Math.ceil(totalCount / pageSize)
  const hasMore = page < totalPages
  const pagination = { page, pageSize, totalCount, totalPages, hasMore }

  const summary: { total_appointments: number; today_count: number; future_count: number; past_count: number } = await getCounts(supabase)

  // Success diagnostic log when debug flag is set
  if (debug) {
    try {
      console.info('[api/appointments][GET] Success', {
        dataCount: (data || []).length,
        pagination,
        ...(summary ? { summary } : {}),
        meta,
      })
    } catch {}
  }
  // Enrich each appointment with backend-calculated business-rule action flags
  const now = mxNow()
  const enriched = (data || []).map((row: any) => {
    const apptLike = {
      fecha_hora_cita: row.fecha_hora_cita,
      estado_cita: row.estado_cita,
      updated_at: row.updated_at ?? null,
    }
    const actionList = getAvailableActions(apptLike as any, now)
    const available = actionList.filter(a => a.valid).map(a => a.action)
    const action_reasons = Object.fromEntries(
      actionList.filter(a => !a.valid && a.reason).map(a => [a.action, a.reason as string])
    )
    const primary = suggestNextAction(apptLike as any, now)
    const actions = {
      canCheckIn: available.includes('checkIn'),
      canComplete: available.includes('complete'),
      canCancel: available.includes('cancel'),
      canNoShow: available.includes('noShow'),
      canReschedule: available.includes('reschedule'),
      available,
      primary,
    }
    return { ...row, actions, action_reasons, suggested_action: primary }
  })

  return NextResponse.json({ data: enriched, summary, pagination, ...(debug ? { meta } : {}) })
}

const CreateAppointmentSchema = z.object({
  patient_id: z.string().uuid(),
  fecha_hora_cita: z.string(),
  motivos_consulta: z.array(ZDiagnosisDb).min(1),
  estado_cita: ZAppointmentStatus.optional(),
  doctor_id: z.string().uuid().optional().nullable(),
  notas_breves: z.string().optional(),
  es_primera_vez: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => ({}))
  const parse = CreateAppointmentSchema.safeParse(raw)
  if (!parse.success) {
    return NextResponse.json({ message: 'Datos inválidos', details: parse.error.issues }, { status: 400 })
  }
  const supabase = await createClient()
  const payload = parse.data
  // Programación atómica vía RPC con validación de traslapes
  const rpcArgs: any = {
    p_action: 'create',
    p_patient_id: payload.patient_id,
    ...(payload.doctor_id !== undefined ? { p_doctor_id: payload.doctor_id ?? null } : {}),
    p_fecha_hora_cita: payload.fecha_hora_cita,
    ...(payload.estado_cita !== undefined ? { p_estado_cita: payload.estado_cita } : {}),
    p_motivos_consulta: payload.motivos_consulta,
    ...(payload.notas_breves !== undefined ? { p_notas_breves: payload.notas_breves } : {}),
    ...(payload.es_primera_vez !== undefined ? { p_es_primera_vez: payload.es_primera_vez } : {}),
  }
  const { data: rpcData, error: rpcError } = await (supabase as any).rpc('schedule_appointment', rpcArgs)
  if (rpcError) {
    return NextResponse.json({ message: rpcError.message || 'Error al programar la cita' }, { status: 400 })
  }
  const result = (rpcData as any) && (rpcData as any)[0]
  if (!result || !result.success || !result.appointment_id) {
    const msg = result?.message || 'No se pudo programar la cita'
    const status = /horario no disponible/i.test(msg) ? 409 : 400
    return NextResponse.json({ message: msg }, { status })
  }

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
    .eq('id', result.appointment_id)
    .single()

  if (error) {
    return NextResponse.json({ message: error.message || 'Error al crear la cita' }, { status: 400 })
  }

  // Enrich the single created appointment as well
  try {
    const now = mxNow()
    const apptLike = {
      fecha_hora_cita: (data as any).fecha_hora_cita,
      estado_cita: (data as any).estado_cita,
      updated_at: (data as any).updated_at ?? null,
    }
    const actionList = getAvailableActions(apptLike as any, now)
    const available = actionList.filter(a => a.valid).map(a => a.action)
    const action_reasons = Object.fromEntries(
      actionList.filter(a => !a.valid && a.reason).map(a => [a.action, a.reason as string])
    )
    const primary = suggestNextAction(apptLike as any, now)
    const actions = {
      canCheckIn: available.includes('checkIn'),
      canComplete: available.includes('complete'),
      canCancel: available.includes('cancel'),
      canNoShow: available.includes('noShow'),
      canReschedule: available.includes('reschedule'),
      available,
      primary,
    }
    return NextResponse.json({ ...(data as any), actions, action_reasons, suggested_action: primary })
  } catch {
    // Fallback to raw data if enrichment fails for any reason
    return NextResponse.json(data)
  }
}
