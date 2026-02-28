/**
 * @fileoverview User Journey State Machine
 *
 * Tracks user progression through the conversion funnel using a state machine.
 * Implements Journey Layer from ADR C1266.
 *
 * @see docs/architecture/adr-trial-conversion-platform-c1266.md
 */

import type { ConversionEvent, ConversionEventType } from './events.js';

// ============================================================================
// Journey State Types
// ============================================================================

/**
 * All possible states in the user journey.
 * Users progress through these states as they onboard and engage.
 */
export type UserJourneyState =
  | 'anonymous' // Not signed up
  | 'signed_up' // Account created, no CLI install
  | 'installed' // CLI installed, no repo connected
  | 'connected' // Repo connected, no dispatch yet
  | 'first_cycle' // First dispatch in progress
  | 'activated' // First dispatch completed (any output)
  | 'magic_moment' // First visible output created (PR/issue/comment)
  | 'engaged' // 5+ cycles completed
  | 'power_user' // 20+ cycles, using advanced features
  | 'trialing' // Started trial (post-free limit or explicit)
  | 'converted' // Paid subscriber
  | 'churned'; // Cancelled or inactive >30 days

/**
 * Milestone timestamps for the user journey.
 * Each milestone is recorded when first achieved.
 */
export interface JourneyMilestones {
  signedUp?: Date;
  cliInstalled?: Date;
  repoConnected?: Date;
  firstCycleStarted?: Date;
  firstCycleCompleted?: Date;
  firstArtifactCreated?: Date; // Magic moment
  cycle5Reached?: Date;
  cycle10Reached?: Date;
  cycle20Reached?: Date;
  firstPrMerged?: Date;
  trialStarted?: Date;
  converted?: Date;
}

/**
 * Aggregated stats for prompts and analytics.
 */
export interface JourneyStats {
  totalCycles: number;
  totalPrsCreated: number;
  totalIssuesCreated: number;
  totalCommentsCreated: number;
  lastActivityAt: Date;
  streakDays: number;
}

/**
 * Complete user journey record.
 */
export interface UserJourney {
  userId: string;
  state: UserJourneyState;
  stateEnteredAt: Date;
  milestones: JourneyMilestones;
  stats: JourneyStats;
}

// ============================================================================
// State Transition Rules
// ============================================================================

/**
 * Rule for transitioning between states.
 */
export interface TransitionRule {
  event: ConversionEventType;
  nextState: UserJourneyState;
  condition?: (journey: UserJourney) => boolean;
}

/**
 * State transition map defining valid transitions.
 */
export const STATE_TRANSITIONS: Record<UserJourneyState, TransitionRule[]> = {
  anonymous: [{ event: 'user.signup', nextState: 'signed_up' }],

  signed_up: [{ event: 'user.cli_installed', nextState: 'installed' }],

  installed: [{ event: 'user.repo_connected', nextState: 'connected' }],

  connected: [
    { event: 'user.first_dispatch_started', nextState: 'first_cycle' },
  ],

  first_cycle: [
    { event: 'user.first_dispatch_completed', nextState: 'activated' },
    // Magic moment takes precedence — creating artifact during first cycle
    {
      event: 'cycle.created_pr',
      nextState: 'magic_moment',
      condition: (journey) => !journey.milestones.firstArtifactCreated,
    },
    {
      event: 'cycle.created_issue',
      nextState: 'magic_moment',
      condition: (journey) => !journey.milestones.firstArtifactCreated,
    },
    {
      event: 'cycle.created_comment',
      nextState: 'magic_moment',
      condition: (journey) => !journey.milestones.firstArtifactCreated,
    },
  ],

  activated: [
    // Can still reach magic moment if not yet achieved
    {
      event: 'cycle.created_pr',
      nextState: 'magic_moment',
      condition: (journey) => !journey.milestones.firstArtifactCreated,
    },
    {
      event: 'cycle.created_issue',
      nextState: 'magic_moment',
      condition: (journey) => !journey.milestones.firstArtifactCreated,
    },
    {
      event: 'cycle.created_comment',
      nextState: 'magic_moment',
      condition: (journey) => !journey.milestones.firstArtifactCreated,
    },
    // Or progress to engaged after 5 cycles
    {
      event: 'cycle.completed',
      nextState: 'engaged',
      condition: (journey) => journey.stats.totalCycles >= 5,
    },
  ],

  magic_moment: [
    {
      event: 'cycle.completed',
      nextState: 'engaged',
      condition: (journey) => journey.stats.totalCycles >= 5,
    },
  ],

  engaged: [
    {
      event: 'cycle.completed',
      nextState: 'power_user',
      condition: (journey) => journey.stats.totalCycles >= 20,
    },
    { event: 'trial.started', nextState: 'trialing' },
  ],

  power_user: [{ event: 'trial.started', nextState: 'trialing' }],

  trialing: [
    { event: 'subscription.created', nextState: 'converted' },
    { event: 'subscription.cancelled', nextState: 'churned' },
  ],

  converted: [{ event: 'subscription.cancelled', nextState: 'churned' }],

  churned: [
    // Can re-subscribe after churning
    { event: 'subscription.created', nextState: 'converted' },
  ],
};

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error thrown when an invalid state transition is attempted.
 */
