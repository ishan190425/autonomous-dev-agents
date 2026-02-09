# 🔥 Heat Scoring Implementation Spec — Phase 4a

> **Engineering Specification — Cognitive Memory Phase 4**  
> Innate vs Learned Memory with Reference-Based Heat Scoring  
> **Created:** 2026-02-09 | **Author:** 🌌 The Frontier (Platform & Innovation)  
> **Based on:** docs/research/cognitive-memory-innate-learned-heat-scoring.md (Research C258)

---

## Overview

This spec details the implementation of **Phase 4a: Core Infrastructure** for heat-based memory scoring. It builds on the existing MemoryStream (Phase 3) to add:

1. **Memory classification** — Innate (immutable) vs Learned (evolving)
2. **Heat scoring** — Dynamic scores based on importance, recency, and reference count
3. **Tiered retrieval** — Hot/warm/cold memory tiers with different access patterns
4. **Automatic decay** — Unreferenced memories cool over time

**Dependencies:**

- `packages/core/src/memory-stream.ts` (Phase 1)
- `packages/core/src/semantic-memory-stream.ts` (Phase 3)
- `packages/core/src/importance.ts` (scoring utilities)

---

## 1. Type Definitions

Add to `packages/core/src/types.ts`:

```typescript
// ─── Heat Scoring Types (Phase 4) ────────────────────────────────────────────

/** Memory classification for heat scoring */
export type MemoryClass = 'innate' | 'learned';

/** Heat tier derived from heat score */
export type HeatTier = 'hot' | 'warm' | 'cold';

/** Heat score thresholds */
export const HEAT_THRESHOLDS = {
  HOT: 0.8, // >= 0.8 = hot
  WARM: 0.4, // >= 0.4 = warm
  COLD: 0.0, // < 0.4 = cold
} as const;

/** Heat scoring configuration */
export interface HeatConfig {
  /** Reference weight exponent (default: 0.4) */
  readonly alpha: number;
  /** Decay rate per day (default: 0.1) */
  readonly lambda: number;
  /** Semantic score weight in combined ranking (default: 0.6) */
  readonly semanticWeight: number;
  /** Heat score weight in combined ranking (default: 0.4) */
  readonly heatWeight: number;
}

/** Default heat configuration */
export const DEFAULT_HEAT_CONFIG: HeatConfig = {
  alpha: 0.4,
  lambda: 0.1,
  semanticWeight: 0.6,
  heatWeight: 0.4,
} as const;

/** Heat metadata for a memory entry */
export interface HeatMetadata {
  /** Memory class: innate (protected) or learned (evolving) */
  readonly memoryClass: MemoryClass;
  /** Current heat score (0.0 - 1.0) */
  readonly heatScore: number;
  /** Derived heat tier */
  readonly heatTier: HeatTier;
  /** Number of times this entry has been retrieved */
  readonly referenceCount: number;
  /** ISO timestamp of last access */
  readonly lastAccessedAt: string;
  /** Initial importance weight (0.0 - 1.0) */
  readonly baseImportance: number;
}
```

---

## 2. StreamEntry Extension

Extend `StreamEntry` in `packages/core/src/memory-stream.ts`:

```typescript
/**
 * Extended stream entry with heat scoring (Phase 4)
 */
export interface StreamEntryWithHeat extends StreamEntry {
  /** Memory classification */
  readonly memoryClass: MemoryClass;
  /** Number of times retrieved */
  readonly referenceCount: number;
  /** Last access timestamp (ISO) */
  readonly lastAccessedAt: string;
  /** Base importance for heat calculation (normalized 0-1) */
  readonly baseImportance: number;
}

/**
 * Stream entry with computed heat score (for retrieval results)
 */
export interface ScoredStreamEntry extends StreamEntryWithHeat {
  /** Computed heat score */
  readonly heatScore: number;
  /** Derived heat tier */
  readonly heatTier: HeatTier;
  /** Semantic similarity score (if applicable) */
  readonly semanticScore?: number;
  /** Combined ranking score */
  readonly combinedScore?: number;
}
```

