# Sprint 3 Acceptance Criteria

> **Author:** 📦 Product | **Cycle:** 1187 | **Date:** 2026-02-23
> **Sprint:** 3 (Mar 1-14) | **Goal:** SaaS Container Complete

## Purpose

This document defines acceptance criteria for all Sprint 3 deliverables. Engineering uses these to know when features are "done." QA uses them for test coverage. Product uses them for acceptance testing.

---

## Feature 1: GitHub OAuth Authentication (#181)

### User Story

As a user, I want to sign in with my GitHub account so that I can access my ADA dashboard without creating a new password.

### Acceptance Criteria

| ID     | Criterion                                            | Test Method |
| ------ | ---------------------------------------------------- | ----------- |
| AUTH-1 | User can click "Sign in with GitHub" on landing page | Manual      |
| AUTH-2 | GitHub OAuth flow completes without errors           | E2E         |
| AUTH-3 | User avatar and name display after login             | Manual      |
| AUTH-4 | Session persists across browser refresh              | E2E         |
| AUTH-5 | User can sign out and session is invalidated         | E2E         |
| AUTH-6 | Invalid OAuth callback shows friendly error          | Manual      |
| AUTH-7 | User without GitHub account sees helpful message     | Manual      |

### User Flows to Validate

1. **Happy path:** Landing → Sign in → GitHub auth → Dashboard
2. **Return user:** Landing → Sign in → Already authorized → Dashboard (no re-auth)
3. **Logout flow:** Dashboard → Sign out → Landing (session cleared)
4. **Error path:** OAuth fails → Error page → Retry option

### Edge Cases

- User revokes GitHub app access between sessions
- OAuth callback with invalid state parameter
- Multiple browser tabs during auth flow

---

## Feature 2: Stripe Subscription Management (#182)

### User Story

As a user, I want to subscribe to ADA Pro so that I can access managed agent execution and the web dashboard.

### Acceptance Criteria

| ID     | Criterion                                                  | Test Method |
| ------ | ---------------------------------------------------------- | ----------- |
| BILL-1 | Pricing page shows Free and Pro ($49/mo) tiers             | Manual      |
| BILL-2 | "Upgrade to Pro" button initiates Stripe Checkout          | E2E         |
| BILL-3 | Successful payment redirects to dashboard with Pro badge   | Manual      |
| BILL-4 | Subscription status reflects in user profile               | E2E         |
| BILL-5 | User can access Stripe Customer Portal                     | Manual      |
| BILL-6 | Subscription cancellation removes Pro access at period end | Manual      |
| BILL-7 | Webhook handles payment_succeeded event correctly          | Integration |
| BILL-8 | Webhook handles subscription_deleted event correctly       | Integration |

### User Flows to Validate

1. **Upgrade flow:** Dashboard → Pricing → Select Pro → Stripe Checkout → Success → Pro Dashboard
2. **Portal flow:** Settings → Manage Subscription → Stripe Portal → Update card/Cancel
3. **Trial expiry:** (If applicable) Trial ends → Downgrade to Free features

### Edge Cases

- Payment fails (card declined) — user sees retry option
- Duplicate webhook deliveries (idempotent handling)
- User subscribes from different device than signup

---

## Feature 3: Waitlist Migration (#200)

### User Story

As a waitlist subscriber, I want my account created automatically when I sign in so that I don't lose my place in line.

### Acceptance Criteria

| ID        | Criterion                                                | Test Method |
| --------- | -------------------------------------------------------- | ----------- |
| MIGRATE-1 | Existing waitlist email matches new user's GitHub email  | Integration |
| MIGRATE-2 | Matched users get "Welcome back!" message on first login | Manual      |
| MIGRATE-3 | Early waitlist subscribers get priority badge            | Manual      |
| MIGRATE-4 | Migration preserves waitlist signup timestamp            | Integration |
| MIGRATE-5 | Non-matched users can still sign up normally             | E2E         |

### User Flows to Validate

1. **Matched user:** Waitlist email → GitHub login (same email) → Account with priority
2. **Unmatched user:** GitHub login → New account (no priority)
3. **Multiple waitlist entries:** Most recent entry used for priority

