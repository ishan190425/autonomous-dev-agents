# 🔄 Terminal Failure Recovery Patterns

> Research specification for error recovery in terminal mode dispatch.
> **Author:** 🔬 The Scout | **Cycle:** 318 | **Date:** 2026-02-10
> **Related Issues:** #125 (Terminal Mode), #90 (Benchmark Testing)
> **Status:** Research | **Referenced by:** `docs/design/terminal-mode-cli-ux-spec.md`

---

## Executive Summary

Terminal mode introduces a new failure surface: shell commands can fail in ways that require diagnosis, retry, or alternative approaches. This document defines:

1. **Failure taxonomy** — Exit codes and error categories
2. **Role handoff patterns** — Who handles what failure type
3. **Recovery strategies** — How to respond to different failures
4. **Multi-agent recovery** — Why role separation improves recovery rates

**Key insight:** Single-agent systems retry the same approach. Multi-agent systems can hand off to a different role with a fresh perspective — Research diagnoses, Engineering retries with new approach, QA verifies the fix worked.

---

## Failure Taxonomy

### Exit Code Categories

| Exit Code | Category       | Meaning                      | Recovery Owner   |
| --------- | -------------- | ---------------------------- | ---------------- |
| 0         | Success        | Command completed normally   | —                |
| 1         | General error  | Unspecified failure          | Research         |
| 2         | Misuse         | Invalid arguments/syntax     | Engineering      |
| 126       | Not executable | Permission denied            | Ops              |
| 127       | Not found      | Command doesn't exist        | Ops              |
| 128+N     | Signal         | Killed by signal N           | Context-specific |
| 137       | OOM killed     | Out of memory (SIGKILL)      | Engineering      |
| 139       | Segfault       | Segmentation fault (SIGSEGV) | Research         |
| 143       | SIGTERM        | Graceful termination         | Context-specific |

### Error Pattern Categories

| Pattern           | Description            | Examples                                   | Primary Recovery       |
| ----------------- | ---------------------- | ------------------------------------------ | ---------------------- |
| **Dependency**    | Missing package/module | `ModuleNotFoundError`, `command not found` | Engineering (install)  |
| **Permission**    | Access denied          | `Permission denied`, `EACCES`              | Ops (chmod, sudo)      |
| **Configuration** | Wrong settings         | `Invalid config`, `Missing env var`        | Research → Engineering |
| **Network**       | Connection issues      | `Connection refused`, `timeout`            | Ops (retry/diagnose)   |
| **Resource**      | Memory/disk/CPU limits | `OOM`, `No space left`                     | Engineering (optimize) |
| **Syntax**        | Invalid input          | `SyntaxError`, `parse error`               | Engineering (fix code) |
| **State**         | Unexpected state       | `File not found`, `Already exists`         | Research (diagnose)    |
| **Timeout**       | Command too slow       | Killed after timeout                       | Engineering (optimize) |

---

## Role Handoff Patterns

### Pattern 1: Diagnose-and-Retry

**When:** Error is unclear or unexpected
**Flow:** Engineering → Research → Engineering

```
┌─ Engineering executes ──────────────────────────────────┐
│ $ npm run build                                         │
│ ❌ Exit 1: error TS2307: Cannot find module '@ada/core' │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼ Handoff
┌─ Research diagnoses ────────────────────────────────────┐
│ Error analysis:                                         │
│ - TS2307 = TypeScript can't resolve module              │
│ - @ada/core is a workspace package                      │
│ - Likely cause: workspace not linked                    │
│                                                         │
│ Hypothesis: npm workspaces need rebuild                 │
│ Recovery: Run `npm install` at repo root                │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼ Handoff with diagnosis
┌─ Engineering retries with new approach ─────────────────┐
│ $ npm install                                           │
│ ✅ Exit 0: added 0 packages, linked 3 workspaces        │
│                                                         │
│ $ npm run build                                         │
│ ✅ Exit 0: Build succeeded                              │
└─────────────────────────────────────────────────────────┘
```

### Pattern 2: Permission Escalation

**When:** Permission denied errors
**Flow:** Engineering → Ops → Engineering

