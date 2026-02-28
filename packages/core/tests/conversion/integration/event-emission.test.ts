/**
 * @fileoverview Integration Tests - Event Emission
 *
 * Tests the event emission system: event creation, batching, and emission.
 * Validates Event Layer integration with external systems (mocked).
 *
 * Implements Section 3.1 of Sprint 3 Test Plan (C1269).
 *
 * @see docs/qa/sprint3-trial-conversion-test-plan-c1269.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  type ConversionEvent,
  type ConversionEventType,
  type EventEmitter,
  createEvent,
  createEventBatch,
  generateEventId,
  isOnboardingEvent,
  isValueEvent,
  isEngagementEvent,
  isConversionEvent,
} from '../../../src/conversion/index.js';
import {
  createTestEvent,
  createTestEventSequence,
  createTestArtifact,
} from '../fixtures/index.js';

// ============================================================================
// Mock Event Emitter for Integration Testing
// ============================================================================

/**
 * In-memory event emitter for testing.
 * Tracks emitted events for assertions.
 */
class MockEventEmitter implements EventEmitter {
  public emittedEvents: ConversionEvent[] = [];
  public queuedEvents: ConversionEvent[] = [];
  public isOnline: boolean = true;
  public emitCount: number = 0;
  public batchCount: number = 0;

  emit(event: ConversionEvent): Promise<void> {
    if (this.isOnline) {
      this.emittedEvents.push(event);
      this.emitCount++;
    } else {
      this.queuedEvents.push(event);
    }
    return Promise.resolve();
  }

  emitBatch(events: ConversionEvent[]): Promise<void> {
    if (this.isOnline) {
      this.emittedEvents.push(...events);
      this.batchCount++;
    } else {
      this.queuedEvents.push(...events);
    }
    return Promise.resolve();
  }

  flush(): Promise<void> {
    if (this.isOnline && this.queuedEvents.length > 0) {
      this.emittedEvents.push(...this.queuedEvents);
      this.queuedEvents = [];
    }
    return Promise.resolve();
  }

  reset(): void {
    this.emittedEvents = [];
    this.queuedEvents = [];
    this.emitCount = 0;
    this.batchCount = 0;
  }

  setOnline(online: boolean): void {
    this.isOnline = online;
  }
}

// ============================================================================
// Event Emission Integration Tests
// ============================================================================

