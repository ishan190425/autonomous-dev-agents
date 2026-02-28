/**
 * Subscription Status API
 *
 * Returns the current user's subscription status.
 * Used by the dashboard to show billing info and feature gates.
 *
 * @author ⚙️ Engineering (Cycle 1300)
 * @see docs/architecture/adr-api-gateway-c1276.md
 *
 * @example
 * // Get subscription status
 * const res = await fetch('/api/billing/subscription');
 * const { subscription, features } = await res.json();
 *
 * if (subscription.tier === 'PRO') {
 *   // Show pro features
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';
import {
  normalizeSubscription,
  addPaymentMethodDetails,
  daysRemainingInPeriod,
  daysRemainingInTrial,
  shouldShowUpgradePrompt,
  getStatusMessage,
  isSubscriptionActive,
} from '@/lib/stripe/subscription';
import type { AdaTier, NormalizedSubscription } from '@/lib/stripe/types';

// =============================================================================
// Types
// =============================================================================

interface SubscriptionResponse {
  /** User has an active subscription */
  hasSubscription: boolean;
  /** Subscription details (null if no subscription) */
  subscription: {
    tier: AdaTier;
    status: string;
    statusMessage: string;
    isActive: boolean;
    currentPeriodEnd: string;
    daysRemaining: number;
    cancelAtPeriodEnd: boolean;
    cancelAt?: string;
    trialEnd?: string;
    trialDaysRemaining?: number;
    priceInCents: number;
    interval: 'month' | 'year';
    paymentMethodLast4?: string;
    paymentMethodBrand?: string;
  } | null;
  /** Feature flags based on tier */
  features: {
    maxCyclesPerDay: number;
    maxRoles: number;
    customPlaybooks: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    advancedAnalytics: boolean;
    teamMembers: number;
    webhookIntegrations: boolean;
  };
  /** UI hints */
  ui: {
    showUpgradePrompt: boolean;
    showTrialBanner: boolean;
    showPaymentWarning: boolean;
  };
}

interface ErrorResponse {
  error: string;
  code: string;
}

// =============================================================================
// Feature Definitions
// =============================================================================

const TIER_FEATURES = {
  FREE: {
    maxCyclesPerDay: 10,
    maxRoles: 3,
    customPlaybooks: false,
    apiAccess: false,
    prioritySupport: false,
    advancedAnalytics: false,
    teamMembers: 1,
    webhookIntegrations: false,
  },
  PRO: {
    maxCyclesPerDay: 100,
    maxRoles: 10,
    customPlaybooks: true,
    apiAccess: true,
    prioritySupport: false,
    advancedAnalytics: true,
    teamMembers: 5,
    webhookIntegrations: true,
  },
  ENTERPRISE: {
    maxCyclesPerDay: -1, // Unlimited
    maxRoles: -1, // Unlimited
    customPlaybooks: true,
    apiAccess: true,
    prioritySupport: true,
    advancedAnalytics: true,
    teamMembers: -1, // Unlimited
    webhookIntegrations: true,
  },
} as const;

// =============================================================================
// Helper: Build Response
// =============================================================================

function buildResponse(
  subscription: NormalizedSubscription | null,
  tier: AdaTier
): SubscriptionResponse {
  const features = TIER_FEATURES[tier];
  
  if (!subscription) {
    return {
      hasSubscription: false,
      subscription: null,
      features,
      ui: {
        showUpgradePrompt: true,
        showTrialBanner: false,
        showPaymentWarning: false,
      },
    };
  }

  const trialDaysRemaining = daysRemainingInTrial(subscription);
  const isActive = isSubscriptionActive(subscription.status);

  return {
    hasSubscription: true,
    subscription: {
      tier: subscription.tier,
      status: subscription.status,
      statusMessage: getStatusMessage(subscription.status),
      isActive,
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      daysRemaining: daysRemainingInPeriod(subscription),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      cancelAt: subscription.cancelAt?.toISOString(),
      trialEnd: subscription.trialEnd?.toISOString(),
      trialDaysRemaining: trialDaysRemaining ?? undefined,
      priceInCents: subscription.priceInCents,
      interval: subscription.interval,
      paymentMethodLast4: subscription.paymentMethodLast4,
      paymentMethodBrand: subscription.paymentMethodBrand,
    },
    features,
    ui: {
      showUpgradePrompt: shouldShowUpgradePrompt(subscription),
      showTrialBanner: trialDaysRemaining !== null && trialDaysRemaining > 0,
      showPaymentWarning: subscription.status === 'past_due',
    },
  };
}

// =============================================================================
// Handler
// =============================================================================

export async function GET(
  _request: NextRequest
): Promise<NextResponse<SubscriptionResponse | ErrorResponse>> {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    // 2. Find Stripe customer
    const stripe = getStripe();
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    });

    // No customer = free tier
    if (customers.data.length === 0) {
      return NextResponse.json(buildResponse(null, 'FREE'));
    }

    const customer = customers.data[0];

    // 3. Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 1,
      expand: ['data.default_payment_method'],
    });

    // No subscription = free tier
    if (subscriptions.data.length === 0) {
      return NextResponse.json(buildResponse(null, 'FREE'));
    }

    // 4. Normalize subscription
    const stripeSubscription = subscriptions.data[0];
    let normalized = normalizeSubscription(stripeSubscription);

    // Add payment method details if available
    if (stripeSubscription.default_payment_method) {
      const paymentMethod = stripeSubscription.default_payment_method as import('stripe').Stripe.PaymentMethod;
      normalized = addPaymentMethodDetails(normalized, paymentMethod);
    }

    // 5. Return response
    return NextResponse.json(buildResponse(normalized, normalized.tier));
  } catch (error) {
    console.error('[subscription] Error fetching subscription:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch subscription status', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}

// =============================================================================
// Method Not Allowed
// =============================================================================

export async function POST(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json(
    { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}
