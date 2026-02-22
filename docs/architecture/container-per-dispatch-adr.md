# ADR: Container-Per-Dispatch Architecture

> Architecture Decision Record for ADA SaaS Container (#155, #189)
> **Author:** 🌌 The Frontier (C1066)
> **Date:** 2026-02-21
> **Status:** Proposed
> **Related Issues:** #155 (SaaS Container), #189 (Managed Agent Execution)

---

## Context

ADA needs a managed cloud execution model for Sprint 3's SaaS Container (#155). Research analysis (C1065) identified container-per-dispatch as the key architectural pattern used by competitors (Devin, Cursor, OpenHands).

### Problem Statement

Self-hosted ADA requires users to:

- Set up their own infrastructure (OpenClaw/Clawdbot, GitHub, cron)
- Manage API keys and credentials
- Monitor agent execution manually
- Handle scaling and isolation

### Competitive Landscape (C1065 Research)

| Platform          | Execution Model        | Isolation      | Billing Model |
| ----------------- | ---------------------- | -------------- | ------------- |
| Devin             | Container-per-session  | Full sandbox   | $500/mo flat  |
| Cursor            | Local process          | IDE sandbox    | Per-seat      |
| Copilot Workspace | Container-per-PR       | PR sandbox     | Usage-based   |
| OpenHands         | Docker container       | Full container | Self-hosted   |
| ADA (proposed)    | Container-per-dispatch | Role-isolated  | Per-cycle     |

### ADA Differentiators

ADA's unique value (persistent memory, role rotation, self-improving rules) requires:

- **Memory persistence** across cycles — containers can't be fully ephemeral
- **Role context isolation** — each dispatch should have clean role state
- **Credential security** — GitHub tokens, API keys must be isolated

---

## Decision

Implement **container-per-dispatch** with persistent volumes for memory and credentials.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ADA SaaS Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌─────────────────────────────────┐   │
│  │  API Gateway │───▶│       Dispatch Scheduler        │   │
│  │   (REST)     │    │   (cron, webhook, manual)       │   │
│  └──────────────┘    └───────────────┬─────────────────┘   │
│                                      │                      │
│                      ┌───────────────▼───────────────┐      │
│                      │     Container Orchestrator    │      │
│                      │   (Kubernetes / Docker Swarm) │      │
│                      └───────────────┬───────────────┘      │
│                                      │                      │
│  ┌───────────────────────────────────┼────────────────────┐ │
│  │                    Agent Pool                          │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │ │
│  │  │Dispatch │  │Dispatch │  │Dispatch │  │Dispatch │   │ │
│  │  │ C1066   │  │ C1067   │  │ C1068   │  │ C1069   │   │ │
│  │  │(frontier)│  │(product)│ │ (scrum) │  │  (qa)   │   │ │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘   │ │
│  │       │            │            │            │         │ │
│  └───────┼────────────┼────────────┼────────────┼─────────┘ │
│          │            │            │            │           │
│  ┌───────▼────────────▼────────────▼────────────▼─────────┐ │
│  │              Persistent Storage Layer                   │ │
│  │  ┌──────────┐  ┌───────────┐  ┌────────────────────┐   │ │
│  │  │  Memory  │  │Credentials│  │   Repo Cache       │   │ │
│  │  │  Bank    │  │  Vault    │  │  (git mirror)      │   │ │
│  │  └──────────┘  └───────────┘  └────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Design

#### 1. Dispatch Container (Ephemeral)

Each dispatch cycle runs in an isolated container:

```typescript
interface DispatchContainer {
  // Unique ID per dispatch
  id: string; // e.g., "dispatch-c1066-frontier-abc123"

  // Execution context
  cycle: number; // 1066
  role: RoleId; // "frontier"
  teamId: string; // User's team ID
  repoUrl: string; // "github.com/org/repo"

  // Resource limits
  cpuLimit: string; // "1.0"
  memoryLimit: string; // "2Gi"
  timeoutSeconds: number; // 300 (5 min default)

  // Mounted volumes
  mounts: {
    memory: string; // /mnt/memory (persistent)
    credentials: string; // /mnt/credentials (read-only)
    workspace: string; // /workspace (ephemeral)
  };
}
```

**Container Lifecycle:**

1. **Spawn:** Scheduler triggers → Container created from base image
2. **Mount:** Persistent volumes attached (memory, credentials)
3. **Clone:** Repo cloned to ephemeral workspace
4. **Execute:** `ada dispatch start` → action → `ada dispatch complete`
5. **Sync:** Memory bank committed + pushed
6. **Teardown:** Container destroyed (workspace deleted)

#### 2. Memory Bank (Persistent Volume)

```yaml
# Persistent Volume per team/repo
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ada-memory-{team-id}-{repo-hash}
spec:
  accessModes:
    - ReadWriteOnce # Single container at a time
  resources:
    requests:
      storage: 100Mi # Memory bank + archives
```

**Memory Isolation:**

- Each team/repo gets dedicated PVC
- Mounted read-write to active dispatch container
- Locked during execution (prevents concurrent writes)
- Backed up hourly to object storage

#### 3. Credential Vault (Secure Mount)

```typescript
interface CredentialVault {
  // Per-team secrets
  githubToken: string; // PAT or GitHub App token
  llmApiKey: string; // OpenAI/Anthropic/etc.

  // Optional integrations
  slackWebhook?: string;
  discordWebhook?: string;
  vercelToken?: string;

  // Rotation metadata
  lastRotated: Date;
  expiresAt?: Date;
}
```

**Security Model:**

- Kubernetes Secrets or Vault integration
- Read-only mount (containers can't modify)
- Per-team isolation (no cross-tenant access)
- Audit logging on access

#### 4. Dispatch Scheduler

```typescript
interface DispatchScheduler {
  // Schedule types
  cron: CronSchedule[]; // Recurring (e.g., every 15 min)
  webhook: WebhookTrigger[]; // On push, PR, issue events
  manual: ManualTrigger[]; // Dashboard "Run Now" button

  // Queue management
  queue: DispatchJob[]; // Pending dispatches
  running: DispatchJob[]; // Currently executing

  // Concurrency control
  maxConcurrentPerTeam: number; // 1 (sequential by default)
  maxConcurrentGlobal: number; // Platform limit
}

interface DispatchJob {
  id: string;
  teamId: string;
  repoUrl: string;
  trigger: 'cron' | 'webhook' | 'manual';
  priority: number; // Higher = sooner
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'queued' | 'running' | 'completed' | 'failed';
}
```

### 5. API Gateway (#190)

```typescript
// REST API for dashboard and integrations
interface ADAApiGateway {
  // Authentication
  'POST /auth/github': AuthResponse; // GitHub OAuth
  'POST /auth/refresh': AuthResponse; // JWT refresh

  // Team management
  'GET /teams': Team[];
  'POST /teams': Team;
  'GET /teams/:id': Team;

  // Repo management
  'GET /teams/:id/repos': Repo[];
  'POST /teams/:id/repos': Repo;
  'DELETE /teams/:id/repos/:repoId': void;

  // Dispatch control
  'GET /repos/:id/dispatches': Dispatch[];
  'POST /repos/:id/dispatches': Dispatch; // Manual trigger
  'GET /dispatches/:id': Dispatch;
  'GET /dispatches/:id/logs': string; // Execution logs

  // Memory access
  'GET /repos/:id/memory': MemoryBank;
  'GET /repos/:id/memory/search': MemoryEntry[];

  // Billing
  'GET /teams/:id/usage': UsageReport;
  'GET /teams/:id/invoices': Invoice[];
}
```

---

## Billing Model (#182)

### Per-Cycle Pricing

Research (C1065) identified per-cycle billing as ideal for ADA's model:

```typescript
interface CycleBilling {
  // Base cost per dispatch cycle
  baseCostUsd: 0.05; // $0.05 per cycle

  // LLM passthrough (actual API cost + margin)
  llmCostMultiplier: 1.2; // 20% margin on LLM costs

  // Compute time (beyond base allocation)
  computeOveragePerMinute: 0.01; // $0.01 per minute over 5 min

  // Storage
  memoryStoragePerGbMonth: 0.1; // $0.10/GB/month for memory persistence
}

// Example: Team running 100 cycles/day
// Base: 100 × $0.05 = $5/day
// LLM: ~$2/day (passthrough)
// Total: ~$7/day = ~$210/month
```

### Free Tier

```typescript
interface FreeTier {
  cyclesPerMonth: 500; // ~16/day
  llmCreditsUsd: 10; // $10 LLM credits
  memoryStorageMb: 100; // 100 MB memory
  repos: 1; // Single repo
}
```

---

## Implementation Phases

### Phase 1: Core Container Runtime (Sprint 3, Week 1)

- [ ] Docker-based dispatch executor
- [ ] Persistent volume for memory bank
- [ ] Basic scheduler (cron only)
- [ ] Manual trigger via CLI

### Phase 2: API Gateway (Sprint 3, Week 2)

- [ ] REST API endpoints
- [ ] GitHub OAuth integration (#181)
- [ ] JWT authentication
- [ ] Dashboard backend

### Phase 3: Billing & Observability (Sprint 3, Week 3)

- [ ] Usage metering
- [ ] Stripe integration (#182)
- [ ] Execution logs
- [ ] Metrics/alerting

### Phase 4: Scale & Polish (Sprint 3, Week 4)

- [ ] Kubernetes deployment
- [ ] Multi-region support
- [ ] Rate limiting
- [ ] Abuse prevention

---

## Alternatives Considered

### 1. Serverless Functions (Lambda/Cloud Run)

**Rejected:** Cold start latency too high for dispatch cycles. Memory persistence requires warm instances or external storage complexity.

### 2. Long-Running VM Per Team

**Rejected:** Expensive at scale, poor utilization. Container-per-dispatch is more cost-efficient.

### 3. Shared Container Pool

**Rejected:** Credential isolation concerns. Each team needs isolated runtime.

---

## Risks & Mitigations

| Risk                      | Impact   | Mitigation                                                 |
| ------------------------- | -------- | ---------------------------------------------------------- |
| Container escape          | Critical | Hardened base image, seccomp profiles, rootless containers |
| Memory bank corruption    | High     | Transaction log, hourly backups, conflict detection        |
| LLM API abuse             | Medium   | Per-team rate limits, cost caps, anomaly detection         |
| Dispatch queue starvation | Medium   | Priority queues, fair scheduling, timeout enforcement      |

---

## Success Metrics

| Metric                            | Target                  |
| --------------------------------- | ----------------------- |
| Dispatch latency (queue → start)  | < 30 seconds            |
| Dispatch success rate             | > 99%                   |
| Memory sync reliability           | > 99.9%                 |
| Cost per cycle                    | < $0.10 (including LLM) |
| Time to first dispatch (new user) | < 5 minutes             |

---

## References

- Research C1065: Managed Agent Platforms Analysis
- #155: SaaS Container (THE PRIORITY)
- #189: Managed Agent Execution
- #190: API Gateway and REST API
- #181: GitHub OAuth Integration
- #182: Billing Integration

---

_This ADR advances #155 by providing the technical foundation for Sprint 3 implementation._
