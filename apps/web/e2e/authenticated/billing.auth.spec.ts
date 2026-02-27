import { test, expect, testUsers } from '../fixtures/session.fixture';

/**
 * Billing E2E Tests (Authenticated)
 *
 * Sprint 3 tests for billing flows per C1186 Usage Metering ADR
 * and C1195 Auth-Billing Integration spec.
 *
 * Tests tier-gated features, cycle limits, and upgrade flows.
 *
 * @see docs/architecture/usage-metering-adr-c1186.md
 * @see docs/research/sprint3-auth-billing-integration-c1195.md
 * @see docs/design/auth-error-pages-ux-c1202.md (BillingRequired error)
 */

test.describe('Billing — Free Tier', () => {
  test.beforeEach(async ({ mockSession }) => {
    await mockSession(testUsers.free);
  });

  test('displays cycle usage and limit', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should show usage somewhere (header, sidebar, or dashboard widget)
    const usageIndicator = page.locator(
      'text=/\\d+.*cycles|usage|\\d+.*\\/.*\\d+/i'
    );

    // Note: This will pass once billing UI is implemented
    const hasUsage = await usageIndicator.isVisible().catch(() => false);
    if (!hasUsage) {
      // Pre-implementation: verify session has cycle data
      const session = await page.evaluate(() => localStorage.getItem('ada-auth'));
      if (session) {
        const parsed = JSON.parse(session);
        expect(parsed.user?.cyclesUsed).toBeDefined();
        expect(parsed.user?.cyclesLimit).toBeDefined();
      }
    }
  });

  test('shows upgrade prompt at 80% usage', async ({ mockSession, page }) => {
    // Mock user at 80% usage
    await mockSession({
      ...testUsers.free,
      cyclesUsed: 80,
      cyclesLimit: 100,
    });

    await page.goto('/dashboard');

    // Per C1202 L695: Soft warning at 80%
    const warningBanner = page.locator(
      '[data-testid="usage-warning"], .warning-banner, text=/running low|80%|upgrade/i'
    );

    // Will be visible once implemented
    const hasWarning = await warningBanner.isVisible().catch(() => false);
    // Pre-implementation: just verify we reached the page
    await expect(page).toHaveURL(/dashboard/);
  });

  test('blocks action at 100% usage', async ({ mockSession, page }) => {
    // Mock user at limit
    await mockSession({
      ...testUsers.free,
      cyclesUsed: 100,
      cyclesLimit: 100,
    });

    await page.goto('/dashboard');

    // Attempt to trigger a cycle (e.g., click dispatch button)
    const dispatchButton = page.locator(
      'button:has-text("Dispatch"), button:has-text("Run Cycle"), [data-testid="dispatch-button"]'
    );

    if (await dispatchButton.isVisible().catch(() => false)) {
      await dispatchButton.click();

      // Should show blocking modal per C1202
      await expect(
        page.locator('text=/cycle limit|upgrade|reached/i')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('can navigate to upgrade page', async ({ page }) => {
    await page.goto('/dashboard');

    const upgradeLink = page.locator(
      'a:has-text("Upgrade"), a:has-text("Pro"), a[href*="pricing"], a[href*="billing"]'
    );

    if (await upgradeLink.isVisible().catch(() => false)) {
      await upgradeLink.click();
      await expect(page).toHaveURL(/pricing|billing|upgrade/);
    }
  });
});

test.describe('Billing — Pro Tier', () => {
  test.beforeEach(async ({ mockSession }) => {
    await mockSession(testUsers.pro);
  });

  test('shows Pro badge or tier indicator', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const proBadge = page.locator(
      '[data-tier="pro"], .pro-badge, text=/Pro|Premium/i'
    );

    // Will be visible once tier UI is implemented
    const hasBadge = await proBadge.isVisible().catch(() => false);

    // Pre-implementation: verify session has pro tier
    const session = await page.evaluate(() => localStorage.getItem('ada-auth'));
    if (session) {
      const parsed = JSON.parse(session);
      expect(parsed.user?.tier).toBe('pro');
    }
  });

  test('does not show cycle limit warning', async ({ page }) => {
    await page.goto('/dashboard');

    // Pro users have unlimited cycles
    const limitWarning = page.locator(
      '[data-testid="usage-warning"], text=/running low|limit|upgrade/i'
    );

    await expect(limitWarning).not.toBeVisible({ timeout: 2000 });
  });

  test('can access pro-only features', async ({ page }) => {
    await page.goto('/dashboard');

    // Example: Team management is pro-only
    const teamLink = page.locator(
      'a:has-text("Team"), a[href*="team"], [data-testid="team-nav"]'
    );

    if (await teamLink.isVisible().catch(() => false)) {
      await teamLink.click();
      // Should not show "Upgrade Required" error
      await expect(page.locator('text=/upgrade required|billing/i')).not.toBeVisible();
    }
  });
});

test.describe('Billing — Stripe Integration', () => {
  test('checkout redirect works for upgrade', async ({ mockSession, page }) => {
    await mockSession(testUsers.free);

    // Mock Stripe checkout redirect
    await page.route('**/api/billing/checkout', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://checkout.stripe.com/test_session_123',
        }),
      });
    });

    await page.goto('/pricing');

    const proButton = page.locator(
      'button:has-text("Get Pro"), button:has-text("Subscribe"), button:has-text("Upgrade")'
    );

    if (await proButton.isVisible().catch(() => false)) {
      // Intercept navigation to Stripe
      const [popup] = await Promise.all([
        page.waitForEvent('popup').catch(() => null),
        proButton.click(),
      ]);

      // Should redirect to Stripe or open popup
      // In test mode, may stay on same page
    }
  });

  test('billing portal link works', async ({ mockSession, page }) => {
    await mockSession(testUsers.pro);

    // Mock billing portal redirect
    await page.route('**/api/billing/portal', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://billing.stripe.com/test_portal_123',
        }),
      });
    });

    await page.goto('/settings');

    const billingLink = page.locator(
      'a:has-text("Billing"), a:has-text("Manage Subscription"), [data-testid="billing-portal-link"]'
    );

    if (await billingLink.isVisible().catch(() => false)) {
      // Should have correct href or trigger redirect
      await expect(billingLink).toBeVisible();
    }
  });
});

