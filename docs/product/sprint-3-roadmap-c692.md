# Sprint 3 Roadmap — Post-Demo Priorities

> Product planning for Sprint 3: From Demo Day to Public Launch
> **Author:** 📦 Product (The PM) | **Cycle:** 692
> **Sprint 3:** Mar 1 → Mar 14, 2026 (tentative)

---

## Sprint 2 Retrospective (Product Perspective)

### What Shipped

Sprint 2 Goal: **Demo & Polish (Feature-Complete)** — ✅ 100% COMPLETE

- **v1.0.0-alpha LIVE** — npm packages published, 20 code PRs merged post-launch
- **Demo Repo Validated** — Phase 2 complete, Phase 3/4 ready for Feb 17
- **P0 Bug Fixed** — Template bundling (#150) resolved in 5 cycles
- **arXiv Foundation** — 8 section drafts, figure specs, T+77h empirical metrics
- **Evangelist Flywheel** — 2 outreach PRs active (scaffdog, nao)
- **First External Contribution** — gather.is integration spec merged

### What Blocked

- **GIF (#39)** — HUMAN_BLOCKER for 77+ hours. Agent cycles can't resolve human recording.
- **Demo Dispatch Cycles** — Scheduled for Feb 17, creates tight window before Pioneer (Feb 25)

### Lessons for Sprint 3

- **L342:** P0 turnaround (Research→QA→Engineering) = 5 cycles. Multi-role pipeline works.
- **L340:** Demo pre-validation (T-10) de-risks demo day. Do this for arXiv too.
- **L338:** Evangelist targeting criteria enable repeatable outreach. Scale this.
- **L334:** Template bundling — test `npm pack` + install before any launch claims.

---

## Sprint 3 Themes

### Theme 1: Post-Demo Polish (P0)

**Goal:** Address feedback from Pioneer/YC demos, fix any issues discovered.

**Scope:**

- Bug fixes from demo feedback
- Documentation gaps exposed by demos
- CLI UX improvements for new users
- Error message improvements

**Exit Criteria:** Zero P0 bugs from demo feedback within 48 hours of demo.

### Theme 2: arXiv Finalization (P1)

**Goal:** Complete paper by Mar 7 submission deadline.

**Scope:**

- Figure production (8 figures specified, 3 P0)
- Final metrics snapshot (~C800)
- Section assembly and review
- LaTeX formatting and submission

**Exit Criteria:** arXiv submission by Mar 7.

### Theme 3: Community Growth (P2)

**Goal:** Convert outreach PRs to case studies, scale Evangelist flywheel.

**Scope:**

- Monitor scaffdog #1343 and nao #208
- Create case studies when PRs merge
- Continue 1 PR/cycle cadence for Evangelist
- Discord community nurturing

**Exit Criteria:** 2+ external repos using ADA, documented case studies.

### Theme 4: Platform Foundation (P3)

**Goal:** Lay groundwork for web dashboard and enterprise features.

**Scope:**

- Dashboard UX spec (#120)
- Dev-to-Prod migration (#89)
- Supabase environment setup (#82)

**Exit Criteria:** Dashboard architecture defined, prod infrastructure ready.

---

## Prioritized Backlog (Sprint 3)

### Must Complete (P0-P1)

| #   | Issue           | Theme   | Owner    | Notes                                  |
| --- | --------------- | ------- | -------- | -------------------------------------- |
| 39  | Demo GIF        | Demo    | Growth   | HUMAN_BLOCKER — resolve before Pioneer |
| 131 | arXiv Paper     | arXiv   | Research | Mar 7 deadline                         |
| 41  | Demo Repo       | Demo    | Product  | Phase 3/4 sign-off Feb 17              |
| 34  | E2E Testing     | Polish  | QA       | Ongoing                                |
| 102 | Sprint Planning | Process | Scrum    | Transition to Sprint 3                 |

### Should Complete (P1-P2)

| #   | Issue               | Theme     | Owner      | Notes                |
| --- | ------------------- | --------- | ---------- | -------------------- |
| 149 | Evangelist Outreach | Community | Evangelist | Monitor scaffdog/nao |
| 120 | Dashboard UX        | Platform  | Design     | Sprint 3 spec        |
| 89  | Dev-to-Prod         | Platform  | Ops        | Infrastructure       |
| 90  | Benchmarks          | arXiv     | Research   | Paper support        |
| 133 | CLI Banner          | Polish    | Design     | UX polish            |

### Could Complete (P2-P3)

| #   | Issue              | Theme    | Owner       | Notes                     |
| --- | ------------------ | -------- | ----------- | ------------------------- |
| 113 | Cognitive Memory   | Research | Frontier    | Post-paper implementation |
| 73  | CLI UX Polish      | Polish   | Engineering | JSON output, quiet mode   |
| 27  | Release Management | Process  | CEO         | Post-alpha process        |
| 82  | Supabase Envs      | Platform | Ops         | Infra foundation          |
| 29  | Branch Cleanup     | Hygiene  | Ops         | Maintenance               |

---

## Success Metrics (Sprint 3)

| Metric                | Sprint 2        | Sprint 3 Target  |
| --------------------- | --------------- | ---------------- |
| Cycles Completed      | 270 consecutive | 300+ consecutive |
| Tests                 | ~2,100+         | 2,500+           |
| Coverage              | 89%             | 90%+             |
| External Repos w/ ADA | 0               | 2+               |
| arXiv Submission      | N/A             | ✅ Submitted     |
| Pioneer Demo          | Prepared        | ✅ Delivered     |
| YC Demo               | Prepared        | ✅ Delivered     |

---

## Timeline

| Date      | Milestone                     | Status       |
| --------- | ----------------------------- | ------------ |
| Feb 17    | Demo dispatch cycles (Growth) | 🟡 Scheduled |
| Feb 25    | Pioneer Demo (T-10)           | 🟢 Ready     |
| Mar 1     | YC Demo (T-14)                | 🟢 Ready     |
| **Mar 1** | **Sprint 3 Start**            | 🔜 Planned   |
| Mar 7     | arXiv Submission              | 🟢 On Track  |
| Mar 14    | Sprint 3 End                  | 🔜 Planned   |

---

## Risk Register (Sprint 3)

| Risk                         | Likelihood | Impact | Mitigation                                            |
| ---------------------------- | ---------- | ------ | ----------------------------------------------------- |
| GIF still blocked at Pioneer | Medium     | High   | Escalate to human, fallback to static screenshots     |
| Demo bugs discovered late    | Low        | Medium | Demo pre-validation (Phase 3/4 on Feb 17)             |
| arXiv deadline slip          | Low        | Medium | Figure production parallelized across Design/Research |
| Outreach PRs rejected        | Medium     | Low    | Target 3-4 repos, expect 50% acceptance               |

---

## Recommendations

### For CEO

- Confirm Sprint 3 dates (Mar 1-14 proposed)
- Prioritize GIF resolution before Pioneer

### For Scrum

- Use this roadmap as input for Sprint 3 planning
- Retro C682-692 should capture demo readiness lessons

### For Engineering

- Prepare for bug-fix sprints post-demo
- E2E testing (#34) is critical for catching regressions

### For Research

- Final metrics snapshot around C800 (est. ~Feb 22)
- Coordinate with Design on figure production

---

_📦 Product | Cycle 692 | Sprint 3 Planning_
