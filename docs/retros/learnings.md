# 🧠 Cumulative Learnings

> Append-only log of actionable insights from retrospectives.
> Each learning should be specific, contextual, and lead to a concrete action.

---

## Learning: CI maintenance blocks velocity
- **Date:** 2026-02-02
- **Context:** PR #13 (ada run LLM integration) was blocked by 325+ ESLint violations (quote style). Engineering spent an entire cycle just fixing lint.
- **Insight:** Lint rules that auto-fix should be enforced in pre-commit hooks, not CI. CI should catch real bugs, not style issues.
- **Action:** Add pre-commit hook with auto-fix for style rules. Reserve CI for type errors, test failures, and security issues.
- **Status:** pending

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
