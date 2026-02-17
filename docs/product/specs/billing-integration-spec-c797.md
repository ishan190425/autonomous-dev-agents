# Billing Integration Product Spec (C797)

> **Author:** 📦 Product (The PM)  
> **Cycle:** 797 | 2026-02-17  
> **Status:** Draft  
> **Issue:** #182 (Billing Integration — Stripe Subscription Management)  
> **Related:** #155 (SaaS Container), #158 (Bootstrap via SaaS), #189 (Managed Execution)

---

## Executive Summary

Define the complete billing system for ADA SaaS: pricing tiers, usage metering, Stripe integration, and user experience. Enables first MRR ($100 by Mar 31 North Star).

---

## Pricing Model

### Tier Structure

| Tier           | Price  | Cycles/mo | API Calls/mo | Team Members | Support         |
| -------------- | ------ | --------- | ------------ | ------------ | --------------- |
| **Free**       | $0     | 100       | 1,000        | 1            | Community       |
| **Pro**        | $19/mo | 1,000     | 10,000       | 5            | Email (48h SLA) |
| **Enterprise** | $99/mo | 10,000    | 100,000      | Unlimited    | Priority (24h)  |

### Usage-Based Pricing

Beyond tier limits, usage is metered:

| Resource  | Overage Rate | Billing Increment |
| --------- | ------------ | ----------------- |
| Cycles    | $0.02/cycle  | Per cycle         |
| API Calls | $0.001/call  | Per 100 calls     |

### Credit System

Reference: Managed Execution spec (C787) defines the credit model:

- **1 Credit = 1 Dispatch Cycle** (Sonnet-class model)
- **2 Credits = 1 Opus-class cycle** (premium models)
- Credits included per tier, overages billed monthly
- Unused credits expire at billing cycle end (no rollover in MVP)

---

## User Personas & Flows

### Flow 1: Free → Pro Upgrade

**Trigger:** User hits 100 cycles or wants team features

```
1. User sees "Upgrade to Pro" prompt in dashboard
2. Click → Stripe Checkout (hosted page)
3. Enter payment info → Subscribe
4. Webhook confirms → Tier updated immediately
5. Dashboard shows new limits (1,000 cycles, 5 members)
6. Email confirmation sent
```

**UX Requirements:**

- Upgrade prompt appears at 80% usage (80 cycles)
- Hard block at 100% with clear messaging
- No partial cycles — if at limit, must upgrade to continue

### Flow 2: Pro → Enterprise Upgrade

**Trigger:** User needs unlimited team or >1,000 cycles

```
1. User clicks "Upgrade to Enterprise" in Settings
2. Stripe Checkout with prorated billing
3. Immediate access to Enterprise features
4. Notification to support for onboarding check-in
```

### Flow 3: Downgrade (Enterprise → Pro or Pro → Free)

**Trigger:** User chooses to reduce tier

```
1. User clicks "Change Plan" in Settings
2. Select lower tier → Warning modal:
   - "You'll lose [X members, Y cycle limit]"
   - "Change takes effect at end of billing period"
3. Confirm → Downgrade scheduled
4. Webhook at period end → Tier updated
5. If over new limits:
   - Team members: Admin chooses who to keep
   - Cycles: Next month starts fresh
```

### Flow 4: Payment Failure

**Trigger:** Card declined, expired, insufficient funds

```
1. Stripe retry logic (3 attempts over 7 days)
2. Email notification on first failure
3. Dashboard banner: "Update payment method"
4. Day 7: Final warning email
5. Day 14: Downgrade to Free tier
6. Day 14+: Agent cycles blocked until payment updated
```

### Flow 5: Overage Billing

**Trigger:** User exceeds tier limits but continues usage

```
1. At limit: Banner "You've used 100% of cycles"
2. "Enable overages" toggle in Settings
3. If enabled: Continue running, $0.02/cycle
4. End of month: Invoice includes base + overages
5. If disabled: Cycles blocked at 100%
```

**Default:** Overages DISABLED for Free tier, ENABLED for Pro/Enterprise

---

## Stripe Integration Architecture

### Products & Prices

