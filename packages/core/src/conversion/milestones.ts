/**
 * @fileoverview Milestone Tracker
 *
 * Tracks user milestone completion and calculates trial extension bonuses.
 * Implements the milestone reward system from C1266 ADR.
 *
 * @see docs/architecture/adr-trial-conversion-platform-c1266.md
 * @see docs/qa/sprint3-trial-conversion-test-plan-c1269.md
 */

import type { UserJourney } from './journey.js';

// ============================================================================
// Milestone Types
// ============================================================================

/**
 * Milestone identifier.
 */
export type MilestoneId =
  | 'first_dispatch'
  | 'magic_moment'
  | 'five_cycles'
  | 'pr_merged'
  | 'twenty_cycles';

/**
 * Reward type for completing a milestone.
 */
export type MilestoneReward =
  | { type: 'trial_extension'; days: number }
  | { type: 'feature_unlock'; feature: string };

/**
 * Milestone definition.
 */
export interface Milestone {
  /** Unique milestone identifier */
  id: MilestoneId;
  /** Display name */
  name: string;
  /** User-facing description */
  description: string;
  /** What triggers completion (for documentation) */
  requirement: string;
  /** Reward for completing this milestone */
  reward: MilestoneReward;
  /** Display order (lower = earlier in list) */
  order: number;
}

/**
 * Detailed result of checking milestones for a journey.
 * More granular than JourneyManager.MilestoneCheckResult.
 */
export interface MilestoneTrackerResult {
  /** List of completed milestone IDs */
  completed: MilestoneId[];
  /** List of pending milestone IDs */
  pending: MilestoneId[];
  /** Features unlocked by completed milestones */
  unlockedFeatures: string[];
  /** Progress percentage (0-100) */
  progress: number;
}

/**
 * Result of calculating trial days.
 */
export interface TrialDaysResult {
  /** Base trial period (7 days) */
  baseDays: number;
  /** Bonus days earned from milestones */
  bonusDays: number;
  /** Total trial days (base + bonus, max 42) */
  totalDays: number;
  /** Breakdown of bonus by milestone */
  bonusBreakdown: { milestoneId: MilestoneId; days: number }[];
}

// ============================================================================
// Default Milestones
// ============================================================================

/**
 * The 5 default milestones that all users can achieve.
 * Ordered by typical completion sequence.
 */
export const DEFAULT_MILESTONES: Milestone[] = [
  {
    id: 'first_dispatch',
    name: 'First Dispatch',
    description: 'Complete your first agent dispatch cycle',
    requirement: 'State reaches "activated" (first_dispatch_completed event)',
    reward: { type: 'trial_extension', days: 7 },
    order: 1,
  },
  {
    id: 'magic_moment',
    name: 'Magic Moment',
    description: 'Your agent created its first visible output (PR, issue, or comment)',
    requirement: 'First artifact created (PR/issue/comment)',
    reward: { type: 'trial_extension', days: 7 },
    order: 2,
  },
  {
    id: 'five_cycles',
    name: 'Five Cycles',
    description: 'Run 5 successful dispatch cycles',
    requirement: 'totalCycles >= 5',
    reward: { type: 'trial_extension', days: 7 },
    order: 3,
  },
  {
    id: 'pr_merged',
    name: 'First PR Merged',
    description: 'An agent-created PR was merged into the codebase',
    requirement: 'firstPrMerged milestone set',
    reward: { type: 'trial_extension', days: 14 },
    order: 4,
  },
  {
    id: 'twenty_cycles',
    name: 'Power User',
    description: 'Run 20+ cycles and unlock advanced analytics',
    requirement: 'totalCycles >= 20',
    reward: { type: 'feature_unlock', feature: 'advanced_analytics' },
    order: 5,
  },
];

/** Base trial period in days */
export const BASE_TRIAL_DAYS = 7;

/** Maximum trial period in days (even with all bonuses) */
export const MAX_TRIAL_DAYS = 42;

// ============================================================================
// MilestoneTracker Class
// ============================================================================

/**
 * Tracks milestone completion and calculates trial bonuses.
 */
export class MilestoneTracker {
  private readonly milestones: Milestone[];

  constructor(milestones: Milestone[] = DEFAULT_MILESTONES) {
    this.milestones = [...milestones].sort((a, b) => a.order - b.order);
  }

  /**
   * Get all configured milestones.
   */
  getAll(): Milestone[] {
    return this.milestones;
  }

  /**
   * Get a milestone by ID.
   */
  get(id: MilestoneId): Milestone | undefined {
    return this.milestones.find((m) => m.id === id);
  }

