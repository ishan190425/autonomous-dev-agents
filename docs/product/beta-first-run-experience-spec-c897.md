# 📦 Beta First Run Experience Specification (C897)

> Product specification for what happens when a waitlist user converts to beta user
> **Author:** 📦 The PM (Product Lead)
> **Cycle:** 897
> **Date:** 2026-02-19
> **Status:** Draft — Ready for Design Review
> **Relates to:** #155 (SaaS Container), #181 (Auth), #200 (Waitlist), C894 (Nurture Emails)

---

## Context

### The Journey Gap

We have specs for getting users TO the product, but not for their FIRST experience WITH it:

```
Waitlist Signup (C877)       Auth Flow (C822)           ??? GAP ???             Dashboard (C852)
        │                         │                          │                       │
        ▼                         ▼                          ▼                       │
   Email + Name ──► Nurture ──► GitHub OAuth ──► Select Repo ──► [????] ──► Active User
                    (C894)                                                           │
                                                                                     ▼
                                                               ┌─────────────────────┐
                                                               │  Regular Dashboard  │
                                                               │  Usage (returning)  │
                                                               └─────────────────────┘
```

**This spec fills the gap:** What happens between "repo selected" and "active ADA user with running agents"?

### User Story

**As a** waitlist user who just got beta access,
**I want to** quickly see ADA working on my repo,
**So that** I understand the value immediately and become an active user.

---

## First Run Flow

### High-Level Journey

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        FIRST RUN EXPERIENCE (5-10 minutes)                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  [1. Welcome] → [2. Repo Setup] → [3. Team Config] → [4. First Cycle] → [5. Dashboard]
│       ↓              ↓                 ↓                  ↓                ↓
│   Personalized    Already done     Quick wizard       Watch it run     You're live!
│   greeting        (from auth)      (2-3 questions)    (real-time)
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Welcome Screen (Post-Auth)

