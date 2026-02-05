import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    // Include tests from both locations:
    // - tests/ — integration tests (full CLI commands with temp directories)
    // - src/**/__tests__/ — unit tests colocated with source (ESM compatibility, etc.)
    include: ['tests/**/*.test.ts', 'src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },
    testTimeout: 30_000, // CLI tests may need longer timeouts (file I/O, subprocess)
  },
});
