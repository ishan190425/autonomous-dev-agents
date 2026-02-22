# Managed Agent Execution — Implementation Specification

> Platform implementation spec for #189 (Managed Agent Execution)
> **Author:** 🌌 Frontier (C1086)
> **Date:** 2026-02-22
> **Based on:** C1085 Container Isolation Patterns, C1075 Multi-Tenant Memory, C886 SaaS Observability Spec
> **Target:** Sprint 3 (Mar 1-14)

---

## Executive Summary

This spec translates Research's container isolation patterns (C1085) into concrete implementation artifacts for Sprint 3. It answers all open engineering questions, defines API contracts, and provides infrastructure-as-code foundations.

**Deliverables:**

1. Kubernetes infrastructure manifests (Phase 1 MVP)
2. Execution API contract (REST endpoints)
3. Job scheduler design (cycle dispatch)
4. Metering pipeline specification
5. Integration points with existing CLI

---

## 1. Architecture Decision: GKE + Kubernetes Jobs

### 1.1 Platform Selection

**Decision: Google Kubernetes Engine (GKE) Autopilot**

| Criterion          | GKE Autopilot          | EKS Fargate     | Self-Managed    |
| ------------------ | ---------------------- | --------------- | --------------- |
| gVisor support     | ✅ Native RuntimeClass | ⚠️ Manual setup | ⚠️ Manual setup |
| Scale-to-zero      | ✅ Built-in            | ✅ Karpenter    | ❌ Complex      |
| Ops overhead       | Minimal                | Low             | High            |
| Cost (small scale) | $$                     | $$              | $$$             |
| Cold start         | ~3s                    | ~10s            | Varies          |
| **Sprint 3 fit**   | ✅                     | ⚠️              | ❌              |

**Rationale:**

- Native gVisor support enables Phase 2 without re-architecture
- Autopilot eliminates node management (pure focus on workloads)
- Cost Attribution API built into GKE
- Same infra as Google Cloud Run (battle-tested)

### 1.2 Job Scheduling Selection

**Decision: Kubernetes Jobs + Cloud Scheduler + Custom Controller**

```
┌────────────────────────────────────────────────────────────┐
│                   ADA Control Plane                        │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Cloud        │───►│ Dispatch     │───►│ K8s Job      │  │
│  │ Scheduler    │    │ Controller   │    │ Creator      │  │
│  │ (cron)       │    │ (API)        │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                    │          │
│         ▼                   ▼                    ▼          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                GKE Autopilot Cluster                 │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐              │  │
│  │  │ Job     │  │ Job     │  │ Job     │  (ephemeral) │  │
│  │  │ tenant-a│  │ tenant-b│  │ tenant-c│              │  │
│  │  └─────────┘  └─────────┘  └─────────┘              │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

**Why not SQS/Cloud Tasks?**

- Kubernetes Jobs provide native resource isolation
- Built-in retry/backoff policies
- Log aggregation via kubectl/Cloud Logging
- No additional queue infrastructure to manage

---

## 2. Execution API Contract

### 2.1 Endpoints (REST)

Extends API Gateway spec (C796) with execution-specific endpoints.

```typescript
// POST /api/v1/executions
// Trigger a new agent cycle
interface CreateExecutionRequest {
  repo_id: string; // User's connected repository
  role?: string; // Optional: specific role, otherwise rotation
  ref?: string; // Git ref (default: main)
  environment?: Record<string, string>; // Additional env vars (sanitized)
}

interface CreateExecutionResponse {
  execution_id: string; // UUID
  status: 'queued' | 'running';
  eta_seconds?: number; // Estimated start time
  watch_url: string; // WebSocket URL for live logs
}

// GET /api/v1/executions/:id
// Get execution status and details
interface ExecutionStatus {
  execution_id: string;
  repo_id: string;
  tenant_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  role: string;
  cycle_number: number;

  // Timing
  created_at: string; // ISO timestamp
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;

  // Results
  action_summary?: string; // From ada dispatch complete
  artifacts?: string[]; // Generated files
  pr_created?: string; // PR URL if created

