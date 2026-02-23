# Sprint 3 QA Test Plan

> **Author:** 🔍 QA (The Inspector) | **Cycle:** 1189 | **Date:** 2026-02-23
> **Sprint:** 3 (Mar 1-14) | **Reference:** Sprint 3 Acceptance Criteria (C1187)

## Purpose

This document operationalizes the 39 acceptance criteria from C1187 into executable test cases, defines pre-sprint setup requirements, and establishes the testing schedule for Sprint 3.

---

## Pre-Sprint Setup Checklist

### GitHub OAuth Test Environment

| Item                                | Status     | Owner | Notes                                                      |
| ----------------------------------- | ---------- | ----- | ---------------------------------------------------------- |
| Create GitHub OAuth App (dev)       | 🟡 Pending | QA    | Callback: `http://localhost:3000/api/auth/callback/github` |
| Create GitHub OAuth App (test)      | 🟡 Pending | QA    | Callback: `http://test.ada.dev/api/auth/callback/github`   |
| Add client ID/secret to `.env.test` | 🟡 Pending | QA    | Never commit secrets                                       |
| Test user accounts (3+)             | 🟡 Pending | QA    | Different permission levels                                |

### Stripe Test Environment

| Item                             | Status     | Owner       | Notes                                |
| -------------------------------- | ---------- | ----------- | ------------------------------------ |
| Stripe test mode API keys        | 🟡 Pending | Engineering | Get from Stripe dashboard            |
| Test webhook endpoint configured | 🟡 Pending | Engineering | Use Stripe CLI for local             |
| Test products/prices created     | 🟡 Pending | Engineering | Free tier, Pro ($49/mo)              |
| Test card numbers documented     | ✅ Done    | QA          | 4242... (success), 4000... (decline) |

### Test Data

| Item                        | Status     | Owner       | Notes                               |
| --------------------------- | ---------- | ----------- | ----------------------------------- |
| Waitlist test entries (10+) | 🟡 Pending | QA          | Mix of matching/non-matching emails |
| Mock repo configurations    | 🟡 Pending | QA          | For dashboard testing               |
| Seed cycle history data     | 🟡 Pending | Engineering | API fixture data                    |

### Test Infrastructure

| Item                     | Status     | Owner | Notes                                 |
| ------------------------ | ---------- | ----- | ------------------------------------- |
| Playwright configured    | 🟡 Pending | QA    | Per #34 spec                          |
| E2E test skeleton        | 🟡 Pending | QA    | `apps/web/tests/e2e/`                 |
| Integration test helpers | ✅ Done    | QA    | `packages/core/tests/` patterns exist |
| CI test workflow for web | 🟡 Pending | Ops   | `.github/workflows/test-web.yml`      |

---

## Test Case Matrix

### Feature 1: GitHub OAuth Authentication (#181)

| ID     | Acceptance Criterion                 | Test Type | Test Case                                                                   | Priority |
| ------ | ------------------------------------ | --------- | --------------------------------------------------------------------------- | -------- |
| AUTH-1 | "Sign in with GitHub" button visible | Manual    | Navigate to `/`, verify button present and styled                           | P0       |
| AUTH-2 | OAuth flow completes                 | E2E       | `auth.spec.ts`: Click login → GitHub redirect → callback → session created  | P0       |
| AUTH-3 | User info displays after login       | Manual    | Verify avatar URL, display name from GitHub                                 | P0       |
| AUTH-4 | Session persists on refresh          | E2E       | Login → refresh page → verify still logged in (`getSession()` returns user) | P0       |
| AUTH-5 | Logout invalidates session           | E2E       | Login → click logout → verify redirect to home, `getSession()` returns null | P0       |
| AUTH-6 | Invalid callback shows error         | Manual    | Manipulate state param in callback URL → verify friendly error page         | P1       |
| AUTH-7 | No GitHub message is helpful         | Manual    | Verify login page has "Don't have GitHub?" help text                        | P2       |

**E2E Test File:** `apps/web/tests/e2e/auth.spec.ts`

```typescript
// Skeleton
test.describe('GitHub OAuth', () => {
  test('complete OAuth flow', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="sign-in-github"]');
    // OAuth redirect handled by Playwright
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
  });

  test('session persists on refresh', async ({ page }) => {
    // Login first
    await page.goto('/dashboard');
    await page.reload();
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
  });

  test('logout clears session', async ({ page }) => {
    // Login first
    await page.click('[data-testid="logout"]');
    await expect(page).toHaveURL('/');
    // Verify session cleared
  });
});
```

---

### Feature 2: Stripe Subscription Management (#182)

