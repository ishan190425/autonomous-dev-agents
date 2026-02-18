# Billing UX Specification

> **Author:** 🎨 Design (The Architect)  
> **Cycle:** C832 (410 consecutive!)  
> **Date:** 2026-02-17  
> **Status:** Ready for Implementation  
> **Relates to:** #182 (Billing Integration), #155 (SaaS Container)  
> **Builds on:** `docs/product/specs/billing-integration-spec-c797.md`

---

## Overview

UX specification for ADA dashboard billing system. Covers upgrade flows, payment error handling, usage visualization, accessibility requirements, and mobile considerations. Designed for Sprint 3 Week 2 implementation (after Auth, per C822).

---

## 1. User Flows

### 1.1 Free → Pro Upgrade (Happy Path)

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard (at 80% usage)                                    │
│  ┌─────────────────────────────────────┐                    │
│  │  ⚡ You've used 80 of 100 cycles    │                    │
│  │  this month.                         │                    │
│  │                    [Upgrade to Pro]  │   ← Soft prompt    │
│  └─────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
                          │ (continues using)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Dashboard (at 100% usage)                                   │
│  ┌─────────────────────────────────────┐                    │
│  │  🚫 Cycle limit reached              │                    │
│  │                                       │                    │
│  │  You've used all 100 cycles this     │                    │
│  │  month on the Free plan.             │                    │
│  │                                       │                    │
│  │  ┌─────────────────────────────┐     │                    │
│  │  │    Upgrade to Pro ($19/mo)  │     │   ← Hard block    │
│  │  └─────────────────────────────┘     │                    │
│  │                                       │                    │
│  │  Resets Mar 1 · Or enable overages   │                    │
│  └─────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Upgrade Modal                                               │
│  ┌─────────────────────────────────────┐                    │
│  │  🚀 Upgrade to Pro                   │                    │
│  │                                       │                    │
│  │  ┌───────────┐    ┌───────────────┐  │                    │
│  │  │  Free     │    │  Pro ⭐       │  │                    │
│  │  │  $0/mo    │ →  │  $19/mo       │  │                    │
│  │  │           │    │               │  │                    │
│  │  │ 100 cycles│    │ 1,000 cycles  │  │                    │
│  │  │ 1 member  │    │ 5 members     │  │                    │
│  │  │ Community │    │ Email support │  │                    │
│  │  └───────────┘    └───────────────┘  │                    │
│  │                                       │                    │
│  │  ┌─────────────────────────────────┐ │                    │
│  │  │    Continue to Payment →        │ │                    │
│  │  └─────────────────────────────────┘ │                    │
│  │                                       │                    │
│  │  [Maybe Later]                        │                    │
│  └─────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Stripe Checkout (Stripe-hosted)                             │
│  - Pre-filled email from GitHub                              │
│  - Card input                                                │
│  - Secure badge                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Success Page                                                │
│  ┌─────────────────────────────────────┐                    │
│  │  🎉 Welcome to Pro!                  │                    │
│  │                                       │                    │
│  │  Your plan is now active.            │                    │
│  │  1,000 cycles/month · 5 team members │                    │
│  │                                       │                    │
│  │  ┌─────────────────────────────┐     │                    │
│  │  │    Go to Dashboard →        │     │                    │
│  │  └─────────────────────────────┘     │                    │
│  │                                       │                    │
│  │  Receipt sent to you@email.com       │                    │
│  └─────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Payment Failure Recovery

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard (payment failed)                                  │
│  ┌─────────────────────────────────────┐                    │
│  │  ⚠️ Payment Failed                   │   ← Banner (top)   │
│  │  We couldn't charge your card.       │                    │
│  │  [Update Payment Method]             │                    │
│  └─────────────────────────────────────┘                    │
│                                                              │
│  (rest of dashboard still functional during grace period)    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Update Payment Modal                                        │
│  ┌─────────────────────────────────────┐                    │
│  │  💳 Update Payment Method            │                    │
│  │                                       │                    │
│  │  Current card: •••• 4242 (declined)  │                    │
│  │                                       │                    │
│  │  ┌─────────────────────────────┐     │                    │
│  │  │ Card Number                 │     │                    │
│  │  │ ________________________    │     │                    │
│  │  │                             │     │                    │
│  │  │ Expiry     CVC              │     │                    │
│  │  │ ______     ___              │     │                    │
│  │  └─────────────────────────────┘     │                    │
│  │                                       │                    │
│  │  🔒 Secure payment via Stripe        │                    │
│  │                                       │                    │
│  │  ┌─────────────────────────────────┐ │                    │
│  │  │       Save & Retry Payment      │ │                    │
│  │  └─────────────────────────────────┘ │                    │
│  └─────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Downgrade Flow (Pro → Free)

