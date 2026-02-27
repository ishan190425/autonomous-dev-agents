# 🎨 Managed Execution UX Design Spec (C1242)

> **Sprint 3 Feature** — Visual design for cloud-based agent execution dashboard.
> Created: 2026-02-27 | Author: 🎨 Design (The Architect)
> Complements: C787 (Product Spec), C1237 (Validation Criteria) | Issue: #189 (P1, Platform, L)
> Uses: C1112 (Dashboard Design System), C852 (Dashboard SaaS Integration)
> Per L718: "T-2 front-loading at scale eliminates Day 1 ambiguity."

---

## Executive Summary

This spec defines the **visual design** for Managed Agent Execution — the core SaaS differentiator. While C787 defines _what_ the feature does and C1237 defines _how to validate it_, this spec defines _how it looks and feels_ in the dashboard.

**Design Principles:**

1. **Status at a glance** — Users should know execution state in <1 second
2. **Progressive detail** — Overview first, drill-down for logs and errors
3. **Reassuring automation** — Make the "magic" feel trustworthy, not opaque
4. **Action-oriented errors** — Every failure state has a clear recovery path

---

## 1. Component Overview

The Managed Execution UI appears in three dashboard locations:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DASHBOARD LAYOUT                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1️⃣ HEADER STRIP — Global execution status + quick actions          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────────┐ │
│  │  2️⃣ REPO CARD                   │  │  3️⃣ EXECUTION DETAIL PANEL       │ │
│  │  Per-repo execution summary     │  │  Full logs, history, controls    │ │
│  │  + Run button                   │  │                                  │ │
│  └─────────────────────────────────┘  └──────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Execution States

Based on C1237 validation scenarios, define visual states:

### State Machine

```
                    ┌──────────────┐
                    │    IDLE      │
                    │  (no job)    │
                    └──────┬───────┘
                           │ trigger dispatch
                           ▼
                    ┌──────────────┐
                    │   QUEUED     │
                    │  (waiting)   │
                    └──────┬───────┘
                           │ worker picks up
                           ▼
                    ┌──────────────┐
       ┌───────────│   RUNNING    │────────────┐
       │           │  (executing) │            │
       │           └──────┬───────┘            │
       │                  │                    │
       │ timeout          │ complete           │ error
       ▼                  ▼                    ▼
┌──────────────┐  ┌──────────────┐     ┌──────────────┐
│   TIMEOUT    │  │   SUCCESS    │     │   FAILED     │
│ (killed)     │  │  (done)      │     │  (error)     │
└──────────────┘  └──────────────┘     └──────────────┘
       │                                       │
       └───────────────┬───────────────────────┘
                       │ retry available
                       ▼
               ┌──────────────┐
               │   RETRYING   │
               │  (auto)      │
               └──────────────┘
```

### State Colors (per C1112 Design System)

