import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { startOfDay, endOfDay, addDays } from 'date-fns'
import { z } from 'zod'

export const runtime = 'nodejs'

// Helpers
const validatePagination = (page?: string | null, pageSize?: string | null) => {
  const p = page ? Math.max(1, parseInt(page)) : 1
  const s = pageSize ? Math.min(100, Math.max(1, parseInt(pageSize))) : 15
  return { page: p, pageSize: s }
}

const buildDateRange = (dateFilter: string, startDate?: string | null, endDate?: string | null) => {
  const today = new Date()
  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)
  switch (dateFilter) {
    case 'all':
      // Return empty object to get all appointments
      return {}
    case 'today':
      return { gte: todayStart.toISOString(), lt: todayEnd.toISOString() }
    case 'week':
      // Next 7 days
      return { gte: todayStart.toISOString(), lt: addDays(todayStart, 7).toISOString() }
    case 'month':
      // Next 30 days
      return { gte: todayStart.toISOString(), lt: addDays(todayStart, 30).toISOString() }
    case 'future':
      return { gte: addDays(todayStart, 1).toISOString() }
    case 'past':
      return { lt: todayStart.toISOString() }
    case 'range':
      return {
        gte: startDate ? new Date(startDate).toISOString() : undefined,
        lt: endDate ? new Date(endDate).toISOString() : undefined,
      }
    default:
      return { gte: todayStart.toISOString(), lt: todayEnd.toISOString() }
  }
}

const buildSearchFilter = (q: string) => {
  const searchTerm = q.toLowerCase().trim()
  if (!searchTerm) return undefined as string | undefined
  // Nota: limitar búsqueda a columnas seguras del join de patients
  return `patients.nombre.ilike.%${searchTerm}%,patients.apellidos.ilike.%${searchTerm}%,patients.telefono.ilike.%${searchTerm}%`
}

const getCounts = async (supabase: any) => {
  const today = new Date()
  const todayStart = startOfDay(today).toISOString()
  const todayEnd = endOfDay(today).toISOString()
  const futureStart = addDays(startOfDay(today), 1).toISOString()
  const { data, error } = await supabase
    .from('appointments')
    .select('fecha_hora_cita, estado_cita')
  if (error) return { today_count: 0, future_count: 0, past_count: 0, total_appointments: 0 }
  let today_count = 0
  let future_count = 0
  let past_count = 0
  for (const a of data || []) {
    const d = new Date(a.fecha_hora_cita)
    if (d >= new Date(todayStart) && d < new Date(todayEnd)) today_count++
    else if (d >= new Date(futureStart)) future_count++
    else if (d < new Date(todayStart)) past_count++
  }
  return { today_count, future_count, past_count, total_appointments: today_count + future_count + past_count }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dateFilter = searchParams.get('dateFilter') || 'today'
  const search = searchParams.get('search') || ''
  const patientId = searchParams.get('patientId')
  const { page, pageSize } = validatePagination(searchParams.get('page'), searchParams.get('pageSize'))
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  // Debug flag to optionally include diagnostics in the response
  const debug = true // Force debug for troubleshooting

  // Prefer service role on the server when available to bypass RLS for read-only aggregation
  const usingAdmin = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  const envMeta = {
    hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasService: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  }
  const range = buildDateRange(dateFilter, startDate, endDate)
  const supabase = usingAdmin ? createAdminClient() : await createClient()
  const meta = {
    usedClient: usingAdmin ? 'admin' : 'server',
    ...envMeta,
    params: { dateFilter, search, patientId, page, pageSize, startDate, endDate },
    dateRange: range,
  }

  let query = supabase
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
    `, { count: 'exact' })

  if (range.gte) query = query.gte('fecha_hora_cita', range.gte)
  if (range.lt) query = query.lt('fecha_hora_cita', range.lt)
  if (patientId) query = query.eq('patient_id', patientId)
  const orFilter = buildSearchFilter(search)
  if (orFilter) query = query.or(orFilter)

  const start = (page - 1) * pageSize
  query = query
    .range(start, start + pageSize - 1)
    .order('fecha_hora_cita', { ascending: dateFilter !== 'past' })

  const { data, error, count } = await query
  
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
  
  if (error) {
    // Graceful fallback for dev environments without DB permissions
    const isPermission = /permission denied/i.test(error.message || '')
    if (isPermission) {
      console.warn('[api/appointments][GET] Permission denied fallback', {
        message: error.message,
        meta,
      })
      const pagination = { page, pageSize, totalCount: 0, totalPages: 0, hasMore: false }
      const summary = { total_appointments: 0, today_count: 0, future_count: 0, past_count: 0 }
      return NextResponse.json({ data: [], pagination, summary, ...(debug ? { meta } : {}) })
    }
    // Log non-permission errors with minimal meta when debug is enabled
    console.error('[api/appointments][GET] Error', {
      message: error.message,
      meta: debug ? meta : undefined,
    })
    return NextResponse.json({ error: 'Error al consultar citas', details: error.message }, { status: 500 })
  }

  const totalCount = count || 0
  const totalPages = Math.ceil(totalCount / pageSize)
  const hasMore = page < totalPages
  const pagination = { page, pageSize, totalCount, totalPages, hasMore }

  let summary: { total_appointments: number; today_count: number; future_count: number; past_count: number } | undefined
  if (dateFilter === 'today') {
    const counts = await getCounts(supabase)
    summary = counts
  }

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
  return NextResponse.json({ data: data || [], ...(summary ? { summary } : {}), pagination, ...(debug ? { meta } : {}) })
}

const CreateAppointmentSchema = z.object({
  patient_id: z.string().uuid(),
  fecha_hora_cita: z.string(),
  motivos_consulta: z.array(z.string().min(1)).min(1),
  estado_cita: z.string().optional(),
  doctor_id: z.string().uuid().optional().nullable(),
  notas_breves: z.string().optional(),
  es_primera_vez: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => ({}))
  const parse = CreateAppointmentSchema.safeParse(raw)
  if (!parse.success) {
    return NextResponse.json({ message: 'Datos inválidos', details: parse.error.errors }, { status: 400 })
  }
  const supabase = await createAdminClient()
  const payload = parse.data
  // Conflicto simple por doctor/fecha
  if (payload.doctor_id) {
    const { data: conflict } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', payload.doctor_id)
      .eq('fecha_hora_cita', payload.fecha_hora_cita)
      .limit(1)
    if (conflict && conflict.length > 0) {
      return NextResponse.json({ message: 'Conflicto de horario con el doctor' }, { status: 409 })
    }
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: payload.patient_id,
      fecha_hora_cita: payload.fecha_hora_cita,
      motivos_consulta: payload.motivos_consulta,
      estado_cita: payload.estado_cita || 'PROGRAMADA',
      doctor_id: payload.doctor_id ?? null,
      notas_breves: payload.notas_breves,
      es_primera_vez: payload.es_primera_vez ?? false,
    })
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

  if (error) {
    return NextResponse.json({ message: error.message || 'Error al crear la cita' }, { status: 400 })
  }

  return NextResponse.json(data)
}
