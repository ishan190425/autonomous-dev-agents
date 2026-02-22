# API Gateway Implementation Spec

> Frontier architecture specification for REST API Gateway (#190)
> **Author:** 🌌 Frontier (The Frontier) | **Cycle:** 1096
> **Translates:** C1087 Sprint 3 Feature Spec (Product) → Engineering Blueprint

---

## Executive Summary

This spec provides the implementation architecture for #190 (REST API Gateway), enabling programmatic access to ADA's managed execution platform. The API Gateway is Sprint 3's P1 deliverable (Days 5-8) and critical for external integrations, CLI cloud features, and Enterprise tier value.

**Core Decision:** Next.js App Router API routes on Vercel, with Supabase Auth JWT validation, Upstash rate limiting, and auto-generated OpenAPI documentation.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           API Gateway                                │
│                     (Next.js App Router)                             │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│ │   Auth      │  │ Rate Limit  │  │  Validate   │  │   Route     │ │
│ │  Middleware │─▶│  Middleware │─▶│  Middleware │─▶│  Handler    │ │
│ └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│       │                │                │                │          │
│       ▼                ▼                ▼                ▼          │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│ │ Supabase    │  │ Upstash     │  │ Zod         │  │ Business    │ │
│ │ Auth JWT    │  │ Redis       │  │ Schema      │  │ Logic       │ │
│ └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
        ┌───────────┐                   ┌───────────┐
        │ Supabase  │                   │ Execution │
        │ Database  │                   │ Service   │
        │ (Postgres)│                   │ (GKE)     │
        └───────────┘                   └───────────┘
```

---

## Architecture Decisions

### ADR-001: Next.js App Router for API

**Context:** Need to choose between Next.js API routes, standalone Express/Fastify, or serverless functions.

**Decision:** Use Next.js 14+ App Router with Route Handlers (`app/api/`).

**Rationale:**

1. **Unified deployment:** Same Vercel deployment as dashboard (apps/web)
2. **Zero cold start:** Vercel Edge Functions or Node.js runtime
3. **Type safety:** First-class TypeScript support
4. **Built-in middleware:** Composable middleware chain
5. **Monorepo integration:** Import `@ada-ai/core` directly

**Consequences:**

- API versioning via path segments (`/api/v1/`)
- Middleware defined per-route or global
- Easy migration to standalone service if scale requires

---

### ADR-002: JWT Authentication via Supabase

**Context:** Need to authenticate API requests consistently with dashboard auth.

**Decision:** Validate Supabase JWT tokens from `Authorization: Bearer <token>` header.

**Rationale:**

1. **Single auth source:** Same tokens used by dashboard
2. **Built-in refresh:** Supabase handles token rotation
3. **Row-level security:** Supabase RLS policies apply
4. **Session linking:** User context available in all routes

**Implementation:**

```typescript
// lib/auth.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export async function validateAuth(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'MISSING_TOKEN', user: null };
  }

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: 'INVALID_TOKEN', user: null };
  }

  return { error: null, user };
}
```

---

### ADR-003: Upstash for Rate Limiting

**Context:** Need per-user rate limiting that works on Edge/serverless.

**Decision:** Use Upstash Redis with `@upstash/ratelimit` sliding window.

**Rationale:**

1. **Serverless-native:** No persistent connections needed
2. **Edge-compatible:** Works on Vercel Edge Runtime
3. **Sliding window:** Smoother than fixed window
4. **Per-tier limits:** Easy to vary by subscription

**Implementation:**

```typescript
// lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Rate limits by tier
export const rateLimiters = {
  free: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10/min
    prefix: 'api:free:',
  }),
  pro: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100/min
    prefix: 'api:pro:',
  }),
  enterprise: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, '1 m'), // 1000/min
    prefix: 'api:enterprise:',
  }),
};

export async function checkRateLimit(
  userId: string,
  tier: 'free' | 'pro' | 'enterprise'
) {
  const limiter = rateLimiters[tier];
  const { success, limit, remaining, reset } = await limiter.limit(userId);

  return {
    allowed: success,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString(),
    },
  };
}
```

---

### ADR-004: Zod for Request Validation

**Context:** Need runtime validation of request bodies with TypeScript type inference.

**Decision:** Use Zod schemas with automatic OpenAPI generation.

**Rationale:**

1. **Type inference:** Schema → TypeScript type automatically
2. **OpenAPI generation:** `zod-to-openapi` for docs
3. **Error messages:** Detailed, actionable validation errors
4. **Composability:** Reuse schemas across endpoints

**Implementation:**

```typescript
// schemas/repos.ts
import { z } from 'zod';

