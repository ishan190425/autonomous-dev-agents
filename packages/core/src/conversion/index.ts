/**
 * @fileoverview Conversion Module - Trial Conversion Platform
 *
 * Event-driven system for tracking user journey through the conversion funnel.
 * Implements the three-layer architecture from ADR C1266:
 * - Event Layer: Structured event capture
 * - Journey Layer: User state machine and milestone tracking
 * - Magic Moment Detection: First visible output detection
 *
 * @see docs/architecture/adr-trial-conversion-platform-c1266.md
 * @see docs/product/sprint3-trial-conversion-acceptance-criteria-c1267.md
 */

// ============================================================================
// Event Layer
// ============================================================================
export {
  // Types
  type ConversionEventType,
  type ConversionEvent,
  type ConversionEventInput,
  type Artifact,
  type EventEmitter,
  // Factory functions
  generateEventId,
  createEvent,
  createEventBatch,
  // Type guards
  isOnboardingEvent,
  isValueEvent,
  isEngagementEvent,
  isConversionEvent,
} from './events.js';

// ============================================================================
// Journey Layer
// ============================================================================
export {
  // Types
  type UserJourneyState,
  type JourneyMilestones,
  type JourneyStats,
  type UserJourney,
  type TransitionRule,
  type MilestoneCheckResult,
  type JourneyManager,
  // State transitions
  STATE_TRANSITIONS,
  // Error types
  InvalidStateTransitionError,
  // Functions
  createJourney,
  findTransition,
  applyEvent,
  calculateStreak,
} from './journey.js';

// ============================================================================
// Magic Moment Detection
// ============================================================================
export {
  // Types
  type DispatchContext,
  type MagicMomentDetector,
  // Patterns
  ARTIFACT_PATTERNS,
  ACTION_PATTERNS,
  // Implementation
  DefaultMagicMomentDetector,
  // Factory functions
  createMagicMomentDetector,
  detectMagicMoment,
} from './magic-moment.js';

// ============================================================================
// Milestone Tracker
// ============================================================================
export {
  // Types
  type MilestoneId,
  type MilestoneReward,
  type Milestone,
  type MilestoneTrackerResult,
  type TrialDaysResult,
  // Constants
  DEFAULT_MILESTONES,
  BASE_TRIAL_DAYS,
  MAX_TRIAL_DAYS,
  // Class
  MilestoneTracker,
  // Factory functions
  createMilestoneTracker,
  createCustomMilestoneTracker,
} from './milestones.js';

// ============================================================================
// Prompt Engine (C1290)
// ============================================================================
export {
  // Types
  type TriggerType,
  type JourneyStat,
  type StatThresholdTrigger,
  type EventTrigger,
  type MilestoneCompleteTrigger,
  type TrialEndingTrigger,
  type PromptTrigger,
  type PromptContent,
  type Prompt,
  type PromptHistory,
  type PromptEvaluation,
  // Constants
  PROMPT_PRIORITY,
  DEFAULT_PROMPTS,
  // Class
  PromptEngine,
  // Factory functions
  createPromptEngine,
  getDefaultPrompts,
  // Utilities
  addDays,
} from './prompt-engine.js';