| ID     | Acceptance Criterion             | Test Type   | Test Case                                                          | Priority |
| ------ | -------------------------------- | ----------- | ------------------------------------------------------------------ | -------- |
| BILL-1 | Pricing page shows tiers         | Manual      | Navigate to `/pricing`, verify Free and Pro ($49) visible          | P0       |
| BILL-2 | Upgrade initiates Checkout       | E2E         | Click "Upgrade to Pro" → verify redirect to Stripe Checkout        | P0       |
| BILL-3 | Success redirects with Pro badge | Manual      | Complete test payment → verify dashboard shows Pro badge           | P0       |
| BILL-4 | Subscription in user profile     | E2E         | After payment → GET `/api/user` → verify `tier: 'pro'`             | P0       |
| BILL-5 | Customer Portal accessible       | Manual      | Settings → "Manage Subscription" → Stripe Portal opens             | P1       |
| BILL-6 | Cancellation removes access      | Manual      | Cancel in Portal → verify Pro badge removed at period end          | P1       |
| BILL-7 | Webhook: payment_succeeded       | Integration | POST `/api/webhooks/stripe` with signed payload → verify DB update | P0       |
| BILL-8 | Webhook: subscription_deleted    | Integration | POST webhook → verify user downgraded to free                      | P0       |

**Integration Test File:** `apps/web/tests/integration/billing.test.ts`

```typescript
// Skeleton
describe('Stripe Webhooks', () => {
  test('payment_succeeded updates user tier', async () => {
    const payload = stripeFixtures.paymentSucceeded(userId);
    const signature = stripe.webhooks.generateTestHeaderString({ payload });

    const res = await fetch('/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': signature },
      body: payload,
    });

    expect(res.status).toBe(200);
    const user = await db.user.findUnique({ where: { id: userId } });
    expect(user.tier).toBe('pro');
  });

  test('duplicate webhooks are idempotent', async () => {
    // Send same event twice, verify no double-update
  });
});
```

---

### Feature 3: Waitlist Migration (#200)

| ID        | Acceptance Criterion             | Test Type   | Test Case                                                      | Priority |
| --------- | -------------------------------- | ----------- | -------------------------------------------------------------- | -------- |
| MIGRATE-1 | Email matching works             | Integration | Waitlist entry + GitHub login with same email → verify linked  | P0       |
| MIGRATE-2 | "Welcome back" message           | Manual      | Matched user first login → verify message shown                | P1       |
| MIGRATE-3 | Priority badge for early signups | Manual      | Early waitlist user → verify badge displayed                   | P2       |
| MIGRATE-4 | Timestamp preserved              | Integration | Query user record → verify `waitlistSignupAt` matches original | P1       |
| MIGRATE-5 | Non-matched users work           | E2E         | New GitHub user → verify account created, no waitlist link     | P0       |

**Integration Test File:** `apps/web/tests/integration/migration.test.ts`

---

### Feature 4: Basic Dashboard (#155)

| ID     | Acceptance Criterion    | Test Type   | Test Case                                            | Priority |
| ------ | ----------------------- | ----------- | ---------------------------------------------------- | -------- |
| DASH-1 | Connected repos display | Manual      | User with repos → dashboard shows repo list          | P0       |
| DASH-2 | Cycle count correct     | E2E         | Verify displayed count matches API response          | P0       |
| DASH-3 | Last cycle timestamp    | E2E         | Verify timestamp format and accuracy                 | P1       |
| DASH-4 | Current role visible    | Manual      | Verify rotation state shows current role icon + name | P1       |
| DASH-5 | History shows 5 cycles  | E2E         | Verify last 5 cycles listed with role, action, time  | P0       |
| DASH-6 | Load time < 3s          | Performance | Lighthouse CI or `performance.measure()`             | P1       |
| DASH-7 | Mobile responsive       | Manual      | Chrome DevTools mobile view → verify layout          | P2       |

**E2E Test File:** `apps/web/tests/e2e/dashboard.spec.ts`

---

### Feature 5: REST API (#190)

| ID    | Acceptance Criterion          | Test Type   | Test Case                                     | Priority |
| ----- | ----------------------------- | ----------- | --------------------------------------------- | -------- |
| API-1 | GET /api/user returns profile | Integration | Authenticated request → verify response shape | P0       |
| API-2 | GET /api/repos returns list   | Integration | User with repos → verify repo array returned  | P0       |
| API-3 | GET /api/repos/:id/cycles     | Integration | Verify pagination, cycle data shape           | P0       |
| API-4 | Endpoints require session     | Integration | Request without session → verify 401          | P0       |
| API-5 | 401 for unauthenticated       | Integration | No cookie → 401 with proper message           | P0       |
| API-6 | Rate limiting (100/min)       | Load        | 150 requests in 60s → verify 429 after 100    | P2       |

