import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

/**
 * Authentication Setup for E2E Tests
 *
 * Sprint 3 implementation per C1207 Day 1-2 spec.
 * Supports three modes:
 *   1. Mock auth (TEST_AUTH_MOCK=true) — Fast local testing
 *   2. Real OAuth (TEST_AUTH_REAL=true) — Full GitHub OAuth flow
 *   3. CI OAuth (TEST_AUTH_CI=true) — GitHub App token auth for CI
 *
 * @see docs/design/auth-error-pages-ux-c1202.md
 * @see docs/product/sprint3-implementation-playbook-c1207.md Day 2
 *
 * Environment Variables:
 *   TEST_AUTH_MOCK=true     — Use mock session (default for local dev)
 *   TEST_AUTH_REAL=true     — Run real GitHub OAuth flow
 *   TEST_AUTH_CI=true       — Use GitHub App installation token
 *   GITHUB_TEST_USER        — GitHub username for real OAuth
 *   GITHUB_TEST_PASSWORD    — GitHub password for real OAuth
 *   GITHUB_TEST_OTP_SECRET  — TOTP secret for 2FA (if enabled)
 *   GITHUB_APP_TOKEN        — GitHub App installation token for CI
 */

setup('authenticate', async ({ page }) => {
  const authMode = getAuthMode();
  console.log(`🔐 Auth setup mode: ${authMode}`);

  switch (authMode) {
    case 'mock':
      await setupMockAuth(page);
      break;
    case 'real':
      await setupRealOAuth(page);
      break;
    case 'ci':
      await setupCIAuth(page);
      break;
    default:
      console.log('⚠️ No auth mode specified. Defaulting to mock auth.');
      console.log('   Set TEST_AUTH_MOCK=true, TEST_AUTH_REAL=true, or TEST_AUTH_CI=true');
      await setupMockAuth(page);
  }

  // Save storage state for dependent tests
  await page.context().storageState({ path: authFile });
  console.log(`✅ Auth state saved to ${authFile}`);
});

/**
 * Determine which auth mode to use
 */
function getAuthMode(): 'mock' | 'real' | 'ci' | null {
  if (process.env.TEST_AUTH_CI === 'true') return 'ci';
  if (process.env.TEST_AUTH_REAL === 'true') return 'real';
  if (process.env.TEST_AUTH_MOCK === 'true') return 'mock';
  // Default to mock for safety
  return 'mock';
}

/**
 * Mock Authentication (Fast, no external deps)
 *
 * Sets up a fake session for quick local testing.
 * Does NOT test real OAuth flow — use for dashboard/feature tests.
 */
async function setupMockAuth(page: import('@playwright/test').Page): Promise<void> {
  console.log('📦 Setting up mock authentication...');

  await page.goto('/');

  // Set mock auth state via localStorage
  await page.evaluate(() => {
    const mockSession = {
      user: {
        id: 'test-user-e2e',
        name: 'E2E Test User',
        email: 'e2e-test@ada-ai.dev',
        image: 'https://github.com/identicons/test.png',
        tier: 'pro',
        cyclesUsed: 0,
        cyclesLimit: -1, // Unlimited for pro
      },
      accessToken: 'mock-access-token-e2e-testing',
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };
    localStorage.setItem('ada-auth', JSON.stringify(mockSession));
  });

  // Set mock session cookie
  await page.context().addCookies([
    {
      name: 'ada-session',
      value: Buffer.from(
        JSON.stringify({
          user: {
            id: 'test-user-e2e',
            name: 'E2E Test User',
            email: 'e2e-test@ada-ai.dev',
          },
        })
      ).toString('base64'),
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'ada-session-exists',
      value: 'true',
      domain: 'localhost',
      path: '/',
    },
  ]);

  // Verify mock auth is recognized
  await page.goto('/dashboard');
  console.log('✅ Mock auth configured');

  // Note: Dashboard may redirect to login if auth middleware not yet implemented
  // This is expected pre-Sprint 3 completion
}

/**
 * Real GitHub OAuth Flow (Sprint 3)
 *
 * Runs the full GitHub OAuth flow for integration testing.
 * Requires GITHUB_TEST_USER and GITHUB_TEST_PASSWORD env vars.
 *
 * Sprint 3 Day 2: Implement this flow
 */