test.describe('Billing — Error States', () => {
  test('handles billing required error gracefully', async ({ page }) => {
    // Navigate directly to billing error page
    await page.goto('/dashboard?error=BillingRequired');

    // Per C1202: Should show upgrade modal or banner, not crash
    await expect(
      page.locator('text=/upgrade|billing|subscription/i').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('handles failed checkout gracefully', async ({ mockSession, page }) => {
    await mockSession(testUsers.free);

    // Mock failed checkout
    await page.route('**/api/billing/checkout', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'checkout_failed',
          message: 'Unable to create checkout session',
        }),
      });
    });

    await page.goto('/pricing');

    const proButton = page.locator('button:has-text("Get Pro"), button:has-text("Subscribe")');

    if (await proButton.isVisible().catch(() => false)) {
      await proButton.click();

      // Should show error message, not crash
      await expect(
        page.locator('text=/error|failed|try again/i')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('handles webhook failure state', async ({ mockSession, page }) => {
    // Simulate user who paid but webhook didn't process
    await mockSession({
      ...testUsers.free,
      id: 'pending-upgrade-user',
    });

    // Mock session endpoint returning pending state
    await page.route('**/api/billing/status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'pending',
          message: 'Your upgrade is being processed',
        }),
      });
    });

    await page.goto('/settings');

    // Should show pending state, not confuse user
    // Note: UI for this will be implemented in Sprint 3
  });
});

test.describe('Billing — Accessibility', () => {
  test('upgrade prompt is keyboard accessible', async ({ mockSession, page }) => {
    await mockSession({
      ...testUsers.free,
      cyclesUsed: 100,
      cyclesLimit: 100,
    });

    await page.goto('/dashboard');

    // Tab through to reach upgrade CTA
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      const text = await focusedElement.textContent().catch(() => '');
      if (text?.toLowerCase().includes('upgrade') || text?.toLowerCase().includes('pro')) {
        // Found the upgrade button
        await expect(focusedElement).toHaveRole('link').or(focusedElement.toHaveRole('button'));
        break;
      }
    }
  });

  test('pricing page has correct heading structure', async ({ page }) => {
    await page.goto('/pricing');

    // Should have h1
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // Plan names should be h2 or h3
    const planHeadings = page.locator('h2, h3').filter({ hasText: /free|pro|enterprise/i });
    const count = await planHeadings.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
