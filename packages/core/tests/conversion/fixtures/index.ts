/**
 * @fileoverview Test Fixtures for Conversion Module
 *
 * Provides factory functions and test data for conversion tests.
 * Implements fixtures specified in Sprint 3 Test Plan (C1269, Section 5).
 *
 * @see docs/qa/sprint3-trial-conversion-test-plan-c1269.md
 */

import type {
  ConversionEventType,
  ConversionEvent,
  Artifact,
  JourneyMilestones,
  JourneyStats,
  UserJourney,
} from '../../../src/conversion/index.js';

// ============================================================================
// Random ID Generation
// ============================================================================

/**
 * Generate a random ID for test fixtures.
 */
export function randomId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// ============================================================================
// Event Factory (Section 5.2)
// ============================================================================

/**
 * Create a test event with sensible defaults.
 * All fields except type can be overridden via options.
 */
export function createTestEvent(
  type: ConversionEventType,
  options: Partial<Omit<ConversionEvent, 'type'>> = {}
): ConversionEvent {
  return {
    id: options.id ?? `evt_test_${randomId()}`,
    type,
    userId: options.userId ?? 'test-user',
    repoId: options.repoId,
    timestamp: options.timestamp ?? new Date(),
    metadata: options.metadata ?? {},
    artifact: options.artifact,
  };
}

/**
 * Create a batch of test events for sequence testing.
 */
export function createTestEventSequence(
  types: ConversionEventType[],
  userId: string = 'test-user'
): ConversionEvent[] {
  return types.map((type, index) =>
    createTestEvent(type, {
      userId,
      timestamp: new Date(Date.now() + index * 1000), // 1 second apart
    })
  );
}

// ============================================================================
// Journey Factory (Section 5.2)
// ============================================================================

/**
 * Default stats for a new journey.
 */
export const DEFAULT_STATS: JourneyStats = {
  totalCycles: 0,
  totalPrsCreated: 0,
  totalIssuesCreated: 0,
  totalCommentsCreated: 0,
  lastActivityAt: new Date(),
  streakDays: 0,
};

/**
 * Create a test journey with sensible defaults.
 * State defaults to 'anonymous', all counters to 0.
 */
export function createTestJourney(
  overrides: Partial<UserJourney> & {
    stats?: Partial<JourneyStats>;
    milestones?: Partial<JourneyMilestones>;
  } = {}
): UserJourney {
  const { stats: statsOverrides, milestones: milestonesOverrides, ...rest } = overrides;

  return {
    userId: rest.userId ?? `usr_test_${randomId()}`,
    state: rest.state ?? 'anonymous',
    stateEnteredAt: rest.stateEnteredAt ?? new Date(),
    milestones: {
      signedUp: undefined,
      cliInstalled: undefined,
      repoConnected: undefined,
      firstCycleStarted: undefined,
      firstCycleCompleted: undefined,
      firstArtifactCreated: undefined,
      cycle5Reached: undefined,
      cycle10Reached: undefined,
      cycle20Reached: undefined,
      firstPrMerged: undefined,
      trialStarted: undefined,
      converted: undefined,
      ...milestonesOverrides,
    },
    stats: {
      ...DEFAULT_STATS,
      ...statsOverrides,
    },
  };
}

// ============================================================================
// Test User Seeds (Section 5.1)
// ============================================================================

/**
 * Pre-configured test users at various journey stages.
 * Useful for testing state-specific behavior.
 */
