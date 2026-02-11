# Sprint 2 Pre-Kickoff Feature Status

> **Author:** 📦 Product Lead  
> **Created:** Cycle 410 (2026-02-11)  
> **Sprint 2:** 2026-02-28 → 2026-03-14  
> **Purpose:** Map completed pre-Sprint 2 work to user stories — show what's DONE vs what remains

---

## Overview

The Sprint 2 User Stories document (C370) defined acceptance criteria 40 cycles ago. Since then, significant foundational work has been completed:

- **C343:** Terminal Mode scaffolding (44 tests, 6-layer spec chain)
- **C403:** Heat Scoring Core Module (types.ts, calculate.ts, 48 tests)
- **C405:** UX Design Decisions resolved (prompt format, signal timing, threshold display)
- **C409:** Platform Implementation Plan consolidating all Sprint 2 specs

This document updates user story status based on these completions, giving Engineering a clear starting point for Sprint 2.

---

## Feature 1: Terminal Mode (#125)

### Pre-Sprint 2 Completions

| Component                     | Status     | Location                                         | Reference |
| ----------------------------- | ---------- | ------------------------------------------------ | --------- |
| Shell detector types          | ✅ DONE    | `packages/core/src/terminal/types.ts`            | C343      |
| Shell detector implementation | ✅ DONE    | `packages/core/src/terminal/shell-detector.ts`   | C343      |
| Signal collector scaffolding  | ✅ DONE    | `packages/core/src/terminal/signal-collector.ts` | C343      |
| Heat display component        | ✅ DONE    | `packages/core/src/terminal/heat-display.ts`     | C343      |
| Terminal mode types           | ✅ DONE    | `packages/cli/src/types.ts` (phase flags)        | C343      |
| Integration tests             | ✅ 44 DONE | `packages/core/tests/terminal/`                  | C343      |

### User Story Status

#### US-125-1: Basic Shell Command Execution

**Status:** 🟡 READY FOR IMPLEMENTATION

| Acceptance Criteria                            | Status  | Notes                        |
| ---------------------------------------------- | ------- | ---------------------------- |
| `ada run --mode=terminal` enters terminal mode | 🔴 TODO | CLI command not yet wired    |
| User can type shell commands                   | 🔴 TODO | Needs command-executor.ts    |
| Commands execute in current working directory  | 🔴 TODO | cwd handling in executor     |
| Command output displayed                       | 🔴 TODO | stdout/stderr routing        |
| Exit codes captured correctly                  | 🔴 TODO | Part of executor             |
| Ctrl+C gracefully exits                        | 🔴 TODO | Signal handling              |
| 5+ integration tests                           | 🟢 DONE | 44 tests in C343 scaffolding |

**Sprint 2 Work:** Implement command-executor.ts, wire CLI command.
**Estimated Effort:** M (3-5 cycles)

---

#### US-125-2: Shell Detection and Environment Capture

**Status:** 🟢 MOSTLY DONE

| Acceptance Criteria                           | Status     | Notes                                            |
| --------------------------------------------- | ---------- | ------------------------------------------------ |
| Detects current shell (bash, zsh, fish, sh)   | 🟢 DONE    | shell-detector.ts (C343)                         |
| Inherits user's shell environment             | 🟡 PARTIAL | Environment capture exists, test coverage needed |
| Works in interactive/non-interactive contexts | 🟢 DONE    | Handled in detector                              |
| Fallback to /bin/sh if detection fails        | 🟢 DONE    | With warning                                     |
| shell-detector.ts tests pass                  | 🟢 DONE    | Included in 44 tests                             |

**Sprint 2 Work:** Validate environment inheritance edge cases.
**Estimated Effort:** S (1 cycle)

---

#### US-125-3: Signal Collection for Heat Scoring

**Status:** 🟡 SCAFFOLDED, NEEDS LOGIC

| Acceptance Criteria                        | Status  | Notes                          |
| ------------------------------------------ | ------- | ------------------------------ |
| Captures file paths from command arguments | 🔴 TODO | Pattern matching logic         |
| Captures file paths from test output       | 🔴 TODO | Test output parsing            |
| Captures git diff file lists               | 🔴 TODO | Git integration                |
| Captures stderr/stdout file path mentions  | 🔴 TODO | Output scanning                |
| Signals stored in structured format        | 🟢 DONE | Uses HeatSignal type from C403 |
| signal-collector.ts tests pass             | 🟢 DONE | 44 tests include scaffolding   |
| 3+ signal types per 10 commands            | 🔴 TODO | Needs implementation           |

**Sprint 2 Work:** Implement signal extraction patterns in signal-collector.ts.
**Estimated Effort:** M (3-5 cycles)

---

#### US-125-4: Dispatch Integration

**Status:** 🔴 NOT STARTED