```
┌─────────────────────────────────────────────────────────────┐
│  Settings > Billing > Change Plan                            │
│  ┌─────────────────────────────────────┐                    │
│  │  Change Your Plan                    │                    │
│  │                                       │                    │
│  │  Current: Pro ($19/mo)               │                    │
│  │                                       │                    │
│  │  ┌───────────────┐  ┌───────────────┐│                    │
│  │  │ Free          │  │ Enterprise   ↑││                    │
│  │  │ $0/mo         │  │ $99/mo        ││                    │
│  │  │ Downgrade ↓   │  │ Upgrade       ││                    │
│  │  └───────────────┘  └───────────────┘│                    │
│  └─────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
                          │ (clicks Downgrade)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Downgrade Confirmation Modal                                │
│  ┌─────────────────────────────────────┐                    │
│  │  ⚠️ Downgrade to Free?               │                    │
│  │                                       │                    │
│  │  You'll lose access to:              │                    │
│  │  ✗ 1,000 cycles → 100 cycles         │                    │
│  │  ✗ 5 team members → 1 member         │                    │
│  │  ✗ Email support → Community only    │                    │
│  │                                       │                    │
│  │  Your current cycle usage: 342       │                    │
│  │  ⚠️ This exceeds Free limit (100)    │                    │
│  │                                       │                    │
│  │  Change takes effect: Mar 1, 2026    │                    │
│  │  (end of current billing period)     │                    │
│  │                                       │                    │
│  │  ┌──────────────┐ ┌────────────────┐ │                    │
│  │  │   Keep Pro   │ │ Yes, Downgrade │ │                    │
│  │  └──────────────┘ └────────────────┘ │                    │
│  └─────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. UI Components

### 2.1 Usage Progress Bar

```
Standard (< 80%):
┌────────────────────────────────────────────────────────┐
│ Cycles: ████████░░░░░░░░░░░░  342 / 1,000 (34%)       │
└────────────────────────────────────────────────────────┘

Warning (80-99%):
┌────────────────────────────────────────────────────────┐
│ Cycles: ████████████████░░░░  823 / 1,000 (82%) ⚠️    │
│         [Upgrade] or [Enable Overages]                │
└────────────────────────────────────────────────────────┘

Critical (100%):
┌────────────────────────────────────────────────────────┐
│ Cycles: ████████████████████  1,000 / 1,000 (100%) 🚫 │
│         Limit reached · [Upgrade] or [Enable Overages]│
└────────────────────────────────────────────────────────┘

Specs:
- Bar height: 8px (resting), 12px (hover for tooltip)
- Colors:
  - Normal: var(--color-blue-500)
  - Warning: var(--color-amber-500)
  - Critical: var(--color-red-500)
  - Background: var(--color-neutral-200)
- Border-radius: 4px
- Animation: Smooth width transition (200ms ease-out)
- Tooltip on hover: "342 cycles used this billing period"
```

### 2.2 Plan Cards

```
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│  Free                   │ │  Pro ⭐ POPULAR         │ │  Enterprise             │
│  ─────────────────────  │ │  ─────────────────────  │ │  ─────────────────────  │
│  $0/mo                  │ │  $19/mo                 │ │  $99/mo                 │
│                         │ │                         │ │                         │
│  ✓ 100 cycles/mo        │ │  ✓ 1,000 cycles/mo      │ │  ✓ 10,000 cycles/mo     │
│  ✓ 1 team member        │ │  ✓ 5 team members       │ │  ✓ Unlimited members    │
│  ✓ Community support    │ │  ✓ Email support (48h)  │ │  ✓ Priority support     │
│  ✗ Overages             │ │  ✓ Overage billing      │ │  ✓ Overage billing      │
│  ✗ API access           │ │  ✓ API access           │ │  ✓ API access           │
│                         │ │                         │ │  ✓ SSO (coming soon)    │
│  ┌───────────────────┐  │ │  ┌───────────────────┐  │ │  ┌───────────────────┐  │
│  │    Current Plan   │  │ │  │   Upgrade →       │  │ │  │   Contact Sales   │  │
│  └───────────────────┘  │ │  └───────────────────┘  │ │  └───────────────────┘  │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘

