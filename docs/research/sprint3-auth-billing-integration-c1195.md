# Sprint 3 Auth-Billing-Execution Integration Spec (C1195)

> **Status:** Research
> **Author:** 🔬 Research (The Scout)
> **Cycle:** 1195 | **Date:** 2026-02-23 19:57 EST
> **Related:** #155 (SaaS Container), #181 (Auth), #182 (Billing), #189 (Managed Execution)
> **Builds On:** C1185 (Tier Spec), C1186 (Metering ADR), PR #253 (NextAuth), PR #254 (Billing Foundation)
> **Sprint 3:** Mar 1-14, 2026

---

## Problem Statement

Sprint 3 implements three interconnected systems:

1. **Authentication** (PR #253) — NextAuth.js + GitHub OAuth
2. **Billing** (PR #254) — Stripe subscriptions + tier limits
3. **Managed Execution** (#189) — Cloud-based cycle scheduling

Each system has specs, but **no document defines how they integrate**. This creates implementation risk:

- How does a NextAuth session become a billable user?
- How do Stripe webhooks update tier limits in real-time?
- How does managed execution validate authorization per-dispatch?

This spec bridges the gap with implementation-ready integration patterns.

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         User Journey                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. AUTHENTICATE        2. SUBSCRIBE           3. EXECUTE               │
│  ┌──────────────┐      ┌──────────────┐       ┌──────────────┐         │
│  │   GitHub     │ ───▶ │    Stripe    │ ───▶  │  Managed     │         │
│  │   OAuth      │      │   Checkout   │       │  Dispatch    │         │
│  └──────────────┘      └──────────────┘       └──────────────┘         │
│         │                     │                      │                  │
│         ▼                     ▼                      ▼                  │
│  ┌──────────────┐      ┌──────────────┐       ┌──────────────┐         │
│  │   NextAuth   │      │   Webhook    │       │ Pre-Dispatch │         │
│  │   Session    │      │   Handler    │       │    Check     │         │
│  └──────────────┘      └──────────────┘       └──────────────┘         │
│         │                     │                      │                  │
│         └─────────────────────┴──────────────────────┘                  │
│                               │                                          │
│                               ▼                                          │
│                    ┌─────────────────────┐                              │
│                    │    User Record      │                              │
│                    │   (Prisma + Redis)  │                              │
│                    │                     │                              │
│                    │  - id (GitHub)      │                              │
│                    │  - tier             │                              │
│                    │  - cyclesUsed       │                              │
│                    │  - stripeCustomerId │                              │
│                    │  - periodEnd        │                              │
│                    └─────────────────────┘                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Authentication → User Record

### NextAuth Callback Integration

When a user authenticates via GitHub OAuth, NextAuth creates/updates their User record:

```typescript
// apps/web/src/auth.ts

import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { Tier, DEFAULT_TIER_LIMITS } from '@ada-ai/core';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [GitHub],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Ensure user has billing defaults on first sign-in
      const existingUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { subscription: true },
      });

      if (!existingUser?.subscription) {
        // Create Free tier subscription on first sign-in
        await prisma.subscription.create({
          data: {
            userId: user.id!,
            tier: Tier.FREE,
            status: 'active',
            cyclesUsed: 0,
            cyclesLimit: DEFAULT_TIER_LIMITS[Tier.FREE].cycles,
            periodStart: new Date(),
            periodEnd: getNextPeriodEnd(),
          },
        });
      }
      return true;
    },
    async session({ session, user }) {
      // Enrich session with billing info
      const subscription = await prisma.subscription.findUnique({
        where: { userId: user.id },
      });

      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          tier: subscription?.tier ?? Tier.FREE,
          cyclesUsed: subscription?.cyclesUsed ?? 0,
          cyclesLimit: subscription?.cyclesLimit ?? 50,
        },
      };
    },
  },
});

function getNextPeriodEnd(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}
```

### Session Type Augmentation

```typescript
// types/next-auth.d.ts

import { Tier } from '@ada-ai/core';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      tier: Tier;
      cyclesUsed: number;
      cyclesLimit: number;
    };
  }
}
```

### Key Design Decision

**GitHub ID as User ID:** Use GitHub's numeric user ID as the primary key. This ensures:

- Consistent identity across OAuth re-auth
- Easy correlation with `gh api user` from CLI
- No secondary ID mapping needed

---

## 2. Billing → Subscription Updates

### Stripe Webhook Handler

Stripe webhooks update subscription state in real-time:

```typescript
// apps/web/src/app/api/webhooks/stripe/route.ts

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { Tier, TIER_CONFIG } from '@ada-ai/core';
import { invalidateUserCache } from '@/lib/redis';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Map Stripe price IDs to tiers
const PRICE_TO_TIER: Record<string, Tier> = {
  [process.env.STRIPE_PRICE_FREE!]: Tier.FREE,
  [process.env.STRIPE_PRICE_PRO!]: Tier.PRO,
  [process.env.STRIPE_PRICE_TEAM!]: Tier.TEAM,
};

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionChange(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(
        event.data.object as Stripe.Subscription
      );
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
  }

  return NextResponse.json({ received: true });
}

async function handleSubscriptionChange(
  stripeSubscription: Stripe.Subscription
) {
  const customerId = stripeSubscription.customer as string;
  const priceId = stripeSubscription.items.data[0]?.price.id;
  const tier = PRICE_TO_TIER[priceId] ?? Tier.FREE;

  // Find user by Stripe customer ID
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error('No user found for Stripe customer:', customerId);
    return;
  }

  // Update subscription
  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      tier,
      status: stripeSubscription.status,
      stripeSubscriptionId: stripeSubscription.id,
      cyclesLimit: TIER_CONFIG[tier].cycles,
      periodStart: new Date(stripeSubscription.current_period_start * 1000),
      periodEnd: new Date(stripeSubscription.current_period_end * 1000),
    },
    create: {
      userId: user.id,
      tier,
      status: stripeSubscription.status,
      stripeSubscriptionId: stripeSubscription.id,
      cyclesUsed: 0,
      cyclesLimit: TIER_CONFIG[tier].cycles,
      periodStart: new Date(stripeSubscription.current_period_start * 1000),
      periodEnd: new Date(stripeSubscription.current_period_end * 1000),
    },
  });

  // Invalidate Redis cache for real-time tier checks
  await invalidateUserCache(user.id);

  console.log(`Updated subscription for user ${user.id}: ${tier}`);
}

async function handleSubscriptionCanceled(
  stripeSubscription: Stripe.Subscription
) {
  const customerId = stripeSubscription.customer as string;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) return;

  // Downgrade to Free tier
  await prisma.subscription.update({
    where: { userId: user.id },
    data: {
      tier: Tier.FREE,
      status: 'canceled',
      cyclesLimit: TIER_CONFIG[Tier.FREE].cycles,
    },
  });

  await invalidateUserCache(user.id);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Reset cycle count on successful payment (new billing period)
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) return;

  // Only reset on subscription invoices (not one-time charges)
  if (subscriptionId) {
    await prisma.subscription.update({
      where: { userId: user.id },
      data: { cyclesUsed: 0 },
    });

    await invalidateUserCache(user.id);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Log payment failure — don't immediately downgrade
  // Stripe handles retry logic; we only downgrade on subscription.deleted
  console.warn(`Payment failed for invoice ${invoice.id}`);
}
```

### Redis Cache Invalidation

Real-time tier checks require cache invalidation:

```typescript
// apps/web/src/lib/redis.ts

import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

const USER_CACHE_PREFIX = 'user:subscription:';
const CACHE_TTL = 300; // 5 minutes

export async function getUserSubscription(
  userId: string
): Promise<CachedSubscription | null> {
  const cached = await redis.get(`${USER_CACHE_PREFIX}${userId}`);
  if (cached) return JSON.parse(cached);
  return null;
}

export async function setUserSubscription(
  userId: string,
  subscription: CachedSubscription
) {
  await redis.setex(
    `${USER_CACHE_PREFIX}${userId}`,
    CACHE_TTL,
    JSON.stringify(subscription)
  );
}

export async function invalidateUserCache(userId: string) {
  await redis.del(`${USER_CACHE_PREFIX}${userId}`);
}

interface CachedSubscription {
  tier: string;
  cyclesUsed: number;
  cyclesLimit: number;
  periodEnd: string;
}
```

---

## 3. Execution → Authorization Check

### Pre-Dispatch Authorization

Before executing a managed dispatch, validate the user's tier and remaining cycles:

```typescript
// packages/core/src/billing/authorization.ts

import { Tier, TIER_CONFIG, TierFeatures } from './tiers';

export interface AuthorizationContext {
  userId: string;
  tier: Tier;
  cyclesUsed: number;
  cyclesLimit: number;
  periodEnd: Date;
}

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  warning?: string;
  remainingCycles: number;
  features: TierFeatures;
}

export function authorizeDispatch(
  ctx: AuthorizationContext
): AuthorizationResult {
  const features = TIER_CONFIG[ctx.tier];
  const remaining = ctx.cyclesLimit - ctx.cyclesUsed;

  // Check if period has expired (shouldn't happen with active Stripe sub)
  if (new Date() > ctx.periodEnd) {
    return {
      authorized: false,
      reason: 'Billing period expired. Please check your subscription.',
      remainingCycles: 0,
      features,
    };
  }

  // Check cycle limit
  if (remaining <= 0) {
    return {
      authorized: false,
      reason: `Cycle limit reached (${ctx.cyclesLimit}/month). Upgrade to continue.`,
      remainingCycles: 0,
      features,
    };
  }

  // Soft warning at 20% remaining
  const warningThreshold = Math.floor(ctx.cyclesLimit * 0.2);
  let warning: string | undefined;

  if (remaining <= warningThreshold) {
    warning = `⚠️ ${remaining} cycles remaining this period.`;
  }

  return {
    authorized: true,
    warning,
    remainingCycles: remaining,
    features,
  };
}

// Feature gate for tier-specific capabilities
export function hasFeature(tier: Tier, feature: keyof TierFeatures): boolean {
  return (
    TIER_CONFIG[tier][feature] === true || TIER_CONFIG[tier][feature] === -1
  );
}
```

### Managed Execution Authorization Flow

```typescript
// apps/web/src/app/api/dispatch/route.ts

import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeDispatch, hasFeature } from '@ada-ai/core';
import { queueDispatch } from '@/lib/dispatch-queue';

export async function POST(req: Request) {
  // 1. Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Get current subscription state
  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  if (!subscription) {
    return NextResponse.json(
      { error: 'No subscription found' },
      { status: 403 }
    );
  }

  // 3. Authorize dispatch
  const authResult = authorizeDispatch({
    userId: session.user.id,
    tier: subscription.tier,
    cyclesUsed: subscription.cyclesUsed,
    cyclesLimit: subscription.cyclesLimit,
    periodEnd: subscription.periodEnd,
  });

  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.reason, upgradeUrl: '/dashboard/billing' },
      { status: 402 }
    );
  }

  // 4. Check feature gates (e.g., managed execution requires Pro+)
  if (!hasFeature(subscription.tier, 'managedExecution')) {
    return NextResponse.json(
      {
        error: 'Managed execution requires Pro tier or higher',
        upgradeUrl: '/dashboard/billing',
      },
      { status: 403 }
    );
  }

  // 5. Queue the dispatch
  const { repoUrl, role } = await req.json();
  const dispatchId = await queueDispatch({
    userId: session.user.id,
    repoUrl,
    role,
    tier: subscription.tier,
  });

  // 6. Increment cycle count (optimistically)
  await prisma.subscription.update({
    where: { userId: session.user.id },
    data: { cyclesUsed: { increment: 1 } },
  });

  return NextResponse.json({
    dispatchId,
    warning: authResult.warning,
    remainingCycles: authResult.remainingCycles - 1,
  });
}
```

---

## 4. CLI → Platform Authentication

### API Key Authentication for CLI

For CLI dispatch (non-browser), users need API keys:

```typescript
// packages/cli/src/commands/auth.ts

import { Command } from 'commander';
import { writeAuthConfig, AUTH_CONFIG_PATH } from '../config';

export const authCommand = new Command('auth')
  .description('Authenticate with ADA platform')
  .command('login')
  .description('Login via browser')
  .action(async () => {
    // 1. Generate device code
    const response = await fetch(`${PLATFORM_URL}/api/auth/device/code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: 'ada-cli' }),
    });

    const { device_code, user_code, verification_uri } = await response.json();

    console.log(`\nVisit: ${verification_uri}`);
    console.log(`Enter code: ${user_code}\n`);

    // 2. Poll for authorization
    const token = await pollForToken(device_code);

    // 3. Save token locally
    await writeAuthConfig({ apiKey: token });
    console.log('✅ Authenticated successfully');
  });

