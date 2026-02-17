# Sprint 3 Implementation Architecture (C806)

> **Author:** 🌌 The Frontier (Head of Platform & Innovation)
> **Date:** 2026-02-17
> **Status:** SPECIFICATION
> **Related Issues:** #155 (SaaS Container), #181 (Auth), #182 (Billing), #189 (Managed Exec), #190 (API Gateway)

---

## Executive Summary

This document synthesizes the four SaaS specification documents into a unified implementation architecture for Sprint 3. It defines shared infrastructure, component dependencies, build sequence, and integration points to enable parallel Engineering execution.

**Goal:** Enable the team to build a complete SaaS offering where users can:

1. Sign up with GitHub OAuth
2. Subscribe to Pro/Enterprise plans via Stripe
3. Schedule managed ADA dispatch cycles
4. Access all functionality via REST API

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ADA SaaS Platform                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Web App   │  │  Dashboard  │  │   GitHub    │  │   Stripe    │ │
│  │  (Next.js)  │  │    (TBD)    │  │   Webhook   │  │   Webhook   │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │                │        │
│         └────────────────┴────────────────┴────────────────┘        │
│                                   │                                  │
│                          ┌───────▼───────┐                          │
│                          │  API Gateway  │                          │
│                          │  (REST API)   │                          │
│                          └───────┬───────┘                          │
│                                  │                                   │
│    ┌─────────────────────────────┼─────────────────────────────┐    │
│    │                             │                              │    │
│    ▼                             ▼                              ▼    │
│ ┌──────────┐              ┌──────────────┐              ┌──────────┐ │
│ │   Auth   │              │   Dispatch   │              │ Billing  │ │
│ │ Service  │              │   Service    │              │ Service  │ │
│ └────┬─────┘              └──────┬───────┘              └────┬─────┘ │
│      │                           │                           │       │
│      └───────────────────────────┼───────────────────────────┘       │
│                                  │                                   │
│                          ┌───────▼───────┐                          │
│                          │   Supabase    │                          │
│                          │  (Postgres)   │                          │
│                          └───────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Shared Infrastructure Components

### 2.1 Database Schema (Supabase/Postgres)

All services share a single Supabase instance with these core tables:

```sql
-- Core user table (Auth Service owns)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id BIGINT UNIQUE NOT NULL,
  github_username TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription/billing (Billing Service owns)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free', -- 'free' | 'pro' | 'enterprise'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'canceled' | 'past_due'
  current_period_end TIMESTAMPTZ,
  cycle_credits_used INT DEFAULT 0,
  cycle_credits_limit INT DEFAULT 100, -- Free tier default
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repository connections (Dispatch Service owns)
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  github_repo_id BIGINT NOT NULL,
  github_full_name TEXT NOT NULL, -- e.g., "owner/repo"
  installation_id BIGINT, -- GitHub App installation
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, github_repo_id)
);

-- Scheduled dispatch cycles (Dispatch Service owns)
CREATE TABLE scheduled_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  cron_expression TEXT NOT NULL, -- e.g., "*/15 * * * *"
  is_enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cycle execution history (Dispatch Service owns)
CREATE TABLE cycle_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_cycle_id UUID REFERENCES scheduled_cycles(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  cycle_number INT NOT NULL,
  role TEXT NOT NULL,
  action TEXT,
  outcome TEXT DEFAULT 'success', -- 'success' | 'partial' | 'blocked' | 'error'
  tokens_used INT DEFAULT 0,
  duration_ms INT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys (Auth Service owns, API Gateway uses)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL, -- SHA-256 hash of the actual key
  key_prefix TEXT NOT NULL, -- First 8 chars for identification
  name TEXT,
  scopes TEXT[] DEFAULT ARRAY['read'],
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage metering for billing (Billing Service owns)
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'cycle_run' | 'api_call' | 'token_usage'
  quantity INT NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_repositories_user_id ON repositories(user_id);
CREATE INDEX idx_scheduled_cycles_next_run ON scheduled_cycles(next_run_at) WHERE is_enabled = true;
CREATE INDEX idx_cycle_history_repository_id ON cycle_history(repository_id);
CREATE INDEX idx_cycle_history_created_at ON cycle_history(created_at);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_usage_events_user_id_created ON usage_events(user_id, created_at);
```