  // Metering
  metrics: {
    llm_tokens_in: number;
    llm_tokens_out: number;
    llm_cost_usd: number;
    compute_seconds: number;
  };
}

// GET /api/v1/executions
// List executions for tenant
interface ListExecutionsRequest {
  repo_id?: string; // Filter by repo
  status?: string; // Filter by status
  limit?: number; // Default 20, max 100
  cursor?: string; // Pagination cursor
}

// POST /api/v1/executions/:id/cancel
// Cancel a running or queued execution
interface CancelExecutionResponse {
  execution_id: string;
  status: 'cancelled';
  cancelled_at: string;
}

// GET /api/v1/executions/:id/logs
// Get execution logs
interface ExecutionLogs {
  execution_id: string;
  logs: LogEntry[];
  next_cursor?: string;
}

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  source: 'cli' | 'github' | 'llm' | 'system';
}
```

### 2.2 WebSocket API (Live Logs)

```typescript
// ws://api.ada.dev/api/v1/executions/:id/stream
// Real-time log streaming during execution

interface StreamMessage {
  type: 'log' | 'status' | 'metric' | 'complete';
  timestamp: string;
  data: LogEntry | StatusUpdate | MetricUpdate | CompletionPayload;
}

interface StatusUpdate {
  status: 'running' | 'completed' | 'failed';
  phase: 'init' | 'context_load' | 'action' | 'memory_update' | 'git_push';
}

interface MetricUpdate {
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
}

interface CompletionPayload {
  action_summary: string;
  artifacts: string[];
  duration_seconds: number;
  total_cost_usd: number;
}
```

---

## 3. Kubernetes Infrastructure

### 3.1 Namespace per Tenant

```yaml
# templates/tenant-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-${TENANT_ID}
  labels:
    ada.dev/tenant: '${TENANT_ID}'
    ada.dev/tier: '${TIER}' # free, pro, team, enterprise
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
  namespace: tenant-${TENANT_ID}
spec:
  hard:
    # Tier-based limits (Pro tier shown)
    requests.cpu: '4'
    requests.memory: 8Gi
    limits.cpu: '8'
    limits.memory: 16Gi
    pods: '5' # Max concurrent executions
    persistentvolumeclaims: '1'
---
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limits
  namespace: tenant-${TENANT_ID}
spec:
  limits:
    - default:
        cpu: '1'
        memory: 1Gi
      defaultRequest:
        cpu: '250m'
        memory: 256Mi
      type: Container
```

### 3.2 Execution Job Template

```yaml
# templates/execution-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: cycle-${EXECUTION_ID}
  namespace: tenant-${TENANT_ID}
  labels:
    ada.dev/execution-id: '${EXECUTION_ID}'
    ada.dev/repo-id: '${REPO_ID}'
    ada.dev/cycle: '${CYCLE_NUMBER}'
spec:
  ttlSecondsAfterFinished: 3600 # Cleanup after 1 hour
  backoffLimit: 0 # No retries (agent handles failures)
  activeDeadlineSeconds: 1800 # 30 min max per cycle
  template:
    metadata:
      labels:
        ada.dev/execution-id: '${EXECUTION_ID}'
    spec:
      # Phase 2: uncomment for gVisor isolation
      # runtimeClassName: gvisor

      restartPolicy: Never
      serviceAccountName: ada-agent

      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault

      containers:
        - name: agent
          image: gcr.io/${PROJECT_ID}/ada-agent:${VERSION}
          imagePullPolicy: Always

          command: ['npx', 'ada', 'dispatch', 'start', '--auto-complete']

          resources:
            requests:
              cpu: '250m'
              memory: '512Mi'
            limits:
              cpu: '1'
              memory: '1Gi'

          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: ['ALL']
            readOnlyRootFilesystem: true

          env:
            - name: ADA_REPO_PATH
              value: '/workspace'
            - name: ADA_EXECUTION_ID
              value: '${EXECUTION_ID}'
            - name: ADA_TENANT_ID
              value: '${TENANT_ID}'
            - name: NODE_ENV
              value: 'production'
            # Secrets injected from mounted volume
            - name: GITHUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: tenant-secrets
                  key: github-token
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: tenant-secrets
                  key: openai-api-key
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: tenant-secrets
                  key: anthropic-api-key
                  optional: true

          volumeMounts:
            - name: workspace
              mountPath: /workspace
            - name: tmp
              mountPath: /tmp
            - name: npm-cache
              mountPath: /home/node/.npm

      initContainers:
        - name: git-clone
          image: alpine/git:latest
          command:
            - sh
            - -c
            - |
              git clone --depth 1 --branch ${GIT_REF} \
                https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO_FULL_NAME}.git \
                /workspace
          env:
            - name: GITHUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: tenant-secrets
                  key: github-token
          volumeMounts:
            - name: workspace
              mountPath: /workspace
          securityContext:
            runAsUser: 1000

      volumes:
        - name: workspace
          emptyDir:
            sizeLimit: 1Gi
        - name: tmp
          emptyDir:
            sizeLimit: 100Mi
        - name: npm-cache
          emptyDir:
            sizeLimit: 500Mi
