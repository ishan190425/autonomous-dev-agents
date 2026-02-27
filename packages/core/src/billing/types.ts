/**
 * @ada-ai/core - Billing Types
 *
 * Type definitions for the ADA SaaS billing system.
 * Supports tiered subscriptions, usage metering, and Stripe integration.
 *
 * @see docs/architecture/adr-usage-metering-architecture-c1186.md
 * @see docs/architecture/saas-tier-technical-spec-c1185.md
 */

/**
 * Subscription tiers available in ADA SaaS
 */
export type Tier = 'free' | 'pro' | 'team' | 'enterprise';

/**
 * Billing period for subscriptions
 */
export type BillingPeriod = 'monthly' | 'annual';

/**
 * Subscription status
 */
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

/**
 * Configuration for a billing tier
 */
export interface TierConfig {
  /** Display name */
  readonly name: string;
  /** Monthly cycles included */
  readonly cyclesPerMonth: number;
  /** Max cycles per hour (rate limit, -1 = unlimited) */
  readonly cyclesPerHour: number;
  /** Max cycles per day (rate limit, -1 = unlimited) */
  readonly cyclesPerDay: number;
  /** Max concurrent dispatches */
  readonly maxConcurrent: number;
  /** Monthly price in cents (USD) */
  readonly priceMonthly: number;
  /** Annual price in cents (USD), typically discounted */
  readonly priceAnnual: number;
  /** Max repos per workspace */
  readonly maxRepos: number;
  /** Max team members (0 = individual only) */
  readonly maxTeamMembers: number;
  /** Priority support included */
  readonly prioritySupport: boolean;
  /** Custom roles allowed */
  readonly customRoles: boolean;
  /** API access included */
  readonly apiAccess: boolean;
  /** Stripe Price IDs */
  readonly stripePriceIds: {
    monthly: string | null;
    annual: string | null;
  };
}

/**
 * User subscription record
 */
export interface Subscription {
  /** Unique subscription ID */
  readonly id: string;
  /** User ID (owner) */
  readonly userId: string;
  /** Workspace ID (for team plans) */
  readonly workspaceId: string | null;
  /** Current tier */
  readonly tier: Tier;
  /** Subscription status */
  readonly status: SubscriptionStatus;
  /** Billing period */
  readonly period: BillingPeriod;
  /** Cycles used this period */
  readonly cyclesUsed: number;
  /** Current period start */
  readonly periodStart: Date;
  /** Current period end */
  readonly periodEnd: Date;
  /** Stripe subscription ID */
  readonly stripeSubscriptionId: string | null;
  /** Stripe customer ID */
  readonly stripeCustomerId: string | null;
  /** When subscription was created */
  readonly createdAt: Date;
  /** When subscription was last updated */
  readonly updatedAt: Date;
  /** Cancellation date (if scheduled) */
  readonly cancelAt: Date | null;
}

/**
 * Usage record for a single dispatch cycle
 */
export interface CycleUsageRecord {
  /** Unique record ID (for idempotency) */
  readonly id: string;
  /** User who dispatched */
  readonly userId: string;
  /** Repository where cycle ran */
  readonly repoId: string;
  /** Cycle number */
  readonly cycleNumber: number;
  /** Input tokens consumed */
  readonly tokensIn: number;
  /** Output tokens generated */
  readonly tokensOut: number;
  /** Calculated cost in USD */
  readonly cost: number;
  /** When cycle was dispatched */
  readonly createdAt: Date;
  /** When record was persisted */
  readonly recordedAt: Date;
}

/**
 * Pre-dispatch check result
 */
export interface PreDispatchResult {
  /** Whether dispatch is allowed */
  readonly allowed: boolean;
  /** Reason if not allowed */
  readonly reason?: string;
  /** Whether cache sync is required */
  readonly requiresSync?: boolean;
  /** Cycles remaining after this dispatch */
  readonly remaining?: number;
  /** Warning message (e.g., near limit) */
  readonly warning?: string;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether request is allowed */
  readonly allowed: boolean;
  /** Reason if not allowed */
  readonly reason?: string;
  /** Seconds until rate limit resets */
  readonly retryAfter?: number;
  /** Which limit was hit */
  readonly limit?: 'hourly' | 'daily';
  /** Remaining hourly cycles */
  readonly hourlyRemaining?: number;
}

