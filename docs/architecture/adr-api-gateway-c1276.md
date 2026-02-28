# ADR: API Gateway and REST API Architecture

> **Author:** 🌌 The Frontier (C1276)  
> **Date:** 2026-02-28  
> **Status:** Draft  
> **Related:** #190 (API Gateway), #181 (Auth), #189 (Managed Exec), #155 (SaaS Container)  
> **Supersedes:** None

---

## Context

Issue #190 requires a REST API for the web dashboard to enable:

1. Programmatic access to ADA features
2. External integrations via webhooks
3. Rate limiting per pricing tier (Free/Pro/Enterprise)
4. API authentication with token-based access
5. OpenAPI/Swagger documentation
6. Versioning strategy for API stability

This ADR synthesizes requirements from:

- `docs/architecture/core-api-spec.md` — Internal TypeScript API
- #181 (Auth) — GitHub OAuth integration
- #189 (Managed Exec) — Cloud-based cycle scheduling
- C1266 Trial Conversion ADR — User journey events

---

## Decision

Implement a **three-layer API Gateway architecture**:

1. **Gateway Layer** — Request routing, rate limiting, authentication
2. **API Layer** — Versioned REST endpoints (v1)
3. **Integration Layer** — Webhooks, event subscriptions, external notifications

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Rate Limiter │  │    Auth      │  │   Router     │          │
│  │  (by tier)   │  │  Middleware  │  │  (versioned) │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                        API v1 Layer                              │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│  /agents    │  /dispatch  │  /memory    │  /workspaces│ /billing│
│  CRUD ops   │  cycle exec │  read/write │  team mgmt  │ usage   │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Integration Layer                            │
├─────────────────┬─────────────────┬─────────────────────────────┤
│    Webhooks     │  Event Stream   │     External APIs           │
│  (HTTP POST)    │  (SSE/WebSocket)│   (GitHub, Slack, etc.)     │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

---

## API Design

### Base URL Structure

```
Production:  https://api.ada-ai.dev/v1
Staging:     https://api.staging.ada-ai.dev/v1
Local:       http://localhost:3001/api/v1
```

### Authentication

Two authentication methods:

1. **API Key** — For server-to-server integrations

   ```http
   Authorization: Bearer ada_sk_live_xxxxxxxxxxxx
   ```

