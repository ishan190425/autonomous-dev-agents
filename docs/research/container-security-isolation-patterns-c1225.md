# Container Security & Isolation Patterns for Managed Agent Execution (C1225)

> **Purpose:** Security-focused research for Sprint 3 Day 5-7 managed execution implementation  
> **Author:** 🔬 Research (The Scout)  
> **Cycle:** 1225 | **Date:** 2026-02-27 10:00 EST  
> **Related:** #189 (Managed Agent Execution), C1216 (Warm Pool Strategy), C1066 (Container Architecture ADR)  
> **Sprint 3:** Mar 1-14, 2026 | Day 5-7: Managed Execution

---

## Executive Summary

This document researches **container security and isolation patterns** for the ADA SaaS managed execution feature. When users run dispatch cycles through the platform, their agent code executes in our infrastructure. This creates a significant attack surface that must be addressed before Day 5-7 implementation.

**Key Research Questions:**

1. How do similar platforms (Railway, Render, Fly.io) isolate customer workloads?
2. What container runtime security features should we leverage?
3. How do we prevent resource exhaustion, network abuse, and data exfiltration?
4. What's the minimum viable security posture for beta launch?

**Recommendation:** Use **gVisor** for syscall-level isolation with resource cgroups, network namespace isolation, and secrets injection via environment variables. This balances security with implementation complexity for Sprint 3.

---

## 1. Threat Model

### 1.1 What We're Protecting Against

| Threat Category          | Example Attack                                     | Risk Level | Mitigation          |
| ------------------------ | -------------------------------------------------- | ---------- | ------------------- |
| **Resource Exhaustion**  | Fork bomb, memory leak, CPU spin                   | High       | cgroups limits      |
| **Network Abuse**        | Crypto mining, spam relay, DDoS amplification      | High       | Network policies    |
| **Data Exfiltration**    | Read other customers' data, access host filesystem | Critical   | Namespace isolation |
| **Privilege Escalation** | Container escape, root access to host              | Critical   | gVisor/Firecracker  |
| **Secrets Theft**        | Access other customers' API keys                   | Critical   | Secrets injection   |
| **Supply Chain Attack**  | Malicious npm package execution                    | Medium     | Read-only rootfs    |

### 1.2 Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ADA SaaS Platform                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Customer A  │    │   Customer B  │    │   Customer C  │          │
│  │   Container   │    │   Container   │    │   Container   │          │
│  │   ─────────   │    │   ─────────   │    │   ─────────   │          │
│  │   - API keys  │    │   - API keys  │    │   - API keys  │          │
│  │   - Repo acc  │    │   - Repo acc  │    │   - Repo acc  │          │
│  │   - Git creds │    │   - Git creds │    │   - Git creds │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│         │                   │                   │                    │
│         └───────────────────┼───────────────────┘                    │
│                             │                                        │
│                    ┌────────▼────────┐                              │
│                    │  ISOLATION LAYER │◄── This document's focus    │
│                    │   (gVisor/runc)  │                              │
│                    └────────┬────────┘                              │
│                             │                                        │
│                    ┌────────▼────────┐                              │
│                    │   Host Kernel    │                              │
│                    │   (Protected)    │                              │
│                    └─────────────────┘                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Trust Assumption:** Customer code is **untrusted**. Customers have GitHub access tokens, LLM API keys, and repository write access. A container escape = full credential theft.

---

## 2. Industry Analysis

### 2.1 How Similar Platforms Handle Isolation

| Platform           | Runtime            | Isolation Method         | Network Policy                  | Secrets                      |
| ------------------ | ------------------ | ------------------------ | ------------------------------- | ---------------------------- |
| **Railway**        | Docker + gVisor    | gVisor syscall filtering | Private networks per project    | Env vars + encrypted at rest |
| **Render**         | Docker + runc      | Standard namespaces      | Private networks + egress rules | Env vars + Vault             |
| **Fly.io**         | Firecracker VMs    | Full VM isolation        | WireGuard overlay               | Encrypted env vars           |
| **Vercel**         | AWS Lambda         | Lambda isolation         | VPC + no outbound by default    | Encrypted env vars           |
| **GitHub Actions** | Docker (ephemeral) | Fresh VM per job         | Limited egress                  | Secrets masking              |
| **Modal**          | gVisor             | Container isolation      | No egress by default            | Env injection                |

### 2.2 Key Patterns Observed

1. **gVisor is the industry default** for container isolation in multi-tenant SaaS
2. **Firecracker VMs** for highest security (Fly.io, AWS Lambda) but higher overhead
3. **Network isolation** is always present — no direct outbound by default
4. **Secrets as env vars** — injected at runtime, never stored in container image
5. **Ephemeral containers** — destroyed after execution, no persistent state in container

### 2.3 gVisor vs Firecracker Trade-offs

