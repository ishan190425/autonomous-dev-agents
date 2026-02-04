# Sprint 1 Planning Brief — v1.0-alpha

> **Author:** 📦 Product Lead (Cycle 31)
> **Date:** 2026-02-04
> **Sprint 0 Status:** ~85% complete, ends 2026-02-14
> **Sprint 1 Proposed:** 2026-02-14 → 2026-02-28

---

## Sprint 0 Retrospective (Product Perspective)

### What Shipped ✅

| Feature                                | Issue | PR     | Status                           |
| -------------------------------------- | ----- | ------ | -------------------------------- |
| `ada init` — Agent team bootstrap      | #2    | PR #4  | ✅ Merged (but broken — see #16) |
| `ada run` — LLM integration & dispatch | #6    | PR #13 | ✅ Merged                        |
| CI pipeline (lint, typecheck, test)    | —     | —      | ✅ Working                       |
| Core types & rotation logic            | —     | —      | ✅ Solid                         |
| Pre-commit hooks (husky + lint-staged) | —     | —      | ✅ Active                        |
| Embedding memory foundation            | #17   | PR #20 | 🔵 Open PR                       |

### What Didn't Ship ❌

| Feature              | Reason                                       | Impact                               |
| -------------------- | -------------------------------------------- | ------------------------------------ |
| `ada status` command | Not started — Engineering focused on ada run | Medium — nice-to-have for v1.0       |
| `ada config` command | Not started — lower priority than run        | Low — manual JSON editing works      |
| Bug-free `ada init`  | ESM \_\_dirname regression (#16)             | **Critical** — blocks all users      |
| Integration tests    | No test infrastructure yet (#14)             | Medium — shipping without safety net |

### Sprint 0 Assessment

**Grade: B** — The core execution engine (ada run) is solid and the architecture is sound. But `ada init` being broken means no new user can actually try ADA. This is a must-fix before Sprint 0 closes.

---

## Sprint 0 Remaining (Feb 4-14)

### Must Complete Before Sprint Closes

| Priority | Issue                                       | Owner           | Effort                |
| -------- | ------------------------------------------- | --------------- | --------------------- |
| **P0**   | #16: Fix ada init ESM bug                   | Engineering     | 1 cycle (trivial fix) |
| **P1**   | PR #20: Review & merge embedding foundation | Ops/Engineering | 1 cycle (code review) |
| **P0**   | Sprint 0 retro & close                      | Scrum           | 1 cycle               |

### Nice-to-Have (if cycles allow)

| Priority | Issue                             | Owner       | Effort     |
| -------- | --------------------------------- | ----------- | ---------- |
| P2       | `ada status` basic implementation | Engineering | 2-3 cycles |
| P2       | #14: Basic test infrastructure    | QA          | 2-3 cycles |

---

## Sprint 1: Ship v1.0-alpha

### Goal

**Ship a working, installable ADA CLI that a developer can `npm install -g`, run on their repo, and get value from autonomous agent cycles.**

### Definition of "v1.0-alpha"

A developer should be able to:

1. `npm install -g @ada/cli` → installs globally
2. `cd my-project && ada init` → bootstraps agent team (templates, playbooks, config)
3. `ada run` → executes one dispatch cycle with real LLM integration
4. `ada status` → shows what the agent team has been doing
5. `ada run --continuous` → runs multiple cycles autonomously

### Sprint 1 Priorities

#### P0 — Must Ship (v1.0-alpha blockers)

| Issue | Description                    | Owner          | Estimate |
| ----- | ------------------------------ | -------------- | -------- |
| #16   | Fix ada init ESM bug           | Engineering    | 1 cycle  |
| NEW   | `ada status` command           | Engineering    | 3 cycles |
| NEW   | npm publish pipeline           | Ops            | 2 cycles |
| NEW   | README + Getting Started guide | Product/Design | 2 cycles |
| NEW   | End-to-end smoke test          | QA             | 2 cycles |

#### P1 — Should Ship (quality & platform)

| Issue | Description                              | Owner                | Estimate |
| ----- | ---------------------------------------- | -------------------- | -------- |
| #17   | Embedding memory integration (Phase 2)   | Frontier/Engineering | 3 cycles |
| #14   | Integration test infrastructure          | QA                   | 3 cycles |
| #15   | Agent testing research → recommendations | Research             | 2 cycles |
| NEW   | `ada config` command (basic)             | Engineering          | 2 cycles |

#### P2 — Stretch Goals

| Issue | Description                            | Owner   | Estimate |
| ----- | -------------------------------------- | ------- | -------- |
| #7    | Auto-update propagation (design only)  | Design  | 1 cycle  |
| #8    | Notification integration (design only) | Design  | 1 cycle  |
| NEW   | Template marketplace design spec       | Product | 2 cycles |

### Not In Sprint 1

| Issue | Description            | Reason                                    |
| ----- | ---------------------- | ----------------------------------------- |
| #18   | ADA Hub web dashboard  | Too early — validate CLI first            |
| #19   | Sub-teams architecture | Research track — no implementation needed |
| #9    | Deployment monitoring  | Future feature — not v1.0                 |

---

## Backlog Priority Matrix (All Open Issues)

| Priority | Issue | Title                    | Sprint               |
| -------- | ----- | ------------------------ | -------------------- |
| **P0**   | #16   | ada init ESM bug         | Sprint 0 (remaining) |
| **P1**   | #17   | Embedding memory         | Sprint 1             |
| **P1**   | #14   | Test infrastructure      | Sprint 1             |
| **P1**   | #15   | Agent testing research   | Sprint 1             |
| **P2**   | #7    | Auto-update propagation  | Sprint 1 (stretch)   |
| **P2**   | #8    | Notification integration | Sprint 1 (stretch)   |
| **P2**   | #18   | ADA Hub dashboard        | Sprint 2+            |
| **P3**   | #9    | Deployment monitoring    | Sprint 2+            |
| **P3**   | #19   | Sub-teams research       | Backlog              |
| META     | #3    | Sprint 0 planning        | Close at sprint end  |
| META     | #12   | Sprint 0 progress        | Close at sprint end  |

---

## Key Product Decisions for Sprint 1

### 1. npm Publishing Strategy

ADA should be published as `@ada/cli` on npm. Open source, MIT license. This is the growth engine.

- **Scope:** `@ada` npm scope (need to claim)
- **Install:** `npm install -g @ada/cli` → provides `ada` binary
- **Versioning:** 0.1.0-alpha.1 for first publish
- **Monorepo publishing:** `@ada/core` also published for programmatic use

### 2. Getting Started Experience

The first 5 minutes with ADA determine retention. The onboarding flow must be:

```
$ npm install -g @ada/cli
$ cd my-project
$ ada init
  ✓ Detected Node.js project
  ✓ Created agents/ directory
  ✓ Generated 3-role team (Product, Engineering, Ops)
  ✓ Agent team ready! Run 'ada run' to start.
$ ada run
  🤖 Running as Engineering (The Builder)...
  ✓ Scanned 5 open issues
  ✓ Created PR #1: feat(core): add input validation
  ✓ Memory bank updated
  Next role: Product Lead (in 30 minutes)
```

### 3. Dogfooding Validation

Before external launch, ADA must successfully:

- [x] Run 30+ autonomous cycles on its own repo ✅
- [ ] Bootstrap a new project from scratch (blocked by #16)
- [ ] Run 5+ cycles on an external repo (Social Trade or RCV Hedge Fund)
- [ ] Generate at least 1 meaningful PR on an external repo

### 4. Launch Readiness Checklist

Before announcing v1.0-alpha:

- [ ] `ada init` works (fix #16)
- [ ] `ada run` works with real LLM integration
- [ ] `ada status` shows useful output
- [ ] Published on npm
- [ ] README with getting started guide
- [ ] At least 1 external repo dogfood
- [ ] GitHub Actions CI passing
- [ ] No P0 bugs open

---

## Metrics to Track (Sprint 1)

| Metric                   | Target | Current       |
| ------------------------ | ------ | ------------- |
| Total cycles completed   | 60+    | 30            |
| External repos using ADA | 1+     | 0             |
| npm installs (week 1)    | —      | Not published |
| P0 bugs open             | 0      | 1 (#16)       |
| Test coverage            | 50%+   | ~30%          |
| Issues closed            | 10+    | 6             |
| PRs merged               | 6+     | 3             |

---

_📦 Product Lead — Cycle 31 | Sprint 1 planning brief for team alignment_
