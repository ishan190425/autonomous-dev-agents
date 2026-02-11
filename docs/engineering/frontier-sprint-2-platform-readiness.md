# Frontier Sprint 2 Platform Readiness Assessment

> **Status:** Ready  
> **Author:** 🌌 Frontier — Cycle 369  
> **Sprint 2 Kickoff:** Feb 28, 2026  
> **Related:** Engineering Readiness (C363), Heat Scoring (#118), Reflexion (#108), Cognitive Memory (#113), Observability (C359)

---

## Executive Summary

Platform infrastructure is **READY** for Sprint 2. Three interconnected subsystems are fully specified with clear implementation paths and integration points.

| Subsystem                | Issue | Specs Complete     | Platform Deps       | Sprint 2 Scope      |
| ------------------------ | ----- | ------------------ | ------------------- | ------------------- |
| Heat Scoring Core        | #118  | C340-C342, Phase4a | None — foundational | Full implementation |
| Reflexion Phase 2        | #108  | C248 spec          | Heat + Memory       | Pattern detection   |
| Cognitive Memory         | #113  | C258 research      | Heat Scoring        | Tiered integration  |
| Observability Activation | #83   | C359 spec          | Heat for metrics    | Estimation fallback |

---

## 1. Heat Scoring Platform (#118)

### Architecture Overview

Heat scoring is the foundational platform layer. All other Sprint 2 features depend on it.

```
┌────────────────────────────────────────────────────────────────┐
│                      Platform Layer (New)                       │
├────────────────────────────────────────────────────────────────┤
│  packages/core/src/heat/                                        │
│  ├── types.ts      → HeatScore, HeatMetadata, HeatConfig       │
│  ├── calculate.ts  → calculateHeat(), getHeatTier(), decay()   │
│  ├── store.ts      → HeatStore class (in-memory + persistence) │
│  └── index.ts      → Barrel exports                            │
├────────────────────────────────────────────────────────────────┤
│  Integration Points:                                            │
│  • memory-stream.ts  → recallSearch() uses heat ranking        │
│  • dispatch.ts       → incrementReferences() on context load   │
│  • observe.ts        → heat stats in metrics                   │
└────────────────────────────────────────────────────────────────┘
```

### Week 1: Core Heat Module

**Priority: P0 — Blocking all other platform features**

```typescript
// packages/core/src/heat/types.ts
export interface HeatScore {
  entityId: string;
  score: number; // 0.0 - 1.0
  tier: 'hot' | 'warm' | 'cold';
  referenceCount: number;
  lastAccessAt: number; // Unix timestamp
  decayRate: number; // Per-entity (memory class driven)
}

// packages/core/src/heat/calculate.ts
export const HEAT_THRESHOLDS = { HOT: 0.8, WARM: 0.4 } as const;

export function calculateHeat(metadata: HeatMetadata): number;
export function getHeatTier(score: number): 'hot' | 'warm' | 'cold';
export function projectDecay(entry: HeatMetadata, days: number): number;
```

**Tests required:** 15-20 unit tests covering:

- Innate memories always return 1.0
- Decay function correctness across time ranges
- Reference count boost with diminishing returns
- Tier boundary transitions

### Week 2: Storage Layer

```typescript
// packages/core/src/heat/store.ts
export class HeatStore {
  constructor(options: { persistence?: 'jsonl' | 'sqlite'; path?: string });

  record(entityId: string, weight?: number): void;
  get(entityId: string): HeatScore | undefined;
  top(n: number): HeatScore[];
  decay(now?: number): DecayStats;

  // Batch operations for dispatch cycles
  batchIncrement(ids: readonly string[]): void;
}
```

**Persistence decision:** JSONL for Sprint 2 (simplicity), SQLite evaluation for Sprint 3 if performance issues arise with large repos.

### Week 3: Integration & CLI

```bash
# CLI commands (coordinate with Engineering)
ada heat list              # Top 10 entities by heat
ada heat stats             # Tier distribution
ada heat decay --dry-run   # Preview decay without applying
```

**Integration with dispatch:**

```typescript
// In ada dispatch start
const context = await loadContext();
await heatStore.batchIncrement(context.memoryIds);
console.log(
  `Memory: ${stats.hot} 🔥 hot, ${stats.warm} 🟠 warm, ${stats.cold} 🧊 cold`
);
```

---

## 2. Reflexion Phase 2 Platform (#108)

### Pattern Detection Engine

Phase 2 requires platform-level pattern detection that builds on heat scoring.

```
┌─────────────────────────────────────────────────────────────────┐
│                   Reflexion Platform Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  packages/core/src/reflexion/                                    │
│  ├── patterns.ts   → Pattern detection algorithm                │
│  ├── proposals.ts  → PlaybookProposal generation                │
│  └── index.ts      → Barrel exports                             │
├─────────────────────────────────────────────────────────────────┤
│  Dependencies:                                                   │
│  • Heat scoring → Hot reflections have higher pattern weight    │
│  • Memory stream → Source of reflection history                 │
│  • Rotation history → Cycle metadata for pattern context        │
└─────────────────────────────────────────────────────────────────┘
```

### Pattern Types & Detection

| Pattern Type       | Threshold | Heat Integration                  |
| ------------------ | --------- | --------------------------------- |
| Repeated Mistake   | 3+ times  | Higher weight if from hot cycles  |
| Consistent Success | 5+ times  | Cross-reference with heat trends  |
| Outcome Shift      | 2+ swings | Track heat before/after the shift |
| Cross-Role Insight | 3+ roles  | Apply heat to rule propagation    |

### Implementation Phases

**Sprint 2 Scope (Weeks 2-3):**

- Pattern detection core algorithm
- Basic similarity grouping (substring + keyword matching)
- Proposal generation for single-role patterns

**Sprint 3 Scope (deferred):**

- Semantic similarity with embeddings
- Cross-role insight propagation to RULES.md
- Human-in-the-loop approval workflow

```typescript
// packages/core/src/reflexion/patterns.ts
export interface ReflectionPattern {
  type: 'repeated_mistake' | 'consistent_success' | 'outcome_shift';
  text: string;
  frequency: number;
  confidence: number; // 0-1, boosted by heat
  proposedAmendment: string;
}

export function detectPatterns(
  history: HistoryEntry[],
  role: string,
  options?: { lookbackCycles?: number; minConfidence?: number }
): ReflectionPattern[];
```

---

## 3. Cognitive Memory Tiered Integration (#113)

### Memory Class Architecture

Building on Phase 4a spec, the platform needs to support tiered memory retrieval.

```
┌───────────────────────────────────────────────────────────────┐
│                    Memory Tier Architecture                    │
├───────────────────────────────────────────────────────────────┤
│  🔥 HOT TIER (always in context)                               │
│  • Innate memories (RULES.md, roster.json, current playbook)  │
│  • Recently referenced entries (heat > 0.8)                   │
│  • Active blockers and in-progress work                       │
├───────────────────────────────────────────────────────────────┤
│  🟠 WARM TIER (semantic retrieval)                             │
│  • Entries with heat 0.4-0.8                                  │
│  • Retrieved via query similarity + heat ranking              │
│  • Most reflections and lessons land here                     │
├───────────────────────────────────────────────────────────────┤
│  🧊 COLD TIER (archived, rarely accessed)                      │
│  • Entries with heat < 0.4                                    │
│  • Candidates for compression/archival                        │
│  • Only retrieved with explicit query match                   │
└───────────────────────────────────────────────────────────────┘
```

### Integration with Memory Stream

```typescript
// Extended recallSearch with heat awareness
export async function recallSearch(
  query: string,
  options?: {
    limit?: number;
    minTier?: 'hot' | 'warm' | 'cold';
    trackReferences?: boolean; // Increment heat on access
  }
): Promise<ScoredStreamEntry[]>;

// Hot tier auto-load for dispatch context
export function getHotContext(): StreamEntry[] {
  return stream.filter(e => getHeatTier(e.heatScore) === 'hot');
}
```

### JSONL Schema Extension

Backward-compatible extension to existing entries:

```jsonl
{
  "id": "abc123",
  "cycle": 100,
  "timestamp": "2026-02-09T08:00:00Z",
  "role": "engineering",
  "content": "...",
  "importance": 8,
  "memoryClass": "learned",
  "referenceCount": 3,
  "lastAccessedAt": "2026-02-10T10:00:00Z",
  "baseImportance": 0.8
}
```

Migration: entries without heat fields default to `memoryClass: "learned"`, `referenceCount: 0`.

---

## 4. Observability Activation Bridge (#83 + C359)

### Platform-Level Metrics

The C359 spec identified autonomous agents can't self-report tokens. Platform solution:

```typescript
// packages/core/src/observe/metrics.ts
export interface CycleMetrics {
  cycleNumber: number;
  role: string;
  timestamp: string;

  // Token metrics (3 sources)
  tokensIn?: number; // Actual (from wrapper)
  tokensOut?: number; // Actual (from wrapper)
  tokensInEstimate?: number; // Estimation fallback
  tokensOutEstimate?: number;

  // Heat metrics (new for Sprint 2)
  memoryHeatStats: {
    hot: number;
    warm: number;
    cold: number;
    averageHeat: number;
  };

  // Reflexion metrics (new for Sprint 2)
  reflectionScore?: number; // Quality of reflection
  patternContribution?: number; // Did this cycle feed a pattern?
}
```

### Heat Stats in Observability

Every dispatch cycle records heat distribution:

```bash
ada dispatch complete --action "..."
# Internally records:
# {
#   "memoryHeatStats": { "hot": 5, "warm": 23, "cold": 12, "averageHeat": 0.58 }
# }
```

This enables:

- Memory health trending over cycles
- Identifying roles that reference more/less context
- Correlation between heat distribution and cycle success

---

## 5. Platform Dependencies Graph

```
                    ┌─────────────────┐
                    │   Heat Scoring  │  ← Foundational (Week 1)
                    │    (core/heat)  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ Tiered Memory  │  │   Reflexion    │  │  Observability │
│   Retrieval    │  │ Pattern Detect │  │    Metrics     │
│ (memory-stream)│  │  (reflexion/)  │  │   (observe/)   │
└────────────────┘  └────────────────┘  └────────────────┘
         │                   │                   │
         └───────────────────┴───────────────────┘
                             │
                    ┌────────▼────────┐
                    │   CLI Commands  │  ← Week 3
                    │ ada heat/memory │
                    └─────────────────┘
```

**Critical path:** Heat Scoring must land Week 1 before other features can integrate.

---

## 6. Risk Assessment

| Risk                           | Impact | Likelihood | Mitigation                            |
| ------------------------------ | ------ | ---------- | ------------------------------------- |
| Heat calc performance at scale | Medium | Low        | Lazy calculation, cache tier results  |
| JSONL bloat with heat fields   | Low    | Medium     | Compression already in place (R-002)  |
| Pattern false positives        | Medium | Medium     | Conservative thresholds, human review |
| Cross-package type sync        | Low    | Low        | Single source of truth in core/types  |

---

## 7. Pre-Sprint Preparation

### Already Complete ✅

- [x] Heat Scoring detailed spec (Phase 4a)
- [x] Reflexion Phase 2 pattern spec
- [x] Cognitive Memory architecture research
- [x] Observability activation spec (C359)
- [x] Engineering readiness assessment (C363)

### To Prepare Before Feb 28

- [ ] Finalize heat module directory structure with Engineering
- [ ] Align pattern detection algorithm with Research
- [ ] Confirm JSONL schema extension backward compatibility
- [ ] Create platform issues for Week 1 work

---

## 8. Success Metrics

| Metric                      | Baseline (C368) | Sprint 2 Target |
| --------------------------- | --------------- | --------------- |
| Memory entries with heat    | 0               | 100%            |
| Hot tier context load time  | N/A             | < 50ms          |
| Pattern detection per cycle | 0               | 1-3 patterns    |
| Heat stats in observability | 0               | Every cycle     |

---

## Open Questions for Sprint 2

1. **Heat persistence format:** Keep JSONL or add SQLite index for large repos?
2. **Decay frequency:** Per-cycle inline vs. daily cron job?
3. **Pattern threshold tuning:** Start conservative (5+ occurrences) vs. aggressive (3+)?

---

_Platform infrastructure ready. Heat scoring is the foundation — land it Week 1._

**— 🌌 The Frontier (Cycle 369)**
