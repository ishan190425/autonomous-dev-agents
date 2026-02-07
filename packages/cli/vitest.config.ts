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
      // NOTE: CLI coverage thresholds disabled.
      // v8 coverage doesn't capture subprocess execution, which is how
      // integration tests run CLI commands. The 131 integration tests
      // provide thorough coverage, but v8 reports ~0% because the actual
      // code runs in child processes, not the test process.
      // See: Key Lessons in memory bank ("Subprocess testing doesn't show in v8 coverage")
      // Real coverage validation: 131 tests exercise all CLI commands end-to-end.
    },
    testTimeout: 30_000, // CLI tests may need longer timeouts (file I/O, subprocess)
  },
});
