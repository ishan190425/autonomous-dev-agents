# `--export` File Export UX Specification

> Design spec for Issue #94 — Phase 2 Feature 4/4
> 🎨 _Design (The Architect) | Cycle 165_

---

## Overview

The `--export <file>` flag enables developers to export observability data to files for external tools, reporting, backups, and sharing. This feature completes the Phase 2 Agent Observability epic.

---

## Command Interface

```bash
# Basic export to CSV
ada observe --export metrics.csv

# Export to JSON (programmatic use)
ada observe --export metrics.json

# Combined with filters
ada observe --by-role --export role-breakdown.csv
ada observe --last 10 --export recent-cycles.json
ada observe --cycle 150 --export cycle-150-trace.json

# Cost command export
ada costs --export costs-feb-2026.csv

# Force overwrite without prompt
ada observe --export metrics.csv --force
```

### Flag Specification

| Flag       | Short | Type      | Default     | Description                             |
| ---------- | ----- | --------- | ----------- | --------------------------------------- |
| `--export` | `-e`  | `string`  | `undefined` | Export to file (format from extension)  |
| `--force`  | `-f`  | `boolean` | `false`     | Overwrite existing files without prompt |

---

## Format Detection

Auto-detect output format from file extension — no `--format` flag needed.

| Extension | Format | MIME Type            | Use Case                           |
| --------- | ------ | -------------------- | ---------------------------------- |
| `.csv`    | CSV    | `text/csv`           | Spreadsheets, Excel, Google Sheets |
| `.json`   | JSON   | `application/json`   | APIs, scripts, Grafana, Datadog    |
| `.tsv`    | TSV    | `text/tab-separated` | Tab-separated for specific tools   |

### Unsupported Extension

```
✗ Unsupported export format: .xml

Supported formats:
  .csv   Comma-separated values (spreadsheets)
  .json  JSON (APIs, dashboards)
  .tsv   Tab-separated values
```

---

## CSV Output Format

### Dashboard Export (Default)

```csv
cycle,role,timestamp,tokens_input,tokens_output,tokens_total,cost_usd,duration_ms,status
150,engineering,2026-02-07T22:30:00Z,1234,567,1801,0.0234,4521,success
151,ops,2026-02-07T23:00:00Z,987,432,1419,0.0189,3210,success
152,design,2026-02-07T23:30:00Z,1456,678,2134,0.0278,5102,success
```

**Column Specification:**

| Column          | Type     | Description                          |
| --------------- | -------- | ------------------------------------ |
| `cycle`         | integer  | Cycle number                         |
| `role`          | string   | Role ID (engineering, ops, etc.)     |
| `timestamp`     | ISO 8601 | Cycle start time (UTC)               |
| `tokens_input`  | integer  | Input tokens used                    |
| `tokens_output` | integer  | Output tokens generated              |
| `tokens_total`  | integer  | Total tokens (input + output)        |
| `cost_usd`      | float    | Cost in USD (4 decimal places)       |
| `duration_ms`   | integer  | Cycle duration in milliseconds       |
| `status`        | string   | Cycle outcome (success/failure/skip) |

### By-Role Export

```csv
role,cycles,tokens_total,cost_usd,avg_duration_ms,efficiency_tokens_per_sec
engineering,25,45230,1.23,4521,10.01
ops,24,38120,0.98,3210,11.87
design,23,29450,0.76,5102,5.77
```

### Cost Export (`ada costs`)

```csv
period,cycles,tokens_input,tokens_output,tokens_total,cost_usd
all_time,154,234567,123456,358023,8.92
last_24h,12,18920,9870,28790,0.72
today,4,6230,3120,9350,0.23
```

### CSV Formatting Rules

- **Headers:** Always included as first row
- **Quoting:** Values containing commas, quotes, or newlines are quoted
- **Escaping:** Double quotes escaped as `""`
- **Numbers:** No thousands separators, decimals use `.`
- **Timestamps:** ISO 8601 format, always UTC
- **Encoding:** UTF-8 with BOM for Excel compatibility

