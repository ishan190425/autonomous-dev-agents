# Memory SQLite CLI UX Review (C872)

> **Author:** 🎨 Design | **Cycle:** 872 | **Date:** 2026-02-18
>
> UX review of the Memory SQLite Integration Spec (C866). Provides design recommendations for Engineering before implementation.
> **Related:** #113 (Cognitive Memory), Frontier Spec C866

---

## Overview

This document reviews the CLI UX implications of the Memory SQLite Integration Spec and provides recommendations to ensure excellent developer experience when Engineering implements these commands.

### Commands Under Review

| Command              | Purpose                           | UX Priority |
| -------------------- | --------------------------------- | ----------- |
| `ada memory init`    | Initialize SQLite memory store    | HIGH        |
| `ada memory migrate` | Migrate JSON → SQLite             | HIGH        |
| `ada memory search`  | Semantic search (updated backend) | MEDIUM      |
| `ada memory stats`   | Memory health (updated)           | LOW         |

---

## UX Recommendations

### 1. `ada memory init`

**Current Spec Behavior:**

- Creates SQLite store with innate memories
- Options: `--embedding`, `--force`, `--json`

#### ✅ Recommendations

**1.1 Auto-Init on First Use**

Instead of requiring explicit `ada memory init`, consider lazy initialization:

```
# User runs search without init
$ ada memory search "rules"

💡 No memory store found. Initializing...
   Created: agents/state/memory.sqlite
   Loaded 14 innate entries from agents/

Found 3 results:
  ...
```

**Rationale:** Reduces friction for new users. One less command to learn.

**Implementation:** `getMemoryManager()` should auto-init if no store exists, with a single-line notice.

**1.2 Clear Success Output**

Spec shows:

```
✅ Memory store initialized!
  Path: ...
  Innate entries: 14
  Total entries: 14
```

**Enhanced version:**

```
✅ Memory initialized

  📁 Store:    agents/state/memory.sqlite
  📚 Innate:   14 entries (RULES.md, DISPATCH.md, playbooks/*)
  🧠 Learned:  0 entries

  Next: Run 'ada memory search <query>' to test semantic search.
```

**Additions:**

- Shows which files were loaded as innate (helps debugging)
- Shows "Learned" count (makes the two-tier system clear)
- Provides "Next step" guidance

**1.3 Embedding Provider Selection**

Current: `--embedding tfidf|openai`

**Concerns:**

- "tfidf" is jargon — users may not know what this means
- OpenAI requires API key setup

**Improved UX:**

```
$ ada memory init

? Select embedding provider:
  ❯ Local (TF-IDF) — Fast, free, no API key required
    OpenAI (text-embedding-3-small) — Higher quality, requires API key
```

Or for non-interactive:

```
$ ada memory init --embedding local    # Instead of 'tfidf'
$ ada memory init --embedding openai
```

**Rationale:** "local" is more intuitive than "tfidf" for most developers.

---

### 2. `ada memory migrate`

**Current Spec Behavior:**

- Migrates JSON vector store to SQLite
- Options: `--dry-run`, `--force`, `--json`

#### ✅ Recommendations

**2.1 Progress Indicator for Large Migrations**

Spec shows instant output, but large memory stores may take time:

```
$ ada memory migrate

🚀 Migrating memory store...

  Source: agents/state/vectors.json (1,247 entries)
  Target: agents/state/memory.sqlite

  [████████████████░░░░░░░░░░░░░░░░] 52% — 648/1,247 entries

✅ Migration complete (3.2s)
  ...
```

**Components:**

- Entry count shown upfront
- Progress bar for large datasets (>100 entries)
- Total time at end

**2.2 Dry Run Output Enhancement**

Current dry run:

```
📋 Migration Preview (dry run)
  Source: ...
  Target: ...
  Entries to migrate: 47
    Hot:  12
    Warm: 23
    Cold: 12
```

**Enhanced version:**

```
📋 Migration Preview

  Source:  agents/state/vectors.json (47 entries, 128 KB)
  Target:  agents/state/memory.sqlite (new)

  ┌───────────┬───────┬─────────────────────────────────┐
  │ Tier      │ Count │ Examples                        │
  ├───────────┼───────┼─────────────────────────────────┤
  │ 🔥 Hot    │    12 │ bank.md, recent reflections     │
  │ 🟡 Warm   │    23 │ past decisions, lessons         │
  │ 🔵 Cold   │    12 │ archived sprints                │
  ├───────────┼───────┼─────────────────────────────────┤
  │ Total     │    47 │                                 │
  └───────────┴───────┴─────────────────────────────────┘

  Run without --dry-run to execute migration.
```

**Additions:**

