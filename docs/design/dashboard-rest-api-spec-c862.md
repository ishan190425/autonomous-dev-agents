# Dashboard REST API Design Specification

> **Author:** 🎨 Design (The Architect)  
> **Cycle:** C862 (441 consecutive!)  
> **Date:** 2026-02-18  
> **Status:** Ready for Implementation  
> **Relates to:** #190 (API Gateway), #181 (Auth), #182 (Billing), #155 (SaaS Container)  
> **Builds on:** Auth UX (C822), Billing UX (C832), Dashboard SaaS (C852)

---

## Overview

API design specification for the ADA Dashboard REST API. Defines endpoints, authentication, rate limiting, error handling, and versioning strategy. Designed for Sprint 3 implementation alongside auth and billing features.

---

## 1. API Design Principles

### 1.1 RESTful Conventions

| Convention   | Rule                                                          |
| ------------ | ------------------------------------------------------------- |
| **Base URL** | `https://api.ada.dev/v1`                                      |
| **Format**   | JSON (request and response)                                   |
| **Methods**  | GET (read), POST (create), PATCH (update), DELETE (remove)    |
| **Naming**   | Plural nouns (`/repos`, `/cycles`), kebab-case for multi-word |
| **IDs**      | UUID v4 for resources, GitHub IDs for external refs           |

### 1.2 Response Envelope

All responses use a consistent envelope:

```json
// Success
{
  "data": { ... },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-02-18T14:30:00Z"
  }
}

// List with pagination
{
  "data": [ ... ],
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-02-18T14:30:00Z",
    "pagination": {
      "page": 1,
      "perPage": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}

// Error
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry after 60 seconds.",
    "details": { "retryAfter": 60 }
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-02-18T14:30:00Z"
  }
}
```

---

## 2. Authentication

### 2.1 Authentication Methods

| Method             | Use Case             | Header                              |
| ------------------ | -------------------- | ----------------------------------- |
| **Bearer Token**   | API access (primary) | `Authorization: Bearer <token>`     |
| **Session Cookie** | Dashboard web app    | `Cookie: ada_session=<session_id>`  |
| **CLI Token**      | `ada login` CLI auth | `Authorization: Bearer <cli_token>` |

### 2.2 Auth Endpoints

#### `POST /v1/auth/github`

Exchange GitHub OAuth code for ADA session.

```json
// Request
{
  "code": "github_oauth_code",
  "redirect_uri": "https://dashboard.ada.dev/auth/callback"
}

// Response (200)
{
  "data": {
    "user": {
      "id": "usr_abc123",
      "github_id": 12345678,
      "username": "ishan190425",
      "email": "ishan@example.com",
      "avatar_url": "https://avatars.githubusercontent.com/...",
      "plan": "pro",
      "created_at": "2026-02-18T10:00:00Z"
    },
    "session": {
      "token": "adas_live_abc123...",
      "expires_at": "2026-02-25T10:00:00Z"
    }
  }
}
```

#### `POST /v1/auth/cli/token`

Generate CLI token (requires session auth).

```json
// Request
{
  "name": "macbook-pro",
  "expires_in": 2592000  // 30 days, optional
}

// Response (201)
{
  "data": {
    "token": "ada_cli_abc123...",
    "name": "macbook-pro",
    "expires_at": "2026-03-20T10:00:00Z",
    "created_at": "2026-02-18T10:00:00Z"
  }
}
```

#### `GET /v1/auth/me`

Get current authenticated user.

```json
// Response (200)
{
  "data": {
    "id": "usr_abc123",
    "github_id": 12345678,
    "username": "ishan190425",
    "email": "ishan@example.com",
    "avatar_url": "https://avatars.githubusercontent.com/...",
    "plan": "pro",
    "usage": {
      "cycles_used": 250,
      "cycles_limit": 1000,
      "period_start": "2026-02-01T00:00:00Z",
      "period_end": "2026-02-28T23:59:59Z"
    },
    "created_at": "2026-02-18T10:00:00Z"
  }
}
```

#### `DELETE /v1/auth/session`

Logout (invalidate session).

```json
// Response (204 No Content)
```

---

## 3. Repositories

### 3.1 Repository Endpoints

#### `GET /v1/repos`

List connected repositories.

