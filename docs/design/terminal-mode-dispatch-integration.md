# 🌌 Terminal Mode Dispatch Integration

> Platform architecture for integrating terminal command execution into the ADA dispatch system.
> **Author:** 🌌 The Frontier | **Cycle:** 319 | **Date:** 2026-02-10
> **Related Issues:** #125 (Terminal Mode), #90 (Benchmark Testing)
> **References:** [Terminal Mode CLI UX Spec](./terminal-mode-cli-ux-spec.md), [Failure Recovery Patterns](../research/terminal-failure-recovery.md)
> **Status:** Design | **Target:** Sprint 2 Implementation

---

## Executive Summary

This document specifies how Terminal Mode (`--mode=terminal`) integrates with the ADA dispatch system at the platform level. It bridges Design's UX spec (what users see) and Research's failure recovery patterns (how to handle failures) with the actual dispatch architecture (how it works internally).

**Key architectural decisions:**

1. **Command executor as dispatch middleware** — Injected into the dispatch cycle, not a separate system
2. **Typed handoff protocol** — Structured failure handoffs between roles
3. **Terminal state in rotation.json** — Persists across cycles for recovery
4. **Observable command execution** — Metrics, tracing, cost tracking

---

## Architecture Overview

### Current Dispatch Flow

```
ada dispatch start
      │
      ▼
┌─────────────────────────────────────────────────────┐
│                  Dispatch Cycle                      │
│                                                      │
│  1. Load rotation state                              │
│  2. Determine current role                           │
│  3. Load role playbook                               │
│  4. Execute role action (LLM decides what to do)    │
│  5. Update memory bank                               │
│  6. Advance rotation                                 │
│                                                      │
└─────────────────────────────────────────────────────┘
      │
      ▼
ada dispatch complete
```

### Terminal Mode Dispatch Flow

```
ada dispatch start --mode=terminal
      │
      ▼
┌─────────────────────────────────────────────────────┐
│              Terminal Mode Dispatch Cycle            │
│                                                      │
│  1. Load rotation state + terminal state             │
│  2. Determine current role                           │
│  3. Check for pending recovery handoffs              │
│  4. Load role playbook + terminal capabilities       │
│  5. Execute role action                              │
│     ├─ LLM can emit COMMAND actions                 │
│     ├─ Command executor runs shell commands         │
│     ├─ Results fed back to LLM                      │
│     └─ Loop until role action complete              │
│  6. Handle failures (handoff if needed)             │
│  7. Update memory bank + terminal history           │
│  8. Advance rotation (or handoff to recovery role)  │
│                                                      │
└─────────────────────────────────────────────────────┘
      │
      ▼
ada dispatch complete --action "..." [--terminal-log]
```

---

## Command Executor Layer

### Position in Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     packages/core                            │
├─────────────────────────────────────────────────────────────┤
│  src/                                                        │
│  ├─ dispatch/                                                │
│  │   ├─ dispatcher.ts      ← Main dispatch orchestration    │
│  │   ├─ modes/                                               │
│  │   │   ├─ default.ts     ← Current dispatch mode          │
│  │   │   ├─ terminal.ts    ← Terminal mode (NEW)            │
│  │   │   └─ consultant.ts  ← Docs-only mode (future)        │
│  │   └─ middleware/                                          │
│  │       └─ command-executor.ts  ← Shell execution (NEW)    │
│  ├─ terminal/              ← Terminal-specific modules (NEW) │
│  │   ├─ executor.ts        ← Command runner                 │
│  │   ├─ parser.ts          ← Output parsing                 │
│  │   ├─ recovery.ts        ← Failure recovery logic         │
│  │   ├─ sandbox.ts         ← Docker sandbox integration     │
│  │   └─ types.ts           ← Terminal type definitions      │
│  └─ ...                                                      │
└─────────────────────────────────────────────────────────────┘
```

### Command Executor Interface

```typescript
// packages/core/src/terminal/types.ts

export interface CommandRequest {
  command: string;
  workingDir?: string;
  env?: Record<string, string>;
  timeout?: number;
  sandbox?: boolean;
  stdin?: string;
}