---

## 3. Heat Calculation Module

Create `packages/core/src/heat.ts`:

````typescript
/**
 * @ada/core — Heat Scoring (Cognitive Memory Phase 4)
 *
 * Implements reference-based heat scoring for memory retrieval.
 *
 * Formula: heat = baseImportance × recencyFactor × referenceCount^α
 *
 * @see docs/design/heat-scoring-implementation-spec.md
 * @see Issue #113 — Cognitive Memory Phase 4
 * @packageDocumentation
 */

import type {
  MemoryClass,
  HeatTier,
  HeatConfig,
  HeatMetadata,
} from './types.js';
import { HEAT_THRESHOLDS, DEFAULT_HEAT_CONFIG } from './types.js';

// ─── Core Heat Calculation ───────────────────────────────────────────────────

/**
 * Calculate the heat score for a memory entry.
 *
 * @param metadata - Heat metadata for the entry
 * @param config - Heat configuration (optional, uses defaults)
 * @returns Heat score between 0.0 and 1.0
 *
 * @example
 * ```typescript
 * const heat = calculateHeat({
 *   memoryClass: 'learned',
 *   referenceCount: 5,
 *   lastAccessedAt: '2026-02-08T12:00:00Z',
 *   baseImportance: 0.7
 * });
 * // Returns ~0.65 depending on current time
 * ```
 */
export function calculateHeat(
  metadata: Pick<
    HeatMetadata,
    'memoryClass' | 'referenceCount' | 'lastAccessedAt' | 'baseImportance'
  >,
  config: HeatConfig = DEFAULT_HEAT_CONFIG
): number {
  // Innate memories are always maximally hot
  if (metadata.memoryClass === 'innate') {
    return 1.0;
  }

  const { alpha, lambda } = config;

  // Days since last access
  const lastAccess = new Date(metadata.lastAccessedAt).getTime();
  const now = Date.now();
  const daysSinceAccess = (now - lastAccess) / (1000 * 60 * 60 * 24);

  // Recency factor with exponential decay
  // e^(-λt) where t is days since access
  const recencyFactor = Math.exp(-lambda * daysSinceAccess);

  // Reference boost with diminishing returns
  // (referenceCount + 1)^α where α < 1 for diminishing returns
  const referenceBoost = Math.pow(metadata.referenceCount + 1, alpha);

  // Combined heat score
  const rawHeat = metadata.baseImportance * recencyFactor * referenceBoost;

  // Normalize to 0-1, cap at 0.99 for learned memories
  // (only innate can be 1.0)
  return Math.min(Math.max(rawHeat, 0), 0.99);
}

/**
 * Determine heat tier from heat score.
 */
export function getHeatTier(heatScore: number): HeatTier {
  if (heatScore >= HEAT_THRESHOLDS.HOT) return 'hot';
  if (heatScore >= HEAT_THRESHOLDS.WARM) return 'warm';
  return 'cold';
}

/**
 * Check if a memory entry is in the hot tier (always in context).
 */
export function isHot(heatScore: number): boolean {
  return heatScore >= HEAT_THRESHOLDS.HOT;
}

/**
 * Check if a memory entry is in the cold tier (archived).
 */
export function isCold(heatScore: number): boolean {
  return heatScore < HEAT_THRESHOLDS.WARM;
}

// ─── Base Importance Calculation ─────────────────────────────────────────────

/**
 * Calculate base importance from a raw importance score (1-10).
 * Normalizes to 0.0-1.0 range with role-based weighting.
 *
 * @param importance - Raw importance score (1-10)
 * @param type - Entry type (action, observation, reflection, decision)
 * @returns Normalized base importance (0.0-1.0)
 */