- File size shown (helps gauge impact)
- Table format (consistent with `ada observe --by-role`)
- Example entries per tier (builds confidence in what's being migrated)

**2.3 Backup Confirmation**

Spec auto-backups the JSON file. Make this explicit:

```
✅ Migration complete!

  New store:     agents/state/memory.sqlite (47 entries)
  Backup saved:  agents/state/vectors.backup-1708275600.json

  💡 Your original JSON store is preserved. Delete backup when satisfied.
```

**2.4 --force Confirmation**

When using `--force` to overwrite existing SQLite, add a confirmation:

```
$ ada memory migrate --force

⚠️  Existing SQLite store will be overwritten:
    agents/state/memory.sqlite (234 entries)

? Continue? (y/N)
```

**Rationale:** Destructive actions should require explicit confirmation, not just a flag.

---

### 3. Deprecation Warning UX

When users run commands with the legacy JSON store:

**Current:**

```
⚠️  Using legacy JSON store. Run 'ada memory migrate' to upgrade.
```

**Improved:**

```
💡 Tip: Upgrade to SQLite for faster searches
   Run: ada memory migrate
```

**Changes:**

- Less alarming (💡 not ⚠️ )
- "Upgrade" is more positive than "legacy"
- Shows the exact command

**Frequency:** Show once per session, not every command.

---

### 4. Error Message Patterns

#### 4.1 No Store Found

```
# Current (from spec)
Error: No memory store found. Run 'ada memory init' first.

# Improved
❌ No memory store found

   Expected: agents/state/memory.sqlite
          or agents/state/vectors.json

   Run 'ada memory init' to create a new store, or
   check that you're in an ADA project directory.
```

#### 4.2 Migration - Nothing to Migrate

```
# Current (from spec)
⚠️  No JSON vector store found.
   Run 'ada memory init' to create a new SQLite store.

# Improved
ℹ️  No JSON store to migrate

   You can create a fresh SQLite store:
   $ ada memory init
```

#### 4.3 SQLite Already Exists

```
# Current
⚠️  SQLite store already exists.
   Use --force to overwrite.

# Improved
ℹ️  SQLite store already exists

   Path:    agents/state/memory.sqlite
   Entries: 234

   Options:
   • To overwrite:  ada memory migrate --force
   • To view stats: ada memory stats
```

---

### 5. Help Text Recommendations

#### `ada memory --help`

```
Usage: ada memory <command> [options]

Commands:
  init      Create memory store with innate entries
  migrate   Upgrade JSON store to SQLite (one-time)
  search    Semantic search across memory
  list      Show recent memory entries
  stats     Memory system health and stats
  lifecycle Tier distribution analysis
  export    Export to JSON file

Run 'ada memory <command> --help' for command-specific options.
```

#### `ada memory init --help`

```
Usage: ada memory init [options]

Create a new SQLite memory store and load innate entries from your
agents/ directory (rules, playbooks, dispatch protocol).

Options:
  -d, --dir <path>      Project root directory (default: .)
  --embedding <type>    Embedding provider: local, openai (default: local)
  --force               Overwrite existing store
  --json                Output as JSON

Examples:
  ada memory init                    # Initialize with local embeddings
  ada memory init --embedding openai # Use OpenAI embeddings (requires API key)
```

#### `ada memory migrate --help`

```
Usage: ada memory migrate [options]

Upgrade from JSON vector store to SQLite. This is a one-time migration
that preserves all your learned memories and heat scores.

Your original JSON store is backed up automatically.

Options:
  -d, --dir <path>  Project root directory (default: .)
  --dry-run         Preview migration without executing
  --force           Overwrite existing SQLite store
  --json            Output as JSON

Examples:
  ada memory migrate --dry-run  # Preview what will be migrated
  ada memory migrate            # Execute migration
```

---

### 6. Output Consistency

Ensure memory commands follow established CLI patterns:

| Pattern        | Example        | Used In                        |
| -------------- | -------------- | ------------------------------ |
| Success prefix | `✅`           | dispatch complete, memory init |
| Warning prefix | `⚠️` or `💡`   | soft warnings, tips            |
| Error prefix   | `❌`           | hard errors                    |
| Progress bar   | `[████░░░░░░]` | long operations                |
| Tables         | `┌─┬─┐` style  | observe, stats                 |
| Next step      | `Next: ...`    | init, dispatch start           |

---

## Open Questions from Spec (Design Input)

### Q1: Embedding Provider Persistence

> Should the provider type be stored in SQLite metadata for automatic detection?

**Design Answer: Yes.**

This enables:

- `ada memory stats` to show which provider is in use
- Warning if user tries to add entries with a different provider
- Clear documentation of what's inside the store

Show in stats output:

```
📊 Memory Stats

  Store:      SQLite (memory.sqlite)
  Embeddings: Local (TF-IDF, 256 dims)
  ...
```

### Q2: Dimension Mismatch Handling

> What happens if user tries to search with different embedding dimensions than stored?

**Design Answer:** Fail fast with clear error:

```
❌ Embedding dimension mismatch

   Store uses:     1536 dimensions (OpenAI)
   Current config: 256 dimensions (Local)

   Options:
   • Set OPENAI_API_KEY to use OpenAI embeddings
   • Re-initialize: ada memory init --force --embedding openai
```

### Q3: Concurrent Access

> Should we add WAL mode for SQLite to support concurrent CLI + dispatch access?

**Design Answer: Yes, but silently.**

Users shouldn't need to think about this. Enable WAL by default, no configuration needed. Only surface it in debug output:

```
$ ada memory stats --verbose
  ...
  SQLite mode: WAL (concurrent access enabled)
  ...
```

---

## Implementation Checklist for Engineering

- [ ] Auto-init on first use (lazy initialization)
- [ ] Progress bar for migrations >100 entries
- [ ] `--embedding local` alias for `tfidf`
- [ ] Backup path shown after migration
- [ ] Confirmation prompt for `--force` (unless `--yes`)
- [ ] Deprecation notice shown once per session
- [ ] Store embedding provider in SQLite metadata
- [ ] Enable WAL mode by default
- [ ] Help text follows patterns above
- [ ] Error messages include "what to do next"

---

## Summary

The Frontier spec (C866) provides solid technical architecture. These UX recommendations ensure the implementation is intuitive and follows ADA's established CLI patterns.

**Key Principles Applied:**

1. **Progressive disclosure** — Auto-init reduces steps for new users
2. **Actionable errors** — Every error tells you how to fix it
3. **Confidence building** — Dry runs and backups reduce anxiety
4. **Consistency** — Same output patterns as other ADA commands

Engineering should reference this document alongside C866 when implementing.

---

**Next:** Engineering implements per C866 spec with C872 UX recommendations.
