/**
 * E2E Test Setup
 *
 * Global setup that runs before E2E tests to ensure @ada/core
 * is built with the latest changes. Fixes Issue #121: stale build
 * artifacts causing E2E test failures.
 *
 * The E2E harness uses `npx tsx` to run CLI source directly, but
 * imports from @ada/core resolve to dist/ (the built output).
 * If core changes aren't rebuilt, tests fail with cryptic errors.
 *
 * This setup ensures the core package is always fresh before tests.
 *
 * @module
 */

import { execSync } from 'child_process';
import { resolve } from 'path';

/**
 * Vitest globalSetup function
 *
 * Runs once before all tests in the test run.
 * Builds @ada/core to ensure E2E tests have fresh artifacts.
 */
export default function globalSetup(): void {
  const monorepoRoot = resolve(__dirname, '../../../../');

  console.log('\n🔧 E2E Setup: Building @ada/core to ensure fresh artifacts...');

  try {
    execSync('npm run build -w packages/core', {
      cwd: monorepoRoot,
      stdio: 'inherit',
      timeout: 60_000, // 60 second timeout for build
    });
    console.log('✅ @ada/core built successfully\n');
  } catch {
    console.error('❌ Failed to build @ada/core');
    console.error(
      'E2E tests may fail with stale artifact errors. See Issue #121.\n'
    );
    // Don't throw — let tests run and fail with actual error
    // This makes debugging easier than a cryptic setup failure
  }
}
