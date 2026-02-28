/**
 * @fileoverview Unit tests for User Journey State Machine
 *
 * Tests AC-2.1.1, AC-2.1.2, and AC-2.2.1 from C1267.
 */

import { describe, it, expect } from 'vitest';
import {
  type UserJourneyState,
  type UserJourney,
  STATE_TRANSITIONS,
  InvalidStateTransitionError,
  createJourney,
  findTransition,
  applyEvent,
} from '../../src/conversion/journey.js';
import { createEvent } from '../../src/conversion/events.js';

// ============================================================================
// AC-2.1.1: All Journey States Defined
// ============================================================================

describe('UserJourneyState', () => {
  it('should include all 12 journey states', () => {
    const states: UserJourneyState[] = [
      'anonymous',
      'signed_up',
      'installed',
      'connected',
      'first_cycle',
      'activated',
      'magic_moment',
      'engaged',
      'power_user',
      'trialing',
      'converted',
      'churned',
    ];

    // Verify each state is valid by creating journeys with them
    states.forEach(state => {
      const journey: UserJourney = {
        userId: 'test',
        state,
        stateEnteredAt: new Date(),
        milestones: {},
        stats: {
          totalCycles: 0,
          totalPrsCreated: 0,
          totalIssuesCreated: 0,
          totalCommentsCreated: 0,
          lastActivityAt: new Date(),
          streakDays: 0,
        },
      };
      expect(journey.state).toBe(state);
    });
  });

  it('should have state transitions defined for all states', () => {
    const states: UserJourneyState[] = [
      'anonymous',
      'signed_up',
      'installed',
      'connected',
      'first_cycle',
      'activated',
      'magic_moment',
      'engaged',
      'power_user',
      'trialing',
      'converted',
      'churned',
    ];

    states.forEach(state => {
      expect(STATE_TRANSITIONS[state]).toBeDefined();
      expect(Array.isArray(STATE_TRANSITIONS[state])).toBe(true);
    });
  });
});

// ============================================================================
// AC-2.1.2: State Transitions Work
// ============================================================================

