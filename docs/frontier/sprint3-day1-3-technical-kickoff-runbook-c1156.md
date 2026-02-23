# Sprint 3 Day 1-3 Technical Kickoff Runbook (C1156)

> **Author:** 🌌 Frontier (Cycle 1156)
> **Date:** 2026-02-23
> **Status:** SPECIFICATION
> **Sprint Target:** Sprint 3 (Mar 1-14)
> **Related Issues:** #155 (SaaS Container), #181 (Auth), #182 (Billing), #189 (Managed Exec), #190 (API Gateway)
> **Related Specs:** C806 (Architecture), C1086 (Managed Exec), C1096 (API Gateway), C1113 (Auth), C1105 (Billing), C1136 (API Gateway ADR), C1146 (Env Vars), C1149 (Testing Infrastructure)

---

## Executive Summary

This runbook provides an hour-by-hour execution plan for Sprint 3 Days 1-3 (Mar 1-3, 2026). It synthesizes all existing Sprint 3 specifications into a single executable checklist, ensuring parallel role execution without coordination overhead.

**Goal:** By end of Day 3, we have:

- ✅ All environment variables configured
- ✅ Database schema migrated
- ✅ Auth system functional (GitHub OAuth working)
- ✅ Billing integration scaffolded
- ✅ E2E test infrastructure operational
- ✅ First authenticated API routes deployed

---

## Architecture Reference

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SPRINT 3 DAY 1-3 SCOPE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   DAY 1 (Mar 1): FOUNDATION                                         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  [Ops] Environment Setup    [Eng] DB Schema    [QA] Test Infra │ │
│   │       Vercel env vars         Migration          Playwright    │ │
│   │       GitHub OAuth App        Supabase setup     Auth fixtures │ │
│   │       Stripe test keys        Core tables        Test accounts │ │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│   DAY 2 (Mar 2): AUTH FOUNDATION                                    │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  [Eng] Auth Implementation    [Ops] CI Auth       [QA] Auth E2E │
│   │       NextAuth.js setup        Test project        OAuth flow   │ │
│   │       GitHub provider          Secrets mgmt        Session E2E  │ │
│   │       Session middleware       Preview deploy      Error cases  │ │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│   DAY 3 (Mar 3): BILLING SCAFFOLD                                   │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  [Eng] Stripe Integration    [Ops] Webhook CI    [QA] Billing E2E│
│   │       Customer creation        Stripe CLI          Checkout flow │
│   │       Subscription CRUD        Test mode verify    Webhook tests │
│   │       Usage tracking hooks     Price sync          Error states  │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Day 1 (Mar 1): Foundation Layer

### Hour 0-2: Environment Setup (Ops Lead)

**Reference:** [Env Vars Master Reference (C1146)](sprint3-environment-variables-reference-c1146.md)

| Step | Action                                | Owner | Verification                     |
| ---- | ------------------------------------- | ----- | -------------------------------- |
| 1.1  | Create GitHub OAuth App               | Ops   | `GITHUB_CLIENT_ID` obtained      |
| 1.2  | Create GitHub App (for installations) | Ops   | `GITHUB_APP_ID`, private key PEM |
| 1.3  | Generate `NEXTAUTH_SECRET`            | Ops   | 32+ char random string           |
| 1.4  | Create Stripe test mode account       | Ops   | Test API keys obtained           |
| 1.5  | Verify Supabase project exists        | Ops   | Connection strings work          |
| 1.6  | Set ALL Vercel environment variables  | Ops   | `vercel env ls` shows all        |
| 1.7  | Document secrets in 1Password/vault   | Ops   | Team access confirmed            |

**Verification Command:**

```bash
# After Vercel deploy, verify env vars loaded
curl -s https://preview-xxx.vercel.app/api/health | jq .env_check
# Expected: { "auth": true, "db": true, "stripe": true }
```

### Hour 2-4: Database Schema (Engineering Lead)

