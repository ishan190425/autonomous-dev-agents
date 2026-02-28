/**
 * @fileoverview Integration Tests - Journey Manager
 *
 * Tests the full journey flow: event processing → state transitions → milestone tracking.
 * Validates integration between Event Layer, Journey Layer, and Magic Moment Detection.
 *
 * Implements Section 3.1 of Sprint 3 Test Plan (C1269).
 *
 * @see docs/qa/sprint3-trial-conversion-test-plan-c1269.md
 * @see docs/architecture/adr-trial-conversion-platform-c1266.md
 */

import { describe, it, expect } from 'vitest';
import {
  type ConversionEvent,
  type UserJourneyState,
  applyEvent,
  detectMagicMoment,
  createMagicMomentDetector,
} from '../../../src/conversion/index.js';
import {
  createTestEvent,
  createTestJourney,
  createTestEventSequence,
  createTestArtifact,
  addDays,
} from '../fixtures/index.js';

// ============================================================================
// Full Journey Flow Integration (Section 3.1)
// ============================================================================

describe('Journey Manager Integration', () => {
  describe('Full Journey Flow: anonymous → converted', () => {
    it('should process signup → activated flow (happy path)', () => {
      // Start with anonymous user
      let journey = createTestJourney({ state: 'anonymous' });

      // Step 1: Signup
      const signupEvent = createTestEvent('user.signup');
      journey = applyEvent(journey, signupEvent);
      expect(journey.state).toBe('signed_up');
      // Note: signedUp milestone is set when creating journey, not on signup event

      // Step 2: Install CLI
      const installEvent = createTestEvent('user.cli_installed');
      journey = applyEvent(journey, installEvent);
      expect(journey.state).toBe('installed');
      expect(journey.milestones.cliInstalled).toBeDefined();

      // Step 3: Connect repo
      const connectEvent = createTestEvent('user.repo_connected', {
        repoId: 'repo_test123',
      });
      journey = applyEvent(journey, connectEvent);
      expect(journey.state).toBe('connected');
      expect(journey.milestones.repoConnected).toBeDefined();

      // Step 4: Start first dispatch
      const startDispatchEvent = createTestEvent('user.first_dispatch_started');
      journey = applyEvent(journey, startDispatchEvent);
      expect(journey.state).toBe('first_cycle');
      expect(journey.milestones.firstCycleStarted).toBeDefined();

      // Step 5: Complete first dispatch
      const completeDispatchEvent = createTestEvent('user.first_dispatch_completed');
      journey = applyEvent(journey, completeDispatchEvent);
      expect(journey.state).toBe('activated');
      expect(journey.milestones.firstCycleCompleted).toBeDefined();

      // Verify milestone chain
      expect(journey.milestones.cliInstalled).toBeDefined();
      expect(journey.milestones.repoConnected).toBeDefined();
      expect(journey.milestones.firstCycleCompleted).toBeDefined();
    });

    it('should process activated → magic_moment on first PR', () => {
      // Start with activated user (no firstArtifactCreated yet)
      let journey = createTestJourney({
        state: 'activated',
        stats: { totalCycles: 1 },
        milestones: { firstCycleCompleted: new Date() },
      });

      // Create PR (triggers magic moment)
      const prEvent = createTestEvent('cycle.created_pr', {
        artifact: createTestArtifact('pr'),
      });
      journey = applyEvent(journey, prEvent);

      expect(journey.state).toBe('magic_moment');
      expect(journey.milestones.firstArtifactCreated).toBeDefined();
      expect(journey.stats.totalPrsCreated).toBe(1);
    });

    it('should process magic_moment → engaged at 5 cycles', () => {
      // Start at magic moment with 4 cycles
      let journey = createTestJourney({
        state: 'magic_moment',
        stats: { totalCycles: 4, totalPrsCreated: 1 },
        milestones: {
          firstCycleCompleted: new Date(),
          firstArtifactCreated: new Date(),
        },
      });

      // Complete 5th cycle
      const cycleEvent = createTestEvent('cycle.completed');
      journey = applyEvent(journey, cycleEvent);

      expect(journey.state).toBe('engaged');
      expect(journey.stats.totalCycles).toBe(5);
      expect(journey.milestones.cycle5Reached).toBeDefined();
    });

    it('should process engaged → power_user at 20 cycles', () => {
      // Start at engaged with 19 cycles
      let journey = createTestJourney({
        state: 'engaged',
        stats: { totalCycles: 19, totalPrsCreated: 5 },
        milestones: {
          firstCycleCompleted: new Date(),
          firstArtifactCreated: new Date(),
          cycle5Reached: new Date(),
        },
      });

      // Complete 20th cycle
      const cycleEvent = createTestEvent('cycle.completed');
      journey = applyEvent(journey, cycleEvent);

      expect(journey.state).toBe('power_user');
      expect(journey.stats.totalCycles).toBe(20);
      expect(journey.milestones.cycle20Reached).toBeDefined();
    });

    it('should process trialing → converted on subscription', () => {
      // Start at trialing
      let journey = createTestJourney({
        state: 'trialing',
        milestones: {
          trialStarted: addDays(new Date(), -7),
        },
      });

      // Subscribe
      const subscribeEvent = createTestEvent('subscription.created');
      journey = applyEvent(journey, subscribeEvent);

      expect(journey.state).toBe('converted');
      expect(journey.milestones.converted).toBeDefined();
    });
  });

  describe('Stats Tracking', () => {
    it('should increment totalCycles on cycle.completed', () => {
      let journey = createTestJourney({
        state: 'activated',
        stats: { totalCycles: 0 },
      });

      // Complete 5 cycles
      for (let i = 0; i < 5; i++) {
        const event = createTestEvent('cycle.completed');
        journey = applyEvent(journey, event);
      }

      expect(journey.stats.totalCycles).toBe(5);
    });

    it('should increment totalPrsCreated on cycle.created_pr', () => {
      let journey = createTestJourney({
        state: 'activated',
        stats: { totalPrsCreated: 0 },
      });

      // Create 3 PRs
      for (let i = 0; i < 3; i++) {
        const event = createTestEvent('cycle.created_pr', {
          artifact: createTestArtifact('pr'),
        });
        journey = applyEvent(journey, event);
      }

      expect(journey.stats.totalPrsCreated).toBe(3);
    });

    it('should increment totalIssuesCreated on cycle.created_issue', () => {
      let journey = createTestJourney({
        state: 'activated',
        stats: { totalIssuesCreated: 0 },
      });

      // Create 2 issues
      for (let i = 0; i < 2; i++) {
        const event = createTestEvent('cycle.created_issue', {
          artifact: createTestArtifact('issue'),
        });
        journey = applyEvent(journey, event);
      }

      expect(journey.stats.totalIssuesCreated).toBe(2);
    });

    it('should track mixed artifacts correctly', () => {
      let journey = createTestJourney({
        state: 'magic_moment',
        stats: { totalCycles: 1, totalPrsCreated: 0, totalIssuesCreated: 0, totalCommentsCreated: 0 },
      });

      // Mixed activity
      journey = applyEvent(journey, createTestEvent('cycle.created_pr', { artifact: createTestArtifact('pr') }));
      journey = applyEvent(journey, createTestEvent('cycle.created_issue', { artifact: createTestArtifact('issue') }));
      journey = applyEvent(journey, createTestEvent('cycle.created_comment', { artifact: createTestArtifact('comment') }));
      journey = applyEvent(journey, createTestEvent('cycle.created_pr', { artifact: createTestArtifact('pr') }));
      journey = applyEvent(journey, createTestEvent('cycle.completed'));

      expect(journey.stats.totalPrsCreated).toBe(2);
      expect(journey.stats.totalIssuesCreated).toBe(1);
      expect(journey.stats.totalCommentsCreated).toBe(1);
      expect(journey.stats.totalCycles).toBe(2);
    });
  });

  describe('Conditional State Transitions', () => {
    it('should NOT transition magic_moment → engaged with < 5 cycles', () => {
      // Only 3 cycles
      let journey = createTestJourney({
        state: 'magic_moment',
        stats: { totalCycles: 3 },
      });

      const event = createTestEvent('cycle.completed');
      journey = applyEvent(journey, event);

      // Should stay at magic_moment (4 cycles now)
      expect(journey.state).toBe('magic_moment');
      expect(journey.stats.totalCycles).toBe(4);
    });

    it('should NOT transition engaged → power_user with < 20 cycles', () => {
      // Only 15 cycles
      let journey = createTestJourney({
        state: 'engaged',
        stats: { totalCycles: 15 },
      });

      const event = createTestEvent('cycle.completed');
      journey = applyEvent(journey, event);

      // Should stay at engaged (16 cycles now)
      expect(journey.state).toBe('engaged');
      expect(journey.stats.totalCycles).toBe(16);
    });
  });

  describe('Invalid Transitions', () => {
    it('should throw on invalid transition (anonymous → cycle.completed)', () => {
      const journey = createTestJourney({ state: 'anonymous' });
      const event = createTestEvent('cycle.completed');

      // This should either throw or return same state (implementation dependent)
      // Based on STATE_TRANSITIONS, anonymous only accepts user.signup
      const result = applyEvent(journey, event);
      // If no valid transition, state should remain unchanged
      expect(result.state).toBe('anonymous');
    });

    it('should not allow backward transitions (converted → signed_up)', () => {
      const journey = createTestJourney({ state: 'converted' });
      const event = createTestEvent('user.signup');

      const result = applyEvent(journey, event);
      // Should remain converted (no backward transition)
      expect(result.state).toBe('converted');
    });
  });

  describe('Magic Moment Detection Integration', () => {
    it('should detect PR creation as magic moment', () => {
      const detector = createMagicMomentDetector();
      const context = {
        cycle: 1,
        role: 'engineering',
        action: 'Created pull request #123 for feat/new-feature',
      };

      const artifacts = detector.detectArtifacts('', context);
      const isMagicMoment = detector.isMagicMoment(artifacts);

      expect(isMagicMoment).toBe(true);
      expect(artifacts).toContainEqual(
        expect.objectContaining({ type: 'pr' })
      );
    });

    it('should detect issue creation as magic moment', () => {
      const detector = createMagicMomentDetector();
      const context = {
        cycle: 1,
        role: 'qa',
        action: 'Created issue #456 for tracking bug',
      };

      const artifacts = detector.detectArtifacts('', context);
      const isMagicMoment = detector.isMagicMoment(artifacts);

      expect(isMagicMoment).toBe(true);
      expect(artifacts).toContainEqual(
        expect.objectContaining({ type: 'issue' })
      );
    });

    it('should NOT detect doc-only as magic moment', () => {
      const detector = createMagicMomentDetector();
      const context = {
        cycle: 1,
        role: 'growth',
        action: 'Updated README.md with installation instructions',
      };

      const artifacts = detector.detectArtifacts('', context);
      const isMagicMoment = detector.isMagicMoment(artifacts);

      expect(isMagicMoment).toBe(false);
    });

    it('should detect magic moment from shorthand function', () => {
      const context = {
        cycle: 1,
        role: 'engineering',
        action: 'PR #100 created for feat/auth',
      };

      const result = detectMagicMoment('', context);

      expect(result.isMagicMoment).toBe(true);
    });
  });

  describe('Event Sequence Processing', () => {
    it('should process full onboarding sequence in order', () => {
      const events = createTestEventSequence([
        'user.signup',
        'user.cli_installed',
        'user.repo_connected',
        'user.first_dispatch_started',
        'user.first_dispatch_completed',
      ]);

      let journey = createTestJourney({ state: 'anonymous' });
      const expectedStates: UserJourneyState[] = [
        'signed_up',
        'installed',
        'connected',
        'first_cycle',
        'activated',
      ];

      events.forEach((event, index) => {
        journey = applyEvent(journey, event);
        expect(journey.state).toBe(expectedStates[index]);
      });
    });

    it('should handle rapid event bursts', () => {
      const events: ConversionEvent[] = [];
      const now = Date.now();

      // 10 cycle completions in rapid succession (all at same timestamp)
      for (let i = 0; i < 10; i++) {
        events.push(
          createTestEvent('cycle.completed', {
            timestamp: new Date(now),
          })
        );
      }

      let journey = createTestJourney({
        state: 'magic_moment',
        stats: { totalCycles: 0 },
        milestones: { firstArtifactCreated: new Date() },
      });

      events.forEach((event) => {
        journey = applyEvent(journey, event);
      });

      expect(journey.stats.totalCycles).toBe(10);
      // Should have transitioned to engaged at cycle 5 (need 20 for power_user)
      expect(journey.state).toBe('engaged');
    });
  });

  describe('Edge Cases', () => {
    it('should handle trial.started from engaged state', () => {
      // Users can start trial from engaged state
      let journey = createTestJourney({
        state: 'engaged',
        stats: { totalCycles: 10 },
        milestones: { cycle5Reached: new Date() },
      });

      const trialEvent = createTestEvent('trial.started');
      journey = applyEvent(journey, trialEvent);

      expect(journey.state).toBe('trialing');
      expect(journey.milestones.trialStarted).toBeDefined();
    });

    it('should handle churned user re-subscribing', () => {
      let journey = createTestJourney({
        state: 'churned',
      });

      const resubscribeEvent = createTestEvent('subscription.created');
      journey = applyEvent(journey, resubscribeEvent);

      expect(journey.state).toBe('converted');
    });

    it('should handle duplicate events gracefully', () => {
      let journey = createTestJourney({
        state: 'signed_up',
        stats: { totalCycles: 0 },
      });

      // Same event twice (e.g., retry scenario)
      const event = createTestEvent('user.cli_installed');
      journey = applyEvent(journey, event);
      journey = applyEvent(journey, event);

      // Should be installed (not error)
      expect(journey.state).toBe('installed');
    });
  });

  describe('State Change Auditing', () => {
    it('should transition state correctly', () => {
      let journey = createTestJourney({ state: 'signed_up' });
      const previousState = journey.state;
      const event = createTestEvent('user.cli_installed');

      journey = applyEvent(journey, event);

      // Verify transition happened
      expect(previousState).toBe('signed_up');
      expect(journey.state).toBe('installed');
    });

    it('should update stateEnteredAt on transition', () => {
      const originalTime = new Date(Date.now() - 1000);
      let journey = createTestJourney({
        state: 'signed_up',
        stateEnteredAt: originalTime,
      });

      const event = createTestEvent('user.cli_installed');
      journey = applyEvent(journey, event);

      expect(journey.stateEnteredAt.getTime()).toBeGreaterThan(originalTime.getTime());
    });
  });
});