| Factor                        | gVisor                 | Firecracker                   |
| ----------------------------- | ---------------------- | ----------------------------- |
| **Cold Start**                | ~200ms                 | ~125ms (but VM boot)          |
| **Memory Overhead**           | ~50MB                  | ~5MB (micro-VM)               |
| **Syscall Compatibility**     | 90%+ Linux syscalls    | Full Linux kernel             |
| **Security Model**            | Syscall filtering      | Full VM boundary              |
| **Implementation Complexity** | Low (OCI runtime swap) | High (custom orchestration)   |
| **Warm Pool Friendly**        | Yes                    | Yes, but VM state mgmt harder |

**Recommendation:** Start with **gVisor** for Sprint 3. Firecracker is overkill for beta, and gVisor provides sufficient isolation for agent workloads.

---

## 3. Container Security Configuration

### 3.1 Resource Limits (cgroups v2)

```yaml
# Container resource constraints for ADA dispatch
resources:
  limits:
    cpu: '2' # 2 vCPUs max
    memory: '4Gi' # 4GB RAM max
    pids: 100 # Prevent fork bombs
    ephemeral-storage: '10Gi' # Temp disk

  requests:
    cpu: '0.5' # Baseline 0.5 vCPU
    memory: '512Mi' # Baseline 512MB
```

**Per Tier Limits (from C1185 SaaS Tier Spec):**

| Tier          | CPU    | Memory | Timeout | Storage |
| ------------- | ------ | ------ | ------- | ------- |
| Free          | 1 vCPU | 1GB    | 5min    | 2GB     |
| Starter ($29) | 2 vCPU | 2GB    | 15min   | 5GB     |
| Growth ($99)  | 4 vCPU | 4GB    | 30min   | 10GB    |
| Scale ($299)  | 8 vCPU | 8GB    | 60min   | 20GB    |

### 3.2 Security Context (Kubernetes)

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
  seccompProfile:
    type: RuntimeDefault
```

**Key Settings:**

- `runAsNonRoot`: Never run as root
- `readOnlyRootFilesystem`: Prevent persistent modifications
- `capabilities.drop.ALL`: No Linux capabilities (no raw sockets, no mount, etc.)
- `seccompProfile`: Restrict syscalls to safe subset

### 3.3 gVisor Runtime Configuration

```yaml
# RuntimeClass for gVisor
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc # gVisor handler

---
# Pod spec uses RuntimeClass
spec:
  runtimeClassName: gvisor
  containers:
    - name: ada-dispatch
      image: ada-ai/dispatch-runner:latest
```

**gVisor runsc flags:**

```bash
runsc \
  --platform=ptrace \
  --network=host \
  --file-access=shared \
  --overlay=true \
  --strace=false \
  --debug=false
```

---

## 4. Network Isolation

### 4.1 Network Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ada-dispatch-isolation
spec:
  podSelector:
    matchLabels:
      app: ada-dispatch
  policyTypes:
    - Ingress
    - Egress

  # No ingress from other pods
  ingress: []

  # Egress only to allowed destinations
  egress:
    # GitHub API (for gh CLI)
    - to:
        - ipBlock:
            cidr: 140.82.112.0/20 # GitHub
        - ipBlock:
            cidr: 192.30.252.0/22 # GitHub
      ports:
        - protocol: TCP
          port: 443

    # OpenAI/Anthropic APIs
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0 # TODO: Pin to API provider IPs
      ports:
        - protocol: TCP
          port: 443

    # npm registry
    - to:
        - ipBlock:
            cidr: 104.16.0.0/12 # Cloudflare (npm CDN)
      ports:
        - protocol: TCP
          port: 443

    # DNS
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
```

### 4.2 Egress Control Levels

| Level        | Description            | Implementation               |
| ------------ | ---------------------- | ---------------------------- |
| **Strict**   | Only GitHub + LLM APIs | IP allowlist                 |
| **Standard** | + npm registry + DNS   | Domain-based egress          |
| **Open**     | All HTTPS outbound     | Egress firewall logging only |

**Recommendation:** Start with **Standard** for beta. Open egress is risky (crypto mining, spam relay).

### 4.3 DNS Considerations

Agent workloads need DNS for:

- `api.github.com`
- `api.openai.com` / `api.anthropic.com`
- `registry.npmjs.org`

Option 1: **Internal DNS** with allowlist
Option 2: **CoreDNS** with response policy zones (RPZ)
Option 3: **External DNS** with egress proxy logging

**Recommendation:** Option 2 (CoreDNS with RPZ) for balance of usability and control.

---

## 5. Secrets Management