After GitHub OAuth, show personalized welcome:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   🎉 Welcome to ADA, @username!                                      │
│                                                                      │
│   You're one of the first 50 early adopters.                        │
│   Let's set up your autonomous dev team.                            │
│                                                                      │
│   ┌────────────────────────────────────────┐                        │
│   │  What you're about to do:              │                        │
│   │                                         │                        │
│   │  1. Pick a repo (~30 sec)              │                        │
│   │  2. Configure your team (~2 min)       │                        │
│   │  3. Watch your first cycle (~2 min)    │                        │
│   │                                         │                        │
│   │  Total: About 5 minutes                │                        │
│   └────────────────────────────────────────┘                        │
│                                                                      │
│   ┌────────────────────────────────────────────┐                    │
│   │          🚀 Let's Go                       │                    │
│   └────────────────────────────────────────────┘                    │
│                                                                      │
│   or                                                                 │
│                                                                      │
│   [Skip for now — I'll explore first]                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Design Notes:**

- Early adopter badge for waitlist converts
- Time estimate reduces anxiety
- Skip option for explorers (they'll be prompted again later)

---

## Step 2: Repo Selection

This is the same as auth flow (C822), but with enhanced context:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   📁 Select a Repository                                             │
│                                                                      │
│   ADA will create an agent team for this repo.                      │
│   You can add more repos later.                                      │
│                                                                      │
│   ┌─────────────────────────────────────────────┐                   │
│   │ ⭐ Recommended for First Setup              │                   │
│   │                                              │                   │
│   │ ○ username/my-side-project      ★ 12       │                   │
│   │   Last active: 2 days ago                   │                   │
│   │   "A small project is perfect for testing"  │                   │
│   └─────────────────────────────────────────────┘                   │
│                                                                      │
│   All repositories:                                                  │
│                                                                      │
│   │ ○ username/main-work-project    ★ 234      │                   │
│   │ ○ org/team-repo                 ★ 1.2k     │                   │
│   │ ○ username/experiment           ★ 3        │                   │
│                                                                      │
│   [🔍 Search...]                                                     │
│                                                                      │
│   ┌────────────────────────────────────────────┐                    │
│   │          Continue →                         │                    │
│   └────────────────────────────────────────────┘                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Intelligence:**

- Recommend smaller repos for first setup (less risk, faster cycles)
- Sort by recency + activity
- Show why smaller is better: "Perfect for testing"

---

## Step 3: Team Configuration Wizard

Simplified version of CLI wizard (C792) for web:

### 3a. Team Size

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   🤖 How big should your team be?                                    │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                              │   │
│   │   ○ Starter (3 roles)                    ✓ Recommended      │   │
│   │     CEO · Engineering · Ops                                  │   │
│   │     Perfect for side projects and learning ADA              │   │
│   │                                                              │   │
│   │   ○ Standard (5 roles)                                       │   │
│   │     + Product · QA                                           │   │
│   │     Good for active development projects                     │   │
│   │                                                              │   │
│   │   ○ Full Team (8 roles)                                      │   │
│   │     + Design · Research · Growth                             │   │
│   │     For complex projects or dogfooding                       │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   💡 You can add roles later. Start small.                          │
│                                                                      │
│   ┌────────────────┐  ┌────────────────────────┐                    │
│   │    ← Back      │  │      Continue →        │                    │
│   └────────────────┘  └────────────────────────┘                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3b. Focus Area (Optional — Can Skip)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   🎯 What's your priority? (optional)                                │
│                                                                      │
│   This helps agents focus on what matters to you.                   │
│                                                                      │
│   ○ Balanced — Equal time on all areas                              │
│   ○ Ship fast — More engineering, less planning                     │
│   ○ Quality first — More testing and review                         │
│   ○ Explore — Research and experiments                              │
│                                                                      │
│   ┌────────────────┐  ┌────────────────────────┐                    │
│   │    ← Back      │  │      Continue →        │                    │
│   └────────────────┘  └────────────────────────┘                    │
│                                                                      │
│   [Skip — use defaults]                                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3c. Confirmation

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   ✅ Ready to Initialize                                             │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                              │   │
│   │  Repository:   username/my-side-project                     │   │
│   │  Team:         Starter (3 roles)                            │   │
│   │  Focus:        Balanced                                      │   │
│   │                                                              │   │
│   │  What we'll do:                                              │   │
│   │  • Create agents/ directory in your repo                    │   │
│   │  • Set up 3 agent playbooks (CEO, Engineering, Ops)         │   │
│   │  • Initialize shared memory bank                            │   │
│   │  • Run your first dispatch cycle                            │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────────┐│
│   │              🚀 Initialize My Team                              ││
│   └────────────────────────────────────────────────────────────────┘│
│                                                                      │
│   ← Back to settings                                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 4: First Cycle Experience (The "Aha Moment")

**This is the critical conversion moment.** User needs to SEE agents working.

### 4a. Initialization Progress

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   🔧 Setting Up Your Agent Team                                      │
│                                                                      │
│   ████████████████████░░░░░░░░░░ 65%                                │
│                                                                      │
│   ✓ Created agents/DISPATCH.md                                       │
│   ✓ Created agents/roster.json                                       │
│   ✓ Created agents/playbooks/ceo.md                                  │
│   ↻ Creating agents/playbooks/engineering.md...                     │
│   ○ Creating agents/memory/bank.md                                   │
│   ○ Creating agents/state/rotation.json                              │
│   ○ Committing to repository                                         │
│                                                                      │
│   ⏱️ About 30 seconds remaining                                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4b. First Cycle Watch (Real-Time)

After initialization, immediately start a cycle and show it live:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   🎬 Your First Dispatch Cycle                                       │
│                                                                      │
│   Watch your agents work in real-time. This is Cycle 1.             │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                              │   │
│   │  👔 CEO is thinking...                                       │   │
│   │                                                              │   │
│   │  ┌──────────────────────────────────────────────────────┐   │   │
│   │  │  📋 Reading DISPATCH.md...                            │   │   │
│   │  │  📚 Loading memory bank...                            │   │   │
│   │  │  🔍 Analyzing repository structure...                 │   │   │
│   │  │  ✓ Detected: TypeScript project with 12 files        │   │   │
│   │  │  📝 Writing first status report...                    │   │   │
│   │  └──────────────────────────────────────────────────────┘   │   │
│   │                                                              │   │
│   │  Live output ↑                                               │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   ⏱️ Cycle typically takes 1-3 minutes                               │
│                                                                      │
│   [Run in background — I'll explore the dashboard]                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4c. Cycle Complete — Success!

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   🎉 Cycle 1 Complete!                                               │
│                                                                      │
│   Your first agent (CEO) just analyzed your repo and created        │
│   an initial status report.                                          │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                              │   │
│   │  What happened:                                              │   │
│   │                                                              │   │
│   │  ✓ CEO analyzed repo structure                               │   │
│   │  ✓ Created agents/memory/bank.md with context               │   │
│   │  ✓ Identified 3 potential improvement areas                 │   │
│   │  ✓ Committed changes to your repo                           │   │
│   │                                                              │   │
│   │  Next: Engineering will act in Cycle 2                      │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   ┌───────────────────────────────────────────────────────────────┐ │
│   │  📄 View Changes on GitHub                                     │ │
│   └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│   ┌───────────────────────────────────────────────────────────────┐ │
│   │  🚀 Continue to Dashboard                                      │ │
│   └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 5: Dashboard Entry (First Visit)

First dashboard visit shows helpful onboarding elements:

```
┌─────────────────────────────────────────────────────────────────────┐
│  🤖 ADA Dashboard                               @username  [Logout] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  🎯 Getting Started Checklist          Progress: 2/5 ██░░░ 40% │ │
│  │                                                                 │ │
│  │  ✓ Create your first agent team                                │ │
│  │  ✓ Run your first cycle                                        │ │
│  │  ○ Review agents' first commits on GitHub                      │ │
│  │  ○ Run 10 cycles                                               │ │
│  │  ○ Customize a playbook                                        │ │
│  │                                                                 │ │
│  │  [Dismiss checklist]                                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  my-side-project                                     [+ Add Repo]   │
│  ├─ Cycle 1 complete · CEO acted 2 minutes ago                     │
│  ├─ 3 roles: CEO → Engineering → Ops                               │
│  └─ [Run Next Cycle] [View Cycles] [Settings]                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**First-visit elements:**

1. **Onboarding checklist** — gamified progress toward "power user"
2. **Quick stats** — immediate value visibility
3. **Clear next action** — "Run Next Cycle" button prominent

---

## Success Metrics

### Conversion Funnel

| Step                      | Target | Measured By            |
| ------------------------- | ------ | ---------------------- |
| Beta invite email opened  | 60%    | Resend open rate       |
| Clicked "Get Access" link | 40%    | UTM + Vercel analytics |
| Completed GitHub OAuth    | 80%    | Auth events            |
| Selected a repository     | 90%    | Dashboard events       |
| Completed team config     | 85%    | Dashboard events       |
| Watched first cycle       | 80%    | Dashboard events       |
| Returned within 7 days    | 50%    | User activity          |

### Key Metrics

- **Time to first cycle:** Target < 5 minutes from login
- **Completion rate:** Target > 60% complete full first run
- **Day 1 retention:** Target > 70% return same day
- **Day 7 retention:** Target > 50% return within week

---

## Error States

### Repo Initialization Fails

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   ⚠️ Couldn't Initialize Agents                                      │
│                                                                      │
│   We couldn't write to your repository.                             │
│                                                                      │
│   Common causes:                                                     │
│   • Branch is protected — try a different branch                    │
│   • Missing write permissions — check repo settings                 │
│   • Repo is archived — unarchive to enable writing                  │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────────┐│
│   │              Try Again                                          ││
│   └────────────────────────────────────────────────────────────────┘│
│                                                                      │
│   [Choose a different repo]  [Contact support]                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### First Cycle Times Out

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   ⏰ Cycle Taking Longer Than Expected                               │
│                                                                      │
│   The first cycle is still running. This can happen with            │
│   larger repos or complex codebases.                                │
│                                                                      │
│   Options:                                                           │
│   • [Keep waiting] — We'll notify you when it's done                │
│   • [Go to dashboard] — You can check progress there                │
│   • [Cancel and retry] — Start fresh with a smaller repo            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

### API Endpoints Needed

```typescript
// Initialize agent team on repo
POST /api/repos/:id/init
Body: { teamSize: 'starter' | 'standard' | 'full', focus?: string }
Response: { success: boolean, cycleId?: string, error?: string }

// Start a cycle
POST /api/repos/:id/cycles
Response: { cycleId: string, status: 'started' }

// Poll cycle status (for real-time view)
GET /api/cycles/:id/status
Response: { status: 'running' | 'complete' | 'failed', logs: string[], role: string, action?: string }

// Mark onboarding steps complete
POST /api/users/onboarding
Body: { step: string, completed: boolean }
```

### Event Tracking

Track these events for funnel analysis:

- `first_run.welcome_seen`
- `first_run.repo_selected`
- `first_run.team_configured`
- `first_run.init_started`
- `first_run.init_complete`
- `first_run.cycle_started`
- `first_run.cycle_complete`
- `first_run.dashboard_entered`
- `first_run.checklist_dismissed`

---

## Dependencies

- **Auth Flow (C822)** — Provides GitHub OAuth + initial repo selection
- **Dashboard SaaS Spec (C852)** — Dashboard UI that users land on
- **REST API (C862)** — Backend endpoints for init + cycles
- **Managed Execution (#189)** — Cloud cycle execution

---

## Open Questions for Design

1. Should we show cycle logs in real-time or just progress indicators?
2. How prominent should the onboarding checklist be after Day 1?
3. Should we send a notification/email when first cycle completes (if they navigated away)?
4. Should "Skip" take them to empty dashboard or a different getting-started view?

---

## Related Documents

- `docs/design/auth-flow-ux-spec-c822.md` — Auth flow (Step 1-2 basis)
- `docs/design/dashboard-saas-integration-spec-c852.md` — Dashboard spec
- `docs/marketing/waitlist-nurture-sequence-c894.md` — Email 4 (beta invite)
- `docs/product/waitlist-website-ux-spec-c877.md` — Waitlist signup

---

_📦 The PM (Product Lead) — Cycle 897_
_Bridging the gap between "repo selected" and "active ADA user."_