```

### 3.3 Network Policy

```yaml
# templates/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: agent-network-policy
  namespace: tenant-${TENANT_ID}
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress

  ingress: [] # No inbound traffic to agent pods

  egress:
    # DNS resolution
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53

    # GitHub API
    - to:
        - ipBlock:
            cidr: 140.82.112.0/20
        - ipBlock:
            cidr: 143.55.64.0/20
      ports:
        - protocol: TCP
          port: 443

    # OpenAI API
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0 # OpenAI doesn't publish IP ranges
      ports:
        - protocol: TCP
          port: 443

    # ADA Control Plane (for metrics/logs)
    - to:
        - namespaceSelector:
            matchLabels:
              ada.dev/component: control-plane
      ports:
        - protocol: TCP
          port: 443
```

---

## 4. Dispatch Controller Service

### 4.1 Controller Architecture

```typescript
// packages/execution-controller/src/controller.ts

import { KubeConfig, BatchV1Api } from '@kubernetes/client-node';

interface ExecutionController {
  // Core operations
  createExecution(req: CreateExecutionRequest): Promise<ExecutionStatus>;
  getExecution(id: string): Promise<ExecutionStatus>;
  cancelExecution(id: string): Promise<void>;

  // Lifecycle hooks (called by agent via sidecar/callback)
  onExecutionStart(id: string): Promise<void>;
  onExecutionComplete(id: string, result: ExecutionResult): Promise<void>;
  onMetricUpdate(id: string, metrics: MetricUpdate): Promise<void>;
}

// Execution state machine
enum ExecutionState {
  QUEUED = 'queued', // Job created, waiting for pod
  RUNNING = 'running', // Pod started, agent executing
  COMPLETING = 'completing', // Agent done, pushing results
  COMPLETED = 'completed', // Success, job terminated
  FAILED = 'failed', // Error, job terminated
  CANCELLED = 'cancelled', // User cancelled
}

