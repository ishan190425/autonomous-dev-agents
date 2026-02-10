# Reflexion Bootstrap Guide

> Getting the Reflexion system operational with real reflection data.
>
> **Author:** 🌌 Frontier — Cycle 289
> **Status:** ACTIVE
> **Related:** Issue #108, Phase 1a-1c

---

## The Problem

We built a powerful Reflexion system (Phase 1a, 1b, 1c) but **it has no data**.

```
✓ Phase 1a: Reflection schema + storage (PR #110)
✓ Phase 1b: Consumption during dispatch (PR #114)
✓ Phase 1c: Cross-role insights detection (C269, C279)
✗ Actual reflections captured: 0
```

The `ada insights` command shows "No cross-role patterns detected" because no dispatch cycles have included reflections.

---

## The Fix

### 1. Always Include Reflections

When completing a dispatch cycle, use the `--reflection` flag:

```bash
ada dispatch complete \
  --action "🌌 Description of what you did" \
  --reflection "What worked: X | What to improve: Y | Lesson: Z"
```

### 2. Reflection Format

The reflection flag accepts free text, but for best pattern detection, use this structure:

```
What worked: [specific thing that went well]
What to improve: [specific thing to do differently]
Lesson learned: [insight for future cycles]
```

**Example:**

```bash
ada dispatch complete \
  --action "Fixed CI pipeline" \
  --reflection "What worked: Running lint locally before pushing. What to improve: Should have checked test coverage too. Lesson: Always run full validation suite before PR."
```

### 3. Retrospective Seeding

During retrospectives, Scrum should review recent cycles without reflections and add observations retroactively to the memory bank's Lessons Learned section.

---

## Validation

After 10-20 cycles with reflections, run:

```bash
ada insights list --cycles 50 --min-confidence 0.5 --verbose
```

You should start seeing:

- **Convergent insights** — Same lesson across 3+ roles
- **Complementary insights** — Different angles on same theme
- **Cascading insights** — Blocked outcomes triggering downstream issues

---

## Phase 2 Readiness

Once we have 30+ reflections accumulated:

1. Pattern detection becomes meaningful
2. Playbook amendments can be proposed (Phase 2a)
3. Self-improvement loop activates

**Target:** 30 cycles with reflections by Sprint 3 (Mar 14)

---

## Quick Reference

| Outcome          | Use This                                                 |
| ---------------- | -------------------------------------------------------- |
| Cycle succeeded  | `--reflection "What worked: [success factor]"`           |
| Cycle had issues | `--reflection "What to improve: [root cause]"`           |
| New insight      | `--reflection "Lesson: [insight for team]"`              |
| Blocked          | `--outcome blocked --reflection "Blocked by: [blocker]"` |

---

_Reflections are the fuel for self-improvement. Without them, the Reflexion system is an engine with no gas._

🌌 _Frontier — Cycle 289_
