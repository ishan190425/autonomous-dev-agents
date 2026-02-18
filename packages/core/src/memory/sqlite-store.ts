/**
 * SQLite Memory Store
 *
 * Production implementation of MemoryStore using:
 * - better-sqlite3 for synchronous SQLite operations
 * - sqlite-vec for vector similarity search
 *
 * @see docs/frontier/memory-migration-poc-c836.md
 * @see docs/frontier/sqlite-vec-spike-c826.md
 */

import type {
  MemoryStore,
  MemoryEntry,
  MemorySearchResult,
  MemorySearchOptions,
  MemoryStoreOptions,
  MemoryStats,
  EmbeddingProvider,
  MemoryTier,
} from './types.js';
import { randomUUID } from 'crypto';

// ==== Utility Functions (exported for testing) ====

/**
 * Calculate effective score for ranking.
 *
 * @param distance - Cosine distance (0-2, lower = more similar)
 * @param heat - Heat score (0-1)
 * @param isInnate - Whether entry is innate (gets priority boost)
 */
export function calculateEffectiveScore(
  distance: number,
  heat: number,
  isInnate: boolean
): number {
  const similarity = 1 - distance;
  if (isInnate) {
    // Innate gets a fixed boost to ensure priority
    return similarity + 0.5;
  }
  // Learned: similarity weighted by heat
  return similarity * heat;
}

/**
 * Calculate new heat score after reference.
 *
 * heat = base_importance × recency_factor × reference_count^α
 *
 * @param entry - Current entry state
 * @param alpha - Reference count exponent (default: 0.3)
 */
export function calculateHeatFromEntry(entry: MemoryEntry, alpha: number = 0.3): number {
  const base = entry.baseImportance;
  const refs = Math.max(1, entry.referenceCount + 1);
  const refFactor = Math.pow(refs, alpha);

  // Recency: decay based on time since last reference
  let recency = 1.0;
  if (entry.lastReferencedAt) {
    const hoursSinceRef =
      (Date.now() - new Date(entry.lastReferencedAt).getTime()) / (1000 * 60 * 60);
    recency = Math.exp(-0.01 * hoursSinceRef); // Slow decay
  }

  return Math.min(1.0, base * recency * refFactor);
}

/**
 * Determine tier based on heat score.
 */
export function getTierFromHeat(
  heat: number,
  currentTier: MemoryTier,
  thresholds: { hot: number; cold: number }
): MemoryTier {
  if (currentTier === 'innate') return 'innate'; // Never change innate

  if (heat >= thresholds.hot) return 'hot';
  if (heat >= thresholds.cold) return 'warm';
  return 'cold';
}

/**
 * Generate entry ID.
 *
 * - Deterministic for innate (e.g., 'innate-rules')
 * - UUID for learned
 */
export function generateEntryId(
  entry: Pick<MemoryEntry, 'tier' | 'sourceFile'>
): string {
  if (entry.tier === 'innate' && entry.sourceFile) {
    // Deterministic ID for innate content
    const basename = entry.sourceFile.split('/').pop()?.replace(/\.[^.]+$/, '') || 'unknown';
    return `innate-${basename.toLowerCase()}`;
  }
  return randomUUID();
}

// ==== SqliteMemoryStore Class ====

/**
 * SQLite-based memory store with vector embeddings.
 *
 * Features:
 * - Innate memory protection (RULES.md, playbooks)
 * - Heat-based retrieval prioritization
 * - Tier management (innate/hot/warm/cold)
 * - Background heat decay
 *
 * @example
 * ```typescript
 * const store = new SqliteMemoryStore({
 *   dbPath: './memory.db',
 *   embeddingDimension: 384,
 * }, embeddingProvider);
 *
 * await store.initialize();
 * const results = await store.search('dispatch rules', { limit: 5 });
 * ```
 */
export class SqliteMemoryStore implements MemoryStore {
  /** Store configuration */
  readonly options: Required<MemoryStoreOptions>;
  /** Embedding provider for semantic search */
  readonly embeddingProvider: EmbeddingProvider;
  /** Decay timer handle (for cleanup) */
  private decayTimer?: NodeJS.Timeout;

  constructor(options: MemoryStoreOptions, embeddingProvider: EmbeddingProvider) {
    this.embeddingProvider = embeddingProvider;
    this.options = {
      embeddingDimension: 384,
      enableHeatDecay: true,
      heatDecayIntervalMs: 60 * 60 * 1000, // 1 hour
      heatDecayFactor: 0.95,
      coldTierThreshold: 0.1,
      hotTierThreshold: 0.8,
      ...options,
    };
  }

  /**
   * Initialize the store.
   *
   * - Creates tables if they don't exist
   * - Loads sqlite-vec extension
   * - Starts heat decay background job
   */
  initialize(): Promise<void> {
    // TODO: Implement in Sprint 3 Week 1
    // 1. Import better-sqlite3 and sqlite-vec
    // 2. Create schema (see PoC script)
    // 3. Start decay timer if enabled
    return Promise.reject(new Error('SqliteMemoryStore.initialize() not yet implemented'));
  }

