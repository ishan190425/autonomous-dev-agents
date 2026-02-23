# Sprint 3 SaaS Tier Technical Specification (C1185)

> **Purpose:** Technical spec for billing/tier implementation in Sprint 3
> **Author:** 🔬 Research (The Scout)
> **Cycle:** 1185 | **Date:** 2026-02-23 15:45 EST
> **Related:** #155 (SaaS Container), #182 (Billing Integration), cost-analysis-vs-competitors.md
> **Sprint 3:** Mar 1-14, 2026

---

## Executive Summary

This document provides the **technical specification** for implementing ADA's SaaS tier system in Sprint 3. It builds on the cost analysis from C59 and provides concrete implementation guidance for the billing system.

**Key Decisions:**

1. **4 tiers:** Free, Pro ($19/mo), Team ($49/mo), Enterprise (custom)
2. **Cycle-based metering:** Primary billing unit is dispatch cycles
3. **Soft limits with warnings:** Don't hard-block users, warn at thresholds
4. **Usage-based add-ons:** Extra cycles purchasable for any tier

---

## 1. Tier Structure

### 1.1 Pricing Matrix

| Tier           | Price/mo | Cycles/mo | Team Size | Support     | Target Segment      |
| -------------- | -------- | --------- | --------- | ----------- | ------------------- |
| **Free**       | $0       | 50        | 1 user    | Community   | Evaluation          |
| **Pro**        | $19      | 500       | 1 user    | Email (48h) | Individual devs     |
| **Team**       | $49      | 2,000     | 5 users   | Email (24h) | Small teams         |
| **Enterprise** | Custom   | Unlimited | Unlimited | SLA + Slack | Large organizations |

### 1.2 Updated Unit Economics (C1185)

Based on 1,185 cycles of dogfooding data:

| Metric                    | C59 Estimate | C1185 Actual | Notes             |
| ------------------------- | ------------ | ------------ | ----------------- |
| Cost per cycle            | ~$0.10       | ~$0.08       | Improved prompts  |
| Avg tokens/cycle (input)  | 11,000       | 9,500        | Tighter playbooks |
| Avg tokens/cycle (output) | 4,500        | 4,200        | Focused actions   |
| Cycles/day (dogfooding)   | 6-12         | 10-15        | Increased cadence |

**Revised Cost Structure:**

- Free (50 cycles): $4 cost → **acquisition investment**
- Pro (500 cycles): $40 cost, $19 price → **$21 subsidy** (acceptable for growth)
- Team (2000 cycles): $160 cost, $49 price → **$111 subsidy** (initial)
- Enterprise: Custom pricing to ensure profitability

**Path to Profitability:**

1. Anthropic volume discounts at scale
2. Prompt caching (coming in v1.1)
3. Tiered model routing (cheaper models for simple cycles)
4. Enterprise margins subsidize growth tiers

---

## 2. Feature Gating

### 2.1 Feature Availability Matrix

| Feature                | Free | Pro | Team | Enterprise |
| ---------------------- | ---- | --- | ---- | ---------- |
| CLI usage              | ✅   | ✅  | ✅   | ✅         |
| Basic dispatch         | ✅   | ✅  | ✅   | ✅         |
| Memory bank            | ✅   | ✅  | ✅   | ✅         |
| GitHub integration     | ✅   | ✅  | ✅   | ✅         |
| **Cycles/month**       | 50   | 500 | 2000 | Unlimited  |
| Dashboard access       | ❌   | ✅  | ✅   | ✅         |
| API access             | ❌   | ✅  | ✅   | ✅         |
| Custom playbooks       | ❌   | ✅  | ✅   | ✅         |
| Team workspaces        | ❌   | ❌  | ✅   | ✅         |
| Multiple repos         | 1    | 3   | 10   | Unlimited  |
| Priority model routing | ❌   | ❌  | ✅   | ✅         |
| SSO/SAML               | ❌   | ❌  | ❌   | ✅         |
| Audit logs             | ❌   | ❌  | ❌   | ✅         |
| Dedicated support      | ❌   | ❌  | ❌   | ✅         |
| On-prem deployment     | ❌   | ❌  | ❌   | ✅         |

### 2.2 Rate Limits

| Tier       | Cycles/day | Cycles/hour | Concurrent |
| ---------- | ---------- | ----------- | ---------- |
| Free       | 10         | 3           | 1          |
| Pro        | 50         | 10          | 2          |
| Team       | 200        | 30          | 5          |
| Enterprise | Unlimited  | Unlimited   | Custom     |

---

## 3. Technical Implementation

