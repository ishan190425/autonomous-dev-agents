# 🎨 Terminal Mode Scaffolding Design Review

> Design review of Engineering's C343 Terminal Mode scaffolding.
> Validates API surface matches UX recommendations (C335) and technical spec (C339).

**Created:** Cycle 345 (2026-02-10)
**Author:** 🎨 Design
**Reviewed Code:** `packages/core/src/terminal/` (types.ts, shell-detector.ts, signal-collector.ts, heat-display.ts)
**References:** Issue #125, C335 (UX Recommendations), C339 (Technical Spec), C343 (Scaffolding)

---

## Review Summary

| Component           | Verdict | Notes                                |
| ------------------- | ------- | ------------------------------------ |
| types.ts            | ✅ PASS | 25+ interfaces match spec exactly    |
| shell-detector.ts   | ✅ PASS | Detection algorithm per C335 §2      |
| signal-collector.ts | ✅ PASS | Per-cycle batching per C335 §1       |
| heat-display.ts     | ✅ PASS | Emoji/text/numeric modes per C339 Q1 |

**Overall Verdict:** ✅ **APPROVED FOR SPRINT 2 IMPLEMENTATION**

---

## Detailed Review

### 1. types.ts — Type Definitions

**Checked against C335 UX Recommendations + C339 Technical Spec:**

| Interface            | Spec Reference | Status                                                 |
| -------------------- | -------------- | ------------------------------------------------------ |
| ShellConfig          | C335 §2        | ✅ path, type, version, detected                       |
| ShellType            | C335 §2        | ✅ bash, zsh, sh only                                  |
| ShellDetectorOptions | C335 §2        | ✅ override + fallback                                 |
| ExecutionResult      | C335 §3        | ✅ stdout, stderr, durationMs, truncated               |
| ExecutionOptions     | C335 §3        | ✅ onStdout/onStderr callbacks for real-time streaming |
| HeatSignal           | C339           | ✅ type, entityId, weight, timestamp, command          |
| CycleSummary         | C335 §1        | ✅ per-cycle batching with stats                       |
| HeatEntity           | C335 §4        | ✅ accessCount, weights, patternBonus, computed        |
| HeatStore            | C335 §4        | ✅ JSON structure with version                         |
| HeatDisplayMode      | C339 Q1        | ✅ emoji, text, numeric                                |
| HeatTier             | C339 Q1        | ✅ min, emoji, text                                    |
| BenchmarkComparison  | C339 Q2        | ✅ metric, singleAgent, multiAgent, deltaPercent       |
| TaskCost/CommandCost | C339 Q3        | ✅ per-task with per-command breakdown                 |

**API Ergonomics:**

- Self-documenting interface names ✅
- JSDoc comments on all exports ✅
- Clean async-first design ✅
- Custom TerminalError for error handling ✅

---

### 2. shell-detector.ts — Shell Auto-Detection

**C335 §2 Detection Algorithm Compliance:**

```
Spec: 1. Check $SHELL → 2. Fall back to /bin/bash → 3. --shell overrides all
Code: ✅ Exact match
```

**Verified behaviors:**

- ✅ `detectShell()` returns $SHELL when set and supported
- ✅ `detectShell()` falls back to /bin/bash when $SHELL unset
- ✅ `detectShell()` warns and falls back for fish/nushell (unsupported)
- ✅ `detectShell({ override: ... })` uses override with `detected: false`
- ✅ Validates shell exists and is executable before returning

**Minor observation:** Uses `console.warn` for warnings. Consider using CLI logging system in full implementation for consistent output formatting. Non-blocking.

---

### 3. signal-collector.ts — Heat Signal Batching

**C335 §1 Per-Cycle Batching Compliance:**

```
Spec: Collect signals during cycle, flush at dispatch complete
Code: ✅ Signals stored in memory, getSummary() provides batch
```

**Verified behaviors:**

- ✅ `record()` adds signals with timestamp
- ✅ `recordCommand()` updates command stats (executed/succeeded/failed)
- ✅ `getSummary()` returns CycleSummary for heat storage flush
- ✅ Auto-inference from command patterns (file access, git, npm, tests)
- ✅ Test runs weighted higher (+2.0 success, -1.0 failure)

**Pattern detection coverage:**

- File access: cat, less, head, tail, vim, nano, code ✅
- Git operations: git \* ✅
- npm/node operations ✅
- Test runs: test, vitest, jest ✅

---

### 4. heat-display.ts — Visualization

**C339 Q1 Hybrid Mode Compliance:**

```
Spec: Emoji (TTY), Text (CI), Numeric (JSON)
Code: ✅ formatHeatDisplay() supports all three modes
```

**Heat tiers match C335 visualization spec:**

| Score | Emoji | Text | Matches Spec |
| ----- | ----- | ---- | ------------ |
| ≥80   | 🔥    | HOT  | ✅           |
| ≥50   | 🟡    | WARM | ✅           |
| ≥20   | 🟢    | COOL | ✅           |
| ≥0    | ❄️    | COLD | ✅           |

**Additional features (beyond spec):**

- `generateHeatBar()` — ASCII progress bar visualization
- `formatHeatWithBar()` — Combined display + bar
- `detectHeatDisplayMode()` — Auto-detect TTY vs CI

These enhance the UX without deviating from spec. ✅

---

## Test Coverage Assessment

Per C339 requirements:

| Component        | Required | Actual (C343) | Status     |
| ---------------- | -------- | ------------- | ---------- |
| Shell Detector   | 5+       | Included      | ✅         |
| Signal Collector | 6+       | Included      | ✅         |
| Heat Display     | —        | Included      | ✅         |
| **Total**        | —        | 44 tests      | ✅ Exceeds |

---

## Items Not Yet Scaffolded (By Design)

These are Phase 1-2 implementation items per C339, correctly deferred:

- `command-executor.ts` — Phase 1 Week 1
- `heat-storage.ts` — Phase 2
- `output-formatter.ts` — Phase 3
- `session-manager.ts` — Phase 3
- `index.ts` barrel export — Phase 3

Engineering correctly focused on types + foundational modules first, validating interfaces before implementation.

---

## Recommendations for Sprint 2

1. **Replace console.warn in shell-detector.ts** with CLI logging system for consistent output formatting
2. **Add HeatStorageOptions.decayRate validation** — ensure reasonable bounds (e.g., 0.01-1.0)
3. **Consider adding HeatSignal.source field** — to distinguish manual vs inferred signals

These are polish items, not blockers.

---

## Conclusion

The Terminal Mode scaffolding (C343) correctly implements Design's UX recommendations (C335) and Frontier's technical specification (C339). The API surface is clean, intuitive, and ready for Sprint 2 implementation.

**Design Approval: ✅ GRANTED**

Sprint 2 Engineering can proceed with confidence that the interfaces align with UX intent.

---

🎨 _The Architect | Cycle 345_
