# Sprint 3 Trial Conversion — QA Test Plan (C1269)

> Created: C1269 (Feb 28, 2026)
> Author: 🔍 QA Lead
> Sprint: 3 (Mar 1-14)
> Synthesizes: C1266 (ADR), C1267 (Acceptance Criteria)

---

## Executive Summary

This test plan translates C1267's acceptance criteria into executable test suites. Organized by implementation day, it provides QA validation points that Engineering can verify as they build.

**Test Coverage Target:** ≥85% for new trial conversion code
**E2E Scenario Target:** 15 new Playwright tests covering conversion flows

---

## 1. Test Suite Structure

```
packages/core/tests/conversion/
├── unit/
│   ├── events.test.ts           # AC-1.1.x Event type tests
│   ├── journey-state.test.ts    # AC-2.1.x State machine tests
│   ├── milestone-tracker.test.ts # AC-3.x Milestone tests
│   ├── prompt-engine.test.ts    # AC-4.x Prompt system tests
│   └── artifact-detector.test.ts # AC-5.x Magic moment tests
├── integration/
│   ├── journey-manager.test.ts  # Full journey flow tests
│   ├── event-emission.test.ts   # Event → Journey integration
│   └── prompt-display.test.ts   # CLI prompt integration
└── e2e/
    ├── signup-to-magic-moment.spec.ts
    ├── engaged-to-converted.spec.ts
    └── edge-cases.spec.ts
```

---

## 2. Unit Test Specifications

### 2.1 Event Layer Tests (Day 1)

**File:** `packages/core/tests/conversion/unit/events.test.ts`

```typescript
describe('ConversionEvent Types', () => {
  describe('Type Definitions', () => {
    it('should export all 17 event types', () => {
      // Verify ConversionEventType union includes all types
      const allTypes: ConversionEventType[] = [
        'user.signup',
        'user.cli_installed',
        'user.repo_connected',
        'user.first_dispatch_started',
        'user.first_dispatch_completed',
        'cycle.started',
        'cycle.completed',
        'cycle.created_pr',
        'cycle.created_issue',
        'cycle.created_comment',
        'trial.started',
        'trial.ending',
        'trial.expired',
        'subscription.created',
        'subscription.cancelled',
        'prompt.shown',
        'prompt.clicked',
      ];
      // All should be valid
    });

    it('should have required fields on ConversionEvent', () => {
      const event: ConversionEvent = {
        id: 'evt_test123',
        type: 'user.signup',
        userId: 'usr_abc',
        timestamp: new Date(),
        metadata: {},
      };
      expect(event).toBeDefined();
    });

    it('should allow optional repoId and artifact', () => {
      const event: ConversionEvent = {
        id: 'evt_test456',
        type: 'cycle.completed',
        userId: 'usr_abc',
        repoId: 'repo_xyz',
        timestamp: new Date(),
        metadata: { cycleNumber: 5 },
        artifact: { type: 'pr', id: '123', url: 'https://github.com/...' },
      };
      expect(event.repoId).toBe('repo_xyz');
      expect(event.artifact?.type).toBe('pr');
    });
  });

  describe('EventEmitter Interface', () => {
    it('should emit single events', async () => {
      const emitter = new TestEventEmitter();
      const event = createTestEvent('user.signup');
      await emitter.emit(event);
      expect(emitter.emittedCount).toBe(1);
    });

    it('should emit batch events', async () => {
      const emitter = new TestEventEmitter();
      const events = [
        createTestEvent('cycle.started'),
        createTestEvent('cycle.completed'),
        createTestEvent('cycle.created_pr'),
      ];
      await emitter.emitBatch(events);
      expect(emitter.emittedCount).toBe(3);
    });

    it('should queue events when offline', async () => {
      const emitter = new TestEventEmitter({ offline: true });
      const event = createTestEvent('user.signup');
      await emitter.emit(event);
      expect(emitter.queuedCount).toBe(1);
      expect(emitter.emittedCount).toBe(0);
    });
  });
});
```

**Pass Criteria:** All 17 event types compile, emit/emitBatch work, offline queueing functions.

---

### 2.2 Journey State Machine Tests (Day 1-2)

**File:** `packages/core/tests/conversion/unit/journey-state.test.ts`

