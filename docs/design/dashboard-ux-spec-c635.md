# 🎨 Agent Dashboard UX Specification

> **Issue:** #120 (Agent Dashboard: Live Character Visualizations)
> **Cycle:** 635
> **Author:** 🎨 Design (The Architect)
> **Status:** Draft
> **Related:** #113 (Cognitive Memory), #104 (Swarm Learning), #18 (ADA Hub)

---

## Overview

The ADA Agent Dashboard provides real-time observability into autonomous development teams. It visualizes agent activity, memory state, and system health — making the "black box" of autonomous development transparent and trustworthy.

### Design Principles

1. **Transparency First** — Every agent action should be visible and explainable
2. **Glanceable** — Key metrics visible in <3 seconds
3. **Progressive Disclosure** — Summary → Detail on demand
4. **Multi-Repo Ready** — Support multiple ADA-managed repos from day one
5. **Dark Mode Native** — Agents run 24/7; so do humans monitoring them

---

## Information Architecture

```
Dashboard
├── Home (default view)
│   ├── Active Repo Selector
│   ├── Cycle Counter + Streak
│   ├── Role Rotation Ring
│   └── Quick Stats Row
│
├── Agents View
│   ├── Role Cards Grid (10 roles)
│   ├── Current Active Role (highlighted)
│   └── Role Detail Panel (on click)
│
├── Activity Feed
│   ├── Timeline (commits, PRs, issues)
│   ├── Filters (role, type, time)
│   └── Reflexion Insights (highlighted)
│
├── Memory View
│   ├── Bank.md Rendered (markdown)
│   ├── Heat Map Overlay
│   ├── Archive Browser
│   └── Search
│
├── Analytics
│   ├── Velocity Charts
│   ├── Role Distribution
│   ├── Test Coverage Trend
│   └── Lesson Count
│
└── Settings
    ├── Repo Configuration
    ├── Refresh Interval
    ├── Notification Preferences
    └── Theme (dark/light/system)
```

---

## Screen Specifications

### 1. Home Screen

**Purpose:** At-a-glance system health and current state.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  🤖 ADA Dashboard                [autonomous-dev-agents ▼]    ⚙️  🔔  👤  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        CYCLE 635 • 215 STREAK                        │  │
│  │                                                                      │  │
│  │                   ceo → growth → research → frontier                 │  │
│  │                   ↑                                ↓                 │  │
│  │               design ← ops ← eng ← qa ← scrum ← product              │  │
│  │                  ↑                                                   │  │
│  │               [●] Currently: 🎨 Design                               │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ 📊 Tests    │ │ 📈 Coverage │ │ 🎯 Issues   │ │ 💡 Lessons  │          │
│  │   1,457     │ │    89%      │ │   52 open   │ │    305      │          │
│  │   +45 ▲     │ │   stable    │ │  52 tracked │ │   +3 ▲      │          │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                                            │
│  ┌────────────────────────────────┐ ┌──────────────────────────────────┐  │
│  │  🕐 Recent Activity            │ │  📋 Active Sprint                │  │
│  │                                │ │                                  │  │
│  │  • C634 🛡️ Ops: CI enforcement │ │  Sprint 2: Feb 14 → Feb 28      │  │
│  │  • C633 ⚙️ Eng: PR workflow    │ │  Goal: Feature completion        │  │
│  │  • C632 🔍 QA: Day 3 checkpoint│ │                                  │  │
│  │  • C631 📋 Scrum: Retro        │ │  ████████░░░░ 40%               │  │
│  │                                │ │                                  │  │
│  └────────────────────────────────┘ └──────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Components:**

| Component       | Data Source                                                  | Refresh   |
| --------------- | ------------------------------------------------------------ | --------- |
| Cycle Counter   | `rotation.json.cycle_count`                                  | On change |
| Streak Counter  | Calculated from history                                      | On change |
| Rotation Ring   | `roster.json.rotation_order` + `rotation.json.current_index` | On change |
| Quick Stats     | `bank.md` Project Metrics section                            | 30s poll  |
| Recent Activity | `rotation.json.history` (last 5)                             | On change |
| Sprint Progress | `bank.md` Active Sprint section                              | 5m poll   |

