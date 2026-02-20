# ⚙️ Sprint 3 Engineering Readiness Assessment

> **Author:** ⚙️ Engineering (The Builder) | **Cycle:** 960 | **Date:** 2026-02-21 10:33 EST
> **Sprint 3:** March 1-14, 2026
> **Goal:** SaaS Container Complete — Auth, Billing, Managed Execution, REST API

---

## Executive Summary

**STATUS: 🟢 ENGINEERING READY FOR SPRINT 3**

All specifications are complete. Implementation architecture defined. QA test strategy prepared. This document provides the Engineering perspective on readiness, identifies pre-sprint setup tasks, and establishes the Day 1 sprint checklist.

**Sprint 3 Engineering Scope:**

- **#181** GitHub OAuth Authentication (Day 1-2)
- **#190** REST API Gateway (Day 3-4)
- **#182** Stripe Billing Integration (Day 5-7 + Week 2)
- **#189** Managed Agent Execution (Week 2)
- **#120** Dashboard Core (Week 2)

---

## 1. Codebase Readiness Assessment

### 1.1 Package Structure

| Package         | Status           | Sprint 3 Changes   | Ready |
| --------------- | ---------------- | ------------------ | ----- |
| `packages/core` | ✅ 89% coverage  | New `saas/` module | ✅    |
| `packages/cli`  | ✅ 85% coverage  | Minimal changes    | ✅    |
| `apps/web`      | ⚠️ Scaffold only | Major new code     | 🟡    |

### 1.2 Existing Infrastructure

| Component              | Status | Notes                          |
| ---------------------- | ------ | ------------------------------ |
| TypeScript strict mode | ✅     | Enforced across all packages   |
| Vitest test framework  | ✅     | 2,990+ tests passing           |
| CI/CD (GitHub Actions) | ✅     | 5 consecutive green runs       |
| ESLint flat config     | ✅     | Fixed in CI cascade (C928-949) |
| npm workspaces         | ✅     | Cross-package imports verified |

### 1.3 New Code Locations

Based on [Implementation Architecture (C806)](/docs/frontier/sprint3-implementation-architecture-c806.md):

```
packages/core/src/saas/
├── types.ts              # Shared SaaS types (NEW)
├── utils.ts              # API key gen, rate limit helpers (NEW)
├── auth/
│   ├── github-oauth.ts   # OAuth flow (NEW)
│   ├── session.ts        # Session management (NEW)
│   ├── api-keys.ts       # API key CRUD (NEW)
│   └── middleware.ts     # Auth middleware (NEW)
├── billing/
│   ├── stripe-client.ts  # Stripe SDK wrapper (NEW)
│   ├── subscriptions.ts  # Subscription CRUD (NEW)
│   ├── webhooks.ts       # Webhook handlers (NEW)
│   ├── usage.ts          # Usage metering (NEW)
│   └── checkout.ts       # Checkout sessions (NEW)
└── dispatch/
    ├── scheduler.ts      # Cron management (NEW)
    ├── executor.ts       # Cycle execution (EXTEND existing)
    ├── queue.ts          # BullMQ job queue (NEW)
    └── github-app.ts     # GitHub App auth (NEW)

apps/web/
├── src/
│   ├── app/
│   │   ├── api/v1/       # REST API routes (NEW)
│   │   ├── auth/         # OAuth pages (NEW)
│   │   ├── dashboard/    # Dashboard pages (NEW)
│   │   └── billing/      # Billing pages (NEW)
│   ├── components/       # Shared UI components (NEW)
│   └── lib/              # Client-side utilities (NEW)
└── package.json          # Dependencies to add
```

---

## 2. Pre-Sprint Setup Tasks

### 2.1 Environment Configuration (Due: Feb 28)

| Task                              | Owner       | Status     | Priority |
| --------------------------------- | ----------- | ---------- | -------- |
| Supabase project setup (prod)     | Ops         | ⏳ Pending | CRITICAL |
| Database schema migration         | Engineering | ⏳ Pending | CRITICAL |
| GitHub OAuth App creation         | Engineering | ⏳ Pending | CRITICAL |
| GitHub App creation (repo access) | Engineering | ⏳ Pending | HIGH     |
| Stripe account setup (test mode)  | Engineering | ⏳ Pending | CRITICAL |
| Stripe products/prices config     | Engineering | ⏳ Pending | CRITICAL |
| Redis instance (BullMQ)           | Ops         | ⏳ Pending | HIGH     |
| Environment variables in CI       | Ops         | ⏳ Pending | CRITICAL |

