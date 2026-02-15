/**
 * @ada/core — Heat-Integrated Memory Stream (Issue #118 — Memory Stream Integration)
 *
 * Combines MemoryStream and HeatStore for automatic heat scoring integration.
 * When memories are logged, corresponding heat entries are created.
 * When memories are searched, results are automatically combined with heat scores.
 *
 * This completes the "memory stream integration" noted as remaining for Issue #118.
 *
 * @example
 * ```typescript
 * import { HeatIntegratedStream, createHeatIntegratedStream } from '@ada-ai/core';
 *
 * const stream = createHeatIntegratedStream('./agents', { enableHeat: true });
 *
 * // Log creates both stream entry AND heat entry
 * const entry = stream.log({
 *   cycle: 653,
 *   role: 'engineering',
 *   action: 'Implemented heat integration',
 *   content: 'Full heat scoring integration with MemoryStream',
 *   importance: 8,
 * });
 *
 * // Search automatically combines semantic + heat scores
 * const results = stream.search('heat integration', { heatWeight: 0.4 });
 * // Results are ranked by combined score (semantic × heat)
 * ```
 *
 * @see Issue #118 — Heat Scoring Implementation
 * @see docs/design/heat-scoring-implementation-spec.md
 * @packageDocumentation
 */

import * as path from 'path';
import {
  MemoryStream,
  createMemoryStream,
  type StreamEntry,
  type StreamEntryInput,
  type RecallSearchOptions,
} from './memory-stream.js';
import {
  HeatStore,
  createHeatStore,
  type HeatEntry,
  type DecayResult,
} from './heat/store.js';
import {
  combineWithHeat,
  type HeatRetrievalOptions,
} from './heat-retrieval.js';
import type { MemoryClass } from './heat/types.js';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Configuration for HeatIntegratedStream.
 */
export interface HeatIntegratedStreamConfig {
  /**
   * Enable automatic heat entry creation on memoryLog().
   * Default: true
   */
  readonly enableHeat?: boolean;

  /**
   * Default memory class for new entries.
   * 'learned' for agent-acquired knowledge, 'episodic' for transient observations.
   * Default: 'learned'
   */
  readonly defaultMemoryClass?: MemoryClass;

  /**
   * Weight for heat score in combined ranking (0-1).
   * Combined = (1 - heatWeight) × semanticScore + heatWeight × heatScore
   * Default: 0.4
   */
  readonly defaultHeatWeight?: number;

  /**
   * Track references (bump heat) on retrieval.
   * Default: false (explicit opt-in to avoid inflating scores)
   */
  readonly trackOnRetrieval?: boolean;
}

/**
 * Extended search options with heat parameters.
 */
export interface HeatSearchOptions extends RecallSearchOptions {
  /**
   * Enable heat-aware ranking.
   * Default: true (when heat is enabled)
   */
  readonly withHeat?: boolean;

  /**
   * Weight for heat score (0-1).
   * Default: config.defaultHeatWeight
   */
  readonly heatWeight?: number;

  /**
   * Minimum heat tier to include ('hot', 'warm', 'cold').
   * Default: 'cold' (include all)
   */
  readonly minTier?: 'hot' | 'warm' | 'cold';

  /**
   * Track this search as a reference (boosts retrieved entries).
   * Default: config.trackOnRetrieval
   */
  readonly trackAccess?: boolean;
}

/**
 * Extended log input with heat parameters.
 */
export interface HeatLogInput extends StreamEntryInput {
  /**
   * Memory class override for this entry.
   * Default: config.defaultMemoryClass
   */
  readonly memoryClass?: MemoryClass;

  /**
   * Skip heat entry creation for this log.
   * Default: false
   */
  readonly skipHeat?: boolean;
}

/**
 * Combined result from heat-aware search.
 */
export interface HeatSearchResult {
  /** The memory entry */
  readonly entry: StreamEntry;

  /** Semantic search score (recency × importance × relevance) */
  readonly semanticScore: number;

  /** Heat score (0-1), undefined if heat disabled or missing */
  readonly heatScore: number | undefined;

  /** Heat tier ('hot', 'warm', 'cold'), undefined if no heat data */
  readonly heatTier: 'hot' | 'warm' | 'cold' | undefined;

