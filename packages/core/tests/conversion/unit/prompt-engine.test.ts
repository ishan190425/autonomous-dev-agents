/**
 * @fileoverview Unit tests for PromptEngine
 *
 * Tests prompt triggers, content interpolation, cooldown/maxShows enforcement,
 * and priority ordering.
 *
 * Test plan from: docs/qa/sprint3-trial-conversion-test-plan-c1269.md Section 2.5
 *
 * @see packages/core/src/conversion/prompt-engine.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PromptEngine,
  createPromptEngine,
  getDefaultPrompts,
  addDays,
  PROMPT_PRIORITY,
  DEFAULT_PROMPTS,
  type Prompt,
  type PromptContent,
  type PromptHistory,
  type StatThresholdTrigger,
  type EventTrigger,
  type MilestoneCompleteTrigger,
  type TrialEndingTrigger,
} from '../../../src/conversion/prompt-engine.js';
import type { UserJourney, UserJourneyState } from '../../../src/conversion/journey.js';
import type { ConversionEvent, ConversionEventType } from '../../../src/conversion/events.js';

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
    trialEndsAt: overrides.trialEndsAt,
  };
}

/**
 * Create a test event.
 */
function createTestEvent(type: ConversionEventType): ConversionEvent {
  return {
    id: `evt_test_${Date.now()}`,
    type,
    userId: 'test-user',
    timestamp: new Date(),
    metadata: {},
  };
}

/**
 * Create a test prompt.
 */
function createTestPrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    id: overrides.id ?? 'test_prompt',
    trigger: overrides.trigger ?? {
      type: 'stat_threshold',
      stat: 'totalCycles',
      threshold: 10,
    },
    content: overrides.content ?? {
      headline: 'Test Headline',
      body: 'Test Body',
    },
    priority: overrides.priority ?? PROMPT_PRIORITY.VALUE,
    cooldownMs: overrides.cooldownMs ?? 24 * 60 * 60 * 1000, // 1 day
    maxShows: overrides.maxShows ?? 3,
  };
}

/**
 * Create a test prompt history.
 */