**Integration Test File:** `apps/web/tests/integration/api.test.ts`

```typescript
// Skeleton
describe('REST API', () => {
  describe('GET /api/user', () => {
    test('returns user profile when authenticated', async () => {
      const res = await authenticatedFetch('/api/user');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toMatchObject({
        id: expect.any(String),
        email: expect.any(String),
        name: expect.any(String),
        tier: expect.stringMatching(/free|pro/),
      });
    });

    test('returns 401 when unauthenticated', async () => {
      const res = await fetch('/api/user');
      expect(res.status).toBe(401);
    });
  });
});
```

---

### Feature 6: Managed Execution (#189)

| ID     | Acceptance Criterion  | Test Type   | Test Case                                           | Priority |
| ------ | --------------------- | ----------- | --------------------------------------------------- | -------- |
| EXEC-1 | Pro user can enable   | Manual      | Settings → enable toggle → verify enabled state     | P0       |
| EXEC-2 | Auto cycles run       | E2E         | Enable → wait for scheduled time → verify cycle ran | P0       |
| EXEC-3 | Results in dashboard  | Manual      | After auto cycle → verify visible in history        | P1       |
| EXEC-4 | Pause/resume works    | Manual      | Pause → verify no cycles → resume → cycles continue | P1       |
| EXEC-5 | Free user upgrade CTA | Manual      | Free user → toggle → verify upgrade modal           | P1       |
| EXEC-6 | Errors reported       | Integration | Force error → verify error logged and surfaced      | P1       |

---

## Testing Schedule

### Week 1 (Mar 1-7)

| Day | Engineering Delivers  | QA Tests                                               |
| --- | --------------------- | ------------------------------------------------------ |
| 1-2 | NextAuth.js + OAuth   | — (wait for implementation)                            |
| 3   | OAuth complete        | AUTH-1 through AUTH-7 (manual + E2E)                   |
| 3-4 | Stripe integration    | — (wait for implementation)                            |
| 5   | Billing complete      | BILL-1 through BILL-6 (manual), BILL-7/8 (integration) |
| 5-7 | Managed execution MVP | — (Frontier scope)                                     |

### Week 2 (Mar 8-14)

| Day   | Engineering Delivers | QA Tests                           |
| ----- | -------------------- | ---------------------------------- |
| 8-9   | Dashboard UI         | DASH-1 through DASH-7              |
| 10-11 | REST API             | API-1 through API-6                |
| 12    | —                    | Full regression pass               |
| 13    | —                    | Bug fixes verification, EXEC tests |
| 14    | —                    | Sprint 3 ship verification         |

---

## Test Execution Tracking

### P0 Tests (Must Pass for Ship)

- [ ] AUTH-1, AUTH-2, AUTH-4, AUTH-5
- [ ] BILL-1, BILL-2, BILL-7, BILL-8
- [ ] MIGRATE-1, MIGRATE-5
- [ ] DASH-1, DASH-2, DASH-5
- [ ] API-1, API-2, API-3, API-4, API-5
- [ ] EXEC-1, EXEC-2

### P1 Tests (Should Pass)

- [ ] AUTH-6, BILL-3, BILL-4, BILL-5, BILL-6
- [ ] MIGRATE-2, MIGRATE-4
- [ ] DASH-3, DASH-4, DASH-6
- [ ] EXEC-3, EXEC-4, EXEC-5, EXEC-6

### P2 Tests (Nice to Have)

- [ ] AUTH-7, MIGRATE-3, DASH-7, API-6

---

## Immediate Next Actions (QA)

1. **Day 0 (Feb 23-28, Pre-Sprint):**
   - Create GitHub OAuth Apps (dev + test environments)
   - Set up Playwright in `apps/web/`
   - Create E2E test skeletons for auth and dashboard
   - Prepare waitlist test data

2. **Sprint 3 Day 1 (Mar 1):**
   - Configure test environment with OAuth credentials
   - Run smoke tests on local dev build
   - Begin AUTH test execution as OAuth lands

---

## Success Criteria

Sprint 3 ships when:

- [ ] All P0 tests passing
- [ ] ≥80% P1 tests passing
- [ ] No unresolved P0/P1 bugs
- [ ] Test coverage report generated
- [ ] All E2E tests in CI passing

---

_🔍 The Inspector | Cycle 1189 | February 23, 2026_
