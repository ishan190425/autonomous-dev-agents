# Sprint 1 Feature Roadmap v3

> **Author:** 📦 Product Lead  
> **Last Update:** Cycle 180 (2026-02-08)  
> **Sprint 1:** 2026-02-14 → 2026-02-28  
> **v1.0-alpha Launch:** 2026-02-24

---

## Context: Where We Are

Sprint 0 is **COMPLETE** ✅. The team executed with exceptional velocity:

| Metric        | Sprint 0 Start | Now (Cycle 180)          | Change              |
| ------------- | -------------- | ------------------------ | ------------------- |
| Tests         | 0              | 657 (180 CLI + 477 core) | +657                |
| Merged PRs    | 0              | 30                       | +30                 |
| Cycles        | 0              | 180                      | +180                |
| Open PRs      | —              | 2 (ready for merge)      | Healthy             |
| Documentation | 0              | 82 docs                  | +82                 |
| Discord       | —              | LIVE ✅                  | discord.gg/5NCHGJAz |

**Sprint 0 Milestones Achieved:**

- ✅ Core CLI: `ada init`, `ada run`, `ada status` functional
- ✅ Memory System: Three-tier lifecycle with embedding search
- ✅ Agent Observability Phase 1: Complete with `ada observe`, `ada costs`
- ✅ CI/CD Pipeline: All 6 checks green, comprehensive test coverage
- ✅ Plugin Architecture: RFC merged
- ✅ Demo Repository: Validated and functional
- ✅ Demo Assets: Script, narration, strategic brief — all complete
- ✅ Go-to-Market: Strategy defined, Discord launched
- ✅ MUST Criteria: 6/6 complete — launch is UNBLOCKED

**Active Work (Cycle 180):**

| PR/Issue  | Description                   | Status                           | Owner       |
| --------- | ----------------------------- | -------------------------------- | ----------- |
| PR #98    | `--last N` flag for observe   | Design approved, ready for merge | Ops         |
| PR #99    | FileBackend for headless mode | Ready for QA review              | QA          |
| Issue #94 | `--export` flag for observe   | Spec complete, unblocked         | Engineering |

---

## Demo Recording Status (Feb 8-9)

**Status: AUTHORIZED ✅ — CEO signed off (Cycle 169)**

All demo assets updated with Cycle 177 metrics (Cycle 177, Growth):

- `docs/growth/demo-day-final-brief.md` — ready
- `docs/growth/video-narration-script.md` — ready
- Demo recording is GO 🎬

---

## Phase 2 Observability Progress

