/**
 * @ada/core — Memory Lifecycle Manager
 *
 * Implements Phase 3.2 of PLAT-002: Memory Lifecycle System.
 * Orchestrates the three-tier memory system (hot/warm/cold) and
 * manages transitions between tiers based on importance scoring.
 *
 * Architecture:
 * - Hot tier: bank.md (markdown, read every cycle)
 * - Warm tier: Vector store (semantic search on demand)
 * - Cold tier: Archives (explicit search only)
 *
 * The lifecycle manager:
 * 1. Indexes memory entries from bank.md into the vector store
 * 2. Tracks importance scores via ImportanceTracker
 * 3. Performs tier transitions based on access patterns and importance
 * 4. Provides unified search across all tiers
 *
 * @see docs/research/embedding-vector-storage-evaluation.md
 * @see Issue #17 — feat(core): sophisticated memory retrieval with embeddings
 * @packageDocumentation
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { EmbeddingProvider, MemoryEntry, SearchResult } from './embedding.js';
import { extractMemoryEntries } from './embedding.js';
import type { JsonVectorStore, VectorSearchFilter } from './json-vector-store.js';
import type { ImportanceTracker, LifecycleCheckResult } from './importance.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Result of a lifecycle transition cycle.
 */
export interface LifecycleTransitionResult {
  /** ISO timestamp of the transition */
  readonly timestamp: string;
  /** Current dispatch cycle number */
  readonly cycle: number;
  /** Entries demoted from hot to warm */
  readonly demotedToWarm: readonly string[];
  /** Entries demoted from warm to cold */
  readonly demotedToCold: readonly string[];
  /** Entries promoted from warm to hot */
  readonly promotedToHot: readonly string[];
  /** Entries removed (forgotten) */
  readonly forgotten: readonly string[];
  /** New entries indexed from bank.md */
  readonly newlyIndexed: readonly string[];
  /** Any errors encountered */
  readonly errors: readonly string[];
}

/**
 * Configuration for the lifecycle manager.
 */
export interface LifecycleConfig {
  /** Path to agents directory */
  readonly agentsDir: string;
  /** Path to bank.md relative to agentsDir */
  readonly bankPath: string;
  /** Whether to auto-save after transitions */
  readonly autoSave: boolean;
  /** Minimum similarity score for search results */
  readonly minSearchScore: number;
}

/**
 * Default lifecycle configuration.
 */
export const DEFAULT_LIFECYCLE_CONFIG: LifecycleConfig = {
  agentsDir: 'agents',
  bankPath: 'memory/bank.md',
  autoSave: true,
  minSearchScore: 0.1,
} as const;

/**
 * Unified search result with tier information.
 */
export interface TieredSearchResult extends SearchResult {
  /** Which tier this result came from */
  readonly tier: 'hot' | 'warm' | 'cold';
}

// ─── Memory Lifecycle Manager ────────────────────────────────────────────────

/**
 * Orchestrates the three-tier memory lifecycle system.
 *
 * Coordinates between:
 * - bank.md (hot tier, always available)
 * - JsonVectorStore (warm tier, semantic search)
 * - ImportanceTracker (scoring and transition decisions)
 *
 * Usage:
 * ```ts
 * const manager = new MemoryLifecycleManager(
 *   provider,
 *   vectorStore,
 *   importanceTracker,
 *   { agentsDir: '/path/to/agents' }
 * );
 * await manager.initialize();
 *
 * // Each dispatch cycle:
 * const transitions = await manager.runLifecycleCycle(currentCycleNumber);
 *
 * // Semantic search across tiers:
 * const results = await manager.search("What LLM did we choose?", 5);
 * ```
 */
export class MemoryLifecycleManager {
  private readonly config: LifecycleConfig;
  private hotEntries: Map<string, MemoryEntry> = new Map();
  private initialized: boolean = false;

  /**
   * Create a MemoryLifecycleManager.
   *
   * @param embeddingProvider - Provider for generating embeddings
   * @param vectorStore - Persistent vector store for warm tier
   * @param importanceTracker - Tracks importance scores
   * @param config - Configuration options
   */
  constructor(
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly vectorStore: JsonVectorStore,
    private readonly importanceTracker: ImportanceTracker,
    config: Partial<LifecycleConfig> = {}
  ) {
    this.config = { ...DEFAULT_LIFECYCLE_CONFIG, ...config };
  }

  /**
   * Initialize the lifecycle manager.
   *
   * Loads bank.md and syncs with the vector store.
   */
  async initialize(): Promise<void> {
    // Load hot tier from bank.md
    await this.loadHotTier();

    // Ensure all hot entries are indexed in vector store
    await this.syncHotToVector();

    this.initialized = true;
  }

