# Pricing Page UX Specification

> **Issue:** #155 — SaaS Container  
> **Created:** Cycle 1292 (2026-02-28)  
> **Author:** 🎨 Design (The Architect)  
> **Status:** Ready for Engineering

---

## Overview

This specification defines the pricing page UX for the ADA SaaS platform. The pricing page is a critical conversion touchpoint — it must communicate value clearly, reduce friction, and guide users to the right tier.

---

## Design Principles

1. **Clarity over cleverness** — Users should understand tiers in <5 seconds
2. **Anchoring on value** — Lead with outcomes, not features
3. **Progressive disclosure** — Show essentials first, details on hover/expand
4. **Social proof integration** — Metrics and testimonials reduce friction
5. **Mobile-first** — Cards stack cleanly on mobile

---

## Tier Structure

Based on Sprint 3 planning docs, three tiers:

| Tier           | Target Persona               | Monthly Price | Positioning              |
| -------------- | ---------------------------- | ------------- | ------------------------ |
| **Free**       | Indie hackers, OSS projects  | $0            | "Try before you buy"     |
| **Pro**        | Startups, small teams        | $49/mo        | **Recommended** (anchor) |
| **Enterprise** | Large orgs, compliance needs | Custom        | "Talk to us"             |

---

## Page Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HEADER (sticky nav)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    Simple, Transparent Pricing                              │
│           Ship faster with autonomous AI development teams                  │
│                                                                             │
│              [Monthly]  ●────○  [Annual (save 20%)]                         │
│                                                                             │
├───────────────────┬───────────────────────┬─────────────────────────────────┤
│                   │                       │                                 │
│   ┌─────────────┐ │   ┌─────────────────┐ │   ┌───────────────────────────┐ │
│   │    FREE     │ │   │ ★ PRO ★        │ │   │      ENTERPRISE           │ │
│   │             │ │   │  RECOMMENDED   │ │   │                           │ │
│   │    $0/mo    │ │   │    $49/mo      │ │   │       Custom              │ │
│   │             │ │   │   $39/mo billed│ │   │                           │ │
│   │  Perfect for│ │   │    annually    │ │   │   For teams that need     │ │
│   │  trying ADA │ │   │                │ │   │   security & compliance   │ │
│   │             │ │   │  Best for most │ │   │                           │ │
│   │ ✓ 1 repo    │ │   │   teams        │ │   │ ✓ Unlimited repos         │ │
│   │ ✓ 3 roles   │ │   │                │ │   │ ✓ Unlimited roles         │ │
│   │ ✓ 50 cycles │ │   │ ✓ 5 repos      │ │   │ ✓ Unlimited cycles        │ │
│   │   /month    │ │   │ ✓ All 10 roles │ │   │ ✓ SSO / SAML              │ │
│   │ ✓ Community │ │   │ ✓ Unlimited    │ │   │ ✓ Dedicated support       │ │
│   │   support   │ │   │   cycles       │ │   │ ✓ Custom integrations     │ │
│   │             │ │   │ ✓ Priority     │ │   │ ✓ SLA guarantee           │ │
│   │             │ │   │   support      │ │   │ ✓ On-prem available       │ │
│   │             │ │   │ ✓ Advanced     │ │   │                           │ │
│   │             │ │   │   analytics    │ │   │                           │ │
│   │             │ │   │                │ │   │                           │ │
│   │ [Get Started│ │   │ [Start Trial]  │ │   │ [Contact Sales]           │ │
│   │    Free]    │ │   │                │ │   │                           │ │
│   └─────────────┘ │   └─────────────────┘ │   └───────────────────────────┘ │
│                   │         ↑              │                                 │
│                   │    highlighted card    │                                 │
│                   │   (subtle shadow/border)│                                │
├───────────────────┴───────────────────────┴─────────────────────────────────┤
│                                                                             │
│                         All plans include:                                  │
│    ✓ GitHub integration  ✓ Memory bank  ✓ CLI access  ✓ 99.9% uptime       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        Compare Plans (expandable)                           │
│                              [▼ Show details]                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Page Layout (Mobile)

Cards stack vertically with Pro card first (most important):

```
┌──────────────────────┐
│       HEADER         │
├──────────────────────┤
│                      │
│  Simple, Transparent │
│       Pricing        │
│                      │
│ [Monthly] ○─● [Annual]│
│                      │
├──────────────────────┤
│ ┌──────────────────┐ │
│ │    ★ PRO ★       │ │  ← Show Pro first on mobile
│ │   RECOMMENDED    │ │
│ │     $49/mo       │ │
│ │                  │ │
│ │  [Start Trial]   │ │
│ │                  │ │
│ │  ✓ 5 repos       │ │
│ │  ✓ All 10 roles  │ │
│ │  ✓ Unlimited...  │ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │      FREE        │ │
│ │      $0/mo       │ │
│ │                  │ │
│ │  [Get Started]   │ │
│ │                  │ │
│ │  ✓ 1 repo        │ │
│ │  ✓ 3 roles       │ │
│ │  ...             │ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │   ENTERPRISE     │ │
│ │     Custom       │ │
│ │                  │ │
│ │ [Contact Sales]  │ │
│ └──────────────────┘ │
│                      │
└──────────────────────┘
```

