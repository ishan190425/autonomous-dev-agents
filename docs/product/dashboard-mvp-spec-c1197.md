# Dashboard MVP Product Spec (C1197)

> **Sprint 3 Dashboard Requirements** — What users see, when, and why.
> Created: 2026-02-23 | Author: 📦 Product

---

## Executive Summary

Sprint 3 delivers the SaaS Container with Auth (#181), Billing (#182), and Managed Execution (#189). This spec defines the **Dashboard MVP** — the web interface users interact with after signup.

**Goal:** Users can sign up, run their first dispatch cycle via dashboard, and upgrade from Free → Pro within 5 minutes.

---

## Core Principle: CLI-First, Dashboard-Supplement

ADA is CLI-first. The dashboard **supplements** CLI workflows, not replaces them:

- **CLI:** Where developers work — `ada dispatch`, `ada status`, `ada memory`
- **Dashboard:** Visibility, billing, team management, onboarding

**MVP Focus:** Billing management + execution visibility. Advanced features (team management, custom roles UI) are Sprint 4+.

---

## Page Structure

### 1. Public Pages (Unauthenticated)

| Page    | URL        | Purpose                               |
| ------- | ---------- | ------------------------------------- |
| Landing | `/`        | Marketing, value prop, CTA to sign up |
| Pricing | `/pricing` | Tier comparison (Free/Pro/Enterprise) |
| Docs    | `/docs`    | Link to external docs site            |
| Login   | `/login`   | GitHub OAuth entry point              |

### 2. Dashboard Pages (Authenticated)

| Page             | URL                          | Purpose                                  | Tier |
| ---------------- | ---------------------------- | ---------------------------------------- | ---- |
| Overview         | `/dashboard`                 | Cycle status, usage meter, quick actions | All  |
| Executions       | `/dashboard/executions`      | Dispatch history, logs, status           | All  |
| Execution Detail | `/dashboard/executions/[id]` | Real-time logs, result, artifacts        | All  |
| Billing          | `/dashboard/billing`         | Current plan, usage, upgrade/manage      | All  |
| Settings         | `/dashboard/settings`        | Profile, API keys, preferences           | All  |
| Teams            | `/dashboard/teams`           | Team management, invitations             | Pro+ |

---

## Page Specifications

### Overview Page (`/dashboard`)

**Purpose:** At-a-glance status. Answer "What's happening with my agent team?"

**Components:**

```
┌─────────────────────────────────────────────────────────────┐
│  👋 Welcome back, {username}                    [Pro Plan]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │  Cycles This Month  │  │  Current Streak     │          │
│  │  ████████░░  847    │  │  🔥 47 consecutive  │          │
│  │  /1000 (Pro limit)  │  │                     │          │
│  └─────────────────────┘  └─────────────────────┘          │
│                                                             │
│  Recent Executions                           [View All →]   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✅ C1196 Frontier  20 min ago  "Execution Queue ADR" │   │
│  │ ✅ C1195 Research  40 min ago  "Integration Spec"    │   │
│  │ ✅ C1194 Growth    60 min ago  "Reddit Distribution" │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Quick Actions                                              │
│  [🚀 Run Dispatch]  [📊 View Metrics]  [⚙️ Settings]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Requirements:**

- Current tier + cycle usage from Billing service
- Last 5 executions from Dispatch service
- Consecutive streak calculated from execution history

**Tier Differences:**

- **Free:** Shows usage bar with 10 cycle/month limit, "Upgrade" CTA prominent
- **Pro:** Shows usage bar with 1000 cycle/month limit
- **Enterprise:** Shows "Unlimited" badge, no usage bar

---

### Executions Page (`/dashboard/executions`)

**Purpose:** Dispatch history. Answer "What have my agents done?"

**Components:**

```
┌─────────────────────────────────────────────────────────────┐
│  Executions                              [Filter] [Export]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  │ Status │ Cycle │ Role      │ Action          │ Duration │
│  ├────────┼───────┼───────────┼─────────────────┼──────────┤
│  │ ✅     │ 1196  │ Frontier  │ Execution Queue │ 2m 14s   │
│  │ ✅     │ 1195  │ Research  │ Integration Sp… │ 1m 47s   │
│  │ ⚠️     │ 1194  │ Growth    │ Reddit Distrib… │ 3m 02s   │
│  │ ❌     │ 1193  │ CEO       │ PR Branding Fi… │ 0m 32s   │
│                                                             │
│  [Load More]                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Columns:**

- **Status:** ✅ success, ⚠️ partial, ❌ failed, 🔄 running
- **Cycle:** Dispatch cycle number (links to detail)
- **Role:** Which agent role executed
- **Action:** Truncated action summary (hover for full)
- **Duration:** Execution wall-clock time
- **Timestamp:** When executed (relative, e.g., "2 hours ago")

**Filters:**

- Status (success/partial/failed/all)
- Role (dropdown)
- Date range (last 24h, 7d, 30d, custom)

**Actions:**

- Click row → Execution Detail page
- Export → CSV download of filtered results

---

### Execution Detail Page (`/dashboard/executions/[id]`)

**Purpose:** Deep dive into a single dispatch. Answer "What exactly happened?"

**Components:**

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Executions                                       │
│                                                             │
│  Cycle 1196 — 🌌 Frontier                    ✅ Success     │
│  Started: 2026-02-23 20:21:57 EST | Duration: 2m 14s        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Summary] [Logs] [Artifacts] [Reflection]                  │
│                                                             │
│  Summary                                                    │
│  ─────────────────────────────────────────────────────────  │
│  Action: EXECUTION QUEUE AND JOB SYSTEM ADR (C1196)         │
│                                                             │
│  Created `docs/architecture/adr-execution-queue-system-     │
│  c1196.md` completing Sprint 3 infrastructure trilogy.      │
│  Bull queue + worker pool + Docker orchestrator...          │
│                                                             │
│  Files Changed                                              │
│  ─────────────────────────────────────────────────────────  │
│  + docs/architecture/adr-execution-queue-system-c1196.md    │
│  M agents/memory/bank.md                                    │
│  M agents/state/rotation.json                               │
│                                                             │
│  Issues Referenced                                          │
│  ─────────────────────────────────────────────────────────  │
│  #155, #189 — Commented                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Tabs:**

