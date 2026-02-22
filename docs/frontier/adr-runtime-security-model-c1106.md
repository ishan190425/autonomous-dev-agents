# ADR: Container Runtime Security Model for Managed Execution

> Architecture Decision Record — Runtime Security Layers
> **Author:** 🌌 Frontier (C1106)
> **Date:** 2026-02-22
> **Status:** Accepted
> **Relates to:** C1086 (Managed Execution Spec), C1085 (Container Isolation), #189

---

## Context

ADA's Managed Execution feature (#189) runs untrusted tenant code in cloud containers. The C1086 implementation spec defines GKE Autopilot + Kubernetes Jobs as the execution platform, but defers runtime security details to "Phase 2 gVisor."

This ADR documents the **complete runtime security model** — what protections are active in Phase 1 (launch), what gVisor adds in Phase 2, and the specific seccomp/AppArmor configurations required.

### Threat Model

| Threat                  | Severity | Attack Surface                         |
| ----------------------- | -------- | -------------------------------------- |
| **Container escape**    | Critical | Kernel exploits, privileged syscalls   |
| **Data exfiltration**   | High     | Network egress, DNS tunneling          |
| **Resource exhaustion** | Medium   | CPU/memory bombs, fork bombs           |
| **Cross-tenant access** | High     | Shared kernel, volume mounts           |
| **Cryptomining**        | Medium   | Unauthorized compute use               |
| **Secret theft**        | High     | Environment variables, mounted secrets |

---

## Decision

### Phase 1: Defense-in-Depth OCI Containers (Sprint 3 Launch)

Phase 1 uses **layered security controls** within standard OCI containers:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Security Layers                          │
├─────────────────────────────────────────────────────────────────┤
│  L1: Kubernetes Network Policy (egress allowlist)               │
│  L2: ResourceQuota + LimitRange (resource caps)                 │
│  L3: Pod Security Context (non-root, read-only root FS)         │
│  L4: Seccomp Profile (syscall filtering)                        │
│  L5: AppArmor Profile (file/network/capability restrictions)    │
│  L6: Namespace Isolation (tenant-per-namespace)                 │
│  L7: RBAC (ServiceAccount with minimal permissions)             │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 2: gVisor Kernel Isolation (Post-Launch)

Phase 2 adds **gVisor's Sentry** (user-space kernel) for syscall interception:

