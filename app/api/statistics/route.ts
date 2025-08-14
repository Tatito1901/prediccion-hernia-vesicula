// app/api/statistics/route.ts - Unified statistics endpoint
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { ZStatisticsResponse } from '@/lib/validation/statistics';

export const runtime = 'nodejs';

const cacheHeaders = {
  'Cache-Control': 'max-age=60, s-maxage=300, stale-while-revalidate=600',
};

type RpcResult<T> = { data: T | null; error?: string | null };

export async function GET() {
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createServerClient();

  try {
    const now = new Date().toISOString();

    const fetchClinical = async (): Promise<RpcResult<any>> => {
      const { data, error } = await supabase.rpc('get_clinical_profile');
      if (error) return { data: null, error: error.message };
      return { data: data as any };
    };

    const fetchDemographic = async (): Promise<RpcResult<any>> => {
      const { data, error } = await supabase.rpc('get_demographic_profile');
      if (error) return { data: null, error: error.message };
      return { data: data as any };
    };

    const fetchOperational = async (): Promise<RpcResult<any>> => {
      const { data, error } = await supabase.rpc('get_operational_metrics');
      if (error) return { data: null, error: error.message };
      return { data: data as any };
    };

    const [clinicalRes, demographicRes, operationalRes] = await Promise.all([
      fetchClinical(),
      fetchDemographic(),
      fetchOperational(),
    ]);

    const partial = Boolean(
      clinicalRes.error || demographicRes.error || operationalRes.error
    );

    const response = {
      clinicalProfile: clinicalRes.data,
      demographicProfile: demographicRes.data,
      operationalMetrics: operationalRes.data,
      meta: { generatedAt: now, partial },
    };

    // Validate outgoing contract to avoid runtime surprises
    const parsed = ZStatisticsResponse.safeParse(response);
    if (!parsed.success) {
      // If schema validation fails, include diagnostics for debugging
      return NextResponse.json(
        {
          message: 'Unified statistics schema validation failed',
          issues: parsed.error.issues,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed.data, { headers: { ...cacheHeaders } });
  } catch (error: any) {
    console.error('❌ [/api/statistics] error:', error);
    return NextResponse.json(
      { message: 'Error aggregating statistics', error: error?.message },
      { status: 500 }
    );
  }
}
