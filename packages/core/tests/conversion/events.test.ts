/**
 * @fileoverview Unit tests for Conversion Event Types
 *
 * Tests AC-1.1.1 and AC-1.1.2 from C1267.
 */

import { describe, it, expect } from 'vitest';
import {
  type ConversionEventType,
  type ConversionEvent,
  type ConversionEventInput,
  type Artifact,
  generateEventId,
  createEvent,
  createEventBatch,
  isOnboardingEvent,
  isValueEvent,
  isEngagementEvent,
  isConversionEvent,
} from '../../src/conversion/events.js';

// ============================================================================
// AC-1.1.1: Core Event Types Exist
// ============================================================================

describe('ConversionEventType', () => {
  describe('Onboarding Events', () => {
    it('should include user.signup event', () => {
      const event: ConversionEventType = 'user.signup';
      expect(event).toBe('user.signup');
    });

    it('should include user.cli_installed event', () => {
      const event: ConversionEventType = 'user.cli_installed';
      expect(event).toBe('user.cli_installed');
    });

    it('should include user.repo_connected event', () => {
      const event: ConversionEventType = 'user.repo_connected';
      expect(event).toBe('user.repo_connected');
    });

    it('should include user.first_dispatch_started event', () => {
      const event: ConversionEventType = 'user.first_dispatch_started';
      expect(event).toBe('user.first_dispatch_started');
    });

    it('should include user.first_dispatch_completed event', () => {
      const event: ConversionEventType = 'user.first_dispatch_completed';
      expect(event).toBe('user.first_dispatch_completed');
    });
  });

  describe('Value Events (Magic Moments)', () => {
    it('should include cycle.created_pr event', () => {
      const event: ConversionEventType = 'cycle.created_pr';
      expect(event).toBe('cycle.created_pr');
    });

    it('should include cycle.created_issue event', () => {
      const event: ConversionEventType = 'cycle.created_issue';
      expect(event).toBe('cycle.created_issue');
    });

    it('should include cycle.created_comment event', () => {
      const event: ConversionEventType = 'cycle.created_comment';
      expect(event).toBe('cycle.created_comment');
    });

    it('should include cycle.updated_docs event', () => {
      const event: ConversionEventType = 'cycle.updated_docs';
      expect(event).toBe('cycle.updated_docs');
    });

    it('should include cycle.merged_pr event', () => {
      const event: ConversionEventType = 'cycle.merged_pr';
      expect(event).toBe('cycle.merged_pr');
    });
  });

  describe('Engagement Events', () => {
    it('should include cycle.completed event', () => {
      const event: ConversionEventType = 'cycle.completed';
      expect(event).toBe('cycle.completed');
    });

    it('should include memory.searched event', () => {
      const event: ConversionEventType = 'memory.searched';
      expect(event).toBe('memory.searched');
    });

    it('should include memory.compressed event', () => {
      const event: ConversionEventType = 'memory.compressed';
      expect(event).toBe('memory.compressed');
    });

    it('should include role.rotated event', () => {
      const event: ConversionEventType = 'role.rotated';
      expect(event).toBe('role.rotated');
    });
  });

  describe('Conversion Events', () => {
    it('should include trial.started event', () => {
      const event: ConversionEventType = 'trial.started';
      expect(event).toBe('trial.started');
    });

    it('should include trial.milestone_reached event', () => {
      const event: ConversionEventType = 'trial.milestone_reached';
      expect(event).toBe('trial.milestone_reached');
    });

    it('should include upgrade.prompt_shown event', () => {
      const event: ConversionEventType = 'upgrade.prompt_shown';
      expect(event).toBe('upgrade.prompt_shown');
    });

    it('should include upgrade.clicked event', () => {
      const event: ConversionEventType = 'upgrade.clicked';
      expect(event).toBe('upgrade.clicked');
    });

    it('should include subscription.created event', () => {
      const event: ConversionEventType = 'subscription.created';
      expect(event).toBe('subscription.created');
    });

    it('should include subscription.cancelled event', () => {
      const event: ConversionEventType = 'subscription.cancelled';
      expect(event).toBe('subscription.cancelled');
    });
  });
});

// ============================================================================
// AC-1.1.2: Event Interface Complete
// ============================================================================

describe('ConversionEvent interface', () => {
  it('should include all required fields', () => {
    const event: ConversionEvent = {
      id: 'test-id',
      type: 'user.signup',
      userId: 'user-123',
      timestamp: new Date(),
      metadata: {},
    };

    expect(event.id).toBe('test-id');
    expect(event.type).toBe('user.signup');
    expect(event.userId).toBe('user-123');
    expect(event.timestamp).toBeInstanceOf(Date);
    expect(event.metadata).toEqual({});
  });

  it('should support optional repoId', () => {
    const event: ConversionEvent = {
      id: 'test-id',
      type: 'cycle.completed',
      userId: 'user-123',
      repoId: 'repo-456',
      timestamp: new Date(),
      metadata: { cycleNumber: 1 },
    };

    expect(event.repoId).toBe('repo-456');
  });

  it('should support optional artifact', () => {
    const artifact: Artifact = {
      type: 'pr',
      url: 'https://github.com/org/repo/pull/123',
      title: 'feat: add new feature',
      createdAt: new Date(),
    };

    const event: ConversionEvent = {
      id: 'test-id',
      type: 'cycle.created_pr',
      userId: 'user-123',
      timestamp: new Date(),
      metadata: {},
      artifact,
    };

    expect(event.artifact).toEqual(artifact);
    expect(event.artifact?.type).toBe('pr');
  });
});