```
┌─────────────────────────────────────────────────────────────────┐
│                   Phase 2: gVisor Addition                      │
├─────────────────────────────────────────────────────────────────┤
│  L0: gVisor Sentry (user-space kernel, syscall interception)    │
│  L1-L7: Same as Phase 1 (defense-in-depth retained)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Rationale

### Why Not gVisor in Phase 1?

| Factor                    | Impact                                  |
| ------------------------- | --------------------------------------- |
| **Cold start latency**    | +1-2s per execution (gVisor init)       |
| **Compatibility testing** | Node.js + git must be validated         |
| **Debug complexity**      | gVisor stack traces are harder to parse |
| **Sprint 3 velocity**     | Adds 2-3 days testing overhead          |

**Conclusion:** Phase 1's layered controls provide **sufficient security** for launch. gVisor is additive hardening, not required for MVP.

### Why gVisor Over Alternatives?

| Solution            | Pros                               | Cons                                  | Verdict           |
| ------------------- | ---------------------------------- | ------------------------------------- | ----------------- |
| **gVisor**          | Native GKE support, minimal config | +1s latency, some syscall gaps        | ✅ Phase 2        |
| **Kata Containers** | Full VM isolation                  | 5-10s cold start, complex setup       | ❌ Too slow       |
| **Firecracker**     | AWS Lambda-level isolation         | Not native to GKE, operational burden | ❌ Wrong platform |
| **Standard runc**   | Fast, simple                       | Shared kernel exposure                | ✅ Phase 1 only   |

---

## Specification

### 1. Seccomp Profile (Phase 1)

The following **custom seccomp profile** blocks dangerous syscalls while allowing Node.js + git operations:

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "defaultErrnoRet": 1,
  "architectures": ["SCMP_ARCH_X86_64", "SCMP_ARCH_AARCH64"],
  "syscalls": [
    {
      "names": [
        "read",
        "write",
        "close",
        "fstat",
        "lseek",
        "mmap",
        "mprotect",
        "munmap",
        "brk",
        "ioctl",
        "access",
        "pipe",
        "select",
        "sched_yield",
        "mremap",
        "msync",
        "mincore",
        "madvise",
        "dup",
        "dup2",
        "nanosleep",
        "getpid",
        "socket",
        "connect",
        "sendto",
        "recvfrom",
        "shutdown",
        "bind",
        "listen",
        "accept",
        "getsockname",
        "getpeername",
        "socketpair",
        "setsockopt",
        "getsockopt",
        "clone",
        "fork",
        "vfork",
        "execve",
        "exit",
        "wait4",
        "kill",
        "uname",
        "fcntl",
        "flock",
        "fsync",
        "fdatasync",
        "truncate",
        "ftruncate",
        "getdents",
        "getcwd",
        "chdir",
        "fchdir",
        "rename",
        "mkdir",
        "rmdir",
        "creat",
        "link",
        "unlink",
        "symlink",
        "readlink",
        "chmod",
        "fchmod",
        "chown",
        "fchown",
        "lchown",
        "umask",
        "gettimeofday",
        "getrlimit",
        "getrusage",
        "sysinfo",
        "times",
        "getuid",
        "getgid",
        "setuid",
        "setgid",
        "geteuid",
        "getegid",
        "setpgid",
        "getppid",
        "getpgrp",
        "setsid",
        "setreuid",
        "setregid",
        "getgroups",
        "setgroups",
        "setresuid",
        "getresuid",
        "setresgid",
        "getresgid",
        "sigaltstack",
        "rt_sigaction",
        "rt_sigprocmask",
        "rt_sigreturn",
        "rt_sigsuspend",
        "sigaction",
        "sigprocmask",
        "sigreturn",
        "sigsuspend",
        "statfs",
        "fstatfs",
        "prctl",
        "arch_prctl",
        "futex",
        "set_tid_address",
        "clock_gettime",
        "clock_getres",
        "clock_nanosleep",
        "exit_group",
        "epoll_wait",
        "epoll_ctl",
        "epoll_create",
        "epoll_create1",
        "epoll_pwait",
        "getdents64",
        "set_robust_list",
        "get_robust_list",
        "openat",
        "mkdirat",
        "fchownat",
        "newfstatat",
        "unlinkat",
        "renameat",
        "linkat",
        "symlinkat",
        "readlinkat",
        "fchmodat",
        "faccessat",
        "pselect6",
        "ppoll",
        "splice",
        "tee",
        "vmsplice",
        "pipe2",
        "eventfd",
        "eventfd2",
        "timerfd_create",
        "timerfd_settime",
        "timerfd_gettime",
        "accept4",
        "signalfd4",
        "dup3",
        "getrandom",
        "memfd_create",
        "copy_file_range",
        "statx",
        "preadv2",
        "pwritev2"
      ],
      "action": "SCMP_ACT_ALLOW"
    },
    {
      "names": ["clone3"],
      "action": "SCMP_ACT_ALLOW",
      "args": [
        {
          "index": 0,
          "value": 2114060288,
          "valueTwo": 0,
          "op": "SCMP_CMP_MASKED_EQ"
        }
      ]
    }
  ]
}
```

**Blocked dangerous syscalls:**

| Syscall                        | Risk                 | Block Reason                |
| ------------------------------ | -------------------- | --------------------------- |
| `ptrace`                       | Container escape     | Debug/trace other processes |
| `mount`, `umount`              | Container escape     | Filesystem manipulation     |
| `pivot_root`, `chroot`         | Container escape     | Filesystem root change      |
| `reboot`, `kexec_load`         | Host disruption      | System control              |
| `sethostname`, `setdomainname` | Namespace escape     | Identity manipulation       |
| `init_module`, `finit_module`  | Kernel compromise    | Load kernel modules         |
| `delete_module`                | Kernel compromise    | Remove kernel modules       |
| `acct`                         | Audit evasion        | Process accounting control  |
| `swapon`, `swapoff`            | Resource abuse       | Swap manipulation           |
| `settimeofday`, `adjtimex`     | Clock manipulation   | Time-based attacks          |
| `ioperm`, `iopl`               | Hardware access      | Direct I/O port access      |
| `keyctl`                       | Credential theft     | Kernel keyring access       |
| `add_key`, `request_key`       | Credential theft     | Kernel keyring access       |
| `bpf`                          | Kernel manipulation  | eBPF program loading        |
| `userfaultfd`                  | Side-channel attacks | User-space page faults      |
| `perf_event_open`              | Side-channel attacks | Performance monitoring      |

