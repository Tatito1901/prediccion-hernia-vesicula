/**
 * lib/validation/api-schemas.ts
 * =============================
 * Schemas Zod para validación de API responses
 * Centraliza validación runtime de todas las respuestas de API
 */

import { z } from 'zod';
import { ZDiagnosisDb, ZAppointmentStatus } from '@/lib/constants';

// =========================================================================
// SCHEMAS BASE
// =========================================================================

export const ZPaginationInfo = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalCount: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export const ZValidationError = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string(),
});

// =========================================================================
// PATIENT SCHEMAS
// =========================================================================

export const ZPatientBase = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1),
  apellidos: z.string().min(1),
  telefono: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  genero: z.enum(['Masculino', 'Femenino', 'Otro']).optional().nullable(),
  fecha_nacimiento: z.string().optional().nullable(),
  diagnostico_principal: ZDiagnosisDb.optional().nullable(),
  estado_paciente: z.enum(['activo', 'inactivo', 'en_tratamiento', 'dado_de_alta']).optional().nullable(),
  notas: z.string().optional().nullable(),
  alergias: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export const ZPatient = ZPatientBase;

export const ZPatientSummary = z.object({
  total: z.number().int().nonnegative(),
  activos: z.number().int().nonnegative(),
  inactivos: z.number().int().nonnegative(),
  en_tratamiento: z.number().int().nonnegative().optional(),
  dados_de_alta: z.number().int().nonnegative().optional(),
});

export const ZPatientsResponse = z.object({
  data: z.array(ZPatient),
  pagination: ZPaginationInfo,
  summary: ZPatientSummary.optional(),
});

// =========================================================================
// APPOINTMENT SCHEMAS
// =========================================================================

export const ZAppointmentBase = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  fecha_hora_cita: z.string(),
  estado_cita: ZAppointmentStatus,
  motivos_consulta: z.array(z.string()),
  doctor_id: z.string().uuid().nullable(),
  notas_breves: z.string().optional().nullable(),
  es_primera_vez: z.boolean().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export const ZPatientInfo = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  apellidos: z.string(),
  telefono: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  diagnostico_principal: ZDiagnosisDb.optional().nullable(),
  estado_paciente: z.string().optional().nullable(),
});

export const ZAppointmentWithPatient = ZAppointmentBase.extend({
  patients: ZPatientInfo.nullable(),
});

export const ZAppointmentSummary = z.object({
  today_count: z.number().int().nonnegative(),
  future_count: z.number().int().nonnegative(),
  past_count: z.number().int().nonnegative(),
  total: z.number().int().nonnegative().optional(),
});

export const ZAppointmentsResponse = z.object({
  data: z.array(ZAppointmentWithPatient),
  pagination: ZPaginationInfo,
  summary: ZAppointmentSummary.optional(),
});

// =========================================================================
// ADMISSION SCHEMAS
// =========================================================================

export const ZAdmissionResponse = z.object({
  success: z.literal(true),
  data: z.object({
    patient: ZPatient,
    appointment: ZAppointmentBase,
  }),
  message: z.string().optional(),
});

// =========================================================================
// API RESPONSE WRAPPERS
// =========================================================================

export const ZApiSuccessResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    pagination: ZPaginationInfo.optional(),
    summary: z.record(z.unknown()).optional(),
    stats: z.record(z.unknown()).optional(),
  });

export const ZApiErrorResponse = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  code: z.string().optional(),
  validation_errors: z.array(ZValidationError).optional(),
  suggested_actions: z.array(z.string()).optional(),
});

// =========================================================================
// EXPORTED TYPES
// =========================================================================

export type Patient = z.infer<typeof ZPatient>;
export type PatientsResponse = z.infer<typeof ZPatientsResponse>;
export type Appointment = z.infer<typeof ZAppointmentBase>;
export type AppointmentWithPatient = z.infer<typeof ZAppointmentWithPatient>;
export type AppointmentsResponse = z.infer<typeof ZAppointmentsResponse>;
export type AdmissionResponse = z.infer<typeof ZAdmissionResponse>;
export type PaginationInfo = z.infer<typeof ZPaginationInfo>;
export type ValidationError = z.infer<typeof ZValidationError>;

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

/**
 * Valida y parsea una respuesta de API con manejo de errores mejorado
 */
export function validateApiResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0];
    const path = firstError.path.join('.');
    const message = firstError.message;
    const contextStr = context ? ` (${context})` : '';

    throw new Error(
      `Invalid API response${contextStr}: ${path ? `${path}: ` : ''}${message}`
    );
  }

  return result.data;
}

/**
 * Valida específicamente respuestas paginadas
 */
export function validatePaginatedResponse<T>(
  itemSchema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): { data: T[]; pagination: PaginationInfo; summary?: Record<string, unknown> } {
  const responseSchema = z.object({
    data: z.array(itemSchema),
    pagination: ZPaginationInfo,
    summary: z.record(z.unknown()).optional(),
  });

  return validateApiResponse(responseSchema, data, context);
}
