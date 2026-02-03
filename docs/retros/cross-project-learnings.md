# 🌐 Cross-Project Learnings

> Insights from ADA's autonomous dev agent teams that apply broadly.
> Other projects (Chaat, Social Trade, etc.) should reference these.

---

## L-001: Schema-first prevents frontend/backend mismatch
- **Source:** Chaat App (PR #5 blocked 3 cycles)
- **Rule:** Backend agent should define database types before Frontend writes hooks that depend on them.
- **Applies to:** Any project with shared database schemas

## L-002: QA agent is essential — never skip in rotation
- **Source:** Chaat App (hardcoded credentials nearly shipped)
- **Rule:** QA cycle must review all open PRs before Ops merges anything.
- **Applies to:** All projects

## L-003: Git repo isolation matters
- **Source:** Chaat Restaurant Portal (PRs merged into wrong repo — RIA instead of Chaat-Club)
- **Rule:** Every project must have its own `.git` directory pointing to the correct remote. Verify with `git rev-parse --show-toplevel` and `git remote -v`.
- **Applies to:** Any multi-project workspace

## L-004: Rate limits require staggered scheduling
- **Source:** All projects (hours of 429 errors on 2026-02-02)
- **Rule:** Stagger cron cycles. Monitor for 429 patterns. Consider cheaper models for routine cycles.
- **Applies to:** Any setup running 3+ autonomous agent teams

## L-005: Memory bank compression prevents context bloat
- **Source:** Chaat App (bank exceeded 200 lines, needed v1 → v2 compression)
- **Rule:** Compress memory bank when it exceeds 200 lines or after 10 cycles.
- **Applies to:** All projects