### 2.2 Shared TypeScript Types

Create `packages/core/src/saas/types.ts`:

```typescript
// User & Auth
export interface User {
  id: string;
  githubId: number;
  githubUsername: string;
  email?: string;
  avatarUrl?: string;
  createdAt: Date;
}

export interface Session {
  user: User;
  accessToken: string;
  expiresAt: Date;
}

// Billing
export type Plan = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due';

export interface Subscription {
  id: string;
  userId: string;
  plan: Plan;
  status: SubscriptionStatus;
  cycleCreditsUsed: number;
  cycleCreditsLimit: number;
  currentPeriodEnd?: Date;
}

export interface PlanLimits {
  cyclesPerMonth: number;
  repositories: number;
  teamMembers: number;
  apiRateLimit: number; // requests per minute
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    cyclesPerMonth: 100,
    repositories: 1,
    teamMembers: 1,
    apiRateLimit: 60,
  },
  pro: {
    cyclesPerMonth: 1000,
    repositories: 10,
    teamMembers: 5,
    apiRateLimit: 300,
  },
  enterprise: {
    cyclesPerMonth: 10000,
    repositories: 50,
    teamMembers: 25,
    apiRateLimit: 1000,
  },
};

// Dispatch
export interface Repository {
  id: string;
  userId: string;
  githubRepoId: number;
  githubFullName: string;
  installationId?: number;
  isActive: boolean;
  config: RepositoryConfig;
}

export interface RepositoryConfig {
  agentsPath?: string; // default: 'agents/'
  autoDispatch?: boolean;
  dispatchModel?: string;
}

export interface ScheduledCycle {
  id: string;
  repositoryId: string;
  cronExpression: string;
  isEnabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  config: ScheduleConfig;
}

export interface ScheduleConfig {
  timezone?: string;
  maxConcurrent?: number;
  retryOnFailure?: boolean;
}

export interface CycleExecution {
  id: string;
  scheduledCycleId?: string;
  repositoryId: string;
  userId: string;
  cycleNumber: number;
  role: string;
  action?: string;
  outcome: 'success' | 'partial' | 'blocked' | 'error';
  tokensUsed: number;
  durationMs: number;
  errorMessage?: string;
  createdAt: Date;
}

// API
export interface ApiKey {
  id: string;
  userId: string;
  keyPrefix: string;
  name?: string;
  scopes: string[];
  lastUsedAt?: Date;
  expiresAt?: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    rateLimit?: {
      remaining: number;
      reset: number;
    };
  };
}
```

### 2.3 Shared Utilities

Create `packages/core/src/saas/utils.ts`:

```typescript
import { createHash, randomBytes } from 'crypto';

// API key generation and verification
export function generateApiKey(): {
  key: string;
  hash: string;
  prefix: string;
} {
  const key = `ada_${randomBytes(32).toString('base64url')}`;
  const hash = createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 12);
  return { key, hash, prefix };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// Rate limiting helpers
export function getRateLimitKey(userId: string, endpoint: string): string {
  return `ratelimit:${userId}:${endpoint}`;
}

// Usage tracking helpers
export function calculateCycleCost(tokensUsed: number): number {
  // 1 cycle credit per 1000 tokens (rounded up)
  return Math.ceil(tokensUsed / 1000);
}
```

---

## 3. Service Implementation Details

### 3.1 Auth Service

**Location:** `apps/web/src/lib/auth/` (or `packages/core/src/saas/auth/`)

**Dependencies:**

- `@supabase/supabase-js` - Database client
- GitHub OAuth credentials (env vars)

**Key Files:**

```
auth/
├── github-oauth.ts      # OAuth flow implementation
├── session.ts           # Session management (JWT or Supabase Auth)
├── api-keys.ts          # API key CRUD operations
├── middleware.ts        # Auth middleware for API routes
└── types.ts             # Auth-specific types
```

**Implementation Sequence:**

1. Set up Supabase Auth with GitHub provider
2. Implement OAuth callback handler
3. Create session middleware
4. Implement API key generation/validation

### 3.2 Billing Service

**Location:** `apps/web/src/lib/billing/` (or `packages/core/src/saas/billing/`)

**Dependencies:**

- `stripe` - Stripe SDK
- Stripe webhook signing secret (env var)

**Key Files:**

