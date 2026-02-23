# Sprint 3 Testing Infrastructure Spec (C1149)

> **Author:** 🔍 QA (The Inspector)  
> **Cycle:** 1149 | 2026-02-23  
> **Status:** Ready for Sprint 3  
> **Related:** #34 (E2E Testing), #181 (Auth), #182 (Billing), #155 (SaaS Container)  
> **Sprint:** 3 (Mar 1-14)

---

## Executive Summary

Defines the testing infrastructure required for Sprint 3 features (Auth, Billing, Dashboard). Covers OAuth test credentials, authenticated E2E flows, Stripe test mode, and session mocking strategies. All infrastructure must be in place by Day 1 (Mar 1) for immediate feature testing.

---

## 1. Current State

### Existing Infrastructure (C1139-C1141)

- **Unit Tests:** 2,358 passing (Vitest)
- **E2E Tests:** 21 passing (Playwright)
- **CI Integration:** E2E runs on every PR/push
- **Coverage:** 89%+

### E2E Test Files

```
apps/web/e2e/
├── dashboard.spec.ts       # 12 tests — dashboard UI (unauthenticated)
└── login.unauthenticated.spec.ts  # 9 tests — login page UI
```

### Gap Analysis

| Capability            | Current | Sprint 3 Needed     |
| --------------------- | ------- | ------------------- |
| Unauthenticated tests | ✅      | ✅                  |
| Authenticated tests   | ❌      | ✅ OAuth flows      |
| Session mocking       | ❌      | ✅ Protected routes |
| Stripe testing        | ❌      | ✅ Billing flows    |
| Database fixtures     | ❌      | ✅ User/team data   |

---

## 2. OAuth Test Credentials

### 2.1 GitHub OAuth App (Test Environment)

Create a dedicated test OAuth app:

```yaml
Name: ADA Dashboard (Test)
Homepage URL: http://localhost:3000
Callback URL: http://localhost:3000/api/auth/callback
```

**Environment Variables:**

```bash
# .env.local (test credentials — NOT production)
GITHUB_CLIENT_ID=test_xxx
GITHUB_CLIENT_SECRET=test_yyy

# Test mode flag
NEXT_PUBLIC_AUTH_TEST_MODE=true
```

### 2.2 Test User Accounts

Create GitHub test accounts for E2E:

| Account           | Purpose             | Scopes                                  |
| ----------------- | ------------------- | --------------------------------------- |
| `ada-test-user-1` | Standard user flows | `read:user, user:email, repo`           |
| `ada-test-user-2` | Team member flows   | `read:user, user:email, repo, read:org` |
| `ada-test-admin`  | Admin/owner flows   | All scopes                              |

**Credentials Storage:**

```bash
# GitHub Actions secrets (NOT in repo)
ADA_TEST_USER_1_USERNAME=ada-test-user-1
ADA_TEST_USER_1_PASSWORD=<secure>
ADA_TEST_USER_2_USERNAME=ada-test-user-2
ADA_TEST_USER_2_PASSWORD=<secure>
```

### 2.3 Playwright Auth Setup

```typescript
// apps/web/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const testUsers = {
  standard: {
    username: process.env.ADA_TEST_USER_1_USERNAME!,
    password: process.env.ADA_TEST_USER_1_PASSWORD!,
    storageState: 'playwright/.auth/standard-user.json',
  },
  admin: {
    username: process.env.ADA_TEST_ADMIN_USERNAME!,
    password: process.env.ADA_TEST_ADMIN_PASSWORD!,
    storageState: 'playwright/.auth/admin-user.json',
  },
};

setup('authenticate standard user', async ({ page }) => {
  await page.goto('/login');

  // Click GitHub OAuth button
  const githubButton = page.locator('button:has-text("Sign in with GitHub")');
  await githubButton.click();

  // Complete GitHub OAuth flow (on github.com)
  await page.waitForURL(/github\.com\/login/);
  await page.fill('input[name="login"]', testUsers.standard.username);
  await page.fill('input[name="password"]', testUsers.standard.password);
  await page.click('input[type="submit"]');

  // Authorize app if prompted
  const authorizeButton = page.locator('button[name="authorize"]');
  if (await authorizeButton.isVisible({ timeout: 3000 })) {
    await authorizeButton.click();
  }

  // Wait for redirect back to dashboard
  await page.waitForURL(/\/dashboard/);

  // Save auth state
  await page.context().storageState({ path: testUsers.standard.storageState });
});
```

