/**
 * @ada/core — Heat Calculation (Cognitive Memory Phase 4)
 *
 * Implements reference-based heat scoring for memory retrieval.
 *
 * Formula: heat = baseImportance × recencyFactor × referenceFactor
 * - recencyFactor = e^(-λt) where λ is decay rate and t is days since access
 * - referenceFactor = 1 + boost × (1 + log(1 + refCount))
 *
 * @see docs/engineering/sprint-2-implementation-contract.md
 * @see docs/design/heat-scoring-implementation-spec.md
 * @see Issue #118 — Heat Scoring Implementation
 * @packageDocumentation
 */

import type {
  HeatTier,
  HeatConfig,
  HeatMetadata,
  HeatScore,
  HeatStats,
} from './types.js';
import { DEFAULT_HEAT_CONFIG } from './types.js';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Milliseconds per day */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Maximum heat score for learned/episodic memories (innate can reach 1.0) */
const MAX_LEARNED_HEAT = 0.99;

// ─── Core Heat Calculation ──────────────────────────────────────────────────

/**
 * Calculate the heat score for a memory entry.
 *
 * @param metadata - Heat metadata for the entry
 * @param config - Heat configuration (optional, uses defaults)
 * @param now - Current timestamp in ms (optional, defaults to Date.now())
 * @returns Heat score between 0.0 and 1.0
 *
 * @example
 * ```typescript
 * const heat = calculateHeat({
 *   entityId: 'abc123',
 *   memoryClass: 'learned',
 *   baseImportance: 0.7,
 *   referenceCount: 5,
 *   lastAccessedAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
 *   createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
 * });
 * // Returns ~0.65 depending on configuration
 * ```
 */
export function calculateHeat(
  metadata: HeatMetadata,
  config: HeatConfig = DEFAULT_HEAT_CONFIG,
  now: number = Date.now()
): number {
  // Innate memories are always maximally hot
  if (metadata.memoryClass === 'innate') {
    return 1.0;
  }

  // Get decay rate for this memory class
  const decayRate = config.decayRates[metadata.memoryClass];

  // Days since last access
  const daysSinceAccess = (now - metadata.lastAccessedAt) / MS_PER_DAY;

  // Recency factor with exponential decay: e^(-λt)
  const recencyFactor = Math.exp(-decayRate * Math.max(0, daysSinceAccess));

  // Reference factor with logarithmic boost (diminishing returns)
  // 1 + boost × log(1 + refCount)
  const referenceFactor =
    1 +
    config.referenceBoost.initial *
      Math.log(1 + metadata.referenceCount) *
      config.referenceBoost.diminishing;

  // Combined heat score
  const rawHeat = metadata.baseImportance * recencyFactor * referenceFactor;

  // Normalize to 0-1, cap learned/episodic at MAX_LEARNED_HEAT
  return Math.min(Math.max(rawHeat, 0), MAX_LEARNED_HEAT);
}

/**
 * Calculate full heat score with tier derivation.
 *
 * @param metadata - Heat metadata for the entry
 * @param config - Heat configuration (optional)
 * @param now - Current timestamp (optional)
 * @returns Full HeatScore object
 */
export function calculateHeatScore(
  metadata: HeatMetadata,
  config: HeatConfig = DEFAULT_HEAT_CONFIG,
  now: number = Date.now()
): HeatScore {
  const score = calculateHeat(metadata, config, now);
  return {
    entityId: metadata.entityId,
    score,
    tier: getHeatTier(score, config),
    metadata,
    calculatedAt: now,
  };
}

// ─── Tier Classification ────────────────────────────────────────────────────

/**
 * Determine heat tier from heat score.
 *
 * @param heatScore - Heat score (0.0 - 1.0)
 * @param config - Heat configuration (optional)
 * @returns Heat tier ('hot', 'warm', or 'cold')
 */
export function getHeatTier(
  heatScore: number,
  config: HeatConfig = DEFAULT_HEAT_CONFIG
): HeatTier {
  if (heatScore >= config.thresholds.hot) return 'hot';
  if (heatScore >= config.thresholds.warm) return 'warm';
  return 'cold';
}

/**
 * Check if a heat score is in the hot tier.
 *
 * @param heatScore - Heat score to check
 * @param config - Heat configuration (optional)
 * @returns true if hot tier
 */
export function isHot(
  heatScore: number,
  config: HeatConfig = DEFAULT_HEAT_CONFIG
): boolean {
  return heatScore >= config.thresholds.hot;
}

/**
 * Check if a heat score is in the cold tier.
 *
 * @param heatScore - Heat score to check
 * @param config - Heat configuration (optional)
 * @returns true if cold tier
 */
export function isCold(
  heatScore: number,
  config: HeatConfig = DEFAULT_HEAT_CONFIG
): boolean {
  return heatScore < config.thresholds.warm;
}

/**
 * Check if a heat score is in the warm tier.
 *
 * @param heatScore - Heat score to check
 * @param config - Heat configuration (optional)
 * @returns true if warm tier
 */
