# Memory Heat Dashboard Visualization Specification

> **Issue:** #113 (Cognitive Memory), #120 (Dashboard Visualizations)
> **Author:** 🎨 Design (C1212)
> **Created:** 2026-02-27
> **Status:** Spec Complete — Sprint 4 Front-Load
> **Builds On:** C1206 (Cognitive Memory Architecture), C629 (Memory Heat CLI), C635 (Dashboard UX)
> **Related:** C812 (Component Design System), C1147 (Heat-Weighted Search)

---

## Executive Summary

This specification defines the visual design for memory heat visualization in the ADA Dashboard. While C1206 architects the cognitive memory system and C629 specs the CLI interface, this document provides the detailed **dashboard component design** for making memory temperature visible and interactive.

**Goal:** Let users understand at a glance which memories are hot, warm, and cold — and why.

---

## Design Principles

### 1. Instant Comprehension

Heat state must be visible in < 2 seconds of page load. No need to hover or click to understand the general temperature distribution.

### 2. Progressive Detail

Overview first (distribution), detail on demand (individual items). Don't overwhelm with numbers.

### 3. Consistent Temperature Language

Use the same visual language across all heat representations:

- 🔥 **Hot** (heat > 0.8) — Red/Orange gradient
- 🟠 **Warm** (0.4 ≤ heat ≤ 0.8) — Amber/Yellow gradient
- 🧊 **Cold** (heat < 0.4) — Blue/Cyan gradient

### 4. Actionable Insights

Heat visualization should answer: "What should I pay attention to?" and "What might I be forgetting?"

---

## Component Specifications

### 1. Memory Heat Overview Card

**Location:** Memory View header, also appears in Home dashboard metrics

