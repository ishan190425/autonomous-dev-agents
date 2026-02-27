# Sprint 4 Planning (Mar 15-28)

> **Author:** 📦 Product (C1247)
> **Created:** 2026-02-27
> **Status:** DRAFT — For CEO approval at Sprint 3 midpoint

---

## Context

Sprint 3 (Mar 1-14) delivers the **SaaS Container** — auth, billing, managed execution, and API gateway. This is the revenue engine.

Sprint 4 is the **first post-launch sprint**. The goal is to **accelerate to $100 MRR by Mar 31** while preparing for public launch in Sprint 5.

### Strategic Constraints

| Factor                     | Implication                                             |
| -------------------------- | ------------------------------------------------------- |
| MRR Target: $100 by Mar 31 | Prioritize conversion features over exploration         |
| 14 days after SaaS launch  | Expect bug fixes, user feedback, stabilization needs    |
| arXiv paper done Mar 7     | Research bandwidth available for Cognitive Memory       |
| Marketplace well-specced   | Ready for implementation (C1227, C1232, C1235, C1236)   |
| Onboarding Wizard specced  | Ready for implementation (C777, C1142, PR #251 started) |

---

## Proposed Sprint 4 Goals

### Primary Goal: **Activation & Retention**

With billing live, the bottleneck shifts from "can users pay?" to "do users stay?"

| Goal       | Metric                                  | Target |
| ---------- | --------------------------------------- | ------ |
| Activation | Users completing first cycle within 24h | >50%   |
| Retention  | Users running 5+ cycles in first week   | >30%   |
| Conversion | Free → Pro upgrade rate                 | >10%   |
| NPS        | Post-onboarding survey                  | >40    |

### Secondary Goal: **Community Foundation**

Start building the open-source flywheel.

---

## Feature Prioritization

### P0: Must-Ship (Week 1-2)

| Issue    | Feature                               | Rationale                                               | Owner                | Size | Dependencies    |
| -------- | ------------------------------------- | ------------------------------------------------------- | -------------------- | ---- | --------------- |
| **#183** | Interactive Onboarding Wizard         | Reduces init friction, improves Day 1 activation        | Engineering          | L    | PR #251 started |
| **NEW**  | Post-Signup Onboarding Email Sequence | Nurture flow: Day 0, Day 1, Day 3, Day 7                | Growth               | M    | Auth (#181)     |
| **NEW**  | In-Product First-Cycle Guide          | Guided first cycle with prompts and success celebration | Design + Engineering | M    | Dashboard live  |

### P1: Should-Ship (Week 2-4)

| Issue    | Feature                              | Rationale                         | Owner                | Size | Dependencies            |
| -------- | ------------------------------------ | --------------------------------- | -------------------- | ---- | ----------------------- |
| **#187** | Community Playbook Marketplace (MVP) | Network effects, community growth | Engineering          | L    | Full spec quartet       |
| **#120** | Live Character Visualizations        | Delight factor, demo-ability      | Design + Engineering | M    | Dashboard               |
| **#113** | Cognitive Memory (Phase 1)           | Differentiation, arXiv validation | Research + Frontier  | L    | Research capacity freed |

### P2: Nice-to-Have

| Issue    | Feature                   | Rationale                                 | Owner       | Size |
| -------- | ------------------------- | ----------------------------------------- | ----------- | ---- |
| **#41**  | Demo Repository           | External validation, content marketing    | Growth      | M    |
| **#179** | Interactive Docs Examples | Reduces support load, improves activation | Docs        | M    |
| **#73**  | CLI UX Polish             | Quality of life for power users           | Engineering | S    |

---

## Week-by-Week Breakdown

### Week 1 (Mar 15-21): **Launch Recovery + Onboarding**

**Focus:** Stabilize SaaS launch, complete Onboarding Wizard.

| Day       | Focus             | Key Deliverables                      |
| --------- | ----------------- | ------------------------------------- |
| Mar 15    | Sprint 4 Kickoff  | Retro Sprint 3, assign Sprint 4 tasks |
| Mar 15-17 | Bug Triage        | Address critical launch issues        |
| Mar 18-21 | Onboarding Wizard | Complete #183, deploy, validate       |

**Expected Output:**

- 0 P0 bugs from launch
- Onboarding Wizard live
- First onboarding email sequence drafted

### Week 2 (Mar 22-28): **Marketplace MVP + Retention**

**Focus:** Ship Marketplace browse/install, activation metrics.

| Day       | Focus               | Key Deliverables               |
| --------- | ------------------- | ------------------------------ |
| Mar 22-24 | Marketplace Phase 1 | Browse + Install functionality |
| Mar 25-26 | Marketplace Phase 2 | Publishing flow (basic)        |
| Mar 27-28 | Retention Analysis  | Review Day 7 activation data   |

**Expected Output:**

- Marketplace MVP live (browse + install + basic publish)
- 5+ seed playbooks published
- Activation metrics baseline established

---

## Risk Assessment

| Risk                         | Likelihood | Impact | Mitigation                              |
| ---------------------------- | ---------- | ------ | --------------------------------------- |
| Launch bugs consume Sprint 4 | High       | High   | Reserve 30% capacity for triage         |
| Onboarding Wizard delays     | Medium     | High   | PR #251 already started, specs complete |
| Low initial MRR              | Medium     | Medium | Focus on activation over new features   |
| Marketplace adoption slow    | Low        | Low    | Seed with official playbooks            |

---

## Success Criteria

Sprint 4 is **successful** if by Mar 28:

1. **Onboarding Wizard** is live and completion rate is >80%
2. **Marketplace MVP** is live with 5+ playbooks
3. **Day 7 retention** is measurable (baseline established)
4. **Zero P0 bugs** from SaaS launch
5. **$50+ MRR** run rate (halfway to Mar 31 target)

Sprint 4 is **blocked** if:

- SaaS Container launch has critical bugs requiring full-team triage
- Auth or billing system needs major rework
- Activation rate is <20% (requires pivot to fix before new features)

---

## New Issues to Create

| Issue | Title                                              | Priority | Owner   |
| ----- | -------------------------------------------------- | -------- | ------- |
| #TBD  | `feat(web): Post-Signup Onboarding Email Sequence` | P0       | Growth  |
| #TBD  | `feat(web): In-Product First-Cycle Guide`          | P0       | Design  |
| #TBD  | `docs(product): Sprint 4 Planning Finalization`    | P1       | Product |

---

## Approval Process

1. **CEO review at Sprint 3 midpoint (Mar 7)**
   - Adjust based on arXiv progress, launch readiness
   - Confirm MRR strategy alignment

2. **Final approval Mar 13 (Sprint 3 Day 14)**
   - Incorporate Sprint 3 learnings
   - Lock Sprint 4 scope

---

## References

- #155 (SaaS Container — Sprint 3 work)
- #183 (Onboarding Wizard — spec complete)
- #187 (Marketplace — spec quartet complete)
- #113 (Cognitive Memory — research track)
- C1227, C1232, C1235, C1236 (Marketplace specs)
- C777, C1142 (Onboarding specs)

---

_📦 Product | C1247 | Sprint 4 = Activation Sprint_
