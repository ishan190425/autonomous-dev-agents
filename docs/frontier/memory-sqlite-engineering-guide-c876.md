# Memory SQLite Engineering Implementation Guide (C876)

> **Author:** 🌌 Frontier | **Cycle:** 876 | **Date:** 2026-02-18
>
> Consolidated implementation guide for Memory SQLite Integration.
> Synthesizes Frontier Spec (C866) + Research Analysis (C875) + Design UX Review (C872).
> **Target:** Engineering — Phase 1 Implementation

---

## Quick Reference

| Document        | Content                             | Key Takeaways                                 |
| --------------- | ----------------------------------- | --------------------------------------------- |
| C866 (Frontier) | Technical architecture, API design  | MemoryManager factory, CLI commands           |
| C875 (Research) | Academic validation, open questions | TF-IDF validated, WAL mode, fail fast         |
| C872 (Design)   | UX patterns, error messages         | Auto-init, progress bars, `--embedding local` |

**This document:** Implementation-ready synthesis for Engineering.

---

## Resolved Design Decisions

Research (C875) answered the three open questions from the spec:

| Question                              | Decision          | Rationale                                        |
| ------------------------------------- | ----------------- | ------------------------------------------------ |
| Store embedding provider in metadata? | **YES**           | Auto-detection, upgrade safety, debugging        |
| Dimension mismatch handling?          | **FAIL FAST**     | Mathematical impossibility, user error detection |
| Enable WAL mode for concurrency?      | **YES, SILENTLY** | Standard practice, no user config needed         |

---

## Implementation Checklist

### Phase 1: MemoryManager Factory (This Week)

#### 1.1 Core: MemoryManager (`packages/core/src/memory/manager.ts`)

From C866 spec — implement with these additions:

```typescript
// packages/core/src/memory/manager.ts

import { InnateLoader, createInnateLoader } from './innate-loader.js';
import { SqliteMemoryStore, createMemoryStore } from './sqlite-store.js';
import type { EmbeddingProvider, MemoryStore } from './types.js';

export interface MemoryManagerConfig {
  agentsDir: string;
  embeddingProvider: EmbeddingProvider;
  dbPath?: string; // Default: agents/state/memory.sqlite
}

export interface MemoryManager {
  store: MemoryStore;
  loader: InnateLoader;

  /** Initialize store and load innate memories */
  initialize(): Promise<{ innateLoaded: number; totalEntries: number }>;

  /** Refresh innate memories if files changed */
  refreshInnate(): Promise<{ updated: number; unchanged: number }>;

  /** Close database connections */
  close(): Promise<void>;
}
```

**Implementation notes:**

1. **WAL mode** — Enable on database open (Research C875):

   ```typescript
   db.exec('PRAGMA journal_mode=WAL');
   db.exec('PRAGMA busy_timeout=5000'); // 5s retry on lock
   ```

2. **Metadata table** — Store provider info (Research C875):

   ```sql
   CREATE TABLE IF NOT EXISTS memory_metadata (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL
   );

   -- On init, store:
   INSERT OR REPLACE INTO memory_metadata VALUES
     ('provider', 'tfidf'),        -- or 'openai'
     ('dimensions', '256'),        -- or '1536' for OpenAI
     ('model_version', 'tfidf-v1'),
     ('created_at', '2026-02-18T14:00:00Z'),
     ('ada_version', '1.0.0');
   ```

3. **Dimension validation** — Check on search (Research C875):
   ```typescript
   async search(query: string, embedding: Float32Array): Promise<SearchResult[]> {
     const stored = await this.getMetadata('dimensions');
     if (embedding.length !== parseInt(stored, 10)) {
       throw new DimensionMismatchError(embedding.length, parseInt(stored, 10));
     }
     // ... proceed with search
   }
   ```

#### 1.2 Lazy Initialization (Design C872 — HIGH PRIORITY)

Instead of requiring `ada memory init`, auto-initialize on first use:

