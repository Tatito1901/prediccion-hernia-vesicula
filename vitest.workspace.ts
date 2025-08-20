import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      include: ['tests/**/*.test.ts'],
      environment: 'node',
      pool: 'threads',
      fileParallelism: true,
      restoreMocks: true,
      clearMocks: true,
      mockReset: true,
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'ui',
      include: ['tests/**/*.test.tsx'],
      environment: 'jsdom',
      pool: 'forks',
      poolOptions: {
        forks: {
          singleFork: true,
        },
      },
      fileParallelism: false,
      bail: 1,
      restoreMocks: true,
      clearMocks: true,
      mockReset: true,
      environmentOptions: {
        jsdom: {
          url: 'http://localhost/',
          pretendToBeVisual: true,
        },
      },
    },
  },
]);
