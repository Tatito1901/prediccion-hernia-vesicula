// app/api/surveys/stats/route.ts - Analíticas agregadas de encuestas (survey_responses)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

// Cache similar al dashboard
const CACHE_HEADERS = {
  'Cache-Control': 'max-age=120, s-maxage=300, stale-while-revalidate=900',
};

function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split('-').map((v) => parseInt(v, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

function startOfDayLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDayLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function dateKey(d: Date, groupBy: 'day'|'week'|'month'): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  if (groupBy === 'day') return `${y}-${m}-${day}`;
  if (groupBy === 'week') {
    // ISO week approx: use Thursday week rule
    const tmp = new Date(d);
    tmp.setHours(0,0,0,0);
    tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
    const week1 = new Date(tmp.getFullYear(), 0, 4);
    const w = 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${tmp.getFullYear()}-W${String(w).padStart(2,'0')}`;
  }
  return `${y}-${m}`; // month
}

// Helper para conteos de arrays (strings)
function countValues(values: (string|null|undefined)[], opts?: { normalize?: boolean }) {
  const map = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    let key = String(v).trim();
    if (!key) continue;
    if (opts?.normalize) key = key.toUpperCase();
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries()).map(([name, total]) => ({ name, total })).sort((a,b)=>b.total-a.total);
}

// Helper para conteos de arrays de listas (multi-selección)
function countFromStringArrays(arrays: (string[]|null|undefined)[], opts?: { normalize?: boolean }) {
  const values: string[] = [];
  for (const a of arrays) {
    if (!a) continue;
    for (const v of a) values.push(v);
  }
  return countValues(values, opts);
}

// Buckets para intensidad de dolor 0..10
function bucketPainIntensity(values: (number|null)[]) {
  const buckets = [
    { bucket: '0-2', min: 0, max: 2 },
    { bucket: '3-4', min: 3, max: 4 },
    { bucket: '5-6', min: 5, max: 6 },
    { bucket: '7-8', min: 7, max: 8 },
    { bucket: '9-10', min: 9, max: 10 },
  ];
  const counts = new Map<string, number>();
  for (const b of buckets) counts.set(b.bucket, 0);
  for (const v of values) {
    if (typeof v !== 'number') continue;
    for (const b of buckets) {
      if (v >= b.min && v <= b.max) {
        counts.set(b.bucket, (counts.get(b.bucket) || 0) + 1);
        break;
      }
    }
  }
  return buckets.map(b => ({ name: b.bucket, total: counts.get(b.bucket) || 0 }));
}

// Buckets de edad
function bucketAges(values: (number|null)[]) {
  const buckets = [
    { bucket: '0-17', min: 0, max: 17 },
    { bucket: '18-29', min: 18, max: 29 },
    { bucket: '30-44', min: 30, max: 44 },
    { bucket: '45-59', min: 45, max: 59 },
    { bucket: '60+', min: 60, max: 200 },
  ];
  const counts = new Map<string, number>();
  for (const b of buckets) counts.set(b.bucket, 0);
  for (const v of values) {
    if (typeof v !== 'number') continue;
    for (const b of buckets) {
      if (v >= b.min && v <= b.max) {
        counts.set(b.bucket, (counts.get(b.bucket) || 0) + 1);
        break;
      }
    }
  }
  return buckets.map(b => ({ name: b.bucket, total: counts.get(b.bucket) || 0 }));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate'); // YYYY-MM-DD
    const endDateParam = searchParams.get('endDate'); // YYYY-MM-DD
    const groupBy = (searchParams.get('groupBy') as 'day'|'week'|'month') || 'month';

    const now = new Date();
    const defaultStart = new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000); // 90 días
    const start = startOfDayLocal(startDateParam ? parseDateOnly(startDateParam) : defaultStart);
    const end = endOfDayLocal(endDateParam ? parseDateOnly(endDateParam) : now);

    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

    // Seleccionar solo columnas necesarias
    const { data, error } = await supabase
      .from('survey_responses')
      .select(`
        completed_at,
        severidad_sintomas,
        intensidad_dolor_actual,
        diagnostico_previo,
        motivo_visita,
        como_nos_conocio,
        seguro_medico,
        tiempo_toma_decision,
        aspectos_mas_importantes,
        preocupaciones_principales,
        sintomas_adicionales,
        ubicacion_origen,
        alcaldia_cdmx,
        municipio_edomex,
        edad,
        desde_cuando_sintoma,
        plazo_resolucion_ideal,
        estudios_medicos_previos
      `)
      .gte('completed_at', start.toISOString())
      .lte('completed_at', end.toISOString());

    if (error) {
      console.error('[Survey Stats API] DB error:', error);
      return NextResponse.json({ error: 'Error al obtener analíticas de encuestas' }, { status: 500 });
    }

    const rows = data || [];

    // Totales y promedios
    const responsesCount = rows.length;
    const painValues = rows.map((r: any) => r.intensidad_dolor_actual as number | null).filter((v) => typeof v === 'number') as number[];
    const avgPain = painValues.length ? painValues.reduce((a,b)=>a+b,0) / painValues.length : null;
    const prevDiagRate = rows.length ? rows.reduce((acc: number, r: any) => acc + (r.diagnostico_previo ? 1 : 0), 0) / rows.length : 0;

    // Distribuciones
    const severityDist = countValues(rows.map((r: any) => r.severidad_sintomas));
    const motivoDist = countValues(rows.map((r: any) => r.motivo_visita));
    const seguroDist = countValues(rows.map((r: any) => r.seguro_medico));
    const decisionTimeDist = countValues(rows.map((r: any) => r.tiempo_toma_decision));
    const desdeCuandoDist = countValues(rows.map((r: any) => r.desde_cuando_sintoma));
    const plazoIdealDist = countValues(rows.map((r: any) => r.plazo_resolucion_ideal));
    const origenDist = countValues(rows.map((r: any) => r.ubicacion_origen));
    const alcaldiaDist = countValues(rows.map((r: any) => r.alcaldia_cdmx));
    const municipioDist = countValues(rows.map((r: any) => r.municipio_edomex));

    const concernsTop = countFromStringArrays(rows.map((r: any) => r.preocupaciones_principales));
    const importantAspectsTop = countFromStringArrays(rows.map((r: any) => r.aspectos_mas_importantes));
    const sintomasTop = countFromStringArrays(rows.map((r: any) => r.sintomas_adicionales));

    const painHistogram = bucketPainIntensity(painValues);
    const ageHistogram = bucketAges(rows.map((r: any) => r.edad as number | null));

    // Series temporales por fecha de completado
    const seriesMap = new Map<string, { responses: number; avg_pain_sum: number; avg_pain_n: number }>();
    for (const r of rows as any[]) {
      const d = r.completed_at ? new Date(r.completed_at) : null;
      if (!d || isNaN(d.getTime())) continue;
      const key = dateKey(d, groupBy);
      const cur = seriesMap.get(key) || { responses: 0, avg_pain_sum: 0, avg_pain_n: 0 };
      cur.responses += 1;
      if (typeof r.intensidad_dolor_actual === 'number') {
        cur.avg_pain_sum += r.intensidad_dolor_actual;
        cur.avg_pain_n += 1;
      }
      seriesMap.set(key, cur);
    }
    const timeseries = Array.from(seriesMap.entries())
      .map(([period, v]) => ({ period, responses: v.responses, avg_pain: v.avg_pain_n ? v.avg_pain_sum / v.avg_pain_n : null }))
      .sort((a,b) => a.period.localeCompare(b.period));

    return NextResponse.json({
      summary: {
        responses_count: responsesCount,
        avg_pain: avgPain,
        prev_diagnosis_rate: prevDiagRate,
        period: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          groupBy,
        },
      },
      histograms: {
        pain_intensity: painHistogram,
        age: ageHistogram,
      },
      distributions: {
        severity: severityDist,
        decision_time: decisionTimeDist,
        desde_cuando: desdeCuandoDist,
        plazo_resolucion_ideal: plazoIdealDist,
        motivo_visita: motivoDist,
        seguro_medico: seguroDist,
      },
      geolocation: {
        origen: origenDist,
        alcaldia_cdmx: alcaldiaDist,
        municipio_edomex: municipioDist,
      },
      top_lists: {
        concerns: concernsTop,
        important_aspects: importantAspectsTop,
        sintomas: sintomasTop,
      },
      timeseries,
      calculatedAt: new Date().toISOString(),
    }, { headers: { ...CACHE_HEADERS } });
  } catch (error: any) {
    console.error('[Survey Stats API] Unexpected error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
