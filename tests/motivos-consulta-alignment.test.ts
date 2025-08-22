import { describe, it, expect } from 'vitest';
import { ZDiagnosisDb, DIAGNOSIS_DB_VALUES, dbDiagnosisToDisplay } from '@/lib/validation/enums';

describe('Diagnóstico enum alignment', () => {
  it('includes hernia inguinal y umbilical en los valores del enum', () => {
    expect(DIAGNOSIS_DB_VALUES).toContain('HERNIA_INGUINAL');
    expect(DIAGNOSIS_DB_VALUES).toContain('HERNIA_UMBILICAL');
    expect(ZDiagnosisDb.safeParse('HERNIA_INGUINAL').success).toBe(true);
    expect(ZDiagnosisDb.safeParse('HERNIA_UMBILICAL').success).toBe(true);
  });

  it('provee etiquetas de display legibles', () => {
    expect(dbDiagnosisToDisplay('HERNIA_INGUINAL')).toBe('Hernia inguinal');
    expect(dbDiagnosisToDisplay('HERNIA_UMBILICAL')).toBe('Hernia umbilical');
  });
});
