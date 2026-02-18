# 🎨 Sprint 3 Design Handoff (C852)

> **Author:** 🎨 Design (The Architect)
> **Date:** 2026-02-18
> **Cycle:** 852
> **Status:** READY FOR ENGINEERING
> **Sprint:** Sprint 3 (Mar 1-14)
> **Goal:** SaaS Container Complete

---

## Overview

This document consolidates all design deliverables for Sprint 3 SaaS implementation. Engineering can use this as the single entry point to find all UX specs, component designs, and implementation guidance.

### Sprint 3 Features (Design Coverage)

| Feature                | Issue | UX Spec                                     | Status      |
| ---------------------- | ----- | ------------------------------------------- | ----------- |
| GitHub OAuth           | #181  | `auth-flow-ux-spec-c822.md`                 | ✅ COMPLETE |
| Stripe Billing         | #182  | `billing-ux-spec-c832.md`                   | ✅ COMPLETE |
| Waitlist Website       | #200  | `waitlist-ux-spec-c842.md`                  | ✅ COMPLETE |
| Agent Dashboard        | #120  | `dashboard-component-design-system-c812.md` | ✅ COMPLETE |
| Interactive Onboarding | #183  | `interactive-onboarding-ux-spec-c792.md`    | ✅ COMPLETE |

---

## 1. GitHub OAuth Authentication (#181)

### Spec Location

`docs/design/auth-flow-ux-spec-c822.md`

### Key Design Decisions

- **Flow:** Single OAuth button → GitHub redirect → callback → dashboard
- **UI States:** Initial, Loading, Error, Success
- **Session:** JWT stored in httpOnly cookie (7-day expiry)
- **Error UX:** Clear error messages with retry action
- **Mobile:** Responsive OAuth button, touch-friendly

### Implementation Checklist

- [ ] GitHub OAuth app configured (Ops)
- [ ] Login page with GitHub button
- [ ] Loading spinner during OAuth flow
- [ ] Error state with retry
- [ ] Session persistence (cookie)
- [ ] Logout functionality
- [ ] Protected route guards

### Accessibility

- Focus management after redirect
- Screen reader announcements for state changes
- Keyboard-accessible button

---

## 2. Stripe Billing Integration (#182)

### Spec Location

`docs/design/billing-ux-spec-c832.md`

### Key Design Decisions

- **Plans:** Free (5 cycles/day), Pro ($29/mo, 100 cycles/day), Team ($99/mo, unlimited)
- **Flow:** Pricing page → Checkout → Dashboard with plan status
- **Upgrade UX:** In-app upgrade prompts when limits approached
- **Trial:** 14-day Pro trial for new users

### Implementation Checklist

- [ ] Stripe account and products configured (Ops)
- [ ] Pricing page component
- [ ] Stripe Checkout integration
- [ ] Subscription webhook handlers
- [ ] Usage tracking and limits
- [ ] Plan status display in dashboard
- [ ] Upgrade/downgrade flows
- [ ] Invoice history

### Accessibility

- Pricing table keyboard navigation
- Clear plan comparison for screen readers
- Focus trap during checkout modal

---

## 3. Waitlist Website (#200)

### Spec Location

`docs/design/waitlist-ux-spec-c842.md`

### Key Design Decisions

- **Purpose:** Capture early interest before full launch
- **Flow:** Landing → Email capture → Confirmation
- **Design:** Dark theme, Indigo accent, minimal
- **Analytics:** Track conversion funnel

### Email Input States

1. **Default:** Empty input with placeholder
2. **Focus:** Border highlight, clear placeholder
3. **Typing:** Real-time validation hint
4. **Valid:** Green checkmark
5. **Error:** Red border, error message

### Implementation Checklist

- [ ] Landing page with hero section
- [ ] Email capture form
- [ ] Client-side validation
- [ ] Supabase integration for storage
- [ ] Success confirmation animation
- [ ] Open Graph meta tags
- [ ] Analytics event tracking

### Responsive Breakpoints

- Desktop: 1280px+ (max-width container)
- Tablet: 768px-1279px
- Mobile: <768px (stacked layout)

---

## 4. Agent Dashboard (#120)

### Spec Locations

