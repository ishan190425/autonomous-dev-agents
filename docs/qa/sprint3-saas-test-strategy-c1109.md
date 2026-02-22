# Sprint 3 SaaS E2E Test Strategy

> QA test strategy for Sprint 3 SaaS Container components
> **Created:** 2026-02-22 | **Cycle:** 1109 | **Author:** 🔍 The Inspector

---

## Overview

Sprint 3 (Mar 1-14) introduces the SaaS Container with authentication, billing, and managed execution. This document outlines the E2E testing strategy for these new components.

### Components in Scope

| Issue | Component                   | Test Type                      | Priority |
| ----- | --------------------------- | ------------------------------ | -------- |
| #181  | GitHub OAuth Authentication | E2E (Playwright)               | P0       |
| #182  | Stripe Billing Integration  | E2E (Playwright) + API         | P0       |
| #189  | Managed Agent Execution     | E2E (Playwright) + Integration | P0       |
| #190  | REST API Gateway            | API + Integration              | P0       |
| #200  | Waitlist Website            | E2E (Playwright)               | P1       |

---

## Phase 1: Infrastructure Setup (Day 1-2)

### Playwright Installation

```bash
# Install Playwright and browsers
npm install -D @playwright/test
npx playwright install

# Create Playwright config
# Target: apps/web/playwright.config.ts
```

### Test Environment

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['github']],
  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Test Database Strategy

| Environment | Database               | Reset Strategy                |
| ----------- | ---------------------- | ----------------------------- |
| Local Dev   | SQLite / Test Supabase | Per-test transaction rollback |
| CI          | Test Supabase Project  | Fresh schema per run          |
| Staging     | Staging Supabase       | Manual seeding                |

---

## Phase 2: Authentication Testing (#181)

### Test Scenarios

```typescript
// apps/web/tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('GitHub OAuth Authentication', () => {
  test.describe('Login Flow', () => {
    test('shows GitHub login button on landing page', async ({ page }) => {
      await page.goto('/');
      await expect(
        page.getByRole('button', { name: /sign in with github/i })
      ).toBeVisible();
    });

    test('redirects to GitHub OAuth on click', async ({ page }) => {
      await page.goto('/');
      const [popup] = await Promise.all([
        page.waitForEvent('popup'),
        page.getByRole('button', { name: /sign in with github/i }).click(),
      ]);
      expect(popup.url()).toContain('github.com/login/oauth');
    });

    test('handles OAuth callback and creates session', async ({ page }) => {
      // Mock OAuth callback with test code
      await page.goto('/api/auth/callback/github?code=test_code');
      await expect(page).toHaveURL('/dashboard');
      await expect(page.getByTestId('user-menu')).toBeVisible();
    });

    test('persists session across page reloads', async ({ page }) => {
      // Login first
      await loginWithTestUser(page);
      await page.reload();
      await expect(page.getByTestId('user-menu')).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('redirects unauthenticated users to login', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/login|signin/i);
    });

    test('allows authenticated users to access dashboard', async ({ page }) => {
      await loginWithTestUser(page);
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/dashboard');
    });
  });

  test.describe('Logout', () => {
    test('clears session on logout', async ({ page }) => {
      await loginWithTestUser(page);
      await page.getByTestId('user-menu').click();
      await page.getByRole('button', { name: /sign out/i }).click();
      await expect(page).toHaveURL('/');
      await expect(
        page.getByRole('button', { name: /sign in/i })
      ).toBeVisible();
    });
  });
});

// Test helper
async function loginWithTestUser(page) {
  // Use test authentication bypass or mock OAuth
  await page.goto('/api/auth/test-login?user=test-user');
}
```

### OAuth Mocking Strategy

For CI/E2E tests, implement test authentication bypass:

```typescript
// apps/web/pages/api/auth/test-login.ts (only enabled in test env)
if (process.env.NODE_ENV === 'test') {
  export default async function testLogin(req, res) {
    const { user } = req.query;
    // Create test session without actual OAuth
    await createSession(res, { id: user, name: 'Test User' });
    res.redirect('/dashboard');
  }
}
```

---

## Phase 3: Billing Testing (#182)

### Test Scenarios

