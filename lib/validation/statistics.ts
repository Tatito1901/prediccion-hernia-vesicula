// lib/validation/statistics.ts
import { z } from 'zod';

// Common label-count pair used in charts and summaries
export const ZLabelCount = z.object({
  label: z.string(),
  count: z.number(),
});
export type LabelCount = z.infer<typeof ZLabelCount>;

// Clinical profile: keep flexible but ensure known arrays validate
export const ZClinicalProfile = z
  .object({
    diagnoses_distribution: z.array(ZLabelCount).optional(),
    top_diagnoses: z.array(ZLabelCount).optional(),
  })
  .passthrough();

// Demographic profile: gender can be array of label-count or object with keys
export const ZDemographicProfile = z
  .object({
    gender_distribution: z
      .union([
        z.array(ZLabelCount),
        z
          .object({ male: z.number().optional(), female: z.number().optional(), other: z.number().optional() })
          .partial(),
      ])
      .optional(),
    age_groups: z.array(ZLabelCount).optional(),
  })
  .passthrough();

// Operational metrics: appointments by status and a few KPIs
export const ZOperationalMetrics = z
  .object({
    appointments_by_status: z
      .array(
        z.object({
          status: z.string().optional().nullable(),
          count: z.number().optional().nullable(),
        })
      )
      .optional(),
    no_show_rate: z.number().nullable().optional(),
    punctuality_rate: z.number().nullable().optional(),
  })
  .passthrough();

export const ZStatisticsMeta = z.object({
  generatedAt: z.string(),
  partial: z.boolean(),
});

export const ZStatisticsResponse = z.object({
  clinicalProfile: ZClinicalProfile.nullable().optional(),
  demographicProfile: ZDemographicProfile.nullable().optional(),
  operationalMetrics: ZOperationalMetrics.nullable().optional(),
  meta: ZStatisticsMeta,
});

export type StatisticsResponse = z.infer<typeof ZStatisticsResponse>;
