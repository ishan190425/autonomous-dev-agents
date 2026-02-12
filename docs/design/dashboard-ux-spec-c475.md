# 🎨 Dashboard UX Specification (C475)

> **Issue:** #120 — Agent Dashboard: Live Character Visualizations  
> **Author:** 🎨 Design (The Architect)  
> **Status:** Draft Spec  
> **Sprint:** 2-3 (Post-launch)  
> **Created:** 2026-02-12

---

## Overview

The ADA Dashboard is a web-based visualization of autonomous agent team activity. It transforms the CLI's text output into real-time, visually engaging views that communicate agent state, progress, and personality.

**Goals:**

1. Make agent activity legible at a glance (no CLI required)
2. Surface key metrics and blockers immediately
3. Give each role a visual identity (character, color, icon)
4. Support both passive monitoring and active investigation

---

## Information Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  ADA Dashboard                                    [Settings ⚙️] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   CYCLE TIMELINE                         │   │
│  │  ← [ceo] [growth] [research] [frontier*] [product] →    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────────────────────┐   │
│  │   CURRENT ROLE   │  │        MEMORY BANK VIEWER        │   │
│  │   🌌 Frontier    │  │  ┌─────────────────────────────┐ │   │
│  │   Cycle 475      │  │  │ Current Status              │ │   │
│  │   Working on:    │  │  │ ────────────────            │ │   │
│  │   Reflexion P2   │  │  │ Sprint 1: Feb 14-28         │ │   │
│  │                  │  │  │ Launch: T-3 🟢              │ │   │
│  │   [View Action]  │  │  │ Blockers: None              │ │   │
│  └──────────────────┘  │  └─────────────────────────────┘ │   │
│                        └──────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    ROLE CARDS (Grid)                     │   │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │   │
│  │  │ 👔  │ │ 🚀  │ │ 🔬  │ │ 🌌  │ │ 📦  │ │ 📋  │       │   │
│  │  │ CEO │ │Growt│ │Rsrch│ │Front│ │ Prod│ │Scrum│       │   │
│  │  │ T-3 │ │ GIF │ │ Pap │ │ Ref │ │ Runb│ │ Ret │       │   │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘       │   │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                        │   │
│  │  │ 🔍  │ │ ⚙️  │ │ 🛡️  │ │ 🎨  │                        │   │
│  │  │ QA  │ │ Eng │ │ Ops │ │Desgn│                        │   │
│  │  │ Cov │ │ Lint│ │ CI  │ │ UX  │                        │   │
│  │  └─────┘ └─────┘ └─────┘ └─────┘                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    METRICS PANEL                         │   │
│  │  Cycles: 475  │  PRs: 43  │  Tests: 1,220  │  Cons: 53  │   │
│  │  ████████████████████████  Sprint Progress: 45%          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Cycle Timeline

**Purpose:** Show rotation sequence and current position.

**Visual Design:**

- Horizontal strip with role icons/avatars
- Current role highlighted (pulsing border or glow)
- Completed cycles grayed out slightly
- Upcoming roles visible but dimmed
- Click any role to jump to their last action

**Data Source:**

- `rotation.json.history[]` — recent actions
- `rotation.json.current_index` — current position
- `roster.json.rotation_order` — sequence

**Interactions:**

- Hover: Show role name + last action timestamp
- Click: Expand to action detail view
- Scroll: Navigate through history (last 20 cycles default)

**TypeScript Interface:**

```typescript
interface TimelineEntry {
  role: RoleName;
  icon: string; // Emoji or custom icon
  cycle: number;
  timestamp: Date;
  action: string; // Brief description
  outcome: 'success' | 'partial' | 'blocked';
}

interface CycleTimelineProps {
  entries: TimelineEntry[];
  currentIndex: number;
  onRoleClick: (cycle: number) => void;
}
```

---

### 2. Current Role Card

**Purpose:** Deep dive into the active role's state.

**Visual Design:**

- Large role icon/avatar (character illustration optional)
- Role name and title ("🌌 Frontier — The Explorer")
- Current cycle number
- Working on: brief description from memory bank
- Last action: timestamp + summary
- Next action: preview from pipeline