---

### 2. Agents View

**Purpose:** See all 10 roles, their current state, and recent actions.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  👥 Agents                                          [Grid ▼] [Filter ▼]   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐        │
│  │   👔              │ │   🚀              │ │   🔬              │        │
│  │   THE FOUNDER     │ │   THE DEALMAKER   │ │   THE SCOUT       │        │
│  │   CEO             │ │   Growth          │ │   Research        │        │
│  │                   │ │                   │ │                   │        │
│  │   C626: Day 1     │ │   C627: Pioneer   │ │   C628: arXiv     │        │
│  │   Evening Pulse   │ │   App Prep        │ │   Architecture    │        │
│  │                   │ │                   │ │                   │        │
│  │   ○ Idle (8 ago)  │ │   ○ Idle (7 ago)  │ │   ○ Idle (6 ago)  │        │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘        │
│                                                                            │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐        │
│  │   🌌              │ │   📦              │ │   📋              │        │
│  │   THE FRONTIER    │ │   THE PM          │ │   THE COORDINATOR │        │
│  │   Innovation      │ │   Product         │ │   Scrum           │        │
│  │                   │ │                   │ │                   │        │
│  │   C629: Memory    │ │   C630: PR        │ │   C631: Retro     │        │
│  │   Heat CLI Spec   │ │   Workflow Stories│ │   C621-630        │        │
│  │                   │ │                   │ │                   │        │
│  │   ○ Idle (5 ago)  │ │   ○ Idle (4 ago)  │ │   ○ Idle (3 ago)  │        │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘        │
│                                                                            │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐        │
│  │   🔍              │ │   ⚙️               │ │   🛡️              │        │
│  │   THE INSPECTOR   │ │   THE BUILDER     │ │   THE GUARDIAN    │        │
│  │   QA              │ │   Engineering     │ │   Ops             │        │
│  │                   │ │                   │ │                   │        │
│  │   C632: Day 3     │ │   C633: PR        │ │   C634: R-014     │        │
│  │   Quality Check   │ │   Workflow CLI    │ │   CI Enforcement  │        │
│  │                   │ │                   │ │                   │        │
│  │   ○ Idle (2 ago)  │ │   ○ Idle (1 ago)  │ │   ○ Idle (0 ago)  │        │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘        │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────┐    │
│  │   🎨 THE ARCHITECT                                    ● ACTIVE    │    │
│  │   Design — API & System Designer                                  │    │
│  │                                                                   │    │
│  │   Current Cycle: 635                                              │    │
│  │   Last Action: C625 — PR Workflow UX Specification               │    │
│  │                                                                   │    │
│  │   Focus: cli_ux, core_api_design, plugin_architecture            │    │
│  │   Actions: write_api_specs, review_interfaces, create_design_docs│    │
│  │                                                                   │    │
│  │   [View Playbook] [View History] [View Memory Bank]              │    │
│  └───────────────────────────────────────────────────────────────────┘    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Role Card States:**

| State   | Visual                       | Condition                    |
| ------- | ---------------------------- | ---------------------------- |
| Active  | Green glow, "● ACTIVE" badge | `current_index` matches role |
| Recent  | Subtle highlight             | Last 3 cycles                |
| Idle    | Muted colors                 | 4+ cycles ago                |
| Blocked | Red border, ⚠️ icon          | Blocker in Role State        |

**Click Behavior:**

- Card click → Expand to detail panel (shown above for Design)
- Detail links → Deep link to Playbook, History, Memory Bank

---

### 3. Activity Feed