**Reference:** [Sprint 3 Implementation Architecture (C806)](sprint3-implementation-architecture-c806.md), Section 2.1

| Step | Action                                | Owner | Verification                     |
| ---- | ------------------------------------- | ----- | -------------------------------- |
| 2.1  | Create Prisma schema with core tables | Eng   | `npx prisma validate` passes     |
| 2.2  | Run initial migration                 | Eng   | `npx prisma migrate dev` success |
| 2.3  | Verify Supabase tables via Studio     | Eng   | Tables visible in dashboard      |
| 2.4  | Create seed script for dev data       | Eng   | `npm run db:seed` works          |
| 2.5  | Document connection pooling config    | Eng   | Pooler vs direct URLs documented |

**Core Tables (Day 1):**

```sql
-- Required by end of Day 1
users              -- Core user table (GitHub ID, email, avatar)
subscriptions      -- Billing state (plan, credits, period)
sessions           -- NextAuth session management
accounts           -- NextAuth OAuth accounts
```

**Verification Command:**

```bash
# Verify tables exist
npx prisma db pull
# Expected: Schema matches migration
```

### Hour 4-6: Test Infrastructure (QA Lead)

**Reference:** [Sprint 3 Testing Infrastructure Spec (C1149)](../qa/sprint3-testing-infrastructure-spec-c1149.md)

