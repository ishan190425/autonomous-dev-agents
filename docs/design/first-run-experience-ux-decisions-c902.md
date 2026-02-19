# 🎨 First Run Experience — UX Design Decisions (C902)

> Design decisions and interaction specifications for the Beta First Run Experience
> **Author:** 🎨 The Architect (API & System Designer)
> **Cycle:** 902
> **Date:** 2026-02-19
> **Status:** Final — Ready for Implementation
> **Responds to:** Product Spec C897 (Open Questions for Design)

---

## Context

Product (C897) created a comprehensive First Run Experience specification with ASCII wireframes and user flows. The spec concluded with four open questions for Design. This document provides definitive UX decisions for each, plus additional interaction specifications for implementation.

---

## Q1: Real-Time Logs vs Progress Indicators

**Product's Question:** Should we show cycle logs in real-time or just progress indicators?

### Decision: Hybrid Approach — "Progressive Disclosure Logs"

Show **both**, with logs behind progressive disclosure:

```
┌─────────────────────────────────────────────────────────────────────┐
│   🎬 Your First Dispatch Cycle                                      │
│                                                                      │
│   ████████████████████████░░░░░░░░ 75%                              │
│                                                                      │
│   ✓ CEO loaded context                                               │
│   ✓ Analyzed repository structure                                    │
│   ↻ Writing initial status report...                                │
│                                                                      │
│   ┌─────────────────────────────────────────┐                       │
│   │  ▶ Show detailed output                 │                       │
│   └─────────────────────────────────────────┘                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**When "Show detailed output" is expanded:**

```
┌─────────────────────────────────────────────────────────────────────┐
│   🎬 Your First Dispatch Cycle                                      │
│                                                                      │
│   ████████████████████████░░░░░░░░ 75%                              │
│                                                                      │
│   ✓ CEO loaded context                                               │
│   ✓ Analyzed repository structure                                    │
│   ↻ Writing initial status report...                                │
│                                                                      │
│   ┌─────────────────────────────────────────┐                       │
│   │  ▼ Hide detailed output                 │                       │
│   └─────────────────────────────────────────┘                       │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ $ ada dispatch start                                         │   │
│   │ 🚀 Cycle 1 Started                                           │   │
│   │   Role: 👔 CEO                                               │   │
│   │   Playbook: agents/playbooks/ceo.md                          │   │
│   │                                                              │   │
│   │ 📋 Reading DISPATCH.md...                                    │   │
│   │ 📚 Loading memory bank...                                    │   │
│   │ ✓ Detected: TypeScript project with 12 files                │   │
│   │ 📝 Writing initial assessment...                             │   │
│   │ _                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Rationale

1. **Default to simplicity:** First-time users don't need raw CLI output — they need reassurance that "something is happening" and clear status.

2. **Enable curiosity:** Power users and developers WANT to see the logs. Making them one click away satisfies both audiences.

3. **Reduces anxiety:** A spinning terminal with scrolling text can feel intimidating. The summary view feels controlled and friendly.

4. **Matches CLI behavior:** The `--verbose` flag pattern we designed in C892. Web UI mirrors: compact default, verbose on demand.

### Interaction Details

| Element           | Behavior                                        |
| ----------------- | ----------------------------------------------- |
| Expand toggle     | Accordian-style, smooth 200ms animation         |
| Log area          | Fixed max-height (300px), internal scroll       |
| Auto-scroll       | Logs auto-scroll to bottom while expanded       |
| Copy button       | Appears on hover in expanded log area           |
| Terminal font     | Monospace (JetBrains Mono, fallback: monospace) |
| Line highlighting | New lines fade in with subtle 150ms transition  |

---

## Q2: Onboarding Checklist Prominence After Day 1

**Product's Question:** How prominent should the onboarding checklist be after Day 1?

### Decision: Progressive De-emphasis — "Contextual Fading"

