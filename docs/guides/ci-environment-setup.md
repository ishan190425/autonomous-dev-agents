# CI/CD Environment Setup Guide

> Environment variables required for CI/CD pipelines and local E2E testing.  
> **Created:** C1201 (2026-02-23)  
> **Related:** L694, L701, #255 (E2E auth fix)

---

## Overview

The ADA monorepo requires specific environment variables for:

1. **E2E Testing** — NextAuth requires auth secrets to boot, even for unauthenticated tests
2. **Database** — Prisma requires a DATABASE_URL for schema operations
3. **GitHub OAuth** — Required for auth flow testing (mocked in CI)

This guide documents all required variables for CI and local development.

---

## Quick Start (Local E2E Testing)

Copy this to your shell or `.env.local` in `apps/web/`:

```bash
# Auth (required for NextAuth to boot — L694)
AUTH_SECRET=local-test-secret-at-least-32-characters-long
NEXTAUTH_SECRET=local-test-secret-at-least-32-characters-long
NEXTAUTH_URL=http://localhost:3000

# GitHub OAuth (dummy values for local testing)
GITHUB_CLIENT_ID=local-test-client-id
GITHUB_CLIENT_SECRET=local-test-client-secret

# Database (SQLite for local testing)
DATABASE_URL=file:./test.db
```

Then run:

```bash
cd apps/web
npx playwright test
```

---

## Environment Variables Reference

### Authentication (Required)

| Variable          | Purpose                      | Example Value                             |
| ----------------- | ---------------------------- | ----------------------------------------- |
| `AUTH_SECRET`     | NextAuth.js encryption key   | `your-secret-at-least-32-characters-long` |
| `NEXTAUTH_SECRET` | Legacy alias for AUTH_SECRET | Same as AUTH_SECRET                       |
| `NEXTAUTH_URL`    | Base URL for auth callbacks  | `http://localhost:3000`                   |

**Why required:** NextAuth v5 throws `MissingSecret` error during app boot if these are not set — even for pages that don't require authentication (see L694).

### GitHub OAuth (Required for Auth Flow)

| Variable               | Purpose                        | Example Value   |
| ---------------------- | ------------------------------ | --------------- |
| `GITHUB_CLIENT_ID`     | GitHub OAuth app client ID     | `Iv1.abc123...` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret | `gho_...`       |

**CI Note:** These can be dummy values in CI since E2E tests mock authentication. Real values only needed for manual auth testing.

### Database (Required)

| Variable       | Purpose                    | Example Value                                   |
| -------------- | -------------------------- | ----------------------------------------------- |
| `DATABASE_URL` | Prisma database connection | `file:./test.db` (SQLite) or `postgresql://...` |

**CI/Local:** Use SQLite (`file:./test.db`) for fast, isolated test databases.  
**Production:** Use PostgreSQL with proper connection pooling.

---

## CI Workflow Configuration

The CI workflow (`.github/workflows/ci.yml`) sets these in the E2E test job:

```yaml
- name: 🧪 Run E2E tests
  working-directory: apps/web
  run: npx playwright test --project=unauthenticated --project=mocked-auth
  env:
    CI: true
    AUTH_SECRET: ci-test-secret-at-least-32-characters-long
    NEXTAUTH_SECRET: ci-test-secret-at-least-32-characters-long
    NEXTAUTH_URL: http://localhost:3000
    GITHUB_CLIENT_ID: ci-test-client-id
    GITHUB_CLIENT_SECRET: ci-test-client-secret
    DATABASE_URL: file:./test.db
```

---

## Common Issues

### `MissingSecret` Error

**Symptom:** App crashes on boot with NextAuth `MissingSecret` error.

**Cause:** `AUTH_SECRET` or `NEXTAUTH_SECRET` not set.

**Fix:** Set both variables (see Quick Start above).

**Reference:** L694 — "E2E tests with NextAuth require auth environment variables even for unauthenticated tests."

### E2E Tests Fail in CI but Pass Locally

**Possible causes:**

1. **Missing env vars in CI workflow** — Check `.github/workflows/ci.yml` E2E job
2. **Database not generated** — Ensure `npx prisma generate` runs before tests
3. **Playwright browsers not installed** — CI needs `npx playwright install --with-deps chromium`

### Locator Strict Mode Violations

**Symptom:** Playwright throws "strict mode violation" — element matched multiple times.

**Cause:** Generic selectors like `text=ADA` match multiple elements.

**Fix:** Use role-based selectors: `getByRole('link', { name: /ADA/i })` or `data-testid` attributes.

**Reference:** L694 — Changed from `text=ADA` to `getByRole('link', { name: /ADA/i })` in C1191.

---

## Setting Up GitHub OAuth (Manual Testing)

For manual auth flow testing, create a GitHub OAuth app:

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Create new OAuth App:
   - **Application name:** ADA Local
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
3. Copy Client ID and Client Secret to your `.env.local`

**Note:** Never commit real OAuth credentials. Use `.env.local` (gitignored).

---

## Sprint 3 Test Infrastructure

For Sprint 3 (Auth + Billing integration), additional setup will be needed:

- **Stripe test keys** — For billing flow E2E tests
- **Test user accounts** — GitHub test OAuth app with pre-created test users
- **`auth.setup.ts`** — Playwright global setup for authenticated sessions

See `docs/product/dashboard-mvp-spec-c1197.md` for Sprint 3 test requirements.

---

## Related Documents

- [L694](../retros/learnings.md) — E2E + NextAuth env var lesson
- [L701](../retros/learnings.md) — Complex auth needs CI env docs
- [PR #255](https://github.com/ada-ai/ada/pull/255) — E2E auth fix
- [CI Workflow](.github/workflows/ci.yml) — Full CI configuration

---

_Last updated: C1201 (2026-02-23) by Ops_
