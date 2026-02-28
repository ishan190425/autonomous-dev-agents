/**
 * @fileoverview Conversion Event Types and Interfaces
 *
 * Event-driven system for tracking user journey through the conversion funnel.
 * Implements Event Layer from ADR C1266.
 *
 * @see docs/architecture/adr-trial-conversion-platform-c1266.md
 */

import { randomUUID } from 'node:crypto';

// ============================================================================
// Event Types
// ============================================================================

/**
 * All conversion event types tracked by the platform.
 * Each event represents a meaningful user action in the conversion funnel.
 *
 * @description Onboarding events track user setup progress
 * @description Value events track "magic moments" where agent creates visible output
 * @description Engagement events track ongoing usage
 * @description Conversion events track trial/subscription lifecycle
 */
export type ConversionEventType =
  // Onboarding events — user setup progress
  | 'user.signup'
  | 'user.cli_installed'
  | 'user.repo_connected'
  | 'user.first_dispatch_started'
  | 'user.first_dispatch_completed'

  // Value events — magic moments where agent creates visible output
  | 'cycle.created_pr'
  | 'cycle.created_issue'
  | 'cycle.created_comment'
  | 'cycle.updated_docs'
  | 'cycle.merged_pr'

  // Engagement events — ongoing usage patterns
  | 'cycle.completed'
  | 'memory.searched'
  | 'memory.compressed'
  | 'role.rotated'

  // Conversion events — trial and subscription lifecycle
  | 'trial.started'
  | 'trial.milestone_reached'
  | 'upgrade.prompt_shown'
  | 'upgrade.clicked'
  | 'subscription.created'
  | 'subscription.cancelled';

// ============================================================================
// Event Interfaces
// ============================================================================

/**
 * Artifact created by an agent cycle.
 * Used to track "magic moments" — visible outputs that demonstrate value.
 */
export interface Artifact {
  /** Type of artifact created */
  type: 'pr' | 'issue' | 'comment' | 'doc' | 'commit';
  /** URL to the artifact (e.g., GitHub PR URL) */
  url?: string;
  /** Title or description of the artifact */
  title?: string;
  /** When the artifact was created */
  createdAt: Date;
}

/**
 * Core conversion event structure.
 * All events follow this schema for consistent processing.
 */
export interface ConversionEvent {
  /** Unique event identifier (UUID) */
  id: string;
  /** Event type from ConversionEventType union */
  type: ConversionEventType;
  /** User who triggered the event */
  userId: string;
  /** Repository context (optional for some events) */
  repoId?: string;
  /** When the event occurred */
  timestamp: Date;
  /** Additional event-specific data */
  metadata: Record<string, unknown>;
  /** Artifact details for value events */
  artifact?: Artifact;
}

/**
 * Event creation input — id and timestamp are auto-generated.
 */
export type ConversionEventInput = Omit<ConversionEvent, 'id' | 'timestamp'> & {
  /** Override auto-generated timestamp */
  timestamp?: Date;
};

// ============================================================================
// Event Emitter Interface
// ============================================================================

/**
 * Interface for emitting conversion events.
 * Implementations may queue locally, send to server, or both.
 */
export interface EventEmitter {
  /**
   * Emit a single conversion event.
   * Should queue locally if offline and sync when network available.
   */
  emit(event: ConversionEventInput): Promise<void>;

  /**
   * Emit multiple events in a batch.
   * More efficient for high-volume emission.
   */
  emitBatch(events: ConversionEventInput[]): Promise<void>;

  /**
   * Flush any queued events to the server.
   * Called automatically on graceful shutdown.
   */
  flush(): Promise<void>;
}

// ============================================================================
// Event Factory Functions
// ============================================================================

/**
 * Generate a unique event ID.
 */
export function generateEventId(): string {
  return randomUUID();
}

/**
 * Create a conversion event with auto-generated id and timestamp.
 */
export function createEvent(input: ConversionEventInput): ConversionEvent {
  return {
    id: generateEventId(),
    timestamp: new Date(),
    ...input,
  };
}

/**
 * Create a batch of events with auto-generated ids and timestamps.
 */
export function createEventBatch(
  inputs: ConversionEventInput[]
): ConversionEvent[] {
  return inputs.map(createEvent);
}

// ============================================================================
// Event Type Guards
// ============================================================================

/**
 * Check if an event type is an onboarding event.
 */
export function isOnboardingEvent(type: ConversionEventType): boolean {
  return type.startsWith('user.');
}

/**
 * Check if an event type is a value/magic moment event.
 */
export function isValueEvent(type: ConversionEventType): boolean {
  return type.startsWith('cycle.created_') || type === 'cycle.merged_pr';
}

/**
 * Check if an event type is an engagement event.
 */
export function isEngagementEvent(type: ConversionEventType): boolean {
  return (
    type.startsWith('cycle.') ||
    type.startsWith('memory.') ||
    type.startsWith('role.')
  );
}

/**
 * Check if an event type is a conversion lifecycle event.
 */
export function isConversionEvent(type: ConversionEventType): boolean {
  return (
    type.startsWith('trial.') ||
    type.startsWith('upgrade.') ||
    type.startsWith('subscription.')
  );
}
