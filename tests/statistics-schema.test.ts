import { describe, it, expect } from 'vitest';
import { ZStatisticsResponse } from '@/lib/validation/statistics';

const isoNow = () => new Date().toISOString();

describe('ZStatisticsResponse schema', () => {
  it('accepts a full valid payload (gender as object)', () => {
    const sample = {
      clinicalProfile: {
        diagnoses_distribution: [
          { label: 'Hernia inguinal', count: 10 },
          { label: 'Colelitiasis', count: 7 },
        ],
        top_diagnoses: [
          { label: 'Hernia inguinal', count: 10 },
        ],
      },
      demographicProfile: {
        gender_distribution: { male: 3, female: 5, other: 1 },
        age_groups: [
          { label: '18-30 años', count: 4 },
          { label: '31-50 años', count: 3 },
        ],
      },
      operationalMetrics: {
        appointments_by_status: [
          { status: 'COMPLETADA', count: 5 },
          { status: 'PROGRAMADA', count: 2 },
          { status: 'CANCELADA', count: 1 },
        ],
        no_show_rate: 12.34,
        punctuality_rate: 88.88,
      },
      meta: { generatedAt: isoNow(), partial: false },
    };

    const parsed = ZStatisticsResponse.safeParse(sample);
    expect(parsed.success).toBe(true);
  });

  it('accepts gender_distribution as an array of label-count', () => {
    const sample = {
      demographicProfile: {
        gender_distribution: [
          { label: 'Male', count: 3 },
          { label: 'Female', count: 5 },
          { label: 'Other', count: 1 },
        ],
      },
      meta: { generatedAt: isoNow(), partial: true },
    };
    const parsed = ZStatisticsResponse.safeParse(sample);
    expect(parsed.success).toBe(true);
  });

  it('accepts partial payload with nulls and missing sections', () => {
    const sample = {
      clinicalProfile: null,
      demographicProfile: { age_groups: null },
      operationalMetrics: {
        appointments_by_status: null,
        no_show_rate: null,
        punctuality_rate: null,
      },
      meta: { generatedAt: isoNow(), partial: true },
    };
    const parsed = ZStatisticsResponse.safeParse(sample);
    expect(parsed.success).toBe(true);
  });

  it('fails when meta is missing', () => {
    const bad = {
      clinicalProfile: {},
    } as any;
    const parsed = ZStatisticsResponse.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it('fails when meta has wrong types', () => {
    const bad = {
      meta: { generatedAt: 123, partial: 'no' },
    } as any;
    const parsed = ZStatisticsResponse.safeParse(bad);
    expect(parsed.success).toBe(false);
  });
});
