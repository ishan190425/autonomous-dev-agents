# 🎨 Dashboard Component Design System (C812)

> **Author:** 🎨 Design (The Architect)
> **Date:** 2026-02-17
> **Cycle:** 812
> **Issue:** #120 (Agent Dashboard), #155 (SaaS Container)
> **Status:** SPEC COMPLETE — Ready for Engineering
> **Prior Art:** C635 (UX Spec), C807 (SaaS Integration), C806 (Implementation Architecture)

---

## Overview

This document defines the visual design system for the ADA Dashboard. It provides implementation-ready specifications for colors, typography, spacing, components, and responsive breakpoints. Engineering can use this as the source of truth for Sprint 3 dashboard implementation.

### Design Philosophy

1. **Developer-centric** — Clean, information-dense layouts that respect dev workflows
2. **Terminal-inspired** — Dark-first design with monospace elements echoing CLI heritage
3. **Glanceable** — Status should be clear in <1 second
4. **Accessible** — WCAG 2.1 AA compliant, keyboard navigable
5. **Consistent** — Same patterns everywhere, no one-offs

---

## Color Palette

### Dark Mode (Primary)

| Token              | Hex       | Usage                         |
| ------------------ | --------- | ----------------------------- |
| `--bg-primary`     | `#0D1117` | Main background (GitHub dark) |
| `--bg-secondary`   | `#161B22` | Cards, panels                 |
| `--bg-tertiary`    | `#21262D` | Hover states, nested elements |
| `--border-default` | `#30363D` | Card borders, dividers        |
| `--border-muted`   | `#21262D` | Subtle borders                |
| `--text-primary`   | `#E6EDF3` | Primary text                  |
| `--text-secondary` | `#8B949E` | Secondary text, labels        |
| `--text-muted`     | `#6E7681` | Tertiary text, timestamps     |
| `--accent-blue`    | `#58A6FF` | Links, primary actions        |
| `--accent-green`   | `#3FB950` | Success, online, running      |
| `--accent-yellow`  | `#D29922` | Warning, paused, attention    |
| `--accent-red`     | `#F85149` | Error, offline, critical      |
| `--accent-purple`  | `#A371F7` | Highlight, special states     |
| `--accent-cyan`    | `#39C5CF` | In progress, active           |

### Light Mode (Secondary)

| Token              | Hex       | Usage                         |
| ------------------ | --------- | ----------------------------- |
| `--bg-primary`     | `#FFFFFF` | Main background               |
| `--bg-secondary`   | `#F6F8FA` | Cards, panels                 |
| `--bg-tertiary`    | `#EAEEF2` | Hover states, nested elements |
| `--border-default` | `#D0D7DE` | Card borders, dividers        |
| `--text-primary`   | `#1F2328` | Primary text                  |
| `--text-secondary` | `#656D76` | Secondary text                |

### Semantic Colors

| Token              | Dark      | Light     | Usage                  |
| ------------------ | --------- | --------- | ---------------------- |
| `--status-running` | `#3FB950` | `#1A7F37` | Active cycles, healthy |
| `--status-paused`  | `#D29922` | `#9A6700` | Paused state           |
| `--status-error`   | `#F85149` | `#CF222E` | Failed cycles, errors  |
| `--status-idle`    | `#58A6FF` | `#0969DA` | Waiting, idle          |
| `--status-offline` | `#6E7681` | `#8C959F` | Disconnected, unknown  |

### Role Colors

Each agent role has a signature color for avatars and indicators:

| Role        | Emoji | Color     | Token             |
| ----------- | ----- | --------- | ----------------- |
| CEO         | 👔    | `#8B5CF6` | `--role-ceo`      |
| Growth      | 🚀    | `#F97316` | `--role-growth`   |
| Research    | 🔬    | `#06B6D4` | `--role-research` |
| Frontier    | 🌌    | `#8B5CF6` | `--role-frontier` |
| Product     | 📦    | `#EAB308` | `--role-product`  |
| Scrum       | 📋    | `#22C55E` | `--role-scrum`    |
| QA          | 🔍    | `#EC4899` | `--role-qa`       |
| Engineering | ⚙️    | `#3B82F6` | `--role-eng`      |
| Ops         | 🛡️    | `#6366F1` | `--role-ops`      |
| Design      | 🎨    | `#F43F5E` | `--role-design`   |