export const testUsers = {
  /**
   * Anonymous user - hasn't signed up yet.
   */
  anonymous: createTestJourney({
    userId: 'test-anonymous',
    state: 'anonymous',
  }),

  /**
   * Signed up user - just created account.
   */
  signedUp: createTestJourney({
    userId: 'test-signed-up',
    state: 'signed_up',
    milestones: { signedUp: new Date() },
  }),

  /**
   * Installed user - has CLI installed.
   */
  installed: createTestJourney({
    userId: 'test-installed',
    state: 'installed',
    milestones: {
      signedUp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      cliInstalled: new Date(),
    },
  }),

  /**
   * Connected user - has repo connected.
   */
  connected: createTestJourney({
    userId: 'test-connected',
    state: 'connected',
    milestones: {
      signedUp: new Date(Date.now() - 48 * 60 * 60 * 1000),
      cliInstalled: new Date(Date.now() - 24 * 60 * 60 * 1000),
      repoConnected: new Date(),
    },
  }),

  /**
   * Activated user - completed first dispatch.
   */
  activated: createTestJourney({
    userId: 'test-activated',
    state: 'activated',
    stats: { totalCycles: 1 },
    milestones: {
      signedUp: new Date(Date.now() - 72 * 60 * 60 * 1000),
      cliInstalled: new Date(Date.now() - 48 * 60 * 60 * 1000),
      repoConnected: new Date(Date.now() - 24 * 60 * 60 * 1000),
      firstCycleCompleted: new Date(),
    },
  }),

  /**
   * Magic moment user - created first artifact (PR/issue/comment).
   */
  magicMoment: createTestJourney({
    userId: 'test-magic-moment',
    state: 'magic_moment',
    stats: { totalCycles: 2, totalPrsCreated: 1 },
    milestones: {
      signedUp: new Date(Date.now() - 96 * 60 * 60 * 1000),
      cliInstalled: new Date(Date.now() - 72 * 60 * 60 * 1000),
      repoConnected: new Date(Date.now() - 48 * 60 * 60 * 1000),
      firstCycleCompleted: new Date(Date.now() - 24 * 60 * 60 * 1000),
      firstArtifactCreated: new Date(),
    },
  }),

  /**
   * Engaged user - completed 5+ cycles.
   */
  engaged: createTestJourney({
    userId: 'test-engaged',
    state: 'engaged',
    stats: { totalCycles: 8, totalPrsCreated: 2, totalIssuesCreated: 1 },
    milestones: {
      signedUp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      cliInstalled: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      repoConnected: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      firstCycleCompleted: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      firstArtifactCreated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      cycle5Reached: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  }),

  /**
   * Power user - completed 20+ cycles.
   */
  powerUser: createTestJourney({
    userId: 'test-power-user',
    state: 'power_user',
    stats: { totalCycles: 25, totalPrsCreated: 8, totalIssuesCreated: 5 },
    milestones: {
      signedUp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      cliInstalled: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
      repoConnected: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      firstCycleCompleted: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
      firstArtifactCreated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      cycle5Reached: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      cycle20Reached: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  }),

  /**
   * Trialing user - on trial period.
   */
  trialing: createTestJourney({
    userId: 'test-trialing',
    state: 'trialing',
    stats: { totalCycles: 10, totalPrsCreated: 3 },
    milestones: {
      trialStarted: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  }),

  /**
   * Converted user - paying customer.
   */
  converted: createTestJourney({
    userId: 'test-converted',
    state: 'converted',
    stats: { totalCycles: 50, totalPrsCreated: 15 },
    milestones: {
      converted: new Date(),
    },
  }),
};

// ============================================================================
// Artifact Factory
// ============================================================================

/**
 * Create a test artifact.
 */
export function createTestArtifact(
  type: 'pr' | 'issue' | 'comment' | 'doc' | 'commit' = 'pr',
  options: Partial<Artifact> = {}
): Artifact {
  const defaults: Record<string, Partial<Artifact>> = {
    pr: {
      type: 'pr',
      url: 'https://github.com/ada-ai/core/pull/123',
      title: 'feat: add new feature',
      createdAt: new Date(),
    },
    issue: {
      type: 'issue',
      url: 'https://github.com/ada-ai/core/issues/456',
      title: 'bug: fix issue',
      createdAt: new Date(),
    },
    comment: {
      type: 'comment',
      url: 'https://github.com/ada-ai/core/issues/789#issuecomment-123',
      createdAt: new Date(),
    },
    doc: {
      type: 'doc',
      title: 'README.md',
      createdAt: new Date(),
    },
    commit: {
      type: 'commit',
      url: 'https://github.com/ada-ai/core/commit/abc123',
      createdAt: new Date(),
    },
  };

  return {
    ...defaults[type],
    ...options,
  } as Artifact;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Add days to a date.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Subtract days from a date.
 */
export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

/**
 * Check if two dates are on the same day.
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
