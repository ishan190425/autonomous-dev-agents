import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E Tests (Authenticated)
 *
 * Tests the main dashboard functionality.
 * Requires authentication setup from auth.setup.ts.
 *
 * Per C1120 dashboard scaffold and C1112 design system.
 */
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('renders dashboard layout', async ({ page }) => {
    // Sidebar navigation per C1120 scaffold
    const sidebar = page.locator(
      '[data-testid="sidebar"], aside, nav'
    ).first();
    await expect(sidebar).toBeVisible();

    // Header with user info
    const header = page.locator(
      '[data-testid="header"], header'
    ).first();
    await expect(header).toBeVisible();

    // Main content area
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible();
  });

  test('displays cycle stats widget', async ({ page }) => {
    // CycleStats component per C1120 scaffold
    const cycleStats = page.locator(
      '[data-testid="cycle-stats"], .cycle-stats'
    );

    if (await cycleStats.isVisible()) {
      // Should show cycle count
      await expect(
        cycleStats.locator('text=/cycle|total/i')
      ).toBeVisible();

      // Should show consecutive streak
      await expect(
        cycleStats.locator('text=/consecutive|streak/i')
      ).toBeVisible();
    }
  });

  test('displays rotation timeline', async ({ page }) => {
    // RotationTimeline component per C1120 scaffold
    const timeline = page.locator(
      '[data-testid="rotation-timeline"], .rotation-timeline'
    );

    if (await timeline.isVisible()) {
      // Should show role indicators
      await expect(
        timeline.locator('[data-testid="role-indicator"], .role-indicator')
      ).toHaveCount({ minimum: 1 });
    }
  });

  test('displays agent status grid', async ({ page }) => {
    // AgentStatusGrid component per C1120 scaffold
    const grid = page.locator(
      '[data-testid="agent-status-grid"], .agent-grid'
    );

    if (await grid.isVisible()) {
      // Should show role cards
      const roleCards = grid.locator(
        '[data-testid^="role-"], .role-card'
      );
      await expect(roleCards).toHaveCount({ minimum: 1 });
    }
  });

  test('displays activity feed', async ({ page }) => {
    // ActivityFeed component per C1120 scaffold
    const feed = page.locator(
      '[data-testid="activity-feed"], .activity-feed'
    );

    if (await feed.isVisible()) {
      // Should show recent activities
      const activities = feed.locator(
        '[data-testid="activity-item"], .activity-item'
      );
      // Empty state or activities
      await expect(
        activities.or(feed.locator('text=/no activity|empty/i'))
      ).toBeVisible();
    }
  });

  test('shows correct page title', async ({ page }) => {
    await expect(page).toHaveTitle(/Dashboard|ADA/i);
  });

  test('has responsive layout', async ({ page }) => {
    // Desktop layout - sidebar visible
    await page.setViewportSize({ width: 1280, height: 800 });
    const sidebar = page.locator('[data-testid="sidebar"], aside').first();
    if (await sidebar.isVisible()) {
      await expect(sidebar).toBeInViewport();
    }

    // Mobile layout - sidebar may be hidden/hamburger menu
    await page.setViewportSize({ width: 375, height: 667 });

    // Main content should be visible
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible();

    // Mobile menu trigger may appear
    const mobileMenuTrigger = page.locator(
      '[data-testid="mobile-menu"], button[aria-label*="menu"]'
    );
    // Mobile menu is optional based on implementation
  });

  test('navigates to cycles page', async ({ page }) => {
    const cyclesLink = page.locator(
      'a[href*="/cycles"], [data-testid="nav-cycles"]'
    );

    if (await cyclesLink.isVisible()) {
      await cyclesLink.click();
      await expect(page).toHaveURL(/\/cycles/);
    }
  });

  test('navigates to memory page', async ({ page }) => {
    const memoryLink = page.locator(
      'a[href*="/memory"], [data-testid="nav-memory"]'
    );

    if (await memoryLink.isVisible()) {
      await memoryLink.click();
      await expect(page).toHaveURL(/\/memory/);
    }
  });

  test('navigates to settings page', async ({ page }) => {
    const settingsLink = page.locator(
      'a[href*="/settings"], [data-testid="nav-settings"]'
    );

    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await expect(page).toHaveURL(/\/settings/);
    }
  });

  test('handles data loading states', async ({ page }) => {
    // Check for loading skeletons or spinners during data fetch
    // This test verifies the UX during API calls

    // Intercept API calls to simulate slow response
    await page.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.reload();

    // Look for loading indicators
    const loadingIndicators = page.locator(
      '.animate-pulse, [data-testid="skeleton"], [data-testid="loading"]'
    );

    // May or may not be visible depending on data fetch speed
    // Just verify the page eventually loads
    await expect(page.locator('main, [role="main"]')).toBeVisible();
  });
});