**States:**

- **Active:** Bright, animated (role is executing)
- **Idle:** Neutral, waiting for turn
- **Blocked:** Red border, blocker text visible

**TypeScript Interface:**

```typescript
interface CurrentRoleCardProps {
  role: RoleName;
  icon: string;
  title: string;
  cycle: number;
  workingOn: string;
  lastAction: { timestamp: Date; summary: string };
  nextAction?: string;
  state: 'active' | 'idle' | 'blocked';
  blocker?: string;
}
```

---

### 3. Memory Bank Viewer

**Purpose:** Render memory bank as navigable, searchable UI.

**Visual Design:**

- Collapsible sections matching bank.md headers
- Markdown rendering with syntax highlighting
- Search bar at top (full-text search)
- Diff view: highlight changes since last cycle
- Version indicator: "v28 (last compressed 2026-02-12)"

**Sections:**

1. Current Status — always expanded
2. Role State — expandable grid or list
3. Active Threads — filterable by priority/role
4. Key Lessons — searchable, linked to cycles
5. Architecture Decisions — ADR cards
6. Project Metrics — numeric highlights

**TypeScript Interface:**

```typescript
interface MemoryBankViewerProps {
  content: MemoryBank;
  version: number;
  lastUpdated: Date;
  searchQuery?: string;
  expandedSections: string[];
  onSectionToggle: (section: string) => void;
  onSearch: (query: string) => void;
}

interface MemoryBank {
  currentStatus: CurrentStatus;
  roleStates: Record<RoleName, RoleState>;
  activeThreads: ActiveThread[];
  keyLessons: Lesson[];
  architectureDecisions: ADR[];
  projectMetrics: Metrics;
}
```

---

### 4. Role Cards Grid

**Purpose:** At-a-glance status of all roles.

**Visual Design:**

- Grid of small cards (3-4 per row on desktop)
- Each card shows: icon, name, one-line status
- Color-coded border by role family:
  - Leadership: Gold (CEO)
  - Strategy: Purple (Growth, Product)
  - Technical: Blue (Engineering, Ops, QA)
  - Creative: Green (Design, Research, Frontier)
  - Process: Gray (Scrum)

**Card States:**

- ✅ Green: Role completed action this sprint, healthy
- ⏳ Yellow: Role pending, upcoming in rotation
- 🔴 Red: Role blocked or has unresolved issues
- ⚫ Gray: Role idle (no pending work)

**Interactions:**

- Click: Open role detail drawer (full history, playbook preview)
- Hover: Quick stats popup

**TypeScript Interface:**

```typescript
interface RoleCardProps {
  role: RoleName;
  icon: string;
  status: string; // One-line summary
  state: 'healthy' | 'pending' | 'blocked' | 'idle';
  lastCycle: number;
  onClick: () => void;
}

interface RoleCardsGridProps {
  roles: RoleCardProps[];
  currentRole: RoleName;
}
```

---

### 5. Metrics Panel

**Purpose:** Key project health indicators.

**Metrics Displayed:**

- **Cycles:** Total completed
- **PRs:** Merged count
- **Tests:** Total passing
- **Consecutive:** Success streak
- **Issues:** Open / Tracked ratio
- **Sprint Progress:** Bar visualization

**Visual Design:**

- Horizontal bar at bottom (persistent)
- Numbers large and prominent
- Trend indicators: ↑↓→ vs last period
- Progress bar for sprint timeline

**TypeScript Interface:**

```typescript
interface MetricsPanelProps {
  cycles: number;
  prs: number;
  tests: number;
  consecutive: number;
  issues: { open: number; tracked: number };
  sprint: {
    name: string;
    startDate: Date;
    endDate: Date;
    progress: number; // 0-100
  };
}
```

---

## Visual Language

### Colors

