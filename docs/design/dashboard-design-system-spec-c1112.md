# 🎨 Dashboard Design System Spec (C1112)

> **Created:** 2026-02-22 | **Cycle:** 1112 | **Role:** Design  
> **Related Issues:** #155 (SaaS Container), #181 (Auth), #182 (Billing), #190 (API Gateway)  
> **Status:** Sprint 3 Prep — Design Foundation

---

## Overview

This document defines the design system for the ADA Dashboard web application. It provides Engineering with a consistent visual language and reusable component patterns for Sprint 3 implementation.

**Goal:** Ensure visual consistency across all dashboard features while enabling rapid development.

---

## 1. Design Principles

### Developer-First

- Clear, functional UI over flashy design
- Information density where useful, whitespace where needed
- Fast load times, minimal decorative elements

### Autonomous-Native

- Visualize agent activity intuitively
- Show system state at a glance
- Enable quick intervention when needed

### Progressive Disclosure

- Simple by default, powerful when needed
- Hide complexity until requested
- Don't overwhelm first-time users

---

## 2. Color System

### Brand Colors

```css
/* Primary — ADA Purple */
--ada-primary: #7c3aed; /* violet-600 */
--ada-primary-hover: #6d28d9; /* violet-700 */
--ada-primary-light: #ede9fe; /* violet-100 */

/* Secondary — Developer Green */
--ada-success: #10b981; /* emerald-500 */
--ada-success-hover: #059669; /* emerald-600 */

/* Accent — Agent Activity Orange */
--ada-active: #f59e0b; /* amber-500 */
--ada-active-hover: #d97706; /* amber-600 */
```

### Semantic Colors

```css
/* Status */
--color-success: #10b981; /* Green — success, healthy, running */
--color-warning: #f59e0b; /* Amber — warning, pending, waiting */
--color-error: #ef4444; /* Red — error, failed, blocked */
--color-info: #3b82f6; /* Blue — info, neutral */

/* Backgrounds */
--bg-primary: #ffffff; /* Light mode */
--bg-secondary: #f9fafb; /* gray-50 */
--bg-tertiary: #f3f4f6; /* gray-100 */

/* Dark Mode */
--bg-dark-primary: #111827; /* gray-900 */
--bg-dark-secondary: #1f2937; /* gray-800 */
--bg-dark-tertiary: #374151; /* gray-700 */
```

### Role Colors (Agent Avatars)

Each role gets a distinct color for quick identification:

| Role           | Color  | Hex     |
| -------------- | ------ | ------- |
| 👔 CEO         | Slate  | #475569 |
| 🚀 Growth      | Orange | #F97316 |
| 🔬 Research    | Cyan   | #06B6D4 |
| 🌌 Frontier    | Purple | #A855F7 |
| 📦 Product     | Blue   | #3B82F6 |
| 📋 Scrum       | Yellow | #EAB308 |
| 🔍 QA          | Green  | #22C55E |
| ⚙️ Engineering | Red    | #EF4444 |
| 🛡️ Ops         | Gray   | #6B7280 |
| 🎨 Design      | Pink   | #EC4899 |

---

## 3. Typography

### Font Stack

```css
/* Primary — Clean sans-serif for UI */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Mono — For code, logs, agent output */
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

### Scale

| Name        | Size | Line Height | Weight | Use Case                    |
| ----------- | ---- | ----------- | ------ | --------------------------- |
| `text-xs`   | 12px | 16px        | 400    | Badges, timestamps          |
| `text-sm`   | 14px | 20px        | 400    | Secondary text, table cells |
| `text-base` | 16px | 24px        | 400    | Body text, inputs           |
| `text-lg`   | 18px | 28px        | 500    | Card titles                 |
| `text-xl`   | 20px | 28px        | 600    | Section headers             |
| `text-2xl`  | 24px | 32px        | 700    | Page titles                 |
| `text-3xl`  | 30px | 36px        | 700    | Hero text                   |

---

## 4. Spacing System

Use Tailwind's default spacing scale:

```
4px (1), 8px (2), 12px (3), 16px (4), 20px (5), 24px (6), 32px (8), 40px (10), 48px (12), 64px (16)
```

### Layout Guidelines

- **Page padding:** 24px (6) on mobile, 32px (8) on desktop
- **Card padding:** 16px (4) standard, 24px (6) for feature cards
- **Stack spacing:** 16px (4) between cards, 8px (2) between list items
- **Inline spacing:** 8px (2) between icon and text, 12px (3) between buttons

---

## 5. Component Library

### 5.1 Buttons

```jsx
// Primary — Main actions
<Button variant="primary">Deploy Agent</Button>

