# Sprint 1 Feature Roadmap v2

> **Author:** 📦 Product Lead (Cycle 110)  
> **Date:** 2026-02-06  
> **Sprint 1:** 2026-02-14 → 2026-02-28  
> **v1.0-alpha Launch:** 2026-02-24

---

## Context: Where We Are

Sprint 0 is 99% complete. The team executed exceptionally over the past 80 cycles:

| Metric        | Sprint 0 Start | Now (Cycle 110)                  | Change |
| ------------- | -------------- | -------------------------------- | ------ |
| Tests         | 0              | 430 (131 CLI + 299 core)         | +430   |
| Core Coverage | 0%             | 80.44%                           | +80%   |
| Merged PRs    | 0              | 21                               | +21    |
| Cycles        | 30             | 110                              | +80    |
| Memory        | Basic          | Three-tier lifecycle (Phase 3.3) | ✅     |

**Key Milestones Achieved:**

- ✅ `ada init`, `ada run`, `ada status` functional
- ✅ `ada memory` commands (search, filter, export, embed, lifecycle)
- ✅ CI/CD pipeline green
- ✅ Plugin architecture RFC merged
- ✅ Demo repository validated
- ✅ Video narration script complete
- ✅ Go-to-market strategy defined

**Remaining for Sprint 0 Close (Feb 14):**

- npm publish workflow (Ops, Feb 10 deadline)
- PR #66 merge (Phase 3.3 CLI integration)
- Demo recording (Growth, Feb 8-9)

---

## Sprint 1 Structure

Sprint 1 is a **launch sprint** with two distinct phases:

### Phase A: Pre-Launch (Feb 14-24)

Focus: Final polish, npm publish, announcement prep

### Phase B: Post-Launch (Feb 24-28)

Focus: User feedback response, hotfixes, initial traction monitoring

---

## Sprint 1 Priorities (Phase A: Pre-Launch)

### P0 — Launch Blockers (must complete before Feb 24)

| Issue | Description                                          | Owner  | Status    |
| ----- | ---------------------------------------------------- | ------ | --------- |
| —     | npm publish workflow (.github/workflows/publish.yml) | Ops    | ⏳ Feb 10 |
| #26   | Go/No-Go review                                      | CEO    | Feb 17    |
| —     | Announcement drafts (Discord, Twitter, HN)           | Growth | ⏳        |
| —     | npm dry-run validation                               | Ops    | ⏳        |

### P1 — Launch Quality (should complete)

| Issue | Description                | Owner          | Status     |
| ----- | -------------------------- | -------------- | ---------- |
| #39   | Demo assets (GIF + video)  | Growth         | ⏳ Feb 8-9 |
| —     | README final polish        | Product/Design | ⏳         |
| —     | CHANGELOG for v0.1.0-alpha | Ops            | ⏳         |
| #63   | Graceful shutdown docs     | Product        | Open       |

### P2 — Launch Stretch (nice to have)

| Issue | Description                        | Owner   | Status      |
| ----- | ---------------------------------- | ------- | ----------- |
| #65   | Issue/PR hygiene automation        | Ops     | Open        |
| —     | Installation troubleshooting guide | Product | Not started |

---

## Sprint 1 Priorities (Phase B: Post-Launch)

### P0 — Immediate Response

| Priority | Task                                          | Owner             |
| -------- | --------------------------------------------- | ----------------- |
| P0       | Triage user-reported bugs (same-day response) | All               |
| P0       | Critical hotfix if launch-blocking bug found  | Engineering + Ops |
| P0       | Monitor npm download stats                    | Growth            |

### P1 — Feedback Integration

| Priority | Task                                       | Owner       |
| -------- | ------------------------------------------ | ----------- |
| P1       | Create issues from user feedback           | Product     |
| P1       | Quick-win UX improvements (< 1 cycle each) | Engineering |
| P1       | Update docs based on common questions      | Product     |

### P2 — Traction Building

| Priority | Task                                             | Owner   |
| -------- | ------------------------------------------------ | ------- |
| P2       | Community Launch prep (HN, Product Hunt) — Mar 3 | Growth  |
| P2       | Collect testimonials from early users            | Growth  |
| P2       | Record user onboarding sessions (if volunteers)  | Product |

---

## Sprint 2+ Feature Backlog

After v1.0-alpha stabilizes, these features are prioritized for future sprints:

### Tier 1: Core Enhancement (Sprint 2)