---

## Component Specifications

### Pricing Toggle (Monthly/Annual)

```typescript
interface PricingToggleProps {
  mode: 'monthly' | 'annual';
  onToggle: (mode: 'monthly' | 'annual') => void;
  annualDiscount: number; // e.g., 20 for 20%
}
```

- **Interaction:** Click or keyboard (Tab + Enter)
- **Animation:** Smooth pill slide (200ms ease-out)
- **Copy:** Show savings badge: "Save 20%" near Annual

### Pricing Card

```typescript
interface PricingCardProps {
  tier: 'free' | 'pro' | 'enterprise';
  name: string;
  price: number | 'custom';
  interval: 'month' | 'year';
  description: string;
  features: string[];
  cta: {
    label: string;
    href: string;
    variant: 'primary' | 'secondary' | 'outline';
  };
  recommended?: boolean;
  badge?: string; // e.g., "Most Popular"
}
```

**Recommended Card Styling:**

- Border: 2px solid brand color (e.g., `#6366f1` indigo-500)
- Shadow: Elevated (`shadow-xl`)
- Badge: Floating pill above card "RECOMMENDED" or "Most Popular"
- Scale: Slightly larger (102%) on desktop

### Feature Row

```typescript
interface FeatureRowProps {
  text: string;
  included: boolean;
  tooltip?: string; // On hover, explain feature
}
```

- ✓ checkmark for included (green)
- ✗ for not included (muted gray)
- Hover: tooltip with feature explanation

### CTA Buttons

| Tier       | Button Text     | Variant   | Action                        |
| ---------- | --------------- | --------- | ----------------------------- |
| Free       | "Get Started"   | outline   | → `/signup?tier=free`         |
| Pro        | "Start Trial"   | primary   | → `/signup?tier=pro&trial=14` |
| Enterprise | "Contact Sales" | secondary | → `/contact?type=enterprise`  |

---

## Compare Plans Table (Expandable)

For users who want the full feature matrix:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Compare All Features                         │
├─────────────────────────┬──────────┬──────────┬─────────────────┤
│ Feature                 │  Free    │   Pro    │   Enterprise    │
├─────────────────────────┼──────────┼──────────┼─────────────────┤
│ Repositories            │    1     │    5     │   Unlimited     │
│ Roles                   │    3     │   10     │   Unlimited     │
│ Cycles per month        │   50     │ Unlimited│   Unlimited     │
│ Memory bank size        │  10 MB   │  100 MB  │   Unlimited     │
│ GitHub App integration  │    ✓     │    ✓     │       ✓         │
│ CLI access              │    ✓     │    ✓     │       ✓         │
│ Web dashboard           │    ✓     │    ✓     │       ✓         │
│ Priority support        │    ✗     │    ✓     │       ✓         │
│ Advanced analytics      │    ✗     │    ✓     │       ✓         │
│ Custom playbooks        │    ✗     │    ✓     │       ✓         │
│ SSO / SAML              │    ✗     │    ✗     │       ✓         │
│ On-premise deployment   │    ✗     │    ✗     │       ✓         │
│ SLA guarantee           │    ✗     │    ✗     │       ✓         │
│ Dedicated success mgr   │    ✗     │    ✗     │       ✓         │
└─────────────────────────┴──────────┴──────────┴─────────────────┘
```

---

## Interaction States

### Card Hover (Desktop)

- Subtle lift: `transform: translateY(-4px)`
- Shadow increase: `shadow-lg` → `shadow-xl`
- Transition: 150ms ease-out

### CTA Button States

| State   | Primary (Pro)        | Secondary        | Outline             |
| ------- | -------------------- | ---------------- | ------------------- |
| Default | `bg-indigo-600`      | `bg-gray-800`    | `border-gray-300`   |
| Hover   | `bg-indigo-700`      | `bg-gray-700`    | `border-indigo-500` |
| Active  | `bg-indigo-800`      | `bg-gray-900`    | `bg-indigo-50`      |
| Focus   | ring-2 ring-indigo   | ring-2 ring-gray | ring-2 ring-indigo  |
| Loading | spinner + "Loading…" | spinner          | spinner             |

---

## Accessibility Requirements

### Keyboard Navigation

- Tab order: Toggle → Free card → Pro card → Enterprise card → Compare table
- Enter/Space: Activates CTAs
- Escape: Closes any open tooltips/modals

### Screen Reader

```html
<section aria-labelledby="pricing-heading">
  <h1 id="pricing-heading">Simple, Transparent Pricing</h1>

  <div role="group" aria-label="Billing frequency">
    <button aria-pressed="true">Monthly</button>
    <button aria-pressed="false">Annual (save 20%)</button>
  </div>

  <div role="list" aria-label="Pricing plans">
    <article role="listitem" aria-labelledby="free-plan">
      <h2 id="free-plan">Free Plan</h2>
      <!-- ... -->
    </article>
    <!-- ... -->
  </div>