```typescript
describe('JourneyStateMachine', () => {
  describe('State Definitions', () => {
    it('should define all 12 journey states', () => {
      const allStates: UserJourneyState[] = [
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
      expect(allStates.length).toBe(12);
    });
  });

  describe('Valid Transitions', () => {
    const testCases: [
      UserJourneyState,
      ConversionEventType,
      UserJourneyState,
    ][] = [
      ['anonymous', 'user.signup', 'signed_up'],
      ['signed_up', 'user.cli_installed', 'installed'],
      ['installed', 'user.repo_connected', 'connected'],
      ['connected', 'user.first_dispatch_started', 'first_cycle'],
      ['first_cycle', 'user.first_dispatch_completed', 'activated'],
      ['activated', 'cycle.created_pr', 'magic_moment'],
      ['magic_moment', 'cycle.completed', 'engaged'], // 5th cycle
      ['engaged', 'cycle.completed', 'power_user'], // 20th cycle
      ['trialing', 'subscription.created', 'converted'],
      ['converted', 'subscription.cancelled', 'churned'],
    ];

    test.each(testCases)(
      'transition %s → %s via %s',
      async (fromState, eventType, toState) => {
        const machine = new JourneyStateMachine();
        const journey = createTestJourney({ state: fromState });
        const event = createTestEvent(eventType);

        const newState = await machine.transition(journey, event);
        expect(newState).toBe(toState);
      }
    );
  });

  describe('Invalid Transitions', () => {
    it('should throw InvalidStateTransitionError for invalid transitions', () => {
      const machine = new JourneyStateMachine();
      const journey = createTestJourney({ state: 'anonymous' });
      const event = createTestEvent('cycle.completed'); // Can't complete cycle before signup

      expect(() => machine.transition(journey, event)).toThrow(
        InvalidStateTransitionError
      );
    });

    it('should not allow backward transitions (except churn recovery)', () => {
      const machine = new JourneyStateMachine();
      const journey = createTestJourney({ state: 'converted' });
      const event = createTestEvent('user.signup'); // Already converted

      expect(() => machine.transition(journey, event)).toThrow(
        InvalidStateTransitionError
      );
    });
  });

  describe('Conditional Transitions', () => {
    it('magic_moment → engaged requires totalCycles >= 5', async () => {
      const machine = new JourneyStateMachine();

      // 3 cycles: should NOT transition
      const journey3 = createTestJourney({
        state: 'magic_moment',
        stats: { totalCycles: 3 },
      });
      const event = createTestEvent('cycle.completed');
      expect(await machine.transition(journey3, event)).toBe('magic_moment');

      // 5 cycles: SHOULD transition
      const journey5 = createTestJourney({
        state: 'magic_moment',
        stats: { totalCycles: 5 },
      });
      expect(await machine.transition(journey5, event)).toBe('engaged');
    });

    it('engaged → power_user requires totalCycles >= 20', async () => {
      const machine = new JourneyStateMachine();

      // 15 cycles: should NOT transition
      const journey15 = createTestJourney({
        state: 'engaged',
        stats: { totalCycles: 15 },
      });
      const event = createTestEvent('cycle.completed');
      expect(await machine.transition(journey15, event)).toBe('engaged');

      // 20 cycles: SHOULD transition
      const journey20 = createTestJourney({
        state: 'engaged',
        stats: { totalCycles: 20 },
      });
      expect(await machine.transition(journey20, event)).toBe('power_user');
    });
  });

  describe('State Change Logging', () => {
    it('should record state changes with timestamp', async () => {
      const machine = new JourneyStateMachine();
      const journey = createTestJourney({ state: 'anonymous' });
      const event = createTestEvent('user.signup');

      const result = await machine.transitionWithLog(journey, event);

      expect(result.previousState).toBe('anonymous');
      expect(result.newState).toBe('signed_up');
      expect(result.transitionedAt).toBeInstanceOf(Date);
      expect(result.triggeredBy).toBe(event.id);
    });
  });
});
```

**Pass Criteria:** All 12 states defined, valid transitions work, invalid throw, conditional logic validated.

---

### 2.3 Artifact Detector Tests (Day 1-2)

**File:** `packages/core/tests/conversion/unit/artifact-detector.test.ts`

