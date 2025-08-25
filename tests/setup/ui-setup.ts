// Vitest UI setup: extend matchers and polyfills
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Polyfill matchMedia for components relying on it (e.g., useIsMobile)
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  })
}