</section>
```

### Color Contrast

- All text: WCAG AA minimum (4.5:1 for body, 3:1 for large text)
- CTAs: Ensure button text meets contrast requirements
- Checkmarks: Use icon + text, not color alone

---

## SEO & Performance

### Meta Tags

```html
<title>Pricing — ADA: Autonomous Dev Agents</title>
<meta
  name="description"
  content="Simple, transparent pricing for ADA. Start free, scale with Pro, or go Enterprise. Ship faster with autonomous AI development teams."
/>
```

### Structured Data (JSON-LD)

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "ADA Pro",
  "description": "Autonomous AI development team for your repos",
  "offers": {
    "@type": "Offer",
    "price": "49.00",
    "priceCurrency": "USD",
    "priceValidUntil": "2027-12-31"
  }
}
```

### Performance

- Lazy load Compare table (below fold)
- Preload CTA destinations on hover
- Static generation (ISR) — pricing rarely changes

---

## Copy Guidelines

### Headlines

- **Primary:** "Simple, Transparent Pricing"
- **Subhead:** "Ship faster with autonomous AI development teams"
- **Alt:** "Choose the plan that fits your team"

### Tier Taglines

- **Free:** "Perfect for trying ADA"
- **Pro:** "Best for most teams" (anchor)
- **Enterprise:** "For teams that need security & compliance"

### CTA Copy

| Tier       | Primary CTA     | Rationale                          |
| ---------- | --------------- | ---------------------------------- |
| Free       | "Get Started"   | Low commitment, action-oriented    |
| Pro        | "Start Trial"   | 14-day trial reduces friction      |
| Enterprise | "Contact Sales" | Sets expectation of custom process |

### Microcopy

- Annual toggle: "Save 20% with annual billing"
- Trial: "14-day free trial. No credit card required."
- Enterprise: "Custom pricing for large teams"

---

## Analytics Events

Track user behavior for conversion optimization:

| Event                      | Trigger                     | Properties                 |
| -------------------------- | --------------------------- | -------------------------- | --------- |
| `pricing_page_viewed`      | Page load                   | `referrer`, `utm_*`        |
| `pricing_toggle_changed`   | Click monthly/annual toggle | `mode: 'monthly'           | 'annual'` |
| `pricing_card_hovered`     | Hover on card >1s           | `tier`                     |
| `pricing_cta_clicked`      | Click any CTA               | `tier`, `mode`, `cta_text` |
| `pricing_compare_expanded` | Expand compare table        | -                          |
| `pricing_feature_tooltip`  | Hover feature tooltip       | `feature_name`             |

---

## FAQ Section (Below Pricing)

Reduce support load and objections:

1. **Can I change plans later?** Yes, upgrade or downgrade anytime.
2. **Is there a free trial?** Pro includes a 14-day free trial. No credit card required.
3. **What happens when I hit limits?** We'll notify you and suggest upgrading. Your work is never lost.
4. **Do you offer refunds?** Yes, 30-day money-back guarantee on Pro.
5. **What payment methods?** Credit card, PayPal, or invoicing for Enterprise.
6. **Is my code safe?** ADA runs in your GitHub repos. We never store your code.

---

## Implementation Notes

### Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Analytics:** PostHog or Plausible
- **Payments:** Stripe (already integrated per C1290)

### Component Files

```
apps/web/
├── src/
│   ├── app/
│   │   └── pricing/
│   │       └── page.tsx        ← Main pricing page
│   └── components/
│       └── pricing/
│           ├── PricingToggle.tsx
│           ├── PricingCard.tsx
│           ├── FeatureRow.tsx
│           ├── CompareTable.tsx
│           └── PricingFAQ.tsx
```

### Dependencies

- `@radix-ui/react-toggle` — Accessible toggle
- `@radix-ui/react-tooltip` — Feature tooltips
- `framer-motion` — Card animations (optional)

---

## Acceptance Criteria

- [ ] Three pricing cards (Free, Pro, Enterprise) render correctly
- [ ] Monthly/Annual toggle updates prices dynamically
- [ ] Pro card has visual prominence (recommended badge, elevated)
- [ ] All CTAs have correct hrefs and analytics tracking
- [ ] Mobile layout stacks cards with Pro first
- [ ] Compare table expands/collapses
- [ ] WCAG AA accessibility compliance
- [ ] Page loads in <2s (LCP)
- [ ] Stripe checkout integration works for Pro tier

---

## Related Documents

- C1283 — Sprint 3 Day 1 Brief (Design: pricing wireframe)
- C1269 — Conversion test plan (tier validation)
- C1277 — Product spec (post-signup flow)
- #155 — SaaS Container (parent issue)

---

_Designed with love by 🎨 The Architect — Cycle 1292_
