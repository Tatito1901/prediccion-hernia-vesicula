// app/api/dashboard/charts/route.ts - API para datos de gráficos del dashboard (agregados en backend)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { dbDiagnosisToDisplay } from '@/lib/validation/enums';
import { jsonError } from '@/lib/errors';

// Ensure Node.js runtime when admin client may be used
export const runtime = 'nodejs';

// Configuración de cache (2m browser, 5m edge, SWR 15m)
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=900',
};

// Parse YYYY-MM-DD como fecha local evitando shift por timezone
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

// Categorizar diagnósticos en macro-grupos para Pie chart
function categorizeDiagnosis(dbDiagnosis: string | null | undefined): 'Hernias' | 'Vesículas' | 'Otras' {
  if (!dbDiagnosis) return 'Otras';
  const token = String(dbDiagnosis).toUpperCase();
  if (token.includes('HERNIA')) return 'Hernias';
  // Considerar todos los relacionados a vesícula / biliares
  if (
    token.includes('VESIC') ||
    token.includes('COLECIST') ||
    token.includes('COLELIT') ||
    token.includes('COLEDOC') ||
    token.includes('POLIPOS_VESICULA')
  ) {
    return 'Vesículas';
  }
  return 'Otras';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate'); // YYYY-MM-DD
    const endDateParam = searchParams.get('endDate'); // YYYY-MM-DD
    const topNParam = searchParams.get('topN');
    const topN = Math.max(1, Math.min(20, parseInt(topNParam || '5', 10)));

    // Rango por defecto: últimos 30 días
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    const start = startOfDayLocal(startDateParam ? parseDateOnly(startDateParam) : defaultStart);
    const end = endOfDayLocal(endDateParam ? parseDateOnly(endDateParam) : now);

    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : await createClient();

    // Consulta base: solo columnas necesarias para agregación
    let query = supabase
      .from('patients')
      .select('created_at, diagnostico_principal');

    // Filtro de rango de fechas (por fecha de creación del paciente)
    query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());

    const { data, error } = await query;

    if (error) {
      console.error('[Charts API] DB error:', error);
      return jsonError(500, 'Error al obtener datos para gráficos');
    }

    const rows = data || [];

    // 1) Timeline por día
    const timelineMap = new Map<string, number>();
    for (const r of rows) {
      try {
        const d = new Date(r.created_at);
        if (isNaN(d.getTime())) continue;
        const key = d.toISOString().split('T')[0];
        timelineMap.set(key, (timelineMap.get(key) || 0) + 1);
      } catch (_) {
        // ignore
      }
    }
    const timelineData = Array.from(timelineMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 2) Diagnósticos más comunes (Top N)
    const diagCount = new Map<string, number>();
    for (const r of rows) {
      const diag = (r as any).diagnostico_principal as string | null | undefined;
      const key = diag ?? 'SIN_DIAGNOSTICO';
      diagCount.set(key, (diagCount.get(key) || 0) + 1);
    }

    const commonDiagnoses = Array.from(diagCount.entries())
      .map(([dbName, total]) => ({ name: dbDiagnosisToDisplay(dbName as any), total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, topN);

    // 3) Distribución por patología
    const categoryCount = new Map<string, number>();
    for (const r of rows) {
      const diag = (r as any).diagnostico_principal as string | null | undefined;
      const cat = categorizeDiagnosis(diag);
      categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
    }
    const pathologyDistribution = Array.from(categoryCount.entries()).map(([name, total]) => ({ name, total }));

    return NextResponse.json(
      {
        timelineData,
        commonDiagnoses,
        pathologyDistribution,
        params: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          topN,
        },
        calculatedAt: new Date().toISOString(),
      },
      { headers: { ...CACHE_HEADERS } }
    );
  } catch (error) {
    console.error('[Charts API] Unexpected error:', error);
    return jsonError(500, 'Error interno del servidor');
  }
}