  /** Combined ranking score */
  readonly combinedScore: number;
}

/**
 * Stats for the integrated stream.
 */
export interface IntegratedStreamStats {
  /** Number of stream entries */
  readonly streamEntries: number;

  /** Number of heat entries */
  readonly heatEntries: number;

  /** Number of entries missing heat data (orphans) */
  readonly missingHeat: number;

  /** Heat tier distribution */
  readonly heatDistribution: {
    readonly hot: number;
    readonly warm: number;
    readonly cold: number;
  };

  /** Average heat score */
  readonly averageHeat: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Default configuration values */
const DEFAULT_CONFIG: Required<HeatIntegratedStreamConfig> = {
  enableHeat: true,
  defaultMemoryClass: 'learned',
  defaultHeatWeight: 0.4,
  trackOnRetrieval: false,
};

// ─── HeatIntegratedStream Class ─────────────────────────────────────────────

/**
 * Memory stream with automatic heat scoring integration.
 *
 * Composes MemoryStream + HeatStore for seamless cognitive memory management.
 * When you log memories, heat entries are created automatically.
 * When you search, results are ranked by combined semantic + heat scores.
 */
export class HeatIntegratedStream {
  private readonly stream: MemoryStream;
  private readonly heatStore: HeatStore;
  private readonly config: Required<HeatIntegratedStreamConfig>;
  private heatEnabled: boolean;

  /**
   * Create a new HeatIntegratedStream.
   *
   * @param agentsDir - Path to agents directory (contains memory/ subdirectory)
   * @param config - Integration configuration
   */
  constructor(
    agentsDir: string,
    config: HeatIntegratedStreamConfig = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.heatEnabled = this.config.enableHeat;

    // Initialize underlying components
    const streamPath = path.join(agentsDir, 'memory', 'stream.jsonl');
    this.stream = createMemoryStream(streamPath);

    this.heatStore = createHeatStore(agentsDir);
  }

  /**
   * Initialize the stream and heat store.
   * Must be called before using search functionality.
   */
  async initialize(): Promise<void> {
    await this.heatStore.load();
  }

  /**
   * Log a memory entry with automatic heat tracking.
   *
   * @param input - Memory entry data
   * @returns The created stream entry
   */
  async log(input: HeatLogInput): Promise<StreamEntry> {
    // Create stream entry
    const entry = this.stream.memoryLog(input);

    // Create corresponding heat entry (unless disabled)
    if (this.heatEnabled && !input.skipHeat) {
      const memoryClass = input.memoryClass ?? this.config.defaultMemoryClass;
      const now = Date.now();

      const heatEntry: HeatEntry = {
        id: entry.id,
        memoryClass,
        baseImportance: entry.importance / 10, // Normalize 1-10 to 0-1
        referenceCount: 0,
        lastAccessedAt: now,
        createdAt: now,
      };

      await this.heatStore.set(heatEntry);
    }

    return entry;
  }

  /**
   * Search for relevant memories with heat-aware ranking.
   *
   * @param query - Natural language search query
   * @param options - Search options
   * @returns Ranked results (semantic × heat combined)
   */
  async search(
    query: string,
    options: HeatSearchOptions = {}
  ): Promise<HeatSearchResult[]> {
    const {
      withHeat = this.heatEnabled,
      heatWeight = this.config.defaultHeatWeight,
      minTier = 'cold',
      trackAccess = this.config.trackOnRetrieval,
      ...searchOptions
    } = options;

    // Get semantic search results
    const semanticResults = this.stream.recallSearch(query, searchOptions);

    // If heat disabled, return semantic-only results
    if (!withHeat || !this.heatEnabled) {
      return semanticResults.map((r) => ({
        entry: r.entry,
        semanticScore: r.score,
        heatScore: undefined,
        heatTier: undefined,
        combinedScore: r.score,
      }));
    }

    // Combine with heat scores
    const heatOptions: HeatRetrievalOptions = {
      minTier,
      heatWeight,
      trackAccess,
    };

    const heatAwareResults = await combineWithHeat(
      semanticResults,
      this.heatStore,
      heatOptions
    );

    // Map to our result type
    return heatAwareResults.map((r) => ({
      entry: r.entry,
      semanticScore: r.semanticScore,
      heatScore: r.heatScore,
      heatTier: r.heatTier,
      combinedScore: r.combinedScore,
    }));
  }