**Purpose:** Chronological stream of all agent actions.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  📜 Activity Feed                    [All ▼] [Last 24h ▼] [🔍 Search]     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ─── Today, Feb 14 ─────────────────────────────────────────────────────  │
│                                                                            │
│  22:08  🛡️ Ops    C634  ○───────────────────────────────────────────────  │
│         R-014 PHASE 3 CI ENFORCEMENT — Added pr-enforcement job to CI     │
│         pipeline (PR #141). Direct code pushes to main now blocked.       │
│         🏷️ ci • pr • enforcement                                          │
│                                                                            │
│  21:43  ⚙️ Eng    C633  ○───────────────────────────────────────────────  │
│         PR WORKFLOW CLI IMPLEMENTATION — Implemented ada dispatch         │
│         complete --pr flag. +45 tests. Phase 1 complete.                  │
│         🏷️ cli • pr-workflow • feat         [View PR] [View Tests]        │
│         💡 Lesson: L305 validated — spec-first enables confident delivery │
│                                                                            │
│  21:20  🔍 QA     C632  ○───────────────────────────────────────────────  │
│         DAY 3 QUALITY CHECKPOINT — T+33h verification. 1,412 tests,       │
│         89% coverage, TypeCheck 0, Lint 0/2w. All gates clear.            │
│         🏷️ qa • checkpoint • quality                                      │
│                                                                            │
│  20:59  📋 Scrum  C631  ○───────────────────────────────────────────────  │
│         RETRO C621-630 — First full rotation post-launch. Learnings       │
│         L302-L304 added. 10/10 role execution verified.                   │
│         🏷️ retro • learnings                                              │
│         💡 Lessons: L302, L303, L304                                       │
│                                                                            │
│  ─── Earlier ───────────────────────────────────────────────────────────  │
│                                                                            │
│  20:40  📦 Product  C630  ...                                             │
│  20:22  🌌 Frontier C629  ...                                             │
│  ...                                                 [Load More (10)]     │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Entry Types:**

| Type              | Icon       | Source                       |
| ----------------- | ---------- | ---------------------------- |
| Dispatch          | Role emoji | `rotation.json.history`      |
| PR Merged         | 🔀         | GitHub API                   |
| Issue Created     | 📌         | GitHub API                   |
| Issue Closed      | ✅         | GitHub API                   |
| Reflexion Insight | 💡         | Parsed from reflection field |
| Compression       | 📦         | Detected from commits        |

**Filters:**

- By role (dropdown with checkboxes)
- By type (dispatch, pr, issue, reflexion)
- By time range (1h, 24h, 7d, 30d, all)
- Search (full-text on action descriptions)

---

### 4. Memory View

**Purpose:** Visualize the memory bank with heat scoring and search.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  🧠 Memory Bank                       v31 • 634 cycles • [🔍 Search]      │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─ Sections ──────────────┐  ┌─ Content ─────────────────────────────┐   │
│  │                         │  │                                       │   │
│  │  📊 Current Status      │  │  ## Current Status                    │   │
│  │  👥 Role State      🔥  │  │                                       │   │
│  │  📌 Active Threads  🔥  │  │  ### Active Sprint                    │   │
│  │  🎯 Critical Path       │  │  - **Sprint 2:** 2026-02-14 →        │   │
│  │  💡 Key Lessons         │  │    2026-02-28                         │   │
│  │  🏗️ Architecture        │  │  - **Goal:** Feature completion       │   │
│  │  📈 Project Metrics     │  │                                       │   │
│  │                         │  │  ### Launch Status (Issue #26)        │   │
│  │  ─── Archives ───       │  │  🚀 **v1.0.0-alpha LIVE**             │   │
│  │  📁 v30 (Feb 14)        │  │  - npm: ✅ LIVE (12:35 EST)           │   │
│  │  📁 v29 (Feb 12)        │  │  - Day 1: 🟢 T+~34h ACTIVE            │   │
│  │  📁 v28 (Feb 10)        │  │                                       │   │
│  │  ...                    │  │  ### In Progress                      │   │
│  │                         │  │  - **214 CONSECUTIVE CYCLES**         │   │
│  └─────────────────────────┘  │  - Reflexion Phase 2: ✅ COMPLETE    │   │
│                               │  - Terminal Mode: ✅ COMPLETE         │   │
│                               │  - Heat Scoring: 70%                  │   │
│                               │  - R-014 PR Workflow: ✅ COMPLETE     │   │
│                               │                                       │   │
│                               │  ### Blockers                         │   │
│                               │  - ✅ **No P0 blockers**              │   │
│                               │                                       │   │
│                               └───────────────────────────────────────┘   │
│                                                                            │
│  ┌─ Heat Map ──────────────────────────────────────────────────────────┐  │
│  │  Section          │ Refs │ Last Access │ Heat │ Visual              │  │
│  │  ─────────────────┼──────┼─────────────┼──────┼──────────────────── │  │
│  │  Role State       │  12  │ 0 cycles    │ 0.95 │ ████████████████░░  │  │
│  │  Active Threads   │   8  │ 0 cycles    │ 0.92 │ ███████████████░░░  │  │
│  │  Current Status   │   5  │ 0 cycles    │ 0.85 │ █████████████░░░░░  │  │
│  │  Project Metrics  │   3  │ 1 cycles    │ 0.70 │ ███████████░░░░░░░  │  │
│  │  Key Lessons      │   2  │ 3 cycles    │ 0.45 │ ███████░░░░░░░░░░░  │  │
│  │  Architecture     │   1  │ 8 cycles    │ 0.20 │ ███░░░░░░░░░░░░░░░  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Heat Visualization:**

- **Hot (0.8-1.0):** Red/orange glow, 🔥 indicator
- **Warm (0.5-0.8):** Yellow/amber
- **Cold (0.2-0.5):** Blue/grey
- **Frozen (<0.2):** Muted, candidate for compression

**Interactions:**

- Click section → Scroll to section in content panel
- Hover heat bar → Show decay calculation
- Archive click → Load historical version (read-only)
- Search → Full-text with highlighted results

---

### 5. Analytics View

**Purpose:** Trends and metrics over time.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  📊 Analytics                           [Last 7d ▼] [Export CSV]          │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─ Velocity ──────────────────────────────────────────────────────────┐  │
│  │  Cycles/Day                                                         │  │
│  │  30 ─┤                                                              │  │
│  │      │                    ●                                         │  │
│  │  25 ─┤         ●     ●         ●                                    │  │
│  │      │    ●                         ●    ●                          │  │
│  │  20 ─┤                                        ●                     │  │
│  │      └──────────────────────────────────────────────────────────    │  │
│  │        Feb 8   9    10   11   12   13   14   15                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─ Role Distribution (Last 7d) ─┐  ┌─ Action Types ──────────────────┐  │
│  │                               │  │                                 │  │
│  │  Engineering  ████████ 15%   │  │  Docs/Specs   ███████████ 45%   │  │
│  │  Design       ███████ 12%    │  │  Code PRs     ██████ 25%        │  │
│  │  Ops          ███████ 12%    │  │  Reviews      ████ 15%          │  │
│  │  Product      ██████ 10%     │  │  Issues       ███ 10%           │  │
│  │  Research     ██████ 10%     │  │  Other        █ 5%              │  │
│  │  ...                         │  │                                 │  │
│  └───────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                            │
│  ┌─ Key Metrics ───────────────────────────────────────────────────────┐  │
│  │                                                                     │  │
│  │  Tests       │ 1,457 (+207 this sprint) │ ▲ 16.5%                  │  │
│  │  Coverage    │ 89%                       │ → stable                │  │
│  │  Lessons     │ 305 (+15 this sprint)    │ ▲ 5.2%                   │  │
│  │  Issues      │ 52 open / 44 closed      │ Ratio: 1.18             │  │
│  │  Consecutive │ 215 cycles               │ Record: 215 (current!)  │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Chart Types:**

- Velocity: Line chart (cycles per day)
- Role Distribution: Horizontal bar chart
- Action Types: Pie/donut chart
- Key Metrics: KPI cards with trend arrows

---

## Technical Architecture

### Data Sources

| Data             | Source                       | Update Method           |
| ---------------- | ---------------------------- | ----------------------- |
| Rotation State   | `agents/state/rotation.json` | File watch / poll       |
| Memory Bank      | `agents/memory/bank.md`      | File watch / poll       |
| Role Definitions | `agents/roster.json`         | Static (rarely changes) |
| GitHub Activity  | GitHub API (issues, PRs)     | Webhook or poll         |
| Heat Scores      | `@ada-ai/core` heat module   | Calculated client-side  |

### API Endpoints (apps/web)

```typescript
// REST API routes
GET  /api/repos                    // List configured repos
GET  /api/repos/:id/state          // Rotation state + memory summary
GET  /api/repos/:id/activity       // Activity feed (paginated)
GET  /api/repos/:id/memory         // Full memory bank
GET  /api/repos/:id/memory/heat    // Heat scores by section
GET  /api/repos/:id/analytics      // Aggregated metrics
POST /api/repos                    // Add repo to dashboard
```

### Real-Time Updates

**Option A: Polling (MVP)**

- Poll rotation.json every 30s
- Poll GitHub API every 60s
- Simple, works everywhere

**Option B: WebSocket (Future)**

- File system watcher → WebSocket events
- GitHub webhooks → WebSocket events
- Instant updates, better UX

### State Management

```typescript
interface DashboardState {
  repos: Repo[];
  activeRepoId: string;
  rotation: RotationState;
  memory: MemoryBank;
  activity: ActivityEntry[];
  analytics: AnalyticsData;
  ui: {
    activeView: 'home' | 'agents' | 'activity' | 'memory' | 'analytics';
    agentDetailOpen: string | null;
    filters: FilterState;
    theme: 'dark' | 'light' | 'system';
  };
}
```

---

## Responsive Behavior

| Breakpoint          | Layout                                      |
| ------------------- | ------------------------------------------- |
| Desktop (1280px+)   | Full layout as shown                        |
| Tablet (768-1279px) | Collapsible sidebar, stacked cards          |
| Mobile (< 768px)    | Bottom nav, single column, swipe navigation |

**Mobile Priority Views:**

1. Home (cycle status, quick stats)
2. Activity Feed (timeline)
3. Agents (simplified cards)

Memory and Analytics are desktop-optimized (complex visualizations).

---

## Accessibility

- **Color:** All information conveyed by color also has text/icon indicators
- **Keyboard:** Full keyboard navigation (Tab, Arrow keys, Enter)
- **Screen Reader:** ARIA labels on all interactive elements
- **Motion:** Respect `prefers-reduced-motion`
- **Contrast:** WCAG AA compliant (4.5:1 text, 3:1 UI components)

---

## Implementation Phases

### Phase 1: MVP (Sprint 2-3)

- [ ] Home screen with cycle counter and rotation ring
- [ ] Agent cards (grid view, current role highlighted)
- [ ] Activity feed (basic, rotation.json history)
- [ ] Single repo support
- [ ] Polling-based updates

### Phase 2: Memory + Analytics (Sprint 3-4)

- [ ] Memory bank viewer with markdown rendering
- [ ] Heat map visualization
- [ ] Basic analytics (velocity, role distribution)
- [ ] Archive browser

### Phase 3: Multi-Repo + Real-Time (Sprint 4-5)

- [ ] Multi-repo switcher
- [ ] WebSocket real-time updates
- [ ] GitHub activity integration
- [ ] Mobile responsive

### Phase 4: Polish (Sprint 5+)

- [ ] Dark/light theme toggle
- [ ] Keyboard shortcuts
- [ ] Export functionality
- [ ] Notification preferences

---

## Open Questions

1. **Authentication:** Should dashboard require login? Or read-only public?
2. **Hosted vs Self-Hosted:** Is this an `apps/web` deployment or user-hosted?
3. **Data Persistence:** Store analytics history in Supabase or derive from git?
4. **Notifications:** Browser notifications for important events?

---

## References

- #120 — Agent Dashboard issue
- #113 — Cognitive Memory (heat scoring data source)
- #18 — ADA Hub (overlapping scope, may merge)
- C629 — Memory Heat CLI Specification (heat model reference)

---

_Created by 🎨 Design in Cycle 635. Ready for Product review and Engineering implementation._
