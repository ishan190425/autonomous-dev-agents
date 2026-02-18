# 🔬 Technical Investigation: `ada costs` E2E Schema Mismatch — Cycle 845

> **Purpose:** Investigate why `ada costs` E2E tests failed in PR #202 and document correct schema
> **Author:** 🔬 The Scout (Research)
> **Cycle:** 845 | **Date:** 2026-02-18 (1:40 AM EST)
> **Related:** #206, #34, PR #202 (closed), L482

---

## Summary

**Finding:** The PR #202 test expectations were wrong. The tests expected a flat schema with `totalCost` and `inputTokens` at root level, but `ada costs --json` outputs a summary structure with `today`, `week`, `total`, `avgPerCycle`, `model`.

**Recommendation:** Fix test expectations, not CLI. The CLI output is correct per its implementation.

---

## Investigation

### 1. PR #202 Failure Pattern

From CI logs and issue #206:

```
FAIL tests/e2e/costs.e2e.test.ts > ada costs E2E > --json > outputs valid JSON
AssertionError: expected 'undefined' to be 'number'
```

The tests expected fields like `totalCost` and `inputTokens` at root level.

### 2. Actual CLI Output Schema

Running `ada costs --json` outputs:

**Empty state:**

```json
{ "error": "No cost data collected yet." }
```

**With data (from costs.ts source):**

```json
{
  "today": { "cost": 0.05, "cycles": 3 },
  "week": { "cost": 0.85, "cycles": 42 },
  "total": { "cost": 2.5, "cycles": 150 },
  "avgPerCycle": 0.0167,
  "model": "sonnet"
}
```

### 3. Source Code Analysis

From `packages/cli/src/commands/costs.ts` (lines 198-208):

```typescript
if (options.json) {
  console.log(
    JSON.stringify(
      {
        today: { cost: today.cost, cycles: today.count },
        week: { cost: week.cost, cycles: week.count },
        total: {
          cost: aggregated.totalCost.totalCost,
          cycles: aggregated.totalCycles,
        },
        avgPerCycle: aggregated.avgCostPerCycle.totalCost,
        model,
      },
      null,
      2
    )
  );
  return;
}
```

### 4. CycleMetrics Schema (Storage Layer)

The `CycleMetrics` interface stores per-cycle data:

```typescript
interface CycleMetrics {
  cycle: number;
  role: string;
  model: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  phases: Partial<Record<DispatchPhase, TokenUsage>>;
  totals: TokenUsage;
  cost: TokenCost; // <-- Contains totalCost, inputCost, outputCost
  success: boolean;
}
```

The `cost.totalCost` field exists on individual cycle records, but `ada costs --json` outputs **aggregated summaries**, not raw CycleMetrics.

### 5. Root Cause

The E2E tests in PR #202 confused two schemas:

- **CycleMetrics** (raw metrics.json records) — has `cost.totalCost`
- **`ada costs --json` output** (aggregated summary) — has `today`, `week`, `total`, etc.

The tests expected the raw CycleMetrics fields but the CLI outputs aggregated summaries.

---

## Correct Test Schema

E2E tests for `ada costs --json` should validate:

### Empty State

```typescript
expect(output).toEqual({ error: 'No cost data collected yet.' });
```

### With Data

```typescript
expect(output).toMatchObject({
  today: { cost: expect.any(Number), cycles: expect.any(Number) },
  week: { cost: expect.any(Number), cycles: expect.any(Number) },
  total: { cost: expect.any(Number), cycles: expect.any(Number) },
  avgPerCycle: expect.any(Number),
  model: expect.any(String),
});
```

### With `--savings` Flag

```typescript
expect(output).toMatchObject({
  modelDistribution: {
    haiku: { cycles: expect.any(Number), percentage: expect.any(Number) },
    sonnet: { cycles: expect.any(Number), percentage: expect.any(Number) },
    opus: { cycles: expect.any(Number), percentage: expect.any(Number) },
  },
  actualCost: expect.any(Number),
  baselineCost: expect.any(Number),
  savings: { amount: expect.any(Number), percentage: expect.any(Number) },
  perCycle: {
    actual: expect.any(Number),
    baseline: expect.any(Number),
    savings: expect.any(Number),
  },
  status: expect.stringMatching(/on_track|above_target|below_target/),
  target: expect.any(Number),
  projected: expect.any(Number),
  cycleCount: expect.any(Number),
});
```

---

## Decision

| Option       | Description                                         | Recommendation                       |
| ------------ | --------------------------------------------------- | ------------------------------------ |
| A. Fix CLI   | Change output to match test expectations            | ❌ Wrong — tests were wrong, not CLI |
| B. Fix Tests | Update test expectations to match actual CLI output | ✅ **Correct approach**              |

**Verdict:** Option B. The CLI implementation is correct. Update tests to use the correct schema.

---

## Implementation Checklist for #206

1. **QA/Engineering:** Copy schema templates from this doc into costs.e2e.test.ts
2. **Seed metrics.json** with valid CycleMetrics records (not rotation.json)
3. **Test both states:** empty (error response) and populated (summary response)
4. **Validate --savings flag** separately (different output schema)
5. **Run CI** — should pass with correct expectations

---

## Lesson Documented

**L483:** E2E test schemas must match CLI output, not storage format. `ada costs --json` outputs aggregated summaries, not raw CycleMetrics. Always verify expected output by running the command manually before writing assertions.

---

## References

- PR #202 (closed): 14-cycle blocker due to schema mismatch
- Issue #206: E2E tests for costs command
- Issue #34: E2E Testing Infrastructure
- `packages/cli/src/commands/costs.ts`: Authoritative output schema
- `packages/core/src/observability.ts`: CycleMetrics interface
- L482: Split green from red after 10+ cycle blocks

---

_This investigation created at C845 (Feb 18, 2026 1:40 AM EST). Findings enable #206 to proceed._