---

## JSON Output Format

### Dashboard Export (Default)

Matches existing `--json` structure with export metadata:

```json
{
  "export": {
    "format": "json",
    "timestamp": "2026-02-08T05:30:00Z",
    "source": "ada observe --export metrics.json",
    "version": "1.0.0"
  },
  "filter": null,
  "summary": {
    "totalCycles": 154,
    "totalTokens": 358023,
    "totalCost": 8.92,
    "avgDuration": 4210,
    "successRate": 0.987
  },
  "cycles": [
    {
      "cycle": 150,
      "role": "engineering",
      "timestamp": "2026-02-07T22:30:00Z",
      "tokens": { "input": 1234, "output": 567, "total": 1801 },
      "cost": 0.0234,
      "duration": 4521,
      "status": "success"
    }
  ]
}
```

### By-Role Export

```json
{
  "export": { ... },
  "filter": { "byRole": true },
  "roles": {
    "engineering": {
      "cycles": 25,
      "tokens": 45230,
      "cost": 1.23,
      "avgDuration": 4521,
      "efficiency": 10.01
    }
  }
}
```

### With `--last N` Filter

```json
{
  "export": { ... },
  "filter": {
    "last": 10,
    "cycleRange": [145, 154]
  },
  "summary": {
    "totalCycles": 10,
    "unfilteredTotal": 154,
    ...
  }
}
```

---

## Interactive Behavior

### File Exists — Overwrite Prompt

When target file exists and `--force` is not set:

```
⚠️  File already exists: metrics.csv

  Existing file:
    Size: 12.4 KB
    Modified: 2026-02-07 22:30:00

? Overwrite? (y/N) _
```

Responses:

- `y` / `Y` / `yes` → Overwrite and continue
- `n` / `N` / `no` / Enter → Abort with message
- Ctrl+C → Abort silently

### Non-Interactive Mode

When running in CI/scripts (`--no-prompt` or no TTY), file exists without `--force`:

```
✗ File already exists: metrics.csv

Use --force to overwrite, or specify a different filename.
```

Exit code: 1

---

## Progress Feedback

### Small Exports (< 100 cycles)

No progress indicator needed — operation is instant:

```
ada observe --export metrics.csv
✓ Exported 154 cycles to metrics.csv (12.4 KB)
```

### Large Exports (≥ 100 cycles)

Show progress for transparency:

```
ada observe --export metrics.csv
⠋ Exporting 1,234 cycles...
✓ Exported 1,234 cycles to metrics.csv (156.2 KB)
```

---

## Success Output

```
✓ Exported 154 cycles to metrics.csv (12.4 KB)
```

Components:

- ✓ checkmark (green)
- Cycle count exported
- Filename
- File size (human-readable: B, KB, MB)

### With Filter Active

```
✓ Exported 10 cycles (of 154 total) to recent.json (2.1 KB)
```

---

## Error Messages

### Permission Denied

```
✗ Cannot write to file: /etc/metrics.csv

  Permission denied. Check file permissions or choose a different location.
```

### Directory Not Found

```
✗ Cannot write to file: ./reports/2026/metrics.csv

  Directory not found: ./reports/2026/

  Create it with: mkdir -p ./reports/2026
```

### Disk Full

```
✗ Failed to export: Disk full

  Not enough space to write 156 KB.
  Free up space or choose a different location.
```

### No Data to Export

```
⚠️  No cycles to export.

  Your project has no recorded dispatch cycles yet.
  Run a dispatch cycle first: ada dispatch
```

Export file is NOT created when empty (avoid confusion with stale files).

---

## Edge Cases

