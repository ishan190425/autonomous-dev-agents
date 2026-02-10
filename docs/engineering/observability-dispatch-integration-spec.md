# Observability Dispatch Integration Specification

> **Status:** Sprint 2 Ready  
> **Author:** 🌌 Frontier — Cycle 349  
> **Related:** observability.ts, Issue #83 (Dogfooding), Issue #111 (CLI Dogfooding)

---

## Executive Summary

The observability infrastructure is **complete** (observability.ts: 22KB, CycleTracker, MetricsManager, 6 CLI-exposed functions) but **not activated**. `agents/state/metrics.json` is empty — zero dispatch cycles have recorded token usage, costs, or latency.

This spec defines the integration path to wire observability into the dispatch lifecycle, enabling:

- Per-cycle token and cost tracking
- Role-based cost breakdown
- Latency metrics per dispatch phase
- Historical trends for investor/accelerator presentations

---

## Current State Analysis

### ✅ What's Built

| Component                  | Status   | Location                                    |
| -------------------------- | -------- | ------------------------------------------- |
| `CycleTracker` class       | Complete | `packages/core/src/observability.ts`        |
| `MetricsManager` class     | Complete | `packages/core/src/observability.ts`        |
| Token/cost calculation     | Complete | `calculateCost()`, `getPricing()`           |
| Latency tracking (Phase 2) | Complete | `startPhase()`, `endPhase()`, `timePhase()` |
| `ada observe` command      | Complete | CLI, returns "No data collected yet"        |
| `ada costs` command        | Complete | CLI, returns "No data collected yet"        |
| Model pricing table        | Complete | 9 models (Claude, GPT-4, o1 series)         |

### ❌ What's Missing

| Gap                                             | Impact                  | Effort |
| ----------------------------------------------- | ----------------------- | ------ |
| `dispatch complete` doesn't call MetricsManager | No metrics recorded     | S      |
| No token count source                           | Can't track usage       | M      |
| No integration with OpenClaw                    | Missing real usage data | M      |
| metrics.json never created                      | No historical data      | S      |

---

## Integration Architecture

### Option A: Estimated Token Tracking (Low Effort, Low Accuracy)

```
dispatch start
    ├─ Create CycleTracker(cycle, role, model)
    ├─ Estimate context tokens (playbook + memory bank + rules)
    └─ Store in .dispatch.lock

dispatch complete --action "..."
    ├─ Load CycleTracker from lock
    ├─ Estimate output tokens from action length
    ├─ tracker.finalize(success)
    ├─ metricsManager.record(metrics)
    └─ Save metrics.json
```

**Pros:** Simple, no external dependencies  
**Cons:** Inaccurate estimates, no real LLM usage data  
**Accuracy:** ~50% (rough order of magnitude)

### Option B: OpenClaw Session Metrics (Medium Effort, High Accuracy)

OpenClaw tracks session token usage. The dispatch cycle runs inside an OpenClaw session.

```
dispatch complete --action "..." --tokens-in <N> --tokens-out <M>
    ├─ Create CycleTracker from lock
    ├─ tracker.recordPhase('action_execution', tokensIn, tokensOut)
    ├─ tracker.finalize(success)
    └─ metricsManager.record(metrics)
```

The calling agent (OpenClaw cron job) can pass its session token usage:

```bash
ada dispatch complete \
  --action "..." \
  --tokens-in 15234 \
  --tokens-out 2847
```

**Pros:** Accurate, real usage data  
**Cons:** Requires OpenClaw integration, single-cycle granularity  
**Accuracy:** ~95%

### Option C: Hybrid Instrumented (High Effort, Highest Accuracy)

Instrument each phase of the dispatch protocol:

```typescript
// In DISPATCH.md Phase 2 (Context Load)
tracker.startPhase('context_load');
const context = await loadContext(state, roster);
tracker.endPhase();
tracker.recordPhase('context_load', context.tokens, 0);

// In Phase 3 (Situational Awareness)
tracker.startPhase('situational_awareness');
const issues = await runGitHubCheck();
tracker.endPhase();
```

**Pros:** Per-phase granularity, accurate latency  
**Cons:** Major refactor, tight coupling  
**Accuracy:** ~99%

---

## Recommended Implementation: Option B

Option B provides the best accuracy/effort tradeoff:

1. **Minimal CLI changes:** Add `--tokens-in` and `--tokens-out` flags
2. **Accurate data:** Real session token usage from OpenClaw
3. **Backward compatible:** Flags are optional, defaults to 0
4. **Sprint 2 scope:** Small, achievable, immediate value

### CLI Interface Change

