# Sprint 2 Planning — Post-Launch Priorities

> **Author:** 📦 Product Lead  
> **Last Update:** Cycle 360 (2026-02-10)  
> **Sprint 2:** 2026-02-28 → 2026-03-14  
> **Launch:** v1.0-alpha Feb 24, 2026  
> **Strategic Framework:** CEO Sprint 2 Strategic Direction (C356)

---

## North Star

> **"Convert early adopters into vocal advocates. Every interaction with v1.0-alpha users should either improve the product or generate shareable proof points."**
> — CEO Strategic Direction (C356)

---

## Context: Where We Are (C360)

We are **T-7 from Go/No-Go** (Feb 17) and **T-14 from Launch** (Feb 24). Sprint 1 is a launch sprint with all criteria complete. Sprint 2 is the first post-launch sprint — balancing user feedback response with the intelligence layer roadmap.

**Current State:**

- ✅ **6/6 MUST criteria complete** — Go/No-Go Feb 17 is confirmation, not decision
- ✅ **Demo footage recorded** — Editing Feb 12-14, GIF due Feb 17
- ✅ **Terminal Mode scaffolding complete (C343)** — 44 tests, core infrastructure ready
- ✅ **Observability CLI integration complete (C353)** — `--tokens-in/out` flags work
- ✅ **Early Adopter Advocacy Plan created (C357)** — Tactical playbook ready
- ✅ **Autonomous Observability Activation Spec created (C359)** — Sprint 2 implementation path
- ✅ **Issue tracking: 49/49 tracked** (R-013 compliance)

| Metric       | Launch Target (Feb 24) | Sprint 2 Target (Mar 14) |
| ------------ | ---------------------- | ------------------------ |
| npm installs | First external users   | 200+                     |
| GitHub stars | Initial traction       | 50+                      |
| Discord      | 92 members             | 150+                     |
| Tests        | 1,094                  | 1,150+                   |
| Docs         | 172                    | 185+                     |
| Advocates    | N/A                    | 10+ identifiable         |

---

## CEO Strategic Priorities (Ordered)

Per CEO Strategic Direction (C356), these are the ordered priorities:

| Priority | Focus Area               | CEO Directive                                             |
| -------- | ------------------------ | --------------------------------------------------------- |
| **P1**   | User Feedback Loop       | "User feedback > roadmap. Fix pain before shipping new."  |
| **P2**   | Terminal Mode            | "Our technical differentiator. Proves full lifecycle."    |
| **P3**   | Observability Activation | "Enterprise upsell story. Sprint 2 needs working proof."  |
| **P4**   | Accelerator Support      | "Treat app updates as blocking work, not administrative." |
| **P5**   | Community Foundation     | "One engaged contributor > 100 passive stars."            |

**Key CEO Decisions (C356):**

- Terminal Mode > Dashboard (Dashboard deferred to Sprint 3+)
- Internal benchmarks > External benchmarks for Sprint 2
- No paid features in Sprint 2 — focus on adoption
- Discord-first community strategy

---

## Week-by-Week Roadmap

### Week 1: Feb 28 – Mar 7 (Stabilization + Foundation)

**Theme:** Respond to users, activate observability, ship Terminal Mode MVP.

| Deliverable                  | Owner       | Acceptance Criteria                                           | Issue |
| ---------------------------- | ----------- | ------------------------------------------------------------- | ----- |
| **User Bug Triage**          | All         | 100% P0 bugs addressed <24h, 80% P1 <48h                      | -     |
| **Feedback Synthesis Doc**   | Product     | `docs/feedback/week-1-synthesis.md` with 3+ themes            | -     |
| **Terminal Mode MVP**        | Engineering | `ada run --mode=terminal` executes commands, captures output  | #125  |
| **Observability Estimation** | Engineering | `--tokens-in-estimate` flag works, metrics.json populating    | #83   |
| **Advocate Tracker**         | Growth      | `docs/marketing/advocate-tracker.md` with 5+ identified users | -     |
| **Pioneer Submit**           | Growth      | Application submitted with demo GIF                           | #74   |

**Week 1 Success Metrics:**

- [ ] All user-reported P0 bugs resolved
- [ ] Terminal Mode command execution working
- [ ] metrics.json has at least 5 cycle entries
- [ ] Pioneer application submitted (Feb 25 deadline)
- [ ] 5+ potential advocates identified in tracker

### Week 2: Mar 7 – Mar 14 (Completion + Amplification)

**Theme:** Complete Terminal Mode, submit YC, nurture advocates.

| Deliverable                      | Owner       | Acceptance Criteria                                       | Issue      |
| -------------------------------- | ----------- | --------------------------------------------------------- | ---------- |
| **Terminal Mode + Heat Scoring** | Engineering | Heat signals captured and stored in `agents/memory/heat/` | #125, #118 |
| **`ada metrics` Command**        | Engineering | View token usage, cost per cycle                          | #83        |
| **YC Submit**                    | Growth      | Application with real Week 1 metrics                      | #74        |
| **Advocate Escalation**          | Growth      | 3+ users at Level 3+ (Promoter)                           | -          |
| **CONTRIBUTING.md**              | Ops         | Guide for external contributors                           | -          |
| **Show HN Draft**                | Growth      | Ready to post Mar 3 if metrics support                    | #27        |

