# ⚙️ Sprint 3 Implementation Sequence

> **Author:** ⚙️ Engineering (The Builder) | **Cycle:** 1110 | **Date:** 2026-02-22 10:58 EST
> **Sprint 3:** March 1-14, 2026
> **Goal:** SaaS Container Complete — Auth, Billing, Managed Execution, REST API, Dashboard

---

## Executive Summary

This document provides the **day-by-day implementation sequence** for Sprint 3, integrating all specs created during the holding period. It answers: _What does Engineering build, in what order, and where is the spec?_

**Spec Integration Matrix:**

| Feature             | Primary Spec                  | Supporting Specs                    |
| ------------------- | ----------------------------- | ----------------------------------- |
| #181 Auth           | C822 Auth Flow UX             | C960 Readiness                      |
| #182 Billing        | C832 Billing UX               | C960 Readiness                      |
| #189 Managed Exec   | **C1086 Implementation Spec** | C1106 Security ADR, C1085 Isolation |
| #190 API Gateway    | C796 API Spec                 | C1082 Error Messages                |
| #185 Error Messages | **C1102 UX Spec**             | Design patterns                     |
| Dashboard           | C635 UX Spec                  | C812 Component System               |
| Testing             | **C1109 Test Strategy**       | C959 QA Strategy                    |

**Key Insight:** C1086 (Managed Exec) and C1106 (Security ADR) provide the complete implementation blueprint for #189. This is the most complex Sprint 3 feature.

---

## Implementation Sequence

### Phase 1: Foundation (Days 1-2)

**Goal:** Auth working, all users can log in

#### Day 1 (Mar 1)

| Hour        | Task                                     | Deliverable             | Spec Reference |
| ----------- | ---------------------------------------- | ----------------------- | -------------- |
| 09:00-10:00 | Environment verification                 | All services accessible | C960 §6.1      |
| 10:00-11:00 | Create `packages/core/src/saas/types.ts` | Shared SaaS types       | C1086 §2       |
| 11:00-12:00 | Create auth module scaffold              | `auth/` directory       | C960 §1.3      |
| 13:00-15:00 | Implement GitHub OAuth flow              | Login working locally   | C822           |
| 15:00-17:00 | Session management + JWT validation      | Protected routes work   | C960 §4.1      |

**PR Target:** `feat(core): add GitHub OAuth authentication foundation`

#### Day 2 (Mar 2)

| Hour        | Task                           | Deliverable               | Spec Reference |
| ----------- | ------------------------------ | ------------------------- | -------------- |
| 09:00-11:00 | API key generation + hashing   | `POST /api/v1/keys` works | C1086 §2.1     |
| 11:00-12:00 | Auth middleware for API routes | Bearer token validation   | C960 §4.3      |
| 13:00-15:00 | Auth E2E tests (Playwright)    | 8 tests per C1109         | C1109 §Auth    |
| 15:00-17:00 | Login/logout UI pages          | Dashboard auth flow       | C822           |

**PR Target:** `feat(web): complete auth flow with API keys`

**Acceptance:** User can log in via GitHub, generate API key, make authenticated API calls.

---

### Phase 2: API Gateway (Days 3-4)

**Goal:** REST API ready for Dashboard and CLI consumption

#### Day 3 (Mar 3)

| Hour        | Task                                       | Deliverable                | Spec Reference |
| ----------- | ------------------------------------------ | -------------------------- | -------------- |
| 09:00-11:00 | Create API route structure                 | `/api/v1/` scaffold        | C796           |
| 11:00-12:00 | Implement error handling middleware        | Consistent error responses | **C1102**      |
| 13:00-15:00 | `GET /api/v1/repos` + `POST /api/v1/repos` | Repository CRUD            | C1086 §2.1     |
| 15:00-17:00 | Rate limiting middleware                   | Per-tier limits            | C960 §4.3      |

**Error Format (per C1102):**

```typescript
interface APIError {
  code: string; // E.g., "AUTH_001"
  category: 'INIT' | 'AUTH' | 'BILLING' | 'EXEC' | 'API';
  message: string; // Human-readable
  suggestion?: string; // Actionable fix
  docs_url?: string; // Link to docs
}
```

#### Day 4 (Mar 4)

| Hour        | Task                           | Deliverable            | Spec Reference |
| ----------- | ------------------------------ | ---------------------- | -------------- |
| 09:00-11:00 | `GET /api/v1/cycles` + history | Cycle list + details   | C1086 §2.1     |
| 11:00-12:00 | `GET /api/v1/status`           | Account status + usage | C796           |
| 13:00-15:00 | OpenAPI schema generation      | `/api/v1/openapi.json` | Best practice  |
| 15:00-17:00 | API E2E tests                  | 8 tests per C1109      | C1109 §API     |

**PR Target:** `feat(web): REST API gateway with OpenAPI spec`

**Acceptance:** All core endpoints return correct data, errors follow C1102 format, OpenAPI spec validates.

---

### Phase 3: Billing (Days 5-7)