```bash
ada dispatch complete \
  --action "Description" \
  --tokens-in 15234 \
  --tokens-out 2847 \
  --reflection "..."
```

New options:

```typescript
interface DispatchCompleteOptions {
  // ... existing
  tokensIn?: number; // Input tokens consumed
  tokensOut?: number; // Output tokens generated
  model?: string; // Model used (default: claude-4-sonnet)
}
```

### Integration Code

```typescript
// In completeDispatchCycle()
import { CycleTracker, createMetricsManager } from '@ada/core';

async function completeDispatchCycle(
  opts: DispatchCompleteOptions
): Promise<void> {
  const lock = await getActiveLock(agentsDir);

  // Create tracker from lock state
  const tracker = new CycleTracker(
    lock.cycle,
    lock.role,
    opts.model ?? 'claude-4-sonnet'
  );

  // Record tokens if provided
  if (opts.tokensIn || opts.tokensOut) {
    tracker.recordPhase(
      'action_execution',
      opts.tokensIn ?? 0,
      opts.tokensOut ?? 0
    );
  }

  // Calculate latency from lock.startedAt
  const startedAt = new Date(lock.startedAt);
  // Phase tracking happens automatically via tracker constructor

  // Finalize
  const metrics = tracker.finalize(
    opts.outcome !== 'blocked',
    opts.outcome === 'blocked' ? 'Cycle blocked' : undefined
  );

  // Record to metrics.json
  const manager = createMetricsManager(rootDir);
  await manager.record(metrics);

  // ... rest of completion logic
}
```

---

## OpenClaw Cron Integration

The OpenClaw cron job that runs dispatch cycles should pass token usage:

```yaml
# OpenClaw cron config (conceptual)
job:
  command: |
    ada dispatch start
    # ... agent does work ...
    ada dispatch complete \
      --action "..." \
      --tokens-in ${SESSION_TOKENS_IN} \
      --tokens-out ${SESSION_TOKENS_OUT}
```

**Note:** OpenClaw may need to expose `SESSION_TOKENS_IN/OUT` environment variables or a mechanism for the agent to query its own session usage.

---

## Metrics.json Schema

```json
{
  "version": 1,
  "cycles": [
    {
      "cycle": 349,
      "role": "frontier",
      "model": "claude-4-sonnet",
      "startedAt": "2026-02-10T18:22:00.000Z",
      "completedAt": "2026-02-10T18:24:30.000Z",
      "durationMs": 150000,
      "phases": {
        "action_execution": {
          "inputTokens": 15234,
          "outputTokens": 2847,
          "totalTokens": 18081
        }
      },
      "totals": {
        "inputTokens": 15234,
        "outputTokens": 2847,
        "totalTokens": 18081
      },
      "cost": {
        "inputCost": 0.045702,
        "outputCost": 0.042705,
        "totalCost": 0.088407
      },
      "success": true
    }
  ],
  "maxCycles": 100
}
```

---

## Implementation Phases

| Phase | Description                                               | Target          | Effort |
| ----- | --------------------------------------------------------- | --------------- | ------ |
| **1** | Add `--tokens-in/out` flags to `dispatch complete`        | Sprint 2 Week 1 | S      |
| **2** | Integrate CycleTracker + MetricsManager                   | Sprint 2 Week 1 | S      |
| **3** | OpenClaw passes session tokens (requires OpenClaw change) | Sprint 2 Week 2 | M      |
| **4** | Dashboard visualization (Issue #120)                      | Sprint 2 Week 3 | M      |

---

## Success Metrics

| Metric                            | Target                |
| --------------------------------- | --------------------- |
| Cycles with token data            | 100% after activation |
| Cost accuracy vs OpenClaw billing | ±10%                  |
| `ada observe` returns data        | ✅                    |
| Role cost breakdown available     | ✅                    |

---

## Dependencies

- **Issue #112:** `ada dispatch` CLI (complete ✅)
- **Issue #83:** Dogfooding — Use ADA to develop ADA CLI
- **Issue #120:** Dashboard visualizations (consumes this data)

---

## Questions for Product

1. Should estimated tokens (Option A) be a fallback when real tokens unavailable?
2. What's the priority of per-phase granularity vs single-cycle totals?
3. Should cost alerts be added (e.g., "Cycle cost exceeded $0.50")?

---

## References

- `packages/core/src/observability.ts` — Full implementation
- `packages/core/src/observability.test.ts` — 40+ tests
- `docs/processes/reflexion-bootstrap-guide.md` — Similar activation pattern

---

_The engine is built. This spec wires it to the fuel line._ ⛽→🚀

🌌 Frontier — Cycle 349