Specs:
- Card width: 280px (desktop), full-width (mobile)
- Border: 1px solid var(--color-neutral-200)
- Selected/current: 2px solid var(--color-blue-500), light blue bg
- "POPULAR" badge: var(--color-blue-500) bg, white text, top-right
- Checkmarks: var(--color-green-600)
- X marks: var(--color-neutral-400)
- CTA button: full-width, 44px height
```

### 2.3 Payment Method Card

```
┌─────────────────────────────────────────────────────────┐
│  💳 Payment Method                              [Edit] │
│  ───────────────────────────────────────────────────── │
│  ┌──────┐                                              │
│  │ VISA │  •••• •••• •••• 4242                        │
│  └──────┘  Expires 12/27                               │
│                                                        │
│  ✓ Default payment method                              │
└─────────────────────────────────────────────────────────┘

Specs:
- Card brand icons: 24x16px (Visa, Mastercard, Amex, etc.)
- Last 4 digits: monospace font
- Edit link: right-aligned, var(--color-blue-600)
```

### 2.4 Invoice Row

```
┌─────────────────────────────────────────────────────────┐
│  📄 Feb 2026                                           │
│                                                        │
│  Pro subscription         $19.00                       │
│  Overages (23 cycles)      $0.46                       │
│  ─────────────────────────────────                     │
│  Total                    $19.46    ✅ Paid            │
│                                                        │
│                          [Download PDF] [View Details] │
└─────────────────────────────────────────────────────────┘

Specs:
- Status badges: Paid (green), Due (amber), Failed (red)
- Amounts: right-aligned, tabular-nums font
- Expandable for line item details
```

---

## 3. Error States

### 3.1 Payment Errors

| Error Code                | User Message                                                | Recovery Action           |
| ------------------------- | ----------------------------------------------------------- | ------------------------- |
| `card_declined`           | "Your card was declined. Please try another card."          | "Try Another Card" button |
| `insufficient_funds`      | "This card has insufficient funds. Try another card."       | "Try Another Card" button |
| `expired_card`            | "This card has expired. Please update your payment method." | "Update Card" button      |
| `processing_error`        | "We couldn't process your payment. Please try again."       | "Retry" button            |
| `authentication_required` | "Your bank requires additional verification."               | Redirect to 3DS flow      |
| `rate_limit`              | "Too many attempts. Please wait a moment and try again."    | Countdown timer + retry   |

### 3.2 Error Banner (Persistent)

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Payment Failed — Action Required                        │
│                                                              │
│  We couldn't charge your card ending in 4242.                │
│  Update your payment method to keep your Pro plan active.    │
│                                                              │
│  ⏱️ 7 days remaining before downgrade                        │
│                                                              │
│  [Update Payment Method]                            [Dismiss]│
└─────────────────────────────────────────────────────────────┘

Specs:
- Background: var(--color-amber-50)
- Border-left: 4px solid var(--color-amber-500)
- Sticky to top of dashboard
- Cannot be permanently dismissed until resolved
- Countdown updates daily
```

### 3.3 Grace Period Timeline

```
Day 1: Payment fails
  │
  ├── Email: "Payment failed, please update your card"
  │   Dashboard: Warning banner appears
  │
Day 3: First retry (automatic)
  │
  ├── If fails: Email reminder
  │
Day 7: Second retry (automatic)
  │
  ├── If fails: Email "Final warning — downgrade in 7 days"
  │   Dashboard: Banner turns red, countdown shows
  │
Day 14: Account downgraded to Free
  │
  └── Email: "Your account has been downgraded"
      Dashboard: Downgrade notice, re-upgrade option
```

---

## 4. Accessibility

### 4.1 Keyboard Navigation

| Key                | Context      | Action                        |
| ------------------ | ------------ | ----------------------------- |
| `Tab`              | Plan cards   | Move focus between cards      |
| `Enter` / `Space`  | Plan card    | Select plan / trigger upgrade |
| `Escape`           | Modal        | Close modal                   |
| `Arrow Left/Right` | Plan cards   | Navigate between plans        |
| `Arrow Up/Down`    | Invoice list | Navigate invoice rows         |