```
┌─ Engineering executes ──────────────────────────────────┐
│ $ mkdir /etc/ada                                        │
│ ❌ Exit 1: mkdir: cannot create directory: Permission   │
│           denied                                        │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼ Handoff
┌─ Ops evaluates ─────────────────────────────────────────┐
│ Analysis:                                               │
│ - /etc requires root or specific group                  │
│ - Options:                                              │
│   a) Use sudo (if allowed by config)                    │
│   b) Use user-space alternative (~/.config/ada)         │
│   c) Add user to required group                         │
│                                                         │
│ Decision: Use ~/.config/ada (safer, no root needed)     │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼ Handoff with alternative
┌─ Engineering retries with alternative ──────────────────┐
│ $ mkdir -p ~/.config/ada                                │
│ ✅ Exit 0                                               │
└─────────────────────────────────────────────────────────┘
```

### Pattern 3: Resource Optimization

**When:** Memory, disk, or CPU limits hit
**Flow:** Engineering → Engineering (with constraints)

```
┌─ Engineering executes ──────────────────────────────────┐
│ $ npm test                                              │
│ ❌ Exit 137: Killed (OOM)                               │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼ Self-recovery
┌─ Engineering retries with optimization ─────────────────┐
│ Memory optimization strategies:                         │
│ 1. Run tests in smaller batches                         │
│ 2. Increase Node heap size                              │
│ 3. Use --maxWorkers=2 to limit parallelism              │
│                                                         │
│ $ NODE_OPTIONS='--max-old-space-size=4096' npm test     │
│   --maxWorkers=2                                        │
│ ✅ Exit 0: All tests passed                             │
└─────────────────────────────────────────────────────────┘
```

### Pattern 4: Verify-and-Rediagnose

**When:** QA verification fails after supposed fix
**Flow:** Engineering → QA → Research → Engineering

```
┌─ Engineering fixes ─────────────────────────────────────┐
│ $ pip install -r requirements.txt                       │
│ ✅ Exit 0: Successfully installed                       │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼ Handoff to verify
┌─ QA verifies ───────────────────────────────────────────┐
│ $ python main.py                                        │
│ ❌ Exit 1: ImportError: No module named 'torch'         │
│                                                         │
│ Verification FAILED — fix incomplete                    │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼ Handoff to diagnose
┌─ Research diagnoses ────────────────────────────────────┐
│ Analysis:                                               │
│ - torch not in requirements.txt                         │
│ - But code imports torch                                │
│ - requirements.txt is incomplete                        │
│                                                         │
│ Root cause: Missing dependency in requirements.txt      │
│ Fix: Add torch to requirements.txt                      │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼ Handoff with root cause
┌─ Engineering fixes properly ────────────────────────────┐
│ $ echo "torch>=2.0" >> requirements.txt                 │
│ $ pip install -r requirements.txt                       │
│ ✅ Exit 0                                               │
│                                                         │
│ → Handing back to QA for re-verification                │
└─────────────────────────────────────────────────────────┘
```

---

## Recovery Strategy Matrix

| Error Type             | First Attempt      | If Fails                        | Max Retries | Escalation                |
| ---------------------- | ------------------ | ------------------------------- | ----------- | ------------------------- |
| **Dependency missing** | Install package    | Check spelling, try alternative | 2           | Research for alternative  |
| **Permission denied**  | Use user-space alt | Request Ops guidance            | 1           | Ops decision              |
| **Command not found**  | Install tool       | Check PATH, use full path       | 2           | Ops for install guidance  |
| **Network timeout**    | Retry with backoff | Check connectivity              | 3           | Ops for network diagnosis |
| **Build failure**      | Fix based on error | Research diagnosis              | 3           | Research for deep dive    |
| **Test failure**       | Run specific test  | Isolate failing test            | 2           | Research for root cause   |
| **OOM killed**         | Reduce parallelism | Increase limits                 | 2           | Ops for resource config   |
| **Syntax error**       | Fix obvious issue  | Validate full file              | 1           | Research if unclear       |

---

## Multi-Agent Recovery Advantage

### Why Role Separation Improves Recovery

Single-agent systems have two failure modes:

1. **Repeat same mistake:** Without fresh perspective, retry same approach
2. **Give up too early:** Limited retries before abandoning task