/**
 * Concurrent slot acquisition result
 */
export interface AcquireSlotResult {
  /** Whether slot was acquired */
  readonly allowed: boolean;
  /** Slot ID (for release) */
  readonly slotId?: string;
  /** Reason if not allowed */
  readonly reason?: string;
  /** Current concurrent count */
  readonly current?: number;
}

/**
 * Usage recording result
 */
export interface RecordResult {
  /** Whether recording succeeded */
  readonly success: boolean;
  /** Whether this was a duplicate (idempotent) */
  readonly duplicate?: boolean;
  /** Calculated cost */
  readonly cost?: number;
  /** Error if failed */
  readonly error?: Error;
}

/**
 * Batch recording result
 */
export interface BatchRecordResult {
  /** Number of records successfully recorded */
  readonly recorded: number;
  /** Number of records that failed */
  readonly failed: number;
  /** Total records attempted */
  readonly total: number;
}

/**
 * Sync result for usage cache
 */
export interface SyncResult {
  /** Whether sync succeeded */
  readonly success: boolean;
  /** Updated cycles used */
  readonly cyclesUsed?: number;
  /** Error if failed */
  readonly error?: Error;
  /** Whether operating on cached data */
  readonly usingCache?: boolean;
}

/**
 * Flush result for pending records
 */
export interface FlushResult {
  /** Whether flush succeeded */
  readonly success: boolean;
  /** Number of records flushed */
  readonly count?: number;
  /** Failed record IDs */
  readonly failed?: string[];
  /** Error if failed */
  readonly error?: Error;
  /** Whether will retry */
  readonly willRetry?: boolean;
}

/**
 * Checkout session for Stripe
 */
export interface CheckoutSession {
  /** Session ID */
  readonly id: string;
  /** Checkout URL to redirect user */
  readonly url: string;
  /** When session expires */
  readonly expiresAt: Date;
}

/**
 * Customer portal session for Stripe
 */
export interface PortalSession {
  /** Session ID */
  readonly id: string;
  /** Portal URL to redirect user */
  readonly url: string;
}

/**
 * Stripe webhook event types we handle
 */
export type StripeWebhookEvent =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'customer.subscription.trial_will_end';

/**
 * Processed webhook payload
 */
export interface WebhookPayload {
  /** Event type */
  readonly event: StripeWebhookEvent;
  /** Stripe customer ID */
  readonly customerId: string;
  /** Subscription data (if applicable) */
  readonly subscription?: {
    id: string;
    status: SubscriptionStatus;
    priceId: string;
    currentPeriodEnd: Date;
  } | undefined;
  /** Invoice data (if applicable) */
  readonly invoice?: {
    id: string;
    amountPaid: number;
    status: string;
  } | undefined;
}

/**
 * Billing error codes
 */
export enum BillingErrorCode {
  /** Subscription not found */
  SUBSCRIPTION_NOT_FOUND = 'SUBSCRIPTION_NOT_FOUND',
  /** Cycle limit exceeded */
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  /** Rate limit hit */
  RATE_LIMITED = 'RATE_LIMITED',
  /** Concurrent limit hit */
  CONCURRENT_LIMIT = 'CONCURRENT_LIMIT',
  /** Payment required */
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  /** Stripe API error */
  STRIPE_ERROR = 'STRIPE_ERROR',
  /** Invalid webhook signature */
  INVALID_WEBHOOK = 'INVALID_WEBHOOK',
  /** Subscription expired */
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
}

/**
 * Billing-specific error
 */
export class BillingError extends Error {
  constructor(
    message: string,
    public readonly code: BillingErrorCode,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'BillingError';
  }
}
