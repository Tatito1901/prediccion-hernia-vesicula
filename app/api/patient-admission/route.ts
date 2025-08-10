// app/api/patient-admission/route.ts
// API CORREGIDA PARA TU ESQUEMA REAL DE BASE DE DATOS

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { z } from 'zod';
import { ZDiagnosisDb, DIAGNOSIS_DB_VALUES, type DbDiagnosis } from '@/lib/validation/enums';

export const runtime = 'nodejs';

// Utilidad segura para loguear objetos potencialmente complejos
const safeStringify = (v: any) => {
  try {
    return JSON.stringify(v);
  } catch {
    try {
      return String(v);
    } catch {
      return '[unstringifiable]';
    }
  }
};

// Definición del enum de diagnóstico (debe coincidir EXACTAMENTE con el enum en la base de datos)
const DIAGNOSIS_ENUM = [
  'HERNIA INGUINAL',
  'HERNIA UMBILICAL', 
  'COLECISTITIS',
  'COLEDOCOLITIASIS',
  'COLANGITIS',
  'APENDICITIS',
  'HERNIA HIATAL',
  'LIPOMA GRANDE',
  'HERNIA INGUINAL RECIDIVANTE',
  'QUISTE SEBACEO INFECTADO',
  'EVENTRACION ABDOMINAL',
  'VESICULA (COLECISTITIS CRONICA)',
  'OTRO',
  'HERNIA SPIGEL',
  'SIN_DIAGNOSTICO'
] as const;

// DB enum values expected by the RPC (single source of truth from centralized enums)
const DB_DIAGNOSIS_ENUM = DIAGNOSIS_DB_VALUES;

// Robust normalization: accepts UI labels with spaces and maps to DB enum with underscores
const toSlug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '_');

const DIAGNOSIS_MAP: Record<string, DbDiagnosis> = {
  // Direct matches
  HERNIA_INGUINAL: 'HERNIA_INGUINAL',
  HERNIA_UMBILICAL: 'HERNIA_UMBILICAL',
  HERNIA_HIATAL: 'HERNIA_HIATAL',
  HERNIA_INCISIONAL: 'HERNIA_INCISIONAL',
  HERNIA_EPIGASTRICA: 'HERNIA_EPIGASTRICA',
  COLELITIASIS: 'COLELITIASIS',
  COLECISTITIS_AGUDA: 'COLECISTITIS_AGUDA',
  COLECISTITIS_CRONICA: 'COLECISTITIS_CRONICA',
  COLEDOCOLITIASIS: 'COLEDOCOLITIASIS',
  POLIPOS_VESICULA: 'POLIPOS_VESICULA',
  OTRO_DIAGNOSTICO: 'OTRO_DIAGNOSTICO',
  SIN_DIAGNOSTICO: 'SIN_DIAGNOSTICO',

  // UI label variants -> DB
  // Note: toSlug removes parentheses, so this key must not include them
  VESICULA_COLECISTITIS_CRONICA: 'COLECISTITIS_CRONICA',
  COLECISTITIS: 'COLECISTITIS_CRONICA',
  EVENTRACION_ABDOMINAL: 'HERNIA_INCISIONAL',
  HERNIA_INGUINAL_RECIDIVANTE: 'HERNIA_INGUINAL',
  HERNIA_SPIGEL: 'OTRO_DIAGNOSTICO',
  COLANGITIS: 'OTRO_DIAGNOSTICO',
  APENDICITIS: 'OTRO_DIAGNOSTICO',
  LIPOMA_GRANDE: 'OTRO_DIAGNOSTICO',
  QUISTE_SEBACEO_INFECTADO: 'OTRO_DIAGNOSTICO',
  OTRO: 'OTRO_DIAGNOSTICO',
};

function normalizeDiagnosis(input: unknown): DbDiagnosis {
  if (typeof input !== 'string' || !input.trim()) return 'OTRO_DIAGNOSTICO';
  const slug = toSlug(input);
  const mapped = DIAGNOSIS_MAP[slug];
  if (mapped) return mapped;
  // If already a DB enum and in whitelist, accept
  if ((DIAGNOSIS_DB_VALUES as readonly string[]).includes(slug)) return slug as DbDiagnosis;
  // Fallback logic: if explicitly "SIN_DIAGNOSTICO" in any form
  if (slug === 'SIN_DIAGNOSTICO') return 'SIN_DIAGNOSTICO';
  return 'OTRO_DIAGNOSTICO';
}

