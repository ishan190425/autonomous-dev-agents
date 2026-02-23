/**
 * ADA Billing Tier Configuration
 *
 * Defines tier limits, features, and pricing for the ADA SaaS platform.
 * Aligned with Prisma schema Plan enum and C1185 technical spec.
 *
 * @author ⚙️ Engineering (Cycle 1190)
 * @see docs/research/sprint3-saas-tier-technical-spec-c1185.md
 * @see prisma/schema.prisma
 */

import type { Plan } from '../auth/types';

// ============================================================================
// Tier Feature Configuration
// ============================================================================

/** Features available per tier */
export interface TierFeatures {
  /** Can access web dashboard */
  dashboard: boolean;
  /** Can use REST API */
  api: boolean;
  /** Can create custom playbooks */
  customPlaybooks: boolean;
  /** Can create team workspaces */
  teamWorkspaces: boolean;
  /** Gets priority model routing (faster, better models) */
  priorityRouting: boolean;
  /** SSO/SAML authentication */
  sso: boolean;
  /** Detailed audit logs */
  auditLogs: boolean;
  /** Dedicated support channel */
  dedicatedSupport: boolean;
  /** On-premise deployment option */
  onPrem: boolean;
}

/** Full tier configuration */
export interface TierConfig {
  /** Internal tier name */
  name: Plan;
  /** Display name for UI */
  displayName: string;
  /** Monthly price in cents (0 for free, -1 for custom/enterprise) */
  monthlyPriceCents: number;
  /** Annual price in cents (-1 for custom/enterprise) */
  annualPriceCents: number;
  /** Max cycles per month (-1 for unlimited) */
  cyclesPerMonth: number;
  /** Max cycles per day (-1 for unlimited) */
  cyclesPerDay: number;
  /** Max cycles per hour (-1 for unlimited) */
  cyclesPerHour: number;
  /** Max concurrent dispatch runs */
  maxConcurrent: number;
  /** Max repositories per user/team */
  maxRepos: number;
  /** Max team size (1 for individual plans) */
  maxTeamSize: number;
  /** Feature flags */
  features: TierFeatures;
}

// ============================================================================
// Tier Definitions
// ============================================================================

/**
 * Master tier configuration
 *
 * Pricing rationale (C1185):
 * - Free: Acquisition cost ~$4, investment for growth
 * - Pro: $40 cost at ~$0.08/cycle, $19 price = $21 subsidy (growth investment)
 * - Team: $160 cost, $49 price = $111 subsidy (initial growth, offset by enterprise)
 * - Enterprise: Custom pricing ensures profitability
 */
