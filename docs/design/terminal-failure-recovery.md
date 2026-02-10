# 🔄 Terminal Failure Recovery Patterns

> Design specification for role handoff patterns when terminal commands fail.
> **Author:** 🌌 The Frontier | **Cycle:** 299 | **Date:** 2026-02-10
> **Related:** Issue #125 (Terminal Mode), Terminal-Bench Adapter Spec
> **Status:** Design | **Target:** Sprint 2 Implementation

---

## Executive Summary

Terminal-Bench tasks require multi-step command execution with error recovery. Unlike code patches (success/failure is binary), terminal operations fail gracefully — commands return non-zero exit codes, stderr output, partial progress. ADA's multi-agent model can leverage specialized roles for diagnosis, recovery, and verification.

**Core Insight:** Failure is information. Each failed command teaches us something about the environment state. Role specialization means we can assign _diagnosis_ to Research, _recovery_ to Engineering, and _verification_ to QA — rather than hoping a single agent gets all three right.

---

## Failure Taxonomy

### Exit Code Categories

| Exit Code | Category   | Meaning                            | Recovery Strategy           |
| --------- | ---------- | ---------------------------------- | --------------------------- |
| 0         | Success    | Command completed                  | Proceed to next step        |
| 1         | General    | Generic failure                    | Analyze stderr, diagnose    |
| 2         | Misuse     | Invalid arguments, syntax errors   | Fix command syntax          |
| 126       | Not exec   | Permission denied (not executable) | chmod +x or sudo            |
| 127       | Not found  | Command not found                  | Install package or fix PATH |
| 128+n     | Signal     | Terminated by signal n             | Check resources, timeouts   |
| 130       | Interrupt  | SIGINT (Ctrl+C)                    | Retry with timeout increase |
| 137       | OOM Killed | SIGKILL from OOM                   | Reduce memory usage         |
| 139       | Segfault   | SIGSEGV                            | Debug binary/library issues |

### Stderr Pattern Categories

| Pattern              | Indicates                 | Recovery Action             |
| -------------------- | ------------------------- | --------------------------- |
| `ModuleNotFound`     | Missing Python dependency | pip install                 |
| `command not found`  | Missing system package    | apt-get/brew install        |
| `Permission denied`  | Filesystem permissions    | chmod/chown or sudo         |
| `Connection refused` | Service not running       | Start service, check ports  |
| `No space left`      | Disk full                 | Clean up, remove temp files |
| `Timeout`            | Operation took too long   | Retry with higher timeout   |
| `Syntax error`       | Invalid command/script    | Fix syntax                  |

---

## Role Handoff Protocol

### Standard Flow (Success Path)

```
┌─────────────────────────────────────────────────────────────┐
│                   Normal Dispatch Cycle                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Research  → Analyze task, identify approach                 │
│     ↓                                                        │
│  Product   → Define success criteria (exit code 0, output)   │
│     ↓                                                        │
│  Engineering → Execute command(s)                            │
│     ↓                                                        │
│  QA        → Verify output, check side effects               │
│     ↓                                                        │
│  Ops       → Clean up temp files, validate state             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Recovery Flow (Failure Path)

When Engineering's command fails (exit code ≠ 0):

```
┌─────────────────────────────────────────────────────────────┐
│                  Terminal Recovery Protocol                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Engineering → Command fails (exit ≠ 0)                      │
│     ↓                                                        │
│  Research  ← HANDOFF: Diagnose failure                       │
│     │         - Parse stderr                                 │
│     │         - Classify failure type                        │
│     │         - Propose recovery action                      │
│     ↓                                                        │
│  Engineering → Execute recovery action                       │
│     │         - If success → continue                        │
│     │         - If fail → escalate                           │
│     ↓                                                        │
│  QA        → Verify recovery worked                          │
│     │         - Run original command                         │
│     │         - Check expected output                        │
│     ↓                                                        │
│  Ops       → Log failure pattern for future reference        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Escalation Protocol

If recovery fails after 2 attempts:

