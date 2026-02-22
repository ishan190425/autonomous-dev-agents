# Container Isolation Patterns for Managed Agent Execution

> Research document supporting #189 (Managed Agent Execution) for Sprint 3 SaaS Container
> **Author:** 🔬 Research (C1085)
> **Date:** 2026-02-22
> **Related:** #155 (SaaS Container), #189 (Managed Execution), C1075 (Multi-Tenant Memory)

---

## Executive Summary

Managed agent execution is ADA's core SaaS differentiator (#189). This document analyzes container isolation patterns to ensure secure, cost-effective, multi-tenant agent execution. **Key recommendation:** Start with Docker + resource limits (Phase 1), evolve to gVisor for enhanced isolation (Phase 2).

---

## 1. Problem Space

### 1.1 Requirements from #189

| Requirement                      | Implication                                    |
| -------------------------------- | ---------------------------------------------- |
| Container isolation per customer | Hard tenant boundaries, no cross-contamination |
| Cloud-based cycle execution      | Serverless or container orchestration          |
| Automatic scheduling             | Cron-like triggers, queue-based dispatch       |
| No local setup required          | All infrastructure managed                     |
| Execution history and logs       | Per-execution audit trail                      |
| Cost tracking per execution      | Metered billing, resource attribution          |

### 1.2 Threat Model

| Threat                  | Impact                       | Mitigation                            |
| ----------------------- | ---------------------------- | ------------------------------------- |
| Container escape        | Cross-tenant data access     | Kernel isolation (gVisor/Firecracker) |
| Resource exhaustion     | DoS affecting other tenants  | CPU/memory limits, quotas             |
| Network exfiltration    | Data leak via external calls | Network policies, egress filtering    |
| Malicious agent prompts | System prompt injection      | Sandboxed execution context           |
| API key exposure        | Credential theft             | Secrets management, rotation          |

---

## 2. Container Runtime Analysis

### 2.1 Standard Docker (containerd)

**Architecture:**

```
┌─────────────────────────────────────────┐
│              Host Kernel                │
├─────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │ Agent 1 │  │ Agent 2 │  │ Agent 3 │  │
│  │Container│  │Container│  │Container│  │
│  └─────────┘  └─────────┘  └─────────┘  │
│         Shared Kernel (namespaces)      │
└─────────────────────────────────────────┘
```

**Pros:**

- Mature ecosystem, extensive tooling
- Low overhead (~1-2% performance impact)
- Fast startup (<1s cold start)
- Native Kubernetes integration

**Cons:**

- Shared kernel = potential escape vectors
- CVE history (container escapes)
- Requires additional hardening

**Security hardening for Docker:**

```yaml
# docker-compose security profile
security_opt:
  - no-new-privileges:true
  - seccomp:seccomp-profile.json
cap_drop:
  - ALL
cap_add:
  - NET_BIND_SERVICE # Only if needed
read_only: true
tmpfs:
  - /tmp:noexec,nosuid,size=100m
```

**Verdict:** ✅ Good for Phase 1 with hardening

### 2.2 gVisor (runsc)

**Architecture:**

```
┌─────────────────────────────────────────┐
│              Host Kernel                │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │            gVisor Sentry            ││
│  │  (User-space kernel implementation) ││
│  ├─────────────────────────────────────┤│
│  │  ┌─────────┐  ┌─────────┐  ┌─────┐  ││
│  │  │ Agent 1 │  │ Agent 2 │  │ ... │  ││
│  │  └─────────┘  └─────────┘  └─────┘  ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**Pros:**

- User-space kernel intercepts syscalls
- ~200 syscalls implemented (vs ~300 Linux)
- Compatible with Docker/containerd
- Google Cloud Run uses this

**Cons:**

- 10-30% performance overhead
- Not all syscalls supported
- Networking performance impact

**Integration:**

```bash
# Install gVisor runtime
runsc install

# Run container with gVisor
docker run --runtime=runsc ada-agent:latest
```

**Verdict:** ✅ Recommended for Phase 2 (multi-tenant)

### 2.3 Firecracker (microVMs)

**Architecture:**

```
┌─────────────────────────────────────────┐
│              Host Kernel                │
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ microVM 1│  │ microVM 2│  │microVM │ │
│  │┌────────┐│  │┌────────┐│  │  ...   │ │
│  ││Guest OS││  ││Guest OS││  │        │ │
│  │├────────┤│  │├────────┤│  │        │ │
│  ││ Agent  ││  ││ Agent  ││  │        │ │
│  │└────────┘│  │└────────┘│  │        │ │
│  └──────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────┘
```

**Pros:**

- Full kernel isolation per tenant
- AWS Lambda/Fargate uses this
- Strongest security boundary
- Sub-second boot times (~125ms)

**Cons:**

- Higher memory overhead (~128MB per VM)
- More complex orchestration
- Requires KVM support

**Verdict:** ⚠️ Consider for enterprise tier (overkill for MVP)

### 2.4 Comparison Matrix

| Feature            | Docker        | gVisor            | Firecracker          |
| ------------------ | ------------- | ----------------- | -------------------- |
| Isolation Level    | Namespace     | User-space kernel | Full VM              |
| Startup Time       | <1s           | ~1s               | ~125ms               |
| Memory Overhead    | Minimal       | Minimal           | ~128MB               |
| Performance Impact | 1-2%          | 10-30%            | 5-10%                |
| Security Boundary  | Kernel shared | Syscall filtered  | Kernel per tenant    |
| Complexity         | Low           | Medium            | High                 |
| K8s Integration    | Native        | RuntimeClass      | Kata/Firecracker CRI |
| **Phase 1**        | ✅            | -                 | -                    |
| **Phase 2**        | -             | ✅                | -                    |
| **Enterprise**     | -             | -                 | ✅                   |

---

## 3. Resource Isolation Patterns

### 3.1 CPU & Memory Limits

```yaml
# Kubernetes ResourceQuota per tenant namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
  namespace: tenant-123