export function normalizeImportance(
  importance: number,
  type: 'action' | 'observation' | 'reflection' | 'decision'
): number {
  // Base normalization: importance / 10
  const normalized = Math.max(0, Math.min(importance, 10)) / 10;

  // Type-based weighting (reflections and decisions are more important)
  const typeWeights: Record<typeof type, number> = {
    decision: 1.2, // Decisions are high-value
    reflection: 1.1, // Reflections contain learned wisdom
    action: 1.0, // Actions are baseline
    observation: 0.9, // Observations may be transient
  };

  const weighted = normalized * typeWeights[type];
  return Math.min(weighted, 1.0);
}

// ─── Decay Utilities ─────────────────────────────────────────────────────────

/**
 * Simulate heat decay for an entry without modifying it.
 * Useful for dry-run decay passes.
 *
 * @param entry - Entry with heat metadata
 * @param daysElapsed - Days to simulate
 * @param config - Heat configuration
 * @returns Projected heat score after decay
 */
export function projectHeat(
  entry: Pick<
    HeatMetadata,
    'memoryClass' | 'referenceCount' | 'baseImportance'
  >,
  daysElapsed: number,
  config: HeatConfig = DEFAULT_HEAT_CONFIG
): number {
  if (entry.memoryClass === 'innate') return 1.0;

  const futureDate = new Date(Date.now() + daysElapsed * 24 * 60 * 60 * 1000);
  return calculateHeat(
    {
      ...entry,
      lastAccessedAt: new Date().toISOString(),
    },
    config
  );
}

/**
 * Calculate days until an entry transitions to a lower tier.
 *
 * @param metadata - Current heat metadata
 * @param config - Heat configuration
 * @returns Days until tier transition (Infinity if innate or already cold)
 */
export function daysUntilTierDrop(
  metadata: HeatMetadata,
  config: HeatConfig = DEFAULT_HEAT_CONFIG
): number {
  if (metadata.memoryClass === 'innate') return Infinity;
  if (metadata.heatTier === 'cold') return Infinity;

  const targetThreshold =
    metadata.heatTier === 'hot' ? HEAT_THRESHOLDS.HOT : HEAT_THRESHOLDS.WARM;

  // Solve for t in: baseImportance × e^(-λt) × (refCount+1)^α = threshold
  // t = -ln(threshold / (baseImportance × (refCount+1)^α)) / λ

  const referenceBoost = Math.pow(metadata.referenceCount + 1, config.alpha);
  const denominator = metadata.baseImportance * referenceBoost;

  if (denominator <= targetThreshold) return 0;

  const t = -Math.log(targetThreshold / denominator) / config.lambda;

  // Account for time already elapsed
  const lastAccess = new Date(metadata.lastAccessedAt).getTime();
  const elapsed = (Date.now() - lastAccess) / (1000 * 60 * 60 * 24);

  return Math.max(0, t - elapsed);
}

// ─── Tier Statistics ─────────────────────────────────────────────────────────

/**
 * Heat tier statistics for a collection of entries.
 */
export interface HeatStats {
  /** Total entries analyzed */
  readonly total: number;
  /** Count by memory class */
  readonly byClass: {
    readonly innate: number;
    readonly learned: number;
  };
  /** Count by heat tier */
  readonly byTier: {
    readonly hot: number;
    readonly warm: number;
    readonly cold: number;
  };
  /** Average heat score */
  readonly averageHeat: number;
  /** Average reference count */
  readonly averageReferences: number;
}

/**
 * Calculate heat statistics for a collection of entries.
 */
export function calculateHeatStats(
  entries: readonly HeatMetadata[]
): HeatStats {
  if (entries.length === 0) {
    return {
      total: 0,
      byClass: { innate: 0, learned: 0 },
      byTier: { hot: 0, warm: 0, cold: 0 },
      averageHeat: 0,
      averageReferences: 0,
    };
  }

  const byClass = { innate: 0, learned: 0 };
  const byTier = { hot: 0, warm: 0, cold: 0 };
  let totalHeat = 0;
  let totalReferences = 0;

  for (const entry of entries) {
    byClass[entry.memoryClass]++;
    byTier[entry.heatTier]++;
    totalHeat += entry.heatScore;
    totalReferences += entry.referenceCount;
  }

  return {
    total: entries.length,
    byClass,
    byTier,
    averageHeat: totalHeat / entries.length,
    averageReferences: totalReferences / entries.length,
  };
}
````