1. **Summary:** Action description, files changed, issues referenced
2. **Logs:** Real-time execution logs (SSE streaming for in-progress)
3. **Artifacts:** Links to created files, PRs, issues
4. **Reflection:** What worked, what to improve, lesson learned

**Real-Time Updates (SSE):**

- For in-progress executions, logs stream live
- Status updates without page refresh
- "Execution complete" toast notification

---

### Billing Page (`/dashboard/billing`)

**Purpose:** Subscription management. Answer "What's my plan? How do I upgrade?"

**Components:**

```
┌─────────────────────────────────────────────────────────────┐
│  Billing                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Current Plan: Pro ($19/month)              [Manage Plan]   │
│  Billing cycle: Feb 1 - Feb 28, 2026                        │
│                                                             │
│  Usage This Cycle                                           │
│  ─────────────────────────────────────────────────────────  │
│  Dispatch Cycles: ████████░░░░░░░░░░░░ 847 / 1000           │
│  Resets in: 5 days                                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️ You've used 85% of your monthly cycles.          │   │
│  │ Consider upgrading to Enterprise for unlimited.     │   │
│  │                                    [View Plans →]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Payment Method                                             │
│  ─────────────────────────────────────────────────────────  │
│  💳 Visa ending in 4242          [Update]                   │
│                                                             │
│  Billing History                              [Download All] │
│  ─────────────────────────────────────────────────────────  │
│  Feb 1, 2026   Pro Subscription   $19.00   [Invoice]        │
│  Jan 1, 2026   Pro Subscription   $19.00   [Invoice]        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Tier-Specific Views:**

**Free Tier:**

```
Current Plan: Free                    [Upgrade to Pro →]
Dispatch Cycles: ██████████ 10 / 10 (limit reached)
⚠️ You've reached your monthly limit. Upgrade to continue.
```

**Pro Tier:** (shown above)

**Enterprise Tier:**

```
Current Plan: Enterprise ($99/month)         [Contact Sales]
Dispatch Cycles: Unlimited ✓
Team Members: 5 active
```

**Stripe Integration:**

- "Manage Plan" → Stripe Customer Portal (plan changes, cancellation)
- "Update" payment → Stripe Customer Portal
- Invoice links → Stripe-hosted invoice PDFs

---

### Settings Page (`/dashboard/settings`)

**Purpose:** Account configuration. API keys, preferences, profile.

**Sections:**

1. **Profile:** Name, email, avatar (from GitHub)
2. **API Keys:** Generate/revoke API keys for CLI auth
3. **Notifications:** Email preferences (execution failures, usage warnings)
4. **Connected Accounts:** GitHub OAuth status, disconnect option
5. **Danger Zone:** Delete account

**API Keys (MVP):**

- Generate new API key (shown once)
- List active keys with last-used timestamp
- Revoke keys

---

## User Flows

### Flow 1: First-Time User Onboarding

```
Landing → [Sign Up with GitHub] → GitHub OAuth
→ Dashboard (first visit) → Onboarding Modal
→ "Run Your First Cycle" CTA → Execution started
→ Real-time logs streaming → Success!
→ "You just shipped your first autonomous cycle 🎉"
```

**Onboarding Modal:**

```
┌─────────────────────────────────────────────────────────────┐
│  🚀 Welcome to ADA!                                         │
│                                                             │
│  Let's run your first autonomous dispatch cycle.            │
│                                                             │
│  Step 1: Connect a repository                               │
│  [Select Repository ▼]                                      │
│                                                             │
│  Step 2: Choose your team                                   │
│  [Default (10 roles) ▼]                                     │
│                                                             │
│  Step 3: Run your first cycle                               │
│  [🚀 Start Dispatch]                                        │
│                                                             │
│  Or skip and explore: [Maybe Later]                         │
└─────────────────────────────────────────────────────────────┘
```

### Flow 2: Free → Pro Upgrade

```
Dashboard → Usage bar at 90% → Warning banner
→ "Upgrade to Pro" CTA → Pricing comparison modal
→ Select Pro → Stripe Checkout
→ Payment success → Dashboard (now Pro)
→ "Welcome to Pro! 🎉 You now have 1000 cycles/month"
```

### Flow 3: View Execution Logs (In Progress)

```
Dashboard → "🔄 Running" badge on Overview
→ Click → Execution Detail page
→ Logs tab (SSE streaming live output)
→ "Execution complete" → Status updates to ✅
→ Summary/Artifacts tabs now populated
```

---

## Technical Requirements

### API Endpoints (per C1196 ADR)

| Endpoint                 | Method    | Purpose               |
| ------------------------ | --------- | --------------------- |
| `/api/dispatch`          | POST      | Start new dispatch    |
| `/api/dispatch/:id`      | GET       | Get dispatch details  |
| `/api/dispatch/:id/logs` | GET (SSE) | Stream logs           |
| `/api/user/usage`        | GET       | Current cycle usage   |
| `/api/billing/portal`    | POST      | Get Stripe portal URL |

### Real-Time Requirements

- **SSE for logs:** Server-Sent Events for live log streaming
- **Polling for status:** 5-second polling for execution status updates
- **WebSocket (Sprint 4):** Future upgrade for bi-directional communication

### Authentication

- **GitHub OAuth:** Primary auth method (per PR #253)
- **Session:** NextAuth.js session with tier/usage enrichment (per C1195)
- **API Keys:** For CLI authentication (device flow per C1195)

---

## Success Metrics

| Metric                | Target      | Measurement                                  |
| --------------------- | ----------- | -------------------------------------------- |
| Time to first cycle   | < 5 minutes | Timestamp: signup → first dispatch complete  |
| Dashboard engagement  | 30% weekly  | Active users viewing dashboard / total users |
| Free → Pro conversion | 10%         | Users upgrading within 30 days               |
| Execution visibility  | 80%         | Users who view at least 1 execution detail   |

---

## Out of Scope (Sprint 4+)

- **Team Management UI (#174):** Invite members, roles, permissions
- **Custom Role Builder (#176):** Visual role/playbook editor
- **Live Character Visualizations (#120):** Agent avatars, animations
- **Playbook Marketplace (#187):** Browse/install community templates

---

## Acceptance Criteria

### Dashboard MVP Must:

1. [ ] Display current tier and cycle usage on Overview
2. [ ] List recent executions with status/role/action
3. [ ] Show execution detail with logs (SSE for in-progress)
4. [ ] Integrate Stripe billing portal for plan management
5. [ ] Support GitHub OAuth login (NextAuth.js)
6. [ ] Show upgrade CTAs for Free tier users at 80%/100% usage
7. [ ] Generate/revoke API keys for CLI auth
8. [ ] Mobile-responsive layout (read-only acceptable on mobile)

### Sprint 3 Delivery:

- **Week 1 (Mar 1-7):** Auth + Billing pages functional
- **Week 2 (Mar 8-14):** Executions + Overview pages functional
- **Launch (Mar 15):** Full MVP dashboard live

---

## Related Issues

- **#155** — SaaS Container (parent epic)
- **#181** — Authentication System
- **#182** — Billing Integration
- **#189** — Managed Agent Execution
- **#190** — API Gateway and REST API

---

## Open Questions

1. **Execution trigger from dashboard:** Should MVP include "Run Dispatch" button, or CLI-only for v1?
   - **Recommendation:** Include button — critical for onboarding flow
2. **Repository selection:** Multi-repo support in MVP or single repo?
   - **Recommendation:** Single repo for MVP, multi-repo is Pro feature

3. **Log retention:** How long do we keep execution logs?
   - **Recommendation:** 30 days Free, 90 days Pro, 1 year Enterprise

---

_📦 Product | Cycle 1197 | Sprint 3 Dashboard MVP_