export function isWarm(
  heatScore: number,
  config: HeatConfig = DEFAULT_HEAT_CONFIG
): boolean {
  return (
    heatScore >= config.thresholds.warm && heatScore < config.thresholds.hot
  );
}

// ─── Decay Projection ───────────────────────────────────────────────────────

/**
 * Project heat score after a specified number of days.
 * Useful for decay simulation and tier transition prediction.
 *
 * @param metadata - Current heat metadata
 * @param daysElapsed - Days to project into the future
 * @param config - Heat configuration (optional)
 * @param now - Current timestamp (optional)
 * @returns Projected heat score
 */
export function projectDecay(
  metadata: HeatMetadata,
  daysElapsed: number,
  config: HeatConfig = DEFAULT_HEAT_CONFIG,
  now: number = Date.now()
): number {
  if (metadata.memoryClass === 'innate') return 1.0;

  // Create projected metadata with shifted access time
  const projected: HeatMetadata = {
    ...metadata,
    lastAccessedAt: metadata.lastAccessedAt, // Keep original access time
  };

  // Calculate with future timestamp
  const futureTime = now + daysElapsed * MS_PER_DAY;
  return calculateHeat(projected, config, futureTime);
}

/**
 * Calculate days until an entry transitions to a lower tier.
 *
 * @param metadata - Current heat metadata
 * @param config - Heat configuration (optional)
 * @param now - Current timestamp (optional)
 * @returns Days until tier transition (Infinity if innate or already cold)
 */
export function daysUntilTierDrop(
  metadata: HeatMetadata,
  config: HeatConfig = DEFAULT_HEAT_CONFIG,
  now: number = Date.now()
): number {
  if (metadata.memoryClass === 'innate') return Infinity;

  const currentScore = calculateHeat(metadata, config, now);
  const currentTier = getHeatTier(currentScore, config);

  if (currentTier === 'cold') return Infinity; // Already at lowest tier

  const targetThreshold =
    currentTier === 'hot' ? config.thresholds.hot : config.thresholds.warm;

  // Binary search for the day when score drops below threshold
  let low = 0;
  let high = 365; // Cap at 1 year

  while (high - low > 0.1) {
    const mid = (low + high) / 2;
    const projectedScore = projectDecay(metadata, mid, config, now);

    if (projectedScore >= targetThreshold) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.max(0, high);
}

// ─── Base Importance Normalization ──────────────────────────────────────────

/**
 * Entry types for importance weighting.
 */
export type EntryType = 'action' | 'observation' | 'reflection' | 'decision';

/**
 * Calculate base importance from a raw importance score (1-10).
 * Normalizes to 0.0-1.0 range with type-based weighting.
 *
 * @param importance - Raw importance score (1-10)
 * @param type - Entry type for weighting
 * @returns Normalized base importance (0.0-1.0)
 */
export function normalizeImportance(
  importance: number,
  type: EntryType
): number {
  // Clamp and normalize: importance / 10
  const normalized = Math.max(0, Math.min(importance, 10)) / 10;

  // Type-based weighting (reflections and decisions are more important)
  const typeWeights: Record<EntryType, number> = {
    decision: 1.2, // Decisions are high-value
    reflection: 1.1, // Reflections contain learned wisdom
    action: 1.0, // Actions are baseline
    observation: 0.9, // Observations may be transient
  };

  const weighted = normalized * typeWeights[type];
  return Math.min(weighted, 1.0); // Cap at 1.0
}

// ─── Statistics ─────────────────────────────────────────────────────────────

/**
 * Calculate heat statistics for a collection of entries.
 *
 * @param entries - Array of heat metadata entries
 * @param config - Heat configuration (optional)
 * @param now - Current timestamp (optional)
 * @returns Heat statistics object
 */
export function calculateHeatStats(
  entries: readonly HeatMetadata[],
  config: HeatConfig = DEFAULT_HEAT_CONFIG,
  now: number = Date.now()
): HeatStats {
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
  let totalReferences = 0;

  for (const entry of entries) {
    // Count by class
    byClass[entry.memoryClass]++;

    // Calculate heat and tier
    const heat = calculateHeat(entry, config, now);
    const tier = getHeatTier(heat, config);
    byTier[tier]++;

    // Accumulate totals
    totalHeat += heat;
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

// ─── Display Utilities ──────────────────────────────────────────────────────

/**
 * Get emoji for heat tier display.
 *
 * @param tier - Heat tier
 * @returns Emoji string
 */
export function getHeatEmoji(tier: HeatTier): string {
  switch (tier) {
    case 'hot':
      return '🔥';
    case 'warm':
      return '🟠';
    case 'cold':
      return '🧊';
  }
}

/**
 * Format heat score as a percentage string.
 *
 * @param score - Heat score (0.0 - 1.0)
 * @returns Formatted string like "85%"
 */
export function formatHeatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}
