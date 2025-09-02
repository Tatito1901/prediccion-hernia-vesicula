import { z } from 'zod'

// Periods supported by dashboard metrics API
export const ZDashboardPeriod = z.enum(['7d', '30d', '90d'])
export type DashboardPeriod = z.infer<typeof ZDashboardPeriod>

// Chart data point (day-level aggregates)
export const ZChartDatum = z.object({
  label: z.string(),
  consultas: z.number().int().nonnegative(),
  cirugias: z.number().int().nonnegative(),
})
export type ChartDatum = z.infer<typeof ZChartDatum>

// Dashboard Metrics API response schema
export const ZDashboardMetricsResponse = z.object({
  primary: z.object({
    todayConsultations: z.number().int().nonnegative(),
    totalPatients: z.number().int().nonnegative(),
    occupancyRate: z.number().int().min(0).max(100),
  }),
  clinical: z.object({
    operatedPatients: z.number().int().nonnegative(),
  }),
  chartData: z.array(ZChartDatum),
  periodComparison: z.object({
    changePercent: z.number(),
  }),
  // Optional meta/debug info in dev
  meta: z.any().optional(),
})
export type DashboardMetricsResponse = z.infer<typeof ZDashboardMetricsResponse>
