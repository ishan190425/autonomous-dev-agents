/**
 * @fileoverview Milestone Trial Manager - Trial Extension via Milestones
 *
 * Manages milestone-based trial extensions for the conversion platform.
 * Implements the trial logic from ADR C1266:
 * - Base 7-day trial
 * - Milestone bonuses (up to 42 days total)
 * - Integration with MilestoneTracker from conversion module
 *
 * @see docs/architecture/adr-trial-conversion-platform-c1266.md
 */

import type {
  MilestoneTrialInfo,
  TrialDaysConfig,
} from './plan-types.js';
import { DEFAULT_TRIAL_CONFIG } from './plan-types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of applying a milestone bonus.
 */
export interface MilestoneBonusResult {
  /** Whether the bonus was applied */
  applied: boolean;
  /** Days added (0 if not applied or at cap) */
  daysAdded: number;
  /** Total trial days after bonus */
  totalDays: number;
  /** Days remaining after bonus */
  daysRemaining: number;
  /** Reason if not applied */
  reason?: string;
}

/**
 * Options for creating a trial.
 */
export interface CreateTrialOptions {
  /** Custom trial configuration */
  config?: TrialDaysConfig;
  /** Starting bonus days (e.g., from promotion) */
  startingBonusDays?: number;
}

/**
 * Trial status check result.
 */
export interface TrialStatusResult {
  /** Whether trial is active */
  isActive: boolean;
  /** Whether trial has ended */
  hasEnded: boolean;
  /** Days remaining (0 if ended) */
  daysRemaining: number;
  /** Total days earned */
  totalDays: number;
  /** Max possible days */
  maxDays: number;
  /** Progress percentage (0-100) */
  progressPercent: number;
  /** Milestones completed */
  milestonesCompleted: string[];
  /** Next available bonus (if any) */
  nextBonus: {
    milestoneId: string;
    potentialDays: number;
  } | undefined;
}

// ============================================================================
// Milestone Trial Manager
// ============================================================================

/**
 * Manages milestone-based trial extensions.
 */
export class MilestoneTrialManager {
  private config: TrialDaysConfig;

  constructor(config: TrialDaysConfig = DEFAULT_TRIAL_CONFIG) {
    this.config = config;
  }

  /**
   * Create a new milestone-based trial.
   */
  createTrial(options: CreateTrialOptions = {}): MilestoneTrialInfo {
    const config = options.config || this.config;
    const bonusDays = options.startingBonusDays || 0;
    const totalDays = Math.min(config.baseDays + bonusDays, config.maxDays);

    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(endsAt.getDate() + totalDays);

    return {
      startedAt: now,
      endsAt,
      hasEnded: false,
      daysRemaining: totalDays,
      totalDays,
      milestoneBonuses: [],
    };
  }

  /**
   * Apply a milestone bonus to a trial.
   */
  applyMilestoneBonus(
    trial: MilestoneTrialInfo,
    milestoneId: string
  ): MilestoneBonusResult {
    // Check if milestone already applied
    const alreadyApplied = trial.milestoneBonuses.some(
      b => b.milestoneId === milestoneId
    );
    if (alreadyApplied) {
      return {
        applied: false,
        daysAdded: 0,
        totalDays: trial.totalDays,
        daysRemaining: this.calculateDaysRemaining(trial),
        reason: `Milestone ${milestoneId} already applied`,
      };
    }

    // Check if milestone exists in config
    const bonusDays = this.config.milestoneBonuses[milestoneId];
    if (bonusDays === undefined) {
      return {
        applied: false,
        daysAdded: 0,
        totalDays: trial.totalDays,
        daysRemaining: this.calculateDaysRemaining(trial),
        reason: `Unknown milestone: ${milestoneId}`,
      };
    }

    // Check if milestone gives days (some give features instead)
    if (bonusDays === 0) {
      return {
        applied: true, // Still counts as applied for tracking
        daysAdded: 0,
        totalDays: trial.totalDays,
        daysRemaining: this.calculateDaysRemaining(trial),
        reason: `Milestone ${milestoneId} unlocks features, not days`,
      };
    }

    // Check if at max days
    if (trial.totalDays >= this.config.maxDays) {
      return {
        applied: false,
        daysAdded: 0,
        totalDays: trial.totalDays,
        daysRemaining: this.calculateDaysRemaining(trial),
        reason: `Already at maximum trial of ${this.config.maxDays} days`,
      };
    }

    // Calculate actual days to add (cap at max)
    const actualDaysAdded = Math.min(
      bonusDays,
      this.config.maxDays - trial.totalDays
    );

    // Update trial
    trial.totalDays += actualDaysAdded;
    trial.endsAt = new Date(trial.endsAt);
    trial.endsAt.setDate(trial.endsAt.getDate() + actualDaysAdded);
    trial.daysRemaining = this.calculateDaysRemaining(trial);
    trial.milestoneBonuses.push({
      milestoneId,
      daysAdded: actualDaysAdded,
      appliedAt: new Date(),
    });

    return {
      applied: true,
      daysAdded: actualDaysAdded,
      totalDays: trial.totalDays,
      daysRemaining: trial.daysRemaining,
    };
  }

