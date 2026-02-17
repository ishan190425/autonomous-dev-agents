# REST API Gateway Technical Specification

> **Issue:** #190 — feat(web): API Gateway and REST API for Dashboard
> **Author:** 🌌 The Frontier (Head of Platform & Innovation)
> **Cycle:** 796
> **Date:** 2026-02-17
> **Status:** Draft
> **Related:** #155 (SaaS Container), #189 (Managed Execution), #181 (GitHub OAuth)

---

## Overview

The REST API Gateway is the programmatic interface to ADA's SaaS platform. It enables:

1. **Dashboard Integration** — Web dashboard communicates with backend services
2. **External Integrations** — CI/CD systems, IDEs, and third-party tools
3. **Managed Execution** — Trigger and monitor cycles via API (supports #189)
4. **Developer Automation** — Scripted workflows, custom tooling

This specification defines the API architecture, authentication, endpoints, rate limiting, and implementation approach.

---

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway Layer                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Auth       │  │   Rate       │  │   Request            │  │
│  │   Middleware │  │   Limiter    │  │   Validation         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    API Router                               │ │
│  │  /v1/dispatch/*  /v1/memory/*  /v1/teams/*  /v1/billing/*  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Service Layer                              │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │  Dispatch  │  │   Memory   │  │   Team     │  │  Billing   │ │
│  │  Service   │  │   Service  │  │   Service  │  │  Service   │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Data Layer                                 │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │  Supabase  │  │   Redis    │  │   S3       │  │  Stripe    │ │
│  │  Postgres  │  │   Cache    │  │   Storage  │  │   API      │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component  | Technology                 | Rationale                                |
| ---------- | -------------------------- | ---------------------------------------- |
| Framework  | Next.js API Routes         | Unified with dashboard, serverless-ready |
| Auth       | NextAuth.js + GitHub OAuth | Leverages #181, industry standard        |
| Validation | Zod                        | Type-safe request/response validation    |
| Database   | Supabase (Postgres)        | Existing infrastructure                  |
| Cache      | Redis (Upstash)            | Serverless-compatible, rate limiting     |
| Docs       | OpenAPI 3.1                | Auto-generated, interactive              |

---

## Authentication

### Authentication Methods

#### 1. OAuth Bearer Token (Primary)

For authenticated users via dashboard or OAuth flow:

```http
Authorization: Bearer <access_token>
```

- Token obtained via GitHub OAuth (#181)
- Scopes: `read:dispatch`, `write:dispatch`, `read:memory`, `admin`
- Token expiry: 1 hour (refresh via refresh token)

#### 2. API Key (Service-to-Service)

For CI/CD and programmatic access:

```http
X-API-Key: ada_sk_live_xxxxxxxxxxxxx
```

- Generated in dashboard Settings → API Keys
- Tied to team/workspace
- Supports granular permissions
- Rotation supported (multiple active keys)

#### 3. Webhook Signatures (Outbound)

For webhook deliveries to external systems:

```http
X-ADA-Signature: sha256=xxxxxx
X-ADA-Timestamp: 1708192800
```

- HMAC-SHA256 signature
- Timestamp for replay protection (±5 minutes)

### Permission Model

```typescript
interface ApiPermissions {
  // Dispatch operations
  'dispatch:read': boolean; // View cycles, status
  'dispatch:write': boolean; // Trigger cycles
  'dispatch:admin': boolean; // Configure dispatch settings

  // Memory operations
  'memory:read': boolean; // Read memory entries
  'memory:write': boolean; // Add/update entries
  'memory:admin': boolean; // Compress, archive

  // Team operations
  'team:read': boolean; // View team members
  'team:write': boolean; // Invite members
  'team:admin': boolean; // Manage roles, billing

  // Billing
  'billing:read': boolean; // View usage, invoices
  'billing:admin': boolean; // Manage subscription
}
```

---

## API Endpoints

### Base URL

```
Production: https://api.ada.dev/v1
Staging:    https://api.staging.ada.dev/v1
```

### Versioning

- URL-based versioning: `/v1/`, `/v2/`
- Breaking changes → new version
- Deprecation: 6-month notice, 12-month support

---

### Dispatch API

#### Start Dispatch Cycle

```http
POST /v1/dispatch/cycles
```

Triggers a new dispatch cycle for a repository.

**Request:**

```json
{
  "repository": "owner/repo",
  "branch": "main",
  "role": "engineering", // Optional: force specific role
  "dryRun": false, // Optional: simulate without executing
  "priority": "normal" // normal | high | low
}
```

**Response:**

```json
{
  "id": "cyc_abc123",
  "status": "queued",
  "repository": "owner/repo",
  "branch": "main",
  "role": "engineering",
  "queuedAt": "2026-02-17T12:52:00Z",
  "estimatedStartAt": "2026-02-17T12:53:00Z",
  "creditsRequired": 10
}
```

**Errors:**

- `402 Payment Required` — Insufficient credits
- `409 Conflict` — Cycle already in progress
- `422 Unprocessable Entity` — Invalid repository

#### Get Cycle Status

```http
GET /v1/dispatch/cycles/{cycleId}
```

**Response:**

```json
{
  "id": "cyc_abc123",
  "status": "completed",
  "repository": "owner/repo",
  "role": "engineering",
  "action": "feat(cli): add heat scoring commands",
  "startedAt": "2026-02-17T12:53:00Z",
  "completedAt": "2026-02-17T12:58:32Z",
  "duration": 332,
  "creditsUsed": 8,
  "artifacts": {
    "pr": "https://github.com/owner/repo/pull/42",
    "commit": "abc123def456",
    "files": ["packages/cli/src/heat.ts"]
  },
  "logs": "https://api.ada.dev/v1/dispatch/cycles/cyc_abc123/logs"
}
```

#### List Cycles

```http
GET /v1/dispatch/cycles
```

**Query Parameters:**

- `repository` — Filter by repo (owner/repo)
- `status` — Filter by status (queued, running, completed, failed)
- `role` — Filter by role
- `since` — ISO timestamp
- `limit` — Max results (default: 20, max: 100)
- `cursor` — Pagination cursor

#### Stream Cycle Logs

```http
GET /v1/dispatch/cycles/{cycleId}/logs
Accept: text/event-stream
```

Server-Sent Events for real-time logs:

```
event: log
data: {"timestamp":"2026-02-17T12:53:01Z","level":"info","message":"Starting dispatch..."}

event: log
data: {"timestamp":"2026-02-17T12:53:02Z","level":"info","message":"Loaded memory bank v40"}

event: complete
data: {"status":"completed","action":"feat(cli): add heat scoring"}
```

---

### Memory API

#### List Memory Entries

```http
GET /v1/memory/entries
```

**Query Parameters:**

- `repository` — Repository filter
- `heat` — Min heat threshold (0-100)
- `type` — Entry type (learned, innate, decision, lesson)
- `search` — Semantic search query
- `limit` — Max results

**Response:**

```json
{
  "entries": [
    {
      "id": "mem_xyz789",
      "type": "learned",
      "content": "L421: Code supporting a feature doesn't mean...",
      "heat": 85,
      "references": 3,
      "createdAt": "2026-02-16T10:00:00Z",
      "lastReferenced": "2026-02-17T09:00:00Z"
    }
  ],
  "pagination": {
    "cursor": "eyJsYXN0IjoibWVtX3h5...",
    "hasMore": true
  }
}
```

#### Search Memory (Semantic)

```http
POST /v1/memory/search
```

**Request:**

```json
{
  "repository": "owner/repo",
  "query": "error handling patterns",
  "limit": 10,
  "minHeat": 50,
  "includeContext": true
}
```

**Response:**

```json
{
  "results": [
    {
      "entry": {
        /* Memory entry */
      },
      "score": 0.89,
      "context": "Related to error-pattern-library-c782.md..."
    }
  ]
}
```

#### Get Memory Stats

```http
GET /v1/memory/stats
```

**Response:**

```json
{
  "repository": "owner/repo",
  "version": 40,
  "total": 55,
  "byHeat": {
    "hot": 14,
    "warm": 41,
    "cold": 0
  },
  "byType": {
    "learned": 38,
    "innate": 0,
    "decision": 12,
    "lesson": 5
  },
  "lastCompression": "2026-02-17T00:00:00Z",
  "nextCompressionDue": false
}
```

---

### Team API

#### List Team Members

```http
GET /v1/teams/{teamId}/members
```

#### Invite Member

```http
POST /v1/teams/{teamId}/invitations
```

**Request:**

```json
{
  "email": "dev@example.com",
  "role": "member",
  "permissions": ["dispatch:read", "dispatch:write", "memory:read"]
}
```

#### Get Usage

```http
GET /v1/teams/{teamId}/usage
```

**Response:**

```json
{
  "period": {
    "start": "2026-02-01T00:00:00Z",
    "end": "2026-02-28T23:59:59Z"
  },
  "credits": {
    "included": 500,
    "used": 342,
    "remaining": 158
  },
  "cycles": {
    "total": 45,
    "successful": 43,
    "failed": 2
  },
  "breakdown": [
    {
      "repository": "owner/repo",
      "cycles": 30,
      "credits": 240
    }
  ]
}
```

---

### Webhooks API

#### Configure Webhook

```http
POST /v1/webhooks
```

**Request:**

```json
{
  "url": "https://example.com/ada-webhook",
  "events": ["cycle.completed", "cycle.failed", "memory.compressed"],
  "secret": "whsec_xxxxxxxx"
}
```

#### Webhook Events

| Event                  | Payload                     |
| ---------------------- | --------------------------- |
| `cycle.queued`         | Cycle queued for execution  |
| `cycle.started`        | Cycle began executing       |
| `cycle.completed`      | Cycle finished successfully |
| `cycle.failed`         | Cycle failed with error     |
| `memory.compressed`    | Memory bank compressed      |
| `team.usage.threshold` | Usage hit 80%/90%/100%      |

---

## Rate Limiting

### Limits by Tier

| Tier       | Requests/min | Requests/day | Concurrent Cycles |
| ---------- | ------------ | ------------ | ----------------- |
| Free       | 60           | 1,000        | 1                 |
| Pro        | 300          | 10,000       | 5                 |
| Team       | 1,000        | 100,000      | 20                |
| Enterprise | Custom       | Custom       | Custom            |

### Rate Limit Headers

```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 287
X-RateLimit-Reset: 1708193400
X-RateLimit-Policy: 300;w=60
```

### Rate Limit Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 42

{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Retry after 42 seconds.",
    "retryAfter": 42
  }
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Human-readable error message",
    "details": {
      "field": "repository",
      "reason": "Repository not found or not accessible"
    },
    "requestId": "req_abc123xyz",
    "docsUrl": "https://docs.ada.dev/errors/invalid_request"
  }
}
```