### 3.1 Database Schema (Prisma)

```prisma
// User subscription state
model Subscription {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  tier            Tier     @default(FREE)
  stripeCustomerId String?
  stripeSubscriptionId String?
  cyclesUsed      Int      @default(0)
  cyclesLimit     Int      @default(50)
  periodStart     DateTime @default(now())
  periodEnd       DateTime
  status          SubscriptionStatus @default(ACTIVE)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum Tier {
  FREE
  PRO
  TEAM
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  TRIALING
}

// Usage tracking
model CycleUsage {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  repoId      String
  cycleNumber Int
  tokensIn    Int
  tokensOut   Int
  cost        Float    // Calculated cost in USD
  createdAt   DateTime @default(now())
}
```

### 3.2 Tier Configuration (TypeScript)

```typescript
// packages/core/src/billing/tiers.ts

export interface TierConfig {
  name: string;
  displayName: string;
  monthlyPrice: number;
  cyclesPerMonth: number;
  cyclesPerDay: number;
  cyclesPerHour: number;
  maxConcurrent: number;
  maxRepos: number;
  maxTeamSize: number;
  features: TierFeatures;
}

export interface TierFeatures {
  dashboard: boolean;
  api: boolean;
  customPlaybooks: boolean;
  teamWorkspaces: boolean;
  priorityRouting: boolean;
  sso: boolean;
  auditLogs: boolean;
  dedicatedSupport: boolean;
  onPrem: boolean;
}

export const TIER_CONFIG: Record<Tier, TierConfig> = {
  FREE: {
    name: 'FREE',
    displayName: 'Free',
    monthlyPrice: 0,
    cyclesPerMonth: 50,
    cyclesPerDay: 10,
    cyclesPerHour: 3,
    maxConcurrent: 1,
    maxRepos: 1,
    maxTeamSize: 1,
    features: {
      dashboard: false,
      api: false,
      customPlaybooks: false,
      teamWorkspaces: false,
      priorityRouting: false,
      sso: false,
      auditLogs: false,
      dedicatedSupport: false,
      onPrem: false,
    },
  },
  PRO: {
    name: 'PRO',
    displayName: 'Pro',
    monthlyPrice: 1900, // cents
    cyclesPerMonth: 500,
    cyclesPerDay: 50,
    cyclesPerHour: 10,
    maxConcurrent: 2,
    maxRepos: 3,
    maxTeamSize: 1,
    features: {
      dashboard: true,
      api: true,
      customPlaybooks: true,
      teamWorkspaces: false,
      priorityRouting: false,
      sso: false,
      auditLogs: false,
      dedicatedSupport: false,
      onPrem: false,
    },
  },
  TEAM: {
    name: 'TEAM',
    displayName: 'Team',
    monthlyPrice: 4900, // cents
    cyclesPerMonth: 2000,
    cyclesPerDay: 200,
    cyclesPerHour: 30,
    maxConcurrent: 5,
    maxRepos: 10,
    maxTeamSize: 5,
    features: {
      dashboard: true,
      api: true,
      customPlaybooks: true,
      teamWorkspaces: true,
      priorityRouting: true,
      sso: false,
      auditLogs: false,
      dedicatedSupport: false,
      onPrem: false,
    },
  },
  ENTERPRISE: {
    name: 'ENTERPRISE',
    displayName: 'Enterprise',
    monthlyPrice: -1, // Custom
    cyclesPerMonth: -1, // Unlimited
    cyclesPerDay: -1,
    cyclesPerHour: -1,
    maxConcurrent: -1,
    maxRepos: -1,
    maxTeamSize: -1,
    features: {
      dashboard: true,
      api: true,
      customPlaybooks: true,
      teamWorkspaces: true,
      priorityRouting: true,
      sso: true,
      auditLogs: true,
      dedicatedSupport: true,
      onPrem: true,
    },
  },
};

// Helper functions
export function getCycleLimit(tier: Tier): number {
  return TIER_CONFIG[tier].cyclesPerMonth;
}

export function hasFeature(tier: Tier, feature: keyof TierFeatures): boolean {
  return TIER_CONFIG[tier].features[feature];
}

export function canUseCycles(
  tier: Tier,
  cyclesUsed: number,
  cyclesRequested: number = 1
): { allowed: boolean; reason?: string; remaining: number } {
  const config = TIER_CONFIG[tier];

  if (config.cyclesPerMonth === -1) {
    return { allowed: true, remaining: Infinity };
  }

  const remaining = config.cyclesPerMonth - cyclesUsed;

  if (remaining < cyclesRequested) {
    return {
      allowed: false,
      reason: `Cycle limit reached (${cyclesUsed}/${config.cyclesPerMonth})`,
      remaining,
    };
  }

  return { allowed: true, remaining };
}
```

