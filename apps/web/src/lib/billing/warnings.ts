/**
 * ADA Billing Warnings
 *
 * Soft limit warning system for cycle usage. Users get warnings
 * as they approach limits rather than hard blocks.
 *
 * @author ⚙️ Engineering (Cycle 1190)
 * @see docs/research/sprint3-saas-tier-technical-spec-c1185.md
 */

import type { Plan } from '../auth/types';
import { TIER_CONFIG, getCycleLimit, hasUnlimitedCycles } from './tiers';

// ============================================================================
// Warning Thresholds
// ============================================================================

/**
 * Warning threshold configuration
 *
 * Soft limits prevent surprise blocks while encouraging upgrades.
 * Users see warnings at 20% and 10% remaining, not hard blocks.
 */
export const WARNING_THRESHOLDS = {
  /** Percentage remaining that triggers low warning (20%) */
  LOW_CYCLES: 0.2,

  /** Percentage remaining that triggers critical warning (10%) */
  CRITICAL_CYCLES: 0.1,

  /** Days before period reset to show reset reminder */
  APPROACHING_RESET: 3,

  /** Cycles at which to suggest considering an upgrade */
  UPGRADE_SUGGESTION: 5,
} as const;

// ============================================================================
// Warning Types
// ============================================================================

/** Warning severity level */
export type WarningLevel = 'info' | 'warning' | 'critical';

/** Cycle usage warning */
export interface CycleWarning {
  /** Severity level */
  level: WarningLevel;
  /** User-facing message */
  message: string;
  /** Cycles remaining */
  remaining: number;
  /** Percentage remaining (0-1) */
  percentage: number;
  /** Upgrade suggestion if applicable */
  suggestion: string | null;
  /** Whether to show upgrade CTA */
  showUpgrade: boolean;
}

/** Period reset warning */
export interface ResetWarning {
  /** Days until reset */
  daysUntilReset: number;
  /** Reset date */
  resetDate: Date;
  /** User-facing message */
  message: string;
}

// ============================================================================
// Warning Functions
// ============================================================================

/**
 * Get warning for current cycle usage
 *
 * @param plan - User's current plan
 * @param cyclesUsed - Cycles used this period
 * @returns Warning object or null if no warning needed
 *
 * @example
 * const warning = getCycleWarning('PRO', 450);
 * if (warning) {
 *   console.log(warning.message); // "⚡ 50 cycles remaining (10%)"
 * }
 */
export function getCycleWarning(
  plan: Plan,
  cyclesUsed: number
): CycleWarning | null {
  // No warnings for unlimited plans
  if (hasUnlimitedCycles(plan)) {
    return null;
  }

  const limit = getCycleLimit(plan);
  const remaining = Math.max(0, limit - cyclesUsed);
  const percentage = remaining / limit;

  // Critical: 10% or less remaining
  if (percentage <= WARNING_THRESHOLDS.CRITICAL_CYCLES) {
    return {
      level: 'critical',
      message: `⚠️ Critical: Only ${remaining} cycles remaining this period`,
      remaining,
      percentage,
      suggestion: 'Upgrade now to continue uninterrupted development',
      showUpgrade: true,
    };
  }

  // Warning: 20% or less remaining
  if (percentage <= WARNING_THRESHOLDS.LOW_CYCLES) {
    return {
      level: 'warning',
      message: `⚡ ${remaining} cycles remaining (${Math.round(percentage * 100)}%)`,
      remaining,
      percentage,
      suggestion:
        remaining <= WARNING_THRESHOLDS.UPGRADE_SUGGESTION
          ? 'Consider upgrading for more cycles'
          : null,
      showUpgrade: remaining <= WARNING_THRESHOLDS.UPGRADE_SUGGESTION,
    };
  }

  // No warning needed
  return null;
}

/**
 * Get warning for approaching period reset
 *
 * @param periodEnd - End date of current billing period
 * @returns Reset warning or null if not approaching
 *
 * @example
 * const warning = getResetWarning(new Date('2026-03-01'));
 * if (warning) {
 *   console.log(warning.message); // "Cycles reset in 2 days (Mar 1)"
 * }
 */
export function getResetWarning(periodEnd: Date): ResetWarning | null {
  const now = new Date();
  const msUntilReset = periodEnd.getTime() - now.getTime();
  const daysUntilReset = Math.ceil(msUntilReset / (1000 * 60 * 60 * 24));

  if (daysUntilReset <= 0) {
    return {
      daysUntilReset: 0,
      resetDate: periodEnd,
      message: '🔄 Cycles resetting today',
    };
  }

  if (daysUntilReset <= WARNING_THRESHOLDS.APPROACHING_RESET) {
    const resetDateStr = periodEnd.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return {
      daysUntilReset,
      resetDate: periodEnd,
      message:
        daysUntilReset === 1
          ? `🔄 Cycles reset tomorrow (${resetDateStr})`
          : `🔄 Cycles reset in ${daysUntilReset} days (${resetDateStr})`,
    };
  }

  return null;
}