  /**
   * Load hot tier entries from bank.md.
   */
  private async loadHotTier(): Promise<void> {
    const bankPath = join(this.config.agentsDir, this.config.bankPath);

    try {
      const content = await readFile(bankPath, 'utf-8');
      const entries = extractMemoryEntries(content);

      this.hotEntries.clear();
      for (const entry of entries) {
        this.hotEntries.set(entry.id, entry);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // No bank.md yet — start with empty hot tier
        this.hotEntries.clear();
      } else {
        throw error;
      }
    }
  }

  /**
   * Sync hot tier entries to the vector store.
   *
   * Ensures all entries in bank.md are indexed and marked as 'hot' tier.
   * Also registers entries with the importance tracker.
   *
   * @param currentCycle - Optional cycle number for importance tracking (default: 1)
   */
  private async syncHotToVector(currentCycle: number = 1): Promise<void> {
    const entries = Array.from(this.hotEntries.values());
    if (entries.length === 0) return;

    // Generate embeddings for all hot entries
    const texts = entries.map((e) => e.content);
    const embeddings = await this.embeddingProvider.embedBatch(texts);

    // Upsert to vector store
    const embedded = entries.map((entry, i) => {
      const emb = embeddings[i];
      if (!emb) {
        throw new Error(`Missing embedding for entry ${entry.id}`);
      }
      return { entry, embedding: emb };
    });

    await this.vectorStore.upsert(embedded);

    // Mark all hot entries as 'hot' tier in vector store
    const hotIds = entries.map((e) => e.id);
    this.vectorStore.setTier(hotIds, 'hot');

    // Register all entries with the importance tracker
    for (const entry of entries) {
      this.importanceTracker.getOrCreate(entry.id, entry.kind, currentCycle);
    }
  }

  /**
   * Run a complete lifecycle cycle.
   *
   * This should be called at the end of each dispatch cycle:
   * 1. Re-sync hot tier from bank.md (may have new entries)
   * 2. Update importance scores
   * 3. Check for tier transitions
   * 4. Execute transitions
   * 5. Save state
   *
   * @param currentCycle - Current dispatch cycle number
   * @returns Details of what changed
   */
  async runLifecycleCycle(currentCycle: number): Promise<LifecycleTransitionResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const result: {
      timestamp: string;
      cycle: number;
      demotedToWarm: string[];
      demotedToCold: string[];
      promotedToHot: string[];
      forgotten: string[];
      newlyIndexed: string[];
      errors: string[];
    } = {
      timestamp: new Date().toISOString(),
      cycle: currentCycle,
      demotedToWarm: [],
      demotedToCold: [],
      promotedToHot: [],
      forgotten: [],
      newlyIndexed: [],
      errors: [],
    };

