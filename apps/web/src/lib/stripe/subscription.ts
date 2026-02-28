/**
 * Stripe Subscription Utilities
 *
 * Helpers for normalizing Stripe subscription data, extracting tier information,
 * and managing subscription lifecycle events.
 *
 * @author 🌌 Frontier (Cycle 1296)
 *
 * @example
 * import { normalizeSubscription, getTierFromPrice } from '@/lib/stripe';
 *
 * // In subscription.created handler
 * const sub = event.data.object as Stripe.Subscription;
 * const normalized = normalizeSubscription(sub);
 * console.log(normalized.tier); // 'PRO'
 */

import type Stripe from 'stripe';
import type {
  AdaTier,
  NormalizedSubscription,
  SubscriptionStatus,
  PriceMapping,
  ProductConfig,
} from './types';

// =============================================================================
// Price Configuration
// =============================================================================

/**
 * Default price mappings (configure via environment or database)
 */
const DEFAULT_PRICES: PriceMapping[] = [
  // Pro Monthly
  {
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
    tier: 'PRO',
    interval: 'month',
    amount: 4900, // $49.00
  },
  // Pro Yearly (20% discount = $39.20/mo = $470.40/yr)
  {
    priceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
    tier: 'PRO',
    interval: 'year',
    amount: 47040, // $470.40
  },
];

const DEFAULT_PRODUCT_CONFIG: ProductConfig = {
  proProductId: process.env.STRIPE_PRO_PRODUCT_ID || 'prod_pro',
  enterpriseProductId: process.env.STRIPE_ENTERPRISE_PRODUCT_ID || 'prod_enterprise',
  prices: DEFAULT_PRICES,
};

let productConfig: ProductConfig = { ...DEFAULT_PRODUCT_CONFIG };

/**
 * Configure product/price mappings
 */
export function configureProducts(config: Partial<ProductConfig>): void {
  productConfig = {
    ...productConfig,
    ...config,
    prices: config.prices || productConfig.prices,
  };
}

// =============================================================================
// Tier Detection
// =============================================================================

/**
 * Get ADA tier from Stripe price ID
 */
export function getTierFromPriceId(priceId: string): AdaTier {
  const mapping = productConfig.prices.find((p) => p.priceId === priceId);
  if (mapping) {
    return mapping.tier;
  }

  // Fallback: check product IDs in the price name
  if (priceId.includes('enterprise')) {
    return 'ENTERPRISE';
  }
  if (priceId.includes('pro')) {
    return 'PRO';
  }

  // Default to FREE if unknown
  return 'FREE';
}

/**
 * Get ADA tier from Stripe product ID
 */
export function getTierFromProductId(productId: string): AdaTier {
  if (productId === productConfig.enterpriseProductId) {
    return 'ENTERPRISE';
  }
  if (productId === productConfig.proProductId) {
    return 'PRO';
  }
  return 'FREE';
}

/**
 * Get ADA tier from subscription
 */
export function getTierFromSubscription(subscription: Stripe.Subscription): AdaTier {
  // Check the first item's price
  const item = subscription.items.data[0];
  if (!item) {
    return 'FREE';
  }

  // Try price ID first
  const tier = getTierFromPriceId(item.price.id);
  if (tier !== 'FREE') {
    return tier;
  }

  // Try product ID
  const productId =
    typeof item.price.product === 'string'
      ? item.price.product
      : (item.price.product as Stripe.Product).id;

  return getTierFromProductId(productId);
}

// =============================================================================
// Subscription Normalization
// =============================================================================

/**
 * Normalize Stripe subscription to ADA format
 *
 * Extracts key fields and converts to consistent types for database storage.
 */
export function normalizeSubscription(subscription: Stripe.Subscription): NormalizedSubscription {
  const item = subscription.items.data[0];
  const price = item?.price;

  return {
    subscriptionId: subscription.id,
    customerId:
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id,
    tier: getTierFromSubscription(subscription),
    status: subscription.status as SubscriptionStatus,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : undefined,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
    priceInCents: price?.unit_amount || 0,
    interval: (price?.recurring?.interval as 'month' | 'year') || 'month',
    // Payment method details would come from default_payment_method expansion
    paymentMethodLast4: undefined,
    paymentMethodBrand: undefined,
  };
}

/**
 * Add payment method details to normalized subscription
 */
export function addPaymentMethodDetails(
  subscription: NormalizedSubscription,
  paymentMethod: Stripe.PaymentMethod | null
): NormalizedSubscription {
  if (!paymentMethod || paymentMethod.type !== 'card' || !paymentMethod.card) {
    return subscription;
  }

  return {
    ...subscription,
    paymentMethodLast4: paymentMethod.card.last4,
    paymentMethodBrand: paymentMethod.card.brand,
  };
}

// =============================================================================
// Status Helpers
// =============================================================================

/**
 * Check if subscription is active (can use service)
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing';
}

/**
 * Check if subscription needs attention
 */
export function isSubscriptionAtRisk(status: SubscriptionStatus): boolean {
  return status === 'past_due' || status === 'incomplete';
}

/**
 * Check if subscription is terminated
 */
export function isSubscriptionTerminated(status: SubscriptionStatus): boolean {
  return status === 'canceled' || status === 'incomplete_expired';
}

/**
 * Get human-readable status message
 */
export function getStatusMessage(status: SubscriptionStatus): string {
  switch (status) {
    case 'active':
      return 'Your subscription is active';
    case 'trialing':
      return 'Your trial is active';
    case 'past_due':
      return 'Payment past due — please update your payment method';
    case 'paused':
      return 'Your subscription is paused';
    case 'canceled':
      return 'Your subscription has been canceled';
    case 'incomplete':
      return 'Payment required to activate subscription';
    case 'incomplete_expired':
      return 'Subscription expired due to incomplete payment';
    default:
      return 'Unknown subscription status';
  }
}

// =============================================================================
// Lifecycle Calculations
// =============================================================================

/**
 * Calculate days remaining in current period
 */
export function daysRemainingInPeriod(subscription: NormalizedSubscription): number {
  const now = Date.now();
  const end = subscription.currentPeriodEnd.getTime();
  const remaining = end - now;
  return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
}

/**
 * Calculate days remaining in trial
 */
export function daysRemainingInTrial(subscription: NormalizedSubscription): number | null {
  if (!subscription.trialEnd) {
    return null;
  }
  const now = Date.now();
  const end = subscription.trialEnd.getTime();
  const remaining = end - now;
  return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
}

/**
 * Check if subscription should show upgrade prompt
 */
export function shouldShowUpgradePrompt(subscription: NormalizedSubscription): boolean {
  // Show if on free tier
  if (subscription.tier === 'FREE') {
    return true;
  }

  // Show if trial ending soon (< 3 days)
  const trialDays = daysRemainingInTrial(subscription);
  if (trialDays !== null && trialDays <= 3) {
    return true;
  }

  return false;
}

// =============================================================================
// Event Payload Extractors
// =============================================================================

/**
 * Extract subscription from checkout.session.completed event
 */
export function extractSubscriptionFromCheckout(
  session: Stripe.Checkout.Session
): string | null {
  if (session.mode !== 'subscription') {
    return null;
  }
  return typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id || null;
}

/**
 * Extract customer from event data
 */
export function extractCustomerId(
  data: Stripe.Subscription | Stripe.Invoice | Stripe.Checkout.Session
): string {
  const customer = data.customer;
  return typeof customer === 'string' ? customer : customer?.id || '';
}