```typescript
// apps/web/tests/e2e/billing.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Stripe Billing', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithTestUser(page);
  });

  test.describe('Plan Selection', () => {
    test('displays available plans with pricing', async ({ page }) => {
      await page.goto('/pricing');
      await expect(page.getByTestId('plan-free')).toBeVisible();
      await expect(page.getByTestId('plan-pro')).toBeVisible();
      await expect(page.getByTestId('plan-team')).toBeVisible();
    });

    test('shows current plan indicator for subscribed users', async ({
      page,
    }) => {
      // Use test user with active subscription
      await page.goto('/pricing');
      await expect(page.getByText('Current Plan')).toBeVisible();
    });
  });

  test.describe('Checkout Flow', () => {
    test('redirects to Stripe checkout on plan selection', async ({ page }) => {
      await page.goto('/pricing');
      await page
        .getByTestId('plan-pro')
        .getByRole('button', { name: /subscribe/i })
        .click();
      // Wait for Stripe redirect
      await page.waitForURL(/checkout.stripe.com/);
    });

    test('handles successful payment callback', async ({ page }) => {
      // Simulate Stripe success callback
      await page.goto('/billing/success?session_id=test_session');
      await expect(page.getByText(/subscription activated/i)).toBeVisible();
    });

    test('handles cancelled payment callback', async ({ page }) => {
      await page.goto('/billing/cancelled');
      await expect(page.getByText(/payment cancelled/i)).toBeVisible();
    });
  });

  test.describe('Subscription Management', () => {
    test('shows subscription status in billing portal', async ({ page }) => {
      await page.goto('/settings/billing');
      await expect(page.getByTestId('subscription-status')).toBeVisible();
    });

    test('opens Stripe portal for subscription management', async ({
      page,
    }) => {
      await page.goto('/settings/billing');
      await page.getByRole('button', { name: /manage subscription/i }).click();
      await page.waitForURL(/billing.stripe.com/);
    });
  });
});
```

### Stripe Test Mode

- Use Stripe test API keys in all non-production environments
- Test cards: `4242424242424242` (success), `4000000000000002` (decline)
- Webhook testing via Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

## Phase 4: Managed Execution Testing (#189)

### Test Scenarios

```typescript
// apps/web/tests/e2e/managed-exec.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Managed Agent Execution', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithSubscribedUser(page); // Pro plan required
  });

  test.describe('Dashboard', () => {
    test('shows connected repositories', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page.getByTestId('repo-list')).toBeVisible();
    });

    test('displays cycle history', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page.getByTestId('cycle-history')).toBeVisible();
    });
  });

  test.describe('Manual Dispatch', () => {
    test('triggers dispatch cycle from UI', async ({ page }) => {
      await page.goto('/dashboard');
      await page.getByRole('button', { name: /run dispatch/i }).click();

      // Wait for cycle to start
      await expect(page.getByText(/cycle started/i)).toBeVisible({
        timeout: 10000,
      });

      // Wait for completion
      await expect(page.getByText(/cycle complete/i)).toBeVisible({
        timeout: 60000,
      });
    });

    test('shows real-time cycle progress', async ({ page }) => {
      await page.goto('/dashboard');
      await page.getByRole('button', { name: /run dispatch/i }).click();

      // Verify progress indicators
      await expect(page.getByTestId('cycle-progress')).toBeVisible();
      await expect(page.getByText(/reading memory/i)).toBeVisible();
    });
  });

  test.describe('Scheduled Execution', () => {
    test('configures dispatch schedule', async ({ page }) => {
      await page.goto('/settings/schedule');
      await page.getByLabel(/cadence/i).selectOption('15min');
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText(/schedule updated/i)).toBeVisible();
    });

    test('pauses and resumes scheduled execution', async ({ page }) => {
      await page.goto('/settings/schedule');
      await page.getByRole('button', { name: /pause/i }).click();
      await expect(page.getByText(/paused/i)).toBeVisible();

      await page.getByRole('button', { name: /resume/i }).click();
      await expect(page.getByText(/active/i)).toBeVisible();
    });
  });
});
```

### Container Execution Testing

For managed execution, test the container lifecycle:

| Test              | Description                          | Validation                             |
| ----------------- | ------------------------------------ | -------------------------------------- |
| Container startup | Spawns container on dispatch trigger | Container ID returned, status: running |
| Resource limits   | Respects CPU/memory limits           | No OOM, no throttling alerts           |
| Timeout handling  | Kills stuck cycles                   | Container terminated after timeout     |
| Log streaming     | Real-time logs to dashboard          | Logs appear within 2s                  |
| Cleanup           | Removes container after completion   | No orphaned containers                 |

---

## Phase 5: API Gateway Testing (#190)

### Test Scenarios