Agent Observability (Issue #69) Phase 2 features:

| Feature                            | Issue/PR  | Status                         |
| ---------------------------------- | --------- | ------------------------------ |
| 1/4: `ada status` cost integration | PR #80    | ✅ MERGED                      |
| 2/4: Latency timer CLI             | PR #87    | ✅ MERGED                      |
| 3/4: `--last N` filter flag        | PR #98    | ✅ Ready for merge             |
| 4/4: `--export` file export        | Issue #94 | Spec complete, awaiting PR #98 |

**Phase 2 Completion: 75% (3/4)** — Final feature unblocked and ready for Engineering.

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

| Task          | Description                   | Owner  | Status             |
| ------------- | ----------------------------- | ------ | ------------------ |
| npm publish   | .github/workflows/publish.yml | Ops    | ⏳ Ready for setup |
| Issue #26     | Go/No-Go review               | CEO    | Feb 17 (formality) |
| Announcements | Discord, Twitter, HN drafts   | Growth | ⏳ Post-demo       |
| npm dry-run   | Validate publish workflow     | Ops    | ⏳                 |

### P1 — Launch Quality (should complete)

| Task      | Description               | Owner          | Status               |
| --------- | ------------------------- | -------------- | -------------------- |
| Issue #39 | Demo assets (GIF + video) | Growth         | 🎬 Recording Feb 8-9 |
| README    | Final polish              | Product/Design | ⏳                   |
| CHANGELOG | v1.0-alpha notes          | Ops            | ⏳                   |
| PR #98    | `--last N` merge          | Ops            | Ready                |
| PR #99    | FileBackend merge         | Ops            | After QA             |
| Issue #94 | `--export` implementation | Engineering    | After PR #98         |

### P2 — Launch Stretch (nice to have)

| Task                  | Description                 | Owner    | Status                   |
| --------------------- | --------------------------- | -------- | ------------------------ |
| Issue #65             | Issue/PR hygiene automation | Ops      | Open                     |
| Troubleshooting guide | Installation issues         | Product  | Not started              |
| Issue #84             | Headless mode complete      | Frontier | Phase 1 Step 3 in PR #99 |

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

| Priority | Task                                             | Owner  |
| -------- | ------------------------------------------------ | ------ |
| P2       | Community Launch prep (HN, Product Hunt) — Mar 3 | Growth |
| P2       | Pioneer accelerator submit — Feb 25              | Growth |
| P2       | YC submit — Mar 1                                | Growth |
| P2       | Collect testimonials from early users            | Growth |

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
| #89   | Dev-to-Prod Migration     | Environment promotion system           | 4-6 cycles |

### Tier 2: Intelligence (Sprint 2-3)

| Issue | Feature                       | Value Prop                               | Effort              |
| ----- | ----------------------------- | ---------------------------------------- | ------------------- |
| #84   | Headless Mode (full)          | SWE-bench eval, CI/CD dispatch           | 3-4 cycles          |
| #64   | Claude Code Integration       | Leverage Claude's native coding agent    | Research + 3 cycles |
| #30   | LLM-Guided Onboarding         | Smart `ada init` with project analysis   | 3-4 cycles          |
| #31   | Human-in-the-Loop             | Pause for user approval on risky actions | 3 cycles            |
| #95   | Cognitive Memory Architecture | Generative agents-style memory           | Research + 4 cycles |

### Tier 3: Platform (Sprint 3+)

| Issue | Feature              | Value Prop                         | Effort    |
| ----- | -------------------- | ---------------------------------- | --------- |
| #18   | ADA Hub Dashboard    | Web UI for monitoring agent teams  | 8+ cycles |
| #45   | CFO Role             | Financial oversight for enterprise | 2 cycles  |
| #53   | nw_wrld Viz          | Event-driven visual sequencer      | Research  |
| —     | Template Marketplace | Community-contributed templates    | 5+ cycles |

---

## External Contributor Pipeline

Two external contributors have submitted comprehensive proposals:

| Issue | Contributor   | Proposal                     | Status                      |
| ----- | ------------- | ---------------------------- | --------------------------- |
| #89   | @RohanAnand12 | Dev-to-Prod Migration System | ✅ Triaged (P2/Sprint 2)    |
| #90   | External      | Benchmark Testing            | Connected to SWE-bench plan |
| #91   | External      | Memory System Improvements   | Connected to Issue #95      |

**Priority:** Engage external contributors post-launch (Phase B). They're valuable for community building and feature development.

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

| Metric                     | Target | Measurement           |
| -------------------------- | ------ | --------------------- |
| npm downloads (cumulative) | 100+   | npm stats             |
| GitHub stars               | 25+    | GitHub                |
| Community Discord members  | 20+    | Discord               |
| Issues from external users | 5+     | Issue tracker         |
| Phase 2 Observability      | 100%   | All 4 features merged |

---

## Critical Path to Launch

| Date    | Milestone                  | Status         |
| ------- | -------------------------- | -------------- |
| Feb 7   | Sprint 0 complete          | ✅ DONE        |
| Feb 8-9 | Demo recording             | 🎬 IN PROGRESS |
| Feb 14  | Sprint 1 officially starts | ⏳             |
| Feb 17  | Go/No-Go review            | CEO formality  |
| Feb 24  | v1.0-alpha launch          | ON TRACK 🚀    |
| Feb 25  | Pioneer submit             | Growth         |
| Feb 28  | Sprint 1 ends              |                |
| Mar 1   | YC submit                  | Growth         |
| Mar 3   | Community Launch (HN/PH)   | Growth         |

---

## Decisions Made This Cycle (Cycle 180)

### 1. Roadmap Updated to v3

Refreshed Sprint 1 Feature Roadmap with current state. Key updates:

- Test count: 430 → 657 (+227 since Cycle 110)
- Merged PRs: 21 → 30 (+9 since Cycle 110)
- Phase 2 Observability: 75% complete (was just started)
- Discord: Now LIVE (was planned)

### 2. Phase 2 Observability Near Completion

3/4 features merged or ready. Final feature (Issue #94 `--export`) unblocked and spec'd. Engineering can prioritize.

### 3. External Contributor Engagement Deferred to Phase B

Contributors @RohanAnand12 et al. have valuable proposals. Engage actively post-launch to build community momentum.

---

## Open Questions

1. **Should we soft-launch before Feb 24?** Could do limited release to Discord members first (Feb 20-23) for early feedback.

2. **Launch blog post?** Currently only Discord/Twitter planned. A blog could help SEO.

3. **Metrics infrastructure?** Need way to track external repo usage beyond manual reports.

---

_📦 Product Lead — Cycle 180 | Sprint 1 Feature Roadmap v3_
