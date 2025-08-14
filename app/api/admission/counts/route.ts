// app/api/admission/counts/route.ts - API OPTIMIZADA PARA CONTADORES DE ADMISIÓN
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// ==================== CONFIGURACIÓN ====================
const CACHE_CONFIG = {
  'Cache-Control': 'max-age=60, s-maxage=120, stale-while-revalidate=300',
};

// ==================== HELPERS ====================
const getTodayRange = () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  
  return {
    start: todayStart.toISOString(),
    end: todayEnd.toISOString(),
  };
};

// ==================== ENDPOINT PRINCIPAL ====================
export async function GET() {
  // Deprecated: use dashboard endpoints instead
  // Prefer `/api/dashboard/summary` or `/api/admission/appointments` for aggregated counts.
  return NextResponse.json(
    { error: 'Endpoint deprecado. Use /api/dashboard/summary o /api/admission/appointments' },
    { status: 410 }
  );
}