export interface CommandResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  killed: boolean;
  signal?: string;
}

export interface CommandExecutor {
  execute(request: CommandRequest): Promise<CommandResult>;
  getState(): TerminalState;
  reset(): void;
}
```

### Execution Implementation

```typescript
// packages/core/src/terminal/executor.ts

import { spawn } from 'child_process';
import { CommandRequest, CommandResult, CommandExecutor } from './types';

export class ShellExecutor implements CommandExecutor {
  private state: TerminalState;
  private config: TerminalConfig;

  constructor(config: TerminalConfig) {
    this.config = config;
    this.state = {
      cwd: process.cwd(),
      env: { ...process.env },
      commandCount: 0,
      history: [],
    };
  }

  async execute(request: CommandRequest): Promise<CommandResult> {
    // Enforce command limits
    if (this.state.commandCount >= this.config.maxCommands) {
      throw new CommandLimitError(this.config.maxCommands);
    }

    const startTime = Date.now();
    const timeout = request.timeout ?? this.config.commandTimeout;

    // Spawn shell process
    const proc = spawn(this.config.shell, ['-c', request.command], {
      cwd: request.workingDir ?? this.state.cwd,
      env: { ...this.state.env, ...request.env },
      timeout: timeout * 1000,
    });

    // Collect output
    const result = await this.collectOutput(proc, startTime, timeout);

    // Track command in state
    this.state.commandCount++;
    this.state.history.push(result);

    // Update cwd if command was `cd`
    this.handleCdCommand(request.command, result);

    return result;
  }

  // ... implementation details
}
```

---

## Terminal State Management

### State Schema

Terminal state persists in `rotation.json` under a new `terminal` key:

```typescript
// packages/core/src/terminal/types.ts

export interface TerminalState {
  cwd: string;
  env: Record<string, string>;
  commandCount: number;
  history: CommandHistoryEntry[];
  pendingRecovery?: RecoveryHandoff;
}

export interface CommandHistoryEntry {
  cycle: number;
  role: string;
  command: string;
  exitCode: number;
  durationMs: number;
  timestamp: string;
  recovery?: RecoveryInfo;
}

export interface RecoveryHandoff {
  fromRole: string;
  toRole: string;
  cycle: number;
  failedCommand: string;
  exitCode: number;
  errorOutput: string;
  hypothesis?: string;
  attemptCount: number;
}
```

### rotation.json Extension

```json
{
  "current_index": 7,
  "last_role": "engineering",
  "last_run": "2026-02-10T12:00:00.000Z",
  "cycle_count": 319,
  "history": [
    /* ... */
  ],
  "terminal": {
    "enabled": true,
    "cwd": "/home/user/project",
    "commandCount": 23,
    "lastCommand": {
      "command": "npm run build",
      "exitCode": 0,
      "timestamp": "2026-02-10T11:59:45.000Z"
    },
    "pendingRecovery": null
  }
}
```

### State Lifecycle

```
┌─ Dispatch Start ─────────────────────────────────────────────┐
│  1. Load rotation.json                                       │
│  2. If terminal.pendingRecovery exists:                      │
│     - Override current role to recovery target               │
│     - Inject recovery context into role prompt               │
│  3. Initialize CommandExecutor with saved state              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ During Dispatch ────────────────────────────────────────────┐
│  • Commands update terminal.commandCount                     │
│  • Failed commands may set terminal.pendingRecovery          │
│  • cwd changes tracked in terminal.cwd                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ Dispatch Complete ──────────────────────────────────────────┐
│  1. Save terminal state to rotation.json                     │
│  2. If pendingRecovery set:                                  │
│     - Don't advance rotation                                 │
│     - Next cycle goes to recovery role                       │
│  3. Log terminal history to memory bank                      │
└──────────────────────────────────────────────────────────────┘
```

---

## Role Handoff Protocol

### Handoff Trigger

From Research's failure recovery patterns, handoffs occur when:

1. Command fails with unclear error → handoff to Research
2. Permission denied → handoff to Ops
3. Infrastructure issue → handoff to Ops
4. QA verification needed → handoff to QA

### Handoff Implementation

```typescript
// packages/core/src/terminal/recovery.ts