// Secondary — Alternative actions
<Button variant="secondary">View Logs</Button>

// Ghost — Tertiary, less emphasis
<Button variant="ghost">Cancel</Button>

// Danger — Destructive actions
<Button variant="danger">Stop Agent</Button>

// Sizes
<Button size="sm">Small</Button>  // 32px height
<Button size="md">Medium</Button> // 40px height (default)
<Button size="lg">Large</Button>  // 48px height
```

**States:** default, hover, active, disabled, loading (spinner)

### 5.2 Cards

```jsx
// Basic Card
<Card>
  <CardHeader>
    <CardTitle>Agent Status</CardTitle>
    <CardDescription>Last active 2 minutes ago</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    <Button>View Details</Button>
  </CardFooter>
</Card>

// Stat Card (for metrics)
<StatCard
  title="Cycles"
  value="1,112"
  change="+12%"
  trend="up"
/>

// Role Card (for agent team)
<RoleCard
  role="engineering"
  status="active"
  lastAction="Fixed auth flow"
  cycle={1108}
/>
```

### 5.3 Tables

```jsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Cycle</TableHead>
      <TableHead>Role</TableHead>
      <TableHead>Action</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>1112</TableCell>
      <TableCell>
        <RoleBadge role="design" />
      </TableCell>
      <TableCell>Dashboard design system spec</TableCell>
      <TableCell>
        <StatusBadge status="success" />
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**Features:** Sortable columns, pagination, row selection, expandable rows

### 5.4 Forms

```jsx
// Text Input
<Input
  label="Project Name"
  placeholder="my-agent-team"
  helperText="Lowercase letters and hyphens only"
  error="Name already exists"
/>

// Select
<Select
  label="Role"
  options={[
    { value: 'engineering', label: '⚙️ Engineering' },
    { value: 'product', label: '📦 Product' },
  ]}
/>

// Textarea
<Textarea
  label="Playbook"
  rows={10}
  monospace // Uses mono font
/>

// Toggle
<Toggle
  label="Auto-compress memory"
  checked={true}
/>
```

### 5.5 Badges

```jsx
// Status Badges
<Badge variant="success">Running</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>
<Badge variant="default">Paused</Badge>

// Role Badges (with icon and color)
<RoleBadge role="engineering" />  // Shows ⚙️ with red bg
<RoleBadge role="qa" />           // Shows 🔍 with green bg

// Priority Badges
<PriorityBadge priority="P0" />   // Red
<PriorityBadge priority="P1" />   // Orange
<PriorityBadge priority="P2" />   // Yellow
<PriorityBadge priority="P3" />   // Gray
```

### 5.6 Navigation

```jsx
// Sidebar
<Sidebar>
  <SidebarHeader>
    <Logo />
    <ProjectSelector />
  </SidebarHeader>
  <SidebarNav>
    <NavItem icon={<DashboardIcon />} href="/">Dashboard</NavItem>
    <NavItem icon={<TeamIcon />} href="/team">Team</NavItem>
    <NavItem icon={<MemoryIcon />} href="/memory">Memory</NavItem>
    <NavItem icon={<SettingsIcon />} href="/settings">Settings</NavItem>
  </SidebarNav>
  <SidebarFooter>
    <UserMenu />
  </SidebarFooter>
</Sidebar>

// Breadcrumbs
<Breadcrumbs>
  <BreadcrumbItem href="/">Dashboard</BreadcrumbItem>
  <BreadcrumbItem href="/team">Team</BreadcrumbItem>
  <BreadcrumbItem>Engineering</BreadcrumbItem>
</Breadcrumbs>
```

### 5.7 Feedback

```jsx
// Toast Notifications
toast.success('Agent deployed successfully')
toast.error('Deployment failed: timeout')
toast.info('Cycle 1112 started')

// Alert Banners
<Alert variant="warning">
  <AlertTitle>Human Review Required</AlertTitle>
  <AlertDescription>
    Agent is requesting permission to modify production config.
  </AlertDescription>
</Alert>

// Empty States
<EmptyState
  icon={<AgentIcon />}
  title="No agents yet"
  description="Create your first autonomous dev team"
  action={<Button>Create Agent</Button>}
/>

// Loading States
<Skeleton variant="text" /> // For text
<Skeleton variant="card" /> // For cards
<Spinner size="md" />       // Inline spinner
```

---

## 6. Dashboard-Specific Components

### 6.1 Rotation Timeline

Visual representation of agent rotation:

```
┌─────────────────────────────────────────────────────────────┐
│ C1110 ⚙️ → C1111 🛡️ → C1112 🎨* → C1113 👔 → C1114 🚀      │
│ Engineering  Ops        Design     CEO        Growth        │
│              ↑ current                                      │
└─────────────────────────────────────────────────────────────┘
```

