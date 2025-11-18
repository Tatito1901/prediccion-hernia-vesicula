import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { PatientStatusEnum, PatientStatus } from '@/lib/types';
import { createApiResponse, createApiError } from '@/lib/api-response-types';

// Ensure Node.js runtime for access to process.env and server-only libs
export const runtime = 'nodejs';

const cacheConfig = {
  // 10 minutos de cache del navegador, 1 hora en CDN, 6 horas de stale-while-revalidate
  'Cache-Control': 'max-age=600, s-maxage=3600, stale-while-revalidate=21600',
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Type guard para validar estados de paciente
function isPatientStatus(value: string): value is PatientStatus {
  return (Object.values(PatientStatusEnum) as string[]).includes(value);
}

// Sanitize free-text search for PostgREST `.or()` logic to avoid parse errors
const buildSearchOrFilter = (raw: string | null) => {
  const term = (raw || '').toLowerCase().trim();
  if (!term) return undefined as string | undefined;
  const sanitized = term
    .replace(/[,%()'"\\/]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!sanitized) return undefined as string | undefined;
  // Use '*' wildcard per PostgREST filter syntax in `.or()` strings
  return `nombre.ilike.*${sanitized}*,apellidos.ilike.*${sanitized}*,telefono.ilike.*${sanitized}*,email.ilike.*${sanitized}*,diagnostico_principal.ilike.*${sanitized}*`;
};

// --- GET: OBTENER LISTA PAGINADA DE PACIENTES CON BÚSQUEDA Y ESTADÍSTICAS ---
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    // Debug: confirm which client path is used and env presence
    const { searchParams } = new URL(request.url);

    // 1. Recolectar y sanitizar parámetros de la URL
    const estado = searchParams.get('estado');
    const searchTerm = searchParams.get('search'); // ✅ Búsqueda habilitada
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    let pageSize = parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10);
    pageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);

    // Debug flag y metadatos de diagnóstico
    const debug = process.env.NODE_ENV === 'development';
    const usingAdmin = false;
    const envMeta = {
      hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasService: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    };
    const meta = {
      usedClient: 'server' as const,
      ...envMeta,
      params: { estado, search: searchTerm, startDate, endDate, page, pageSize },
    };

    // 2. Obtener pacientes paginados con búsqueda y filtros
    // Nota: evitamos joins a relaciones que pueden no existir en ciertos entornos
    // para prevenir errores 500 en desarrollo. Seleccionamos solo columnas base.
    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (estado && estado !== 'all') {
      // Normalizar y validar estado contra PatientStatusEnum
      const allowedValues = Object.values(PatientStatusEnum) as string[];
      // Permitir que vengan llaves del enum ("ACTIVO") o valores ("activo")
      const byKey = (PatientStatusEnum as Record<string, string>)[estado as keyof typeof PatientStatusEnum];
      const norm = byKey || estado.toLowerCase();

      if (!allowedValues.includes(norm)) {
        const errorResponse = createApiError('Parámetro estado inválido', {
          code: 'INVALID_PARAM',
          details: { received: estado, allowed: allowedValues },
        });
        return NextResponse.json(errorResponse, { status: 400 });
      }

      query = query.eq('estado_paciente', norm as PatientStatus);
    }

    const orFilter = buildSearchOrFilter(searchTerm);
    if (orFilter) {
      query = query.or(orFilter);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Aplicar paginación
    const start = (page - 1) * pageSize;
    query = query.range(start, start + pageSize - 1);

    const { data: patients, error, count } = await query;
    
    if (debug) {
      // Debug: Log query results
      console.log('🔍 [/api/patients][GET] Query result:', {
        dataLength: patients?.length || 0,
        count,
        error: error?.message,
        hasData: !!patients,
        firstItem: patients?.[0]
      });
    }
    
    if (error) {
      const isPermission = /permission denied/i.test(error.message || '');
      if (isPermission) {
        const pagination = { page, pageSize, totalCount: 0, totalPages: 0, hasMore: false };
        const stats = page === 1
          ? { totalPatients: 0, surveyRate: 0, pendingConsults: 0, operatedPatients: 0, all: 0 }
          : null;
        const successResponse = createApiResponse<Patient[]>([], {
          pagination,
          stats: stats ?? undefined,
          meta: debug ? meta : undefined,
        });
        return NextResponse.json(successResponse, { headers: cacheConfig });
      }
      // Log non-permission errors with minimal meta when debug is enabled
      const errorResponse = createApiError('Error al obtener pacientes', {
        code: 'FETCH_ERROR',
        details: { message: error.message },
      });
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // 3. Enriquecer datos en el backend
    // Intentar recuperar la última encuesta asignada por paciente (sin romper en entornos donde la tabla no exista)
    interface SurveyInfo {
      id: string;
      status: string;
      completed_at: string | null;
      assigned_at: string;
      template_id: string;
      patient_id: string;
    }

    const surveysByPatient: Record<string, SurveyInfo> = {};
    try {
      const patientIds: string[] = (patients || [])
        .map((p: Patient) => p?.id)
        .filter((id: string | undefined): id is string => typeof id === 'string' && id.length > 0);

      if (patientIds.length > 0) {
        const { data: assigned, error: assignedError } = await supabase
          .from('assigned_surveys')
          .select('id, status, completed_at, assigned_at, template_id, patient_id')
          .in('patient_id', patientIds)
          .order('assigned_at', { ascending: false });

        if (assignedError) {
        } else if (assigned) {
          for (const s of assigned) {
            // Conservar solo la más reciente por paciente (ya vienen ordenadas desc)
            if (!surveysByPatient[s.patient_id]) {
              surveysByPatient[s.patient_id] = s;
            }
          }
        }
      }
    } catch (e: unknown) {
      // Silenciosamente ignorar si la tabla no existe en este entorno
      if (process.env.NODE_ENV === 'development') {
        console.warn('[API /patients] Error al cargar encuestas asignadas:', e);
      }
    }

    const enrichedPatients = patients?.map((patient: Patient) => {
      const lastSurvey = surveysByPatient[patient.id];
      const encuestaCompletada = !!(lastSurvey && (lastSurvey.status === 'completed' || lastSurvey.completed_at));

      return {
        ...patient,
        nombreCompleto: `${patient.nombre || ''} ${patient.apellidos || ''}`.trim(),
        displayDiagnostico: patient.diagnostico_principal || 'Sin diagnóstico',
        // Enriquecimiento de encuesta para UI
        encuesta_completada: encuestaCompletada,
        encuesta: lastSurvey
          ? {
              // Estructura mínima compatible con el frontend
              assigned_survey: lastSurvey,
            }
          : null,
        fecha_proxima_cita_iso: null,
      };
    }) || [];

    // 4. Calcular estadísticas en el backend (solo si es la primera página)
    let stats = null;
    if (page === 1) {
      const { data: statsData, error: statsErr } = await supabase
        .from('patients')
        .select('estado_paciente')
        .not('estado_paciente', 'is', null);
      if (statsErr) {
      }

      const statusStats = (statsData || []).reduce((acc: Record<string, number>, patient: any) => {
        if (patient.estado_paciente) {
          acc[patient.estado_paciente] = (acc[patient.estado_paciente] || 0) + 1;
        }
        return acc;
      }, {});

      const totalPatients = statsData?.length || 0;
      // Sin relación de encuestas en esta consulta simplificada
      const surveyRate = 0;

      stats = {
        totalPatients,
        surveyRate,
        pendingConsults: statusStats[PatientStatusEnum.POTENCIAL] || 0,
        operatedPatients: statusStats[PatientStatusEnum.OPERADO] || 0,
        ...statusStats,
        all: totalPatients
      };
    }

    // 5. Construir respuesta con datos enriquecidos y estadísticas
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Success diagnostic log when debug flag is set
    if (debug) {
      try {
        console.info('[/api/patients][GET] Success', {
          dataCount: (enrichedPatients || []).length,
          pagination: {
            page,
            pageSize,
            totalCount,
            totalPages,
            hasMore: page < totalPages,
          },
          stats,
          meta,
        });
      } catch (error) {
        // Ignore console.info errors in environments where console methods might fail
        // This is safe to ignore as it's only for debugging
      }
    }

    const successResponse = createApiResponse(enrichedPatients, {
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
      stats: stats ?? undefined, // ✅ Estadísticas calculadas en backend
      meta: debug ? meta : undefined,
    });
    return NextResponse.json(successResponse, { headers: cacheConfig });

  } catch (error: any) {
    const errorResponse = createApiError('Error al obtener pacientes', {
      code: 'INTERNAL_SERVER_ERROR',
      details: { message: error?.message },
    });
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// --- POST: CREAR NUEVO PACIENTE ---
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();
    const enforceBirthdate = process.env.ENFORCE_PATIENT_BIRTHDATE === 'true';

    // 1. Validar campos requeridos
    if (!body.nombre || !body.apellidos) {
      const errorResponse = createApiError('Datos inválidos', {
        code: 'VALIDATION_ERROR',
        details: { missing: ['nombre', 'apellidos'].filter((k) => !body[k]) },
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // 2. Normalizar y pre-chequear duplicados por identidad si hay fecha_nacimiento
    const norm = (s: any) => (typeof s === 'string' ? s.trim().toLowerCase() : '');
    const inputNombre = norm(body.nombre);
    const inputApellidos = norm(body.apellidos);
    const parseDateOnly = (v: any): string | null => {
      if (typeof v !== 'string') return null;
      const s = v.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // ya viene como fecha (DATE)
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    };
    const inputFechaNac: string | null = parseDateOnly(body.fecha_nacimiento);

    // 2.1. Si está habilitada la obligatoriedad de fecha_nacimiento, exigirla
    if (enforceBirthdate && !inputFechaNac) {
      const errorResponse = createApiError('fecha_nacimiento es obligatoria', {
        code: 'MISSING_BIRTHDATE',
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (inputFechaNac) {
      const { data: existing, error: dupErr } = await supabase
        .from('patients')
        .select('id, nombre, apellidos, fecha_nacimiento')
        .eq('nombre', (body.nombre || '').trim())
        .eq('apellidos', (body.apellidos || '').trim())
        .eq('fecha_nacimiento', inputFechaNac)
        .limit(1);

      if (dupErr) {
      } else if (existing && existing.length > 0) {
        const errorResponse = createApiError('Paciente duplicado', {
          code: 'DUPLICATE_PATIENT',
          details: { existing_patient: existing[0] },
          suggested_actions: ['Verificar datos del paciente', 'Actualizar registro existente'],
        });
        return NextResponse.json(errorResponse, { status: 409 });
      }
    } else {
      // Nota: sin fecha de nacimiento no podemos aplicar regla de unicidad fuerte.
      // Se mantiene compatibilidad y se registra un warning de diagnóstico.
    }

    // 3. Preparar datos del paciente (incluir fecha_nacimiento y edad coherente si aplica)
    const computeAge = (yyyyMmDd: string): number | null => {
      try {
        const [y, m, d] = yyyyMmDd.split('-').map((v) => parseInt(v, 10));
        const today = new Date();
        let age = today.getFullYear() - y;
        const hasHadBirthday =
          today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);
        if (!hasHadBirthday) age -= 1;
        if (age < 0 || age > 120) return null;
        return age;
      } catch {
        return null;
      }
    };

    const fechaNacimientoToSave = inputFechaNac;
    const edadToSave: number | null =
      fechaNacimientoToSave
        ? computeAge(fechaNacimientoToSave)
        : (typeof body.edad === 'number' ? body.edad : null);

    // Validación: si viene fecha_nacimiento pero la edad calculada es inválida, abortar con 400
    if (fechaNacimientoToSave && (edadToSave === null)) {
      const errorResponse = createApiError('Fecha de nacimiento inválida o inconsistente (edad fuera de rango)', {
        code: 'INVALID_BIRTHDATE',
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const patientData = {
      nombre: body.nombre.trim(),
      apellidos: body.apellidos.trim(),
      edad: edadToSave,
      fecha_nacimiento: fechaNacimientoToSave,
      telefono: body.telefono?.trim() || null,
      email: body.email?.trim() || null,
      genero: body.genero || null,
      estado_paciente: body.estado_paciente || PatientStatusEnum.POTENCIAL,
      diagnostico_principal: body.diagnostico_principal || null,
      antecedentes_medicos: body.antecedentes_medicos || null,
      ciudad: body.ciudad || null,
      estado: body.estado || null,
      contacto_emergencia_nombre: body.contacto_emergencia_nombre || null,
      contacto_emergencia_telefono: body.contacto_emergencia_telefono || null,
      numero_expediente: body.numero_expediente || null,
      seguro_medico: body.seguro_medico || null,
      creation_source: body.creation_source || null,
      marketing_source: body.marketing_source || null,
      comentarios_registro: body.comentarios_registro?.trim() || null,
      probabilidad_cirugia: body.probabilidad_cirugia || null,
    };

    // 4. Insertar paciente en la base de datos
    const { data: newPatient, error } = await supabase
      .from('patients')
      .insert(patientData)
      .select()
      .single();

    if (error) {
      const code = (error as any)?.code;
      const msg = (error as any)?.message || '';
      const detailsMsg = (error as any)?.details || '';
      const isUnique = code === '23505' || /duplicate key value/i.test(msg);
      const isPhoneDup = isUnique && (msg.includes('patients_telefono_key') || detailsMsg.includes('telefono'));
      if (isPhoneDup) {
        const errorResponse = createApiError('Teléfono duplicado', {
          code: 'DUPLICATE_PHONE',
          details: { supabase_error: error },
        });
        return NextResponse.json(errorResponse, { status: 409 });
      }
      const errorResponse = createApiError('Error al crear paciente', {
        code: 'PATIENT_CREATION_ERROR',
        details: { message: msg, supabase_error: error },
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // 5. Retornar paciente creado
    const successResponse = createApiResponse(newPatient, {
      message: 'Paciente creado exitosamente',
    });
    return NextResponse.json(successResponse, { status: 201 });

  } catch (error: any) {
    const errorResponse = createApiError('Error al crear paciente', {
      code: 'INTERNAL_SERVER_ERROR',
      details: { message: error?.message },
    });
    return NextResponse.json(errorResponse, { status: 500 });
  }
}