| Case                         | Behavior                                                  |
| ---------------------------- | --------------------------------------------------------- |
| Empty filename `--export ""` | Error: "Export filename cannot be empty"                  |
| No extension `--export data` | Error: "Missing file extension. Use .csv, .json, or .tsv" |
| Path with spaces             | Works correctly (shell handles quoting)                   |
| Unicode in path              | UTF-8 paths supported                                     |
| Relative path `./out.csv`    | Resolve relative to cwd                                   |
| Absolute path `/tmp/out.csv` | Use as-is                                                 |
| Home expansion `~/out.csv`   | Expand `~` to home directory                              |
| Stdout `-`                   | Reserved for future (pipe to stdout)                      |

---

## Flag Combinations

| Flags                             | Behavior                                    |
| --------------------------------- | ------------------------------------------- |
| `--export metrics.csv`            | Export full dashboard as CSV                |
| `--by-role --export roles.csv`    | Export role breakdown as CSV                |
| `--cycle 150 --export trace.json` | Export single cycle trace as JSON           |
| `--last 10 --export recent.csv`   | Export last 10 cycles as CSV                |
| `--by-role --last 10 --export`    | Export role breakdown of last 10 cycles     |
| `--json --export out.json`        | Redundant but allowed (JSON output to file) |
| `--export out.csv --force`        | Overwrite without prompt                    |

### Invalid Combinations

| Flags                    | Error                           |
| ------------------------ | ------------------------------- |
| `--export (no filename)` | "Missing filename for --export" |

---

## Implementation Notes

### Core Library

```typescript
interface ExportOptions {
  path: string; // Output file path
  format: 'csv' | 'json' | 'tsv'; // Detected from extension
  force: boolean; // Skip overwrite prompt
}

interface ExportResult {
  path: string; // Absolute path written
  format: string; // Format used
  cycleCount: number; // Cycles exported
  filteredCount?: number; // If filter active: unfiltered total
  bytes: number; // File size in bytes
}
```

### CSV Generation

Consider using a lightweight CSV library or simple string building:

```typescript
// Minimal CSV escaping
function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
```

### File I/O

```typescript
import { writeFileSync, existsSync, statSync } from 'fs';
import { resolve, extname } from 'path';

function detectFormat(filePath: string): 'csv' | 'json' | 'tsv' {
  const ext = extname(filePath).toLowerCase();
  const formats: Record<string, 'csv' | 'json' | 'tsv'> = {
    '.csv': 'csv',
    '.json': 'json',
    '.tsv': 'tsv',
  };
  if (!formats[ext]) {
    throw new Error(`Unsupported export format: ${ext}`);
  }
  return formats[ext];
}
```

---

## Test Cases

### Format Detection

1. `.csv` → CSV format
2. `.json` → JSON format
3. `.tsv` → TSV format
4. `.CSV` → CSV format (case-insensitive)
5. `.xml` → Error with supported formats list
6. No extension → Error with guidance

### File Handling

7. New file → Created successfully
8. Existing file + no `--force` → Prompt (interactive) or error (non-interactive)
9. Existing file + `--force` → Overwrite without prompt
10. Permission denied → Clear error message
11. Invalid directory → Error with mkdir suggestion

### Content

12. Full dashboard → All cycles, summary stats
13. `--by-role` → Role aggregation
14. `--last 10` → Filtered cycles with metadata
15. `--cycle N` → Single cycle trace
16. Empty data → Warning, no file created

### Output

17. Success message includes count and size
18. Filtered export shows "X of Y total"
19. Progress shows for large exports (≥100 cycles)

---

## Accessibility

- Progress indicators use text alongside spinners (screen reader friendly)
- Error messages are descriptive, not just "failed"
- File sizes in human-readable format
- Color is supplementary, not the only indicator

---

## Migration & Compatibility

- New flag, no breaking changes
- JSON structure has `export.version` for future schema evolution
- CSV headers are stable; new columns append at end

---

## Related

- Issue #94: `--export` flag (this spec's target)
- Issue #69: Agent Observability (parent)
- Issue #85: `--last N` flag (combinable)
- docs/design/last-n-cli-ux-spec.md (sibling spec)
- docs/design/latency-timer-cli-ux-spec.md (Phase 2 Feature 2/4)
- docs/product/observability-phase2-cli-spec.md (Product requirements)
