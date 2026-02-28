/**
 * Stripe Webhook Types
 *
 * Type-safe definitions for Stripe webhook payloads, event handling, and
 * subscription lifecycle management.
 *
 * @author 🌌 Frontier (Cycle 1296)
 * @see docs/architecture/adr-api-gateway-c1276.md
 */

import type Stripe from 'stripe';

// =============================================================================
// Event Types
// =============================================================================

/**
 * Stripe events we handle for subscription lifecycle
 */
export const HANDLED_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.upcoming',
  'customer.created',
  'customer.updated',
  'customer.deleted',
  'payment_method.attached',
  'payment_method.detached',
] as const;

export type HandledEventType = (typeof HANDLED_EVENTS)[number];

/**
 * Event priority for processing order
 */
export type EventPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Event categories for routing and logging
 */
export type EventCategory = 'subscription' | 'payment' | 'customer' | 'checkout';

// =============================================================================
// Handler Context
// =============================================================================

/**
 * Context passed to webhook handlers
 */
export interface WebhookContext {
  /** Raw Stripe event */
  event: Stripe.Event;
  /** Event type (e.g., 'customer.subscription.created') */
  eventType: string;
  /** Event ID for idempotency tracking */
  eventId: string;
  /** Timestamp when event was created */
  timestamp: Date;
  /** Whether this is a test mode event */
  livemode: boolean;
  /** Request ID for tracing */
  requestId: string;
  /** Customer ID if available */
  customerId?: string;
  /** Subscription ID if available */
  subscriptionId?: string;
}

/**
 * Result from a webhook handler
 */
export interface WebhookResult {
  /** Whether the handler succeeded */
  success: boolean;
  /** Human-readable message */
  message: string;
  /** Any data to return (for logging) */
  data?: Record<string, unknown>;
  /** Error details if failed */
  error?: {
    code: string;
    details: string;
  };
  /** Actions taken (for audit log) */
  actions?: string[];
}

/**
 * Webhook handler function signature
 */
export type WebhookHandler = (ctx: WebhookContext) => Promise<WebhookResult>;

/**
 * Handler registration with metadata
 */
export interface HandlerRegistration {
  /** Event type this handles */
  eventType: HandledEventType;
  /** Handler function */
  handler: WebhookHandler;
  /** Processing priority */
  priority: EventPriority;
  /** Event category */
  category: EventCategory;
  /** Human-readable description */
  description: string;
  /** Whether handler is enabled */
  enabled: boolean;
}

// =============================================================================
// Subscription State
// =============================================================================

/**
 * ADA tier mapped from Stripe product
 */
export type AdaTier = 'FREE' | 'PRO' | 'ENTERPRISE';

/**
 * Subscription status values
 */
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'paused'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired';

/**
 * Normalized subscription data for ADA
 */
export interface NormalizedSubscription {
  /** Stripe subscription ID */
  subscriptionId: string;
  /** Stripe customer ID */
  customerId: string;
  /** ADA tier */
  tier: AdaTier;
  /** Current status */
  status: SubscriptionStatus;
  /** Current period start */
  currentPeriodStart: Date;
  /** Current period end */
  currentPeriodEnd: Date;
  /** Whether subscription will cancel at period end */
  cancelAtPeriodEnd: boolean;
  /** Cancellation date if scheduled */
  cancelAt?: Date;
  /** Trial end date if in trial */
  trialEnd?: Date;
  /** Monthly price in cents */
  priceInCents: number;
  /** Billing interval */
  interval: 'month' | 'year';
  /** Payment method last 4 digits */
  paymentMethodLast4?: string;
  /** Payment method brand */
  paymentMethodBrand?: string;
}

// =============================================================================
// Webhook Verification
// =============================================================================

/**
 * Webhook signature verification result
 */
export interface VerificationResult {
  /** Whether signature is valid */
  valid: boolean;
  /** Parsed event if valid */
  event?: Stripe.Event;
  /** Error message if invalid */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: 'missing_signature' | 'invalid_signature' | 'expired_timestamp' | 'parse_error';
}

/**
 * Webhook endpoint configuration
 */
export interface WebhookConfig {
  /** Webhook signing secret */
  secret: string;
  /** Maximum allowed timestamp drift (seconds) */
  maxTimestampDrift: number;
  /** Whether to log events */
  enableLogging: boolean;
  /** Events to handle (filter) */
  enabledEvents: HandledEventType[];
}

// =============================================================================
// Idempotency
// =============================================================================

/**
 * Processed event record for idempotency
 */
export interface ProcessedEvent {
  /** Stripe event ID */
  eventId: string;
  /** Event type */
  eventType: string;
  /** When processed */
  processedAt: Date;
  /** Result of processing */
  result: WebhookResult;
  /** Processing duration (ms) */
  durationMs: number;
}

/**
 * Idempotency store interface
 */
export interface IdempotencyStore {
  /** Check if event was already processed */
  wasProcessed(eventId: string): Promise<ProcessedEvent | null>;
  /** Mark event as processed */
  markProcessed(event: ProcessedEvent): Promise<void>;
  /** Clean up old records */
  cleanup(olderThan: Date): Promise<number>;
}

// =============================================================================
// Stripe Product Mapping
// =============================================================================

/**
 * Stripe price ID to ADA tier mapping
 */
export interface PriceMapping {
  priceId: string;
  tier: AdaTier;
  interval: 'month' | 'year';
  amount: number;
}

/**
 * Product configuration
 */
export interface ProductConfig {
  /** Stripe product ID for ADA Pro */
  proProductId: string;
  /** Stripe product ID for ADA Enterprise */
  enterpriseProductId: string;
  /** Price mappings */
  prices: PriceMapping[];
}
