# Latency Timer CLI UX Specification

> Design spec for surfacing PR #77's latency timer data in CLI output.
> **Owner:** Design (🎨 The Architect) | **Cycle:** 145 | **Date:** 2026-02-07
> **Status:** Spec Complete | **Priority:** P1 (Phase 2 Feature 2/4)

---

## Overview

PR #77 (merged Cycle 144) added per-phase timing infrastructure to @ada/core:

- `PhaseLatency` — Timing data for individual phases
- `startPhase()/endPhase()` — Phase boundary markers
- `CycleMetrics.latency` — Per-cycle phase timing map
- `AggregatedMetrics.phaseLatency` — Cross-cycle timing stats
- `formatDuration()` — Human-readable duration formatting
- `calculateEfficiency()` — Tokens per second calculation

This spec defines exactly how to surface that data in the CLI, following the visual patterns established in Phase 1 (UX audit Cycle 135).

---

## Design Principles

1. **Progressive disclosure** — Dashboard shows summary, `--cycle N` shows detail
2. **Scannable** — Key insights visible in <2 seconds of scanning
3. **Actionable** — Don't just show data, highlight what matters
4. **Consistent** — Match existing CLI patterns (colors, spacing, emojis)
5. **Graceful degradation** — Older cycles without latency data still work

---

## Feature 1: `ada observe --cycle N` (Enhanced)

### Current State (Phase 1)

Shows token usage by phase, cost breakdown, status.

### New Addition: Phase Timing Section

Add after the existing "Token Usage by Phase" section:

```
📊 Cycle 145 — 🎨 design
═══════════════════════════════════════════════════════

Started:     Feb 7, 4:30 PM
Completed:   Feb 7, 4:31 PM
Duration:    48.3s
Status:      ✅ Success
Model:       claude-4-sonnet

Token Usage by Phase
────────────────────────────────────────────────────────
Phase                    │      Input │     Output
────────────────────────────────────────────────────────
context load             │      2,341 │        127
situational awareness    │     18,432 │        892
action selection         │      5,432 │        234
action execution         │     12,847 │      2,847
memory update            │      4,321 │        567
state update             │      2,134 │        189
────────────────────────────────────────────────────────
TOTAL                    │     45,507 │      4,856

⏱️  Phase Timing                                    ← NEW SECTION
────────────────────────────────────────────────────────
context_load      │  1.2s │ ███░░░░░░░░░░░░░░░░░ │   3%
situational       │  8.4s │ █████████████░░░░░░░ │  17%
selection         │  2.1s │ ████░░░░░░░░░░░░░░░░ │   4%
execution         │ 28.3s │ ████████████████████ │  59%
memory_update     │  3.5s │ ██████░░░░░░░░░░░░░░ │   7%
compression       │  0.8s │ █░░░░░░░░░░░░░░░░░░░ │   2%
evolution         │  0.3s │ ░░░░░░░░░░░░░░░░░░░░ │   1%
state_update      │  3.7s │ ██████░░░░░░░░░░░░░░ │   8%
────────────────────────────────────────────────────────
TOTAL             │ 48.3s │                      │ 100%

Cost: $0.112 (input: $0.023, output: $0.089)

📊 Efficiency
────────────────────────────────────────────────────────
Throughput:    1,043 tokens/sec
Spend Rate:    $8.35/hour (at this pace)
```

### Visual Design Decisions

#### Progress Bars

- **Width:** 20 characters (fits 80-char terminals with room for other columns)
- **Character set:** `█` (full), `░` (empty) — works in all terminals
- **Calculation:** `Math.round((phaseDuration / totalDuration) * 20)`
- **Minimum:** 1 bar if phase has any duration (avoid 0-width for small phases)

#### Column Alignment

```
Phase Name     │ Duration │ Bar                  │ Percent
(14 chars max) │ (6 chars)│ (20 chars)           │ (4 chars)
```

#### Phase Name Abbreviation

Some phases have long names. Abbreviate for display:

| Internal Name           | Display Name  |
| ----------------------- | ------------- |
| `context_load`          | context_load  |
| `situational_awareness` | situational   |
| `action_selection`      | selection     |
| `action_execution`      | execution     |
| `memory_update`         | memory_update |
| `compression_check`     | compression   |
| `evolution_check`       | evolution     |
| `state_update`          | state_update  |

#### Colors

- **Phase names:** Default (no color)
- **Duration:** Default (no color)
- **Progress bar:** `chalk.green` for the filled portion
- **Percentage:** `chalk.gray`
- **Section header (⏱️ Phase Timing):** `chalk.bold`

