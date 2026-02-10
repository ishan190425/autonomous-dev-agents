# 🎨 Agent Dashboard UX Specification

> Design spec for Issue #120 — Agent Dashboard: Live Character Visualizations
>
> **Status:** DRAFT v1.0
> **Author:** 🎨 The Architect (C285)
> **Date:** 2026-02-09

---

## 1. Overview

A real-time web dashboard for monitoring autonomous development teams. Designed for 24/7 observability of ADA agents across multiple repositories.

### Design Goals

1. **Glanceable Status** — Understand team health in <3 seconds
2. **Character-First** — Agents feel like a real team, not abstract processes
3. **Context-Rich** — Deep-dive without leaving the dashboard
4. **Multi-Repo Ready** — Switch between projects seamlessly

---

## 2. Information Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard                                                   │
│  ├── Header (repo selector, global status, settings)        │
│  ├── Team Grid (agent cards)                                │
│  ├── Activity Feed (live stream)                            │
│  ├── Memory Viewer (bank.md visualization)                  │
│  └── Metrics Panel (charts, health)                         │
└─────────────────────────────────────────────────────────────┘
```

### Primary Views

| View                | Purpose                       | Entry Point       |
| ------------------- | ----------------------------- | ----------------- |
| **Team Overview**   | See all agents at a glance    | Default landing   |
| **Agent Detail**    | Deep-dive into single agent   | Click agent card  |
| **Activity Stream** | Real-time event log           | Side panel or tab |
| **Memory Explorer** | Browse/search memory bank     | Tab or modal      |
| **Insights Board**  | Reflexion patterns, heat maps | Tab               |

---

## 3. Component Specifications

### 3.1 Header Bar

```
┌───────────────────────────────────────────────────────────────┐
│ [🤖 ADA Dashboard]  [▼ autonomous-dev-agents]  ⚡ C285 LIVE  │
│                                     [🔔 3] [⚙️] [👤]         │
└───────────────────────────────────────────────────────────────┘
```

**Elements:**

- **Logo/Title** — ADA branding, links to home
- **Repo Selector** — Dropdown: autonomous-dev-agents, social-trade, rcv-hedge-fund
- **Cycle Indicator** — Current cycle number + status (LIVE/IDLE/ERROR)
- **Notification Bell** — Unread alerts, blockers, insights
- **Settings** — Theme, refresh rate, notification preferences
- **User Menu** — Account, logout

**Behavior:**

- Repo switch triggers full dashboard reload with new data
- Cycle indicator pulses during active dispatch
- Notification badge shows count, click reveals drawer

---

### 3.2 Agent Cards (Team Grid)

The heart of the dashboard — visual representation of each role.

```
┌─────────────────────────────┐
│     👔                      │
│   ╭────╮                    │
│   │ 😎 │  ← Avatar          │
│   ╰────╯                    │
│  The Founder (CEO)          │
│  ───────────────────        │
│  Last: C276 • 36m ago       │
│  "T-8 Days Go/No-Go..."     │
│                             │
│  [View] [History] [Memory]  │
│  ████████░░ 80% utilization │
└─────────────────────────────┘
```

**Card States:**

| State   | Visual                      | When                  |
| ------- | --------------------------- | --------------------- |
| Active  | Green glow, animated border | Currently dispatching |
| Recent  | Normal                      | Last action <2h ago   |
| Idle    | Slightly dimmed             | Last action >2h ago   |
| Blocked | Red badge                   | Has active blocker    |
| Error   | Red border, ⚠️ icon         | Last dispatch failed  |

**Avatar System:**
Each role gets a distinct character avatar — not generic icons, but memorable characters:

| Role        | Emoji | Character Concept                |
| ----------- | ----- | -------------------------------- |
| CEO         | 👔    | Suited executive, confident pose |
| Research    | 🔬    | Lab coat, curious expression     |
| Product     | 📦    | Builder with blueprints          |
| Scrum       | 📋    | Clipboard, organized             |
| QA          | 🔍    | Detective with magnifying glass  |
| Engineering | ⚙️    | Engineer with tools              |
| Ops         | 🛡️    | Guardian with shield             |
| Growth      | 🚀    | Astronaut/adventurer             |
| Design      | 🎨    | Artist with brush                |
| Frontier    | 🌌    | Explorer in space suit           |

**Interaction:**

- **Hover** → Show expanded summary (last 3 actions)
- **Click** → Open Agent Detail view
- **Right-click** → Context menu (view history, memory, issues)

**Layout:**

- Desktop: 5 cards per row (2 rows for 10 roles)
- Tablet: 3 cards per row
- Mobile: 2 cards per row, collapsible

---

### 3.3 Agent Detail View

Slide-in panel or modal when clicking an agent card.

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back                                    🎨 The Architect  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ╭────────╮                                                  │
│  │        │  The Architect                                   │
│  │  🎨    │  API & System Designer                           │
│  │        │  ────────────────────────────                    │
│  ╰────────╯  Designing clean, intuitive interfaces...       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Stats                                                 │   │
│  │ Cycles: 28 │ PRs: 4 │ Issues: 12 │ Insights: 7       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌ Recent Actions ──────────────────────────────────────┐   │
│  │ C285 • Now     • Agent Dashboard UX Spec             │   │
│  │ C275 • 5h ago  • `ada insights` UX Review            │   │
│  │ C265 • 12h ago • CLI dogfooding spec update          │   │
│  │ C255 • 1d ago  • E2E testing design review           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌ Current Focus ───────────────────────────────────────┐   │
│  │ Working on: Sprint 2 design review                   │   │
│  │ Pipeline: Issue #73 UX polish                        │   │
│  │ Blocked by: None                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [View Full History] [See Memory State] [Related Issues]    │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.4 Activity Feed

Real-time stream of all agent activity.

```
┌─────────────────────────────────────────────────────────────┐
│ Activity Feed                              [Filter ▼] [⏸️]  │
├─────────────────────────────────────────────────────────────┤
│ NOW                                                          │
│ ├── 🎨 Design started C285                                  │
│ │   └── Working on: Agent Dashboard UX Spec                 │
│ │                                                           │
│ 36 MINUTES AGO                                              │
│ ├── 🛡️ Ops completed C284                                  │
│ │   └── GitHub Release Automation                           │
│ │   └── [View Commit] [View Issue]                          │
│ │                                                           │
│ 43 MINUTES AGO                                              │
│ ├── ⚙️ Engineering completed C283                          │
│ │   └── Action execution                                    │
│ │                                                           │
│ 45 MINUTES AGO                                              │
│ ├── 🔍 QA completed C282                                    │
│ │   └── Action execution failed                             │
│ │   └── ⚠️ Status: partial                                  │
└─────────────────────────────────────────────────────────────┘
```

**Filters:**

- By role (multi-select)
- By type: commits, issues, PRs, insights, errors
- By time range: last hour, today, this week
- By outcome: success, partial, blocked, failed

**Real-time Behavior:**

- New items slide in from top with subtle animation
- Auto-scroll can be paused
- Click item to expand details
- Sound/notification option for errors

---

### 3.5 Memory Viewer

Beautiful visualization of the memory bank.

```
┌─────────────────────────────────────────────────────────────┐
│ Memory Bank v14                    [Search 🔍] [Heat Map]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌ Current Status ───────────────────────────────────────┐   │
│ │ ▼ Active Sprint                                        │   │
│ │   Sprint 1: 2026-02-14 → 2026-02-28                   │   │
│ │   Goal: Ship v1.0-alpha (Feb 24)                      │   │
│ │                                                        │   │
│ │ ▼ Launch Status (Issue #26)                           │   │
│ │   MUST Criteria: 6/6 COMPLETE ✅                       │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌ Role States (10) ─────────────────────────────────────┐   │
│ │ [👔 CEO] [🔬 Research] [📦 Product] [📋 Scrum]        │   │
│ │ [🔍 QA] [⚙️ Engineering] [🛡️ Ops] [🚀 Growth]        │   │
│ │ [🎨 Design] [🌌 Frontier]                             │   │
│ │                                                        │   │
│ │ Click to expand role state...                         │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌ Active Threads (46 open) ─────────────────────────────┐   │
│ │ P0-P1 (8) │ P2 Active (6) │ Backlog (32)              │   │
│ │ ─────────────────────────────────────────              │   │
│ │ #26 🚀 LAUNCH — Go/No-Go Feb 17             [View →]  │   │
│ │ #39 Demo Asset Production — CHECKPOINT Feb 11 [View →]│   │
│ │ ...                                                    │   │
│ └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Heat Map View:**
Visual representation of memory access patterns (from Phase 4a heat scoring):

- Color intensity = access frequency
- Sections glow based on recency
- Helps identify hot vs cold memory regions

---

### 3.6 Insights Board

Reflexion patterns and cross-role insights from `ada insights`.

```
┌─────────────────────────────────────────────────────────────┐
│ Insights                              [Last 50 Cycles ▼]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌ Pattern: Testing Quality ─────────────────────────────┐   │
│ │ 🔬 Research + 🔍 QA + ⚙️ Engineering                  │   │
│ │ ──────────────────────────────────────                 │   │
│ │ "Multiple roles noting testing improvements"          │   │
│ │ Confidence: 0.85 │ Cycles: C273-C280                  │   │
│ │                                            [Create →] │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌ Cascade Alert ────────────────────────────────────────┐   │
│ │ ⚠️ Product → Engineering blocking detected            │   │
│ │ ──────────────────────────────────────                 │   │
│ │ "Spec not ready, Engineering waiting"                 │   │
│ │ Resolution: Prioritize spec completion                │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌ Heat Distribution ────────────────────────────────────┐   │
│ │  [Visual heat bar chart showing memory section usage] │   │
│ └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Multi-Repo Support

Dashboard supports switching between multiple ADA-powered repositories.

### Repo Selector

```
┌────────────────────────────────┐
│ Select Repository          ▼   │
├────────────────────────────────┤
│ ● autonomous-dev-agents       │ ← Active
│   C285 • 10 roles • LIVE      │
│ ──────────────────────────────│
│ ○ social-trade                │
│   C142 • 6 roles • IDLE       │
│ ──────────────────────────────│
│ ○ rcv-ai-hedge-fund           │
│   C78 • 4 roles • IDLE        │
│ ──────────────────────────────│
│ [+ Add Repository]            │
└────────────────────────────────┘
```

**Configuration:**
Each repo needs:

- Git URL or local path
- agents/ directory location
- Refresh interval
- Notification preferences

---

## 5. Visual Design Principles

### Color Palette

```
Background:     #0a0a0a (near black)
Surface:        #1a1a1a (card backgrounds)
Border:         #333333 (subtle dividers)

Primary:        #3b82f6 (blue accent)
Success:        #22c55e (green)
Warning:        #eab308 (yellow)
Error:          #ef4444 (red)
Info:           #6366f1 (indigo)

Text Primary:   #ffffff
Text Secondary: #a1a1aa
Text Muted:     #71717a
```

### Typography

```
Headings:   Inter, semi-bold
Body:       Inter, regular
Mono:       JetBrains Mono (code, cycle numbers)

Scale:
H1: 24px / 32px line-height
H2: 20px / 28px
H3: 16px / 24px
Body: 14px / 20px
Small: 12px / 16px
```

### Spacing System

```
Base unit: 4px
xs: 4px   (0.25rem)
sm: 8px   (0.5rem)
md: 16px  (1rem)
lg: 24px  (1.5rem)
xl: 32px  (2rem)
2xl: 48px (3rem)
```

### Animation

```
Transition:     150ms ease-out (default)
Slow:           300ms ease-out (panels, modals)
Pulse:          1s infinite (active states)

New item:       fade-in + slide-down
Card expand:    scale(1.02) + shadow
Active glow:    box-shadow pulse animation
```

---

## 6. Data Flow

### Data Sources

| Source                       | Data                             | Update Frequency       |
| ---------------------------- | -------------------------------- | ---------------------- |
| `agents/state/rotation.json` | Current cycle, role, history     | Per cycle (~30min)     |
| `agents/memory/bank.md`      | Team memory, active threads      | Per cycle              |
| `agents/roster.json`         | Role definitions, rotation order | Rarely changes         |
| `.git`                       | Commits, PRs (via GitHub API)    | Real-time via webhooks |
| `ada insights` CLI           | Cross-role patterns              | On demand              |

### Refresh Strategy

1. **Polling:** Check rotation.json every 30 seconds
2. **Webhooks:** GitHub webhooks for commits/PRs (instant)
3. **File watching:** Watch bank.md for changes (local dev)
4. **Manual:** Refresh button for immediate update

---

## 7. Technical Notes

### Stack Alignment

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui components
- **State:** React Query for server state, Zustand for UI state
- **Real-time:** Server-Sent Events or WebSocket for live updates
- **Charts:** Recharts or Visx for metrics visualization

### API Endpoints (Proposed)

```
GET  /api/repos                    # List configured repos
GET  /api/repos/:id/status         # Current rotation state
GET  /api/repos/:id/memory         # Parsed memory bank
GET  /api/repos/:id/activity       # Activity feed items
GET  /api/repos/:id/insights       # Reflexion patterns
POST /api/repos/:id/refresh        # Force refresh
```

### File Structure (Proposed)

```
apps/web/
├── app/
│   ├── page.tsx                   # Dashboard home
│   ├── [repo]/
│   │   ├── page.tsx               # Repo overview
│   │   ├── agents/[role]/page.tsx # Agent detail
│   │   ├── memory/page.tsx        # Memory explorer
│   │   └── insights/page.tsx      # Insights board
│   └── api/
│       └── repos/...              # API routes
├── components/
│   ├── agent-card.tsx
│   ├── activity-feed.tsx
│   ├── memory-viewer.tsx
│   ├── insights-board.tsx
│   └── repo-selector.tsx
└── lib/
    ├── data-sources/
    │   ├── rotation.ts
    │   ├── memory-parser.ts
    │   └── github.ts
    └── hooks/
        └── use-live-updates.ts
```

---

## 8. Acceptance Criteria

### MVP (Sprint 2)

- [ ] Team grid with all 10 agent cards
- [ ] Real-time cycle indicator
- [ ] Basic activity feed (last 20 items)
- [ ] Memory bank viewer (read-only)
- [ ] Single repo support

### V1.0

- [ ] Agent detail view
- [ ] Multi-repo selector
- [ ] Insights board integration
- [ ] Heat map visualization
- [ ] Notification system

### V1.1+

- [ ] Mobile-responsive layout
- [ ] Keyboard navigation
- [ ] Dark/light theme toggle
- [ ] Custom avatar uploads
- [ ] Slack/Discord notifications

---

## 9. Open Questions

1. **Avatar style:** Emoji vs illustrated characters vs 3D renders?
2. **Real-time updates:** SSE vs WebSocket vs polling?
3. **Authentication:** Required for multi-repo? OAuth with GitHub?
4. **Deployment:** Vercel? Self-hosted option?

---

## 10. Related Resources

- **Issue #120:** Agent Dashboard: Live Character Visualizations
- **Issue #18:** ADA Hub web dashboard (parent feature)
- **Issue #95:** Cognitive Memory Architecture
- **Issue #113:** Innate vs Learned Memory
- **Issue #108:** Reflexion implementation

---

_🎨 The Architect — C285_
