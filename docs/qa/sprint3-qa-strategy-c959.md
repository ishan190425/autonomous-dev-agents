# 🔍 Sprint 3 QA Strategy

> **Author:** 🔍 QA Lead (The Inspector) | **Cycle:** 959 | **Date:** 2026-02-21 10:14 EST
> **Sprint 3:** March 1-14, 2026
> **Goal:** SaaS Container Complete — Auth, Billing, Managed Execution, REST API

---

## Executive Summary

**STATUS: 🟢 QA PREPARATION COMPLETE**

Sprint 3 introduces critical SaaS functionality requiring comprehensive test coverage. This document:

1. Maps testing requirements to each Sprint 3 feature
2. Defines testing patterns for auth, payments, and cloud execution
3. Sets coverage targets and quality gates
4. Lists E2E scenarios for Sprint 3 validation

---

## Current Test Health (Day 5 Baseline)

| Metric              | Value  | Status                |
| ------------------- | ------ | --------------------- |
| **Core Tests**      | 1,350+ | ✅ All passing        |
| **CLI Tests**       | 500+   | ✅ All passing        |
| **E2E Tests**       | 85+    | ✅ Merged C949        |
| **Coverage (Core)** | 89%+   | ✅ Above threshold    |
| **CI Status**       | Green  | ✅ 5 consecutive runs |
| **Flaky Tests**     | 0      | ✅ None identified    |

---

## Sprint 3 Testing Matrix

### #181: GitHub OAuth Authentication

| Test Category         | Tests Required                                     | Priority | Owner       |
| --------------------- | -------------------------------------------------- | -------- | ----------- |
| **Unit Tests**        | OAuth flow mocks, token validation, user session   | HIGH     | Engineering |
| **Integration Tests** | GitHub API integration (mocked), callback handling | HIGH     | QA          |
| **E2E Tests**         | Full login flow (requires test GitHub app)         | MEDIUM   | QA          |
| **Security Tests**    | Token expiry, refresh flows, CSRF protection       | HIGH     | QA          |

**Key Scenarios:**

1. New user OAuth login → creates account
2. Returning user OAuth login → restores session
3. OAuth token expiry → triggers refresh
4. Invalid OAuth state → rejects with error
5. GitHub API failure → graceful degradation
6. Session persistence across browser restart

**Coverage Target:** 90%+ for `packages/core/src/auth/`

**Mock Requirements:**

```typescript
// MSW handlers for GitHub OAuth
export const githubOAuthHandlers = [
  rest.get('https://github.com/login/oauth/authorize', ...),
  rest.post('https://github.com/login/oauth/access_token', ...),
  rest.get('https://api.github.com/user', ...),
];
```

---

### #182: Stripe Billing Integration

| Test Category         | Tests Required                              | Priority | Owner       |
| --------------------- | ------------------------------------------- | -------- | ----------- |
| **Unit Tests**        | Subscription state machine, plan validation | HIGH     | Engineering |
| **Integration Tests** | Stripe API mocks, webhook handling          | HIGH     | QA          |
| **E2E Tests**         | Checkout flow (Stripe test mode)            | HIGH     | QA          |
| **Webhook Tests**     | All subscription lifecycle events           | CRITICAL | QA          |

**Key Scenarios:**

1. New subscription → Stripe checkout session → active
2. Subscription upgrade → prorated billing
3. Subscription downgrade → effective at period end
4. Payment failure → grace period → suspension
5. Subscription cancellation → effective at period end
6. Webhook `customer.subscription.updated` → state sync
7. Webhook `invoice.payment_failed` → user notification
8. Subscription restoration after payment fix

**Coverage Target:** 95%+ for billing code (money handling requires highest coverage)

**Mock Requirements:**

```typescript
// MSW handlers for Stripe API
export const stripeHandlers = [
  rest.post('https://api.stripe.com/v1/checkout/sessions', ...),
  rest.post('https://api.stripe.com/v1/subscriptions', ...),
  rest.post('https://api.stripe.com/v1/billing_portal/sessions', ...),
];

// Webhook event fixtures
export const stripeWebhookFixtures = {
  subscriptionCreated: { ... },
  subscriptionUpdated: { ... },
  invoicePaymentFailed: { ... },
  invoicePaymentSucceeded: { ... },
};
```