spec:
  hard:
    requests.cpu: '2'
    requests.memory: 4Gi
    limits.cpu: '4'
    limits.memory: 8Gi
    pods: '10'
```

**Per-execution limits (agent cycle):**

```yaml
# Pod spec for single cycle execution
resources:
  requests:
    cpu: '250m'
    memory: '256Mi'
  limits:
    cpu: '1'
    memory: '1Gi'
```

**Recommendation:** Start with 1 CPU / 1Gi per cycle, tune based on telemetry.

### 3.2 Storage Isolation

```
┌─────────────────────────────────────────┐
│           Persistent Storage            │
├─────────────┬─────────────┬─────────────┤
│  Tenant A   │  Tenant B   │  Tenant C   │
│  /data/a/   │  /data/b/   │  /data/c/   │
│  Encrypted  │  Encrypted  │  Encrypted  │
└─────────────┴─────────────┴─────────────┘
```

**Per-tenant volume claim:**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: tenant-data
  namespace: tenant-123
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: encrypted-ssd
```

**Integration with C1075 (Multi-Tenant Memory):**

- SQLite per tenant (Phase 1) maps to per-tenant PVC
- PostgreSQL with RLS (Phase 2) maps to shared storage with row-level isolation

### 3.3 Network Isolation

```yaml
# NetworkPolicy: Default deny, explicit allow
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tenant-isolation
  namespace: tenant-123
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ada-control-plane
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: ada-shared-services
    - to: # GitHub API access
        - ipBlock:
            cidr: 140.82.112.0/20
      ports:
        - protocol: TCP
          port: 443
```

**Egress allowlist for agent execution:**
| Service | CIDR/Domain | Port | Purpose |
|---------|-------------|------|---------|
| GitHub API | 140.82.112.0/20 | 443 | Issue/PR operations |
| OpenAI API | api.openai.com | 443 | LLM inference |
| Anthropic API | api.anthropic.com | 443 | Claude models |
| npm Registry | registry.npmjs.org | 443 | Package installs |

---

## 4. Secrets Management

### 4.1 Secret Injection Patterns

**Option A: Environment Variables (Simple)**

```yaml
env:
  - name: GITHUB_TOKEN
    valueFrom:
      secretKeyRef:
        name: tenant-secrets
        key: github-token
```

⚠️ Risk: Exposed in process listing, container inspection

**Option B: Mounted Files (Better)**

```yaml
volumes:
  - name: secrets
    secret:
      secretName: tenant-secrets
volumeMounts:
  - name: secrets
    mountPath: /run/secrets
    readOnly: true
```

✅ Files with 0400 permissions, not in process env

**Option C: External Secrets Operator (Best)**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: tenant-secrets
spec:
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: tenant-secrets
  data:
    - secretKey: github-token
      remoteRef:
        key: tenants/123/github
        property: token
```

✅ Dynamic rotation, audit trail, central management

**Recommendation:** Phase 1 mounted files, Phase 2 External Secrets Operator with Vault.

### 4.2 Token Rotation

| Token Type     | Rotation Period | Mechanism                  |
| -------------- | --------------- | -------------------------- |
| GitHub App     | 1 hour          | Automatic via app auth     |
| GitHub PAT     | 90 days         | User-initiated or reminder |
| LLM API Keys   | 30 days         | Dashboard rotation         |
| Session tokens | 24 hours        | Automatic refresh          |

---

## 5. Cost Attribution Architecture

### 5.1 Metering Points

```
┌─────────────────────────────────────────┐
│            Agent Execution              │
├─────────────────────────────────────────┤
│  [1] Cycle Start ─────────────────────► │
│      └─ tenant_id, cycle_id, timestamp  │
│                                         │
│  [2] LLM Calls ───────────────────────► │
│      └─ model, tokens_in, tokens_out    │
│                                         │
│  [3] GitHub API ──────────────────────► │
│      └─ operation, bytes, count         │
│                                         │
│  [4] Compute Time ────────────────────► │
│      └─ cpu_seconds, memory_mb_seconds  │
│                                         │
│  [5] Cycle End ───────────────────────► │
│      └─ status, duration, artifacts     │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│           Metering Database             │
│  (TimescaleDB / ClickHouse)             │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│           Billing Aggregation           │
│  (Daily rollup → Stripe Usage Records)  │
└─────────────────────────────────────────┘
```

### 5.2 Cost Model

```typescript
interface CycleMetrics {
  tenant_id: string;
  cycle_id: string;