export const TIER_CONFIG: Record<Plan, TierConfig> = {
  FREE: {
    name: 'FREE',
    displayName: 'Free',
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    cyclesPerMonth: 50,
    cyclesPerDay: 10,
    cyclesPerHour: 3,
    maxConcurrent: 1,
    maxRepos: 1,
    maxTeamSize: 1,
    features: {
      dashboard: false,
      api: false,
      customPlaybooks: false,
      teamWorkspaces: false,
      priorityRouting: false,
      sso: false,
      auditLogs: false,
      dedicatedSupport: false,
      onPrem: false,
    },
  },

  PRO: {
    name: 'PRO',
    displayName: 'Pro',
    monthlyPriceCents: 1900, // $19/month
    annualPriceCents: 19000, // $190/year (2 months free)
    cyclesPerMonth: 500,
    cyclesPerDay: 50,
    cyclesPerHour: 10,
    maxConcurrent: 2,
    maxRepos: 3,
    maxTeamSize: 1,
    features: {
      dashboard: true,
      api: true,
      customPlaybooks: true,
      teamWorkspaces: false,
      priorityRouting: false,
      sso: false,
      auditLogs: false,
      dedicatedSupport: false,
      onPrem: false,
    },
  },

  TEAM: {
    name: 'TEAM',
    displayName: 'Team',
    monthlyPriceCents: 4900, // $49/month
    annualPriceCents: 49000, // $490/year (2 months free)
    cyclesPerMonth: 2000,
    cyclesPerDay: 200,
    cyclesPerHour: 30,
    maxConcurrent: 5,
    maxRepos: 10,
    maxTeamSize: 5,
    features: {
      dashboard: true,
      api: true,
      customPlaybooks: true,
      teamWorkspaces: true,
      priorityRouting: true,
      sso: false,
      auditLogs: false,
      dedicatedSupport: false,
      onPrem: false,
    },
  },

  ENTERPRISE: {
    name: 'ENTERPRISE',
    displayName: 'Enterprise',
    monthlyPriceCents: -1, // Custom pricing
    annualPriceCents: -1,
    cyclesPerMonth: -1, // Unlimited
    cyclesPerDay: -1,
    cyclesPerHour: -1,
    maxConcurrent: -1,
    maxRepos: -1,
    maxTeamSize: -1,
    features: {
      dashboard: true,
      api: true,
      customPlaybooks: true,
      teamWorkspaces: true,
      priorityRouting: true,
      sso: true,
      auditLogs: true,
      dedicatedSupport: true,
      onPrem: true,
    },
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get tier configuration for a plan
 */
export function getTierConfig(plan: Plan): TierConfig {
  return TIER_CONFIG[plan];
}

/**
 * Get display name for a plan
 */
export function getTierDisplayName(plan: Plan): string {
  return TIER_CONFIG[plan].displayName;
}

/**
 * Get monthly cycle limit for a plan
 * @returns Cycle limit, or Infinity for unlimited (-1) plans
 */
export function getCycleLimit(plan: Plan): number {
  const limit = TIER_CONFIG[plan].cyclesPerMonth;
  return limit === -1 ? Infinity : limit;
}

/**
 * Get daily cycle limit for a plan
 * @returns Cycle limit, or Infinity for unlimited (-1) plans
 */
export function getDailyCycleLimit(plan: Plan): number {
  const limit = TIER_CONFIG[plan].cyclesPerDay;
  return limit === -1 ? Infinity : limit;
}

/**
 * Get hourly cycle limit for a plan
 * @returns Cycle limit, or Infinity for unlimited (-1) plans
 */
export function getHourlyCycleLimit(plan: Plan): number {
  const limit = TIER_CONFIG[plan].cyclesPerHour;
  return limit === -1 ? Infinity : limit;
}

/**
 * Check if a plan has a specific feature
 */
export function hasFeature(plan: Plan, feature: keyof TierFeatures): boolean {
  return TIER_CONFIG[plan].features[feature];
}

/**
 * Check if plan has unlimited cycles
 */
export function hasUnlimitedCycles(plan: Plan): boolean {
  return TIER_CONFIG[plan].cyclesPerMonth === -1;
}

/**
 * Get formatted price string
 * @returns Price string like "$19/mo" or "Custom"
 */
export function getFormattedPrice(plan: Plan, annual: boolean = false): string {
  const config = TIER_CONFIG[plan];
  const price = annual ? config.annualPriceCents : config.monthlyPriceCents;

  if (price === 0) return 'Free';
  if (price === -1) return 'Custom';

  const dollars = price / 100;
  const period = annual ? '/year' : '/mo';
  return `$${dollars}${period}`;
}

// ============================================================================
// Usage Check Functions
// ============================================================================

/** Result of a cycle usage check */
export interface CycleCheckResult {
  /** Whether the cycle can proceed */
  allowed: boolean;
  /** Reason if not allowed */
  reason?: string;
  /** Cycles remaining in the period */
  remaining: number;
}

/**
 * Check if user can use cycles
 *
 * @param plan - User's current plan
 * @param cyclesUsed - Cycles used in current period
 * @param cyclesRequested - Cycles being requested (default 1)
 * @returns Check result with allowed status and remaining cycles
 */
export function canUseCycles(
  plan: Plan,
  cyclesUsed: number,
  cyclesRequested: number = 1
): CycleCheckResult {
  const config = TIER_CONFIG[plan];

  // Unlimited plans always allowed
  if (config.cyclesPerMonth === -1) {
    return { allowed: true, remaining: Infinity };
  }

  const remaining = config.cyclesPerMonth - cyclesUsed;

  if (remaining < cyclesRequested) {
    return {
      allowed: false,
      reason: `Cycle limit reached (${cyclesUsed}/${config.cyclesPerMonth}). Upgrade to continue.`,
      remaining: Math.max(0, remaining),
    };
  }

  return { allowed: true, remaining: remaining - cyclesRequested };
}

/**
 * Check daily rate limit
 *
 * @param plan - User's current plan
 * @param cyclesToday - Cycles used today
 * @returns Check result
 */
export function checkDailyLimit(
  plan: Plan,
  cyclesToday: number
): CycleCheckResult {
  const config = TIER_CONFIG[plan];

  if (config.cyclesPerDay === -1) {
    return { allowed: true, remaining: Infinity };
  }

  const remaining = config.cyclesPerDay - cyclesToday;

  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `Daily limit reached (${cyclesToday}/${config.cyclesPerDay}). Resets at midnight UTC.`,
      remaining: 0,
    };
  }

  return { allowed: true, remaining };
}

/**
 * Check hourly rate limit
 *
 * @param plan - User's current plan
 * @param cyclesThisHour - Cycles used this hour
 * @returns Check result
 */
export function checkHourlyLimit(
  plan: Plan,
  cyclesThisHour: number
): CycleCheckResult {
  const config = TIER_CONFIG[plan];

  if (config.cyclesPerHour === -1) {
    return { allowed: true, remaining: Infinity };
  }

  const remaining = config.cyclesPerHour - cyclesThisHour;

  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `Hourly limit reached (${cyclesThisHour}/${config.cyclesPerHour}). Try again shortly.`,
      remaining: 0,
    };
  }

  return { allowed: true, remaining };
}

// ============================================================================
// Plan Comparison Functions
// ============================================================================

/** Order of plans from lowest to highest */
const PLAN_ORDER: Plan[] = ['FREE', 'PRO', 'TEAM', 'ENTERPRISE'];

/**
 * Check if one plan is higher tier than another
 */
export function isPlanHigherThan(plan: Plan, compareTo: Plan): boolean {
  return PLAN_ORDER.indexOf(plan) > PLAN_ORDER.indexOf(compareTo);
}

/**
 * Check if one plan is at least as high as another
 */
export function isPlanAtLeast(plan: Plan, minimumPlan: Plan): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(minimumPlan);
}

/**
 * Get the next upgrade plan
 * @returns Next plan or null if at highest
 */
export function getNextUpgrade(plan: Plan): Plan | null {
  const currentIndex = PLAN_ORDER.indexOf(plan);
  if (currentIndex === -1 || currentIndex >= PLAN_ORDER.length - 1) {
    return null;
  }
  return PLAN_ORDER[currentIndex + 1];
}

/**
 * Get all available upgrade options for a plan
 * @returns Array of plans that are upgrades from current
 */
export function getUpgradeOptions(plan: Plan): Plan[] {
  const currentIndex = PLAN_ORDER.indexOf(plan);
  if (currentIndex === -1) return [];
  return PLAN_ORDER.slice(currentIndex + 1);
}
