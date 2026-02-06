/**
 * @ada/core — Memory Importance Tracking
 *
 * Implements Phase 3.1 of PLAT-002: Memory Lifecycle System.
 * Tracks importance scores for memory entries to enable intelligent
 * promotion/demotion between hot/warm/cold tiers.
 *
 * Importance scoring formula:
 *   score = kindWeight * (0.4 + 0.3 * recencyFactor + 0.3 * accessFactor)
 *
 * Where:
 *   - kindWeight: base importance by entry type (0.4 - 1.0)
 *   - recencyFactor: max(0, 1 - (currentCycle - lastAccessCycle) / 100)
 *   - accessFactor: min(1, accessCount / 10)
 *
 * @see docs/architecture/memory-lifecycle-adr.md (PLAT-002)
 * @see Issue #17 — feat(core): sophisticated memory retrieval with embeddings
 * @packageDocumentation
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { MemoryEntryKind } from './embedding.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Importance tracking data for a single memory entry.
 *
 * Persisted in importance.json and updated on each access.
 */
export interface MemoryImportance {
  /** Unique identifier matching MemoryEntry.id */
  readonly entryId: string;
  /** Entry kind (for kindWeight lookup) */
  readonly kind: MemoryEntryKind;
  /** Base importance by kind (immutable once set) */
  readonly kindWeight: number;
  /** Total times this entry was accessed (retrieved via search) */
  accessCount: number;
  /** Cycle number when last accessed (0 if never) */
  lastAccessCycle: number;
  /** Cycle number when entry was created */
  readonly createdCycle: number;
  /** Computed importance score (0.0 - 1.0) */
  score: number;
}

/**
 * Configuration for importance scoring thresholds.
 */
export interface ImportanceConfig {
  /** Cycles after which recency factor decays to 0 (default: 100) */
  readonly recencyDecayCycles: number;
  /** Access count at which access factor maxes out (default: 10) */
  readonly accessFactorCap: number;
  /** Weight of base score component (default: 0.4) */
  readonly baseWeight: number;
  /** Weight of recency component (default: 0.3) */
  readonly recencyWeight: number;
  /** Weight of access frequency component (default: 0.3) */
  readonly accessWeight: number;
  /** Minimum score before entry can be forgotten (default: 0.3) */
  readonly forgetThreshold: number;
  /** Cycles without access before hot → warm demotion (default: 10) */
  readonly hotDemotionCycles: number;
  /** Cycles without access before warm → cold demotion (default: 50) */
  readonly warmDemotionCycles: number;
  /** Cycles without access before cold → forgotten (default: 200) */
  readonly coldForgetCycles: number;
}

/**
 * Persisted importance tracking state.
 */
export interface ImportanceState {
  /** Schema version for future migrations */
  readonly version: 1;
  /** Last cycle when importance was updated */
  lastUpdateCycle: number;
  /** ISO timestamp of last update */
  lastUpdated: string;
  /** Per-entry importance tracking */
  entries: Record<string, MemoryImportance>;
}

/**
 * Result of a lifecycle check.
 */