| Role Family | Primary          | Secondary | Example Roles              |
| ----------- | ---------------- | --------- | -------------------------- |
| Leadership  | #F59E0B (Gold)   | #FEF3C7   | CEO                        |
| Strategy    | #8B5CF6 (Purple) | #EDE9FE   | Growth, Product            |
| Technical   | #3B82F6 (Blue)   | #DBEAFE   | Engineering, Ops, QA       |
| Creative    | #10B981 (Green)  | #D1FAE5   | Design, Research, Frontier |
| Process     | #6B7280 (Gray)   | #F3F4F6   | Scrum                      |

### Typography

- **Headers:** Inter Bold, 24-32px
- **Body:** Inter Regular, 14-16px
- **Code:** JetBrains Mono, 13px
- **Metrics:** Inter SemiBold, 20-28px

### Icons

Use role emojis as primary icons:

- 👔 CEO, 🚀 Growth, 🔬 Research, 🌌 Frontier
- 📦 Product, 📋 Scrum, 🔍 QA
- ⚙️ Engineering, 🛡️ Ops, 🎨 Design

Optional: Custom character illustrations for each role (future).

---

## Responsive Behavior

### Desktop (1280px+)

- Full layout as wireframed
- Timeline horizontal, 10+ cycles visible
- Role cards in 5-column grid

### Tablet (768-1279px)

- Timeline scrollable horizontal
- Role cards in 3-column grid
- Memory viewer in drawer (slide-in)

### Mobile (< 768px)

- Timeline vertical (recent 5 cycles)
- Role cards in 2-column grid
- Current role card full-width
- Memory viewer on separate screen

---

## Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  File System    │────▶│  @ada/core API  │────▶│   Dashboard     │
│  rotation.json  │     │  loadRotation() │     │   Components    │
│  bank.md        │     │  parseMemory()  │     │                 │
│  roster.json    │     │  getRoleState() │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Data Refresh:**

- Poll every 30 seconds (or WebSocket for real-time)
- Show "Last updated: X seconds ago" indicator
- Highlight changes with subtle animation

---

## Implementation Notes

### Tech Stack (Recommended)

- **Framework:** Next.js 14 (app router)
- **Styling:** Tailwind CSS + shadcn/ui components
- **State:** React Query for data fetching
- **Markdown:** react-markdown with syntax highlighting
- **Charts:** Recharts for metrics visualization

### API Requirements

Dashboard needs these `@ada/core` functions:

```typescript
// Rotation state
export function loadRotation(): Promise<RotationState>;
export function getRotationHistory(limit?: number): Promise<HistoryEntry[]>;

// Memory bank
export function loadMemoryBank(): Promise<MemoryBank>;
export function searchMemory(query: string): Promise<SearchResult[]>;
export function getMemoryVersion(): Promise<{
  version: number;
  lastUpdated: Date;
}>;

// Roster
export function loadRoster(): Promise<Roster>;
export function getRoleState(role: RoleName): Promise<RoleState>;

// Metrics (aggregated)
export function getProjectMetrics(): Promise<Metrics>;
```

---

## Open Questions

1. **Real-time updates:** Polling vs WebSocket? (Polling simpler for v1)
2. **Character illustrations:** Commission custom art per role? (Nice-to-have)
3. **Multi-project support:** One dashboard per repo, or unified view?
4. **Authentication:** Who can view the dashboard? (Repo collaborators?)

---

## Sprint 2-3 Phasing

### Sprint 2 (Feb 28 - Mar 14)

- [ ] Core components: Timeline, Current Role Card, Metrics Panel
- [ ] Data integration with `@ada/core`
- [ ] Basic responsive layout

### Sprint 3 (Mar 14 - Mar 28)

- [ ] Memory Bank Viewer with search
- [ ] Role Cards Grid with state indicators
- [ ] Polish: animations, transitions, dark mode

### Future

- [ ] Character illustrations
- [ ] Real-time WebSocket updates
- [ ] Multi-project dashboard
- [ ] Notification integration

---

## References

- **Issue:** #120 — Agent Dashboard: Live Character Visualizations
- **Related:** #18 — ADA Hub (larger platform vision)
- **Lesson:** L190/L195 — Design specs with TypeScript samples accelerate Engineering

---

_🎨 Design (C475) — Dashboard UX Spec for Sprint 2/3 planning._
