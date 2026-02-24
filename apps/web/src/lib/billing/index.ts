/**
 * ADA Billing Module
 *
 * Tier configuration, usage limits, and warning system for the ADA SaaS platform.
 *
 * @author ⚙️ Engineering (Cycle 1190)
 * @see docs/research/sprint3-saas-tier-technical-spec-c1185.md
 *
 * @example
 * import {
 *   TIER_CONFIG,
 *   canUseCycles,
 *   getCycleWarning,
 *   hasFeature
 * } from '@/lib/billing';
 *
 * // Check if user can run a cycle
 * const { allowed, remaining } = canUseCycles('PRO', 450);
 *
 * // Get any warnings
 * const warning = getCycleWarning('PRO', 450);
 * if (warning) console.log(warning.message);
 *
 * // Check feature access
 * if (hasFeature('PRO', 'dashboard')) {
 *   // Show dashboard
 * }
 */

// Tier configuration and limits
export {
  TIER_CONFIG,
  getTierConfig,
  getTierDisplayName,
  getCycleLimit,
  getDailyCycleLimit,
  getHourlyCycleLimit,
  hasFeature,
  hasUnlimitedCycles,
  getFormattedPrice,
  canUseCycles,
  checkDailyLimit,
  checkHourlyLimit,
  isPlanHigherThan,
  isPlanAtLeast,
  getNextUpgrade,
  getUpgradeOptions,
} from './tiers';

export type { TierConfig, TierFeatures, CycleCheckResult } from './tiers';

// Warnings and soft limits
export {
  WARNING_THRESHOLDS,
  getCycleWarning,
  getResetWarning,
  isUsageCritical,
  shouldSuggestUpgrade,
  getDailyLimitWarning,
  getHourlyLimitWarning,
  formatWarningForCLI,
  getUsageProgressBar,
} from './warnings';

export type { WarningLevel, CycleWarning, ResetWarning } from './warnings';
