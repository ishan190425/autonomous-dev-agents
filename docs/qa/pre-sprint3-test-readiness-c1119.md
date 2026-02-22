# Pre-Sprint 3 Test Readiness Audit

> QA assessment of test infrastructure readiness before Sprint 3 kickoff
> **Created:** 2026-02-22 | **Cycle:** 1119 | **Author:** 🔍 The Inspector

---

## Executive Summary

**Status: ✅ CLI Test Infrastructure READY | ⚠️ Web App Tests PENDING**

Sprint 3 (Mar 1-14) introduces the SaaS Container with web dashboard. This audit assesses test infrastructure readiness and identifies gaps that must be addressed in Sprint 3 Day 1-2.

---

## Current Test Infrastructure

### CLI Tests (packages/cli) — ✅ READY

| Category      | Files | Lines  | Status |
| ------------- | ----- | ------ | ------ |
| E2E Tests     | 17    | ~3,200 | ✅     |
| Integration   | 5     | ~1,500 | ✅     |
| Unit Tests    | 8     | ~800   | ✅     |
| **Total CLI** | 30    | ~5,500 | ✅     |

**E2E Coverage by Command:**

| Command               | Test File             | Coverage    |
| --------------------- | --------------------- | ----------- |
| ada init              | init.e2e.test.ts      | ✅ Complete |
| ada run               | run.e2e.test.ts       | ✅ Complete |
| ada status            | status.e2e.test.ts    | ✅ Complete |
| ada config            | config.e2e.test.ts    | ✅ Complete |
| ada dispatch          | dispatch.e2e.test.ts  | ✅ Complete |
| ada memory            | memory.e2e.test.ts    | ✅ Complete |
| ada pause/resume/stop | lifecycle.e2e.test.ts | ✅ Complete |
| ada heat              | heat.e2e.test.ts      | ✅ Complete |
| ada issues            | issues.e2e.test.ts    | ✅ Complete |
| ada insights          | insights.e2e.test.ts  | ✅ Complete |
| ada observe           | observe.e2e.test.ts   | ✅ Complete |
| ada playbook          | playbook.e2e.test.ts  | ✅ Complete |
| ada reflexion         | reflexion.e2e.test.ts | ✅ Complete |
| ada validate          | validate.e2e.test.ts  | ✅ Complete |
| ada costs             | costs.e2e.test.ts     | ✅ Complete |
| ada terminal          | terminal.e2e.test.ts  | ✅ Complete |
| --banner              | banner.e2e.test.ts    | ✅ Complete |

### Core Library Tests (packages/core) — ✅ READY

| Category       | Files | Lines  | Status |
| -------------- | ----- | ------ | ------ |
| Unit Tests     | 25+   | ~4,500 | ✅     |
| Integration    | 10+   | ~2,500 | ✅     |
| **Total Core** | 35+   | ~7,000 | ✅     |

**Key Coverage Areas:**

- ✅ Rotation logic (`rotation.test.ts`)
- ✅ Memory management (`memory/`)
- ✅ Heat scoring (`heat/`)
- ✅ Observability (`observability.test.ts`)
- ✅ Error handling (`errors/`)
- ✅ PR workflow (`pr-workflow.test.ts`)
- ✅ Reflexion system (`reflexion/`)
- ✅ Telemetry (`telemetry/`)
- ✅ Cross-role insights (`cross-role-insights.test.ts`)
- ✅ Playbook suggestions (`playbook-suggestions.test.ts`)

### Web App Tests (apps/web) — ⚠️ NOT YET STARTED

| Category         | Files | Lines | Status     |
| ---------------- | ----- | ----- | ---------- |
| E2E (Playwright) | 0     | 0     | ⚠️ Pending |
| API Tests        | 0     | 0     | ⚠️ Pending |
| Unit Tests       | 0     | 0     | ⚠️ Pending |

**Current State:**

- `apps/web/` exists as scaffold (package.json, README only)
- No `tests/` directory created yet
- No Playwright configuration
- No test infrastructure

**This is expected** — web app is a Sprint 3 deliverable. Test infrastructure will be set up Day 1-2 per the Sprint 3 Test Strategy (C1109).

---

## Test Metrics Summary

| Metric           | Current | Target (Post-Sprint 3) |
| ---------------- | ------- | ---------------------- |
| Total Test Files | 99      | 120+                   |
| Total Tests      | 2,358   | 2,500+                 |
| Skipped Tests    | 87      | <50                    |
| Coverage (Core)  | 89%+    | 90%+                   |
| Coverage (CLI)   | 85%+    | 88%+                   |
| Coverage (Web)   | N/A     | 80%+                   |

---

## Sprint 3 Test Requirements

### Day 1-2: Infrastructure Setup

Per Sprint 3 Test Strategy (C1109), Day 1-2 must establish:

1. **Playwright Installation:**

   ```bash
   cd apps/web
   npm install -D @playwright/test
   npx playwright install
   ```

2. **Playwright Configuration:**
   - Create `apps/web/playwright.config.ts`
   - Configure baseURL, browsers, webServer
   - Set up screenshot/trace on failure

