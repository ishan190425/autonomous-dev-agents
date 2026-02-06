# CLI Memory Phase 2: Filters & Export UX Specification

> Detailed UX design for `--role`, `--since`, `--until` filters and `ada memory export`
> Spec created: 2026-02-06 | Design Cycle 86 | 🎨 The Architect
> Follows: cli-memory-stats-ux-spec.md (shipped in PR #55)

## Overview

This document specifies the remaining Phase 2 features after `ada memory stats` shipped:

1. **Role filter** (`--role`) — Filter search/list by role
2. **Date filters** (`--since`, `--until`) — Time-based filtering
3. **Export command** (`ada memory export`) — Backup and migration

**Goal:** Complete Phase 2 with consistent, intuitive UX that follows established patterns.

---

## Part 1: Role Filter (`--role`)

### Command Signatures

```bash
# Search with role filter
ada memory search "authentication" --role engineering

# List with role filter
ada memory list --role ops
```

### Behavior

| Context  | Effect                                                                 |
| -------- | ---------------------------------------------------------------------- |
| `search` | Filter results to entries authored by or mentioning the specified role |
| `list`   | Show only the specified role's state section                           |

### Valid Role Values

Match `roster.json` role IDs:

- `ceo`, `growth`, `research`, `frontier`, `product`, `scrum`, `qa`, `engineering`, `ops`, `design`

### Output: `list --role`

```bash
$ ada memory list --role engineering

⚙️ Engineering (Role State)

Last: `ada memory stats` Implementation (PR #55, Issue #52, Cycle 84) — Implemented
      the Phase 2 headline feature: memory system health dashboard. New core module
      (memory-stats.ts) with 14 exported functions. 37 new unit tests. Total tests
      now 258. ✅ PR #55 MERGED (Cycle 85).

Working on: —

Next: Phase 2 remaining (--since/--until filters, export command), Issue #54
      coverage gaps
```

### Output: `search --role`

```bash
$ ada memory search "parser" --role qa

🔍 Search Results for "parser" (filtered by: qa)

1. [Role State → QA] ...enabled coverage tooling. Fixed empty describe block.
   Created Issue #54 for core coverage improvements...
   Match: "parser" in context of coverage audit

2. [Active Threads] ...Issue #50 Parser Fixes — ✅ COMPLETE. PR #51 merged...
   Match: QA in thread participants

Found 2 results (10 total matches, 8 filtered by role)
```

### Edge Cases

| Case                       | Behavior                                                           |
| -------------------------- | ------------------------------------------------------------------ |
| Invalid role               | `❌ Unknown role: "devops". Valid roles: ceo, growth, research...` |
| Role with no entries       | `ℹ️ No results for role "frontier" matching query "auth"`          |
| Combined with date filters | Filters are additive (AND logic)                                   |

---

## Part 2: Date Filters (`--since`, `--until`)

### Command Signatures

```bash
# Show entries since a date
ada memory list --since 2026-02-01

# Show entries until a date
ada memory list --until 2026-02-05

# Date range
ada memory list --since 2026-02-01 --until 2026-02-05

# Combine with role
ada memory list --role engineering --since 2026-02-01
```

### Date Format Support

Accept multiple formats for user convenience:

| Format          | Example            | Parsed As             |
| --------------- | ------------------ | --------------------- |
| ISO date        | `2026-02-01`       | 2026-02-01 00:00:00   |
| ISO datetime    | `2026-02-01T10:30` | 2026-02-01 10:30:00   |
| Relative day    | `today`            | Start of current day  |
| Relative day    | `yesterday`        | Start of previous day |
| Relative period | `7d` or `7days`    | 7 days ago            |
| Relative period | `2w` or `2weeks`   | 14 days ago           |

### Behavior

- `--since` is inclusive (on or after)
- `--until` is inclusive (on or before)
- Filters apply to the `Last updated` timestamp in role states and history entries

### Output: Date-Filtered List

```bash
$ ada memory list --since 2026-02-05

📋 Memory Bank (since 2026-02-05)

Last updated: 2026-02-06 03:31 EST | Cycle 85 | Version 4

Role Activity (3 roles active in window)
  ⚙️  engineering   Cycle 84 — `ada memory stats` Implementation
  🛡️ ops           Cycle 85 — PR #55 Merge
  🔍 qa            Cycle 83 — Test Coverage Audit

Recent History (5 entries)
  85. 🛡️ ops    — PR #55 Merge (2026-02-06 03:31 EST)
  84. ⚙️ eng    — `ada memory stats` Implementation (2026-02-06 02:57 EST)
  83. 🔍 qa     — Test Coverage Audit (2026-02-06 02:18 EST)
  82. 📋 scrum  — Retrospective cycles 72-81 (2026-02-06 01:36 EST)
  81. 📦 prod   — Getting Started Guide (2026-02-06 01:04 EST)
```

### Output: Date Range Query

```bash
$ ada memory list --since 2026-02-01 --until 2026-02-03

📋 Memory Bank (2026-02-01 to 2026-02-03)

Cycles in window: 45-62 (18 cycles)
Roles active: 8

[... filtered output ...]
```

### Edge Cases

| Case                       | Behavior                                                                       |
| -------------------------- | ------------------------------------------------------------------------------ |
| Future date                | `⚠️ Warning: --since date is in the future, no results possible`               |
| `--until` before `--since` | `❌ Error: --until (Feb 1) is before --since (Feb 5)`                          |
| Invalid format             | `❌ Invalid date format: "last week". Use YYYY-MM-DD, today, yesterday, or Nd` |
| No entries in range        | `ℹ️ No activity found between 2026-01-15 and 2026-01-20`                       |

---

## Part 3: Export Command

### Command Signature

```bash
ada memory export [options]
```

### Options

| Flag                 | Description                     | Default                         |
| -------------------- | ------------------------------- | ------------------------------- |
| `--output <path>`    | Output file path                | `memory-export-YYYY-MM-DD.json` |
| `--include-archives` | Include all archived versions   | false                           |
| `--format <type>`    | Export format (json, markdown)  | json                            |
| `--since <date>`     | Only include entries after date | —                               |

### Output: Standard Export

```bash
$ ada memory export

📦 Exporting memory bank...

✅ Exported to memory-export-2026-02-06.json
   Bank version: v4
   Cycles: 85
   Size: 24.3 KB
```

### Output: Full Archive Export

```bash
$ ada memory export --include-archives --output full-backup.json

📦 Exporting memory bank with archives...

✅ Exported to full-backup.json
   Bank version: v4
   Archives: 4 versions included
   Total cycles: 85
   Size: 142.7 KB
```

### JSON Export Schema

```json
{
  "version": "1.0",
  "exportedAt": "2026-02-06T08:00:00.000Z",
  "bank": {
    "version": 4,
    "lastUpdated": "2026-02-06T08:31:00.000Z",
    "lastCompression": "2026-02-05",
    "content": "# 🧠 Memory Bank\n\n> The shared brain..."
  },
  "metadata": {
    "cycleCount": 85,
    "roles": [
      "ceo",
      "growth",
      "research",
      "frontier",
      "product",
      "scrum",
      "qa",
      "engineering",
      "ops",
      "design"
    ],
    "issueCount": 55,
    "prCount": 17
  },
  "archives": [
    {
      "version": 3,
      "date": "2026-02-05",
      "filename": "bank-2026-02-05-v3.md",
      "content": "..."
    }
  ]
}
```

### Markdown Export (`--format markdown`)

Creates a single consolidated markdown file:

```markdown
# Memory Export — 2026-02-06

## Current Bank (v4)

[full bank.md content]

---

## Archive: v3 (2026-02-05)

[archived content]

...
```

### Edge Cases

| Case                | Behavior                                               |
| ------------------- | ------------------------------------------------------ |
| File exists         | `⚠️ File exists. Overwrite? [y/N]` (or `--force` flag) |
| No write permission | `❌ Cannot write to /path: Permission denied`          |
| No archives dir     | `ℹ️ No archives found, exporting current bank only`    |
| Large export        | Progress indicator: `📦 Exporting... 3/5 archives`     |

---

## Implementation Notes

### Filter Logic (Shared)

```typescript
// packages/core/src/memory/filters.ts

interface FilterOptions {
  role?: string;
  since?: Date;
  until?: Date;
}

function applyFilters(
  entries: MemoryEntry[],
  filters: FilterOptions
): MemoryEntry[];
function parseRelativeDate(input: string): Date | null;
function validateDateRange(since?: Date, until?: Date): void;
```

### Export Logic

```typescript
// packages/core/src/memory/export.ts

interface ExportOptions {
  includeArchives?: boolean;
  format?: 'json' | 'markdown';
  since?: Date;
}

interface MemoryExport {
  version: string;
  exportedAt: Date;
  bank: BankExport;
  metadata: ExportMetadata;
  archives?: ArchiveExport[];
}

function exportMemory(bankPath: string, options: ExportOptions): MemoryExport;
function writeExport(data: MemoryExport, outputPath: string): void;
```

### CLI Registration

```typescript
// Add to existing memory command group

// Role filter (add to search and list)
.option('--role <role>', 'Filter by role')

// Date filters (add to list)
.option('--since <date>', 'Show entries on or after date')
.option('--until <date>', 'Show entries on or before date')

// Export subcommand
export const exportCommand = new Command('export')
  .description('Export memory bank for backup/migration')
  .option('--output <path>', 'Output file path')
  .option('--include-archives', 'Include archived versions')
  .option('--format <type>', 'Export format (json, markdown)', 'json')
  .option('--since <date>', 'Only include entries after date')
  .option('--force', 'Overwrite existing file without prompt')
  .action(async (options) => { ... });
```

---

## Test Cases

### Role Filter Tests

1. `--role engineering` → only engineering entries
2. `--role invalid` → error with valid role list
3. `--role` combined with `--since` → both filters applied
4. Case insensitive role matching (`Engineering` = `engineering`)

### Date Filter Tests

1. `--since 2026-02-01` → entries from Feb 1 onward
2. `--since today` → today's entries only
3. `--since 7d` → last 7 days
4. `--until` before `--since` → validation error
5. Future `--since` → warning message
6. ISO datetime with time → correct parsing

### Export Tests

1. Default export → creates timestamped JSON file
2. `--include-archives` → includes all archive content
3. `--format markdown` → valid markdown output
4. `--output custom.json` → writes to specified path
5. Existing file without `--force` → prompts user
6. Empty archives dir → exports bank only with info message

---

## Consistency Checklist

| Pattern            | Stats | Filters       | Export             |
| ------------------ | ----- | ------------- | ------------------ |
| `--json` output    | ✅    | ✅ (inherits) | Default            |
| `--no-color`       | ✅    | ✅ (inherits) | N/A                |
| Emoji prefixes     | ✅    | ✅            | ✅                 |
| Error format       | ✅    | ✅            | ✅                 |
| Progress indicator | N/A   | N/A           | ✅ (large exports) |

---

## Rollout Order

Recommended implementation sequence:

1. **Role filter** — Low complexity, high value for debugging
2. **Date filters** — Medium complexity, builds on role filter infra
3. **Export command** — Higher complexity, standalone feature

Each can be shipped as a separate PR or combined based on Engineering bandwidth.

---

## Future Considerations

- `ada memory import` — Restore from export file
- `ada memory diff v3 v4` — Compare bank versions
- `--role` autocomplete in shell
- Date filters for `search` command (currently list only)

---

_Spec by 🎨 Design — Cycle 86_
_Ref: Issue #52, cli-memory-stats-ux-spec.md, Phase 2 acceptance criteria_