| User State              | Checklist Behavior                                    |
| ----------------------- | ----------------------------------------------------- |
| Day 1, <100% complete   | Full prominence, top of dashboard                     |
| Day 1, 100% complete    | Collapsed with "🎉 Complete!" badge, top of dashboard |
| Day 2-7, <100% complete | Collapsed by default, expandable, below quick stats   |
| Day 2-7, 100% complete  | Single dismissible "You completed onboarding!" banner |
| Day 8+ OR dismissed     | Gone — show "Quick Start" link in help menu instead   |

### Visual States

**Day 1, In Progress (Full Prominence):**

```
┌────────────────────────────────────────────────────────────────┐
│  🎯 Getting Started                        Progress: 3/5 ████░ │
│                                                                 │
│  ✓ Create your first agent team                                │
│  ✓ Run your first cycle                                        │
│  ✓ Review agents' first commits on GitHub                      │
│  ○ Run 10 cycles                                               │
│  ○ Customize a playbook                                        │
│                                                                 │
│  [Dismiss — I know what I'm doing]                             │
└────────────────────────────────────────────────────────────────┘
```

**Day 2+, In Progress (Collapsed):**

```
┌────────────────────────────────────────────────────────────────┐
│  🎯 Getting Started — 3/5 complete                    [Expand] │
└────────────────────────────────────────────────────────────────┘
```

**Day 8+ / Dismissed (Help Menu):**

```
[?] Help
├── Documentation
├── Quick Start Guide  ← Checklist lives here now
├── Support
└── Feedback
```

### Rationale

1. **Respect user progression:** Once they've "got it," the checklist is no longer helpful — it's clutter.

2. **Don't force completion:** Some users never want to "customize a playbook" and that's fine. Don't nag.

3. **Preserve discoverability:** Moving to help menu (not deleting) means new features can be found later.

4. **Match SaaS patterns:** Notion, Linear, and similar tools fade onboarding after first week.

---

## Q3: Notification When First Cycle Completes

**Product's Question:** Should we send a notification/email when first cycle completes (if they navigated away)?

### Decision: Yes — Single Welcome-Back Email + Browser Notification

**Trigger:** User leaves the "Watch First Cycle" screen AND cycle completes within 15 minutes.

### Email (if user left the app entirely):

```
Subject: 🎉 Your first ADA cycle completed — @username/my-side-project

─────────────────────────────────────────────────────────

Hi [Name],

Good news! Your first dispatch cycle just completed on my-side-project.

👔 CEO analyzed your repository and created an initial assessment.

📄 View the commit on GitHub →
🚀 Return to your dashboard →

What happened:
• Created agents/memory/bank.md with project context
• Identified 3 potential areas for improvement
• Set up rotation for your 3-role team

Next: Run Cycle 2 to see Engineering act.

—
The ADA Team

💡 Tip: Set up scheduled cycles so your agents work while you sleep.

─────────────────────────────────────────────────────────
```

### Browser Notification (if user is elsewhere in app/browser):

```
┌──────────────────────────────────────────────────────────────┐
│ 🤖 ADA                                          ⋮  ✕        │
│                                                              │
│ 🎉 First cycle complete!                                     │
│ CEO finished analyzing my-side-project                       │
│                                                              │
│ [View Results]                                               │
└──────────────────────────────────────────────────────────────┘
```

### Constraints

| Scenario                               | Action                                               |
| -------------------------------------- | ---------------------------------------------------- |
| User watching when complete            | No notification — they already see it                |
| User navigates away, cycle <15min      | Email + browser notification on complete             |
| User navigates away, cycle >15min      | Email only (avoid spammy delayed push)               |
| First cycle only                       | Yes — subsequent cycles don't send email (too noisy) |
| Browser notification permission denied | Email only                                           |

### Rationale

1. **First cycle is special:** User needs to see the result to understand ADA's value. Don't let them forget.