/**
 * Check if usage is in danger zone (very low remaining)
 *
 * @param plan - User's current plan
 * @param cyclesUsed - Cycles used this period
 * @returns true if in critical/danger zone
 */
export function isUsageCritical(plan: Plan, cyclesUsed: number): boolean {
  if (hasUnlimitedCycles(plan)) return false;

  const limit = getCycleLimit(plan);
  const remaining = limit - cyclesUsed;
  const percentage = remaining / limit;

  return percentage <= WARNING_THRESHOLDS.CRITICAL_CYCLES;
}

/**
 * Check if an upgrade suggestion should be shown
 *
 * @param plan - User's current plan
 * @param cyclesUsed - Cycles used this period
 * @returns true if upgrade should be suggested
 */
export function shouldSuggestUpgrade(plan: Plan, cyclesUsed: number): boolean {
  // Don't suggest upgrade for Enterprise
  if (plan === 'ENTERPRISE') return false;

  // Always suggest if at or over limit
  const warning = getCycleWarning(plan, cyclesUsed);
  return warning !== null && warning.showUpgrade;
}

// ============================================================================
// Rate Limit Warnings
// ============================================================================

/**
 * Get warning for daily rate limit
 *
 * @param plan - User's current plan
 * @param cyclesToday - Cycles used today
 * @returns Warning string or null
 */
export function getDailyLimitWarning(
  plan: Plan,
  cyclesToday: number
): string | null {
  const config = TIER_CONFIG[plan];

  if (config.cyclesPerDay === -1) return null;

  const remaining = config.cyclesPerDay - cyclesToday;
  const percentage = remaining / config.cyclesPerDay;

  if (percentage <= WARNING_THRESHOLDS.CRITICAL_CYCLES && remaining > 0) {
    return `⚠️ Only ${remaining} cycles remaining today (resets midnight UTC)`;
  }

  if (remaining <= 0) {
    return `🚫 Daily limit reached (${config.cyclesPerDay}/day). Resets midnight UTC.`;
  }

  return null;
}

/**
 * Get warning for hourly rate limit
 *
 * @param plan - User's current plan
 * @param cyclesThisHour - Cycles used this hour
 * @returns Warning string or null
 */
export function getHourlyLimitWarning(
  plan: Plan,
  cyclesThisHour: number
): string | null {
  const config = TIER_CONFIG[plan];

  if (config.cyclesPerHour === -1) return null;

  const remaining = config.cyclesPerHour - cyclesThisHour;

  if (remaining <= 1 && remaining > 0) {
    return `⏰ Only ${remaining} cycle${remaining === 1 ? '' : 's'} remaining this hour`;
  }

  if (remaining <= 0) {
    return `⏰ Hourly limit reached (${config.cyclesPerHour}/hour). Try again shortly.`;
  }

  return null;
}

// ============================================================================
// CLI-Friendly Formatters
// ============================================================================

/**
 * Format warning for CLI output (with ANSI colors support)
 *
 * @param warning - Cycle warning object
 * @returns Formatted string for CLI
 */
export function formatWarningForCLI(warning: CycleWarning): string {
  const lines: string[] = [warning.message];

  if (warning.suggestion) {
    lines.push(`  💡 ${warning.suggestion}`);
  }

  if (warning.showUpgrade) {
    lines.push('  🚀 Run `ada billing upgrade` to see options');
  }

  return lines.join('\n');
}

/**
 * Get usage progress bar for CLI
 *
 * @param cyclesUsed - Cycles used
 * @param cyclesLimit - Cycle limit
 * @param width - Bar width in characters (default 20)
 * @returns Progress bar string like "[████████░░░░░░░░░░░░] 40%"
 */
export function getUsageProgressBar(
  cyclesUsed: number,
  cyclesLimit: number,
  width: number = 20
): string {
  if (cyclesLimit === -1 || cyclesLimit === Infinity) {
    return '[∞ unlimited]';
  }

  const percentage = Math.min(1, cyclesUsed / cyclesLimit);
  const filled = Math.round(percentage * width);
  const empty = width - filled;

  const filledChar = percentage > 0.9 ? '█' : percentage > 0.8 ? '▓' : '█';
  const emptyChar = '░';

  const bar = filledChar.repeat(filled) + emptyChar.repeat(empty);
  const pct = Math.round(percentage * 100);

  return `[${bar}] ${pct}%`;
}