### 5.1 Secrets Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    Secrets Flow                                │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  Customer Setup                 Dispatch Runtime               │
│  ─────────────                 ────────────────               │
│  1. GitHub OAuth ───┐                                         │
│  2. LLM API Key ────┼──▶ Encrypted Storage ──▶ Env Injection  │
│  3. Custom vars ────┘    (Postgres + KMS)      (at pod start) │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Container sees:                                          │  │
│  │   GITHUB_TOKEN=ghp_xxx...                               │  │
│  │   OPENAI_API_KEY=sk-xxx...                              │  │
│  │   ADA_USER_VARS={"custom":"value"}                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

### 5.2 Secrets Injection Options

| Method              | Pros              | Cons                                           | Recommendation           |
| ------------------- | ----------------- | ---------------------------------------------- | ------------------------ |
| **Env vars**        | Simple, universal | Visible in process list                        | ✅ Use for non-sensitive |
| **Mounted files**   | More secure       | Requires volume mounts                         | ✅ Use for sensitive     |
| **HashiCorp Vault** | Full-featured     | Complexity overhead                            | ⚠️ Phase 2               |
| **K8s Secrets**     | Native            | Base64 only (not encrypted at rest by default) | ✅ With encryption       |

**Sprint 3 Approach:**

1. Store encrypted in Postgres (application-level encryption with KMS)
2. Inject as mounted files at `/run/secrets/`
3. Container reads files at startup, environment variables set internally

### 5.3 Secret Rotation

```typescript
// Secrets have expiry and rotation
interface SecretEntry {
  id: string;
  userId: string;
  name: string;
  encryptedValue: string; // AES-256-GCM
  keyVersion: number; // KMS key version
  createdAt: Date;
  expiresAt?: Date; // Optional expiry
  lastUsedAt?: Date;
  rotationPolicy?: 'manual' | '30d' | '90d';
}
```

---

## 6. Filesystem Isolation

### 6.1 Container Filesystem Structure

```
/                          # Read-only root
├── ada/                   # Read-only ADA installation
│   ├── bin/
│   ├── lib/
│   └── templates/
├── home/ada/              # Writable workspace (tmpfs)
│   └── workspace/         # Git clone happens here
├── run/
│   └── secrets/           # Mounted secrets (read-only)
└── tmp/                   # Writable temp (tmpfs, limited size)
```

### 6.2 Volume Configuration

```yaml
volumes:
  # Workspace - ephemeral, per-execution
  - name: workspace
    emptyDir:
      medium: Memory # tmpfs for speed + auto-cleanup
      sizeLimit: 5Gi # Per tier limit

  # Secrets - injected at runtime
  - name: secrets
    secret:
      secretName: user-${userId}-secrets
      defaultMode: 0400 # Read-only by owner

volumeMounts:
  - name: workspace
    mountPath: /home/ada/workspace
  - name: secrets
    mountPath: /run/secrets
    readOnly: true
```

### 6.3 Git Credential Handling

Agent needs to clone/push to customer repos:

```bash
# Credential helper for GitHub token
git config --global credential.helper '!f() { echo "password=${GITHUB_TOKEN}"; }; f'

# Or use gh CLI which handles tokens automatically
gh auth setup-git
```

**Security:** Token scoped to minimum required permissions (contents:write, pull_requests:write).

---

## 7. Execution Timeout & Cleanup

### 7.1 Timeout Architecture

```typescript
interface ExecutionConfig {
  maxDurationMs: number; // Per tier (5-60 min)
  gracePeriodMs: number; // SIGTERM → SIGKILL grace (30s)
  checkpointIntervalMs: number; // Memory bank save frequency

  // Timeout escalation
  timeoutActions: [
    { at: 0.8; action: 'warn' }, // 80%: Log warning
    { at: 0.95; action: 'checkpoint' }, // 95%: Force save
    { at: 1.0; action: 'terminate' }, // 100%: SIGTERM
    { at: 1.02; action: 'kill' }, // 102%: SIGKILL
  ];
}
```

### 7.2 Cleanup Protocol

```
Execution Complete (success or timeout)
        │
        ▼
┌───────────────────────┐
│ 1. Save memory bank   │ (if writable checkpoint exists)
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 2. Git push changes   │ (if any uncommitted work)
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 3. Upload logs        │ (to S3/GCS for debugging)
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 4. Return to pool     │ (or destroy if tainted)
│    - Clear workspace  │
│    - Reset env vars   │
│    - Health check     │
└───────────────────────┘
```

### 7.3 Container Tainting

Container returns to pool only if:

- [ ] Clean exit (0) or known error exit
- [ ] No filesystem modifications outside workspace
- [ ] No suspicious network activity logged
- [ ] Memory usage < 90% of limit at exit

Otherwise: **destroy and replace**.

---

## 8. Implementation Recommendations

### 8.1 Sprint 3 MVP (Day 5-7)

**Must Have:**

1. ✅ gVisor runtime (swap runc → runsc)
2. ✅ Resource limits per tier (cgroups)
3. ✅ Basic network policy (egress allowlist)
4. ✅ Secrets as mounted files
5. ✅ Read-only root filesystem
6. ✅ Execution timeout with graceful shutdown

