# ADA Dashboard E2E Tests

End-to-end tests for the ADA Dashboard using [Playwright](https://playwright.dev/).

## Setup (C1129)

This E2E infrastructure was created in Cycle 1129 as Sprint 3 preparation. Per L646, holding period productivity flows to future sprint prep.

### Prerequisites

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Or install specific browsers
npx playwright install chromium
```

### Environment Variables

| Variable               | Description                       | Default                 |
| ---------------------- | --------------------------------- | ----------------------- |
| `BASE_URL`             | Base URL for tests                | `http://localhost:3000` |
| `TEST_AUTH_MOCK`       | Use mock authentication           | `false`                 |
| `GITHUB_TEST_USER`     | GitHub test account (real OAuth)  | —                       |
| `GITHUB_TEST_PASSWORD` | GitHub test password (real OAuth) | —                       |

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npm run test:e2e -- login.unauthenticated.spec.ts

# Run with UI mode
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

## Test Structure

```
e2e/
├── auth.setup.ts                    # Authentication setup (runs first)
├── login.unauthenticated.spec.ts    # Login page tests (no auth required)
├── dashboard.spec.ts                # Dashboard tests (authenticated)
└── README.md                        # This file
```

### Test Projects

| Project                    | Description                                    |
| -------------------------- | ---------------------------------------------- |
| `setup`                    | Runs auth.setup.ts to create auth state        |
| `chromium`                 | Chrome tests (authenticated, depends on setup) |
| `chromium-unauthenticated` | Chrome tests for login/public pages            |
| `firefox`                  | Firefox tests (authenticated)                  |
| `webkit`                   | Safari tests (authenticated)                   |
| `mobile-chrome`            | Mobile Chrome (Pixel 5)                        |
| `mobile-safari`            | Mobile Safari (iPhone 12)                      |

### Running Specific Projects

```bash
# Run only unauthenticated tests
npm run test:e2e -- --project=chromium-unauthenticated

# Run only mobile tests
npm run test:e2e -- --project=mobile-chrome --project=mobile-safari
```

## Authentication

### Mock Authentication (Development)

For local development, use mock authentication:

```bash
TEST_AUTH_MOCK=true npm run test:e2e
```

This sets mock user data in localStorage without requiring GitHub OAuth.

### Real OAuth (CI/Production)

For CI, provide GitHub test credentials:

```bash
GITHUB_TEST_USER=test-user GITHUB_TEST_PASSWORD=xxx npm run test:e2e
```

## CI Integration

Tests run in CI via `.github/workflows/test.yml`:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npm run test:e2e -- --project=chromium
  env:
    TEST_AUTH_MOCK: true
```

## Writing Tests

### Test Conventions

- **Filename:** `<feature>.spec.ts` (authenticated) or `<feature>.unauthenticated.spec.ts` (public)
- **Data attributes:** Use `data-testid="..."` for test selectors
- **Assertions:** Prefer `toBeVisible()` over `toHaveCount(1)` for resilience

### Example Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('does something expected', async ({ page }) => {
    await page.goto('/feature');

    // Use data-testid for reliable selectors
    await expect(page.locator('[data-testid="feature-title"]')).toBeVisible();

    // Click and verify
    await page.click('[data-testid="action-button"]');
    await expect(page).toHaveURL(/\/feature\/result/);
  });
});
```

### Selector Priority

1. `data-testid` (most reliable)
2. ARIA roles: `getByRole('button', { name: 'Submit' })`
3. Text content: `getByText('Submit')`
4. CSS selectors (last resort)

## Reports

After running tests:

```bash
# View HTML report
npx playwright show-report

# Reports are saved to:
# - playwright-report/ (HTML report)
# - test-results/       (screenshots, videos, traces)
```

## Related Documentation

- [C1122 Auth UX Spec](../../docs/design/auth-ux-spec-c1122.md) — Authentication flow design
- [C1120 Dashboard Scaffold](../../docs/engineering/) — Dashboard component structure
- [C1112 Design System](../../docs/design/) — UI component patterns

---

_Setup created in C1129 (QA). Sprint 3 Day 1-2 will implement real OAuth tests._
