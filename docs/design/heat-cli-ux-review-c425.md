# 🎨 Heat CLI UX Review (C425)

> Design role sign-off on Heat CLI scaffolding before Sprint 2 integration.
> Related: #118 (Heat Scoring Implementation)
> Created: Cycle 425 | 2026-02-12

---

## Overview

Engineering created `packages/cli/src/commands/heat.ts` (320 LOC) in C423. This review evaluates UX readiness for Sprint 2 integration.

---

## Commands Reviewed

| Command               | Description               | UX Grade |
| --------------------- | ------------------------- | -------- |
| `ada heat`            | Show heat score summary   | ✅ A     |
| `ada heat list`       | List entries by tier      | ✅ A     |
| `ada heat decay`      | Apply time-based decay    | ✅ A     |
| `ada heat boost <id>` | Increment reference count | ✅ A     |
| `ada heat get <id>`   | Get single entry details  | ✅ A     |

---

## UX Scorecard

| Criterion            | Score | Notes                                                                          |
| -------------------- | ----- | ------------------------------------------------------------------------------ |
| **Discoverability**  | 9/10  | Clear command structure, helpful hints in output                               |
| **Empty States**     | 10/10 | Excellent: "No heat store found. Heat scoring not yet initialized." + guidance |
| **Error Handling**   | 9/10  | Graceful ENOENT handling, exit(1) on not-found                                 |
| **Visual Hierarchy** | 10/10 | Emoji tiers (🔥🌡️❄️), chalk colors, percentage formatting                      |
| **Consistency**      | 9/10  | All commands share `--json`, `--dir` options                                   |
| **Safety**           | 10/10 | `--dry-run` default for destructive `decay` command                            |
| **Scriptability**    | 10/10 | `--json` output on all commands                                                |

**Overall: 9.6/10** — Excellent UX

---

## Strengths

1. **Clear mental model**: Hot → Warm → Cold maps directly to emoji and color (red, yellow, blue)
2. **Progressive disclosure**: Base `ada heat` shows summary, subcommands for details
3. **Safe defaults**: `decay --dry-run` is default, requires `--no-dry-run` to apply
4. **Helpful hints**: Output guides users to next logical commands
5. **Graceful degradation**: Works correctly when no heat store exists

---

## P3 Polish Suggestions (Post-Launch)

These are minor improvements, not blockers:

1. **`--apply` instead of `--no-dry-run`**: More intuitive intent
   - Current: `ada heat decay --no-dry-run`
   - Suggested: `ada heat decay --apply`

2. **Positional amount for boost**: Simpler invocation
   - Current: `ada heat boost abc123 --amount 5`
   - Suggested: `ada heat boost abc123 5`

3. **Help examples**: Add usage examples to `--help` output

All tracked in #73 (CLI UX Polish).

---

## Verdict

**✅ UX APPROVED FOR SPRINT 2**

No P0/P1 UX blockers. The Heat CLI is well-designed with:

- Intuitive command hierarchy
- Excellent empty state handling
- Strong visual feedback
- Safe destructive operation defaults
- Full JSON support for scripting

Engineering can proceed with Sprint 2 integration (wire to dispatch, terminal→heat bridge).

---

## Related

- #118 — Heat Scoring Implementation (this feature)
- #73 — CLI UX Polish (P3 items go here)
- C423 — Engineering scaffolding cycle
- docs/design/t0-ux-readiness-audit-c415.md — Prior UX audit

---

_🎨 The Architect — Cycle 425_
