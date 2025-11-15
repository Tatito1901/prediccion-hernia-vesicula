import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { clinicYmd, clinicStartOfDayUtc, addClinicDaysAsUtcStart, formatClinicShortDate } from '@/lib/timezone'
import { ZDashboardPeriod, ZDashboardMetricsResponse } from '@/lib/validation/dashboard'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const startedAt = Date.now()
  const { searchParams } = new URL(req.url)
  const rawPeriod = searchParams.get('period') || '30d'

  const parsedPeriod = ZDashboardPeriod.safeParse(rawPeriod)
  const period: '7d' | '30d' | '90d' = parsedPeriod.success ? parsedPeriod.data : '30d'
  const periodDays = { '7d': 7, '30d': 30, '90d': 90 }[period]

  // Use user-scoped SSR client so RLS is enforced by default
  const usingAdmin = false
  const supabase = await createClient()
  const envMeta = {
    hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY),
    hasService: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  }

  // Time range boundaries in UTC respecting clinic timezone
  const todayYmd = clinicYmd(new Date())
  const todayStartUtc = clinicStartOfDayUtc(todayYmd)
  const tomorrowStartUtc = addClinicDaysAsUtcStart(todayYmd, 1)
  const periodStartUtc = addClinicDaysAsUtcStart(todayYmd, -(periodDays - 1))
  const periodStartYmd = clinicYmd(periodStartUtc)
  const previousPeriodStartUtc = addClinicDaysAsUtcStart(periodStartYmd, -periodDays)

  const metaBase = {
    usedClient: usingAdmin ? 'admin' : 'server',
    env: envMeta,
    params: { period, periodDays },
    ranges: {
      previousStart: previousPeriodStartUtc.toISOString(),
      currentStart: periodStartUtc.toISOString(),
      todayStart: todayStartUtc.toISOString(),
      tomorrowStart: tomorrowStartUtc.toISOString(),
    },
  }

  try {
    // Query appointments covering previous + current period up to tomorrow
    const appointmentsPromise = supabase
      .from('appointments')
      .select('fecha_hora_cita, estado_cita, motivos_consulta')
      .gte('fecha_hora_cita', previousPeriodStartUtc.toISOString())
      .lt('fecha_hora_cita', tomorrowStartUtc.toISOString())

    // Total patients (all-time)
    const totalPatientsPromise = supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })

    // Operated patients (all-time)
    const operatedPatientsPromise = supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('estado_paciente', 'operado')

    const [{ data: appointments, error: apptError }, { count: totalPatients, error: totalPatientsError }, { count: operatedPatients, error: operatedError }] = await Promise.all([
      appointmentsPromise,
      totalPatientsPromise,
      operatedPatientsPromise,
    ])

    // Graceful fallback for permission errors
    const isPermission = (msg?: string) => /permission denied|rls|row-level/i.test(msg || '')

    if (apptError && isPermission(apptError.message)) {
      const fallback = {
        primary: { todayConsultations: 0, totalPatients: totalPatients || 0, occupancyRate: 0 },
        clinical: { operatedPatients: operatedPatients || 0 },
        chartData: [],
        periodComparison: { changePercent: 0 },
        meta: { ...metaBase, error: 'appointments_permission_denied' },
      }
      return NextResponse.json(fallback)
    }
    if (totalPatientsError && !isPermission(totalPatientsError.message)) {
      throw totalPatientsError
    }
    if (operatedError && !isPermission(operatedError.message)) {
      throw operatedError
    }

    const safeAppointments: Array<{ fecha_hora_cita: string; estado_cita?: string | null; motivos_consulta?: string[] | null }> =
      Array.isArray(appointments) ? appointments : []

    // Initialize day buckets for current period
    const dayBuckets = new Map<string, { consultas: number; cirugias: number; label: string }>()
    for (let i = 0; i < periodDays; i++) {
      const d = addClinicDaysAsUtcStart(periodStartYmd, i)
      const key = clinicYmd(d)
      dayBuckets.set(key, { consultas: 0, cirugias: 0, label: formatClinicShortDate(d) })
    }

    // Counters
    let todayConsultations = 0
    let currentPeriodTotal = 0
    let previousPeriodTotal = 0

    for (const a of safeAppointments) {
      const d = new Date(a.fecha_hora_cita)
      if (d >= todayStartUtc && d < tomorrowStartUtc) {
        todayConsultations++
      }
      if (d >= periodStartUtc && d < tomorrowStartUtc) {
        currentPeriodTotal++
      } else if (d >= previousPeriodStartUtc && d < periodStartUtc) {
        previousPeriodTotal++
      }

      // Aggregate only completed consultations into current period chart
      if (d >= periodStartUtc && d < tomorrowStartUtc && (a.estado_cita === 'COMPLETADA')) {
        const key = clinicYmd(d)
        const entry = dayBuckets.get(key)
        if (entry) {
          entry.consultas++
          const motivos = (a.motivos_consulta || []).map(m => String(m).toLowerCase())
          if (motivos.some(m => m.includes('ciru') || m.includes('operac'))) {
            entry.cirugias++
          }
        }
      }
    }

    const chartData = Array.from(dayBuckets.values())
    const changePercent = previousPeriodTotal > 0
      ? Math.round(((currentPeriodTotal - previousPeriodTotal) / previousPeriodTotal) * 100)
      : (currentPeriodTotal > 0 ? 100 : 0)

    const targetDailyConsultations = 20
    const occupancyRate = Math.min(100, Math.round((todayConsultations / targetDailyConsultations) * 100))

    const response = {
      primary: {
        todayConsultations,
        totalPatients: totalPatients || 0,
        occupancyRate,
      },
      clinical: {
        operatedPatients: operatedPatients || 0,
      },
      chartData,
      periodComparison: {
        changePercent,
      },
      meta: {
        ...metaBase,
        tookMs: Date.now() - startedAt,
        sizes: {
          appointments: safeAppointments.length,
        },
      },
    }

    const validated = ZDashboardMetricsResponse.safeParse(response)
    if (!validated.success) {
      return NextResponse.json({ message: 'Invalid response shape', details: validated.error.flatten() }, { status: 500 })
    }

    return NextResponse.json(validated.data)
  } catch (error: unknown) {
    const err = error as Error
    return NextResponse.json({ message: 'Error al obtener métricas de dashboard', details: String(error?.message || error) }, { status: 500 })
  }
}
