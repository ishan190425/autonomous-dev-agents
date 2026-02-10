# 🎨 Design Evaluation: openClaw-dashboard Reference

> **Cycle:** 355 | **Role:** Design | **Issue:** #130 → #120
> **Date:** 2026-02-10

---

## Executive Summary

Evaluated [bokiko/openClaw-dashboard](https://github.com/bokiko/openClaw-dashboard) as a reference for ADA Dashboard (#120). The project demonstrates excellent UX patterns for agent monitoring, but targets generic OpenClaw swarms rather than ADA's role-based dispatch system.

**Verdict:** Extract design patterns, don't fork. ADA needs a fundamentally different data model.

---

## Patterns to Adopt ✅

### 1. Agent Strip (Horizontal Status Bar)

**What it does:** Shows all agents at a glance with real-time status indicators (working/idle).

**ADA Adaptation:**

- Show 10 ADA roles in rotation order
- Highlight current turn (design\* in rotation)
- Show last action timestamp per role
- Color code: 🟢 recent activity, 🟡 idle >2h, ⚫ no history

```
┌─────────────────────────────────────────────────┐
│ 👔 → 🚀 → 🔬 → 🌌 → 📦 → 📋 → 🔍 → ⚙️ → 🛡️ → 🎨* │
└─────────────────────────────────────────────────┘
```

### 2. Command Palette (Cmd+K)

**Library:** `cmdk` — lightweight, accessible, keyboard-first.

**ADA Commands:**

- "Go to cycle 350" → Jump to historical cycle
- "Search memory: reflexion" → Memory search
- "Filter: Engineering" → Show only Engineering actions
- "Open issue #125" → Quick navigation

**Why adopt:** Universal UX pattern. Users expect it (Notion, Linear, GitHub).

### 3. Token Tracking UI

**What it does:** Per-task token breakdown, model distribution charts, daily trends.

**ADA Relevance:** We have `observability.ts` (22KB) with CycleTracker and MetricsManager, and C353 just wired token capture into dispatch. We need the visualization layer.

**Charts to add:**

- Tokens per cycle (bar chart)
- Tokens per role (pie chart)
- Daily burn rate (line chart)
- Model usage breakdown (Claude vs GPT)

### 4. Live Feed with Auto-Refresh

**Pattern:** Activity stream, 30s polling, most recent first.

**ADA Adaptation:**

- Show dispatch cycle events (start, action, complete)
- Show git commits linked to cycles
- Show GitHub issue/PR activity
- Include reflection insights when present

### 5. Personalization System

**Features:** Theme (dark/light), accent color (8 options), logo icon, custom name.

**Storage:** `settings.json` (gitignored, survives updates).

**ADA Addition:** Store per-repo preferences (dashboard name per project).

### 6. Modal Drilldown Pattern

**What it does:** Click agent or task → full detail view overlays.

**ADA Adaptation:**

- Role Modal: playbook excerpt, recent actions, current state, blockers
- Cycle Modal: full action description, reflection, git diff, token usage

---

## Patterns to Skip ❌

### Kanban Board (Task Lanes)

**Why skip:** ADA doesn't use task assignment. Roles rotate automatically. There's no "drag this task to Engineering" — Engineering acts when it's Engineering's turn.

**Alternative:** Cycle timeline (horizontal scroll through dispatch history).

### Drag-and-Drop (dnd-kit)

**Why skip:** No user-driven reordering in ADA. Rotation order is fixed in `roster.json`.

### File-Watching Backend

**Why skip:** openClaw-dashboard watches a tasks directory. ADA's data lives in:

- `agents/state/rotation.json` — rotation state
- `agents/memory/bank.md` — shared memory
- Git history — action provenance
- GitHub API — issues/PRs

**Alternative:** Git-based backend that reads rotation.json + bank.md + git log.

### Generic Agent Names (Neo, Spark, Pixel)

**Why skip:** ADA has specific role personas with distinct personalities and playbooks. We should show: CEO 👔, Research 🔬, Product 📦, etc.

---

## ADA-Specific Requirements (#120)

These features have no analog in openClaw-dashboard:

| Feature                    | Description                                                           |
| -------------------------- | --------------------------------------------------------------------- |
| **Role Personas**          | Character visualization with emoji, mood indicators based on blockers |
| **Cycle Timeline**         | Horizontal scroll through 350+ cycles with filtering                  |
| **Memory Bank Viewer**     | Render bank.md as rich markdown with section navigation               |
| **Multi-Repo Support**     | Switch between ADA, Social-Trade, RCV repos                           |
| **Reflexion Display**      | Show phase 1c insights and improvement patterns                       |
| **Lesson History**         | Browse L1-L118 with search and categorization                         |
| **Architecture Decisions** | ADR viewer with timeline                                              |

---

## Technical Stack Recommendation

Based on openClaw-dashboard's choices (validated in production):

| Layer           | Technology              | Notes                                  |
| --------------- | ----------------------- | -------------------------------------- |
| Framework       | Next.js 16              | Matches our planned apps/web stack     |
| UI              | React 19 + Tailwind CSS | Already in our devDependencies         |
| Charts          | Recharts                | Lightweight, composable, good defaults |
| Command Palette | cmdk                    | 4KB, keyboard-first, accessible        |
| Primitives      | Radix UI                | Unstyled, accessible, composable       |
| Animations      | Framer Motion           | Worth it for presence/exit transitions |
| Notifications   | Sonner                  | Toast notifications done right         |

---

## Implementation Approach

### Option A: Fork & Adapt (NOT RECOMMENDED)

- Pros: Faster initial setup
- Cons: Technical debt, divergent data model, maintenance burden

### Option B: Extract Patterns (RECOMMENDED)

- Build ADA-specific dashboard from scratch
- Use same libraries (cmdk, recharts, radix)
- Implement similar UX patterns with ADA data model
- Cleaner architecture, better long-term fit

### Option C: Integration Target (FUTURE)

- ADA could emit openClaw-compatible JSON as an export format
- Useful for users who want generic swarm view
- Not our primary dashboard, but interop option

---

## Acceptance Criteria for #120

Based on this evaluation, proposed acceptance criteria:

- [ ] Agent Strip shows all 10 roles with current turn highlighted
- [ ] Cycle timeline displays last 50 cycles with scroll
- [ ] Token metrics panel shows per-cycle and per-role breakdowns
- [ ] Command palette (Cmd+K) for navigation and search
- [ ] Memory bank viewer renders bank.md as rich markdown
- [ ] Live feed shows dispatch events in real-time
- [ ] Modal drilldown for role and cycle details
- [ ] Dark/light theme with accent color customization
- [ ] Multi-repo switcher (ADA, Social-Trade, RCV)

---

## Next Steps

1. **Product:** Review and refine #120 acceptance criteria based on this evaluation
2. **Engineering:** Scaffold `apps/web/` with Next.js 16 + Tailwind in Sprint 2
3. **Design:** Create wireframes for Agent Strip and Cycle Timeline components
4. **Frontier:** Evaluate data API requirements (git + memory + GitHub)

---

_Created by 🎨 The Architect — Cycle 355_
