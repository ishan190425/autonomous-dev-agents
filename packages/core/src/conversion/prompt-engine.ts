/**
 * @fileoverview Prompt Engine for Trial Conversion
 *
 * Value-based prompt system that shows contextual upgrade prompts
 * based on user behavior, milestones, and trial status.
 *
 * Features:
 * - Trigger evaluation (stat_threshold, event, milestone_complete, trial_ending)
 * - Content interpolation with journey stats
 * - Cooldown enforcement (per prompt per user)
 * - Max shows enforcement
 * - Priority-based selection
 *
 * @see docs/product/sprint3-trial-conversion-acceptance-criteria-c1267.md Section 4
 * @see docs/qa/sprint3-trial-conversion-test-plan-c1269.md Section 2.5
 */

import type { UserJourney as BaseUserJourney, JourneyMilestones } from './journey.js';

/**
 * Extended UserJourney type for prompt evaluation.
 * Adds optional trialEndsAt field from the billing/trial system.
 */
export interface UserJourney extends BaseUserJourney {
  /** Trial end date (from billing/milestone-trial system) */
  trialEndsAt?: Date;
}
import type { ConversionEvent, ConversionEventType } from './events.js';
import type { MilestoneId } from './milestones.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Trigger types that determine when a prompt should be shown.
 */
export type TriggerType = 'stat_threshold' | 'event' | 'milestone_complete' | 'trial_ending';

/**
 * Statistics that can be used in threshold triggers.
 */
export type JourneyStat =
  | 'totalCycles'
  | 'totalPrsCreated'
  | 'totalIssuesCreated'
  | 'totalCommentsCreated'
  | 'streakDays';

/**
 * Trigger configuration for stat_threshold type.
 * Fires when a specific statistic reaches or exceeds a threshold.
 */
export interface StatThresholdTrigger {
  type: 'stat_threshold';
  /** Which stat to check */
  stat: JourneyStat;
  /** Threshold value (fires when stat >= threshold) */
  threshold: number;
}

/**
 * Trigger configuration for event type.
 * Fires when a specific event type occurs.
 */
export interface EventTrigger {
  type: 'event';
  /** Event type that triggers the prompt */
  eventType: ConversionEventType;
}

/**
 * Trigger configuration for milestone_complete type.
 * Fires after a specific milestone is completed.
 */
export interface MilestoneCompleteTrigger {
  type: 'milestone_complete';
  /** Milestone ID that triggers the prompt */
  milestoneId: MilestoneId;
}

/**
 * Trigger configuration for trial_ending type.
 * Fires when trial has N or fewer days remaining.
 */
export interface TrialEndingTrigger {
  type: 'trial_ending';
  /** Number of days remaining when trigger fires */
  daysRemaining: number;
}

/**
 * Union of all trigger types.
 */
export type PromptTrigger =
  | StatThresholdTrigger
  | EventTrigger
  | MilestoneCompleteTrigger
  | TrialEndingTrigger;

/**
 * Prompt content that can include interpolation placeholders.
 *
 * Supported placeholders:
 * - {{cycles}} - Total dispatch cycles
 * - {{prs}} - Total PRs created
 * - {{issues}} - Total issues created
 * - {{daysActive}} - Streak days
 */
export interface PromptContent {
  /** Main headline text */
  headline: string;
  /** Body text with details */
  body: string;
  /** Call-to-action text (optional) */
  cta?: string | undefined;
  /** URL for the CTA (optional) */
  ctaUrl?: string | undefined;
}

/**
 * Prompt configuration.
 */
export interface Prompt {
  /** Unique identifier for the prompt */
  id: string;
  /** When to show this prompt */
  trigger: PromptTrigger;
  /** Content to display (with interpolation) */
  content: PromptContent;
  /** Priority (higher = shown first). Value prompts ≥75, time prompts 50 */
  priority: number;
  /** Minimum time between shows in milliseconds */
  cooldownMs: number;
  /** Maximum number of times to show this prompt */
  maxShows: number;
}

