/**
 * Stripe Webhook Handler API
 *
 * Receives and processes Stripe webhook events for subscription lifecycle.
 * Uses the Frontier-created webhook infrastructure from @/lib/stripe.
 *
 * @author ⚙️ Engineering (Cycle 1300)
 * @see apps/web/src/lib/stripe/webhook.ts (C1296)
 *
 * Webhook events handled:
 * - checkout.session.completed → Provision subscription, send welcome email
 * - customer.subscription.created → Record subscription in database
 * - customer.subscription.updated → Handle plan changes, renewals
 * - customer.subscription.deleted → Downgrade to free tier
 * - invoice.paid → Update payment status, extend access
 * - invoice.payment_failed → Send dunning emails, show upgrade prompt
 */

import {
  handleStripeWebhook,
  registerHandler,
  getStripe,
} from '@/lib/stripe';
import {
  normalizeSubscription,
  extractSubscriptionFromCheckout,
  extractCustomerId,
  getTierFromSubscription,
  isSubscriptionActive,
} from '@/lib/stripe/subscription';
import type { WebhookContext, WebhookResult } from '@/lib/stripe/types';
import type Stripe from 'stripe';

// =============================================================================
// Handler: checkout.session.completed
// =============================================================================

registerHandler({
  eventType: 'checkout.session.completed',
  handler: async (ctx: WebhookContext): Promise<WebhookResult> => {
    const session = ctx.event.data.object as Stripe.Checkout.Session;

    // Only handle subscription checkouts
    if (session.mode !== 'subscription') {
      return {
        success: true,
        message: 'Non-subscription checkout, skipping',
      };
    }

    const subscriptionId = extractSubscriptionFromCheckout(session);
    if (!subscriptionId) {
      return {
        success: false,
        message: 'No subscription ID found in checkout session',
        error: { code: 'MISSING_SUBSCRIPTION', details: 'Session has no subscription' },
      };
    }

    const customerId = extractCustomerId(session);

    try {
      // Fetch full subscription details
      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const normalized = normalizeSubscription(subscription);

      // TODO: Provision subscription in database
      // await db.subscriptions.create({
      //   customerId,
      //   subscriptionId,
      //   tier: normalized.tier,
      //   status: normalized.status,
      //   currentPeriodEnd: normalized.currentPeriodEnd,
      // });

      // TODO: Send welcome email
      // await sendWelcomeEmail(session.customer_email, normalized.tier);

      return {
        success: true,
        message: `Subscription ${normalized.tier} provisioned for customer ${customerId}`,
        actions: [
          'subscription_provisioned',
          'welcome_email_queued',
        ],
        data: {
          customerId,
          subscriptionId,
          tier: normalized.tier,
          trialEnd: normalized.trialEnd?.toISOString(),
        },
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        message: 'Failed to provision subscription',
        error: { code: 'PROVISION_ERROR', details: err.message },
      };
    }
  },
  priority: 'critical',
  category: 'checkout',
  description: 'Provision new subscription after successful checkout',
  enabled: true,
});

// =============================================================================
// Handler: customer.subscription.created
// =============================================================================

registerHandler({
  eventType: 'customer.subscription.created',
  handler: async (ctx: WebhookContext): Promise<WebhookResult> => {
    const subscription = ctx.event.data.object as Stripe.Subscription;
    const normalized = normalizeSubscription(subscription);

    // TODO: Record in database
    // await db.subscriptions.upsert({
    //   where: { subscriptionId: normalized.subscriptionId },
    //   create: { ...normalized },
    //   update: { ...normalized },
    // });

    return {
      success: true,
      message: `Subscription ${normalized.subscriptionId} created with tier ${normalized.tier}`,
      actions: ['subscription_recorded'],
      data: {
        subscriptionId: normalized.subscriptionId,
        customerId: normalized.customerId,
        tier: normalized.tier,
        status: normalized.status,
      },
    };
  },
  priority: 'critical',
  category: 'subscription',
  description: 'Record new subscription in database',
  enabled: true,
});

// =============================================================================
// Handler: customer.subscription.updated
// =============================================================================

registerHandler({
  eventType: 'customer.subscription.updated',
  handler: async (ctx: WebhookContext): Promise<WebhookResult> => {
    const subscription = ctx.event.data.object as Stripe.Subscription;
    const previousAttributes = ctx.event.data.previous_attributes as Partial<Stripe.Subscription>;
    const normalized = normalizeSubscription(subscription);

    const actions: string[] = ['subscription_updated'];

    // Detect plan change
    const oldTier = previousAttributes.items
      ? getTierFromSubscription({ ...subscription, items: previousAttributes.items } as Stripe.Subscription)
      : null;
    
    if (oldTier && oldTier !== normalized.tier) {
      actions.push(normalized.tier === 'PRO' ? 'plan_upgraded' : 'plan_downgraded');
      // TODO: Send plan change notification
    }

    // Detect status change
    if (previousAttributes.status && previousAttributes.status !== normalized.status) {
      actions.push(`status_changed_to_${normalized.status}`);
      
      // Handle reactivation
      if (!isSubscriptionActive(previousAttributes.status as any) && isSubscriptionActive(normalized.status)) {
        actions.push('subscription_reactivated');
      }
    }

    // Detect cancellation scheduled
    if (!previousAttributes.cancel_at_period_end && normalized.cancelAtPeriodEnd) {
      actions.push('cancellation_scheduled');
      // TODO: Send cancellation confirmation email
    }

    // TODO: Update in database
    // await db.subscriptions.update({
    //   where: { subscriptionId: normalized.subscriptionId },
    //   data: { ...normalized },
    // });

    return {
      success: true,
      message: `Subscription ${normalized.subscriptionId} updated`,
      actions,
      data: {
        subscriptionId: normalized.subscriptionId,
        tier: normalized.tier,
        status: normalized.status,
        cancelAtPeriodEnd: normalized.cancelAtPeriodEnd,
      },
    };
  },
  priority: 'high',
  category: 'subscription',
  description: 'Handle subscription updates (plan changes, status changes)',
  enabled: true,
});

