/**
 * @ada/core/terminal — Heat Display
 *
 * Formatting and visualization utilities for heat scores.
 * Supports emoji, text, and numeric display modes.
 *
 * @see docs/engineering/terminal-mode-technical-spec.md §6
 * @packageDocumentation
 */

import type { HeatDisplayMode, HeatTier } from './types.js';

/**
 * Default (coldest) heat tier, used as fallback.
 */
const DEFAULT_TIER: HeatTier = { min: 0, emoji: '❄️', text: 'COLD' };

/**
 * Heat score tiers with emoji and text representations.
 * Ordered by minimum score (descending) for threshold matching.
 */
export const HEAT_TIERS: readonly HeatTier[] = [
  { min: 80, emoji: '🔥', text: 'HOT' },
  { min: 50, emoji: '🟡', text: 'WARM' },
  { min: 20, emoji: '🟢', text: 'COOL' },
  DEFAULT_TIER,
];

/**
 * Get the heat tier for a given score.
 *
 * @param score - Heat score (0-100)
 * @returns The matching heat tier
 */
export function getHeatTier(score: number): HeatTier {
  const clampedScore = Math.max(0, Math.min(100, score));
  // HEAT_TIERS is guaranteed to have a tier with min: 0, so find() will always match
  // Fallback to DEFAULT_TIER (COLD) is defensive only
  return HEAT_TIERS.find((t) => clampedScore >= t.min) ?? DEFAULT_TIER;
}

/**
 * Format a heat score for display.
 *
 * @param score - Heat score (0-100)
 * @param mode - Display mode (emoji, text, or numeric)
 * @returns Formatted heat string
 *
 * @example
 * ```typescript
 * formatHeatDisplay(85, 'emoji');   // '🔥 85'
 * formatHeatDisplay(85, 'text');    // 'HOT (85)'
 * formatHeatDisplay(85, 'numeric'); // '85.0'
 * ```
 */
export function formatHeatDisplay(score: number, mode: HeatDisplayMode): string {
  if (mode === 'numeric') {
    return score.toFixed(1);
  }

  const tier = getHeatTier(score);
  const roundedScore = Math.round(score);

  return mode === 'emoji'
    ? `${tier.emoji} ${roundedScore}`
    : `${tier.text} (${roundedScore})`;
}

/**
 * Detect the appropriate heat display mode based on environment.
 *
 * - TTY terminal → 'emoji'
 * - CI/non-TTY → 'text'
 * - Explicitly set → use that
 *
 * @param override - Optional explicit mode override
 * @returns Appropriate display mode
 */
export function detectHeatDisplayMode(override?: HeatDisplayMode): HeatDisplayMode {
  if (override) {
    return override;
  }

  // In CI environments or when piped, use text mode
  if (process.env.CI || !process.stdout.isTTY) {
    return 'text';
  }

  // Default to emoji for interactive terminals
  return 'emoji';
}

/**
 * Generate a heat bar visualization.
 *
 * @param score - Heat score (0-100)
 * @param width - Bar width in characters (default: 10)
 * @returns ASCII heat bar
 *
 * @example
 * ```typescript
 * generateHeatBar(75, 10); // '███████░░░'
 * generateHeatBar(30, 10); // '███░░░░░░░'
 * ```
 */
export function generateHeatBar(score: number, width: number = 10): string {
  const clampedScore = Math.max(0, Math.min(100, score));
  const filled = Math.round((clampedScore / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Format a heat score with bar visualization.
 *
 * @param score - Heat score (0-100)
 * @param mode - Display mode
 * @param includeBar - Whether to include the bar (default: true)
 * @returns Formatted heat string with optional bar
 *
 * @example
 * ```typescript
 * formatHeatWithBar(85, 'emoji');
 * // '🔥 85 ████████░░'
 * ```
 */
export function formatHeatWithBar(
  score: number,
  mode: HeatDisplayMode,
  includeBar: boolean = true
): string {
  const display = formatHeatDisplay(score, mode);
  if (!includeBar) {
    return display;
  }
  return `${display} ${generateHeatBar(score)}`;
}
