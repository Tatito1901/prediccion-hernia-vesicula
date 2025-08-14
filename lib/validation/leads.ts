// lib/validation/leads.ts
// Zod schemas and helpers for Leads create/validate

import { z } from 'zod';
import { ZLeadMotive, ZContactChannel } from '@/lib/validation/enums';

export const ZPhone = z
  .string()
  .trim()
  .min(7, 'phone_number demasiado corto')
  .max(20, 'phone_number demasiado largo')
  .regex(/^[0-9+\-()\s]+$/, 'phone_number inválido');

export const ZNewLeadSchema = z
  .object({
    full_name: z.string().trim().min(2).max(120),
    phone_number: ZPhone,
    email: z.string().trim().email().optional().nullable(),
    channel: ZContactChannel,
    motive: ZLeadMotive,
    notes: z.string().trim().max(1000).optional().nullable(),
    assigned_to: z.string().uuid().optional(),
  })
  .strict();

export type TNewLead = z.infer<typeof ZNewLeadSchema>;

export function normalizeNewLead(input: TNewLead) {
  return {
    full_name: input.full_name.trim(),
    phone_number: input.phone_number.trim(),
    email: input.email?.trim?.() || null,
    channel: input.channel,
    motive: input.motive,
    notes: input.notes?.trim?.() || null,
    assigned_to: input.assigned_to,
  } as const;
}