---

## 4. Persistence Schema

### 4.1 JSONL Extension

Existing JSONL entries are extended with heat fields. Backward compatibility maintained — entries without heat fields are treated as learned/warm.

```jsonl
{
  "id": "abc123",
  "cycle": 100,
  "timestamp": "2026-02-09T08:00:00Z",
  "role": "engineering",
  "action": "...",
  "content": "...",
  "importance": 8,
  "type": "action",
  "tags": [
    "cli"
  ],
  "issueRefs": [
    111
  ],
  "prRefs": [],
  "tokenEstimate": 150,
  "memoryClass": "learned",
  "referenceCount": 3,
  "lastAccessedAt": "2026-02-09T10:00:00Z",
  "baseImportance": 0.8
}
```

### 4.2 Migration Strategy

Existing entries without heat fields:

- `memoryClass`: Default to `'learned'`
- `referenceCount`: Default to `0`
- `lastAccessedAt`: Default to `timestamp` (creation time)
- `baseImportance`: Calculate from `importance` and `type`

```typescript
/**
 * Migrate legacy StreamEntry to StreamEntryWithHeat.
 */
export function migrateToHeatEntry(entry: StreamEntry): StreamEntryWithHeat {
  return {
    ...entry,
    memoryClass: 'learned',
    referenceCount: 0,
    lastAccessedAt: entry.timestamp,
    baseImportance: normalizeImportance(entry.importance, entry.type),
  };
}
```

---

## 5. Retrieval Integration

### 5.1 Heat-Aware Search

Modify `recallSearch()` in `memory-stream.ts`:

```typescript
export interface RecallOptions {
  /** Maximum entries to return */
  limit?: number;
  /** Minimum heat tier to include */
  minTier?: HeatTier;
  /** Memory class filter */
  memoryClass?: MemoryClass;
  /** Whether to increment reference counts for returned entries */
  trackReferences?: boolean;
}

/**
 * Search memory with heat-aware ranking.
 */
export async function recallSearch(
  query: string,
  stream: MemoryStream,
  options: RecallOptions = {}
): Promise<ScoredStreamEntry[]> {
  const { limit = 10, minTier, memoryClass, trackReferences = true } = options;

  // 1. Get all entries with heat scores
  const entries = stream.getEntries().map(entry => ({
    ...ensureHeatFields(entry),
    heatScore: calculateHeat(entry),
    heatTier: getHeatTier(calculateHeat(entry)),
  }));

  // 2. Apply filters
  let filtered = entries;
  if (minTier) {
    const minScore =
      HEAT_THRESHOLDS[minTier.toUpperCase() as keyof typeof HEAT_THRESHOLDS];
    filtered = filtered.filter(e => e.heatScore >= minScore);
  }
  if (memoryClass) {
    filtered = filtered.filter(e => e.memoryClass === memoryClass);
  }

  // 3. Calculate semantic scores (if embeddings available)
  const withSemanticScores = await addSemanticScores(filtered, query);

  // 4. Rank by combined score
  const ranked = withSemanticScores
    .map(e => ({
      ...e,
      combinedScore:
        e.semanticScore !== undefined
          ? e.semanticScore * DEFAULT_HEAT_CONFIG.semanticWeight +
            e.heatScore * DEFAULT_HEAT_CONFIG.heatWeight
          : e.heatScore,
    }))
    .sort((a, b) => b.combinedScore - a.combinedScore);

  // 5. Take top results
  const results = ranked.slice(0, limit);

  // 6. Increment reference counts for returned entries
  if (trackReferences) {
    await stream.incrementReferences(results.map(e => e.id));
  }

  return results;
}
```

### 5.2 Reference Tracking

