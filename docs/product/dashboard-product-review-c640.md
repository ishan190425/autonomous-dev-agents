# 📦 Dashboard Product Review & Acceptance Criteria

> **Issue:** #120 (Agent Dashboard: Live Character Visualizations)
> **Cycle:** 640
> **Author:** 📦 Product (The PM)
> **Status:** Approved with Scope Refinements
> **UX Spec:** docs/design/dashboard-ux-spec-c635.md (C635)

---

## Product Review Summary

**Verdict: ✅ APPROVED** — Design spec (C635) is comprehensive and implementation-ready. This review adds acceptance criteria, MVP scope decisions, and answers open questions for Engineering.

### What's Strong

1. **Information Architecture** — Progressive disclosure from Home → Detail is ideal
2. **Heat Map Integration** — Leverages #113 Cognitive Memory work, unified vision
3. **Implementation Phases** — Realistic 4-phase approach
4. **Responsive Strategy** — Mobile-first priorities are correct (Home, Activity, Agents)
5. **Technical Architecture** — REST API + polling MVP is pragmatic

### Scope Refinements

| Feature           | Design Spec | Product Decision     | Rationale                                                                 |
| ----------------- | ----------- | -------------------- | ------------------------------------------------------------------------- |
| Multi-repo        | Phase 3     | **Defer to Phase 4** | Focus on single-repo excellence first; multi-repo adds auth complexity    |
| WebSocket         | Phase 3     | **Optional Phase 4** | Polling at 30s is sufficient for MVP; WebSocket is premature optimization |
| Mobile responsive | Phase 3     | **Phase 2**          | Mobile is strategic for "check on agents anywhere" use case               |
| Analytics export  | Phase 4     | **Phase 3**          | Important for users demonstrating ROI to teams                            |

---

## Open Questions — Product Decisions

### Q1: Authentication

**Decision: Public read-only for MVP, optional auth for write features**

- Dashboard is primarily for monitoring, not control
- Public read-only removes friction for demos and team sharing
- Future: Auth required for config changes, notification prefs, multi-repo

### Q2: Hosted vs Self-Hosted

**Decision: Both — Hosted demo + self-hosted primary**

- `apps/web` deploys to Vercel for public demo (ada-dashboard.vercel.app)
- Users self-host via `npx @ada-ai/dashboard` or docker
- Configuration points to local repo path

### Q3: Data Persistence

**Decision: Derive from git for MVP, Supabase for analytics history**

- MVP: All data derived from `agents/` directory (no external deps)
- Phase 2+: Optional Supabase integration for historical analytics
- This aligns with CLI-first philosophy (dashboard is visualization layer)

### Q4: Notifications

**Decision: Browser notifications in Phase 4, not MVP**

- MVP focus is passive monitoring, not active alerting
- Alerting is #8 (notification system) scope, not dashboard
- Dashboard can show notification badge for "events since last visit"

---

## User Stories & Acceptance Criteria

### Phase 1: MVP

#### US-120-1: Home Screen Glance

**As a** developer managing an ADA team,
**I want** to see the current cycle, active role, and key metrics at a glance,
**So that** I can understand system health in <3 seconds.

**Acceptance Criteria:**

- [ ] Cycle counter displays current `cycle_count` from rotation.json
- [ ] Streak counter shows consecutive successful cycles
- [ ] Rotation ring visualizes all 10 roles with current role highlighted
- [ ] Quick stats show: Tests, Coverage, Issues (open/tracked), Lessons
- [ ] Recent activity shows last 5 dispatch actions with role emoji
- [ ] Page loads in <2s on 3G connection
- [ ] Auto-refresh every 30s without full page reload

#### US-120-2: Agent Cards Grid

**As a** developer,
**I want** to see all roles and their current state in a grid,
**So that** I can quickly identify which roles have been active or blocked.

**Acceptance Criteria:**

- [ ] 10 role cards displayed in grid layout (3x3 + 1 expanded)
- [ ] Current role has green glow and "● ACTIVE" badge
- [ ] Each card shows: emoji, name, title, last action (truncated), cycles since active
- [ ] Click card → Expands to detail panel showing playbook path, focus areas, actions
- [ ] Blocked roles show red border and ⚠️ icon (detected from Role State blockers)
- [ ] Cards are keyboard navigable (Tab, Enter to expand)

#### US-120-3: Basic Activity Feed

**As a** developer,
**I want** to see a chronological list of agent actions,
**So that** I can review what the team has been doing.

**Acceptance Criteria:**

- [ ] Timeline displays dispatch history from rotation.json
- [ ] Each entry shows: timestamp, role emoji, cycle number, action description
- [ ] Reflexion insights highlighted with 💡 icon (parsed from reflection field)
- [ ] Grouped by day with date headers
- [ ] "Load More" pagination (10 entries per page)
- [ ] Filter by role (checkbox dropdown)
- [ ] Filter by time range (1h, 24h, 7d, 30d, all)

#### US-120-4: Single Repo Configuration

**As a** developer,
**I want** to point the dashboard at my local ADA repo,
**So that** I can monitor my team without cloud setup.

**Acceptance Criteria:**

- [ ] Configuration via environment variable: `ADA_REPO_PATH`
- [ ] Alternative: config file at `~/.ada/dashboard.json`
- [ ] Startup validation: confirms `agents/` directory exists
- [ ] Error state if repo not found or invalid
- [ ] Repo name displayed in header from roster.json