```json
// Query params: ?page=1&per_page=20&status=active

// Response (200)
{
  "data": [
    {
      "id": "repo_abc123",
      "github_id": 123456789,
      "full_name": "ishan190425/autonomous-dev-agents",
      "name": "autonomous-dev-agents",
      "owner": "ishan190425",
      "private": false,
      "status": "active",
      "agent_config": {
        "roles": ["ceo", "engineering", "ops"],
        "dispatch_interval": "15m",
        "auto_dispatch": true
      },
      "stats": {
        "cycles": 862,
        "consecutive": 441,
        "prs_merged": 82,
        "last_cycle": "2026-02-18T14:30:00Z"
      },
      "connected_at": "2026-02-01T10:00:00Z"
    }
  ],
  "meta": {
    "pagination": { "page": 1, "perPage": 20, "total": 3 }
  }
}
```

#### `POST /v1/repos`

Connect a new repository.

```json
// Request
{
  "github_repo_id": 123456789,
  "template": "default",  // or "minimal", "research"
  "auto_init": true
}

// Response (201)
{
  "data": {
    "id": "repo_xyz789",
    "github_id": 123456789,
    "full_name": "ishan190425/new-project",
    "status": "initializing",
    "setup_progress": {
      "step": 1,
      "total": 4,
      "current": "Creating agents directory..."
    }
  }
}
```

#### `GET /v1/repos/:id`

Get repository details.

#### `PATCH /v1/repos/:id`

Update repository configuration.

```json
// Request
{
  "agent_config": {
    "dispatch_interval": "30m",
    "auto_dispatch": false
  }
}
```

#### `DELETE /v1/repos/:id`

Disconnect repository (does not delete GitHub repo).

---

## 4. Cycles

### 4.1 Cycle Endpoints

#### `GET /v1/repos/:id/cycles`

List dispatch cycles for a repository.

```json
// Query params: ?page=1&per_page=50&role=engineering&from=2026-02-17&to=2026-02-18

// Response (200)
{
  "data": [
    {
      "id": "cyc_abc123",
      "number": 862,
      "role": "design",
      "role_title": "🎨 The Architect",
      "action": "Dashboard REST API Design Spec — Created comprehensive API design...",
      "outcome": "success",
      "reflection": {
        "what_worked": "Creating API spec complements UX specs...",
        "lesson": "API design should follow UX specs within 5-10 cycles."
      },
      "duration_ms": 45000,
      "tokens": {
        "input": 15000,
        "output": 8000,
        "cost_usd": 0.12
      },
      "started_at": "2026-02-18T14:30:00Z",
      "completed_at": "2026-02-18T14:30:45Z"
    }
  ]
}
```

#### `GET /v1/repos/:id/cycles/:number`

Get specific cycle details.

#### `POST /v1/repos/:id/cycles/dispatch`

Manually trigger a dispatch cycle.

```json
// Request
{
  "role": "engineering",  // optional, uses rotation if omitted
  "priority": "high"      // optional, affects queue position
}

// Response (202 Accepted)
{
  "data": {
    "cycle_id": "cyc_pending_abc",
    "status": "queued",
    "estimated_start": "2026-02-18T14:35:00Z"
  }
}
```

---

## 5. Memory

### 5.1 Memory Endpoints

#### `GET /v1/repos/:id/memory`

Get memory bank summary.

```json
// Response (200)
{
  "data": {
    "version": 43,
    "last_updated": "2026-02-18T14:24:00Z",
    "last_compression": "2026-02-17T00:00:00Z",
    "line_count": 180,
    "sections": [
      { "name": "Current Status", "lines": 25 },
      { "name": "Role State", "lines": 85 },
      { "name": "Active Threads", "lines": 35 },
      { "name": "Key Lessons", "lines": 20 },
      { "name": "Project Metrics", "lines": 15 }
    ]
  }
}
```

#### `GET /v1/repos/:id/memory/search`

Search memory bank.

```json
// Query params: ?q=infrastructure&limit=10

// Response (200)
{
  "data": {
    "query": "infrastructure",
    "results": [
      {
        "section": "Role State → Ops",
        "content": "Infrastructure Runbook Creation (C861)...",
        "score": 0.95,
        "line": 45
      }
    ]
  }
}
```

#### `GET /v1/repos/:id/memory/heat`

Get memory heat map.

```json
// Response (200)
{
  "data": {
    "entries": [
      {
        "id": "mem_abc",
        "content": "Infrastructure 0/6 needs execution",
        "heat": 0.92,
        "last_referenced": "2026-02-18T14:24:00Z",
        "reference_count": 15
      }
    ]
  }
}
```

---

## 6. Billing

### 6.1 Billing Endpoints

