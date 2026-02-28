/**
 * Stripe Webhook Handler Tests
 *
 * @author 🌌 Frontier (Cycle 1296)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type Stripe from 'stripe';
import {
  registerHandler,
  getHandler,
  listHandlers,
  clearHandlers,
  InMemoryIdempotencyStore,
  isSubscriptionEvent,
  isInvoiceEvent,
  isCustomerEvent,
  isCheckoutEvent,
  getEventCategory,
  configureWebhook,
} from '../webhook';
import type { HandlerRegistration, WebhookContext } from '../types';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockEvent(type: string, overrides: Partial<Stripe.Event> = {}): Stripe.Event {
  return {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    object: 'event',
    type,
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: {
      object: {
        id: 'obj_test',
        customer: 'cus_test',
      },
    },
    ...overrides,
  } as Stripe.Event;
}

function createMockHandler(eventType: string): HandlerRegistration {
  return {
    eventType: eventType as HandlerRegistration['eventType'],
    handler: vi.fn().mockResolvedValue({
      success: true,
      message: 'Test handler executed',
    }),
    priority: 'normal',
    category: 'subscription',
    description: `Test handler for ${eventType}`,
    enabled: true,
  };
}

// =============================================================================
// Handler Registry Tests
// =============================================================================

describe('Handler Registry', () => {
  beforeEach(() => {
    clearHandlers();
  });

  afterEach(() => {
    clearHandlers();
  });

  describe('registerHandler', () => {
    it('registers a handler for event type', () => {
      const handler = createMockHandler('customer.subscription.created');
      registerHandler(handler);

      expect(getHandler('customer.subscription.created')).toBe(handler);
    });

    it('overwrites existing handler with warning', () => {
      const handler1 = createMockHandler('customer.subscription.created');
      const handler2 = createMockHandler('customer.subscription.created');

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      registerHandler(handler1);
      registerHandler(handler2);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Overwriting existing handler')
      );
      expect(getHandler('customer.subscription.created')).toBe(handler2);

      warnSpy.mockRestore();
    });
  });

  describe('getHandler', () => {
    it('returns undefined for unregistered event', () => {
      expect(getHandler('unknown.event')).toBeUndefined();
    });

    it('returns handler for registered event', () => {
      const handler = createMockHandler('invoice.paid');
      registerHandler(handler);

      expect(getHandler('invoice.paid')).toBe(handler);
    });
  });

  describe('listHandlers', () => {
    it('returns empty array when no handlers', () => {
      expect(listHandlers()).toEqual([]);
    });

    it('returns all registered handlers', () => {
      const handler1 = createMockHandler('customer.subscription.created');
      const handler2 = createMockHandler('invoice.paid');

      registerHandler(handler1);
      registerHandler(handler2);

      const handlers = listHandlers();
      expect(handlers).toHaveLength(2);
      expect(handlers).toContain(handler1);
      expect(handlers).toContain(handler2);
    });
  });

  describe('clearHandlers', () => {
    it('removes all handlers', () => {
      registerHandler(createMockHandler('customer.subscription.created'));
      registerHandler(createMockHandler('invoice.paid'));

      clearHandlers();

      expect(listHandlers()).toHaveLength(0);
    });
  });
});

// =============================================================================
// Idempotency Store Tests
// =============================================================================

describe('InMemoryIdempotencyStore', () => {
  let store: InMemoryIdempotencyStore;

  beforeEach(() => {
    store = new InMemoryIdempotencyStore();
  });

  describe('wasProcessed', () => {
    it('returns null for unprocessed event', async () => {
      const result = await store.wasProcessed('evt_new');
      expect(result).toBeNull();
    });

    it('returns event after marking processed', async () => {
      const event = {
        eventId: 'evt_123',
        eventType: 'customer.subscription.created',
        processedAt: new Date(),
        result: { success: true, message: 'Done' },
        durationMs: 50,
      };

      await store.markProcessed(event);
      const result = await store.wasProcessed('evt_123');

      expect(result).toEqual(event);
    });
  });

  describe('markProcessed', () => {
    it('stores event for retrieval', async () => {
      const event = {
        eventId: 'evt_456',
        eventType: 'invoice.paid',
        processedAt: new Date(),
        result: { success: true, message: 'Invoice processed' },
        durationMs: 100,
      };

      await store.markProcessed(event);

      const stored = await store.wasProcessed('evt_456');
      expect(stored?.eventId).toBe('evt_456');
      expect(stored?.eventType).toBe('invoice.paid');
    });
  });

  describe('cleanup', () => {
    it('removes events older than threshold', async () => {
      const oldEvent = {
        eventId: 'evt_old',
        eventType: 'test',
        processedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
        result: { success: true, message: 'Old' },
        durationMs: 10,
      };

      const newEvent = {
        eventId: 'evt_new',
        eventType: 'test',
        processedAt: new Date(),
        result: { success: true, message: 'New' },
        durationMs: 10,
      };

      await store.markProcessed(oldEvent);
      await store.markProcessed(newEvent);

      const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const cleaned = await store.cleanup(threshold);

      expect(cleaned).toBe(1);
      expect(await store.wasProcessed('evt_old')).toBeNull();
      expect(await store.wasProcessed('evt_new')).not.toBeNull();
    });

    it('returns 0 when nothing to clean', async () => {
      const cleaned = await store.cleanup(new Date(0));
      expect(cleaned).toBe(0);
    });
  });
});

// =============================================================================
// Event Type Guards Tests
// =============================================================================

describe('Event Type Guards', () => {
  describe('isSubscriptionEvent', () => {
    it('returns true for subscription events', () => {
      expect(isSubscriptionEvent(createMockEvent('customer.subscription.created'))).toBe(true);
      expect(isSubscriptionEvent(createMockEvent('customer.subscription.updated'))).toBe(true);
      expect(isSubscriptionEvent(createMockEvent('customer.subscription.deleted'))).toBe(true);
    });

    it('returns false for non-subscription events', () => {
      expect(isSubscriptionEvent(createMockEvent('invoice.paid'))).toBe(false);
      expect(isSubscriptionEvent(createMockEvent('customer.created'))).toBe(false);
    });
  });

  describe('isInvoiceEvent', () => {
    it('returns true for invoice events', () => {
      expect(isInvoiceEvent(createMockEvent('invoice.paid'))).toBe(true);
      expect(isInvoiceEvent(createMockEvent('invoice.payment_failed'))).toBe(true);
      expect(isInvoiceEvent(createMockEvent('invoice.upcoming'))).toBe(true);
    });

    it('returns false for non-invoice events', () => {
      expect(isInvoiceEvent(createMockEvent('customer.subscription.created'))).toBe(false);
    });
  });

  describe('isCustomerEvent', () => {
    it('returns true for customer events (not subscription)', () => {
      expect(isCustomerEvent(createMockEvent('customer.created'))).toBe(true);
      expect(isCustomerEvent(createMockEvent('customer.updated'))).toBe(true);
      expect(isCustomerEvent(createMockEvent('customer.deleted'))).toBe(true);
    });

    it('returns false for subscription events', () => {
      expect(isCustomerEvent(createMockEvent('customer.subscription.created'))).toBe(false);
    });
  });

  describe('isCheckoutEvent', () => {
    it('returns true for checkout events', () => {
      expect(isCheckoutEvent(createMockEvent('checkout.session.completed'))).toBe(true);
      expect(isCheckoutEvent(createMockEvent('checkout.session.expired'))).toBe(true);
    });

    it('returns false for non-checkout events', () => {
      expect(isCheckoutEvent(createMockEvent('invoice.paid'))).toBe(false);
    });
  });

  describe('getEventCategory', () => {
    it('returns subscription for subscription events', () => {
      expect(getEventCategory('customer.subscription.created')).toBe('subscription');
      expect(getEventCategory('customer.subscription.updated')).toBe('subscription');
    });

    it('returns payment for invoice and payment events', () => {
      expect(getEventCategory('invoice.paid')).toBe('payment');
      expect(getEventCategory('invoice.payment_failed')).toBe('payment');
      expect(getEventCategory('payment_method.attached')).toBe('payment');
    });

    it('returns customer for customer events', () => {
      expect(getEventCategory('customer.created')).toBe('customer');
      expect(getEventCategory('customer.updated')).toBe('customer');
    });

    it('returns checkout for checkout events', () => {
      expect(getEventCategory('checkout.session.completed')).toBe('checkout');
    });

    it('returns unknown for unrecognized events', () => {
      expect(getEventCategory('custom.event')).toBe('unknown');
    });
  });
});

// =============================================================================
// Configuration Tests
// =============================================================================

describe('configureWebhook', () => {
  it('allows partial configuration', () => {
    // Should not throw
    configureWebhook({
      enableLogging: false,
    });
  });

  it('accepts full configuration', () => {
    configureWebhook({
      secret: 'whsec_test',
      maxTimestampDrift: 600,
      enableLogging: true,
      enabledEvents: ['checkout.session.completed'],
    });
    // No assertion needed, just verify it doesn't throw
  });
});

// =============================================================================
// Integration Tests (without Stripe API calls)
// =============================================================================

describe('Webhook Processing Flow', () => {
  beforeEach(() => {
    clearHandlers();
  });

  afterEach(() => {
    clearHandlers();
  });

  it('registers and retrieves handlers in order', () => {
    const handlers = [
      createMockHandler('checkout.session.completed'),
      createMockHandler('customer.subscription.created'),
      createMockHandler('invoice.paid'),
    ];

    handlers.forEach(registerHandler);

    expect(listHandlers()).toHaveLength(3);
    expect(getHandler('checkout.session.completed')).toBeDefined();
    expect(getHandler('customer.subscription.created')).toBeDefined();
    expect(getHandler('invoice.paid')).toBeDefined();
  });

  it('handler function can be called with context', async () => {
    const handler = createMockHandler('customer.subscription.created');
    registerHandler(handler);

    const ctx: WebhookContext = {
      event: createMockEvent('customer.subscription.created'),
      eventType: 'customer.subscription.created',
      eventId: 'evt_test',
      timestamp: new Date(),
      livemode: false,
      requestId: 'req_test',
      customerId: 'cus_test',
    };

    const registered = getHandler('customer.subscription.created');
    const result = await registered!.handler(ctx);

    expect(result.success).toBe(true);
    expect(handler.handler).toHaveBeenCalledWith(ctx);
  });
});

// =============================================================================
// Handler Priority Tests
// =============================================================================

describe('Handler Priority', () => {
  it('accepts all priority levels', () => {
    const priorities = ['critical', 'high', 'normal', 'low'] as const;

    priorities.forEach((priority, idx) => {
      const handler: HandlerRegistration = {
        eventType: 'checkout.session.completed',
        handler: vi.fn().mockResolvedValue({ success: true, message: 'OK' }),
        priority,
        category: 'checkout',
        description: `Handler with ${priority} priority`,
        enabled: true,
      };

      // Just verify it's valid
      expect(handler.priority).toBe(priority);
    });
  });
});

// =============================================================================
// Enabled/Disabled Handler Tests
// =============================================================================

describe('Handler Enabled State', () => {
  beforeEach(() => {
    clearHandlers();
  });

  it('can register disabled handlers', () => {
    const handler: HandlerRegistration = {
      eventType: 'checkout.session.completed',
      handler: vi.fn(),
      priority: 'normal',
      category: 'checkout',
      description: 'Disabled handler',
      enabled: false,
    };

    registerHandler(handler);
    const retrieved = getHandler('checkout.session.completed');

    expect(retrieved?.enabled).toBe(false);
  });
});