| Step | Action                                       | Owner | Verification                   |
| ---- | -------------------------------------------- | ----- | ------------------------------ |
| 3.1  | Create GitHub test OAuth App (separate)      | QA    | Test app credentials           |
| 3.2  | Create test user accounts (3 tiers)          | QA    | free/pro/enterprise test users |
| 3.3  | Set up `auth.setup.ts` Playwright fixture    | QA    | Auth fixtures load             |
| 3.4  | Configure CI test matrix (fast/auth/billing) | QA    | CI workflow updated            |
| 3.5  | Verify session mock fixtures (PR #249)       | QA    | Mocked auth tests pass         |

**Test Accounts:**

```typescript
// apps/web/tests/fixtures/test-users.ts
export const testUsers = {
  free: { email: 'test-free@ada.dev', plan: 'free' },
  pro: { email: 'test-pro@ada.dev', plan: 'pro' },
  enterprise: { email: 'test-enterprise@ada.dev', plan: 'enterprise' },
};
```

### Day 1 Exit Criteria

| Criteria                     | How to Verify                                                |
| ---------------------------- | ------------------------------------------------------------ |
| All env vars set in Vercel   | `vercel env ls` shows 26+ variables                          |
| DB tables created            | Prisma Studio shows users, subscriptions, sessions, accounts |
| GitHub OAuth App ready       | Client ID/Secret in Vercel                                   |
| GitHub App ready             | App ID + private key in Vercel                               |
| Stripe test mode ready       | Test API keys in Vercel                                      |
| Test users created           | 3 GitHub test accounts with different plans                  |
| Session mock fixtures merged | PR #249 in main                                              |
| CI pipeline green            | All checks pass                                              |

---

## Day 2 (Mar 2): Auth Foundation

### Hour 0-3: NextAuth.js Implementation (Engineering Lead)

**Reference:** [Auth System Spec (C1113)](../product/sprint-3-auth-spec-c1113.md) — _assumed path_

| Step | Action                                                | Owner | Verification                                 |
| ---- | ----------------------------------------------------- | ----- | -------------------------------------------- |
| 4.1  | Install NextAuth.js dependencies                      | Eng   | `npm install next-auth @auth/prisma-adapter` |
| 4.2  | Create `apps/web/app/api/auth/[...nextauth]/route.ts` | Eng   | Route handler exists                         |
| 4.3  | Configure GitHub OAuth provider                       | Eng   | `providers: [GitHub({ ... })]`               |
| 4.4  | Set up Prisma adapter                                 | Eng   | Session persistence works                    |
| 4.5  | Create session middleware                             | Eng   | `getServerSession()` works                   |
| 4.6  | Create `/api/v1/auth/session` route                   | Eng   | Returns current user                         |
| 4.7  | Create `/api/v1/auth/logout` route                    | Eng   | Clears session                               |

**Implementation Pattern:**

```typescript
// apps/web/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      session.user.id = user.id;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
```

### Hour 3-5: Auth E2E Tests (QA Lead)

**Reference:** [Testing Infrastructure Spec (C1149)](../qa/sprint3-testing-infrastructure-spec-c1149.md)

| Step | Action                                       | Owner | Verification                  |
| ---- | -------------------------------------------- | ----- | ----------------------------- |
| 5.1  | Create `auth-flow.spec.ts`                   | QA    | OAuth redirect flow tested    |
| 5.2  | Create `session-management.spec.ts`          | QA    | Session create/read/destroy   |
| 5.3  | Create `protected-routes.spec.ts`            | QA    | 401 on unauthenticated access |
| 5.4  | Add auth tests to CI (authenticated project) | QA    | `npm run test:e2e:auth` in CI |

**Test Coverage:**

```typescript
// apps/web/tests/e2e/auth-flow.spec.ts
test('redirects to GitHub OAuth', async ({ page }) => {
  await page.goto('/login');
  await page.click('button:has-text("Sign in with GitHub")');
  await expect(page).toHaveURL(/github.com\/login\/oauth/);
});

test('creates session after OAuth callback', async ({ page, context }) => {
  // Use auth setup fixture for authenticated context
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
});
```

### Hour 5-6: CI Auth Pipeline (Ops Lead)

| Step | Action                                | Owner | Verification                   |
| ---- | ------------------------------------- | ----- | ------------------------------ |
| 6.1  | Add auth test project to CI matrix    | Ops   | `authenticated` project in CI  |
| 6.2  | Set test OAuth credentials as secrets | Ops   | GitHub Actions secrets set     |
| 6.3  | Configure preview deployment auth     | Ops   | Preview deploys have test auth |

### Day 2 Exit Criteria

| Criteria                            | How to Verify                                     |
| ----------------------------------- | ------------------------------------------------- |
| GitHub OAuth flow works             | Manual test: click login → GitHub → redirect back |
| Session persists in DB              | Check Prisma Studio: sessions table has entry     |
| `/api/v1/auth/session` returns user | `curl /api/v1/auth/session` with cookie           |
| Logout clears session               | Session removed from DB                           |
| Auth E2E tests pass                 | `npm run test:e2e:auth` green                     |
| CI includes auth tests              | CI workflow shows authenticated job               |

---

## Day 3 (Mar 3): Billing Scaffold

### Hour 0-3: Stripe Integration (Engineering Lead)

**Reference:** [Billing Integration Spec (C1105)](../product/sprint-3-billing-spec-c1105.md) — _assumed path_

| Step | Action                                      | Owner | Verification                                                 |
| ---- | ------------------------------------------- | ----- | ------------------------------------------------------------ |
| 7.1  | Install Stripe SDK                          | Eng   | `npm install stripe`                                         |
| 7.2  | Create Stripe client singleton              | Eng   | `lib/stripe.ts`                                              |
| 7.3  | Create customer on first login              | Eng   | Stripe customer created                                      |
| 7.4  | Create `/api/v1/billing/subscription` route | Eng   | GET returns plan                                             |
| 7.5  | Create Checkout Session endpoint            | Eng   | Redirects to Stripe Checkout                                 |
| 7.6  | Create webhook handler                      | Eng   | `/api/v1/billing/webhook`                                    |
| 7.7  | Set up usage tracking hooks                 | Eng   | Per [C1126](llm-token-tracking-implementation-spec-c1126.md) |

**Implementation Pattern:**

```typescript
// apps/web/lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// apps/web/app/api/v1/billing/subscription/route.ts
export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    plan: subscription?.plan ?? 'free',
    credits: subscription?.cycleCreditsUsed ?? 0,
    limit: subscription?.cycleCreditsLimit ?? 100,
  });
}
```

### Hour 3-5: Webhook & CLI Testing (Ops Lead)

| Step | Action                              | Owner | Verification                                                       |
| ---- | ----------------------------------- | ----- | ------------------------------------------------------------------ |
| 8.1  | Install Stripe CLI                  | Ops   | `stripe --version`                                                 |
| 8.2  | Configure webhook forwarding        | Ops   | `stripe listen --forward-to localhost:3000/api/v1/billing/webhook` |
| 8.3  | Test checkout flow manually         | Ops   | Test card `4242...` works                                          |
| 8.4  | Verify webhook signature validation | Ops   | Invalid signatures rejected                                        |
| 8.5  | Document test card numbers          | Ops   | Cheat sheet in docs                                                |

**Stripe CLI Commands:**

```bash
# Listen for webhooks locally
stripe listen --forward-to localhost:3000/api/v1/billing/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

### Hour 5-6: Billing E2E Tests (QA Lead)

| Step | Action                                | Owner | Verification               |
| ---- | ------------------------------------- | ----- | -------------------------- |
| 9.1  | Create `billing-checkout.spec.ts`     | QA    | Checkout redirect works    |
| 9.2  | Create `subscription-display.spec.ts` | QA    | Plan shows correctly       |
| 9.3  | Create `webhook-handling.spec.ts`     | QA    | Events update DB           |
| 9.4  | Add billing tests to CI               | QA    | `npm run test:e2e:billing` |

### Day 3 Exit Criteria

| Criteria                             | How to Verify                             |
| ------------------------------------ | ----------------------------------------- |
| Stripe customer created on signup    | Check Stripe dashboard for test customers |
| `/api/v1/billing/subscription` works | Returns plan, credits, limit              |
| Checkout Session redirects to Stripe | Test card flow completes                  |
| Webhooks update subscription status  | DB reflects Stripe state                  |
| Billing E2E tests pass               | `npm run test:e2e:billing` green          |

---

## Dependency Graph

```
DAY 1 FOUNDATION
═══════════════════════════════════════════════════════════════════════
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│  [1.1-1.7]        │     │  [2.1-2.5]        │     │  [3.1-3.5]        │
│  ENV SETUP        │────▶│  DB SCHEMA        │────▶│  TEST INFRA       │
│  (Ops)            │     │  (Engineering)    │     │  (QA)             │
└───────────────────┘     └───────────────────┘     └───────────────────┘
        │                         │                         │
        │                         │                         │
        ▼                         ▼                         ▼
═══════════════════════════════════════════════════════════════════════
DAY 2 AUTH FOUNDATION
═══════════════════════════════════════════════════════════════════════
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│  [4.1-4.7]        │     │  [5.1-5.4]        │     │  [6.1-6.3]        │
│  NEXTAUTH         │────▶│  AUTH E2E         │────▶│  CI AUTH          │
│  (Engineering)    │     │  (QA)             │     │  (Ops)            │
└───────────────────┘     └───────────────────┘     └───────────────────┘
        │                         │                         │
        │                         │                         │
        ▼                         ▼                         ▼
═══════════════════════════════════════════════════════════════════════
DAY 3 BILLING SCAFFOLD
═══════════════════════════════════════════════════════════════════════
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│  [7.1-7.7]        │     │  [8.1-8.5]        │     │  [9.1-9.4]        │
│  STRIPE SDK       │────▶│  WEBHOOK TEST     │────▶│  BILLING E2E      │
│  (Engineering)    │     │  (Ops)            │     │  (QA)             │
└───────────────────┘     └───────────────────┘     └───────────────────┘
```

---

## Parallel Execution Matrix

This table shows what each role can work on simultaneously:

| Hour      | Ops              | Engineering        | QA                    |
| --------- | ---------------- | ------------------ | --------------------- |
| **Day 1** |                  |                    |                       |
| 0-2       | Env vars setup   | —                  | —                     |
| 2-4       | Document secrets | DB schema          | —                     |
| 4-6       | Verify CI        | Seed scripts       | Test infra setup      |
| **Day 2** |                  |                    |                       |
| 0-2       | —                | NextAuth core      | Prepare auth fixtures |
| 2-4       | —                | Session middleware | —                     |
| 4-6       | CI auth pipeline | API routes         | Auth E2E tests        |
| **Day 3** |                  |                    |                       |
| 0-2       | —                | Stripe SDK         | —                     |
| 2-4       | Stripe CLI setup | Webhooks           | —                     |
| 4-6       | Webhook testing  | Usage hooks        | Billing E2E tests     |

---

## Risk Mitigation

| Risk                            | Impact        | Mitigation                                |
| ------------------------------- | ------------- | ----------------------------------------- |
| GitHub OAuth App approval delay | Day 1 blocked | Use existing test OAuth app from waitlist |
| Supabase connection issues      | Day 1 blocked | Have backup local Postgres Docker         |
| Stripe test mode rate limits    | Day 3 slowed  | Use Stripe CLI local forwarding           |
| NextAuth breaking changes       | Day 2 blocked | Pin to `next-auth@4.24.5` (tested)        |
| E2E tests flaky                 | CI unreliable | Use retry + trace artifacts               |

---

## Communication Checkpoints

| Time      | Channel      | Content                                |
| --------- | ------------ | -------------------------------------- |
| Day 1 EOD | Memory bank  | Foundation status, blockers            |
| Day 2 EOD | Memory bank  | Auth status, E2E results               |
| Day 3 EOD | Memory bank  | Billing status, Sprint 3 Day 1-3 retro |
| Blockers  | GitHub issue | Immediately file blocker issues        |

---

## Success Metrics

| Metric           | Target                      |
| ---------------- | --------------------------- |
| Day 1 completion | 100% foundation tasks green |
| Day 2 completion | OAuth flow working E2E      |
| Day 3 completion | Stripe checkout working E2E |
| E2E test count   | +15 auth/billing tests      |
| CI pipeline      | All 3 test projects green   |
| Blockers         | 0 unresolved by EOD         |

---

## Post-Day 3 Roadmap

| Days  | Focus             | Deliverables                                                                |
| ----- | ----------------- | --------------------------------------------------------------------------- |
| 4-5   | API Gateway       | REST endpoints per [C1136](api-gateway-architecture-adr-c1136.md)           |
| 5-7   | Token Tracking    | Usage metering per [C1126](llm-token-tracking-implementation-spec-c1126.md) |
| 8-10  | Managed Execution | GKE scaffold per [C1086](managed-execution-implementation-spec-c1086.md)    |
| 11-14 | Integration       | Full flow testing, polish, docs                                             |

---

## References

| Document                                                                            | Cycle | Purpose              |
| ----------------------------------------------------------------------------------- | ----- | -------------------- |
| [Sprint 3 Implementation Architecture](sprint3-implementation-architecture-c806.md) | C806  | Overall architecture |
| [Environment Variables Reference](sprint3-environment-variables-reference-c1146.md) | C1146 | All env vars         |
| [API Gateway ADR](api-gateway-architecture-adr-c1136.md)                            | C1136 | API design decisions |
| [Testing Infrastructure Spec](../qa/sprint3-testing-infrastructure-spec-c1149.md)   | C1149 | E2E test setup       |
| [Token Tracking Spec](llm-token-tracking-implementation-spec-c1126.md)              | C1126 | Usage metering       |
| [Managed Execution Spec](managed-execution-implementation-spec-c1086.md)            | C1086 | Cloud execution      |

---

_This runbook synthesizes all Sprint 3 specs into an executable plan for Days 1-3. Follow steps in order, verify exit criteria, escalate blockers immediately._

— 🌌 Frontier (C1156)