### 2.2 Database Schema (Ready to Execute)

Schema defined in C806. Pre-sprint migration script:

```sql
-- Migration: sprint3_saas_schema.sql
-- Run against Supabase before Sprint 3 Day 1

-- Core tables
CREATE TABLE users (...);           -- Auth Service
CREATE TABLE subscriptions (...);   -- Billing Service
CREATE TABLE repositories (...);    -- Dispatch Service
CREATE TABLE scheduled_cycles (...);
CREATE TABLE cycle_history (...);
CREATE TABLE api_keys (...);
CREATE TABLE usage_events (...);

-- Indexes for performance
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
-- ... (full schema in C806)
```

**Action:** Create `apps/web/supabase/migrations/20260301_sprint3_schema.sql`

### 2.3 External Service Credentials

| Service      | Credentials Needed                                                     | Where to Store  |
| ------------ | ---------------------------------------------------------------------- | --------------- |
| GitHub OAuth | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`                             | Vercel env vars |
| GitHub App   | `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_WEBHOOK_SECRET` | Vercel env vars |
| Stripe       | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Vercel env vars |
| Supabase     | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`       | Vercel env vars |
| Redis        | `REDIS_URL`                                                            | Vercel env vars |

---

## 3. Dependency Audit

### 3.1 New Dependencies (Core)

```json
// packages/core/package.json additions
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "stripe": "^14.0.0",
    "@octokit/rest": "^20.0.0",
    "bullmq": "^5.0.0",
    "jose": "^5.2.0" // JWT handling
  }
}
```

### 3.2 New Dependencies (Web)

```json
// apps/web/package.json additions
{
  "dependencies": {
    "next": "^14.1.0",
    "react": "^18.2.0",
    "@supabase/auth-helpers-nextjs": "^0.9.0",
    "@tanstack/react-query": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-*": "...", // Shadcn components
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.312.0"
  }
}
```

### 3.3 Security Audit Pre-Check

```bash
# Run before Sprint 3 Day 1
npm audit --all-workspaces
```

Current status: ✅ No high/critical vulnerabilities (C951 cleared minimatch)

---

## 4. Technical Implementation Notes

### 4.1 Auth Implementation (#181)

**Approach:** Supabase Auth with GitHub provider (recommended in C806)

```typescript
// packages/core/src/saas/auth/github-oauth.ts
import { createClient } from '@supabase/supabase-js';

export async function initiateGitHubOAuth(redirectTo: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo },
  });
  return { data, error };
}
```

**Key decisions:**

- Use Supabase Auth (built-in GitHub provider) instead of raw OAuth
- JWTs issued by Supabase, validated in middleware
- API keys stored as SHA-256 hashes only

### 4.2 Billing Implementation (#182)

**Approach:** Stripe Customer Portal + Checkout Sessions

```typescript
// packages/core/src/saas/billing/checkout.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createCheckoutSession(userId: string, priceId: string) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: await getOrCreateStripeCustomer(userId),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/billing/cancel`,
  });
  return session;
}
```

**Webhook handling critical paths:**

- `checkout.session.completed` → create subscription record
- `customer.subscription.updated` → sync plan/status
- `invoice.payment_failed` → mark past_due, notify user

### 4.3 API Gateway Implementation (#190)

**Approach:** Next.js API Routes with middleware chain

```typescript
// apps/web/src/app/api/v1/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export async function authMiddleware(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate JWT or API key
  const user = await validateAuth(token);
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }

  // Attach user to request context
  req.headers.set('x-user-id', user.id);
  return NextResponse.next();
}
```

### 4.4 Managed Execution Implementation (#189)

**Approach:** BullMQ for job scheduling, Docker containers for isolation

```typescript
// packages/core/src/saas/dispatch/scheduler.ts
import { Queue, Worker } from 'bullmq';

const dispatchQueue = new Queue('dispatch', { connection: redis });

export async function scheduleDispatchCycle(
  repositoryId: string,
  cronExpression: string
) {
  await dispatchQueue.add(
    'dispatch-cycle',
    { repositoryId },
    { repeat: { pattern: cronExpression } }
  );
}

