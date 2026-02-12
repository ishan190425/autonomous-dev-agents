/**
 * @ada/core — Heat Store (Persistence Layer)
 *
 * JSONL-backed persistence for heat scores.
 * Heat determines memory retrieval priority:
 * - hot: always in context
 * - warm: retrieved on demand
 * - cold: archived
 *
 * @example
 * ```typescript
 * import { HeatStore } from '@ada/core/heat';
 *
 * const store = new HeatStore('./agents/memory/heat.jsonl');
 * await store.load();
 *
 * await store.set({
 *   id: 'entry-123',
 *   memoryClass: 'learned',
 *   baseImportance: 0.8,
 *   referenceCount: 0,
 *   lastAccessedAt: Date.now(),
 *   createdAt: Date.now(),
 * });
 *
 * await store.increment('entry-123');
 * const entries = await store.getByTier('hot');
 * ```
 *
 * @see docs/frontier/sprint2-platform-implementation-plan-c409.md §3.1
 * @see Issue #118 — Heat Scoring Implementation
 * @packageDocumentation
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import {
  type MemoryClass,
  type HeatTier,
  type HeatConfig,
  type HeatStats,
  DEFAULT_HEAT_CONFIG,
} from './types.js';
import { calculateHeat, getHeatTier } from './calculate.js';

// ─── Heat Entry (Persisted Form) ────────────────────────────────────────────

/**
 * Persisted heat entry in JSONL format.
 * Stored one per line in heat.jsonl.
 */
export interface HeatEntry {
  /** Unique identifier for the memory entry */
  readonly id: string;

  /** Memory classification affecting decay rate */
  readonly memoryClass: MemoryClass;

  /** Initial importance score (0-1), set at creation */
  readonly baseImportance: number;

  /** Number of times this entry has been retrieved */
  referenceCount: number;

  /** Unix timestamp (ms) of last access */
  lastAccessedAt: number;

  /** Unix timestamp (ms) when entry was created */
  readonly createdAt: number;
}

/**
 * Result of a decay pass operation.
 */
export interface DecayResult {
  /** Total entries processed */
  readonly processed: number;

  /** Entries that changed tiers */
  readonly tierChanges: ReadonlyArray<{
    readonly id: string;
    readonly oldTier: HeatTier;
    readonly newTier: HeatTier;
    readonly oldScore: number;
    readonly newScore: number;
  }>;

  /** Entries moved to archive (below cold threshold, if any) */
  readonly archived: ReadonlyArray<string>;

  /** Timestamp when decay was run */
  readonly timestamp: number;
}

/**
 * Options for decay operation.
 */
export interface DecayOptions {
  /** Run without persisting changes */
  readonly dryRun?: boolean;

  /** Archive entries with heat score below this (default: no archival) */
  readonly archiveThreshold?: number;

  /** Custom config for thresholds */
  readonly config?: HeatConfig;
}

// ─── Heat Store Class ───────────────────────────────────────────────────────

/**
 * JSONL-backed heat score persistence.
 *
 * Thread-safety: Not thread-safe. Use external locking for concurrent access.
 *
 * @example
 * ```typescript
 * const store = new HeatStore('./agents/memory/heat.jsonl');
 * await store.load();
 *
 * // Add entry
 * await store.set({
 *   id: 'mem-001',
 *   memoryClass: 'learned',
 *   baseImportance: 0.7,
 *   referenceCount: 0,
 *   lastAccessedAt: Date.now(),
 *   createdAt: Date.now(),
 * });
 *
 * // Retrieve and increment
 * const entry = await store.get('mem-001');
 * await store.increment('mem-001');
 *
 * // Query by tier
 * const hotEntries = await store.getByTier('hot');
 *
 * // Run decay pass
 * const result = await store.decay({ dryRun: true });
 * ```
 */
export class HeatStore {
  /** Path to JSONL file */
  private readonly filePath: string;

  /** In-memory entries keyed by ID */
  private entries: Map<string, HeatEntry>;

  /** Configuration for heat calculations */
  private readonly config: HeatConfig;

  /** Whether store has been loaded */
  private loaded: boolean;

  /**
   * Create a new heat store.
   *
   * @param filePath - Path to JSONL file for persistence
   * @param config - Optional heat configuration (default: DEFAULT_HEAT_CONFIG)
   */
  constructor(filePath: string, config: HeatConfig = DEFAULT_HEAT_CONFIG) {
    this.filePath = filePath;
    this.config = config;
    this.entries = new Map();
    this.loaded = false;
  }

  // ─── Core Operations ────────────────────────────────────────────────────