/**
 * History record for a prompt shown to a user.
 */
export interface PromptHistory {
  /** Prompt ID */
  promptId: string;
  /** User ID */
  userId: string;
  /** When the prompt was last shown */
  lastShownAt: Date;
  /** How many times this prompt has been shown */
  showCount: number;
  /** Whether the user clicked the CTA */
  clicked: boolean;
  /** When the CTA was clicked (if clicked) */
  clickedAt?: Date;
}

/**
 * Result of evaluating a prompt for eligibility.
 */
export interface PromptEvaluation {
  /** Whether the prompt should be shown */
  eligible: boolean;
  /** Reason if not eligible (only set when eligible=false) */
  reason?: 'cooldown' | 'max_shows' | 'trigger_not_met' | undefined;
  /** The prompt being evaluated */
  prompt: Prompt;
  /** Interpolated content (if eligible) */
  interpolatedContent?: PromptContent | undefined;
}

/**
 * Interpolation context for content placeholders.
 */
interface InterpolationContext {
  cycles: number;
  prs: number;
  issues: number;
  daysActive: number;
}

// ============================================================================
// PromptEngine Class
// ============================================================================

/**
 * Engine for evaluating and selecting prompts based on user journey.
 *
 * @example
 * ```typescript
 * const engine = new PromptEngine();
 *
 * // Check if prompt should trigger
 * const trigger = { type: 'stat_threshold', stat: 'totalCycles', threshold: 10 };
 * if (engine.shouldTrigger(trigger, journey)) {
 *   console.log('Show prompt!');
 * }
 *
 * // Get eligible prompts with interpolated content
 * const eligible = engine.getEligiblePrompts(prompts, journey, promptHistories);
 * if (eligible.length > 0) {
 *   console.log(eligible[0].interpolatedContent.headline);
 * }
 * ```
 */
export class PromptEngine {
  // --------------------------------------------------------------------------
  // Trigger Evaluation
  // --------------------------------------------------------------------------

  /**
   * Check if a trigger condition is met for a journey state.
   *
   * @param trigger - Trigger configuration to evaluate
   * @param journey - Current user journey state
   * @returns True if trigger condition is met
   */
  shouldTrigger(trigger: PromptTrigger, journey: UserJourney): boolean {
    switch (trigger.type) {
      case 'stat_threshold':
        return this.evaluateStatThreshold(trigger, journey);

      case 'milestone_complete':
        return this.evaluateMilestoneComplete(trigger, journey);

      case 'trial_ending':
        return this.evaluateTrialEnding(trigger, journey);

      case 'event':
        // Event triggers are evaluated separately via shouldTriggerOnEvent
        // This method returns false since events need the actual event object
        return false;

      default:
        return false;
    }
  }

  /**
   * Check if an event trigger fires for a specific event.
   *
   * @param trigger - Event trigger configuration
   * @param event - The event that occurred
   * @returns True if the event matches the trigger
   */
  shouldTriggerOnEvent(trigger: EventTrigger, event: ConversionEvent): boolean {
    return trigger.eventType === event.type;
  }

  /**
   * Evaluate a stat_threshold trigger.
   */
  private evaluateStatThreshold(trigger: StatThresholdTrigger, journey: UserJourney): boolean {
    const value = this.getStatValue(trigger.stat, journey);
    return value >= trigger.threshold;
  }

  /**
   * Get the value of a journey stat.
   */
  private getStatValue(stat: JourneyStat, journey: UserJourney): number {
    switch (stat) {
      case 'totalCycles':
        return journey.stats.totalCycles;
      case 'totalPrsCreated':
        return journey.stats.totalPrsCreated;
      case 'totalIssuesCreated':
        return journey.stats.totalIssuesCreated;
      case 'totalCommentsCreated':
        return journey.stats.totalCommentsCreated;
      case 'streakDays':
        return journey.stats.streakDays;
      default:
        return 0;
    }
  }

