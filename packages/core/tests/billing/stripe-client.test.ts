/**
 * @ada-ai/core - Stripe Client Tests
 *
 * Unit tests for the real Stripe client implementation.
 * Uses vitest mocking to avoid real API calls.
 *
 * Coverage target: 80%+ for stripe-client.ts
 *
 * @author 🔍 QA (C1229)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingError } from '../../src/billing/types.js';

// Create mock functions for all Stripe API methods
const mockCheckoutSessionsCreate = vi.fn();
const mockBillingPortalSessionsCreate = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();
const mockSubscriptionsUpdate = vi.fn();
const mockSubscriptionsCancel = vi.fn();
const mockWebhooksConstructEvent = vi.fn();

// Mock the stripe module
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: mockCheckoutSessionsCreate,
      },
    },
    billingPortal: {
      sessions: {
        create: mockBillingPortalSessionsCreate,
      },
    },
    subscriptions: {
      retrieve: mockSubscriptionsRetrieve,
      update: mockSubscriptionsUpdate,
      cancel: mockSubscriptionsCancel,
    },
    webhooks: {
      constructEvent: mockWebhooksConstructEvent,
    },
  })),
}));

// Import after mocking
import {
  createStripeClient,
  type StripeClient,
  type StripeClientConfig,
  type CreateCheckoutOptions,
  type CreatePortalOptions,
  type UpdateSubscriptionOptions,
} from '../../src/billing/stripe-client.js';

describe('createStripeClient', () => {
  const validConfig: StripeClientConfig = {
    secretKey: 'sk_test_abc123',
    webhookSecret: 'whsec_abc123',
  };

  const liveConfig: StripeClientConfig = {
    secretKey: 'sk_live_abc123',
    webhookSecret: 'whsec_abc123',
  };

  beforeEach(() => {
    // Reset mock call history but keep implementations
    mockCheckoutSessionsCreate.mockReset();
    mockBillingPortalSessionsCreate.mockReset();
    mockSubscriptionsRetrieve.mockReset();
    mockSubscriptionsUpdate.mockReset();
    mockSubscriptionsCancel.mockReset();
    mockWebhooksConstructEvent.mockReset();
  });

  describe('initialization', () => {
    it('should throw BillingError when secret key is missing', () => {
      expect(() =>
        createStripeClient({
          secretKey: '',
          webhookSecret: 'whsec_test',
        })
      ).toThrow(BillingError);

      expect(() =>
        createStripeClient({
          secretKey: '',
          webhookSecret: 'whsec_test',
        })
      ).toThrow('Stripe secret key is required');
    });

    it('should create client with valid test config', () => {
      const client = createStripeClient(validConfig);
      expect(client).toBeDefined();
      expect(client.isTestMode()).toBe(true);
    });

    it('should identify live mode correctly', () => {
      const client = createStripeClient(liveConfig);
      expect(client.isTestMode()).toBe(false);
    });
  });

  describe('createCheckoutSession', () => {
    let client: StripeClient;

    beforeEach(() => {
      client = createStripeClient(validConfig);
    });

    const validCheckoutOptions: CreateCheckoutOptions = {
      userId: 'user_123',
      tier: 'pro',
      period: 'monthly',
      successUrl: 'https://app.ada.dev/success',
      cancelUrl: 'https://app.ada.dev/cancel',
    };

    it('should create checkout session successfully', async () => {
      const mockSession = {
        id: 'cs_test_session123',
        url: 'https://checkout.stripe.com/pay/cs_test_session123',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };
      mockCheckoutSessionsCreate.mockResolvedValue(mockSession);

      const session = await client.createCheckoutSession(validCheckoutOptions);

      expect(session.id).toBe('cs_test_session123');
      expect(session.url).toBe('https://checkout.stripe.com/pay/cs_test_session123');
      expect(session.expiresAt).toBeInstanceOf(Date);
    });

    it('should include email when provided', async () => {
      const mockSession = {
        id: 'cs_test_email',
        url: 'https://checkout.stripe.com/pay/cs_test_email',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };
      mockCheckoutSessionsCreate.mockResolvedValue(mockSession);

      await client.createCheckoutSession({
        ...validCheckoutOptions,
        email: 'user@example.com',
      });

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_email: 'user@example.com',
        })
      );
    });

    it('should include trial for pro tier when requested', async () => {
      const mockSession = {
        id: 'cs_test_trial',
        url: 'https://checkout.stripe.com/pay/cs_test_trial',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };
      mockCheckoutSessionsCreate.mockResolvedValue(mockSession);

      await client.createCheckoutSession({
        ...validCheckoutOptions,
        includeTrial: true,
      });

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: expect.objectContaining({
            trial_period_days: 14,
          }),
        })
      );
    });

    it('should allow promotion codes when provided', async () => {
      const mockSession = {
        id: 'cs_test_promo',
        url: 'https://checkout.stripe.com/pay/cs_test_promo',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };
      mockCheckoutSessionsCreate.mockResolvedValue(mockSession);

      await client.createCheckoutSession({
        ...validCheckoutOptions,
        promotionCode: 'LAUNCH50',
      });

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          allow_promotion_codes: true,
        })
      );
    });

    it('should use annual price when period is annual', async () => {
      const mockSession = {
        id: 'cs_test_annual',
        url: 'https://checkout.stripe.com/pay/cs_test_annual',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };
      mockCheckoutSessionsCreate.mockResolvedValue(mockSession);

      await client.createCheckoutSession({
        ...validCheckoutOptions,
        period: 'annual',
      });

      expect(mockCheckoutSessionsCreate).toHaveBeenCalled();
    });

    it('should throw BillingError when Stripe API fails', async () => {
      mockCheckoutSessionsCreate.mockRejectedValue(new Error('Stripe API error'));

      await expect(client.createCheckoutSession(validCheckoutOptions)).rejects.toThrow(
        BillingError
      );
    });

    it('should throw BillingError for tier with no price ID', async () => {
      // Free tier has no Stripe price IDs
      await expect(
        client.createCheckoutSession({
          ...validCheckoutOptions,
          tier: 'free',
        })
      ).rejects.toThrow(BillingError);
    });
  });

  describe('createPortalSession', () => {
    let client: StripeClient;

    beforeEach(() => {
      client = createStripeClient(validConfig);
    });

    const validPortalOptions: CreatePortalOptions = {
      customerId: 'cus_abc123',
      returnUrl: 'https://app.ada.dev/billing',
    };

    it('should create portal session successfully', async () => {
      const mockSession = {
        id: 'bps_test_portal123',
        url: 'https://billing.stripe.com/session/bps_test_portal123',
      };
      mockBillingPortalSessionsCreate.mockResolvedValue(mockSession);

      const session = await client.createPortalSession(validPortalOptions);

      expect(session.id).toBe('bps_test_portal123');
      expect(session.url).toBe('https://billing.stripe.com/session/bps_test_portal123');
    });

    it('should throw BillingError when Stripe API fails', async () => {
      mockBillingPortalSessionsCreate.mockRejectedValue(new Error('Portal creation failed'));

      await expect(client.createPortalSession(validPortalOptions)).rejects.toThrow(BillingError);
    });
  });

  describe('updateSubscription', () => {
    let client: StripeClient;

    beforeEach(() => {
      client = createStripeClient(validConfig);
    });

    const validUpdateOptions: UpdateSubscriptionOptions = {
      subscriptionId: 'sub_abc123',
    };

    it('should update subscription with cancelAtPeriodEnd', async () => {
      mockSubscriptionsUpdate.mockResolvedValue({});

      await client.updateSubscription({
        ...validUpdateOptions,
        cancelAtPeriodEnd: true,
      });

      expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(
        'sub_abc123',
        expect.objectContaining({
          cancel_at_period_end: true,
        })
      );
    });

    it('should update subscription tier with proration', async () => {
      mockSubscriptionsRetrieve.mockResolvedValue({
        items: {
          data: [{ id: 'si_item123' }],
        },
      });
      mockSubscriptionsUpdate.mockResolvedValue({});

      await client.updateSubscription({
        ...validUpdateOptions,
        tier: 'team',
        period: 'monthly',
      });

      expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith('sub_abc123');
      expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(
        'sub_abc123',
        expect.objectContaining({
          proration_behavior: 'create_prorations',
        })
      );
    });

    it('should not call update when no changes provided', async () => {
      await client.updateSubscription(validUpdateOptions);

      expect(mockSubscriptionsUpdate).not.toHaveBeenCalled();
    });

    it('should throw BillingError when Stripe API fails', async () => {
      mockSubscriptionsUpdate.mockRejectedValue(new Error('Update failed'));

      await expect(
        client.updateSubscription({
          ...validUpdateOptions,
          cancelAtPeriodEnd: true,
        })
      ).rejects.toThrow(BillingError);
    });
  });

  describe('cancelSubscription', () => {
    let client: StripeClient;

    beforeEach(() => {
      client = createStripeClient(validConfig);
    });

    it('should cancel subscription successfully', async () => {
      mockSubscriptionsCancel.mockResolvedValue({});

      await expect(client.cancelSubscription('sub_abc123')).resolves.not.toThrow();
      expect(mockSubscriptionsCancel).toHaveBeenCalledWith('sub_abc123');
    });

    it('should throw BillingError when Stripe API fails', async () => {
      mockSubscriptionsCancel.mockRejectedValue(new Error('Cancellation failed'));

      await expect(client.cancelSubscription('sub_abc123')).rejects.toThrow(BillingError);
    });
  });

  describe('verifyWebhook', () => {
    let client: StripeClient;

    beforeEach(() => {
      client = createStripeClient(validConfig);
    });

    it('should verify checkout.session.completed webhook', async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_abc123',
            subscription: 'sub_abc123',
          },
        },
      });

      const result = await client.verifyWebhook('payload', 'sig_test');

      expect(result.event).toBe('checkout.session.completed');
      expect(result.customerId).toBe('cus_abc123');
      expect(result.subscription?.id).toBe('sub_abc123');
    });

    it('should verify customer.subscription.created webhook', async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_created123',
            customer: 'cus_abc123',
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
            items: {
              data: [{ price: { id: 'price_pro_monthly' } }],
            },
          },
        },
      });

      const result = await client.verifyWebhook('payload', 'sig_test');

      expect(result.event).toBe('customer.subscription.created');
      expect(result.subscription?.status).toBe('active');
    });

    it('should verify customer.subscription.updated webhook', async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_updated123',
            customer: 'cus_abc123',
            status: 'past_due',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
            items: {
              data: [{ price: { id: 'price_pro_monthly' } }],
            },
          },
        },
      });

      const result = await client.verifyWebhook('payload', 'sig_test');

      expect(result.event).toBe('customer.subscription.updated');
      expect(result.subscription?.status).toBe('past_due');
    });

    it('should verify customer.subscription.deleted webhook', async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_deleted123',
            customer: 'cus_abc123',
            status: 'canceled',
            current_period_end: Math.floor(Date.now() / 1000),
            items: {
              data: [{ price: { id: 'price_pro_monthly' } }],
            },
          },
        },
      });

      const result = await client.verifyWebhook('payload', 'sig_test');

      expect(result.event).toBe('customer.subscription.deleted');
      expect(result.subscription?.status).toBe('canceled');
    });

    it('should verify invoice.paid webhook', async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_paid123',
            customer: 'cus_abc123',
            amount_paid: 2900,
            status: 'paid',
          },
        },
      });

      const result = await client.verifyWebhook('payload', 'sig_test');

      expect(result.event).toBe('invoice.paid');
      expect(result.invoice?.amountPaid).toBe(2900);
    });

    it('should verify invoice.payment_failed webhook', async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_failed123',
            customer: 'cus_abc123',
            amount_paid: 0,
            status: 'open',
          },
        },
      });

      const result = await client.verifyWebhook('payload', 'sig_test');

      expect(result.event).toBe('invoice.payment_failed');
      expect(result.invoice?.status).toBe('open');
    });

    it('should verify customer.subscription.trial_will_end webhook', async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: 'customer.subscription.trial_will_end',
        data: {
          object: {
            id: 'sub_trial123',
            customer: 'cus_abc123',
            trial_end: Math.floor(Date.now() / 1000) + 259200,
            items: {
              data: [{ price: { id: 'price_pro_monthly' } }],
            },
          },
        },
      });

      const result = await client.verifyWebhook('payload', 'sig_test');

      expect(result.event).toBe('customer.subscription.trial_will_end');
      expect(result.subscription?.status).toBe('trialing');
    });

    it('should throw BillingError for unhandled webhook event', async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: 'some.unhandled.event',
        data: { object: {} },
      });

      await expect(client.verifyWebhook('payload', 'sig_test')).rejects.toThrow(BillingError);
    });

    it('should throw BillingError when webhook verification fails', async () => {
      mockWebhooksConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(client.verifyWebhook('payload', 'invalid_sig')).rejects.toThrow(BillingError);
    });

    it('should handle Buffer payload', async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_buffer123',
            subscription: null,
          },
        },
      });

      const bufferPayload = Buffer.from('{"test":"data"}');
      const result = await client.verifyWebhook(bufferPayload, 'sig_test');

      expect(result.event).toBe('checkout.session.completed');
      expect(result.customerId).toBe('cus_buffer123');
    });
  });

  describe('getSubscription', () => {
    let client: StripeClient;

    beforeEach(() => {
      client = createStripeClient(validConfig);
    });

    it('should get subscription details successfully', async () => {
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_get123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        cancel_at_period_end: false,
      });

      const subscription = await client.getSubscription('sub_get123');

      expect(subscription.id).toBe('sub_get123');
      expect(subscription.status).toBe('active');
      expect(subscription.currentPeriodEnd).toBeInstanceOf(Date);
      expect(subscription.cancelAtPeriodEnd).toBe(false);
    });

    it('should map trialing status correctly', async () => {
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_trial',
        status: 'trialing',
        current_period_end: Math.floor(Date.now() / 1000) + 1209600,
        cancel_at_period_end: false,
      });

      const subscription = await client.getSubscription('sub_trial');
      expect(subscription.status).toBe('trialing');
    });

    it('should map past_due status correctly', async () => {
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_pastdue',
        status: 'past_due',
        current_period_end: Math.floor(Date.now() / 1000) - 86400,
        cancel_at_period_end: false,
      });

      const subscription = await client.getSubscription('sub_pastdue');
      expect(subscription.status).toBe('past_due');
    });

    it('should map incomplete status correctly', async () => {
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_incomplete',
        status: 'incomplete',
        current_period_end: Math.floor(Date.now() / 1000),
        cancel_at_period_end: false,
      });

      const subscription = await client.getSubscription('sub_incomplete');
      expect(subscription.status).toBe('incomplete');
    });

    it('should map paused status correctly', async () => {
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_paused',
        status: 'paused',
        current_period_end: Math.floor(Date.now() / 1000),
        cancel_at_period_end: true,
      });

      const subscription = await client.getSubscription('sub_paused');
      expect(subscription.status).toBe('paused');
    });

    it('should throw BillingError when Stripe API fails', async () => {
      mockSubscriptionsRetrieve.mockRejectedValue(new Error('Subscription not found'));

      await expect(client.getSubscription('sub_nonexistent')).rejects.toThrow(BillingError);
    });

    it('should default unknown status to active', async () => {
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_unknown',
        status: 'some_future_status',
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        cancel_at_period_end: false,
      });

      const subscription = await client.getSubscription('sub_unknown');
      expect(subscription.status).toBe('active');
    });
  });
});
