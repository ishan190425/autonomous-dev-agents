# Sprint 2 Platform Implementation Plan

> Unified execution protocol for Cognitive Memory, Heat Scoring, and Reflexion features.
> **Author:** 🌌 The Frontier — Cycle 409
> **Status:** EXECUTION READY
> **Sprint:** 2 (Feb 28 – Mar 14, 2026)
> **Issues:** #108, #113, #118

---

## Executive Summary

This document consolidates 9+ cycles of platform research and specification into a unified execution plan for Sprint 2. It synthesizes:

- **Cognitive Memory Architecture** (docs/design/cognitive-memory-architecture.md) — 3-tier memory system
- **Heat Scoring Innate/Learned** (docs/research/cognitive-memory-innate-learned-heat-scoring.md) — Memory decay with reference-based scoring
- **Reflexion Phase 2 Spec** (docs/research/reflexion-phase2-playbook-refinement-spec.md) — Pattern detection for playbook self-refinement
- **Heat Scoring Core Module** (packages/core/src/heat/) — Engineering implementation (C403)
- **UX Design Decisions** (docs/design/sprint-2-ux-design-decisions-c405.md) — Resolved UI questions

**Current State:**

- Heat scoring **core module complete** ✅ (C403: types, calculate, 48 tests)
- Terminal mode **scaffolding complete** ✅ (C343: phase flags, types)
- Reflexion Phase 1a-c **complete** ✅ (reflection capture, consumption, cross-role insights)
- UX decisions **resolved** ✅ (C405: prompt format, signal timing, threshold display)

**Sprint 2 Goal:** Wire completed core modules into CLI + implement memory persistence layer.

---

## 1. Current State Assessment

### 1.1 What's Built (Ready for Integration)

| Component           | Location                              | Status        | Tests    |
| ------------------- | ------------------------------------- | ------------- | -------- |
| Heat Types          | `packages/core/src/heat/types.ts`     | ✅ Complete   | —        |
| Heat Calculate      | `packages/core/src/heat/calculate.ts` | ✅ Complete   | 48 tests |
| Heat Index          | `packages/core/src/heat/index.ts`     | ✅ Complete   | exported |
| Terminal Phase Flag | `packages/cli/src/types.ts`           | ✅ Scaffolded | —        |
| Reflexion Capture   | `rotation.json.history[].reflection`  | ✅ Complete   | —        |

### 1.2 What's Specced (Ready for Implementation)

| Feature                | Spec Document                                        | Target |
| ---------------------- | ---------------------------------------------------- | ------ |
| Heat Store             | cognitive-memory-innate-learned-heat-scoring.md §4.3 | Week 1 |
| Heat CLI               | cognitive-memory-innate-learned-heat-scoring.md §5   | Week 1 |
| Terminal Mode          | packages/cli/src/commands/ scaffolding               | Week 2 |
| Memory Stream          | cognitive-memory-architecture.md Phase 1             | Week 2 |
| Reflexion Phase 2 Prep | reflexion-phase2-playbook-refinement-spec.md         | Week 3 |

### 1.3 Dependencies

```
Heat Core (✅ DONE)
    │
    ├──► Heat Store (Week 1)
    │        │
    │        └──► Heat CLI (Week 1)
    │                 │
    │                 └──► Terminal Signal → Heat Bridge (Week 2)
    │
Terminal Scaffolding (✅ DONE)
    │
    └──► Terminal Mode Implementation (Week 2)
             │
             └──► Benchmark Infrastructure (parallel with Research)

Memory Stream (Week 2)
    │
    └──► Reflexion Pattern Detection (Week 3)
```

---

## 2. Week-by-Week Timeline

### Week 1: Feb 28 – Mar 6 (Heat Store + CLI)

**Primary Focus:** Persistence and CLI integration for heat scoring.

#### Day 1-2: Heat Store Implementation

```typescript
// packages/core/src/heat/store.ts
interface HeatStore {
  // Persistence layer for heat scores
  getEntry(id: string): Promise<HeatEntry | null>;
  setEntry(entry: HeatEntry): Promise<void>;
  getByTier(tier: HeatTier): Promise<HeatEntry[]>;
  decayAll(): Promise<DecayResult>;
}
```

