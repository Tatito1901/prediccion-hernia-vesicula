import { describe, it, expect } from 'vitest';
import { ZNewLeadSchema } from '@/lib/validation/leads';
import { CONTACT_CHANNEL_VALUES, LEAD_MOTIVE_VALUES } from '@/lib/validation/enums';

describe('ZNewLeadSchema', () => {
  it('accepts a valid lead', () => {
    const channel = CONTACT_CHANNEL_VALUES[0] as any;
    const motive = LEAD_MOTIVE_VALUES[0] as any;
    const res = ZNewLeadSchema.safeParse({
      full_name: 'Juan Perez',
      phone_number: '+52 123 456 7890',
      channel,
      motive,
      notes: 'Quiere información',
    });
    expect(res.success).toBe(true);
  });

  it('rejects unknown fields and invalid enums', () => {
    const res = ZNewLeadSchema.safeParse({
      full_name: 'A', // too short
      phone_number: 'abc', // invalid
      channel: 'EMAILX', // invalid enum
      motive: 'FOO', // invalid enum
      extra: 'nope', // unknown
    } as any);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.length).toBeGreaterThan(1);
    }
  });
});