describe('State Transitions', () => {
  describe('Test Matrix from C1267', () => {
    it('anonymous → signed_up on user.signup', () => {
      const journey = createTestJourney('anonymous');
      const event = createEvent({
        type: 'user.signup',
        userId: 'test',
        metadata: {},
      });

      const updated = applyEvent(journey, event);

      expect(updated.state).toBe('signed_up');
    });

    it('signed_up → installed on user.cli_installed', () => {
      const journey = createTestJourney('signed_up');
      const event = createEvent({
        type: 'user.cli_installed',
        userId: 'test',
        metadata: {},
      });

      const updated = applyEvent(journey, event);

      expect(updated.state).toBe('installed');
    });

    it('installed → connected on user.repo_connected', () => {
      const journey = createTestJourney('installed');
      const event = createEvent({
        type: 'user.repo_connected',
        userId: 'test',
        metadata: {},
      });

      const updated = applyEvent(journey, event);

      expect(updated.state).toBe('connected');
    });

    it('connected → first_cycle on user.first_dispatch_started', () => {
      const journey = createTestJourney('connected');
      const event = createEvent({
        type: 'user.first_dispatch_started',
        userId: 'test',
        metadata: {},
      });

      const updated = applyEvent(journey, event);

      expect(updated.state).toBe('first_cycle');
    });

    it('first_cycle → activated on user.first_dispatch_completed', () => {
      const journey = createTestJourney('first_cycle');
      const event = createEvent({
        type: 'user.first_dispatch_completed',
        userId: 'test',
        metadata: {},
      });

      const updated = applyEvent(journey, event);

      expect(updated.state).toBe('activated');
    });

    it('activated → magic_moment on cycle.created_pr (first artifact)', () => {
      const journey = createTestJourney('activated');
      const event = createEvent({
        type: 'cycle.created_pr',
        userId: 'test',
        metadata: {},
      });

      const updated = applyEvent(journey, event);

      expect(updated.state).toBe('magic_moment');
      expect(updated.milestones.firstArtifactCreated).toBeDefined();
    });

    it('magic_moment → engaged on cycle.completed (5th cycle)', () => {
      const journey = createTestJourney('magic_moment');
      journey.stats.totalCycles = 4; // Will become 5 after event

      const event = createEvent({
        type: 'cycle.completed',
        userId: 'test',
        metadata: {},
      });

      const updated = applyEvent(journey, event);

      expect(updated.state).toBe('engaged');
      expect(updated.stats.totalCycles).toBe(5);
      expect(updated.milestones.cycle5Reached).toBeDefined();
    });

    it('engaged → power_user on cycle.completed (20th cycle)', () => {
      const journey = createTestJourney('engaged');
      journey.stats.totalCycles = 19; // Will become 20 after event

      const event = createEvent({
        type: 'cycle.completed',
        userId: 'test',
        metadata: {},
      });

      const updated = applyEvent(journey, event);

      expect(updated.state).toBe('power_user');
      expect(updated.stats.totalCycles).toBe(20);
      expect(updated.milestones.cycle20Reached).toBeDefined();
    });

    it('trialing → converted on subscription.created', () => {
      const journey = createTestJourney('trialing');
      const event = createEvent({
        type: 'subscription.created',
        userId: 'test',
        metadata: {},
      });

      const updated = applyEvent(journey, event);

      expect(updated.state).toBe('converted');
      expect(updated.milestones.converted).toBeDefined();
    });

    it('converted → churned on subscription.cancelled', () => {
      const journey = createTestJourney('converted');
      const event = createEvent({
        type: 'subscription.cancelled',
        userId: 'test',
        metadata: {},
      });

      const updated = applyEvent(journey, event);

      expect(updated.state).toBe('churned');
    });
  });

  describe('Magic Moment from first_cycle', () => {
    it('first_cycle → magic_moment on cycle.created_pr', () => {
      const journey = createTestJourney('first_cycle');
      const event = createEvent({
        type: 'cycle.created_pr',
        userId: 'test',
        metadata: {},
      });

      const updated = applyEvent(journey, event);

      expect(updated.state).toBe('magic_moment');
    });

    it('first_cycle → magic_moment on cycle.created_issue', () => {
      const journey = createTestJourney('first_cycle');
      const event = createEvent({
        type: 'cycle.created_issue',
        userId: 'test',
        metadata: {},
      });

      const updated = applyEvent(journey, event);

      expect(updated.state).toBe('magic_moment');
    });

    it('first_cycle → magic_moment on cycle.created_comment', () => {
      const journey = createTestJourney('first_cycle');
      const event = createEvent({
        type: 'cycle.created_comment',
        userId: 'test',
        metadata: {},
      });

      const updated = applyEvent(journey, event);

      expect(updated.state).toBe('magic_moment');
    });
  });

  describe('Conditional Transitions', () => {
    it('should not transition magic_moment → engaged if cycles < 5', () => {
      const journey = createTestJourney('magic_moment');
      journey.stats.totalCycles = 2;

      const event = createEvent({
        type: 'cycle.completed',
        userId: 'test',
        metadata: {},
      });

      const updated = applyEvent(journey, event);

      expect(updated.state).toBe('magic_moment'); // No transition
      expect(updated.stats.totalCycles).toBe(3);
    });

    it('should not create duplicate magic moment', () => {
      const journey = createTestJourney('magic_moment');
      journey.milestones.firstArtifactCreated = new Date('2026-01-01');

      const event = createEvent({
        type: 'cycle.created_pr',
        userId: 'test',
        metadata: {},
      });

      const updated = applyEvent(journey, event);

      expect(updated.state).toBe('magic_moment');
      expect(updated.milestones.firstArtifactCreated).toEqual(
        journey.milestones.firstArtifactCreated
      );
    });
  });

  describe('Re-subscription', () => {
    it('churned → converted on subscription.created', () => {
      const journey = createTestJourney('churned');
      const event = createEvent({
        type: 'subscription.created',
        userId: 'test',
        metadata: {},
      });

      const updated = applyEvent(journey, event);

      expect(updated.state).toBe('converted');
    });
  });
});