export interface LifecycleCheckResult {
  /** Entries that should be demoted from hot to warm */
  readonly demoteToWarm: readonly string[];
  /** Entries that should be demoted from warm to cold */
  readonly demoteToCold: readonly string[];
  /** Entries that should be promoted from warm to hot */
  readonly promoteToHot: readonly string[];
  /** Entries that can be forgotten (low importance, old) */
  readonly canForget: readonly string[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Kind weights as defined in PLAT-002 ADR.
 *
 * Higher weights = more important, less likely to be demoted.
 */
export const KIND_WEIGHTS: Readonly<Record<MemoryEntryKind, number>> = {
  decision: 1.0, // Architecture decisions are foundational
  blocker: 0.9, // Blockers are high-signal (decay fast when resolved)
  lesson: 0.8, // Lessons inform future behavior
  thread: 0.7, // Active threads matter while active
  question: 0.6, // Questions may become stale
  status: 0.5, // Status is ephemeral
  role_state: 0.4, // Role state is current-cycle focused
  metric: 0.5, // Metrics are reference data
};

/**
 * Default configuration values (from PLAT-002 ADR).
 */
export const DEFAULT_IMPORTANCE_CONFIG: ImportanceConfig = {
  recencyDecayCycles: 100,
  accessFactorCap: 10,
  baseWeight: 0.4,
  recencyWeight: 0.3,
  accessWeight: 0.3,
  forgetThreshold: 0.3,
  hotDemotionCycles: 10,
  warmDemotionCycles: 50,
  coldForgetCycles: 200,
} as const;

// ─── Score Calculation ───────────────────────────────────────────────────────

/**
 * Get the kind weight for a memory entry type.
 *
 * @param kind - The memory entry kind
 * @returns Weight between 0.4 and 1.0
 */
export function getKindWeight(kind: MemoryEntryKind): number {
  return KIND_WEIGHTS[kind] ?? 0.5;
}

/**
 * Calculate recency factor based on cycles since last access or creation.
 *
 * @param currentCycle - Current dispatch cycle number
 * @param referenceCycle - Cycle to measure from (lastAccess or created)
 * @param config - Importance configuration
 * @returns Factor between 0.0 and 1.0
 */
export function calculateRecencyFactor(
  currentCycle: number,
  referenceCycle: number,
  config: ImportanceConfig = DEFAULT_IMPORTANCE_CONFIG
): number {
  const cyclesSince = currentCycle - referenceCycle;
  return Math.max(0, 1 - cyclesSince / config.recencyDecayCycles);
}

/**
 * Calculate access frequency factor.
 *
 * @param accessCount - Total times entry was accessed
 * @param config - Importance configuration
 * @returns Factor between 0.0 and 1.0
 */
export function calculateAccessFactor(
  accessCount: number,
  config: ImportanceConfig = DEFAULT_IMPORTANCE_CONFIG
): number {
  return Math.min(1, accessCount / config.accessFactorCap);
}

/**
 * Calculate the overall importance score for an entry.
 *
 * Formula: score = kindWeight * (baseWeight + recencyWeight * recencyFactor + accessWeight * accessFactor)
 *
 * @param kindWeight - Base weight for the entry kind
 * @param recencyFactor - Recency factor (0-1)
 * @param accessFactor - Access frequency factor (0-1)
 * @param config - Importance configuration
 * @returns Score between 0.0 and 1.0
 */
export function calculateImportanceScore(
  kindWeight: number,
  recencyFactor: number,
  accessFactor: number,
  config: ImportanceConfig = DEFAULT_IMPORTANCE_CONFIG
): number {
  const rawScore =
    kindWeight *
    (config.baseWeight +
      config.recencyWeight * recencyFactor +
      config.accessWeight * accessFactor);
  // Clamp to [0, 1] for safety
  return Math.max(0, Math.min(1, rawScore));
}

/**
 * Calculate a full importance record for an entry.
 *
 * @param entryId - Entry identifier
 * @param kind - Entry kind
 * @param currentCycle - Current dispatch cycle
 * @param accessCount - Total access count (default: 0)
 * @param lastAccessCycle - Last access cycle (default: 0)
 * @param createdCycle - Creation cycle (default: currentCycle)
 * @param config - Importance configuration
 * @returns Full MemoryImportance record with computed score
 */
export function calculateImportance(
  entryId: string,
  kind: MemoryEntryKind,
  currentCycle: number,
  accessCount: number = 0,
  lastAccessCycle: number = 0,
  createdCycle?: number,
  config: ImportanceConfig = DEFAULT_IMPORTANCE_CONFIG
): MemoryImportance {
  const kindWeight = getKindWeight(kind);
  const created = createdCycle ?? currentCycle;
  // Use lastAccessCycle if accessed, otherwise use creation cycle
  const referenceCycle = lastAccessCycle > 0 ? lastAccessCycle : created;
  const recencyFactor = calculateRecencyFactor(
    currentCycle,
    referenceCycle,
    config
  );
  const accessFactor = calculateAccessFactor(accessCount, config);
  const score = calculateImportanceScore(
    kindWeight,
    recencyFactor,
    accessFactor,
    config
  );

  return {
    entryId,
    kind,
    kindWeight,
    accessCount,
    lastAccessCycle,
    createdCycle: created,
    score,
  };
}

// ─── Importance Tracker ──────────────────────────────────────────────────────

/**
 * Manages importance tracking for memory entries.
 *
 * Handles:
 * - Tracking access counts and timestamps
 * - Computing and updating importance scores
 * - Persistence to importance.json
 * - Lifecycle transition recommendations
 */
export class ImportanceTracker {
  private state: ImportanceState;
  private readonly statePath: string;
  private readonly config: ImportanceConfig;
  private dirty: boolean = false;

  /**
   * Create an ImportanceTracker.
   *
   * @param agentsDir - Path to the agents directory (contains state/)
   * @param config - Optional configuration overrides
   */
  constructor(
    agentsDir: string,
    config: Partial<ImportanceConfig> = {}
  ) {
    this.statePath = join(agentsDir, 'state', 'importance.json');
    this.config = { ...DEFAULT_IMPORTANCE_CONFIG, ...config };
    this.state = this.createEmptyState();
  }

  /**
   * Create an empty importance state.
   */
  private createEmptyState(): ImportanceState {
    return {
      version: 1,
      lastUpdateCycle: 0,
      lastUpdated: new Date().toISOString(),
      entries: {},
    };
  }

  /**
   * Load importance state from disk.
   *
   * Creates empty state if file doesn't exist.
   */
  async load(): Promise<void> {
    try {
      const content = await readFile(this.statePath, 'utf-8');
      const parsed = JSON.parse(content) as ImportanceState;
      // Validate version
      if (parsed.version !== 1) {
        console.warn(
          `[importance] Unknown state version ${parsed.version}, using empty state`
        );
        this.state = this.createEmptyState();
      } else {
        this.state = parsed;
      }
      this.dirty = false;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist yet — start fresh
        this.state = this.createEmptyState();
        this.dirty = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * Save importance state to disk.
   *
   * Only writes if state has changed.
   */
  async save(): Promise<void> {
    if (!this.dirty) return;

    this.state.lastUpdated = new Date().toISOString();

    // Ensure directory exists
    await mkdir(dirname(this.statePath), { recursive: true });

    await writeFile(
      this.statePath,
      `${JSON.stringify(this.state, null, 2)  }\n`,
      'utf-8'
    );
    this.dirty = false;
  }

  /**
   * Get or create importance record for an entry.
   *
   * @param entryId - Entry identifier
   * @param kind - Entry kind (required for new entries)
   * @param currentCycle - Current dispatch cycle
   * @returns The importance record (may be newly created)
   */
  getOrCreate(
    entryId: string,
    kind: MemoryEntryKind,
    currentCycle: number
  ): MemoryImportance {
    const existing = this.state.entries[entryId];
    if (existing) {
      return existing;
    }

    // Create new entry
    const importance = calculateImportance(
      entryId,
      kind,
      currentCycle,
      0, // accessCount
      0, // lastAccessCycle
      currentCycle // createdCycle
    );
    this.state.entries[entryId] = importance;
    this.dirty = true;
    return importance;
  }

  /**
   * Track an access to a memory entry (e.g., retrieved via semantic search).
   *
   * Updates access count, last access cycle, and recalculates score.
   *
   * @param entryId - Entry identifier
   * @param kind - Entry kind (needed if entry doesn't exist yet)
   * @param currentCycle - Current dispatch cycle
   * @returns Updated importance record
   */
  trackAccess(
    entryId: string,
    kind: MemoryEntryKind,
    currentCycle: number
  ): MemoryImportance {
    const importance = this.getOrCreate(entryId, kind, currentCycle);

    // Update access tracking
    importance.accessCount += 1;
    importance.lastAccessCycle = currentCycle;

    // Recalculate score
    const recencyFactor = calculateRecencyFactor(
      currentCycle,
      importance.lastAccessCycle,
      this.config
    );
    const accessFactor = calculateAccessFactor(
      importance.accessCount,
      this.config
    );
    importance.score = calculateImportanceScore(
      importance.kindWeight,
      recencyFactor,
      accessFactor,
      this.config
    );

    this.state.lastUpdateCycle = currentCycle;
    this.dirty = true;
    return importance;
  }

  /**
   * Update all importance scores for a new cycle.
   *
   * Call this at the end of each dispatch cycle to decay scores.
   *
   * @param currentCycle - Current dispatch cycle
   */
  updateAllScores(currentCycle: number): void {
    for (const importance of Object.values(this.state.entries)) {
      const recencyFactor = calculateRecencyFactor(
        currentCycle,
        importance.lastAccessCycle || importance.createdCycle,
        this.config
      );
      const accessFactor = calculateAccessFactor(
        importance.accessCount,
        this.config
      );
      importance.score = calculateImportanceScore(
        importance.kindWeight,
        recencyFactor,
        accessFactor,
        this.config
      );
    }
    this.state.lastUpdateCycle = currentCycle;
    this.dirty = true;
  }

  /**
   * Check which entries need lifecycle transitions.
   *
   * @param currentCycle - Current dispatch cycle
   * @param hotEntryIds - IDs of entries currently in hot tier
   * @param warmEntryIds - IDs of entries currently in warm tier
   * @param coldEntryIds - IDs of entries currently in cold tier
   * @returns Recommendations for tier transitions
   */
  checkLifecycle(
    currentCycle: number,
    hotEntryIds: readonly string[],
    warmEntryIds: readonly string[],
    coldEntryIds: readonly string[]
  ): LifecycleCheckResult {
    const demoteToWarm: string[] = [];
    const demoteToCold: string[] = [];
    const promoteToHot: string[] = [];
    const canForget: string[] = [];

    // Check hot entries for demotion
    for (const entryId of hotEntryIds) {
      const importance = this.state.entries[entryId];
      if (!importance) continue;

      const cyclesSinceAccess =
        currentCycle - (importance.lastAccessCycle || importance.createdCycle);
      if (cyclesSinceAccess >= this.config.hotDemotionCycles) {
        demoteToWarm.push(entryId);
      }
    }

    // Check warm entries for promotion or demotion
    for (const entryId of warmEntryIds) {
      const importance = this.state.entries[entryId];
      if (!importance) continue;

      const cyclesSinceAccess =
        currentCycle - (importance.lastAccessCycle || importance.createdCycle);

      // Promote if accessed frequently recently
      if (importance.accessCount >= 3 && cyclesSinceAccess <= 5) {
        promoteToHot.push(entryId);
      }
      // Demote if stale
      else if (cyclesSinceAccess >= this.config.warmDemotionCycles) {
        demoteToCold.push(entryId);
      }
    }

    // Check cold entries for forgetting
    for (const entryId of coldEntryIds) {
      const importance = this.state.entries[entryId];
      if (!importance) continue;

      const cyclesSinceAccess =
        currentCycle - (importance.lastAccessCycle || importance.createdCycle);
      if (
        cyclesSinceAccess >= this.config.coldForgetCycles &&
        importance.score < this.config.forgetThreshold
      ) {
        canForget.push(entryId);
      }
    }

    return {
      demoteToWarm,
      demoteToCold,
      promoteToHot,
      canForget,
    };
  }

  /**
   * Remove tracking for entries that have been forgotten.
   *
   * @param entryIds - IDs of forgotten entries
   */
  removeEntries(entryIds: readonly string[]): void {
    for (const entryId of entryIds) {
      delete this.state.entries[entryId];
    }
    if (entryIds.length > 0) {
      this.dirty = true;
    }
  }

  /**
   * Get all tracked entries sorted by importance score (descending).
   */
  getAllSorted(): readonly MemoryImportance[] {
    return Object.values(this.state.entries).sort((a, b) => b.score - a.score);
  }

  /**
   * Get a single entry's importance.
   */
  get(entryId: string): MemoryImportance | undefined {
    return this.state.entries[entryId];
  }

  /**
   * Get the total number of tracked entries.
   */
  get count(): number {
    return Object.keys(this.state.entries).length;
  }

  /**
   * Get the last update cycle.
   */
  get lastUpdateCycle(): number {
    return this.state.lastUpdateCycle;
  }

  /**
   * Get statistics about the tracked entries.
   */
  getStats(): {
    total: number;
    avgScore: number;
    byKind: Record<string, number>;
    belowForgetThreshold: number;
  } {
    const entries = Object.values(this.state.entries);
    const total = entries.length;

    if (total === 0) {
      return {
        total: 0,
        avgScore: 0,
        byKind: {},
        belowForgetThreshold: 0,
      };
    }

    const sumScore = entries.reduce((sum, e) => sum + e.score, 0);
    const avgScore = sumScore / total;

    const byKind: Record<string, number> = {};
    for (const entry of entries) {
      byKind[entry.kind] = (byKind[entry.kind] ?? 0) + 1;
    }

    const belowForgetThreshold = entries.filter(
      (e) => e.score < this.config.forgetThreshold
    ).length;

    return {
      total,
      avgScore,
      byKind,
      belowForgetThreshold,
    };
  }
}

// ─── Convenience Factory ─────────────────────────────────────────────────────

/**
 * Create and load an ImportanceTracker.
 *
 * @param agentsDir - Path to the agents directory
 * @param config - Optional configuration overrides
 * @returns Loaded ImportanceTracker ready for use
 */
export async function createImportanceTracker(
  agentsDir: string,
  config: Partial<ImportanceConfig> = {}
): Promise<ImportanceTracker> {
  const tracker = new ImportanceTracker(agentsDir, config);
  await tracker.load();
  return tracker;
}
