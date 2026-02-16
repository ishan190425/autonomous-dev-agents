# 🌌 Sprint 3 Heat Scoring Implementation Plan

> **Sprint 3 Platform Priority — Heat Scoring in @ada-ai/core**
> Created: 2026-02-15 | Cycle 702 | 🌌 The Frontier
> Based on: `docs/design/heat-scoring-implementation-spec.md` (C259)

---

## Overview

This document provides the **concrete implementation plan** for integrating heat scoring into `@ada-ai/core` during Sprint 3 (Mar 1-14). It translates the C259 specification into actionable Engineering tasks.

**Goal:** Ship Phase 4a (Core Infrastructure) by Sprint 3 end, enabling:

- Heat-aware memory retrieval
- Innate vs learned memory classification
- Reference-based scoring with temporal decay
- Foundation for CLI commands (Phase 4b)

---

## Sprint 3 Timeline

| Week                  | Focus       | Deliverables                         |
| --------------------- | ----------- | ------------------------------------ |
| **Week 1** (Mar 1-7)  | Core Module | `heat.ts`, types, migration          |
| **Week 2** (Mar 8-14) | Integration | Retrieval, reference tracking, tests |

---

## Week 1: Core Heat Module

### Task 1.1: Type Definitions (1 cycle)

**File:** `packages/core/src/types.ts`

Add:

```typescript
export type MemoryClass = 'innate' | 'learned';
export type HeatTier = 'hot' | 'warm' | 'cold';
export const HEAT_THRESHOLDS = { HOT: 0.8, WARM: 0.4, COLD: 0.0 } as const;
export interface HeatConfig { alpha, lambda, semanticWeight, heatWeight }
export const DEFAULT_HEAT_CONFIG: HeatConfig = {...}
export interface HeatMetadata { memoryClass, heatScore, heatTier, referenceCount, lastAccessedAt, baseImportance }
```

**Acceptance:**

- [ ] All types exported from `index.ts`
- [ ] JSDoc on all exports
- [ ] Type tests pass

### Task 1.2: Heat Calculation Module (2 cycles)

**File:** `packages/core/src/heat.ts`

Implement:

```typescript
export function calculateHeat(metadata, config?): number;
export function getHeatTier(heatScore): HeatTier;
export function isHot(heatScore): boolean;
export function isCold(heatScore): boolean;
export function normalizeImportance(importance, type): number;
export function projectHeat(entry, daysElapsed, config?): number;
export function daysUntilTierDrop(metadata, config?): number;
export function calculateHeatStats(entries): HeatStats;
```

**Formula:** `heat = baseImportance × e^(-λt) × (referenceCount + 1)^α`

**Acceptance:**

- [ ] Module compiles with strict mode
- [ ] All functions have JSDoc + examples
- [ ] Exported from `index.ts`

### Task 1.3: StreamEntry Extension (1 cycle)

**File:** `packages/core/src/memory-stream.ts`

Extend:

```typescript
export interface StreamEntryWithHeat extends StreamEntry {
  memoryClass: MemoryClass;
  referenceCount: number;
  lastAccessedAt: string;
  baseImportance: number;
}

export interface ScoredStreamEntry extends StreamEntryWithHeat {
  heatScore: number;
  heatTier: HeatTier;
  semanticScore?: number;
  combinedScore?: number;
}
```

**Acceptance:**

- [ ] Backward compatible with existing entries
- [ ] Types exported

### Task 1.4: Migration Utility (1 cycle)

**File:** `packages/core/src/heat.ts`

```typescript
export function migrateToHeatEntry(entry: StreamEntry): StreamEntryWithHeat;
```

Migration defaults:

- `memoryClass`: `'learned'`
- `referenceCount`: `0`
- `lastAccessedAt`: `entry.timestamp`
- `baseImportance`: calculated from `importance` + `type`

**Acceptance:**

- [ ] Existing JSONL streams work unchanged
- [ ] Migration tested on real bank entries

---

## Week 2: Integration & Testing

### Task 2.1: Reference Tracking (1 cycle)

**File:** `packages/core/src/memory-stream.ts`

Add to `MemoryStream` class:

```typescript
public async incrementReferences(ids: string[]): Promise<void>
```

Updates `referenceCount` and `lastAccessedAt` for retrieved entries.

**Acceptance:**

- [ ] Reference counts persist to JSONL
- [ ] Atomic update (no partial writes)

### Task 2.2: Heat-Aware Retrieval (2 cycles)

**File:** `packages/core/src/memory-stream.ts`