  /**
   * Evaluate a milestone_complete trigger.
   */
  private evaluateMilestoneComplete(
    trigger: MilestoneCompleteTrigger,
    journey: UserJourney
  ): boolean {
    const milestoneField = this.getMilestoneField(trigger.milestoneId);
    if (!milestoneField) return false;

    const completedAt = journey.milestones[milestoneField];
    return completedAt !== undefined && completedAt !== null;
  }

  /**
   * Map milestone ID to journey.milestones field name.
   */
  private getMilestoneField(milestoneId: MilestoneId): keyof JourneyMilestones | undefined {
    const mapping: Record<MilestoneId, keyof JourneyMilestones> = {
      first_dispatch: 'firstCycleCompleted',
      magic_moment: 'firstArtifactCreated',
      five_cycles: 'cycle5Reached',
      pr_merged: 'firstPrMerged',
      twenty_cycles: 'cycle20Reached',
    };
    return mapping[milestoneId];
  }

  /**
   * Evaluate a trial_ending trigger.
   */
  private evaluateTrialEnding(trigger: TrialEndingTrigger, journey: UserJourney): boolean {
    if (!journey.trialEndsAt) return false;

    const now = new Date();
    const trialEnd = new Date(journey.trialEndsAt);
    const msRemaining = trialEnd.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));

    return daysRemaining <= trigger.daysRemaining && daysRemaining >= 0;
  }

  // --------------------------------------------------------------------------
  // Content Interpolation
  // --------------------------------------------------------------------------

  /**
   * Interpolate placeholders in prompt content with journey stats.
   *
   * Supported placeholders:
   * - {{cycles}} - Total dispatch cycles
   * - {{prs}} - Total PRs created
   * - {{issues}} - Total issues created
   * - {{daysActive}} - Streak days
   *
   * @param content - Prompt content with placeholders
   * @param journey - User journey for stat values
   * @returns Content with placeholders replaced
   */
  interpolate(content: PromptContent, journey: UserJourney): PromptContent {
    const context: InterpolationContext = {
      cycles: journey.stats.totalCycles,
      prs: journey.stats.totalPrsCreated,
      issues: journey.stats.totalIssuesCreated,
      daysActive: journey.stats.streakDays,
    };

    return {
      headline: this.interpolateString(content.headline, context),
      body: this.interpolateString(content.body, context),
      cta: content.cta ? this.interpolateString(content.cta, context) : undefined,
      ctaUrl: content.ctaUrl,
    };
  }

  /**
   * Replace placeholders in a string.
   */
  private interpolateString(text: string, context: InterpolationContext): string {
    return text
      .replace(/\{\{cycles\}\}/g, String(context.cycles))
      .replace(/\{\{prs\}\}/g, String(context.prs))
      .replace(/\{\{issues\}\}/g, String(context.issues))
      .replace(/\{\{daysActive\}\}/g, String(context.daysActive));
  }

  // --------------------------------------------------------------------------
  // Enforcement (Cooldown & Max Shows)
  // --------------------------------------------------------------------------

  /**
   * Check if a prompt can be shown based on history.
   *
   * Checks:
   * 1. Cooldown: Has enough time passed since last show?
   * 2. Max shows: Has the prompt been shown too many times?
   *
   * @param prompt - Prompt to check
   * @param history - History for this prompt/user (undefined if never shown)
   * @returns True if prompt can be shown
   */
  canShow(prompt: Prompt, history?: PromptHistory): boolean {
    if (!history) {
      // Never shown before, can show
      return true;
    }

    // Check max shows
    if (history.showCount >= prompt.maxShows) {
      return false;
    }

    // Check cooldown
    const now = Date.now();
    const lastShown = new Date(history.lastShownAt).getTime();
    const elapsed = now - lastShown;

    return elapsed >= prompt.cooldownMs;
  }

  /**
   * Get the reason why a prompt cannot be shown.
   */
  getCannotShowReason(prompt: Prompt, history?: PromptHistory): 'cooldown' | 'max_shows' | undefined {
    if (!history) return undefined;

    if (history.showCount >= prompt.maxShows) {
      return 'max_shows';
    }

    const now = Date.now();
    const lastShown = new Date(history.lastShownAt).getTime();
    const elapsed = now - lastShown;

    if (elapsed < prompt.cooldownMs) {
      return 'cooldown';
    }

    return undefined;
  }

  // --------------------------------------------------------------------------
  // Priority & Selection
  // --------------------------------------------------------------------------

  /**
   * Get all eligible prompts sorted by priority (highest first).
   *
   * An eligible prompt:
   * 1. Has its trigger condition met
   * 2. Passes cooldown check
   * 3. Has not exceeded max shows
   *
   * @param prompts - All available prompts
   * @param journey - Current user journey
   * @param histories - Prompt histories for this user (keyed by promptId)
   * @returns Eligible prompts sorted by priority (highest first)
   */
  getEligiblePrompts(
    prompts: Prompt[],
    journey: UserJourney,
    histories: Map<string, PromptHistory> = new Map()
  ): PromptEvaluation[] {
    const evaluations: PromptEvaluation[] = [];

    for (const prompt of prompts) {
      const history = histories.get(prompt.id);
      const evaluation = this.evaluatePrompt(prompt, journey, history);

      if (evaluation.eligible) {
        evaluations.push(evaluation);
      }
    }

    // Sort by priority (highest first)
    evaluations.sort((a, b) => b.prompt.priority - a.prompt.priority);

    return evaluations;
  }

  /**
   * Evaluate a single prompt for eligibility.
   */
  evaluatePrompt(
    prompt: Prompt,
    journey: UserJourney,
    history?: PromptHistory
  ): PromptEvaluation {
    // Check trigger condition
    if (!this.shouldTrigger(prompt.trigger, journey)) {
      return {
        eligible: false,
        reason: 'trigger_not_met',
        prompt,
      };
    }

    // Check cooldown and max shows
    if (!this.canShow(prompt, history)) {
      // We know reason is defined because canShow returned false
      const reason = this.getCannotShowReason(prompt, history) ?? 'cooldown';
      return {
        eligible: false,
        reason,
        prompt,
      };
    }

    // Eligible! Interpolate content
    return {
      eligible: true,
      prompt,
      interpolatedContent: this.interpolate(prompt.content, journey),
    };
  }

  /**
   * Pick the winning prompt from a list (highest priority).
   *
   * @param prompts - Prompts to choose from
   * @returns The highest priority prompt
   */
  pickWinner(prompts: Prompt[]): Prompt {
    if (prompts.length === 0) {
      throw new Error('Cannot pick winner from empty prompt list');
    }

    return prompts.reduce((winner, current) =>
      current.priority > winner.priority ? current : winner
    );
  }
}