2. **Session Token** — For dashboard (via GitHub OAuth, see #181)
   ```http
   Cookie: ada_session=xxxxxxxxxxxx
   ```

### Rate Limiting by Tier

| Tier       | Requests/min | Burst | Concurrent Cycles |
| ---------- | ------------ | ----- | ----------------- |
| Free       | 60           | 100   | 1                 |
| Pro        | 300          | 500   | 5                 |
| Enterprise | 1000         | 2000  | 25                |

Rate limit headers returned on all responses:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1709164800
```

---

## REST Endpoints (v1)

### Workspaces

```yaml
# List user's workspaces
GET /v1/workspaces
Response: { workspaces: Workspace[] }

# Get workspace details
GET /v1/workspaces/:workspaceId
Response: { workspace: Workspace, agents: AgentSummary[] }

# Create workspace
POST /v1/workspaces
Body: { name: string, repo?: string }
Response: { workspace: Workspace }

# Delete workspace
DELETE /v1/workspaces/:workspaceId
Response: { deleted: true }
```

### Agents (Teams)

```yaml
# List agents in workspace
GET /v1/workspaces/:workspaceId/agents
Response: { agents: Agent[] }

# Get agent details
GET /v1/workspaces/:workspaceId/agents/:agentId
Response: { agent: Agent, roster: Roster, state: RotationState }

# Create agent (initializes from template)
POST /v1/workspaces/:workspaceId/agents
Body: { name: string, template?: "default" | "minimal" | "custom", repo?: string }
Response: { agent: Agent }

# Update agent config
PATCH /v1/workspaces/:workspaceId/agents/:agentId
Body: { name?: string, config?: Partial<AdaConfig> }
Response: { agent: Agent }
```

### Dispatch (Cycle Execution)

```yaml
# Get current rotation state
GET /v1/workspaces/:workspaceId/agents/:agentId/dispatch/status
Response: { role: Role, cycle: number, nextRole: Role, queuedCycles: number }

# Trigger dispatch cycle (managed execution per #189)
POST /v1/workspaces/:workspaceId/agents/:agentId/dispatch/run
Body: { async?: boolean, executor?: "clawdbot" | "claude-code" }
Response: { execution: Execution }  # async: returns executionId
         | { result: DispatchResult }  # sync: waits for completion

# Get execution status
GET /v1/workspaces/:workspaceId/agents/:agentId/dispatch/executions/:executionId
Response: { execution: Execution, logs?: string[], result?: DispatchResult }

# List recent executions
GET /v1/workspaces/:workspaceId/agents/:agentId/dispatch/executions
Query: { limit?: number, status?: "pending" | "running" | "completed" | "failed" }
Response: { executions: Execution[] }

# Schedule recurring execution (per #189)
POST /v1/workspaces/:workspaceId/agents/:agentId/dispatch/schedule
Body: { cron: string, enabled?: boolean, executor?: string }
Response: { schedule: Schedule }

# Update/delete schedule
PATCH /v1/workspaces/:workspaceId/agents/:agentId/dispatch/schedule/:scheduleId
DELETE /v1/workspaces/:workspaceId/agents/:agentId/dispatch/schedule/:scheduleId
```

### Memory

```yaml
# Get memory bank (markdown)
GET /v1/workspaces/:workspaceId/agents/:agentId/memory/bank
Response: { content: string, version: number, lastUpdated: string }

# Update memory bank
PUT /v1/workspaces/:workspaceId/agents/:agentId/memory/bank
Body: { content: string }
Response: { version: number }

# Semantic search (uses embedding memory per core-api-spec v3.0)
POST /v1/workspaces/:workspaceId/agents/:agentId/memory/search
Body: { query: string, topK?: number, tiers?: ("hot" | "warm" | "cold")[] }
Response: { results: SearchResult[] }

# List memory entries (structured)
GET /v1/workspaces/:workspaceId/agents/:agentId/memory/entries
Query: { kind?: MemoryEntryKind, tier?: string, limit?: number }
Response: { entries: MemoryEntry[] }

# List archives
GET /v1/workspaces/:workspaceId/agents/:agentId/memory/archives
Response: { archives: Archive[] }

# Restore archive
POST /v1/workspaces/:workspaceId/agents/:agentId/memory/restore
Body: { archiveId: string }
Response: { version: number }
```

### Roster & Roles

```yaml
# Get roster
GET /v1/workspaces/:workspaceId/agents/:agentId/roster
Response: { roster: Roster }

# Update roster
PUT /v1/workspaces/:workspaceId/agents/:agentId/roster
Body: { roster: Roster }
Response: { roster: Roster }

# Get role details
GET /v1/workspaces/:workspaceId/agents/:agentId/roles/:roleId
Response: { role: Role, playbook: string }

# Update playbook
PUT /v1/workspaces/:workspaceId/agents/:agentId/roles/:roleId/playbook
Body: { content: string }
Response: { role: Role }
```

### Billing & Usage (integrates with C1186 usage metering)

```yaml
# Get usage stats
GET /v1/billing/usage
Query: { period?: "day" | "week" | "month", workspaceId?: string }
Response: { usage: UsageStats }

# Get current plan
GET /v1/billing/plan
Response: { plan: Plan, limits: Limits, usage: CurrentUsage }

# Create checkout session (Stripe)
POST /v1/billing/checkout
Body: { plan: "pro" | "enterprise", successUrl: string, cancelUrl: string }
Response: { sessionUrl: string }

# Manage subscription
POST /v1/billing/portal
Response: { portalUrl: string }  # Stripe customer portal
```

### Webhooks

```yaml
# List webhook subscriptions
GET /v1/webhooks
Response: { webhooks: Webhook[] }

# Create webhook
POST /v1/webhooks
Body: {
  url: string,
  events: WebhookEventType[],
  secret?: string,
  workspaceId?: string  # optional: filter to specific workspace
}
Response: { webhook: Webhook, secret: string }

# Update webhook
PATCH /v1/webhooks/:webhookId
Body: { url?: string, events?: WebhookEventType[], enabled?: boolean }
Response: { webhook: Webhook }

# Delete webhook
DELETE /v1/webhooks/:webhookId
Response: { deleted: true }

# Get webhook delivery history
GET /v1/webhooks/:webhookId/deliveries
Response: { deliveries: WebhookDelivery[] }

# Retry failed delivery
POST /v1/webhooks/:webhookId/deliveries/:deliveryId/retry
Response: { delivery: WebhookDelivery }
```

---

## TypeScript Interfaces

### Core Types

```typescript
// packages/core/src/api/types.ts

export interface Workspace {
  readonly id: string;
  readonly name: string;
  readonly ownerId: string;
  readonly repo?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Agent {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly config: AdaConfig;
  readonly status: 'active' | 'paused' | 'error';
  readonly lastCycle?: number;
  readonly lastRun?: string;
  readonly createdAt: string;
}

export interface Execution {
  readonly id: string;
  readonly agentId: string;
  readonly status: 'pending' | 'running' | 'completed' | 'failed';
  readonly role: RoleId;
  readonly cycle: number;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly result?: DispatchResult;
  readonly error?: string;
  readonly logs?: string[];
  readonly executor: 'clawdbot' | 'claude-code';
  readonly cost?: {
    readonly tokens: number;
    readonly usd: number;
  };
}

export interface Schedule {
  readonly id: string;
  readonly agentId: string;
  readonly cron: string;
  readonly enabled: boolean;
  readonly executor: string;
  readonly nextRun: string;
  readonly lastRun?: string;
  readonly createdAt: string;
}
```

### API Key Types

```typescript
// packages/core/src/api/auth.ts

export type ApiKeyPrefix = 'ada_sk_live_' | 'ada_sk_test_';

export interface ApiKey {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly prefix: ApiKeyPrefix;
  readonly lastFour: string; // Last 4 chars for display
  readonly scopes: ApiScope[];
  readonly rateLimit: RateLimitConfig;
  readonly createdAt: string;
  readonly lastUsedAt?: string;
  readonly expiresAt?: string;
}

export type ApiScope =
  | 'workspaces:read'
  | 'workspaces:write'
  | 'agents:read'
  | 'agents:write'
  | 'dispatch:read'
  | 'dispatch:execute'
  | 'memory:read'
  | 'memory:write'
  | 'billing:read'
  | 'webhooks:manage';

export interface RateLimitConfig {
  readonly requestsPerMinute: number;
  readonly burstLimit: number;
  readonly concurrentExecutions: number;
}
```

### Webhook Types

```typescript
// packages/core/src/api/webhooks.ts

export type WebhookEventType =
  | 'dispatch.started'
  | 'dispatch.completed'
  | 'dispatch.failed'
  | 'memory.updated'
  | 'memory.compressed'
  | 'role.changed'
  | 'agent.created'
  | 'agent.deleted'
  | 'workspace.created'
  | 'billing.usage_threshold'
  | 'billing.plan_changed';

export interface WebhookEvent {
  readonly id: string;
  readonly type: WebhookEventType;
  readonly timestamp: string;
  readonly data: Record<string, unknown>;
  readonly workspaceId?: string;
  readonly agentId?: string;
}

export interface Webhook {
  readonly id: string;
  readonly userId: string;
  readonly url: string;
  readonly events: WebhookEventType[];
  readonly workspaceId?: string;
  readonly enabled: boolean;
  readonly createdAt: string;
  readonly lastDeliveryAt?: string;
  readonly lastDeliveryStatus?: number;
}

export interface WebhookDelivery {
  readonly id: string;
  readonly webhookId: string;
  readonly event: WebhookEvent;
  readonly status: 'pending' | 'success' | 'failed';
  readonly statusCode?: number;
  readonly responseBody?: string;
  readonly attemptCount: number;
  readonly nextRetryAt?: string;
  readonly deliveredAt?: string;
}

// Webhook payload signature (HMAC-SHA256)
export interface WebhookSignature {
  readonly timestamp: number;
  readonly signature: string; // HMAC-SHA256 of `${timestamp}.${JSON.stringify(payload)}`
}
```

### Error Response Types

```typescript
// packages/core/src/api/errors.ts

export interface ApiError {
  readonly error: {
    readonly code: ApiErrorCode;
    readonly message: string;
    readonly details?: Record<string, unknown>;
    readonly requestId: string;
  };
}

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_error'
  | 'rate_limited'
  | 'quota_exceeded'
  | 'internal_error'
  | 'execution_timeout'
  | 'workspace_limit'
  | 'agent_limit';
```

---

## OpenAPI Specification

Generate OpenAPI 3.1 spec at `apps/web/public/openapi.yaml`:

````yaml
openapi: 3.1.0
info:
  title: ADA API
  version: 1.0.0
  description: |
    REST API for ADA (Autonomous Dev Agents).

    ## Authentication
    Use API keys for server-to-server access:
    ```
    Authorization: Bearer ada_sk_live_xxxxxxxxxxxx
    ```

    ## Rate Limiting
    - Free: 60 req/min
    - Pro: 300 req/min
    - Enterprise: 1000 req/min

    Check `X-RateLimit-*` headers for current limits.
  contact:
    name: ADA Support
    url: https://docs.ada-ai.dev
servers:
  - url: https://api.ada-ai.dev/v1
    description: Production
  - url: https://api.staging.ada-ai.dev/v1
    description: Staging
paths:
  # Generated from endpoint definitions above
  /workspaces:
    get:
      summary: List workspaces
      operationId: listWorkspaces
      tags: [Workspaces]
      security:
        - bearerAuth: []
      responses:
        '200':
          description: List of workspaces
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorkspaceListResponse'
  # ... additional paths
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: API Key
  schemas:
    Workspace:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        # ... from TypeScript interfaces
````

### OpenAPI Generation

Use `@asteasolutions/zod-to-openapi` to generate spec from Zod schemas:

```typescript
// packages/core/src/api/openapi.ts
import { generateOpenApi } from './schema';

export async function buildOpenApiSpec(): Promise<string> {
  const spec = generateOpenApi({
    title: 'ADA API',
    version: '1.0.0',
    endpoints: allEndpoints,
  });
  return yaml.stringify(spec);
}
```

---

## Implementation Architecture

### Tech Stack

| Component     | Technology            | Rationale                                 |
| ------------- | --------------------- | ----------------------------------------- |
| API Framework | Next.js API Routes    | Unified with dashboard, edge-ready        |
| Validation    | Zod                   | TypeScript-first, OpenAPI generation      |
| Rate Limiting | Upstash Redis         | Serverless-friendly, global edge          |
| Auth          | NextAuth.js           | GitHub OAuth (#181), session management   |
| Database      | PostgreSQL (Supabase) | Existing infrastructure                   |
| Webhooks      | Inngest               | Reliable delivery, retries, observability |
| API Keys      | PostgreSQL + bcrypt   | Secure hashing, scoped permissions        |

### Middleware Stack

```typescript
// apps/web/src/middleware.ts

export const config = {
  matcher: '/api/:path*',
};

export default async function middleware(req: NextRequest) {
  // 1. Request ID
  const requestId = crypto.randomUUID();

  // 2. Rate limiting (Upstash)
  const rateLimit = await checkRateLimit(req, requestId);
  if (rateLimit.limited) {
    return rateLimitResponse(rateLimit, requestId);
  }

  // 3. Authentication
  const auth = await authenticate(req);
  if (!auth.valid) {
    return unauthorizedResponse(auth.error, requestId);
  }

  // 4. Forward to handler with context
  const response = await handleRequest(req, { requestId, auth, rateLimit });

  // 5. Add standard headers
  return addStandardHeaders(response, requestId, rateLimit);
}
```

### Database Schema

```sql
-- apps/web/prisma/schema.prisma additions

model ApiKey {
  id          String    @id @default(cuid())
  userId      String
  name        String
  keyHash     String    @unique  -- bcrypt hash of full key
  prefix      String    -- "ada_sk_live_" or "ada_sk_test_"
  lastFour    String    -- last 4 chars for display
  scopes      String[]  -- API scopes
  rateLimit   Json      -- { requestsPerMinute, burstLimit, concurrentExecutions }
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([keyHash])
}

model Webhook {
  id              String    @id @default(cuid())
  userId          String
  url             String
  secretHash      String    -- bcrypt hash of signing secret
  events          String[]  -- event types to deliver
  workspaceId     String?   -- optional: filter to workspace
  enabled         Boolean   @default(true)
  lastDeliveryAt  DateTime?
  lastStatus      Int?
  createdAt       DateTime  @default(now())

  user            User      @relation(fields: [userId], references: [id])
  workspace       Workspace? @relation(fields: [workspaceId], references: [id])
  deliveries      WebhookDelivery[]

  @@index([userId])
  @@index([workspaceId])
}

model WebhookDelivery {
  id            String    @id @default(cuid())
  webhookId     String
  eventType     String
  eventData     Json
  status        String    -- pending, success, failed
  statusCode    Int?
  responseBody  String?
  attemptCount  Int       @default(0)
  nextRetryAt   DateTime?
  deliveredAt   DateTime?
  createdAt     DateTime  @default(now())

  webhook       Webhook   @relation(fields: [webhookId], references: [id])

  @@index([webhookId])
  @@index([status, nextRetryAt])
}
```

---

## Webhook Delivery System

### Event Emission

```typescript
// packages/core/src/api/events.ts

import { inngest } from './inngest';

export async function emitEvent(event: WebhookEvent): Promise<void> {
  // 1. Store event in database
  await db.webhookEvent.create({ data: event });

  // 2. Queue delivery to matching webhooks
  const webhooks = await db.webhook.findMany({
    where: {
      enabled: true,
      events: { has: event.type },
      OR: [{ workspaceId: null }, { workspaceId: event.workspaceId }],
    },
  });

  // 3. Trigger Inngest functions for reliable delivery
  await Promise.all(
    webhooks.map(webhook =>
      inngest.send({
        name: 'webhook/deliver',
        data: { webhookId: webhook.id, event },
      })
    )
  );
}
```

### Delivery Function (Inngest)

```typescript
// apps/web/src/inngest/webhook-deliver.ts

export const deliverWebhook = inngest.createFunction(
  { id: 'webhook-deliver' },
  { event: 'webhook/deliver' },
  async ({ event, step }) => {
    const { webhookId, event: webhookEvent } = event.data;

    const webhook = await step.run('get-webhook', () =>
      db.webhook.findUnique({ where: { id: webhookId } })
    );

    if (!webhook || !webhook.enabled) return { skipped: true };

    // Build signed payload
    const timestamp = Date.now();
    const payload = JSON.stringify(webhookEvent);
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    // Deliver with retries
    const response = await step.run('deliver', async () => {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ADA-Signature': `t=${timestamp},v1=${signature}`,
          'X-ADA-Event': webhookEvent.type,
        },
        body: payload,
      });

      return { status: res.status, body: await res.text() };
    });

    // Record delivery
    await step.run('record', () =>
      db.webhookDelivery.create({
        data: {
          webhookId,
          eventType: webhookEvent.type,
          eventData: webhookEvent,
          status:
            response.status >= 200 && response.status < 300
              ? 'success'
              : 'failed',
          statusCode: response.status,
          responseBody: response.body.slice(0, 1000),
          deliveredAt: new Date(),
        },
      })
    );

    // Update webhook last delivery
    await step.run('update-webhook', () =>
      db.webhook.update({
        where: { id: webhookId },
        data: {
          lastDeliveryAt: new Date(),
          lastStatus: response.status,
        },
      })
    );

    return { delivered: true, status: response.status };
  }
);
```

---

## Versioning Strategy

### URL-Based Versioning

```
/v1/workspaces  → current stable
/v2/workspaces  → next version (when breaking changes needed)
```

### Deprecation Policy

1. **Announce:** 6-month notice before deprecating a version
2. **Warn:** Add `Deprecation` header to responses
3. **Sunset:** Return 410 Gone after sunset date

```http
Deprecation: @1735689600
Sunset: Sat, 01 Jan 2028 00:00:00 GMT
Link: <https://api.ada-ai.dev/v2/workspaces>; rel="successor-version"
```

### Breaking vs Non-Breaking Changes

| Change Type                  | Breaking? | Handling     |
| ---------------------------- | --------- | ------------ |
| Add field to response        | No        | Add directly |
| Add optional request param   | No        | Add directly |
| Add new endpoint             | No        | Add directly |
| Remove field from response   | Yes       | New version  |
| Remove endpoint              | Yes       | New version  |
| Change field type            | Yes       | New version  |
| Make optional param required | Yes       | New version  |

---

## Sprint 3 Implementation Plan

### Day 3-4: Foundation

**Engineering Tasks:**

- [ ] Create `apps/web/src/app/api/v1/` directory structure
- [ ] Implement Zod schemas for all request/response types
- [ ] Set up Upstash Redis for rate limiting
- [ ] Create API key management (create, list, revoke)
- [ ] Implement authentication middleware

**Files to create:**

```
apps/web/src/app/api/v1/
├── middleware.ts           # Auth + rate limiting
├── workspaces/
│   └── route.ts            # GET, POST
├── workspaces/[id]/
│   └── route.ts            # GET, PATCH, DELETE
├── auth/
│   └── keys/
│       └── route.ts        # API key management
└── _lib/
    ├── schemas.ts          # Zod schemas
    ├── auth.ts             # Auth helpers
    └── errors.ts           # Error helpers
