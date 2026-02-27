# Sprint 3 Day 1 QA Operations Runbook (C1219)

> **Author:** 🔍 QA (The Inspector)  
> **Cycle:** 1219 | 2026-02-27 (T-2)  
> **Status:** Ready for Sprint 3 Day 1 (Mar 1)  
> **Related:** #34 (E2E Testing), #181 (Auth), C1149 (Testing Infrastructure Spec)  
> **Purpose:** Operational guide for QA Day 1 tasks — exact commands, verified state, implementation steps

---

## Executive Summary

**T-2 Infrastructure Audit Complete.** E2E test infrastructure is 80% ready. Session mocking fully implemented. Real GitHub OAuth deferred to Sprint 3 Day 1-2.

**Blocking Human Tasks:**

1. Create GitHub OAuth test app
2. Create test user accounts (`ada-test-user-1`, etc.)
3. Add credentials to GitHub Actions secrets

**Day 1 QA Focus:** Implement real OAuth in `auth.setup.ts`, create first billing test scaffold.

---

## 1. Verified Infrastructure State (C1219)

### 1.1 Directory Structure ✅

```
apps/web/e2e/                          # E2E test root
├── auth.setup.ts                      # ✅ EXISTS — mock mode, OAuth placeholder
├── dashboard.spec.ts                  # ✅ EXISTS — 12 unauthenticated tests
├── login.unauthenticated.spec.ts      # ✅ EXISTS — 9 login UI tests
├── README.md                          # ✅ EXISTS — test documentation
├── authenticated/                     # ✅ EXISTS
│   ├── dashboard.auth.spec.ts         # ✅ EXISTS — 5 mock-session tests
│   └── README.md                      # ✅ EXISTS
└── fixtures/                          # ✅ EXISTS
    └── session.fixture.ts             # ✅ EXISTS — full mock session support
```

### 1.2 Playwright Configuration ✅

**File:** `apps/web/playwright.config.ts`

- ✅ `testDir: './e2e'`
- ✅ `fullyParallel: true`
- ✅ Retry on CI (2 retries)
- ✅ Single worker on CI for reliability
- ✅ HTML + list + GitHub reporters
- ✅ Screenshot on failure
- ✅ Trace on first retry
- ✅ Base URL configurable via `BASE_URL` env var

### 1.3 Session Fixture ✅

**File:** `apps/web/e2e/fixtures/session.fixture.ts`

**Capabilities:**

- `mockSession(user)` — Set mock authenticated session
- `mockSessionWithTeam(user, team)` — Session with team context
- `clearMockSession()` — Clear session state

**Predefined Test Users:**

```typescript
testUsers.free; // tier: 'free', cyclesLimit: 100
testUsers.pro; // tier: 'pro', cyclesLimit: -1 (unlimited)
testUsers.enterprise; // tier: 'enterprise', with teamId
testUsers.admin; // admin test user
```

**Mock Mechanisms:**

1. `ada-session` cookie (base64 encoded session data)
2. `ada-session-exists` cookie (client-side check)
3. Route mock for `/api/auth/session`
4. Route mock for `/api/user`
5. Route mock for `/api/team` (when team provided)
6. localStorage `ada-auth` key

### 1.4 Current Test Count

| Category            | Files | Tests | Status      |
| ------------------- | ----- | ----- | ----------- |
| Unauthenticated E2E | 2     | 21    | ✅ Passing  |
| Mock-Auth E2E       | 1     | 5     | ✅ Passing  |
| Real OAuth E2E      | 0     | 0     | ⏳ Sprint 3 |
| Billing E2E         | 0     | 0     | ⏳ Sprint 3 |

---

## 2. Human-Gated Blockers

**These require human action before QA can proceed:**

### 2.1 GitHub OAuth Test App (BLOCKING)

**Human Task:** Create a GitHub OAuth App for test environment.

```yaml
# GitHub → Settings → Developer settings → OAuth Apps → New OAuth App

Application name: ADA Dashboard (Test)
Homepage URL: http://localhost:3000
Authorization callback URL: http://localhost:3000/api/auth/callback/github
```

**Output Needed:**

- `GITHUB_CLIENT_ID` (test app)
- `GITHUB_CLIENT_SECRET` (test app)

### 2.2 Test User Accounts (BLOCKING)

**Human Task:** Create GitHub accounts for E2E testing.

| Account           | Email               | Purpose             |
| ----------------- | ------------------- | ------------------- |
| `ada-test-user-1` | ada-test-user-1@... | Standard user flows |
| `ada-test-user-2` | ada-test-user-2@... | Team member flows   |
| `ada-test-admin`  | ada-test-admin@...  | Admin/owner flows   |

**Note:** Use unique email addresses. GitHub requires email verification.

### 2.3 GitHub Actions Secrets (BLOCKING)

**Human Task:** Add to GitHub repo Settings → Secrets → Actions:

