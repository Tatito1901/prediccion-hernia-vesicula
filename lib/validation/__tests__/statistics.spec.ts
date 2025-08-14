import { describe, it, expect } from 'vitest';
import { ZStatisticsResponse } from '../statistics';

describe('ZStatisticsResponse', () => {
  it('accepts a complete valid response', () => {
    const input = {
      clinicalProfile: {
        diagnoses_distribution: [
          { diagnosis: 'Hernia', count: 12 },
          { diagnosis: 'Vesícula', count: 8 },
        ],
        surgical_vs_conservative: { surgicalCount: 10, conservativeCount: 5 },
        horizon_trends: [
          { date: '2025-01-01', value: 5 },
          { date: '2025-01-02', value: 7 },
        ],
      },
      demographicProfile: {
        gender_distribution: [
          { label: 'Male', count: 12 },
          { label: 'Female', count: 10 },
          { label: 'Other', count: 1 },
        ],
        age_buckets: [
          { label: '18-25', count: 4 },
          { label: '26-35', count: 8 },
        ],
      },
      operationalMetrics: {
        appointments_by_status: [
          { status: 'PROGRAMADA', count: 10 },
          { status: 'COMPLETADA', count: 7 },
          { status: 'CANCELADA', count: 2 },
        ],
        no_show_rate: 5.2,
        punctuality_rate: 92.5,
      },
      meta: { generatedAt: new Date().toISOString(), partial: false },
    };

    const res = ZStatisticsResponse.safeParse(input);
    expect(res.success).toBe(true);
  });

  it('accepts partial responses with null sections', () => {
    const input = {
      clinicalProfile: null,
      demographicProfile: null,
      operationalMetrics: { appointments_by_status: [], no_show_rate: 0, punctuality_rate: 0 },
      meta: { generatedAt: new Date().toISOString(), partial: true },
    };
    const res = ZStatisticsResponse.safeParse(input);
    expect(res.success).toBe(true);
  });

  it('rejects responses without meta or with wrong types', () => {
    const bad = {
      clinicalProfile: {},
      demographicProfile: {},
      operationalMetrics: {},
      // missing meta
    } as any;
    const res = ZStatisticsResponse.safeParse(bad);
    expect(res.success).toBe(false);
  });
});
