import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { PatientStatusEnum, PatientStatus } from '@/lib/types';

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

// --- GET: OBTENER LISTA PAGINADA DE PACIENTES CON BÚSQUEDA Y ESTADÍSTICAS ---
export async function GET(request: Request) {
  try {
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : await createServerClient();
    // Debug: confirm which client path is used and env presence
    console.log('🔐 [/api/patients][GET] client:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'admin' : 'server', {
      hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasService: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    });
    const { searchParams } = new URL(request.url);

    // 1. Recolectar y sanitizar parámetros de la URL
    const estado = searchParams.get('estado');
    const searchTerm = searchParams.get('search'); // ✅ Búsqueda habilitada
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    let pageSize = parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE));
    pageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);

    // Debug flag y metadatos de diagnóstico
    const debug = searchParams.get('debug') === '1';
    const usingAdmin = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const envMeta = {
      hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasService: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    };
    const meta = {
      usedClient: usingAdmin ? 'admin' : 'server',
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
        console.warn('[patients][GET] Invalid estado received:', estado);
        return NextResponse.json({
          message: 'Parámetro estado inválido',
          received: estado,
          allowed: allowedValues,
        }, { status: 400 });
      }

      query = query.eq('estado_paciente', norm as PatientStatus);
    }

    if (searchTerm) {
      query = query.or(`
        nombre.ilike.%${searchTerm}%,
        apellidos.ilike.%${searchTerm}%,
        telefono.ilike.%${searchTerm}%,
        email.ilike.%${searchTerm}%,
        diagnostico_principal.ilike.%${searchTerm}%
      `);
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
    
    if (error) {
      const isPermission = /permission denied/i.test(error.message || '');
      if (isPermission) {
        console.warn('[/api/patients][GET] Permission denied fallback', {
          message: error.message,
          meta,
        });
        const pagination = { page, pageSize, totalCount: 0, totalPages: 0, hasMore: false };
        const stats = page === 1
          ? { totalPatients: 0, surveyRate: 0, pendingConsults: 0, operatedPatients: 0, statusStats: { all: 0 } }
          : null;
        return NextResponse.json({ data: [], pagination, stats, ...(debug ? { meta } : {}) }, { headers: cacheConfig });
      }
      // Log non-permission errors with minimal meta when debug is enabled
      console.error('[/api/patients][GET] Error', { message: error.message, meta: debug ? meta : undefined });
      return NextResponse.json({ 
        message: 'Error al obtener pacientes', 
        error: error.message 
      }, { status: 500 });
    }

    // 3. Enriquecer datos en el backend
    // Intentar recuperar la última encuesta asignada por paciente (sin romper en entornos donde la tabla no exista)
    let surveysByPatient: Record<string, any> = {};
    try {
      const patientIds: string[] = (patients || [])
        .map((p: any) => p?.id)
        .filter((id: any) => typeof id === 'string' && id);

      if (patientIds.length > 0) {
        const { data: assigned, error: assignedError } = await supabase
          .from('assigned_surveys')
          .select('id, status, completed_at, assigned_at, template_id, patient_id')
          .in('patient_id', patientIds)
          .order('assigned_at', { ascending: false });

        if (assignedError) {
          console.warn('[/api/patients] No se pudo obtener assigned_surveys:', assignedError.message);
        } else if (assigned) {
          for (const s of assigned) {
            // Conservar solo la más reciente por paciente (ya vienen ordenadas desc)
            if (!surveysByPatient[s.patient_id]) {
              surveysByPatient[s.patient_id] = s;
            }
          }
        }
      }
    } catch (e: any) {
      console.warn('[/api/patients] Error no crítico al enriquecer encuestas:', e?.message || e);
    }

    const enrichedPatients = patients?.map((patient: any) => {
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
        console.warn('[/api/patients][GET] No se pudo obtener estadísticas:', statsErr.message);
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
        statusStats: { ...statusStats, all: totalPatients }
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
      } catch {}
    }

    return NextResponse.json({
      data: enrichedPatients,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
      stats, // ✅ Estadísticas calculadas en backend
      ...(debug ? { meta } : {}),
    }, { headers: cacheConfig });

  } catch (error: any) {
    console.error('Error in patients API route (GET):', error);
    return NextResponse.json({ 
      message: 'Error al obtener pacientes', 
      error: error.message 
    }, { status: 500 });
  }
}

