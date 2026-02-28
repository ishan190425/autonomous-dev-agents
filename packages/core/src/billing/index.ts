/**
 * @ada-ai/core - Billing Module
 *
 * Complete billing infrastructure for ADA SaaS.
 *
 * Components:
 * - Types: Subscription, usage, and billing types
 * - Constants: Tier configuration, pricing, limits
 * - Stripe Client: Checkout, portal, webhook handling
 *
 * Usage:
 * ```typescript
 * import {
 *   createStripeClient,
 *   TIER_CONFIG,
 *   type Subscription,
 *   type Tier,
 * } from '@ada-ai/core/billing';
 * ```
 *
 * @see docs/architecture/adr-usage-metering-architecture-c1186.md
 * @see docs/architecture/saas-tier-technical-spec-c1185.md
 */

// Types
export type {
  Tier,
  BillingPeriod,
  SubscriptionStatus,
  TierConfig,
  Subscription,
  CycleUsageRecord,
  PreDispatchResult,
  RateLimitResult,
  AcquireSlotResult,
  RecordResult,
  BatchRecordResult,
  SyncResult,
  FlushResult,
  CheckoutSession,
  PortalSession,
  StripeWebhookEvent,
  WebhookPayload,
} from './types.js';

export { BillingError, BillingErrorCode } from './types.js';

// Constants
export {
  TIER_CONFIG,
  DEFAULT_TIER,
  TRIAL_DURATION_DAYS,
  LIMIT_GRACE_PERCENTAGE,
  CACHE_STALE_THRESHOLD_MS,
  MAX_RECORD_RETRIES,
  IDEMPOTENCY_KEY_TTL_SECONDS,
  MAX_DISPATCH_DURATION_SECONDS,
  STRIPE_WEBHOOK_TOLERANCE_SECONDS,
  WARNING_THRESHOLDS,
  TOKEN_RATES,
  calculateCycleCost,
  getUsageWarning,
  tierAllows,
  getUpgradeRecommendation,
} from './constants.js';

// Stripe Client
export type {
  StripeClientConfig,
  StripeClient,
  CreateCheckoutOptions,
  CreatePortalOptions,
  UpdateSubscriptionOptions,
} from './stripe-client.js';

export { createStripeClient, createMockStripeClient } from './stripe-client.js';

// ============================================================================
// Conversion Platform Types (C1266)
// ============================================================================

// Plan Types (for conversion tracking)
export type {
  PlanTier,
  PlanBillingInterval,
  PlanLimits,
  PlanFeatures,
  PlanPricing,
  Plan,
  MilestoneTrialInfo,
  InvoiceStatus,
  InvoiceLineItem,
  InvoiceTax,
  Invoice,
  PaymentMethodType,
  CardBrand,
  PaymentMethod,
  BillingEventType,
  BillingEvent,
  BillingCustomer,
  TrialDaysConfig,
} from './plan-types.js';

export {
  DEFAULT_PLANS,
  DEFAULT_TRIAL_CONFIG,
  isFreePlanTier,
  hasTrialBonuses,
  getPlanById,
  getPlanByTier,
} from './plan-types.js';

// Milestone Trial Manager
export type {
  MilestoneBonusResult,
  CreateTrialOptions,
  TrialStatusResult,
} from './milestone-trial.js';

export {
  MilestoneTrialManager,
  MockMilestoneTrialManager,
  createMilestoneTrialManager,
  createTrial,
  applyMilestoneBonus,
  createMockMilestoneTrialManager,
} from './milestone-trial.js';