```typescript
describe('ArtifactDetector', () => {
  const detector = new ArtifactDetector();

  describe('PR Detection', () => {
    const prPatterns = [
      'Created pull request #123',
      'PR #45 created',
      'Pull request created: #67',
      'github.com/user/repo/pull/89',
      'https://github.com/ada-ai/core/pull/101',
      'Opened PR #102 for feat/new-feature',
    ];

    test.each(prPatterns)('should detect PR in: "%s"', text => {
      const artifacts = detector.detect(text);
      expect(artifacts).toContainEqual(expect.objectContaining({ type: 'pr' }));
    });
  });

  describe('Issue Detection', () => {
    const issuePatterns = [
      'Created issue #89',
      'Issue #101 created',
      'Filed issue: #102',
      'github.com/user/repo/issues/103',
      'https://github.com/ada-ai/core/issues/104',
      'Opened issue #105 for bug tracking',
    ];

    test.each(issuePatterns)('should detect issue in: "%s"', text => {
      const artifacts = detector.detect(text);
      expect(artifacts).toContainEqual(
        expect.objectContaining({ type: 'issue' })
      );
    });
  });

  describe('Comment Detection', () => {
    const commentPatterns = [
      'Commented on #103',
      'Added comment to issue #104',
      'Left feedback on PR #105',
      'Reviewed #106 with comments',
    ];

    test.each(commentPatterns)('should detect comment in: "%s"', text => {
      const artifacts = detector.detect(text);
      expect(artifacts).toContainEqual(
        expect.objectContaining({ type: 'comment' })
      );
    });
  });

  describe('Doc Detection', () => {
    const docPatterns = [
      'Updated README.md',
      'Modified CHANGELOG.md',
      'Created docs/new-guide.md',
    ];

    test.each(docPatterns)('should detect doc in: "%s"', text => {
      const artifacts = detector.detect(text);
      expect(artifacts).toContainEqual(
        expect.objectContaining({ type: 'doc' })
      );
    });
  });

  describe('Magic Moment Flag', () => {
    it('should return true for PR artifacts', () => {
      const artifacts = [{ type: 'pr', id: '123' }];
      expect(detector.isMagicMoment(artifacts)).toBe(true);
    });

    it('should return true for issue artifacts', () => {
      const artifacts = [{ type: 'issue', id: '456' }];
      expect(detector.isMagicMoment(artifacts)).toBe(true);
    });

    it('should return true for comment artifacts', () => {
      const artifacts = [{ type: 'comment', id: '789' }];
      expect(detector.isMagicMoment(artifacts)).toBe(true);
    });

    it('should return false for doc-only artifacts', () => {
      const artifacts = [{ type: 'doc', id: 'README.md' }];
      expect(detector.isMagicMoment(artifacts)).toBe(false);
    });

    it('should return true if ANY artifact is magic moment type', () => {
      const artifacts = [
        { type: 'doc', id: 'README.md' },
        { type: 'pr', id: '123' },
      ];
      expect(detector.isMagicMoment(artifacts)).toBe(true);
    });
  });

  describe('Multiple Artifact Extraction', () => {
    it('should extract multiple artifacts from one text', () => {
      const text =
        'Created PR #100 which closes issue #50 and updates README.md';
      const artifacts = detector.detect(text);

      expect(artifacts.length).toBe(3);
      expect(artifacts.map(a => a.type).sort()).toEqual(['doc', 'issue', 'pr']);
    });

    it('should handle no artifacts gracefully', () => {
      const text = 'Ran type checking and linting';
      const artifacts = detector.detect(text);

      expect(artifacts).toEqual([]);
    });
  });
});
```

**Pass Criteria:** All patterns detected correctly, magic moment flag accurate.

---

### 2.4 Milestone Tracker Tests (Day 3)

**File:** `packages/core/tests/conversion/unit/milestone-tracker.test.ts`

