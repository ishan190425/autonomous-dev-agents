# Observability Phase 2 CLI Spec

> Product specification for Phase 2 CLI features building on Frontier's latency timer (PR #77).
> **Owner:** Product (📦 The PM) | **Cycle:** 140 | **Date:** 2026-02-07
> **Status:** Spec Ready | **Priority:** P1 for Sprint 1

---

## Overview

Phase 1 (Cycles 129-134) delivered the foundation:

- Token/cost tracking in core
- `ada observe` dashboard with `--by-role` and `--cycle N`
- `ada costs` quick check

Phase 2 extends observability with:

1. **Latency Timer CLI** — Expose PR #77's per-phase timing in CLI output
2. **`ada status` Integration** — Add cost indicator to existing status command
3. **`--export` Flag** — Export observability data to files
4. **`--last N` Behavior** — Filter metrics to recent cycles

This spec prioritizes the user's most common questions:

- "How fast was this cycle?" (latency)
- "What did I spend today?" (status integration)
- "Can I export this for my spreadsheet?" (export)

---

## Feature 1: Latency Timer CLI

### User Story

As a developer, I want to see how long each phase of a dispatch cycle takes so I can identify performance bottlenecks.

### Commands

#### `ada observe --cycle N` (enhanced)

Add latency breakdown to existing cycle view:

```
🔍 Cycle 140 Details
═══════════════════════════════════════════════════════

Role:       📦 Product (The PM)
Status:     ✅ Success
Started:    2026-02-07 12:47:00
Ended:      2026-02-07 12:47:45
Duration:   45.2s

⏱️  PHASE TIMING
────────────────────────────────────────────────────────
context_load      │  1.2s  ████░░░░░░░░░░░░░░░░░░  3%
situational       │  8.4s  ████████████░░░░░░░░░░░ 19%
selection         │  2.1s  █████░░░░░░░░░░░░░░░░░░  5%
execution         │ 28.3s  ██████████████████████░ 63%
memory_update     │  3.5s  ███████░░░░░░░░░░░░░░░░  8%
state_update      │  1.7s  ████░░░░░░░░░░░░░░░░░░░  4%
────────────────────────────────────────────────────────

💰 COST
────────────────────────────────────────────────────────
Input:      $0.023 (18,432 tokens)
Output:     $0.089 (2,847 tokens)
Total:      $0.112

📊 EFFICIENCY
────────────────────────────────────────────────────────
Throughput: 471 tokens/sec
Spend Rate: $8.93/hour (at this pace)
```

#### `ada observe --by-role` (enhanced)

Add average duration column:

```
📊 Cost by Role
═══════════════════════════════════════════════════════

Role                 │ Cycles │  Tokens │    Cost │ Avg Duration
─────────────────────┼────────┼─────────┼─────────┼─────────────
🌌 Frontier          │      3 │ 142,847 │   $1.43 │      52.3s
⚙️ Engineering       │      2 │  98,432 │   $0.98 │      41.7s
📦 Product           │      2 │  76,541 │   $0.77 │      38.2s
🔬 Research          │      2 │  71,234 │   $0.71 │      44.1s
🔍 QA                │      2 │  68,901 │   $0.69 │      35.6s
...

💡 Insight: 🌌 Frontier cycles are 29% longer than average.
   Execution phase takes 68% of cycle time (LLM calls).
```

#### `ada observe` (dashboard, enhanced)

Add latency summary to dashboard:

```
📊 Observability Dashboard
═══════════════════════════════════════════════════════

💰 COST
────────────────────────────────────────────────────────
Today:      $2.34 (21 cycles)
This Week:  $12.47 (89 cycles)
All Time:   $45.89 (140 cycles)

⚡ TOKENS
────────────────────────────────────────────────────────
Total:      4,234,567
Input:      3,892,101 (92%)
Output:        342,466 (8%)

⏱️  LATENCY
────────────────────────────────────────────────────────
Avg Cycle:  42.3s
Slowest:    Frontier (avg 52.3s)
Fastest:    Design (avg 31.2s)

📈 HEALTH
────────────────────────────────────────────────────────
Success:    ✅ 98% (137/140 cycles)
Efficiency: 487 tokens/sec

💡 Run 'ada observe --by-role' for cost breakdown
   Run 'ada observe --cycle N --latency' for phase timing
```

### Acceptance Criteria

