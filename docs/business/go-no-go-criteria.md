# 🚦 v1.0-alpha Go/No-Go Decision Framework

> Decision criteria for the February 17, 2026 launch readiness review
> **Author:** CEO (👔 The Founder)
> **Date:** 2026-02-05
> **Decision Date:** February 17, 2026

---

## Executive Summary

This document establishes the concrete criteria for the v1.0-alpha launch Go/No-Go decision. The goal is transparency — anyone looking at this document should understand exactly what "launch ready" means.

**Philosophy:** We're shipping an alpha, not GA. The bar is "does it work and can developers use it" — not "is it perfect."

---

## MUST PASS Criteria (All 6 Required)

| #   | Criterion                    | Validation Method                                   | Owner   | Status |
| --- | ---------------------------- | --------------------------------------------------- | ------- | ------ |
| 1   | **npm package publishable**  | `npm pack` succeeds, tarball installs globally      | Ops     | 🔄     |
| 2   | **CI pipeline green**        | All GitHub Actions checks pass on main              | Ops     | ✅     |
| 3   | **Core commands functional** | `ada init` + `ada run` + `ada status` complete E2E  | QA      | ✅     |
| 4   | **README complete**          | Installation, quickstart, basic examples documented | Product | 🔄     |
| 5   | **Zero P0/P1 bugs**          | No launch-blocking issues in tracker                | All     | ✅     |
| 6   | **External validation**      | Demo repo successfully runs dispatch cycle          | Product | 🔄     |

### Validation Details

**1. npm package publishable**

- [ ] `npm pack` in packages/cli produces valid tarball
- [ ] `npm install -g <tarball>` works
- [ ] `ada --version` returns correct version
- [ ] `ada --help` shows all commands

**2. CI pipeline green**

- [x] Lint passes
- [x] TypeScript compiles
- [x] All 181 tests pass
- [ ] CI test job added (currently only lint/typecheck)

**3. Core commands functional**

- [x] `ada init` creates agents/ structure
- [x] `ada run` executes dispatch with LLM
- [x] `ada status` shows rotation state
- [ ] Error handling doesn't crash

**4. README complete**

- [ ] Installation section (npm install -g @ada/cli)
- [ ] Quickstart (init → run → status flow)
- [ ] Basic troubleshooting
- [ ] Link to full docs

**5. Zero P0/P1 bugs**

- [x] All P0/P1 issues closed or deprioritized
- [x] No critical bugs in core CLI flow
- Issue #38 (UX polish) is P2 — acceptable for alpha

**6. External validation**

- [ ] Demo repo (not ADA itself) successfully bootstrapped
- [ ] At least one dispatch cycle completes
- [ ] Output is coherent and useful

---

## SHOULD PASS Criteria (Soft Requirements)

| Criterion                 | Impact if Missing                        | Owner       | Status |
| ------------------------- | ---------------------------------------- | ----------- | ------ |
| CLI UX polish (Issue #38) | Minor friction, not blocking             | Engineering | 🔄     |
| Installation docs         | Users may struggle, README covers basics | Product     | 🔄     |
| Helpful error messages    | Bad UX but functional                    | Engineering | 🔄     |
| Demo GIF/video            | Harder to sell, not critical for alpha   | Growth      | 🔄     |

**Threshold:** 2 of 4 SHOULD items for full Go, remainder addressed in v1.0-alpha.2

---

## BLOCKERS (Any = Automatic No-Go)

1. npm publish fails completely (package corruption, registry issues)
2. Core commands crash on fresh install (init/run/status)
3. Zero external validation possible (template bugs prevent any use)
4. Critical security vulnerability discovered

---

## Decision Matrix

| MUST    | SHOULD | Decision                                            |
| ------- | ------ | --------------------------------------------------- |
| 6/6 ✅  | 3-4 ✅ | **GO** — Full speed launch Feb 24                   |
| 6/6 ✅  | 2 ✅   | **GO** — Launch with documented gaps                |
| 6/6 ✅  | 0-1 ✅ | **CONDITIONAL GO** — 48hr fix sprint, launch Feb 26 |
| 5/6 ✅  | Any    | **NO-GO** — Delay to Feb 28, address gap            |
| <5/6 ✅ | Any    | **NO-GO** — Reassess timeline entirely              |

---

## Current Assessment (Feb 5)

### MUST Criteria Status

| #   | Status | Notes                                  |
| --- | ------ | -------------------------------------- |
| 1   | 🔄     | Ops working on npm pipeline            |
| 2   | ✅     | CI passes, need test job addition      |
| 3   | ✅     | All core commands work, 181 tests      |
| 4   | 🔄     | README needs expansion                 |
| 5   | ✅     | All P1s completed (Issue #35 → PR #37) |
| 6   | 🔄     | Need to validate demo repo             |

**Current: 3/6 confirmed, 3/6 in progress**

### Risk Assessment

- **npm pipeline:** Low risk — straightforward, Ops has capacity
- **README:** Low risk — Product's next priority
- **Demo repo:** Medium risk — needs external validation time
- **CI test job:** Low risk — tests exist, just need job config

### Confidence Level

**85% confident in GO decision** — all in-progress items are tractable with no technical blockers.

---

## Timeline to Decision

| Date       | Milestone                                       |
| ---------- | ----------------------------------------------- |
| Feb 5-10   | Ops: npm pipeline, Product: README draft        |
| Feb 10-14  | Sprint 0 close-out, all MUST criteria validated |
| Feb 14     | Sprint 1 officially begins                      |
| Feb 15-16  | Final validation of all criteria                |
| **Feb 17** | **Go/No-Go review — CEO decision**              |
| Feb 17-21  | Final polish sprint (SHOULD items)              |
| Feb 21     | Soft launch prep (drafts, dry-run)              |
| **Feb 24** | **Launch day**                                  |

---

## Post-Decision Actions

### If GO

1. Confirm launch sequence with all roles
2. Growth: finalize announcements
3. Ops: npm publish credentials ready
4. Product: monitoring plan for user feedback

### If NO-GO

1. Document specific blocker(s)
2. Assign owner and timeline for fix
3. Set new Go/No-Go date (likely Feb 21)
4. Communicate delay internally

---

## Appendix: What "Alpha" Means

For clarity, v1.0-alpha expectations:

**Alpha IS:**

- Functional core features (init, run, status)
- Installable via npm
- Usable by technical early adopters
- Expected to have rough edges

**Alpha IS NOT:**

- Polished consumer product
- Comprehensive documentation
- Enterprise-ready
- Bug-free

The goal is to get ADA in developers' hands for real-world feedback. Polish comes in alpha.2 and beta.

---

_👔 CEO | Cycle 47 | Go/No-Go Framework v1.0_
