/**
 * Stripe Checkout Session API
 *
 * Creates a Stripe checkout session for subscription signup.
 * Redirects user to Stripe's hosted checkout page.
 *
 * @author ⚙️ Engineering (Cycle 1300)
 * @see docs/architecture/adr-api-gateway-c1276.md
 *
 * @example
 * // Create checkout session
 * const res = await fetch('/api/billing/checkout', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     priceId: 'price_pro_monthly',
 *     successUrl: 'https://app.ada.dev/billing/success',
 *     cancelUrl: 'https://app.ada.dev/billing/cancel',
 *   }),
 * });
 * const { url } = await res.json();
 * window.location.href = url;
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { auth } from '@/lib/auth';
import type Stripe from 'stripe';

// =============================================================================
// Types
// =============================================================================

interface CheckoutRequestBody {
  /** Stripe price ID to subscribe to */
  priceId: string;
  /** URL to redirect on success */
  successUrl: string;
  /** URL to redirect on cancel */
  cancelUrl: string;
  /** Billing interval override (optional) */
  interval?: 'month' | 'year';
  /** Trial period days (optional, defaults to 7) */
  trialDays?: number;
  /** Coupon code (optional) */
  couponCode?: string;
}

interface CheckoutResponse {
  /** Stripe checkout session URL */
  url: string;
  /** Session ID for client-side reference */
  sessionId: string;
}

interface ErrorResponse {
  error: string;
  code: string;
}

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_TRIAL_DAYS = 7;
const MAX_TRIAL_DAYS = 30;

/** Valid price IDs (should match Stripe dashboard) */
const VALID_PRICE_IDS = [
  process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
  process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
];

// =============================================================================
// Validation
// =============================================================================

function validateRequest(body: unknown): CheckoutRequestBody {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be an object');
  }

  const { priceId, successUrl, cancelUrl, interval, trialDays, couponCode } =
    body as Record<string, unknown>;

  if (typeof priceId !== 'string' || !priceId) {
    throw new Error('priceId is required and must be a string');
  }

  if (typeof successUrl !== 'string' || !successUrl) {
    throw new Error('successUrl is required and must be a string');
  }

  if (typeof cancelUrl !== 'string' || !cancelUrl) {
    throw new Error('cancelUrl is required and must be a string');
  }

  // Validate URLs
  try {
    new URL(successUrl);
    new URL(cancelUrl);
  } catch {
    throw new Error('successUrl and cancelUrl must be valid URLs');
  }

  // Validate price ID
  if (!VALID_PRICE_IDS.includes(priceId)) {
    throw new Error(`Invalid priceId: ${priceId}`);
  }

  // Validate optional fields
  if (interval !== undefined && interval !== 'month' && interval !== 'year') {
    throw new Error('interval must be "month" or "year"');
  }

  if (trialDays !== undefined) {
    if (typeof trialDays !== 'number' || trialDays < 0 || trialDays > MAX_TRIAL_DAYS) {
      throw new Error(`trialDays must be a number between 0 and ${MAX_TRIAL_DAYS}`);
    }
  }

  if (couponCode !== undefined && typeof couponCode !== 'string') {
    throw new Error('couponCode must be a string');
  }

  return {
    priceId,
    successUrl,
    cancelUrl,
    interval: interval as 'month' | 'year' | undefined,
    trialDays: trialDays as number | undefined,
    couponCode: couponCode as string | undefined,
  };
}

// =============================================================================
// Handler
// =============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<CheckoutResponse | ErrorResponse>> {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request
    const body = await request.json();
    const validatedBody = validateRequest(body);

    // 3. Get or create Stripe customer
    const stripe = getStripe();
    let customerId: string;

    // Check if user already has a Stripe customer ID
    // In production, this would come from your database
    const existingCustomers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name || undefined,
        metadata: {
          // Store your internal user ID for reference
          source: 'ada_checkout',
          createdAt: new Date().toISOString(),
        },
      });
      customerId = customer.id;
    }

    // 4. Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: validatedBody.priceId,
          quantity: 1,
        },
      ],
      success_url: `${validatedBody.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: validatedBody.cancelUrl,
      // Subscription data
      subscription_data: {
        trial_period_days: validatedBody.trialDays ?? DEFAULT_TRIAL_DAYS,
        metadata: {
          source: 'ada_checkout',
          createdVia: 'api',
        },
      },
      // UX enhancements
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
      // Tax collection (if configured)
      automatic_tax: {
        enabled: !!process.env.STRIPE_TAX_ENABLED,
      },
      // Customer update settings
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    };

    // Add coupon if provided
    if (validatedBody.couponCode) {
      sessionParams.discounts = [{ coupon: validatedBody.couponCode }];
      // Disable promotion codes if coupon is provided
      sessionParams.allow_promotion_codes = false;
    }

    // 5. Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

    if (!checkoutSession.url) {
      throw new Error('Failed to create checkout session URL');
    }

    // 6. Return success
    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('[checkout] Error creating checkout session:', error);

    const err = error as Error;

    // Handle Stripe-specific errors
    if (err.message.includes('priceId')) {
      return NextResponse.json(
        { error: err.message, code: 'INVALID_PRICE' },
        { status: 400 }
      );
    }

    if (err.message.includes('required')) {
      return NextResponse.json(
        { error: err.message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: 'Failed to create checkout session', code: 'CHECKOUT_ERROR' },
      { status: 500 }
    );
  }
}

// =============================================================================
// Method Not Allowed
// =============================================================================

export async function GET(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json(
    { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}
