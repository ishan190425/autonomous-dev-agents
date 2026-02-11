# Sprint 2 CLI UX Specification

> **Author:** 🎨 Design — Cycle 375  
> **Sprint 2:** 2026-02-28 → 2026-03-14  
> **References:** User Stories (C370), Implementation Contract (C373), CLI UX Polish (#73)

---

## Purpose

This document specifies the user experience for Sprint 2 CLI commands. It bridges the gap between user stories (what) and implementation (how it works) by defining **how it looks and feels**.

Design principles from #73:

- **Scannable:** Key info visible at a glance
- **Progressive disclosure:** Summary first, details on request
- **Consistent:** Same patterns across commands
- **Colorful but accessible:** Colors enhance, never required

---

## 1. Terminal Mode (`ada terminal run`)

### 1.1 Session Start

```
$ ada terminal run

╭─────────────────────────────────────────────────────────╮
│  🖥️  Terminal Mode — Session #7                          │
│  Shell: zsh • CWD: ~/project • Signals: ON              │
╰─────────────────────────────────────────────────────────╯

Type commands normally. ADA captures activity for heat scoring.
Press Ctrl+D or type 'exit' to end session.

ada-terminal ~/project $
```

**Design Notes:**

- Box header gives context without overwhelming
- Shell/CWD/Signals status at a glance
- Custom prompt prefix `ada-terminal` distinguishes from normal shell
- Prompt includes current directory (like standard shells)

### 1.2 Command Execution (Normal)

```
ada-terminal ~/project $ npm test

  PASS  src/heat/calculate.test.ts (0.847s)
  PASS  src/heat/store.test.ts (0.234s)

  Tests:   47 passed
  Time:    1.081s

ada-terminal ~/project $
```

**Design Notes:**

- Command output appears exactly as user expects (no wrapping)
- No inline signal indicators — signals captured silently
- Preserve ANSI colors from subprocesses

### 1.3 Command Execution (Signal Captured)

When a significant signal is captured, show subtle indicator after command completes:

```
ada-terminal ~/project $ vim src/heat/calculate.ts

  📍 Signal: src/heat/calculate.ts (file_access)

ada-terminal ~/project $ npm test -- --updateSnapshot

  PASS  src/heat/__tests__/calculate.test.ts
  Tests:   47 passed

  📍 Signals: 3 files captured from test output

ada-terminal ~/project $
```

**Design Notes:**

- `📍` emoji for signal capture (not 🔥 — that's for display)
- One-line summary, not per-file spam
- Only show when signals > 0

### 1.4 Session End

```
ada-terminal ~/project $ exit

╭─────────────────────────────────────────────────────────╮
│  Session #7 Complete                                     │
│  Duration: 12m 34s • Commands: 23 • Signals: 47         │
╰─────────────────────────────────────────────────────────╯

Signals stored to: agents/memory/heat/signals.jsonl
Run 'ada heat show' to see updated scores.
```

**Design Notes:**

- Summary box bookends with start box
- Duration, commands, signals at a glance
- Actionable next step

### 1.5 Error States

**Shell detection failure:**

```
⚠️  Could not detect shell (expected: bash, zsh, fish)
    Falling back to /bin/sh — some features may be limited.
```

**Command timeout:**

```
⏱️  Command timed out after 5m (configurable via --timeout)
    Process killed. Partial output captured.
```

---

## 2. Heat Scoring Commands

### 2.1 Heat Status (`ada heat status`)

Quick overview of heat scoring state:

```
$ ada heat status

🌡️  Heat Status
   Signals:  2,347 (last 30 days)
   Files:    89 tracked
   Updated:  2 minutes ago

   Hottest:  src/heat/calculate.ts (0.94)
   Coldest:  README.md (0.12)
```

**Design Notes:**

- Compact summary view
- Single emoji header
- Hottest/coldest gives immediate insight
- No table, just key stats

### 2.2 Heat Show (`ada heat show`)

Detailed heat scores with visual indicators:

```
$ ada heat show

🔥 Hot Files (8)
   0.94  src/heat/calculate.ts          47 signals
   0.91  src/terminal/executor.ts        38 signals
   0.88  src/dispatch.ts                 35 signals
   0.85  packages/cli/src/commands/heat.ts   29 signals
   0.82  src/heat/store.ts               27 signals
   0.81  src/heat/types.ts               25 signals
   0.80  src/terminal/shell-detector.ts  23 signals
   0.80  agents/memory/bank.md           22 signals

🌡️ Warm Files (12)
   0.72  src/memory.ts                   18 signals
   0.65  src/rotation.ts                 14 signals
   0.58  packages/cli/src/commands/dispatch.ts  11 signals
   ...and 9 more (use --all to see all)

❄️ Cold Files (69)
   Showing 0 of 69 (use --cold to include)

─────────────────────────────────────────────
Total: 89 files • 2,347 signals • Updated 2m ago
```

**Design Notes:**

- Three tiers with distinct emoji: 🔥 hot, 🌡️ warm, ❄️ cold
- Score left-aligned for visual scanning
- Signal count provides context
- Default hides cold (too many, not actionable)
- Footer with totals

### 2.3 Heat Show with Path Filter

```
$ ada heat show --path=src/heat/

🔥 src/heat/ (5 files)
   0.94  calculate.ts     47 signals
   0.82  store.ts         27 signals
   0.81  types.ts         25 signals
   0.45  signals.ts       8 signals
   0.38  index.ts         5 signals
```

**Design Notes:**

- Relative paths when filtered
- Show all tiers within filter (no hiding)

### 2.4 Heat Show JSON

```
$ ada heat show --json

{
  "generated_at": "2026-03-10T14:30:00Z",
  "summary": {
    "total_files": 89,
    "total_signals": 2347,
    "hot": 8,
    "warm": 12,
    "cold": 69
  },
  "files": [
    {
      "path": "src/heat/calculate.ts",
      "score": 0.94,
      "tier": "hot",
      "signal_count": 47,
      "last_signal_at": "2026-03-10T14:28:00Z"
    },
    ...
  ]
}
```

**Design Notes:**

- Machine-readable for scripting
- All files included (no tier hiding)
- Same data, different format

---

## 3. Dispatch Status Integration

### 3.1 Updated Dispatch Status

Extend `ada dispatch status` to include heat:

```
$ ada dispatch status

📋 Dispatch Status — Cycle 375

  Current Role:   🎨 The Architect (Design)
  Last Action:    C374 — 🛡️ Pre-Launch Branch Hygiene
  Next Role:      👔 CEO

┌─────────────────────────────────────────────────────────┐
│  Rotation: ceo → growth → research → frontier → product │
│            scrum → qa → engineering → ops → design*     │
└─────────────────────────────────────────────────────────┘

🔥 Hot Files (focus here)
   0.94  src/heat/calculate.ts
   0.91  src/terminal/executor.ts
   0.88  src/dispatch.ts
   0.85  packages/cli/src/commands/heat.ts
   0.82  src/heat/store.ts
```

**Design Notes:**

- Heat section added below rotation
- Only top 5 hot files (actionable, not overwhelming)
- "focus here" cue for agents
- Integrates with existing output format

### 3.2 Verbose Mode

```
$ ada dispatch status --verbose

[existing output...]

🌡️ Heat Summary
   Hot:   8 files (avg 0.86)
   Warm:  12 files (avg 0.58)
   Cold:  69 files (avg 0.18)

   Most Active Today:
   📍 src/heat/calculate.ts — 12 new signals
   📍 src/terminal/executor.ts — 8 new signals

   Run 'ada heat show' for full breakdown.
```

---

## 4. Metrics Commands

### 4.1 Metrics Summary (`ada metrics`)

```
$ ada metrics

📊 Token Usage (last 7 days)

   Day         In        Out       Cost*
   ─────────────────────────────────────
   Feb 10    ~12,400   ~8,200     $0.06
   Feb 9      15,300   10,100     $0.08
   Feb 8     ~11,800   ~7,500     $0.06
   Feb 7      14,200    9,800     $0.07
   Feb 6     ~13,100   ~8,900     $0.07
   Feb 5      16,500   11,200     $0.08
   Feb 4     ~10,200   ~6,400     $0.05
   ─────────────────────────────────────
   Total     ~93,500  ~62,100     $0.47

~ indicates estimated (actual counts unavailable)
* Cost at $0.003/1k tokens (--price-per-1k to customize)
```

**Design Notes:**

- Table format for temporal data
- `~` prefix for estimates (clear but compact)
- Cost included by default (most common question)
- Footnotes explain symbols

### 4.2 Metrics by Role

```
$ ada metrics --by-role

📊 Token Usage by Role (last 7 days)

   Role           Cycles    Tokens In    Tokens Out
   ───────────────────────────────────────────────────
   engineering       12      ~18,400      ~12,200
   research          10       15,300       10,100
   design             9      ~11,800       ~7,500
   product            8       14,200        9,800
   qa                 7      ~10,100       ~6,200
   ops                7        8,500        5,400
   scrum              6       ~7,200       ~4,800
   frontier           5        6,800        4,500
   growth             4        5,100        3,200
   ceo                2        2,100        1,400
   ───────────────────────────────────────────────────
   Total             70      ~99,500      ~65,100
```

### 4.3 Metrics JSON

```
$ ada metrics --json

{
  "period": "7d",
  "generated_at": "2026-02-10T22:18:00Z",
  "totals": {
    "cycles": 70,
    "tokens_in": { "actual": 42100, "estimated": 51400 },
    "tokens_out": { "actual": 28200, "estimated": 33900 },
    "cost_usd": 0.47
  },
  "by_day": [...],
  "by_role": [...]
}
```

---

## 5. Color Scheme

Consistent color usage across commands:

| Element      | Color      | ANSI Code        | Usage                       |
| ------------ | ---------- | ---------------- | --------------------------- |
| Success/Hot  | Red/Orange | `\x1b[38;5;208m` | 🔥, high scores, success    |
| Warning/Warm | Yellow     | `\x1b[33m`       | 🌡️, medium scores, warnings |
| Info/Cold    | Cyan       | `\x1b[36m`       | ❄️, low scores, info        |
| Muted        | Gray       | `\x1b[90m`       | Secondary text, estimates   |
| Error        | Red        | `\x1b[31m`       | Errors, failures            |
| Emphasis     | Bold       | `\x1b[1m`        | Headers, key values         |

**Accessibility:**

- All colors paired with emoji or symbols
- `--no-color` flag disables ANSI codes
- Information conveyed by text, not just color

---

## 6. Empty States

### No Signals Yet

```
$ ada heat show

🌡️ No heat signals recorded yet.

   Start a terminal session to capture activity:
   $ ada terminal run

   Or manually record a signal:
   $ ada heat signal --file=src/index.ts --type=file_access
```

### No Metrics Yet

```
$ ada metrics

📊 No metrics recorded yet.

   Metrics are captured during dispatch cycles.
   Run a dispatch cycle to start collecting:
   $ ada dispatch start
```

**Design Notes:**

- Never show empty tables
- Explain why empty
- Provide actionable next step

---

## 7. Error Messages

Consistent error format:

```
✖ Error: Could not read signals file

   Path: agents/memory/heat/signals.jsonl
   Cause: File not found

   Try: Run 'ada heat init' to create heat storage
```

**Structure:**

1. ✖ + "Error:" + brief description
2. Context (path, value, etc.)
3. Cause (what went wrong)
4. Try (actionable fix)

---

## 8. Implementation Notes

### Shared Components

```typescript
// packages/cli/src/ui/
├── box.ts           // Bordered boxes (╭╮╰╯)
├── table.ts         // ASCII tables with alignment
├── heat-display.ts  // Heat tier formatting (🔥🌡️❄️)
├── colors.ts        // ANSI color helpers
└── errors.ts        // Consistent error formatting
```

### Testing

- Snapshot tests for all output formats
- `--no-color` mode for CI diffing
- `--json` mode always available for machine consumption

---

## 9. User Story Coverage

| Story    | CLI Command                  | UX Spec Section |
| -------- | ---------------------------- | --------------- |
| US-125-1 | `ada terminal run`           | Section 1       |
| US-125-3 | Signal indicators            | Section 1.3     |
| US-118-1 | `ada heat status`            | Section 2.1     |
| US-118-2 | `ada heat show`              | Section 2.2-2.4 |
| US-118-3 | `ada dispatch status` (heat) | Section 3       |
| US-83-1  | Estimation display (~)       | Section 4.1     |
| US-83-2  | `ada metrics`                | Section 4       |
| US-83-3  | `ada metrics` dashboard      | Section 4.1-4.3 |

---

## 10. Open Design Decisions

For Engineering feedback:

1. **Terminal prompt prefix:** `ada-terminal` or `ada$` or `[ada]`?
2. **Signal indicators:** Show inline after command, or suppress to session end?
3. **Heat thresholds in display:** Show score boundaries (>0.8 = hot)?
4. **Color for estimates:** Gray `~` or yellow warning?

---

_🎨 The Architect — Cycle 375_
