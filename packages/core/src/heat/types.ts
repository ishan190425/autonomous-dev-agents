/**
 * @ada/core — Heat Scoring Types (Cognitive Memory Phase 4)
 *
 * Type definitions for reference-based heat scoring.
 * Heat determines memory retrieval priority: hot memories are always in context,
 * warm memories are retrieved on demand, cold memories fade to archive.
 *
 * @see docs/engineering/sprint-2-implementation-contract.md
 * @see Issue #118 — Heat Scoring Implementation
 * @packageDocumentation
 */

// ─── Memory Classification ──────────────────────────────────────────────────

/**
 * Memory class determines base decay rate.
 * From C340-C342 Cognitive Memory research.
 *
 * - `innate`: Core knowledge that never decays (roster, rules, playbooks)
 * - `learned`: Acquired knowledge that decays without reinforcement
 * - `episodic`: Event-specific memories with faster decay
 */
export type MemoryClass = 'innate' | 'learned' | 'episodic';

/**
 * Heat tier for quick filtering and display.
 *
 * - `hot`: Always in context (>= 0.8)
 * - `warm`: Retrieved on demand (>= 0.4)
 * - `cold`: Archived, rarely retrieved (< 0.4)
 */
export type HeatTier = 'hot' | 'warm' | 'cold';

// ─── Configuration ──────────────────────────────────────────────────────────

/**
 * Heat tier thresholds (immutable).
 */
export const HEAT_THRESHOLDS = {
  /** Minimum score for hot tier */
  HOT: 0.8,
  /** Minimum score for warm tier */
  WARM: 0.4,
  /** Cold tier is anything below WARM */
  COLD: 0.0,
} as const;

/**
 * Configuration for heat calculation.
 * Tunable parameters for decay rates and reference boosts.
 */
export interface HeatConfig {
  /**
   * Heat tier thresholds.
   */
  readonly thresholds: {
    /** Minimum score for hot tier (default: 0.8) */
    readonly hot: number;
    /** Minimum score for warm tier (default: 0.4) */
    readonly warm: number;
  };

  /**
   * Decay rates per day by memory class.
   * Higher = faster decay.
   */
  readonly decayRates: {
    /** Innate memories never decay (always 0) */
    readonly innate: number;
    /** Learned memories decay slowly (default: 0.05) */
    readonly learned: number;
    /** Episodic memories decay faster (default: 0.15) */
    readonly episodic: number;
  };

  /**
   * Reference boost configuration.
   * Each access increases heat score.
   */
  readonly referenceBoost: {
    /** Heat boost for first reference (default: 0.1) */
    readonly initial: number;
    /** Diminishing factor for subsequent refs (default: uses sqrt) */
    readonly diminishing: number;
  };
}

/**
 * Default heat configuration.
 * Conservative values tuned for single-repo dogfooding.
 */
export const DEFAULT_HEAT_CONFIG: HeatConfig = {
  thresholds: {
    hot: 0.8,
    warm: 0.4,
  },
  decayRates: {
    innate: 0, // Never decay
    learned: 0.05, // ~14 days to drop a tier
    episodic: 0.15, // ~5 days to drop a tier
  },
  referenceBoost: {
    initial: 0.1,
    diminishing: 0.5, // sqrt diminishing returns
  },
} as const;

// ─── Heat Metadata ──────────────────────────────────────────────────────────

/**
 * Metadata for heat calculation (input).
 * Stored alongside memory entries.
 */
export interface HeatMetadata {
  /** Unique identifier for the memory entry */
  readonly entityId: string;

  /** Memory classification affecting decay rate */
  readonly memoryClass: MemoryClass;

  /** Initial importance score (0-1), set at creation */
  readonly baseImportance: number;

  /** Number of times this entry has been retrieved */
  readonly referenceCount: number;

  /** Unix timestamp (ms) of last access */
  readonly lastAccessedAt: number;

  /** Unix timestamp (ms) when entry was created */
  readonly createdAt: number;
}

/**
 * Calculated heat score (output).
 * Computed on-demand from HeatMetadata.
 */
export interface HeatScore {
  /** Entity this score is for */
  readonly entityId: string;

  /** Computed heat score (0.0 - 1.0) */
  readonly score: number;

  /** Derived heat tier */
  readonly tier: HeatTier;

  /** Source metadata used for calculation */
  readonly metadata: HeatMetadata;

  /** Unix timestamp (ms) when this was calculated */
  readonly calculatedAt: number;
}

// ─── Heat Signals (Terminal Integration) ────────────────────────────────────

/**
 * Signal types that can boost heat.
 * From US-125-3 acceptance criteria.
 */
export type HeatSignalType =
  | 'file_access'
  | 'test_output'
  | 'git_diff'
  | 'stderr'
  | 'command_arg';

/**
 * Heat signal from terminal activity.
 * Terminal mode captures these to boost relevant memory heat.
 */
export interface HeatSignal {
  /** Unix timestamp (ms) when signal was captured */
  readonly timestamp: number;

  /** Type of signal */
  readonly signalType: HeatSignalType;

  /** File path associated with the signal (if any) */
  readonly filePath: string;

  /** Source of the signal (e.g., 'terminal:vim', 'terminal:npm test') */
  readonly source: string;

  /** Weight of the signal (0.1 - 1.0), based on signal type */
  readonly weight: number;
}

// ─── Heat Statistics ────────────────────────────────────────────────────────

/**
 * Heat tier statistics for a collection of entries.
 * Used for dispatch status display and observability.
 */
export interface HeatStats {
  /** Total entries analyzed */
  readonly total: number;

  /** Count by memory class */
  readonly byClass: {
    readonly innate: number;
    readonly learned: number;
    readonly episodic: number;
  };

  /** Count by heat tier */
  readonly byTier: {
    readonly hot: number;
    readonly warm: number;
    readonly cold: number;
  };

  /** Average heat score (0.0 - 1.0) */
  readonly averageHeat: number;

  /** Average reference count */
  readonly averageReferences: number;
}