```typescript
describe('MilestoneTracker', () => {
  describe('Default Milestones', () => {
    it('should have 5 default milestones', () => {
      const tracker = new MilestoneTracker();
      const milestones = tracker.getAll();

      expect(milestones.length).toBe(5);
      expect(milestones.map(m => m.id)).toEqual([
        'first_dispatch',
        'magic_moment',
        'five_cycles',
        'pr_merged',
        'twenty_cycles',
      ]);
    });

    it('each milestone should have required fields', () => {
      const tracker = new MilestoneTracker();
      const milestones = tracker.getAll();

      milestones.forEach(m => {
        expect(m).toHaveProperty('id');
        expect(m).toHaveProperty('name');
        expect(m).toHaveProperty('description');
        expect(m).toHaveProperty('requirement');
        expect(m).toHaveProperty('reward');
        expect(m).toHaveProperty('order');
      });
    });
  });

  describe('Milestone Checking', () => {
    it('should complete first_dispatch when activated', async () => {
      const tracker = new MilestoneTracker();
      const journey = createTestJourney({ state: 'activated' });

      const result = await tracker.checkMilestones(journey);

      expect(result.completed).toContain('first_dispatch');
    });

    it('should complete magic_moment on first artifact', async () => {
      const tracker = new MilestoneTracker();
      const journey = createTestJourney({
        state: 'magic_moment',
        stats: { totalPrsCreated: 1 },
      });

      const result = await tracker.checkMilestones(journey);

      expect(result.completed).toContain('first_dispatch');
      expect(result.completed).toContain('magic_moment');
    });

    it('should complete five_cycles at 5 total cycles', async () => {
      const tracker = new MilestoneTracker();
      const journey = createTestJourney({
        state: 'engaged',
        stats: { totalCycles: 6 },
      });

      const result = await tracker.checkMilestones(journey);

      expect(result.completed).toContain('five_cycles');
    });

    it('should complete twenty_cycles at 20 total cycles', async () => {
      const tracker = new MilestoneTracker();
      const journey = createTestJourney({
        state: 'power_user',
        stats: { totalCycles: 22 },
      });

      const result = await tracker.checkMilestones(journey);

      expect(result.completed).toContain('twenty_cycles');
    });
  });

  describe('Trial Day Calculation', () => {
    it('base trial is 7 days', () => {
      const tracker = new MilestoneTracker();
      const journey = createTestJourney({ state: 'signed_up' });

      const result = tracker.calculateTrialDays(journey);

      expect(result.baseDays).toBe(7);
      expect(result.bonusDays).toBe(0);
      expect(result.totalDays).toBe(7);
    });

    it('first_dispatch adds 7 days', async () => {
      const tracker = new MilestoneTracker();
      const journey = createTestJourney({
        state: 'activated',
        milestones: { firstDispatchAt: new Date() },
      });

      const result = tracker.calculateTrialDays(journey);

      expect(result.bonusDays).toBe(7);
      expect(result.totalDays).toBe(14);
    });

    it('magic_moment adds 7 more days', () => {
      const tracker = new MilestoneTracker();
      const journey = createTestJourney({
        state: 'magic_moment',
        milestones: {
          firstDispatchAt: new Date(),
          magicMomentAt: new Date(),
        },
      });

      const result = tracker.calculateTrialDays(journey);

      expect(result.bonusDays).toBe(14); // 7 + 7
      expect(result.totalDays).toBe(21);
    });

    it('five_cycles adds 7 more days', () => {
      const tracker = new MilestoneTracker();
      const journey = createTestJourney({
        state: 'engaged',
        milestones: {
          firstDispatchAt: new Date(),
          magicMomentAt: new Date(),
          fiveCyclesAt: new Date(),
        },
      });

      const result = tracker.calculateTrialDays(journey);

      expect(result.bonusDays).toBe(21); // 7 + 7 + 7
      expect(result.totalDays).toBe(28);
    });

    it('pr_merged adds 14 days', () => {
      const tracker = new MilestoneTracker();
      const journey = createTestJourney({
        state: 'engaged',
        milestones: {
          firstDispatchAt: new Date(),
          magicMomentAt: new Date(),
          fiveCyclesAt: new Date(),
          prMergedAt: new Date(),
        },
      });

      const result = tracker.calculateTrialDays(journey);

      expect(result.bonusDays).toBe(35); // 7 + 7 + 7 + 14
      expect(result.totalDays).toBe(42);
    });

    it('maximum trial is 42 days', () => {
      const tracker = new MilestoneTracker();
      const journey = createTestJourney({
        state: 'power_user',
        milestones: {
          firstDispatchAt: new Date(),
          magicMomentAt: new Date(),
          fiveCyclesAt: new Date(),
          prMergedAt: new Date(),
          twentyCyclesAt: new Date(),
        },
      });

      const result = tracker.calculateTrialDays(journey);

      // twenty_cycles unlocks feature, not more days
      expect(result.totalDays).toBe(42);
    });
  });

  describe('Feature Unlock Rewards', () => {
    it('twenty_cycles unlocks advanced_analytics', async () => {
      const tracker = new MilestoneTracker();
      const journey = createTestJourney({
        state: 'power_user',
        stats: { totalCycles: 22 },
      });

      const result = await tracker.checkMilestones(journey);

      expect(result.unlockedFeatures).toContain('advanced_analytics');
    });
  });
});
```