describe('Event Emission Integration', () => {
  let emitter: MockEventEmitter;

  beforeEach(() => {
    emitter = new MockEventEmitter();
  });

  describe('Single Event Emission', () => {
    it('should emit a single event successfully', async () => {
      const event = createTestEvent('user.signup');

      await emitter.emit(event);

      expect(emitter.emittedEvents).toHaveLength(1);
      expect(emitter.emittedEvents[0].type).toBe('user.signup');
      expect(emitter.emitCount).toBe(1);
    });

    it('should emit events with all required fields', async () => {
      const event = createTestEvent('cycle.completed', {
        userId: 'usr_test123',
        repoId: 'repo_abc',
        metadata: { cycleNumber: 5 },
      });

      await emitter.emit(event);

      const emitted = emitter.emittedEvents[0];
      expect(emitted.id).toBeDefined();
      expect(emitted.type).toBe('cycle.completed');
      expect(emitted.userId).toBe('usr_test123');
      expect(emitted.repoId).toBe('repo_abc');
      expect(emitted.timestamp).toBeInstanceOf(Date);
      expect(emitted.metadata.cycleNumber).toBe(5);
    });

    it('should emit events with artifact', async () => {
      const event = createTestEvent('cycle.created_pr', {
        artifact: createTestArtifact('pr', { id: '123' }),
      });

      await emitter.emit(event);

      const emitted = emitter.emittedEvents[0];
      expect(emitted.artifact).toBeDefined();
      expect(emitted.artifact?.type).toBe('pr');
      expect(emitted.artifact?.id).toBe('123');
    });
  });

  describe('Batch Event Emission', () => {
    it('should emit a batch of events', async () => {
      const events = createTestEventSequence([
        'user.signup',
        'user.cli_installed',
        'user.repo_connected',
      ]);

      await emitter.emitBatch(events);

      expect(emitter.emittedEvents).toHaveLength(3);
      expect(emitter.batchCount).toBe(1);
    });

    it('should preserve event order in batch', async () => {
      const events = createTestEventSequence([
        'user.signup',
        'user.cli_installed',
        'user.repo_connected',
      ]);

      await emitter.emitBatch(events);

      expect(emitter.emittedEvents[0].type).toBe('user.signup');
      expect(emitter.emittedEvents[1].type).toBe('user.cli_installed');
      expect(emitter.emittedEvents[2].type).toBe('user.repo_connected');
    });

    it('should handle empty batch gracefully', async () => {
      await emitter.emitBatch([]);

      expect(emitter.emittedEvents).toHaveLength(0);
      expect(emitter.batchCount).toBe(1); // Still counts as a batch call
    });

    it('should handle large batch', async () => {
      const eventTypes: ConversionEventType[] = [];
      for (let i = 0; i < 100; i++) {
        eventTypes.push('cycle.completed');
      }
      const events = createTestEventSequence(eventTypes);

      await emitter.emitBatch(events);

      expect(emitter.emittedEvents).toHaveLength(100);
    });
  });

  describe('Offline Queueing', () => {
    it('should queue events when offline', async () => {
      emitter.setOnline(false);
      const event = createTestEvent('user.signup');

      await emitter.emit(event);

      expect(emitter.emittedEvents).toHaveLength(0);
      expect(emitter.queuedEvents).toHaveLength(1);
    });

    it('should queue batch when offline', async () => {
      emitter.setOnline(false);
      const events = createTestEventSequence([
        'user.signup',
        'user.cli_installed',
      ]);

      await emitter.emitBatch(events);

      expect(emitter.emittedEvents).toHaveLength(0);
      expect(emitter.queuedEvents).toHaveLength(2);
    });

    it('should flush queued events when back online', async () => {
      // Go offline and queue events
      emitter.setOnline(false);
      await emitter.emit(createTestEvent('user.signup'));
      await emitter.emit(createTestEvent('user.cli_installed'));

      expect(emitter.queuedEvents).toHaveLength(2);

      // Come back online and flush
      emitter.setOnline(true);
      await emitter.flush();

      expect(emitter.queuedEvents).toHaveLength(0);
      expect(emitter.emittedEvents).toHaveLength(2);
    });

    it('should preserve order after offline flush', async () => {
      emitter.setOnline(false);

      await emitter.emit(createTestEvent('user.signup'));
      await emitter.emit(createTestEvent('user.cli_installed'));
      await emitter.emit(createTestEvent('user.repo_connected'));

      emitter.setOnline(true);
      await emitter.flush();

      expect(emitter.emittedEvents[0].type).toBe('user.signup');
      expect(emitter.emittedEvents[1].type).toBe('user.cli_installed');
      expect(emitter.emittedEvents[2].type).toBe('user.repo_connected');
    });
  });

  describe('Event ID Generation', () => {
    it('should generate unique event IDs', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 1000; i++) {
        ids.add(generateEventId());
      }

      // All IDs should be unique
      expect(ids.size).toBe(1000);
    });

    it('should generate IDs as valid UUIDs', () => {
      const id = generateEventId();
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should generate IDs of consistent length', () => {
      const ids = [];
      for (let i = 0; i < 100; i++) {
        ids.push(generateEventId());
      }

      // All UUIDs should be 36 characters
      expect(new Set(ids.map((id) => id.length))).toEqual(new Set([36]));
    });
  });

  describe('Event Factory Functions', () => {
    it('createEvent should create valid event from input', () => {
      const input = {
        type: 'user.signup' as ConversionEventType,
        userId: 'usr_test',
        metadata: {},
      };

      const event = createEvent(input);

      expect(event.id).toBeDefined();
      expect(event.type).toBe('user.signup');
      expect(event.userId).toBe('usr_test');
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.metadata).toEqual({});
    });

    it('createEvent should accept optional fields', () => {
      const input = {
        type: 'cycle.completed' as ConversionEventType,
        userId: 'usr_test',
        repoId: 'repo_abc',
        metadata: { cycleNumber: 10 },
        artifact: { type: 'pr' as const, id: '123' },
      };

      const event = createEvent(input);

      expect(event.repoId).toBe('repo_abc');
      expect(event.metadata.cycleNumber).toBe(10);
      expect(event.artifact?.type).toBe('pr');
    });

    it('createEventBatch should create multiple events', () => {
      const inputs = [
        { type: 'user.signup' as ConversionEventType, userId: 'usr_1' },
        { type: 'user.signup' as ConversionEventType, userId: 'usr_2' },
        { type: 'user.signup' as ConversionEventType, userId: 'usr_3' },
      ];

      const events = createEventBatch(inputs);

      expect(events).toHaveLength(3);
      events.forEach((event, i) => {
        expect(event.type).toBe('user.signup');
        expect(event.userId).toBe(`usr_${i + 1}`);
      });
    });
  });

  describe('Event Type Guards', () => {
    it('isOnboardingEvent should identify onboarding events', () => {
      // Type guards take the event type string, not the full event
      expect(isOnboardingEvent('user.signup')).toBe(true);
      expect(isOnboardingEvent('user.cli_installed')).toBe(true);
      expect(isOnboardingEvent('user.repo_connected')).toBe(true);
      expect(isOnboardingEvent('user.first_dispatch_started')).toBe(true);
      expect(isOnboardingEvent('user.first_dispatch_completed')).toBe(true);

      // Not onboarding
      expect(isOnboardingEvent('cycle.completed')).toBe(false);
      expect(isOnboardingEvent('subscription.created')).toBe(false);
    });

    it('isValueEvent should identify value-generating events', () => {
      expect(isValueEvent('cycle.created_pr')).toBe(true);
      expect(isValueEvent('cycle.created_issue')).toBe(true);
      expect(isValueEvent('cycle.created_comment')).toBe(true);
      expect(isValueEvent('cycle.merged_pr')).toBe(true);

      // Not value events
      expect(isValueEvent('user.signup')).toBe(false);
      expect(isValueEvent('cycle.completed')).toBe(false);
    });

    it('isEngagementEvent should identify engagement events', () => {
      expect(isEngagementEvent('cycle.completed')).toBe(true);
      expect(isEngagementEvent('memory.searched')).toBe(true);
      expect(isEngagementEvent('role.rotated')).toBe(true);

      // Not engagement (onboarding is separate)
      expect(isEngagementEvent('user.signup')).toBe(false);
      expect(isEngagementEvent('subscription.created')).toBe(false);
    });

    it('isConversionEvent should identify conversion events', () => {
      expect(isConversionEvent('subscription.created')).toBe(true);
      expect(isConversionEvent('subscription.cancelled')).toBe(true);
      expect(isConversionEvent('trial.started')).toBe(true);
      expect(isConversionEvent('upgrade.clicked')).toBe(true);

      // Not conversion
      expect(isConversionEvent('user.signup')).toBe(false);
      expect(isConversionEvent('cycle.completed')).toBe(false);
    });
  });

  describe('Event Metadata', () => {
    it('should handle complex metadata', async () => {
      const event = createTestEvent('cycle.completed', {
        metadata: {
          cycleNumber: 42,
          duration: 3600,
          tokensUsed: 15000,
          model: 'gpt-4',
          actions: ['created_pr', 'updated_readme'],
        },
      });

      await emitter.emit(event);

      const emitted = emitter.emittedEvents[0];
      expect(emitted.metadata.cycleNumber).toBe(42);
      expect(emitted.metadata.duration).toBe(3600);
      expect(emitted.metadata.tokensUsed).toBe(15000);
      expect(emitted.metadata.model).toBe('gpt-4');
      expect(emitted.metadata.actions).toEqual(['created_pr', 'updated_readme']);
    });

    it('should handle nested metadata', async () => {
      const event = createTestEvent('cycle.completed', {
        metadata: {
          performance: {
            llmLatency: 2500,
            gitLatency: 150,
            totalLatency: 2650,
          },
        },
      });

      await emitter.emit(event);

      const emitted = emitter.emittedEvents[0];
      expect(emitted.metadata.performance.llmLatency).toBe(2500);
    });
  });

  describe('Concurrency', () => {
    it('should handle concurrent emissions', async () => {
      const promises = [];

      for (let i = 0; i < 50; i++) {
        promises.push(emitter.emit(createTestEvent('cycle.completed')));
      }

      await Promise.all(promises);

      expect(emitter.emittedEvents).toHaveLength(50);
    });

    it('should handle mixed single and batch emissions', async () => {
      const promises = [
        emitter.emit(createTestEvent('user.signup')),
        emitter.emitBatch(createTestEventSequence(['cycle.started', 'cycle.completed'])),
        emitter.emit(createTestEvent('cycle.created_pr')),
        emitter.emitBatch(createTestEventSequence(['cycle.started', 'cycle.completed', 'cycle.started'])),
      ];

      await Promise.all(promises);

      expect(emitter.emittedEvents).toHaveLength(7);
    });
  });
});