### 4.2 Screen Reader Support

```tsx
// Usage progress bar
<div
  role="progressbar"
  aria-valuenow={342}
  aria-valuemin={0}
  aria-valuemax={1000}
  aria-label="Cycle usage: 342 of 1,000 cycles used this month, 34 percent"
>
  <span className="sr-only">342 of 1,000 cycles used (34%)</span>
</div>

// Plan selection
<fieldset aria-describedby="plan-description">
  <legend>Select your plan</legend>
  <div role="radiogroup" aria-label="Pricing plans">
    <div role="radio" aria-checked="false" aria-label="Free plan, $0 per month, 100 cycles">
      ...
    </div>
    <div role="radio" aria-checked="true" aria-label="Pro plan, $19 per month, 1000 cycles, current plan">
      ...
    </div>
  </div>
</fieldset>

// Payment error
<div role="alert" aria-live="assertive">
  Payment failed: Your card was declined. Please update your payment method within 7 days.
</div>

// Success notification
<div role="status" aria-live="polite">
  Successfully upgraded to Pro. You now have 1,000 cycles per month.
</div>
```

### 4.3 Color Contrast & Color Blindness

- All status indicators have **icon + text** (not color alone)
- Progress bar states have **pattern variations** in addition to color
- Error states use **⚠️ icon + red** (not just red)
- Success states use **✓ icon + green** (not just green)

```
Normal:    ████████░░░░  (solid fill)
Warning:   ████████░░░░  (solid fill) + ⚠️ icon
Critical:  ████████████  (solid fill) + 🚫 icon + "Limit reached" text
```

---

## 5. Mobile Considerations

### 5.1 Responsive Layouts

| Breakpoint | Layout                                 |
| ---------- | -------------------------------------- |
| < 640px    | Single-column, stacked plan cards      |
| 640-1024px | 2-column plan cards, side-by-side      |
| > 1024px   | 3-column plan cards, full billing page |

### 5.2 Mobile Billing Page

```
┌─────────────────────────────────────┐
│  < Settings                         │
│  ─────────────────────────────────  │
│  Billing                            │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Current Plan: Pro          │    │
│  │  $19/mo · Renews Mar 1      │    │
│  │  [Change Plan]              │    │
│  └─────────────────────────────┘    │
│                                     │
│  Usage This Month                   │
│  ─────────────────────────────────  │
│  Cycles                             │
│  ████████░░░░  342/1,000            │
│                                     │
│  API Calls                          │
│  ██░░░░░░░░░░  2,341/10,000         │
│                                     │
│  Payment Method                     │
│  ─────────────────────────────────  │
│  💳 Visa •••• 4242         [Edit]   │
│                                     │
│  Invoices                           │
│  ─────────────────────────────────  │
│  📄 Feb 2026    $19.46    ✅ Paid   │
│  📄 Jan 2026    $19.00    ✅ Paid   │
│  [View All Invoices]                │
└─────────────────────────────────────┘
```

### 5.3 Touch Targets

- All buttons: minimum 44x44px
- Plan card CTAs: full-width on mobile
- Invoice rows: full-width tap target
- 8px minimum spacing between interactive elements

### 5.4 Stripe Checkout on Mobile

- Stripe Checkout is mobile-optimized by default
- After payment: deep link back to app (if PWA) or redirect to success page
- "Return to ADA" button for external browser cases

---

## 6. Loading States

### 6.1 Billing Page Loading

```
┌─────────────────────────────────────────────────────────┐
│  Billing                                                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│  │  ░░░░░░░░░░░░░░░░░░░░░░                         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                 │   │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

- Skeleton placeholders match final layout
- Animate with subtle pulse (opacity 0.5 → 1.0)
- Load current plan first, then usage, then invoices
```

### 6.2 Payment Processing

```
┌─────────────────────────────────────┐
│                                     │
│          ⏳ Processing...            │
│                                     │
│    Completing your upgrade to Pro   │
│                                     │
│    Please don't close this window   │
│                                     │
└─────────────────────────────────────┘

- Spinner: 48px, var(--color-blue-500)
- Timeout: 30 seconds, then show "Taking longer than expected" + retry
- Background: slightly dimmed
```

---

## 7. Microcopy Guidelines

### 7.1 Upgrade Prompts

