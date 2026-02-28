/**
 * @fileoverview Milestone Trial Tests
 *
 * Comprehensive tests for the milestone-based trial system:
 * - Trial creation and configuration
 * - Milestone bonus application
 * - Trial status tracking
 * - Max days capping
 * - Mock manager functionality
 *
 * @see docs/architecture/adr-trial-conversion-platform-c1266.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Types
  type MilestoneTrialInfo,
  // Constants
  DEFAULT_TRIAL_CONFIG,
  DEFAULT_PLANS,
  // Type guards
  isFreePlanTier,
  hasTrialBonuses,
  getPlanById,
  getPlanByTier,
  // Classes
  MilestoneTrialManager,
  MockMilestoneTrialManager,
  // Factory functions
  createMilestoneTrialManager,
  createTrial,
  applyMilestoneBonus,
  createMockMilestoneTrialManager,
} from '../../src/billing/index.js';

// ============================================================================
// Plan Configuration Tests
// ============================================================================

describe('Plan Configuration', () => {
  describe('DEFAULT_PLANS', () => {
    it('should have three plans (free, pro, enterprise)', () => {
      expect(DEFAULT_PLANS).toHaveLength(3);
      expect(DEFAULT_PLANS.map(p => p.tier)).toEqual(['free', 'pro', 'enterprise']);
    });

    it('should have correct sort order', () => {
      const sortOrders = DEFAULT_PLANS.map(p => p.sortOrder);
      expect(sortOrders).toEqual([1, 2, 3]);
    });

    it('should have free plan without pricing', () => {
      const freePlan = DEFAULT_PLANS.find(p => p.tier === 'free');
      expect(freePlan).toBeDefined();
      expect(freePlan!.pricing).toBeNull();
    });

    it('should have paid plans with pricing', () => {
      const proPlan = DEFAULT_PLANS.find(p => p.tier === 'pro');
      const enterprisePlan = DEFAULT_PLANS.find(p => p.tier === 'enterprise');

      expect(proPlan!.pricing).not.toBeNull();
      expect(enterprisePlan!.pricing).not.toBeNull();
      expect(proPlan!.pricing!.monthlyPriceCents).toBe(2900); // $29
      expect(enterprisePlan!.pricing!.monthlyPriceCents).toBe(9900); // $99
    });

    it('should have yearly discount for paid plans', () => {
      const proPlan = DEFAULT_PLANS.find(p => p.tier === 'pro')!;
      const yearlyPrice = proPlan.pricing!.yearlyPriceCents;
      const monthlyEquivalent = proPlan.pricing!.monthlyPriceCents * 12;

      expect(yearlyPrice).toBeLessThan(monthlyEquivalent);
    });

    it('should have rate limits per C1276 ADR', () => {
      const limits = DEFAULT_PLANS.map(p => ({
        tier: p.tier,
        apiRateLimit: p.limits.apiRateLimit,
      }));

      expect(limits).toEqual([
        { tier: 'free', apiRateLimit: 60 },
        { tier: 'pro', apiRateLimit: 300 },
        { tier: 'enterprise', apiRateLimit: 1000 },
      ]);
    });

    it('should have unlimited cycles for paid plans', () => {
      const proPlan = DEFAULT_PLANS.find(p => p.tier === 'pro')!;
      const enterprisePlan = DEFAULT_PLANS.find(p => p.tier === 'enterprise')!;

      expect(proPlan.limits.cyclesPerMonth).toBeNull();
      expect(enterprisePlan.limits.cyclesPerMonth).toBeNull();
    });

    it('should have cycle limit for free plan', () => {
      const freePlan = DEFAULT_PLANS.find(p => p.tier === 'free')!;
      expect(freePlan.limits.cyclesPerMonth).toBe(50);
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(DEFAULT_PLANS)).toBe(true);
    });
  });

  describe('Plan Features', () => {
    it('should have GitHub integration for all plans', () => {
      DEFAULT_PLANS.forEach(plan => {
        expect(plan.features.githubIntegration).toBe(true);
      });
    });

    it('should have SSO only for enterprise', () => {
      expect(DEFAULT_PLANS.find(p => p.tier === 'free')!.features.sso).toBe(false);
      expect(DEFAULT_PLANS.find(p => p.tier === 'pro')!.features.sso).toBe(false);
      expect(DEFAULT_PLANS.find(p => p.tier === 'enterprise')!.features.sso).toBe(true);
    });

    it('should have advanced analytics for paid plans only', () => {
      expect(DEFAULT_PLANS.find(p => p.tier === 'free')!.features.advancedAnalytics).toBe(false);
      expect(DEFAULT_PLANS.find(p => p.tier === 'pro')!.features.advancedAnalytics).toBe(true);
      expect(DEFAULT_PLANS.find(p => p.tier === 'enterprise')!.features.advancedAnalytics).toBe(true);
    });
  });
});

// ============================================================================
// Type Guard Tests
// ============================================================================

describe('Type Guards', () => {
  describe('isFreePlanTier', () => {
    it('should return true for free tier', () => {
      expect(isFreePlanTier('free')).toBe(true);
    });

    it('should return false for paid tiers', () => {
      expect(isFreePlanTier('pro')).toBe(false);
      expect(isFreePlanTier('enterprise')).toBe(false);
    });
  });

  describe('hasTrialBonuses', () => {
    it('should return true for trial with bonuses', () => {
      const trial: MilestoneTrialInfo = {
        startedAt: new Date(),
        endsAt: new Date(),
        hasEnded: false,
        daysRemaining: 7,
        totalDays: 14,
        milestoneBonuses: [
          { milestoneId: 'first_dispatch', daysAdded: 7, appliedAt: new Date() },
        ],
      };
      expect(hasTrialBonuses(trial)).toBe(true);
    });

    it('should return false for trial without bonuses', () => {
      const trial: MilestoneTrialInfo = {
        startedAt: new Date(),
        endsAt: new Date(),
        hasEnded: false,
        daysRemaining: 7,
        totalDays: 7,
        milestoneBonuses: [],
      };
      expect(hasTrialBonuses(trial)).toBe(false);
    });
  });

  describe('getPlanById', () => {
    it('should return plan by ID', () => {
      const plan = getPlanById('plan_pro');
      expect(plan).toBeDefined();
      expect(plan!.tier).toBe('pro');
    });

    it('should return undefined for invalid ID', () => {
      const plan = getPlanById('invalid_plan');
      expect(plan).toBeUndefined();
    });
  });

  describe('getPlanByTier', () => {
    it('should return plan by tier', () => {
      const plan = getPlanByTier('enterprise');
      expect(plan).toBeDefined();
      expect(plan!.id).toBe('plan_enterprise');
    });
  });
});

// ============================================================================
// Trial Configuration Tests
// ============================================================================

describe('Trial Configuration', () => {
  describe('DEFAULT_TRIAL_CONFIG', () => {
    it('should have base days of 7', () => {
      expect(DEFAULT_TRIAL_CONFIG.baseDays).toBe(7);
    });

    it('should have max days of 42', () => {
      expect(DEFAULT_TRIAL_CONFIG.maxDays).toBe(42);
    });

    it('should have correct milestone bonuses', () => {
      expect(DEFAULT_TRIAL_CONFIG.milestoneBonuses).toEqual({
        first_dispatch: 7,
        magic_moment: 7,
        five_cycles: 7,
        pr_merged: 14,
        twenty_cycles: 0,
      });
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(DEFAULT_TRIAL_CONFIG)).toBe(true);
    });
  });
});

// ============================================================================
// MilestoneTrialManager Tests
// ============================================================================

describe('MilestoneTrialManager', () => {
  let manager: MilestoneTrialManager;

  beforeEach(() => {
    manager = createMilestoneTrialManager();
  });

  describe('createTrial', () => {
    it('should create trial with default config', () => {
      const trial = manager.createTrial();

      expect(trial.totalDays).toBe(7);
      expect(trial.daysRemaining).toBe(7);
      expect(trial.hasEnded).toBe(false);
      expect(trial.milestoneBonuses).toHaveLength(0);
    });

    it('should create trial with starting bonus', () => {
      const trial = manager.createTrial({ startingBonusDays: 7 });

      expect(trial.totalDays).toBe(14);
    });

    it('should cap starting bonus at max days', () => {
      const trial = manager.createTrial({ startingBonusDays: 100 });

      expect(trial.totalDays).toBe(42); // max days
    });

    it('should set correct end date', () => {
      const before = new Date();
      const trial = manager.createTrial();
      const after = new Date();

      const expectedEnd = new Date(before);
      expectedEnd.setDate(expectedEnd.getDate() + 7);

      expect(trial.endsAt.getTime()).toBeGreaterThanOrEqual(expectedEnd.getTime() - 1000);
      expect(trial.startedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(trial.startedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('applyMilestoneBonus', () => {
    it('should apply first_dispatch milestone', () => {
      const trial = manager.createTrial();
      const result = manager.applyMilestoneBonus(trial, 'first_dispatch');

      expect(result.applied).toBe(true);
      expect(result.daysAdded).toBe(7);
      expect(result.totalDays).toBe(14);
      expect(trial.milestoneBonuses).toHaveLength(1);
      expect(trial.milestoneBonuses[0].milestoneId).toBe('first_dispatch');
    });

    it('should apply magic_moment milestone', () => {
      const trial = manager.createTrial();
      manager.applyMilestoneBonus(trial, 'first_dispatch'); // +7
      const result = manager.applyMilestoneBonus(trial, 'magic_moment'); // +7

      expect(result.applied).toBe(true);
      expect(result.daysAdded).toBe(7);
      expect(result.totalDays).toBe(21);
    });

    it('should apply pr_merged milestone with 14 days', () => {
      const trial = manager.createTrial();
      const result = manager.applyMilestoneBonus(trial, 'pr_merged');

      expect(result.applied).toBe(true);
      expect(result.daysAdded).toBe(14);
      expect(result.totalDays).toBe(21);
    });

    it('should reject duplicate milestone', () => {
      const trial = manager.createTrial();
      manager.applyMilestoneBonus(trial, 'first_dispatch');
      const result = manager.applyMilestoneBonus(trial, 'first_dispatch');

      expect(result.applied).toBe(false);
      expect(result.daysAdded).toBe(0);
      expect(result.reason).toContain('already applied');
    });

    it('should reject unknown milestone', () => {
      const trial = manager.createTrial();
      const result = manager.applyMilestoneBonus(trial, 'unknown_milestone');

      expect(result.applied).toBe(false);
      expect(result.reason).toContain('Unknown milestone');
    });

    it('should handle twenty_cycles (feature unlock, 0 days)', () => {
      const trial = manager.createTrial();
      const result = manager.applyMilestoneBonus(trial, 'twenty_cycles');

      expect(result.applied).toBe(true); // Still tracked
      expect(result.daysAdded).toBe(0);
      expect(result.reason).toContain('unlocks features');
    });

    it('should cap bonus at max days', () => {
      const trial = manager.createTrial();
      // Apply all milestones: 7 + 7 + 7 + 14 = 35, but base is 7, so 7+35=42
      manager.applyMilestoneBonus(trial, 'first_dispatch'); // 7 → 14
      manager.applyMilestoneBonus(trial, 'magic_moment'); // 14 → 21
      manager.applyMilestoneBonus(trial, 'five_cycles'); // 21 → 28
      const result = manager.applyMilestoneBonus(trial, 'pr_merged'); // 28 → 42 (capped from 42)

      expect(result.applied).toBe(true);
      expect(result.daysAdded).toBe(14); // Full bonus since we're at 28 + 14 = 42
      expect(result.totalDays).toBe(42);
    });

    it('should reject bonus when at max days', () => {
      const trial = manager.createTrial({ startingBonusDays: 35 }); // 7 + 35 = 42
      const result = manager.applyMilestoneBonus(trial, 'first_dispatch');

      expect(result.applied).toBe(false);
      expect(result.reason).toContain('maximum trial');
    });
  });

  describe('getTrialStatus', () => {
    it('should return active status for new trial', () => {
      const trial = manager.createTrial();
      const status = manager.getTrialStatus(trial);

      expect(status.isActive).toBe(true);
      expect(status.hasEnded).toBe(false);
      expect(status.daysRemaining).toBe(7);
      expect(status.totalDays).toBe(7);
      expect(status.maxDays).toBe(42);
      expect(status.progressPercent).toBe(17); // 7/42 = ~17%
      expect(status.milestonesCompleted).toHaveLength(0);
    });

    it('should show completed milestones', () => {
      const trial = manager.createTrial();
      manager.applyMilestoneBonus(trial, 'first_dispatch');
      manager.applyMilestoneBonus(trial, 'magic_moment');

      const status = manager.getTrialStatus(trial);

      expect(status.milestonesCompleted).toEqual(['first_dispatch', 'magic_moment']);
      expect(status.progressPercent).toBe(50); // 21/42 = 50%
    });

    it('should show next available bonus', () => {
      const trial = manager.createTrial();
      const status = manager.getTrialStatus(trial);

      expect(status.nextBonus).toBeDefined();
      expect(status.nextBonus!.milestoneId).toBe('first_dispatch');
      expect(status.nextBonus!.potentialDays).toBe(7);
    });

    it('should not show next bonus if all applied', () => {
      const trial = manager.createTrial();
      manager.applyMilestoneBonus(trial, 'first_dispatch');
      manager.applyMilestoneBonus(trial, 'magic_moment');
      manager.applyMilestoneBonus(trial, 'five_cycles');
      manager.applyMilestoneBonus(trial, 'pr_merged');

      const status = manager.getTrialStatus(trial);

      // twenty_cycles gives 0 days, so no "next bonus"
      expect(status.nextBonus).toBeUndefined();
    });
  });

  describe('getAvailableMilestones', () => {
    it('should return all milestones initially', () => {
      const trial = manager.createTrial();
      const available = manager.getAvailableMilestones(trial);

      // Only milestones with days > 0
      expect(available).toHaveLength(4);
      expect(available.map(m => m.milestoneId)).toEqual([
        'first_dispatch',
        'magic_moment',
        'five_cycles',
        'pr_merged',
      ]);
    });

    it('should exclude applied milestones', () => {
      const trial = manager.createTrial();
      manager.applyMilestoneBonus(trial, 'first_dispatch');
      manager.applyMilestoneBonus(trial, 'magic_moment');

      const available = manager.getAvailableMilestones(trial);

      expect(available).toHaveLength(2);
      expect(available.map(m => m.milestoneId)).toEqual(['five_cycles', 'pr_merged']);
    });
  });

  describe('calculatePotentialMaxDays', () => {
    it('should calculate max with all available milestones', () => {
      const trial = manager.createTrial();
      const potential = manager.calculatePotentialMaxDays(trial);

      // 7 + 7 + 7 + 7 + 14 = 42
      expect(potential).toBe(42);
    });

    it('should account for applied milestones', () => {
      const trial = manager.createTrial();
      manager.applyMilestoneBonus(trial, 'first_dispatch'); // Now at 14

      const potential = manager.calculatePotentialMaxDays(trial);

      // 14 + 7 + 7 + 14 = 42
      expect(potential).toBe(42);
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('Factory Functions', () => {
  describe('createTrial', () => {
    it('should create trial with defaults', () => {
      const trial = createTrial();

      expect(trial.totalDays).toBe(7);
      expect(trial.milestoneBonuses).toHaveLength(0);
    });
  });

  describe('applyMilestoneBonus', () => {
    it('should apply bonus standalone', () => {
      const trial = createTrial();
      const result = applyMilestoneBonus(trial, 'first_dispatch');

      expect(result.applied).toBe(true);
      expect(result.daysAdded).toBe(7);
    });
  });
});

// ============================================================================
// MockMilestoneTrialManager Tests
// ============================================================================

describe('MockMilestoneTrialManager', () => {
  let mock: MockMilestoneTrialManager;

  beforeEach(() => {
    mock = createMockMilestoneTrialManager();
  });

  it('should store and retrieve trials', () => {
    const trial = mock.createTrial();
    mock.storeTrial('user_123', trial);

    const retrieved = mock.getTrial('user_123');
    expect(retrieved).toBe(trial);
  });

  it('should return undefined for unknown user', () => {
    const retrieved = mock.getTrial('unknown');
    expect(retrieved).toBeUndefined();
  });

  it('should track trial count', () => {
    expect(mock.getTrialCount()).toBe(0);

    mock.storeTrial('user_1', mock.createTrial());
    expect(mock.getTrialCount()).toBe(1);

    mock.storeTrial('user_2', mock.createTrial());
    expect(mock.getTrialCount()).toBe(2);
  });

  it('should reset state', () => {
    mock.storeTrial('user_1', mock.createTrial());
    mock.storeTrial('user_2', mock.createTrial());

    mock.reset();

    expect(mock.getTrialCount()).toBe(0);
  });
});

// ============================================================================
// Integration Tests (Full Trial Lifecycle)
// ============================================================================

describe('Trial Lifecycle', () => {
  it('should complete full milestone progression per C1266', () => {
    const manager = createMilestoneTrialManager();

    // 1. Start trial
    const trial = manager.createTrial();
    expect(trial.totalDays).toBe(7);

    // 2. User completes first dispatch (+7 days)
    const result1 = manager.applyMilestoneBonus(trial, 'first_dispatch');
    expect(result1.applied).toBe(true);
    expect(trial.totalDays).toBe(14);

    // 3. User creates first PR (magic moment, +7 days)
    const result2 = manager.applyMilestoneBonus(trial, 'magic_moment');
    expect(result2.applied).toBe(true);
    expect(trial.totalDays).toBe(21);

    // 4. User completes 5 cycles (+7 days)
    const result3 = manager.applyMilestoneBonus(trial, 'five_cycles');
    expect(result3.applied).toBe(true);
    expect(trial.totalDays).toBe(28);

    // 5. PR gets merged (+14 days)
    const result4 = manager.applyMilestoneBonus(trial, 'pr_merged');
    expect(result4.applied).toBe(true);
    expect(trial.totalDays).toBe(42); // Max!

    // 6. Verify final state
    const status = manager.getTrialStatus(trial);
    expect(status.totalDays).toBe(42);
    expect(status.progressPercent).toBe(100);
    expect(status.milestonesCompleted).toHaveLength(4);
    expect(status.nextBonus).toBeUndefined(); // All day-giving milestones applied
  });

  it('should handle partial milestone completion', () => {
    const manager = createMilestoneTrialManager();
    const trial = manager.createTrial();

    // Only complete first_dispatch and five_cycles
    manager.applyMilestoneBonus(trial, 'first_dispatch'); // +7 = 14
    manager.applyMilestoneBonus(trial, 'five_cycles'); // +7 = 21

    const status = manager.getTrialStatus(trial);

    expect(status.totalDays).toBe(21);
    expect(status.milestonesCompleted).toEqual(['first_dispatch', 'five_cycles']);
    expect(status.nextBonus).toBeDefined();
    expect(status.nextBonus!.milestoneId).toBe('magic_moment');

    // Can still earn more
    const potential = manager.calculatePotentialMaxDays(trial);
    expect(potential).toBe(42); // 21 + 7 (magic) + 14 (pr_merged) = 42
  });
});
