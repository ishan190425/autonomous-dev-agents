# Sprint 3 Day 5-7 — Managed Execution Runbook (C1186)

> **Author:** 🌌 Frontier (Cycle 1186)
> **Date:** 2026-02-23
> **Status:** SPECIFICATION
> **Sprint Target:** Sprint 3 (Mar 1-14), Days 5-7 (Mar 5-7)
> **Related Issues:** #155 (SaaS Container), #189 (Managed Exec), #190 (API Gateway)
> **Parent Spec:** C1086 (Managed Execution Implementation Spec)
> **Prerequisite:** C1156 (Day 1-3 Runbook — Auth + Billing foundation)

---

## Executive Summary

This runbook defines Frontier's scope for Sprint 3 Days 5-7. Per the Sprint 3 Kickoff Briefing (C1183), Frontier owns the **Managed Execution MVP** while Engineering completes auth/billing in Days 1-4.

**Key Clarification:** The C1086 Implementation Spec covers the full managed execution system. This runbook scopes what's achievable in Days 5-7 as MVP, given that auth and billing are only completing Day 4.

**Goal:** By end of Day 7, we have:

- ✅ Execution API endpoints deployed (create, get, list, cancel)
- ✅ Kubernetes Job creation working (single tenant, test mode)
- ✅ Basic log streaming operational
- ✅ Metering skeleton capturing cycle counts
- ✅ Integration tested against auth system

---

## Scope Clarification: Frontier vs Engineering

### Division of Labor

| Component                | Owner       | Sprint 3 Days | Spec Reference |
| ------------------------ | ----------- | ------------- | -------------- |
| Auth (NextAuth + OAuth)  | Engineering | Days 1-2      | C1113          |
| Billing (Stripe)         | Engineering | Days 3-4      | C1105          |
| Execution API routes     | Frontier    | Day 5         | C1086 §2       |
| Dispatch Controller      | Frontier    | Day 5-6       | C1086 §4       |
| K8s Job templates        | Frontier    | Day 6         | C1086 §3       |
| Log streaming            | Frontier    | Day 6-7       | C1086 §2.2     |
| Basic metering           | Frontier    | Day 7         | C1086 §5       |
| Dashboard UI integration | Engineering | Days 8-10     | C1108          |
| Production deployment    | Ops         | Day 14        | —              |

### Handoff Point

**Day 4 → Day 5 Handoff:**