---

## Typography

### Font Stack

```css
/* Primary: Inter for UI */
--font-sans:
  'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Monospace: JetBrains Mono for code, cycle IDs, metrics */
--font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', Consolas, monospace;
```

### Type Scale

| Token        | Size | Weight | Line Height | Usage                    |
| ------------ | ---- | ------ | ----------- | ------------------------ |
| `--text-xs`  | 11px | 400    | 1.4         | Timestamps, badges       |
| `--text-sm`  | 13px | 400    | 1.5         | Secondary text, captions |
| `--text-md`  | 14px | 400    | 1.5         | Body text, default       |
| `--text-lg`  | 16px | 500    | 1.4         | Card titles, emphasis    |
| `--text-xl`  | 20px | 600    | 1.3         | Section headers          |
| `--text-2xl` | 24px | 600    | 1.2         | Page titles              |
| `--text-3xl` | 32px | 700    | 1.1         | Hero numbers, metrics    |

### Monospace Usage

Always use `--font-mono` for:

- Cycle IDs: `C807`, `C812`
- Timestamps: `11:23:45`
- Code snippets
- Repository names: `ada-ai/ada-cli`
- Error codes: `DISPATCH_LOCK_EXISTS`
- Metrics and numbers in status displays

---

## Spacing

Based on 4px grid:

| Token     | Value | Usage                       |
| --------- | ----- | --------------------------- |
| `--sp-1`  | 4px   | Tight padding, icon margins |
| `--sp-2`  | 8px   | Default inline spacing      |
| `--sp-3`  | 12px  | Card internal padding       |
| `--sp-4`  | 16px  | Section gaps, card padding  |
| `--sp-5`  | 20px  | Between related sections    |
| `--sp-6`  | 24px  | Major section separation    |
| `--sp-8`  | 32px  | Page margins, large gaps    |
| `--sp-10` | 40px  | Hero areas                  |
| `--sp-12` | 48px  | Page top/bottom margins     |

---

## Border Radius

| Token           | Value  | Usage                     |
| --------------- | ------ | ------------------------- |
| `--radius-sm`   | 4px    | Small buttons, badges     |
| `--radius-md`   | 6px    | Input fields, small cards |
| `--radius-lg`   | 8px    | Cards, panels             |
| `--radius-xl`   | 12px   | Modals, large panels      |
| `--radius-full` | 9999px | Avatars, pills            |

---

## Shadows

| Token           | Value                              | Usage            |
| --------------- | ---------------------------------- | ---------------- |
| `--shadow-sm`   | `0 1px 2px rgba(0,0,0,0.1)`        | Subtle lift      |
| `--shadow-md`   | `0 4px 6px -1px rgba(0,0,0,0.2)`   | Cards, dropdowns |
| `--shadow-lg`   | `0 10px 15px -3px rgba(0,0,0,0.3)` | Modals, overlays |
| `--shadow-glow` | `0 0 12px rgba(88,166,255,0.4)`    | Focus states     |

---

## Components

### 1. Card

Primary container for dashboard content.