Add to `MemoryStream` class:

```typescript
/**
 * Increment reference counts for retrieved entries.
 * Also updates lastAccessedAt.
 */
public async incrementReferences(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;

  const now = new Date().toISOString();
  const entries = this.loadStream();

  const updated = entries.map(entry => {
    if (ids.includes(entry.id)) {
      return {
        ...entry,
        referenceCount: (entry.referenceCount ?? 0) + 1,
        lastAccessedAt: now,
      };
    }
    return entry;
  });

  this.writeStream(updated);
}
```

---

## 6. Decay Mechanism

### 6.1 Decay Job

Create utility for running decay passes (called by cron or CLI):

```typescript
/**
 * Run a decay pass on the memory stream.
 *
 * @param stream - Memory stream to process
 * @param options - Decay options
 * @returns Statistics about the decay pass
 */
export async function runDecayPass(
  stream: MemoryStream,
  options: {
    dryRun?: boolean;
    archiveThreshold?: number; // cycles cold before archive
  } = {}
): Promise<{
  processed: number;
  transitionsWarmToCold: number;
  transitionsHotToWarm: number;
  archived: number;
}> {
  const { dryRun = false, archiveThreshold = 50 } = options;

  const entries = stream.getEntries();
  let transitionsWarmToCold = 0;
  let transitionsHotToWarm = 0;
  let archived = 0;

  for (const entry of entries) {
    const currentHeat = calculateHeat(entry);
    const currentTier = getHeatTier(currentHeat);
    const previousTier = entry.heatTier ?? 'warm';

    if (currentTier !== previousTier) {
      if (previousTier === 'hot' && currentTier === 'warm')
        transitionsHotToWarm++;
      if (previousTier === 'warm' && currentTier === 'cold')
        transitionsWarmToCold++;
    }

    // Archive very cold entries (many cycles with no access)
    if (currentTier === 'cold' && entry.referenceCount === 0) {
      const daysSinceCreation =
        (Date.now() - new Date(entry.timestamp).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceCreation > archiveThreshold) {
        archived++;
        if (!dryRun) {
          // Move to archive stream
          await stream.archiveEntry(entry.id);
        }
      }
    }
  }

  return {
    processed: entries.length,
    transitionsWarmToCold,
    transitionsHotToWarm,
    archived,
  };
}
```

---

## 7. CLI Integration (Phase 4b Preview)

Commands to implement in Phase 4b:

```bash
# Show memory with heat information
ada memory list --show-heat
# Output:
# 🔥 HOT (3)
#   [abc123] engineering: Implemented dispatch CLI (heat: 0.92, refs: 12)
#   [def456] research: MemGPT analysis complete (heat: 0.85, refs: 8)
#   ...
# 🟠 WARM (15)
#   [ghi789] product: Sprint 1 goals defined (heat: 0.54, refs: 3)
#   ...
# 🧊 COLD (8)
#   [jkl012] ops: Old CI config notes (heat: 0.22, refs: 0)
#   ...

# Filter by tier
ada memory list --tier hot

# Show innate memories
ada memory innate

# Run decay pass (dry-run)
ada memory decay --dry-run

# Dispatch start shows heat stats
ada dispatch start
# Output includes:
# Memory: 26 entries (3 🔥 hot, 15 🟠 warm, 8 🧊 cold)
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

Create `packages/core/tests/heat.test.ts`:

```typescript
describe('heat scoring', () => {
  describe('calculateHeat', () => {
    it('returns 1.0 for innate memories', () => {
      const heat = calculateHeat({
        memoryClass: 'innate',
        referenceCount: 0,
        lastAccessedAt: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        baseImportance: 0.5,
      });
      expect(heat).toBe(1.0);
    });

    it('decays over time for learned memories', () => {
      const recentHeat = calculateHeat({
        memoryClass: 'learned',
        referenceCount: 5,
        lastAccessedAt: new Date().toISOString(),
        baseImportance: 0.8,
      });

      const oldHeat = calculateHeat({
        memoryClass: 'learned',
        referenceCount: 5,
        lastAccessedAt: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        baseImportance: 0.8,
      });

      expect(recentHeat).toBeGreaterThan(oldHeat);
    });

    it('increases with reference count', () => {
      const now = new Date().toISOString();

      const lowRefs = calculateHeat({
        memoryClass: 'learned',
        referenceCount: 1,
        lastAccessedAt: now,
        baseImportance: 0.7,
      });

      const highRefs = calculateHeat({
        memoryClass: 'learned',
        referenceCount: 10,
        lastAccessedAt: now,
        baseImportance: 0.7,
      });

      expect(highRefs).toBeGreaterThan(lowRefs);
    });

    it('caps learned memories at 0.99', () => {
      const heat = calculateHeat({
        memoryClass: 'learned',
        referenceCount: 1000,
        lastAccessedAt: new Date().toISOString(),
        baseImportance: 1.0,
      });
      expect(heat).toBeLessThanOrEqual(0.99);
    });
  });

  describe('getHeatTier', () => {
    it('returns hot for scores >= 0.8', () => {
      expect(getHeatTier(0.8)).toBe('hot');
      expect(getHeatTier(0.95)).toBe('hot');
      expect(getHeatTier(1.0)).toBe('hot');
    });

    it('returns warm for scores 0.4-0.8', () => {
      expect(getHeatTier(0.4)).toBe('warm');
      expect(getHeatTier(0.6)).toBe('warm');
      expect(getHeatTier(0.79)).toBe('warm');
    });

    it('returns cold for scores < 0.4', () => {
      expect(getHeatTier(0.0)).toBe('cold');
      expect(getHeatTier(0.2)).toBe('cold');
      expect(getHeatTier(0.39)).toBe('cold');
    });
  });
});
```

---

## 9. Implementation Checklist

### Phase 4a: Core Infrastructure

- [ ] Add heat types to `packages/core/src/types.ts`
- [ ] Create `packages/core/src/heat.ts` with calculation functions
- [ ] Extend `StreamEntry` interface with heat fields
- [ ] Add migration utility for legacy entries
- [ ] Implement `incrementReferences()` in MemoryStream
- [ ] Integrate heat scoring into `recallSearch()`
- [ ] Create decay pass utility
- [ ] Add unit tests for heat module
- [ ] Export new types and functions from index.ts
- [ ] Update API documentation

### Dependencies for Phase 4b (CLI)

- `ada memory list --show-heat`
- `ada memory list --tier <hot|warm|cold>`
- `ada memory decay --dry-run`
- `ada dispatch start` heat stats

### Dependencies for Phase 4c (Innate Classification)

- Define initial innate memory set
- Protection against innate modification
- `ada memory innate` command

---

## 10. Open Decisions

| Decision                           | Options                                            | Recommendation                                                    |
| ---------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| Store computed heat vs recalculate | Store (fast retrieval) vs Calculate (always fresh) | **Calculate on read** — heat is cheap to compute, always accurate |
| Heat in JSONL vs separate index    | JSONL (simple) vs Index (fast tier queries)        | **JSONL** — keep Phase 1 simplicity, add index later if needed    |
| Decay frequency                    | Per-cycle vs Daily vs Weekly                       | **Daily cron** — balance freshness with overhead                  |
| Archive vs delete cold entries     | Archive (recoverable) vs Delete (clean)            | **Archive** — never lose data, compress later                     |

---

## References

- Issue #113 — Cognitive Memory Phase 4: Innate vs Learned
- Issue #95 — Cognitive Memory Architecture (Phase 1-3)
- Research: `docs/research/cognitive-memory-innate-learned-heat-scoring.md`
- Research: `docs/research/memgpt-analysis.md`
- Research: `docs/research/generative-agents-analysis.md`

---

_"Frequently referenced memories stay hot; unreferenced ones fade to cold. Truth survives through reinforcement."_

**— 🌌 The Frontier**
