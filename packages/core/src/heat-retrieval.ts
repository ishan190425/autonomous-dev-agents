/**
 * @ada/core — Heat-Aware Retrieval (Cognitive Memory Phase 4)
 *
 * Bridge between MemoryStream retrieval and Heat Scoring.
 * Combines semantic search results with heat scores for ranked retrieval.
 *
 * This module addresses Issue #118 Task 6: Heat-Aware Retrieval
 * "Integrate heat scoring into retrieval for combined ranking"
 *
 * Usage:
 * ```typescript
 * import { MemoryStream } from './memory-stream.js';
 * import { HeatStore } from './heat/store.js';
 * import { combineWithHeat, HeatAwareResult } from './heat-retrieval.js';
 *
 * const stream = new MemoryStream('./memory.jsonl');
 * const heatStore = new HeatStore('./heat.jsonl');
 *
 * const results = stream.recallSearch('cognitive memory');
 * const heatAware = await combineWithHeat(results, heatStore, {
 *   minTier: 'warm',
 *   heatWeight: 0.4,
 * });
 * ```
 *
 * @see docs/design/heat-scoring-implementation-spec.md
 * @see Issue #118 — Heat Scoring Implementation
 * @packageDocumentation
 */

import type { StreamSearchResult, StreamEntry } from './memory-stream.js';
import type { HeatTier, HeatConfig } from './heat/types.js';
import { HeatStore, type HeatEntry } from './heat/store.js';
import { calculateHeatScore } from './heat/calculate.js';
import { DEFAULT_HEAT_CONFIG } from './heat/types.js';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Options for heat-aware retrieval.
 */
export interface HeatRetrievalOptions {
  /**
   * Minimum heat tier to include.
   * - 'hot': Only hot entries (>= 0.8)
   * - 'warm': Hot and warm entries (>= 0.4)
   * - 'cold': All entries (default)
   */
  readonly minTier?: HeatTier;

  /**
   * Weight for heat score in combined ranking (0-1).
   * Combined = (1 - heatWeight) × semanticScore + heatWeight × heatScore
   * Default: 0.4 (60% semantic, 40% heat)
   */
  readonly heatWeight?: number;

  /**
   * Whether to track this access (increment reference counts).
   * Default: false
   */
  readonly trackAccess?: boolean;

  /**
   * Heat configuration override.
   */
  readonly config?: HeatConfig;
}

/**
 * Search result with heat scoring applied.
 */
export interface HeatAwareResult {
  /** The original memory entry */
  readonly entry: StreamEntry;

  /** Original semantic search score */
  readonly semanticScore: number;

  /** Heat score (0-1), or undefined if no heat data */
  readonly heatScore: number | undefined;

  /** Heat tier, or undefined if no heat data */
  readonly heatTier: HeatTier | undefined;

  /** Combined score using weighted formula */
  readonly combinedScore: number;

  /** Score components for debugging */
  readonly components: {
    readonly semantic: number;
    readonly recency: number;
    readonly importance: number;
    readonly relevance: number;
    readonly heat: number | undefined;
  };
}

/**
 * Heat statistics for a retrieval result set.
 */
export interface RetrievalHeatStats {
  /** Total results before filtering */
  readonly totalResults: number;

  /** Results with heat data */
  readonly withHeatData: number;

  /** Results without heat data (will use fallback scoring) */
  readonly withoutHeatData: number;

  /** Results by tier (only counted if heat data exists) */
  readonly byTier: {
    readonly hot: number;
    readonly warm: number;
    readonly cold: number;
  };