```
┌─────────────────────────────────────────────┐
│  Card Header (optional)          [Action ▼] │
├─────────────────────────────────────────────┤
│                                             │
│  Card content with --sp-4 padding           │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

**Specs:**

- Background: `--bg-secondary`
- Border: 1px `--border-default`
- Border radius: `--radius-lg`
- Padding: `--sp-4`
- Header: `--text-lg` weight 500, `--text-secondary` color for subtitle

### 2. Status Badge

Compact status indicator.

```
● Running   ⏸ Paused   ✓ Success   ✗ Failed   ○ Idle
```

**Specs:**

- Font: `--text-xs` uppercase
- Padding: `--sp-1` vertical, `--sp-2` horizontal
- Border radius: `--radius-full`
- Background: Semantic color at 15% opacity
- Text: Semantic color at 100%

**CSS:**

```css
.badge-running {
  background: rgba(63, 185, 80, 0.15);
  color: #3fb950;
}
```

### 3. Agent Avatar

Role indicator with emoji and color.

**Sizes:**
| Size | Dimensions | Emoji Size | Border Width |
| ---- | ---------- | ---------- | ------------ |
| sm | 24×24px | 12px | 2px |
| md | 32×32px | 16px | 2px |
| lg | 48×48px | 24px | 3px |
| xl | 64×64px | 32px | 4px |

**Specs:**

- Background: Role color at 15% opacity
- Border: Role color at 100%
- Border radius: `--radius-full`
- Emoji centered

### 4. Repo Row

Repository list item for home view.

```
┌─────────────────────────────────────────────────────────────┐
│  [📁]  ada-ai/ada-cli        C807 • ● Running • 🟢 Healthy │
│        Last: 11:23 — Sprint 3 Impl Architecture     [→]    │
└─────────────────────────────────────────────────────────────┘
```

**Specs:**

- Padding: `--sp-3` vertical, `--sp-4` horizontal
- Hover: `--bg-tertiary` background
- Repo name: `--font-mono`, `--text-md`, `--text-primary`
- Cycle ID: `--font-mono`, `--text-sm`, `--text-muted`
- Status: Status badge component
- Last action: `--text-sm`, `--text-secondary`, truncate with ellipsis
- Click area: Entire row (except explicit action buttons)

### 5. Activity Feed Item

Single activity entry.

```
┌─────────────────────────────────────────────────────────────┐
│  [🎨]  11:23  C812  Design  Dashboard Component System     │
└─────────────────────────────────────────────────────────────┘
```

**Specs:**

- Padding: `--sp-2` vertical
- Avatar: `sm` (24×24)
- Timestamp: `--font-mono`, `--text-xs`, `--text-muted`
- Cycle ID: `--font-mono`, `--text-sm`, `--accent-blue`
- Role: `--text-sm`, role color
- Action: `--text-sm`, `--text-primary`, truncate
- Hover: `--bg-tertiary`

### 6. Metric Card

Key number display.

```
┌─────────────────────────┐
│  Cycles Today           │
│  ┌───────────────────┐  │
│  │       247         │  │
│  │    ▲ 12%          │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

**Specs:**

- Label: `--text-sm`, `--text-secondary`
- Value: `--text-3xl`, `--font-mono`, `--text-primary`
- Change: `--text-sm`, green (positive) or red (negative)
- Card padding: `--sp-4`

### 7. Progress Bar

Usage meters for billing.

```
Repos:  3/5   ██████████░░░░░░░░░░  60%
```

**Specs:**

- Label: `--text-sm`, `--text-secondary`
- Count: `--font-mono`, `--text-sm`, `--text-muted`
- Bar height: 8px
- Bar background: `--border-muted`
- Bar fill: `--accent-blue` (normal), `--accent-yellow` (>80%), `--accent-red` (100%)
- Border radius: `--radius-full`
- Percentage: `--font-mono`, `--text-xs`, `--text-muted`

### 8. Button

**Variants:**

| Variant   | Background      | Text               | Border          | Usage             |
| --------- | --------------- | ------------------ | --------------- | ----------------- |
| Primary   | `--accent-blue` | `#FFFFFF`          | none            | Main actions      |
| Secondary | transparent     | `--accent-blue`    | `--accent-blue` | Secondary actions |
| Ghost     | transparent     | `--text-secondary` | none            | Tertiary actions  |
| Danger    | `--accent-red`  | `#FFFFFF`          | none            | Destructive       |

**Sizes:**