// ============================================================================
// Default Prompts
// ============================================================================

/**
 * Priority constants.
 * Value prompts (based on user accomplishments) ≥ 75
 * Time prompts (based on trial timeline) = 50
 */
export const PROMPT_PRIORITY = {
  /** Milestone-based prompts (highest value) */
  MILESTONE: 80,
  /** Stats-based prompts (high value) */
  VALUE: 75,
  /** Time-based prompts (lower priority) */
  TIME: 50,
} as const;

/**
 * Default prompts for the trial conversion system.
 */
export const DEFAULT_PROMPTS: Prompt[] = [
  // Milestone-based (priority 80)
  {
    id: 'first_dispatch_celebration',
    trigger: {
      type: 'milestone_complete',
      milestoneId: 'first_dispatch',
    },
    content: {
      headline: '🎉 First Dispatch Complete!',
      body: "You just ran your first autonomous cycle. That's {{cycles}} cycles of AI-powered development!",
      cta: 'See what\'s next',
      ctaUrl: '/getting-started',
    },
    priority: PROMPT_PRIORITY.MILESTONE,
    cooldownMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxShows: 1,
  },
  {
    id: 'magic_moment_celebration',
    trigger: {
      type: 'milestone_complete',
      milestoneId: 'magic_moment',
    },
    content: {
      headline: '✨ Magic Moment Achieved!',
      body: 'ADA just created a real GitHub artifact for you. {{prs}} PRs and {{issues}} issues so far!',
      cta: 'Continue building',
      ctaUrl: '/dashboard',
    },
    priority: PROMPT_PRIORITY.MILESTONE,
    cooldownMs: 7 * 24 * 60 * 60 * 1000,
    maxShows: 1,
  },
  {
    id: 'power_user_unlock',
    trigger: {
      type: 'milestone_complete',
      milestoneId: 'twenty_cycles',
    },
    content: {
      headline: '🏆 Power User Status Unlocked!',
      body: "{{cycles}} cycles completed! You've unlocked Advanced Analytics. See your team's performance insights.",
      cta: 'View Analytics',
      ctaUrl: '/analytics',
    },
    priority: PROMPT_PRIORITY.MILESTONE,
    cooldownMs: 7 * 24 * 60 * 60 * 1000,
    maxShows: 1,
  },

  // Value-based (priority 75)
  {
    id: 'ten_cycles_momentum',
    trigger: {
      type: 'stat_threshold',
      stat: 'totalCycles',
      threshold: 10,
    },
    content: {
      headline: '🚀 Momentum Building!',
      body: 'You ran {{cycles}} cycles! Your autonomous dev team is gaining traction.',
      cta: 'Upgrade to Pro',
      ctaUrl: '/upgrade',
    },
    priority: PROMPT_PRIORITY.VALUE,
    cooldownMs: 3 * 24 * 60 * 60 * 1000, // 3 days
    maxShows: 3,
  },
  {
    id: 'productive_user',
    trigger: {
      type: 'stat_threshold',
      stat: 'totalPrsCreated',
      threshold: 5,
    },
    content: {
      headline: '💪 Highly Productive!',
      body: "Your agents created {{prs}} PRs. You're in the top 20% of users!",
      cta: 'Go Pro',
      ctaUrl: '/upgrade',
    },
    priority: PROMPT_PRIORITY.VALUE,
    cooldownMs: 5 * 24 * 60 * 60 * 1000, // 5 days
    maxShows: 2,
  },

  // Time-based (priority 50)
  {
    id: 'trial_ending_3days',
    trigger: {
      type: 'trial_ending',
      daysRemaining: 3,
    },
    content: {
      headline: '⏳ Trial Ending Soon',
      body: 'Only 3 days left! Keep your {{cycles}} cycles of progress by upgrading.',
      cta: 'Upgrade Now',
      ctaUrl: '/upgrade',
    },
    priority: PROMPT_PRIORITY.TIME,
    cooldownMs: 24 * 60 * 60 * 1000, // 1 day
    maxShows: 3,
  },
  {
    id: 'trial_ending_1day',
    trigger: {
      type: 'trial_ending',
      daysRemaining: 1,
    },
    content: {
      headline: '🚨 Last Day of Trial',
      body: "Don't lose access! Your team has completed {{cycles}} cycles and created {{prs}} PRs.",
      cta: 'Upgrade to Pro',
      ctaUrl: '/upgrade',
    },
    priority: PROMPT_PRIORITY.TIME,
    cooldownMs: 12 * 60 * 60 * 1000, // 12 hours
    maxShows: 2,
  },
];

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new PromptEngine instance.
 */
export function createPromptEngine(): PromptEngine {
  return new PromptEngine();
}

/**
 * Get the default prompts for the trial conversion system.
 */
export function getDefaultPrompts(): Prompt[] {
  return [...DEFAULT_PROMPTS];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Add days to a date.
 * @param date - Base date
 * @param days - Number of days to add (can be negative)
 * @returns New date with days added
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