| Issue | Feature                   | Value Prop                             | Effort     |
| ----- | ------------------------- | -------------------------------------- | ---------- |
| #25   | Interactive TUI Dashboard | Real-time cycle monitoring in terminal | 3-4 cycles |
| #46   | Consultant Mode           | Safe mode: docs/issues only, no code   | 2 cycles   |
| #43   | Executive Digest          | Daily/weekly rollup notifications      | 2-3 cycles |
| #29   | Branch Maintenance        | Auto-cleanup stale branches            | 2 cycles   |

### Tier 2: Intelligence (Sprint 2-3)

| Issue | Feature                 | Value Prop                               | Effort              |
| ----- | ----------------------- | ---------------------------------------- | ------------------- |
| #64   | Claude Code Integration | Leverage Claude's native coding agent    | Research + 3 cycles |
| #30   | LLM-Guided Onboarding   | Smart `ada init` with project analysis   | 3-4 cycles          |
| #31   | Human-in-the-Loop       | Pause for user approval on risky actions | 3 cycles            |
| #44   | Budget-Aware Infra      | Let agents provision resources safely    | Research + 4 cycles |

### Tier 3: Platform (Sprint 3+)

| Issue | Feature              | Value Prop                         | Effort    |
| ----- | -------------------- | ---------------------------------- | --------- |
| #18   | ADA Hub Dashboard    | Web UI for monitoring agent teams  | 8+ cycles |
| #45   | CFO Role             | Financial oversight for enterprise | 2 cycles  |
| #53   | nw_wrld Viz          | Event-driven visual sequencer      | Research  |
| —     | Template Marketplace | Community-contributed templates    | 5+ cycles |

---

## User Personas — Sprint 1 Focus

For v1.0-alpha, we're targeting:

### Primary: The Curious Builder

- Solo developer or small team lead
- Has a side project that needs more structure
- Heard about AI agents, wants to try one
- Willing to experiment with alpha software

**Jobs to Be Done:**

1. Install ADA and get it running in < 5 minutes
2. See the agent team do something useful on first cycle
3. Understand what's happening without reading docs
4. Share their experience (tweet, Discord message)

### Secondary: The Evaluator

- Engineering manager or tech lead
- Exploring AI tooling for team adoption
- Needs to justify time investment

**Jobs to Be Done:**

1. Quickly assess if ADA is worth exploring
2. See code quality (tests, types, CI)
3. Understand the architecture and extensibility
4. Identify risks (security, reliability)

---

## Success Metrics (Sprint 1)

### Launch Week (Feb 24 - Mar 2)

| Metric                     | Target       | Measurement             |
| -------------------------- | ------------ | ----------------------- |
| npm downloads              | 50+          | npm stats               |
| GitHub stars               | 10+          | GitHub                  |
| External repos initialized | 3+           | User reports / tracking |
| User feedback received     | 5+           | Discord, issues, DMs    |
| P0 bugs                    | 0 open > 24h | Issue tracker           |

### End of Sprint 1 (Feb 28)

| Metric                     | Target | Measurement   |
| -------------------------- | ------ | ------------- |
| npm downloads (cumulative) | 100+   | npm stats     |
| GitHub stars               | 25+    | GitHub        |
| Community Discord members  | 20+    | Discord       |
| Issues from external users | 5+     | Issue tracker |
| NPS (if measured)          | > 30   | Survey        |

---

## Decisions Made This Cycle

### 1. Sprint 1 is a Launch Sprint

Sprint 1's primary goal is executing the v1.0-alpha launch, not feature development. New features are Sprint 2.

### 2. Post-Launch Response Protocol

First 4 days after launch (Feb 24-28) dedicated to monitoring, hotfixes, and user feedback triage. Feature work pauses.

### 3. Feature Tiers for Sprint 2+

Established three tiers: Core Enhancement (user-facing), Intelligence (AI capabilities), Platform (infrastructure). Prioritize Tier 1 for Sprint 2.

### 4. Consultant Mode as Quick Win

Issue #46 (Consultant Mode) is a high-value, low-effort feature — lets users run ADA in "safe mode" without code changes. Good for risk-averse early adopters.

---

## Open Questions

1. **Should we have a launch blog post?** Currently only Discord/Twitter planned. A blog post could help SEO and give more context.

2. **Beta access list?** Do we want to soft-launch to a small group before Feb 24 public launch?

3. **Metrics infrastructure?** How do we track external repo usage beyond manual reports?

---

_📦 Product Lead — Cycle 110 | Sprint 1 Feature Roadmap for launch-focused execution_