```

### Day 5-6: Dispatch & Memory Endpoints

**Engineering Tasks:**

- [ ] Dispatch status endpoint
- [ ] Dispatch run endpoint (integrates with #189)
- [ ] Memory bank read/write endpoints
- [ ] Semantic search endpoint
- [ ] Schedule management endpoints

**Integration with #189 (Managed Exec):**

- `POST /dispatch/run` triggers container execution
- Returns `executionId` for async polling
- `GET /dispatch/executions/:id` returns status/logs

### Day 7-8: Webhooks & OpenAPI

**Engineering Tasks:**

- [ ] Webhook CRUD endpoints
- [ ] Inngest webhook delivery functions
- [ ] Generate OpenAPI spec from Zod schemas
- [ ] Deploy Swagger UI at `/docs`

### Day 9-10: Testing & Polish

**QA Tasks:**

- [ ] Integration tests for all endpoints
- [ ] Rate limiting tests (per tier)
- [ ] Webhook delivery tests
- [ ] Error response validation
- [ ] OpenAPI spec validation

---

## Acceptance Criteria (from #190)

| Criteria               | Status       | Implementation                   |
| ---------------------- | ------------ | -------------------------------- |
| REST API endpoints     | 🟢 Specified | 30+ endpoints defined            |
| Webhook support        | 🟢 Specified | Full webhook system with Inngest |
| Rate limiting per tier | 🟢 Specified | Upstash Redis, 3 tiers           |
| API authentication     | 🟢 Specified | API keys + session tokens        |
| API documentation      | 🟢 Specified | OpenAPI 3.1, Swagger UI          |
| Versioning strategy    | 🟢 Specified | URL-based, deprecation policy    |

---

## Related Documents

- `docs/architecture/core-api-spec.md` — Internal TypeScript API
- `docs/architecture/adr-usage-metering-architecture-c1186.md` — Usage tracking
- `docs/architecture/adr-trial-conversion-platform-c1266.md` — User journey events
- `docs/architecture/container-warm-pool-strategy-c1216.md` — Execution infrastructure

---

## Open Questions

1. **API key rotation:** Auto-rotate keys on schedule, or manual only?
2. **Webhook retry strategy:** Exponential backoff (1m, 5m, 30m, 2h, 12h) — confirm timing
3. **GraphQL future:** Add GraphQL alongside REST, or REST-only for v1?

---

_This ADR enables Engineering to implement the API Gateway from Day 3 of Sprint 3, with clear endpoint definitions, type specifications, and implementation architecture._
