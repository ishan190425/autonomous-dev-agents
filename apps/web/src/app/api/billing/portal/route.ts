/**
 * Stripe Customer Portal API
 *
 * Creates a Stripe customer portal session for self-service billing management.
 * Allows users to update payment methods, view invoices, and manage subscriptions.
 *
 * @author ⚙️ Engineering (Cycle 1300)
 * @see docs/architecture/adr-api-gateway-c1276.md
 *
 * @example
 * // Open customer portal
 * const res = await fetch('/api/billing/portal', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     returnUrl: 'https://app.ada.dev/dashboard/billing',
 *   }),
 * });
 * const { url } = await res.json();
 * window.location.href = url;
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';

// =============================================================================
// Types
// =============================================================================

interface PortalRequestBody {
  /** URL to return to after portal session */
  returnUrl: string;
  /** Specific configuration (optional) */
  configurationId?: string;
  /** Flow type for specific actions (optional) */
  flowType?: 'payment_method_update' | 'subscription_cancel' | 'subscription_update';
}

interface PortalResponse {
  /** Portal session URL */
  url: string;
  /** Session ID for reference */
  sessionId: string;
}

interface ErrorResponse {
  error: string;
  code: string;
}

// =============================================================================
// Validation
// =============================================================================

function validateRequest(body: unknown): PortalRequestBody {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be an object');
  }

  const { returnUrl, configurationId, flowType } = body as Record<string, unknown>;

  if (typeof returnUrl !== 'string' || !returnUrl) {
    throw new Error('returnUrl is required and must be a string');
  }

  // Validate URL
  try {
    new URL(returnUrl);
  } catch {
    throw new Error('returnUrl must be a valid URL');
  }

  // Validate optional fields
  if (configurationId !== undefined && typeof configurationId !== 'string') {
    throw new Error('configurationId must be a string');
  }

  const validFlowTypes = ['payment_method_update', 'subscription_cancel', 'subscription_update'];
  if (flowType !== undefined && !validFlowTypes.includes(flowType as string)) {
    throw new Error(`flowType must be one of: ${validFlowTypes.join(', ')}`);
  }

  return {
    returnUrl,
    configurationId: configurationId as string | undefined,
    flowType: flowType as PortalRequestBody['flowType'],
  };
}

// =============================================================================
// Handler
// =============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<PortalResponse | ErrorResponse>> {
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

    // 3. Find Stripe customer
    const stripe = getStripe();
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: 'No billing account found', code: 'NO_CUSTOMER' },
        { status: 404 }
      );
    }

    const customer = customers.data[0];

    // 4. Build portal session params
    const sessionParams: import('stripe').Stripe.BillingPortal.SessionCreateParams = {
      customer: customer.id,
      return_url: validatedBody.returnUrl,
    };

    // Add configuration if provided
    if (validatedBody.configurationId) {
      sessionParams.configuration = validatedBody.configurationId;
    }

    // Add flow data for specific actions
    if (validatedBody.flowType) {
      switch (validatedBody.flowType) {
        case 'payment_method_update':
          sessionParams.flow_data = {
            type: 'payment_method_update',
          };
          break;
        case 'subscription_cancel':
          sessionParams.flow_data = {
            type: 'subscription_cancel',
            subscription_cancel: {
              subscription: await getActiveSubscriptionId(stripe, customer.id),
            },
          };
          break;
        case 'subscription_update':
          sessionParams.flow_data = {
            type: 'subscription_update',
            subscription_update: {
              subscription: await getActiveSubscriptionId(stripe, customer.id),
            },
          };
          break;
      }
    }

    // 5. Create portal session
    const portalSession = await stripe.billingPortal.sessions.create(sessionParams);

    // 6. Return success
    return NextResponse.json({
      url: portalSession.url,
      sessionId: portalSession.id,
    });
  } catch (error) {
    console.error('[portal] Error creating portal session:', error);

    const err = error as Error;

    if (err.message.includes('returnUrl')) {
      return NextResponse.json(
        { error: err.message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (err.message.includes('No active subscription')) {
      return NextResponse.json(
        { error: err.message, code: 'NO_SUBSCRIPTION' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create portal session', code: 'PORTAL_ERROR' },
      { status: 500 }
    );
  }
}

// =============================================================================
// Helper: Get Active Subscription
// =============================================================================

async function getActiveSubscriptionId(
  stripe: import('stripe').Stripe,
  customerId: string
): Promise<string> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });

  if (subscriptions.data.length === 0) {
    throw new Error('No active subscription found');
  }

  return subscriptions.data[0].id;
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