  /**
   * Check if a specific milestone is completed for a journey.
   */
  isCompleted(milestoneId: MilestoneId, journey: UserJourney): boolean {
    const { milestones, stats, state } = journey;

    switch (milestoneId) {
      case 'first_dispatch':
        // Completed when user reaches activated state or beyond
        return (
          milestones.firstCycleCompleted !== undefined ||
          isStateAtOrBeyond(state, 'activated')
        );

      case 'magic_moment':
        // Completed when first artifact is created
        return milestones.firstArtifactCreated !== undefined;

      case 'five_cycles':
        // Completed when 5+ cycles run
        return stats.totalCycles >= 5;

      case 'pr_merged':
        // Completed when first PR is merged
        return milestones.firstPrMerged !== undefined;

      case 'twenty_cycles':
        // Completed when 20+ cycles run
        return stats.totalCycles >= 20;

      default:
        return false;
    }
  }

  /**
   * Check all milestones for a journey.
   * Returns completed, pending, and unlocked features.
   */
  checkMilestones(journey: UserJourney): MilestoneTrackerResult {
    const completed: MilestoneId[] = [];
    const pending: MilestoneId[] = [];
    const unlockedFeatures: string[] = [];

    for (const milestone of this.milestones) {
      if (this.isCompleted(milestone.id, journey)) {
        completed.push(milestone.id);

        // Collect feature unlocks
        if (milestone.reward.type === 'feature_unlock') {
          unlockedFeatures.push(milestone.reward.feature);
        }
      } else {
        pending.push(milestone.id);
      }
    }

    const progress = Math.round((completed.length / this.milestones.length) * 100);

    return {
      completed,
      pending,
      unlockedFeatures,
      progress,
    };
  }

  /**
   * Calculate total trial days based on milestone completion.
   * Returns base (7) + bonus days, capped at 42.
   */
  calculateTrialDays(journey: UserJourney): TrialDaysResult {
    const bonusBreakdown: { milestoneId: MilestoneId; days: number }[] = [];
    let bonusDays = 0;

    for (const milestone of this.milestones) {
      if (
        milestone.reward.type === 'trial_extension' &&
        this.isCompleted(milestone.id, journey)
      ) {
        bonusBreakdown.push({
          milestoneId: milestone.id,
          days: milestone.reward.days,
        });
        bonusDays += milestone.reward.days;
      }
    }

    // Cap at maximum trial days
    const totalDays = Math.min(BASE_TRIAL_DAYS + bonusDays, MAX_TRIAL_DAYS);

    return {
      baseDays: BASE_TRIAL_DAYS,
      bonusDays,
      totalDays,
      bonusBreakdown,
    };
  }

  /**
   * Get the next milestone to complete.
   * Returns undefined if all milestones are completed.
   */
  getNextMilestone(journey: UserJourney): Milestone | undefined {
    for (const milestone of this.milestones) {
      if (!this.isCompleted(milestone.id, journey)) {
        return milestone;
      }
    }
    return undefined;
  }

  /**
   * Get milestone completion timestamps from journey.
   */
  getCompletionTimestamp(
    milestoneId: MilestoneId,
    journey: UserJourney
  ): Date | undefined {
    const { milestones } = journey;

    switch (milestoneId) {
      case 'first_dispatch':
        return milestones.firstCycleCompleted;
      case 'magic_moment':
        return milestones.firstArtifactCreated;
      case 'five_cycles':
        return milestones.cycle5Reached;
      case 'pr_merged':
        return milestones.firstPrMerged;
      case 'twenty_cycles':
        return milestones.cycle20Reached;
      default:
        return undefined;
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * State ordering for progression checks.
 */
const STATE_ORDER: Record<string, number> = {
  anonymous: 0,
  signed_up: 1,
  installed: 2,
  connected: 3,
  first_cycle: 4,
  activated: 5,
  magic_moment: 6,
  engaged: 7,
  power_user: 8,
  trialing: 9,
  converted: 10,
  churned: 11,
};

/**
 * Check if current state is at or beyond target state.
 */
function isStateAtOrBeyond(current: string, target: string): boolean {
  return (STATE_ORDER[current] ?? 0) >= (STATE_ORDER[target] ?? 0);
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new MilestoneTracker with default milestones.
 */
export function createMilestoneTracker(): MilestoneTracker {
  return new MilestoneTracker();
}

/**
 * Create a MilestoneTracker with custom milestones.
 */
export function createCustomMilestoneTracker(
  milestones: Milestone[]
): MilestoneTracker {
  return new MilestoneTracker(milestones);
}