**⚠️ Critical: Webhook Signature Verification Tests**

- Valid signature → process event
- Invalid signature → reject with 400
- Replay attack (duplicate event ID) → idempotent handling

---

### #189: Managed Agent Execution

| Test Category         | Tests Required                                        | Priority | Owner    |
| --------------------- | ----------------------------------------------------- | -------- | -------- |
| **Unit Tests**        | Scheduler logic, container lifecycle, resource limits | HIGH     | Frontier |
| **Integration Tests** | Docker/container mocks, execution isolation           | HIGH     | QA       |
| **E2E Tests**         | Full cycle execution in managed environment           | MEDIUM   | QA       |
| **Resource Tests**    | Memory/CPU limits, timeout enforcement                | HIGH     | QA       |

**Key Scenarios:**

1. User schedules agent run → container spins up → executes → terminates
2. Agent exceeds memory limit → OOM kill → graceful failure
3. Agent exceeds time limit → timeout kill → graceful failure
4. Concurrent executions → resource isolation
5. Agent crash → cleanup → user notification
6. Execution logs → streaming to dashboard
7. Execution artifacts → stored and retrievable

**Coverage Target:** 85%+ for execution engine

**Mock Requirements:**

```typescript
// Container runtime mocks
export const containerMocks = {
  createContainer: vi.fn(),
  startContainer: vi.fn(),
  stopContainer: vi.fn(),
  getContainerLogs: vi.fn(),
};
```

---

### #190: REST API Gateway

| Test Category         | Tests Required                          | Priority | Owner       |
| --------------------- | --------------------------------------- | -------- | ----------- |
| **Unit Tests**        | Route handlers, middleware, validation  | HIGH     | Engineering |
| **Integration Tests** | Full request/response cycle (supertest) | HIGH     | QA          |
| **E2E Tests**         | API client SDK validation               | MEDIUM   | QA          |
| **Contract Tests**    | OpenAPI spec compliance                 | HIGH     | QA          |

**Key Scenarios:**

1. Authenticated request → valid response
2. Unauthenticated request → 401 Unauthorized
3. Invalid API key → 403 Forbidden
4. Rate limiting → 429 Too Many Requests
5. Malformed request → 400 Bad Request with details
6. Server error → 500 with correlation ID
7. All endpoints match OpenAPI spec

**Coverage Target:** 90%+ for API handlers

**API Endpoints to Test:**

| Endpoint                      | Method | Auth   | Tests              |
| ----------------------------- | ------ | ------ | ------------------ |
| `/api/v1/agents`              | GET    | Bearer | List user's agents |
| `/api/v1/agents`              | POST   | Bearer | Create agent       |
| `/api/v1/agents/:id`          | GET    | Bearer | Get agent details  |
| `/api/v1/agents/:id/dispatch` | POST   | Bearer | Trigger dispatch   |
| `/api/v1/runs`                | GET    | Bearer | List runs          |
| `/api/v1/runs/:id`            | GET    | Bearer | Get run details    |
| `/api/v1/runs/:id/logs`       | GET    | Bearer | Stream logs        |

---

### #113: Cognitive Memory (Frontier)

| Test Category         | Tests Required                                   | Priority | Owner    |
| --------------------- | ------------------------------------------------ | -------- | -------- |
| **Unit Tests**        | Heat scoring, reference tracking, memory tiering | HIGH     | Frontier |
| **Integration Tests** | Vector store integration, embedding pipeline     | HIGH     | QA       |
| **Performance Tests** | Memory retrieval latency, scaling                | MEDIUM   | QA       |

**Key Scenarios:**

1. Memory entry creation → heat score initialized
2. Memory reference → heat score increment
3. Memory decay over time → heat score decrease
4. High-heat retrieval → prioritized results
5. Memory compression → low-heat archival
6. Cross-role memory sharing → visibility rules

**Coverage Target:** 85%+ (existing heat tests at 89%)

---

## E2E Test Suite Expansion

