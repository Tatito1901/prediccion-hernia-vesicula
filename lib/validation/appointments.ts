// lib/validation/appointments.ts
// Zod schemas and helpers for Appointments create/validate

import { z } from 'zod';
import { ZDiagnosisDb, ZAppointmentStatus } from '@/lib/validation/enums';
import { validateRescheduleDateTime } from '@/lib/clinic-schedule';

// New Appointment payload (server-side)
// Business: On creation, estado_cita must be PROGRAMADA (or omitted -> default PROGRAMADA)
export const ZNewAppointmentSchema = z
  .object({
    patient_id: z.string().uuid({ message: 'patient_id debe ser UUID' }),
    doctor_id: z.string().uuid({ message: 'doctor_id debe ser UUID' }).optional().nullable(),
    fecha_hora_cita: z
      .string()
      .datetime({ message: 'fecha_hora_cita debe ser ISO-8601 válido' }),
    motivos_consulta: z.array(ZDiagnosisDb).optional().default([]),
    estado_cita: ZAppointmentStatus.optional(),
    es_primera_vez: z.boolean().optional(),
    notas_breves: z.string().trim().max(500, 'notas_breves muy largo').optional().nullable(),
  })
  .strict()
  .superRefine((val, ctx) => {
    // On create, only allow PROGRAMADA if provided
    if (val.estado_cita && val.estado_cita !== 'PROGRAMADA') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['estado_cita'],
        message: 'estado_cita en creación debe ser PROGRAMADA',
      });
    }

    const result = validateRescheduleDateTime(val.fecha_hora_cita);
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fecha_hora_cita'], message: result.reason || 'Fecha/hora inválida' });
    }
  });

export type TNewAppointment = z.infer<typeof ZNewAppointmentSchema>;

export function normalizeNewAppointment(input: TNewAppointment) {
  return {
    patient_id: input.patient_id,
    doctor_id: input.doctor_id ?? null,
    fecha_hora_cita: input.fecha_hora_cita,
    motivos_consulta: input.motivos_consulta ?? [],
    estado_cita: 'PROGRAMADA' as const,
    es_primera_vez: input.es_primera_vez ?? true,
    notas_breves: input.notas_breves?.trim?.() || null,
  };
}