  // Time-based
  start_time: Date;
  end_time: Date;
  compute_seconds: number;

  // LLM usage
  llm_calls: {
    model: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
  }[];

  // Resource usage
  cpu_seconds: number;
  memory_mb_seconds: number;
  storage_gb_hours: number;
  egress_mb: number;
}

// Cost calculation
function calculateCycleCost(metrics: CycleMetrics): number {
  const COMPUTE_RATE = 0.0001; // per cpu-second
  const MEMORY_RATE = 0.00001; // per MB-second
  const STORAGE_RATE = 0.02; // per GB-hour

  const computeCost = metrics.cpu_seconds * COMPUTE_RATE;
  const memoryCost = metrics.memory_mb_seconds * MEMORY_RATE;
  const storageCost = metrics.storage_gb_hours * STORAGE_RATE;
  const llmCost = metrics.llm_calls.reduce((sum, c) => sum + c.cost_usd, 0);

  return computeCost + memoryCost + storageCost + llmCost;
}
```

### 5.3 Integration with #182 (Billing)

| Tier          | Included Cycles | Overage Rate |
| ------------- | --------------- | ------------ |
| Free          | 10/month        | N/A          |
| Pro ($19/mo)  | 150/month       | $0.15/cycle  |
| Team ($49/mo) | 500/month       | $0.10/cycle  |
| Enterprise    | Unlimited       | Custom       |

**Stripe metered billing:**

```typescript
// Report usage at cycle completion
await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
  quantity: 1, // cycles
  timestamp: Math.floor(Date.now() / 1000),
  action: 'increment',
});
```

---

## 6. Implementation Roadmap

### Phase 1: MVP (Sprint 3, Mar 1-14)

| Component         | Implementation           | Effort |
| ----------------- | ------------------------ | ------ |
| Container Runtime | Docker with hardening    | S      |
| Orchestration     | Kubernetes (managed)     | M      |
| Resource Limits   | ResourceQuota per tenant | S      |
| Network Policy    | Default deny + allowlist | S      |
| Secrets           | Mounted files            | S      |
| Metering          | Basic cycle counting     | S      |
| Billing           | Stripe usage records     | M      |

**Architecture (Phase 1):**

```
┌─────────────────────────────────────────┐
│          Managed K8s (GKE/EKS)          │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐       │
│  │ Namespace:  │  │ Namespace:  │       │
│  │ tenant-a    │  │ tenant-b    │  ...  │
│  │ ┌─────────┐ │  │ ┌─────────┐ │       │
│  │ │  Agent  │ │  │ │  Agent  │ │       │
│  │ │   Pod   │ │  │ │   Pod   │ │       │
│  │ └─────────┘ │  │ └─────────┘ │       │
│  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────┘
```

### Phase 2: Enhanced Isolation (Q2 2026)

| Component         | Implementation           | Effort |
| ----------------- | ------------------------ | ------ |
| Container Runtime | gVisor (runsc)           | M      |
| Secrets           | External Secrets + Vault | M      |
| Metering          | Full telemetry pipeline  | M      |
| Network           | Service mesh (Istio)     | L      |

### Phase 3: Enterprise (Q3 2026)

| Component         | Implementation         | Effort |
| ----------------- | ---------------------- | ------ |
| Container Runtime | Firecracker (optional) | L      |
| Compliance        | SOC 2, HIPAA isolation | L      |
| Audit             | Full execution replay  | M      |

---

## 7. Open Questions for Engineering

1. **Kubernetes provider:** GKE (Google) vs EKS (AWS) vs self-managed?
   - Recommendation: GKE for native gVisor support (RuntimeClass)

2. **Job scheduling:** Kubernetes Jobs vs external queue (SQS/Cloud Tasks)?
   - Recommendation: K8s Jobs with Keda for scale-to-zero

3. **Log aggregation:** Per-tenant isolation in shared logging?
   - Recommendation: Loki with tenant label, retention per tier

4. **Cold start optimization:** Pre-warmed containers?
   - Recommendation: Pool of warm containers per tier

---

## 8. References

- [gVisor Documentation](https://gvisor.dev/docs/)
- [Firecracker Design](https://github.com/firecracker-microvm/firecracker/blob/main/docs/design.md)
- [Kubernetes Multi-Tenancy](https://kubernetes.io/docs/concepts/security/multi-tenancy/)
- [CNCF Multi-Tenancy Benchmarks](https://github.com/kubernetes-sigs/multi-tenancy)
- C1075: Multi-Tenant Memory Architecture
- C1076: Platform Observability & Logging Spec

---

_This research directly supports #189 (Managed Agent Execution) acceptance criteria, particularly "Container isolation per customer" and "Cost tracking per execution."_
