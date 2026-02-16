# Model Routing Validation Spec

> Frontier Implementation Spec — Cycle 735 | February 16, 2026
> **Owner:** 🌌 Frontier | **Priority:** P1 Phase 2 Dogfooding
> **Status:** Spec Ready

---

## Overview

Phase 1 delivered the model router (PR #161) with projected 14% cost savings via role-based model selection. Phase 2 dogfooding needs to **validate** these savings are actually achieved.

This spec defines a **Cost Savings Validation** feature for the CLI that:

1. Shows actual model distribution (% Haiku, % Sonnet, % Opus)
2. Computes actual savings vs all-Sonnet baseline
3. Compares projected vs actual savings

This is critical for the Feb 26 Go/No-Go decision (success criterion: "10%+ actual savings").

---

## User Story

As a developer dogfooding ADA, I want to see if the model routing is actually saving money, so I can validate the 14% projected savings before external launch.

---

## CLI Commands

### `ada costs --savings`

New flag showing cost savings analysis:

```
💰 ADA Cost Savings Analysis
═══════════════════════════════════════════════════════

📊 MODEL DISTRIBUTION (last 50 cycles)
────────────────────────────────────────────────────────
Haiku     │ ██████████████░░░░░░░░░░░░  17 cycles (34%)
Sonnet    │ █████████████████████████░░  31 cycles (62%)
Opus      │ ██░░░░░░░░░░░░░░░░░░░░░░░░   2 cycles (4%)
────────────────────────────────────────────────────────

💵 COST COMPARISON
────────────────────────────────────────────────────────
Actual Cost:     $2.18 (50 cycles)
Baseline Cost:   $2.55 (if all Sonnet)
────────────────────────────────────────────────────────
Savings:         $0.37 (14.5%)
────────────────────────────────────────────────────────

✅ Status: ON TRACK
   Target: 10%+  |  Actual: 14.5%  |  Projected: 14%

📈 Per-Cycle Analysis
────────────────────────────────────────────────────────
Avg Actual:      $0.044/cycle
Avg Baseline:    $0.051/cycle
Avg Savings:     $0.007/cycle
```

### `ada observe --savings`

Add savings summary to existing observe dashboard:

```
📊 Observability Dashboard
═══════════════════════════════════════════════════════
... existing output ...

💰 MODEL ROUTING SAVINGS
────────────────────────────────────────────────────────
Distribution:    34% Haiku | 62% Sonnet | 4% Opus
Actual:          $2.18
Baseline:        $2.55
Savings:         14.5% ✅ (target: 10%+)
```

### JSON Output

```bash
ada costs --savings --json
```

```json
{
  "modelDistribution": {
    "haiku": { "cycles": 17, "percentage": 34 },
    "sonnet": { "cycles": 31, "percentage": 62 },
    "opus": { "cycles": 2, "percentage": 4 }
  },
  "actualCost": 2.18,
  "baselineCost": 2.55,
  "savings": {
    "amount": 0.37,
    "percentage": 14.5
  },
  "perCycle": {
    "actual": 0.044,
    "baseline": 0.051,
    "savings": 0.007
  },
  "status": "on_track",
  "target": 10,
  "projected": 14
}
```

---

## Implementation

### Core Library (`@ada-ai/core`)

Add to `observability.ts`:

```typescript
export interface ModelDistribution {
  haiku: { cycles: number; percentage: number; cost: number };
  sonnet: { cycles: number; percentage: number; cost: number };
  opus: { cycles: number; percentage: number; cost: number };
}

export interface SavingsAnalysis {
  modelDistribution: ModelDistribution;
  actualCost: number;
  baselineCost: number;
  savings: { amount: number; percentage: number };
  perCycle: { actual: number; baseline: number; savings: number };
  status: 'on_track' | 'below_target' | 'above_target';
  targetPercentage: number;
  projectedPercentage: number;
}

export function calculateSavingsAnalysis(
  cycles: readonly CycleMetrics[],
  targetSavings: number = 10,
  projectedSavings: number = 14
): SavingsAnalysis;
```

### Baseline Cost Calculation

The "baseline" is what costs would be if ALL cycles used Sonnet:

```typescript
function calculateBaselineCost(cycles: readonly CycleMetrics[]): number {
  const sonnetInfo = MODEL_INFO['claude-3-5-sonnet-20241022'];
  let baseline = 0;
  for (const cycle of cycles) {
    // Use actual token counts with Sonnet pricing
    const inputCost =
      (cycle.totals.inputTokens / 1_000_000) * sonnetInfo.inputCostPerMillion;
    const outputCost =
      (cycle.totals.outputTokens / 1_000_000) * sonnetInfo.outputCostPerMillion;
    baseline += inputCost + outputCost;
  }
  return baseline;
}
```

### Model Tier Detection

Map model names to tiers for distribution calculation:

```typescript
function getModelTier(model: string): 'haiku' | 'sonnet' | 'opus' {
  if (model.includes('haiku')) return 'haiku';
  if (model.includes('opus')) return 'opus';
  return 'sonnet'; // Default
}
```

---

## Acceptance Criteria

- [ ] `ada costs --savings` shows model distribution as visual bar chart
- [ ] `ada costs --savings` shows actual vs baseline cost comparison
- [ ] `ada costs --savings` shows savings percentage with status indicator
- [ ] Status shows ✅ if >= 10%, ⚠️ if 5-10%, ❌ if < 5%
- [ ] `--json` output includes all savings analysis data
- [ ] `ada observe --savings` adds savings summary to dashboard
- [ ] Works with empty state (no cycles yet)
- [ ] Unit tests for `calculateSavingsAnalysis()`
- [ ] Integration test with mock cycle data

---

## Implementation Estimate

| Task                               | Size | Cycles       |
| ---------------------------------- | ---- | ------------ |
| Core `calculateSavingsAnalysis()`  | S    | 0.5          |
| CLI `--savings` flag in `costs.ts` | S    | 0.5          |
| Visual bar chart rendering         | S    | 0.5          |
| Unit tests                         | S    | 0.5          |
| **Total**                          |      | **2 cycles** |

---

## Phase 2 Dogfooding Value

This feature directly enables the Feb 26 Go/No-Go decision:

**Success Criterion:** "Cost tracking shows expected savings (target: 10%+ actual)"

With `ada costs --savings`, we can:

1. Monitor savings during dogfooding in real-time
2. Verify model distribution matches Research C723 projections
3. Make data-driven Go/No-Go decision
4. Show external users the cost benefits of ADA

---

## Related

- **PR #161:** CLI Model Router Integration (merged C728)
- **Research C723:** Model Selection Analysis
- **Phase 2 Strategy (C732):** CEO dogfooding criteria
- **Issue #155:** SaaS Container (parent)

---

_🌌 The Frontier — Cycle 735_