### 2.4 Playwright Config Update

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    // Setup project — runs auth setup first
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // Authenticated tests — depend on setup
    {
      name: 'authenticated',
      testDir: './e2e/authenticated',
      dependencies: ['setup'],
      use: {
        storageState: 'playwright/.auth/standard-user.json',
      },
    },

    // Unauthenticated tests — no setup needed
    {
      name: 'unauthenticated',
      testDir: './e2e',
      testIgnore: /authenticated|auth\.setup/,
    },
  ],
});
```

---

## 3. Authenticated E2E Test Structure

### 3.1 Directory Structure

```
apps/web/e2e/
├── auth.setup.ts                    # Auth setup (runs first)
├── dashboard.spec.ts                # Existing unauthenticated tests
├── login.unauthenticated.spec.ts    # Existing login UI tests
└── authenticated/
    ├── dashboard.auth.spec.ts       # Dashboard with real user data
    ├── cycles.auth.spec.ts          # Cycles page (requires auth)
    ├── memory.auth.spec.ts          # Memory page (requires auth)
    ├── settings.auth.spec.ts        # Settings page (requires auth)
    ├── billing.auth.spec.ts         # Billing flows (requires auth + Stripe)
    └── team.auth.spec.ts            # Team management (multi-user)
```

### 3.2 Example: Authenticated Dashboard Tests

```typescript
// apps/web/e2e/authenticated/dashboard.auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard (Authenticated)', () => {
  test('displays user profile in header', async ({ page }) => {
    await page.goto('/dashboard');

    // User avatar visible
    const avatar = page.locator('[data-testid="user-avatar"]');
    await expect(avatar).toBeVisible();

    // User name displayed
    const userName = page.locator('[data-testid="user-name"]');
    await expect(userName).toHaveText(/ada-test-user/);
  });

  test('shows real cycle data', async ({ page }) => {
    await page.goto('/dashboard');

    // Cycle stats show actual numbers (not loading state)
    const cycleCount = page.locator('[data-testid="cycle-count"]');
    await expect(cycleCount).toBeVisible();
    const text = await cycleCount.textContent();
    expect(parseInt(text!, 10)).toBeGreaterThanOrEqual(0);
  });

  test('logout redirects to login', async ({ page }) => {
    await page.goto('/dashboard');

    // Click user menu → logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Verify redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
```

---

## 4. Stripe Test Mode Integration

### 4.1 Stripe Test Credentials

```bash
# .env.local (Stripe test mode)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Test mode flag
STRIPE_TEST_MODE=true
```

### 4.2 Stripe Test Cards

Per Stripe documentation:

| Card Number           | Behavior           |
| --------------------- | ------------------ |
| `4242 4242 4242 4242` | Success            |
| `4000 0000 0000 0002` | Card declined      |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0000 0000 3220` | 3D Secure required |

### 4.3 Billing E2E Tests

```typescript
// apps/web/e2e/authenticated/billing.auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Billing', () => {
  test('upgrade to Pro via Stripe Checkout', async ({ page }) => {
    await page.goto('/settings/billing');

    // Click upgrade button
    const upgradeButton = page.locator('button:has-text("Upgrade to Pro")');
    await upgradeButton.click();

    // Stripe Checkout opens (embedded or redirect)
    await expect(
      page.locator('iframe[name*="stripe"]').or(page.locator('text=Pay'))
    ).toBeVisible({ timeout: 10000 });

    // Fill test card (if embedded)
    const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
    await stripeFrame.locator('[placeholder*="Card"]').fill('4242424242424242');
    await stripeFrame.locator('[placeholder*="MM"]').fill('12/30');
    await stripeFrame.locator('[placeholder*="CVC"]').fill('123');

    // Submit
    await page.click('button:has-text("Subscribe")');

    // Verify success
    await expect(page.locator('text=/Pro|Subscribed|Success/i')).toBeVisible();
  });

  test('handles declined card', async ({ page }) => {
    await page.goto('/settings/billing');
    await page.click('button:has-text("Upgrade")');

    // Use declined card
    const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
    await stripeFrame.locator('[placeholder*="Card"]').fill('4000000000000002');
    await stripeFrame.locator('[placeholder*="MM"]').fill('12/30');
    await stripeFrame.locator('[placeholder*="CVC"]').fill('123');

    await page.click('button:has-text("Subscribe")');

    // Verify error message
    await expect(page.locator('text=/declined|failed/i')).toBeVisible();
  });
});
```

### 4.4 Stripe CLI for Webhooks

For local testing of webhooks:

```bash
# Forward Stripe webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

---

## 5. Session Mocking (Fast Tests)

For tests that don't need real OAuth, mock the session:

### 5.1 Session Fixture

```typescript
// apps/web/e2e/fixtures/session.fixture.ts
import { test as base } from '@playwright/test';

type SessionFixture = {
  mockSession: (user: MockUser) => Promise<void>;
};

type MockUser = {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  tier: 'free' | 'pro' | 'enterprise';
};

export const test = base.extend<SessionFixture>({
  mockSession: async ({ page }, use) => {
    const mockSession = async (user: MockUser) => {
      // Set mock session cookie
      await page.context().addCookies([
        {
          name: 'ada-session',
          value: JSON.stringify({
            user,
            expiresAt: Date.now() + 86400000, // 24h
          }),
          domain: 'localhost',
          path: '/',
        },
      ]);

      // Mock API responses for user data
      await page.route('**/api/auth/session', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user }),
        });
      });
    };

    await use(mockSession);
  },
});
```

### 5.2 Using Mock Sessions

```typescript
// apps/web/e2e/fast/settings.spec.ts
import { test, expect } from '../fixtures/session.fixture';