- [ ] `ada observe --cycle N` shows phase timing breakdown when data available
- [ ] `ada observe --by-role` includes "Avg Duration" column
- [ ] `ada observe` dashboard shows latency summary section
- [ ] Visual progress bars for phase timing (percentage of total)
- [ ] `formatDuration()` used consistently (from PR #77)
- [ ] Graceful degradation if no latency data (Phase 1 cycles don't have it)
- [ ] JSON output includes all latency fields

---

## Feature 2: `ada status` Cost Integration

### User Story

As a developer, I want to see my cost at a glance in `ada status` so I don't have to run a separate command.

### Design

Add one line to existing status output (per Design audit Cycle 135):

```
📋 ADA Status
═══════════════════════════════════════════════════════

Team:       ADA (Autonomous Dev Agents)
Cycle:      140
Last Role:  📦 Product (The PM)
Next Role:  📋 Scrum (The Coordinator)
Last Run:   2026-02-07 12:47:45 (2 minutes ago)
Health:     ✅ Healthy (98% success rate)
Cost Today: $2.34 (21 cycles)              ← NEW

Memory:     89 lines (v6, due for compression at 141)
```

### Acceptance Criteria

- [ ] `ada status` shows "Cost Today" line with cycle count
- [ ] Cost is formatted consistently with `ada costs`
- [ ] If no cycles today, show "Cost Today: $0.00 (0 cycles)"
- [ ] JSON output includes `costToday` and `cyclesToday` fields
- [ ] No performance impact (uses same metrics file)

---

## Feature 3: `--export` Flag

### User Story

As a developer, I want to export observability data to a file for analysis in spreadsheets or other tools.

### Design

Support CSV and JSON export from any observe command:

```bash
# Export dashboard summary
ada observe --export metrics.json
ada observe --export metrics.csv

# Export by-role breakdown
ada observe --by-role --export role-costs.csv

# Export specific cycle
ada observe --cycle 140 --export cycle-140.json
```

File format auto-detected from extension:

- `.json` → JSON export
- `.csv` → CSV export (flattened for spreadsheets)
- Other → Error with guidance

### CSV Format Examples

**Dashboard export (`ada observe --export metrics.csv`):**

```csv
metric,value
cost_today,2.34
cost_week,12.47
cost_total,45.89
cycles_today,21
cycles_week,89
cycles_total,140
tokens_total,4234567
tokens_input,3892101
tokens_output,342466
success_rate,0.98
avg_cycle_duration_s,42.3
```

**By-role export (`ada observe --by-role --export roles.csv`):**

```csv
role,cycles,tokens,cost,avg_tokens_per_cycle,avg_duration_s
frontier,3,142847,1.43,47616,52.3
engineering,2,98432,0.98,49216,41.7
product,2,76541,0.77,38271,38.2
```

**Cycle export (`ada observe --cycle 140 --export cycle.csv`):**

```csv
phase,duration_s,tokens,cost,percentage
context_load,1.2,2341,0.02,3
situational,8.4,18432,0.18,19
selection,2.1,5432,0.05,5
execution,28.3,12847,0.09,63
memory_update,3.5,4321,0.04,8
state_update,1.7,2134,0.02,4
```

### Acceptance Criteria

- [ ] `--export <path>` works with all observe modes (dashboard, --by-role, --cycle N)
- [ ] JSON export includes all fields from --json output
- [ ] CSV export is flattened and spreadsheet-friendly
- [ ] Auto-detect format from file extension
- [ ] Error if extension not .json or .csv
- [ ] Creates parent directories if needed
- [ ] Prints confirmation: "Exported to metrics.csv (142 rows)"

---

## Feature 4: `--last N` Behavior

### User Story

As a developer, I want to see metrics for only the last N cycles so I can focus on recent performance.

### Design

Filter metrics to last N cycles across all modes:

```bash
# Dashboard for last 10 cycles only
ada observe --last 10

# By-role for last 20 cycles
ada observe --by-role --last 20

# Export last 50 cycles
ada observe --last 50 --export recent.csv
```

Output includes filter indicator:

```
📊 Observability Dashboard (last 10 cycles)
═══════════════════════════════════════════════════════
...
```

### Acceptance Criteria

- [ ] `--last N` filters all metrics to only include last N cycles
- [ ] Works with all modes (dashboard, --by-role, --cycle N is redundant)
- [ ] Output header shows "(last N cycles)" indicator
- [ ] JSON output includes `filter: { last: N }` field
- [ ] If N > total cycles, show all cycles (no error)
- [ ] Default is all cycles (no --last = no filter)

---

## Implementation Estimate

| Feature                  | Complexity | Cycles        |
| ------------------------ | ---------- | ------------- |
| Latency Timer CLI        | Medium     | 2             |
| `ada status` Integration | Low        | 1             |
| `--export` Flag          | Medium     | 2             |
| `--last N` Behavior      | Low        | 1             |
| **Total**                |            | **~6 cycles** |

### Recommended Order

1. `ada status` Integration (quick win, high visibility)
2. Latency Timer CLI (builds on PR #77, waiting for merge)
3. `--last N` Behavior (simple filter)
4. `--export` Flag (most complex, least urgent)

---

## Dependencies

- **PR #77 must merge first** — Latency timer infrastructure is prerequisite
- Core observability module already has all needed methods
- No new dependencies required
- Backward compatible with Phase 1 cycles (graceful degradation)

---

## Success Criteria

Phase 2 is complete when:

1. Users can see cycle latency breakdown per phase
2. `ada status` shows today's cost without running a separate command
3. Users can export observability data for external analysis
4. Users can filter to recent cycles for focused analysis

---

## Related

- **Issue #69:** Agent Observability (parent)
- **Issue #73:** CLI UX Polish (captures some of these items)
- **PR #77:** Latency Timer Infrastructure (Phase 2 core, awaiting merge)
- **docs/product/observability-cli-spec.md:** Phase 1 spec (Cycle 130)
- **docs/design/cli-observability-ux-audit.md:** Design review (Cycle 135)

---

_📦 Product (The PM) | Cycle 140_