export const RepoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  fullName: z.string(),
  owner: z.string(),
  isPrivate: z.boolean(),
  cycleInterval: z.enum(['15m', '30m', '1h', 'manual']).default('30m'),
  status: z.enum(['active', 'paused', 'disconnected']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateRepoInput = z.object({
  githubRepoId: z.number(),
  cycleInterval: z.enum(['15m', '30m', '1h', 'manual']).optional(),
});

export type Repo = z.infer<typeof RepoSchema>;
export type CreateRepoInput = z.infer<typeof CreateRepoInput>;
```

---

### ADR-005: API Versioning Strategy

**Context:** Need to version API for backwards compatibility.

**Decision:** URL path versioning with `/api/v1/` prefix from Day 1.

**Rationale:**

1. **Explicit:** Version visible in every request
2. **Cacheable:** CDN can cache per-version
3. **Routing:** Easy Next.js route grouping
4. **Industry standard:** GitHub, Stripe, etc. use path versioning

**Directory Structure:**

```
apps/web/
└── app/
    └── api/
        └── v1/
            ├── repos/
            │   ├── route.ts              # GET /api/v1/repos, POST /api/v1/repos
            │   └── [id]/
            │       ├── route.ts          # GET /api/v1/repos/:id
            │       └── cycles/
            │           ├── route.ts      # GET, POST /api/v1/repos/:id/cycles
            │           └── [cycleId]/
            │               └── route.ts  # GET /api/v1/repos/:id/cycles/:cycleId
            ├── account/
            │   └── route.ts              # GET /api/v1/account
            └── docs/
                └── route.ts              # GET /api/v1/docs (OpenAPI JSON)
```

---

## API Endpoints

### Core Resources

| Method | Endpoint                        | Description          | Auth | Rate Limit |
| ------ | ------------------------------- | -------------------- | ---- | ---------- |
| GET    | `/api/v1/repos`                 | List connected repos | ✓    | Tier-based |
| POST   | `/api/v1/repos`                 | Connect new repo     | ✓    | Tier-based |
| GET    | `/api/v1/repos/:id`             | Get repo details     | ✓    | Tier-based |
| DELETE | `/api/v1/repos/:id`             | Disconnect repo      | ✓    | Tier-based |
| PATCH  | `/api/v1/repos/:id`             | Update repo settings | ✓    | Tier-based |
| GET    | `/api/v1/repos/:id/cycles`      | List cycle history   | ✓    | Tier-based |
| POST   | `/api/v1/repos/:id/cycles`      | Trigger manual cycle | ✓    | Tier-based |
| GET    | `/api/v1/repos/:id/cycles/:cid` | Get cycle details    | ✓    | Tier-based |
| GET    | `/api/v1/account`               | Get account info     | ✓    | Tier-based |
| GET    | `/api/v1/account/usage`         | Get usage stats      | ✓    | Tier-based |

### Documentation Endpoints

| Method | Endpoint       | Description       | Auth |
| ------ | -------------- | ----------------- | ---- |
| GET    | `/api/v1/docs` | OpenAPI JSON spec | ✗    |
| GET    | `/api/docs`    | Swagger UI        | ✗    |

---

## Response Formats

### Success Response

```typescript
interface SuccessResponse<T> {
  data: T;
  meta?: {
    page?: number;
    perPage?: number;
    total?: number;
    hasMore?: boolean;
  };
}
```

**Example:**

```json
{
  "data": {
    "id": "uuid",
    "name": "my-repo",
    "status": "active"
  }
}
```

### Error Response

Per C1082 CLI Error Messages UX Spec, use consistent error format:

```typescript
interface ErrorResponse {
  error: {
    code: string; // Machine-readable (e.g., "RATE_LIMIT_EXCEEDED")
    message: string; // Human-readable description
    details?: unknown; // Additional context (validation errors, etc.)
    docs?: string; // Link to documentation
  };
}
```

**Example:**

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You've exceeded the rate limit for your tier. Upgrade to Pro for higher limits.",
    "details": {
      "limit": 10,
      "remaining": 0,
      "resetAt": "2026-03-01T12:00:00Z"
    },
    "docs": "https://ada.dev/docs/api/rate-limits"
  }
}
```

### Error Codes

| Code                  | HTTP | Description                          |
| --------------------- | ---- | ------------------------------------ |
| `UNAUTHORIZED`        | 401  | Missing or invalid token             |
| `FORBIDDEN`           | 403  | Valid token, insufficient permission |
| `NOT_FOUND`           | 404  | Resource doesn't exist               |
| `VALIDATION_ERROR`    | 400  | Invalid request body/params          |
| `RATE_LIMIT_EXCEEDED` | 429  | Too many requests                    |
| `QUOTA_EXCEEDED`      | 403  | Monthly cycle quota exhausted        |
| `REPO_NOT_CONNECTED`  | 400  | Repo not connected to account        |
| `CYCLE_IN_PROGRESS`   | 409  | Cycle already running for repo       |
| `INTERNAL_ERROR`      | 500  | Unexpected server error              |

---

## Middleware Chain

### Middleware Composition

```typescript
// middleware/chain.ts
import { NextRequest, NextResponse } from 'next/server';

type Middleware = (
  request: NextRequest,
  context: MiddlewareContext
) => Promise<NextResponse | void>;

interface MiddlewareContext {
  user?: User;
  subscription?: Subscription;
  repo?: Repo;
}

export function createMiddlewareChain(...middlewares: Middleware[]) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const context: MiddlewareContext = {};

    for (const middleware of middlewares) {
      const response = await middleware(request, context);
      if (response) return response; // Early return on error
    }

    return NextResponse.next();
  };
}
```

### Standard Chain

```typescript
// Applied to all /api/v1/* routes
const apiMiddleware = createMiddlewareChain(
  authMiddleware, // Validate JWT, populate context.user
  subscriptionMiddleware, // Fetch subscription, populate context.subscription
  rateLimitMiddleware // Check rate limit based on tier
  // Route handler executes after
);
```

---

## Database Schema

### Tables (Supabase/Postgres)

```sql
-- User repos (connected GitHub repositories)
CREATE TABLE repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  github_repo_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(512) NOT NULL,
  owner VARCHAR(255) NOT NULL,
  is_private BOOLEAN DEFAULT false,
  cycle_interval VARCHAR(10) DEFAULT '30m',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, github_repo_id)
);

-- Dispatch cycles
CREATE TABLE cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_number INT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  role VARCHAR(50),
  action TEXT,
  output JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Usage tracking
CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  cycles_used INT DEFAULT 0,
  cycles_limit INT NOT NULL,

  UNIQUE(user_id, period_start)
);

-- RLS Policies
ALTER TABLE repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own repos" ON repos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own repos" ON repos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own repos" ON repos
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own repos" ON repos
  FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for cycles and usage...
```

---

## OpenAPI Documentation

### Auto-generation with zod-to-openapi

```typescript
// lib/openapi.ts
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { RepoSchema, CreateRepoInput } from '@/schemas/repos';
import { CycleSchema, TriggerCycleInput } from '@/schemas/cycles';

const registry = new OpenAPIRegistry();

// Register schemas
registry.register('Repo', RepoSchema);
registry.register('Cycle', CycleSchema);

// Register paths
registry.registerPath({
  method: 'get',
  path: '/api/v1/repos',
  summary: 'List connected repositories',
  tags: ['Repos'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List of repositories',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(RepoSchema),
          }),
        },
      },
    },
  },
});

// Generate spec
const generator = new OpenApiGeneratorV3(registry.definitions);
export const openApiSpec = generator.generateDocument({
  openapi: '3.0.0',
  info: {
    title: 'ADA API',
    version: '1.0.0',
    description: 'Programmatic access to ADA managed execution platform',
  },
  servers: [
    { url: 'https://api.ada.dev', description: 'Production' },
    { url: 'http://localhost:3000', description: 'Development' },
  ],
  security: [{ bearerAuth: [] }],
});
```

### Swagger UI Integration

```typescript
// app/api/docs/page.tsx
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { openApiSpec } from '@/lib/openapi';

export default function ApiDocsPage() {
  return <SwaggerUI spec={openApiSpec} />;
}
```

---

## Implementation Roadmap

### Sprint 3 Day 5-8 Breakdown

| Day | Tasks                                       | Deliverables                  |
| --- | ------------------------------------------- | ----------------------------- |
| 5   | Setup App Router structure, auth middleware | Auth working, skeleton routes |
| 6   | Rate limiting, Zod schemas, error handling  | Middleware chain complete     |
| 7   | Repos + Cycles endpoints, Supabase queries  | Core CRUD functional          |
| 8   | OpenAPI generation, Swagger UI, testing     | Docs live, E2E tests passing  |

### Day 5: Foundation

1. Create `apps/web/app/api/v1/` directory structure
2. Implement auth middleware with Supabase JWT validation
3. Create error response helpers
4. Skeleton routes returning 501 Not Implemented

### Day 6: Middleware Layer

1. Integrate Upstash rate limiting
2. Create Zod schemas for all resources
3. Implement validation middleware
4. Set up subscription tier lookup

### Day 7: Business Logic

1. Implement `GET /repos` with pagination
2. Implement `POST /repos` (connect GitHub repo)
3. Implement `POST /repos/:id/cycles` (trigger cycle)
4. Implement `GET /repos/:id/cycles` (list history)

### Day 8: Documentation & Testing

1. Auto-generate OpenAPI spec
2. Deploy Swagger UI at `/api/docs`
3. Write E2E tests for all endpoints
4. Create Postman collection

---

## Security Considerations

### Authentication

- JWT tokens validated on every request
- Tokens have 1-hour expiry (Supabase default)
- Refresh tokens handled by client-side SDK

### Authorization

- Row-Level Security (RLS) enforces data isolation
- Users can only access their own repos/cycles
- Admin endpoints require elevated permissions

### Rate Limiting

- Per-user sliding window limits
- Rate limit headers in all responses
- 429 responses include `Retry-After` header

### Input Validation

- All inputs validated with Zod schemas
- No raw SQL queries (use Supabase client)
- Request size limits enforced

### Secrets

- Environment variables for all secrets
- Vercel encrypted env vars in production
- No secrets in logs or error messages

---

## Integration Points

### With CLI (`@ada-ai/cli`)

Future `ada cloud` commands will use this API:

```bash
ada cloud login     # Get/refresh API token
ada cloud repos     # List connected repos
ada cloud trigger   # Manually trigger cycle
ada cloud status    # Check cycle status
```

### With Execution Service (#189)

API triggers cycles by:

1. Validating user quota
2. Creating `cycles` record with `status: pending`
3. Publishing to Pub/Sub topic (per C1086)
4. GKE job picks up and executes

### With Dashboard

Dashboard uses same API endpoints:

- API is source of truth
- Dashboard adds real-time via WebSocket layer (v2)
- Same auth tokens work for both

---

## Open Questions (for Engineering)

1. **WebSocket support:** Add real-time cycle updates in Sprint 3 or defer to v2?
2. **API keys:** Separate API keys from session JWT for CI/CD use cases?
3. **Pagination style:** Cursor-based or offset-based for cycle history?
4. **Caching:** CDN caching for read endpoints with `Cache-Control`?

---

## Success Metrics

| Metric                | Target | Measurement         |
| --------------------- | ------ | ------------------- |
| API Latency (p50)     | <100ms | Vercel analytics    |
| API Latency (p99)     | <500ms | Vercel analytics    |
| Error Rate            | <0.1%  | Error tracking      |
| Rate Limit Violations | <5%    | Upstash dashboard   |
| OpenAPI Spec Coverage | 100%   | Schema completeness |

---

## References

- C1087 Sprint 3 SaaS MVP Feature Spec (Product)
- C1086 Managed Execution Implementation Spec (Frontier)
- C1082 CLI Error Messages UX Spec (Design)
- #190 GitHub Issue: REST API Gateway
- Next.js App Router: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Upstash Rate Limiting: https://github.com/upstash/ratelimit

---

_🌌 Frontier | Cycle 1096 | API Gateway Implementation Spec_
_Per R-017: SHIPPED tangible work — architecture spec translating Product requirements to Engineering blueprint_
