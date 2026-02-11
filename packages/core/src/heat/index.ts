/**
 * @ada/core — Heat Scoring Module
 *
 * Reference-based heat scoring for cognitive memory.
 * Hot memories stay in context, warm memories are retrieved on demand,
 * cold memories fade to archive.
 *
 * @example
 * ```typescript
 * import {
 *   calculateHeat,
 *   getHeatTier,
 *   HeatMetadata,
 *   DEFAULT_HEAT_CONFIG
 * } from '@ada/core/heat';
 *
 * const metadata: HeatMetadata = {
 *   entityId: 'entry-123',
 *   memoryClass: 'learned',
 *   baseImportance: 0.8,
 *   referenceCount: 5,
 *   lastAccessedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
 *   createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
 * };
 *
 * const heat = calculateHeat(metadata);
 * const tier = getHeatTier(heat); // 'hot', 'warm', or 'cold'
 * ```
 *
 * @see docs/engineering/sprint-2-implementation-contract.md
 * @see Issue #118 — Heat Scoring Implementation
 * @packageDocumentation
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type {
  MemoryClass,
  HeatTier,
  HeatConfig,
  HeatMetadata,
  HeatScore,
  HeatSignalType,
  HeatSignal,
  HeatStats,
} from './types.js';

export { HEAT_THRESHOLDS, DEFAULT_HEAT_CONFIG } from './types.js';

// ─── Calculation ────────────────────────────────────────────────────────────

export {
  calculateHeat,
  calculateHeatScore,
  getHeatTier,
  isHot,
  isWarm,
  isCold,
  projectDecay,
  daysUntilTierDrop,
  normalizeImportance,
  calculateHeatStats,
  getHeatEmoji,
  formatHeatScore,
} from './calculate.js';

export type { EntryType } from './calculate.js';