function createTestHistory(overrides: Partial<PromptHistory> = {}): PromptHistory {
  return {
    promptId: overrides.promptId ?? 'test_prompt',
    userId: overrides.userId ?? 'test-user',
    lastShownAt: overrides.lastShownAt ?? new Date(),
    showCount: overrides.showCount ?? 1,
    clicked: overrides.clicked ?? false,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('PromptEngine', () => {
  let engine: PromptEngine;

  beforeEach(() => {
    engine = createPromptEngine();
  });

  // --------------------------------------------------------------------------
  // Factory Functions
  // --------------------------------------------------------------------------

  describe('Factory Functions', () => {
    it('createPromptEngine should create a PromptEngine instance', () => {
      const engine = createPromptEngine();
      expect(engine).toBeInstanceOf(PromptEngine);
    });

    it('getDefaultPrompts should return default prompts array', () => {
      const prompts = getDefaultPrompts();
      expect(Array.isArray(prompts)).toBe(true);
      expect(prompts.length).toBeGreaterThan(0);
    });

    it('getDefaultPrompts should return a copy (not mutate original)', () => {
      const prompts1 = getDefaultPrompts();
      const prompts2 = getDefaultPrompts();
      prompts1.pop();
      expect(prompts2.length).toBe(DEFAULT_PROMPTS.length);
    });
  });

  // --------------------------------------------------------------------------
  // Content Interpolation
  // --------------------------------------------------------------------------

  describe('Content Interpolation', () => {
    it('should replace {{cycles}} placeholder', () => {
      const content: PromptContent = { headline: 'You ran {{cycles}} cycles!', body: '' };
      const journey = createTestJourney({ stats: { totalCycles: 47 } });

      const result = engine.interpolate(content, journey);

      expect(result.headline).toBe('You ran 47 cycles!');
    });

    it('should replace {{prs}} placeholder', () => {
      const content: PromptContent = { headline: '', body: 'Created {{prs}} PRs.' };
      const journey = createTestJourney({ stats: { totalPrsCreated: 3 } });

      const result = engine.interpolate(content, journey);

      expect(result.body).toBe('Created 3 PRs.');
    });

    it('should replace {{issues}} placeholder', () => {
      const content: PromptContent = { headline: '', body: 'Filed {{issues}} issues.' };
      const journey = createTestJourney({ stats: { totalIssuesCreated: 12 } });

      const result = engine.interpolate(content, journey);

      expect(result.body).toBe('Filed 12 issues.');
    });

    it('should replace {{daysActive}} placeholder', () => {
      const content: PromptContent = { headline: '', body: 'Active for {{daysActive}} days!' };
      const journey = createTestJourney({ stats: { streakDays: 5 } });

      const result = engine.interpolate(content, journey);

      expect(result.body).toBe('Active for 5 days!');
    });

    it('should handle multiple placeholders in same string', () => {
      const content: PromptContent = {
        headline: '{{cycles}} cycles!',
        body: '{{prs}} PRs and {{issues}} issues.',
      };
      const journey = createTestJourney({
        stats: { totalCycles: 47, totalPrsCreated: 3, totalIssuesCreated: 12 },
      });

      const result = engine.interpolate(content, journey);

      expect(result.headline).toBe('47 cycles!');
      expect(result.body).toBe('3 PRs and 12 issues.');
    });

    it('should handle all four placeholders', () => {
      const content: PromptContent = {
        headline: '{{cycles}} cycles over {{daysActive}} days',
        body: 'Created {{prs}} PRs and {{issues}} issues',
      };
      const journey = createTestJourney({
        stats: {
          totalCycles: 100,
          totalPrsCreated: 25,
          totalIssuesCreated: 50,
          streakDays: 14,
        },
      });

      const result = engine.interpolate(content, journey);

      expect(result.headline).toBe('100 cycles over 14 days');
      expect(result.body).toBe('Created 25 PRs and 50 issues');
    });

    it('should preserve CTA and ctaUrl', () => {
      const content: PromptContent = {
        headline: '{{cycles}} cycles',
        body: 'Test',
        cta: 'Click {{prs}} times',
        ctaUrl: '/upgrade',
      };
      const journey = createTestJourney({
        stats: { totalCycles: 10, totalPrsCreated: 5 },
      });

      const result = engine.interpolate(content, journey);

      expect(result.cta).toBe('Click 5 times');
      expect(result.ctaUrl).toBe('/upgrade');
    });

    it('should handle content without placeholders', () => {
      const content: PromptContent = {
        headline: 'Static headline',
        body: 'Static body',
      };
      const journey = createTestJourney({ stats: { totalCycles: 100 } });

      const result = engine.interpolate(content, journey);

      expect(result.headline).toBe('Static headline');
      expect(result.body).toBe('Static body');
    });

    it('should handle zero values', () => {
      const content: PromptContent = {
        headline: '{{cycles}} cycles, {{prs}} PRs',
        body: '',
      };
      const journey = createTestJourney({
        stats: { totalCycles: 0, totalPrsCreated: 0 },
      });

      const result = engine.interpolate(content, journey);

      expect(result.headline).toBe('0 cycles, 0 PRs');
    });
  });

  // --------------------------------------------------------------------------
  // Trigger Evaluation: stat_threshold
  // --------------------------------------------------------------------------

  describe('Trigger Evaluation - stat_threshold', () => {
    it('should fire at threshold', () => {
      const trigger: StatThresholdTrigger = {
        type: 'stat_threshold',
        stat: 'totalCycles',
        threshold: 10,
      };
      const journey = createTestJourney({ stats: { totalCycles: 10 } });

      expect(engine.shouldTrigger(trigger, journey)).toBe(true);
    });

    it('should fire above threshold', () => {
      const trigger: StatThresholdTrigger = {
        type: 'stat_threshold',
        stat: 'totalCycles',
        threshold: 10,
      };
      const journey = createTestJourney({ stats: { totalCycles: 15 } });

      expect(engine.shouldTrigger(trigger, journey)).toBe(true);
    });

    it('should not fire below threshold', () => {
      const trigger: StatThresholdTrigger = {
        type: 'stat_threshold',
        stat: 'totalCycles',
        threshold: 10,
      };
      const journey = createTestJourney({ stats: { totalCycles: 9 } });

      expect(engine.shouldTrigger(trigger, journey)).toBe(false);
    });

    it('should work with totalPrsCreated stat', () => {
      const trigger: StatThresholdTrigger = {
        type: 'stat_threshold',
        stat: 'totalPrsCreated',
        threshold: 5,
      };

      expect(
        engine.shouldTrigger(trigger, createTestJourney({ stats: { totalPrsCreated: 5 } }))
      ).toBe(true);
      expect(
        engine.shouldTrigger(trigger, createTestJourney({ stats: { totalPrsCreated: 4 } }))
      ).toBe(false);
    });

    it('should work with totalIssuesCreated stat', () => {
      const trigger: StatThresholdTrigger = {
        type: 'stat_threshold',
        stat: 'totalIssuesCreated',
        threshold: 10,
      };

      expect(
        engine.shouldTrigger(trigger, createTestJourney({ stats: { totalIssuesCreated: 10 } }))
      ).toBe(true);
      expect(
        engine.shouldTrigger(trigger, createTestJourney({ stats: { totalIssuesCreated: 9 } }))
      ).toBe(false);
    });

    it('should work with streakDays stat', () => {
      const trigger: StatThresholdTrigger = {
        type: 'stat_threshold',
        stat: 'streakDays',
        threshold: 7,
      };

      expect(engine.shouldTrigger(trigger, createTestJourney({ stats: { streakDays: 7 } }))).toBe(
        true
      );
      expect(engine.shouldTrigger(trigger, createTestJourney({ stats: { streakDays: 6 } }))).toBe(
        false
      );
    });

    it('should work with totalCommentsCreated stat', () => {
      const trigger: StatThresholdTrigger = {
        type: 'stat_threshold',
        stat: 'totalCommentsCreated',
        threshold: 20,
      };

      expect(
        engine.shouldTrigger(trigger, createTestJourney({ stats: { totalCommentsCreated: 20 } }))
      ).toBe(true);
      expect(
        engine.shouldTrigger(trigger, createTestJourney({ stats: { totalCommentsCreated: 19 } }))
      ).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Trigger Evaluation: event
  // --------------------------------------------------------------------------

  describe('Trigger Evaluation - event', () => {
    it('should fire on matching event', () => {
      const trigger: EventTrigger = { type: 'event', eventType: 'cycle.created_pr' };
      const event = createTestEvent('cycle.created_pr');

      expect(engine.shouldTriggerOnEvent(trigger, event)).toBe(true);
    });

    it('should not fire on non-matching event', () => {
      const trigger: EventTrigger = { type: 'event', eventType: 'cycle.created_pr' };
      const event = createTestEvent('cycle.created_issue');

      expect(engine.shouldTriggerOnEvent(trigger, event)).toBe(false);
    });

    it('shouldTrigger returns false for event triggers (needs event object)', () => {
      const trigger: EventTrigger = { type: 'event', eventType: 'cycle.created_pr' };
      const journey = createTestJourney();

      expect(engine.shouldTrigger(trigger, journey)).toBe(false);
    });

    it('should match various event types', () => {
      const eventTypes: ConversionEventType[] = [
        'user.signup',
        'user.cli_installed',
        'cycle.completed',
        'subscription.created',
      ];

      for (const eventType of eventTypes) {
        const trigger: EventTrigger = { type: 'event', eventType };
        const event = createTestEvent(eventType);
        expect(engine.shouldTriggerOnEvent(trigger, event)).toBe(true);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Trigger Evaluation: milestone_complete
  // --------------------------------------------------------------------------

  describe('Trigger Evaluation - milestone_complete', () => {
    it('should fire after first_dispatch milestone', () => {
      const trigger: MilestoneCompleteTrigger = {
        type: 'milestone_complete',
        milestoneId: 'first_dispatch',
      };
      const journey = createTestJourney({
        milestones: { firstCycleCompleted: new Date() },
      });

      expect(engine.shouldTrigger(trigger, journey)).toBe(true);
    });

    it('should not fire before first_dispatch milestone', () => {
      const trigger: MilestoneCompleteTrigger = {
        type: 'milestone_complete',
        milestoneId: 'first_dispatch',
      };
      const journey = createTestJourney({ milestones: {} });

      expect(engine.shouldTrigger(trigger, journey)).toBe(false);
    });

    it('should fire after magic_moment milestone', () => {
      const trigger: MilestoneCompleteTrigger = {
        type: 'milestone_complete',
        milestoneId: 'magic_moment',
      };
      const journey = createTestJourney({
        milestones: { firstArtifactCreated: new Date() },
      });

      expect(engine.shouldTrigger(trigger, journey)).toBe(true);
    });

    it('should fire after five_cycles milestone', () => {
      const trigger: MilestoneCompleteTrigger = {
        type: 'milestone_complete',
        milestoneId: 'five_cycles',
      };
      const journey = createTestJourney({
        milestones: { cycle5Reached: new Date() },
      });

      expect(engine.shouldTrigger(trigger, journey)).toBe(true);
    });

    it('should fire after pr_merged milestone', () => {
      const trigger: MilestoneCompleteTrigger = {
        type: 'milestone_complete',
        milestoneId: 'pr_merged',
      };
      const journey = createTestJourney({
        milestones: { firstPrMerged: new Date() },
      });

      expect(engine.shouldTrigger(trigger, journey)).toBe(true);
    });

    it('should fire after twenty_cycles milestone', () => {
      const trigger: MilestoneCompleteTrigger = {
        type: 'milestone_complete',
        milestoneId: 'twenty_cycles',
      };
      const journey = createTestJourney({
        milestones: { cycle20Reached: new Date() },
      });

      expect(engine.shouldTrigger(trigger, journey)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Trigger Evaluation: trial_ending
  // --------------------------------------------------------------------------

  describe('Trigger Evaluation - trial_ending', () => {
    it('should fire at N days remaining', () => {
      const trigger: TrialEndingTrigger = { type: 'trial_ending', daysRemaining: 3 };
      const journey = createTestJourney({
        trialEndsAt: addDays(new Date(), 2), // 2 days remaining
      });

      expect(engine.shouldTrigger(trigger, journey)).toBe(true);
    });

    it('should fire at exactly N days remaining', () => {
      const trigger: TrialEndingTrigger = { type: 'trial_ending', daysRemaining: 3 };
      const journey = createTestJourney({
        trialEndsAt: addDays(new Date(), 3), // exactly 3 days
      });

      expect(engine.shouldTrigger(trigger, journey)).toBe(true);
    });

    it('should not fire with more than N days remaining', () => {
      const trigger: TrialEndingTrigger = { type: 'trial_ending', daysRemaining: 3 };
      const journey = createTestJourney({
        trialEndsAt: addDays(new Date(), 5), // 5 days remaining
      });

      expect(engine.shouldTrigger(trigger, journey)).toBe(false);
    });

    it('should fire at 0 days remaining (last day)', () => {
      const trigger: TrialEndingTrigger = { type: 'trial_ending', daysRemaining: 1 };
      const now = new Date();
      const journey = createTestJourney({
        trialEndsAt: new Date(now.getTime() + 12 * 60 * 60 * 1000), // 12 hours from now
      });

      expect(engine.shouldTrigger(trigger, journey)).toBe(true);
    });

    it('should not fire when trialEndsAt is not set', () => {
      const trigger: TrialEndingTrigger = { type: 'trial_ending', daysRemaining: 3 };
      const journey = createTestJourney({ trialEndsAt: undefined });

      expect(engine.shouldTrigger(trigger, journey)).toBe(false);
    });

    it('should not fire when trial has already expired', () => {
      const trigger: TrialEndingTrigger = { type: 'trial_ending', daysRemaining: 1 };
      const journey = createTestJourney({
        trialEndsAt: addDays(new Date(), -1), // 1 day ago
      });

      expect(engine.shouldTrigger(trigger, journey)).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Cooldown Enforcement
  // --------------------------------------------------------------------------

  describe('Cooldown Enforcement', () => {
    it('should show prompt if never shown before (no history)', () => {
      const prompt = createTestPrompt({ cooldownMs: 24 * 60 * 60 * 1000 });

      expect(engine.canShow(prompt, undefined)).toBe(true);
    });

    it('should not show prompt within cooldown period', () => {
      const prompt = createTestPrompt({ cooldownMs: 24 * 60 * 60 * 1000 }); // 24h
      const history = createTestHistory({
        lastShownAt: new Date(), // Just shown
        showCount: 1,
      });

      expect(engine.canShow(prompt, history)).toBe(false);
    });

    it('should show prompt after cooldown expires', () => {
      const prompt = createTestPrompt({ cooldownMs: 24 * 60 * 60 * 1000 });
      const history = createTestHistory({
        lastShownAt: addDays(new Date(), -2), // 2 days ago
        showCount: 1,
      });

      expect(engine.canShow(prompt, history)).toBe(true);
    });

    it('should respect exact cooldown boundary', () => {
      const cooldownMs = 60 * 60 * 1000; // 1 hour
      const prompt = createTestPrompt({ cooldownMs });

      // Just before cooldown expires
      const notYet = new Date(Date.now() - cooldownMs + 1000);
      expect(engine.canShow(prompt, createTestHistory({ lastShownAt: notYet }))).toBe(false);

      // Just after cooldown expires
      const expired = new Date(Date.now() - cooldownMs - 1000);
      expect(engine.canShow(prompt, createTestHistory({ lastShownAt: expired }))).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Max Shows Enforcement
  // --------------------------------------------------------------------------

  describe('Max Shows Enforcement', () => {
    it('should show prompt below maxShows', () => {
      const prompt = createTestPrompt({ maxShows: 3 });
      const history = createTestHistory({
        showCount: 2,
        lastShownAt: addDays(new Date(), -10), // Way past cooldown
      });

      expect(engine.canShow(prompt, history)).toBe(true);
    });

    it('should not show prompt at maxShows', () => {
      const prompt = createTestPrompt({ maxShows: 3 });
      const history = createTestHistory({
        showCount: 3,
        lastShownAt: addDays(new Date(), -10),
      });

      expect(engine.canShow(prompt, history)).toBe(false);
    });

    it('should not show prompt exceeding maxShows', () => {
      const prompt = createTestPrompt({ maxShows: 3 });
      const history = createTestHistory({
        showCount: 5,
        lastShownAt: addDays(new Date(), -10),
      });

      expect(engine.canShow(prompt, history)).toBe(false);
    });

    it('should handle maxShows = 1 (one-time prompt)', () => {
      const prompt = createTestPrompt({ maxShows: 1 });

      // Never shown
      expect(engine.canShow(prompt, undefined)).toBe(true);

      // Shown once
      const history = createTestHistory({
        showCount: 1,
        lastShownAt: addDays(new Date(), -100),
      });
      expect(engine.canShow(prompt, history)).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // getCannotShowReason
  // --------------------------------------------------------------------------

  describe('getCannotShowReason', () => {
    it('should return undefined for no history', () => {
      const prompt = createTestPrompt();
      expect(engine.getCannotShowReason(prompt, undefined)).toBeUndefined();
    });

    it('should return "max_shows" when limit reached', () => {
      const prompt = createTestPrompt({ maxShows: 2 });
      const history = createTestHistory({ showCount: 2 });

      expect(engine.getCannotShowReason(prompt, history)).toBe('max_shows');
    });

    it('should return "cooldown" when in cooldown period', () => {
      const prompt = createTestPrompt({ maxShows: 10, cooldownMs: 24 * 60 * 60 * 1000 });
      const history = createTestHistory({
        showCount: 1,
        lastShownAt: new Date(), // Just now
      });

      expect(engine.getCannotShowReason(prompt, history)).toBe('cooldown');
    });

    it('should return undefined when can show', () => {
      const prompt = createTestPrompt({ maxShows: 10, cooldownMs: 1000 });
      const history = createTestHistory({
        showCount: 1,
        lastShownAt: addDays(new Date(), -1), // Long ago
      });

      expect(engine.getCannotShowReason(prompt, history)).toBeUndefined();
    });

    it('max_shows takes priority over cooldown', () => {
      const prompt = createTestPrompt({ maxShows: 2, cooldownMs: 24 * 60 * 60 * 1000 });
      const history = createTestHistory({
        showCount: 2, // At max
        lastShownAt: new Date(), // Also in cooldown
      });

      expect(engine.getCannotShowReason(prompt, history)).toBe('max_shows');
    });
  });

  // --------------------------------------------------------------------------
  // Priority Ordering
  // --------------------------------------------------------------------------

  describe('Priority Ordering', () => {
    it('should return higher priority prompts first', () => {
      const prompts = [
        createTestPrompt({
          id: 'time_based',
          priority: PROMPT_PRIORITY.TIME,
          trigger: { type: 'stat_threshold', stat: 'totalCycles', threshold: 1 },
        }),
        createTestPrompt({
          id: 'value_based',
          priority: PROMPT_PRIORITY.VALUE,
          trigger: { type: 'stat_threshold', stat: 'totalCycles', threshold: 1 },
        }),
        createTestPrompt({
          id: 'milestone',
          priority: PROMPT_PRIORITY.MILESTONE,
          trigger: { type: 'milestone_complete', milestoneId: 'first_dispatch' },
        }),
      ];
      const journey = createTestJourney({
        stats: { totalCycles: 20 },
        milestones: { firstCycleCompleted: new Date() },
      });

      const eligible = engine.getEligiblePrompts(prompts, journey);

      expect(eligible[0].prompt.id).toBe('milestone');
      expect(eligible[1].prompt.id).toBe('value_based');
      expect(eligible[2].prompt.id).toBe('time_based');
    });

    it('value prompts (>=75) always beat time prompts (50)', () => {
      const valuePrompt = createTestPrompt({ id: 'value', priority: 75 });
      const timePrompt = createTestPrompt({ id: 'time', priority: 50 });

      const winner = engine.pickWinner([valuePrompt, timePrompt]);

      expect(winner.id).toBe('value');
    });

    it('pickWinner throws for empty list', () => {
      expect(() => engine.pickWinner([])).toThrow('Cannot pick winner from empty prompt list');
    });

    it('pickWinner returns highest priority from mixed list', () => {
      const prompts = [
        createTestPrompt({ id: 'low', priority: 10 }),
        createTestPrompt({ id: 'high', priority: 90 }),
        createTestPrompt({ id: 'medium', priority: 50 }),
      ];

      const winner = engine.pickWinner(prompts);

      expect(winner.id).toBe('high');
    });
  });

  // --------------------------------------------------------------------------
  // getEligiblePrompts
  // --------------------------------------------------------------------------

  describe('getEligiblePrompts', () => {
    it('should return only eligible prompts', () => {
      const prompts = [
        createTestPrompt({
          id: 'eligible',
          trigger: { type: 'stat_threshold', stat: 'totalCycles', threshold: 5 },
        }),
        createTestPrompt({
          id: 'not_eligible',
          trigger: { type: 'stat_threshold', stat: 'totalCycles', threshold: 20 },
        }),
      ];
      const journey = createTestJourney({ stats: { totalCycles: 10 } });

      const eligible = engine.getEligiblePrompts(prompts, journey);

      expect(eligible.length).toBe(1);
      expect(eligible[0].prompt.id).toBe('eligible');
    });

    it('should exclude prompts at maxShows', () => {
      const prompts = [
        createTestPrompt({
          id: 'shown_out',
          trigger: { type: 'stat_threshold', stat: 'totalCycles', threshold: 1 },
          maxShows: 2,
        }),
      ];
      const journey = createTestJourney({ stats: { totalCycles: 10 } });
      const histories = new Map([
        [
          'shown_out',
          createTestHistory({
            promptId: 'shown_out',
            showCount: 2,
            lastShownAt: addDays(new Date(), -10),
          }),
        ],
      ]);

      const eligible = engine.getEligiblePrompts(prompts, journey, histories);

      expect(eligible.length).toBe(0);
    });

    it('should exclude prompts in cooldown', () => {
      const prompts = [
        createTestPrompt({
          id: 'in_cooldown',
          trigger: { type: 'stat_threshold', stat: 'totalCycles', threshold: 1 },
          cooldownMs: 24 * 60 * 60 * 1000,
        }),
      ];
      const journey = createTestJourney({ stats: { totalCycles: 10 } });
      const histories = new Map([
        [
          'in_cooldown',
          createTestHistory({
            promptId: 'in_cooldown',
            showCount: 1,
            lastShownAt: new Date(), // Just now
          }),
        ],
      ]);

      const eligible = engine.getEligiblePrompts(prompts, journey, histories);

      expect(eligible.length).toBe(0);
    });

    it('should include interpolated content for eligible prompts', () => {
      const prompts = [
        createTestPrompt({
          id: 'with_interpolation',
          trigger: { type: 'stat_threshold', stat: 'totalCycles', threshold: 5 },
          content: {
            headline: '{{cycles}} cycles!',
            body: '{{prs}} PRs created.',
          },
        }),
      ];
      const journey = createTestJourney({
        stats: { totalCycles: 10, totalPrsCreated: 3 },
      });

      const eligible = engine.getEligiblePrompts(prompts, journey);

      expect(eligible[0].interpolatedContent?.headline).toBe('10 cycles!');
      expect(eligible[0].interpolatedContent?.body).toBe('3 PRs created.');
    });

    it('should return empty array when no prompts eligible', () => {
      const prompts = [
        createTestPrompt({
          trigger: { type: 'stat_threshold', stat: 'totalCycles', threshold: 100 },
        }),
      ];
      const journey = createTestJourney({ stats: { totalCycles: 1 } });

      const eligible = engine.getEligiblePrompts(prompts, journey);

      expect(eligible).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // evaluatePrompt
  // --------------------------------------------------------------------------

  describe('evaluatePrompt', () => {
    it('should return eligible=true with interpolated content for valid prompt', () => {
      const prompt = createTestPrompt({
        trigger: { type: 'stat_threshold', stat: 'totalCycles', threshold: 5 },
        content: { headline: '{{cycles}} done!', body: 'Great job.' },
      });
      const journey = createTestJourney({ stats: { totalCycles: 10 } });

      const result = engine.evaluatePrompt(prompt, journey);

      expect(result.eligible).toBe(true);
      expect(result.interpolatedContent?.headline).toBe('10 done!');
      expect(result.reason).toBeUndefined();
    });

    it('should return eligible=false with reason=trigger_not_met', () => {
      const prompt = createTestPrompt({
        trigger: { type: 'stat_threshold', stat: 'totalCycles', threshold: 100 },
      });
      const journey = createTestJourney({ stats: { totalCycles: 10 } });

      const result = engine.evaluatePrompt(prompt, journey);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('trigger_not_met');
      expect(result.interpolatedContent).toBeUndefined();
    });

    it('should return eligible=false with reason=cooldown', () => {
      const prompt = createTestPrompt({
        trigger: { type: 'stat_threshold', stat: 'totalCycles', threshold: 1 },
        cooldownMs: 24 * 60 * 60 * 1000,
      });
      const journey = createTestJourney({ stats: { totalCycles: 10 } });
      const history = createTestHistory({ lastShownAt: new Date() });

      const result = engine.evaluatePrompt(prompt, journey, history);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('cooldown');
    });

    it('should return eligible=false with reason=max_shows', () => {
      const prompt = createTestPrompt({
        trigger: { type: 'stat_threshold', stat: 'totalCycles', threshold: 1 },
        maxShows: 2,
      });
      const journey = createTestJourney({ stats: { totalCycles: 10 } });
      const history = createTestHistory({
        showCount: 2,
        lastShownAt: addDays(new Date(), -10),
      });

      const result = engine.evaluatePrompt(prompt, journey, history);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('max_shows');
    });
  });

  // --------------------------------------------------------------------------
  // Default Prompts
  // --------------------------------------------------------------------------

  describe('Default Prompts', () => {
    it('should have at least 5 default prompts', () => {
      expect(DEFAULT_PROMPTS.length).toBeGreaterThanOrEqual(5);
    });

    it('each default prompt should have required fields', () => {
      for (const prompt of DEFAULT_PROMPTS) {
        expect(prompt.id).toBeDefined();
        expect(prompt.trigger).toBeDefined();
        expect(prompt.content).toBeDefined();
        expect(prompt.content.headline).toBeDefined();
        expect(prompt.content.body).toBeDefined();
        expect(typeof prompt.priority).toBe('number');
        expect(typeof prompt.cooldownMs).toBe('number');
        expect(typeof prompt.maxShows).toBe('number');
      }
    });

    it('should have prompts for each trigger type', () => {
      const triggerTypes = new Set(DEFAULT_PROMPTS.map((p) => p.trigger.type));

      expect(triggerTypes.has('stat_threshold')).toBe(true);
      expect(triggerTypes.has('milestone_complete')).toBe(true);
      expect(triggerTypes.has('trial_ending')).toBe(true);
    });

    it('value prompts should have priority >= 75', () => {
      const valuePrompts = DEFAULT_PROMPTS.filter(
        (p) => p.trigger.type === 'stat_threshold' || p.trigger.type === 'milestone_complete'
      );

      for (const prompt of valuePrompts) {
        expect(prompt.priority).toBeGreaterThanOrEqual(PROMPT_PRIORITY.TIME);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Utility Functions
  // --------------------------------------------------------------------------

  describe('addDays Utility', () => {
    it('should add positive days', () => {
      const date = new Date('2026-01-01T00:00:00Z');
      const result = addDays(date, 5);

      expect(result.toISOString().startsWith('2026-01-06')).toBe(true);
    });

    it('should add negative days (subtract)', () => {
      const date = new Date('2026-01-10T00:00:00Z');
      const result = addDays(date, -5);

      expect(result.toISOString().startsWith('2026-01-05')).toBe(true);
    });

    it('should not mutate original date', () => {
      const date = new Date('2026-01-01T00:00:00Z');
      const original = date.toISOString();
      addDays(date, 10);

      expect(date.toISOString()).toBe(original);
    });

    it('should handle zero days', () => {
      const date = new Date('2026-01-15T12:30:00Z');
      const result = addDays(date, 0);

      expect(result.toISOString()).toBe(date.toISOString());
    });

    it('should handle month boundaries', () => {
      const date = new Date('2026-01-30T00:00:00Z');
      const result = addDays(date, 5);

      expect(result.toISOString().startsWith('2026-02-04')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Priority Constants
  // --------------------------------------------------------------------------

  describe('Priority Constants', () => {
    it('MILESTONE priority should be highest', () => {
      expect(PROMPT_PRIORITY.MILESTONE).toBeGreaterThan(PROMPT_PRIORITY.VALUE);
      expect(PROMPT_PRIORITY.MILESTONE).toBeGreaterThan(PROMPT_PRIORITY.TIME);
    });

    it('VALUE priority should be higher than TIME', () => {
      expect(PROMPT_PRIORITY.VALUE).toBeGreaterThan(PROMPT_PRIORITY.TIME);
    });

    it('priorities should have expected values', () => {
      expect(PROMPT_PRIORITY.MILESTONE).toBe(80);
      expect(PROMPT_PRIORITY.VALUE).toBe(75);
      expect(PROMPT_PRIORITY.TIME).toBe(50);
    });
  });
});
