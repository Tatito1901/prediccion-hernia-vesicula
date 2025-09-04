import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Ensure DOM is reset after each test to avoid leaking open dialogs/overlays
afterEach(() => {
  cleanup();
});