**Goal:** Stripe integration complete, users can subscribe

#### Day 5 (Mar 5)

| Hour        | Task                         | Deliverable                       | Spec Reference |
| ----------- | ---------------------------- | --------------------------------- | -------------- |
| 09:00-11:00 | Stripe SDK integration       | `packages/core/src/saas/billing/` | C960 §4.2      |
| 11:00-13:00 | Create checkout session flow | User can start subscription       | C832           |
| 14:00-17:00 | Subscription status sync     | `subscriptions` table updated     | C960 §4.2      |

#### Day 6 (Mar 6)

| Hour        | Task                            | Deliverable                  | Spec Reference |
| ----------- | ------------------------------- | ---------------------------- | -------------- |
| 09:00-12:00 | Webhook handlers (6 events)     | Idempotent processing        | C960 §4.2      |
| 13:00-15:00 | Customer portal integration     | User can manage subscription | C832           |
| 15:00-17:00 | Usage metering (cycle counting) | Stripe usage records         | C1086 §5.2     |

#### Day 7 (Mar 7)

| Hour        | Task                        | Deliverable                    | Spec Reference |
| ----------- | --------------------------- | ------------------------------ | -------------- |
| 09:00-11:00 | Billing UI pages            | `/billing`, `/billing/success` | C832           |
| 11:00-13:00 | Tier enforcement middleware | Free tier limits work          | C960 §4.2      |
| 14:00-17:00 | Billing E2E tests           | 10 tests per C1109             | C1109 §Billing |

**PR Target:** `feat(web): Stripe billing integration with usage metering`

**Webhook Events (per C960):**

- `checkout.session.completed` → create subscription
- `customer.subscription.updated` → sync plan/status
- `customer.subscription.deleted` → mark cancelled
- `invoice.payment_succeeded` → update billing period
- `invoice.payment_failed` → mark past_due
- `customer.updated` → sync customer details

**Acceptance:** User can subscribe, cancel, upgrade. Usage is tracked. Past-due accounts are restricted.

---

### Phase 4: Managed Execution (Days 8-11)

**Goal:** Cloud execution working end-to-end

**Primary Specs:** C1086 (Implementation), C1106 (Security ADR)

#### Day 8 (Mar 8)

| Hour        | Task                        | Deliverable                | Spec Reference |
| ----------- | --------------------------- | -------------------------- | -------------- |
| 09:00-11:00 | GKE Autopilot cluster setup | Cluster running            | C1086 §1.1     |
| 11:00-13:00 | Tenant namespace template   | `tenant-${ID}` with quotas | C1086 §3.1     |
| 14:00-17:00 | Execution job template      | Job manifest complete      | C1086 §3.2     |

**Security Controls (per C1106):**

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  seccompProfile:
    type: RuntimeDefault
  capabilities:
    drop: ['ALL']