#### `GET /v1/billing/subscription`

Get current subscription.

```json
// Response (200)
{
  "data": {
    "plan": "pro",
    "status": "active",
    "current_period": {
      "start": "2026-02-01T00:00:00Z",
      "end": "2026-02-28T23:59:59Z"
    },
    "usage": {
      "cycles_used": 250,
      "cycles_limit": 1000,
      "percentage": 25
    },
    "billing": {
      "amount": 1900, // cents
      "currency": "usd",
      "next_billing_date": "2026-03-01T00:00:00Z"
    }
  }
}
```

#### `POST /v1/billing/checkout`

Create Stripe checkout session.

```json
// Request
{
  "plan": "pro",
  "success_url": "https://dashboard.ada.dev/settings/billing?success=1",
  "cancel_url": "https://dashboard.ada.dev/settings/billing"
}

// Response (200)
{
  "data": {
    "checkout_url": "https://checkout.stripe.com/...",
    "session_id": "cs_live_abc123"
  }
}
```

#### `POST /v1/billing/portal`

Create Stripe customer portal session.

```json
// Response (200)
{
  "data": {
    "portal_url": "https://billing.stripe.com/p/session/..."
  }
}
```

#### `GET /v1/billing/invoices`

List invoices.

```json
// Response (200)
{
  "data": [
    {
      "id": "inv_abc123",
      "number": "ADA-0001",
      "amount": 1900,
      "currency": "usd",
      "status": "paid",
      "period": {
        "start": "2026-01-01T00:00:00Z",
        "end": "2026-01-31T23:59:59Z"
      },
      "pdf_url": "https://pay.stripe.com/invoice/...",
      "created_at": "2026-02-01T00:00:00Z"
    }
  ]
}
```

---

## 7. Webhooks

### 7.1 Webhook Endpoints

#### `GET /v1/webhooks`

List configured webhooks.

#### `POST /v1/webhooks`

Create webhook.

```json
// Request
{
  "url": "https://example.com/ada-webhook",
  "events": ["cycle.completed", "cycle.failed", "usage.threshold"],
  "secret": "whsec_abc123"  // optional, auto-generated if omitted
}

// Response (201)
{
  "data": {
    "id": "wh_abc123",
    "url": "https://example.com/ada-webhook",
    "events": ["cycle.completed", "cycle.failed", "usage.threshold"],
    "secret": "whsec_abc123",
    "status": "active",
    "created_at": "2026-02-18T10:00:00Z"
  }
}
```

### 7.2 Webhook Events

| Event                   | Trigger                     |
| ----------------------- | --------------------------- |
| `cycle.started`         | Dispatch cycle begins       |
| `cycle.completed`       | Cycle finishes successfully |
| `cycle.failed`          | Cycle fails                 |
| `usage.threshold`       | Usage hits 80%, 90%, 100%   |
| `subscription.created`  | New subscription            |
| `subscription.updated`  | Plan change                 |
| `subscription.canceled` | Subscription canceled       |

### 7.3 Webhook Payload

```json
{
  "id": "evt_abc123",
  "type": "cycle.completed",
  "created_at": "2026-02-18T14:30:00Z",
  "data": {
    "cycle": {
      "id": "cyc_abc123",
      "number": 862,
      "role": "design",
      "action": "Dashboard REST API Design Spec..."
    },
    "repo": {
      "id": "repo_abc123",
      "full_name": "ishan190425/autonomous-dev-agents"
    }
  }
}
```

---

## 8. Rate Limiting

### 8.1 Tier Limits

| Tier     | Requests/min | Requests/hour | Burst |
| -------- | ------------ | ------------- | ----- |
| **Free** | 60           | 1,000         | 10    |
| **Pro**  | 300          | 10,000        | 50    |
| **Team** | 600          | 30,000        | 100   |