// State transitions
const transitions: Record<ExecutionState, ExecutionState[]> = {
  [ExecutionState.QUEUED]: [
    ExecutionState.RUNNING,
    ExecutionState.CANCELLED,
    ExecutionState.FAILED,
  ],
  [ExecutionState.RUNNING]: [
    ExecutionState.COMPLETING,
    ExecutionState.FAILED,
    ExecutionState.CANCELLED,
  ],
  [ExecutionState.COMPLETING]: [
    ExecutionState.COMPLETED,
    ExecutionState.FAILED,
  ],
  [ExecutionState.COMPLETED]: [], // Terminal
  [ExecutionState.FAILED]: [], // Terminal
  [ExecutionState.CANCELLED]: [], // Terminal
};
```

### 4.2 Job Creation Flow

```typescript
async function createExecution(
  db: Database,
  k8s: BatchV1Api,
  req: CreateExecutionRequest,
  tenant: Tenant
): Promise<ExecutionStatus> {
  // 1. Validate tier limits
  const activeCount = await db.countActiveExecutions(tenant.id);
  const limit = TIER_LIMITS[tenant.tier].concurrent_executions;
  if (activeCount >= limit) {
    throw new QuotaExceededError(
      `Max ${limit} concurrent executions for ${tenant.tier} tier`
    );
  }

  // 2. Create execution record
  const execution = await db.createExecution({
    id: crypto.randomUUID(),
    tenant_id: tenant.id,
    repo_id: req.repo_id,
    status: ExecutionState.QUEUED,
    created_at: new Date(),
  });

  // 3. Create Kubernetes Job
  const jobManifest = renderJobTemplate({
    EXECUTION_ID: execution.id,
    TENANT_ID: tenant.id,
    REPO_ID: req.repo_id,
    REPO_FULL_NAME: req.repo.full_name,
    GIT_REF: req.ref || 'main',
    CYCLE_NUMBER: await getNextCycleNumber(req.repo_id),
    VERSION: process.env.AGENT_IMAGE_VERSION,
    PROJECT_ID: process.env.GCP_PROJECT_ID,
  });

  await k8s.createNamespacedJob(`tenant-${tenant.id}`, jobManifest);

  // 4. Emit event for real-time tracking
  await pubsub.publish('execution.created', {
    execution_id: execution.id,
    tenant_id: tenant.id,
  });

  return execution;
}
```

---

## 5. Metering Pipeline

### 5.1 Metrics Collection

```typescript
// Agent-side metrics collection (packages/cli/src/metering.ts)

interface CycleMetrics {
  execution_id: string;
  tenant_id: string;

  // LLM usage
  llm_calls: LLMCallMetric[];

  // Compute
  start_time: Date;
  end_time?: Date;

  // GitHub operations
  github_reads: number;
  github_writes: number;
}

interface LLMCallMetric {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number;
}

// Cost calculation (real-time)
const COST_RATES = {
  'gpt-4o': { input: 2.5 / 1_000_000, output: 10.0 / 1_000_000 },
  'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  'claude-sonnet-4-20250514': {
    input: 3.0 / 1_000_000,
    output: 15.0 / 1_000_000,
  },
  'claude-haiku-3-5-20241022': {
    input: 0.8 / 1_000_000,
    output: 4.0 / 1_000_000,
  },
};

function calculateLLMCost(call: Omit<LLMCallMetric, 'cost_usd'>): number {
  const rates = COST_RATES[call.model] || COST_RATES['gpt-4o-mini'];
  return call.input_tokens * rates.input + call.output_tokens * rates.output;
}
```

### 5.2 Billing Integration

```typescript
// Control plane billing sync (runs daily)

async function syncBillingPeriod(db: Database, stripe: Stripe, period: Date) {
  const tenants = await db.getAllTenants();

  for (const tenant of tenants) {
    if (tenant.tier === 'free') continue;

    // Aggregate period usage
    const usage = await db.getUsageForPeriod(tenant.id, period);

    // Report cycles to Stripe
    if (usage.total_cycles > 0) {
      await stripe.subscriptionItems.createUsageRecord(
        tenant.stripe_subscription_item_id,
        {
          quantity: usage.total_cycles,
          timestamp: Math.floor(period.getTime() / 1000),
          action: 'set',
        }
      );
    }

    // Track LLM costs (passed through at cost + margin)
    if (usage.total_llm_cost_usd > 0) {
      await stripe.subscriptionItems.createUsageRecord(
        tenant.stripe_llm_item_id,
        {
          quantity: Math.ceil(usage.total_llm_cost_usd * 100), // cents
          timestamp: Math.floor(period.getTime() / 1000),
          action: 'set',
        }
      );
    }
  }
}
```

---

## 6. CLI Integration

### 6.1 Cloud Execution Mode

```typescript
// packages/cli/src/commands/dispatch.ts

// New flag: --cloud
// Delegates execution to managed infrastructure

export const dispatchCommand = new Command()
  .command('dispatch')
  .option('--cloud', 'Run on ADA Cloud instead of locally')
  .action(async options => {
    if (options.cloud) {
      // Cloud execution path
      const config = await loadCloudConfig();
      if (!config.apiKey) {
        throw new Error(
          'ADA Cloud not configured. Run `ada cloud login` first.'
        );
      }

      const execution = await adaCloudClient.createExecution({
        repo_id: config.repoId,
        ref: await getCurrentBranch(),
      });

      console.log(`🚀 Execution ${execution.execution_id} queued`);
      console.log(`   Watch: ${execution.watch_url}`);

      // Stream logs if terminal
      if (process.stdout.isTTY) {
        await streamExecutionLogs(execution.execution_id);
      }
    } else {
      // Local execution (existing path)
      await localDispatch(options);
    }
  });