  /** Average heat score of results with heat data */
  readonly averageHeat: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Default weight for heat score in combined ranking */
const DEFAULT_HEAT_WEIGHT = 0.4;

/** Fallback heat score when no heat data exists */
const FALLBACK_HEAT_SCORE = 0.5;

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Combine memory stream search results with heat scoring.
 *
 * @param results - Results from MemoryStream.recallSearch()
 * @param heatStore - Heat store with metadata
 * @param options - Retrieval options
 * @returns Heat-aware results sorted by combined score
 *
 * @example
 * ```typescript
 * const results = stream.recallSearch('memory architecture');
 * const heatAware = await combineWithHeat(results, heatStore, {
 *   minTier: 'warm',
 *   heatWeight: 0.4,
 * });
 *
 * for (const r of heatAware) {
 *   console.log(`${r.entry.id}: ${r.combinedScore} (heat: ${r.heatScore})`);
 * }
 * ```
 */
export async function combineWithHeat(
  results: readonly StreamSearchResult[],
  heatStore: HeatStore,
  options: HeatRetrievalOptions = {}
): Promise<HeatAwareResult[]> {
  const {
    minTier = 'cold',
    heatWeight = DEFAULT_HEAT_WEIGHT,
    trackAccess = false,
    config = DEFAULT_HEAT_CONFIG,
  } = options;

  // Get heat tier threshold
  const minTierValue = tierToValue(minTier, config);

  // Process each result
  const processed: HeatAwareResult[] = [];
  const now = Date.now();

  for (const result of results) {
    const entryId = result.entry.id;

    // Look up heat data
    const heatEntry = heatStore.get(entryId);

    let heatScore: number | undefined;
    let heatTier: HeatTier | undefined;

    if (heatEntry) {
      // Calculate current heat score
      const score = calculateHeatScore(
        {
          entityId: heatEntry.id,
          memoryClass: heatEntry.memoryClass,
          baseImportance: heatEntry.baseImportance,
          referenceCount: heatEntry.referenceCount,
          lastAccessedAt: heatEntry.lastAccessedAt,
          createdAt: heatEntry.createdAt,
        },
        config,
        now
      );
      heatScore = score.score;
      heatTier = score.tier;

      // Filter by tier
      if (heatScore < minTierValue) {
        continue;
      }

      // Track access if requested
      if (trackAccess) {
        await heatStore.increment(entryId);
      }
    } else {
      // No heat data — use fallback
      heatScore = undefined;
      heatTier = undefined;

      // If filtering by tier and no heat data, decide what to do
      // Default: include with fallback score (conservative)
      if (minTier !== 'cold' && FALLBACK_HEAT_SCORE < minTierValue) {
        continue;
      }
    }

    // Calculate combined score
    const effectiveHeat = heatScore ?? FALLBACK_HEAT_SCORE;
    const semanticScore = result.score;
    const combinedScore =
      (1 - heatWeight) * semanticScore + heatWeight * effectiveHeat;

    processed.push({
      entry: result.entry,
      semanticScore,
      heatScore,
      heatTier,
      combinedScore,
      components: {
        semantic: result.score,
        recency: result.components.recency,
        importance: result.components.importance,
        relevance: result.components.relevance,
        heat: heatScore,
      },
    });
  }

  // Sort by combined score (descending)
  processed.sort((a, b) => b.combinedScore - a.combinedScore);

  return processed;
}

/**
 * Calculate heat statistics for a result set.
 *
 * @param results - Heat-aware results from combineWithHeat
 * @returns Statistics about heat distribution
 */
export function calculateRetrievalStats(
  results: readonly HeatAwareResult[]
): RetrievalHeatStats {
  let withHeatData = 0;
  let withoutHeatData = 0;
  let totalHeat = 0;
  const byTier = { hot: 0, warm: 0, cold: 0 };

  for (const r of results) {
    if (r.heatScore !== undefined) {
      withHeatData++;
      totalHeat += r.heatScore;
      if (r.heatTier) {
        byTier[r.heatTier]++;
      }
    } else {
      withoutHeatData++;
    }
  }

  return {
    totalResults: results.length,
    withHeatData,
    withoutHeatData,
    byTier,
    averageHeat: withHeatData > 0 ? totalHeat / withHeatData : 0,
  };
}

/**
 * Initialize heat data for stream entries that don't have it.
 * Creates heat metadata based on entry properties.
 *
 * @param entries - Stream entries to initialize
 * @param heatStore - Heat store to populate
 * @param options - Initialization options
 * @returns Number of entries initialized
 *
 * @example
 * ```typescript
 * const entries = stream.recall({ limit: 1000 });
 * const initialized = await initializeHeatData(entries, heatStore, {
 *   defaultClass: 'learned',
 * });
 * console.log(`Initialized ${initialized} entries with heat data`);
 * ```
 */
export async function initializeHeatData(
  entries: readonly StreamEntry[],
  heatStore: HeatStore,
  options: {
    defaultClass?: 'learned' | 'episodic';
    overwrite?: boolean;
  } = {}
): Promise<number> {
  const { defaultClass = 'learned', overwrite = false } = options;

  let initialized = 0;
  const now = Date.now();

  for (const entry of entries) {
    // Skip if already has heat data and not overwriting
    if (!overwrite && heatStore.get(entry.id)) {
      continue;
    }

    // Create heat entry from stream entry
    const heatEntry: HeatEntry = {
      id: entry.id,
      memoryClass: defaultClass,
      baseImportance: entry.importance / 10, // Normalize 1-10 to 0-1
      referenceCount: 0,
      lastAccessedAt: now,
      createdAt: new Date(entry.timestamp).getTime(),
    };

    await heatStore.set(heatEntry);
    initialized++;
  }

  return initialized;
}

/**
 * Sync heat store with memory stream.
 * Removes heat entries for deleted stream entries.
 *
 * @param streamEntryIds - Set of valid stream entry IDs
 * @param heatStore - Heat store to clean
 * @returns Number of orphaned entries removed
 */
export async function syncHeatWithStream(
  streamEntryIds: ReadonlySet<string>,
  heatStore: HeatStore
): Promise<number> {
  // Get all heat entries with scores to access their IDs
  const allEntries = heatStore.getAllWithScores();
  let removed = 0;

  for (const entry of allEntries) {
    if (!streamEntryIds.has(entry.id)) {
      await heatStore.delete(entry.id);
      removed++;
    }
  }

  return removed;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Convert heat tier to minimum score value.
 */
function tierToValue(tier: HeatTier, config: HeatConfig): number {
  switch (tier) {
    case 'hot':
      return config.thresholds.hot;
    case 'warm':
      return config.thresholds.warm;
    case 'cold':
      return 0;
    default:
      return 0;
  }
}

/**
 * Format heat-aware results for display.
 */
export function formatHeatResults(
  results: readonly HeatAwareResult[],
  options: { showComponents?: boolean } = {}
): string {
  const { showComponents = false } = options;

  const lines: string[] = [];

  for (const r of results) {
    const tierEmoji = r.heatTier
      ? { hot: '🔥', warm: '🌡️', cold: '❄️' }[r.heatTier]
      : '❓';

    const heatStr = r.heatScore !== undefined ? r.heatScore.toFixed(2) : 'N/A';

    lines.push(
      `${tierEmoji} [${r.combinedScore.toFixed(3)}] ${r.entry.id} (heat: ${heatStr})`
    );

    if (showComponents) {
      lines.push(
        `    sem: ${r.components.semantic.toFixed(3)} | ` +
          `rec: ${r.components.recency.toFixed(2)} | ` +
          `imp: ${r.components.importance.toFixed(2)} | ` +
          `rel: ${r.components.relevance.toFixed(2)}`
      );
    }
  }

  return lines.join('\n');
}
