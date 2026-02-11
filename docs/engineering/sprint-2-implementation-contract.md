# Sprint 2 Technical Implementation Contract

> **Status:** AGREED  
> **Author:** ⚙️ Engineering — Cycle 373  
> **Sprint 2 Kickoff:** Feb 28, 2026  
> **Bridges:** Engineering Readiness (C363), Frontier Platform Readiness (C369), Product User Stories (C370)

---

## Purpose

This document finalizes the technical contract between Engineering, Frontier, and Product before Sprint 2. It resolves open questions, confirms shared types, and maps user stories to exact code locations.

---

## 1. Heat Module Directory Structure (AGREED)

Coordinating C363 Engineering and C369 Frontier specs:

```
packages/core/src/
├── heat/                          # NEW: Heat Scoring module
│   ├── types.ts                   # HeatScore, HeatMetadata, HeatConfig
│   ├── calculate.ts               # calculateHeat(), getHeatTier(), projectDecay()
│   ├── store.ts                   # HeatStore class with persistence
│   ├── signals.ts                 # SignalCollector for terminal mode
│   └── index.ts                   # Barrel exports
│
├── terminal/                      # EXISTS: From C343 scaffolding
│   ├── shell-detector.ts          # Shell detection (47 tests passing)
│   ├── executor.ts                # Command execution
│   ├── signal-collector.ts        # Terminal → Heat signals bridge
│   └── index.ts
│
├── observe/                       # NEW: Observability module
│   ├── metrics.ts                 # CycleMetrics type + storage
│   ├── estimation.ts              # Token estimation fallback
│   └── index.ts
│
└── index.ts                       # Updated barrel with new exports
```

**Decision: JSONL for heat persistence (Sprint 2)**

Per C369 recommendation, we use JSONL for simplicity. SQLite evaluation deferred to Sprint 3 if performance issues arise.

```
agents/memory/heat/
├── signals.jsonl                  # Append-only heat signals
├── scores.json                    # Current heat scores (recalculated on access)
└── .heat-version                  # Schema version for migrations
```

---

## 2. Shared Type Definitions (AGREED)

### 2.1 Heat Scoring Core Types

Unifying C363 and C369 type proposals:

```typescript
// packages/core/src/heat/types.ts

/**
 * Memory class determines base decay rate
 * From C340-C342 Cognitive Memory research
 */
export type MemoryClass = 'innate' | 'learned' | 'episodic';

/**
 * Heat tier for quick filtering
 */
export type HeatTier = 'hot' | 'warm' | 'cold';

/**
 * Configuration for heat calculation
 */
export interface HeatConfig {
  thresholds: {
    hot: number; // Default: 0.8
    warm: number; // Default: 0.4
  };
  decayRates: {
    innate: number; // 0 (never decay)
    learned: number; // 0.05 per day
    episodic: number; // 0.15 per day
  };
  referenceBoost: {
    initial: number; // First reference: +0.1
    diminishing: number; // Each subsequent: +0.1 / sqrt(count)
  };
}

/**
 * Metadata for heat calculation (input)
 */
export interface HeatMetadata {
  entityId: string;
  memoryClass: MemoryClass;
  baseImportance: number; // 0-1, set at creation
  referenceCount: number;
  lastAccessedAt: number; // Unix timestamp
  createdAt: number; // Unix timestamp
}

/**
 * Calculated heat score (output)
 */
export interface HeatScore {
  entityId: string;
  score: number; // 0.0 - 1.0
  tier: HeatTier;
  metadata: HeatMetadata;
  calculatedAt: number; // Unix timestamp
}

/**
 * Heat signal from terminal activity
 * From US-125-3 acceptance criteria
 */
export interface HeatSignal {
  timestamp: number;
  signalType:
    | 'file_access'
    | 'test_output'
    | 'git_diff'
    | 'stderr'
    | 'command_arg';
  filePath: string;
  source: string; // e.g., 'terminal:vim', 'terminal:npm test'
  weight: number; // 0.1 - 1.0, based on signal type
}
```