### 8.2 Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1708265460
X-RateLimit-Tier: free
```

### 8.3 Rate Limit Error

```json
// 429 Too Many Requests
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry after 45 seconds.",
    "details": {
      "limit": 60,
      "remaining": 0,
      "reset": 1708265460,
      "retry_after": 45
    }
  }
}
```

---

## 9. Error Codes

### 9.1 Error Code Reference

| Code                   | HTTP Status | Description                             |
| ---------------------- | ----------- | --------------------------------------- |
| `UNAUTHORIZED`         | 401         | Invalid or missing auth token           |
| `FORBIDDEN`            | 403         | Valid auth but insufficient permissions |
| `NOT_FOUND`            | 404         | Resource doesn't exist                  |
| `VALIDATION_ERROR`     | 400         | Invalid request body                    |
| `RATE_LIMIT_EXCEEDED`  | 429         | Rate limit hit                          |
| `USAGE_LIMIT_EXCEEDED` | 402         | Cycle limit reached (upgrade required)  |
| `GITHUB_AUTH_EXPIRED`  | 401         | GitHub token needs refresh              |
| `DISPATCH_IN_PROGRESS` | 409         | Cycle already running for repo          |
| `REPO_NOT_INITIALIZED` | 400         | Repository missing agents/ directory    |
| `STRIPE_ERROR`         | 502         | Billing provider error                  |
| `INTERNAL_ERROR`       | 500         | Unexpected server error                 |

### 9.2 Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "fields": [
        { "field": "dispatch_interval", "error": "Must be at least 5m" }
      ]
    }
  }
}
```

---

## 10. Versioning Strategy

### 10.1 Version Header

```
Accept: application/vnd.ada.v1+json
```

Or via URL path (preferred):

```
/v1/repos
/v2/repos  (future)
```

### 10.2 Deprecation Policy

1. **Sunset header** added 90 days before removal
2. **Deprecation notices** in API response
3. **Migration guide** published in docs

```
Sunset: Sat, 01 Jun 2026 00:00:00 GMT
Deprecation: true
Link: <https://docs.ada.dev/api/migration/v1-to-v2>; rel="deprecation"
```

---

## 11. OpenAPI Specification

OpenAPI 3.1 spec will be generated from this design and published at:

- **Interactive docs:** `https://api.ada.dev/docs`
- **Raw spec:** `https://api.ada.dev/openapi.json`
- **SDK generation:** TypeScript SDK via `@ada-ai/sdk` package

---

## 12. Implementation Checklist

### Phase 1: Auth & Core (Sprint 3 Week 1)

- [ ] `POST /v1/auth/github`
- [ ] `POST /v1/auth/cli/token`
- [ ] `GET /v1/auth/me`
- [ ] `DELETE /v1/auth/session`
- [ ] Rate limiting middleware
- [ ] Error handling middleware

### Phase 2: Repos & Cycles (Sprint 3 Week 1-2)

- [ ] `GET /v1/repos`
- [ ] `POST /v1/repos`
- [ ] `GET /v1/repos/:id`
- [ ] `PATCH /v1/repos/:id`
- [ ] `DELETE /v1/repos/:id`
- [ ] `GET /v1/repos/:id/cycles`
- [ ] `GET /v1/repos/:id/cycles/:number`
- [ ] `POST /v1/repos/:id/cycles/dispatch`

### Phase 3: Billing (Sprint 3 Week 2)

- [ ] `GET /v1/billing/subscription`
- [ ] `POST /v1/billing/checkout`
- [ ] `POST /v1/billing/portal`
- [ ] `GET /v1/billing/invoices`
- [ ] Stripe webhook handler

### Phase 4: Memory & Webhooks (Sprint 3 Week 2)

- [ ] `GET /v1/repos/:id/memory`
- [ ] `GET /v1/repos/:id/memory/search`
- [ ] `GET /v1/repos/:id/memory/heat`
- [ ] `GET /v1/webhooks`
- [ ] `POST /v1/webhooks`
- [ ] Webhook delivery system

### Phase 5: Documentation (Sprint 3)

- [ ] OpenAPI spec generation
- [ ] Interactive API docs
- [ ] TypeScript SDK (`@ada-ai/sdk`)

---

## 13. Acceptance Criteria

1. **All endpoints** return consistent response envelope
2. **Auth required** on all endpoints except `POST /v1/auth/github`
3. **Rate limiting** enforced per tier with proper headers
4. **Error codes** match specification exactly
5. **Pagination** works correctly on all list endpoints
6. **Webhooks** deliver within 30 seconds of event
7. **OpenAPI spec** validates against 3.1 standard
8. **TypeScript SDK** has 100% endpoint coverage

---

## References

- Auth Flow UX Spec (C822): `docs/design/auth-flow-ux-spec-c822.md`
- Billing UX Spec (C832): `docs/design/billing-ux-spec-c832.md`
- Dashboard SaaS Spec (C852): `docs/design/dashboard-saas-integration-spec-c852.md`
- Issue #190: API Gateway and REST API for Dashboard
- Issue #155: SaaS Container Launch

---

_API design aligns with UX specs. Engineering can implement with clear contracts._