  /**
   * Get trial status.
   */
  getTrialStatus(trial: MilestoneTrialInfo): TrialStatusResult {
    const now = new Date();
    const hasEnded = now >= trial.endsAt;
    const daysRemaining = hasEnded ? 0 : this.calculateDaysRemaining(trial);
    const milestonesCompleted = trial.milestoneBonuses.map(b => b.milestoneId);

    // Find next available bonus
    let nextBonus: TrialStatusResult['nextBonus'];
    for (const [milestoneId, days] of Object.entries(this.config.milestoneBonuses)) {
      if (days > 0 && !milestonesCompleted.includes(milestoneId)) {
        nextBonus = { milestoneId, potentialDays: days };
        break;
      }
    }

    return {
      isActive: !hasEnded,
      hasEnded,
      daysRemaining,
      totalDays: trial.totalDays,
      maxDays: this.config.maxDays,
      progressPercent: Math.round((trial.totalDays / this.config.maxDays) * 100),
      milestonesCompleted,
      nextBonus,
    };
  }

  /**
   * Update trial ended status.
   */
  checkTrialEnded(trial: MilestoneTrialInfo): boolean {
    const now = new Date();
    trial.hasEnded = now >= trial.endsAt;
    trial.daysRemaining = this.calculateDaysRemaining(trial);
    return trial.hasEnded;
  }

  /**
   * Get available milestones that haven't been applied.
   */
  getAvailableMilestones(trial: MilestoneTrialInfo): Array<{
    milestoneId: string;
    bonusDays: number;
  }> {
    const applied = new Set(trial.milestoneBonuses.map(b => b.milestoneId));
    const available: Array<{ milestoneId: string; bonusDays: number }> = [];

    for (const [milestoneId, bonusDays] of Object.entries(this.config.milestoneBonuses)) {
      if (!applied.has(milestoneId) && bonusDays > 0) {
        available.push({ milestoneId, bonusDays });
      }
    }

    return available;
  }

  /**
   * Calculate potential maximum trial length.
   */
  calculatePotentialMaxDays(trial: MilestoneTrialInfo): number {
    const available = this.getAvailableMilestones(trial);
    const potentialBonus = available.reduce((sum, m) => sum + m.bonusDays, 0);
    return Math.min(trial.totalDays + potentialBonus, this.config.maxDays);
  }

  /**
   * Calculate days remaining from end date.
   */
  private calculateDaysRemaining(trial: MilestoneTrialInfo): number {
    const now = new Date();
    const diffMs = trial.endsAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a milestone trial manager.
 */
export function createMilestoneTrialManager(
  config?: TrialDaysConfig
): MilestoneTrialManager {
  return new MilestoneTrialManager(config);
}

/**
 * Create a new trial with default settings.
 */
export function createTrial(options?: CreateTrialOptions): MilestoneTrialInfo {
  const manager = new MilestoneTrialManager(options?.config);
  return manager.createTrial(options);
}

/**
 * Apply a milestone bonus to a trial.
 */
export function applyMilestoneBonus(
  trial: MilestoneTrialInfo,
  milestoneId: string,
  config?: TrialDaysConfig
): MilestoneBonusResult {
  const manager = new MilestoneTrialManager(config);
  return manager.applyMilestoneBonus(trial, milestoneId);
}

// ============================================================================
// Mock Manager for Testing
// ============================================================================

/**
 * Mock milestone trial manager for testing.
 */
export class MockMilestoneTrialManager extends MilestoneTrialManager {
  private trials: Map<string, MilestoneTrialInfo> = new Map();

  /**
   * Store a trial for later retrieval.
   */
  storeTrial(userId: string, trial: MilestoneTrialInfo): void {
    this.trials.set(userId, trial);
  }

  /**
   * Get a stored trial.
   */
  getTrial(userId: string): MilestoneTrialInfo | undefined {
    return this.trials.get(userId);
  }

  /**
   * Clear all stored trials.
   */
  reset(): void {
    this.trials.clear();
  }

  /**
   * Get number of stored trials.
   */
  getTrialCount(): number {
    return this.trials.size;
  }
}

/**
 * Create a mock milestone trial manager for testing.
 */
export function createMockMilestoneTrialManager(
  config?: TrialDaysConfig
): MockMilestoneTrialManager {
  return new MockMilestoneTrialManager(config);
}