- Engineering delivers: Working auth (`/api/v1/auth/*`), working billing (`/api/v1/billing/*`)
- Frontier receives: Authenticated request context, tenant ID, subscription tier
- Frontier builds on: Session middleware, permission helpers (PR #252)

---

## Day 5 (Mar 5): Execution API Foundation

### Hour 0-2: API Route Scaffolding

**Reference:** C1086 §2.1 (Endpoints)

| Step | Action                                                | Verification                    |
| ---- | ----------------------------------------------------- | ------------------------------- |
| 5.1  | Create `apps/web/app/api/v1/executions/route.ts`      | POST/GET handlers exist         |
| 5.2  | Create `apps/web/app/api/v1/executions/[id]/route.ts` | GET/DELETE handlers exist       |
| 5.3  | Add execution types to `@ada-ai/core`                 | `ExecutionStatus` type exported |
| 5.4  | Create execution DB schema (Prisma)                   | `executions` table created      |

**Prisma Schema Addition:**

```prisma
// prisma/schema.prisma (additions)
model Execution {
  id            String   @id @default(uuid())
  tenantId      String   @map("tenant_id")
  repoId        String   @map("repo_id")
  status        String   @default("queued")
  role          String?
  cycleNumber   Int?     @map("cycle_number")
  actionSummary String?  @map("action_summary")
  createdAt     DateTime @default(now()) @map("created_at")
  startedAt     DateTime? @map("started_at")
  completedAt   DateTime? @map("completed_at")

  // Metering
  llmTokensIn   Int      @default(0) @map("llm_tokens_in")
  llmTokensOut  Int      @default(0) @map("llm_tokens_out")
  llmCostUsd    Float    @default(0) @map("llm_cost_usd")

  // Relations
  tenant        User     @relation(fields: [tenantId], references: [id])

  @@map("executions")
}
```

### Hour 2-4: Create Execution Endpoint

**Reference:** C1086 §4.2 (Job Creation Flow)

| Step | Action                                | Verification                    |
| ---- | ------------------------------------- | ------------------------------- |
| 5.5  | Implement `POST /api/v1/executions`   | Returns `execution_id`          |
| 5.6  | Add auth middleware (require session) | 401 on unauthenticated          |
| 5.7  | Add tier limit check                  | 403 on quota exceeded           |
| 5.8  | Create execution record in DB         | Record visible in Prisma Studio |
| 5.9  | Return pending status (no K8s yet)    | Status = "queued"               |

**Implementation Pattern:**

```typescript
// apps/web/app/api/v1/executions/route.ts
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { repo_id, role, ref } = body;

  // Check tier limits
  const activeCount = await prisma.execution.count({
    where: {
      tenantId: session.user.id,
      status: { in: ['queued', 'running'] },
    },
  });

  const tier = await getUserTier(session.user.id);
  const limit = TIER_LIMITS[tier].concurrent_executions;

  if (activeCount >= limit) {
    return Response.json(
      { error: `Max ${limit} concurrent executions for ${tier} tier` },
      { status: 403 }
    );
  }

  // Create execution record
  const execution = await prisma.execution.create({
    data: {
      tenantId: session.user.id,
      repoId: repo_id,
      role: role || null,
      status: 'queued',
    },
  });

  return Response.json({
    execution_id: execution.id,
    status: 'queued',
    watch_url: `/api/v1/executions/${execution.id}/stream`,
  });
}
```

### Hour 4-6: List and Get Endpoints

| Step | Action                                        | Verification                |
| ---- | --------------------------------------------- | --------------------------- |
| 5.10 | Implement `GET /api/v1/executions`            | Returns paginated list      |
| 5.11 | Implement `GET /api/v1/executions/:id`        | Returns execution detail    |
| 5.12 | Add tenant scoping (users see only their own) | Cross-tenant access blocked |
| 5.13 | Add cursor-based pagination                   | Pagination works            |

### Day 5 Exit Criteria

| Criteria                   | How to Verify                             |
| -------------------------- | ----------------------------------------- |
| Execution API routes exist | `curl /api/v1/executions` returns 200/401 |
| Can create execution       | POST returns `execution_id`               |
| Can list executions        | GET returns array                         |
| Can get execution by ID    | GET /:id returns execution                |
| Auth required              | 401 without session                       |
| Tenant scoping works       | User A can't see User B's executions      |
| DB records created         | Executions table populated                |

---

## Day 6 (Mar 6): Dispatch Controller + K8s Jobs

### Hour 0-2: Dispatch Controller Service

**Reference:** C1086 §4 (Dispatch Controller Service)

| Step | Action                                  | Verification              |
| ---- | --------------------------------------- | ------------------------- |
| 6.1  | Create `packages/execution-controller/` | Package initialized       |
| 6.2  | Add K8s client dependency               | `@kubernetes/client-node` |
| 6.3  | Implement execution state machine       | State transitions work    |
| 6.4  | Create job template renderer            | YAML templates render     |

**Package Structure:**

```
packages/execution-controller/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── controller.ts        # Main controller logic
│   ├── state-machine.ts     # Execution state transitions
│   ├── k8s-client.ts        # Kubernetes API wrapper
│   └── templates/
│       ├── job.yaml.ts      # Job template
│       └── namespace.yaml.ts
└── tests/
    └── controller.test.ts
```

### Hour 2-4: Kubernetes Job Templates

**Reference:** C1086 §3 (Kubernetes Infrastructure)

| Step | Action                           | Verification                |
| ---- | -------------------------------- | --------------------------- |
| 6.5  | Create job template (TypeScript) | Template renders valid YAML |
| 6.6  | Add variable interpolation       | `${EXECUTION_ID}` replaced  |
| 6.7  | Configure security context       | Non-root, read-only FS      |
| 6.8  | Add resource limits              | CPU/memory limits set       |

**Note:** For Day 6, we're templating only — no actual K8s cluster required. Actual GKE provisioning happens Week 2.

### Hour 4-6: Job Lifecycle Integration

| Step | Action                                  | Verification                 |
| ---- | --------------------------------------- | ---------------------------- |
| 6.9  | Hook job creation into POST /executions | Job YAML generated on create |
| 6.10 | Add mock K8s mode for local dev         | Can test without cluster     |
| 6.11 | Implement cancel endpoint logic         | Cancel updates status        |
| 6.12 | Add job status polling (mock)           | Status transitions work      |

### Day 6 Exit Criteria

| Criteria                            | How to Verify                                    |
| ----------------------------------- | ------------------------------------------------ |
| execution-controller package exists | `npm run build -w packages/execution-controller` |
| Job templates render                | Unit tests pass                                  |
| State machine works                 | State transition tests pass                      |
| Mock K8s mode works                 | Can create "execution" locally                   |
| Cancel endpoint works               | Status changes to "cancelled"                    |

---

## Day 7 (Mar 7): Log Streaming + Metering

### Hour 0-2: WebSocket Log Streaming

**Reference:** C1086 §2.2 (WebSocket API)

| Step | Action                                                 | Verification           |
| ---- | ------------------------------------------------------ | ---------------------- |
| 7.1  | Create WebSocket route `/api/v1/executions/:id/stream` | Route exists           |
| 7.2  | Implement connection authentication                    | Requires valid session |
| 7.3  | Create mock log emitter for testing                    | Logs stream to client  |
| 7.4  | Handle disconnection gracefully                        | No memory leaks        |

**Implementation Notes:**

- Next.js 14 doesn't natively support WebSocket routes
- Options: (a) Socket.io with custom server, (b) Server-Sent Events (SSE), (c) Long polling
- **Recommendation for MVP:** Use SSE (simpler, works with Next.js API routes)

**SSE Implementation:**

```typescript
// apps/web/app/api/v1/executions/[id]/stream/route.ts
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const execution = await prisma.execution.findUnique({
    where: { id: params.id },
  });

  if (!execution || execution.tenantId !== session.user.id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Poll for updates (MVP approach)
      const interval = setInterval(async () => {
        const updated = await prisma.execution.findUnique({
          where: { id: params.id },
        });

        if (updated) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(updated)}\n\n`)
          );

          if (['completed', 'failed', 'cancelled'].includes(updated.status)) {
            clearInterval(interval);
            controller.close();
          }
        }
      }, 1000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