// Worker processes jobs
const worker = new Worker(
  'dispatch',
  async job => {
    const { repositoryId } = job.data;
    return await executeDispatchCycle(repositoryId);
  },
  { connection: redis }
);
```

---

## 5. Risk Assessment

| Risk                       | Impact | Probability | Mitigation                                                          |
| -------------------------- | ------ | ----------- | ------------------------------------------------------------------- |
| Supabase Auth edge cases   | HIGH   | MEDIUM      | Test with multiple GitHub account types (personal, org, enterprise) |
| Stripe webhook reliability | HIGH   | LOW         | Implement idempotent handlers, dead-letter queue                    |
| Container startup latency  | MEDIUM | MEDIUM      | Pre-warm containers, optimize image size                            |
| Redis connection failures  | HIGH   | LOW         | Connection pooling, graceful degradation                            |
| Cross-package type drift   | MEDIUM | MEDIUM      | Shared types in core, barrel exports                                |

---

## 6. Day 1 Sprint Checklist

### 6.1 Pre-Sprint Verification (Feb 28 EOD)

- [ ] Supabase project accessible, schema migrated
- [ ] GitHub OAuth App credentials in Vercel
- [ ] GitHub App created, webhook URL configured
- [ ] Stripe test mode active, products/prices created
- [ ] Redis instance accessible from Vercel
- [ ] All env vars set in Vercel project settings
- [ ] `npm install` succeeds with new dependencies
- [ ] CI passes with new package.json

### 6.2 Day 1 Tasks (Mar 1)

| Time  | Task                                     | Deliverable                  |
| ----- | ---------------------------------------- | ---------------------------- |
| 09:00 | Environment verification                 | All services accessible      |
| 10:00 | Create `packages/core/src/saas/types.ts` | Shared types committed       |
| 11:00 | Create auth module scaffold              | `auth/` directory structure  |
| 14:00 | Implement GitHub OAuth flow              | Login/logout working locally |
| 16:00 | Create API test fixtures                 | MSW handlers for GitHub      |
| EOD   | PR for auth foundation                   | Ready for review             |

---

## 7. Engineering Hours Estimate

Based on [Sprint 3 Execution Plan (C817)](/docs/product/specs/sprint3-execution-plan-c817.md):

| Feature          | Estimated Hours | Complexity | Notes                             |
| ---------------- | --------------- | ---------- | --------------------------------- |
| #181 Auth        | 12h             | Medium     | Supabase handles most complexity  |
| #190 API Gateway | 16h             | Medium     | Standard REST patterns            |
| #182 Billing     | 20h             | High       | Webhook handling is critical path |
| #189 Execution   | 24h             | High       | Container orchestration           |
| #120 Dashboard   | 16h             | Medium     | Shadcn UI speeds development      |
| **Total**        | **88h**         |            | ~44h/week across 2 weeks          |

**Parallelization:** Auth must complete Day 1-2. API Gateway and Billing can start Day 3 in parallel.

---

## 8. Integration Points Summary

```
Auth ─────────────────────────────────────────────┐
  │                                               │
  ├─► Billing (on login: ensure subscription)     │
  │                                               │
  ├─► API Gateway (JWT validation middleware)     │
  │                                               │
  └─► Dispatch (user context for cycle execution) │
                                                  │
Billing ──────────────────────────────────────────┤
  │                                               │
  └─► Dispatch (check credits before execution)   │
                                                  │
API Gateway ──────────────────────────────────────┤
  │                                               │
  └─► All Services (unified REST interface)       │
                                                  │
Dashboard ────────────────────────────────────────┘
  │
  └─► Consumes API Gateway endpoints
```

---

## 9. Acceptance Criteria

**AC-960-1:** All pre-sprint setup tasks have owners and due dates  
**AC-960-2:** New code locations are defined and documented  
**AC-960-3:** Dependency additions are specified with versions  
**AC-960-4:** Technical implementation approach documented for each feature  
**AC-960-5:** Day 1 checklist is actionable and time-boxed

---

## Summary

Engineering is **READY** for Sprint 3. Key preparations:

1. **Pre-sprint setup** identified — Supabase, Stripe, GitHub App, Redis
2. **Code structure** defined — new `saas/` module in core, full web app scaffold
3. **Dependencies** audited — no conflicts, security clear
4. **Implementation approach** documented per feature
5. **Day 1 checklist** actionable for immediate productivity

**Next Engineering cycle:** Address any pre-sprint blockers, begin environment setup.

---

_Document created C960. Engineering focal point for Sprint 3 technical readiness._
