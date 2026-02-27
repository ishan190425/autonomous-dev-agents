/**
 * @ada-ai/core - Stripe Client
 *
 * Stripe SDK wrapper for ADA SaaS billing.
 * Provides checkout, subscription management, and webhook handling.
 *
 * Usage:
 * ```typescript
 * import { createStripeClient } from '@ada-ai/core/billing';
 *
 * const stripe = createStripeClient({
 *   secretKey: process.env.STRIPE_SECRET_KEY!,
 *   webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
 * });
 *
 * // Create checkout session
 * const session = await stripe.createCheckoutSession({
 *   userId: 'user_123',
 *   tier: 'pro',
 *   period: 'monthly',
 *   successUrl: 'https://app.ada.dev/billing/success',
 *   cancelUrl: 'https://app.ada.dev/billing/cancel',
 * });
 * ```
 *
 * @see docs/architecture/adr-usage-metering-architecture-c1186.md
 */

import type {
  Tier,
  BillingPeriod,
  CheckoutSession,
  PortalSession,
  WebhookPayload,
  StripeWebhookEvent,
  SubscriptionStatus,
} from './types.js';
import { BillingError, BillingErrorCode } from './types.js';
import { TIER_CONFIG, STRIPE_WEBHOOK_TOLERANCE_SECONDS } from './constants.js';

/**
 * Stripe client configuration
 */
export interface StripeClientConfig {
  /** Stripe secret key (sk_test_... or sk_live_...) */
  secretKey: string;
  /** Stripe webhook signing secret (whsec_...) */
  webhookSecret: string;
  /** API version (optional, defaults to latest) */
  apiVersion?: string;
}

/**
 * Checkout session creation options
 */
export interface CreateCheckoutOptions {
  /** Internal user ID */
  userId: string;
  /** User email (for Stripe customer) */
  email?: string;
  /** Target tier */
  tier: Tier;
  /** Billing period */
  period: BillingPeriod;
  /** URL to redirect on success */
  successUrl: string;
  /** URL to redirect on cancel */
  cancelUrl: string;
  /** Include trial period */
  includeTrial?: boolean;
  /** Promotion code to apply */
  promotionCode?: string;
}

/**
 * Portal session creation options
 */
export interface CreatePortalOptions {
  /** Stripe customer ID */
  customerId: string;
  /** URL to redirect after portal */
  returnUrl: string;
}

/**
 * Subscription update options
 */
export interface UpdateSubscriptionOptions {
  /** Stripe subscription ID */
  subscriptionId: string;
  /** New tier (if changing) */
  tier?: Tier;
  /** New period (if changing) */
  period?: BillingPeriod;
  /** Cancel at period end */
  cancelAtPeriodEnd?: boolean;
}

/**
 * Stripe client interface
 *
 * Abstracted interface allows for:
 * - Easy mocking in tests
 * - Future provider switching
 * - Test mode vs live mode handling
 */
export interface StripeClient {
  /**
   * Create a Stripe Checkout session for new subscription
   */
  createCheckoutSession(options: CreateCheckoutOptions): Promise<CheckoutSession>;

  /**
   * Create a Customer Portal session for managing subscription
   */
  createPortalSession(options: CreatePortalOptions): Promise<PortalSession>;

  /**
   * Update an existing subscription
   */
  updateSubscription(options: UpdateSubscriptionOptions): Promise<void>;

  /**
   * Cancel a subscription immediately
   */
  cancelSubscription(subscriptionId: string): Promise<void>;

  /**
   * Verify and parse a webhook payload
   */
  verifyWebhook(payload: string | Buffer, signature: string): Promise<WebhookPayload>;

  /**
   * Get subscription details from Stripe
   */
  getSubscription(subscriptionId: string): Promise<{
    id: string;
    status: SubscriptionStatus;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  }>;

  /**
   * Check if running in test mode
   */
  isTestMode(): boolean;
}

/**
 * Create a Stripe client instance
 *
 * Lazy-loads the Stripe SDK to avoid bundling issues.
 * In test mode, uses sk_test_* keys which hit Stripe's test environment.
 */
