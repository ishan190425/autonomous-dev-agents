# 🌌 CLI Observability Commands Spec (C916)

**Author:** 🌌 Frontier (Head of Platform & Innovation)  
**Date:** 2026-02-19  
**Status:** Draft — Sprint 3 Scope  
**Related Issues:** #186 (Structured Logging), #178 (Distributed Tracing)

---

## Overview

With the observability trifecta complete (Logger → Metrics → Tracing), we need CLI commands to expose this infrastructure to users. This spec defines three new command groups for the `ada` CLI.

### Context: Observability Stack

The following components are implemented in `@ada-ai/core`:

| Phase | Component          | Location                        | Status           |
| ----- | ------------------ | ------------------------------- | ---------------- |
| 1     | Structured Logger  | `core/src/telemetry/logger.ts`  | ✅ Merged (C896) |
| 2     | Metrics Collector  | `core/src/telemetry/metrics.ts` | ✅ Merged (C911) |
| 3     | Distributed Tracer | `core/src/telemetry/tracer.ts`  | ✅ Merged (C911) |

The CLI commands defined here complete **Phase 4: CLI Exposure**.

---

## Command Design

### Global Options (from PR #219)

All observability commands inherit the global output flags:

```
--verbose, -v    Show detailed output
--json           Output as JSON
--quiet, -q      Suppress non-essential output
```

---

## 1. `ada metrics` — View and Export Metrics

### Synopsis

```bash
ada metrics [subcommand] [options]
```

### Subcommands

#### `ada metrics list`

List all registered metrics with current values.

```bash
# Default: Human-readable table
ada metrics list

# JSON output for scripting
ada metrics list --json

# Filter by metric type
ada metrics list --type counter
ada metrics list --type gauge
ada metrics list --type histogram
```

**Output (human-readable):**

```
METRIC                          TYPE        VALUE    LABELS
ada_dispatch_cycles_total       counter     916      role=frontier
ada_dispatch_duration_seconds   histogram   p50=2.1  role=frontier
ada_memory_size_bytes           gauge       45.2KB   version=47
ada_pr_merged_total             counter     89       —
```

**Output (JSON):**

```json
{
  "metrics": [
    {
      "name": "ada_dispatch_cycles_total",
      "type": "counter",
      "value": 916,
      "labels": { "role": "frontier" }
    }
  ]
}
```

#### `ada metrics export`

Export metrics in Prometheus or JSON format.

```bash
# Prometheus exposition format (default)
ada metrics export

# JSON export
ada metrics export --format json

# Write to file
ada metrics export --output metrics.prom
ada metrics export --format json --output metrics.json
```

**Prometheus Output:**

```
# HELP ada_dispatch_cycles_total Total number of dispatch cycles completed
# TYPE ada_dispatch_cycles_total counter
ada_dispatch_cycles_total{role="frontier"} 916
ada_dispatch_cycles_total{role="engineering"} 912
```

#### `ada metrics clear`

Reset all metrics (useful for testing/development).

```bash
ada metrics clear
ada metrics clear --confirm  # Skip confirmation prompt
```

### Options

| Option            | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `--type <type>`   | Filter by metric type (counter, gauge, histogram)     |
| `--format <fmt>`  | Export format (prometheus, json). Default: prometheus |
| `--output <path>` | Write to file instead of stdout                       |
| `--confirm`       | Skip confirmation for destructive operations          |

---

## 2. `ada trace` — View and Search Traces

### Synopsis

```bash
ada trace [subcommand] [options]
```

### Subcommands

#### `ada trace list`

List recent traces.

```bash
# List last 10 traces (default)
ada trace list

# Limit results
ada trace list --limit 50

# Filter by time
ada trace list --since 1h
ada trace list --since 2026-02-19

# Filter by status
ada trace list --status error
ada trace list --status success
```

**Output (human-readable):**

```
TRACE ID          START                   DURATION    STATUS    ROOT SPAN
abc123def456...   2026-02-19 17:02:14     2.34s       success   dispatch.cycle
def789ghi012...   2026-02-19 16:41:28     1.87s       success   dispatch.cycle
jkl345mno678...   2026-02-19 16:23:07     3.12s       error     dispatch.cycle
```

#### `ada trace show <trace-id>`

Show detailed trace with span tree.

```bash
ada trace show abc123def456

# Include span attributes
ada trace show abc123def456 --attributes

# JSON output
ada trace show abc123def456 --json
```

**Output (human-readable):**

```
Trace: abc123def456...
Start: 2026-02-19 17:02:14.880Z
Duration: 2.34s
Status: success

Span Tree:
└─ dispatch.cycle (2.34s)
   ├─ memory.read (0.12s)
   ├─ github.check_issues (0.45s)
   ├─ agent.execute (1.52s)
   │  ├─ prompt.build (0.08s)
   │  └─ llm.complete (1.44s)
   └─ git.commit_push (0.25s)
```

#### `ada trace search`

Search traces by attributes or errors.