**Pass Criteria:** All milestone checks work, trial days calculated correctly, max 42 days enforced.

---

### 2.5 Prompt Engine Tests (Day 4-5)

**File:** `packages/core/tests/conversion/unit/prompt-engine.test.ts`

```typescript
describe('PromptEngine', () => {
  describe('Content Interpolation', () => {
    it('should replace {{cycles}} placeholder', () => {
      const engine = new PromptEngine();
      const content = { headline: 'You ran {{cycles}} cycles!' };
      const journey = createTestJourney({ stats: { totalCycles: 47 } });

      const result = engine.interpolate(content, journey);

      expect(result.headline).toBe('You ran 47 cycles!');
    });

    it('should replace {{prs}} placeholder', () => {
      const engine = new PromptEngine();
      const content = { body: 'Created {{prs}} PRs.' };
      const journey = createTestJourney({ stats: { totalPrsCreated: 3 } });

      const result = engine.interpolate(content, journey);

      expect(result.body).toBe('Created 3 PRs.');
    });

    it('should replace {{issues}} placeholder', () => {
      const engine = new PromptEngine();
      const content = { body: 'Filed {{issues}} issues.' };
      const journey = createTestJourney({ stats: { totalIssuesCreated: 12 } });

      const result = engine.interpolate(content, journey);

      expect(result.body).toBe('Filed 12 issues.');
    });

    it('should replace {{daysActive}} placeholder', () => {
      const engine = new PromptEngine();
      const content = { body: 'Active for {{daysActive}} days!' };
      const journey = createTestJourney({ stats: { streakDays: 5 } });

      const result = engine.interpolate(content, journey);

      expect(result.body).toBe('Active for 5 days!');
    });

    it('should handle multiple placeholders', () => {
      const engine = new PromptEngine();
      const content = {
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
  });

  describe('Trigger Evaluation', () => {
    it('stat_threshold trigger fires at threshold', () => {
      const engine = new PromptEngine();
      const trigger = {
        type: 'stat_threshold',
        stat: 'totalCycles',
        threshold: 10,
      };
      const journey = createTestJourney({ stats: { totalCycles: 10 } });

      expect(engine.shouldTrigger(trigger, journey)).toBe(true);
    });

    it('stat_threshold trigger does not fire below threshold', () => {
      const engine = new PromptEngine();
      const trigger = {
        type: 'stat_threshold',
        stat: 'totalCycles',
        threshold: 10,
      };
      const journey = createTestJourney({ stats: { totalCycles: 9 } });

      expect(engine.shouldTrigger(trigger, journey)).toBe(false);
    });

    it('event trigger fires on matching event', () => {
      const engine = new PromptEngine();
      const trigger = { type: 'event', eventType: 'cycle.created_pr' };
      const event = createTestEvent('cycle.created_pr');

      expect(engine.shouldTriggerOnEvent(trigger, event)).toBe(true);
    });

    it('milestone_complete trigger fires after milestone', () => {
      const engine = new PromptEngine();
      const trigger = {
        type: 'milestone_complete',
        milestoneId: 'five_cycles',
      };
      const journey = createTestJourney({
        milestones: { fiveCyclesAt: new Date() },
      });

      expect(engine.shouldTrigger(trigger, journey)).toBe(true);
    });

    it('trial_ending trigger fires at N days remaining', () => {
      const engine = new PromptEngine();
      const trigger = { type: 'trial_ending', daysRemaining: 3 };
      const journey = createTestJourney({
        trialEndsAt: addDays(new Date(), 2), // 2 days remaining
      });

      expect(engine.shouldTrigger(trigger, journey)).toBe(true);
    });
  });

  describe('Cooldown Enforcement', () => {
    it('should not show prompt within cooldown period', () => {
      const engine = new PromptEngine();
      const prompt = { id: 'power_user', cooldownMs: 24 * 60 * 60 * 1000 }; // 24h
      const promptHistory = {
        promptId: 'power_user',
        lastShownAt: new Date(), // Just shown
        showCount: 1,
      };

      expect(engine.canShow(prompt, promptHistory)).toBe(false);
    });

    it('should show prompt after cooldown expires', () => {
      const engine = new PromptEngine();
      const prompt = { id: 'power_user', cooldownMs: 24 * 60 * 60 * 1000 };
      const promptHistory = {
        promptId: 'power_user',
        lastShownAt: addDays(new Date(), -2), // 2 days ago
        showCount: 1,
      };

      expect(engine.canShow(prompt, promptHistory)).toBe(true);
    });
  });

  describe('Max Shows Enforcement', () => {
    it('should not show prompt exceeding maxShows', () => {
      const engine = new PromptEngine();
      const prompt = { id: 'trial_ending', maxShows: 3 };
      const promptHistory = {
        promptId: 'trial_ending',
        showCount: 3, // Already at max
      };

      expect(engine.canShow(prompt, promptHistory)).toBe(false);
    });

    it('should show prompt below maxShows', () => {
      const engine = new PromptEngine();
      const prompt = { id: 'trial_ending', maxShows: 3 };
      const promptHistory = {
        promptId: 'trial_ending',
        showCount: 2,
      };

      expect(engine.canShow(prompt, promptHistory)).toBe(true);
    });
  });

  describe('Priority Ordering', () => {
    it('should return higher priority prompts first', () => {
      const engine = new PromptEngine();
      const prompts = [
        { id: 'time_based', priority: 50, trigger: { type: 'trial_ending' } },
        {
          id: 'value_based',
          priority: 75,
          trigger: { type: 'stat_threshold' },
        },
        {
          id: 'milestone',
          priority: 80,
          trigger: { type: 'milestone_complete' },
        },
      ];
      const journey = createTestJourney({ stats: { totalCycles: 20 } });

      const eligible = engine.getEligiblePrompts(prompts, journey);

      expect(eligible[0].id).toBe('milestone');
      expect(eligible[1].id).toBe('value_based');
      expect(eligible[2].id).toBe('time_based');
    });

    it('value prompts (≥75) always beat time prompts (50)', () => {
      const engine = new PromptEngine();
      const valuePrompt = { id: 'value', priority: 75 };
      const timePrompt = { id: 'time', priority: 50 };

      const winner = engine.pickWinner([valuePrompt, timePrompt]);

      expect(winner.id).toBe('value');
    });
  });
});
```

