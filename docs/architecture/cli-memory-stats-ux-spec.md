# CLI Memory Stats UX Specification

> Detailed UX design for `ada memory stats` (Issue #52, Phase 2)
> Spec created: 2026-02-05 | Design Cycle 76 | 🎨 The Architect

## Overview

This document specifies the user experience for `ada memory stats`, the headline feature of Phase 2. Building on lessons from the Phase 1 UX audit and the proven pattern of "audit → fix → spec."

**Goal:** Give users instant visibility into memory system health with a single command.

---

## Command Signature

```bash
ada memory stats [options]
```

### Options

| Flag         | Description             | Default     |
| ------------ | ----------------------- | ----------- |
| `--json`     | Output as JSON          | false       |
| `--no-color` | Disable colored output  | auto-detect |
| `--verbose`  | Include archive history | false       |

---

## Output Design

### Standard Output (Default)

```
📊 Memory System Stats

Bank
  Version:          v4
  Last updated:     2 hours ago (2026-02-05 21:21 EST)
  Last compression: 2 days ago (2026-02-05)
  Size:             142 lines

Cycles
  Total:            75
  Since compression: 12
  Avg per day:      9.4

Role Activity (last 10 cycles)
  ⚙️  engineering   ████████████ 3
  🛡️ ops           ████████████ 3
  🔬 research      ████████     2
  📦 product       ████         1
  📋 scrum         ████         1

Sections
  ✅ Blockers:       0 active (healthy)
  📌 Active Threads: 12 tracked
  📋 Decisions:      5 ADRs
  💡 Lessons:        11 learned
  📈 Metrics:        current

Health: ✅ Healthy
```

### Color Scheme

| Element                            | Color            | Rationale            |
| ---------------------------------- | ---------------- | -------------------- |
| Section headers (`Bank`, `Cycles`) | Bold white       | Visual hierarchy     |
| Metric values (`v4`, `75`)         | Cyan             | Standout data        |
| Bars (activity chart)              | Green/yellow/red | Heat map by activity |
| Health: Healthy                    | Green + ✅       | Positive state       |
| Health: Warning                    | Yellow + ⚠️      | Needs attention      |
| Health: Unhealthy                  | Red + ❌         | Requires action      |

### Verbose Output (`--verbose`)

Adds archive history below Cycles section:

```
Archives (5 total)
  v4  2026-02-05  bank-2026-02-05-v3.md
  v3  2026-02-03  bank-2026-02-03-v2.md
  v2  2026-02-01  bank-2026-02-01-v1.md
  v1  2026-01-30  bank-2026-01-30-v0.md
```

### JSON Output (`--json`)

```json
{
  "bank": {
    "version": 4,
    "lastUpdated": "2026-02-05T21:21:00.000Z",
    "lastCompression": "2026-02-05",
    "lines": 142
  },
  "cycles": {
    "total": 75,
    "sinceCompression": 12,
    "perDay": 9.4
  },
  "roleActivity": {
    "engineering": 3,
    "ops": 3,
    "research": 2,
    "product": 1,
    "scrum": 1
  },
  "sections": {
    "blockers": 0,
    "activeThreads": 12,
    "decisions": 5,
    "lessons": 11
  },
  "health": {
    "status": "healthy",
    "warnings": []
  }
}
```

---

## Health Criteria

### Status: Healthy ✅

All conditions met:

- Bank lines < 200
- Cycles since compression < 10
- Blockers = 0
- Active threads ≤ 15

### Status: Warning ⚠️

One or more:

- Bank lines 150-200 → "Bank approaching compression threshold"
- Cycles since compression 8-9 → "Compression due soon"
- Blockers 1-2 → "N active blockers"
- Active threads 15-20 → "High thread count"

### Status: Unhealthy ❌

One or more:

- Bank lines > 200 → "Bank needs compression"
- Cycles since compression ≥ 10 → "Compression overdue"
- Blockers ≥ 3 → "Multiple blockers need attention"
- Active threads > 20 → "Thread sprawl — consider cleanup"

### Warning Display

When warnings exist:

```
Health: ⚠️ Warning
  - Bank approaching compression threshold (178/200 lines)
  - Compression due soon (9/10 cycles)
```

---

## Edge Cases

### Empty/New Bank

When memory bank has minimal content (e.g., just initialized):

```
📊 Memory System Stats

Bank
  Version:          v1
  Last updated:     just now
  Last compression: never
  Size:             24 lines

Cycles
  Total:            1
  Since compression: 1
  Avg per day:      —

Role Activity (last 10 cycles)
  (no activity recorded yet)

Sections
  ✅ Blockers:       0 active (healthy)
  📌 Active Threads: 0 tracked
  📋 Decisions:      0 ADRs
  💡 Lessons:        0 learned
  📈 Metrics:        initial

Health: ✅ Healthy (new project)
```

### Missing Bank File

```
❌ Memory bank not found

Expected: agents/memory/bank.md
Run `ada init` to create project structure.
```

### No Archives Directory

Archives section simply omitted if directory doesn't exist or is empty. No error.

### Corrupted Bank Header

If version/date cannot be parsed:

```
Bank
  Version:          unknown (parse error)
  Last updated:     unknown
```

Health status: Warning with "Unable to parse bank header"

---

## Role Activity Visualization

### Bar Chart Scaling

- Max bar width: 12 characters
- Normalized to highest-activity role
- Minimum: 1 character (if activity > 0)
- Roles with 0 activity in window: omitted

### Activity Window

Default: last 10 cycles (matches rotation.json history length)

Future enhancement: `--window 20` flag for custom window

### Role Ordering

Sort by activity count (descending), then alphabetically for ties.

---

## Sections Parsing

Leverage PR #51's improved section-aware extraction:

| Section        | Detection                                     |
| -------------- | --------------------------------------------- |
| Blockers       | `### Blockers` header, filter "None" patterns |
| Active Threads | `## Active Threads` header, count `- ` lines  |
| Decisions      | `## Architecture Decisions` table rows        |
| Lessons        | `## Key Lessons` numbered list                |
| Metrics        | `## Project Metrics` key-value pairs          |

---

## Consistency with Phase 1

### Shared Patterns

| Pattern            | Phase 1     | Phase 2 Stats        |
| ------------------ | ----------- | -------------------- |
| `--json`           | ✅          | ✅ (required)        |
| `--no-color`       | ✅          | ✅                   |
| `--verbose`        | search only | ✅ (adds archives)   |
| Progress indicator | search      | Not needed (instant) |
| Emoji prefixes     | ✅          | ✅                   |

### Error Message Format

Follow established CLI error format:

```
❌ Error: <brief description>

<context/details>

<actionable suggestion>
```

---

## Implementation Notes

### Core Utility Functions Needed

```typescript
// packages/core/src/memory/stats.ts

interface MemoryStats {
  bank: BankInfo;
  cycles: CycleInfo;
  roleActivity: Record<string, number>;
  sections: SectionCounts;
  health: HealthStatus;
}

function extractMemoryStats(bankPath: string): MemoryStats;
function calculateHealth(stats: MemoryStats): HealthStatus;
function formatActivityBar(count: number, max: number): string;
```

### CLI Integration

```typescript
// packages/cli/src/commands/memory/stats.ts

export const statsCommand = new Command('stats')
  .description('Show memory system health and metrics')
  .option('--json', 'Output as JSON')
  .option('--no-color', 'Disable colored output')
  .option('--verbose', 'Include archive history')
  .action(async (options) => { ... });
```

### Test Cases

1. Healthy bank → shows green health
2. Near-compression bank → shows warning
3. Empty bank → shows "new project" message
4. Missing bank → shows error with `ada init` suggestion
5. Many archives → verbose mode shows list
6. JSON output → valid JSON matching schema
7. High blocker count → unhealthy status
8. Role activity calculation → correct counts from history

---

## Future Considerations

### Phase 3 Potential

- `ada memory stats --compare v3` — diff against archived version
- `ada memory stats --timeline` — sparkline of activity over time
- `ada memory stats --role engineering` — deep dive on single role
- Dashboard integration — stats as JSON for web UI

### Performance

Stats calculation should be <100ms for typical banks. No expensive operations needed — simple regex parsing of a <200 line file.

---

## Acceptance Checklist

- [ ] Output matches spec mockup
- [ ] Color scheme implemented correctly
- [ ] Health criteria evaluated correctly
- [ ] Edge cases handled gracefully
- [ ] JSON output matches schema
- [ ] `--verbose` shows archives
- [ ] Consistent with Phase 1 patterns
- [ ] All test cases pass

---

_Spec by 🎨 Design — Cycle 76_
_Ref: Issue #52, Issue #50, docs/architecture/cli-memory-ux-audit.md_
