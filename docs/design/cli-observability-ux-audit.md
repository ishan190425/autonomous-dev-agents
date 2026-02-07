# CLI Observability UX Audit

> Design review of the `ada observe` and `ada costs` commands (PR #75).
> **Owner:** Design (🎨 The Architect) | **Cycle:** 135 | **Date:** 2026-02-07
> **Status:** Complete | **Rating:** ⭐⭐⭐⭐⭐ Production-Ready

---

## Overview

Observability Phase 1 shipped in Cycles 129-134:

- **Cycle 129:** Frontier implemented token counter foundation (`packages/core/src/observability.ts`)
- **Cycle 130:** Product wrote CLI spec (`docs/product/observability-cli-spec.md`)
- **Cycle 132:** QA fixed tests
- **Cycle 133:** Engineering implemented CLI commands (PR #75)
- **Cycle 134:** Ops merged PR #75

This audit evaluates the user-facing observability experience.

---

## Commands Reviewed

### 1. `ada observe` (Dashboard)

**Purpose:** Primary observability entry point. Shows cost, tokens, and health at a glance.

**UX Evaluation:**

| Criteria               | Rating     | Notes                                                  |
| ---------------------- | ---------- | ------------------------------------------------------ |
| Clarity                | ⭐⭐⭐⭐⭐ | Clear section headers (💰 COST, ⚡ TOKENS, 📈 HEALTH)  |
| Scannability           | ⭐⭐⭐⭐⭐ | Key metrics on left, values on right, easy to parse    |
| Progressive disclosure | ⭐⭐⭐⭐⭐ | Help text at bottom guides to detailed views           |
| Color usage            | ⭐⭐⭐⭐   | Green for costs, health color-coded (green/yellow/red) |
| Empty state            | ⭐⭐⭐⭐⭐ | Helpful guidance when no data exists                   |

**Strengths:**

- Dashboard layout is clean and information-dense without being overwhelming
- Health status uses color AND emoji (✅/⚠️/❌) for accessibility
- Success rate calculation is prominent with pass/fail counts
- "Today" cost is immediately visible (most common question: "what did this cost me today?")
- Duration formatting is intelligent (ms → s → m:s)

**Minor Observations:**

- Period display shows days accurately but could benefit from "today" special case
- Model name could be more prominent for multi-model setups (future)

---

### 2. `ada observe --by-role`

**Purpose:** Per-role cost breakdown for identifying expensive roles.

**UX Evaluation:**

| Criteria      | Rating     | Notes                                            |
| ------------- | ---------- | ------------------------------------------------ |
| Table layout  | ⭐⭐⭐⭐⭐ | Aligned columns, clear headers, proper spacing   |
| Sorting       | ⭐⭐⭐⭐⭐ | Sorted by cost descending (most expensive first) |
| Insights      | ⭐⭐⭐⭐⭐ | Proactive insight about expensive roles          |
| Role identity | ⭐⭐⭐⭐⭐ | Emoji + name for quick recognition               |
| Totals        | ⭐⭐⭐⭐⭐ | Summary row at bottom                            |

**Strengths:**

- Insight about expensive roles is genuinely useful (not just data, but guidance)
- "X% more tokens than average" is actionable
- Columns include both absolute and relative metrics (cycles, tokens, cost, avg/cycle)

**Observation:**

- Consider adding "efficiency" metric in Phase 2 (tokens per successful action)

---

### 3. `ada observe --cycle N`

**Purpose:** Detailed trace for debugging specific cycles.

**UX Evaluation:**

| Criteria        | Rating     | Notes                                 |
| --------------- | ---------- | ------------------------------------- |
| Phase breakdown | ⭐⭐⭐⭐⭐ | Shows token usage per dispatch phase  |
| Timing          | ⭐⭐⭐⭐⭐ | Start, end, duration clearly shown    |
| Status          | ⭐⭐⭐⭐⭐ | Success/fail with appropriate color   |
| Cost breakdown  | ⭐⭐⭐⭐⭐ | Input vs output cost split            |
| Error display   | ⭐⭐⭐⭐⭐ | Error message shown for failed cycles |

**Strengths:**

- Phase names are human-readable ("context_load" → "context load")
- Input/output split helps understand prompt efficiency
- Error handling shows the actual error message, not just "failed"
- Cost breakdown distinguishes input vs output pricing

**Excellent Design Decision:**

- The 8-phase breakdown matches DISPATCH.md exactly, making it easy to correlate
- Phase order is logical (context → awareness → selection → execution → memory → state)

---

### 4. `ada costs` (Quick Check)

**Purpose:** Fast cost summary without full dashboard.

**UX Evaluation:**

| Criteria         | Rating     | Notes                                       |
| ---------------- | ---------- | ------------------------------------------- |
| Speed to answer  | ⭐⭐⭐⭐⭐ | Shows today/week/total in 5 lines           |
| Common questions | ⭐⭐⭐⭐⭐ | Answers "what's this costing me?" instantly |
| Guidance         | ⭐⭐⭐⭐⭐ | Points to `ada observe` for more detail     |

**Strengths:**

- Perfect for quick checks ("how much today?")
- Week view is useful for weekly budgeting
- Model name shown so you know what you're paying for

**Design Principle Applied:**

- Progressive disclosure: simple → detailed
- This command exists because `ada observe` is "too much" for a quick check

---

### 5. `--json` Output

**Purpose:** Machine-readable output for scripting.

**UX Evaluation:**

| Criteria       | Rating     | Notes                      |
| -------------- | ---------- | -------------------------- |
| Completeness   | ⭐⭐⭐⭐⭐ | All data available in JSON |
| Structure      | ⭐⭐⭐⭐⭐ | Clean object hierarchy     |
| Error handling | ⭐⭐⭐⭐⭐ | Errors output as JSON too  |

**Strengths:**

- JSON mode works with all views (dashboard, by-role, cycle)
- Errors are JSON-formatted (not mixed text/JSON)
- Structure matches internal types for easy parsing

---

## Empty State Handling

**Scenario:** User runs `ada observe` before any cycles have run.

**Current Behavior:**

```
📊 No observability data collected yet.

Run `ada run` to execute dispatch cycles and collect metrics.
Metrics are stored in agents/state/metrics.json
```

**Evaluation:** ⭐⭐⭐⭐⭐

- Clear explanation of why there's no data
- Actionable guidance on what to do next
- Tells user where data will be stored
- Not an error, just information

---

## Error Handling

**Scenario:** User requests invalid cycle number.

**Current Behavior:**

```
❌ Cycle 999 not found in tracked metrics.
   Tracked range: cycles 50 to 134
```

**Evaluation:** ⭐⭐⭐⭐⭐

- Error is clear about what went wrong
- Shows valid range so user can correct
- Exit code is 1 (proper for scripts)

---

## Consistency with Existing CLI

| Pattern        | `ada observe`          | Other Commands       | Verdict       |
| -------------- | ---------------------- | -------------------- | ------------- |
| Progress emoji | 📊                     | 📋 status, 💾 memory | ✅ Consistent |
| Error prefix   | ❌                     | ❌ everywhere        | ✅ Consistent |
| Color usage    | chalk.green/red/yellow | Same palette         | ✅ Consistent |
| Box characters | Horizontal lines       | Same as status       | ✅ Consistent |
| Help text      | Gray at bottom         | Same pattern         | ✅ Consistent |
| JSON flag      | `--json`               | Same everywhere      | ✅ Consistent |

---

## Phase 2 Recommendations

These are captured in Issue #73 but warrant Design input:

### 1. `ada status` Integration (High Priority)

Add cost indicator to status output:

```
Health:        ✅ Healthy (98% success rate)
Cost Today:    $0.89 (21 cycles)
```

**Design Note:** Keep it to one line. Don't bloat status.

### 2. `--export <file>` (Medium Priority)

Support CSV and JSON file export:

```bash
ada observe --export metrics.csv
ada observe --export metrics.json
```

**Design Note:** Auto-detect format from extension. Don't require `--format` flag.

### 3. `--last N` Clarification (Low Priority)

The `--last` flag is defined but behavior is unclear in dashboard mode. Options:

- Show mini-table of last N cycles
- Filter metrics to only last N cycles
  **Design Recommendation:** Filter metrics (simpler, more useful)

---

## Phase 3+ Ideas (Future)

### Budget Alerts

```bash
ada config set budget-alert-daily 10.00
# → Warns when daily cost exceeds $10
```

**Design Note:** Should integrate with notification system (Issue #43)

### Model Comparison

```
💡 Tip: Switching to claude-4-haiku would reduce costs by ~65%.
   Run 'ada config set model claude-4-haiku' to change.
```

**Design Note:** Only show if savings are significant (>50%)

### Trend Indicators

```
Cost Today:    $0.89 (21 cycles) ↑ 12% vs yesterday
```

**Design Note:** Arrows for trends, percentage for context

---

## Demo Readiness

| Aspect             | Status   | Notes                              |
| ------------------ | -------- | ---------------------------------- |
| Core functionality | ✅ Ready | All Phase 1 commands work          |
| Visual polish      | ✅ Ready | Clean, professional output         |
| Error handling     | ✅ Ready | Graceful errors with guidance      |
| Edge cases         | ✅ Ready | Empty state, invalid input handled |
| Performance        | ✅ Ready | Fast (no network calls)            |

**Verdict:** Demo-ready. The observability CLI is a compelling feature to show in the Feb 8-9 demo.

---

## Overall Rating

| Category       | Rating     |
| -------------- | ---------- |
| Functionality  | ⭐⭐⭐⭐⭐ |
| Usability      | ⭐⭐⭐⭐⭐ |
| Consistency    | ⭐⭐⭐⭐⭐ |
| Error Handling | ⭐⭐⭐⭐⭐ |
| Visual Design  | ⭐⭐⭐⭐⭐ |

**Final Rating: ⭐⭐⭐⭐⭐ Production-Ready**

The observability CLI is excellent. Engineering followed the Product spec closely, and the result is intuitive, informative, and actionable. The progressive disclosure pattern (costs → observe → observe --by-role → observe --cycle N) is exactly right.

---

## Related

- **Issue #69:** Agent Observability (parent)
- **Issue #73:** CLI UX Polish (captures Phase 2+ improvements)
- **PR #75:** Observability CLI Implementation (merged Cycle 134)
- **docs/product/observability-cli-spec.md:** Product spec (Cycle 130)
- **docs/design/cli-shutdown-ux-audit.md:** Previous UX audit (Cycle 125)

---

_🎨 Design (The Architect) | Cycle 135_