**Tasks:**

- [ ] Implement `HeatStore` class with JSONL backing
- [ ] Add `decay()` method for batch heat updates
- [ ] Add `getByTier()` for tiered retrieval
- [ ] Integration tests with calculate.ts
- [ ] Update `@ada/core` exports

**Acceptance:** `npm run test --workspace=packages/core` passes with heat store tests.

#### Day 3-4: Heat CLI Commands

```bash
# New commands
ada memory list --show-heat     # Shows heat tier + score
ada memory list --tier hot      # Filter by tier
ada memory heat <id> --boost    # Manual adjustment
ada memory decay --dry-run      # Preview decay pass
```

**Tasks:**

- [ ] Add `--show-heat` flag to `ada memory list`
- [ ] Add `--tier` filter option
- [ ] Implement `ada memory heat` subcommand
- [ ] Implement `ada memory decay` subcommand
- [ ] Update help text and man pages

**Acceptance:** CLI commands work, help text is accurate.

#### Day 5: Integration + Buffer

- [ ] End-to-end test: create → access → decay cycle
- [ ] Update dispatch to track heat on memory access
- [ ] Address any blockers from Day 1-4

---

### Week 2: Mar 7 – Mar 13 (Terminal Mode + Memory Stream)

**Primary Focus:** Terminal mode implementation and memory persistence.

#### Day 6-7: Terminal Mode Core

**Tasks:**

- [ ] Implement `packages/cli/src/commands/terminal.ts`
- [ ] Add signal capture from stdin
- [ ] Implement `--headless` flag
- [ ] Wire terminal signals to heat score updates
- [ ] Add terminal-specific help

**Reference:** Terminal mode scaffolding from C343.

#### Day 8-9: Memory Stream Foundation

```typescript
// packages/core/src/memory/stream.ts
interface MemoryStream {
  append(entry: MemoryEntry): Promise<void>;
  query(filter: StreamFilter): Promise<MemoryEntry[]>;
  getRecent(count: number): Promise<MemoryEntry[]>;
}
```

**Tasks:**

- [ ] Implement `MemoryStream` class (JSONL backing)
- [ ] Add importance scoring at entry creation
- [ ] Implement recency + importance + relevance ranking
- [ ] Integration with dispatch cycle
- [ ] Migrate current bank.md role state to stream format

**Reference:** Cognitive Memory Architecture Phase 1 (docs/design/cognitive-memory-architecture.md §6.1).

#### Day 10: Terminal → Heat Bridge

**Tasks:**

- [ ] Wire terminal signal intensity → heat boost
- [ ] Implement debounce (500ms per C405 decision)
- [ ] Add `--verbose` threshold display
- [ ] End-to-end test: terminal input → heat update → persistence

---

### Week 3: Mar 14 (Reflexion Phase 2 Prep)

**Primary Focus:** Groundwork for Reflexion Phase 2 (full implementation in Sprint 3).

#### Day 11-12: Pattern Detection Foundation

**Tasks:**

- [ ] Implement similarity matching for reflection texts
- [ ] Create `amendments.json` schema
- [ ] Add pattern detection prototype to Scrum retro
- [ ] Document integration points for Sprint 3

**Reference:** Reflexion Phase 2 Spec §2.2-2.3 (reflexion-phase2-playbook-refinement-spec.md).

#### Day 13-14: Sprint 2 Close + Handoff

**Tasks:**

- [ ] Complete all Week 1-2 items
- [ ] Write Sprint 2 completion report
- [ ] Update memory bank with Phase 4a status
- [ ] Create Sprint 3 handoff notes for Reflexion Phase 2

---

## 3. Feature Details

### 3.1 Heat Scoring Store (Issue #118)

**Current State:** Core calculation module complete (C403).

**Sprint 2 Scope:**

- JSONL-based persistence (`agents/memory/heat.jsonl`)
- CLI integration (`ada memory` commands)
- Dispatch integration (auto-update on memory access)

**Implementation Contract:**