2. **One email is helpful, many is spam:** Only the first cycle triggers email. Subsequent cycles rely on dashboard notifications.

3. **Respect attention:** Browser notifications only if user still has tab open somewhere. Email for truly gone users.

4. **Drive return visit:** The email's job is to get them back to the dashboard within 24 hours — key retention metric.

---

## Q4: Where "Skip" Takes Users

**Product's Question:** Should "Skip" take them to empty dashboard or a different getting-started view?

### Decision: "Explorer Mode" Dashboard — Not Empty, Not Full

**Skip does NOT mean "I don't want help" — it means "I want to look around first."**

### Explorer Mode Dashboard:

```
┌─────────────────────────────────────────────────────────────────────┐
│  🤖 ADA Dashboard                               @username  [Logout] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  👋 Welcome! You're exploring ADA.                             │ │
│  │                                                                 │ │
│  │  You haven't set up an agent team yet.                         │ │
│  │  Browse around, then come back here when you're ready.         │ │
│  │                                                                 │ │
│  │  ┌─────────────────────────────────┐                           │ │
│  │  │  🚀 Set Up My First Team        │                           │ │
│  │  └─────────────────────────────────┘                           │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │ 📚 View Docs    │ │ 🎭 Browse Roles │ │ 📦 Sample Repos │       │
│  │                 │ │                 │ │                 │       │
│  │ Read how ADA    │ │ See what each   │ │ Explore example │       │
│  │ agent teams     │ │ role does and   │ │ setups from     │       │
│  │ work.           │ │ how they        │ │ real projects.  │       │
│  │                 │ │ collaborate.    │ │                 │       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  💬 "I skipped onboarding and browsed the docs for 5 minutes.  │ │
│  │      When I came back and set up my team, I knew exactly       │ │
│  │      which roles I wanted."  — @early_adopter                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Elements

1. **Friendly, not empty:** The page acknowledges they're exploring and provides value.

2. **One obvious CTA:** "Set Up My First Team" is always prominent — easy to get back on track.

3. **Discovery cards:** Docs, Roles overview, Sample repos give them things to explore.

4. **Social proof:** A testimonial from an explorer who converted (can be placeholder, then real data).

5. **Persistent nudge:** The setup CTA remains visible on all pages in explorer mode (as a floating button or header banner).

### Explorer Mode Persistence

| Action                             | Result                                                             |
| ---------------------------------- | ------------------------------------------------------------------ |
| User clicks "Skip"                 | Enters explorer mode, dashboard shows explorer view                |
| User browses Docs, Roles, etc.     | Explorer mode continues, setup CTA persists                        |
| User clicks "Set Up My First Team" | Exits explorer mode, enters normal first-run flow (Step 2 onwards) |
| User creates a team via any path   | Explorer mode ends, normal dashboard                               |

### Rationale

1. **"Skip" users are NOT rejecting onboarding — they're curious.** Give them things to discover.

2. **Empty state is hostile.** An empty dashboard feels like a broken product.

3. **Keep conversion path clear.** Explorer mode is a detour, not a dead end.

4. **Match mental model:** "I'll look around, then come back" is honored — they CAN come back easily.

---

## Additional Interaction Specifications

### Animation & Motion

| Element                   | Animation                 | Duration   | Easing        |
| ------------------------- | ------------------------- | ---------- | ------------- |
| Progress bar              | Linear fill               | Continuous | linear        |
| Step completion checkmark | Scale pop-in              | 300ms      | ease-out-back |
| Accordion expand/collapse | Height slide              | 200ms      | ease-in-out   |
| Page transitions          | Fade + slight Y translate | 250ms      | ease-out      |
| Button hover              | Background shift          | 150ms      | ease          |
| Error shake               | Horizontal shake          | 400ms      | ease-in-out   |

### Responsive Breakpoints

| Breakpoint          | Layout Adjustment                                                   |
| ------------------- | ------------------------------------------------------------------- |
| ≥1200px (desktop)   | Full 3-column layout, all elements visible                          |
| 768-1199px (tablet) | 2-column layout, checklist collapses earlier                        |
| <768px (mobile)     | Single column, wizard steps become vertical, accordion heavily used |

### Keyboard Navigation

| Key         | Action                                |
| ----------- | ------------------------------------- |
| Tab         | Navigate between interactive elements |
| Enter/Space | Activate buttons, toggle accordions   |
| Escape      | Close expanded panels, dismiss modals |
| Arrow keys  | Navigate within team size radio group |

### Accessibility

| Requirement                 | Implementation                                                     |
| --------------------------- | ------------------------------------------------------------------ |
| Screen reader announcements | `aria-live="polite"` for progress updates                          |
| Focus management            | Auto-focus first interactive element on each step                  |
| Color independence          | Status indicators use icons + color, not color alone               |
| Motion reduction            | Respect `prefers-reduced-motion`, disable non-essential animations |
| Minimum contrast            | 4.5:1 for text, 3:1 for UI components                              |

---

## Design System Tokens (First Run Experience)

These tokens extend the existing design system for first-run-specific elements:

```css
/* Progress */
--first-run-progress-bg: var(--gray-200);
--first-run-progress-fill: var(--brand-500);
--first-run-progress-height: 8px;
--first-run-progress-radius: 4px;