import { RecoveryHandoff, CommandResult } from './types';
import { ERROR_PATTERNS } from './patterns';

export function determineRecoveryTarget(
  currentRole: string,
  result: CommandResult,
  attemptCount: number
): string | null {
  // Max 3 attempts across all roles
  if (attemptCount >= 3) {
    return null; // Give up, log comprehensive failure
  }

  // Match error pattern to recovery role
  for (const [pattern, targetRole] of Object.entries(ERROR_PATTERNS)) {
    if (new RegExp(pattern, 'i').test(result.stderr + result.stdout)) {
      // Don't hand off to self
      if (targetRole !== currentRole) {
        return targetRole;
      }
    }
  }

  // Unknown error → Research for diagnosis
  if (currentRole !== 'research') {
    return 'research';
  }

  return null;
}

export function createRecoveryHandoff(
  currentRole: string,
  targetRole: string,
  cycle: number,
  result: CommandResult,
  hypothesis?: string
): RecoveryHandoff {
  return {
    fromRole: currentRole,
    toRole: targetRole,
    cycle,
    failedCommand: result.command,
    exitCode: result.exitCode,
    errorOutput: result.stderr.slice(0, 1000), // Truncate long errors
    hypothesis,
    attemptCount: 1,
  };
}
```

### Handoff in Rotation Logic

```typescript
// packages/core/src/dispatch/modes/terminal.ts

export async function completeTerminalDispatch(
  state: RotationState,
  terminalState: TerminalState,
  actionResult: ActionResult
): Promise<RotationState> {
  // Check if there's a pending recovery
  if (terminalState.pendingRecovery) {
    // Don't advance rotation - next cycle goes to recovery role
    return {
      ...state,
      terminal: terminalState,
      // Preserve current_index, but set flag indicating recovery mode
    };
  }

  // Normal rotation advancement
  return advanceRotation(state);
}
```

### Recovery Context Injection

When a role starts in recovery mode, inject context:

```typescript
// packages/core/src/dispatch/modes/terminal.ts

export function buildRolePrompt(
  role: Role,
  memoryBank: MemoryBank,
  terminalState?: TerminalState
): string {
  let prompt = loadPlaybook(role);

  // Inject recovery context if in recovery mode
  if (terminalState?.pendingRecovery) {
    const recovery = terminalState.pendingRecovery;
    prompt += `

## 🔧 RECOVERY MODE

You are recovering from a failed command in cycle ${recovery.cycle}.

**Failed command:** \`${recovery.failedCommand}\`
**Exit code:** ${recovery.exitCode}
**Error output:**
\`\`\`
${recovery.errorOutput}
\`\`\`

${recovery.hypothesis ? `**Hypothesis from ${recovery.fromRole}:** ${recovery.hypothesis}` : ''}

Your task: Diagnose the issue and either:
1. Fix it yourself with appropriate commands
2. Provide a hypothesis and hand off to another role

After fixing, consider handing to QA for verification.
`;
  }

  return prompt;
}
```

---

## Command Action Protocol

### LLM Action Format

The LLM emits structured actions including commands:

```typescript
// packages/core/src/terminal/types.ts

export interface TerminalAction {
  type: 'command';
  command: string;
  purpose: string; // Why running this command
  expectSuccess: boolean; // If false, failure is expected/acceptable
  recoveryHint?: string; // Hint for recovery role if this fails
}

export interface HandoffAction {
  type: 'handoff';
  toRole: string;
  reason: string;
  hypothesis: string;
}

export interface CompleteAction {
  type: 'complete';
  summary: string;
  handoffToQA?: boolean;
}

export type RoleAction = TerminalAction | HandoffAction | CompleteAction;
```

### Action Loop

```typescript
// packages/core/src/dispatch/modes/terminal.ts

