/**
 * ADA Stripe Integration
 *
 * Platform infrastructure for Stripe webhook handling, subscription management,
 * and billing integration. Engineering imports this for API route implementation.
 *
 * @author 🌌 Frontier (Cycle 1296)
 *
 * ## Quick Start
 *
 * ```typescript
 * // 1. Create webhook route (app/api/webhooks/stripe/route.ts)
 * import { handleStripeWebhook, registerHandler } from '@/lib/stripe';
 *
 * // 2. Register handlers before any requests
 * registerHandler({
 *   eventType: 'customer.subscription.created',
 *   handler: async (ctx) => {
 *     const sub = normalizeSubscription(ctx.event.data.object);
 *     // Provision user, update database, etc.
 *     return { success: true, message: `Provisioned ${sub.tier} for ${sub.customerId}` };
 *   },
 *   priority: 'critical',
 *   category: 'subscription',
 *   description: 'Provision new subscription',
 *   enabled: true,
 * });
 *
 * // 3. Export handler
 * export async function POST(req: Request) {
 *   return handleStripeWebhook(req);
 * }
 * ```
 *
 * ## Environment Variables
 *
 * Required:
 * - STRIPE_SECRET_KEY — Stripe API secret key
 * - STRIPE_WEBHOOK_SECRET — Webhook endpoint signing secret
 *
 * Optional:
 * - STRIPE_PRO_PRODUCT_ID — Product ID for Pro tier
 * - STRIPE_PRO_MONTHLY_PRICE_ID — Monthly Pro price ID
 * - STRIPE_PRO_YEARLY_PRICE_ID — Yearly Pro price ID
 * - STRIPE_ENTERPRISE_PRODUCT_ID — Product ID for Enterprise
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Event handling
  HandledEventType,
  EventPriority,
  EventCategory,
  WebhookContext,
  WebhookResult,
  WebhookHandler,
  HandlerRegistration,
  // Verification
  VerificationResult,
  WebhookConfig,
  // Idempotency
  ProcessedEvent,
  IdempotencyStore,
  // Subscription
  AdaTier,
  SubscriptionStatus,
  NormalizedSubscription,
  PriceMapping,
  ProductConfig,
} from './types';

export { HANDLED_EVENTS } from './types';

// =============================================================================
// Webhook Handling
// =============================================================================

export {
  // Stripe client
  getStripe,
  // Configuration
  configureWebhook,
  // Signature verification
  verifyWebhookSignature,
  // Handler registry
  registerHandler,
  getHandler,
  listHandlers,
  clearHandlers,
  // Idempotency
  setIdempotencyStore,
  InMemoryIdempotencyStore,
  // Main handler
  handleStripeWebhook,
  // Event type guards
  isSubscriptionEvent,
  isInvoiceEvent,
  isCustomerEvent,
  isCheckoutEvent,
  getEventCategory,
} from './webhook';

// =============================================================================
// Subscription Management
// =============================================================================

export {
  // Configuration
  configureProducts,
  // Tier detection
  getTierFromPriceId,
  getTierFromProductId,
  getTierFromSubscription,
  // Normalization
  normalizeSubscription,
  addPaymentMethodDetails,
  // Status helpers
  isSubscriptionActive,
  isSubscriptionAtRisk,
  isSubscriptionTerminated,
  getStatusMessage,
  // Lifecycle
  daysRemainingInPeriod,
  daysRemainingInTrial,
  shouldShowUpgradePrompt,
  // Event extractors
  extractSubscriptionFromCheckout,
  extractCustomerId,
} from './subscription';
