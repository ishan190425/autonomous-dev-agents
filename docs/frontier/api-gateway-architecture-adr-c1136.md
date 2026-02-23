# ADR: API Gateway Architecture (C1136)

> **Status:** Accepted  
> **Date:** 2026-02-22  
> **Author:** 🌌 Frontier (Cycle 1136)  
> **Related:** #190, #155, #181, #182, C1105 (Billing Spec), C1113 (Auth Spec), C1126 (Token Tracking)

---

## Context

Sprint 3 (Mar 1-14) implements the SaaS Container (#155) with three core systems:

1. **Authentication** (#181) — GitHub OAuth, session management
2. **Billing** (#182) — Stripe subscriptions, usage metering
3. **Managed Execution** (#189) — Cloud-based cycle scheduling

These systems need a unified API layer. Issue #190 specifies the REST API Gateway requirement. This ADR defines the architecture to integrate all Sprint 3 components into a cohesive API.

## Decision

Implement a **Next.js Route Handlers** API Gateway in `apps/web/app/api/` with:

- JWT-based authentication middleware
- Rate limiting per tier
- Usage tracking hooks for billing
- OpenAPI specification for documentation

### Why Next.js Route Handlers (Not Separate API Service)

| Option                        | Pros                                                      | Cons                                                     |
| ----------------------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| **Next.js Route Handlers** ✅ | Unified deployment, shared auth context, Vercel-optimized | Tightly coupled to web app                               |
| Separate Express/Fastify API  | Decoupled, language flexibility                           | Additional deployment, cold starts, auth sync complexity |
| Edge Functions                | Low latency, global                                       | Limited compute, no persistent connections               |

**Decision rationale:** Sprint 3 velocity. Single deployment on Vercel reduces operational complexity. Can extract to separate service in Sprint 4+ if scaling requires.

---

## Architecture

### 1. API Structure

```
apps/web/app/api/
├── v1/
│   ├── auth/
│   │   ├── github/
│   │   │   ├── route.ts          # GitHub OAuth callback
│   │   │   └── callback/route.ts
│   │   ├── session/route.ts      # Session info
│   │   └── logout/route.ts       # Session termination
│   │
│   ├── projects/
│   │   ├── route.ts              # GET (list), POST (create)
│   │   └── [projectId]/
│   │       ├── route.ts          # GET, PATCH, DELETE
│   │       ├── dispatch/route.ts # POST (trigger cycle)
│   │       ├── cycles/route.ts   # GET (history)
│   │       └── memory/route.ts   # GET (current bank)
│   │
│   ├── billing/
│   │   ├── subscription/route.ts # GET, POST (manage)
│   │   ├── usage/route.ts        # GET (current period)
│   │   ├── invoices/route.ts     # GET (history)
│   │   └── webhook/route.ts      # POST (Stripe webhooks)
│   │
│   └── health/route.ts           # GET (status check)
│
├── middleware.ts                  # Auth + rate limit middleware
└── lib/
    ├── auth.ts                    # JWT verification
    ├── rateLimit.ts               # Tier-based limiting
    └── usage.ts                   # Token tracking hooks
```

### 2. Authentication Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client     │────▶│  API Route   │────▶│  Auth Check  │
│  (Dashboard) │     │  Handler     │     │  Middleware  │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                           ┌─────────────────────┼─────────────────────┐
                           ▼                     ▼                     ▼
                    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
                    │   401        │     │   Extract    │     │   Check      │
                    │ Unauthorized │     │   JWT        │     │   Tier       │
                    └──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │   Rate       │
                                         │   Limit      │
                                         └──────────────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │   Execute    │
                                         │   Handler    │
                                         └──────────────┘
```

### 3. Middleware Implementation

```typescript
// apps/web/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import { trackAPICall } from '@/lib/usage';

const PUBLIC_ROUTES = [
  '/api/v1/auth/github',
  '/api/v1/auth/github/callback',
  '/api/v1/health',
  '/api/v1/billing/webhook', // Stripe webhook has its own auth
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Skip auth for public routes
  if (PUBLIC_ROUTES.some(route => path.startsWith(route))) {
    return NextResponse.next();
  }

  // Extract and verify JWT
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await verifyJWT(token);
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Check rate limit based on tier
  const { allowed, remaining, reset } = await checkRateLimit(
    user.id,
    user.tier
  );
  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', reset },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }

  // Track API usage for billing
  await trackAPICall(user.id, path, request.method);

  // Add user context to request
  const response = NextResponse.next();
  response.headers.set('X-User-ID', user.id);
  response.headers.set('X-User-Tier', user.tier);
  response.headers.set('X-RateLimit-Remaining', remaining.toString());

  return response;
}

export const config = {
  matcher: '/api/v1/:path*',
};
```

### 4. Rate Limiting by Tier

| Tier           | Requests/min | Cycles/day | Monthly Price |
| -------------- | ------------ | ---------- | ------------- |
| **Free**       | 60           | 10         | $0            |
| **Starter**    | 300          | 100        | $29           |
| **Pro**        | 1000         | 500        | $99           |
| **Enterprise** | Custom       | Custom     | Custom        |

**Implementation:**

```typescript
// apps/web/lib/rateLimit.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

const TIER_LIMITS: Record<string, number> = {
  free: 60,
  starter: 300,
  pro: 1000,
  enterprise: 10000, // Soft limit, actual is custom
};

export async function checkRateLimit(
  userId: string,
  tier: string
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const key = `ratelimit:${userId}`;
  const limit = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const window = 60; // 1 minute window

  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % window);

  const current = await redis.incr(`${key}:${windowStart}`);

  if (current === 1) {
    await redis.expire(`${key}:${windowStart}`, window * 2);
  }

  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
    reset: windowStart + window,
  };
}
```

### 5. Usage Tracking Integration

Per C1126 (Token Tracking Implementation Spec), usage tracking hooks into:

- Every API call (request count)
- Every dispatch execution (cycle count + token usage)
- Memory operations (storage usage)

```typescript
// apps/web/lib/usage.ts
import { prisma } from '@/lib/prisma';

export async function trackAPICall(
  userId: string,
  path: string,
  method: string
): Promise<void> {
  // Fire-and-forget for performance
  prisma.apiUsage
    .create({
      data: {
        userId,
        path,
        method,
        timestamp: new Date(),
      },
    })
    .catch(console.error);
}

export async function trackDispatchExecution(
  userId: string,
  projectId: string,
  cycle: number,
  tokens: { input: number; output: number; cost: number }
): Promise<void> {
  await prisma.dispatchUsage.create({
    data: {
      userId,
      projectId,
      cycle,
      inputTokens: tokens.input,
      outputTokens: tokens.output,
      cost: tokens.cost,
      timestamp: new Date(),
    },
  });

  // Update monthly aggregates for Stripe metered billing
  await updateMonthlyUsage(userId, tokens.cost);
}
```

### 6. OpenAPI Specification

Generate OpenAPI 3.0 spec for API documentation:

```yaml
openapi: 3.0.3
info:
  title: ADA Platform API
  version: 1.0.0
  description: REST API for ADA autonomous development platform

servers:
  - url: https://ada.dev/api/v1
    description: Production
  - url: http://localhost:3000/api/v1
    description: Local development

security:
  - bearerAuth: []

paths:
  /projects:
    get:
      summary: List projects
      tags: [Projects]
      responses:
        '200':
          description: List of projects
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Project'
    post:
      summary: Create project
      tags: [Projects]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProject'
      responses:
        '201':
          description: Project created

  /projects/{projectId}/dispatch:
    post:
      summary: Trigger dispatch cycle
      tags: [Dispatch]
      parameters:
        - name: projectId
          in: path
          required: true
          schema:
            type: string
      responses:
        '202':
          description: Dispatch queued
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DispatchResult'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Project:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        repoUrl:
          type: string
        currentCycle:
          type: integer
        status:
          type: string
          enum: [active, paused, archived]

    CreateProject:
      type: object
      required: [name, repoUrl]
      properties:
        name:
          type: string
        repoUrl:
          type: string

    DispatchResult:
      type: object
      properties:
        jobId:
          type: string
        cycle:
          type: integer
        status:
          type: string
          enum: [queued, running, completed, failed]
```

---

## Integration Points

### With Auth System (C1113)

```typescript
// JWT payload structure from Auth spec
interface JWTPayload {
  sub: string; // User ID
  email: string;
  tier: string; // free | starter | pro | enterprise
  githubId: string;
  iat: number;
  exp: number;
}
```

### With Billing System (C1105)

```typescript
// Stripe webhook handler
export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature')!;
  const body = await request.text();

  const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

  switch (event.type) {
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailure(event.data.object);
      break;
  }

  return NextResponse.json({ received: true });
}
```

### With Token Tracking (C1126)

```typescript
// Dispatch endpoint integrates token tracking
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const userId = request.headers.get('X-User-ID')!;
  const projectId = params.projectId;

  // Queue dispatch job
  const job = await queueDispatch(projectId);

  // Job completion handler tracks tokens
  job.on('complete', async result => {
    await trackDispatchExecution(userId, projectId, result.cycle, {
      input: result.tokens.input,
      output: result.tokens.output,
      cost: result.tokens.cost,
    });
  });

  return NextResponse.json(
    { jobId: job.id, status: 'queued' },
    { status: 202 }
  );
}
```

---

## Implementation Plan

### Sprint 3 Timeline

| Day    | Task                      | Owner       |
| ------ | ------------------------- | ----------- |
| Day 1  | Auth routes + middleware  | Engineering |
| Day 2  | Project CRUD routes       | Engineering |
| Day 3  | Rate limiting (Upstash)   | Engineering |
| Day 4  | Dispatch integration      | Engineering |
| Day 5  | Token tracking hooks      | Frontier    |
| Day 6  | Billing webhook routes    | Engineering |
| Day 7  | Usage tracking + metering | Engineering |
| Day 8  | OpenAPI generation        | Engineering |
| Day 9  | Integration testing       | QA          |
| Day 10 | Security audit            | Ops         |

### Dependencies

- **Upstash Redis** — Rate limiting (already have account)
- **Stripe SDK** — Billing webhooks
- **next-auth** or custom JWT — Auth tokens
- **Prisma** — Database access
- **Zod** — Request validation

---

## Risks & Mitigations

| Risk                  | Impact   | Mitigation                                        |
| --------------------- | -------- | ------------------------------------------------- |
| Rate limit bypass     | High     | Server-side enforcement only, no client trust     |
| JWT secret leak       | Critical | Rotate secrets, short expiry (1h), refresh tokens |
| Stripe webhook replay | Medium   | Idempotency keys, event deduplication             |
| Cold start latency    | Low      | Vercel Edge for auth middleware                   |

---

## Success Metrics

- **API latency:** p95 < 200ms for all endpoints
- **Rate limit accuracy:** < 1% false positives
- **Token tracking:** 100% of dispatch executions tracked
- **Uptime:** 99.9% availability

---

## References

- C1105 (Billing Spec) — Stripe subscription structure
- C1113 (Auth Spec) — GitHub OAuth flow, JWT structure
- C1126 (Token Tracking) — Usage metering implementation
- #155 (SaaS Container) — Overall Sprint 3 scope
- #190 (API Gateway Issue) — Original requirement

---

_Reviewed by: 🌌 Frontier | Cycle: 1136 | Per R-017: SHIPPED tangible ADR_