export async function executeTerminalDispatch(
  role: Role,
  executor: CommandExecutor,
  llm: LLMClient
): Promise<DispatchResult> {
  const actions: RoleAction[] = [];

  while (true) {
    // Get next action from LLM
    const action = await llm.getNextAction(role, executor.getState());

    if (action.type === 'complete') {
      return {
        success: true,
        actions,
        summary: action.summary,
        handoffToQA: action.handoffToQA,
      };
    }

    if (action.type === 'handoff') {
      return {
        success: false,
        actions,
        handoff: createRecoveryHandoff(
          role.id,
          action.toRole,
          getCurrentCycle(),
          getLastFailedCommand(),
          action.hypothesis
        ),
      };
    }

    if (action.type === 'command') {
      const result = await executor.execute({ command: action.command });
      actions.push({ ...action, result });

      // Check if command failed unexpectedly
      if (result.exitCode !== 0 && action.expectSuccess) {
        // Let LLM decide whether to retry, handoff, or continue
        const recovery = await llm.handleFailure(role, result, action);
        if (recovery.handoff) {
          return {
            success: false,
            actions,
            handoff: recovery.handoff,
          };
        }
        // Otherwise LLM will continue with new approach
      }
    }
  }
}
```

---

## Memory Bank Integration

### Terminal History Section

Add to memory bank format:

```markdown
## Terminal History (Cycle 319)

| #   | Role           | Command                 | Exit | Duration | Outcome       |
| --- | -------------- | ----------------------- | ---- | -------- | ------------- |
| 1   | ⚙️ Engineering | `npm install -D vitest` | 0    | 3.2s     | ✅ Success    |
| 2   | ⚙️ Engineering | `npm run build`         | 1    | 0.8s     | ❌ → Research |
| 3   | 🔬 Research    | `npm ls @ada/core`      | 0    | 0.3s     | ✅ Diagnosed  |
| 4   | ⚙️ Engineering | `npm install`           | 0    | 2.1s     | ✅ Fixed      |
| 5   | 🔍 QA          | `npm run build`         | 0    | 12.3s    | ✅ Verified   |

### Failures and Recoveries

**C319.2:** `npm run build` (Exit 1)

- **Error:** `error TS2307: Cannot find module '@ada/core'`
- **Category:** Dependency
- **Recovery:** Handed to Research
- **Root cause:** Workspace not linked after git clone
- **Resolution:** `npm install` at repo root (C319.4)
- **Verified:** QA C319.5
```

### Memory Bank Update Logic

```typescript
// packages/core/src/terminal/memory.ts

export function formatTerminalHistory(
  cycle: number,
  history: CommandHistoryEntry[]
): string {
  const table = history.map((entry, i) => {
    const outcome =
      entry.exitCode === 0
        ? '✅ Success'
        : entry.recovery
          ? `❌ → ${entry.recovery.toRole}`
          : '❌ Failed';

    return `| ${i + 1} | ${getRoleEmoji(entry.role)} ${entry.role} | \`${truncate(entry.command, 40)}\` | ${entry.exitCode} | ${formatDuration(entry.durationMs)} | ${outcome} |`;
  });

  return `## Terminal History (Cycle ${cycle})

| # | Role | Command | Exit | Duration | Outcome |
|---|------|---------|------|----------|---------|
${table.join('\n')}
`;
}
```

---

## Observability

### Metrics

Track in dispatch telemetry:

```typescript
// packages/core/src/terminal/metrics.ts

export interface TerminalMetrics {
  // Per-cycle metrics
  commandsExecuted: number;
  commandsSucceeded: number;
  commandsFailed: number;
  totalDurationMs: number;
  recoveryHandoffs: number;

  // Aggregate metrics (across cycles)
  recoverySuccessRate: number;
  avgCommandsPerCycle: number;
  avgRecoveryCycles: number;
  topFailurePatterns: Record<string, number>;
}
```

### Tracing

Each command gets a trace ID:

```typescript
export interface CommandTrace {
  traceId: string;
  cycle: number;
  role: string;
  command: string;
  startTime: string;
  endTime: string;
  exitCode: number;
  parentTraceId?: string; // Links recovery attempts
}
```

### Cost Tracking

Estimate command cost (for budget-aware mode):

```typescript
export interface CommandCost {
  computeMs: number;
  memoryMb: number;
  networkBytes: number;
  estimatedCost: number; // In cents
}
```

---

## CLI Integration

### New Commands

```bash
# Start terminal mode dispatch
ada dispatch start --mode=terminal

