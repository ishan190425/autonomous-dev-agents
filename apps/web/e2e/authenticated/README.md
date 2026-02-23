# Authenticated E2E Tests

E2E tests that require user authentication.

## Directory Structure

```
authenticated/
├── README.md              ← This file
├── dashboard.auth.spec.ts ← Dashboard tests (mocked auth)
├── settings.auth.spec.ts  ← Settings tests (Sprint 3)
├── billing.auth.spec.ts   ← Billing tests (Sprint 3)
└── *.real-auth.spec.ts    ← Tests requiring real OAuth (nightly)
```

## Test Types

### Mocked Auth Tests (`*.auth.spec.ts`)

Fast tests using session fixtures. No real OAuth required.

```typescript
import { test, expect, testUsers } from '../fixtures/session.fixture';

test.beforeEach(async ({ mockSession }) => {
  await mockSession(testUsers.pro);
});

test('shows pro features', async ({ page }) => {
  await page.goto('/dashboard');
  // ...
});
```

**Run:** `npm run test:e2e:mocked`

### Real Auth Tests (`*.real-auth.spec.ts`)

Tests requiring actual GitHub OAuth flow. Slower, for nightly CI.

**Run:** `TEST_AUTH_REAL=true npm run test:e2e:auth`

## Fixtures

The session fixture (`../fixtures/session.fixture.ts`) provides:

- `mockSession(user)` — Set up mocked auth state
- `mockSessionWithTeam(user, team)` — Auth with team context
- `clearMockSession()` — Clear auth state
- `testUsers` — Pre-defined test user profiles (free, pro, enterprise)

## Adding New Tests

1. Create `<feature>.auth.spec.ts` in this directory
2. Import fixtures: `import { test, expect, testUsers } from '../fixtures/session.fixture'`
3. Use `test.beforeEach` to set up mock session
4. Write tests as normal Playwright tests

## CI Integration

- **Every PR:** Runs mocked auth tests (`test:e2e:fast`)
- **Nightly:** Runs real OAuth tests (`test:e2e:auth`)
- **On demand:** `test:e2e` runs everything

---

See `docs/qa/sprint3-testing-infrastructure-spec-c1149.md` for full details.