// --- POST: CREAR NUEVO PACIENTE ---
export async function POST(request: Request) {
  try {
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : await createServerClient();
    const body = await request.json();
    const enforceBirthdate = process.env.ENFORCE_PATIENT_BIRTHDATE === 'true';

    // 1. Validar campos requeridos
    if (!body.nombre || !body.apellidos) {
      return NextResponse.json({ 
        message: 'Nombre y apellidos son requeridos' 
      }, { status: 400 });
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
      return NextResponse.json({
        message: 'fecha_nacimiento es obligatoria'
      }, { status: 400 });
    }

    if (inputFechaNac) {
      const { data: candidates, error: dupErr } = await supabase
        .from('patients')
        .select('id, nombre, apellidos, fecha_nacimiento')
        .eq('fecha_nacimiento', inputFechaNac);

      if (dupErr) {
        console.warn('[/api/patients][POST] No se pudo verificar duplicados:', dupErr.message);
      } else {
        const match = (candidates || []).find(
          (p: any) => norm(p.nombre) === inputNombre && norm(p.apellidos) === inputApellidos
        );
        if (match) {
          return NextResponse.json(
            {
              message: 'Paciente duplicado: ya existe un registro con mismo nombre, apellidos y fecha de nacimiento',
              code: 'duplicate_patient',
              existing_patient: {
                id: match.id,
                nombre: match.nombre,
                apellidos: match.apellidos,
                fecha_nacimiento: match.fecha_nacimiento,
              },
            },
            { status: 409 }
          );
        }
      }
    } else {
      // Nota: sin fecha de nacimiento no podemos aplicar regla de unicidad fuerte.
      // Se mantiene compatibilidad y se registra un warning de diagnóstico.
      console.warn('[/api/patients][POST] Creación sin fecha_nacimiento; no se aplica verificación de duplicados por identidad.');
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
      return NextResponse.json({
        message: 'Fecha de nacimiento inválida o inconsistente (edad fuera de rango)'
      }, { status: 400 });
    }

    const patientData = {
      nombre: body.nombre.trim(),
      apellidos: body.apellidos.trim(),
      edad: edadToSave,
      fecha_nacimiento: fechaNacimientoToSave,
      telefono: body.telefono?.trim() || null,
      email: body.email?.trim() || null,
      estado_paciente: body.estado_paciente || PatientStatusEnum.POTENCIAL,
      diagnostico_principal: body.diagnostico_principal || null,
      diagnostico_principal_detalle: body.diagnostico_principal_detalle?.trim() || null,
      probabilidad_cirugia: body.probabilidad_cirugia || null,
      fecha_cirugia_programada: body.fecha_cirugia_programada || null,
      fecha_primera_consulta: body.fecha_primera_consulta || null,
      fecha_registro: new Date().toISOString(),
      doctor_asignado_id: body.doctor_asignado_id || null,
      origen_paciente: body.origen_paciente?.trim() || null,
      etiquetas: body.etiquetas || null,
      comentarios_registro: body.comentarios_registro?.trim() || null,
      proximo_contacto: body.proximo_contacto || null,
      ultimo_contacto: body.ultimo_contacto || null,
    };

    // 4. Insertar paciente en la base de datos
    const { data: newPatient, error } = await supabase
      .from('patients')
      .insert(patientData)
      .select()
      .single();

    if (error) {
      console.error('Error creating patient:', error);
      const code = (error as any)?.code;
      const msg = (error as any)?.message || '';
      const details = (error as any)?.details || '';
      const isUnique = code === '23505' || /duplicate key value/i.test(msg);
      const isPhoneDup = isUnique && (msg.includes('patients_telefono_key') || details.includes('telefono'));
      if (isPhoneDup) {
        return NextResponse.json({
          message: 'Teléfono duplicado',
          error: msg
        }, { status: 400 });
      }
      return NextResponse.json({ 
        message: 'Error al crear paciente', 
        error: msg 
      }, { status: 500 });
    }

    // 5. Retornar paciente creado
    return NextResponse.json({
      message: 'Paciente creado exitosamente',
      patient: newPatient
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error in patients API route (POST):', error);
    return NextResponse.json({ 
      message: 'Error al crear paciente', 
      error: error.message 
    }, { status: 500 });
  }
}