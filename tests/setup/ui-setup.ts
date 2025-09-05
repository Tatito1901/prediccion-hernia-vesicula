import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Polyfills for jsdom environment
// IntersectionObserver is not implemented in jsdom; provide a minimal mock
if (typeof (globalThis as any).IntersectionObserver === 'undefined') {
  class MockIntersectionObserver {
    constructor(_cb: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] { return []; }
  }
  ;(globalThis as any).IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
}

// Ensure DOM is reset after each test to avoid leaking open dialogs/overlays
afterEach(() => {
  cleanup();
});