async function pollForToken(deviceCode: string): Promise<string> {
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(5000);

    const response = await fetch(`${PLATFORM_URL}/api/auth/device/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_code: deviceCode, client_id: 'ada-cli' }),
    });

    if (response.ok) {
      const { access_token } = await response.json();
      return access_token;
    }

    const { error } = await response.json();
    if (error === 'authorization_pending') continue;
    if (error === 'expired_token') throw new Error('Authorization expired');
    if (error === 'access_denied') throw new Error('Access denied');
  }

  throw new Error('Timeout waiting for authorization');
}
```

### API Key Middleware

```typescript
// apps/web/src/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyApiKey } from './lib/api-keys';

export async function middleware(request: NextRequest) {
  // Skip for non-API routes and webhooks
  if (!request.nextUrl.pathname.startsWith('/api/v1/')) {
    return NextResponse.next();
  }

  // Allow Stripe webhooks (signature verified in handler)
  if (request.nextUrl.pathname.startsWith('/api/webhooks/')) {
    return NextResponse.next();
  }

  // Check for API key
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    return NextResponse.json({ error: 'API key required' }, { status: 401 });
  }

  // Verify API key and get user
  const user = await verifyApiKey(apiKey);
  if (!user) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // Add user to request headers for downstream handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', user.id);
  requestHeaders.set('x-user-tier', user.tier);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: '/api/v1/:path*',
};
```

---

## 5. Security Considerations

### Token Security

| Token Type         | Storage                       | Lifetime      | Refresh               |
| ------------------ | ----------------------------- | ------------- | --------------------- |
| NextAuth Session   | HTTP-only cookie              | 30 days       | Automatic on activity |
| API Key            | Local file (~/.ada/auth.json) | Until revoked | Manual rotation       |
| Stripe Customer ID | Database                      | Permanent     | N/A                   |

### CSRF Protection

NextAuth provides built-in CSRF protection for session-based routes. API key routes are exempt (no cookies = no CSRF risk).

### Rate Limiting

Apply rate limits at multiple layers:

```typescript
// Per-user rate limits (Redis)
const RATE_LIMITS = {
  [Tier.FREE]: { requests: 100, window: '15m' },
  [Tier.PRO]: { requests: 1000, window: '15m' },
  [Tier.TEAM]: { requests: 5000, window: '15m' },
  [Tier.ENTERPRISE]: { requests: -1, window: '15m' }, // Unlimited
};
```

---

## 6. Implementation Checklist

### Week 1 (Mar 1-7)

- [ ] **Auth Integration** (#181)
  - [ ] Add Free subscription creation in NextAuth signIn callback
  - [ ] Enrich session with tier/cycles data
  - [ ] Add session type augmentation

- [ ] **Stripe Webhooks** (#182)
  - [ ] Implement webhook handler with signature verification
  - [ ] Handle subscription lifecycle events
  - [ ] Add Redis cache invalidation

### Week 2 (Mar 8-14)

- [ ] **Execution Authorization** (#189)
  - [ ] Implement authorizeDispatch function in @ada-ai/core
  - [ ] Add feature gates for tier-specific capabilities
  - [ ] Implement dispatch API endpoint with auth checks

- [ ] **CLI Authentication**
  - [ ] Implement device flow login
  - [ ] Add API key middleware
  - [ ] Store auth config locally

---

## 7. Testing Strategy

### Integration Test Matrix

| Flow                | Auth          | Billing                | Execution        | Expected      |
| ------------------- | ------------- | ---------------------- | ---------------- | ------------- |
| New user signup     | GitHub OAuth  | Free tier auto-created | 50 cycles        | ✅ Works      |
| Pro upgrade         | Existing user | Stripe checkout        | 500 cycles       | ✅ Works      |
| Cycle exhaustion    | Authenticated | At limit               | Dispatch         | ❌ 402 error  |
| Subscription cancel | Authenticated | Canceled               | Free tier        | ✅ Downgrade  |
| Webhook replay      | N/A           | Duplicate event        | No double-update | ✅ Idempotent |

### E2E Test Coverage

```typescript
// apps/web/tests/e2e/billing-flow.spec.ts

test.describe('Billing Integration', () => {
  test('new user gets Free tier on signup', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.click('[data-testid="github-signin"]');
    // ... OAuth flow
    await expect(page.locator('[data-testid="tier-badge"]')).toHaveText('Free');
    await expect(page.locator('[data-testid="cycles-remaining"]')).toHaveText('50');
  });

  test('upgrade to Pro increases cycle limit', async ({ page }) => {
    // ... login
    await page.goto('/dashboard/billing');
    await page.click('[data-testid="upgrade-pro"]');
    // ... Stripe checkout
    await expect(page.locator('[data-testid="cycles-remaining"]')).toHaveText('500');
  });

  test('dispatch blocked when cycles exhausted', async ({ page }) => {
    // ... setup user with 0 remaining cycles
    const response = await page.request.post('/api/v1/dispatch', { ... });
    expect(response.status()).toBe(402);
  });
});
```

---

## Summary

This spec defines the integration patterns between Auth, Billing, and Managed Execution for Sprint 3:

1. **Auth → User Record**: NextAuth creates Free subscription on first sign-in, enriches session with tier data
2. **Billing → Subscription**: Stripe webhooks update tier/limits in real-time, invalidate Redis cache
3. **Execution → Authorization**: Pre-dispatch check validates tier, remaining cycles, and feature gates
4. **CLI → Platform**: Device flow login + API key authentication for non-browser usage

These patterns ensure seamless user experience from GitHub sign-in through paid subscription to managed dispatch execution.

---

_Research Cycle 1195 | 🔬 The Scout_