---

## Feature 4: Basic Dashboard (#155)

### User Story

As a user, I want to see my agent team's activity so that I understand what ADA is doing in my repos.

### Acceptance Criteria

| ID     | Criterion                               | Test Method |
| ------ | --------------------------------------- | ----------- |
| DASH-1 | Dashboard shows user's connected repos  | Manual      |
| DASH-2 | Cycle count displays correctly          | E2E         |
| DASH-3 | Last cycle timestamp displays correctly | E2E         |
| DASH-4 | Current role in rotation visible        | Manual      |
| DASH-5 | Recent history (last 5 cycles) displays | E2E         |
| DASH-6 | Dashboard loads in under 3 seconds      | Performance |
| DASH-7 | Mobile responsive layout works          | Manual      |

### User Flows to Validate

1. **First visit:** Login → Empty state → "Connect a repo" CTA
2. **Active user:** Login → Dashboard with cycle data → Drill into history
3. **Mobile:** Same flows on mobile device/responsive mode

---

## Feature 5: REST API for Dashboard (#190)

### User Story

As a dashboard, I need REST API endpoints to fetch user data so that I can display agent activity.

### Acceptance Criteria

| ID    | Criterion                                          | Test Method |
| ----- | -------------------------------------------------- | ----------- |
| API-1 | `GET /api/user` returns authenticated user profile | Integration |
| API-2 | `GET /api/repos` returns user's connected repos    | Integration |
| API-3 | `GET /api/repos/:id/cycles` returns cycle history  | Integration |
| API-4 | All endpoints require valid session                | Integration |
| API-5 | 401 returned for unauthenticated requests          | Integration |
| API-6 | Rate limiting prevents abuse (100 req/min)         | Load        |

### Endpoint Specifications

```
GET /api/user
Response: { id, email, name, avatar, tier, createdAt }

GET /api/repos
Response: [{ id, name, fullName, cycleCount, lastCycleAt }]

GET /api/repos/:id/cycles?limit=10&offset=0
Response: { cycles: [{ id, role, action, timestamp }], total }
```

---

## Feature 6: Managed Execution MVP (#189)

### User Story

As a Pro user, I want ADA to run cycles automatically in the cloud so that I don't need to run `ada run` locally.

### Acceptance Criteria

| ID     | Criterion                                        | Test Method |
| ------ | ------------------------------------------------ | ----------- |
| EXEC-1 | Pro user can enable managed execution per repo   | Manual      |
| EXEC-2 | Cycles run automatically on configured schedule  | E2E         |
| EXEC-3 | Cycle results visible in dashboard               | Manual      |
| EXEC-4 | User can pause/resume managed execution          | Manual      |
| EXEC-5 | Free users see upgrade CTA when trying to enable | Manual      |
| EXEC-6 | Execution errors reported clearly                | Integration |

### User Flows to Validate

1. **Enable flow:** Settings → Enable managed execution → Configure schedule → Active
2. **Monitor flow:** Dashboard → See automated cycles running → View results
3. **Pause flow:** Settings → Pause execution → Cycles stop → Resume

### Security Considerations

- GitHub token stored encrypted
- Execution isolated per user (no cross-contamination)
- Rate limits prevent runaway cycles

---

## Sprint 3 Definition of Done

All features meet their acceptance criteria AND:

- [ ] All E2E tests passing
- [ ] All integration tests passing
- [ ] No P0/P1 bugs in sprint scope
- [ ] Documentation updated
- [ ] Performance benchmarks met (dashboard < 3s load)
- [ ] Security review completed

---

## Testing Priority

| Priority | Feature                   | Rationale                 |
| -------- | ------------------------- | ------------------------- |
| 1        | Auth (#181)               | Blocks all other features |
| 2        | Billing (#182)            | Enables revenue           |
| 3        | API (#190)                | Dashboard depends on it   |
| 4        | Dashboard (#155)          | User-facing value         |
| 5        | Waitlist Migration (#200) | First user conversion     |
| 6        | Managed Execution (#189)  | Pro differentiation       |

---

_📦 The PM | Cycle 1187 | February 23, 2026_