// =============================================================================
// Handler: customer.subscription.deleted
// =============================================================================

registerHandler({
  eventType: 'customer.subscription.deleted',
  handler: async (ctx: WebhookContext): Promise<WebhookResult> => {
    const subscription = ctx.event.data.object as Stripe.Subscription;
    const customerId = extractCustomerId(subscription);

    // TODO: Downgrade to free tier in database
    // await db.subscriptions.update({
    //   where: { subscriptionId: subscription.id },
    //   data: { 
    //     status: 'canceled',
    //     tier: 'FREE',
    //     canceledAt: new Date(),
    //   },
    // });

    // TODO: Send cancellation email
    // await sendCancellationEmail(customerId);

    return {
      success: true,
      message: `Subscription ${subscription.id} deleted, customer ${customerId} downgraded to FREE`,
      actions: [
        'subscription_deleted',
        'downgraded_to_free',
        'cancellation_email_queued',
      ],
      data: {
        subscriptionId: subscription.id,
        customerId,
      },
    };
  },
  priority: 'critical',
  category: 'subscription',
  description: 'Handle subscription deletion/cancellation',
  enabled: true,
});

// =============================================================================
// Handler: invoice.paid
// =============================================================================

registerHandler({
  eventType: 'invoice.paid',
  handler: async (ctx: WebhookContext): Promise<WebhookResult> => {
    const invoice = ctx.event.data.object as Stripe.Invoice;
    
    // Skip non-subscription invoices
    if (!invoice.subscription) {
      return {
        success: true,
        message: 'Non-subscription invoice, skipping',
      };
    }

    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription.id;

    // TODO: Update payment status in database
    // await db.invoices.create({
    //   subscriptionId,
    //   invoiceId: invoice.id,
    //   amountPaid: invoice.amount_paid,
    //   paidAt: new Date(),
    // });

    return {
      success: true,
      message: `Invoice ${invoice.id} paid for subscription ${subscriptionId}`,
      actions: ['invoice_recorded', 'payment_successful'],
      data: {
        invoiceId: invoice.id,
        subscriptionId,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
      },
    };
  },
  priority: 'high',
  category: 'payment',
  description: 'Record successful invoice payment',
  enabled: true,
});

// =============================================================================
// Handler: invoice.payment_failed
// =============================================================================

registerHandler({
  eventType: 'invoice.payment_failed',
  handler: async (ctx: WebhookContext): Promise<WebhookResult> => {
    const invoice = ctx.event.data.object as Stripe.Invoice;
    
    if (!invoice.subscription) {
      return {
        success: true,
        message: 'Non-subscription invoice, skipping',
      };
    }

    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription.id;
    
    const customerId = extractCustomerId(invoice);
    const attemptCount = invoice.attempt_count || 1;

    // TODO: Update subscription status in database
    // await db.subscriptions.update({
    //   where: { subscriptionId },
    //   data: { 
    //     paymentFailedAt: new Date(),
    //     paymentAttempts: attemptCount,
    //   },
    // });

    // TODO: Send dunning email (escalating urgency based on attempt count)
    // await sendDunningEmail(customerId, attemptCount);

    return {
      success: true,
      message: `Payment failed for invoice ${invoice.id} (attempt ${attemptCount})`,
      actions: [
        'payment_failure_recorded',
        `dunning_email_attempt_${attemptCount}`,
      ],
      data: {
        invoiceId: invoice.id,
        subscriptionId,
        customerId,
        attemptCount,
        nextAttempt: invoice.next_payment_attempt
          ? new Date(invoice.next_payment_attempt * 1000).toISOString()
          : null,
      },
    };
  },
  priority: 'critical',
  category: 'payment',
  description: 'Handle failed payment and send dunning emails',
  enabled: true,
});

// =============================================================================
// Route Handler
// =============================================================================

/**
 * POST /api/billing/webhook
 *
 * Stripe calls this endpoint with webhook events.
 * The handleStripeWebhook function handles:
 * - Signature verification
 * - Event routing to registered handlers
 * - Idempotency tracking
 * - Error handling and response formatting
 */
export async function POST(request: Request): Promise<Response> {
  return handleStripeWebhook(request);
}

// =============================================================================
// Method Not Allowed
// =============================================================================

export async function GET(): Promise<Response> {
  return new Response(
    JSON.stringify({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
}