// ============================================================================
// AC-2.2.1: Journey Object Structure
// ============================================================================

describe('UserJourney interface', () => {
  it('should include userId, state, stateEnteredAt, milestones, stats', () => {
    const journey: UserJourney = {
      userId: 'test-user',
      state: 'signed_up',
      stateEnteredAt: new Date(),
      milestones: {},
      stats: {
        totalCycles: 0,
        totalPrsCreated: 0,
        totalIssuesCreated: 0,
        totalCommentsCreated: 0,
        lastActivityAt: new Date(),
        streakDays: 0,
      },
    };

    expect(journey.userId).toBe('test-user');
    expect(journey.state).toBe('signed_up');
    expect(journey.stateEnteredAt).toBeInstanceOf(Date);
    expect(journey.milestones).toBeDefined();
    expect(journey.stats).toBeDefined();
  });

  it('should support all 12 milestone timestamp fields', () => {
    const now = new Date();
    const journey: UserJourney = {
      userId: 'test',
      state: 'converted',
      stateEnteredAt: now,
      milestones: {
        signedUp: now,
        cliInstalled: now,
        repoConnected: now,
        firstCycleStarted: now,
        firstCycleCompleted: now,
        firstArtifactCreated: now,
        cycle5Reached: now,
        cycle10Reached: now,
        cycle20Reached: now,
        firstPrMerged: now,
        trialStarted: now,
        converted: now,
      },
      stats: {
        totalCycles: 25,
        totalPrsCreated: 5,
        totalIssuesCreated: 10,
        totalCommentsCreated: 15,
        lastActivityAt: now,
        streakDays: 7,
      },
    };

    expect(journey.milestones.signedUp).toBe(now);
    expect(journey.milestones.cliInstalled).toBe(now);
    expect(journey.milestones.repoConnected).toBe(now);
    expect(journey.milestones.firstCycleStarted).toBe(now);
    expect(journey.milestones.firstCycleCompleted).toBe(now);
    expect(journey.milestones.firstArtifactCreated).toBe(now);
    expect(journey.milestones.cycle5Reached).toBe(now);
    expect(journey.milestones.cycle10Reached).toBe(now);
    expect(journey.milestones.cycle20Reached).toBe(now);
    expect(journey.milestones.firstPrMerged).toBe(now);
    expect(journey.milestones.trialStarted).toBe(now);
    expect(journey.milestones.converted).toBe(now);
  });

  it('should include all required stats fields', () => {
    const journey = createJourney('test');

    expect(typeof journey.stats.totalCycles).toBe('number');
    expect(typeof journey.stats.totalPrsCreated).toBe('number');
    expect(typeof journey.stats.totalIssuesCreated).toBe('number');
    expect(typeof journey.stats.totalCommentsCreated).toBe('number');
    expect(journey.stats.lastActivityAt).toBeInstanceOf(Date);
    expect(typeof journey.stats.streakDays).toBe('number');
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

describe('createJourney', () => {
  it('should create a new journey with signed_up state', () => {
    const journey = createJourney('test-user');

    expect(journey.userId).toBe('test-user');
    expect(journey.state).toBe('signed_up');
    expect(journey.stateEnteredAt).toBeInstanceOf(Date);
    expect(journey.milestones.signedUp).toBeDefined();
    expect(journey.stats.totalCycles).toBe(0);
  });
});

describe('findTransition', () => {
  it('should find valid transition rule', () => {
    const journey = createTestJourney('signed_up');
    const rule = findTransition(journey, 'user.cli_installed');

    expect(rule).toBeDefined();
    expect(rule?.nextState).toBe('installed');
  });

  it('should return undefined for invalid event', () => {
    const journey = createTestJourney('signed_up');
    const rule = findTransition(journey, 'subscription.created');

    expect(rule).toBeUndefined();
  });
});

describe('applyEvent', () => {
  it('should update lastActivityAt on every event', () => {
    const journey = createTestJourney('activated');
    const beforeTime = journey.stats.lastActivityAt;

    // Wait a tiny bit to ensure different timestamp
    const event = createEvent({
      type: 'cycle.completed',
      userId: 'test',
      metadata: {},
    });

    const updated = applyEvent(journey, event);

    expect(updated.stats.lastActivityAt.getTime()).toBeGreaterThanOrEqual(
      beforeTime.getTime()
    );
  });

  it('should track cycle milestones at 5, 10, and 20', () => {
    let journey = createTestJourney('activated');
    journey.milestones.firstArtifactCreated = new Date(); // To stay in activated

    // Run to 5 cycles
    for (let i = 0; i < 5; i++) {
      const event = createEvent({
        type: 'cycle.completed',
        userId: 'test',
        metadata: {},
      });
      journey = applyEvent(journey, event);
    }
    expect(journey.milestones.cycle5Reached).toBeDefined();
    expect(journey.stats.totalCycles).toBe(5);

    // Run to 10 cycles
    for (let i = 5; i < 10; i++) {
      const event = createEvent({
        type: 'cycle.completed',
        userId: 'test',
        metadata: {},
      });
      journey = applyEvent(journey, event);
    }
    expect(journey.milestones.cycle10Reached).toBeDefined();
    expect(journey.stats.totalCycles).toBe(10);

    // Run to 20 cycles
    for (let i = 10; i < 20; i++) {
      const event = createEvent({
        type: 'cycle.completed',
        userId: 'test',
        metadata: {},
      });
      journey = applyEvent(journey, event);
    }
    expect(journey.milestones.cycle20Reached).toBeDefined();
    expect(journey.stats.totalCycles).toBe(20);
  });

  it('should increment PR count on cycle.created_pr', () => {
    const journey = createTestJourney('activated');
    const event = createEvent({
      type: 'cycle.created_pr',
      userId: 'test',
      metadata: {},
    });

    const updated = applyEvent(journey, event);

    expect(updated.stats.totalPrsCreated).toBe(1);
  });

  it('should increment issue count on cycle.created_issue', () => {
    const journey = createTestJourney('magic_moment');
    const event = createEvent({
      type: 'cycle.created_issue',
      userId: 'test',
      metadata: {},
    });

    const updated = applyEvent(journey, event);

    expect(updated.stats.totalIssuesCreated).toBe(1);
  });

  it('should increment comment count on cycle.created_comment', () => {
    const journey = createTestJourney('magic_moment');
    const event = createEvent({
      type: 'cycle.created_comment',
      userId: 'test',
      metadata: {},
    });

    const updated = applyEvent(journey, event);

    expect(updated.stats.totalCommentsCreated).toBe(1);
  });
});

// ============================================================================
// InvalidStateTransitionError
// ============================================================================

describe('InvalidStateTransitionError', () => {
  it('should include state, event, and userId in error', () => {
    const error = new InvalidStateTransitionError(
      'signed_up',
      'subscription.created',
      'user-123'
    );

    expect(error.name).toBe('InvalidStateTransitionError');
    expect(error.currentState).toBe('signed_up');
    expect(error.event).toBe('subscription.created');
    expect(error.userId).toBe('user-123');
    expect(error.message).toContain('signed_up');
    expect(error.message).toContain('subscription.created');
    expect(error.message).toContain('user-123');
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

function createTestJourney(state: UserJourneyState): UserJourney {
  const now = new Date();
  return {
    userId: 'test-user',
    state,
    stateEnteredAt: now,
    milestones: {},
    stats: {
      totalCycles: 0,
      totalPrsCreated: 0,
      totalIssuesCreated: 0,
      totalCommentsCreated: 0,
      lastActivityAt: now,
      streakDays: 0,
    },
  };
}
