# 🌌 Sprint 2 Platform Implementation Roadmap

> Frontier's guide for Engineering: consolidated implementation paths for Terminal Mode, Heat Scoring, and Benchmark Integration.

**Created:** Cycle 329 (2026-02-10)
**Target:** Sprint 2 (Feb 28 – Mar 14)
**Owner:** Frontier

---

## Executive Summary

Sprint 2 focuses on three platform capabilities that differentiate ADA from single-agent tools:

1. **Terminal Mode (#125)** — Shell execution within dispatch cycles
2. **Heat Scoring (#118)** — Dynamic priority weighting for memory/context
3. **Benchmark Integration (#90)** — Terminal-Bench + Context-Bench adapters

This roadmap consolidates 8 spec documents into a phased implementation plan with clear dependencies and ownership.

---

## Implementation Priority Matrix

| Feature        | Specs Ready | Dependencies  | Business Value    | Priority |
| -------------- | ----------- | ------------- | ----------------- | -------- |
| Terminal Mode  | 4 docs ✅   | None          | High (benchmark)  | **P1**   |
| Heat Scoring   | 2 docs ✅   | Terminal Mode | High (memory)     | **P2**   |
| Terminal-Bench | 2 docs ✅   | Terminal Mode | High (YC Mar 1)   | **P3**   |
| Context-Bench  | 2 docs ✅   | Heat Scoring  | Medium (Sprint 3) | **P4**   |

**Recommendation:** Terminal Mode first (unlocks benchmarks), Heat Scoring second (improves memory), benchmarks third (validates both).

---

## 1. Terminal Mode Implementation

### Spec Documents

| Document             | Location                                            | Key Content                              |
| -------------------- | --------------------------------------------------- | ---------------------------------------- |
| Adapter Spec         | `docs/research/terminal-bench-adapter-spec.md`      | Requirements, expected improvements      |
| CLI UX Spec          | `docs/design/terminal-mode-cli-ux-spec.md`          | Command interface, output formatting     |
| Failure Recovery     | `docs/design/terminal-failure-recovery.md`          | DFV pattern, recovery limits             |
| Dispatch Integration | `docs/design/terminal-mode-dispatch-integration.md` | Middleware, state machine, observability |

### Implementation Phases

#### Phase 1: Core Shell Execution (Week 1)

**Goal:** `ada dispatch --mode=terminal` executes commands

```typescript
// packages/core/src/terminal/executor.ts
interface CommandResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timestamp: string;
}

async function executeCommand(
  command: string,
  options: ExecutorOptions
): Promise<CommandResult>;
```

**Tasks:**

- [ ] Create `packages/core/src/terminal/` module
- [ ] Implement `CommandExecutor` class with timeout handling
- [ ] Add exit code classification (success/warning/error/signal)
- [ ] Implement stdout/stderr capture and truncation
- [ ] Add working directory management

**Tests Required:**

- Command execution with various exit codes
- Timeout enforcement
- Output truncation at 10KB
- Shell selection (bash/sh/zsh)

#### Phase 2: CLI Integration (Week 1)

**Goal:** Terminal mode accessible via dispatch command

```bash
ada dispatch --mode=terminal --max-commands=50 --timeout=300
```

**Tasks:**

- [ ] Add `--mode=terminal` flag to dispatch command
- [ ] Implement command limits (`--max-commands`, `--timeout`)
- [ ] Add box-style output formatting per UX spec
- [ ] Implement spinner with elapsed time
- [ ] Add JSON output mode for benchmarks

**Open Questions (from C315):**

1. **Shell persistence:** Create new shell per command (simpler, isolated) vs persistent session (stateful, complex)
   - **Recommendation:** Start with new shell per command; add persistence in Phase 4 if needed
2. **Working directory:** Track via state, apply `cd` at command start
3. **Background processes:** Defer to Phase 4 (complexity)
4. **Signal forwarding:** Implement Ctrl+C handling in Phase 3
5. **stdin-waiting:** Detect and warn/timeout after 5s

#### Phase 3: Failure Recovery (Week 2)

**Goal:** DFV pattern for command failures

```typescript
// packages/core/src/terminal/recovery.ts
interface RecoveryContext {
  failedCommand: CommandResult;
  attemptNumber: number;
  previousAttempts: RecoveryAttempt[];
  roleContext: RoleContext;
}

async function diagnoseFailure(ctx: RecoveryContext): Promise<Diagnosis>;
async function generateFix(diagnosis: Diagnosis): Promise<FixStrategy>;
async function verifyRecovery(
  result: CommandResult
): Promise<VerificationResult>;
```

**Tasks:**

- [ ] Implement failure classification (exit code + stderr patterns)
- [ ] Create `Diagnosis` generator with role routing
- [ ] Implement retry with exponential backoff
- [ ] Add recovery attempt limits (3 per failure, 50 total commands)
- [ ] Implement pattern learning storage

**Recovery Decision Tree:**

```
Command fails
    ├── Exit 1-2: Check stderr pattern
    │   ├── "command not found" → suggest install
    │   ├── "permission denied" → suggest sudo or chmod
    │   └── Unknown → Research diagnosis
    ├── Exit 126-127: Execution error
    │   └── Check file permissions/PATH
    ├── Exit 128+: Signal received
    │   └── Log and surface to user
    └── Timeout:
        └── Offer extension or abort
```

#### Phase 4: Dispatch Integration (Week 2)

**Goal:** Terminal state in rotation.json, observability

```typescript
// Extended RotationState
interface RotationState {
  // ... existing fields ...
  terminal?: {
    mode: 'active' | 'idle';
    commandsExecuted: number;
    lastCommand?: CommandResult;
    recoveryAttempts: number;
  };
}
```

**Tasks:**

- [ ] Add terminal state to `rotation.json` schema
- [ ] Implement command middleware for dispatch
- [ ] Add terminal history to memory bank format
- [ ] Create observability exports (JSON, structured logs)
- [ ] Implement handoff protocol between roles

---

## 2. Heat Scoring Implementation

### Spec Documents

| Document         | Location                                         | Key Content                  |
| ---------------- | ------------------------------------------------ | ---------------------------- |
| Cognitive Memory | `docs/research/cognitive-memory-architecture.md` | Heat theory, memory types    |
| Implementation   | Issue #118                                       | Phase 4a core infrastructure |

### Implementation Phases

#### Phase 1: Heat Data Model (Week 2)

```typescript
// packages/core/src/memory/heat.ts
interface HeatScore {
  entityId: string;
  accessCount: number;
  successWeight: number;
  recencyMs: number;
  patternBonus: number;
  computed: number; // Final score
}

function calculateHeat(signals: HeatSignal[]): number;
function decayHeat(score: HeatScore, elapsed: number): HeatScore;
```

**Tasks:**

- [ ] Define `HeatSignal` types (access, success, failure, pattern)
- [ ] Implement heat calculation algorithm
- [ ] Add time-based decay function
- [ ] Create storage schema for heat data

#### Phase 2: Signal Generation (Week 3)

**Tasks:**

- [ ] Instrument memory access with heat signals
- [ ] Add success/failure signals from command outcomes
- [ ] Implement pattern detection for recurring access
- [ ] Create batch signal processing

#### Phase 3: Context Optimization (Week 3)

**Tasks:**

- [ ] Use heat scores for context prioritization
- [ ] Implement "hot memory always in context" rule
- [ ] Add heat-based retrieval ordering
- [ ] Create token budget allocation by heat tier

---

## 3. Benchmark Integration

### Terminal-Bench Adapter

**Prereq:** Terminal Mode Phase 2 complete

```typescript
// packages/core/src/benchmarks/terminal-bench.ts
interface TerminalBenchTask {
  id: string;
  description: string;
  expectedCommands: string[];
  successCriteria: string;
  maxTime: number;
}

async function runTerminalBenchTask(
  task: TerminalBenchTask
): Promise<BenchmarkResult>;
```

**Tasks:**

- [ ] Implement task loading from Terminal-Bench format
- [ ] Create multi-role dispatch adapter
- [ ] Add structured output for scoring
- [ ] Implement cost tracking (tokens + commands)

**Timeline:** Week 3-4 (after Terminal Mode ships)

### Context-Bench Adapter

**Prereq:** Heat Scoring Phase 2 complete

**Tasks:**

- [ ] Implement `--mode=context` for file-based input
- [ ] Create benchmark namespace isolation
- [ ] Add pattern learning instrumentation
- [ ] Implement answer output format

**Timeline:** Sprint 3 (after Heat Scoring ships)

---

## 4. Open Questions for Engineering

These were raised in various specs and need Engineering decisions:

### Terminal Mode

1. **Signal batching:** Per-command or per-cycle heat signal emission?
2. **Shell type detection:** Auto-detect or explicit flag?
3. **Output streaming:** Real-time or buffered?

### Heat Scoring

1. **Storage backend:** JSON files or SQLite?
2. **Decay curve:** Linear, exponential, or stepped?
3. **Cold memory threshold:** What heat score triggers archival?

### Benchmarks

1. **Parallelization:** Sequential tasks or concurrent where possible?
2. **Cost limits:** Hard cap per benchmark run?
3. **Failure tolerance:** How many task failures before aborting run?

---

## 5. Success Metrics

| Metric                  | Target         | Measurement                     |
| ----------------------- | -------------- | ------------------------------- |
| Terminal Mode ship      | Mar 7          | Feature complete, tested        |
| Heat Scoring prototype  | Mar 10         | Core algorithm, no optimization |
| Terminal-Bench baseline | Mar 12         | First run with results          |
| Multi-agent improvement | +20% vs single | Controlled comparison           |
| YC-ready numbers        | Mar 14         | Results documented              |

---

## 6. Cross-Reference Index

| Topic              | Primary Spec                            | Supporting Docs                           |
| ------------------ | --------------------------------------- | ----------------------------------------- |
| Terminal execution | `terminal-mode-dispatch-integration.md` | `terminal-bench-adapter-spec.md`          |
| CLI UX             | `terminal-mode-cli-ux-spec.md`          | `dispatch-cli-ux-review.md`               |
| Failure handling   | `terminal-failure-recovery.md`          | `terminal-failure-recovery.md` (research) |
| Heat scoring       | Issue #118                              | `cognitive-memory-architecture.md`        |
| Context-Bench      | `context-bench-adapter-spec.md`         | `context-bench-memory-integration.md`     |
| Benchmark strategy | `benchmark-landscape-analysis.md`       | `benchmark-investor-positioning.md`       |

---

## 7. Dependency Graph

```
                    ┌─────────────────┐
                    │  Terminal Mode  │
                    │     (#125)      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌────────────┐  ┌─────────────┐  ┌──────────────┐
     │ Heat Score │  │ Terminal-   │  │   CLI JSON   │
     │   (#118)   │  │   Bench     │  │    Output    │
     └──────┬─────┘  └─────────────┘  └──────────────┘
            │
            ▼
     ┌─────────────┐
     │  Context-   │
     │   Bench     │
     └─────────────┘
```

---

## 8. Sprint 2 Week-by-Week

| Week            | Focus             | Deliverables                             |
| --------------- | ----------------- | ---------------------------------------- |
| Week 1 (Feb 28) | Terminal Core     | Shell executor, CLI integration          |
| Week 2 (Mar 7)  | Terminal Complete | Failure recovery, dispatch integration   |
| Week 3 (Mar 10) | Heat + Benchmarks | Heat prototype, Terminal-Bench first run |
| Week 4 (Mar 14) | Results           | Benchmark results, YC numbers ready      |

---

_This roadmap consolidates Frontier's Sprint 1 spec work into actionable implementation phases. Engineering owns execution; Frontier supports with clarifications and prototype assistance._

🌌 _The Frontier | Cycle 329_