**Pass Criteria:** Interpolation works, all trigger types fire correctly, cooldown/maxShows enforced, priority ordering correct.

---

## 3. Integration Test Specifications

### 3.1 Journey Manager Integration (Day 2-3)

**File:** `packages/core/tests/conversion/integration/journey-manager.test.ts`

```typescript
describe('JourneyManager Integration', () => {
  describe('Full Journey Flow', () => {
    it('should process signup → activated flow', async () => {
      const manager = new JourneyManager();

      // Step 1: Signup
      let journey = await manager.processEvent({
        type: 'user.signup',
        userId: 'test-user',
        timestamp: new Date(),
        metadata: {},
      });
      expect(journey.state).toBe('signed_up');

      // Step 2: Install CLI
      journey = await manager.processEvent({
        type: 'user.cli_installed',
        userId: 'test-user',
        timestamp: new Date(),
        metadata: {},
      });
      expect(journey.state).toBe('installed');

      // Step 3: Connect repo
      journey = await manager.processEvent({
        type: 'user.repo_connected',
        userId: 'test-user',
        timestamp: new Date(),
        metadata: {},
      });
      expect(journey.state).toBe('connected');

      // Step 4: Start first dispatch
      journey = await manager.processEvent({
        type: 'user.first_dispatch_started',
        userId: 'test-user',
        timestamp: new Date(),
        metadata: {},
      });
      expect(journey.state).toBe('first_cycle');

      // Step 5: Complete first dispatch
      journey = await manager.processEvent({
        type: 'user.first_dispatch_completed',
        userId: 'test-user',
        timestamp: new Date(),
        metadata: {},
      });
      expect(journey.state).toBe('activated');

      // Verify milestones
      expect(journey.milestones.signedUpAt).toBeDefined();
      expect(journey.milestones.installedAt).toBeDefined();
      expect(journey.milestones.connectedAt).toBeDefined();
      expect(journey.milestones.firstDispatchAt).toBeDefined();
    });

    it('should track stats correctly', async () => {
      const manager = new JourneyManager();
      const userId = 'test-user-stats';

      // Setup: Get to activated
      await setupActivatedJourney(manager, userId);

      // Run 5 cycles with artifacts
      for (let i = 0; i < 5; i++) {
        await manager.processEvent({
          type: 'cycle.completed',
          userId,
          timestamp: new Date(),
          metadata: { cycleNumber: i + 1 },
          artifact: i % 2 === 0 ? { type: 'pr', id: `${i}` } : undefined,
        });
      }

      const journey = await manager.getJourney(userId);
      expect(journey.stats.totalCycles).toBe(5);
      expect(journey.stats.totalPrsCreated).toBe(3); // Cycles 0, 2, 4
    });
  });
});
```