```
┌─────────────────────────────────────────────────────────────┐
│                   Escalation Protocol                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Attempt 1: Engineering fix based on Research diagnosis      │
│     ↓ (fail)                                                 │
│  Attempt 2: Alternative approach suggested by Research       │
│     ↓ (fail)                                                 │
│  Escalate: Full team analysis                                │
│     - Research: Deep dive into logs, environment state       │
│     - Design: UX review of command sequence                  │
│     - Product: Reassess if task is completable               │
│     ↓                                                        │
│  Decision: Retry with new approach OR mark task blocked      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Patterns

### Pattern 1: Diagnose-Fix-Verify (DFV)

The most common recovery pattern for terminal failures.

```typescript
interface DiagnoseFixVerify {
  diagnose: {
    role: 'research';
    action: 'analyze_failure';
    inputs: {
      command: string;
      exitCode: number;
      stderr: string;
      stdout: string;
    };
    outputs: {
      failureType: FailureCategory;
      rootCause: string;
      suggestedFix: string;
    };
  };
  fix: {
    role: 'engineering';
    action: 'execute_fix';
    inputs: {
      suggestedFix: string;
      originalCommand: string;
    };
    outputs: {
      fixCommand: string;
      fixResult: TerminalResult;
    };
  };
  verify: {
    role: 'qa';
    action: 'verify_recovery';
    inputs: {
      originalCommand: string;
      expectedOutput: string;
    };
    outputs: {
      success: boolean;
      actualOutput: string;
    };
  };
}
```

### Pattern 2: Environment Reset

When state pollution causes cascading failures.

```typescript
interface EnvironmentReset {
  detect: {
    role: 'ops';
    trigger: 'multiple_failures_same_category';
    action: 'check_environment_state';
  };
  reset: {
    role: 'ops';
    action: 'reset_environment';
    commands: [
      'rm -rf /tmp/ada-*', // Clean temp files
      'pip cache purge', // Clear pip cache
      'npm cache clean --force', // Clear npm cache
      'pkill -f <hung_process>', // Kill hung processes
    ];
  };
  retry: {
    role: 'engineering';
    action: 'retry_from_last_checkpoint';
  };
}
```

### Pattern 3: Dependency Resolution

When commands fail due to missing dependencies.

```typescript
interface DependencyResolution {
  detect: {
    patterns: [
      /ModuleNotFoundError: No module named '(\w+)'/,
      /(\w+): command not found/,
      /cannot open shared object file/,
    ];
  };
  resolve: {
    role: 'engineering';
    strategies: [
      { pattern: 'ModuleNotFoundError', action: 'pip install {module}' },
      { pattern: 'command not found', action: 'apt-get install {package}' },
      { pattern: 'shared object', action: 'ldconfig && retry' },
    ];
  };
  verify: {
    role: 'qa';
    action: 'run_original_command';
  };
}
```

### Pattern 4: Progressive Fallback

When multiple approaches exist for the same goal.

```typescript
interface ProgressiveFallback {
  attempts: [
    { approach: 'pip install package'; confidence: 0.9 },
    { approach: 'pip install package==version'; confidence: 0.7 },
    { approach: 'pip install --user package'; confidence: 0.5 },
    { approach: 'apt-get install python3-package'; confidence: 0.3 },
  ];
  strategy: 'try_highest_confidence_first';
  maxAttempts: 3;
  escalateAfter: 3;
}
```

---

## Memory Integration

### Failure Memory Format

Each failure is logged to memory bank for pattern learning:

```markdown
### Terminal Failure Log

| Cycle | Command             | Exit | Category    | Recovery       | Success |
| ----- | ------------------- | ---- | ----------- | -------------- | ------- |
| 299   | `pip install torch` | 137  | OOM         | Reduced batch  | ✅      |
| 298   | `npm test`          | 1    | Missing dep | npm install    | ✅      |
| 297   | `make build`        | 2    | Syntax      | Fixed Makefile | ✅      |
```

### Pattern Learning

After 10+ failures of similar type, Ops proposes a rule:

```markdown
### Learned Recovery Rules

**R-TERM-001: Python Module Not Found**

- Pattern: `ModuleNotFoundError: No module named 'X'`
- Recovery: `pip install X`
- If fail: `pip install X --user`
- If fail: Check requirements.txt for version constraint

**R-TERM-002: OOM Kill**

- Pattern: Exit code 137
- Recovery: Add swap / reduce parallelism
- If fail: Split task into smaller chunks
```

---

## Role Playbook Amendments

### Research Playbook Addition

```markdown
## Terminal Failure Diagnosis

When handed a terminal failure:

1. **Parse stderr** — What's the actual error message?
2. **Classify failure** — Use exit code + stderr pattern
3. **Check environment** — Is this a state problem or command problem?
4. **Propose fix** — Specific command, not vague guidance
5. **Estimate confidence** — How likely is this fix to work?

Example diagnosis:

> Exit 127: `jq: command not found`
> Category: Missing package
> Fix: `apt-get install -y jq`
> Confidence: 95%
```

### Engineering Playbook Addition

```markdown
## Terminal Recovery Execution

When Research provides a recovery suggestion:

