// utils/datetime.ts
// Consistent Mexico City timezone helpers

import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { Locale } from 'date-fns'
import { es } from 'date-fns/locale'
import { CLINIC_TIMEZONE } from '@/lib/admission-business-rules'

export const MX_TZ = CLINIC_TIMEZONE

// Returns a Date representing "now" but adjusted for Mexico City clock values
export function mxNow(): Date {
  return toZonedTime(new Date(), MX_TZ)
}

// Get UTC bounds for the Mexico City day that contains the provided date
export function getMxDayBounds(date: Date | string = new Date()): { startUtc: Date; endUtc: Date } {
  const day = formatInTimeZone(new Date(date), MX_TZ, 'yyyy-MM-dd')
  const startUtc = fromZonedTime(`${day}T00:00:00`, MX_TZ)
  const endUtc = fromZonedTime(`${day}T23:59:59.999`, MX_TZ)
  return { startUtc, endUtc }
}

// Check if the given instant falls on today in Mexico City
export function isMxToday(date: Date | string): boolean {
  const day = formatInTimeZone(new Date(date), MX_TZ, 'yyyy-MM-dd')
  const today = formatInTimeZone(new Date(), MX_TZ, 'yyyy-MM-dd')
  return day === today
}

// Format a date in Mexico City timezone with optional locale (defaults to Spanish)
export function formatMx(date: Date | string, pattern: string, options?: { locale?: Locale }) {
  return formatInTimeZone(new Date(date), MX_TZ, pattern, { locale: options?.locale ?? es })
}

// Convert a local date (interpreted in Mexico City) to UTC ISO string
export function mxLocalPartsToUtcIso(yyyyMmDd: string, hh: number, mm: number): string {
  const dateTime = `${yyyyMmDd}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`
  return fromZonedTime(dateTime, MX_TZ).toISOString()
}
