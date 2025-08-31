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
    
    console.log('📊 [/api/statistics] Parámetros de consulta:', { debug, inspect });

    const timings: Record<string, number> = {};
    const errors: Record<string, string | undefined> = {};

    const getErrMsg = (err: any): string | undefined =>
      typeof err === 'string' ? err : err?.message ?? undefined;

    const fetchClinical = async (): Promise<RpcResult<any>> => {
      console.log('🏥 [/api/statistics] Llamando RPC: get_clinical_profile');
      const t0 = Date.now();
      const { data, error } = await supabase.rpc('get_clinical_profile');
      timings.clinical = Date.now() - t0;
      console.log('🏥 [/api/statistics] RPC get_clinical_profile completado:', {
        timing: `${timings.clinical}ms`,
        hasData: !!data,
        hasError: !!error,
        dataType: typeof data,
        errorDetails: error ? { message: error.message, code: error.code, details: error.details } : null
      });
      if (data) {
        console.log('🏥 [/api/statistics] Datos clinical recibidos:', JSON.stringify(data, null, 2));
      }
      if (error) {
        console.error('❌ [/api/statistics] Error en get_clinical_profile:', error);
        const msg = getErrMsg(error);
        errors.clinical = msg;
        return { data: null, error: msg };
      }
      return { data: data as any };
    };

    const fetchDemographic = async (): Promise<RpcResult<any>> => {
      console.log('👥 [/api/statistics] Llamando RPC: get_demographic_profile');
      const t0 = Date.now();
      const { data, error } = await supabase.rpc('get_demographic_profile');
      timings.demographic = Date.now() - t0;
      console.log('👥 [/api/statistics] RPC get_demographic_profile completado:', {
        timing: `${timings.demographic}ms`,
        hasData: !!data,
        hasError: !!error,
        dataType: typeof data,
        errorDetails: error ? { message: error.message, code: error.code, details: error.details } : null
      });
      if (data) {
        console.log('👥 [/api/statistics] Datos demographic recibidos:', JSON.stringify(data, null, 2));
      }
      if (error) {
        console.error('❌ [/api/statistics] Error en get_demographic_profile:', error);
        const msg = getErrMsg(error);
        errors.demographic = msg;
        return { data: null, error: msg };
      }
      return { data: data as any };
    };

    const fetchOperational = async (): Promise<RpcResult<any>> => {
      console.log('📈 [/api/statistics] Llamando RPC: get_operational_metrics');
      const t0 = Date.now();
      const { data, error } = await supabase.rpc('get_operational_metrics');
      timings.operational = Date.now() - t0;
      console.log('📈 [/api/statistics] RPC get_operational_metrics completado:', {
        timing: `${timings.operational}ms`,
        hasData: !!data,
        hasError: !!error,
        dataType: typeof data,
        errorDetails: error ? { message: error.message, code: error.code, details: error.details } : null
      });
      if (data) {
        console.log('📈 [/api/statistics] Datos operational recibidos:', JSON.stringify(data, null, 2));
      }
      if (error) {
        console.error('❌ [/api/statistics] Error en get_operational_metrics:', error);
        const msg = getErrMsg(error);
        errors.operational = msg;
        return { data: null, error: msg };
      }
      return { data: data as any };
    };

    console.log('🔄 [/api/statistics] Ejecutando RPCs en paralelo...');
    const [clinicalRes, demographicRes, operationalRes] = await Promise.all([
      fetchClinical(),
      fetchDemographic(),
      fetchOperational(),
    ]);

    console.log('✅ [/api/statistics] Todas las RPCs completadas');
    console.log('📋 [/api/statistics] Resumen de resultados:', {
      clinical: { hasData: !!clinicalRes.data, hasError: !!clinicalRes.error },
      demographic: { hasData: !!demographicRes.data, hasError: !!demographicRes.error },
      operational: { hasData: !!operationalRes.data, hasError: !!operationalRes.error }
    });

    const partial = Boolean(
      clinicalRes.error || demographicRes.error || operationalRes.error
    );
    
    console.log('🚨 [/api/statistics] Estado partial:', partial);
    if (partial) {
      console.log('❌ [/api/statistics] Errores encontrados:', {
        clinical: clinicalRes.error,
        demographic: demographicRes.error,
        operational: operationalRes.error
      });
    }

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

    console.log('🏗️ [/api/statistics] Construyendo respuesta final:', {
      hasClinicData: !!response.clinicalProfile,
      hasDemographicData: !!response.demographicProfile,
      hasOperationalData: !!response.operationalMetrics,
      responseKeys: Object.keys(response),
      partial: response.meta.partial
    });

    console.log('📝 [/api/statistics] Respuesta completa antes de validación:', JSON.stringify(response, null, 2));

    // Validate outgoing contract to avoid runtime surprises
    console.log('🔍 [/api/statistics] Iniciando validación con Zod...');
    const parsed = ZStatisticsResponse.safeParse(response);
    
    if (!parsed.success) {
      console.error('❌ [/api/statistics] ¡VALIDACIÓN ZOD FALLÓ!');
      console.error('❌ [/api/statistics] Detalles de validación:', {
        usedClient,
        issues: parsed.error.issues,
        timings,
        errors,
        responseData: response
      });
      console.error('❌ [/api/statistics] Issues específicos:', JSON.stringify(parsed.error.issues, null, 2));
      
      return jsonError(500, 'Unified statistics schema validation failed', undefined, { issues: parsed.error.issues });
    }

    console.log('✅ [/api/statistics] ¡Validación Zod exitosa!');
    console.log('✅ [/api/statistics] Datos validados:', JSON.stringify(parsed.data, null, 2));

    if (debug || partial) {
      console.info('ℹ️ [/api/statistics] aggregated', {
        usedClient,
        meta: parsed.data.meta,
        timings,
        errors,
      });
    }

    return NextResponse.json(parsed.data, { headers: { ...cacheHeaders } });
  } catch (error: any) {
    console.error('❌ [/api/statistics] error:', error);
    return jsonError(500, 'Error aggregating statistics');
  }
}