```typescript
// apps/web/tests/api/gateway.test.ts
import { test, expect } from 'vitest';

test.describe('REST API Gateway', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000/api';
  let authToken: string;

  test.beforeAll(async () => {
    authToken = await getTestAuthToken();
  });

  test.describe('Authentication', () => {
    test('rejects requests without auth token', async () => {
      const res = await fetch(`${baseUrl}/dispatch`);
      expect(res.status).toBe(401);
    });

    test('accepts valid Bearer token', async () => {
      const res = await fetch(`${baseUrl}/dispatch`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).not.toBe(401);
    });
  });

  test.describe('Dispatch Endpoints', () => {
    test('GET /dispatch/status returns current state', async () => {
      const res = await fetch(`${baseUrl}/dispatch/status`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('cycle');
      expect(data).toHaveProperty('role');
    });

    test('POST /dispatch/start triggers new cycle', async () => {
      const res = await fetch(`${baseUrl}/dispatch/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun: true }),
      });
      expect(res.status).toBe(202);
      const data = await res.json();
      expect(data).toHaveProperty('cycleId');
    });
  });

  test.describe('Memory Endpoints', () => {
    test('GET /memory returns memory bank', async () => {
      const res = await fetch(`${baseUrl}/memory`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('content');
    });

    test('GET /memory/search?q=... searches memory', async () => {
      const res = await fetch(`${baseUrl}/memory/search?q=sprint`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('results');
    });
  });

  test.describe('Rate Limiting', () => {
    test('enforces rate limits', async () => {
      // Send rapid requests
      const requests = Array(100)
        .fill(null)
        .map(() =>
          fetch(`${baseUrl}/dispatch/status`, {
            headers: { Authorization: `Bearer ${authToken}` },
          })
        );
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
```

---

## Phase 6: Waitlist Testing (#200)

### Test Scenarios

```typescript
// apps/waitlist/tests/e2e/waitlist.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Waitlist Website', () => {
  test('displays hero section with value prop', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/autonomous/i)).toBeVisible();
  });

  test('shows email signup form', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /join/i })).toBeVisible();
  });

  test('validates email format', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill('invalid-email');
    await page.getByRole('button', { name: /join/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('submits valid email successfully', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /join/i }).click();
    await expect(page.getByText(/you're on the list/i)).toBeVisible();
  });

  test('prevents duplicate submissions', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill('duplicate@example.com');
    await page.getByRole('button', { name: /join/i }).click();
    // Submit again
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill('duplicate@example.com');
    await page.getByRole('button', { name: /join/i }).click();
    await expect(page.getByText(/already registered/i)).toBeVisible();
  });
});
```

---

## CI Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build apps
        run: npm run build --workspace=apps/web

      - name: Run E2E tests
        run: npm run test:e2e --workspace=apps/web
        env:
          STRIPE_TEST_KEY: ${{ secrets.STRIPE_TEST_KEY }}
          GITHUB_TEST_TOKEN: ${{ secrets.GITHUB_TEST_TOKEN }}

      - name: Upload test artifacts
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/web/playwright-report/
```

---

## Success Criteria

| Metric                | Target        | Validation                                           |
| --------------------- | ------------- | ---------------------------------------------------- |
| Auth coverage         | 100% of flows | Login, logout, protected routes, session persistence |
| Billing coverage      | 100% of flows | Checkout, success, cancel, portal, webhooks          |
| Managed exec coverage | Core flows    | Trigger, progress, completion, scheduling            |
| API coverage          | All endpoints | Auth, dispatch, memory, rate limiting                |
| Waitlist coverage     | 100%          | Signup, validation, duplicate handling               |
| CI integration        | Blocking      | PRs blocked on E2E failure                           |
| Test runtime          | < 5 min       | Parallel execution, minimal fixtures                 |

---

## Timeline

| Phase           | Days  | Deliverable                               |
| --------------- | ----- | ----------------------------------------- |
| Infrastructure  | 1-2   | Playwright setup, test DB, CI workflow    |
| Auth testing    | 3-4   | OAuth mock, login/logout/protected routes |
| Billing testing | 5-6   | Stripe test mode, checkout flows          |
| Managed exec    | 7-9   | Container tests, dashboard flows          |
| API gateway     | 10-11 | API tests, rate limiting                  |
| Waitlist        | 12    | Form tests (if not deployed yet)          |
| Polish          | 13-14 | Flaky test fixes, coverage gaps           |

---

## References

- [#34](https://github.com/ishan190425/autonomous-dev-agents/issues/34) — E2E Testing Infrastructure
- [#181](https://github.com/ishan190425/autonomous-dev-agents/issues/181) — GitHub OAuth
- [#182](https://github.com/ishan190425/autonomous-dev-agents/issues/182) — Stripe Billing
- [#189](https://github.com/ishan190425/autonomous-dev-agents/issues/189) — Managed Execution
- [#190](https://github.com/ishan190425/autonomous-dev-agents/issues/190) — API Gateway
- [#200](https://github.com/ishan190425/autonomous-dev-agents/issues/200) — Waitlist Website
- [Playwright Docs](https://playwright.dev/)
- [Stripe Test Mode](https://stripe.com/docs/testing)

---

_🔍 The Inspector — Cycle 1109_