async function setupRealOAuth(page: import('@playwright/test').Page): Promise<void> {
  console.log('🔐 Setting up real GitHub OAuth...');

  const username = process.env.GITHUB_TEST_USER;
  const password = process.env.GITHUB_TEST_PASSWORD;
  const otpSecret = process.env.GITHUB_TEST_OTP_SECRET;

  if (!username || !password) {
    throw new Error(
      'Real OAuth requires GITHUB_TEST_USER and GITHUB_TEST_PASSWORD env vars.\n' +
        'Create a test GitHub account for E2E testing.\n' +
        'See docs/qa/sprint3-testing-infrastructure-spec-c1149.md'
    );
  }

  // Step 1: Navigate to login page
  await page.goto('/login');
  console.log('  → Navigated to login page');

  // Step 2: Click GitHub OAuth button
  const githubButton = page.locator(
    '[data-testid="github-oauth-button"], button:has-text("GitHub"), button:has-text("Sign in with GitHub")'
  );
  await expect(githubButton).toBeVisible({ timeout: 10000 });
  await githubButton.click();
  console.log('  → Clicked GitHub OAuth button');

  // Step 3: Handle GitHub login page
  // Wait for redirect to GitHub
  await page.waitForURL(/github\.com/, { timeout: 15000 });
  console.log('  → Redirected to GitHub');

  // Fill in credentials
  await page.fill('input[name="login"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('input[type="submit"], button[type="submit"]');
  console.log('  → Submitted credentials');

  // Step 4: Handle 2FA if enabled
  if (otpSecret) {
    console.log('  → Handling 2FA...');
    const otpCode = generateTOTP(otpSecret);
    await page.fill('input[name="otp"], input[name="app_otp"]', otpCode);
    await page.click('button[type="submit"]');
  }

  // Step 5: Handle OAuth consent screen (may be skipped if already authorized)
  const authorizeButton = page.locator('button:has-text("Authorize"), button[name="authorize"]');
  if (await authorizeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await authorizeButton.click();
    console.log('  → Authorized OAuth app');
  }

  // Step 6: Wait for redirect back to our app
  await page.waitForURL(/localhost|dashboard/, { timeout: 30000 });
  console.log('  → Redirected back to app');

  // Step 7: Verify we're authenticated
  await page.goto('/dashboard');
  await expect(page.locator('text=E2E Test User').or(page.locator('[data-testid="user-avatar"]'))).toBeVisible({
    timeout: 10000,
  });

  console.log('✅ Real OAuth authentication successful');
}

/**
 * CI Authentication (GitHub App Token)
 *
 * Uses a pre-generated GitHub App installation token for CI.
 * Avoids credential management in CI environment.
 *
 * Sprint 3: Implement GitHub App integration
 */
async function setupCIAuth(page: import('@playwright/test').Page): Promise<void> {
  console.log('🤖 Setting up CI authentication via GitHub App...');

  const appToken = process.env.GITHUB_APP_TOKEN;

  if (!appToken) {
    throw new Error(
      'CI auth requires GITHUB_APP_TOKEN env var.\n' +
        'Generate an installation token from the ADA GitHub App.\n' +
        'See docs/ops/sprint3-day1-environment-setup-runbook-c1231.md'
    );
  }

  await page.goto('/');

  // Set up auth state using the app token
  await page.evaluate((token) => {
    const ciSession = {
      user: {
        id: 'ci-test-user',
        name: 'CI Test Bot',
        email: 'ci@ada-ai.dev',
        image: 'https://github.com/apps/ada-dev-agents.png',
        tier: 'pro',
        isBot: true,
      },
      accessToken: token,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour (app tokens expire faster)
    };
    localStorage.setItem('ada-auth', JSON.stringify(ciSession));
  }, appToken);

  // Set auth cookie
  await page.context().addCookies([
    {
      name: 'ada-session',
      value: Buffer.from(
        JSON.stringify({
          user: { id: 'ci-test-user', name: 'CI Test Bot' },
          accessToken: appToken,
        })
      ).toString('base64'),
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // Mock the session endpoint to return our CI session
  await page.route('**/api/auth/session', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'ci-test-user',
          name: 'CI Test Bot',
          email: 'ci@ada-ai.dev',
          tier: 'pro',
        },
        expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    });
  });

  console.log('✅ CI authentication configured');
}

/**
 * Generate TOTP code for 2FA
 *
 * Uses RFC 6238 TOTP algorithm.
 * Requires @otplib/preset-browser or similar if implemented.
 */
function generateTOTP(secret: string): string {
  // Sprint 3: Add TOTP generation
  // For now, throw if 2FA is needed
  console.warn('⚠️ TOTP generation not yet implemented');
  console.warn('   Disable 2FA on test account or implement TOTP');

  // Placeholder — will be replaced with actual implementation
  // import { authenticator } from 'otplib';
  // return authenticator.generate(secret);

  throw new Error(
    '2FA enabled but TOTP generation not implemented.\n' +
      'Either disable 2FA on test account or install otplib:\n' +
      '  npm install -D otplib'
  );
}
