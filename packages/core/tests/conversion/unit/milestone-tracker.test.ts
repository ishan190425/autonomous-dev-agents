/**
 * @fileoverview Unit tests for MilestoneTracker
 *
 * Tests milestone completion, trial day calculation, and feature unlocks.
 * Test plan from: docs/qa/sprint3-trial-conversion-test-plan-c1269.md Section 2.4
 *
 * @see packages/core/src/conversion/milestones.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MilestoneTracker,
  BASE_TRIAL_DAYS,
  MAX_TRIAL_DAYS,
  createMilestoneTracker,
  type MilestoneId,
} from '../../../src/conversion/milestones.js';
import type { UserJourney, UserJourneyState } from '../../../src/conversion/journey.js';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a test journey with optional overrides.
 */
function createTestJourney(overrides: Partial<UserJourney> = {}): UserJourney {
  const now = new Date();
  const defaultStats = {
    totalCycles: 0,
    totalPrsCreated: 0,
    totalIssuesCreated: 0,
    totalCommentsCreated: 0,
    lastActivityAt: now,
    streakDays: 0,
  };

  return {
    userId: 'test-user',
    state: (overrides.state ?? 'anonymous') as UserJourneyState,
    stateEnteredAt: now,
    milestones: { ...overrides.milestones },
    stats: { ...defaultStats, ...overrides.stats },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('MilestoneTracker', () => {
  let tracker: MilestoneTracker;

  beforeEach(() => {
    tracker = createMilestoneTracker();
  });

  // --------------------------------------------------------------------------
  // Default Milestones
  // --------------------------------------------------------------------------

  describe('Default Milestones', () => {
    it('should have 5 default milestones', () => {
      const milestones = tracker.getAll();

      expect(milestones.length).toBe(5);
      expect(milestones.map((m) => m.id)).toEqual([
        'first_dispatch',
        'magic_moment',
        'five_cycles',
        'pr_merged',
        'twenty_cycles',
      ]);
    });

    it('each milestone should have required fields', () => {
      const milestones = tracker.getAll();

      milestones.forEach((m) => {
        expect(m).toHaveProperty('id');
        expect(m).toHaveProperty('name');
        expect(m).toHaveProperty('description');
        expect(m).toHaveProperty('requirement');
        expect(m).toHaveProperty('reward');
        expect(m).toHaveProperty('order');
      });
    });

    it('should get a milestone by ID', () => {
      const milestone = tracker.get('first_dispatch');

      expect(milestone).toBeDefined();
      expect(milestone?.id).toBe('first_dispatch');
      expect(milestone?.name).toBe('First Dispatch');
    });

    it('should return undefined for unknown milestone ID', () => {
      const milestone = tracker.get('unknown' as MilestoneId);

      expect(milestone).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Milestone Checking
  // --------------------------------------------------------------------------

  describe('Milestone Checking', () => {
    it('should complete first_dispatch when activated', () => {
      const journey = createTestJourney({ state: 'activated' });

      const result = tracker.checkMilestones(journey);

      expect(result.completed).toContain('first_dispatch');
    });

    it('should complete first_dispatch when firstCycleCompleted is set', () => {
      const journey = createTestJourney({
        state: 'activated',
        milestones: { firstCycleCompleted: new Date() },
      });

      const result = tracker.checkMilestones(journey);

      expect(result.completed).toContain('first_dispatch');
    });

    it('should NOT complete first_dispatch for anonymous user', () => {
      const journey = createTestJourney({ state: 'anonymous' });

      const result = tracker.checkMilestones(journey);

      expect(result.completed).not.toContain('first_dispatch');
      expect(result.pending).toContain('first_dispatch');
    });

    it('should complete magic_moment on first artifact', () => {
      const journey = createTestJourney({
        state: 'magic_moment',
        milestones: { firstArtifactCreated: new Date() },
        stats: { totalPrsCreated: 1 },
      });

      const result = tracker.checkMilestones(journey);

      expect(result.completed).toContain('first_dispatch');
      expect(result.completed).toContain('magic_moment');
    });

    it('should NOT complete magic_moment without artifact', () => {
      const journey = createTestJourney({
        state: 'activated',
      });

      const result = tracker.checkMilestones(journey);

      expect(result.completed).not.toContain('magic_moment');
      expect(result.pending).toContain('magic_moment');
    });

    it('should complete five_cycles at 5 total cycles', () => {
      const journey = createTestJourney({
        state: 'engaged',
        stats: { totalCycles: 5 },
      });

      const result = tracker.checkMilestones(journey);

      expect(result.completed).toContain('five_cycles');
    });

    it('should complete five_cycles at 6 total cycles', () => {
      const journey = createTestJourney({
        state: 'engaged',
        stats: { totalCycles: 6 },
      });

      const result = tracker.checkMilestones(journey);

      expect(result.completed).toContain('five_cycles');
    });

    it('should NOT complete five_cycles at 4 total cycles', () => {
      const journey = createTestJourney({
        state: 'activated',
        stats: { totalCycles: 4 },
      });

      const result = tracker.checkMilestones(journey);

      expect(result.completed).not.toContain('five_cycles');
      expect(result.pending).toContain('five_cycles');
    });

    it('should complete pr_merged when firstPrMerged is set', () => {
      const journey = createTestJourney({
        state: 'engaged',
        milestones: { firstPrMerged: new Date() },
      });

      const result = tracker.checkMilestones(journey);

      expect(result.completed).toContain('pr_merged');
    });

    it('should NOT complete pr_merged without merge', () => {
      const journey = createTestJourney({
        state: 'engaged',
        stats: { totalPrsCreated: 5 },
      });

      const result = tracker.checkMilestones(journey);

      expect(result.completed).not.toContain('pr_merged');
      expect(result.pending).toContain('pr_merged');
    });

    it('should complete twenty_cycles at 20 total cycles', () => {
      const journey = createTestJourney({
        state: 'power_user',
        stats: { totalCycles: 20 },
      });

      const result = tracker.checkMilestones(journey);

      expect(result.completed).toContain('twenty_cycles');
    });

    it('should complete twenty_cycles at 22 total cycles', () => {
      const journey = createTestJourney({
        state: 'power_user',
        stats: { totalCycles: 22 },
      });

      const result = tracker.checkMilestones(journey);

      expect(result.completed).toContain('twenty_cycles');
    });

    it('should NOT complete twenty_cycles at 19 total cycles', () => {
      const journey = createTestJourney({
        state: 'engaged',
        stats: { totalCycles: 19 },
      });

      const result = tracker.checkMilestones(journey);

      expect(result.completed).not.toContain('twenty_cycles');
      expect(result.pending).toContain('twenty_cycles');
    });
  });

  // --------------------------------------------------------------------------
  // Trial Day Calculation
  // --------------------------------------------------------------------------

  describe('Trial Day Calculation', () => {
    it('base trial is 7 days', () => {
      const journey = createTestJourney({ state: 'signed_up' });

      const result = tracker.calculateTrialDays(journey);

      expect(result.baseDays).toBe(7);
      expect(result.bonusDays).toBe(0);
      expect(result.totalDays).toBe(7);
      expect(result.bonusBreakdown).toEqual([]);
    });

    it('first_dispatch adds 7 days', () => {
      const journey = createTestJourney({
        state: 'activated',
        milestones: { firstCycleCompleted: new Date() },
      });

      const result = tracker.calculateTrialDays(journey);

      expect(result.bonusDays).toBe(7);
      expect(result.totalDays).toBe(14);
      expect(result.bonusBreakdown).toContainEqual({
        milestoneId: 'first_dispatch',
        days: 7,
      });
    });

    it('magic_moment adds 7 more days', () => {
      const journey = createTestJourney({
        state: 'magic_moment',
        milestones: {
          firstCycleCompleted: new Date(),
          firstArtifactCreated: new Date(),
        },
      });

      const result = tracker.calculateTrialDays(journey);

      expect(result.bonusDays).toBe(14); // 7 + 7
      expect(result.totalDays).toBe(21);
      expect(result.bonusBreakdown.length).toBe(2);
    });

    it('five_cycles adds 7 more days', () => {
      const journey = createTestJourney({
        state: 'engaged',
        milestones: {
          firstCycleCompleted: new Date(),
          firstArtifactCreated: new Date(),
          cycle5Reached: new Date(),
        },
        stats: { totalCycles: 5 },
      });

      const result = tracker.calculateTrialDays(journey);

      expect(result.bonusDays).toBe(21); // 7 + 7 + 7
      expect(result.totalDays).toBe(28);
      expect(result.bonusBreakdown.length).toBe(3);
    });

    it('pr_merged adds 14 days', () => {
      const journey = createTestJourney({
        state: 'engaged',
        milestones: {
          firstCycleCompleted: new Date(),
          firstArtifactCreated: new Date(),
          cycle5Reached: new Date(),
          firstPrMerged: new Date(),
        },
        stats: { totalCycles: 8 },
      });

      const result = tracker.calculateTrialDays(journey);

      expect(result.bonusDays).toBe(35); // 7 + 7 + 7 + 14
      expect(result.totalDays).toBe(42);
      expect(result.bonusBreakdown).toContainEqual({
        milestoneId: 'pr_merged',
        days: 14,
      });
    });

    it('maximum trial is 42 days', () => {
      const journey = createTestJourney({
        state: 'power_user',
        milestones: {
          firstCycleCompleted: new Date(),
          firstArtifactCreated: new Date(),
          cycle5Reached: new Date(),
          firstPrMerged: new Date(),
          cycle20Reached: new Date(),
        },
        stats: { totalCycles: 25 },
      });

      const result = tracker.calculateTrialDays(journey);

      // twenty_cycles unlocks feature, not more days
      // Total bonus: 7 + 7 + 7 + 14 = 35, total = 42
      expect(result.totalDays).toBe(42);
    });

    it('should not exceed MAX_TRIAL_DAYS even with extra bonuses', () => {
      expect(MAX_TRIAL_DAYS).toBe(42);
      expect(BASE_TRIAL_DAYS).toBe(7);
    });
  });

  // --------------------------------------------------------------------------
  // Feature Unlock Rewards
  // --------------------------------------------------------------------------

  describe('Feature Unlock Rewards', () => {
    it('twenty_cycles unlocks advanced_analytics', () => {
      const journey = createTestJourney({
        state: 'power_user',
        stats: { totalCycles: 22 },
      });

      const result = tracker.checkMilestones(journey);

      expect(result.unlockedFeatures).toContain('advanced_analytics');
    });

    it('should not unlock features for incomplete milestones', () => {
      const journey = createTestJourney({
        state: 'activated',
        stats: { totalCycles: 3 },
      });

      const result = tracker.checkMilestones(journey);

      expect(result.unlockedFeatures).not.toContain('advanced_analytics');
    });
  });

  // --------------------------------------------------------------------------
  // Progress Calculation
  // --------------------------------------------------------------------------

  describe('Progress Calculation', () => {
    it('should calculate 0% progress for new user', () => {
      const journey = createTestJourney({ state: 'anonymous' });

      const result = tracker.checkMilestones(journey);

      expect(result.progress).toBe(0);
    });

    it('should calculate 20% progress for 1/5 milestones', () => {
      const journey = createTestJourney({
        state: 'activated',
        milestones: { firstCycleCompleted: new Date() },
      });

      const result = tracker.checkMilestones(journey);

      expect(result.progress).toBe(20);
    });

    it('should calculate 40% progress for 2/5 milestones', () => {
      const journey = createTestJourney({
        state: 'magic_moment',
        milestones: {
          firstCycleCompleted: new Date(),
          firstArtifactCreated: new Date(),
        },
      });

      const result = tracker.checkMilestones(journey);

      expect(result.progress).toBe(40);
    });

    it('should calculate 100% progress for all milestones', () => {
      const journey = createTestJourney({
        state: 'power_user',
        milestones: {
          firstCycleCompleted: new Date(),
          firstArtifactCreated: new Date(),
          cycle5Reached: new Date(),
          firstPrMerged: new Date(),
          cycle20Reached: new Date(),
        },
        stats: { totalCycles: 25 },
      });

      const result = tracker.checkMilestones(journey);

      expect(result.progress).toBe(100);
    });
  });

  // --------------------------------------------------------------------------
  // Next Milestone
  // --------------------------------------------------------------------------

  describe('Next Milestone', () => {
    it('should return first_dispatch for new user', () => {
      const journey = createTestJourney({ state: 'signed_up' });

      const next = tracker.getNextMilestone(journey);

      expect(next?.id).toBe('first_dispatch');
    });

    it('should return magic_moment after first_dispatch', () => {
      const journey = createTestJourney({
        state: 'activated',
        milestones: { firstCycleCompleted: new Date() },
      });

      const next = tracker.getNextMilestone(journey);

      expect(next?.id).toBe('magic_moment');
    });

    it('should return five_cycles after magic_moment', () => {
      const journey = createTestJourney({
        state: 'magic_moment',
        milestones: {
          firstCycleCompleted: new Date(),
          firstArtifactCreated: new Date(),
        },
        stats: { totalCycles: 2 },
      });

      const next = tracker.getNextMilestone(journey);

      expect(next?.id).toBe('five_cycles');
    });

    it('should return undefined when all milestones complete', () => {
      const journey = createTestJourney({
        state: 'power_user',
        milestones: {
          firstCycleCompleted: new Date(),
          firstArtifactCreated: new Date(),
          cycle5Reached: new Date(),
          firstPrMerged: new Date(),
          cycle20Reached: new Date(),
        },
        stats: { totalCycles: 25 },
      });

      const next = tracker.getNextMilestone(journey);

      expect(next).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Completion Timestamps
  // --------------------------------------------------------------------------

  describe('Completion Timestamps', () => {
    it('should return first_dispatch timestamp', () => {
      const completedAt = new Date('2026-02-28T10:00:00Z');
      const journey = createTestJourney({
        state: 'activated',
        milestones: { firstCycleCompleted: completedAt },
      });

      const timestamp = tracker.getCompletionTimestamp('first_dispatch', journey);

      expect(timestamp).toEqual(completedAt);
    });

    it('should return magic_moment timestamp', () => {
      const completedAt = new Date('2026-02-28T11:00:00Z');
      const journey = createTestJourney({
        state: 'magic_moment',
        milestones: { firstArtifactCreated: completedAt },
      });

      const timestamp = tracker.getCompletionTimestamp('magic_moment', journey);

      expect(timestamp).toEqual(completedAt);
    });

    it('should return undefined for incomplete milestone', () => {
      const journey = createTestJourney({ state: 'signed_up' });

      const timestamp = tracker.getCompletionTimestamp('first_dispatch', journey);

      expect(timestamp).toBeUndefined();
    });
  });
});
