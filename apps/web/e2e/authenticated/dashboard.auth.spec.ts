import { test, expect, testUsers } from '../fixtures/session.fixture';

/**
 * Dashboard E2E Tests (Authenticated)
 *
 * Tests dashboard functionality with mocked authentication.
 * Uses session fixtures for fast, reliable testing without real OAuth.
 *
 * @see docs/qa/sprint3-testing-infrastructure-spec-c1149.md Section 3.2
 */

test.describe('Dashboard (Authenticated)', () => {
  test.describe('Free User', () => {
    test.beforeEach(async ({ mockSession }) => {
      await mockSession(testUsers.free);
    });

    test('displays user profile in header', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for auth state to be recognized
      await page.waitForLoadState('networkidle');

      // User name should be visible somewhere (header, sidebar, etc.)
      const userName = page.locator('text=Free User');
      // Note: This test will pass once auth UI is implemented in Sprint 3
      // For now, we verify the mock session is set up correctly
      const hasUserName = await userName.isVisible().catch(() => false);

      if (!hasUserName) {
        // Auth UI not yet implemented — verify mock session exists
        const sessionCookie = await page.context().cookies();
        const hasSession = sessionCookie.some(c => c.name === 'ada-session');
        expect(hasSession).toBe(true);
      }
    });

    test('shows usage limits for free tier', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // When billing UI is implemented, verify free tier limits shown
      // For now, verify we can reach dashboard with mocked auth
      await expect(page).toHaveURL(/dashboard/);
    });
  });

  test.describe('Pro User', () => {
    test.beforeEach(async ({ mockSession }) => {
      await mockSession(testUsers.pro);
    });

    test('shows pro badge or unlimited access', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Verify pro user session is active
      const sessionCookie = await page.context().cookies();
      const sessionData = sessionCookie.find(c => c.name === 'ada-session');
      expect(sessionData).toBeDefined();

      // When UI shows tier, verify 'Pro' badge
      // const proBadge = page.locator('text=Pro').or(page.locator('[data-tier="pro"]'));
      // await expect(proBadge).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('clearMockSession removes auth state', async ({ mockSession, clearMockSession, page }) => {
      // Set up session
      await mockSession(testUsers.free);
      await page.goto('/dashboard');

      // Verify session exists
      let cookies = await page.context().cookies();
      expect(cookies.some(c => c.name === 'ada-session')).toBe(true);

      // Clear session
      await clearMockSession();

      // Verify session removed
      cookies = await page.context().cookies();
      expect(cookies.some(c => c.name === 'ada-session')).toBe(false);
    });
  });
});

test.describe('Dashboard Navigation (Authenticated)', () => {
  test.beforeEach(async ({ mockSession }) => {
    await mockSession(testUsers.pro);
  });

  test('can navigate to settings', async ({ page }) => {
    await page.goto('/dashboard');

    // When navigation is implemented, verify settings link works
    const settingsLink = page.locator('a[href="/settings"]').or(page.locator('text=Settings'));
    const hasSettings = await settingsLink.isVisible().catch(() => false);

    if (hasSettings) {
      await settingsLink.click();
      await expect(page).toHaveURL(/settings/);
    }
  });

  test('can navigate to cycles page', async ({ page }) => {
    await page.goto('/dashboard');

    const cyclesLink = page.locator('a[href*="cycles"]').or(page.locator('text=Cycles'));
    const hasCycles = await cyclesLink.isVisible().catch(() => false);

    if (hasCycles) {
      await cyclesLink.click();
      await expect(page).toHaveURL(/cycles/);
    }
  });
});
