import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

/**
 * Authentication Setup for E2E Tests
 *
 * This setup runs before authenticated tests and saves the auth state.
 * Sprint 3 will implement GitHub OAuth; for now, we use a mock.
 *
 * @see docs/design/auth-ux-spec-c1122.md for auth flow design
 */
setup('authenticate', async ({ page }) => {
  // Sprint 3 Day 1-2: Replace with GitHub OAuth flow
  // For now, mock authentication state

  if (process.env.TEST_AUTH_MOCK === 'true') {
    // Mock authentication for local development
    await page.goto('/');

    // Set mock auth cookies/storage
    await page.evaluate(() => {
      localStorage.setItem(
        'ada-auth',
        JSON.stringify({
          user: {
            id: 'test-user-1',
            name: 'Test User',
            email: 'test@ada-ai.dev',
            image: 'https://github.com/identicons/test.png',
          },
          accessToken: 'mock-token-for-e2e-testing',
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        })
      );
    });

    // Verify mock auth
    await page.goto('/dashboard');
    await expect(page.locator('text=Test User').or(page.locator('[data-testid="user-avatar"]'))).toBeVisible({
      timeout: 5000,
    });
  } else {
    // Real GitHub OAuth flow (Sprint 3)
    // 1. Navigate to login page
    await page.goto('/login');

    // 2. Click GitHub OAuth button
    // await page.click('[data-testid="github-oauth-button"]');

    // 3. Complete GitHub OAuth (handled by Playwright's browser context)
    // This requires:
    //   - GITHUB_TEST_USER and GITHUB_TEST_PASSWORD env vars
    //   - Or GitHub App installation with test user

    // 4. Wait for redirect back to dashboard
    // await page.waitForURL('/dashboard');

    // For now, skip if no mock
    console.log('⚠️ Real OAuth not implemented yet. Set TEST_AUTH_MOCK=true for mock auth.');
  }

  // Save storage state
  await page.context().storageState({ path: authFile });
});