### 2.2 Observability Types

From C359 spec and US-83-\* stories:

```typescript
// packages/core/src/observe/metrics.ts

export interface CycleMetrics {
  cycleNumber: number;
  role: string;
  timestamp: string; // ISO 8601

  // Token metrics (actual or estimated)
  tokensIn?: number;
  tokensOut?: number;
  tokensInEstimate?: number;
  tokensOutEstimate?: number;
  estimationMethod?: 'chars_div_4' | 'env_vars' | 'actual';

  // Heat metrics (Sprint 2)
  memoryHeatStats?: {
    hot: number;
    warm: number;
    cold: number;
    averageHeat: number;
  };

  // Action metadata
  action: string;
  outcome: 'success' | 'partial' | 'blocked';
}

export interface MetricsStore {
  append(metrics: CycleMetrics): Promise<void>;
  query(options: { days?: number; role?: string }): Promise<CycleMetrics[]>;
  summary(days: number): Promise<MetricsSummary>;
}

export interface MetricsSummary {
  totalCycles: number;
  tokensIn: { actual: number; estimated: number };
  tokensOut: { actual: number; estimated: number };
  averageHeat: number;
  byRole: Record<string, { cycles: number; tokens: number }>;
}
```

### 2.3 Terminal Mode Types

From C343 scaffolding + US-125-\* stories:

```typescript
// packages/core/src/terminal/types.ts (extend existing)

export interface TerminalSession {
  id: string;
  shell: 'bash' | 'zsh' | 'fish' | 'sh';
  cwd: string;
  startedAt: number;
  signalCollector: SignalCollector;
}

export interface CommandResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  executedAt: number;
  durationMs: number;
  signals: HeatSignal[]; // Extracted from output
}

export interface SignalCollector {
  collect(result: CommandResult): HeatSignal[];
  flush(): HeatSignal[];
  stats(): { collected: number; byType: Record<string, number> };
}
```

---

## 3. User Story → Code Location Map

### Terminal Mode (#125)

| Story    | Primary Location                                 | Tests Location                                 | Status      |
| -------- | ------------------------------------------------ | ---------------------------------------------- | ----------- |
| US-125-1 | `packages/cli/src/commands/terminal.ts`          | `packages/cli/src/commands/__tests__/`         | Scaffolded  |
| US-125-2 | `packages/core/src/terminal/shell-detector.ts`   | `packages/core/src/terminal/__tests__/`        | ✅ Complete |
| US-125-3 | `packages/core/src/terminal/signal-collector.ts` | Same                                           | Scaffolded  |
| US-125-4 | `packages/core/src/dispatch.ts` (extend)         | `packages/core/src/__tests__/dispatch.test.ts` | Week 2      |

### Heat Scoring (#118)

| Story    | Primary Location                                 | Tests Location                         | Status |
| -------- | ------------------------------------------------ | -------------------------------------- | ------ |
| US-118-1 | `packages/core/src/heat/store.ts`                | `packages/core/src/heat/__tests__/`    | NEW    |
| US-118-2 | `packages/core/src/heat/calculate.ts`            | Same                                   | NEW    |
| US-118-3 | `packages/cli/src/commands/dispatch.ts` (extend) | `packages/cli/src/commands/__tests__/` | Week 2 |

### Observability (#83)

| Story   | Primary Location                                | Tests Location                         | Status      |
| ------- | ----------------------------------------------- | -------------------------------------- | ----------- |
| US-83-1 | `packages/cli/src/commands/observe.ts` (extend) | `packages/cli/src/commands/__tests__/` | Extend C353 |
| US-83-2 | `packages/core/src/observe/metrics.ts`          | `packages/core/src/observe/__tests__/` | NEW         |
| US-83-3 | `packages/cli/src/commands/metrics.ts`          | Same                                   | NEW         |

---

## 4. Open Questions Resolved

### Q1: Heat persistence format (from C363, C369)

**Decision:** JSONL for Sprint 2

**Rationale:**