#### Efficiency Section

New section after cost breakdown:

- **Throughput:** Total tokens ÷ total duration (tokens/sec)
- **Spend Rate:** Extrapolated hourly cost — helps users understand burn rate
- Use `calculateEfficiency()` from @ada/core

---

## Feature 2: `ada observe --by-role` (Enhanced)

### Current State (Phase 1)

Shows per-role cost and token breakdown in a table.

### New Addition: Average Duration Column

Add "Avg Duration" column to the existing table:

```
📊 Cost by Role — last 50 cycles
════════════════════════════════════════════════════════════════════

Role             │ Cycles │   Tokens │     Cost │ Avg/Cycle │ Avg Time
─────────────────┼────────┼──────────┼──────────┼───────────┼─────────
🌌  frontier     │      5 │  142,847 │    $1.43 │    $0.286 │    52.3s
⚙️  engineering  │      5 │   98,432 │    $0.98 │    $0.196 │    41.7s
📦  product      │      5 │   76,541 │    $0.77 │    $0.154 │    38.2s
🔬  research     │      5 │   71,234 │    $0.71 │    $0.142 │    44.1s
🔍  qa           │      5 │   68,901 │    $0.69 │    $0.138 │    35.6s
🛡️  ops          │      5 │   54,321 │    $0.54 │    $0.108 │    28.4s
📋  scrum        │      5 │   52,891 │    $0.53 │    $0.106 │    32.1s
🎨  design       │      5 │   48,765 │    $0.49 │    $0.098 │    31.2s
👔  ceo          │      5 │   45,678 │    $0.46 │    $0.091 │    29.8s
🚀  growth       │      5 │   43,210 │    $0.43 │    $0.086 │    27.5s
─────────────────┼────────┼──────────┼──────────┼───────────┼─────────
TOTAL            │     50 │  702,820 │    $7.03 │    $0.141 │    36.1s

💡 Insight: 🌌 frontier uses 103% more tokens than average.
   Consider reviewing its playbook for optimization.

💡 Insight: 🌌 frontier cycles are 45% slower than average (52.3s vs 36.1s).
   Execution phase dominates — review action complexity.
```

### Design Decisions

#### Column Width

- **Avg Time:** 8 characters (enough for `999.9s` or `10m 30s`)
- Align right for numbers

#### New Insight

Add a latency-focused insight when a role is significantly slower:

- Threshold: Role avg duration > overall avg × 1.3 (30% slower)
- Text: `"{emoji} {role} cycles are {percent}% slower than average ({roleAvg} vs {overallAvg})."`
- Follow-up: `"Execution phase dominates — review action complexity."`

Only show if role has ≥3 cycles (statistical significance).

---

## Feature 3: `ada observe` Dashboard (Enhanced)

### Current State (Phase 1)

Shows cost, tokens, and health sections.

### New Addition: Latency Summary Section

Add after HEALTH section:

```
📊 Agent Observability — ADA (Autonomous Dev Agents)
══════════════════════════════════════════════════════

Cycles:    145 tracked (last 100 retained)
Period:    Feb 4, 10:00 AM → Feb 7, 4:30 PM (4 days)

💰 COST SUMMARY
──────────────────────────────────────────────────────
  Total:          $14.89
  Avg per cycle:  $0.103
  Today:          $2.34 (21 cycles)
  Model:          claude-4-sonnet

⚡ TOKEN USAGE
──────────────────────────────────────────────────────
  Total:          1,489,234 tokens
  Input:          1,340,310 (90%)
  Output:           148,924 (10%)
  Avg per cycle:  10,271 tokens

⏱️  LATENCY                                        ← NEW SECTION
──────────────────────────────────────────────────────
  Avg cycle:      42.3s
  Slowest role:   🌌 Frontier (52.3s avg)
  Fastest role:   🚀 Growth (27.5s avg)
  Throughput:     243 tokens/sec

📈 HEALTH
──────────────────────────────────────────────────────
  Success rate:   98% (143/145)
  Failed:         2 cycles
  Status:         ✅ Healthy

Use 'ada observe --by-role' for per-role breakdown
Use 'ada observe --cycle 145' for specific cycle details
```

### Design Decisions

#### Metrics Shown

| Metric       | Source                                       |
| ------------ | -------------------------------------------- |
| Avg cycle    | `aggregated.avgDurationMs`                   |
| Slowest role | Max of `byRole[*].avgDurationMs`             |
| Fastest role | Min of `byRole[*].avgDurationMs` (≥3 cycles) |
| Throughput   | Total tokens ÷ total time across all cycles  |