export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly currentState: UserJourneyState,
    public readonly event: ConversionEventType,
    public readonly userId: string
  ) {
    super(
      `Invalid state transition: cannot apply event "${event}" in state "${currentState}" for user ${userId}`
    );
    this.name = 'InvalidStateTransitionError';
  }
}

// ============================================================================
// Journey State Machine
// ============================================================================

/**
 * Create a new user journey with default state.
 */
export function createJourney(userId: string): UserJourney {
  const now = new Date();
  return {
    userId,
    state: 'signed_up',
    stateEnteredAt: now,
    milestones: {
      signedUp: now,
    },
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

/**
 * Find applicable transition rule for an event.
 */
export function findTransition(
  journey: UserJourney,
  event: ConversionEventType
): TransitionRule | undefined {
  const rules = STATE_TRANSITIONS[journey.state];
  if (!rules) return undefined;

  // Find first matching rule (order matters for priority)
  return rules.find((rule) => {
    if (rule.event !== event) return false;
    if (rule.condition && !rule.condition(journey)) return false;
    return true;
  });
}

/**
 * Apply an event to update journey state and stats.
 * Returns the updated journey (immutable).
 *
 * @throws InvalidStateTransitionError if no valid transition exists
 */
export function applyEvent(
  journey: UserJourney,
  event: ConversionEvent
): UserJourney {
  const now = event.timestamp;
  const updated: UserJourney = {
    ...journey,
    stats: { ...journey.stats, lastActivityAt: now },
    milestones: { ...journey.milestones },
  };

  // Update stats based on event type FIRST
  switch (event.type) {
    case 'cycle.completed':
      updated.stats.totalCycles++;
      if (updated.stats.totalCycles === 5) {
        updated.milestones.cycle5Reached = now;
      }
      if (updated.stats.totalCycles === 10) {
        updated.milestones.cycle10Reached = now;
      }
      if (updated.stats.totalCycles === 20) {
        updated.milestones.cycle20Reached = now;
      }
      break;
    case 'cycle.created_pr':
      updated.stats.totalPrsCreated++;
      break;
    case 'cycle.created_issue':
      updated.stats.totalIssuesCreated++;
      break;
    case 'cycle.created_comment':
      updated.stats.totalCommentsCreated++;
      break;
    case 'user.cli_installed':
      updated.milestones.cliInstalled = now;
      break;
    case 'user.repo_connected':
      updated.milestones.repoConnected = now;
      break;
    case 'user.first_dispatch_started':
      updated.milestones.firstCycleStarted = now;
      break;
    case 'user.first_dispatch_completed':
      updated.milestones.firstCycleCompleted = now;
      break;
    case 'trial.started':
      updated.milestones.trialStarted = now;
      break;
    case 'subscription.created':
      updated.milestones.converted = now;
      break;
  }

  // Check for state transition using ORIGINAL journey for milestone conditions
  // but UPDATED journey for stat conditions (cycle counts)
  // For artifact events, we want to check if this is the FIRST artifact
  // For cycle events, we want to check the NEW count
  let journeyForTransition = updated;
  
  // For artifact events, use original journey to check "is this the first artifact?"
  if (
    event.type === 'cycle.created_pr' ||
    event.type === 'cycle.created_issue' ||
    event.type === 'cycle.created_comment'
  ) {
    journeyForTransition = journey;
  }

  const transition = findTransition(journeyForTransition, event.type);

  // Now update artifact milestones AFTER checking transition
  switch (event.type) {
    case 'cycle.created_pr':
    case 'cycle.created_issue':
    case 'cycle.created_comment':
      if (!updated.milestones.firstArtifactCreated) {
        updated.milestones.firstArtifactCreated = now;
      }
      break;
    case 'cycle.merged_pr':
      if (!updated.milestones.firstPrMerged) {
        updated.milestones.firstPrMerged = now;
      }
      break;
  }

  // Apply state transition if one was found
  if (transition) {
    updated.state = transition.nextState;
    updated.stateEnteredAt = now;
  }

  return updated;
}

/**
 * Calculate streak days based on activity timestamps.
 * A streak is maintained if there's activity within 24 hours.
 */
export function calculateStreak(
  lastActivity: Date,
  currentActivity: Date
): number {
  const hoursDiff =
    (currentActivity.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
  // If within 24 hours, continue streak; otherwise reset to 1
  return hoursDiff <= 24 ? 1 : 0; // Streak increment logic handled externally
}

// ============================================================================
// Journey Manager Interface
// ============================================================================

/**
 * Result of checking milestones for a user.
 */
export interface MilestoneCheckResult {
  completed: string[];
  pending: string[];
  nextUp: string | null;
  totalTrialDays: number;
  progress: number; // 0-1
}

/**
 * Interface for managing user journeys.
 */
export interface JourneyManager {
  /**
   * Get the current journey state for a user.
   */
  getJourney(userId: string): Promise<UserJourney>;

  /**
   * Process an event and update the journey.
   * Returns the updated journey.
   */
  processEvent(event: ConversionEvent): Promise<UserJourney>;

  /**
   * Check milestone completion status.
   */
  checkMilestones(userId: string): Promise<MilestoneCheckResult>;
}
