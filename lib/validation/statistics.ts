import { z } from 'zod';

// Flexible primitives for distributions
export const ZLabelCount = z.object({
  label: z.string(),
  count: z.number().nonnegative(),
});

export const ZStatusCount = z.object({
  status: z.string(),
  count: z.number().nonnegative(),
});

export const ZDiagnosisCount = z.object({
  diagnosis: z.string(),
  count: z.number().nonnegative(),
});

export const ZTrendPoint = z.object({
  date: z.string(), // ISO date string
  value: z.number(),
});

// Sections (kept flexible to accommodate current RPCs)
export const ZClinicalProfile = z.object({
  diagnoses_distribution: z.array(ZDiagnosisCount).optional(),
  surgical_vs_conservative: z
    .object({ surgicalCount: z.number().nonnegative(), conservativeCount: z.number().nonnegative() })
    .optional(),
  horizon_trends: z.array(ZTrendPoint).optional(),
});

export const ZDemographicProfile = z.object({
  gender_distribution: z
    .union([
      // normalized array form
      z.array(ZLabelCount),
      // object form for convenience, will be normalized in the hook
      z.object({ male: z.number().nonnegative(), female: z.number().nonnegative(), other: z.number().nonnegative().optional() }),
    ])
    .optional(),
  age_buckets: z.array(ZLabelCount).optional(),
});

export const ZOperationalMetrics = z.object({
  appointments_by_status: z.array(ZStatusCount).optional(),
  no_show_rate: z.number().min(0).max(100).optional(),
  punctuality_rate: z.number().min(0).max(100).optional(),
});

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

export type LabelCount = z.infer<typeof ZLabelCount>;
export type StatusCount = z.infer<typeof ZStatusCount>;
export type DiagnosisCount = z.infer<typeof ZDiagnosisCount>;
export type TrendPoint = z.infer<typeof ZTrendPoint>;

export type ClinicalProfile = z.infer<typeof ZClinicalProfile>;
export type DemographicProfile = z.infer<typeof ZDemographicProfile>;
export type OperationalMetrics = z.infer<typeof ZOperationalMetrics>;

export type StatisticsResponse = z.infer<typeof ZStatisticsResponse>;