test.describe('Settings (Mocked Session)', () => {
  test.beforeEach(async ({ mockSession }) => {
    await mockSession({
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
      tier: 'pro',
    });
  });

  test('displays user settings', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('text=Test User')).toBeVisible();
    await expect(page.locator('text=Pro')).toBeVisible();
  });
});
```

---

## 6. Database Fixtures

### 6.1 Test Database Setup

```bash
# .env.test
DATABASE_URL=postgresql://test:test@localhost:5432/ada_test
```

### 6.2 Seed Data Script

```typescript
// scripts/seed-test-db.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTestData() {
  // Clear existing test data
  await prisma.cycle.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.user.deleteMany({});

  // Create test users
  const testUser = await prisma.user.create({
    data: {
      id: 'test-user-1',
      email: 'ada-test-user-1@example.com',
      name: 'Test User 1',
      githubId: '12345',
      avatarUrl: 'https://avatars.githubusercontent.com/u/12345?v=4',
      tier: 'free',
      cyclesUsed: 50,
      cyclesLimit: 100,
    },
  });

  // Create test team
  const testTeam = await prisma.team.create({
    data: {
      id: 'test-team-1',
      name: 'Test Team',
      ownerId: testUser.id,
    },
  });

  // Create test cycles
  for (let i = 0; i < 50; i++) {
    await prisma.cycle.create({
      data: {
        userId: testUser.id,
        roleId: ['ceo', 'engineering', 'qa'][i % 3],
        action: `Test action ${i}`,
        createdAt: new Date(Date.now() - i * 3600000),
      },
    });
  }

  console.log('✅ Test database seeded');
}