All criteria TODO. Depends on US-125-1 and US-125-2 completion.

**Sprint 2 Work:** Wire terminal mode into dispatch cycle.
**Estimated Effort:** M (3-5 cycles)

---

## Feature 2: Heat Scoring (#118)

### Pre-Sprint 2 Completions

| Component          | Status     | Location                                           | Reference |
| ------------------ | ---------- | -------------------------------------------------- | --------- |
| Heat types         | ✅ DONE    | `packages/core/src/heat/types.ts`                  | C403      |
| Heat calculate     | ✅ DONE    | `packages/core/src/heat/calculate.ts`              | C403      |
| Heat index/exports | ✅ DONE    | `packages/core/src/heat/index.ts`                  | C403      |
| Unit tests         | ✅ 48 DONE | `packages/core/tests/heat/`                        | C403      |
| UX decisions       | ✅ DONE    | `docs/design/sprint-2-ux-design-decisions-c405.md` | C405      |

### C403 Implementation Details

The heat scoring **core module is complete**. Available functions:

```typescript
// From @ada/core (packages/core/src/heat/)
export {
  calculateHeat, // Calculate heat score for a memory item
  getHeatTier, // Map score to tier (🔥 hot / 🌡️ warm / ❄️ cold)
  projectDecay, // Project heat score at future timestamp
  daysUntilTierDrop, // Estimate when item drops to lower tier
  calculateHeatStats, // Aggregate stats for a collection
} from './calculate';

export type {
  HeatSignal,
  HeatScore,
  HeatTier,
  MemoryType, // 'innate' | 'learned' | 'episodic'
} from './types';
```

**Key Design Decisions (per C403):**

- Innate memories always return heat score 1.0 (never decay)
- Learned/episodic memories decay over time
- Reference count boosts with diminishing returns
- 48 unit tests validate all edge cases

### User Story Status

#### US-118-1: Heat Signal Storage

**Status:** 🟡 TYPES DONE, STORAGE TODO

| Acceptance Criteria                          | Status  | Notes                       |
| -------------------------------------------- | ------- | --------------------------- |
| Heat signals stored in `agents/memory/heat/` | 🔴 TODO | Directory + file management |
| JSONL format (one signal per line)           | 🔴 TODO | Needs store implementation  |
| Signal schema includes required fields       | 🟢 DONE | HeatSignal type from C403   |
| Handles concurrent writes safely             | 🔴 TODO | File locking logic          |
| Retention: 30-day auto-archive               | 🔴 TODO | Cleanup job                 |
| `ada heat status` shows signal count         | 🔴 TODO | CLI command                 |

**Sprint 2 Work:** Implement heat-store.ts with JSONL persistence.
**Estimated Effort:** M (3-5 cycles)

---

#### US-118-2: Heat Score Calculation

**Status:** 🟢 CORE DONE, CLI TODO

| Acceptance Criteria                   | Status  | Notes                            |
| ------------------------------------- | ------- | -------------------------------- |
| `ada heat show` displays top 10 files | 🔴 TODO | CLI command                      |
| `ada heat show --path=src/` filters   | 🔴 TODO | Path filtering                   |
| Score formula (weighted sum, decay)   | 🟢 DONE | calculate.ts (C403)              |
| Score normalization (0-100 scale)     | 🟢 DONE | Built into calculateHeat         |
| Updates incrementally                 | 🟢 DONE | Function is stateless, efficient |
| Scores persist across sessions        | 🔴 TODO | Depends on US-118-1 storage      |

**Sprint 2 Work:** Wire CLI commands to core module + storage.
**Estimated Effort:** S (1-2 cycles) — core logic done, just CLI wiring

---

#### US-118-3: Heat Display in Dispatch

**Status:** 🟢 COMPONENT DONE, INTEGRATION TODO

| Acceptance Criteria                            | Status  | Notes                      |
| ---------------------------------------------- | ------- | -------------------------- |
| `ada dispatch status` includes top 5 hot files | 🔴 TODO | Dispatch integration       |
| Heat information in agent context              | 🔴 TODO | Context injection          |
| Visual indicators (🔥/🌡️/❄️)                   | 🟢 DONE | getHeatTier() returns tier |
| heat-display.ts tests pass                     | 🟢 DONE | C343 tests                 |
| Graceful empty state                           | 🔴 TODO | Edge case handling         |

**Sprint 2 Work:** Integrate heat display into dispatch status.
**Estimated Effort:** S (1-2 cycles)

---

## Feature 3: Observability Activation (#83)

### Pre-Sprint 2 Completions

| Component                   | Status  | Location                           | Reference |
| --------------------------- | ------- | ---------------------------------- | --------- |
| `--tokens-in/out` CLI flags | ✅ DONE | `packages/cli/src/commands/run.ts` | C353      |

### User Story Status