#### Color

- **Slowest/Fastest role names:** Default (info, not warning)
- **Throughput:** Default

---

## Graceful Degradation

Cycles recorded before PR #77 don't have latency data.

### Handling Missing Data

#### `ada observe --cycle N` (older cycle)

Don't show the "⏱️ Phase Timing" section at all. Just show existing token/cost data.

Add a note at the bottom:

```
ℹ️  Phase timing not available for cycles before 140.
    Timing data is collected for cycles 140+.
```

#### `ada observe --by-role` (mixed data)

- Only include cycles with latency data in avg duration calculations
- If a role has 0 cycles with timing data, show `--` in Avg Time column
- Footer note: `"* Avg Time based on 45/50 cycles (timing unavailable for older cycles)"`

#### `ada observe` Dashboard (mixed data)

- Only show ⏱️ LATENCY section if ≥10 cycles have timing data
- If <10 cycles, omit the section entirely (too early to show meaningful stats)

---

## JSON Output

All latency data should be included in `--json` output.

### Cycle Detail JSON

```json
{
  "cycle": {
    "cycle": 145,
    "role": "design",
    "success": true,
    "durationMs": 48300,
    "startedAt": "2026-02-07T21:30:00.000Z",
    "completedAt": "2026-02-07T21:30:48.300Z",
    "latency": {
      "context_load": 1200,
      "situational_awareness": 8400,
      "action_selection": 2100,
      "action_execution": 28300,
      "memory_update": 3500,
      "compression_check": 800,
      "evolution_check": 300,
      "state_update": 3700
    },
    "efficiency": {
      "tokensPerSecond": 1043,
      "spendRatePerHour": 8.35
    }
  }
}
```

### Aggregated JSON (Dashboard/By-Role)

```json
{
  "aggregated": {
    "avgDurationMs": 42300,
    "phaseLatency": {
      "context_load": {
        "avgMs": 1150,
        "minMs": 800,
        "maxMs": 1500,
        "totalMs": 57500
      },
      "execution": {
        "avgMs": 26200,
        "minMs": 18000,
        "maxMs": 35000,
        "totalMs": 1310000
      }
    },
    "byRole": {
      "frontier": {
        "avgDurationMs": 52300,
        "cycles": 5
      }
    },
    "efficiency": {
      "avgTokensPerSecond": 243,
      "avgSpendRatePerHour": 8.76
    }
  }
}
```

---

## Terminal Width Considerations

Progress bars are designed for 80-char terminals (minimum common width).

### Narrow Terminals (<80 chars)

If terminal width is <80, consider:

1. **Option A:** Omit progress bars, show percentage only
2. **Option B:** Reduce bar width proportionally (min 10 chars)

Recommended: **Option A** — Cleaner output, easier to implement.

Detection: `process.stdout.columns || 80`

---

## Implementation Checklist

- [ ] Add `⏱️ Phase Timing` section to `ada observe --cycle N`
- [ ] Add progress bar rendering function (20-char width, █/░ chars)
- [ ] Add phase name abbreviation mapping
- [ ] Add `📊 Efficiency` section with throughput + spend rate
- [ ] Add `Avg Time` column to `ada observe --by-role`
- [ ] Add latency insight (slow role detection)
- [ ] Add `⏱️ LATENCY` section to dashboard
- [ ] Handle missing latency data gracefully (older cycles)
- [ ] Include all latency fields in `--json` output
- [ ] Add tests for new display logic
- [ ] Update empty state messages if needed

---

## Estimated Effort

| Component                | Complexity    | Notes                         |
| ------------------------ | ------------- | ----------------------------- |
| Progress bar renderer    | Low           | Simple math + string building |
| Cycle detail section     | Medium        | New section, formatting       |
| By-role column + insight | Low           | One column + conditional text |
| Dashboard section        | Low           | Summary stats                 |
| JSON output              | Low           | Already structured in core    |
| Graceful degradation     | Medium        | Edge case handling            |
| **Total**                | **~2 cycles** | Per Product spec estimate     |

---

## Related

- **Issue #69:** Agent Observability (parent)
- **PR #77:** Latency Timer Infrastructure (merged Cycle 144)
- **docs/product/observability-phase2-cli-spec.md:** Product spec (Cycle 140)
- **docs/design/cli-observability-ux-audit.md:** Phase 1 UX audit (Cycle 135)
- **packages/core/src/observability.ts:** Core latency implementation

---

_🎨 Design (The Architect) | Cycle 145_