---

## 4. E2E Test Specifications (Playwright)

### 4.1 Signup to Magic Moment Flow

**File:** `tests/e2e/conversion/signup-to-magic-moment.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Signup to Magic Moment', () => {
  test('new user reaches magic moment on first PR', async ({ page }) => {
    // 1. Signup
    await page.goto('/signup');
    await page.fill('[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    await expect(page.locator('.welcome-message')).toBeVisible();

    // 2. Install CLI (simulated)
    await page.goto('/getting-started');
    await page.click('[data-testid="cli-installed-confirmation"]');

    // 3. Connect repo
    await page.goto('/connect');
    await page.fill('[name="repoUrl"]', 'https://github.com/test/repo');
    await page.click('button[type="submit"]');
    await expect(page.locator('.repo-connected')).toBeVisible();

    // 4. Run first dispatch (API call)
    const response = await page.request.post('/api/dispatch/start', {
      data: { repoId: 'test-repo-id' },
    });
    expect(response.ok()).toBe(true);

    // 5. Complete dispatch with PR artifact
    const completeResponse = await page.request.post('/api/dispatch/complete', {
      data: {
        action: 'Created PR #1',
        artifact: { type: 'pr', id: '1' },
      },
    });
    expect(completeResponse.ok()).toBe(true);

    // 6. Verify magic moment reached
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="journey-state"]')).toHaveText(
      'magic_moment'
    );
    await expect(
      page.locator('[data-testid="milestone-magic-moment"]')
    ).toHaveClass(/completed/);
  });
});
```

### 4.2 Trial Extension Flow

**File:** `tests/e2e/conversion/trial-extension.spec.ts`

```typescript
test.describe('Trial Extension', () => {
  test('completing milestones extends trial', async ({ page }) => {
    // Setup: Authenticated user
    await authenticateTestUser(page);

    // Initial trial: 7 days
    await page.goto('/settings/billing');
    await expect(page.locator('[data-testid="trial-days"]')).toHaveText(
      '7 days'
    );

    // Complete first_dispatch → +7 days
    await completeFirstDispatch(page);
    await page.reload();
    await expect(page.locator('[data-testid="trial-days"]')).toHaveText(
      '14 days'
    );

    // Complete magic_moment → +7 days
    await createPR(page);
    await page.reload();
    await expect(page.locator('[data-testid="trial-days"]')).toHaveText(
      '21 days'
    );

    // Complete five_cycles → +7 days
    await completeCycles(page, 5);
    await page.reload();
    await expect(page.locator('[data-testid="trial-days"]')).toHaveText(
      '28 days'
    );

    // Max trial reached message
    await page.goto('/settings/billing');
    await expect(
      page.locator('[data-testid="trial-max-message"]')
    ).toBeVisible();
  });
});
```

