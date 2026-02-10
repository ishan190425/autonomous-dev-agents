# Autonomous Observability Activation Specification

> **Status:** Draft  
> **Author:** 🌌 Frontier — Cycle 359  
> **Related:** Issue #83 (Dogfooding), C349 Spec, C353 Implementation, L112-L113

---

## Executive Summary

The observability CLI integration is **complete** (C353), but autonomous dispatch cycles **still can't provide token counts** because agents running in cron jobs lack introspection into their own LLM usage.

**Current state:**

- ✅ `ada dispatch complete --tokens-in N --tokens-out M --model X` works
- ❌ Autonomous agents don't know their token counts
- ❌ `metrics.json` remains empty after 359 cycles
- ❌ L112-L113 activation gap persists

**This spec proposes three solutions** for Sprint 2, ordered by implementation effort and accuracy.

---

## The Activation Gap

### Why Tokens Aren't Flowing

```
┌─────────────────────────────────────────────────────────────────┐
│  OpenClaw Cron Job                                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ADA Agent (Claude)                                       │  │
│  │  - Runs dispatch cycle                                    │  │
│  │  - Reads files, calls CLI, makes decisions                │  │
│  │  - ❌ Cannot access own token usage                       │  │
│  │  - Calls: ada dispatch complete --action "..."            │  │
│  │  - ❌ Cannot pass --tokens-in/out (doesn't know them)     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  OpenClaw tracks tokens internally, but doesn't expose to agent │
└─────────────────────────────────────────────────────────────────┘
```

The agent is the LLM. It can't measure its own consumption any more than a person can count their own neurons firing.

---

## Solution Options

### Option 1: Post-Hoc Estimation (Immediate, Low Accuracy)

**Approach:** Estimate tokens based on observable inputs/outputs.

```bash
# Agent estimates based on what it read/wrote
ada dispatch complete \
  --action "..." \
  --tokens-in-estimate $(wc -c < agents/memory/bank.md) \
  --tokens-out-estimate 2000 \
  --model claude-4-sonnet
```

**Implementation:**

1. Add `--tokens-in-estimate`, `--tokens-out-estimate` flags
2. Apply ~4 chars/token heuristic for inputs
3. Mark metrics as "estimated" in metrics.json
4. Flag estimated data in `ada observe` output

**Accuracy:** ~30-50% (order of magnitude only)

**Effort:** XS (2-4 hours)

**Pros:**

- Zero external dependencies
- Works immediately
- Better than nothing

**Cons:**

- Very rough estimates
- Doesn't capture actual LLM reasoning tokens
- Chain-of-thought hidden in the model

---

### Option 2: OpenClaw Usage Injection (Medium, High Accuracy)

**Approach:** OpenClaw injects session usage into environment before dispatch complete.

**Implementation:**

1. OpenClaw provides environment variable or file with session metrics
2. ADA reads metrics at dispatch complete time
3. Passes accurate tokens to observability

**Example flow:**

```bash
# OpenClaw sets before agent runs
export OPENCLAW_SESSION_TOKENS_IN=15234
export OPENCLAW_SESSION_TOKENS_OUT=3421
export OPENCLAW_SESSION_MODEL=claude-4-sonnet

# Agent's dispatch complete reads these
ada dispatch complete --action "..." --from-env
```

**Implementation (ADA side):**

```typescript
// In dispatch complete
if (options.fromEnv) {
  const tokensIn = parseInt(process.env.OPENCLAW_SESSION_TOKENS_IN || '0');
  const tokensOut = parseInt(process.env.OPENCLAW_SESSION_TOKENS_OUT || '0');
  const model = process.env.OPENCLAW_SESSION_MODEL || 'claude-4-sonnet';
  // Record with actual data
}
```

**Accuracy:** 95%+ (actual LLM usage)

**Effort:** M (requires OpenClaw coordination)

**Pros:**

- Accurate token counts
- Real cost calculation
- Enables meaningful benchmarks

**Cons:**

- Requires OpenClaw feature (not just ADA)
- Environment injection point needs design

---

### Option 3: Cron Job Wrapper (Medium, High Accuracy)

**Approach:** Wrap the dispatch cycle in a script that captures OpenClaw output.

**Implementation:**

```bash
#!/bin/bash
# dispatch-with-metrics.sh

# Run dispatch and capture output
OUTPUT=$(openclaw run --capture-usage "Run ADA dispatch for repo X")

# Parse usage from OpenClaw output
TOKENS_IN=$(echo "$OUTPUT" | grep "tokens_in" | cut -d: -f2)
TOKENS_OUT=$(echo "$OUTPUT" | grep "tokens_out" | cut -d: -f2)

# Record metrics post-hoc
ada observe record --cycle $CYCLE --tokens-in $TOKENS_IN --tokens-out $TOKENS_OUT
```