  /**
   * Boost an entry's heat by incrementing references.
   *
   * @param entryId - ID of the entry to boost
   * @param count - Number of reference increments (default: 1)
   */
  async boost(entryId: string, count = 1): Promise<void> {
    for (let i = 0; i < count; i++) {
      // Only save on last increment
      await this.heatStore.increment(entryId, i === count - 1);
    }
  }

  /**
   * Get integrated stats for the stream.
   */
  stats(): IntegratedStreamStats {
    const streamStats = this.stream.getStats();
    const heatStats = this.heatStore.stats();

    // Count entries missing heat data
    const allStreamEntries = this.stream.getAllEntries();
    const allStreamIds = new Set(allStreamEntries.map((e) => e.id));
    const allHeatIds = new Set(
      this.heatStore.getAllWithScores().map((e) => e.id)
    );

    let missingHeat = 0;
    for (const id of allStreamIds) {
      if (!allHeatIds.has(id)) {
        missingHeat++;
      }
    }

    return {
      streamEntries: streamStats.entryCount,
      heatEntries: heatStats.total,
      missingHeat,
      heatDistribution: heatStats.byTier,
      averageHeat: heatStats.averageHeat,
    };
  }

  /**
   * Initialize heat entries for existing stream entries that don't have them.
   * Useful for migrating existing streams to heat scoring.
   *
   * @returns Number of entries initialized
   */
  async initializeMissingHeat(): Promise<number> {
    const allEntries = this.stream.getAllEntries();
    const now = Date.now();
    let initialized = 0;

    for (const entry of allEntries) {
      // Skip if already has heat data
      if (this.heatStore.get(entry.id)) {
        continue;
      }

      const heatEntry: HeatEntry = {
        id: entry.id,
        memoryClass: this.config.defaultMemoryClass,
        baseImportance: entry.importance / 10,
        referenceCount: 0,
        lastAccessedAt: now,
        createdAt: new Date(entry.timestamp).getTime(),
      };

      await this.heatStore.set(heatEntry);
      initialized++;
    }

    return initialized;
  }

  /**
   * Run decay on heat entries.
   *
   * @param dryRun - Preview without applying (default: true)
   * @returns Decay result with processed count and tier changes
   */
  runDecay(dryRun = true): Promise<DecayResult> {
    return this.heatStore.decay({ dryRun });
  }

  /**
   * Enable or disable heat integration.
   */
  setHeatEnabled(enabled: boolean): void {
    this.heatEnabled = enabled;
  }

  /**
   * Check if heat integration is enabled.
   */
  isHeatEnabled(): boolean {
    return this.heatEnabled;
  }

  /**
   * Get the underlying MemoryStream (for advanced usage).
   */
  getStream(): MemoryStream {
    return this.stream;
  }

  /**
   * Get the underlying HeatStore (for advanced usage).
   */
  getHeatStore(): HeatStore {
    return this.heatStore;
  }
}

// ─── Factory Function ───────────────────────────────────────────────────────

/**
 * Create and initialize a HeatIntegratedStream.
 *
 * @param agentsDir - Path to agents directory
 * @param config - Integration configuration
 * @returns Initialized stream ready for use
 *
 * @example
 * ```typescript
 * const stream = await createHeatIntegratedStream('./agents');
 *
 * await stream.log({
 *   cycle: 653,
 *   role: 'engineering',
 *   action: 'Heat integration complete',
 *   content: 'MemoryStream now auto-creates heat entries',
 *   importance: 9,
 * });
 *
 * const results = await stream.search('heat integration');
 * console.log(results[0].combinedScore); // Semantic + heat
 * ```
 */
export async function createHeatIntegratedStream(
  agentsDir: string,
  config: HeatIntegratedStreamConfig = {}
): Promise<HeatIntegratedStream> {
  const stream = new HeatIntegratedStream(agentsDir, config);
  await stream.initialize();
  return stream;
}