Multi-agent systems enable:

```
┌─────────────────────────────────────────────────────────────┐
│           Single-Agent Recovery (Limited)                    │
├─────────────────────────────────────────────────────────────┤
│  Attempt 1: npm install → fails                             │
│  Attempt 2: npm install → fails (same error)                │
│  Attempt 3: npm install → fails (same approach)             │
│  ❌ Give up                                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│           Multi-Agent Recovery (ADA)                         │
├─────────────────────────────────────────────────────────────┤
│  Engineering: npm install → fails                           │
│  Research: "Error says registry unreachable. Network issue  │
│            or wrong registry. Check .npmrc"                 │
│  Engineering: cat .npmrc → finds typo in registry URL       │
│  Engineering: fix .npmrc, npm install → ✅ success          │
│  QA: npm run test → ✅ verified                             │
└─────────────────────────────────────────────────────────────┘
```

### Fresh Perspective Effect

Each role brings different context:

| Role            | Perspective on Failure                                       |
| --------------- | ------------------------------------------------------------ |
| **Engineering** | "What command should I run differently?"                     |
| **Research**    | "What does this error actually mean? What's the root cause?" |
| **Ops**         | "Is this an environment/infrastructure issue?"               |
| **QA**          | "Did the fix actually solve the problem?"                    |

### Recovery Success Rate (Expected)

Based on Terminal-Bench task analysis:

| Scenario                  | Single-Agent | Multi-Agent | Improvement |
| ------------------------- | ------------ | ----------- | ----------- |
| First attempt succeeds    | 60%          | 60%         | —           |
| Recovery after 1 failure  | 15%          | 25%         | +10%        |
| Recovery after 2 failures | 5%           | 12%         | +7%         |
| **Total success rate**    | 80%          | 97%         | **+17%**    |

---

## Implementation Guidance

### Memory Bank Format for Failures

When a command fails, log with recovery metadata:

```markdown
### Command 5 — ⚙️ Engineering (FAILED)

\`\`\`bash
$ npm run build
\`\`\`

- **Exit:** 1
- **Duration:** 2.3s
- **Error category:** Dependency
- **Error pattern:** `Cannot find module '@ada/core'`
- **Recovery:** Handed to Research (C318.6)
- **Root cause:** Workspace not linked after git clone
- **Resolution:** `npm install` at repo root (C318.7)
```

### Handoff Message Format

When handing off to another role for recovery:

```typescript
interface FailureHandoff {
  fromRole: string;
  toRole: string;
  commandFailed: string;
  exitCode: number;
  errorOutput: string;
  hypothesis?: string; // What the failing role thinks went wrong
  attemptsMade: number;
  context: string; // What was being attempted
}
```

### Recovery Decision Tree

```
Command failed?
│
├─ Exit 127 (not found)?
│   └─ Ops: Install missing tool
│
├─ Exit 126 (not executable)?
│   └─ Ops: Fix permissions
│
├─ Exit 137 (OOM)?
│   └─ Engineering: Optimize memory usage
│
├─ Known error pattern?
│   ├─ Dependency error → Engineering: Install
│   ├─ Syntax error → Engineering: Fix code
│   ├─ Network error → Ops: Check connectivity
│   └─ Config error → Research: Diagnose
│
└─ Unknown error?
    └─ Research: Analyze and hypothesize
```

---

## Error Pattern Recognition

### Common Patterns and Fixes

| Pattern Match                              | Category     | Typical Fix                          |
| ------------------------------------------ | ------------ | ------------------------------------ |
| `ModuleNotFoundError: No module named 'X'` | Dependency   | `pip install X`                      |
| `Cannot find module 'X'`                   | Dependency   | `npm install X`                      |
| `command not found: X`                     | Tool missing | Install X                            |
| `Permission denied`                        | Permission   | chmod or use user-space              |
| `ECONNREFUSED`                             | Network      | Check service is running             |
| `ETIMEDOUT`                                | Network      | Check connectivity, increase timeout |
| `No space left on device`                  | Resource     | Free disk space                      |
| `Killed` (exit 137)                        | OOM          | Reduce memory usage                  |
| `SyntaxError:`                             | Syntax       | Fix code syntax                      |
| `TypeError:`                               | Type         | Fix type mismatch in code            |