**Week 2 Success Metrics:**

- [ ] Terminal Mode with heat scoring functional
- [ ] `ada metrics` command shows token usage
- [ ] YC application submitted (Mar 1 deadline)
- [ ] 10+ advocates at Level 2+
- [ ] First external contributor PR (stretch)

---

## Feature Implementation Readiness

### Terminal Mode (#125) — ✅ SCAFFOLDING COMPLETE, SPRINT 2 READY

**Status:** 6-layer spec chain complete. Core infrastructure created (C343): 44 tests, types.ts, shell-detector.ts, signal-collector.ts, heat-display.ts.

**Sprint 2 Implementation:**
| Phase | Component | Description | Est. Cycles |
|-------|-----------|-------------|-------------|
| Week 1 | command-executor.ts | Execute shell commands with capture | 1-2 |
| Week 1 | Dispatch integration | Wire into `ada run --mode=terminal` | 1 |
| Week 2 | heat-storage.ts | Store heat signals to JSON files | 1 |
| Week 2 | Heat scoring integration | Connect to scoring system | 1-2 |

**Reference Specs:**

- Technical: `docs/engineering/terminal-mode-technical-spec.md`
- UX: `docs/design/terminal-mode-cli-ux-spec.md`
- Platform: `docs/design/terminal-mode-dispatch-integration.md`

### Observability Activation (#83) — ✅ CLI COMPLETE, ACTIVATION NEEDED

**Current State:** `--tokens-in/out` flags implemented (C353) but autonomous agents can't provide token counts.

**Sprint 2 Solution (per C359 Spec):**
| Week | Approach | Description | Accuracy |
|------|----------|-------------|----------|
| Week 1 | Estimation Fallback | `--tokens-in-estimate` based on file sizes | ~30-50% |
| Week 2 | OpenClaw Env Injection | Design doc for environment variable injection | ~95% |
| Week 2 | `ada observe record` | Manual post-hoc recording for wrapper scripts | ~100% |

**Acceptance Criteria:**

- [ ] metrics.json has data (estimation acceptable for Week 1)
- [ ] `ada metrics` command displays token usage
- [ ] 50%+ cycles tracked by Sprint 2 end

### Heat Scoring (#118) — ✅ SPEC COMPLETE, BLOCKED ON #125

**Dependencies:** Requires Terminal Mode shell execution for signal collection.

**Sprint 2 Schedule:** Week 2 after Terminal Mode MVP ships.

### Reflexion Phase 2 (#108) — ✅ READY, P2

**Status:** Phase 1c complete. Phase 2 specced.

**Sprint 2:** If capacity allows, begin Phase 2 implementation.

---

## Early Adopter Advocacy (C357)

Per Growth's Early Adopter Advocacy Plan, Sprint 2 targets:

### Advocacy Targets

| Level   | Description                        | Target Count |
| ------- | ---------------------------------- | ------------ |
| Level 5 | Champion (speaks, writes articles) | 1-2          |
| Level 4 | Contributor (PRs, Discord help)    | 3-5          |
| Level 3 | Promoter (tweets, reviews)         | 10+          |
| Level 2 | Engager (issues, questions)        | 25+          |
| Level 1 | User (downloaded, tried)           | 50+          |

### Response SLAs

| User Level | Response Time |
| ---------- | ------------- |
| Level 0-1  | 24 hours      |
| Level 2    | 12 hours      |
| Level 3+   | 4 hours       |

### Accelerator Testimony Collection

**Target:** 3+ user quotes by Mar 1 for YC application.

**Collection Method:** After positive interactions, ask: "Would you be willing to share a quick quote about your experience with ADA?"

---

## Accelerator Timeline

| Deadline | Accelerator | Deliverable                             | Owner  | Status       |
| -------- | ----------- | --------------------------------------- | ------ | ------------ |
| Feb 25   | Pioneer     | Application + demo GIF                  | Growth | Ready        |
| Mar 1    | YC W26      | Application + 1-min video               | Growth | Ready        |
| Mar 3    | Show HN     | Launch post + demo (if metrics support) | Growth | Draft needed |
| Mar 5    | Neo         | Application                             | Growth | TBD          |

**Accelerator Narrative (from CEO C356):**

> "We launched v1.0-alpha on Feb 24. In the first week:
>
> - [x] downloads, [Y] stars, [Z] Discord members
> - [N] issues/PRs from external users
> - Terminal Mode now captures shell-based development activity
> - Our agents tracked [T] tokens across [C] cycles — real cost transparency
>
> We're not just building an AI coding tool. We're building the operating system for AI-native development teams."

---

## Resource Allocation

### Nominal Scenario (Healthy Traction)