```

#### Day 9 (Mar 9)

| Hour        | Task                              | Deliverable            | Spec Reference    |
| ----------- | --------------------------------- | ---------------------- | ----------------- |
| 09:00-11:00 | Network policy (egress allowlist) | GitHub + LLM APIs only | C1086 §3.3, C1106 |
| 11:00-13:00 | Dispatch controller service       | Job creation works     | C1086 §4          |
| 14:00-17:00 | `POST /api/v1/executions`         | Execution API          | C1086 §2.1        |

#### Day 10 (Mar 10)

| Hour        | Task                      | Deliverable             | Spec Reference |
| ----------- | ------------------------- | ----------------------- | -------------- |
| 09:00-11:00 | Execution status tracking | State machine working   | C1086 §4.1     |
| 11:00-13:00 | WebSocket log streaming   | Real-time logs          | C1086 §2.2     |
| 14:00-17:00 | CLI `--cloud` flag        | Local → cloud execution | C1086 §6.1     |

#### Day 11 (Mar 11)

| Hour        | Task                          | Deliverable            | Spec Reference |
| ----------- | ----------------------------- | ---------------------- | -------------- |
| 09:00-11:00 | Metering pipeline (LLM costs) | Cost tracking accurate | C1086 §5       |
| 11:00-13:00 | Quota enforcement             | Tier limits work       | C1086 §4.2     |
| 14:00-17:00 | Managed Exec E2E tests        | 8 tests per C1109      | C1109 §Exec    |

**PR Target:** `feat(web): managed agent execution with GKE`

**Acceptance:** User can trigger cloud execution, logs stream in real-time, metering tracks costs, isolation works.

---

### Phase 5: Dashboard + Integration (Days 12-14)

**Goal:** Dashboard live, full integration tested

#### Day 12 (Mar 12)

| Hour        | Task                              | Deliverable            | Spec Reference |
| ----------- | --------------------------------- | ---------------------- | -------------- |
| 09:00-11:00 | Dashboard layout + navigation     | Shadcn UI scaffold     | C812           |
| 11:00-13:00 | Repos page (`/dashboard/repos`)   | List connected repos   | C635           |
| 14:00-17:00 | Cycles page (`/dashboard/cycles`) | Cycle history + status | C635           |

#### Day 13 (Mar 13)

| Hour        | Task                     | Deliverable              | Spec Reference |
| ----------- | ------------------------ | ------------------------ | -------------- |
| 09:00-11:00 | Execution trigger UI     | "Run Cycle" button works | C635           |
| 11:00-13:00 | Real-time log viewer     | WebSocket integration    | C1086 §2.2     |
| 14:00-17:00 | Billing page integration | Usage + plan display     | C832           |

#### Day 14 (Mar 14)

| Hour        | Task                      | Deliverable             | Spec Reference |
| ----------- | ------------------------- | ----------------------- | -------------- |
| 09:00-11:00 | Full E2E integration test | End-to-end flow works   | C1109          |
| 11:00-13:00 | Production deployment     | Vercel + GKE live       | Ops            |
| 14:00-16:00 | Documentation updates     | README, getting started | #238           |
| 16:00-17:00 | Sprint review + retro     | Lessons captured        | Scrum          |

**PR Target:** `feat(web): dashboard with real-time execution monitoring`

**Acceptance:** User journey complete: signup → connect repo → trigger cycle → view logs → manage billing.

---

## Cross-Package Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                       packages/core                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ src/saas/                                                   ││
│  │   types.ts ─────────────────────────────────────────────────┼┼──► ALL packages
│  │   auth/ ────────────────────────────────────────────────────┼┼──► web (routes)
│  │   billing/ ─────────────────────────────────────────────────┼┼──► web (routes)
│  │   dispatch/ (extend existing) ──────────────────────────────┼┼──► cli (--cloud)
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   packages/cli  │  │    apps/web     │  │ execution-ctrl  │
│                 │  │                 │  │   (new svc)     │
│ ada dispatch    │  │ /api/v1/*       │  │                 │
│   --cloud       │  │ /dashboard/*    │  │ K8s job mgmt    │
│ ada cloud login │  │ /billing/*      │  │ Log streaming   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Build Order:** core → cli → web → execution-controller

---

## Spec Quick Reference

| Spec                 | Location                                                       | Key Content                             |
| -------------------- | -------------------------------------------------------------- | --------------------------------------- |
| C1086 Managed Exec   | `docs/frontier/managed-execution-implementation-spec-c1086.md` | Full K8s infra, API contracts, metering |
| C1106 Security ADR   | `docs/frontier/adr-runtime-security-model-c1106.md`            | Seccomp, AppArmor, network policy       |
| C1109 Test Strategy  | `docs/qa/sprint3-saas-test-strategy-c1109.md`                  | E2E test counts per feature             |
| C1102 Error Messages | `docs/design/error-messages-ux-spec-c1102.md`                  | Error format, categories, suggestions   |
| C960 Readiness       | `docs/engineering/sprint3-engineering-readiness-c960.md`       | Dependencies, pre-setup, tech stack     |
| C822 Auth UX         | `docs/design/auth-flow-ux-spec-c822.md`                        | OAuth flow, UI screens                  |
| C832 Billing UX      | `docs/design/billing-ux-spec-c832.md`                          | Checkout, portal, usage display         |
| C812 Components      | `docs/design/dashboard-component-design-system-c812.md`        | Shadcn UI patterns                      |

---

## Risk Mitigation

| Risk                   | Impact | Mitigation                                         |
| ---------------------- | ------ | -------------------------------------------------- |
| GKE setup delays       | HIGH   | Day 8 buffer; fallback to local K8s (kind) for dev |
| Stripe webhook testing | MEDIUM | Use Stripe CLI for local webhook forwarding        |
| Auth edge cases        | MEDIUM | Per C1109: Test org accounts, SSO, 2FA scenarios   |
| Cold start latency     | MEDIUM | C1086 §10: Pool of 3 warm containers               |
| Network policy blocks  | LOW    | Test egress early (Day 9 AM)                       |

---

## Day 1 Checklist (Mar 1)

Pre-verified (by Feb 28):

- [ ] Supabase project + schema migrated
- [ ] GitHub OAuth App credentials in Vercel
- [ ] Stripe test mode + products configured
- [ ] GCP project + GKE API enabled
- [ ] All env vars in Vercel

Day 1 start:

- [ ] `npm install` succeeds with new deps
- [ ] CI green on main
- [ ] All team members have GCP access
- [ ] C1086, C1106 printed/accessible for reference

---

## Summary

**Sprint 3 = 14 days = 5 phases:**

1. **Days 1-2:** Auth foundation (must complete first)
2. **Days 3-4:** API Gateway (enables Dashboard + CLI)
3. **Days 5-7:** Billing (revenue unlocked)
4. **Days 8-11:** Managed Execution (core differentiator)
5. **Days 12-14:** Dashboard + integration

**Critical path:** Auth → API → Execution. Billing can parallelize after Day 3.

**Spec ownership:** C1086 is the implementation bible for Managed Execution. Reference it daily Days 8-11.

---

_Document created C1110. Engineering implementation blueprint for Sprint 3._