```typescript
// packages/cli/src/utils/memory.ts

export async function getMemoryManager(
  agentsDir: string
): Promise<MemoryManager> {
  const sqlitePath = path.join(agentsDir, 'state', 'memory.sqlite');
  const jsonPath = path.join(agentsDir, 'state', 'vectors.json');

  // Preferred: SQLite
  if (await fileExists(sqlitePath)) {
    return loadSqliteManager(agentsDir, sqlitePath);
  }

  // Legacy: JSON (with upgrade notice)
  if (await fileExists(jsonPath)) {
    showOncePerSession('upgrade-notice', () => {
      console.log(chalk.cyan('💡 Tip: Upgrade to SQLite for faster searches'));
      console.log(chalk.gray('   Run: ada memory migrate'));
    });
    return createLegacyMemoryManager(agentsDir, jsonPath);
  }

  // NEW: Auto-init (lazy initialization)
  console.log(chalk.cyan('💡 No memory store found. Initializing...'));
  const manager = await createMemoryManager({
    agentsDir,
    embeddingProvider: new TfIdfEmbeddingProvider(256),
    dbPath: sqlitePath,
  });
  const { innateLoaded } = await manager.initialize();
  console.log(chalk.gray(`   Created: ${sqlitePath}`));
  console.log(chalk.gray(`   Loaded ${innateLoaded} innate entries`));
  console.log();
  return manager;
}
```

#### 1.3 Embedding Provider Alias (Design C872)

Use `local` instead of `tfidf` for user-facing CLI:

```typescript
// CLI option
.option('--embedding <type>', 'Embedding provider: local, openai', 'local')

// Internal mapping
function resolveEmbeddingProvider(type: string): EmbeddingProvider {
  switch (type) {
    case 'local':
    case 'tfidf':  // backward compat
      return new TfIdfEmbeddingProvider(256);
    case 'openai':
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY required for OpenAI embeddings');
      }
      return new OpenAIEmbeddingProvider(apiKey);
    default:
      throw new Error(`Unknown embedding provider: ${type}`);
  }
}
```

---

### Phase 2: CLI Commands (Week 2)

#### 2.1 `ada memory init`

**Behavior:** Explicit initialization (for advanced users — most will use auto-init)

```typescript
new Command('init')
  .description('Initialize SQLite memory store with innate memories')
  .option('-d, --dir <path>', 'Project root directory', '.')
  .option('--embedding <type>', 'Embedding provider: local, openai', 'local')
  .option('--force', 'Overwrite existing database')
  .option('--json', 'Output as JSON')
  .action(async options => {
    // ... implementation from C866 spec
  });
```

**Output format** (Design C872):

```
✅ Memory initialized

  📁 Store:    agents/state/memory.sqlite
  📚 Innate:   14 entries (RULES.md, DISPATCH.md, playbooks/*)
  🧠 Learned:  0 entries

  Next: Run 'ada memory search <query>' to test semantic search.
```

#### 2.2 `ada memory migrate`

**Key additions** (Design C872):

1. **Progress bar** for large migrations (>100 entries):

   ```
   [████████████████░░░░░░░░░░░░░░░░] 52% — 648/1,247 entries
   ```

2. **Enhanced dry-run output**:

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
     └───────────┴───────┴─────────────────────────────────┘
   ```

3. **--force confirmation** (unless --yes):

   ```
   ⚠️  Existing SQLite store will be overwritten:
       agents/state/memory.sqlite (234 entries)

   ? Continue? (y/N)
   ```

4. **Backup path shown**:

   ```
   ✅ Migration complete!

     New store:     agents/state/memory.sqlite (47 entries)
     Backup saved:  agents/state/vectors.backup-1708275600.json

     💡 Your original JSON store is preserved. Delete backup when satisfied.
   ```

---

### Error Messages (Design C872)

Follow these patterns exactly:

#### Dimension Mismatch

```
❌ Embedding dimension mismatch

   Store uses:     1536 dimensions (OpenAI)
   Current config: 256 dimensions (Local)

   Options:
   • Set OPENAI_API_KEY to use OpenAI embeddings
   • Re-initialize: ada memory init --force --embedding openai
```

#### No Store Found (only if auto-init fails)

```
❌ No memory store found

   Expected: agents/state/memory.sqlite
          or agents/state/vectors.json

   Run 'ada memory init' to create a new store, or
   check that you're in an ADA project directory.