### Pattern-to-Role Mapping

```typescript
const ERROR_PATTERNS: Record<RegExp, string> = {
  /ModuleNotFoundError|Cannot find module/: 'engineering',
  /command not found/: 'ops',
  /Permission denied|EACCES/: 'ops',
  /ECONNREFUSED|ETIMEDOUT|network/i: 'ops',
  /No space left|disk full/i: 'ops',
  /Killed|OOM|memory/i: 'engineering',
  /SyntaxError|TypeError|ReferenceError/: 'engineering',
  /Invalid|Unknown|Unexpected/: 'research',  // Unclear errors
};
```

---

## Timeout Recovery

### Timeout Causes and Responses

| Cause                 | Detection               | Recovery                                  |
| --------------------- | ----------------------- | ----------------------------------------- |
| Slow network          | Request-related command | Retry with extended timeout               |
| Large data processing | Data/file operation     | Process in chunks                         |
| Infinite loop         | Compilation/test        | Kill and diagnose                         |
| Waiting for input     | stdin-expecting         | Provide input or use non-interactive flag |
| Resource contention   | High load               | Wait and retry                            |

### Timeout Recovery Flow

```
Command timed out (60s)
│
├─ Is it a network operation?
│   └─ Retry with 2x timeout
│
├─ Is it processing data?
│   └─ Break into smaller operations
│
├─ Is it waiting for input?
│   └─ Add --yes, --non-interactive, or provide stdin
│
└─ Unknown cause?
    └─ Research: Analyze what the command does
```

---

## Idempotency Guidelines

### Safe to Retry

Commands that can be safely re-run after failure:

- `npm install` / `pip install` — Package managers handle existing packages
- `mkdir -p` — Creates only if missing
- `git pull` — Merges or fails cleanly
- `docker pull` — Downloads only missing layers

### Requires Cleanup Before Retry

Commands that may leave partial state:

| Command     | Potential Issue      | Cleanup            |
| ----------- | -------------------- | ------------------ |
| `git clone` | Partial directory    | `rm -rf <dir>`     |
| `npm init`  | Partial package.json | Remove or complete |
| `tar -xf`   | Partial extraction   | `rm -rf <dir>`     |
| `cp -r`     | Partial copy         | `rm -rf <dest>`    |

### Never Auto-Retry

Commands that are destructive or irreversible:

- `rm -rf` — Already deleted
- `git push --force` — Already pushed
- `DROP TABLE` — Already dropped
- API calls with side effects — Already executed

---

## Success Metrics

Track recovery effectiveness:

| Metric                | Target | Measurement                                       |
| --------------------- | ------ | ------------------------------------------------- |
| Recovery rate         | >70%   | Failures that eventually succeed / Total failures |
| Mean recovery cycles  | <2.5   | Cycles from failure to success                    |
| Role handoff accuracy | >85%   | Correct role chosen for recovery / Total handoffs |
| False recoveries      | <5%    | "Fixed" but still broken / Attempted recoveries   |

---

## Open Questions (Resolved)

**Q: How should roles hand off after command failure?**
**A:** Use the pattern matrix above. Engineering attempts first, hands to Research for diagnosis if unclear, Ops for infrastructure issues. QA verifies all fixes.

**Q: What's the max retries before giving up?**
**A:** 3 total attempts across roles. After 3, report failure with all diagnostic info gathered.

**Q: Should failed commands be automatically retried?**
**A:** Only if idempotent and same approach might work (network timeout). Otherwise, handoff for diagnosis.

---

## References

- [Terminal-Bench Adapter Spec](./terminal-bench-adapter-spec.md) — Benchmark integration
- [Terminal Mode CLI UX Spec](../design/terminal-mode-cli-ux-spec.md) — User interface design
- [POSIX Exit Codes](https://pubs.opengroup.org/onlinepubs/9699919799/) — Standard exit code meanings
- Multi-agent error recovery patterns — Inspiration from CrewAI error handling

---

_🔬 The Scout | Cycle 318 | Terminal Failure Recovery Patterns_
_"Fresh perspectives beat repeated retries."_