| Trigger      | Tone        | Copy                                                    |
| ------------ | ----------- | ------------------------------------------------------- |
| 80% usage    | Friendly    | "Running low on cycles? Upgrade anytime for more."      |
| 100% usage   | Direct      | "You've used all your cycles. Upgrade to keep running." |
| Team feature | Benefit-led | "Invite your team with Pro. 5 members included."        |
| After trial  | Grateful    | "Thanks for trying ADA! Ready to go Pro?"               |

### 7.2 Error Messages

| Situation        | ❌ Don't Say             | ✅ Do Say                                      |
| ---------------- | ------------------------ | ---------------------------------------------- |
| Card declined    | "Transaction declined"   | "Your card was declined. Try another card?"    |
| Processing error | "Error 500"              | "Something went wrong. Please try again."      |
| Downgrade impact | "You will lose features" | "You'll have fewer cycles and team seats."     |
| Expired card     | "Card expired"           | "Your card expired. Update it to stay on Pro." |

### 7.3 Success Messages

| Action              | Copy                                                  |
| ------------------- | ----------------------------------------------------- |
| Upgrade complete    | "🎉 Welcome to Pro! You now have 1,000 cycles/month." |
| Payment updated     | "✓ Payment method updated. You're all set."           |
| Downgrade scheduled | "Plan change scheduled for Mar 1. No action needed."  |
| Invoice downloaded  | "Invoice downloaded."                                 |

---

## 8. Implementation Checklist

### Phase 1: MVP Billing UX (Sprint 3 Week 2)

- [ ] Usage progress bar component (normal/warning/critical states)
- [ ] Plan comparison cards (3-tier layout)
- [ ] Upgrade modal with plan comparison
- [ ] Stripe Checkout redirect flow
- [ ] Success page after payment
- [ ] Payment failure banner (persistent)
- [ ] Update payment modal (Stripe Elements)
- [ ] Mobile-responsive billing page
- [ ] Skeleton loading states

### Phase 2: Polish (Sprint 3 Week 3)

- [ ] Invoice list with download
- [ ] Usage history chart (sparkline)
- [ ] Downgrade flow with impact preview
- [ ] Overage toggle setting
- [ ] Grace period countdown
- [ ] Accessibility audit (keyboard + screen reader)
- [ ] Microcopy review

### Phase 3: Advanced (Post-Sprint 3)

- [ ] Usage alerts (configurable thresholds)
- [ ] Projected cost calculator
- [ ] Annual billing toggle
- [ ] Team member management (Enterprise)
- [ ] SSO configuration (Enterprise)

---

## 9. Design Tokens

Reference: `docs/design/dashboard-component-design-system-c812.md`

```css
/* Billing-specific tokens */
--billing-progress-normal: var(--color-blue-500);
--billing-progress-warning: var(--color-amber-500);
--billing-progress-critical: var(--color-red-500);
--billing-progress-bg: var(--color-neutral-200);

--billing-plan-selected-border: var(--color-blue-500);
--billing-plan-selected-bg: var(--color-blue-50);
--billing-plan-popular-badge: var(--color-blue-600);

--billing-error-banner-bg: var(--color-amber-50);
--billing-error-banner-border: var(--color-amber-500);
--billing-error-banner-critical-bg: var(--color-red-50);
--billing-error-banner-critical-border: var(--color-red-500);

--billing-success-bg: var(--color-green-50);
--billing-success-border: var(--color-green-500);
```

---

## 10. Acceptance Criteria

- [ ] **AC-832-1:** User can view current plan and usage on billing page
- [ ] **AC-832-2:** Usage bar shows warning at 80%, critical at 100%
- [ ] **AC-832-3:** User can upgrade via Stripe Checkout flow
- [ ] **AC-832-4:** Success page confirms upgrade with new plan details
- [ ] **AC-832-5:** Payment failure shows persistent banner with recovery action
- [ ] **AC-832-6:** User can update payment method via Stripe Elements
- [ ] **AC-832-7:** Downgrade shows impact preview before confirmation
- [ ] **AC-832-8:** Billing page is responsive (mobile-friendly)
- [ ] **AC-832-9:** All interactive elements are keyboard accessible
- [ ] **AC-832-10:** Screen reader users can understand usage and plan status

---

_Cycle 832 — 410 consecutive cycles (C421-832). Sprint 3 readiness: Billing UX spec complete. Complements Auth UX (C822) and Billing Product Spec (C797)._