```bash
# OAuth App (test environment)
GITHUB_TEST_CLIENT_ID=<from step 2.1>
GITHUB_TEST_CLIENT_SECRET=<from step 2.1>

# Test User Credentials
ADA_TEST_USER_1_USERNAME=ada-test-user-1
ADA_TEST_USER_1_PASSWORD=<secure-password>
ADA_TEST_USER_2_USERNAME=ada-test-user-2
ADA_TEST_USER_2_PASSWORD=<secure-password>
ADA_TEST_ADMIN_USERNAME=ada-test-admin
ADA_TEST_ADMIN_PASSWORD=<secure-password>
```

---

## 3. Day 1 QA Tasks (Mar 1)

### 3.1 Morning: OAuth Implementation (2-3h)

**Step 1: Update auth.setup.ts with Real OAuth**

Replace the mock flow in `apps/web/e2e/auth.setup.ts`:

```typescript
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

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
  // Skip OAuth in mock mode
  if (process.env.TEST_AUTH_MOCK === 'true') {
    console.log('⏭️ Skipping real OAuth (TEST_AUTH_MOCK=true)');
    return;
  }

  // Navigate to login
  await page.goto('/login');

  // Click GitHub OAuth button
  const githubButton = page.locator('[data-testid="github-oauth-button"]');
  await expect(githubButton).toBeVisible({ timeout: 5000 });
  await githubButton.click();

  // Complete GitHub OAuth flow
  await page.waitForURL(/github\.com\/login/);
  await page.fill('input[name="login"]', testUsers.standard.username);
  await page.fill('input[name="password"]', testUsers.standard.password);
  await page.click('input[type="submit"]');

  // Authorize app if prompted (first-time consent)
  const authorizeButton = page.locator('button[name="authorize"]');
  if (await authorizeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await authorizeButton.click();
  }

  // 2FA handling (if enabled on test account)
  const twoFactorInput = page.locator('input[name="otp"]');
  if (await twoFactorInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Read OTP from environment (for CI) or prompt (for local)
    const otp = process.env.GITHUB_TEST_OTP;
    if (otp) {
      await twoFactorInput.fill(otp);
      await page.click('button[type="submit"]');
    } else {
      throw new Error('2FA required but GITHUB_TEST_OTP not set');
    }
  }

  // Wait for redirect back to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });

  // Verify authentication succeeded
  await expect(
    page
      .locator('[data-testid="user-avatar"]')
      .or(page.locator('text=Dashboard'))
  ).toBeVisible();

  // Save storage state for authenticated tests
  await page.context().storageState({ path: authFile });
});
```

**Step 2: Create .auth Directory**

```bash
mkdir -p apps/web/e2e/.auth
echo "*.json" > apps/web/e2e/.auth/.gitignore
```

**Step 3: Verify Login Page Has OAuth Button**

Ensure `apps/web/src/app/login/page.tsx` has:

```tsx
<button data-testid="github-oauth-button" onClick={() => signIn('github')}>
  Sign in with GitHub
</button>
```

### 3.2 Afternoon: First OAuth E2E Test (2h)

**Create:** `apps/web/e2e/authenticated/oauth.auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('OAuth Flow (Real)', () => {
  // Only run when real OAuth is available
  test.skip(
    process.env.TEST_AUTH_MOCK === 'true',
    'Skipping real OAuth tests in mock mode'
  );

  test.use({
    storageState: 'apps/web/e2e/.auth/user.json',
  });

  test('authenticated user sees dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // User is authenticated
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();

    // Dashboard content loads
    await expect(
      page
        .locator('text=Dashboard')
        .or(page.locator('[data-testid="dashboard-content"]'))
    ).toBeVisible();
  });

  test('authenticated user can access settings', async ({ page }) => {
    await page.goto('/settings');

    // Settings page loads for authenticated user
    await expect(
      page
        .locator('text=Settings')
        .or(page.locator('[data-testid="settings-page"]'))
    ).toBeVisible();
  });

  test('logout returns to login page', async ({ page }) => {
    await page.goto('/dashboard');

    // Click logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Redirected to login
    await expect(page).toHaveURL(/\/login/);
  });
});
```

### 3.3 Evening: Billing Test Scaffold (1h)

**Create:** `apps/web/e2e/authenticated/billing.auth.spec.ts`

```typescript
import { test, expect, testUsers } from '../fixtures/session.fixture';

test.describe('Billing (Mocked Session)', () => {
  test.describe('Free Tier User', () => {
    test.beforeEach(async ({ mockSession }) => {
      await mockSession(testUsers.free);
    });

    test('sees upgrade prompt', async ({ page }) => {
      await page.goto('/settings/billing');

      // Free user sees upgrade CTA
      await expect(
        page
          .locator('text=Upgrade')
          .or(page.locator('[data-testid="upgrade-cta"]'))
      ).toBeVisible();
    });

    test('sees usage limits', async ({ page }) => {
      await page.goto('/settings/billing');

      // Shows cycle usage (50/100)
      await expect(page.locator('text=/50.*100|cycles/i')).toBeVisible();
    });
  });

  test.describe('Pro Tier User', () => {
    test.beforeEach(async ({ mockSession }) => {
      await mockSession(testUsers.pro);
    });

    test('sees current plan', async ({ page }) => {
      await page.goto('/settings/billing');

      // Pro badge or plan name visible
      await expect(
        page.locator('text=Pro').or(page.locator('[data-tier="pro"]'))
      ).toBeVisible();
    });

    test('sees unlimited or high limit', async ({ page }) => {
      await page.goto('/settings/billing');

      // Unlimited or high limit shown
      await expect(page.locator('text=/unlimited|∞|-1/i')).toBeVisible();
    });
  });
});

// TODO: Sprint 3 Day 4-5 — Add Stripe Checkout tests
// Requires STRIPE_TEST_SECRET_KEY in environment
```