seedTestData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 6.3 CI Database Setup

```yaml
# .github/workflows/e2e-tests.yml (additions)
jobs:
  e2e-tests:
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: ada_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Setup test database
        run: npx prisma migrate deploy && npm run seed:test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/ada_test
```

---

## 7. Test Categories & CI Matrix

### 7.1 Test Categories

| Category            | Description         | Auth        | Speed  | CI Run   |
| ------------------- | ------------------- | ----------- | ------ | -------- |
| Unit                | Pure function tests | ❌          | Fast   | Every PR |
| Integration         | Component + API     | ❌          | Medium | Every PR |
| E2E Unauthenticated | Public pages        | ❌          | Medium | Every PR |
| E2E Authenticated   | Dashboard flows     | ✅ Real     | Slow   | Nightly  |
| E2E Mocked          | Fast auth tests     | ✅ Mock     | Medium | Every PR |
| Billing             | Stripe flows        | ✅ + Stripe | Slow   | Nightly  |

### 7.2 CI Configuration

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 3 * * *' # 3 AM UTC daily

jobs:
  unit-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:coverage

  e2e-fast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run e2e:fast # Unauthenticated + mocked

  e2e-auth:
    if: github.event_name == 'schedule' || github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run e2e:auth # Real OAuth
    env:
      ADA_TEST_USER_1_USERNAME: ${{ secrets.ADA_TEST_USER_1_USERNAME }}
      ADA_TEST_USER_1_PASSWORD: ${{ secrets.ADA_TEST_USER_1_PASSWORD }}

  e2e-billing:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run e2e:billing
    env:
      STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_SECRET_KEY }}
```

---

## 8. Implementation Checklist

### Sprint 3 Day 1 (Mar 1) — Pre-requisites

- [ ] Create GitHub OAuth test app (Test environment)
- [ ] Create `ada-test-user-1`, `ada-test-user-2`, `ada-test-admin` GitHub accounts
- [ ] Add OAuth credentials to GitHub Actions secrets
- [ ] Add Stripe test mode credentials to secrets
- [ ] Create `apps/web/e2e/auth.setup.ts`
- [ ] Update `playwright.config.ts` with auth projects
- [ ] Create `apps/web/e2e/authenticated/` directory

### Sprint 3 Day 2-3 — Core Auth Tests

- [ ] `dashboard.auth.spec.ts` — authenticated dashboard tests
- [ ] `settings.auth.spec.ts` — settings page tests
- [ ] Session mock fixtures for fast tests
- [ ] OAuth error handling tests

### Sprint 3 Day 4-5 — Billing Tests

- [ ] `billing.auth.spec.ts` — Stripe checkout flow
- [ ] Payment failure handling tests
- [ ] Subscription management tests
- [ ] Stripe webhook tests (via Stripe CLI)

### Sprint 3 Day 6-7 — CI Integration

- [ ] Nightly E2E auth job in CI
- [ ] Billing test job (Stripe test mode)
- [ ] Test database seeding in CI
- [ ] Coverage tracking for new tests

---

## 9. Success Metrics

| Metric           | Current | Sprint 3 Target      |
| ---------------- | ------- | -------------------- |
| E2E Tests        | 21      | 50+                  |
| Auth Tests       | 0       | 15+                  |
| Billing Tests    | 0       | 8+                   |
| Coverage         | 89%     | 85%+ (with new code) |
| E2E CI Pass Rate | 100%    | 95%+                 |

---

## Related Documents

- **C1139** — Playwright CI Integration PR
- **C1122** — Auth UX Spec
- **C797** — Billing Integration Spec
- **C1146** — Environment Variables Reference

---

_Author: 🔍 QA (C1149)_
