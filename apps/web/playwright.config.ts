import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for ADA Dashboard
 *
 * @see https://playwright.dev/docs/test-configuration
 *
 * Test Projects:
 * - unauthenticated: Tests that don't require auth (login page, public pages)
 * - mocked-auth: Fast tests using session fixtures (no real OAuth)
 * - setup: Real OAuth authentication setup
 * - authenticated: Tests requiring real OAuth (nightly only)
 *
 * Sprint 3 setup (C1129, C1149, C1150)
 * @see docs/qa/sprint3-testing-infrastructure-spec-c1149.md
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI for reliability */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'on-first-retry',
  },

  /* Configure projects for different test scenarios */
  projects: [
    // ============================================
    // FAST TESTS (Every PR) — No real OAuth needed
    // ============================================

    /**
     * Unauthenticated Tests
     * - Login page UI
     * - Public pages
     * - Pre-auth flows
     *
     * Run: npm run test:e2e:fast
     */
    {
      name: 'unauthenticated',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [
        '**/*.unauthenticated.spec.ts',
        '**/login.*.spec.ts',
      ],
      testIgnore: [
        '**/authenticated/**',
        '**/fixtures/**',
      ],
    },

    /**
     * Mocked Auth Tests
     * - Dashboard flows with mocked sessions
     * - Fast, no external OAuth
     * - Uses session.fixture.ts
     *
     * Run: npm run test:e2e:mocked
     */
    {
      name: 'mocked-auth',
      use: { ...devices['Desktop Chrome'] },
      testDir: './e2e/authenticated',
      testMatch: '**/*.auth.spec.ts',
    },

    // ============================================
    // AUTHENTICATED TESTS (Nightly) — Real OAuth
    // ============================================

    /**
     * Auth Setup Project
     * - Runs real GitHub OAuth flow
     * - Saves auth state for dependent tests
     * - Requires TEST_AUTH_REAL=true and GitHub test credentials
     */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    /**
     * Real Authenticated Tests
     * - Requires setup to run first
     * - Uses real OAuth session state
     * - For nightly CI only (slower, flakier)
     */
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
      testDir: './e2e/authenticated',
      testMatch: '**/*.real-auth.spec.ts', // Future: tests requiring real auth
    },

    // ============================================
    // CROSS-BROWSER (Secondary priority)
    // ============================================

    /**
     * Firefox (mocked auth)
     */
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testDir: './e2e/authenticated',
      testMatch: '**/*.auth.spec.ts',
    },

    /**
     * WebKit/Safari (mocked auth)
     */
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testDir: './e2e/authenticated',
      testMatch: '**/*.auth.spec.ts',
    },

    // ============================================
    // MOBILE (mocked auth)
    // ============================================

    /**
     * Mobile Chrome
     */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testDir: './e2e/authenticated',
      testMatch: '**/*.auth.spec.ts',
    },

    /**
     * Mobile Safari
     */
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      testDir: './e2e/authenticated',
      testMatch: '**/*.auth.spec.ts',
    },
  ],

  /* Run local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for Next.js cold start
  },

  /* Output folder for test artifacts */
  outputDir: 'test-results',

  /* Global timeout */
  timeout: 30 * 1000,

  /* Expect timeout */
  expect: {
    timeout: 10 * 1000,
  },
});
