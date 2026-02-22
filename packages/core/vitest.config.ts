import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // OOM Prevention (Issue #236): Limit parallelism and memory
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 2, // Down from 8-12 default, prevents 13GB+ RAM usage
        minThreads: 1,
      },
    },
    isolate: true, // Ensure test isolation between files
    clearMocks: true, // Clear mocks after each test
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/types.ts'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    testTimeout: 10_000,
  },
});