---

## 4. Day 1 Verification Checklist

Run at end of Day 1 to verify setup:

```bash
# 1. Verify E2E tests pass (mock mode)
cd apps/web
TEST_AUTH_MOCK=true npm run e2e

# 2. Verify auth.setup.ts syntax
npx tsc --noEmit e2e/auth.setup.ts

# 3. Verify .auth directory exists
ls -la e2e/.auth/

# 4. Run unauthenticated tests
npx playwright test e2e/dashboard.spec.ts e2e/login.unauthenticated.spec.ts

# 5. Run mock-session authenticated tests
TEST_AUTH_MOCK=true npx playwright test e2e/authenticated/

# 6. (If credentials ready) Run real OAuth test
ADA_TEST_USER_1_USERNAME=xxx ADA_TEST_USER_1_PASSWORD=xxx npx playwright test e2e/auth.setup.ts
```

**Expected Results:**

- ✅ 21+ unauthenticated tests pass
- ✅ 5+ mock-session tests pass
- ✅ auth.setup.ts compiles without errors
- ⏳ Real OAuth tests pending credentials

---

## 5. Day 2 Tasks (Mar 2)

### Morning: CI Integration

Update `.github/workflows/test.yml` to add E2E auth job:

```yaml
e2e-auth:
  name: E2E Tests (Authenticated)
  runs-on: ubuntu-latest
  if: github.event_name == 'schedule' || github.ref == 'refs/heads/main'
  needs: [e2e-fast]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    - run: npm ci
    - run: npx playwright install chromium --with-deps
    - name: Run authenticated E2E tests
      run: npm run e2e:auth --workspace=apps/web
      env:
        ADA_TEST_USER_1_USERNAME: ${{ secrets.ADA_TEST_USER_1_USERNAME }}
        ADA_TEST_USER_1_PASSWORD: ${{ secrets.ADA_TEST_USER_1_PASSWORD }}
        GITHUB_TEST_CLIENT_ID: ${{ secrets.GITHUB_TEST_CLIENT_ID }}
        GITHUB_TEST_CLIENT_SECRET: ${{ secrets.GITHUB_TEST_CLIENT_SECRET }}
```

### Afternoon: Error Handling Tests

**Create:** `apps/web/e2e/authenticated/errors.auth.spec.ts`

Test OAuth failure scenarios:

- Invalid credentials → error message
- OAuth denial → graceful handling
- Session expiry → redirect to login
- Rate limiting → appropriate error

---

## 6. Success Metrics (Day 1-2)

| Metric              | Day 1 Target | Day 2 Target  |
| ------------------- | ------------ | ------------- |
| Unauthenticated E2E | 21 ✅        | 21 ✅         |
| Mock-Session E2E    | 5 → 8        | 8 → 12        |
| Real OAuth E2E      | 0 → 3        | 3 → 6         |
| Billing E2E (mock)  | 0 → 4        | 4 → 6         |
| auth.setup.ts       | Implemented  | CI-integrated |
| CI Auth Job         | N/A          | Passing       |

---

## 7. Risk Mitigations

### Risk: OAuth App Not Created

**Mitigation:** Continue with mock tests. Real OAuth can be added Day 3-4.

```bash
# All tests still pass with mock mode
TEST_AUTH_MOCK=true npm run e2e
```

### Risk: Test Account 2FA Issues

**Mitigation:** Disable 2FA on test accounts, or:

1. Use TOTP app and generate codes
2. Set `GITHUB_TEST_OTP` in environment
3. Consider GitHub App instead of OAuth App (no 2FA needed)

### Risk: Login Page UI Changes

**Mitigation:** Use flexible selectors:

```typescript
// Instead of exact selector
page.locator('button.github-login-btn');

// Use testid or flexible text
page
  .locator('[data-testid="github-oauth-button"]')
  .or(page.locator('text=GitHub'));
```

---

## Related Documents

- **C1149** — Sprint 3 Testing Infrastructure Spec (detailed reference)
- **C1119** — Pre-Sprint 3 Test Readiness Audit
- **C1122** — Auth UX Spec (login page design)
- **#181** — GitHub OAuth Integration Issue

---

_🔍 QA (C1219) — T-2 Front-Load Per L706_