export function createStripeClient(config: StripeClientConfig): StripeClient {
  // Validate config
  if (!config.secretKey) {
    throw new BillingError(
      'Stripe secret key is required',
      BillingErrorCode.STRIPE_ERROR
    );
  }

  const isTestMode = config.secretKey.startsWith('sk_test_');

  // Lazy-load Stripe SDK
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe instance type varies by version
  let stripeInstance: any = null;
  const getStripe = async (): Promise<import('stripe').default> => {
    if (!stripeInstance) {
      // Dynamic import to avoid bundling Stripe in non-billing code paths
      const { default: Stripe } = await import('stripe');
      stripeInstance = new Stripe(config.secretKey, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API version string literal
        apiVersion: (config.apiVersion as any) || '2024-12-18.acacia',
        typescript: true,
      });
    }
    return stripeInstance;
  };

  return {
    async createCheckoutSession(options: CreateCheckoutOptions): Promise<CheckoutSession> {
      const stripe = await getStripe();
      const tierConfig = TIER_CONFIG[options.tier];

      // Get price ID for tier + period
      const priceId =
        options.period === 'annual'
          ? tierConfig.stripePriceIds.annual
          : tierConfig.stripePriceIds.monthly;

      if (!priceId) {
        throw new BillingError(
          `No Stripe price configured for ${options.tier} ${options.period}`,
          BillingErrorCode.STRIPE_ERROR
        );
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe session config is complex
        const sessionConfig: any = {
          mode: 'subscription',
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          success_url: `${options.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: options.cancelUrl,
          metadata: {
            userId: options.userId,
            tier: options.tier,
          },
          subscription_data: {
            metadata: {
              userId: options.userId,
              tier: options.tier,
            },
          },
        };

        // Add email if provided
        if (options.email) {
          sessionConfig.customer_email = options.email;
        }

        // Add trial if requested and tier supports it
        if (options.includeTrial && options.tier === 'pro') {
          sessionConfig.subscription_data.trial_period_days = 14;
        }

        // Add promotion code if provided
        if (options.promotionCode) {
          sessionConfig.allow_promotion_codes = true;
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        return {
          id: session.id,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Stripe always returns URL
          url: session.url!,
          expiresAt: new Date(session.expires_at * 1000),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe error type
      } catch (error: any) {
        throw new BillingError(
          `Stripe checkout failed: ${error.message}`,
          BillingErrorCode.STRIPE_ERROR
        );
      }
    },

    async createPortalSession(options: CreatePortalOptions): Promise<PortalSession> {
      const stripe = await getStripe();

      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: options.customerId,
          return_url: options.returnUrl,
        });

        return {
          id: session.id,
          url: session.url,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe error type
      } catch (error: any) {
        throw new BillingError(
          `Stripe portal failed: ${error.message}`,
          BillingErrorCode.STRIPE_ERROR
        );
      }
    },

    async updateSubscription(options: UpdateSubscriptionOptions): Promise<void> {
      const stripe = await getStripe();

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe update params are complex
        const updates: any = {};

        if (options.cancelAtPeriodEnd !== undefined) {
          updates.cancel_at_period_end = options.cancelAtPeriodEnd;
        }

        if (options.tier) {
          const tierConfig = TIER_CONFIG[options.tier];
          const priceId =
            options.period === 'annual'
              ? tierConfig.stripePriceIds.annual
              : tierConfig.stripePriceIds.monthly;

          if (priceId) {
            // Get current subscription to find item ID
            const subscription = await stripe.subscriptions.retrieve(options.subscriptionId);
            const itemId = subscription.items.data[0]?.id;

            if (itemId) {
              updates.items = [{ id: itemId, price: priceId }];
              updates.proration_behavior = 'create_prorations';
            }
          }
        }

        if (Object.keys(updates).length > 0) {
          await stripe.subscriptions.update(options.subscriptionId, updates);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe error type
      } catch (error: any) {
        throw new BillingError(
          `Stripe subscription update failed: ${error.message}`,
          BillingErrorCode.STRIPE_ERROR
        );
      }
    },

    async cancelSubscription(subscriptionId: string): Promise<void> {
      const stripe = await getStripe();

      try {
        await stripe.subscriptions.cancel(subscriptionId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe error type
      } catch (error: any) {
        throw new BillingError(
          `Stripe cancellation failed: ${error.message}`,
          BillingErrorCode.STRIPE_ERROR
        );
      }
    },

    async verifyWebhook(payload: string | Buffer, signature: string): Promise<WebhookPayload> {
      const stripe = await getStripe();

      try {
        const event = stripe.webhooks.constructEvent(
          payload,
          signature,
          config.webhookSecret,
          STRIPE_WEBHOOK_TOLERANCE_SECONDS
        );

        // Map Stripe event to our webhook payload
        const eventType = event.type as StripeWebhookEvent;

        switch (eventType) {
          case 'checkout.session.completed': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe event data
            const session = event.data.object as any;
            return {
              event: eventType,
              customerId: session.customer,
              subscription: session.subscription
                ? {
                    id: session.subscription,
                    status: 'active',
                    priceId: '', // Will be fetched if needed
                    currentPeriodEnd: new Date(),
                  }
                : undefined,
            };
          }

          case 'customer.subscription.created':
          case 'customer.subscription.updated':
          case 'customer.subscription.deleted': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe event data
            const sub = event.data.object as any;
            return {
              event: eventType,
              customerId: sub.customer,
              subscription: {
                id: sub.id,
                status: mapStripeStatus(sub.status),
                priceId: sub.items.data[0]?.price?.id || '',
                currentPeriodEnd: new Date(sub.current_period_end * 1000),
              },
            };
          }

          case 'invoice.paid':
          case 'invoice.payment_failed': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe event data
            const invoice = event.data.object as any;
            return {
              event: eventType,
              customerId: invoice.customer,
              invoice: {
                id: invoice.id,
                amountPaid: invoice.amount_paid,
                status: invoice.status,
              },
            };
          }

          case 'customer.subscription.trial_will_end': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe event data
            const sub = event.data.object as any;
            return {
              event: eventType,
              customerId: sub.customer,
              subscription: {
                id: sub.id,
                status: 'trialing',
                priceId: sub.items.data[0]?.price?.id || '',
                currentPeriodEnd: new Date(sub.trial_end * 1000),
              },
            };
          }

          default:
            throw new BillingError(
              `Unhandled webhook event: ${event.type}`,
              BillingErrorCode.INVALID_WEBHOOK
            );
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe error type
      } catch (error: any) {
        if (error instanceof BillingError) throw error;
        throw new BillingError(
          `Webhook verification failed: ${error.message}`,
          BillingErrorCode.INVALID_WEBHOOK
        );
      }
    },

    async getSubscription(subscriptionId: string): Promise<{
      id: string;
      status: SubscriptionStatus;
      currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean;
    }> {
      const stripe = await getStripe();

      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        return {
          id: subscription.id,
          status: mapStripeStatus(subscription.status),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe error type
      } catch (error: any) {
        throw new BillingError(
          `Failed to fetch subscription: ${error.message}`,
          BillingErrorCode.STRIPE_ERROR
        );
      }
    },

    isTestMode(): boolean {
      return isTestMode;
    },
  };
}

/**
 * Map Stripe subscription status to our status type
 */
function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  const mapping: Record<string, SubscriptionStatus> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete_expired',
    paused: 'paused',
  };
  return mapping[stripeStatus] || 'active';
}

/**
 * Create a mock Stripe client for testing
 *
 * Returns a client that doesn't make real API calls.
 * Use in unit tests and development without Stripe keys.
 */
export function createMockStripeClient(): StripeClient {
  return {
    createCheckoutSession(options: CreateCheckoutOptions): Promise<CheckoutSession> {
      return Promise.resolve({
        id: `cs_test_${Date.now()}`,
        url: `https://checkout.stripe.com/test/${options.tier}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    },

    createPortalSession(): Promise<PortalSession> {
      return Promise.resolve({
        id: `bps_test_${Date.now()}`,
        url: 'https://billing.stripe.com/test/portal',
      });
    },

    updateSubscription(): Promise<void> {
      // No-op in mock
      return Promise.resolve();
    },

    cancelSubscription(): Promise<void> {
      // No-op in mock
      return Promise.resolve();
    },

    verifyWebhook(payload: string | Buffer): Promise<WebhookPayload> {
      // In mock mode, just parse the JSON
      const data = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString());
      return Promise.resolve(data as WebhookPayload);
    },

    getSubscription(subscriptionId: string): Promise<{
      id: string;
      status: SubscriptionStatus;
      currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean;
    }> {
      return Promise.resolve({
        id: subscriptionId,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
      });
    },

    isTestMode(): boolean {
      return true;
    },
  };
}