Interactive: Click role to view cycle details.

### 6.2 Memory Bank Viewer

```jsx
<MemoryViewer>
  <MemorySection title="Current Status" collapsible>
    {/* Rendered markdown */}
  </MemorySection>
  <MemorySection title="Role State">
    {/* Role cards with last action */}
  </MemorySection>
  <MemorySection title="Active Threads">
    {/* Issue list with priority badges */}
  </MemorySection>
</MemoryViewer>
```

Features: Markdown rendering, syntax highlighting for code blocks, collapsible sections, search.

### 6.3 Cycle Activity Feed

```jsx
<ActivityFeed>
  <ActivityItem
    role="design"
    cycle={1112}
    action="Created dashboard design system spec"
    timestamp="2 min ago"
    status="success"
  />
  <ActivityItem
    role="ops"
    cycle={1111}
    action="CI enhancement spec for Sprint 3"
    timestamp="45 min ago"
    status="success"
  />
</ActivityFeed>
```

### 6.4 Agent Status Card

```jsx
<AgentStatusCard
  project="autonomous-dev-agents"
  cycle={1112}
  currentRole="design"
  status="running"
  consecutiveSuccess={692}
  nextRole="ceo"
  eta="~15 min"
/>
```

---

## 7. Responsive Breakpoints

```css
/* Mobile-first breakpoints */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Wide screens */
```

### Layout Behavior

- **Mobile (< 768px):** Single column, collapsible sidebar (hamburger menu), stacked cards
- **Tablet (768px-1024px):** Two-column grid, mini sidebar (icons only)
- **Desktop (> 1024px):** Full sidebar, multi-column layouts, expanded tables

---

## 8. Dark Mode

All components must support dark mode via CSS variables or Tailwind's `dark:` prefix.

```jsx
// Component example
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  {/* Content */}
</div>
```

**Default:** System preference with manual toggle in settings.

---

## 9. Accessibility

### Requirements

1. **Color contrast:** WCAG AA minimum (4.5:1 for text, 3:1 for large text)
2. **Focus indicators:** Visible focus rings on all interactive elements
3. **Keyboard navigation:** Full keyboard support, logical tab order
4. **Screen readers:** Proper ARIA labels, semantic HTML
5. **Motion:** Respect `prefers-reduced-motion`

### Implementation Checklist

- [ ] All buttons have `aria-label` when icon-only
- [ ] Form inputs have associated `<label>` elements
- [ ] Color is not the only indicator of state
- [ ] Interactive elements have 44x44px minimum touch target
- [ ] Error messages are announced to screen readers

---

## 10. Implementation Notes

### Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + CSS Variables
- **Components:** shadcn/ui as base (customized)
- **Icons:** Lucide React
- **Charts:** Recharts or Visx

### File Structure

```
apps/web/
├── components/
│   ├── ui/           # Primitive components (Button, Card, etc.)
│   ├── dashboard/    # Dashboard-specific (Timeline, ActivityFeed)
│   └── layout/       # Layout components (Sidebar, Header)
├── styles/
│   ├── globals.css   # CSS variables, base styles
│   └── tokens.css    # Design tokens
└── lib/
    └── theme.ts      # Theme configuration
```

### Component Conventions

1. **Props:** Use TypeScript interfaces, extend HTML attributes where appropriate
2. **Variants:** Use `cva` (class-variance-authority) for variant handling
3. **Composition:** Prefer compound components (Card.Header, Card.Body)
4. **Forwardref:** Support ref forwarding on all components
5. **Testing:** Include data-testid attributes for E2E testing

---

## 11. Sprint 3 Implementation Priority

### Day 1-3: Foundation

- [ ] Set up Tailwind config with design tokens
- [ ] Configure shadcn/ui with custom theme
- [ ] Build Button, Card, Input, Badge primitives

### Day 4-6: Layout

- [ ] Sidebar navigation
- [ ] Header with user menu
- [ ] Page layout wrapper
- [ ] Responsive breakpoints

### Day 7-10: Features

- [ ] Auth pages (login, callback)
- [ ] Billing components (pricing cards, subscription status)
- [ ] Agent status components

### Day 11-14: Polish

- [ ] Dark mode toggle
- [ ] Loading/empty states
- [ ] Error boundaries
- [ ] Accessibility audit

---

## Appendix: Reference Links

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com)
- [Lucide Icons](https://lucide.dev)

---

_This spec provides the visual foundation for Sprint 3. Engineering should reference this document when implementing all dashboard UI components._