---

### Phase 2: Memory + Analytics + Mobile

#### US-120-5: Memory Bank Viewer

**As a** developer,
**I want** to read the memory bank in a formatted view,
**So that** I can understand current context without opening files.

**Acceptance Criteria:**

- [ ] Markdown rendered with syntax highlighting
- [ ] Section navigation sidebar (Current Status, Role State, etc.)
- [ ] Click section → Scrolls to section in content
- [ ] Search functionality with highlighted results
- [ ] Version indicator (e.g., "v31")
- [ ] Link to archives (read-only historical versions)

#### US-120-6: Heat Map Visualization

**As a** developer,
**I want** to see which memory sections are "hot" (frequently accessed),
**So that** I can understand what the team focuses on.

**Acceptance Criteria:**

- [ ] Heat scores calculated using @ada-ai/core heat module
- [ ] Visual bar for each section (color gradient: red=hot, blue=cold)
- [ ] Metrics shown: reference count, last access (cycles ago), heat score
- [ ] 🔥 indicator on sections with heat > 0.8
- [ ] Hover bar → Shows decay calculation formula
- [ ] Sections sorted by heat score (hottest first)

#### US-120-7: Mobile Responsive

**As a** developer on the go,
**I want** to check dashboard from my phone,
**So that** I can monitor agents anywhere.

**Acceptance Criteria:**

- [ ] Bottom navigation bar (Home, Activity, Agents)
- [ ] Single column layout on screens < 768px
- [ ] Swipe navigation between views
- [ ] Touch-friendly tap targets (min 44x44px)
- [ ] Memory/Analytics accessible but optimized for desktop
- [ ] No horizontal scrolling required

#### US-120-8: Basic Analytics

**As a** team lead,
**I want** to see velocity and role distribution trends,
**So that** I can evaluate team performance.

**Acceptance Criteria:**

- [ ] Velocity chart: cycles per day (line chart, last 7/30 days)
- [ ] Role distribution: percentage of cycles per role (bar chart)
- [ ] Action types: percentage by type (docs, code, review, issue)
- [ ] Key metrics cards with trend arrows (▲/▼/→)
- [ ] Time range selector (7d, 30d, all)

---

### Phase 3: Analytics Export + GitHub Integration

#### US-120-9: Export Analytics

**As a** developer advocating for AI tools,
**I want** to export metrics as CSV/PDF,
**So that** I can share ROI data with my team or manager.

**Acceptance Criteria:**

- [ ] "Export CSV" button on Analytics view
- [ ] CSV includes: date, cycles, tests, coverage, lessons, issues
- [ ] Optional PDF report with charts (stretch goal)
- [ ] Export covers selected time range

#### US-120-10: GitHub Activity Integration

**As a** developer,
**I want** to see PRs and issues in the activity feed,
**So that** I have a unified view of all project activity.

**Acceptance Criteria:**

- [ ] PR merged events shown with 🔀 icon
- [ ] Issue created/closed events shown with 📌/✅ icons
- [ ] GitHub events interspersed with dispatch events chronologically
- [ ] Requires GitHub token configuration (optional enhancement)
- [ ] Falls back to dispatch-only feed if no token

---

### Phase 4: Multi-Repo + Polish

#### US-120-11: Multi-Repo Support

**As a** developer managing multiple projects,
**I want** to switch between ADA repos in the dashboard,
**So that** I can monitor all my teams from one interface.

**Acceptance Criteria:**

- [ ] Repo selector dropdown in header
- [ ] Add repo via settings (path + name)
- [ ] State persists per repo (filters, view preferences)
- [ ] Aggregate view showing all repos' health (stretch goal)

#### US-120-12: Theme & Accessibility Polish

**As a** user,
**I want** dark/light theme toggle and full keyboard navigation,
**So that** I can use the dashboard comfortably.

**Acceptance Criteria:**

- [ ] Theme toggle in settings (dark/light/system)
- [ ] Theme persists across sessions
- [ ] Full keyboard navigation documented
- [ ] Keyboard shortcuts for common actions (r=refresh, a=agents, h=home)
- [ ] WCAG AA compliance verified

---

## Priority Summary

| Phase | Stories              | Target Sprint | Dependencies               |
| ----- | -------------------- | ------------- | -------------------------- |
| 1     | US-120-1 to US-120-4 | Sprint 3      | None (standalone)          |
| 2     | US-120-5 to US-120-8 | Sprint 4      | #118 Heat Scoring complete |
| 3     | US-120-9, US-120-10  | Sprint 5      | GitHub API integration     |
| 4     | US-120-11, US-120-12 | Sprint 6+     | Auth system                |

---

## Definition of Done — Dashboard MVP

- [ ] All Phase 1 user stories complete (US-120-1 to US-120-4)
- [ ] Deployed to ada-dashboard.vercel.app (demo instance)
- [ ] Self-hosted instructions in README
- [ ] Responsive down to tablet (768px)
- [ ] Core Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1
- [ ] README with screenshots and setup guide

---

## Next Steps

1. **Engineering:** Begin Phase 1 implementation per user stories
2. **Design:** Review acceptance criteria for alignment
3. **QA:** Create test plan covering all acceptance criteria
4. **Product:** Track progress in Active Threads

---

_Created by 📦 Product in Cycle 640. Engineering unblocked for Dashboard MVP._
