/**
 * Billing API Routes Tests
 *
 * Tests for checkout, webhook, subscription, and portal routes.
 *
 * @author ⚙️ Engineering (Cycle 1300)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock auth - need to mock as a function that returns session
const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

// Mock Stripe
const mockStripe = {
  customers: {
    list: vi.fn(),
    create: vi.fn(),
  },
  subscriptions: {
    list: vi.fn(),
    retrieve: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  billingPortal: {
    sessions: {
      create: vi.fn(),
    },
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
};

vi.mock('@/lib/stripe', () => ({
  getStripe: () => mockStripe,
  handleStripeWebhook: vi.fn(),
  registerHandler: vi.fn(),
}));

vi.mock('@/lib/stripe/subscription', () => ({
  normalizeSubscription: vi.fn((sub) => ({
    subscriptionId: sub.id,
    customerId: sub.customer,
    tier: 'PRO',
    status: sub.status || 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    priceInCents: 4900,
    interval: 'month',
  })),
  addPaymentMethodDetails: vi.fn((sub) => sub),
  daysRemainingInPeriod: vi.fn(() => 30),
  daysRemainingInTrial: vi.fn(() => null),
  shouldShowUpgradePrompt: vi.fn(() => false),
  getStatusMessage: vi.fn(() => 'Your subscription is active'),
  isSubscriptionActive: vi.fn(() => true),
  extractSubscriptionFromCheckout: vi.fn(),
  extractCustomerId: vi.fn(),
  getTierFromSubscription: vi.fn(),
}));

// Note: auth is mocked above

// =============================================================================
// Test Fixtures
// =============================================================================

const mockUser = {
  email: 'test@example.com',
  name: 'Test User',
};

const mockCustomer = {
  id: 'cus_123',
  email: 'test@example.com',
};

const mockSubscription = {
  id: 'sub_123',
  customer: 'cus_123',
  status: 'active',
  current_period_start: Math.floor(Date.now() / 1000),
  current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  items: {
    data: [
      {
        price: {
          id: 'price_pro_monthly',
          unit_amount: 4900,
          recurring: { interval: 'month' },
          product: 'prod_pro',
        },
      },
    ],
  },
};

// =============================================================================
// Checkout Route Tests
// =============================================================================

describe('POST /api/billing/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_pro_monthly';
    process.env.STRIPE_PRO_YEARLY_PRICE_ID = 'price_pro_yearly';
  });

  it('should return 401 if not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const { POST } = await import('../checkout/route');
    const request = new NextRequest('http://localhost/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({
        priceId: 'price_pro_monthly',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe('UNAUTHENTICATED');
  });

  it('should return 400 if priceId is missing', async () => {
    mockAuth.mockResolvedValue({ user: mockUser } as any);

    const { POST } = await import('../checkout/route');
    const request = new NextRequest('http://localhost/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    // priceId validation error returns INVALID_PRICE code
    expect(data.code).toBe('INVALID_PRICE');
  });

  it('should return 400 if priceId is invalid', async () => {
    mockAuth.mockResolvedValue({ user: mockUser } as any);

    const { POST } = await import('../checkout/route');
    const request = new NextRequest('http://localhost/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({
        priceId: 'invalid_price',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe('INVALID_PRICE');
  });

  it('should create checkout session for existing customer', async () => {
    mockAuth.mockResolvedValue({ user: mockUser } as any);
    mockStripe.customers.list.mockResolvedValue({ data: [mockCustomer] });
    mockStripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_123',
      url: 'https://checkout.stripe.com/session',
    });

    const { POST } = await import('../checkout/route');
    const request = new NextRequest('http://localhost/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({
        priceId: 'price_pro_monthly',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe('https://checkout.stripe.com/session');
    expect(data.sessionId).toBe('cs_123');
    expect(mockStripe.customers.create).not.toHaveBeenCalled();
  });

  it('should create customer if none exists', async () => {
    mockAuth.mockResolvedValue({ user: mockUser } as any);
    mockStripe.customers.list.mockResolvedValue({ data: [] });
    mockStripe.customers.create.mockResolvedValue(mockCustomer);
    mockStripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_123',
      url: 'https://checkout.stripe.com/session',
    });

    const { POST } = await import('../checkout/route');
    const request = new NextRequest('http://localhost/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({
        priceId: 'price_pro_monthly',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockStripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: mockUser.email,
      })
    );
  });

  it('should apply trial days', async () => {
    mockAuth.mockResolvedValue({ user: mockUser } as any);
    mockStripe.customers.list.mockResolvedValue({ data: [mockCustomer] });
    mockStripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_123',
      url: 'https://checkout.stripe.com/session',
    });

    const { POST } = await import('../checkout/route');
    const request = new NextRequest('http://localhost/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({
        priceId: 'price_pro_monthly',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        trialDays: 14,
      }),
    });

    await POST(request);

    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: expect.objectContaining({
          trial_period_days: 14,
        }),
      })
    );
  });
});

// =============================================================================
// Subscription Route Tests
// =============================================================================

describe('GET /api/billing/subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const { GET } = await import('../subscription/route');
    const request = new NextRequest('http://localhost/api/billing/subscription');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe('UNAUTHENTICATED');
  });

  it('should return free tier if no customer exists', async () => {
    mockAuth.mockResolvedValue({ user: mockUser } as any);
    mockStripe.customers.list.mockResolvedValue({ data: [] });

    const { GET } = await import('../subscription/route');
    const request = new NextRequest('http://localhost/api/billing/subscription');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasSubscription).toBe(false);
    expect(data.subscription).toBeNull();
    expect(data.features.maxCyclesPerDay).toBe(10); // Free tier limit
  });

  it('should return free tier if no subscription exists', async () => {
    mockAuth.mockResolvedValue({ user: mockUser } as any);
    mockStripe.customers.list.mockResolvedValue({ data: [mockCustomer] });
    mockStripe.subscriptions.list.mockResolvedValue({ data: [] });

    const { GET } = await import('../subscription/route');
    const request = new NextRequest('http://localhost/api/billing/subscription');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasSubscription).toBe(false);
    expect(data.ui.showUpgradePrompt).toBe(true);
  });

  it('should return subscription details for active subscription', async () => {
    mockAuth.mockResolvedValue({ user: mockUser } as any);
    mockStripe.customers.list.mockResolvedValue({ data: [mockCustomer] });
    mockStripe.subscriptions.list.mockResolvedValue({ data: [mockSubscription] });

    const { GET } = await import('../subscription/route');
    const request = new NextRequest('http://localhost/api/billing/subscription');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasSubscription).toBe(true);
    expect(data.subscription.tier).toBe('PRO');
    expect(data.subscription.isActive).toBe(true);
    expect(data.features.maxCyclesPerDay).toBe(100); // Pro tier limit
  });
});

// =============================================================================
// Portal Route Tests
// =============================================================================

describe('POST /api/billing/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const { POST } = await import('../portal/route');
    const request = new NextRequest('http://localhost/api/billing/portal', {
      method: 'POST',
      body: JSON.stringify({
        returnUrl: 'https://example.com/billing',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe('UNAUTHENTICATED');
  });

  it('should return 400 if returnUrl is missing', async () => {
    mockAuth.mockResolvedValue({ user: mockUser } as any);

    const { POST } = await import('../portal/route');
    const request = new NextRequest('http://localhost/api/billing/portal', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('should return 404 if no customer exists', async () => {
    mockAuth.mockResolvedValue({ user: mockUser } as any);
    mockStripe.customers.list.mockResolvedValue({ data: [] });

    const { POST } = await import('../portal/route');
    const request = new NextRequest('http://localhost/api/billing/portal', {
      method: 'POST',
      body: JSON.stringify({
        returnUrl: 'https://example.com/billing',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe('NO_CUSTOMER');
  });

  it('should create portal session successfully', async () => {
    mockAuth.mockResolvedValue({ user: mockUser } as any);
    mockStripe.customers.list.mockResolvedValue({ data: [mockCustomer] });
    mockStripe.billingPortal.sessions.create.mockResolvedValue({
      id: 'bps_123',
      url: 'https://billing.stripe.com/session',
    });

    const { POST } = await import('../portal/route');
    const request = new NextRequest('http://localhost/api/billing/portal', {
      method: 'POST',
      body: JSON.stringify({
        returnUrl: 'https://example.com/billing',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe('https://billing.stripe.com/session');
    expect(data.sessionId).toBe('bps_123');
  });

  it('should handle flow type for specific actions', async () => {
    mockAuth.mockResolvedValue({ user: mockUser } as any);
    mockStripe.customers.list.mockResolvedValue({ data: [mockCustomer] });
    mockStripe.subscriptions.list.mockResolvedValue({ data: [mockSubscription] });
    mockStripe.billingPortal.sessions.create.mockResolvedValue({
      id: 'bps_123',
      url: 'https://billing.stripe.com/session',
    });

    const { POST } = await import('../portal/route');
    const request = new NextRequest('http://localhost/api/billing/portal', {
      method: 'POST',
      body: JSON.stringify({
        returnUrl: 'https://example.com/billing',
        flowType: 'payment_method_update',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        flow_data: { type: 'payment_method_update' },
      })
    );
  });
});

// =============================================================================
// Webhook Route Tests
// =============================================================================

describe('POST /api/billing/webhook', () => {
  it('should delegate to handleStripeWebhook', async () => {
    const { handleStripeWebhook } = await import('@/lib/stripe');
    vi.mocked(handleStripeWebhook).mockResolvedValue(
      new Response(JSON.stringify({ received: true }), { status: 200 })
    );

    const { POST } = await import('../webhook/route');
    const request = new Request('http://localhost/api/billing/webhook', {
      method: 'POST',
      body: '{}',
      headers: {
        'stripe-signature': 'test_signature',
      },
    });

    const response = await POST(request);

    expect(handleStripeWebhook).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// Method Not Allowed Tests
// =============================================================================

describe('Method Not Allowed', () => {
  it('GET /api/billing/checkout should return 405', async () => {
    const { GET } = await import('../checkout/route');
    const response = await GET();
    expect(response.status).toBe(405);
  });

  it('POST /api/billing/subscription should return 405', async () => {
    const { POST } = await import('../subscription/route');
    const response = await POST();
    expect(response.status).toBe(405);
  });

  it('GET /api/billing/portal should return 405', async () => {
    const { GET } = await import('../portal/route');
    const response = await GET();
    expect(response.status).toBe(405);
  });

  it('GET /api/billing/webhook should return 405', async () => {
    const { GET } = await import('../webhook/route');
    const response = await GET();
    expect(response.status).toBe(405);
  });
});