### 3.3 Soft Limit Warning Thresholds

```typescript
// packages/core/src/billing/warnings.ts

export const WARNING_THRESHOLDS = {
  // Percentage of limit that triggers warning
  LOW_CYCLES: 0.2, // 20% remaining
  CRITICAL_CYCLES: 0.1, // 10% remaining

  // Day-based warnings
  APPROACHING_RESET: 3, // Days before period reset
};

export function getCycleWarning(
  tier: Tier,
  cyclesUsed: number
): CycleWarning | null {
  const config = TIER_CONFIG[tier];
  if (config.cyclesPerMonth === -1) return null;

  const remaining = config.cyclesPerMonth - cyclesUsed;
  const percentage = remaining / config.cyclesPerMonth;

  if (percentage <= WARNING_THRESHOLDS.CRITICAL_CYCLES) {
    return {
      level: 'critical',
      message: `⚠️ Critical: Only ${remaining} cycles remaining this period`,
      remaining,
      suggestion: 'Consider upgrading to continue uninterrupted development',
    };
  }

  if (percentage <= WARNING_THRESHOLDS.LOW_CYCLES) {
    return {
      level: 'warning',
      message: `⚡ ${remaining} cycles remaining (${Math.round(percentage * 100)}%)`,
      remaining,
      suggestion: null,
    };
  }

  return null;
}
```

### 3.4 Usage Metering Integration

```typescript
// packages/core/src/billing/metering.ts

export async function recordCycleUsage(
  userId: string,
  repoId: string,
  cycleNumber: number,
  tokenUsage: { input: number; output: number }
): Promise<void> {
  // Calculate cost (Claude 3.5 Sonnet rates)
  const cost =
    (tokenUsage.input / 1_000_000) * 3.0 +
    (tokenUsage.output / 1_000_000) * 15.0;

  await prisma.cycleUsage.create({
    data: {
      userId,
      repoId,
      cycleNumber,
      tokensIn: tokenUsage.input,
      tokensOut: tokenUsage.output,
      cost,
    },
  });

  // Increment subscription usage
  await prisma.subscription.update({
    where: { userId },
    data: { cyclesUsed: { increment: 1 } },
  });
}

export async function getUsageSummary(
  userId: string,
  periodStart: Date
): Promise<UsageSummary> {
  const usage = await prisma.cycleUsage.aggregate({
    where: {
      userId,
      createdAt: { gte: periodStart },
    },
    _sum: {
      tokensIn: true,
      tokensOut: true,
      cost: true,
    },
    _count: true,
  });

  return {
    cyclesUsed: usage._count,
    tokensIn: usage._sum.tokensIn ?? 0,
    tokensOut: usage._sum.tokensOut ?? 0,
    totalCost: usage._sum.cost ?? 0,
  };
}
```

---

## 4. Stripe Integration

### 4.1 Product Configuration

```javascript
// Stripe Dashboard Configuration (or via API)

// Products
const products = {
  ada_pro: {
    name: 'ADA Pro',
    description: '500 cycles/month for individual developers',
  },
  ada_team: {
    name: 'ADA Team',
    description: '2000 cycles/month for small teams (up to 5 users)',
  },
};

// Prices
const prices = {
  ada_pro_monthly: {
    product: 'ada_pro',
    unit_amount: 1900,
    currency: 'usd',
    recurring: { interval: 'month' },
  },
  ada_pro_annual: {
    product: 'ada_pro',
    unit_amount: 19000, // 2 months free
    currency: 'usd',
    recurring: { interval: 'year' },
  },
  ada_team_monthly: {
    product: 'ada_team',
    unit_amount: 4900,
    currency: 'usd',
    recurring: { interval: 'month' },
  },
  ada_team_annual: {
    product: 'ada_team',
    unit_amount: 49000, // 2 months free
    currency: 'usd',
    recurring: { interval: 'year' },
  },
};
```

### 4.2 Webhook Handlers

```typescript
// apps/web/app/api/webhooks/stripe/route.ts

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')!;
  const body = await req.text();

  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
  }

  return new Response('OK');
}
```

---

## 5. CLI Integration

### 5.1 Pre-Dispatch Check

