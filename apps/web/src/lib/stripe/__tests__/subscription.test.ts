/**
 * Stripe Subscription Utilities Tests
 *
 * @author 🌌 Frontier (Cycle 1296)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type Stripe from 'stripe';
import {
  getTierFromPriceId,
  getTierFromProductId,
  getTierFromSubscription,
  normalizeSubscription,
  addPaymentMethodDetails,
  isSubscriptionActive,
  isSubscriptionAtRisk,
  isSubscriptionTerminated,
  getStatusMessage,
  daysRemainingInPeriod,
  daysRemainingInTrial,
  shouldShowUpgradePrompt,
  extractSubscriptionFromCheckout,
  extractCustomerId,
  configureProducts,
} from '../subscription';
import type { NormalizedSubscription, SubscriptionStatus } from '../types';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockSubscription(
  overrides: Partial<Stripe.Subscription> = {}
): Stripe.Subscription {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: 'sub_test123',
    object: 'subscription',
    customer: 'cus_test456',
    status: 'active',
    current_period_start: now,
    current_period_end: now + 30 * 24 * 60 * 60, // 30 days
    cancel_at_period_end: false,
    cancel_at: null,
    trial_end: null,
    items: {
      object: 'list',
      data: [
        {
          id: 'si_test789',
          object: 'subscription_item',
          price: {
            id: 'price_pro_monthly',
            object: 'price',
            unit_amount: 4900,
            currency: 'usd',
            product: 'prod_pro',
            recurring: {
              interval: 'month',
              interval_count: 1,
            },
          } as Stripe.Price,
        } as Stripe.SubscriptionItem,
      ],
      has_more: false,
      url: '',
    },
    ...overrides,
  } as Stripe.Subscription;
}

function createMockCheckoutSession(
  overrides: Partial<Stripe.Checkout.Session> = {}
): Stripe.Checkout.Session {
  return {
    id: 'cs_test123',
    object: 'checkout.session',
    mode: 'subscription',
    subscription: 'sub_test123',
    customer: 'cus_test456',
    ...overrides,
  } as Stripe.Checkout.Session;
}

function createMockPaymentMethod(
  overrides: Partial<Stripe.PaymentMethod> = {}
): Stripe.PaymentMethod {
  return {
    id: 'pm_test123',
    object: 'payment_method',
    type: 'card',
    card: {
      brand: 'visa',
      last4: '4242',
      exp_month: 12,
      exp_year: 2030,
    },
    ...overrides,
  } as Stripe.PaymentMethod;
}

// =============================================================================
// Tier Detection Tests
// =============================================================================

describe('getTierFromPriceId', () => {
  beforeEach(() => {
    // Reset to defaults
    configureProducts({
      proProductId: 'prod_pro',
      enterpriseProductId: 'prod_enterprise',
      prices: [
        { priceId: 'price_pro_monthly', tier: 'PRO', interval: 'month', amount: 4900 },
        { priceId: 'price_pro_yearly', tier: 'PRO', interval: 'year', amount: 47040 },
      ],
    });
  });

  it('returns PRO for configured pro monthly price', () => {
    expect(getTierFromPriceId('price_pro_monthly')).toBe('PRO');
  });

  it('returns PRO for configured pro yearly price', () => {
    expect(getTierFromPriceId('price_pro_yearly')).toBe('PRO');
  });

  it('returns ENTERPRISE for price containing enterprise', () => {
    expect(getTierFromPriceId('price_enterprise_monthly')).toBe('ENTERPRISE');
  });

  it('returns PRO for price containing pro (fallback)', () => {
    expect(getTierFromPriceId('price_pro_custom')).toBe('PRO');
  });

  it('returns FREE for unknown price', () => {
    expect(getTierFromPriceId('price_unknown')).toBe('FREE');
  });
});

describe('getTierFromProductId', () => {
  beforeEach(() => {
    configureProducts({
      proProductId: 'prod_pro',
      enterpriseProductId: 'prod_enterprise',
    });
  });

  it('returns PRO for pro product', () => {
    expect(getTierFromProductId('prod_pro')).toBe('PRO');
  });

  it('returns ENTERPRISE for enterprise product', () => {
    expect(getTierFromProductId('prod_enterprise')).toBe('ENTERPRISE');
  });

  it('returns FREE for unknown product', () => {
    expect(getTierFromProductId('prod_unknown')).toBe('FREE');
  });
});

describe('getTierFromSubscription', () => {
  beforeEach(() => {
    configureProducts({
      proProductId: 'prod_pro',
      enterpriseProductId: 'prod_enterprise',
      prices: [
        { priceId: 'price_pro_monthly', tier: 'PRO', interval: 'month', amount: 4900 },
      ],
    });
  });

  it('returns tier from subscription items', () => {
    const sub = createMockSubscription();
    expect(getTierFromSubscription(sub)).toBe('PRO');
  });

  it('returns FREE for subscription with no items', () => {
    const sub = createMockSubscription({
      items: { object: 'list', data: [], has_more: false, url: '' },
    });
    expect(getTierFromSubscription(sub)).toBe('FREE');
  });

  it('falls back to product ID when price ID unknown', () => {
    const sub = createMockSubscription();
    sub.items.data[0].price.id = 'unknown_price';
    sub.items.data[0].price.product = 'prod_pro';
    expect(getTierFromSubscription(sub)).toBe('PRO');
  });
});

// =============================================================================
// Normalization Tests
// =============================================================================

describe('normalizeSubscription', () => {
  it('normalizes basic subscription', () => {
    const sub = createMockSubscription();
    const normalized = normalizeSubscription(sub);

    expect(normalized.subscriptionId).toBe('sub_test123');
    expect(normalized.customerId).toBe('cus_test456');
    expect(normalized.tier).toBe('PRO');
    expect(normalized.status).toBe('active');
    expect(normalized.cancelAtPeriodEnd).toBe(false);
    expect(normalized.priceInCents).toBe(4900);
    expect(normalized.interval).toBe('month');
  });

  it('handles customer object instead of string', () => {
    const sub = createMockSubscription({
      customer: { id: 'cus_object' } as Stripe.Customer,
    });
    const normalized = normalizeSubscription(sub);
    expect(normalized.customerId).toBe('cus_object');
  });

  it('includes trial end when present', () => {
    const trialEnd = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    const sub = createMockSubscription({
      status: 'trialing',
      trial_end: trialEnd,
    });
    const normalized = normalizeSubscription(sub);

    expect(normalized.status).toBe('trialing');
    expect(normalized.trialEnd).toBeInstanceOf(Date);
    expect(normalized.trialEnd?.getTime()).toBe(trialEnd * 1000);
  });

  it('includes cancel_at when scheduled', () => {
    const cancelAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const sub = createMockSubscription({
      cancel_at_period_end: true,
      cancel_at: cancelAt,
    });
    const normalized = normalizeSubscription(sub);

    expect(normalized.cancelAtPeriodEnd).toBe(true);
    expect(normalized.cancelAt).toBeInstanceOf(Date);
  });
});

describe('addPaymentMethodDetails', () => {
  it('adds card details to subscription', () => {
    const sub = normalizeSubscription(createMockSubscription());
    const pm = createMockPaymentMethod();
    const updated = addPaymentMethodDetails(sub, pm);

    expect(updated.paymentMethodLast4).toBe('4242');
    expect(updated.paymentMethodBrand).toBe('visa');
  });

  it('returns original subscription for null payment method', () => {
    const sub = normalizeSubscription(createMockSubscription());
    const updated = addPaymentMethodDetails(sub, null);

    expect(updated).toEqual(sub);
  });

  it('returns original subscription for non-card payment method', () => {
    const sub = normalizeSubscription(createMockSubscription());
    const pm = createMockPaymentMethod({ type: 'sepa_debit' as 'card', card: undefined });
    const updated = addPaymentMethodDetails(sub, pm);

    expect(updated.paymentMethodLast4).toBeUndefined();
  });
});

// =============================================================================
// Status Helper Tests
// =============================================================================

describe('isSubscriptionActive', () => {
  it.each([
    ['active', true],
    ['trialing', true],
    ['past_due', false],
    ['canceled', false],
    ['paused', false],
    ['incomplete', false],
    ['incomplete_expired', false],
  ])('returns %s for %s status', (status, expected) => {
    expect(isSubscriptionActive(status as SubscriptionStatus)).toBe(expected);
  });
});

describe('isSubscriptionAtRisk', () => {
  it.each([
    ['past_due', true],
    ['incomplete', true],
    ['active', false],
    ['canceled', false],
  ])('returns %s for %s status', (status, expected) => {
    expect(isSubscriptionAtRisk(status as SubscriptionStatus)).toBe(expected);
  });
});

describe('isSubscriptionTerminated', () => {
  it.each([
    ['canceled', true],
    ['incomplete_expired', true],
    ['active', false],
    ['past_due', false],
  ])('returns %s for %s status', (status, expected) => {
    expect(isSubscriptionTerminated(status as SubscriptionStatus)).toBe(expected);
  });
});

describe('getStatusMessage', () => {
  it('returns appropriate message for active', () => {
    expect(getStatusMessage('active')).toContain('active');
  });

  it('returns appropriate message for past_due', () => {
    expect(getStatusMessage('past_due')).toContain('past due');
  });

  it('returns appropriate message for canceled', () => {
    expect(getStatusMessage('canceled')).toContain('canceled');
  });
});

// =============================================================================
// Lifecycle Calculation Tests
// =============================================================================

describe('daysRemainingInPeriod', () => {
  it('calculates days remaining correctly', () => {
    const futureEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const sub: NormalizedSubscription = {
      subscriptionId: 'sub_test',
      customerId: 'cus_test',
      tier: 'PRO',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: futureEnd,
      cancelAtPeriodEnd: false,
      priceInCents: 4900,
      interval: 'month',
    };

    const days = daysRemainingInPeriod(sub);
    expect(days).toBeGreaterThanOrEqual(14);
    expect(days).toBeLessThanOrEqual(16);
  });

  it('returns 0 for past period end', () => {
    const pastEnd = new Date(Date.now() - 1000);
    const sub: NormalizedSubscription = {
      subscriptionId: 'sub_test',
      customerId: 'cus_test',
      tier: 'PRO',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: pastEnd,
      cancelAtPeriodEnd: false,
      priceInCents: 4900,
      interval: 'month',
    };

    expect(daysRemainingInPeriod(sub)).toBe(0);
  });
});

describe('daysRemainingInTrial', () => {
  it('returns null when no trial', () => {
    const sub: NormalizedSubscription = {
      subscriptionId: 'sub_test',
      customerId: 'cus_test',
      tier: 'PRO',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      priceInCents: 4900,
      interval: 'month',
      trialEnd: undefined,
    };

    expect(daysRemainingInTrial(sub)).toBeNull();
  });

  it('calculates trial days remaining', () => {
    const trialEnd = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const sub: NormalizedSubscription = {
      subscriptionId: 'sub_test',
      customerId: 'cus_test',
      tier: 'PRO',
      status: 'trialing',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      priceInCents: 4900,
      interval: 'month',
      trialEnd,
    };

    const days = daysRemainingInTrial(sub);
    expect(days).toBeGreaterThanOrEqual(4);
    expect(days).toBeLessThanOrEqual(6);
  });
});

describe('shouldShowUpgradePrompt', () => {
  it('returns true for FREE tier', () => {
    const sub: NormalizedSubscription = {
      subscriptionId: 'sub_test',
      customerId: 'cus_test',
      tier: 'FREE',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      priceInCents: 0,
      interval: 'month',
    };

    expect(shouldShowUpgradePrompt(sub)).toBe(true);
  });

  it('returns true for trial ending soon', () => {
    const trialEnd = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
    const sub: NormalizedSubscription = {
      subscriptionId: 'sub_test',
      customerId: 'cus_test',
      tier: 'PRO',
      status: 'trialing',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      priceInCents: 4900,
      interval: 'month',
      trialEnd,
    };

    expect(shouldShowUpgradePrompt(sub)).toBe(true);
  });

  it('returns false for active PRO subscription', () => {
    const sub: NormalizedSubscription = {
      subscriptionId: 'sub_test',
      customerId: 'cus_test',
      tier: 'PRO',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      priceInCents: 4900,
      interval: 'month',
    };

    expect(shouldShowUpgradePrompt(sub)).toBe(false);
  });
});

// =============================================================================
// Event Extractor Tests
// =============================================================================

describe('extractSubscriptionFromCheckout', () => {
  it('returns subscription ID from checkout session', () => {
    const session = createMockCheckoutSession();
    expect(extractSubscriptionFromCheckout(session)).toBe('sub_test123');
  });

  it('returns null for payment mode', () => {
    const session = createMockCheckoutSession({ mode: 'payment' });
    expect(extractSubscriptionFromCheckout(session)).toBeNull();
  });

  it('handles subscription object', () => {
    const session = createMockCheckoutSession({
      subscription: { id: 'sub_object' } as Stripe.Subscription,
    });
    expect(extractSubscriptionFromCheckout(session)).toBe('sub_object');
  });
});

describe('extractCustomerId', () => {
  it('extracts customer string from subscription', () => {
    const sub = createMockSubscription();
    expect(extractCustomerId(sub)).toBe('cus_test456');
  });

  it('extracts customer object ID', () => {
    const sub = createMockSubscription({
      customer: { id: 'cus_object' } as Stripe.Customer,
    });
    expect(extractCustomerId(sub)).toBe('cus_object');
  });
});