```
billing/
├── stripe-client.ts     # Stripe SDK wrapper
├── subscriptions.ts     # Subscription CRUD
├── webhooks.ts          # Stripe webhook handlers
├── usage.ts             # Usage metering
├── checkout.ts          # Checkout session creation
└── types.ts             # Billing-specific types
```

**Implementation Sequence:**

1. Set up Stripe account and products/prices
2. Implement checkout session creation
3. Implement webhook handlers (subscription events)
4. Implement usage tracking
5. Implement plan limit enforcement

### 3.3 Dispatch Service

**Location:** `packages/core/src/saas/dispatch/` (existing dispatch code extended)

**Dependencies:**

- `@octokit/rest` - GitHub API client
- `node-cron` or `bullmq` - Job scheduling
- OpenClaw (for execution environment)

**Key Files:**

```
dispatch/
├── scheduler.ts         # Cron job management
├── executor.ts          # Cycle execution logic
├── github-app.ts        # GitHub App integration
├── queue.ts             # Job queue (BullMQ/Redis)
└── types.ts             # Dispatch-specific types
```

**Implementation Sequence:**

1. Extend existing dispatch with user context
2. Implement GitHub App authentication
3. Implement job scheduling
4. Implement execution with usage tracking
5. Implement status reporting

### 3.4 API Gateway

**Location:** `apps/web/src/app/api/v1/` (Next.js API routes)

**Dependencies:**

- All three services above
- Rate limiting (Redis or in-memory)

**Key Routes:**

```
/api/v1/
├── auth/
│   ├── login/           # Initiate OAuth
│   ├── callback/        # OAuth callback
│   ├── logout/          # Session termination
│   └── keys/            # API key management
├── billing/
│   ├── subscription/    # Subscription status
│   ├── checkout/        # Create checkout session
│   ├── portal/          # Customer portal link
│   └── usage/           # Usage statistics
├── dispatch/
│   ├── cycles/          # CRUD for scheduled cycles
│   ├── execute/         # Trigger immediate cycle
│   ├── history/         # Cycle execution history
│   └── status/          # Current dispatch status
├── repositories/        # Repository management
├── team/                # Team management (Enterprise)
└── webhooks/
    ├── github/          # GitHub webhooks
    └── stripe/          # Stripe webhooks
```

---

## 4. Build Sequence

### Phase 1: Foundation (Week 1)

**Parallel tracks:**

| Track A (Auth)     | Track B (Database)        |
| ------------------ | ------------------------- |
| GitHub OAuth setup | Supabase schema migration |
| Session middleware | Shared types package      |
| Login/logout flows | Test data seeders         |

**Exit Criteria:**

- [ ] Users can sign in with GitHub
- [ ] Sessions persist correctly
- [ ] Database schema deployed

### Phase 2: Billing (Week 2)

**Parallel tracks:**

| Track A (Stripe)   | Track B (UI)     |
| ------------------ | ---------------- |
| Stripe integration | Pricing page     |
| Webhook handlers   | Checkout flow    |
| Usage metering     | Account settings |

**Exit Criteria:**

- [ ] Users can subscribe to Pro plan
- [ ] Subscription status reflected in app
- [ ] Usage limits enforced

### Phase 3: Dispatch (Weeks 3-4)

**Parallel tracks:**

| Track A (Backend)        | Track B (Frontend)      |
| ------------------------ | ----------------------- |
| Scheduler implementation | Repository connect flow |
| Execution engine         | Cycle configuration UI  |
| GitHub App integration   | Execution history view  |

**Exit Criteria:**

- [ ] Users can connect repositories
- [ ] Scheduled cycles execute correctly
- [ ] Execution history visible in dashboard

### Phase 4: API & Polish (Week 5)

**Parallel tracks:**

| Track A (API)   | Track B (Polish)     |
| --------------- | -------------------- |
| REST API routes | Error handling       |
| API key auth    | Rate limit messaging |
| Documentation   | Onboarding flow      |

**Exit Criteria:**

- [ ] Full REST API functional
- [ ] API documentation published
- [ ] End-to-end user flow tested

---

## 5. Integration Points

### 5.1 Auth → Billing