### New E2E Tests for Sprint 3

```
packages/cli/tests/e2e/
├── auth.e2e.test.ts           # GitHub OAuth flow
├── billing.e2e.test.ts        # Stripe subscription flow
├── managed-exec.e2e.test.ts   # Managed execution lifecycle
├── api-gateway.e2e.test.ts    # REST API integration
└── dashboard.e2e.test.ts      # Web dashboard flows
```

**E2E Prerequisites:**

- [ ] Stripe test mode API keys in CI secrets
- [ ] GitHub OAuth test app for CI
- [ ] Container runtime available in CI (Docker-in-Docker or containerd)
- [ ] Test database isolation per E2E run

---

## Quality Gates

### Pre-Merge Requirements (Sprint 3)

All PRs for Sprint 3 features MUST:

1. ✅ Maintain or increase test coverage
2. ✅ Include tests for all new functionality
3. ✅ Pass all existing tests
4. ✅ Include integration tests for external APIs (mocked)
5. ✅ Include E2E tests for user-facing flows

### Coverage Thresholds

| Package        | Current | Sprint 3 Target | Critical Paths              |
| -------------- | ------- | --------------- | --------------------------- |
| `@ada-ai/core` | 89%     | 90%             | auth/, billing/, execution/ |
| `@ada-ai/cli`  | 85%     | 87%             | commands/, api/             |
| `apps/web`     | —       | 80%             | pages/, api/, components/   |

---

## Testing Infrastructure Needs

### Before Sprint 3 Starts (Feb 28)

- [ ] **Stripe test webhook endpoint** in CI environment
- [ ] **GitHub OAuth test app** created and configured
- [ ] **Container test environment** (Docker-in-Docker setup)
- [ ] **Test database isolation** for E2E parallelization
- [ ] **MSW handlers** for Stripe, GitHub, container APIs

### Test Data & Fixtures

```
packages/core/tests/fixtures/
├── stripe/
│   ├── checkout-session.json
│   ├── subscription-active.json
│   ├── subscription-canceled.json
│   └── webhooks/
├── github/
│   ├── oauth-callback.json
│   └── user-profile.json
└── execution/
    ├── container-running.json
    └── container-completed.json
```

---

## Risk Assessment

| Risk                              | Impact | Mitigation                                        |
| --------------------------------- | ------ | ------------------------------------------------- |
| Stripe webhook testing complexity | HIGH   | Use Stripe CLI for local testing, fixtures for CI |
| OAuth flow testing in CI          | MEDIUM | GitHub test app with reduced permissions          |
| Container testing isolation       | MEDIUM | Ephemeral containers per test, cleanup hooks      |
| Payment edge cases                | HIGH   | Comprehensive webhook fixture suite               |
| API rate limiting in tests        | LOW    | Mocked APIs, real calls only in staging           |

---

## Sprint 3 QA Milestones

| Date       | Milestone       | Deliverable                                    |
| ---------- | --------------- | ---------------------------------------------- |
| **Mar 1**  | Sprint Start    | Test infrastructure ready                      |
| **Mar 3**  | Auth Tests      | `auth.e2e.test.ts` complete                    |
| **Mar 5**  | Billing Tests   | `billing.e2e.test.ts` + webhook tests complete |
| **Mar 7**  | API Tests       | `api-gateway.e2e.test.ts` complete             |
| **Mar 10** | Execution Tests | `managed-exec.e2e.test.ts` complete            |
| **Mar 12** | Integration     | Full E2E suite passing                         |
| **Mar 14** | Sprint End      | All quality gates met                          |

---

## Summary

Sprint 3 QA strategy is **READY**. Key preparations:

1. **Test infrastructure** needs pre-Sprint setup (Stripe webhooks, OAuth app, containers)
2. **Coverage targets** defined for all new code paths
3. **E2E expansion** planned with specific test files
4. **Quality gates** established to maintain standards
5. **Risk mitigations** identified for complex testing scenarios

**Day 5-10 QA Priority:** Monitor for any regressions, prepare test infrastructure checklist.

---

_Document created C959. Updates as Sprint 3 progresses._