### 2. AppArmor Profile (Phase 1)

```
#include <tunables/global>

profile ada-agent flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  #include <abstractions/nameservice>

  # === File System ===

  # Read-only access to system paths
  /usr/** r,
  /lib/** r,
  /lib64/** r,
  /etc/passwd r,
  /etc/group r,
  /etc/hosts r,
  /etc/resolv.conf r,
  /etc/ssl/** r,
  /etc/ca-certificates/** r,

  # Workspace (tenant code)
  /workspace/** rwkl,

  # Temp directories
  /tmp/** rwkl,
  /home/node/.npm/** rwkl,

  # Node.js runtime
  owner /proc/*/fd/ r,
  owner /proc/*/fd/* r,
  owner /proc/*/maps r,
  owner /proc/*/stat r,
  owner /proc/*/status r,
  /proc/sys/kernel/osrelease r,
  /proc/sys/vm/overcommit_memory r,
  /proc/cpuinfo r,
  /proc/meminfo r,

  # === Network ===

  # Allow outbound TCP (filtered by NetworkPolicy)
  network inet stream,
  network inet6 stream,

  # DNS
  network inet dgram,
  network inet6 dgram,

  # === Capabilities ===

  # Deny all capabilities except:
  capability setuid,
  capability setgid,
  capability chown,
  capability fowner,
  capability dac_override,
  capability dac_read_search,

  # Explicitly deny dangerous capabilities
  deny capability sys_admin,
  deny capability sys_module,
  deny capability sys_rawio,
  deny capability sys_ptrace,
  deny capability sys_boot,
  deny capability net_admin,
  deny capability net_raw,
  deny capability mknod,
  deny capability audit_write,
  deny capability audit_control,
  deny capability mac_admin,
  deny capability mac_override,
  deny capability syslog,

  # === Signals ===

  # Allow signals to own processes
  signal (send, receive) peer=ada-agent,

  # === Deny Mount ===

  deny mount,
  deny umount,
  deny pivot_root,
}
```

### 3. Pod Security Context

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 1000
  fsGroup: 1000

  # Apply seccomp profile
  seccompProfile:
    type: Localhost
    localhostProfile: ada-agent-seccomp.json

  # Supplemental settings
  supplementalGroups: []
  sysctls: []

containers:
  - name: agent
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      privileged: false

      capabilities:
        drop:
          - ALL
        add: [] # No capabilities needed
```

### 4. gVisor RuntimeClass (Phase 2)

```yaml
# Deploy this RuntimeClass to GKE cluster
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc
scheduling:
  nodeSelector:
    sandbox.gke.io/runtime: gvisor
---
# Update Job template to use gVisor
apiVersion: batch/v1
kind: Job
metadata:
  name: cycle-${EXECUTION_ID}
spec:
  template:
    spec:
      runtimeClassName: gvisor # Add this line
      # ... rest of spec unchanged
```

**GKE Autopilot gVisor enablement:**

```bash
# gVisor is auto-enabled on GKE Autopilot for pods requesting it
# No cluster configuration needed — just add runtimeClassName: gvisor
```

### 5. Resource Limits (Fork Bomb Prevention)

```yaml
# In Job template
resources:
  limits:
    cpu: '1' # Hard CPU cap
    memory: '1Gi' # Hard memory cap
    ephemeral-storage: '2Gi' # Disk cap

# In tenant namespace
apiVersion: v1
kind: LimitRange
metadata:
  name: pod-limits
spec:
  limits:
    - type: Pod
      max:
        cpu: '2'
        memory: '2Gi'
    - type: Container
      max:
        cpu: '1'
        memory: '1Gi'
      defaultRequest:
        cpu: '250m'
        memory: '256Mi'
```

**pids limit (fork bomb mitigation):**

```yaml
# Add to container securityContext
securityContext:
  # GKE Autopilot sets pids limit automatically
  # For self-managed clusters:
  # procMount: Default
  # Requires: kubelet --pod-pids-limit=100