    try {
      // 1. Re-load hot tier (may have new entries from this cycle's updates)
      const previousHotIds = new Set(this.hotEntries.keys());
      await this.loadHotTier();

      // Find newly added entries
      for (const id of this.hotEntries.keys()) {
        if (!previousHotIds.has(id)) {
          result.newlyIndexed.push(id);
        }
      }

      // 2. Sync any new entries to vector store
      if (result.newlyIndexed.length > 0) {
        await this.syncHotToVector();

        // Create importance records for new entries
        for (const id of result.newlyIndexed) {
          const entry = this.hotEntries.get(id);
          if (entry) {
            this.importanceTracker.getOrCreate(entry.id, entry.kind, currentCycle);
          }
        }
      }

      // 3. Update all importance scores for the new cycle
      this.importanceTracker.updateAllScores(currentCycle);

      // 4. Check what transitions are needed
      const hotIds = this.vectorStore.getEntriesByTier('hot');
      const warmIds = this.vectorStore.getEntriesByTier('warm');
      const coldIds = this.vectorStore.getEntriesByTier('cold');

      const check = this.importanceTracker.checkLifecycle(
        currentCycle,
        hotIds,
        warmIds,
        coldIds
      );

      // 5. Execute transitions
      await this.executeTransitions(check, result);

      // 6. Save state if auto-save is enabled
      if (this.config.autoSave) {
        await this.save();
      }
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : String(error)
      );
    }

    return result;
  }

  /**
   * Execute tier transitions based on lifecycle check results.
   */
  private async executeTransitions(
    check: LifecycleCheckResult,
    result: {
      demotedToWarm: string[];
      demotedToCold: string[];
      promotedToHot: string[];
      forgotten: string[];
    }
  ): Promise<void> {
    // Demote hot → warm
    if (check.demoteToWarm.length > 0) {
      this.vectorStore.setTier(check.demoteToWarm, 'warm');
      result.demotedToWarm.push(...check.demoteToWarm);

      // Remove from hot entries map (they're now only in vector store)
      for (const id of check.demoteToWarm) {
        this.hotEntries.delete(id);
      }
    }

    // Demote warm → cold
    if (check.demoteToCold.length > 0) {
      this.vectorStore.setTier(check.demoteToCold, 'cold');
      result.demotedToCold.push(...check.demoteToCold);
    }

    // Promote warm → hot
    if (check.promoteToHot.length > 0) {
      this.vectorStore.setTier(check.promoteToHot, 'hot');
      result.promotedToHot.push(...check.promoteToHot);

      // Re-add to hot entries map
      for (const id of check.promoteToHot) {
        const stored = this.vectorStore.getEntry(id);
        if (stored) {
          this.hotEntries.set(id, {
            id: stored.id,
            kind: stored.kind,
            content: stored.content,
            role: stored.role,
            date: stored.date,
            tags: stored.tags,
          });
        }
      }
    }

    // Forget cold entries that are below threshold
    if (check.canForget.length > 0) {
      await this.vectorStore.remove(check.canForget);
      this.importanceTracker.removeEntries(check.canForget);
      result.forgotten.push(...check.canForget);
    }
  }

  /**
   * Search across all memory tiers.
   *
   * Searches hot, warm, and cold tiers and returns unified results.
   * Results include tier information for transparency.
   *
   * @param queryText - Natural language query
   * @param topK - Maximum results per tier
   * @param tiers - Which tiers to search (default: hot + warm)
   * @returns Ranked results with tier information
   */
  async search(
    queryText: string,
    topK: number = 5,
    tiers: readonly ('hot' | 'warm' | 'cold')[] = ['hot', 'warm']
  ): Promise<readonly TieredSearchResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Generate query embedding
    const queryEmbedding = await this.embeddingProvider.embed(queryText);

    // Search with tier filter
    const filter: VectorSearchFilter = { tiers };
    const results = await this.vectorStore.searchWithFilter(
      queryEmbedding,
      topK * tiers.length, // Get more results to merge
      filter,
      true // Track access for importance
    );

    // Enhance results with tier info
    const tieredResults: TieredSearchResult[] = results
      .filter((r) => r.score >= this.config.minSearchScore)
      .map((r) => {
        const stored = this.vectorStore.getEntry(r.entry.id);
        return {
          ...r,
          tier: stored?.tier ?? 'warm',
        };
      });

    // Track access in importance tracker
    const currentCycle = this.importanceTracker.lastUpdateCycle;
    for (const result of tieredResults) {
      this.importanceTracker.trackAccess(
        result.entry.id,
        result.entry.kind,
        currentCycle
      );
    }

    return tieredResults.slice(0, topK);
  }

  /**
   * Get entries currently in the hot tier.
   */
  getHotEntries(): readonly MemoryEntry[] {
    return Array.from(this.hotEntries.values());
  }

  /**
   * Get statistics about the memory lifecycle.
   */
  getStats(): {
    hot: number;
    warm: number;
    cold: number;
    total: number;
    importanceTracked: number;
    avgImportance: number;
  } {
    const vectorStats = this.vectorStore.getStats();
    const importanceStats = this.importanceTracker.getStats();

    return {
      hot: vectorStats.byTier.hot,
      warm: vectorStats.byTier.warm,
      cold: vectorStats.byTier.cold,
      total: vectorStats.total,
      importanceTracked: importanceStats.total,
      avgImportance: importanceStats.avgScore,
    };
  }

  /**
   * Save all state (vector store + importance tracker).
   */
  async save(): Promise<void> {
    await Promise.all([
      this.vectorStore.save(),
      this.importanceTracker.save(),
    ]);
  }

  /**
   * Force re-index all entries from bank.md.
   *
   * Useful when the embedding provider changes or after manual edits.
   *
   * @param currentCycle - Current dispatch cycle for importance tracking
   */
  async reindex(currentCycle: number): Promise<number> {
    // Clear existing entries
    const existingIds = await this.vectorStore.listIds();
    await this.vectorStore.remove(existingIds);

    // Reload and sync
    await this.loadHotTier();
    await this.syncHotToVector();

    // Reset importance for all entries
    for (const entry of this.hotEntries.values()) {
      this.importanceTracker.getOrCreate(entry.id, entry.kind, currentCycle);
    }

    if (this.config.autoSave) {
      await this.save();
    }

    return this.hotEntries.size;
  }
}

// ─── Factory Function ────────────────────────────────────────────────────────

/**
 * Create and initialize a MemoryLifecycleManager.
 *
 * @param embeddingProvider - Provider for generating embeddings
 * @param vectorStore - Loaded JsonVectorStore
 * @param importanceTracker - Loaded ImportanceTracker
 * @param config - Configuration options
 * @returns Initialized lifecycle manager
 */
export async function createLifecycleManager(
  embeddingProvider: EmbeddingProvider,
  vectorStore: JsonVectorStore,
  importanceTracker: ImportanceTracker,
  config: Partial<LifecycleConfig> = {}
): Promise<MemoryLifecycleManager> {
  const manager = new MemoryLifecycleManager(
    embeddingProvider,
    vectorStore,
    importanceTracker,
    config
  );
  await manager.initialize();
  return manager;
}