```bash
# Find traces with errors
ada trace search --has-error

# Find traces for a specific role
ada trace search --role frontier

# Find traces for a specific cycle
ada trace search --cycle 916

# Combine filters
ada trace search --role engineering --status success --since 24h
```

### Options

| Option           | Description                                          |
| ---------------- | ---------------------------------------------------- |
| `--limit <n>`    | Number of traces to return. Default: 10              |
| `--since <time>` | Filter traces after time (e.g., 1h, 24h, 2026-02-19) |
| `--status <s>`   | Filter by status (success, error)                    |
| `--role <role>`  | Filter by agent role                                 |
| `--cycle <n>`    | Filter by cycle number                               |
| `--has-error`    | Only show traces with errors                         |
| `--attributes`   | Include span attributes in output                    |

---

## 3. `ada logs` — View Structured Logs

### Synopsis

```bash
ada logs [options]
```

### Usage

```bash
# Tail logs (live follow)
ada logs --follow

# View last N log entries
ada logs --tail 100

# Filter by level
ada logs --level error
ada logs --level warn

# Filter by role
ada logs --role frontier

# Filter by cycle
ada logs --cycle 916

# Search log messages
ada logs --grep "dispatch failed"

# JSON output
ada logs --json
```

**Output (human-readable):**

```
2026-02-19 17:02:14 INFO  [frontier:916] Cycle started
2026-02-19 17:02:15 DEBUG [frontier:916] Memory bank loaded (v47)
2026-02-19 17:02:16 INFO  [frontier:916] Action: CLI observability spec
2026-02-19 17:02:17 INFO  [frontier:916] Cycle completed (2.34s)
```

**Output (JSON):**

```json
{
  "timestamp": "2026-02-19T22:02:14.880Z",
  "level": "info",
  "message": "Cycle started",
  "context": { "role": "frontier", "cycleId": 916 }
}
```

### Options

| Option             | Description                                     |
| ------------------ | ----------------------------------------------- |
| `--follow, -f`     | Tail logs in real-time                          |
| `--tail <n>`       | Show last N entries. Default: 50                |
| `--level <level>`  | Minimum level (trace, debug, info, warn, error) |
| `--role <role>`    | Filter by agent role                            |
| `--cycle <n>`      | Filter by cycle number                          |
| `--grep <pattern>` | Search log messages                             |
| `--since <time>`   | Filter logs after time                          |

---

## Implementation Notes

### Storage Locations

```
.ada/
├── telemetry/
│   ├── metrics.json      # Persisted metrics (auto-saved)
│   ├── traces/           # Trace files by date
│   │   └── 2026-02-19.jsonl
│   └── logs/             # Log files by date
│       └── 2026-02-19.jsonl
```

### Integration with SaaS Dashboard

These CLI commands provide local observability. The SaaS dashboard (#155, Sprint 3) will:

1. Aggregate metrics across multiple repos/teams
2. Provide visualizations (graphs, flame charts)
3. Set up alerts based on metric thresholds
4. Store traces in a queryable backend (e.g., Jaeger, Tempo)

The CLI commands serve as:

- Local debugging during development
- Export pipeline for SaaS ingestion
- Standalone observability for self-hosted users

### Dependencies

- `@ada-ai/core` telemetry module (existing)
- Commander.js for CLI structure (existing)
- No new runtime dependencies needed

---

## Acceptance Criteria

### `ada metrics`

- [ ] `ada metrics list` displays all registered metrics
- [ ] `ada metrics export` outputs valid Prometheus format
- [ ] `ada metrics export --format json` outputs valid JSON
- [ ] `ada metrics clear` resets all metrics with confirmation

### `ada trace`

- [ ] `ada trace list` shows recent traces with summary
- [ ] `ada trace show <id>` displays span tree
- [ ] `ada trace search` filters work correctly
- [ ] W3C Trace Context IDs are displayed correctly

### `ada logs`

- [ ] `ada logs --follow` tails logs in real-time
- [ ] Level and role filters work correctly
- [ ] `--grep` searches log messages
- [ ] JSON output is valid and parseable

### Cross-Cutting

- [ ] All commands respect `--json`, `--verbose`, `--quiet` flags
- [ ] Commands work with default `.ada/telemetry/` paths
- [ ] Custom paths configurable via `ada.config.json`

---

## Timeline

| Phase    | Scope                        | Sprint     |
| -------- | ---------------------------- | ---------- |
| Phase 4a | `ada metrics` implementation | Sprint 3   |
| Phase 4b | `ada trace` implementation   | Sprint 3   |
| Phase 4c | `ada logs` implementation    | Sprint 3   |
| Phase 5  | SaaS Dashboard integration   | Sprint 3-4 |

---

## References

- SaaS Observability & Telemetry Spec (C886)
- Observability Output UX Spec (C892)
- Logger Implementation (C896, PR #216)
- Metrics Implementation (C906, PR #218)
- Tracing Implementation (C906, PR #220)
- CLI Global Flags (PR #219)

---

_🌌 The Frontier (Head of Platform & Innovation) — Cycle 916_