```typescript
// Stripe Product Structure
const products = {
  ada_pro: {
    name: 'ADA Pro',
    price_monthly: 1900, // cents
    stripe_price_id: 'price_ada_pro_monthly',
  },
  ada_enterprise: {
    name: 'ADA Enterprise',
    price_monthly: 9900,
    stripe_price_id: 'price_ada_enterprise_monthly',
  },
};

// Usage-based metering
const meters = {
  cycles: {
    meter_id: 'mtr_cycles',
    event_name: 'cycle_completed',
    rate: 2, // $0.02 = 2 cents
  },
  api_calls: {
    meter_id: 'mtr_api',
    event_name: 'api_call',
    rate: 0.1, // $0.001 = 0.1 cents
  },
};
```

### Webhook Events

| Event                                | Handler Action                                |
| ------------------------------------ | --------------------------------------------- |
| `checkout.session.completed`         | Create/upgrade subscription, update user tier |
| `customer.subscription.updated`      | Sync tier changes                             |
| `customer.subscription.deleted`      | Downgrade to Free                             |
| `invoice.payment_succeeded`          | Reset usage counters, send receipt            |
| `invoice.payment_failed`             | Send warning, start grace period              |
| `customer.subscription.trial_ending` | Send trial ending notification (future)       |

### Usage Reporting

```typescript
// Report cycle completion to Stripe
async function reportCycleUsage(
  customerId: string,
  cycleId: string,
  credits: number = 1
): Promise<void> {
  await stripe.billing.meterEvents.create({
    event_name: 'cycle_completed',
    payload: {
      stripe_customer_id: customerId,
      value: credits.toString(),
      timestamp: Math.floor(Date.now() / 1000),
    },
    identifier: cycleId, // Deduplication key
  });
}
```

---

## Data Model

### Subscriptions Table

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  workspace_id UUID REFERENCES workspaces(id),
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255),
  tier VARCHAR(20) NOT NULL DEFAULT 'free', -- free, pro, enterprise
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, past_due, canceled
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cycles_used INTEGER DEFAULT 0,
  cycles_limit INTEGER NOT NULL,
  api_calls_used INTEGER DEFAULT 0,
  api_calls_limit INTEGER NOT NULL,
  overages_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_customer_id);
```

### Usage Events Table

```sql
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- cycle, api_call
  event_id VARCHAR(255) NOT NULL, -- External reference (cycle_id, etc.)
  credits INTEGER NOT NULL DEFAULT 1,
  timestamp TIMESTAMP DEFAULT NOW(),
  reported_to_stripe BOOLEAN DEFAULT false,
  stripe_event_id VARCHAR(255)
);

CREATE INDEX idx_usage_subscription ON usage_events(subscription_id);
CREATE INDEX idx_usage_type_time ON usage_events(event_type, timestamp);
```

---

## API Endpoints

```typescript
// Billing Management
GET / api / billing; // Current subscription status
POST / api / billing / checkout; // Create Stripe Checkout session
POST / api / billing / portal; // Create Stripe Customer Portal session
GET / api / billing / usage; // Current usage stats
POST / api / billing / overages; // Toggle overages on/off

// Webhooks
POST / api / webhooks / stripe; // Stripe webhook handler

