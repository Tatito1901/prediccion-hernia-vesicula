import { describe, it, expect } from 'vitest'
import { __getServerSnapshotForTest } from '@/hooks/use-breakpoint'

/**
 * Verifica que el snapshot de SSR sea estable (misma referencia)
 * y que todos los valores sean false en entorno de servidor.
 */
describe('use-breakpoint SSR snapshot', () => {
  it('returns a stable reference across calls', () => {
    const a = __getServerSnapshotForTest()
    const b = __getServerSnapshotForTest()
    expect(a).toBe(b)
  })

  it('has all values false in SSR and includes expected keys', () => {
    const s = __getServerSnapshotForTest()
    // Todos los valores deben ser false en SSR
    expect(Object.values(s).every((v) => v === false)).toBe(true)
    // Spot-check de llaves esperadas
    expect('mobile' in s && 'tablet' in s && 'desktop' in s && 'largeDesktop' in s).toBe(true)
  })
})
