import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { isMxToday, getMxDayBounds, formatMx, mxLocalPartsToUtcIso, mxNow } from '@/utils/datetime'

// Fixed working day: 2025-01-15 is Wednesday (winter, UTC-6)
const DAY_WINTER = '2025-01-15'
// Another day in summer: 2025-07-15 (UTC-6 year-round; no DST in MX City since 2022)
const DAY_SUMMER = '2025-07-15'

// Helper to build ISO strings for known instants
const z = (iso: string) => new Date(iso).toISOString()

describe('utils/datetime timezone helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('isMxToday respects Mexico City date boundaries', () => {
    // Set system time to Mexico City local 12:00 on 2025-01-15 (which is 18:00Z in winter)
    vi.setSystemTime(new Date(`${DAY_WINTER}T18:00:00.000Z`))

    // Same local day in MX
    expect(isMxToday(`${DAY_WINTER}T12:00:00.000Z`)).toBe(true) // 06:00 local
    expect(isMxToday(`${DAY_WINTER}T23:59:59.000Z`)).toBe(true) // 17:59:59 local

    // Previous local day (crossing -06:00 offset)
    expect(isMxToday(`${DAY_WINTER}T05:59:59.000Z`)).toBe(false) // 23:59:59 of previous local day
  })

  it('getMxDayBounds returns UTC bounds for the MX local day', () => {
    // Any time within the day should yield the same bounds
    const sample = `${DAY_WINTER}T12:00:00.000Z`
    const { startUtc, endUtc } = getMxDayBounds(sample)

    // In winter, MX is UTC-6 -> 00:00 local = 06:00Z, 23:59:59.999 local = next day 05:59:59.999Z
    expect(startUtc.toISOString()).toBe(`${DAY_WINTER}T06:00:00.000Z`)
    expect(endUtc.toISOString()).toBe(`2025-01-16T05:59:59.999Z`)
  })

  it('formatMx formats in MX timezone', () => {
    // 16:30Z is 10:30 local in winter
    expect(formatMx(`${DAY_WINTER}T16:30:00.000Z`, 'HH:mm')).toBe('10:30')

    // Summer sample (no DST): 17:00Z is 11:00 local in July
    expect(formatMx(`${DAY_SUMMER}T17:00:00.000Z`, "yyyy-MM-dd HH:mm")).toBe(`${DAY_SUMMER} 11:00`)
  })

  it('mxLocalPartsToUtcIso converts MX local date/time to UTC ISO', () => {
    // Winter: 10:30 local -> 16:30Z
    expect(mxLocalPartsToUtcIso(DAY_WINTER, 10, 30)).toBe(z(`${DAY_WINTER}T16:30:00.000Z`))

    // Summer (no DST): 10:30 local -> 16:30Z
    expect(mxLocalPartsToUtcIso(DAY_SUMMER, 10, 30)).toBe(z(`${DAY_SUMMER}T16:30:00.000Z`))
  })

  it('mxNow reflects MX local wall-clock time when system time is mocked', () => {
    // System instant at 18:00Z should represent 12:00 in MX
    vi.setSystemTime(new Date(`${DAY_WINTER}T18:00:00.000Z`))
    // Use formatMx to read the wall-clock from mxNow
    const stamp = formatMx(mxNow(), 'yyyy-MM-dd HH:mm')
    expect(stamp).toBe(`${DAY_WINTER} 12:00`)
  })
})
