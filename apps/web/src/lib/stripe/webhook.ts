/**
 * Stripe Webhook Handler
 *
 * Infrastructure for verifying and routing Stripe webhook events.
 * Provides signature verification, event routing, idempotency tracking,
 * and standardized error handling.
 *
 * @author 🌌 Frontier (Cycle 1296)
 * @see docs/architecture/adr-api-gateway-c1276.md
 *
 * @example
 * // In Next.js API route (app/api/webhooks/stripe/route.ts)
 * import { handleStripeWebhook, registerHandler } from '@/lib/stripe';
 *
 * // Register handlers
 * registerHandler({
 *   eventType: 'customer.subscription.created',
 *   handler: async (ctx) => {
 *     // Provision subscription
 *     return { success: true, message: 'Subscription provisioned' };
 *   },
 *   priority: 'critical',
 *   category: 'subscription',
 *   description: 'Provision new subscription',
 *   enabled: true,
 * });
 *
 * // Handle webhook
 * export async function POST(req: Request) {
 *   return handleStripeWebhook(req);
 * }
 */

import Stripe from 'stripe';
import type {
  WebhookContext,
  WebhookResult,
  WebhookHandler,
  HandlerRegistration,
  VerificationResult,
  WebhookConfig,
  ProcessedEvent,
  IdempotencyStore,
  HandledEventType,
  HANDLED_EVENTS,
} from './types';

// =============================================================================
// Stripe Client
// =============================================================================

let stripeClient: Stripe | null = null;

/**
 * Get or create Stripe client
 */
export function getStripe(): Stripe {
  if (!stripeClient) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripeClient = new Stripe(apiKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }
  return stripeClient;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: WebhookConfig = {
  secret: process.env.STRIPE_WEBHOOK_SECRET || '',
  maxTimestampDrift: 300, // 5 minutes
  enableLogging: true,
  enabledEvents: [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.paid',
    'invoice.payment_failed',
  ] as HandledEventType[],
};

let webhookConfig: WebhookConfig = { ...DEFAULT_CONFIG };

/**
 * Configure webhook settings
 */
export function configureWebhook(config: Partial<WebhookConfig>): void {
  webhookConfig = { ...webhookConfig, ...config };
}

// =============================================================================
// Signature Verification
// =============================================================================

/**
 * Verify Stripe webhook signature
 *
 * Uses Stripe's official signature verification to ensure the webhook
 * is authentic and hasn't been tampered with.
 *
 * @param payload - Raw request body (must be string/buffer, not parsed JSON)
 * @param signature - Stripe-Signature header value
 * @returns Verification result with parsed event if valid
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string | null
): VerificationResult {
  if (!signature) {
    return {
      valid: false,
      error: 'Missing Stripe-Signature header',
      errorCode: 'missing_signature',
    };
  }

  if (!webhookConfig.secret) {
    return {
      valid: false,
      error: 'Webhook secret not configured',
      errorCode: 'missing_signature',
    };
  }

  try {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookConfig.secret
    );

    return {
      valid: true,
      event,
    };
  } catch (err) {
    const error = err as Error;

    // Stripe-specific error handling
    if (error.message.includes('timestamp')) {
      return {
        valid: false,
        error: `Webhook timestamp outside tolerance: ${error.message}`,
        errorCode: 'expired_timestamp',
      };
    }

    if (error.message.includes('signature')) {
      return {
        valid: false,
        error: `Invalid signature: ${error.message}`,
        errorCode: 'invalid_signature',
      };
    }

    return {
      valid: false,
      error: `Failed to verify webhook: ${error.message}`,
      errorCode: 'parse_error',
    };
  }
}

// =============================================================================
// Handler Registry
// =============================================================================

const handlerRegistry = new Map<string, HandlerRegistration>();

/**
 * Register a webhook event handler
 */
export function registerHandler(registration: HandlerRegistration): void {
  if (handlerRegistry.has(registration.eventType)) {
    console.warn(`Overwriting existing handler for ${registration.eventType}`);
  }
  handlerRegistry.set(registration.eventType, registration);
}

/**
 * Get registered handler for event type
 */
export function getHandler(eventType: string): HandlerRegistration | undefined {
  return handlerRegistry.get(eventType);
}

/**
 * List all registered handlers
 */
export function listHandlers(): HandlerRegistration[] {
  return Array.from(handlerRegistry.values());
}

/**
 * Clear all handlers (for testing)
 */
export function clearHandlers(): void {
  handlerRegistry.clear();
}

// =============================================================================
// Idempotency
// =============================================================================

let idempotencyStore: IdempotencyStore | null = null;

/**
 * Set the idempotency store implementation
 */
export function setIdempotencyStore(store: IdempotencyStore): void {
  idempotencyStore = store;
}

/**
 * In-memory idempotency store (for development/testing)
 */
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private events = new Map<string, ProcessedEvent>();

  async wasProcessed(eventId: string): Promise<ProcessedEvent | null> {
    return this.events.get(eventId) || null;
  }

  async markProcessed(event: ProcessedEvent): Promise<void> {
    this.events.set(event.eventId, event);
  }

  async cleanup(olderThan: Date): Promise<number> {
    let count = 0;
    for (const [id, event] of this.events) {
      if (event.processedAt < olderThan) {
        this.events.delete(id);
        count++;
      }
    }
    return count;
  }
}

// Default to in-memory for development
const defaultStore = new InMemoryIdempotencyStore();

/**
 * Get the current idempotency store
 */