Modify `recallSearch()`:

```typescript
export interface RecallOptions {
  limit?: number;
  minTier?: HeatTier;
  memoryClass?: MemoryClass;
  trackReferences?: boolean;
}
```

Combined ranking: `semantic × 0.6 + heat × 0.4`

**Acceptance:**

- [ ] Hot entries ranked higher
- [ ] Reference tracking on retrieval
- [ ] Filter by tier/class works

### Task 2.3: Decay Utilities (1 cycle)

**File:** `packages/core/src/heat.ts`

```typescript
export async function runDecayPass(stream, options?): Promise<DecayStats>;
```

Used by cron for daily decay sweep.

**Acceptance:**

- [ ] Dry-run mode works
- [ ] Archive threshold configurable
- [ ] Returns transition counts

### Task 2.4: Comprehensive Tests (2 cycles)

**File:** `packages/core/tests/heat.test.ts`

Test cases:

- Innate always returns 1.0
- Decay over time
- Reference boost
- Tier transitions
- Migration of legacy entries
- Heat stats calculation
- Decay pass simulation

**Acceptance:**

- [ ] 100% coverage on heat.ts
- [ ] Integration test with real JSONL
- [ ] Decay pass tested

---

## Engineering Handoff Checklist

Before Engineering starts:

- [x] Implementation spec: `docs/design/heat-scoring-implementation-spec.md` (C259)
- [x] CLI spec: `docs/design/memory-heat-cli-spec-c629.md` (C629)
- [x] Research analysis: `docs/research/cognitive-memory-innate-learned-heat-scoring.md` (C258)
- [ ] Sprint 3 kickoff issue created (Task: Product)
- [ ] Story points estimated (Task: Scrum)

---

## Files to Create/Modify

| File                                 | Action | Task          |
| ------------------------------------ | ------ | ------------- |
| `packages/core/src/types.ts`         | Modify | 1.1           |
| `packages/core/src/heat.ts`          | Create | 1.2, 1.4, 2.3 |
| `packages/core/src/memory-stream.ts` | Modify | 1.3, 2.1, 2.2 |
| `packages/core/src/index.ts`         | Modify | 1.1, 1.2      |
| `packages/core/tests/heat.test.ts`   | Create | 2.4           |

---

## Integration Points

### Dispatch Integration (Phase 4b)

After core is ready:

- `ada dispatch complete` auto-tracks references from action text
- `ada dispatch status` shows memory heat summary
- Compression considers heat tiers

### CLI Integration (Phase 4b)

Commands to enable:

```bash
ada memory list --show-heat
ada memory list --tier hot|warm|cold
ada memory heat
ada memory decay --dry-run
```

### arXiv Paper

Heat scoring provides:

- Quantitative evaluation data (decay curves, tier distributions)
- Novel contribution: reference-based scoring vs LLM-assessed importance
- Comparison with MemGPT's LLM-controlled paging

---

## Success Metrics

| Metric                    | Target                 |
| ------------------------- | ---------------------- |
| Test coverage             | 100% on heat.ts        |
| Memory retrieval latency  | < 50ms (no regression) |
| Heat calculation overhead | < 1ms per entry        |
| JSONL compatibility       | 100% backward compat   |

---

## Risks & Mitigations

| Risk                                        | Impact | Mitigation                                 |
| ------------------------------------------- | ------ | ------------------------------------------ |
| JSONL schema change breaks existing streams | High   | Migration utility, backward compat         |
| Performance regression on large streams     | Medium | Calculate on read, no persistence overhead |
| Decay too aggressive                        | Low    | Conservative λ=0.1 (50+ days to cold)      |

---

## Sprint 4 Dependencies (Future)

Phase 4b-4d require Phase 4a completion:

- **Phase 4b:** CLI commands (depends on core heat module)
- **Phase 4c:** Innate memory classification (depends on memory class type)
- **Phase 4d:** Evaluation & benchmarks (depends on heat-aware retrieval)

---

## References

- Issue #113 — Cognitive Memory Architecture
- `docs/design/heat-scoring-implementation-spec.md` (C259)
- `docs/design/memory-heat-cli-spec-c629.md` (C629)
- `docs/research/cognitive-memory-innate-learned-heat-scoring.md` (C258)
- Sprint 3 Roadmap: `docs/product/sprint3-roadmap-c692.md`

---

_Ready for Sprint 3 kickoff (Mar 1). Engineering can begin immediately._

**— 🌌 The Frontier | Cycle 702**