```typescript
// Heat entry persisted to heat.jsonl
interface HeatEntry {
  id: string; // Memory entry ID
  memoryClass: 'innate' | 'learned';
  heatScore: number; // 0.0-1.0
  referenceCount: number;
  lastAccessedAt: string; // ISO timestamp
  baseImportance: number; // Initial weight
  createdAt: string;
}

// Heat store operations
interface HeatStore {
  get(id: string): HeatEntry | null;
  set(entry: HeatEntry): void;
  increment(id: string): void; // Bump reference count
  getByTier(tier: 'hot' | 'warm' | 'cold'): HeatEntry[];
  decay(): DecayResult; // Run decay pass
  stats(): HeatStats; // Aggregate statistics
}
```

**Success Criteria:**

- [ ] Heat scores persist across dispatch cycles
- [ ] `ada memory list --show-heat` shows tier indicators (🔥/🟠/🧊)
- [ ] Reference count increments on memory access
- [ ] Decay pass moves entries between tiers correctly

### 3.2 Terminal Mode (Issue #125)

**Current State:** Scaffolding complete (C343).

**Sprint 2 Scope:**

- Full implementation of `ada terminal` command
- Signal capture from shell input
- Headless mode for benchmarks
- Bridge to heat scoring

**Implementation Contract:**

```typescript
// Terminal mode entry point
interface TerminalOptions {
  headless?: boolean; // No UI output
  signalThreshold?: number; // Min importance to emit
  verbose?: boolean; // Show thresholds
}

// Terminal signals feed into heat system
interface TerminalSignal {
  type: 'input' | 'output' | 'error' | 'completion';
  intensity: number; // 0.0-1.0
  content: string;
  timestamp: Date;
}
```

**Success Criteria:**

- [ ] `ada terminal` starts interactive shell mode
- [ ] `ada terminal --headless` runs without UI (for benchmarks)
- [ ] Terminal signals update heat scores in real-time
- [ ] Debounce prevents heat spam (500ms threshold per C405)

### 3.3 Memory Stream Foundation

**Current State:** Specced in cognitive-memory-architecture.md Phase 1.

**Sprint 2 Scope:**

- JSONL-based stream (`agents/memory/stream.jsonl`)
- Basic append/query operations
- Integration with dispatch logging
- Foundation for Phase 2-4 memory features

**Implementation Contract:**

```typescript
interface MemoryEntry {
  id: string;
  cycle: number;
  timestamp: string;
  role: string;
  action: string;
  importance: number; // 1-10, LLM-assigned
  type: 'action' | 'observation' | 'reflection' | 'decision';
  tags: string[];
  content: string;
  issueRefs?: number[];
  prRefs?: number[];
  tokenEstimate: number;
}

interface MemoryStream {
  append(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<MemoryEntry>;
  query(filter: {
    role?: string;
    minImportance?: number;
    cycleRange?: [number, number];
    tags?: string[];
    limit?: number;
  }): Promise<MemoryEntry[]>;
  getRecent(count: number): Promise<MemoryEntry[]>;
}
```

**Success Criteria:**

- [ ] Dispatch cycles log to stream.jsonl automatically
- [ ] Query by role, importance, cycle range works
- [ ] Recent entries retrievable for context loading
- [ ] Stream file is human-readable and git-diffable

---

## 4. Integration Points

### 4.1 Heat ↔ Memory Stream

Memory stream entries should have heat metadata:

```typescript
interface MemoryEntry {
  // ... existing fields
  heatScore?: number; // Computed on access
  heatTier?: HeatTier; // hot | warm | cold
}
```

When `stream.query()` is called, results are ranked by:

```
score = 0.6 × semanticRelevance + 0.4 × heatScore
```

### 4.2 Terminal ↔ Heat

Terminal signals update heat scores:

```typescript
// On terminal input that references a memory
function onTerminalReference(memoryId: string, signalIntensity: number) {
  heatStore.increment(memoryId);
  // signalIntensity > 0.7 → additional boost
  if (signalIntensity > 0.7) {
    heatStore.boost(memoryId, 0.1);
  }
}
```

### 4.3 Dispatch ↔ Stream

Dispatch cycle completion logs to stream:

```typescript
// In ada dispatch complete
const entry = await memoryStream.append({
  cycle: currentCycle,
  role: currentRole,
  action: actionDescription,
  importance: llmRateImportance(actionDescription), // 1-10
  type: 'action',
  tags: extractTags(actionDescription),
  content: fullContent,
  issueRefs: extractIssueRefs(content),
  prRefs: extractPrRefs(content),
  tokenEstimate: estimateTokens(content),
});
```

---

## 5. Success Criteria

### Sprint 2 Complete When:

| Feature       | Criteria                                               | Owner       |
| ------------- | ------------------------------------------------------ | ----------- |
| Heat Store    | Persistence works, CLI commands functional             | Engineering |
| Heat CLI      | `--show-heat`, `--tier`, `heat`, `decay` commands work | Engineering |
| Terminal Mode | `ada terminal` interactive + headless modes work       | Engineering |
| Memory Stream | Dispatch logs to stream, query works                   | Engineering |
| Integration   | Heat ↔ Stream ↔ Terminal bridges functional            | Frontier    |
| Tests         | All new code has unit tests, CI passes                 | QA          |
| Docs          | CLI help updated, ADRs for decisions                   | Ops         |

### Metrics

| Metric                   | Target                    |
| ------------------------ | ------------------------- |
| Heat CLI latency         | < 100ms for list commands |
| Memory stream append     | < 50ms per entry          |
| Terminal signal debounce | 500ms (configurable)      |
| Test coverage            | > 80% for new modules     |

---

## 6. Risk Analysis

| Risk                                | Impact | Likelihood | Mitigation                                        |
| ----------------------------------- | ------ | ---------- | ------------------------------------------------- |
| Heat store performance at scale     | Medium | Low        | JSONL is simple; upgrade to SQLite if needed      |
| Terminal mode cross-platform issues | Medium | Medium     | Focus on Linux/macOS first; Windows later         |
| Memory stream grows too large       | Medium | Medium     | Implement archival after 100 cycles               |
| Integration complexity              | High   | Medium     | Well-defined interfaces, integration tests        |
| Reflexion Phase 2 scope creep       | Medium | Low        | Keep Sprint 2 to prep only; full impl in Sprint 3 |

---

## 7. Connection to Sprint 3+

### Sprint 3: Reflexion Phase 2 (Full Implementation)

With Sprint 2 foundation complete:

- Pattern detection uses memory stream data
- Amendment proposals created via GitHub issues
- Human approval workflow implemented
- Playbook self-modification with safety gates

### Sprint 4: Cognitive Memory Phase 4

- Full innate/learned classification
- Vector search integration (ChromaDB/SQLite-vec)
- Archival tier implementation
- Reflection layer for insight synthesis

---

## 8. References

| Document                      | Path                                                          | Purpose                                |
| ----------------------------- | ------------------------------------------------------------- | -------------------------------------- |
| Cognitive Memory Architecture | docs/design/cognitive-memory-architecture.md                  | 3-tier memory system design            |
| Heat Scoring Spec             | docs/research/cognitive-memory-innate-learned-heat-scoring.md | Innate/learned with decay              |
| Reflexion Phase 2 Spec        | docs/research/reflexion-phase2-playbook-refinement-spec.md    | Pattern detection for self-improvement |
| UX Decisions                  | docs/design/sprint-2-ux-design-decisions-c405.md              | Resolved UI questions                  |
| Heat Core Module              | packages/core/src/heat/                                       | Implemented calculation logic          |
| Terminal Scaffolding          | packages/cli/src/commands/                                    | Phase flags and types                  |

**Issues:**

- **#108** — Reflexion roadmap (Phase 1c ✅, Phase 2 this sprint)
- **#113** — Cognitive Memory (Research ✅, implementation this sprint)
- **#118** — Heat Scoring (Core ✅, store + CLI this sprint)
- **#125** — Terminal Mode (Scaffolding ✅, implementation this sprint)

---

_Multiple spec documents across many cycles need execution protocols — this plan consolidates adapter specs, methodology docs, and timeline references into a single actionable plan before sprint kickoff (L161)._

**— 🌌 The Frontier, Cycle 409**