### Error Codes

| Code                      | HTTP Status | Description                                 |
| ------------------------- | ----------- | ------------------------------------------- |
| `invalid_request`         | 400         | Malformed request                           |
| `authentication_required` | 401         | Missing or invalid auth                     |
| `permission_denied`       | 403         | Insufficient permissions                    |
| `not_found`               | 404         | Resource not found                          |
| `conflict`                | 409         | Resource conflict (e.g., cycle in progress) |
| `validation_error`        | 422         | Request validation failed                   |
| `rate_limit_exceeded`     | 429         | Too many requests                           |
| `payment_required`        | 402         | Insufficient credits                        |
| `internal_error`          | 500         | Server error                                |

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)

1. **API Route Structure**
   - Set up Next.js API routes in `apps/web/app/api/v1/`
   - Configure middleware (auth, rate limiting, validation)
   - Implement error handling utilities

2. **Authentication Integration**
   - Integrate with GitHub OAuth (#181)
   - Implement API key generation and validation
   - Add permission checking middleware

3. **Core Endpoints**
   - `POST /v1/dispatch/cycles` (trigger cycle)
   - `GET /v1/dispatch/cycles/{id}` (get status)
   - `GET /v1/dispatch/cycles` (list)

### Phase 2: Full Dispatch API (Week 3)

1. **Real-time Features**
   - SSE endpoint for log streaming
   - Webhook delivery system

2. **Integration with Managed Execution (#189)**
   - Queue management
   - Credit deduction
   - Concurrent cycle limits

### Phase 3: Memory & Team APIs (Week 4)

1. **Memory Endpoints**
   - CRUD operations
   - Semantic search integration
   - Stats endpoint

2. **Team Management**
   - Member CRUD
   - Usage tracking
   - Invitation flow

### Phase 4: Polish (Week 5)

1. **Documentation**
   - OpenAPI spec generation
   - Interactive API explorer
   - SDK generation (TypeScript, Python)

2. **Observability**
   - Request logging
   - Metrics (latency, error rates)
   - Alerting integration

---

## Acceptance Criteria

### P0 (Must Have)

- [ ] Authentication via GitHub OAuth and API keys
- [ ] `POST /v1/dispatch/cycles` — trigger cycles
- [ ] `GET /v1/dispatch/cycles/{id}` — get cycle status
- [ ] Rate limiting with tier-based limits
- [ ] Standard error response format
- [ ] Request validation with Zod

### P1 (Should Have)

- [ ] Real-time log streaming (SSE)
- [ ] Webhook delivery system
- [ ] Memory API (list, search, stats)
- [ ] Team usage endpoint
- [ ] OpenAPI documentation

### P2 (Nice to Have)

- [ ] TypeScript SDK auto-generation
- [ ] Python SDK
- [ ] GraphQL endpoint (alternative to REST)
- [ ] Batch operations

---

## Security Considerations

1. **API Key Security**
   - Keys hashed (bcrypt) at rest
   - Prefix visible only (`ada_sk_live_xxx...`)
   - Audit log for key usage

2. **Rate Limiting**
   - Per-key and per-IP limits
   - Burst protection
   - DDoS mitigation via Cloudflare

3. **Input Validation**
   - All inputs validated via Zod schemas
   - SQL injection prevention (parameterized queries)
   - XSS prevention (output encoding)

4. **Audit Logging**
   - All mutating operations logged
   - Retention: 90 days (standard), 1 year (enterprise)
   - Exportable for compliance

---

## Open Questions

1. **GraphQL Alternative?** — Should we offer GraphQL alongside REST for flexibility?
2. **SDK Priority?** — TypeScript first, then Python? Or both in parallel?
3. **Webhook Retry Policy?** — Exponential backoff with max 5 retries over 24h?
4. **Rate Limit Tiers?** — Do the proposed limits match pricing tiers (#182)?

---

## References

- #155 SaaS Container (P0)
- #189 Managed Execution Spec
- #181 GitHub OAuth
- #182 Stripe Billing
- `docs/product/specs/managed-execution-spec-c787.md`

---

_🌌 The Frontier — Cycle 796_
