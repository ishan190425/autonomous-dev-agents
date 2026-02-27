/**
 * @ada-ai/core - Billing Constants
 *
 * Tier configuration and billing constants for ADA SaaS.
 * Prices and limits align with Sprint 3 specs.
 *
 * @see docs/architecture/saas-tier-technical-spec-c1185.md
 */

import type { Tier, TierConfig } from './types.js';

/**
 * Tier configuration map
 *
 * Pricing strategy:
 * - Free: 50 cycles/month (enough to evaluate)
 * - Pro: 500 cycles/month at $29/mo (target individual developers)
 * - Team: 2000 cycles/month at $99/mo (small teams, shared workspace)
 * - Enterprise: Custom (contact sales)
 */
export const TIER_CONFIG: Record<Tier, TierConfig> = {
  free: {
    name: 'Free',
    cyclesPerMonth: 50,
    cyclesPerHour: 5,
    cyclesPerDay: 20,
    maxConcurrent: 1,
    priceMonthly: 0,
    priceAnnual: 0,
    maxRepos: 3,
    maxTeamMembers: 0,
    prioritySupport: false,
    customRoles: false,
    apiAccess: false,
    stripePriceIds: {
      monthly: null, // Free tier has no Stripe price
      annual: null,
    },
  },
  pro: {
    name: 'Pro',
    cyclesPerMonth: 500,
    cyclesPerHour: 20,
    cyclesPerDay: 100,
    maxConcurrent: 3,
    priceMonthly: 2900, // $29.00
    priceAnnual: 29000, // $290.00 (~17% discount)
    maxRepos: 10,
    maxTeamMembers: 0, // Individual plan
    prioritySupport: false,
    customRoles: true,
    apiAccess: true,
    stripePriceIds: {
      // TODO: Replace with actual Stripe Price IDs after product creation
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly_placeholder',
      annual: process.env.STRIPE_PRICE_PRO_ANNUAL || 'price_pro_annual_placeholder',
    },
  },
  team: {
    name: 'Team',
    cyclesPerMonth: 2000,
    cyclesPerHour: 50,
    cyclesPerDay: 400,
    maxConcurrent: 5,
    priceMonthly: 9900, // $99.00
    priceAnnual: 99000, // $990.00 (~17% discount)
    maxRepos: 50,
    maxTeamMembers: 10,
    prioritySupport: true,
    customRoles: true,
    apiAccess: true,
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY || 'price_team_monthly_placeholder',
      annual: process.env.STRIPE_PRICE_TEAM_ANNUAL || 'price_team_annual_placeholder',
    },
  },
  enterprise: {
    name: 'Enterprise',
    cyclesPerMonth: -1, // Unlimited
    cyclesPerHour: -1,
    cyclesPerDay: -1,
    maxConcurrent: -1, // Unlimited
    priceMonthly: -1, // Custom pricing
    priceAnnual: -1,
    maxRepos: -1, // Unlimited
    maxTeamMembers: -1, // Unlimited
    prioritySupport: true,
    customRoles: true,
    apiAccess: true,
    stripePriceIds: {
      monthly: null, // Custom invoicing
      annual: null,
    },
  },
} as const;

/**
 * Default tier for new users
 */
export const DEFAULT_TIER: Tier = 'free';

/**
 * Trial duration in days (for Pro tier trial)
 */
export const TRIAL_DURATION_DAYS = 14;

/**
 * Grace period for limit enforcement (allows small overrun)
 */
export const LIMIT_GRACE_PERCENTAGE = 0.05; // 5% grace

/**
 * Cache staleness threshold in milliseconds
 */
export const CACHE_STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Max retry attempts for usage recording
 */
export const MAX_RECORD_RETRIES = 3;

/**
 * Idempotency key TTL in seconds
 */
export const IDEMPOTENCY_KEY_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Max dispatch duration for concurrent slot TTL
 */
export const MAX_DISPATCH_DURATION_SECONDS = 600; // 10 minutes

/**
 * Stripe webhook tolerance in seconds
 */
export const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300; // 5 minutes

/**
 * Warning thresholds for approaching limits
 */
export const WARNING_THRESHOLDS = {
  /** Warn when X% of monthly limit used */
  monthly: [0.75, 0.9, 0.95],
  /** Warn when X cycles remaining */
  remaining: [10, 5, 1],
} as const;

/**
 * LLM cost rates for usage calculation (USD per 1M tokens)
 * Based on Claude 3.5 Sonnet pricing as of Feb 2026
 */
export const TOKEN_RATES = {
  input: 3.0 / 1_000_000, // $3.00 per 1M input tokens
  output: 15.0 / 1_000_000, // $15.00 per 1M output tokens
} as const;

/**
 * Calculate cost for a cycle
 */
export function calculateCycleCost(tokensIn: number, tokensOut: number): number {
  return tokensIn * TOKEN_RATES.input + tokensOut * TOKEN_RATES.output;
}

/**
 * Get warning message for usage level
 */
export function getUsageWarning(used: number, limit: number): string | null {
  if (limit === -1) return null; // Unlimited

  const percentage = used / limit;

  if (percentage >= 0.95) {
    return `⚠️ Critical: ${Math.round(percentage * 100)}% of monthly cycles used (${used}/${limit})`;
  }
  if (percentage >= 0.9) {
    return `⚠️ Warning: ${Math.round(percentage * 100)}% of monthly cycles used (${used}/${limit})`;
  }
  if (percentage >= 0.75) {
    return `📊 Notice: ${Math.round(percentage * 100)}% of monthly cycles used (${used}/${limit})`;
  }

  return null;
}

/**
 * Check if tier allows a feature
 */
export function tierAllows(tier: Tier, feature: keyof TierConfig): boolean {
  const config = TIER_CONFIG[tier];
  const value = config[feature];

  // Boolean features
  if (typeof value === 'boolean') return value;

  // Numeric features (-1 = unlimited, 0 = not allowed)
  if (typeof value === 'number') return value !== 0;

  return true;
}

/**
 * Get upgrade recommendation based on usage
 */
export function getUpgradeRecommendation(
  currentTier: Tier,
  cyclesUsed: number,
  daysRemaining: number
): { shouldUpgrade: boolean; recommendedTier: Tier | null; reason: string } | null {
  if (currentTier === 'enterprise') return null;

  const config = TIER_CONFIG[currentTier];
  if (config.cyclesPerMonth === -1) return null;

  // Project usage for remainder of period
  const daysElapsed = 30 - daysRemaining;
  if (daysElapsed < 7) return null; // Too early to project

  const dailyRate = cyclesUsed / daysElapsed;
  const projectedTotal = dailyRate * 30;

  // If projected to exceed limit
  if (projectedTotal > config.cyclesPerMonth * 1.1) {
    const nextTier = currentTier === 'free' ? 'pro' : currentTier === 'pro' ? 'team' : 'enterprise';

    return {
      shouldUpgrade: true,
      recommendedTier: nextTier,
      reason: `At current pace (~${Math.round(dailyRate)} cycles/day), you'll use ~${Math.round(projectedTotal)} cycles this month, exceeding your ${config.cyclesPerMonth} limit.`,
    };
  }

  return null;
}