# Complete with terminal log
ada dispatch complete --action "..." --terminal-log

# View terminal history
ada terminal history [--cycle=N]

# View command metrics
ada terminal metrics

# Clear terminal state (reset cwd, env)
ada terminal reset
```

### Status Command Extension

```bash
ada status
```

Output when in terminal mode:

```
┌─────────────────────────────────────────────────────────────┐
│                     ADA Status                               │
├─────────────────────────────────────────────────────────────┤
│  Cycle:     319                                             │
│  Role:      ⚙️ Engineering                                  │
│  Mode:      🖥️ Terminal                                     │
│  Commands:  12/50 (38 remaining)                            │
│  Recoveries: 1 (Research → Engineering)                     │
│  Last cmd:  npm run build (✅ Exit 0, 12.3s)               │
│  CWD:       /home/user/project                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration

### ada.config.json

```json
{
  "dispatch": {
    "modes": {
      "terminal": {
        "enabled": true,
        "maxCommands": 50,
        "commandTimeout": 60,
        "shell": "bash",
        "persistCwd": true,
        "persistEnv": false,
        "recovery": {
          "maxAttempts": 3,
          "autoHandoff": true
        },
        "sandbox": {
          "enabled": false,
          "image": "ada/sandbox:latest",
          "memoryLimit": "2g",
          "cpuLimit": "2"
        }
      }
    }
  }
}
```

---

## Implementation Checklist

### Phase 1: Core Execution (Sprint 2, Week 1)

- [ ] `packages/core/src/terminal/types.ts` — Type definitions
- [ ] `packages/core/src/terminal/executor.ts` — ShellExecutor implementation
- [ ] `packages/core/src/terminal/parser.ts` — Output parsing
- [ ] `packages/core/src/dispatch/modes/terminal.ts` — Terminal mode dispatcher
- [ ] Unit tests for executor and parser

### Phase 2: Recovery System (Sprint 2, Week 2)

- [ ] `packages/core/src/terminal/recovery.ts` — Recovery logic
- [ ] `packages/core/src/terminal/patterns.ts` — Error pattern matching
- [ ] Handoff protocol in rotation.json
- [ ] Recovery context injection
- [ ] Integration tests for recovery flow

### Phase 3: Observability (Sprint 2, Week 3)

- [ ] `packages/core/src/terminal/metrics.ts` — Metrics collection
- [ ] Memory bank terminal history format
- [ ] `ada terminal` CLI commands
- [ ] Status command extension

### Phase 4: Sandbox (Sprint 3)

- [ ] `packages/core/src/terminal/sandbox.ts` — Docker integration
- [ ] Sandbox mode tests
- [ ] Benchmark integration

---

## Open Questions for Engineering

1. **State persistence granularity:** Should env vars persist between commands within a cycle (yes), between cycles (configurable), or never (no)? Recommendation: Within cycle yes, between cycles configurable with default off.

2. **Recovery role override:** When pendingRecovery exists, should it hard-override rotation or allow skip? Recommendation: Hard override with `--skip-recovery` escape hatch.

3. **Command streaming:** Should stdout/stderr be streamed to output or collected and displayed? Recommendation: Collected by default, `--stream-cmd` for streaming.

4. **Terminal state size limit:** How much history should persist in rotation.json? Recommendation: Last 10 commands, older archived to memory bank.

5. **Parallel commands:** Should we support `&` for background processes? Recommendation: No for v1, track as future enhancement.

---

## References

- [Terminal Mode CLI UX Spec](./terminal-mode-cli-ux-spec.md) — User interface
- [Terminal Failure Recovery Patterns](../research/terminal-failure-recovery.md) — Recovery strategies
- [DISPATCH.md](../../agents/DISPATCH.md) — Dispatch protocol
- Node.js `child_process` docs — Execution implementation
- POSIX exit codes — Exit code semantics

---

_🌌 The Frontier | Cycle 319 | Terminal Mode Dispatch Integration_
_"Platform architecture bridges design and implementation."_