// Internal (service-to-service)
POST / api / internal / usage / report; // Report usage event
GET / api / internal / usage / check; // Check if user can run cycle
```

---

## Dashboard UI

### Billing Page (`/settings/billing`)

```
┌─────────────────────────────────────────────────┐
│ Current Plan: Pro ($19/mo)              [Manage]│
├─────────────────────────────────────────────────┤
│ Usage This Period (Feb 1 - Feb 28)              │
│                                                 │
│ Cycles:     ████████░░  823 / 1,000 (82%)      │
│ API Calls:  ██░░░░░░░░  2,341 / 10,000 (23%)   │
│                                                 │
│ ⚡ Overages: Enabled ($0.02/cycle after limit) │
│                                                 │
│ [View Usage History]  [Download Invoice]        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Payment Method                                  │
│ •••• 4242  Expires 12/27            [Update]   │
├─────────────────────────────────────────────────┤
│ Next Invoice: Feb 28, 2026                      │
│ Estimated: $19.00 + $0.00 overages = $19.00    │
└─────────────────────────────────────────────────┘
```

### Upgrade Prompt (Modal)

```
┌─────────────────────────────────────────────────┐
│         ⚡ You've hit your cycle limit          │
│                                                 │
│  Your Free plan includes 100 cycles/month.     │
│  Upgrade to Pro for 1,000 cycles.              │
│                                                 │
│  ┌─────────────┐    ┌─────────────┐            │
│  │    Free     │    │  Pro ⭐     │            │
│  │    $0/mo    │ →  │   $19/mo    │            │
│  │ 100 cycles  │    │ 1,000 cycles│            │
│  │ 1 member    │    │ 5 members   │            │
│  └─────────────┘    └─────────────┘            │
│                                                 │
│  [Continue Free]         [Upgrade to Pro →]    │
└─────────────────────────────────────────────────┘
```

---

## Edge Cases

### 1. Mid-Cycle Upgrade

- **Scenario:** User upgrades from Free to Pro mid-billing cycle
- **Handling:** Prorate first invoice, immediately increase limits
- **Implementation:** Stripe handles proration automatically

### 2. Concurrent Workspace Subscriptions

- **Scenario:** User belongs to multiple workspaces with different tiers
- **Handling:** Each workspace has independent subscription and limits
- **Note:** Personal (Free) account separate from workspace subscriptions

### 3. Disputed Charge

- **Scenario:** User disputes Stripe charge
- **Handling:**
  1. Webhook `charge.dispute.created` triggers
  2. Account flagged, support notified
  3. Service continues during dispute
  4. If dispute lost: account downgraded + banned from paid tiers

### 4. Canceled Mid-Cycle

- **Scenario:** User cancels Pro subscription on day 15 of billing cycle
- **Handling:**
  1. Access continues until period end
  2. No proration refund (standard SaaS practice)
  3. Downgrade to Free at period end

### 5. Team Removal on Downgrade

- **Scenario:** Enterprise (unlimited) → Pro (5 members)
- **Handling:**
  1. Admin prompted to select 5 members to keep
  2. Others become "inactive" (can't access, data preserved)
  3. If no selection by period end: keep 5 most recently active

---

## Implementation Plan

### Phase 1: MVP Billing (Sprint 3)

1. **Stripe Products Setup**
   - Create Pro/Enterprise products in Stripe
   - Configure usage-based metering
   - Set up webhook endpoint

2. **Checkout Flow**
   - Stripe Checkout integration (hosted page)
   - Success/cancel redirect handling
   - Subscription creation on webhook

3. **Usage Tracking**
   - Report cycles to Stripe metering
   - Dashboard usage display
   - Limit enforcement

4. **Basic UI**
   - Current plan display
   - Upgrade button → Checkout
   - Usage bar visualization

### Phase 2: Full Billing (Sprint 4)

1. **Customer Portal**
   - Stripe-hosted portal for payment management
   - Invoice history
   - Plan changes

2. **Downgrade Flow**
   - Plan comparison UI
   - Team member selection
   - Scheduled downgrades

3. **Overage Controls**
   - Toggle in settings
   - Overage projection in dashboard
   - Invoice breakdown

---

## Acceptance Criteria

### P0 (Launch Blocking)

- [ ] Stripe products and prices configured
- [ ] Checkout flow: Free → Pro upgrade works
- [ ] Webhook handler processes subscription events
- [ ] Usage tracked and reported to Stripe
- [ ] Dashboard shows current plan and usage
- [ ] Cycle limit enforced at 100% (blocks with upgrade prompt)

### P1 (Near-Term)

- [ ] Enterprise tier checkout
- [ ] Customer portal integration
- [ ] Payment failure handling (grace period)
- [ ] Overage toggle and billing
- [ ] Invoice download

### P2 (Future)

- [ ] Annual billing discount
- [ ] Workspace billing (multiple admins)
- [ ] Usage alerts (80%, 90%, 100%)
- [ ] Credit rollover (unused → next month)
- [ ] Referral credits

---

## Success Metrics

| Metric                | Target (M1) | Target (M3) |
| --------------------- | ----------- | ----------- |
| Paying Customers      | 10          | 50          |
| MRR                   | $190        | $950        |
| Free → Pro Conversion | 5%          | 10%         |
| Churn Rate            | <10%        | <5%         |
| Avg Revenue Per User  | $19         | $25         |

---

## Technical Dependencies

- **Stripe SDK** — `stripe-node` for server-side
- **NextAuth.js** — Session for authenticated requests
- **PostgreSQL** — Subscription and usage data
- **Background Jobs** — Usage aggregation, webhook retry

---

## Open Questions

1. **Trial Period:** Should Pro have 7-day free trial?
   - _Recommendation:_ No trial for MVP. Add in Phase 2 based on conversion data.

2. **Annual Billing:**
   - _Recommendation:_ Defer to Phase 2. Monthly validates pricing faster.

3. **Refunds:**
   - _Recommendation:_ Case-by-case via support. No self-service refunds.

---

_Generated by 📦 Product at Cycle 797_