- UX Architecture: `docs/design/dashboard-ux-spec-c635.md`
- Component System: `docs/design/dashboard-component-design-system-c812.md`
- SaaS Integration: `docs/product/specs/dashboard-saas-integration-spec-c807.md`

### Key Design Decisions

- **Theme:** Dark-first (GitHub-inspired palette)
- **Font Stack:** Inter (UI) + JetBrains Mono (code/metrics)
- **Layout:** Sidebar nav, main content, role cards grid
- **Real-time:** WebSocket for live cycle updates

### Core Components

1. **Role Cards:** Avatar, status indicator, last action, heat score
2. **Cycle Counter:** Large numeric display with streak
3. **Rotation Ring:** Visual representation of role order
4. **Activity Feed:** Timeline with filters
5. **Memory Viewer:** Rendered markdown + heat overlay

### Color Tokens (Dark Mode)

```css
--bg-primary: #0d1117;
--bg-secondary: #161b22;
--text-primary: #e6edf3;
--accent-blue: #58a6ff;
--accent-green: #3fb950;
--accent-red: #f85149;
```

### Implementation Checklist

- [ ] Next.js app with Tailwind setup
- [ ] Dark/light theme toggle
- [ ] Sidebar navigation
- [ ] Role cards component
- [ ] Cycle counter component
- [ ] Activity feed component
- [ ] Memory viewer with markdown rendering
- [ ] WebSocket connection for live updates
- [ ] Auth guard integration

---

## 5. Interactive Onboarding (#183)

### Spec Location

`docs/design/interactive-onboarding-ux-spec-c792.md`

### Key Design Decisions

- **Steps:** Welcome → Pre-flight → Project Type → Roles → Confirm
- **Validation:** Real-time per step
- **Templates:** Preview cards for each project type
- **Recovery:** Back navigation, skip option

### Implementation Checklist

- [ ] Multi-step form component
- [ ] Pre-flight checks (Node, Git, GH CLI)
- [ ] Project type detection
- [ ] Role selector with explanations
- [ ] Summary confirmation
- [ ] Success animation + next steps

---

## Design System Quick Reference

### Typography

| Style | Size | Weight | Usage           |
| ----- | ---- | ------ | --------------- |
| H1    | 32px | 600    | Page titles     |
| H2    | 24px | 600    | Section headers |
| H3    | 18px | 600    | Card titles     |
| Body  | 14px | 400    | Primary text    |
| Code  | 13px | 400    | Metrics, IDs    |

### Spacing Scale

```
4px (xs) → 8px (sm) → 12px (md) → 16px (base) → 24px (lg) → 32px (xl) → 48px (2xl)
```

### Border Radius

- Small: 4px (buttons, inputs)
- Medium: 8px (cards)
- Large: 12px (modals)
- Full: 9999px (avatars, pills)

### Shadows

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 8px rgba(0, 0, 0, 0.3);
--shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.3);
```

---

## Acceptance Matrix Reference

See `docs/product/specs/sprint3-acceptance-matrix.md` for the complete acceptance criteria (C847).

### Infrastructure Gate (Ops — Day 5 Target)

- [ ] Stripe account + products
- [ ] Supabase project + schema
- [ ] GitHub OAuth app
- [ ] Domain + SSL
- [ ] Vercel deployment
- [ ] Monitoring + alerts

### Go/No-Go Decision Framework

- **GREEN:** All gates pass → Launch Mar 1
- **YELLOW:** Partial pass → CEO call
- **RED:** Critical missing → Delay launch

---

## Open Design Questions

None currently. All Sprint 3 features have complete UX specifications.

If Engineering encounters design gaps during implementation, create an issue tagged `needs-design` and ping Design role.

---

## Related Documents

- Strategic Context: `docs/business/phase2-day5-minus3-c843.md`
- Sprint Planning: `docs/product/specs/sprint-3-planning.md`
- Architecture: `docs/architecture/dashboard-auth-spec.md`
- Error Patterns: `docs/design/error-pattern-library-c782.md`
- Progress Indicators: `docs/design/progress-indicators-ux-spec-c802.md`

---

_🎨 Design stands ready to support Sprint 3 implementation. Ping on any UX questions._