- JSONL is append-only, simple, tested in memory archives
- No external dependencies (SQLite requires native binding)
- Sprint 2 scope is single-repo; performance unlikely to be issue
- Reevaluate for Sprint 3 if repos > 10k entries

### Q2: Decay frequency (from C369)

**Decision:** Per-dispatch-start (inline)

**Rationale:**

- Running decay() at start of each dispatch cycle (before context load)
- Simple, no cron job dependency
- ~50ms overhead for 1000 entries (acceptable)
- Batch decay with cutoff: only process entries not touched in 24h

### Q3: JSONL backward compatibility (from C369)

**Decision:** Additive fields, version header

**Implementation:**

```jsonl
{"__version": 1, "__schema": "heat-signal"}
{"timestamp": 1234567890, "signalType": "file_access", ...}
```

- New fields are optional; old readers ignore them
- Version header allows future migrations
- Memory stream entries extended (not replaced)

### Q4: Pattern threshold (from C369)

**Decision:** Conservative (5+ occurrences) for Sprint 2

**Rationale:**

- False positives more disruptive than missed patterns
- Can lower threshold once we have baseline data
- Human review workflow deferred to Sprint 3

---

## 5. Implementation Order (Week 1)

Per critical path analysis:

```
Day 1-2: packages/core/src/heat/types.ts
         packages/core/src/heat/calculate.ts (+ 15 tests)

Day 3-4: packages/core/src/heat/store.ts (+ 10 tests)
         packages/core/src/heat/index.ts (barrel)

Day 5:   packages/core/src/observe/metrics.ts (+ 5 tests)
         packages/core/src/observe/estimation.ts (+ 3 tests)

Day 6-7: CLI integration
         packages/cli/src/commands/heat.ts
         packages/cli/src/commands/observe.ts (extend)
```

**Parallel track:** Terminal Mode US-125-1 and US-125-2 can proceed Day 1-4 since shell-detector.ts is already complete.

---

## 6. Quality Gates (Sprint 2 Specific)

Extending R-007 TypeScript Standards for Sprint 2:

1. **Heat module coverage:** Minimum 85% for `packages/core/src/heat/`
2. **No cross-package type duplication:** All shared types in `@ada/core`
3. **JSONL schema validation:** Zod schema for HeatSignal, CycleMetrics
4. **Backward compat test:** New code reads old memory stream entries without error
5. **Performance baseline:** Heat calculation < 1ms per entry, store.top(10) < 50ms for 1000 entries

---

## 7. Risk Mitigations

| Risk                       | Mitigation                                                          | Owner       |
| -------------------------- | ------------------------------------------------------------------- | ----------- |
| Heat calc complexity creep | Stick to formula in C342; no ML for Sprint 2                        | Engineering |
| Signal collector noise     | Conservative signal types (file_access, test_output, git_diff only) | Engineering |
| Metrics.json rotation      | Implement 1000-entry limit from US-83-2 Day 1                       | Engineering |
| Shell compatibility        | Fallback to /bin/sh tested in C343; add warning log                 | Engineering |

---

## 8. Coordination Checkpoints

| Date   | Checkpoint                                     | Attendees             |
| ------ | ---------------------------------------------- | --------------------- |
| Feb 28 | Sprint 2 kickoff sync                          | All roles             |
| Mar 3  | Week 1 mid-check: Heat types + calculate done? | Engineering, Frontier |
| Mar 7  | Week 1 complete: All foundational code merged  | Engineering, QA       |
| Mar 10 | Week 2 mid-check: Integration progress         | Engineering, Product  |
| Mar 14 | Sprint 2 complete: Demo all features           | All roles             |

---

## Signatures

This contract represents agreed-upon implementation details between:

- ⚙️ **Engineering** — Implementation owner
- 🌌 **Frontier** — Platform architecture owner
- 📦 **Product** — User story owner
- 🔍 **QA** — Quality gate owner

Sprint 2 implementation will follow this contract. Changes require memory bank update and cross-role comment.

---

_⚙️ The Builder — Cycle 373_