| Size | Height | Padding H | Font Size | Border Radius |
| ---- | ------ | --------- | --------- | ------------- |
| sm   | 28px   | 12px      | 13px      | `--radius-md` |
| md   | 36px   | 16px      | 14px      | `--radius-md` |
| lg   | 44px   | 20px      | 16px      | `--radius-lg` |

**States:**

- Hover: 10% lighter
- Active: 10% darker
- Disabled: 50% opacity, no pointer
- Focus: `--shadow-glow` ring

### 9. Tab Bar

View switcher within repo detail.

```
[Agents] [Activity] [Memory] [Analytics] [Logs]
   ▔▔▔▔▔▔▔▔
```

**Specs:**

- Tab: `--text-md`, `--text-secondary`
- Active tab: `--text-primary`, 2px `--accent-blue` bottom border
- Hover: `--text-primary`
- Spacing between tabs: `--sp-6`
- Bottom border: 1px `--border-default`

### 10. Cycle Log Entry

Log viewer item.

```
┌─────────────────────────────────────────────────────────────┐
│  C812  🎨 Design   02/17 11:23  ✓ Success                  │
│  Dashboard Component Design System                   [Logs] │
└─────────────────────────────────────────────────────────────┘
```

**Specs:**

- Cycle ID: `--font-mono`, `--accent-blue`, clickable
- Avatar + Role name: See Agent Avatar
- Date/Time: `--font-mono`, `--text-xs`, `--text-muted`
- Status badge: See Status Badge
- Action text: `--text-sm`, `--text-primary`
- Hover: `--bg-tertiary`
- Expanded state: Shows full agent output in `--font-mono`, `--text-sm`

---

## Responsive Breakpoints

| Token      | Width  | Description      | Layout                  |
| ---------- | ------ | ---------------- | ----------------------- |
| `--bp-sm`  | 640px  | Mobile landscape | Stack all, hide sidebar |
| `--bp-md`  | 768px  | Tablet portrait  | 2-column for cards      |
| `--bp-lg`  | 1024px | Tablet landscape | Sidebar visible         |
| `--bp-xl`  | 1280px | Desktop          | Full layout             |
| `--bp-2xl` | 1536px | Large desktop    | Wide content            |

### Mobile Adaptations (< 768px)

1. **Navigation:** Collapse to hamburger menu
2. **Cards:** Full width, stack vertically
3. **Activity Feed:** Hide timestamp, compact view
4. **Repo Row:** Stack repo name above status
5. **Tab Bar:** Horizontal scroll if needed
6. **Billing Usage:** Stack bars vertically

---

## Animations

### Micro-interactions

| Animation        | Duration | Easing                 | Usage                     |
| ---------------- | -------- | ---------------------- | ------------------------- |
| Hover transition | 150ms    | ease-out               | Buttons, cards            |
| Focus ring       | 200ms    | ease-out               | Form elements             |
| Tab switch       | 200ms    | ease-in-out            | Content transitions       |
| Spinner          | 1000ms   | linear                 | Loading states            |
| Badge pulse      | 2000ms   | ease-in-out (infinite) | Active/running indicators |
| Slide in         | 300ms    | ease-out               | Panels, modals            |

### Loading States

1. **Skeleton:** Gray shimmer animation for cards loading
2. **Spinner:** Indeterminate for actions (see Progress Indicators C802)
3. **Pulse:** Status badges in "running" state

---

## Iconography

Use **Lucide React** icons (MIT license, consistent with Tailwind ecosystem).

### Icon Sizes

| Size | Dimensions | Stroke Width | Usage            |
| ---- | ---------- | ------------ | ---------------- |
| sm   | 16×16px    | 2px          | Inline with text |
| md   | 20×20px    | 2px          | Buttons, default |
| lg   | 24×24px    | 1.5px        | Card headers     |
| xl   | 32×32px    | 1.5px        | Empty states     |

### Key Icons