function getIdempotencyStore(): IdempotencyStore {
  return idempotencyStore || defaultStore;
}

// =============================================================================
// Context Builder
// =============================================================================

/**
 * Build webhook context from Stripe event
 */
function buildContext(event: Stripe.Event, requestId: string): WebhookContext {
  const ctx: WebhookContext = {
    event,
    eventType: event.type,
    eventId: event.id,
    timestamp: new Date(event.created * 1000),
    livemode: event.livemode,
    requestId,
  };

  // Extract customer/subscription IDs from common event structures
  // Use unknown first for safe type narrowing
  const data = event.data.object as unknown as Record<string, unknown>;

  if (typeof data.customer === 'string') {
    ctx.customerId = data.customer;
  } else if (data.customer && typeof (data.customer as { id?: string }).id === 'string') {
    ctx.customerId = (data.customer as { id: string }).id;
  }

  if (typeof data.subscription === 'string') {
    ctx.subscriptionId = data.subscription;
  } else if (typeof data.id === 'string' && event.type.startsWith('customer.subscription')) {
    ctx.subscriptionId = data.id as string;
  }

  return ctx;
}

// =============================================================================
// Main Handler
// =============================================================================

/**
 * Process a Stripe webhook request
 *
 * Full pipeline: verify → dedupe → route → handle → respond
 *
 * @param req - Next.js Request object
 * @returns Response with appropriate status code
 */
export async function handleStripeWebhook(req: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // 1. Get raw body (required for signature verification)
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');

  // 2. Verify signature
  const verification = verifyWebhookSignature(rawBody, signature);
  if (!verification.valid || !verification.event) {
    console.error(`[${requestId}] Webhook verification failed:`, verification.error);
    return new Response(
      JSON.stringify({
        error: 'Webhook verification failed',
        code: verification.errorCode,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const event = verification.event;
  const ctx = buildContext(event, requestId);

  // 3. Log receipt
  if (webhookConfig.enableLogging) {
    console.log(`[${requestId}] Received ${event.type}`, {
      eventId: event.id,
      livemode: event.livemode,
      customerId: ctx.customerId,
      subscriptionId: ctx.subscriptionId,
    });
  }

  // 4. Check idempotency
  const store = getIdempotencyStore();
  const existing = await store.wasProcessed(event.id);
  if (existing) {
    console.log(`[${requestId}] Event ${event.id} already processed at ${existing.processedAt}`);
    return new Response(
      JSON.stringify({
        received: true,
        duplicate: true,
        originalResult: existing.result,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 5. Check if event type is enabled
  if (!webhookConfig.enabledEvents.includes(event.type as HandledEventType)) {
    console.log(`[${requestId}] Event type ${event.type} not in enabled list, acknowledging`);
    return new Response(
      JSON.stringify({ received: true, handled: false, reason: 'Event type not enabled' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 6. Get handler
  const registration = getHandler(event.type);
  if (!registration || !registration.enabled) {
    console.log(`[${requestId}] No handler for ${event.type}, acknowledging`);
    return new Response(
      JSON.stringify({ received: true, handled: false, reason: 'No handler registered' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 7. Execute handler
  let result: WebhookResult;
  try {
    result = await registration.handler(ctx);
  } catch (error) {
    const err = error as Error;
    console.error(`[${requestId}] Handler error for ${event.type}:`, err);
    result = {
      success: false,
      message: 'Handler threw an exception',
      error: {
        code: 'HANDLER_ERROR',
        details: err.message,
      },
    };
  }

  // 8. Record for idempotency
  const durationMs = Date.now() - startTime;
  await store.markProcessed({
    eventId: event.id,
    eventType: event.type,
    processedAt: new Date(),
    result,
    durationMs,
  });

  // 9. Log result
  if (webhookConfig.enableLogging) {
    console.log(`[${requestId}] Processed ${event.type} in ${durationMs}ms`, {
      success: result.success,
      message: result.message,
      actions: result.actions,
    });
  }

  // 10. Return response
  // Always return 200 to Stripe unless verification failed
  // (prevents Stripe from retrying successfully handled events)
  return new Response(
    JSON.stringify({
      received: true,
      handled: true,
      result: {
        success: result.success,
        message: result.message,
        actions: result.actions,
      },
      durationMs,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// =============================================================================
// Utility: Event Type Guards
// =============================================================================

/**
 * Check if event is a subscription event
 */
export function isSubscriptionEvent(event: Stripe.Event): boolean {
  return event.type.startsWith('customer.subscription');
}

/**
 * Check if event is an invoice event
 */
export function isInvoiceEvent(event: Stripe.Event): boolean {
  return event.type.startsWith('invoice.');
}

/**
 * Check if event is a customer event
 */
export function isCustomerEvent(event: Stripe.Event): boolean {
  return event.type.startsWith('customer.') && !event.type.startsWith('customer.subscription');
}

/**
 * Check if event is a checkout event
 */
export function isCheckoutEvent(event: Stripe.Event): boolean {
  return event.type.startsWith('checkout.');
}

/**
 * Get event category
 */
export function getEventCategory(
  eventType: string
): 'subscription' | 'payment' | 'customer' | 'checkout' | 'unknown' {
  if (eventType.startsWith('customer.subscription')) return 'subscription';
  if (eventType.startsWith('invoice.') || eventType.startsWith('payment_')) return 'payment';
  if (eventType.startsWith('customer.')) return 'customer';
  if (eventType.startsWith('checkout.')) return 'checkout';
  return 'unknown';
}
