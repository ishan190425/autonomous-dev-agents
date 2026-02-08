# CLI UX Spec: `ada memory` Commands

> UX specification for memory-related CLI commands
> **Author:** 🎨 Design (The Architect)
> **Cycle:** 215
> **Date:** 2026-02-08
> **Relates to:** Issue #95 (Phase 3 Semantic Search)

---

## Overview

Phase 3 introduces semantic search capabilities that require new CLI commands for managing the embedding index. This spec defines the UX for memory-related commands.

## Command Group: `ada memory`

```
USAGE
  ada memory <command> [options]

COMMANDS
  status    Show memory system status (entries, index health, storage)
  search    Semantic search across memory entries
  reindex   Rebuild the vector index from JSONL entries
  recall    Recall memories by cycle or keyword (existing)

GLOBAL OPTIONS
  --json    Output as JSON (for scripting)
  --quiet   Suppress non-essential output
```

---

## `ada memory status`

Shows health and statistics for the memory system.

### Usage

```bash
ada memory status
```

### Output

```
🧠 Memory System Status

  Stream:     497 entries (1.2 MB)
  Index:      497 vectors (384 dimensions)
  Provider:   local-minilm (all-MiniLM-L6-v2)
  Storage:    agents/memory/stream.jsonl

  Last entry: Cycle 214 (2 hours ago)
  Index sync: ✅ Up to date

  Health: Healthy ✓
```

### Error States

```
⚠️ Memory System Status

  Stream:     497 entries (1.2 MB)
  Index:      450 vectors (384 dimensions)  ← 47 entries not indexed!

  Health: Out of sync

  Run `ada memory reindex` to rebuild the index.
```

---

## `ada memory search`

Semantic search across memory entries.

### Usage

```bash
ada memory search <query> [options]
```

### Options

| Option         | Type   | Default | Description                             |
| -------------- | ------ | ------- | --------------------------------------- |
| `--limit`      | number | 10      | Maximum results to return               |
| `--min-score`  | number | 0.3     | Minimum similarity threshold (0-1)      |
| `--role`       | string | all     | Filter by role (engineering, ops, etc.) |
| `--since`      | number | all     | Only search cycles >= N                 |
| `--no-recency` | flag   | false   | Disable recency decay                   |

### Examples

```bash
# Basic search
ada memory search "authentication implementation"

# Filter by role and recency
ada memory search "test failures" --role qa --since 200

# High precision search
ada memory search "API design" --min-score 0.7 --limit 5
```

### Output

```
🔍 Semantic Search: "authentication implementation"

  Score   Cycle  Role         Summary
  ─────────────────────────────────────────────────────
  0.87    198    engineering  Implemented JWT auth middleware
  0.82    195    design       API auth spec: token refresh flow
  0.76    201    qa           Auth integration tests: 12 passing
  0.71    189    research     Surveyed auth patterns: OAuth2 vs JWT

  4 results (filtered from 12 candidates)
```

### JSON Output

```bash
ada memory search "auth" --json
```

```json
{
  "query": "auth",
  "results": [
    {
      "id": "entry-198-abc",
      "score": 0.87,
      "cycle": 198,
      "role": "engineering",
      "action": "Implemented JWT auth middleware",
      "content": "..."
    }
  ],
  "metadata": {
    "total_candidates": 12,
    "filtered": 4,
    "latency_ms": 45
  }
}
```

---

## `ada memory reindex`

Rebuilds the vector index from JSONL entries.

### Usage

```bash
ada memory reindex [options]
```

### Options

| Option         | Type   | Default | Description                         |
| -------------- | ------ | ------- | ----------------------------------- |
| `--force`      | flag   | false   | Rebuild even if index is up to date |
| `--batch-size` | number | 50      | Entries per batch (memory tradeoff) |

### Output

```
🔄 Rebuilding memory index...

  Scanning entries... 497 found
  Loading embedding model... done (1.2s)

  Progress: [████████████████████] 100%

  ✓ Indexed 497 entries in 23.4s
  ✓ Saved to agents/memory/vectors.json
```

### First-Time Download

```
🔄 Rebuilding memory index...

  Downloading embedding model (all-MiniLM-L6-v2)...
  [████████░░░░░░░░░░░░] 40%  (9.2 MB / 23 MB)

  Progress: [░░░░░░░░░░░░░░░░░░░░] 0%
  Waiting for model download...
```

---

## `ada memory recall`

Existing command (Phase 1) — unchanged.

```bash
# Recall by cycle range
ada memory recall --from 200 --to 210

# Recall by keyword
ada memory recall --search "PR merged"
```

---

## Error Handling

### Model Not Found

```
❌ Embedding model not available

  The semantic search feature requires the MiniLM embedding model.

  Run:  ada memory reindex

  This will download the model (~23 MB) on first run.
```

### No Matches

```
🔍 Semantic Search: "quantum computing optimization"

  No results found with similarity > 0.30

  Try:
    • Lowering --min-score threshold
    • Using different keywords
    • Checking --since filter isn't too restrictive
```

---

## Implementation Notes

### Progressive Disclosure

1. **Default behavior:** Just works — no flags required for basic use
2. **Power users:** Filters, thresholds, batch sizes for tuning
3. **Scripting:** `--json` and `--quiet` for automation

### Performance Feedback

Always show latency in verbose output to help users understand:

- First search is slower (model loading)
- Subsequent searches are fast (<100ms)

### Exit Codes

| Code | Meaning               |
| ---- | --------------------- |
| 0    | Success               |
| 1    | No results (search)   |
| 2    | Index missing/corrupt |
| 3    | Model download failed |

---

## Future Enhancements

- `ada memory forget <id>` — Remove specific entries
- `ada memory export` — Export memories for backup/migration
- `ada memory stats` — Detailed analytics (role distribution, topic clusters)

---

_🎨 Design (The Architect) — Cycle 215_
