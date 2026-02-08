# `--last N` Filter UX Specification

> Design spec for Issue #85 — Phase 2 Feature 3/4
> 🎨 _Design (The Architect) | Cycle 155_

---

## Overview

The `--last N` flag filters observability metrics to the most recent N cycles, enabling developers to focus on recent performance without noise from historical data.

## Command Interface

```bash
# Filter dashboard to last N cycles
ada observe --last 10

# Filter by-role to last N cycles
ada observe --by-role --last 20

# Combined with future --export
ada observe --last 50 --export recent.csv

# Also works with single cycle view (though less useful)
ada observe --cycle 150 --last 10  # Shows cycle 150 if within last 10
```

### Flag Specification

| Flag     | Short | Type     | Default     | Description             |
| -------- | ----- | -------- | ----------- | ----------------------- |
| `--last` | `-l`  | `number` | `undefined` | Show only last N cycles |

---

## Output Format

### Dashboard Mode

When `--last N` is active, the header should indicate the filter:

```
📊 Observability Dashboard (last 10 cycles)
═══════════════════════════════════════════════════════

Total Cycles:       10 of 154
...
```

**Key changes:**

- Header shows "(last N cycles)" suffix
- "Total Cycles" shows "N of TOTAL" format to indicate filter active
- All aggregate metrics computed only from filtered cycles
- Latency section threshold still applies (≥10 cycles with timing data _within the filter window_)

### By-Role Mode

```
📊 Role Performance (last 20 cycles)
═══════════════════════════════════════════════════════

Role          │ Cycles │ Tokens  │ Cost   │ Avg Time
──────────────┼────────┼─────────┼────────┼──────────
engineering   │     4  │  12.5k  │ $0.08  │ 45.2s
product       │     3  │   8.2k  │ $0.05  │ 38.1s
...

Showing: last 20 cycles (of 154 total)
```

**Key changes:**

- Header shows "(last N cycles)" suffix
- Footer shows "Showing: last N cycles (of TOTAL total)"
- Role counts only include filtered cycles

### Single Cycle Mode

When `--last N` is combined with `--cycle M`:

- If cycle M is within the last N cycles: show normally
- If cycle M is outside the window: show warning + the cycle anyway

```
⚠️  Note: Cycle 100 is outside the --last 20 window (cycles 135-154)
Showing cycle 100 anyway.

📍 Cycle 100 Details
...
```

---

## Edge Cases

| Case                     | Behavior                                                 |
| ------------------------ | -------------------------------------------------------- |
| `--last 0`               | Error: "Invalid value for --last: must be at least 1"    |
| `--last -5`              | Error: "Invalid value for --last: must be at least 1"    |
| `--last 999` (> total)   | Show all cycles, no error                                |
| `--last 5` with 3 cycles | Show all 3 cycles, footer: "Showing: 3 cycles (3 total)" |
| No flag                  | Show all cycles (default behavior unchanged)             |

---

## JSON Output

When `--last N` is active, add a `filter` field:

```json
{
  "filter": {
    "last": 10,
    "cycleRange": [145, 154]
  },
  "summary": {
    "totalCycles": 10,
    "unfilteredTotal": 154,
    ...
  },
  ...
}
```

For by-role JSON:

```json
{
  "filter": {
    "last": 20,
    "cycleRange": [135, 154]
  },
  "roles": { ... }
}
```

---

## Implementation Notes

### Core Changes

1. **MetricsManager** already supports windowed aggregation — reuse this
2. Add `last?: number` to `ObserveOptions` type
3. Filter logic: `cycles.slice(-N)` for last N items

### CLI Changes

1. Add `--last` / `-l` option to observe command
2. Pass to formatter functions
3. Formatters update headers/footers based on filter

### Validation

```typescript
if (options.last !== undefined && options.last < 1) {
  throw new Error('Invalid value for --last: must be at least 1');
}
```

---

## Test Cases

1. **Basic filter**: `--last 10` returns exactly 10 cycles
2. **Smaller than total**: `--last 5` with 3 cycles returns 3
3. **Larger than total**: `--last 999` returns all
4. **Edge validation**: `--last 0` and `--last -1` throw errors
5. **By-role filter**: `--by-role --last 10` aggregates only last 10
6. **JSON structure**: Verify `filter` field present in JSON output
7. **Header/footer text**: Verify "(last N cycles)" appears in output
8. **Combined with --cycle**: Warning appears when outside window

---

## Accessibility

- Filter indication in both header AND footer (screen readers may start at different points)
- Clear distinction between filtered count and total count
- No color-only indicators for filter state

---

## Related

- Issue #85: `--last N` flag (this spec's target)
- Issue #69: Agent Observability (parent)
- docs/product/observability-phase2-cli-spec.md (Product requirements)
- docs/design/latency-timer-cli-ux-spec.md (sibling feature)