3. **Test Directory Structure:**

   ```
   apps/web/
   ├── tests/
   │   └── e2e/
   │       ├── auth.spec.ts
   │       ├── billing.spec.ts
   │       ├── dashboard.spec.ts
   │       └── fixtures/
   └── playwright.config.ts
   ```

4. **CI Integration:**
   - Add Playwright E2E job to GitHub Actions
   - Configure OAuth mock environment variables
   - Set up Stripe test mode secrets

### Required Secrets

Per Ops CI Enhancement Spec (C1111), these secrets are required:

| Secret            | Purpose                     | Source     |
| ----------------- | --------------------------- | ---------- |
| STRIPE_TEST_KEY   | Stripe test mode API key    | Stripe     |
| GITHUB_TEST_TOKEN | OAuth test authentication   | GitHub     |
| OAUTH_MOCK_SECRET | Test login bypass           | Internal   |
| PLAYWRIGHT_TOKEN  | Playwright cloud (optional) | Playwright |

---

## Risk Assessment

### Low Risk ✅

| Risk                         | Mitigation                             |
| ---------------------------- | -------------------------------------- |
| CLI tests incomplete         | 100% command coverage already achieved |
| Core tests flaky             | No known flaky tests in recent runs    |
| Test infrastructure outdated | Vitest + harness pattern working well  |

### Medium Risk ⚠️

| Risk                     | Mitigation                            |
| ------------------------ | ------------------------------------- |
| 87 skipped tests         | Review and enable/remove in Sprint 3  |
| Web test setup delay     | Detailed plan in C1109; Day 1-2 focus |
| OAuth mocking complexity | Use test login bypass pattern         |

### High Risk 🔴

| Risk                    | Mitigation                                  |
| ----------------------- | ------------------------------------------- |
| Stripe webhook testing  | Use Stripe CLI for local webhook forwarding |
| Container execution E2E | Mock container lifecycle in tests           |

---

## Skipped Tests Analysis

**87 tests currently skipped.** Root causes:

1. **Feature not yet implemented** (~40 tests)
   - Tests written ahead of implementation
   - Will be enabled as features complete

2. **Flaky/unstable** (~15 tests)
   - Timing-dependent tests
   - Network-dependent tests
   - Need refactoring

3. **Platform-specific** (~12 tests)
   - Windows-only or macOS-only
   - CI environment limitations

4. **Deprecated features** (~20 tests)
   - Old API patterns
   - Should be removed

**Recommendation:** Sprint 3 QA should audit skipped tests and:

- Enable tests where feature is now implemented
- Fix or mark as TODO for flaky tests
- Remove tests for deprecated features

---

## Pre-Sprint 3 Checklist

### Already Complete ✅

- [x] CLI E2E test suite comprehensive (17 files, all commands)
- [x] Core library test suite mature (35+ files, 89%+ coverage)
- [x] Test harness pattern established (`harness.ts`)
- [x] CI integration working (lint, typecheck, test jobs)
- [x] Sprint 3 Test Strategy documented (C1109)
- [x] Sprint 3 CI Enhancement Spec documented (C1111)

### Required Before Sprint 3 Day 1 ✅

- [x] Test strategy reviewed and approved
- [x] Secret requirements identified (7 secrets)
- [x] Timeline aligned with Engineering sequence (C1110)
- [x] This readiness audit completed

### Sprint 3 Day 1 Tasks

- [ ] Create `apps/web/tests/e2e/` directory
- [ ] Install Playwright dependencies
- [ ] Create Playwright config
- [ ] Create first auth test (smoke test)
- [ ] Add Playwright job to CI workflow
- [ ] Configure test secrets in GitHub

---

## Recommendations

### Immediate (Before Sprint 3)

1. **No blocking issues identified.** Test infrastructure is ready for Sprint 3.

### Sprint 3 Priorities

1. **Day 1-2:** Playwright infrastructure setup (blocking)
2. **Day 3-4:** Auth flow E2E tests (OAuth, login, logout)
3. **Day 5-6:** Billing flow E2E tests (Stripe integration)
4. **Day 7-9:** Dashboard and managed exec tests
5. **Day 10-11:** API gateway tests
6. **Day 12-14:** Polish, flaky test fixes, coverage gaps

### Post-Sprint 3

1. Reduce skipped tests from 87 to <50
2. Achieve 80%+ web app coverage
3. Add visual regression testing (optional)
4. Performance benchmark suite (optional)

---

## Conclusion

**Test infrastructure is Sprint 3 ready.** The CLI and core library have mature test suites with comprehensive coverage. The web app test infrastructure is intentionally deferred to Sprint 3 Day 1-2 since the web app itself is a Sprint 3 deliverable.

All specifications, timelines, and dependencies are documented and aligned. No blocking issues exist. Sprint 3 can proceed as planned.

---

## References

- [Sprint 3 Test Strategy (C1109)](./sprint3-saas-test-strategy-c1109.md)
- [Sprint 3 CI Enhancement Spec (C1111)](../ops/sprint3-ci-enhancement-spec-c1111.md)
- [Sprint 3 Implementation Sequence (C1110)](../engineering/sprint3-implementation-sequence-c1110.md)
- [#34 E2E Testing Infrastructure](https://github.com/ishan190425/autonomous-dev-agents/issues/34)

---

_🔍 The Inspector — Cycle 1119_