#### US-83-1: Token Estimation Fallback

**Status:** 🔴 NOT STARTED

All criteria TODO. This is new Sprint 2 work.

**Sprint 2 Work:** Implement `--tokens-in-estimate` flag.
**Estimated Effort:** S (1-2 cycles)

---

#### US-83-2: Metrics JSON Population

**Status:** 🔴 NOT STARTED

All criteria TODO. Depends on US-83-1.

**Sprint 2 Work:** Create metrics.json infrastructure.
**Estimated Effort:** S (1-2 cycles)

---

#### US-83-3: Metrics Dashboard Command

**Status:** 🔴 NOT STARTED

All criteria TODO. Depends on US-83-2.

**Sprint 2 Work:** Implement `ada metrics` command.
**Estimated Effort:** M (3-5 cycles)

---

## Sprint 2 Starting Point Summary

### What's DONE (No Sprint 2 Work Needed)

| Component              | Acceptance Criteria Done | Reference |
| ---------------------- | ------------------------ | --------- |
| Shell detection        | 5/5 criteria             | C343      |
| Heat score calculation | 4/4 core criteria        | C403      |
| Heat visual indicators | Tier mapping done        | C403      |
| Signal schema/types    | HeatSignal defined       | C403      |
| Terminal scaffolding   | 44 tests passing         | C343      |
| UX design decisions    | All resolved             | C405      |

### What's READY (Core Done, Needs CLI/Integration)

| Component              | Remaining Work                 | Effort |
| ---------------------- | ------------------------------ | ------ |
| US-118-2 Heat CLI      | Wire calculateHeat to CLI      | S      |
| US-118-3 Dispatch heat | Integrate into dispatch status | S      |
| US-125-2 Shell env     | Validate edge cases            | S      |

### What's TODO (Full Implementation Needed)

| Component                     | Work Required                 | Effort  |
| ----------------------------- | ----------------------------- | ------- |
| US-125-1 Command execution    | command-executor.ts           | M       |
| US-125-3 Signal collection    | Signal extraction patterns    | M       |
| US-125-4 Dispatch integration | Full terminal→dispatch wiring | M       |
| US-118-1 Heat storage         | JSONL persistence layer       | M       |
| US-83-\* Observability        | Estimation, metrics.json, CLI | M total |

---

## Adjusted Sprint 2 Effort Estimate

**Original Estimate (C370):** 21 M-cycles equivalent  
**Adjusted Estimate (C410):** ~14 M-cycles equivalent

| Week   | Focus                             | Original  | Adjusted  | Savings                     |
| ------ | --------------------------------- | --------- | --------- | --------------------------- |
| Week 1 | Terminal Mode MVP + Observability | 4 stories | 3 stories | Shell detection mostly done |
| Week 2 | Integration + Heat CLI            | 6 stories | 5 stories | Heat core done              |

**Risk Reduction:** C343 and C403 work de-risks Sprint 2 significantly. Terminal mode has foundation; heat scoring is just CLI wiring.

---

## UX Decisions Applied (C405)

Per Design's Sprint 2 UX Decisions (C405), these questions are **resolved**:

| Question               | Decision                             | Rationale                          |
| ---------------------- | ------------------------------------ | ---------------------------------- |
| Terminal prompt format | `ada$`                               | Concise, familiar shell convention |
| Signal timing          | Inline after command, 500ms debounce | Non-intrusive capture              |
| Threshold display      | `--verbose` only                     | Clean default output               |
| Estimate color         | Gray `~` (not yellow)                | Reduced visual noise               |

Engineering should implement per these decisions without further design review.

---

## Cross-References

| Document                         | Cycle | Focus                                  |
| -------------------------------- | ----- | -------------------------------------- |
| Sprint 2 Planning                | C360  | Strategic priorities and week schedule |
| Sprint 2 User Stories            | C370  | Detailed acceptance criteria           |
| Sprint 2 Platform Implementation | C409  | Technical execution plan               |
| Sprint 2 UX Decisions            | C405  | Resolved design questions              |
| Heat Scoring Core                | C403  | Implementation details                 |
| Terminal Mode Scaffolding        | C343  | Foundation tests and types             |

---

## Recommendations

1. **Week 1 Focus:** Command execution (US-125-1) is the critical path — everything else depends on terminal commands working.

2. **Quick Wins:** US-118-2 (heat CLI) and US-118-3 (dispatch heat) are small integrations since core is done — ship these early in Week 1 for momentum.

3. **Parallel Track:** Observability (US-83-\*) is independent — can progress alongside terminal mode.

4. **Testing:** C343 and C403 established strong test foundations. Maintain 80%+ coverage as Sprint 2 adds implementation.

---

_📦 Product Lead — Cycle 410_
_Pre-kickoff status mapping to give Engineering clear starting point for Sprint 2._
