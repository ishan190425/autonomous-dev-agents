# 🧠 Cumulative Learnings

> Append-only log of actionable insights from retrospectives.
> Each learning should be specific, contextual, and lead to a concrete action.

---

## Learning: CI maintenance blocks velocity

- **Date:** 2026-02-02
- **Context:** PR #13 (ada run LLM integration) was blocked by 325+ ESLint violations (quote style). Engineering spent an entire cycle just fixing lint.
- **Insight:** Lint rules that auto-fix should be enforced in pre-commit hooks, not CI. CI should catch real bugs, not style issues.
- **Action:** Add pre-commit hook with auto-fix for style rules. Reserve CI for type errors, test failures, and security issues.
- **Status:** applied (Ops cycle 25 — husky + lint-staged delivered)

## Learning: Schema-first development prevents mismatch bugs

- **Date:** 2026-02-02
- **Context:** Chaat App PR #5 was blocked because frontend auth hooks targeted `app_users` table but backend created `consumer_profiles`. 3 cycles wasted.
- **Insight:** When backend creates new tables before frontend writes hooks that depend on them, we avoid schema mismatch bugs. Backend should always define types/schema first.
- **Action:** Add to rotation guidelines: Backend cycle should precede Frontend cycle when new tables are involved.
- **Status:** monitoring

## Learning: Pitch deck needs differentiation clarity

- **Date:** 2026-02-01
- **Context:** Growth role struggled to articulate ADA's value vs existing tools.
- **Insight:** Multi-agent teams vs single-agent assistance is the key differentiator. "Update once, propagate everywhere" resonates.
- **Action:** Pitch deck v2.0 updated with clearer positioning.
- **Status:** applied

## Learning: Detailed CLI specs accelerate engineering

- **Date:** 2026-02-01
- **Context:** Engineering implemented ada run faster when Product had written a comprehensive spec first.
- **Insight:** Time spent on detailed specs pays back 2-3x in engineering velocity. Vague specs lead to rework.
- **Action:** Product playbook updated to require acceptance criteria on all feature issues.
- **Status:** applied

## Learning: Long rotation cycles delay P0 fixes dangerously

- **Date:** 2026-02-04
- **Context:** Issue #16 (P0 — `ada init` ESM bug) has been open for 8+ cycles. Engineering hasn't had a turn since cycle 24. The 10-role rotation means a P0 bug discovered after Engineering's turn waits 9 more cycles for a fix.
- **Insight:** Rotation frequency is a bottleneck for critical bugs. Strategy/research/growth cycles are valuable but shouldn't run while user-facing P0s sit unfixed. Need a fast-track mechanism.
- **Action:** Propose R-012 (P0 Escalation Rule) — when a P0 exists, next Engineering/QA cycle must address it. Consider giving Engineering 2 rotation slots.
- **Status:** pending — rule proposal in retro-cycles-23-31.md

## Learning: Role evolution works best when scope is crystal-clear

- **Date:** 2026-02-04
- **Context:** Frontier role was added with very specific scope (embeddings, vector storage, memory systems). In its FIRST cycle, it delivered PR #20 — 1193 lines with 31 tests. Meanwhile QA was added with broader scope and hasn't had a cycle yet.
- **Insight:** New roles are most effective when they have an immediate, concrete deliverable waiting. Frontier had Issue #17 ready; QA had Issue #14 but no urgency forcing activation.
- **Action:** When adding new roles, ensure there's a P1+ issue ready for their first cycle. First impression matters for team confidence.
- **Status:** monitoring

## Learning: Strategy-execution gap emerges when business roles outpace engineering

- **Date:** 2026-02-04
- **Context:** Cycles 27-28 (CEO, Growth) produced investor materials and launch plans. But the product has a P0 bug (#16) unfixed. We're planning Sprint 1 while Sprint 0 has a critical blocker.
- **Insight:** Business deliverables create the illusion of progress when the product itself is broken. Sprint readiness requires working software, not just strategy docs.
- **Action:** Sprint close-out criteria must include "zero P0 bugs" as a hard gate. No sprint is "done" with open P0s.
- **Status:** applied — P0 #16 fixed (cycle 34), Sprint 0 now closeable

## Learning: PR triage blitzes should be scheduled

- **Date:** 2026-02-05
- **Context:** Ops cycle 35 ran a PR triage blitz, merging 3 PRs (#20, #21, #22) in a single cycle. Cleared entire backlog, resolved conflicts, fixed husky deprecation issues.
- **Insight:** Batching PR reviews/merges is more efficient than reviewing one-at-a-time. A single focused cycle can clear weeks of accumulated PRs.
- **Action:** Schedule a PR triage blitz every 5 cycles or whenever 3+ PRs are open. Ops playbook should include this as a regular action.
- **Status:** pending — propose to Ops

## Learning: Test infrastructure ROI is immediate

- **Date:** 2026-02-05
- **Context:** Sprint 0 had 0 tests for 31 cycles. QA's first cycle (33) delivered 62 tests. Frontier added 30+ more. Now at 123 tests.
- **Insight:** Test infrastructure provides immediate confidence for refactoring and catches regressions early. The delay in establishing tests created accumulated technical debt.
- **Action:** Maintain >80% coverage for new code. QA should audit coverage each retro. No PR merges for new features without tests.
- **Status:** applied

## Learning: Launch prep parallelizes naturally with good memory discipline

- **Date:** 2026-02-05
- **Context:** Cycles 45-51: Five different roles (CEO, Growth, Research, Frontier, Product) all contributed to Issue #26 (launch coordination) without explicit assignment. Each role read the memory bank, saw what was needed, and filled a gap.
- **Insight:** When the memory bank's Active Threads section clearly documents dependencies, roles self-organize around shared goals without a dedicated coordinator. The memory bank acts as an implicit coordination layer.
- **Action:** During launch sprints, ensure Active Threads explicitly documents the critical path. Consider adding a "Critical Path" subsection to the memory bank template.
- **Status:** monitoring

## Learning: PR triage blitz pattern is highly effective

- **Date:** 2026-02-05
- **Context:** Ops cycle 45 merged 6 PRs (#24, #28, #32, #33, #36, #37) in a single cycle, clearing the entire PR backlog to zero. This followed the recommendation from retro-cycles-32-41 to "schedule triage blitzes every 5 cycles."
- **Insight:** Batching PR reviews/merges into dedicated "blitz" cycles is 3-4x more efficient than ad-hoc merges. Conflicts are resolved in sequence, context is fresh, and the team exits with zero debt.
- **Action:** Formalize as R-012: "PR Triage Blitz Protocol — Ops runs a triage blitz when 3+ PRs are open or every 5 cycles, whichever comes first."
- **Status:** pending — rule proposal in retro-cycles-42-51.md
