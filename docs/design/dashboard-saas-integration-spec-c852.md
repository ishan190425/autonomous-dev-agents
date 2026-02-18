# 🎨 Dashboard SaaS Integration Specification

> **Issue:** #120 (Dashboard), #181 (Auth), #182 (Billing), #155 (SaaS Container)
> **Cycle:** C852
> **Author:** 🎨 Design (The Architect)
> **Status:** DRAFT
> **Depends on:** Auth UX (C822), Billing UX (C832), Waitlist UX (C842), Dashboard UX (C635)

---

## Overview

This spec extends the Dashboard UX (C635) to integrate Sprint 3 SaaS features:

- **GitHub OAuth (#181)** — User authentication and session management
- **Stripe Billing (#182)** — Subscription status and plan management
- **Waitlist → User conversion** — Early adopter flow integration

The goal is a unified dashboard experience where authenticated users can:

1. Monitor their ADA agent teams
2. Manage their subscription
3. View usage metrics tied to their billing plan

---

## User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER JOURNEY                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   WAITLIST         SIGNUP           AUTHENTICATED        SUBSCRIBER        │
│   ──────────────────────────────────────────────────────────────────────   │
│                                                                             │
│   ┌─────────┐      ┌─────────┐      ┌─────────┐         ┌─────────┐        │
│   │Waitlist │ ───→ │ GitHub  │ ───→ │  Free   │ ──────→ │  Paid   │        │
│   │  Page   │      │  OAuth  │      │ Tier    │         │ Tier    │        │
│   └─────────┘      └─────────┘      └─────────┘         └─────────┘        │
│        │                │                │                    │             │
│        │                │                │                    │             │
│        ▼                ▼                ▼                    ▼             │
│   • Email capture  • Login with    • Dashboard access    • Full access     │
│   • Early adopter    GitHub        • 1 repo limit        • Unlimited repos │
│   • Position #X    • Link email    • Usage caps          • Priority support│
│                    • Create user   • Upgrade CTA         • Custom roles    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Dashboard Layout (SaaS Integration)

### Header with User Session

```
┌────────────────────────────────────────────────────────────────────────────┐
│  🤖 ADA Dashboard    [autonomous-dev-agents ▼]         🔔  ⚙️  [👤 User ▼] │
├────────────────────────────────────────────────────────────────────────────┤
│                                                             │              │
│                                                             ▼              │
│                                              ┌─────────────────────────┐   │
│                                              │  Ishan Rathi            │   │
│                                              │  @ishan190425           │   │
│                                              │  ────────────────────── │   │
│                                              │  Plan: Pro ($29/mo)     │   │
│                                              │  Usage: 847/1000 cycles │   │
│                                              │  ────────────────────── │   │
│                                              │  📊 Billing & Usage     │   │
│                                              │  ⚙️  Account Settings   │   │
│                                              │  📚 Documentation       │   │
│                                              │  🚪 Sign Out            │   │
│                                              └─────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**User Menu Components:**

| Element       | Source              | Update Frequency |
| ------------- | ------------------- | ---------------- |
| Avatar        | GitHub API          | On login         |
| Display Name  | GitHub profile      | On login         |
| Plan Name     | Stripe subscription | Real-time        |
| Usage Counter | ADA usage API       | Every 5 min      |
| Billing Link  | `/account/billing`  | Static           |
| Settings Link | `/account/settings` | Static           |

---

## New Pages: Account Section

### Account/Billing Page

```
┌────────────────────────────────────────────────────────────────────────────┐
│  🤖 ADA Dashboard                                          [👤 User ▼]    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  💳 Billing & Subscription                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Current Plan                                                        │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────┐  ┌───────────────────────────┐    │   │
│  │  │  ⭐ PRO PLAN                 │  │  📊 This Period           │    │   │
│  │  │                              │  │                           │    │   │
│  │  │  $29/month                   │  │  Cycles Used:   847      │    │   │
│  │  │  Renews: Mar 14, 2026        │  │  Cycle Limit: 1,000      │    │   │
│  │  │                              │  │  ████████████░░░ 85%     │    │   │
│  │  │  ✓ Unlimited repos           │  │                           │    │   │
│  │  │  ✓ 1,000 cycles/month        │  │  Repos Active:  3        │    │   │
│  │  │  ✓ Priority support          │  │  Repo Limit:   Unlimited │    │   │
│  │  │  ✓ Custom roles              │  │                           │    │   │
│  │  │                              │  │  Resets: Mar 14, 2026    │    │   │
│  │  │  [Manage in Stripe →]        │  │                           │    │   │
│  │  └──────────────────────────────┘  └───────────────────────────┘    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📜 Billing History                                                  │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  Feb 14, 2026  │  Pro Plan  │  $29.00  │  ✅ Paid  │ [Receipt]       │   │
│  │  Jan 14, 2026  │  Pro Plan  │  $29.00  │  ✅ Paid  │ [Receipt]       │   │
│  │  Dec 14, 2025  │  Pro Plan  │  $29.00  │  ✅ Paid  │ [Receipt]       │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🔄 Change Plan                                                      │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐         │   │
│  │  │  FREE          │  │  ⭐ PRO        │  │  🏢 TEAM        │         │   │
│  │  │  $0/mo         │  │  $29/mo        │  │  $99/mo         │         │   │
│  │  │                │  │  (current)     │  │                 │         │   │
│  │  │  1 repo        │  │  Unlimited     │  │  Unlimited      │         │   │
│  │  │  100 cycles    │  │  1,000 cycles  │  │  5,000 cycles   │         │   │
│  │  │                │  │                │  │  + Team seats   │         │   │
│  │  │  [Downgrade]   │  │  ✓ Current     │  │  [Upgrade]      │         │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Account/Settings Page

```
┌────────────────────────────────────────────────────────────────────────────┐
│  🤖 ADA Dashboard                                          [👤 User ▼]    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ⚙️ Account Settings                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  👤 Profile                                                          │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  ┌────────┐   GitHub:    @ishan190425 (connected)                   │   │
│  │  │        │   Email:     ishan@example.com                          │   │
│  │  │ Avatar │   Joined:    Feb 14, 2026                               │   │
│  │  │        │   Waitlist:  #47 (Early Adopter ⭐)                      │   │
│  │  └────────┘                                                          │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🔔 Notifications                                                    │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  Cycle completion alerts     [●───] On                               │   │
│  │  Usage warnings (80%/90%)    [●───] On                               │   │
│  │  Weekly digest               [───●] Off                              │   │
│  │  Marketing emails            [───●] Off                              │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🔗 Connected Repositories                                           │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  ✓ autonomous-dev-agents     │  852 cycles  │  [Disconnect]         │   │
│  │  ✓ social-trade              │  234 cycles  │  [Disconnect]         │   │
│  │  ✓ rcv-ai-hedge-fund         │   89 cycles  │  [Disconnect]         │   │
│  │                                                                      │   │
│  │  [+ Connect Repository...]                                           │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ⚠️ Danger Zone                                                      │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  [Export My Data]  [Delete Account]                                  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Usage Indicators in Dashboard

### Home Page Usage Widget

Add to the Overview page (C635 spec):

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📊 This Month's Usage                                                   │
│  ───────────────────────────────────────────────────────────────────── │
│                                                                          │
│  Cycles: 847 / 1,000          Repos: 3 / ∞                              │
│  ████████████████░░░ 85%      ███░░░░░░░░░ 3 active                     │
│                                                                          │
│  ⚠️ Approaching limit          [Upgrade to Team →]                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Usage Alert States:**

| Usage % | Visual            | Behavior                     |
| ------- | ----------------- | ---------------------------- |
| 0-79%   | Green bar         | No alert                     |
| 80-89%  | Yellow bar + ⚠️   | In-app warning               |
| 90-99%  | Orange bar + 🚨   | Email notification           |
| 100%    | Red bar + blocked | Cycles paused, upgrade modal |

---

## Authentication States

### Unauthenticated Dashboard Access

```
┌────────────────────────────────────────────────────────────────────────────┐
│  🤖 ADA Dashboard                                         [Sign In]       │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │                    Sign in to access your dashboard                 │   │
│  │                                                                     │   │
│  │  ┌───────────────────────────────────────────────────────────────┐ │   │
│  │  │                                                               │ │   │
│  │  │               [ 🔗 Sign in with GitHub ]                      │ │   │
│  │  │                                                               │ │   │
│  │  └───────────────────────────────────────────────────────────────┘ │   │
│  │                                                                     │   │
│  │  Don't have access yet? [Join the Waitlist →]                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🎥 Demo Mode                                                       │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  Want to see ADA in action? View a live demo of our own agent team: │   │
│  │                                                                      │   │
│  │  [🎮 View Demo Dashboard →]                                         │   │
│  │                                                                      │   │
│  │  This shows real-time activity from autonomous-dev-agents repo.     │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Demo Mode:** Public read-only dashboard showing ADA's own repo. Builds trust by showing real autonomous development.

---

## API Integration Points

### Auth Endpoints (from Auth UX C822)

```typescript
// Session management
GET / api / auth / session; // Current user session
POST / api / auth / github; // GitHub OAuth callback
POST / api / auth / logout; // End session

// User data
interface User {
  id: string;
  githubId: string;
  username: string;
  email: string;
  avatarUrl: string;
  waitlistPosition?: number;
  isEarlyAdopter: boolean;
  createdAt: Date;
}
```

### Billing Endpoints (from Billing UX C832)

```typescript
// Subscription management
GET / api / billing / subscription; // Current plan & status
GET / api / billing / usage; // Cycle counts & limits
GET / api / billing / invoices; // Billing history
POST / api / billing / portal; // Stripe Customer Portal URL

// Usage tracking
interface Usage {
  currentPeriod: {
    cyclesUsed: number;
    cyclesLimit: number;
    reposActive: number;
    reposLimit: number | null; // null = unlimited
    periodStart: Date;
    periodEnd: Date;
  };
  allTime: {
    totalCycles: number;
    totalRepos: number;
  };
}
```

### Dashboard Endpoints (extend C635)

```typescript
// Existing (C635)
GET /api/repos                    // List user's connected repos
GET /api/repos/:id/state          // Rotation state
GET /api/repos/:id/activity       // Activity feed

// New (C852)
GET /api/account                  // User profile + settings
PUT /api/account                  // Update settings
GET /api/account/usage            // Aggregate usage across repos
POST /api/repos/:id/connect       // Link repo to account
DELETE /api/repos/:id             // Disconnect repo
```

---

## Plan Tiers UX

### Free Tier Limitations

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🚫 Upgrade Required                                                     │
│  ───────────────────────────────────────────────────────────────────── │
│                                                                          │
│  You've reached the Free plan limit of 1 repository.                    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Upgrade to Pro ($29/mo) for:                                   │    │
│  │                                                                   │    │
│  │  ✓ Unlimited repositories                                        │    │
│  │  ✓ 1,000 cycles per month                                        │    │
│  │  ✓ Priority support                                              │    │
│  │  ✓ Custom role definitions                                       │    │
│  │                                                                   │    │
│  │  [ Upgrade Now ] [ Maybe Later ]                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Upgrade Triggers

| Trigger             | Modal            | CTA                   |
| ------------------- | ---------------- | --------------------- |
| Add 2nd repo (Free) | Upgrade Required | "Upgrade Now"         |
| 80% cycle usage     | Soft Warning     | "Upgrade or Monitor"  |
| 100% cycle usage    | Hard Block       | "Upgrade to Continue" |
| Connect custom role | Feature Gate     | "Upgrade for Custom"  |

---

## Mobile Responsive

### Account Pages (Mobile)

```
┌────────────────────────────────┐
│  [←] Billing                   │
├────────────────────────────────┤
│                                │
│  ⭐ PRO PLAN                   │
│  $29/month                     │
│  Renews: Mar 14, 2026          │
│                                │
│  ┌──────────────────────────┐  │
│  │  📊 Usage This Period    │  │
│  │                          │  │
│  │  Cycles: 847 / 1,000     │  │
│  │  ████████████░░░ 85%     │  │
│  │                          │  │
│  │  Repos: 3 / ∞            │  │
│  │  ███░░░░░░░░░ 3 active   │  │
│  └──────────────────────────┘  │
│                                │
│  [Manage in Stripe →]          │
│                                │
│  ──────────────────────────── │
│                                │
│  📜 Billing History            │
│                                │
│  Feb 14  │  $29  │  ✅         │
│  Jan 14  │  $29  │  ✅         │
│  Dec 14  │  $29  │  ✅         │
│                                │
├────────────────────────────────┤
│  [🏠] [📜] [🧠] [👤] [⚙️]      │
└────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Auth Integration (Week 1)

- [ ] Add user session to header
- [ ] User dropdown menu (profile, settings, logout)
- [ ] Login/logout flow
- [ ] Protect routes with auth middleware

### Phase 2: Billing Integration (Week 2)

- [ ] Account/Billing page
- [ ] Usage widget on dashboard home
- [ ] Plan comparison UI
- [ ] Stripe Customer Portal integration

### Phase 3: Settings & Polish (Week 3)

- [ ] Account/Settings page
- [ ] Notification preferences
- [ ] Repository connection management
- [ ] Usage alerts system

---

## Acceptance Criteria

### Auth Integration

1. [ ] User can sign in via GitHub OAuth
2. [ ] User avatar and name appear in header when logged in
3. [ ] User dropdown menu shows plan and usage summary
4. [ ] Unauthenticated users see sign-in prompt and demo mode
5. [ ] Session persists across page refreshes

### Billing Integration

6. [ ] Account/Billing page shows current plan accurately
7. [ ] Usage bar reflects real-time cycle counts
8. [ ] "Manage in Stripe" opens Stripe Customer Portal
9. [ ] Billing history displays all past invoices
10. [ ] Plan comparison shows correct feature matrix

### Usage Limits

11. [ ] Usage widget updates every 5 minutes
12. [ ] 80% usage triggers in-app warning
13. [ ] 90% usage triggers email notification
14. [ ] 100% usage blocks new cycles with upgrade modal
15. [ ] Free tier blocks 2nd repo with upgrade modal

---

## Visual Design

### Palette Extension

| Element             | Value                  | Usage               |
| ------------------- | ---------------------- | ------------------- |
| Success (usage low) | `#22C55E` (Green 500)  | Usage bar 0-79%     |
| Warning (usage mid) | `#F59E0B` (Amber 500)  | Usage bar 80-89%    |
| Danger (usage high) | `#EF4444` (Red 500)    | Usage bar 90-100%   |
| Pro badge           | `#8B5CF6` (Purple 500) | Plan indicator      |
| Team badge          | `#0EA5E9` (Sky 500)    | Team plan indicator |

### Usage Bar Component

```css
/* Usage bar gradient based on percentage */
.usage-bar {
  background: linear-gradient(
    90deg,
    var(--color-success) 0%,
    var(--color-warning) 80%,
    var(--color-danger) 100%
  );
  /* Clip to current percentage */
  clip-path: inset(0 calc(100% - var(--usage-pct)) 0 0);
}
```

---

## References

- **Auth UX:** C822 specification
- **Billing UX:** C832 specification
- **Dashboard UX:** C635 specification (base)
- **Waitlist UX:** C842 specification
- **Sprint 3 Acceptance Matrix:** C847

---

_Created by 🎨 Design in Cycle 852. Integrates Sprint 3 SaaS features into Dashboard._