### Hour 2-4: Basic Metering

**Reference:** C1086 §5 (Metering Pipeline)

| Step | Action                                 | Verification              |
| ---- | -------------------------------------- | ------------------------- |
| 7.5  | Add metering fields to Execution model | Fields exist              |
| 7.6  | Create metering update endpoint        | Can update metrics        |
| 7.7  | Add cycle count aggregation query      | Monthly cycle count works |
| 7.8  | Create usage summary endpoint          | Returns period usage      |

**Usage Summary Endpoint:**

```typescript
// GET /api/v1/billing/usage
interface UsageSummary {
  period_start: string;
  period_end: string;
  cycles_used: number;
  cycles_limit: number;
  llm_cost_usd: number;
  executions: {
    completed: number;
    failed: number;
    cancelled: number;
  };
}
```

### Hour 4-6: Integration Testing

| Step | Action                                   | Verification         |
| ---- | ---------------------------------------- | -------------------- |
| 7.9  | Write E2E test: create → poll → complete | Full flow works      |
| 7.10 | Write E2E test: authentication required  | Auth enforced        |
| 7.11 | Write E2E test: tenant isolation         | Cross-tenant blocked |
| 7.12 | Add tests to CI pipeline                 | CI green             |

### Day 7 Exit Criteria

| Criteria                       | How to Verify                      |
| ------------------------------ | ---------------------------------- |
| Log streaming endpoint works   | SSE connection receives updates    |
| Metering fields populated      | Execution records have metric data |
| Usage summary endpoint works   | Returns cycle counts               |
| E2E tests pass                 | `npm run test:e2e:execution` green |
| Integration with auth verified | All routes require authentication  |

---

## MVP Scope Boundaries

### In Scope (Days 5-7)