/* Steps */
--first-run-step-complete: var(--green-500);
--first-run-step-active: var(--brand-500);
--first-run-step-pending: var(--gray-400);

/* Cards */
--first-run-card-bg: var(--white);
--first-run-card-border: var(--gray-200);
--first-run-card-radius: 12px;
--first-run-card-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

/* Terminal */
--first-run-terminal-bg: var(--gray-900);
--first-run-terminal-text: var(--gray-100);
--first-run-terminal-font: 'JetBrains Mono', monospace;

/* Welcome */
--first-run-welcome-gradient: linear-gradient(
  135deg,
  var(--brand-50),
  var(--brand-100)
);
```

---

## Implementation Notes for Engineering

### Required Components

1. **ProgressBar** — Determinate progress bar with percentage label
2. **StepIndicator** — Checkmark/spinner/empty circle with label
3. **ExpandableTerminal** — Accordion with terminal-style log viewer
4. **OnboardingCard** — Card component with header, progress, and dismissible state
5. **ExplorerDashboard** — Special dashboard layout for "skip" users

### API Integration

Per C897's proposed endpoints:

```typescript
// Add SSE for real-time cycle logs
GET /api/cycles/:id/stream
Response: Server-Sent Events with { type: 'log' | 'progress' | 'complete', data: {...} }

// Track onboarding state
GET /api/users/onboarding
Response: { completedSteps: string[], explorerMode: boolean, dismissedAt?: string }
```

### Analytics Events (per C897 + these decisions)

- `first_run.logs_expanded` — User expanded detailed output
- `first_run.logs_collapsed` — User collapsed detailed output
- `first_run.checklist_dismissed` — User dismissed checklist
- `first_run.checklist_completed` — All 5 items done
- `first_run.skip_clicked` — User chose explorer mode
- `first_run.explorer_setup_clicked` — Explorer user started setup
- `first_run.cycle_notification_sent` — Email/push sent for completed cycle
- `first_run.notification_return` — User returned via notification CTA

---

## Related Documents

- `docs/product/beta-first-run-experience-spec-c897.md` — Product specification (this responds to)
- `docs/design/auth-flow-ux-spec-c822.md` — Auth flow precedes first run
- `docs/design/dashboard-saas-integration-spec-c852.md` — Dashboard design system
- `docs/design/observability-output-ux-spec-c892.md` — CLI output patterns (influences log display)

---

_🎨 The Architect (API & System Designer) — Cycle 902_
_Answering Product's open questions with definitive UX decisions._
