# Sprint 3 CI Enhancement Spec

> CI/CD pipeline enhancements for Sprint 3 SaaS components
> **Created:** 2026-02-22 | **Cycle:** 1111 | **Author:** 🛡️ The Guardian

---

## Overview

Sprint 3 (Mar 1-14) introduces SaaS components requiring expanded CI capabilities. This document specifies the CI/CD enhancements needed to support Playwright E2E testing, OAuth mocking, Stripe test mode, and artifact management.

### Sprint 3 Testing Requirements

| Component             | Test Type         | CI Requirements                        |
| --------------------- | ----------------- | -------------------------------------- |
| GitHub OAuth (#181)   | E2E + Unit        | OAuth mock env, Playwright browsers    |
| Stripe Billing (#182) | E2E + API         | Stripe test mode keys, webhook testing |
| Managed Exec (#189)   | E2E + Integration | Container sandbox, security tests      |
| API Gateway (#190)    | API + Integration | API test runner, response validation   |
| Waitlist (#200)       | E2E               | Playwright browsers                    |

### Reference Documents

- QA Test Strategy: `docs/qa/sprint3-saas-test-strategy-c1109.md`
- Engineering Sequence: `docs/engineering/sprint3-implementation-sequence-c1110.md`
- Security ADR: `docs/frontier/adr-runtime-security-model-c1106.md`

---

## Phase 1: Playwright Integration (Day 1-2)

### New CI Job: E2E Tests

```yaml
# .github/workflows/ci.yml — new job
e2e-tests:
  name: E2E Tests (Playwright)
  runs-on: ubuntu-latest
  needs: quality-gates

  steps:
    - name: 📥 Checkout repository
      uses: actions/checkout@v4

    - name: 🔧 Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        cache: 'npm'

    - name: 📦 Install dependencies
      run: npm ci

    - name: 🏗️ Build packages
      run: |
        npm run build --workspace=packages/core
        npm run build --workspace=packages/cli
        npm run build --workspace=apps/web

    - name: 🎭 Install Playwright browsers
      run: npx playwright install --with-deps chromium

    - name: 🧪 Run E2E tests
      run: npm run test:e2e --workspace=apps/web
      env:
        TEST_URL: http://localhost:3000
        GITHUB_OAUTH_MOCK: true
        STRIPE_TEST_MODE: true

    - name: 📊 Upload test artifacts
      uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: apps/web/playwright-report/
        retention-days: 7
```

### Browser Caching

```yaml
# Cache Playwright browsers to speed up CI
- name: 🗄️ Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      playwright-${{ runner.os }}-
```

### Parallel Test Sharding

```yaml
# Matrix strategy for parallel E2E runs
strategy:
  fail-fast: false
  matrix:
    shard: [1, 2, 3, 4]

- name: 🧪 Run E2E tests (shard ${{ matrix.shard }}/4)
  run: npx playwright test --shard=${{ matrix.shard }}/4
```

---

## Phase 2: Authentication Testing (Day 3-4)

### OAuth Mock Environment

```yaml
env:
  # OAuth Mock Configuration
  GITHUB_OAUTH_MOCK: true
  GITHUB_CLIENT_ID: ${{ secrets.GITHUB_CLIENT_ID_TEST }}
  GITHUB_CLIENT_SECRET: ${{ secrets.GITHUB_CLIENT_SECRET_TEST }}

  # Mock user for authenticated tests
  TEST_USER_ID: test-user-id
  TEST_USER_EMAIL: test@ada.ai
  TEST_USER_TOKEN: test-jwt-token
```

### Required GitHub Secrets

| Secret                      | Purpose                           | Setup                           |
| --------------------------- | --------------------------------- | ------------------------------- |
| `GITHUB_CLIENT_ID_TEST`     | OAuth App ID for test environment | Create test OAuth App in GitHub |
| `GITHUB_CLIENT_SECRET_TEST` | OAuth App secret                  | Pair with client ID             |
| `TEST_DATABASE_URL`         | Test Supabase/SQLite connection   | Separate test DB                |

### Auth Test Isolation

```yaml
# Ensure auth tests don't interfere with each other
- name: 🔐 Setup test auth environment
  run: |
    # Generate per-run JWT secret
    echo "JWT_SECRET=$(openssl rand -hex 32)" >> $GITHUB_ENV

    # Reset test database
    npm run db:reset:test --workspace=apps/web
```

---

## Phase 3: Stripe Integration (Day 5-6)

### Stripe Test Mode

```yaml
env:
  # Stripe Test Mode Keys
  STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY_TEST }}
  STRIPE_PUBLISHABLE_KEY: ${{ secrets.STRIPE_PUBLISHABLE_KEY_TEST }}
  STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_WEBHOOK_SECRET_TEST }}

  # Test clock for subscription testing
  STRIPE_TEST_CLOCK: true
```

### Required Stripe Secrets

| Secret                        | Purpose              | Setup                        |
| ----------------------------- | -------------------- | ---------------------------- |
| `STRIPE_SECRET_KEY_TEST`      | Test mode API key    | Stripe Dashboard → Test Mode |
| `STRIPE_PUBLISHABLE_KEY_TEST` | Test mode public key | Stripe Dashboard → Test Mode |
| `STRIPE_WEBHOOK_SECRET_TEST`  | Webhook signature    | Stripe CLI or Dashboard      |

### Webhook Testing

```yaml
# Stripe webhook testing in CI
- name: 💳 Install Stripe CLI
  run: |
    curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
    echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
    sudo apt update && sudo apt install stripe

- name: 💳 Forward Stripe webhooks
  run: |
    stripe listen --forward-to localhost:3000/api/webhooks/stripe &
    sleep 5  # Wait for listener
```

---

## Phase 4: Test Artifacts (Day 7)

### Artifact Management

```yaml
# Upload test results on failure
- name: 📊 Upload Playwright report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report-${{ github.run_id }}
    path: |
      apps/web/playwright-report/
      apps/web/test-results/
    retention-days: 14

# Upload coverage
- name: 📈 Upload coverage report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: coverage-report-${{ github.run_id }}
    path: |
      packages/core/coverage/
      apps/web/coverage/
    retention-days: 14
```

### Screenshot on Failure

```typescript
// playwright.config.ts enhancement
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'retain-on-failure',
}
```

---

## Phase 5: Security Testing (Day 8)

### Security Scan Job

```yaml
security-scan:
  name: Security Analysis
  runs-on: ubuntu-latest
  needs: quality-gates

  steps:
    - name: 📥 Checkout repository
      uses: actions/checkout@v4

    - name: 🔒 Run npm audit
      run: npm audit --audit-level=high --omit=dev

    - name: 🔍 OWASP Dependency Check
      uses: dependency-check/Dependency-Check_Action@main
      with:
        project: 'ada-ai'
        path: '.'
        format: 'HTML'

    - name: 📊 Upload security report
      uses: actions/upload-artifact@v4
      with:
        name: dependency-check-report
        path: reports/
```

### Container Security (for Managed Exec)

```yaml
container-security:
  name: Container Security
  runs-on: ubuntu-latest
  needs: quality-gates

  steps:
    - name: 🐳 Build test container
      run: docker build -t ada-test-sandbox -f Dockerfile.sandbox .

    - name: 🔒 Scan with Trivy
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: 'ada-test-sandbox'
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: 📊 Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v3
      with:
        sarif_file: 'trivy-results.sarif'
```

---

## Implementation Timeline

| Day       | Task                          | Owner             |
| --------- | ----------------------------- | ----------------- |
| Mar 1     | Add Playwright CI job         | Ops               |
| Mar 2     | Configure browser caching     | Ops               |
| Mar 3     | Add OAuth mock environment    | Ops + Engineering |
| Mar 4     | Add auth secrets to GitHub    | Ops               |
| Mar 5     | Add Stripe test mode config   | Ops               |
| Mar 6     | Add Stripe webhook testing    | Ops + Engineering |
| Mar 7     | Configure artifact upload     | Ops               |
| Mar 8     | Add security scanning         | Ops               |
| Mar 9-10  | Integration testing           | QA                |
| Mar 11    | Parallel sharding (if needed) | Ops               |
| Mar 12-14 | Stabilization                 | All               |

---

## Secret Requirements Summary

### New GitHub Repository Secrets

| Secret                        | Required By | Priority |
| ----------------------------- | ----------- | -------- |
| `GITHUB_CLIENT_ID_TEST`       | Day 3       | P0       |
| `GITHUB_CLIENT_SECRET_TEST`   | Day 3       | P0       |
| `STRIPE_SECRET_KEY_TEST`      | Day 5       | P0       |
| `STRIPE_PUBLISHABLE_KEY_TEST` | Day 5       | P0       |
| `STRIPE_WEBHOOK_SECRET_TEST`  | Day 5       | P0       |
| `TEST_DATABASE_URL`           | Day 1       | P0       |
| `TEST_JWT_SECRET`             | Day 3       | P0       |

### Environment File Template

```bash
# .env.test.local (not committed)
GITHUB_OAUTH_MOCK=true
GITHUB_CLIENT_ID=test-client-id
GITHUB_CLIENT_SECRET=test-client-secret
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
DATABASE_URL=sqlite:./test.db
JWT_SECRET=test-jwt-secret
```

---

## Success Criteria

1. **E2E tests run in CI** — Playwright job passes on all PRs
2. **Auth mocking works** — OAuth tests pass without real GitHub OAuth
3. **Stripe testing works** — Billing tests pass in test mode
4. **Artifacts captured** — Screenshots/videos available on failure
5. **Security scans pass** — No high/critical vulnerabilities
6. **Parallel sharding** — E2E suite completes in <10 minutes

---

## Integration with Existing CI

```yaml
# Full workflow summary (after Sprint 3)
jobs:
  pr-enforcement: # Existing — R-014 check
  quality-gates: # Existing — lint, build, test
  package-validation: # Existing — package.json checks
  code-quality: # Existing — metrics analysis
  rules-compliance: # Existing — conventional commits
  test-coverage: # Existing — coverage thresholds
  publish-preview: # Existing — dry-run publish
  # NEW JOBS:
  e2e-tests: # New — Playwright E2E
  security-scan: # New — OWASP + npm audit
  container-security: # New — Trivy scan for Managed Exec
```

---

## Risk Mitigation

| Risk                    | Mitigation                                    |
| ----------------------- | --------------------------------------------- |
| Flaky E2E tests         | Retry logic, test isolation, stable selectors |
| Slow CI                 | Browser caching, parallel sharding            |
| Secret leakage          | GitHub encrypted secrets, never log values    |
| OAuth mock drift        | Keep mock in sync with real OAuth flow        |
| Stripe test mode limits | Monitor test clock usage                      |

---

**Related Issues:** #34 (E2E Testing), #181 (Auth), #182 (Billing), #189 (Managed Exec), #190 (API Gateway)

**Next Steps:**

1. Feb 26: Go/No-Go ratification
2. Mar 1: Day 1 implementation begins per timeline
3. Engineering + Ops coordinate on secret setup