describe('Artifact interface', () => {
  it('should support all artifact types', () => {
    const types: Artifact['type'][] = ['pr', 'issue', 'comment', 'doc', 'commit'];
    
    types.forEach(type => {
      const artifact: Artifact = {
        type,
        createdAt: new Date(),
      };
      expect(artifact.type).toBe(type);
    });
  });

  it('should support optional url and title', () => {
    const artifact: Artifact = {
      type: 'pr',
      url: 'https://github.com/org/repo/pull/123',
      title: 'feat: add feature',
      createdAt: new Date(),
    };

    expect(artifact.url).toBe('https://github.com/org/repo/pull/123');
    expect(artifact.title).toBe('feat: add feature');
  });
});

// ============================================================================
// Factory Functions
// ============================================================================

describe('generateEventId', () => {
  it('should generate a valid UUID', () => {
    const id = generateEventId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateEventId()));
    expect(ids.size).toBe(100);
  });
});

describe('createEvent', () => {
  it('should auto-generate id and timestamp', () => {
    const input: ConversionEventInput = {
      type: 'user.signup',
      userId: 'user-123',
      metadata: {},
    };

    const event = createEvent(input);

    expect(event.id).toBeDefined();
    expect(event.id).toMatch(/^[0-9a-f]{8}-/);
    expect(event.timestamp).toBeInstanceOf(Date);
    expect(event.type).toBe('user.signup');
    expect(event.userId).toBe('user-123');
  });

  it('should allow timestamp override', () => {
    const customTimestamp = new Date('2026-01-01');
    const input: ConversionEventInput = {
      type: 'user.signup',
      userId: 'user-123',
      metadata: {},
      timestamp: customTimestamp,
    };

    const event = createEvent(input);

    expect(event.timestamp).toEqual(customTimestamp);
  });
});

describe('createEventBatch', () => {
  it('should create multiple events', () => {
    const inputs: ConversionEventInput[] = [
      { type: 'user.signup', userId: 'user-1', metadata: {} },
      { type: 'user.cli_installed', userId: 'user-1', metadata: {} },
      { type: 'user.repo_connected', userId: 'user-1', metadata: {} },
    ];

    const events = createEventBatch(inputs);

    expect(events).toHaveLength(3);
    expect(events[0].type).toBe('user.signup');
    expect(events[1].type).toBe('user.cli_installed');
    expect(events[2].type).toBe('user.repo_connected');
    
    // Each should have unique ID
    const ids = new Set(events.map(e => e.id));
    expect(ids.size).toBe(3);
  });
});

// ============================================================================
// Type Guards
// ============================================================================

describe('isOnboardingEvent', () => {
  it('should return true for onboarding events', () => {
    expect(isOnboardingEvent('user.signup')).toBe(true);
    expect(isOnboardingEvent('user.cli_installed')).toBe(true);
    expect(isOnboardingEvent('user.repo_connected')).toBe(true);
    expect(isOnboardingEvent('user.first_dispatch_started')).toBe(true);
    expect(isOnboardingEvent('user.first_dispatch_completed')).toBe(true);
  });

  it('should return false for non-onboarding events', () => {
    expect(isOnboardingEvent('cycle.completed')).toBe(false);
    expect(isOnboardingEvent('trial.started')).toBe(false);
    expect(isOnboardingEvent('subscription.created')).toBe(false);
  });
});

describe('isValueEvent', () => {
  it('should return true for value/magic moment events', () => {
    expect(isValueEvent('cycle.created_pr')).toBe(true);
    expect(isValueEvent('cycle.created_issue')).toBe(true);
    expect(isValueEvent('cycle.created_comment')).toBe(true);
    expect(isValueEvent('cycle.merged_pr')).toBe(true);
  });

  it('should return false for non-value events', () => {
    expect(isValueEvent('cycle.completed')).toBe(false);
    expect(isValueEvent('cycle.updated_docs')).toBe(false);
    expect(isValueEvent('user.signup')).toBe(false);
  });
});

describe('isEngagementEvent', () => {
  it('should return true for engagement events', () => {
    expect(isEngagementEvent('cycle.completed')).toBe(true);
    expect(isEngagementEvent('cycle.created_pr')).toBe(true);
    expect(isEngagementEvent('memory.searched')).toBe(true);
    expect(isEngagementEvent('memory.compressed')).toBe(true);
    expect(isEngagementEvent('role.rotated')).toBe(true);
  });

  it('should return false for non-engagement events', () => {
    expect(isEngagementEvent('user.signup')).toBe(false);
    expect(isEngagementEvent('trial.started')).toBe(false);
  });
});

describe('isConversionEvent', () => {
  it('should return true for conversion lifecycle events', () => {
    expect(isConversionEvent('trial.started')).toBe(true);
    expect(isConversionEvent('trial.milestone_reached')).toBe(true);
    expect(isConversionEvent('upgrade.prompt_shown')).toBe(true);
    expect(isConversionEvent('upgrade.clicked')).toBe(true);
    expect(isConversionEvent('subscription.created')).toBe(true);
    expect(isConversionEvent('subscription.cancelled')).toBe(true);
  });

  it('should return false for non-conversion events', () => {
    expect(isConversionEvent('user.signup')).toBe(false);
    expect(isConversionEvent('cycle.completed')).toBe(false);
  });
});