```

### 6.2 Cloud Configuration

```typescript
// packages/cli/src/commands/cloud.ts

export const cloudCommand = new Command()
  .command('cloud')
  .description('Manage ADA Cloud connection');

cloudCommand
  .command('login')
  .description('Authenticate with ADA Cloud')
  .action(async () => {
    // OAuth flow via browser
    const code = await startOAuthFlow('https://ada.dev/oauth/authorize');
    const tokens = await exchangeCode(code);

    await saveCloudConfig({
      apiKey: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_at,
    });

    console.log('✅ Logged in to ADA Cloud');
  });

cloudCommand
  .command('status')
  .description('Check cloud connection and usage')
  .action(async () => {
    const config = await loadCloudConfig();
    const status = await adaCloudClient.getStatus();

    console.log(`☁️  ADA Cloud Status`);
    console.log(`   Tier: ${status.tier}`);
    console.log(
      `   Cycles this month: ${status.cycles_used}/${status.cycles_limit}`
    );
    console.log(`   LLM cost this month: $${status.llm_cost_usd.toFixed(2)}`);
  });
```

---

## 7. Implementation Timeline (Sprint 3)

### Week 1 (Mar 1-7)

| Day | Deliverable                        | Owner       |
| --- | ---------------------------------- | ----------- |
| 1   | GKE Autopilot cluster setup        | Engineering |
| 1   | Tenant namespace templates         | Engineering |
| 2   | Job template + network policy      | Engineering |
| 2-3 | Execution API (create/get/list)    | Engineering |
| 3-4 | Dispatch controller (job creation) | Engineering |
| 4-5 | WebSocket log streaming            | Engineering |
| 5   | Basic metering (cycle counting)    | Engineering |

### Week 2 (Mar 8-14)

| Day   | Deliverable                  | Owner       |
| ----- | ---------------------------- | ----------- |
| 8-9   | CLI `--cloud` flag + login   | Engineering |
| 9-10  | Stripe billing integration   | Engineering |
| 10-11 | Dashboard execution UI       | Engineering |
| 11-12 | E2E testing (execution flow) | QA          |
| 12-13 | Documentation + guides       | Docs        |
| 14    | Production deployment        | Ops         |

---

## 8. Success Criteria

- [ ] User can trigger cloud execution via CLI (`ada dispatch --cloud`)
- [ ] User can trigger cloud execution via Dashboard
- [ ] Execution completes within 30 minutes
- [ ] Logs stream in real-time to Dashboard
- [ ] Metering accurately tracks cycles and LLM costs
- [ ] Billing integrates with Stripe usage records
- [ ] Tenant isolation prevents cross-contamination
- [ ] Network policy restricts egress to allowlist

---

## 9. Open Questions (Resolved)

| Question                | Decision                      | Rationale                  |
| ----------------------- | ----------------------------- | -------------------------- |
| K8s provider            | GKE Autopilot                 | Native gVisor, minimal ops |
| Job scheduling          | K8s Jobs + Cloud Scheduler    | Native resource isolation  |
| Log aggregation         | Cloud Logging + tenant labels | Built-in, cost-effective   |
| Cold start optimization | Pool of 3 warm containers     | Balance cost vs latency    |

---

## 10. References

- C1085: Container Isolation Patterns for Managed Execution
- C1075: Multi-Tenant Memory Architecture
- C886: SaaS Observability Spec
- C796: REST API Gateway Spec
- #189: Managed Agent Execution (Issue)
- #155: SaaS Container Launch (Parent Issue)
- #182: Stripe Billing Integration

---

_This specification provides the complete implementation blueprint for Sprint 3 Managed Execution. Engineering can begin Day 1 with infrastructure provisioning._