  /**
   * Close the store and cleanup resources.
   */
  close(): Promise<void> {
    if (this.decayTimer) {
      globalThis.clearInterval(this.decayTimer);
    }
    // TODO: Close database connection
    return Promise.reject(new Error('SqliteMemoryStore.close() not yet implemented'));
  }

  /**
   * Add or update a memory entry.
   *
   * - Generates embedding from content
   * - Sets timestamps and defaults
   * - Protected entries cannot be overwritten
   */
  upsert(
    entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MemoryEntry> {
    const now = new Date().toISOString();
    const id = generateEntryId(entry);

    // Build full entry (for reference — will be used when implemented)
    void {
      ...entry,
      id,
      referenceCount: entry.referenceCount ?? 0,
      isProtected: entry.isProtected ?? entry.tier === 'innate',
      createdAt: now,
      updatedAt: now,
    };

    // TODO: Generate embedding and insert
    // const embedding = await this.embeddingProvider.embed(entry.content);
    // Insert into memory_entries and memory_embeddings tables

    return Promise.reject(new Error('SqliteMemoryStore.upsert() not yet implemented'));
  }

  /**
   * Get an entry by ID.
   */
  get(id: string): Promise<MemoryEntry | null> {
    void id; // Acknowledge unused parameter
    // TODO: SELECT from memory_entries WHERE id = ?
    return Promise.reject(new Error('SqliteMemoryStore.get() not yet implemented'));
  }

  /**
   * Delete an entry.
   *
   * @returns true if deleted, false if not found or protected
   */
  delete(id: string): Promise<boolean> {
    void id; // Acknowledge unused parameter
    // TODO: Check is_protected, then DELETE
    return Promise.reject(new Error('SqliteMemoryStore.delete() not yet implemented'));
  }

  /**
   * Semantic search using embeddings.
   *
   * Retrieval strategy:
   * 1. Always include innate memories first (if includeInnate)
   * 2. Fill remaining slots with warm/hot by heat-weighted similarity
   * 3. Sort by effective score
   */
  search(query: string, options?: MemorySearchOptions): Promise<MemorySearchResult[]> {
    // Merge with defaults (for reference — will be used when implemented)
    void {
      limit: 10,
      includeInnate: true,
      entryTypes: [],
      roles: [],
      tiers: [],
      minHeatScore: 0,
      tags: [],
      ...options,
    };
    void query; // Acknowledge unused parameter

    // TODO: Implement tier-priority search (see PoC searchWithTierPriority)
    // 1. Generate query embedding via this.embeddingProvider
    // 2. If includeInnate, fetch all innate with boost via calculateEffectiveScore
    // 3. Fetch learned with heat-weighted scoring
    // 4. Merge and sort by effectiveScore

    return Promise.reject(new Error('SqliteMemoryStore.search() not yet implemented'));
  }

  /**
   * Record a reference to an entry.
   *
   * - Increments reference_count
   * - Updates last_referenced_at
   * - Recalculates heat_score via calculateHeatFromEntry
   * - May promote tier via getTierFromHeat (cold → warm → hot)
   */
  recordReference(id: string): Promise<void> {
    void id; // Acknowledge unused parameter
    // TODO: UPDATE reference_count, last_referenced_at, recalculate heat
    return Promise.reject(new Error('SqliteMemoryStore.recordReference() not yet implemented'));
  }

  /**
   * Get store statistics.
   */
  getStats(): Promise<MemoryStats> {
    // TODO: Aggregate queries for counts, averages
    return Promise.reject(new Error('SqliteMemoryStore.getStats() not yet implemented'));
  }

  /**
   * Run heat decay on all non-innate entries.
   *
   * @returns Number of entries updated
   */
  decayHeat(): Promise<number> {
    // TODO: UPDATE heat_score = heat_score * decay_factor WHERE tier != 'innate'
    // Then demote entries below threshold
    return Promise.reject(new Error('SqliteMemoryStore.decayHeat() not yet implemented'));
  }

  /**
   * Archive entries that have decayed below cold threshold.
   *
   * @returns Number of entries archived
   */
  archiveCold(): Promise<number> {
    // TODO: UPDATE tier = 'cold' WHERE heat_score < cold_threshold AND tier = 'warm'
    return Promise.reject(new Error('SqliteMemoryStore.archiveCold() not yet implemented'));
  }

  /**
   * Load/refresh innate memories from source files.
   *
   * - Checks file hashes for changes
   * - Re-embeds only changed content
   * - Updates existing entries, adds new ones
   *
   * @returns Number of entries refreshed
   */
  refreshInnate(): Promise<number> {
    // TODO: Delegate to InnateLoader
    return Promise.reject(new Error('SqliteMemoryStore.refreshInnate() not yet implemented'));
  }
}

/**
 * Create a memory store with default configuration.
 *
 * @param agentsDir - Path to agents directory (for innate content)
 * @param embeddingProvider - Provider for generating embeddings
 */
export function createMemoryStore(
  agentsDir: string,
  embeddingProvider: EmbeddingProvider
): SqliteMemoryStore {
  const dbPath = `${agentsDir}/memory/memory.db`;
  return new SqliteMemoryStore({ dbPath }, embeddingProvider);
}