| State      | Color                       | Icon | Animation      |
| ---------- | --------------------------- | ---- | -------------- |
| IDLE       | `--color-info` (#3b82f6)    | ◯    | None           |
| QUEUED     | `--ada-active` (#f59e0b)    | ◷    | Pulse (slow)   |
| RUNNING    | `--ada-primary` (#7c3aed)   | ◐    | Spin           |
| SUCCESS    | `--color-success` (#10b981) | ✓    | Checkmark pop  |
| FAILED     | `--color-error` (#ef4444)   | ✗    | Shake (subtle) |
| TIMEOUT    | `--color-warning` (#f59e0b) | ⏱    | None           |
| RETRYING   | `--ada-active` (#f59e0b)    | ↻    | Spin           |
| RATE_LIMIT | `--color-warning` (#f59e0b) | ⚡   | None           |

---

## 3. Component Designs

### 3.1 Header Execution Strip

Always visible at top of dashboard when executions exist.

#### Idle State

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ◯  All agents idle                                    [Run All Repos ▾]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Active State (Multiple Repos)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ◐  3 repos running · 1 queued · 12 completed today       [Pause All]      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░  75% daily quota     │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Rate Limited State (Free Tier)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚡ Daily limit reached (10/10 cycles)               [Upgrade to Pro →]     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  100% (resets 8h)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**CSS:**

```css
.execution-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.execution-strip--active {
  background: linear-gradient(
    90deg,
    var(--ada-primary-light) 0%,
    var(--bg-secondary) 100%
  );
}

.execution-strip--limited {
  background: var(--color-warning-light);
  border-color: var(--color-warning);
}
```

---

### 3.2 Repository Execution Card

Shown in the repo list view. Each card shows repo status and primary action.

#### Idle Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  📦 my-awesome-app                                              ◯ Idle     │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Last cycle: 2h ago · 🔬 Research · "Added API research doc"               │
│                                                                             │
│  ┌─────────────────────────────┐                                           │
│  │     ▶  Run Dispatch Cycle   │                      24 cycles this week  │
│  └─────────────────────────────┘                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Running Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  📦 my-awesome-app                                     ◐ Running (2:34)    │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ⚙️ Engineering acting...                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░  ~1 min remaining   │
│                                                                             │
│  ┌─────────────────────────────┐                                           │
│  │     ⏸  Pause Cycle          │                          [View Logs ↗]   │
│  └─────────────────────────────┘                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Success Card (just completed)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  📦 my-awesome-app                                     ✓ Completed (just)  │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ✓ 🎨 Design: "Created dashboard wireframes for Sprint 4"                  │
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                           │
│  │ View Result │ │ View Diff   │ │ Run Next    │           25 cycles/week  │
│  └─────────────┘ └─────────────┘ └─────────────┘                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Failed Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠ ERROR                                                                    │
│  ────────────────────────────────────────────────────────────────────────  │
│  📦 my-awesome-app                                    ✗ Failed (5 min ago) │
│                                                                             │
│  ✗ Execution error: GitHub API rate limit exceeded                         │
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐                                           │
│  │ View Logs   │ │ Retry Now   │          Retries remaining: 2             │
│  └─────────────┘ └─────────────┘                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.3 Execution Detail Panel

Slide-out panel when clicking "View Logs" or repo card.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ╳  Execution #exec_abc123                                                  │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  📦 my-awesome-app                                                          │
│  Role: 🎨 Design (The Architect)                                           │
│  Started: 2:34 PM · Duration: 3m 24s · Status: ✓ Success                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TABS: [Summary] [Logs] [Memory Diff] [Cost]                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  SUMMARY                                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Action:                                                                    │
│  "🎨 MANAGED EXECUTION UX SPEC — Created dashboard component designs       │
│  for #189. 6 wireframes, state machine, accessibility specs."              │
│                                                                             │
│  Files Changed:                                                             │
│  • docs/design/managed-execution-ux-spec-c1242.md (+342 lines)             │
│                                                                             │
│  Issues Referenced:                                                         │
│  • #189 (commented)                                                         │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  TIMELINE                                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ○ 2:34:00  Job queued                                                     │
│  ○ 2:34:02  Container started                                              │
│  ○ 2:34:05  Context loaded (memory bank v61)                               │
│  ○ 2:34:15  GitHub issues fetched (47 open)                                │
│  ○ 2:35:30  LLM response received                                          │
│  ○ 2:37:20  Files written, git commit                                      │
│  ● 2:37:24  Cycle complete                                                 │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                           │
│  │ View on GH  │ │ Re-run      │ │ Download    │                           │
│  └─────────────┘ └─────────────┘ └─────────────┘                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.4 Logs Tab

Real-time log viewer with search and filtering.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  LOGS                                                     🔍 [Filter ▾]    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  2:34:00.123  INFO   Container initialized                          │   │
│  │  2:34:00.456  INFO   Loading memory bank v61                        │   │
│  │  2:34:01.789  INFO   Memory loaded: 162 lines                       │   │
│  │  2:34:02.012  INFO   Fetching GitHub issues...                      │   │
│  │  2:34:05.345  INFO   47 open issues, 0 PRs                          │   │
│  │  2:34:06.678  INFO   Running ada dispatch start                     │   │
│  │  2:34:07.901  INFO   Cycle 1242 started — role: design              │   │
│  │  2:34:10.234  DEBUG  Building prompt (context: 12,450 tokens)       │   │
│  │  2:34:15.567  INFO   LLM request sent (claude-3.5-sonnet)           │   │
│  │  2:35:30.890  INFO   LLM response received (2,340 tokens)           │   │
│  │  2:35:31.123  INFO   Writing managed-execution-ux-spec-c1242.md     │   │
│  │  2:37:20.456  INFO   Git commit: docs(design): managed exec UX      │   │
│  │  2:37:22.789  INFO   Git push successful                            │   │
│  │  2:37:24.012  INFO   ada dispatch complete                          │   │
│  │  2:37:24.345  INFO   ✓ Cycle 1242 complete                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Showing 15 of 15 log lines                              [Download .log]   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Log Level Colors:**

```css
.log-level--debug {
  color: var(--text-muted);
}
.log-level--info {
  color: var(--text-primary);
}
.log-level--warn {
  color: var(--color-warning);
  font-weight: 500;
}
.log-level--error {
  color: var(--color-error);
  font-weight: 600;
}
```

---

### 3.5 Cost Tab

Transparent cost tracking per C787 requirements.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COST BREAKDOWN                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  This Execution                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LLM Tokens          12,450 in · 2,340 out         $0.0234          │   │
│  │  Compute Time        3m 24s                        $0.0085          │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │  Total                                             $0.0319          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  This Month (Feb 2026)                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Cycles: 247          Tokens: 2.4M                 $7.42            │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░  $7.42 of $29 budget        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  💡 Tip: Average cost per cycle: $0.03 — you're within efficient range.   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Wireframes for C1237 Validation Scenarios

### 4.1 Scenario: Queue Job

**Trigger:** User clicks "Run Dispatch Cycle" button.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BEFORE                                           AFTER                     │
│  ─────────────────────────────                   ─────────────────────────  │
│                                                                             │
│  📦 my-app                 ◯ Idle               📦 my-app        ◷ Queued  │
│                                                                             │
│  [▶ Run Dispatch Cycle]                         [Position: #2 in queue]    │
│                                                                             │
│                                                  Waiting for worker...     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Interaction:**

1. Button shows loading spinner during API call
2. Optimistic update: Card transitions to "Queued" immediately
3. Toast notification: "Cycle queued — position #2"

---

### 4.2 Scenario: Execute Job

**Trigger:** Worker picks up queued job.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  📦 my-app                                           ◐ Running (0:45)      │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Current step: Loading context...                                          │
│                                                                             │
│  ○ Queued                                     ✓ 0:00                       │
│  ○ Container started                          ✓ 0:02                       │
│  ● Loading memory bank                          0:45    ← current          │
│  ○ Fetching GitHub state                        —                          │
│  ○ Executing dispatch                           —                          │
│  ○ Committing changes                           —                          │
│                                                                             │
│  ━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░  ~3 min remaining            │
│                                                                             │
│  [⏸ Pause]  [View Live Logs ↗]                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Real-time Updates:**

- WebSocket connection for live progress
- Step checklist updates as phases complete
- Time elapsed counter ticks every second
- Progress bar based on average phase durations

---

### 4.3 Scenario: Success

**Trigger:** Cycle completes successfully.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✓ Cycle #1242 completed successfully!                      [╳]    │   │
│  │                                                                     │   │
│  │  🎨 Design created: "Managed Execution UX Spec"                     │   │
│  │                                                                     │   │
│  │  [View Result]  [View on GitHub]  [Run Another]                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  📦 my-app                                           ✓ Completed (just)   │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ✓ 🎨 Design: "Created managed execution UX spec with 6 wireframes"       │
│                                                                             │
│  Changes: +342 lines in docs/design/                                       │
│  Cost: $0.03 · Duration: 3m 24s                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Animation:**

1. Success toast slides in from top-right
2. Card border flashes green briefly
3. Checkmark icon has subtle "pop" animation
4. Auto-dismiss toast after 5s (unless hovered)

---

### 4.4 Scenario: Timeout

**Trigger:** Cycle exceeds 5-minute limit.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ⏱ Cycle #1242 timed out                                     [╳]    │   │
│  │                                                                     │   │
│  │  The cycle exceeded the 5-minute limit and was stopped.             │   │
│  │  Partial work may have been saved.                                  │   │
│  │                                                                     │   │
│  │  [View Partial Logs]  [Retry with Extended Timeout]                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  📦 my-app                                           ⏱ Timeout (5:00)     │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ⏱ Timed out during: Executing dispatch                                   │
│                                                                             │
│  Last log: "LLM response taking longer than expected..."                   │
│                                                                             │
│  [View Logs]  [Retry]  [Report Issue]                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Recovery Actions:**

- "Retry" — Same parameters, resets timeout
- "Retry with Extended Timeout" — Pro feature, 10min limit
- "View Logs" — Debug what went wrong
- "Report Issue" — Links to GitHub issue template

---

### 4.5 Scenario: Rate Limit

**Trigger:** Free user exceeds daily cycle quota.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ⚡ Daily cycle limit reached                                        │   │
│  │                                                                     │   │
│  │  You've used all 10 cycles today on the Free plan.                  │   │
│  │                                                                     │   │
│  │  Upgrade to Pro for:                                                │   │
│  │  • Unlimited cycles                                                 │   │
│  │  • Priority execution                                               │   │
│  │  • Extended timeouts                                                │   │
│  │                                                                     │   │
│  │  [Upgrade to Pro — $29/mo]        Resets in 8h 42m                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  📦 my-app                                           ⚡ Rate Limited       │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Cycles today: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  10/10 used     │
│                                                                             │
│  [Upgrade]  [Schedule for Tomorrow]  [Enable Overages*]                    │
│                                                        *Pro only           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Conversion Path:**

1. Upgrade CTA prominently displayed
2. "Schedule for Tomorrow" — queues for midnight reset
3. Countdown timer shows when quota resets
4. "Enable Overages" teases Pro feature

---

### 4.6 Scenario: Retry

**Trigger:** Transient failure with auto-retry.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  📦 my-app                                           ↻ Retrying (auto)     │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ⚠ Previous attempt failed: GitHub API connection timeout                  │
│                                                                             │
│  Auto-retry #1 of 2 in progress...                                         │
│                                                                             │
│  ○ First attempt                              ✗ Failed (0:45)              │
│  ● Retry #1                                     Running (0:15)             │
│  ○ Retry #2 (if needed)                         —                          │
│                                                                             │
│  [Cancel Retry]  [View First Attempt Logs]                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**After All Retries Exhausted:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  📦 my-app                                           ✗ Failed (all retries)│
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ✗ Failed after 2 retries: GitHub API consistently unreachable             │
│                                                                             │
│  This appears to be a GitHub outage. Check status.github.com               │
│                                                                             │
│  [View All Attempt Logs]  [Manual Retry Later]  [Check GitHub Status ↗]   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Accessibility Requirements

Per C1112 Design System and WCAG 2.1 AA:

### Keyboard Navigation

```
Tab Order:
1. Header strip actions
2. Repo cards (in DOM order)
3. Active card actions
4. Detail panel (when open)

Shortcuts:
- `r` — Run dispatch on focused repo
- `l` — View logs for focused repo
- `Esc` — Close detail panel
- `j/k` — Navigate repo cards
```

### Screen Reader Announcements

```javascript
// Status changes should announce
ariaLive(
  'polite',
  'Cycle 1242 completed successfully. Design created managed execution UX spec.'
);
ariaLive(
  'assertive',
  'Error: GitHub API rate limit exceeded. Retry available.'
);
ariaLive('polite', 'Cycle queued. Position 2 in queue.');
```

### Color Contrast

All state indicators meet 4.5:1 contrast ratio (verified against C1112 palette).

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
  .progress-bar {
    transition: none;
  }
  .toast {
    animation: none;
  }
}
```

---

## 6. Mobile Responsiveness

### Breakpoints (per C1112)

| Breakpoint | Width      | Layout                           |
| ---------- | ---------- | -------------------------------- |
| Mobile     | < 640px    | Stacked cards, bottom sheet logs |
| Tablet     | 640-1024px | 2-column, slide-in panel         |
| Desktop    | > 1024px   | 3-column, side panel             |

### Mobile Card (Collapsed)

```
┌──────────────────────────────────────────┐
│  📦 my-app                   ◐ Running  │
│  ⚙️ Engineering · 2:34       [View →]   │
└──────────────────────────────────────────┘
```

Tap to expand or swipe for actions.

---

## 7. Implementation Notes for Engineering

### Component Structure

```typescript
// Suggested component hierarchy
<ExecutionProvider>              // WebSocket + state management
  <ExecutionHeader />            // Global status strip
  <RepoGrid>
    <RepoExecutionCard repo={repo} />
  </RepoGrid>
  <ExecutionDetailPanel />       // Slide-out, controlled by route
</ExecutionProvider>
```

### State Management

```typescript
interface ExecutionState {
  executions: Map<string, Execution>;
  activeExecution: string | null;
  globalStatus: 'idle' | 'running' | 'rate_limited';
  dailyUsage: { used: number; limit: number; resetAt: Date };
}
```

### WebSocket Events

```typescript
type ExecutionEvent =
  | { type: 'QUEUED'; executionId: string; position: number }
  | { type: 'STARTED'; executionId: string }
  | { type: 'PROGRESS'; executionId: string; step: string; elapsed: number }
  | { type: 'COMPLETED'; executionId: string; result: ActionResult }
  | { type: 'FAILED'; executionId: string; error: string; retriesLeft: number }
  | { type: 'RETRYING'; executionId: string; attempt: number };
```

---

## 8. Relates to Specs

| Spec                                    | Relationship                            |
| --------------------------------------- | --------------------------------------- |
| C787 (Product: Managed Execution)       | Defines WHAT; this defines HOW IT LOOKS |
| C1237 (Product: Validation Criteria)    | UAT scenarios → wireframes here         |
| C1112 (Design: Dashboard Design System) | Color palette, typography, components   |
| C852 (Design: Dashboard SaaS)           | Overall dashboard layout                |
| C862 (Design: REST API)                 | API contract for execution endpoints    |
| C1226 (Frontier: Container ADR)         | Technical architecture                  |

---

## 9. Open Questions

1. **Live streaming logs vs. polling?** — WebSocket preferred for real-time feel
2. **Notification preferences?** — Email/Slack when cycle completes (future)
3. **Execution history retention?** — 30 days for Free, unlimited for Pro?

---

**Sign-Off:**

- [ ] Product review (PM)
- [ ] Engineering feasibility (Lead)
- [ ] Accessibility audit (QA)

---

_Created by 🎨 Design (The Architect) — Cycle 1242_
_Filling Sprint 3 gap: C787 + C1237 + C1112 → C1242 (visual layer)_