```typescript
// packages/cli/src/commands/dispatch/start.ts

async function preDispatchCheck(context: DispatchContext): Promise<void> {
  // Skip check for local-only mode
  if (!context.config.saas?.enabled) return;

  const subscription = await getSubscription(context.userId);
  const { allowed, reason, remaining } = canUseCycles(
    subscription.tier,
    subscription.cyclesUsed
  );

  if (!allowed) {
    throw new CycleLimitError(reason);
  }

  // Show warning if approaching limit
  const warning = getCycleWarning(subscription.tier, subscription.cyclesUsed);
  if (warning) {
    console.log(chalk.yellow(warning.message));
    if (warning.suggestion) {
      console.log(chalk.dim(warning.suggestion));
    }
  }
}
```

### 5.2 Status Command Enhancement

```typescript
// packages/cli/src/commands/status.ts

// Add subscription info to status output
if (config.saas?.enabled && subscription) {
  console.log('\n📊 Subscription:');
  console.log(`   Tier: ${subscription.tier}`);
  console.log(
    `   Cycles: ${subscription.cyclesUsed}/${getCycleLimit(subscription.tier)}`
  );
  console.log(`   Period: ${subscription.periodEnd.toLocaleDateString()}`);
}
```

---

## 6. First MRR Path ($100 by Mar 31)

### 6.1 Target Analysis

| Scenario                | Users | Tier | Revenue |
| ----------------------- | ----- | ---- | ------- |
| 6 Pro users             | 6     | Pro  | $114    |
| 3 Team users            | 3     | Team | $147    |
| 4 Pro + 1 Team          | 5     | Mix  | $125    |
| 1 Enterprise ($100 min) | 1     | Ent  | $100    |

**Most likely path:** 5-6 Pro users = $95-114/month

### 6.2 Conversion Funnel

```
Waitlist signups (target: 500)
    ↓ (20% activation)
Free tier users (100)
    ↓ (10% conversion)
Paid users (10)
    ↓ (50% Pro, 40% Team, 10% Enterprise)
Revenue: 5×$19 + 4×$49 + 1×$100 = $391
```

**Conservative estimate:** 3-5 Pro conversions = $57-95/month
**Target:** $100/month requires ~6 Pro or ~2 Team conversions

---

## 7. Implementation Checklist

### Sprint 3 Week 1 (Mar 1-7)

- [ ] Prisma schema (Subscription, CycleUsage, Team)
- [ ] Tier config module with feature flags
- [ ] Basic usage metering
- [ ] Pre-dispatch cycle check
- [ ] CLI status subscription display

### Sprint 3 Week 2 (Mar 8-14)

- [ ] Stripe product/price setup
- [ ] Checkout flow (upgrade to Pro/Team)
- [ ] Webhook handlers (subscription lifecycle)
- [ ] Customer portal integration (manage subscription)
- [ ] Billing dashboard page

### Post-Sprint 3

- [ ] Usage-based add-on cycles
- [ ] Annual billing discount
- [ ] Team member invitations
- [ ] Enterprise custom pricing flow

---

## 8. Competitive Positioning Update

### 8.1 Current Market (Feb 2026)

| Competitor  | Price      | Cycles/Value     | ADA Advantage        |
| ----------- | ---------- | ---------------- | -------------------- |
| Devin       | $500+/mo   | Unlimited        | 26x cheaper          |
| Cursor Pro  | $20/mo     | Fast completions | Autonomous vs assist |
| Copilot     | $19/mo     | Completions      | Full automation      |
| OpenHands   | Free + API | Variable         | Zero setup           |
| Claude Code | API only   | Pay per use      | Team coordination    |

### 8.2 ADA Positioning

**Tagline:** "Autonomous dev teams at indie pricing"

**Value Props:**

1. **$19/mo = 500 autonomous cycles** (vs Copilot's autocomplete)
2. **Multi-agent team** (vs single-agent tools)
3. **24/7 operation** (vs human-driven tools)
4. **Persistent memory** (vs stateless sessions)
5. **Open source core** (vs black-box enterprise)

---

## Summary

This spec provides the technical foundation for Sprint 3 billing implementation:

1. **4-tier structure** with clear feature gating
2. **Cycle-based metering** as primary billing unit
3. **TypeScript interfaces** for Engineering to implement
4. **Stripe integration** patterns for checkout/webhooks
5. **CLI integration** points for usage checking
6. **First MRR path** targeting 5-6 Pro conversions

All code snippets are implementation-ready and follow existing ADA patterns.

---

_🔬 Research (The Scout) — Cycle 1185_
_Per R-017: SHIPPED tangible Sprint 3 technical spec — directly supports #155 (SaaS Container) and #182 (Billing Integration)._
