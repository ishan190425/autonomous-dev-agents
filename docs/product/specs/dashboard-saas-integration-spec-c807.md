# 📦 Dashboard SaaS Integration Specification

> **Issue:** #120 (Agent Dashboard), #155 (SaaS Container)
> **Cycle:** 807
> **Author:** 📦 Product (The PM)
> **Status:** Draft
> **Prior Art:** C635 (UX Spec), C640 (Product Review), C806 (Implementation Architecture)

---

## Overview

This spec extends the dashboard requirements to support the SaaS Container model. The original dashboard specs (C635, C640) defined a local-first, read-only monitoring tool. With the SaaS pivot, the dashboard evolves into a **user-facing web application** with authentication, subscription management, and cloud execution controls.

### What Changes

| Aspect      | Original (C635/C640) | SaaS Integration (C807)             |
| ----------- | -------------------- | ----------------------------------- |
| Auth        | Public read-only MVP | Required (GitHub OAuth)             |
| Users       | Single user implied  | Multi-user workspaces               |
| Repos       | Local path config    | Managed repos (cloned to cloud)     |
| Execution   | Local CLI only       | Managed cloud cycles                |
| Billing     | None                 | Subscription status, usage metering |
| Data Source | File system polling  | REST API (#190) + Supabase          |

---

## User Personas (SaaS Context)

### P1: Free Tier User

- Uses CLI locally
- Dashboard for monitoring local cycles
- No cloud execution
- Upgrade prompt shown

### P2: Pro Subscriber ($19/mo)

- 5 managed repos
- Dashboard is primary interface
- Cloud execution of cycles
- Usage analytics

### P3: Enterprise Subscriber ($99/mo)

- Unlimited managed repos
- Team workspaces
- Role-based access control
- Audit logs

---

## SaaS Dashboard Views

### 1. Authenticated Home

**Changes from C635 Home:**

```
┌────────────────────────────────────────────────────────────────────────────┐
│  🤖 ADA Dashboard                          [Workspace ▼]    👤 @ishan     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──── Subscription Status ─────────────────────────────────────────────┐  │
│  │  🟢 Pro Plan • 3/5 Managed Repos • 12,450/50,000 Cycles              │  │
│  │  [Manage Subscription] [Add Repo]                         [Upgrade ▲]│  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─ Managed Repos ─────────────────────────────────────────────────────┐  │
│  │                                                                     │  │
│  │  [Ada-ai/ada-cli]      Cycle 807 • ● Running • 🟢 Healthy          │  │
│  │  [ishan/social-trade]  Cycle 156 • ● Running • 🟡 Warning (1 err)  │  │
│  │  [ishan/rcv-hedge]     Cycle 84  • ○ Paused  • 🔵 Idle             │  │
│  │                                                                     │  │
│  │  + Add Repository                                                   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─ Recent Activity (All Repos) ────────────────────────────────────────┐  │
│  │  11:08  ada-cli      🛡️ Ops     C806  Sprint 3 Architecture         │  │
│  │  11:02  social-trade ⚙️ Eng     C156  Fix payment webhook           │  │
│  │  10:45  ada-cli      🔬 Research C805  Phase 2 observations         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**New Components:**

| Component           | Description         | Data Source                         |
| ------------------- | ------------------- | ----------------------------------- |
| Subscription Status | Plan, usage, limits | `subscriptions` table               |
| Managed Repos       | List with status    | `repositories` table                |
| Repo Health         | Cycle success rate  | `cycle_history` table               |
| Cross-Repo Activity | Unified feed        | `cycle_history` JOIN `repositories` |

---

### 2. Repository Detail (Cloud-Managed)

**Changes from C635 Agents View:**

- Adds **execution controls** (Start/Pause/Configure)
- Shows **cycle schedule** (cron config)
- Displays **cycle history with logs**

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ada-ai/ada-cli                    [⏸️ Pause] [⚙️ Configure] [🗑️ Remove]  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─ Status ─────────────────────────────────────────────────────────────┐  │
│  │  ● Running • Next cycle: 2 min • Schedule: every 15m                │  │
│  │  Branch: main • Last sync: 30s ago • Container: healthy             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─ Cycle Configuration ────────────────────────────────────────────────┐  │
│  │  Interval:     [15 minutes ▼]                                       │  │
│  │  Model:        [claude-sonnet-4 ▼]                                  │  │
│  │  Max Cycles:   [unlimited ▼]                                        │  │
│  │  Auto-merge:   [✓] PRs with green CI                                │  │
│  │  Notifications: [✓] Slack  [✓] Email on error                       │  │
│  │                                                [Save Changes]        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  [Agents] [Activity] [Memory] [Analytics] [Logs]                          │
│                                                                            │
│  ┌─ Recent Cycles ──────────────────────────────────────────────────────┐  │
│  │  C807  📦 Product   11:23  ✅ Success  Dashboard SaaS Spec    [Logs] │  │
│  │  C806  🌌 Frontier  11:08  ✅ Success  Implementation Arch    [Logs] │  │
│  │  C805  🔬 Research  10:49  ✅ Success  Day 3-4 Observations   [Logs] │  │
│  │  C804  🚀 Growth    10:31  ✅ Success  Early Adopter Launch   [Logs] │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Billing & Subscription

**New view for subscription management:**

```
┌────────────────────────────────────────────────────────────────────────────┐
│  💳 Billing                                                               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─ Current Plan ───────────────────────────────────────────────────────┐  │
│  │  🟢 Pro Plan — $19/month                                             │  │
│  │  Next billing: March 1, 2026                                         │  │
│  │  Payment method: •••• 4242                                           │  │
│  │                                                                      │  │
│  │  [Change Plan] [Update Payment] [Cancel Subscription]                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─ Usage This Period ──────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  Managed Repos:    3 / 5          ██████████░░░░░░░░░░  60%         │  │
│  │  Cycles:           12,450 / 50,000 ████████░░░░░░░░░░░░  25%         │  │
│  │  API Calls:        8,200 / 100,000 ████░░░░░░░░░░░░░░░░  8%          │  │
│  │                                                                      │  │
│  │  ⓘ Usage resets March 1, 2026                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─ Billing History ────────────────────────────────────────────────────┐  │
│  │  Feb 1, 2026    Pro Plan    $19.00    ✅ Paid    [Invoice]          │  │
│  │  Jan 1, 2026    Pro Plan    $19.00    ✅ Paid    [Invoice]          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### 4. Onboarding Flow (Post-Auth)

**First-time user journey:**

```
Step 1: Welcome
┌─────────────────────────────────────────────────────────────┐
│  🤖 Welcome to ADA Dashboard!                               │
│                                                             │
│  ADA autonomous agents can run your project's development   │
│  cycles 24/7. Let's get you set up.                        │
│                                                             │
│  [Get Started →]                                           │
└─────────────────────────────────────────────────────────────┘

Step 2: Connect GitHub
┌─────────────────────────────────────────────────────────────┐
│  🔗 Connect Your GitHub                                     │
│                                                             │
│  We need access to your repositories to run agent cycles.   │
│                                                             │
│  Permissions requested:                                     │
│  • Read/write repository contents                          │
│  • Create issues and PRs                                   │
│  • Read organization membership                            │
│                                                             │
│  [Connect GitHub Account]                                  │
└─────────────────────────────────────────────────────────────┘

Step 3: Add First Repository
┌─────────────────────────────────────────────────────────────┐
│  📂 Add Your First Repository                               │
│                                                             │
│  [Search repositories...                              🔍]   │
│                                                             │
│  Recent:                                                    │
│  ○ ishan/social-trade         TypeScript  ★ 42             │
│  ○ ishan/rcv-hedge-fund       Python      ★ 18             │
│  ○ ada-ai/ada-cli             TypeScript  ★ 156            │
│                                                             │
│  [Select & Continue →]                                     │
└─────────────────────────────────────────────────────────────┘

Step 4: Initialize Agents
┌─────────────────────────────────────────────────────────────┐
│  🎬 Initialize Agent Team                                   │
│                                                             │
│  We'll run `ada init` in your repository to set up the     │
│  agent team configuration.                                  │
│                                                             │
│  ○ Use default team (recommended for most projects)        │
│  ○ Customize roles and playbooks                           │
│                                                             │
│  [Initialize & Start →]                                    │
└─────────────────────────────────────────────────────────────┘

Step 5: Choose Plan
┌─────────────────────────────────────────────────────────────┐
│  💎 Choose Your Plan                                        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Free        │  │ Pro ✓      │  │ Enterprise  │         │
│  │ $0/mo       │  │ $19/mo     │  │ $99/mo      │         │
│  │             │  │             │  │             │         │
│  │ CLI only    │  │ 5 repos    │  │ Unlimited   │         │
│  │ Local exec  │  │ 50K cycles │  │ Team access │         │
│  │ No cloud    │  │ Cloud exec │  │ SSO/Audit   │         │
│  │             │  │             │  │             │         │
│  │ [Select]    │  │ [Select]   │  │ [Contact]   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## API Requirements

Cross-references Sprint 3 Implementation Architecture (C806) REST API spec:

### Dashboard-Specific Endpoints

| Endpoint                              | Method  | Description               | Auth     |
| ------------------------------------- | ------- | ------------------------- | -------- |
| `/api/dashboard/overview`             | GET     | Aggregated home data      | Required |
| `/api/repos`                          | GET     | List user's managed repos | Required |
| `/api/repos/:id/cycles`               | GET     | Cycle history (paginated) | Required |
| `/api/repos/:id/cycles/:cycleId/logs` | GET     | Full cycle logs           | Required |
| `/api/repos/:id/config`               | GET/PUT | Cycle configuration       | Required |
| `/api/repos/:id/control`              | POST    | Start/pause/sync          | Required |
| `/api/billing/subscription`           | GET     | Current subscription      | Required |
| `/api/billing/usage`                  | GET     | Usage metrics             | Required |
| `/api/billing/portal`                 | POST    | Stripe portal redirect    | Required |

---

## Acceptance Criteria

### AC-807-1: Authenticated Access

- [ ] All dashboard routes require authentication
- [ ] Unauthenticated requests redirect to `/login`
- [ ] GitHub OAuth flow completes in <3 clicks
- [ ] Session persists across browser restarts (7-day token)
- [ ] "Sign out" clears session and redirects to landing

### AC-807-2: Subscription Status Display

- [ ] Home shows current plan name and status
- [ ] Usage bars display: repos used/limit, cycles used/limit
- [ ] Upgrade prompt shown when >80% of any limit
- [ ] Free users see persistent upgrade CTA

### AC-807-3: Managed Repo List

- [ ] Home shows all user's managed repos
- [ ] Each repo shows: name, current cycle, status (running/paused/error)
- [ ] Click repo → navigates to repo detail view
- [ ] "Add Repository" triggers GitHub repo selector

### AC-807-4: Execution Controls

- [ ] Repo detail has Start/Pause toggle
- [ ] Pause immediately stops next scheduled cycle
- [ ] Start resumes from current rotation position
- [ ] Configuration changes take effect on next cycle
- [ ] Force sync button triggers immediate git pull

### AC-807-5: Cycle Logs

- [ ] Each cycle row has "View Logs" link
- [ ] Logs show full agent output (streaming if in progress)
- [ ] Logs include: prompt sent, response received, git operations
- [ ] Error cycles highlighted with ❌ and error summary

### AC-807-6: Billing Integration

- [ ] Billing page shows current plan and payment method
- [ ] Usage displays real-time from `usage_events` table
- [ ] "Change Plan" opens Stripe Customer Portal
- [ ] "Update Payment" opens Stripe payment method update
- [ ] Invoice history shows last 12 months

### AC-807-7: Onboarding Flow

- [ ] New users see onboarding wizard on first login
- [ ] GitHub connection stores installation ID
- [ ] Repo selection shows searchable list with filters
- [ ] Initialization runs `ada init` via managed container
- [ ] Plan selection completes with Stripe Checkout

---

## Implementation Phases

### Phase 1: Auth + Skeleton (Sprint 3, Week 1-2)

- GitHub OAuth integration
- Basic authenticated layout
- Subscription status component
- Repo list (read-only from database)

### Phase 2: Repo Management (Sprint 3, Week 2-3)

- Add repo flow with GitHub selector
- Repo detail view with basic info
- Cycle history list
- Configuration panel (read-only)

### Phase 3: Execution Controls (Sprint 3, Week 3-4)

- Start/Pause controls
- Configuration editing
- Cycle logs viewer
- Real-time status updates

### Phase 4: Billing + Onboarding (Sprint 3, Week 4-5)

- Billing view with Stripe portal
- Usage metering display
- Onboarding wizard
- Plan upgrade/downgrade flow

---

## Dependencies

| Dependency          | Issue | Required For                 |
| ------------------- | ----- | ---------------------------- |
| Auth System         | #181  | All dashboard views          |
| Billing Integration | #182  | Subscription & billing views |
| Managed Execution   | #189  | Repo controls, cycle logs    |
| REST API Gateway    | #190  | All data fetching            |

---

## Open Questions (For Engineering)

1. **WebSocket vs Polling:** Should cycle status update via WebSocket for real-time feel, or is 10s polling sufficient for MVP?

2. **Log Retention:** How long do we keep full cycle logs? Suggestion: 30 days for Pro, 7 days for Free.

3. **Repo Limits:** How do we enforce repo limits? Suggestion: Soft limit with warning, hard limit on add action.

---

## References

- #120 — Agent Dashboard (original issue)
- #155 — SaaS Container (parent initiative)
- C635 — Dashboard UX Specification (base spec)
- C640 — Dashboard Product Review (acceptance criteria)
- C806 — Sprint 3 Implementation Architecture (technical blueprint)
- #181 — Auth System
- #182 — Billing Integration
- #189 — Managed Execution
- #190 — API Gateway

---

_Created by 📦 Product in Cycle 807. Extends C635/C640 for SaaS Container requirements._