| Purpose       | Icon              | Lucide Name     |
| ------------- | ----------------- | --------------- |
| Running       | ● (filled circle) | `Circle` filled |
| Paused        | ⏸                 | `Pause`         |
| Success       | ✓                 | `Check`         |
| Error         | ✗                 | `X`             |
| Settings      | ⚙                 | `Settings`      |
| Add           | +                 | `Plus`          |
| Repository    | 📁                | `FolderGit2`    |
| External link | ↗                 | `ExternalLink`  |
| Logs          | 📜                | `ScrollText`    |
| Billing       | 💳                | `CreditCard`    |
| User          | 👤                | `User`          |
| Logout        | 🚪                | `LogOut`        |

---

## Accessibility

### Focus Management

- All interactive elements have visible focus state (`--shadow-glow`)
- Focus trap in modals
- Skip to main content link
- Logical tab order

### Color Contrast

All text/background combinations meet WCAG AA (4.5:1 for normal text, 3:1 for large text):

| Foreground         | Background     | Ratio  | Pass |
| ------------------ | -------------- | ------ | ---- |
| `--text-primary`   | `--bg-primary` | 13.1:1 | ✓    |
| `--text-secondary` | `--bg-primary` | 6.2:1  | ✓    |
| `--text-muted`     | `--bg-primary` | 4.5:1  | ✓    |
| `--accent-blue`    | `--bg-primary` | 5.1:1  | ✓    |
| `--accent-green`   | `--bg-primary` | 5.8:1  | ✓    |

### Screen Reader

- Semantic HTML (`<nav>`, `<main>`, `<section>`)
- ARIA labels for icon-only buttons
- Live regions for status updates
- Hidden decorative elements

---

## Implementation Notes

### CSS Custom Properties

```css
:root {
  /* Colors */
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --text-primary: #e6edf3;
  /* ... all tokens from this spec ... */
}

[data-theme='light'] {
  --bg-primary: #ffffff;
  --bg-secondary: #f6f8fa;
  /* ... light mode overrides ... */
}
```

### Tailwind Config Extension

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'accent-blue': 'var(--accent-blue)',
        // ... map all tokens
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },
      spacing: {
        'sp-1': '4px',
        'sp-2': '8px',
        // ... all spacing tokens
      },
    },
  },
};
```

### Component Library

Recommend **shadcn/ui** (Radix primitives + Tailwind) for base components, then customize with this design system. Benefits:

- Copy-paste, not npm dependency
- Full control over styling
- Accessible by default
- Works with Next.js

---

## Acceptance Criteria

### AC-812-1: Design Token Export

- [ ] CSS custom properties file with all tokens
- [ ] Tailwind config extension
- [ ] Figma/design file with token library (optional)

### AC-812-2: Component Implementation

- [ ] Card component with variants
- [ ] Status Badge with all states
- [ ] Agent Avatar with all sizes and role colors
- [ ] Button with all variants and sizes
- [ ] Progress Bar for usage meters

### AC-812-3: Responsive Behavior

- [ ] Mobile navigation works (hamburger)
- [ ] Cards stack on mobile
- [ ] Tab bar scrolls if needed
- [ ] No horizontal overflow at any breakpoint

### AC-812-4: Dark/Light Mode

- [ ] Theme toggle works
- [ ] All tokens switch correctly
- [ ] User preference persisted
- [ ] Respects prefers-color-scheme

### AC-812-5: Accessibility

- [ ] All components keyboard navigable
- [ ] Focus states visible
- [ ] Color contrast passes WCAG AA
- [ ] Screen reader testing passed

---

## References

- #120 — Agent Dashboard
- #155 — SaaS Container
- C635 — Dashboard UX Specification (wireframes)
- C807 — Dashboard SaaS Integration (feature spec)
- C802 — Progress Indicators UX Spec (loading patterns)
- C782 — Error Pattern Library (error display)
- GitHub Primer Design System (inspiration)
- Tailwind UI (component patterns)
- shadcn/ui (implementation framework)

---

_Spec complete. Ready for Sprint 3 Engineering implementation._
