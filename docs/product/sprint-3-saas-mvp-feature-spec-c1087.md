# Sprint 3 SaaS MVP Feature Spec

> Consolidated feature specification for Sprint 3 SaaS Container
> **Author:** 📦 Product (The PM) | **Cycle:** 1087
> **Sprint 3:** Mar 1–14, 2026 | **North Star:** First MRR ($100 by Mar 31)

---

## Executive Summary

Sprint 3 executes the strategic pivot (#158): **skip all incubators, bootstrap via SaaS revenue**. This spec consolidates work from C1077 (Waitlist Activation), C1082 (CLI Error Messages), C1085 (Container Isolation), and C1086 (Managed Execution) into a single feature-complete MVP plan.

**What we're building:** A managed ADA service where users sign up, connect GitHub, subscribe ($19/mo), and have ADA run autonomous cycles on their repos in the cloud.

**Why this matters:** First revenue proves product-market fit faster than any incubator validation. $100 MRR by Mar 31 is achievable with just 6 paying users.

---

## Sprint 3 Feature Stack

### Overview

| Priority | Feature             | Issue | Owner       | Dependencies | Sprint Day     |
| -------- | ------------------- | ----- | ----------- | ------------ | -------------- |
| P0       | GitHub OAuth        | #181  | Engineering | None         | Day 1-2        |
| P0       | Billing (Stripe)    | #182  | Engineering | #181         | Day 3-5        |
| P0       | Managed Execution   | #189  | Engineering | #181, #182   | Day 6-10       |
| P1       | REST API Gateway    | #190  | Engineering | #181         | Day 5-8        |
| P1       | Waitlist Activation | #200  | Growth      | #181, #182   | Day 1 (deploy) |

### Dependency Graph

```
┌─────────────┐
│ #200        │ ←── Deploy Day 1 (human unblock)
│ Waitlist    │
└─────────────┘
       │
       ▼
┌─────────────┐
│ #181 Auth   │ ←── Must complete first
│ GitHub OAuth│
└──────┬──────┘
       │
   ┌───┴───┐
   ▼       ▼
┌─────┐ ┌─────────┐
│#190 │ │ #182    │
│ API │ │ Billing │
└─────┘ └────┬────┘
             │
             ▼
       ┌───────────┐
       │ #189      │
       │ Managed   │
       │ Execution │
       └───────────┘
```

---

## Feature 1: GitHub OAuth Authentication (#181)

### User Story

> As a developer, I want to sign in with my GitHub account so that I can authorize ADA to access my repositories without creating a separate account.

### Acceptance Criteria

- [ ] **OAuth Flow:** User clicks "Sign in with GitHub" → GitHub authorization → redirect back with session
- [ ] **Scopes Required:** `read:user`, `user:email`, `repo` (for repo access)
- [ ] **Session Management:** JWT tokens with 7-day expiry, refresh token rotation
- [ ] **Error Handling:** Graceful handling of auth failures, rate limits, revoked permissions
- [ ] **Account Linking:** If user already exists (from waitlist email), link accounts
- [ ] **Logout:** Clear session, revoke GitHub token (optional)

### Technical Spec Reference

- Supabase Auth with GitHub provider (existing infra from #82)
- See `docs/design/github-oauth-flow-spec.md` (to be created if missing)

### MVP Scope

**In scope:**

- GitHub OAuth sign-in/sign-out
- Basic user profile (email, avatar, GitHub username)
- Session persistence

**Out of scope (v2):**

- Organization-level permissions
- Multiple GitHub account linking
- SSO/SAML (Enterprise tier)

### Definition of Done

1. User can sign in via GitHub OAuth
2. Session persists across browser sessions
3. User profile displays GitHub data
4. All auth errors have actionable messages per C1082 spec
5. E2E tests covering happy path + error cases

---

## Feature 2: Stripe Billing Integration (#182)

### User Story

> As an authenticated user, I want to subscribe to ADA Pro ($19/mo) so that I can run managed execution cycles on my repositories.

### Acceptance Criteria

- [ ] **Pricing Display:** Clear pricing page showing Free vs Pro tiers
- [ ] **Checkout Flow:** Stripe Checkout redirect → payment → return to dashboard
- [ ] **Subscription States:** `active`, `past_due`, `canceled`, `trialing`
- [ ] **Billing Portal:** Link to Stripe Customer Portal for self-service management
- [ ] **Webhook Handling:** Process `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
- [ ] **Entitlement Enforcement:** Non-subscribers blocked from managed execution

### Pricing Tiers

| Tier       | Price  | Cycles/Month | Features                                       |
| ---------- | ------ | ------------ | ---------------------------------------------- |
| Free       | $0     | 0 (CLI only) | Local CLI, all templates, community support    |
| Pro        | $19/mo | 500          | Managed execution, dashboard, priority support |
| Enterprise | $99/mo | Unlimited    | Custom roles, SSO, team management, API access |

### Technical Spec Reference

- C1077 Waitlist Activation Spec: Conversion funnel, early access perks
- Stripe Checkout (no custom payment forms for MVP)
- Supabase `subscriptions` table for entitlement checks

### MVP Scope

**In scope:**

- Stripe Checkout for Pro tier ($19/mo)
- Subscription status sync via webhooks
- Basic entitlement check (has_active_subscription)
- Billing portal link

**Out of scope (v2):**

- Enterprise tier checkout
- Annual billing discount
- Team/org billing
- Usage-based metering beyond cycle count

### Definition of Done

1. User can subscribe via Stripe Checkout
2. Subscription status correctly synced
3. Non-subscribers cannot access managed execution
4. Billing portal accessible from dashboard
5. All payment errors have actionable messages

---

## Feature 3: Managed Agent Execution (#189)

### User Story

> As a Pro subscriber, I want ADA to run autonomous dispatch cycles on my GitHub repositories in the cloud so that my projects progress even when I'm not working.

### Acceptance Criteria

- [ ] **Repo Connection:** User connects GitHub repo via OAuth, ADA gets push access
- [ ] **Cycle Scheduling:** User sets cycle interval (15min, 30min, 1hr, manual)
- [ ] **Execution Isolation:** Each cycle runs in isolated container per C1085 spec
- [ ] **Output Display:** Cycle logs, actions taken, memory bank updates visible in dashboard
- [ ] **Billing Metering:** Cycles counted against monthly quota (500 for Pro)
- [ ] **Pause/Resume:** User can pause scheduled execution

### Technical Spec References

- C1085 Container Isolation Patterns: GKE Autopilot with gVisor, resource limits
- C1086 Managed Execution Implementation: K8s Job templates, Execution API, metering pipeline
- `docs/frontier/managed-execution-implementation-spec-c1086.md`

### Architecture (from C1086)

```
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│ Web Dashboard│────▶│ Execution API │────▶│ GKE Autopilot│
│ (Next.js)    │     │ (REST/WS)     │     │ (K8s Jobs)   │
└──────────────┘     └───────────────┘     └──────────────┘
                            │                     │
                            ▼                     ▼
                     ┌──────────────┐     ┌──────────────┐
                     │ Metering DB  │     │ Secrets Mgmt │
                     │ (Postgres)   │     │ (Vault/GCP)  │
                     └──────────────┘     └──────────────┘
```

### MVP Scope

**In scope:**

- Single-repo execution (one repo per user initially)
- Basic cycle scheduling (fixed intervals)
- Cycle logs visible in dashboard
- Usage metering and quota enforcement
- Container isolation with resource limits

**Out of scope (v2):**

- Multi-repo parallel execution
- Custom agent executors (beyond default)
- Real-time cycle streaming
- Advanced scheduling (cron expressions)

### Definition of Done

1. Pro user can connect a GitHub repo
2. Cycles run automatically at configured interval
3. Cycle output visible in dashboard within 30s of completion
4. Cycles stop when quota exhausted
5. Container isolation verified (no cross-tenant data access)
6. E2E test: signup → subscribe → connect repo → run cycle → view output

---

## Feature 4: REST API Gateway (#190)

### User Story

> As a developer, I want to access ADA programmatically via REST API so that I can integrate it with my existing tools and workflows.

### Acceptance Criteria

- [ ] **Authentication:** Bearer token (JWT from OAuth session or API key)
- [ ] **Endpoints:**
  - `GET /repos` — List connected repositories
  - `POST /repos/{id}/cycles` — Trigger manual cycle
  - `GET /repos/{id}/cycles` — List cycle history
  - `GET /repos/{id}/cycles/{id}` — Get cycle details
  - `GET /account` — Get account info + subscription status
- [ ] **Rate Limiting:** 100 req/min for Pro, 1000 req/min for Enterprise
- [ ] **OpenAPI Spec:** Documented API with interactive explorer

### MVP Scope

**In scope:**

- Core CRUD for repos and cycles
- JWT authentication
- Basic rate limiting
- OpenAPI documentation

**Out of scope (v2):**

- API keys (separate from session JWT)
- Webhooks for cycle completion
- GraphQL alternative
- SDK libraries (JS, Python)

### Definition of Done

1. All endpoints functional and documented
2. Authentication enforced on all routes
3. Rate limiting active
4. OpenAPI spec served at `/api/docs`
5. Postman collection or curl examples in docs

---

## Feature 5: Waitlist Activation (#200)

### User Story

> As a waitlist subscriber, I want to be notified when ADA SaaS launches so that I can be an early adopter with special perks.

### Current Status

- ✅ Code ready (PR #215 merged)
- 🟡 Awaiting human Vercel deployment (Day 8 blocker)

### Activation Plan (from C1077)

| Wave | Date  | Emails    | Perks                                        |
| ---- | ----- | --------- | -------------------------------------------- |
| 1    | Mar 1 | First 25  | 150 cycles, founding badge, priority support |
| 2    | Mar 3 | Next 50   | 100 cycles, early access badge               |
| 3    | Mar 5 | Next 100  | 50 cycles                                    |
| 4    | Mar 7 | Remaining | Standard Pro trial                           |

### MVP Scope

Deploy waitlist website (#200) is a **prerequisite** for all Sprint 3 work — provides email capture and establishes user funnel.

### Definition of Done

1. Waitlist website live on Vercel
2. Email capture functional
3. Database schema supports activation waves
4. Launch announcement pack (C1084) executed

---

## Success Metrics (Sprint 3)

| Metric             | Target | Measurement                       |
| ------------------ | ------ | --------------------------------- |
| Waitlist Signups   | 100+   | Supabase count                    |
| OAuth Signups      | 50+    | Converted from waitlist + organic |
| Paid Subscribers   | 6+     | $100+ MRR                         |
| Managed Cycles Run | 500+   | GKE metrics                       |
| API Requests       | 1,000+ | Gateway logs                      |
| E2E Test Coverage  | 90%+   | QA dashboard                      |

---

## Risk Register

| Risk                           | Likelihood | Impact   | Mitigation                                         |
| ------------------------------ | ---------- | -------- | -------------------------------------------------- |
| #200 still blocked Day 1       | Medium     | High     | CEO escalation complete (C1083), ping again Feb 28 |
| Stripe integration delays      | Low        | High     | Use Stripe Checkout (minimal custom code)          |
| GKE provisioning issues        | Low        | Medium   | Terraform scripts from C1086, test in staging      |
| Container escape vulnerability | Low        | Critical | gVisor mandatory per C1085, security audit         |

---

## Sprint 3 Day-by-Day Plan

| Day   | Date      | Focus        | Deliverables                           |
| ----- | --------- | ------------ | -------------------------------------- |
| 0     | Feb 28    | Pre-sprint   | #200 deployed, team briefed            |
| 1-2   | Mar 1-2   | Auth         | #181 complete, OAuth working           |
| 3-5   | Mar 3-5   | Billing      | #182 complete, Stripe checkout working |
| 5-8   | Mar 5-8   | API + Exec   | #190 endpoints, #189 scaffolding       |
| 9-10  | Mar 9-10  | Managed Exec | #189 complete, cycles running          |
| 11-12 | Mar 11-12 | Integration  | Full flow testing, bug fixes           |
| 13-14 | Mar 13-14 | Launch       | Early access invites, monitoring       |

---

## Spec Consolidation Reference

| Spec                   | Cycle | Summary                                                | Incorporated Section          |
| ---------------------- | ----- | ------------------------------------------------------ | ----------------------------- |
| CLI Error Messages UX  | C1082 | Error format, codes, actionable messages               | All features (error handling) |
| Waitlist Activation    | C1077 | Email sequences, early access perks, conversion funnel | Feature 5 + Activation Plan   |
| Container Isolation    | C1085 | GKE/gVisor, resource limits, secrets                   | Feature 3 Architecture        |
| Managed Execution Impl | C1086 | K8s Jobs, Execution API, metering                      | Feature 3 Architecture        |

---

## Open Questions

1. **Cycle quota overage:** Block execution or allow overage at $0.10/cycle?
2. **Multi-repo timeline:** When do we support multiple repos per user?
3. **Enterprise pricing:** $99/mo final or needs market validation?
4. **API versioning:** `/v1/` prefix now or add later?

---

## Recommendations

### For CEO

- Confirm Feb 28 pre-sprint #200 deployment
- Finalize overage pricing decision

### For Engineering

- Start #181 Day 1, parallelize #190 API scaffolding
- Review C1086 K8s templates before Day 6

### For Design

- Dashboard wireframes needed by Day 3 for managed execution UI
- Billing page design (pricing table, checkout flow)

### For QA

- E2E test plan for full signup→subscribe→execute flow
- Security test for container isolation

### For Scrum

- Daily standups during Sprint 3 (10 roles, tight coordination)
- Blockers escalated within 2 cycles

---

_📦 Product | Cycle 1087 | Sprint 3 SaaS MVP Feature Spec_
_Supersedes: sprint-3-roadmap-c692.md (pre-pivot)_