**Defer to Sprint 4:**

- HashiCorp Vault integration
- Firecracker VM option for enterprise
- Advanced network egress proxy
- Secret rotation automation

### 8.2 Integration with Warm Pool (C1216)

The warm pool strategy (C1216) manages container lifecycle. Security integration:

```typescript
// From C1216 WarmPoolManager, add security checks
class SecureWarmPoolManager extends WarmPoolManager {
  async acquire(request: DispatchRequest): Promise<SecureContainer> {
    const container = await super.acquire(request);

    // Security pre-flight
    await this.injectSecrets(container, request.userId);
    await this.applyNetworkPolicy(container, request.tier);
    await this.setResourceLimits(container, request.tier);

    return container;
  }

  async release(container: SecureContainer): Promise<void> {
    // Security cleanup
    const tainted = await this.checkTaint(container);
    if (tainted) {
      await this.destroy(container);
      return;
    }

    await this.clearSecrets(container);
    await this.resetWorkspace(container);
    await super.release(container);
  }
}
```

### 8.3 Monitoring & Alerting

| Metric                   | Alert Threshold                | Action                      |
| ------------------------ | ------------------------------ | --------------------------- |
| Container escape attempt | Any                            | Page on-call, disable user  |
| Resource limit hits      | >10/hour                       | Warn user, consider upgrade |
| Suspicious egress        | >100 non-allowlist connections | Block + alert               |
| Timeout rate             | >20%                           | Review user workload        |
| Secret access failure    | >5/hour                        | Potential credential issue  |

---

## 9. Testing Recommendations

### 9.1 Security Test Cases

```typescript
describe('Container Security', () => {
  it('should prevent root escalation', async () => {
    const result = await execInContainer('sudo whoami');
    expect(result.exitCode).not.toBe(0);
  });

  it('should block egress to non-allowlisted IPs', async () => {
    const result = await execInContainer('curl http://crypto-miner.evil.com');
    expect(result.exitCode).not.toBe(0);
  });

  it('should enforce memory limits', async () => {
    // Attempt to allocate 10GB in 2GB container
    const result = await execInContainer('stress --vm 1 --vm-bytes 10G');
    expect(result.killedByOOM).toBe(true);
  });

  it('should not persist filesystem changes across executions', async () => {
    await execInContainer('echo "malicious" > /etc/hosts');
    const container2 = await acquireFreshContainer();
    const hosts = await execInContainer('cat /etc/hosts', container2);
    expect(hosts).not.toContain('malicious');
  });

  it('should isolate secrets between users', async () => {
    const containerA = await acquireForUser('user-a');
    const containerB = await acquireForUser('user-b');

    const secretsA = await execInContainer(
      'cat /run/secrets/github_token',
      containerA
    );
    const secretsB = await execInContainer(
      'cat /run/secrets/github_token',
      containerB
    );

    expect(secretsA).not.toBe(secretsB);
  });
});
```

### 9.2 Chaos Testing

- **Container escape:** Use known CVE exploits (in isolated test env)
- **Resource exhaustion:** Fork bombs, memory leaks
- **Network abuse:** Port scanning, DNS exfiltration attempts
- **Time bombs:** Long-running processes, scheduled tasks

---

## 10. Summary

| Security Layer | Sprint 3 Implementation          | Future Enhancement         |
| -------------- | -------------------------------- | -------------------------- |
| **Runtime**    | gVisor (runsc)                   | Firecracker micro-VMs      |
| **Resources**  | cgroups v2 limits                | Burstable billing          |
| **Network**    | K8s NetworkPolicy + allowlist    | Egress proxy with logging  |
| **Secrets**    | Mounted files + app encryption   | HashiCorp Vault            |
| **Filesystem** | Read-only root + tmpfs workspace | Content scanning           |
| **Timeout**    | Graceful shutdown + SIGKILL      | Checkpointing              |
| **Monitoring** | Basic metrics                    | ML-based anomaly detection |

**Key Takeaway:** gVisor + network isolation + secrets injection provides sufficient security for Sprint 3 beta launch. The threat model assumes untrusted customer code; all designs reflect this assumption.

---

## References

- [gVisor Documentation](https://gvisor.dev/docs/)
- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [NIST Container Security Guide SP 800-190](https://csrc.nist.gov/publications/detail/sp/800-190/final)
- [Railway Security Model](https://railway.app/security)
- [Fly.io Firecracker Architecture](https://fly.io/docs/reference/architecture/)

---

_🔬 Research (The Scout) — Cycle 1225_  
_Per R-017: SHIPPED tangible research work — Container security patterns for Sprint 3 managed execution._  
_Per L706: Front-loaded Sprint 3 Day 5-7 implementation._
