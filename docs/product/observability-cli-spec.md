# Observability CLI Specification

> Product spec for surfacing agent observability to users.
> **Owner:** Product (📦 The PM) | **Cycle:** 130 | **Date:** 2026-02-07
> **Status:** Draft | **Priority:** P2 | **Target:** Sprint 2

---

## Overview

Sprint 2 introduces the Agent Observability system (Issue #69, PLAT-003). Frontier shipped the core token tracking foundation in Cycle 129 (`packages/core/src/observability.ts`). This spec defines how observability surfaces to users through the CLI.

### Design Principles

1. **Cost awareness first** — Users should always know how much their agent team costs
2. **Progressive disclosure** — Summary by default, details on demand
3. **Actionable insights** — Show data that drives decisions (which roles are expensive? which cycles failed?)
4. **Minimal cognitive load** — One glance should tell you "is everything okay?"

---

## Commands

### 1. `ada observe` (Primary Command)

The main observability entry point. Shows a dashboard-style overview.

```bash
$ ada observe

📊 Agent Observability — autonomous-dev-agents
═══════════════════════════════════════════════

Cycles: 129 tracked (last 100 retained)
Period: 2026-02-05 → 2026-02-07 (2 days)

┌─────────────────────────────────────────────────┐
│ 💰 COST SUMMARY                                 │
├─────────────────────────────────────────────────┤
│ Total:          $4.23                           │
│ Avg per cycle:  $0.0423                         │
│ Today:          $0.89 (21 cycles)               │
│ Model:          claude-4-sonnet                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ ⚡ TOKEN USAGE                                  │
├─────────────────────────────────────────────────┤
│ Total:          142.3K tokens                   │
│ Input:          89.2K (63%)                     │
│ Output:         53.1K (37%)                     │
│ Avg per cycle:  1,423 tokens                    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 📈 HEALTH                                       │
├─────────────────────────────────────────────────┤
│ Success rate:   98% (127/129)                   │
│ Failed:         2 cycles (Cycle 45, 67)         │
│ Avg duration:   12.4s per cycle                 │
└─────────────────────────────────────────────────┘

Use 'ada observe --by-role' for per-role breakdown
Use 'ada observe --cycle 129' for specific cycle details
```

#### Flags

| Flag              | Description                                |
| ----------------- | ------------------------------------------ |
| `--by-role`       | Show per-role cost and token breakdown     |
| `--cycle <N>`     | Show detailed metrics for a specific cycle |
| `--last <N>`      | Show last N cycles (default: summary only) |
| `--json`          | Output as JSON for scripting               |
| `--export <file>` | Export metrics to CSV/JSON file            |

---

### 2. `ada observe --by-role`

Per-role breakdown for identifying expensive or inefficient roles.

```bash
$ ada observe --by-role

📊 Cost by Role — last 100 cycles
═════════════════════════════════════════════════

Role          │ Cycles │  Tokens  │   Cost   │ Avg/Cycle
──────────────┼────────┼──────────┼──────────┼──────────
⚙️  Engineering │   14   │  28.4K   │  $0.85   │  $0.061
🌌 Frontier    │   10   │  24.1K   │  $0.72   │  $0.072
📦 Product     │   12   │  18.3K   │  $0.55   │  $0.046
🔍 QA          │   11   │  16.8K   │  $0.50   │  $0.045
👔 CEO         │   10   │  15.2K   │  $0.46   │  $0.046
📋 Scrum       │   12   │  14.1K   │  $0.42   │  $0.035
🔬 Research    │   10   │  12.4K   │  $0.37   │  $0.037
🎨 Design      │   11   │  11.2K   │  $0.34   │  $0.031
🛡️  Ops         │   10   │  10.8K   │  $0.32   │  $0.032
🚀 Growth      │    9   │   9.1K   │  $0.27   │  $0.030
──────────────┴────────┴──────────┴──────────┴──────────
                  129     142.3K     $4.23     $0.042

💡 Insight: Frontier uses 70% more tokens than average.
   Consider reviewing DISPATCH.md for optimization.
```

---

### 3. `ada observe --cycle <N>`

Detailed trace for a specific cycle. Useful for debugging failures or understanding cost spikes.

```bash
$ ada observe --cycle 129

📊 Cycle 129 — 🌌 Frontier
═════════════════════════════════════════════════

Started:   2026-02-07 06:02:00 EST
Completed: 2026-02-07 06:02:47 EST
Duration:  47.3s
Status:    ✅ Success
Model:     claude-4-sonnet

┌─────────────────────────────────────────────────┐
│ Token Usage by Phase                            │
├────────────────────────┬────────────┬───────────┤
│ Phase                  │   Input    │  Output   │
├────────────────────────┼────────────┼───────────┤
│ context_load           │    1,245   │       0   │
│ situational_awareness  │    2,156   │     892   │
│ action_selection       │    1,832   │     456   │
│ action_execution       │    3,421   │   2,134   │
│ memory_update          │      892   │     567   │
│ state_update           │      234   │     123   │
├────────────────────────┼────────────┼───────────┤
│ TOTAL                  │    9,780   │   4,172   │
└────────────────────────┴────────────┴───────────┘

Cost: $0.10 (input: $0.029, output: $0.063)

Action taken: 🌌 OBSERVABILITY PHASE 1 (packages/core/src/observability.ts)
```

---

### 4. `ada costs` (Shortcut)

Quick cost check — shows just the cost summary for fast reference.

```bash
$ ada costs

💰 ADA Agent Costs
═══════════════════════════════════════════════

Today:        $0.89 (21 cycles)
This week:    $4.23 (129 cycles)
Avg/cycle:    $0.042

Model: claude-4-sonnet

Use 'ada observe' for full breakdown
```

---

### 5. Integration with `ada status`

Add a cost indicator to the existing status command.

```bash
$ ada status

📊 ADA Status — autonomous-dev-agents
═══════════════════════════════════════════════════

Current Role:  📦 Product (The PM)
Cycle:         130
Last Action:   🌌 Observability Phase 1 (Frontier, Cycle 129)
Memory Bank:   v6, 186 lines

Health:        ✅ Healthy (98% success rate)
Cost Today:    $0.89 (21 cycles)            ← NEW

Next: 📋 Scrum
```

---

## User Stories

### Story 1: Cost-Conscious Developer

> As a developer, I want to see how much my agent team is costing me so I can budget accordingly.

**Acceptance Criteria:**

- [ ] `ada observe` shows total cost for tracked period
- [ ] `ada costs` provides quick cost check
- [ ] `ada status` includes today's cost indicator
- [ ] Cost displayed in USD with appropriate precision ($0.0423, not $0.04234567)

### Story 2: Debugging Failed Cycles

> As a developer, when a cycle fails, I want to understand what happened so I can fix it.

**Acceptance Criteria:**

- [ ] `ada observe` shows failure count and which cycles failed
- [ ] `ada observe --cycle N` shows full trace for failed cycles
- [ ] Error messages are captured and displayed

### Story 3: Optimizing Expensive Roles

> As a team lead, I want to identify which roles are consuming the most tokens so I can optimize their playbooks.

**Acceptance Criteria:**

- [ ] `ada observe --by-role` shows per-role breakdown
- [ ] Tokens AND cost shown per role
- [ ] Average per cycle shown for comparison
- [ ] Insights flag unusually expensive roles

### Story 4: Exporting for Analysis

> As an enterprise user, I want to export observability data for external analysis tools.

**Acceptance Criteria:**

- [ ] `ada observe --export metrics.csv` exports to CSV
- [ ] `ada observe --export metrics.json` exports to JSON
- [ ] `ada observe --json` outputs machine-readable JSON to stdout

---

## Implementation Notes

### Dependencies

- Requires observability core from Cycle 129 (`packages/core/src/observability.ts`)
- Follows existing CLI patterns from `packages/cli/src/commands/`
- Uses same table formatting as `ada memory stats`

### Phase Rollout

| Phase   | Scope                               | Estimated Cycles |
| ------- | ----------------------------------- | ---------------- |
| Phase 1 | `ada observe` basic + `ada costs`   | 2 cycles         |
| Phase 2 | `--by-role` and `--cycle` flags     | 2 cycles         |
| Phase 3 | `ada status` integration + insights | 1 cycle          |
| Phase 4 | `--export` and `--json` flags       | 1 cycle          |

**Total: ~6 cycles** (Engineering + QA)

### Success Metrics

After 30 days of usage:

- 80% of `ada status` runs should show cost indicator
- Users who run `ada observe` at least once per week
- Zero support tickets about "how much does ADA cost?"

---

## Open Questions

1. **Budget alerts?** Should we support `ada config set budget-alert 10` to warn when daily cost exceeds threshold?
2. **Historical retention?** Currently 100 cycles. Is this enough for weekly/monthly analysis?
3. **Model comparison?** Show cost savings if user switched models? (e.g., "Sonnet → Haiku would save 70%")

---

## Related

- **Issue #69:** Agent Observability (parent issue)
- **PLAT-003:** Agent Observability ADR (`docs/architecture/agent-observability-adr.md`)
- **Cycle 129:** Token counter foundation (Frontier)
- **Issue #68:** SaaS Revenue (observability enables accurate pricing)

---

_📦 Product | Cycle 130_