  /**
   * Load entries from JSONL file.
   * Creates file if it doesn't exist.
   *
   * @returns Number of entries loaded
   */
  async load(): Promise<number> {
    this.entries.clear();

    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as HeatEntry;
          this.entries.set(entry.id, entry);
        } catch {
          // Skip malformed lines
          console.warn(`[HeatStore] Skipping malformed line: ${line.slice(0, 50)}...`);
        }
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist — create parent dirs
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, '', 'utf-8');
      } else {
        throw err;
      }
    }

    this.loaded = true;
    return this.entries.size;
  }

  /**
   * Persist all entries to JSONL file.
   * Writes atomically via temp file.
   */
  async save(): Promise<void> {
    this.ensureLoaded();

    const lines = Array.from(this.entries.values())
      .map((entry) => JSON.stringify(entry))
      .join('\n');

    const content = lines ? `${lines}\n` : '';

    // Atomic write via temp file
    const tempPath = `${this.filePath}.tmp`;
    await fs.writeFile(tempPath, content, 'utf-8');
    await fs.rename(tempPath, this.filePath);
  }

  /**
   * Get an entry by ID.
   *
   * @param id - Entry identifier
   * @returns Entry or null if not found
   */
  get(id: string): HeatEntry | null {
    this.ensureLoaded();
    return this.entries.get(id) ?? null;
  }

  /**
   * Set or update an entry.
   *
   * @param entry - Entry to store
   * @param persist - Whether to save immediately (default: true)
   */
  async set(entry: HeatEntry, persist: boolean = true): Promise<void> {
    this.ensureLoaded();
    this.entries.set(entry.id, { ...entry });

    if (persist) {
      await this.save();
    }
  }

  /**
   * Delete an entry by ID.
   *
   * @param id - Entry identifier
   * @param persist - Whether to save immediately (default: true)
   * @returns Whether entry was found and deleted
   */
  async delete(id: string, persist: boolean = true): Promise<boolean> {
    this.ensureLoaded();
    const deleted = this.entries.delete(id);

    if (deleted && persist) {
      await this.save();
    }

    return deleted;
  }

  /**
   * Check if an entry exists.
   *
   * @param id - Entry identifier
   * @returns Whether entry exists
   */
  has(id: string): boolean {
    this.ensureLoaded();
    return this.entries.has(id);
  }

  // ─── Reference Tracking ─────────────────────────────────────────────────

  /**
   * Increment reference count and update last accessed time.
   *
   * @param id - Entry identifier
   * @param persist - Whether to save immediately (default: true)
   * @returns Updated entry or null if not found
   */
  async increment(id: string, persist: boolean = true): Promise<HeatEntry | null> {
    this.ensureLoaded();
    const entry = this.entries.get(id);

    if (!entry) {
      return null;
    }

    const updated: HeatEntry = {
      ...entry,
      referenceCount: entry.referenceCount + 1,
      lastAccessedAt: Date.now(),
    };

    this.entries.set(id, updated);

    if (persist) {
      await this.save();
    }

    return updated;
  }

  /**
   * Batch increment multiple entries.
   *
   * @param ids - Entry identifiers
   * @returns Number of entries updated
   */
  async incrementMany(ids: ReadonlyArray<string>): Promise<number> {
    this.ensureLoaded();
    let updated = 0;
    const now = Date.now();

    for (const id of ids) {
      const entry = this.entries.get(id);
      if (entry) {
        this.entries.set(id, {
          ...entry,
          referenceCount: entry.referenceCount + 1,
          lastAccessedAt: now,
        });
        updated++;
      }
    }

    if (updated > 0) {
      await this.save();
    }

    return updated;
  }

  // ─── Tier Queries ───────────────────────────────────────────────────────

  /**
   * Get entries by heat tier.
   *
   * @param tier - Heat tier to filter by
   * @returns Entries in the specified tier, sorted by heat score (descending)
   */
  getByTier(tier: HeatTier): ReadonlyArray<HeatEntry & { heatScore: number }> {
    this.ensureLoaded();
    const results: Array<HeatEntry & { heatScore: number }> = [];

    for (const entry of this.entries.values()) {
      const heatScore = calculateHeat(
        {
          entityId: entry.id,
          memoryClass: entry.memoryClass,
          baseImportance: entry.baseImportance,
          referenceCount: entry.referenceCount,
          lastAccessedAt: entry.lastAccessedAt,
          createdAt: entry.createdAt,
        },
        this.config
      );

      const entryTier = getHeatTier(heatScore, this.config);

      if (entryTier === tier) {
        results.push({ ...entry, heatScore });
      }
    }

    // Sort by heat score descending
    return results.sort((a, b) => b.heatScore - a.heatScore);
  }

  /**
   * Get all entries with their current heat scores.
   *
   * @returns All entries with computed heat scores, sorted by score (descending)
   */
  getAllWithScores(): ReadonlyArray<HeatEntry & { heatScore: number; tier: HeatTier }> {
    this.ensureLoaded();
    const results: Array<HeatEntry & { heatScore: number; tier: HeatTier }> = [];

    for (const entry of this.entries.values()) {
      const heatScore = calculateHeat(
        {
          entityId: entry.id,
          memoryClass: entry.memoryClass,
          baseImportance: entry.baseImportance,
          referenceCount: entry.referenceCount,
          lastAccessedAt: entry.lastAccessedAt,
          createdAt: entry.createdAt,
        },
        this.config
      );

      const tier = getHeatTier(heatScore, this.config);
      results.push({ ...entry, heatScore, tier });
    }

    return results.sort((a, b) => b.heatScore - a.heatScore);
  }

  // ─── Decay Operations ───────────────────────────────────────────────────

  /**
   * Run decay pass on all entries.
   * Recalculates heat scores and tracks tier changes.
   *
   * Note: This doesn't modify entries — heat is calculated on-demand.
   * The purpose is to identify tier transitions and optionally archive cold entries.
   *
   * @param options - Decay options
   * @returns Decay result with tier changes and archived entries
   */
  async decay(options: DecayOptions = {}): Promise<DecayResult> {
    this.ensureLoaded();

    const { dryRun = false, archiveThreshold, config = this.config } = options;

    const tierChanges: Array<{
      id: string;
      oldTier: HeatTier;
      newTier: HeatTier;
      oldScore: number;
      newScore: number;
    }> = [];
    const archived: string[] = [];
    const now = Date.now();

    // Simulate decay by calculating what heat would be at future time
    // For actual decay, we just recalculate based on current time
    for (const entry of this.entries.values()) {
      const metadata = {
        entityId: entry.id,
        memoryClass: entry.memoryClass,
        baseImportance: entry.baseImportance,
        referenceCount: entry.referenceCount,
        lastAccessedAt: entry.lastAccessedAt,
        createdAt: entry.createdAt,
      };

      // Current score (what it was last time, approximately)
      const currentScore = calculateHeat(metadata, config);
      const currentTier = getHeatTier(currentScore, config);

      // New score (recalculated now — will show any decay since last access)
      const newScore = calculateHeat(metadata, config);
      const newTier = getHeatTier(newScore, config);

      // Check for tier transitions
      if (currentTier !== newTier) {
        tierChanges.push({
          id: entry.id,
          oldTier: currentTier,
          newTier,
          oldScore: currentScore,
          newScore,
        });
      }

      // Check for archival (if threshold specified)
      if (archiveThreshold !== undefined && newScore < archiveThreshold) {
        archived.push(entry.id);
      }
    }

    // If not dry run, archive entries below threshold
    if (!dryRun && archived.length > 0) {
      for (const id of archived) {
        this.entries.delete(id);
      }
      await this.save();
    }

    return {
      processed: this.entries.size + archived.length,
      tierChanges,
      archived: dryRun ? archived : archived, // Always return what would be archived
      timestamp: now,
    };
  }

  // ─── Statistics ─────────────────────────────────────────────────────────

  /**
   * Get aggregate heat statistics.
   *
   * @returns Heat statistics for all entries
   */
  stats(): HeatStats {
    this.ensureLoaded();

    const entries = Array.from(this.entries.values());

    if (entries.length === 0) {
      return {
        total: 0,
        byClass: { innate: 0, learned: 0, episodic: 0 },
        byTier: { hot: 0, warm: 0, cold: 0 },
        averageHeat: 0,
        averageReferences: 0,
      };
    }

    const byClass = { innate: 0, learned: 0, episodic: 0 };
    const byTier = { hot: 0, warm: 0, cold: 0 };
    let totalHeat = 0;
    let totalRefs = 0;

    for (const entry of entries) {
      byClass[entry.memoryClass]++;
      totalRefs += entry.referenceCount;

      const heatScore = calculateHeat(
        {
          entityId: entry.id,
          memoryClass: entry.memoryClass,
          baseImportance: entry.baseImportance,
          referenceCount: entry.referenceCount,
          lastAccessedAt: entry.lastAccessedAt,
          createdAt: entry.createdAt,
        },
        this.config
      );

      totalHeat += heatScore;
      const tier = getHeatTier(heatScore, this.config);
      byTier[tier]++;
    }

    return {
      total: entries.length,
      byClass,
      byTier,
      averageHeat: totalHeat / entries.length,
      averageReferences: totalRefs / entries.length,
    };
  }

  /**
   * Get total number of entries.
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Get the file path for this store.
   */
  get path(): string {
    return this.filePath;
  }

  // ─── Internal ───────────────────────────────────────────────────────────

  /**
   * Ensure store has been loaded before operations.
   */
  private ensureLoaded(): void {
    if (!this.loaded) {
      throw new Error(
        'HeatStore not loaded. Call store.load() before using the store.'
      );
    }
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

/**
 * Create a heat store with default agent path.
 *
 * @param agentsDir - Path to agents directory (default: 'agents')
 * @param config - Optional heat configuration
 * @returns Configured HeatStore instance (not yet loaded)
 */
export function createHeatStore(
  agentsDir: string = 'agents',
  config: HeatConfig = DEFAULT_HEAT_CONFIG
): HeatStore {
  const filePath = path.join(agentsDir, 'memory', 'heat.jsonl');
  return new HeatStore(filePath, config);
}