**Accuracy:** 95%+ (captures full session)

**Effort:** S-M (wrapper script + CLI command)

**Pros:**

- Accurate metrics
- Doesn't require OpenClaw changes
- Post-hoc recording decoupled from dispatch

**Cons:**

- Wrapper complexity
- Requires CLI output parsing
- Doesn't work for direct cron-to-agent runs

---

### Option 4: OpenClaw Webhook Callback (High, Full Accuracy)

**Approach:** OpenClaw calls a webhook after session completes with full metrics.

**Implementation:**

```json
// OpenClaw config
{
  "session_complete_webhook": "http://localhost:3000/api/ada/session-complete",
  "include_metrics": true
}

// ADA receives
POST /api/ada/session-complete
{
  "session_id": "cron:...",
  "tokens_in": 15234,
  "tokens_out": 3421,
  "model": "claude-4-sonnet",
  "duration_ms": 45000,
  "cycle": 359
}
```

**Accuracy:** 100% (OpenClaw source of truth)

**Effort:** L (requires ADA web service + OpenClaw webhook support)

**Pros:**

- Perfect accuracy
- Decoupled architecture
- Extensible for other integrations

**Cons:**

- Requires running ADA web service
- OpenClaw webhook feature needed
- Higher infrastructure complexity

---

## Recommendation: Hybrid Approach

**Sprint 2 Plan:**

| Week | Action                                            | Solution                             |
| ---- | ------------------------------------------------- | ------------------------------------ |
| 1    | Implement Option 1 (estimates)                    | Immediate value, some data > no data |
| 1    | Document Option 2 requirements for OpenClaw team  | Enable future accuracy               |
| 2    | Implement Option 3 wrapper for cron jobs          | Higher accuracy for scheduled runs   |
| 3+   | Evaluate Option 4 if web dashboard (#18) proceeds | Full integration                     |

**Why estimates first:**

- L112: "Infrastructure that isn't wired into the main loop remains unused"
- Even rough estimates enable: role cost comparison, trend detection, outlier identification
- Can flag estimated data and refine later

**Fallback hierarchy:**

```
1. Actual tokens (from env/wrapper) → use if available
2. Estimated tokens (from file sizes) → use as fallback
3. Zero (no data) → last resort, mark as "untracked"
```

---

## CLI Changes Required

### New Flags for dispatch complete

```typescript
interface DispatchCompleteOptions {
  // Existing
  tokensIn?: number;
  tokensOut?: number;
  model?: string;

  // New (this spec)
  tokensInEstimate?: number; // Character-count-based estimate
  tokensOutEstimate?: number; // Output estimate
  fromEnv?: boolean; // Read from OPENCLAW_* env vars
  skipMetrics?: boolean; // Opt out of metrics recording
}
```

### New Command: ada observe record

```bash
# Post-hoc metrics recording (for wrapper scripts)
ada observe record \
  --cycle 359 \
  --role frontier \
  --tokens-in 15234 \
  --tokens-out 3421 \
  --model claude-4-sonnet \
  --duration-ms 45000 \
  --source wrapper
```

---

## Metrics Schema Update

```typescript
interface CycleMetrics {
  // Existing
  cycle: number;
  role: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
  cost: number;

  // New (this spec)
  source: 'actual' | 'estimated' | 'wrapper' | 'manual';
  confidence: number; // 0.0-1.0, based on source
  estimationMethod?: string; // If estimated, how?
}
```

---

## Success Criteria

1. **Immediate (Week 1):** `metrics.json` contains data after dispatch cycles
2. **Sprint 2 end:** At least 50% of cycles have metrics recorded
3. **Sprint 3:** 90%+ of cycles have metrics with 'actual' or 'wrapper' source
4. **Long-term:** `ada observe` and `ada costs` show meaningful trends

---

## Open Questions

1. **OpenClaw integration:** Does the OpenClaw team have bandwidth for Option 2 env injection in Q1?

2. **Retroactive backfill:** Should we estimate metrics for cycles 1-359 based on historical action lengths?

3. **Cost thresholds:** Should we alert if a cycle exceeds $X cost threshold?

4. **Model versioning:** How do we handle model pricing changes over time?

---

## References

- C349: Observability Dispatch Integration Spec
- C353: Engineering implementation of --tokens flags
- L112: "Infrastructure that isn't wired remains unused"
- L113: "Infrastructure completion ≠ user value delivery"
- Issue #83: Dogfooding
- Issue #111: CLI Dogfooding mandate

---

_"You can't improve what you don't measure. But measuring something is better than measuring nothing."_

**— 🌌 Frontier (Cycle 359)**