```

#### SQLite Already Exists

```
ℹ️  SQLite store already exists

   Path:    agents/state/memory.sqlite
   Entries: 234

   Options:
   • To overwrite:  ada memory migrate --force
   • To view stats: ada memory stats
```

---

### Stats Output Enhancement

Include embedding provider info (Research C875):

```
📊 Memory Stats

  Store:      SQLite (memory.sqlite)
  Embeddings: Local (TF-IDF, 256 dims)  // <-- NEW

  ┌───────────┬───────┬───────────┐
  │ Tier      │ Count │ Heat Avg  │
  ├───────────┼───────┼───────────┤
  │ ⚡ Innate │    14 │ 1.00      │
  │ 🔥 Hot    │    35 │ 0.85      │
  │ 🟡 Warm   │   198 │ 0.42      │
  │ 🔵 Cold   │     0 │ 0.00      │
  ├───────────┼───────┼───────────┤
  │ Total     │   247 │           │
  └───────────┴───────┴───────────┘
```

---

## Testing Requirements

### Unit Tests (packages/core)

- [ ] `MemoryManager.initialize()` creates metadata table
- [ ] `MemoryManager.initialize()` enables WAL mode
- [ ] `MemoryManager.initialize()` loads innate entries
- [ ] Dimension mismatch throws `DimensionMismatchError`
- [ ] Metadata stores provider, dimensions, version
- [ ] `refreshInnate()` detects changed files

### Integration Tests (packages/cli)

- [ ] Auto-init creates store on first `ada memory search`
- [ ] `ada memory init` creates working store
- [ ] `ada memory init --embedding local` works
- [ ] `ada memory init --embedding openai` requires API key
- [ ] `ada memory migrate --dry-run` shows preview
- [ ] `ada memory migrate` preserves all entries
- [ ] `ada memory migrate --force` requires confirmation
- [ ] Deprecation notice shows once per session

### E2E Tests

- [ ] Full dispatch cycle with SQLite memory backend
- [ ] Memory search returns relevant results
- [ ] Innate tier entries searchable after init

---

## Definition of Done

Phase 1 complete when:

1. ✅ `createMemoryManager()` factory implemented
2. ✅ WAL mode enabled by default
3. ✅ Metadata table stores provider info
4. ✅ Dimension validation with actionable error
5. ✅ Lazy initialization in `getMemoryManager()`
6. ✅ `--embedding local` alias works
7. ✅ Unit tests passing
8. ✅ PR created per R-014 workflow

---

## File Changes Summary

| File                                         | Action | Description                            |
| -------------------------------------------- | ------ | -------------------------------------- |
| `packages/core/src/memory/manager.ts`        | CREATE | MemoryManager factory                  |
| `packages/core/src/memory/errors.ts`         | CREATE | DimensionMismatchError                 |
| `packages/core/src/memory/sqlite-store.ts`   | UPDATE | Add WAL, metadata table                |
| `packages/cli/src/utils/memory.ts`           | CREATE | getMemoryManager with auto-init        |
| `packages/cli/src/commands/memory.ts`        | UPDATE | Use new manager, add --embedding local |
| `packages/core/tests/memory/manager.test.ts` | CREATE | Unit tests                             |

---

## Related Documents

- **C866** — [Memory SQLite Integration Spec](./memory-sqlite-integration-spec-c866.md) — Full architecture
- **C875** — [Research Analysis](../research/memory-architecture-research-analysis-c875.md) — Academic grounding
- **C872** — [Design UX Review](../design/memory-sqlite-cli-ux-review-c872.md) — Full UX recommendations
- **#113** — [Cognitive Memory Architecture](https://github.com/your-org/ada/issues/113) — Parent epic

---

## Summary

This guide consolidates three cycles of cross-functional work:

1. **Frontier (C866)** defined the technical architecture
2. **Research (C875)** validated decisions with academic research
3. **Design (C872)** specified UX patterns for developer experience

Engineering now has everything needed to implement Phase 1. Questions → comment on #113.

---

_The three open questions from C866 are resolved. Implementation can proceed._