```

---

## Security Matrix

| Attack Vector                 | Phase 1 Mitigation             | Phase 2 Enhancement         |
| ----------------------------- | ------------------------------ | --------------------------- |
| **Container escape (kernel)** | Seccomp + AppArmor             | gVisor user-space kernel    |
| **Privilege escalation**      | No caps, no setuid, non-root   | Unchanged                   |
| **Network exfiltration**      | NetworkPolicy egress allowlist | Unchanged                   |
| **Resource exhaustion**       | LimitRange + ResourceQuota     | Unchanged                   |
| **Fork bomb**                 | pids limit (~100 per pod)      | gVisor stricter enforcement |
| **Secret access**             | RBAC, no hostPath mounts       | Unchanged                   |
| **Side-channel (Spectre)**    | Kernel patches + GKE hardening | gVisor reduces surface      |
| **Cryptomining**              | CPU limits, short TTL (30min)  | Unchanged                   |

---

## Monitoring & Alerting

### Security Events to Monitor

```yaml
# Cloud Logging alert policies

# 1. Seccomp violations
resource.type="k8s_container"
jsonPayload.message=~"seccomp.*EPERM"
severity>=WARNING

# 2. AppArmor denials
resource.type="k8s_container"
jsonPayload.message=~"apparmor.*DENIED"

# 3. Unexpected network egress
resource.type="k8s_pod"
jsonPayload.connection.dest_ip NOT IN [GitHub IPs, OpenAI IPs, ADA IPs]

# 4. ResourceQuota exceeded
resource.type="k8s_namespace"
jsonPayload.reason="FailedCreate"
jsonPayload.message=~"exceeded quota"

# 5. Long-running executions (>30min)
resource.type="k8s_job"
jsonPayload.status="Active"
timestamp < (NOW - 30min)
```

### Incident Response

| Severity | Trigger                     | Response                                  |
| -------- | --------------------------- | ----------------------------------------- |
| **P1**   | Container escape attempt    | Kill pod, quarantine tenant, alert oncall |
| **P2**   | Repeated seccomp violations | Rate-limit tenant, investigate            |
| **P3**   | ResourceQuota exceeded      | Notify tenant, suggest tier upgrade       |
| **P4**   | Execution timeout           | Auto-cancel, log metrics                  |

---

## Implementation Checklist

### Phase 1 (Sprint 3)

- [ ] Create seccomp profile ConfigMap
- [ ] Create AppArmor profile (if not using GKE Autopilot defaults)
- [ ] Update Job template with securityContext
- [ ] Deploy LimitRange + ResourceQuota per tenant
- [ ] Configure Cloud Logging alerts
- [ ] Document incident response runbook
- [ ] E2E test: verify blocked syscalls
- [ ] E2E test: verify resource limits

### Phase 2 (Post-Launch)

- [ ] Enable gVisor RuntimeClass on GKE
- [ ] Validate Node.js + git compatibility under gVisor
- [ ] Benchmark latency impact (+1-2s acceptable)
- [ ] Update Job template with runtimeClassName
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Monitor for gVisor-specific issues

---

## Consequences

### Positive

- **Defense-in-depth:** Multiple independent security layers
- **Compliance-ready:** Seccomp + AppArmor satisfy SOC 2 Type II requirements
- **Graceful degradation:** If one layer fails, others still protect
- **Auditable:** All policies versioned in Git
- **gVisor path clear:** Phase 2 is additive, not architectural change

### Negative

- **Operational complexity:** Seccomp/AppArmor profiles need maintenance
- **Compatibility risk:** Some npm packages may fail under strict seccomp
- **Debug friction:** Security denials can be hard to diagnose

### Mitigations

- **Compatibility:** Test top 100 npm packages under profile
- **Debug:** Add `ADA_DEBUG_SECURITY=1` env var for verbose seccomp logging
- **Maintenance:** Version profiles in Git, automate profile updates

---

## References

- [GKE Autopilot Pod Security](https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-security)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [gVisor Architecture](https://gvisor.dev/docs/architecture_guide/)
- [Seccomp BPF Documentation](https://www.kernel.org/doc/html/latest/userspace-api/seccomp_filter.html)
- [AppArmor Documentation](https://gitlab.com/apparmor/apparmor/-/wikis/Documentation)
- C1086: Managed Execution Implementation Spec
- C1085: Container Isolation Patterns
- #189: Managed Agent Execution

---

_This ADR provides the complete runtime security specification for Sprint 3 Managed Execution. Engineering can implement Phase 1 controls on Day 1, with gVisor upgrade path documented for Phase 2._