```
┌────────────────────────────────────────────────────────────────────────────┐
│  🧠 Memory Health                                                     v60   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   Memory Distribution                          Temperature Trend           │
│   ┌───────────────────────────────┐           ┌──────────────────────────┐│
│   │                               │           │  ╭────╮                  ││
│   │  🔥 Hot     ████████▒▒   42%  │           │  │    ╰──╮  ╭──╮        ││
│   │  🟠 Warm    ████████████ 38%  │           │  ╰──────╯  │  ╰──       ││
│   │  🧊 Cold    ████▒▒▒▒▒▒   20%  │           │                          ││
│   │                               │           │  C1200      C1206  C1212 ││
│   └───────────────────────────────┘           └──────────────────────────┘│
│                                                                            │
│   📊 147 entries | Last decay: 2h ago | Next compression: 8 cycles        │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Components:**

| Element           | Purpose                            | Implementation                                           |
| ----------------- | ---------------------------------- | -------------------------------------------------------- |
| Distribution Bars | Show % of memories in each tier    | Horizontal stacked bar, gradient colors                  |
| Temperature Trend | Show heat distribution over cycles | Sparkline (Recharts)                                     |
| Summary Stats     | Quick metrics                      | Entry count, last decay timestamp, compression countdown |
| Version Badge     | Memory bank version                | Links to compression history                             |

**TypeScript Interface:**

```typescript
interface MemoryHeatOverview {
  totalEntries: number;
  distribution: {
    hot: { count: number; percentage: number };
    warm: { count: number; percentage: number };
    cold: { count: number; percentage: number };
  };
  trend: Array<{
    cycle: number;
    hotPercentage: number;
    warmPercentage: number;
    coldPercentage: number;
  }>;
  lastDecayAt: Date;
  cyclesUntilCompression: number;
  bankVersion: number;
}
```

---

### 2. Memory Section Heat Map

**Location:** Memory View main content area

Visualizes heat distribution across memory bank sections with a treemap-style layout.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  📍 Section Heat Map                                      [Grid] [List]    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   ┌─────────────────────────────────┬─────────────────┬──────────────────┐│
│   │                                 │                 │                  ││
│   │    🔥 Active Threads            │  🟠 Role State  │  🟠 Lessons      ││
│   │    heat: 0.92                   │  heat: 0.71     │  heat: 0.68      ││
│   │    12 items                     │  10 items       │  709 items       ││
│   │    ████████████████████████     │  ██████████     │  ██████████      ││
│   │                                 │                 │                  ││
│   ├─────────────────────────────────┼─────────────────┼──────────────────┤│
│   │                                 │                 │                  ││
│   │    🟠 Current Status            │  🧊 Metrics     │  🧊 Archives     ││
│   │    heat: 0.65                   │  heat: 0.35     │  heat: 0.12      ││
│   │    5 items                      │  8 items        │  23 items        ││
│   │    ████████████                 │  ██████         │  ████            ││
│   │                                 │                 │                  ││
│   └─────────────────────────────────┴─────────────────┴──────────────────┘│
│                                                                            │
│   Click section to expand • Hover for details • Right-click for actions   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Visual Design:**

| Tier           | Background                                          | Border    | Glow Effect            |
| -------------- | --------------------------------------------------- | --------- | ---------------------- |
| Hot (>0.8)     | `linear-gradient(135deg, #FF6B35 0%, #F7931A 100%)` | `#FF4500` | Subtle pulse animation |
| Warm (0.4-0.8) | `linear-gradient(135deg, #FFB347 0%, #FFCC00 100%)` | `#FFA500` | None                   |
| Cold (<0.4)    | `linear-gradient(135deg, #4A9FD4 0%, #87CEEB 100%)` | `#4169E1` | None                   |

**Interaction States:**

```css
/* Heat Map Section States */
.heat-section {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.heat-section:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.heat-section:active {
  transform: scale(0.98);
}

.heat-section--hot {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%,
  100% {
    box-shadow: 0 0 8px rgba(255, 107, 53, 0.4);
  }
  50% {
    box-shadow: 0 0 16px rgba(255, 107, 53, 0.6);
  }
}
```

**TypeScript Interface:**

```typescript
interface MemorySectionHeat {
  id: string;
  name: string;
  heat: number;
  tier: 'hot' | 'warm' | 'cold';
  itemCount: number;
  lastReferenced: Date;
  referencesLast10Cycles: number;
  sizeBytes: number;
}

interface SectionHeatMapProps {
  sections: MemorySectionHeat[];
  viewMode: 'grid' | 'list';
  onSectionClick: (section: MemorySectionHeat) => void;
  onSectionHover: (section: MemorySectionHeat | null) => void;
}
```

---

### 3. Memory Item Heat List

**Location:** Expanded section view or search results

Individual memory items with heat scores, decay indicators, and reference counts.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  🔥 Hot Items (12)                          Sort: Heat ▼ | Type | Recent   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 🔥 0.95  **#155** SaaS Container — THE PRIORITY                      │  │
│  │          thread • refs: 47 (last 10 cycles) • last: 2h ago           │  │
│  │          ████████████████████████████████████████████████ 0.95       │  │
│  │          📈 +0.03 this rotation                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 🔥 0.92  **L709** QA FIRST CHECK CI health verification              │  │
│  │          lesson • refs: 3 (last 10 cycles) • last: 4h ago            │  │
│  │          ████████████████████████████████████████████░░░░ 0.92       │  │
│  │          📈 NEW this cycle                                           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 🔥 0.88  **Sprint 3** Mar 1-14 — SaaS Container Complete             │  │
│  │          state • refs: 28 (last 10 cycles) • last: 1h ago            │  │
│  │          ██████████████████████████████████████████░░░░░░ 0.88       │  │
│  │          ── stable                                                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                                            │
│  🧊 Cold Items at Risk (3)                   ⚠️ May be archived soon       │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 🧊 0.18  Sprint 1 retrospective summary                              │  │
│  │          decision • refs: 0 (last 10 cycles) • last: 45 cycles ago   │  │
│  │          ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0.18       │  │
│  │          📉 -0.12 this rotation   [Keep Warm] [Archive]              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Heat Bar Component:**

```typescript
interface HeatBarProps {
  heat: number; // 0.0 to 1.0
  showLabel?: boolean; // Show numeric value
  showTrend?: boolean; // Show delta from last calculation
  trend?: number; // +/- change
  animate?: boolean; // Animate on change
  size?: 'sm' | 'md' | 'lg'; // Bar height
}

// Color stops for gradient
const HEAT_GRADIENT = {
  cold: ['#4A9FD4', '#87CEEB'], // 0.0 - 0.4
  warm: ['#FFB347', '#FFCC00'], // 0.4 - 0.8
  hot: ['#FF6B35', '#F7931A'], // 0.8 - 1.0
};
```

**TypeScript Interface:**

```typescript
interface MemoryItemHeat {
  id: string;
  content: string; // Title or first line
  type: 'lesson' | 'decision' | 'state' | 'thread' | 'metric' | 'blocker';
  heat: number;
  tier: 'hot' | 'warm' | 'cold';
  referenceCount: number;
  referencesLast10Cycles: number;
  lastReferenced: Date;
  createdAt: Date;
  trend: number; // Change since last calculation
  isProtected: boolean; // Innate memory (heat = 1.0 always)
}
```

---

### 4. Heat Tooltip / Popover

**Trigger:** Hover on any heat indicator

Provides detailed breakdown of why an item has its current heat score.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  🔥 Heat Score: 0.92                                                       │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  📊 Score Breakdown                                                        │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │  Base Importance (lesson)    0.80                                  │   │
│  │  × Recency Factor            1.05  (2 cycles since reference)      │   │
│  │  × Reference Boost           1.10  (3 refs in last 10 cycles)      │   │
│  │  × Importance Modifier       1.00  (default)                       │   │
│  │  ────────────────────────────────────────────────────────────────  │   │
│  │  = Calculated Heat           0.924 → 0.92 (clamped)                │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  📈 Trend: +0.04 (warming)                                                │
│  ⏱️  Time to decay: ~14 cycles at current rate                            │
│  🔗 Referenced by: C1209, C1210, C1211                                    │
│                                                                            │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                                            │
│  [View Full Entry]  [View References]  [Pin (Prevent Decay)]              │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**TypeScript Interface:**

```typescript
interface HeatBreakdown {
  baseImportance: number;
  recencyFactor: number;
  cyclesSinceReference: number;
  referenceBoost: number;
  referencesLast10Cycles: number;
  importanceModifier: number;
  calculatedHeat: number;
  clampedHeat: number;
  trend: number;
  estimatedCyclesToDecay: number | null; // null if protected
  referencedByCycles: number[];
}

interface HeatTooltipProps {
  item: MemoryItemHeat;
  breakdown: HeatBreakdown;
  onViewEntry: () => void;
  onViewReferences: () => void;
  onPin: () => void;
}
```

---

### 5. Innate vs Learned Visual Differentiation

Protected (innate) memories have a distinct visual treatment.

**Innate Memory Badge:**

```
┌────────────────────────────────────────────────────────────────────────────┐
│  🛡️ Innate Memory                                                          │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 🛡️ 1.00  RULES.md — Master operational constraints                   │  │
│  │          innate • protected • never decays                           │  │
│  │          ████████████████████████████████████████████████ PROTECTED  │  │
│  │          🔒 Cannot be modified by agent actions                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 🛡️ 1.00  SOUL.md — Agent identity and personality                    │  │
│  │          innate • protected • never decays                           │  │
│  │          ████████████████████████████████████████████████ PROTECTED  │  │
│  │          🔒 Cannot be modified by agent actions                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Visual Distinctions:**

| Aspect         | Learned Memory        | Innate Memory              |
| -------------- | --------------------- | -------------------------- |
| Heat Bar Color | Gradient (tier-based) | Solid gold `#FFD700`       |
| Badge          | Tier emoji (🔥🟠🧊)   | Shield `🛡️`                |
| Border         | Standard              | Dashed gold                |
| Actions        | Archive, Pin, View    | View only                  |
| Tooltip        | Full breakdown        | "Protected — cannot decay" |

---

## Color Palette Extension

Extends C812 (Dashboard Component Design System) with heat-specific tokens:

```css
:root {
  /* Heat Tier Colors */
  --heat-hot-start: #ff6b35;
  --heat-hot-end: #f7931a;
  --heat-hot-border: #ff4500;
  --heat-hot-glow: rgba(255, 107, 53, 0.4);

  --heat-warm-start: #ffb347;
  --heat-warm-end: #ffcc00;
  --heat-warm-border: #ffa500;

  --heat-cold-start: #4a9fd4;
  --heat-cold-end: #87ceeb;
  --heat-cold-border: #4169e1;

  /* Innate Memory */
  --heat-innate: #ffd700;
  --heat-innate-border: #daa520;

  /* Background Tints (for cards/sections) */
  --heat-hot-bg: rgba(255, 107, 53, 0.08);
  --heat-warm-bg: rgba(255, 179, 71, 0.08);
  --heat-cold-bg: rgba(74, 159, 212, 0.08);
  --heat-innate-bg: rgba(255, 215, 0, 0.08);
}
```

---

## Accessibility

### Color Contrast

All heat visualizations include non-color indicators:

| Tier   | Color        | Secondary Indicator                          |
| ------ | ------------ | -------------------------------------------- |
| Hot    | Red/Orange   | 🔥 emoji + "Hot" label + pulse animation     |
| Warm   | Amber/Yellow | 🟠 emoji + "Warm" label                      |
| Cold   | Blue/Cyan    | 🧊 emoji + "Cold" label                      |
| Innate | Gold         | 🛡️ emoji + "Protected" label + dashed border |

### Screen Reader Support

```html
<div
  role="progressbar"
  aria-valuenow="92"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Memory heat score: 92%, tier: hot, warming trend"
>
  <!-- Visual heat bar -->
</div>
```

### Keyboard Navigation

- `Tab` to navigate between memory items
- `Enter` to expand item details
- `Escape` to close tooltips/popovers
- `Arrow keys` within heat map grid

---

## Data Sources

Per C1206 (Cognitive Memory Architecture):

```typescript
// API Endpoints (from C862 Dashboard REST API Spec)
GET /api/repos/:id/memory/heat           // Heat overview + distribution
GET /api/repos/:id/memory/sections       // Section-level heat map
GET /api/repos/:id/memory/items?tier=hot // Filtered item list
GET /api/repos/:id/memory/items/:id      // Individual item with breakdown

// Real-time Updates
// Use SSE or polling per C635 decision
// Heat scores update on each dispatch cycle
```

---

## Implementation Phases

### Phase 1: Core Visualization (Sprint 4 Week 1)

- [ ] Heat Overview Card component
- [ ] Heat Bar component (reusable)
- [ ] Tier badge component
- [ ] Color palette CSS tokens

### Phase 2: Interactive Heat Map (Sprint 4 Week 2)

- [ ] Section Heat Map (treemap layout)
- [ ] Memory Item Heat List
- [ ] Sorting and filtering

### Phase 3: Deep Dive Features (Sprint 4 Week 3+)

- [ ] Heat Tooltip with breakdown
- [ ] Innate memory visual treatment
- [ ] Pin/Archive actions
- [ ] Heat trend sparklines

---

## Acceptance Criteria

**AC-1212-1:** Heat Overview Card displays distribution, trend, and summary stats.
**AC-1212-2:** Section Heat Map uses tier-appropriate colors with hover interactions.
**AC-1212-3:** Memory Item List shows heat bars, trends, and type badges.
**AC-1212-4:** Heat Tooltip explains score breakdown clearly.
**AC-1212-5:** Innate memories have distinct visual treatment (gold, shield, protected label).
**AC-1212-6:** All visualizations meet WCAG AA contrast requirements.
**AC-1212-7:** Keyboard navigation works for all interactive elements.

---

## Open Questions

1. **Real-time updates:** Should heat scores update live (WebSocket) or on page refresh?
   - **Recommendation:** Refresh on dispatch cycle completion event (SSE)

2. **Manual heat adjustments:** Can users "pin" items to prevent decay?
   - **Recommendation:** Yes, add pin action for critical learned memories

3. **Archive visualization:** Show archived (cold storage) items in separate view?
   - **Recommendation:** Yes, with "Restore" action to bring back to learned tier

---

## References

- C1206: Cognitive Memory Architecture Specification (Frontier)
- C629: Memory Heat CLI Specification (Design)
- C635: Dashboard UX Specification (Design)
- C812: Dashboard Component Design System (Design)
- C1147: Heat-Weighted Search Specification (Product)
- #113: Cognitive Memory Issue
- #120: Dashboard Visualizations Issue

---

_🎨 The Architect — Cycle 1212_
_Sprint 4 front-loaded per L706_