---

## 5. Test Data Requirements

### 5.1 Test User Seeds

```typescript
// fixtures/test-users.ts
export const testUsers = {
  anonymous: {
    id: 'test-anonymous',
    state: 'anonymous',
    stats: { totalCycles: 0 },
  },
  activated: {
    id: 'test-activated',
    state: 'activated',
    stats: { totalCycles: 1 },
    milestones: { firstDispatchAt: new Date() },
  },
  engaged: {
    id: 'test-engaged',
    state: 'engaged',
    stats: { totalCycles: 8, totalPrsCreated: 2 },
    milestones: {
      firstDispatchAt: new Date(),
      magicMomentAt: new Date(),
      fiveCyclesAt: new Date(),
    },
  },
  powerUser: {
    id: 'test-power-user',
    state: 'power_user',
    stats: { totalCycles: 25, totalPrsCreated: 8 },
  },
};
```

### 5.2 Mock Event Factory

```typescript
// fixtures/event-factory.ts
export function createTestEvent(type: ConversionEventType): ConversionEvent {
  return {
    id: `evt_${randomId()}`,
    type,
    userId: 'test-user',
    timestamp: new Date(),
    metadata: {},
  };
}

export function createTestJourney(
  overrides: Partial<UserJourney> = {}
): UserJourney {
  return {
    userId: 'test-user',
    state: 'anonymous',
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
    ...overrides,
  };
}
```

---

## 6. Pre-Sprint Checklist (QA T-0)

### Environment Setup

- [ ] Test database provisioned (staging)
- [ ] Test user accounts created
- [ ] CI test workflow updated for conversion tests
- [ ] Playwright dependencies installed
- [ ] Coverage thresholds configured for conversion/

### Test Infrastructure

- [ ] Unit test file structure created (empty scaffolds)
- [ ] Integration test file structure created
- [ ] E2E test file structure created
- [ ] Test fixtures directory created
- [ ] Mock factories implemented

### Day 1 Readiness

- [ ] AC-1.1.x test cases written (event types)
- [ ] AC-2.1.1 test cases written (journey states)
- [ ] AC-5.1.1 test cases written (artifact detection)
- [ ] Test data seeds prepared

---

## 7. Day-by-Day QA Validation Schedule

| Day | Engineering Delivers            | QA Validates                                       |
| --- | ------------------------------- | -------------------------------------------------- |
| 1   | Event types, Journey states     | Run unit tests 2.1, 2.2, 2.3. Coverage ≥85%.       |
| 2   | Event emission, State machine   | Run integration tests 3.1. Artifact detection E2E. |
| 3   | Milestone tracker               | Run unit tests 2.4. Trial day calculation.         |
| 4   | Prompt triggers, interpolation  | Run unit tests 2.5 (triggers).                     |
| 5   | Cooldown, priority, CLI display | Run unit tests 2.5 (enforcement). CLI E2E.         |
| 6-7 | Database migrations             | Run migration tests. Query performance <10ms.      |
| 8-9 | Full integration                | Run all E2E flows. Edge case testing.              |
| 10  | Metrics dashboards              | Verify metrics tracking. Final sign-off.           |

---

## 8. Success Metrics for QA

| Metric                  | Target | Validation Method                   |
| ----------------------- | ------ | ----------------------------------- |
| Unit test coverage      | ≥85%   | `npm run test:coverage`             |
| New unit tests          | ≥60    | Count in conversion/unit/           |
| New integration tests   | ≥15    | Count in conversion/integration/    |
| New E2E tests           | ≥10    | Count in conversion/e2e/            |
| All acceptance criteria | 100%   | Checklist verification              |
| Flaky test rate         | 0%     | No intermittent failures in 10 runs |

---

## References

- C1267: Sprint 3 Trial Conversion Acceptance Criteria (Product)
- C1266: Trial Conversion Platform ADR (Frontier)
- C1265: Trial-to-Paid Conversion Research
- R-007: TypeScript Standards (test requirements)
- R-017: Tangible Output Mandate

---

_This test plan enables parallel Engineering + QA work. As each component is implemented, QA can immediately validate using the corresponding test specs._