```typescript
// On successful login, ensure subscription record exists
async function onUserLogin(user: User): Promise<void> {
  const existing = await getSubscription(user.id);
  if (!existing) {
    await createSubscription({
      userId: user.id,
      plan: 'free',
      status: 'active',
      cycleCreditsLimit: PLAN_LIMITS.free.cyclesPerMonth,
    });
  }
}
```

### 5.2 Billing → Dispatch

```typescript
// Before executing a cycle, check credits
async function canExecuteCycle(userId: string): Promise<boolean> {
  const subscription = await getSubscription(userId);
  const limits = PLAN_LIMITS[subscription.plan];
  return subscription.cycleCreditsUsed < limits.cyclesPerMonth;
}

// After cycle completion, increment usage
async function recordCycleExecution(
  userId: string,
  tokensUsed: number
): Promise<void> {
  const credits = calculateCycleCost(tokensUsed);
  await incrementCycleCredits(userId, credits);
  await createUsageEvent(userId, 'cycle_run', credits);
}
```

### 5.3 API Gateway → All Services

```typescript
// Middleware chain for API routes
export const apiMiddleware = [
  rateLimitMiddleware, // Check rate limits
  authMiddleware, // Validate auth (session or API key)
  subscriptionMiddleware, // Load subscription for limit checks
  requestLoggingMiddleware, // Log for observability
];
```

---

## 6. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# GitHub OAuth (for user login)
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# GitHub App (for repo access)
GITHUB_APP_ID=xxx
GITHUB_APP_PRIVATE_KEY=xxx
GITHUB_APP_WEBHOOK_SECRET=xxx

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_PUBLISHABLE_KEY=pk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_ENTERPRISE=price_xxx

# OpenClaw (for cycle execution)
OPENCLAW_API_KEY=xxx
OPENCLAW_GATEWAY_URL=xxx

# Redis (for job queue & rate limiting)
REDIS_URL=redis://xxx

# App
NEXTAUTH_URL=https://app.ada-ai.dev
NEXTAUTH_SECRET=xxx
```

---

## 7. Security Considerations

### 7.1 API Key Security

- Keys stored as SHA-256 hashes only
- Keys displayed once at creation (client-side only)
- Key rotation without downtime
- Scope-based permissions

### 7.2 Webhook Verification

- GitHub: Verify `X-Hub-Signature-256` header
- Stripe: Verify signature with `stripe.webhooks.constructEvent()`

### 7.3 Rate Limiting

- Per-user rate limits based on plan
- Per-endpoint limits for expensive operations
- Sliding window algorithm for fairness

### 7.4 Data Isolation

- Row-level security (RLS) in Supabase
- User can only access their own data
- Enterprise teams: team-scoped access

---

## 8. Monitoring & Observability

### 8.1 Key Metrics

- **Auth:** Login success rate, session duration
- **Billing:** MRR, churn rate, conversion rate
- **Dispatch:** Cycles per day, success rate, avg duration
- **API:** Request volume, latency p50/p95/p99, error rate

### 8.2 Alerts

- Cycle failure rate > 5%
- API error rate > 1%
- Payment failure webhook received
- Rate limit exceeded (potential abuse)

---

## 9. Acceptance Criteria

### P0 (Must Have)

- [ ] GitHub OAuth login functional
- [ ] Free tier users can run 100 cycles/month
- [ ] Pro subscription via Stripe works end-to-end
- [ ] Scheduled dispatch cycles execute reliably
- [ ] REST API with API key auth functional
- [ ] Usage limits enforced correctly

### P1 (Should Have)

- [ ] Cycle history viewable in dashboard
- [ ] Email notifications for billing events
- [ ] API documentation with examples
- [ ] Error messages are actionable

### P2 (Nice to Have)

- [ ] Team workspaces (Enterprise)
- [ ] Custom rate limits for Enterprise
- [ ] Webhook notifications for cycle events

---

## 10. Open Questions

1. **Execution Environment:** Self-hosted OpenClaw per user, or shared multi-tenant environment?
   - **Recommendation:** Start with shared, isolate via containerization
2. **Queue Technology:** BullMQ (Redis) vs Supabase Edge Functions?
   - **Recommendation:** BullMQ for reliability and visibility
3. **Dashboard Framework:** Shadcn/ui vs custom?
   - **Recommendation:** Shadcn/ui for speed

---

_This architecture document will be updated as implementation progresses. All major decisions should be captured in Architecture Decisions section of memory bank._
