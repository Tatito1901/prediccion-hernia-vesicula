// app/api/statistics/route.ts - Unified statistics endpoint
import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/errors';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { ZStatisticsResponse } from '@/lib/validation/statistics';

export const runtime = 'nodejs';

const cacheHeaders = {
  'Cache-Control': 'max-age=60, s-maxage=300, stale-while-revalidate=600',
};

type RpcResult<T> = { data: T | null; error?: string | null };

export async function GET(req: Request) {
  const usedClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'admin' : 'server';
  const supabase = usedClient === 'admin' ? createAdminClient() : await createServerClient();

  console.log('🚀 [/api/statistics] Iniciando GET request');
  console.log('🔑 [/api/statistics] Tipo de cliente Supabase:', usedClient);
  console.log('🌍 [/api/statistics] Variables de entorno:', {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
    SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV
  });

  try {
    const now = new Date().toISOString();
    const url = new URL(req.url);
    const debug = url.searchParams.get('debug') === '1' || url.searchParams.get('debug') === 'true';
    const inspect = url.searchParams.get('inspect') === '1' || url.searchParams.get('inspect') === 'true';

    const timings: Record<string, number> = {};
    const errors: Record<string, string | undefined> = {};

    const getErrMsg = (err: unknown): string | undefined => {
      if (typeof err === 'string') return err;
      if (err && typeof err === 'object' && 'message' in err) {
        const m = (err as { message?: unknown }).message;
        return typeof m === 'string' ? m : undefined;
      }
      return undefined;
    };

    // Minimal interface to call RPCs not present in generated Database types
    type RpcClient = {
      rpc<T, A extends Record<string, unknown> = Record<string, never>>(
        fn: string,
        args?: A
      ): Promise<{ data: T | null; error: { message?: string; code?: string; details?: string } | null }>
    };
    const rpcClient = supabase as unknown as RpcClient;

    const fetchClinical = async (): Promise<RpcResult<unknown>> => {
      const t0 = Date.now();
      const { data, error } = await rpcClient.rpc<unknown, Record<string, never>>('get_clinical_profile');
      timings.clinical = Date.now() - t0;
      if (error) {
        const msg = getErrMsg(error);
        errors.clinical = msg;
        return { data: null, error: msg };
      }
      return { data };
    };

    const fetchDemographic = async (): Promise<RpcResult<unknown>> => {
      const t0 = Date.now();
      const { data, error } = await rpcClient.rpc<unknown, Record<string, never>>('get_demographic_profile');
      timings.demographic = Date.now() - t0;
      if (error) {
        const msg = getErrMsg(error);
        errors.demographic = msg;
        return { data: null, error: msg };
      }
      return { data };
    };

    const fetchOperational = async (): Promise<RpcResult<unknown>> => {
      const t0 = Date.now();
      const { data, error } = await rpcClient.rpc<unknown, Record<string, never>>('get_operational_metrics');
      timings.operational = Date.now() - t0;
      if (error) {
        const msg = getErrMsg(error);
        errors.operational = msg;
        return { data: null, error: msg };
      }
      return { data };
    };

    const [clinicalRes, demographicRes, operationalRes] = await Promise.all([
      fetchClinical(),
      fetchDemographic(),
      fetchOperational(),
    ]);

    const partial = Boolean(
      clinicalRes.error || demographicRes.error || operationalRes.error
    );

    // Dev-only: return raw payload to help diagnose RPC issues without Zod constraints
    if (inspect && process.env.NODE_ENV !== 'production') {
      if (debug) {
        console.info('ℹ️ [/api/statistics] inspect mode', {
          usedClient,
          timings,
          errors,
          partial,
        });
      }
      return NextResponse.json(
        {
          usedClient,
          meta: { generatedAt: now, partial },
          timings,
          errors,
          raw: {
            clinicalProfile: clinicalRes.data,
            demographicProfile: demographicRes.data,
            operationalMetrics: operationalRes.data,
          },
        },
        { headers: { ...cacheHeaders } }
      );
    }

    const response = {
      clinicalProfile: clinicalRes.data,
      demographicProfile: demographicRes.data,
      operationalMetrics: operationalRes.data,
      meta: { generatedAt: now, partial },
    };

    // Validate outgoing contract to avoid runtime surprises
    const parsed = ZStatisticsResponse.safeParse(response);
    
    if (!parsed.success) {
      return jsonError(500, 'Unified statistics schema validation failed', undefined, { issues: parsed.error.issues });
    }


    return NextResponse.json(parsed.data, { headers: { ...cacheHeaders } });
  } catch (error: unknown) {
    return jsonError(500, 'Error aggregating statistics');
  }
}