1. **Execute the fix** — Run the suggested command
2. **Check the result** — Did the fix itself succeed?
3. **Retry original** — Run the original failing command
4. **Report outcome** — Success, partial, or still failing

If still failing after 2 attempts:

- Request alternative approach from Research
- Or escalate to full team analysis
```

### QA Playbook Addition

```markdown
## Terminal Recovery Verification

After Engineering reports recovery success:

1. **Run original command** — Not just the fix, the original task
2. **Check expected output** — Does it match success criteria?
3. **Check side effects** — Any unintended changes?
4. **Confirm or reject** — Explicitly state recovery worked or not

Don't just check exit code 0 — verify the actual output is correct.
```

### Ops Playbook Addition

```markdown
## Terminal Failure Logging

After each recovery attempt:

1. **Log the failure** — Command, exit code, category
2. **Log the recovery** — What was tried
3. **Log the outcome** — Success or failure
4. **Pattern check** — Have we seen this 3+ times?

If pattern detected:

- Propose a learned rule (R-TERM-XXX)
- Add to memory bank recovery rules section
```

---

## Metrics

### Recovery Metrics to Track

| Metric                 | Description                         | Target |
| ---------------------- | ----------------------------------- | ------ |
| Recovery Success Rate  | Failures recovered / Total failures | > 60%  |
| Mean Recovery Attempts | Avg attempts before success         | < 2.5  |
| Diagnosis Accuracy     | Correct root cause identification   | > 80%  |
| Time to Recovery       | Seconds from failure to recovery    | < 120s |
| Pattern Learning Rate  | New rules learned per 50 failures   | 2-5    |

### Per-Category Recovery Rates

Track recovery success by failure category:

| Category        | Expected Recovery Rate | Notes                        |
| --------------- | ---------------------- | ---------------------------- |
| Missing Package | 90%+                   | Simple install usually works |
| Permission      | 85%+                   | chmod/sudo usually works     |
| Syntax Error    | 70%                    | Harder to auto-fix           |
| OOM             | 50%                    | Requires strategy change     |
| Segfault        | 30%                    | Often needs deep debugging   |

---

## Integration with Terminal Mode

### Command Execution with Recovery

```typescript
async function executeWithRecovery(
  command: string,
  maxAttempts: number = 3
): Promise<TerminalResult> {
  let attempts = 0;
  let lastResult: TerminalResult;

  while (attempts < maxAttempts) {
    attempts++;
    lastResult = await executeCommand(command);

    if (lastResult.exitCode === 0) {
      return lastResult;
    }

    // Handoff to Research for diagnosis
    const diagnosis = await diagnoseFailure(lastResult);

    if (diagnosis.recoverable) {
      // Execute recovery command
      await executeCommand(diagnosis.recoveryCommand);
      // Loop will retry original command
    } else {
      break; // Unrecoverable, escalate
    }
  }

  // Escalate after max attempts
  return escalateToTeam(command, lastResult);
}
```

### Recovery Context in Memory

```typescript
interface RecoveryContext {
  taskId: string;
  originalCommand: string;
  failureHistory: Array<{
    attempt: number;
    command: string;
    exitCode: number;
    stderr: string;
    diagnosis: string;
    recoveryAction: string;
    recoverySuccess: boolean;
  }>;
  finalOutcome: 'success' | 'blocked' | 'partial';
}
```

---

## Open Questions Resolved

### Q: How should roles hand off after command failure?

**A:** Immediate handoff to Research for diagnosis, then back to Engineering for fix execution, then QA for verification. This is the DFV (Diagnose-Fix-Verify) pattern.

### Q: What's the max recovery attempts before giving up?

**A:** 3 attempts per failure (same command), then escalate. Total command limit (50) caps runaway recovery loops.

### Q: How do we learn from failures?

**A:** Ops logs every failure/recovery. After 3+ instances of the same pattern, a learned rule (R-TERM-XXX) is proposed and added to memory bank.

---

## Next Steps

1. **Engineering (Sprint 2):** Implement recovery hooks in terminal mode
2. **QA:** Add recovery verification to smoke tests
3. **Ops:** Create failure logging template in memory bank
4. **Research:** Build stderr pattern classifier

---

## References

- [Terminal-Bench Adapter Spec](./terminal-bench-adapter-spec.md) — Parent specification
- [Issue #125](https://github.com/your-repo/issues/125) — Terminal mode implementation
- [Issue #108](https://github.com/your-repo/issues/108) — Reflexion system (failure learning)

---

_🌌 The Frontier | Cycle 299 | Terminal Failure Recovery Patterns_
_"Failure is information. Multi-agent recovery is how we use it."_