// ==================== VALIDACIÓN CORREGIDA PARA TU ESQUEMA ====================
const PatientAdmissionSchema = z.object({
  // ✅ Parámetros exactos de tu función RPC (con p_motivo_cita requerido)
  p_nombre: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  p_apellidos: z.string().min(2, "Apellidos debe tener al menos 2 caracteres"),
  p_telefono: z.string().nullable().optional(),
  p_email: z.string().email("Email inválido").nullable().optional(),
  p_edad: z.number().min(0).max(120).nullable().optional(),
  p_diagnostico_principal: ZDiagnosisDb,
  p_comentarios_registro: z.string().nullable().optional(),
  p_probabilidad_cirugia: z.number().min(0).max(1).nullable().optional(),
  p_fecha_hora_cita: z.string().datetime("Fecha y hora inválida"),
  // ✅ RESTAURADO p_motivo_cita - requerido por la RPC (enviaremos valor seguro)
  p_motivo_cita: z.string().nullable().optional(),
  p_doctor_id: z.string().uuid().nullable().optional(),
  p_creado_por_id: z.string().uuid().nullable().optional(),
});

type PatientAdmissionData = z.infer<typeof PatientAdmissionSchema>;

// ==================== BUSINESS RULES ====================
const validateAppointmentTime = (dateTimeStr: string): { valid: boolean; reason?: string } => {
  try {
    const appointmentTime = new Date(dateTimeStr);
    const now = new Date();

    // No puede ser en el pasado
    if (appointmentTime < now) {
      return { valid: false, reason: 'La cita no puede ser programada en el pasado' };
    }

    const day = appointmentTime.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    const hour = appointmentTime.getHours();

    // Debe ser de Lunes a Sábado (Domingo es 0)
    if (day === 0) {
      return { valid: false, reason: 'Las citas no pueden programarse en domingo' };
    }

    // Debe estar en el nuevo horario laboral (9 AM - 3 PM)
    if (hour < 9 || hour >= 15) {
      return { valid: false, reason: 'El horario de citas es de Lunes a Sábado, de 9:00 AM a 3:00 PM' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Formato de fecha y hora inválido' };
  }
};

// ==================== ENDPOINT PRINCIPAL ====================
export async function POST(request: NextRequest) {
  try {
    const isAdmin = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const supabase = isAdmin ? createAdminClient() : await createClient();
    console.log('🔐 [Patient Admission] client:', isAdmin ? 'admin' : 'server');
    const body = await request.json();
    
    console.log('🏥 [Patient Admission] Starting admission process...');
    console.log('📥 [Patient Admission] Request body:', body);
    
    // ✅ 1. NORMALIZAR PAYLOAD: aceptar forma UI (sin prefijo) y mapear a parámetros RPC (p_*)
    const normalizedBody = (body && (
      typeof body.p_nombre === 'string' ||
      typeof body.p_apellidos === 'string' ||
      typeof body.p_fecha_hora_cita === 'string'
    ))
      ? body
      : {
          p_nombre: body?.nombre,
          p_apellidos: body?.apellidos,
          p_telefono: body?.telefono ?? null,
          p_email: body?.email ?? null,
          p_edad: typeof body?.edad === 'number' ? body.edad : (body?.edad ?? null),
          p_diagnostico_principal: body?.diagnostico_principal,
          p_comentarios_registro: body?.comentarios_registro ?? null,
          p_probabilidad_cirugia: typeof body?.probabilidad_cirugia === 'number' ? body.probabilidad_cirugia : (body?.probabilidad_cirugia ?? null),
          p_fecha_hora_cita: body?.fecha_hora_cita,
          // ✅ RESTAURADO p_motivo_cita - requerido por la RPC (usar valor seguro)
          p_motivo_cita: Array.isArray(body?.motivos_consulta)
            ? (body.motivos_consulta[0] ?? "Consulta general")
            : (body?.motivo_cita ?? "Consulta general"),
          p_doctor_id: body?.doctor_id ?? null,
          p_creado_por_id: body?.creado_por_id ?? null,
        };
    // Normalize diagnosis to DB enum regardless of input shape
    const bodyForValidation = {
      ...normalizedBody,
      p_diagnostico_principal: normalizeDiagnosis(
        (normalizedBody as any)?.p_diagnostico_principal ?? (body as any)?.diagnostico_principal
      ),
    } as Omit<PatientAdmissionData, 'p_diagnostico_principal'> & { p_diagnostico_principal: DbDiagnosis };
    
    // ✅ 2. VALIDAR DATOS DE ENTRADA (siempre contra el esquema de la RPC)
    const validationResult = PatientAdmissionSchema.safeParse(bodyForValidation);
    
    if (!validationResult.success) {
      console.warn('⚠️ [Patient Admission] Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { 
          error: 'Datos de admisión inválidos',
          validation_errors: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // ✅ 2. VALIDAR REGLAS DE NEGOCIO
    const timeValidation = validateAppointmentTime(data.p_fecha_hora_cita);
    if (!timeValidation.valid) {
      return NextResponse.json(
        { error: timeValidation.reason },
        { status: 422 }
      );
    }
    
    // ✅ 3. OBTENER USUARIO ACTUAL PARA creado_por_id (solo con cliente server SSR)
    // Evitamos llamar auth.getUser() cuando usamos service-role (no hay sesión)
    let userId: string | null = null;
    if (!isAdmin) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id ?? null;
      } catch {
        userId = null;
      }
    }
    
    // ✅ 4. PREPARAR PARÁMETROS EXACTOS PARA LA RPC
    // Nota: La BD tiene un check constraint "logical_birth_age" que exige coherencia entre
    // edad y fecha_nacimiento. Como la RPC NO recibe fecha_nacimiento, enviamos siempre edad = NULL
    // para evitar violar la restricción hasta que el flujo soporte fecha_nacimiento de forma segura.
    const edadForRpc: number | null = null;
    const rpcParams = {
      p_nombre: data.p_nombre,
      p_apellidos: data.p_apellidos,
      p_telefono: data.p_telefono,
      p_email: data.p_email,
      // Enviar siempre NULL (evita conflictos con logical_birth_age hasta soportar fecha_nacimiento)
      p_edad: edadForRpc as any,
      // Ya no necesitamos cast, la RPC ahora acepta un string directamente
      p_diagnostico_principal: data.p_diagnostico_principal,
      p_comentarios_registro: data.p_comentarios_registro,
      p_probabilidad_cirugia: data.p_probabilidad_cirugia,
      p_fecha_hora_cita: data.p_fecha_hora_cita,
      // ✅ RESTAURADO p_motivo_cita - requerido por la signatura de la RPC
      p_motivo_cita: data.p_motivo_cita,
      p_doctor_id: data.p_doctor_id,
      p_creado_por_id: userId || null,
    };
    
    console.log('📞 [Patient Admission] Calling RPC with params:', rpcParams);
    
    // ✅ 5. LLAMAR A LA FUNCIÓN RPC CORREGIDA
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'create_patient_and_appointment',
      rpcParams
    );
    
    // ✅ 6. PROCESAR RESULTADO
    console.log('🧪 [Patient Admission] Raw RPC result:', safeStringify(rpcResult));
    if (rpcError) {
      console.error('❌ [Patient Admission] RPC error:', rpcError);
      return NextResponse.json(
        { error: `Error interno al registrar el paciente: ${rpcError.message}` },
        { status: 400 }
      );
    }
    // Procesar el formato de respuesta (manejo flexible)
    if (rpcResult) {
      const resultObj: any = Array.isArray(rpcResult) ? (rpcResult as any[])[0] : (rpcResult as any);
      const createdPatientId = resultObj?.created_patient_id ?? resultObj?.patient_id ?? resultObj?.patientId ?? resultObj?.paciente_id ?? null;
      const createdAppointmentId = resultObj?.created_appointment_id ?? resultObj?.appointment_id ?? resultObj?.appointmentId ?? resultObj?.cita_id ?? null;
      const explicitSuccess = typeof resultObj?.success === 'boolean' ? (resultObj.success as boolean) : undefined;
      const inferredSuccess = Boolean(createdPatientId && createdAppointmentId);
      const successFlag = explicitSuccess ?? inferredSuccess;
      const message: string | null = resultObj?.message ?? resultObj?.error ?? resultObj?.status ?? null;

      if (!successFlag) {
        console.warn('⚠️ [Patient Admission] RPC returned failure:', message ?? safeStringify(resultObj));
        return NextResponse.json(
          { error: message ?? 'La base de datos reportó un fallo al crear el paciente y la cita.' },
          { status: 400 }
        );
      }

      // ✅ 7. RETORNAR RESPUESTA EXITOSA (usando IDs detectados)
      console.log('✅ [Patient Admission] RPC success!');
      return NextResponse.json(
        {
          message: 'Paciente registrado y cita creada con éxito',
          patient_id: createdPatientId,
          appointment_id: createdAppointmentId,
          next_steps: [
            'El paciente ha sido registrado en el sistema',
            'La cita ha sido programada automáticamente',
            'El paciente aparecerá en la lista de citas correspondiente',
          ],
        },
        { status: 201 }
      );
    } else {
      console.error('❌ [Patient Admission] RPC returned empty or unexpected result:', rpcResult);
      return NextResponse.json(
        { error: 'No se obtuvo respuesta válida de la base de datos' },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('💥 [Patient Admission] Unexpected error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Error al procesar la admisión',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}