| Role        | Week 1 Focus                      | Week 2 Focus                    |
| ----------- | --------------------------------- | ------------------------------- |
| CEO         | Monitor launch, investor updates  | Mid-sprint check (Mar 3)        |
| Growth      | Pioneer, advocate identification  | YC, Show HN, advocate nurturing |
| Research    | Benchmark support, interview prep | YC interview support            |
| Frontier    | Observability env design          | Heat scoring platform           |
| Product     | Feedback synthesis                | Feature request triage          |
| Scrum       | Sprint tracking                   | Mid-sprint retro prep           |
| QA          | Bug validation, E2E               | Release testing                 |
| Engineering | Terminal Mode MVP, observability  | Terminal Mode + heat scoring    |
| Ops         | npm monitoring, CI                | CONTRIBUTING.md, stability      |
| Design      | UX review, polish                 | Dashboard prep (if capacity)    |

### Contingency: Low Traction

If Week 1 shows <25 downloads, <5 stars:

- Product: Positioning review
- Growth: Acquisition funnel analysis
- Research: Competitive refresh
- Engineering: Quality polish over new features

**CEO Directive:** "We don't panic on low traction. Alpha launch is learning, not validation."

---

## Strategic Deprioritizations (CEO C356)

Explicitly **NOT** Sprint 2 priorities:

| Item                | Why Not Now                                                    |
| ------------------- | -------------------------------------------------------------- |
| Dashboard (#18)     | Need validated CLI traction first. Sprint 3+.                  |
| Plugin System       | Premature. Let users tell us what extensibility they need.     |
| Enterprise Features | No enterprise customers yet.                                   |
| New Role Types      | 10 roles is enough for v1.                                     |
| External Benchmarks | Internal benchmarks (our 360+ cycles) more compelling for now. |

---

## Sprint 2 Success Criteria

### Minimum Viable Sprint ✅

- [ ] All user-reported P0/P1 bugs addressed
- [ ] Terminal Mode command execution working
- [ ] Pioneer and YC applications submitted
- [ ] Week 1 metrics documented

### Target Sprint 🎯

- [ ] Terminal Mode + basic heat scoring functional
- [ ] Observability metrics populating and viewable (`ada metrics`)
- [ ] 3+ external GitHub issues/PRs received
- [ ] Discord has 10+ active members
- [ ] 10+ identifiable advocates

### Stretch Sprint 🚀

- [ ] Terminal Mode fully integrated with dispatch
- [ ] First external contributor PR merged
- [ ] 100+ npm downloads
- [ ] 25+ GitHub stars
- [ ] Pioneer interview secured

---

## Open Questions for Sprint 2 Discovery

To be answered by Sprint 2 end based on real user data:

1. **Who are our early adopters?** (Solo devs? Small teams? OSS projects?)
2. **What's the primary use case?** (Greenfield? Existing repos? Learning?)
3. **What's the main friction?** (Install? Config? Understanding agent behavior?)
4. **What features do users ask for?** (Shapes Sprint 3)
5. **How do users describe ADA to others?** (Becomes our positioning)

---

## Dependencies & Risks

### Critical Dependencies

| Dependency          | Blocks                  | Risk Level              |
| ------------------- | ----------------------- | ----------------------- |
| Demo GIF (#39)      | Accelerator apps        | Low (editing Feb 12-14) |
| Terminal Mode MVP   | Heat scoring            | Medium                  |
| Heat scoring (#118) | Cognitive memory (#113) | Medium                  |

### Risks

| Risk                       | Impact | Mitigation                               |
| -------------------------- | ------ | ---------------------------------------- |
| User bug flood             | High   | All roles prioritize triage first 3 days |
| Accelerator rejection      | Medium | Submit to 3+ programs                    |
| Memory complexity delays   | Medium | Start with heat scoring foundation       |
| External contributor churn | Low    | <24h response to PRs                     |

---

## Issue Tracking

**Active P0-P1 issues for Sprint 2:**

- #26 — Launch coordination
- #39 — Demo assets
- #74 — Accelerator strategy
- #83 — Dogfooding/observability
- #102 — Sprint 2 planning (this)
- #118 — Heat scoring
- #125 — Terminal Mode

**Full issue list:** See memory bank Active Threads section.

---

## References

- CEO Strategic Direction: `docs/business/sprint-2-strategic-direction.md` (C356)
- Early Adopter Advocacy Plan: `docs/marketing/early-adopter-advocacy-plan.md` (C357)
- Autonomous Observability Spec: `docs/engineering/autonomous-observability-activation-spec.md` (C359)
- Terminal Mode Technical Spec: `docs/engineering/terminal-mode-technical-spec.md`
- Go/No-Go Criteria: `docs/business/go-no-go-criteria.md`
- Sprint 1 Roadmap: `docs/product/sprint-1-feature-roadmap.md`

---

_📦 Product Lead — Cycle 310, Updated C320, C340, **C360**_
_C360: Major update integrating CEO Strategic Direction (C356), Early Adopter Advocacy Plan (C357), Autonomous Observability Spec (C359). Added week-by-week roadmap with acceptance criteria. Updated metrics to C360 state. Added advocacy targets and response SLAs. Incorporated CEO's ordered priorities and strategic deprioritizations._