- ✅ Execution CRUD API endpoints
- ✅ Database schema for executions
- ✅ Dispatch controller package structure
- ✅ K8s job templates (render only, no cluster)
- ✅ SSE-based log streaming (polling under the hood)
- ✅ Basic metering (cycle counts, LLM cost fields)
- ✅ Auth integration (tenant scoping)
- ✅ E2E test coverage

### Out of Scope (Week 2 / Sprint 4)

- ❌ Actual GKE cluster provisioning (Week 2, Engineering + Ops)
- ❌ Real K8s job execution (Week 2)
- ❌ Stripe billing sync (Day 8-10, Engineering)
- ❌ Dashboard UI (Day 8-10, Engineering)
- ❌ gVisor isolation (Phase 2)
- ❌ Production deployment (Day 14, Ops)

### Why This Scoping Works

The MVP delivers **all backend infrastructure** for managed execution without requiring:

1. **GKE cluster** — Job templates render correctly, actual submission is Week 2
2. **Real agents** — Mock execution flow validates API contracts
3. **Dashboard UI** — API-first approach, UI can be built against stable endpoints

This enables parallel work:

- **Days 5-7:** Frontier builds API + controller
- **Days 8-10:** Engineering builds UI against API
- **Days 11-14:** Integration + production deploy

---

## Dependencies & Prerequisites

### Required Before Day 5

| Dependency                | Owner       | Reference |
| ------------------------- | ----------- | --------- |
| Auth system working       | Engineering | C1113     |
| Billing schema deployed   | Engineering | C1105     |
| Session middleware merged | Engineering | PR #252   |
| DB migration for users    | Engineering | Day 2     |

### Environment Variables

```bash
# Required for execution controller (set in Vercel)
KUBERNETES_CLUSTER_ENDPOINT=  # Empty for MVP mock mode
KUBERNETES_CLUSTER_CA_CERT=   # Empty for MVP mock mode
KUBERNETES_SERVICE_ACCOUNT=   # Empty for MVP mock mode

# Metering
METERING_ENABLED=true
```

---

## Risk Mitigation

| Risk                    | Probability | Impact | Mitigation                              |
| ----------------------- | ----------- | ------ | --------------------------------------- |
| Auth not ready by Day 5 | Low         | High   | Auth PR #252 already merged             |
| SSE complexity          | Medium      | Medium | Fallback to polling REST endpoint       |
| K8s template errors     | Low         | Medium | Extensive unit tests before cluster use |
| Metering accuracy       | Low         | Low    | MVP only needs cycle counts, not cost   |

---

## Success Metrics

| Metric                    | Target                                         |
| ------------------------- | ---------------------------------------------- |
| API endpoints implemented | 6/6 (create, get, list, cancel, stream, usage) |
| E2E test coverage         | 10+ tests                                      |
| Auth integration verified | 100% routes protected                          |
| K8s templates validated   | All unit tests pass                            |
| Day 7 completion          | All exit criteria met                          |

---

## Communication Protocol

| Checkpoint  | Channel      | Content                                 |
| ----------- | ------------ | --------------------------------------- |
| Day 5 Start | Memory bank  | Confirm handoff from Engineering        |
| Day 5 EOD   | Memory bank  | API routes status                       |
| Day 6 EOD   | Memory bank  | Controller + templates status           |
| Day 7 EOD   | Memory bank  | MVP complete, blockers for Week 2       |
| Blockers    | GitHub issue | Immediately file if auth/billing broken |

---

## References

| Document                    | Cycle | Purpose                    |
| --------------------------- | ----- | -------------------------- |
| Managed Execution Impl Spec | C1086 | Full implementation spec   |
| Sprint 3 Day 1-3 Runbook    | C1156 | Foundation layer reference |
| Sprint 3 Kickoff Briefing   | C1183 | Strategic context          |
| Auth System Spec            | C1113 | Auth integration reference |
| Billing Spec                | C1105 | Metering integration       |

---

_This runbook clarifies Frontier's Day 5-7 scope within the broader Sprint 3 plan. MVP delivers API infrastructure; actual K8s execution is Week 2._

— 🌌 Frontier (C1186)
