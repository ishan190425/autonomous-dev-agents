# Memory SQLite Integration Spec (C866)

> **Author:** 🌌 Frontier | **Cycle:** 866 | **Date:** 2026-02-18
>
> Design specification for integrating InnateLoader + SqliteMemoryStore into the ADA CLI.
> Enables `ada memory migrate` and completes the Cognitive Memory Architecture (#113).

## Overview

### Current State

| Component           | Status              | Location                                    |
| ------------------- | ------------------- | ------------------------------------------- |
| InnateLoader        | ✅ Implemented      | `packages/core/src/memory/innate-loader.ts` |
| SqliteMemoryStore   | ✅ Implemented      | `packages/core/src/memory/sqlite-store.ts`  |
| CLI memory commands | ⚠️ Uses old backend | `packages/cli/src/commands/memory.ts`       |

**Gap:** The CLI still uses TF-IDF + JsonVectorStore. SqliteMemoryStore (with sqlite-vec) is not integrated.

### Goals

1. **Connect InnateLoader → SqliteMemoryStore**: Load innate files into SQLite on init/startup
2. **Add `ada memory migrate`**: Migrate existing JsonVectorStore to SqliteMemoryStore
3. **Update CLI commands**: Switch `memory search/list/stats` to use SqliteMemoryStore
4. **Enable real embeddings**: Support OpenAI/local embedding providers (future)

---

## Architecture

### Integration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ADA Memory System                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    loadAll()     ┌──────────────────────────────┐ │
│  │             │ ────────────────▶│                              │ │
│  │ InnateLoader│                  │     SqliteMemoryStore        │ │
│  │             │  entries[] +     │                              │ │
│  │ (files)     │  embeddings[]    │  ┌────────────────────────┐  │ │
│  └─────────────┘                  │  │ memory_entries table   │  │ │
│        │                          │  │ (id, content, tier,    │  │ │
│        │                          │  │  heat_score, ...)      │  │ │
│  ┌─────▼──────────┐               │  └────────────────────────┘  │ │
│  │ agents/        │               │                              │ │
│  │ ├── rules/     │               │  ┌────────────────────────┐  │ │
│  │ │   └── RULES.md│              │  │ memory_embeddings      │  │ │
│  │ ├── DISPATCH.md │              │  │ (sqlite-vec virtual)   │  │ │
│  │ └── playbooks/ │               │  └────────────────────────┘  │ │
│  │     ├── ceo.md │               │                              │ │
│  │     └── ...    │               └──────────────────────────────┘ │
│  └────────────────┘                             │                  │
│                                                 │                  │
│  ┌─────────────────────────────────────────────┼──────────────────┐│
│  │                    CLI Commands             ▼                  ││
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐      ││
│  │  │ ada memory    │  │ ada memory    │  │ ada memory    │      ││
│  │  │ search <q>    │  │ migrate       │  │ init          │      ││
│  │  └───────────────┘  └───────────────┘  └───────────────┘      ││
│  └────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Storage Location

```
agents/
├── state/
│   ├── rotation.json          # Existing
│   ├── vectors.json           # Old: JsonVectorStore (deprecated)
│   └── memory.sqlite          # NEW: SqliteMemoryStore database
└── memory/
    ├── bank.md                # Existing: Human-readable bank
    └── archives/              # Existing: Compressed banks
```

---

## Implementation

### Phase 1: Memory Manager Factory (Week 1)

Create a factory that initializes the full memory stack:

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

export async function createMemoryManager(
  config: MemoryManagerConfig
): Promise<MemoryManager> {
  const dbPath =
    config.dbPath ?? path.join(config.agentsDir, 'state', 'memory.sqlite');

  const store = await createMemoryStore({
    dbPath,
    embeddingProvider: config.embeddingProvider,
    dimensions: config.embeddingProvider.dimensions,
  });

  const loader = createInnateLoader(config.agentsDir, config.embeddingProvider);

  return {
    store,
    loader,

    async initialize() {
      // Load all innate memories
      const innateEntries = await loader.loadAll();

      // Upsert into SQLite (idempotent — innate IDs are deterministic)
      for (const { entry, embedding } of innateEntries) {
        await store.upsert(entry, embedding);
      }

      const stats = await store.getStats();
      return {
        innateLoaded: innateEntries.length,
        totalEntries: stats.total,
      };
    },

    async refreshInnate() {
      const changed = loader.getChangedFiles();
      if (changed.length === 0) {
        return { updated: 0, unchanged: innateEntries.length };
      }

      // Reload changed files only
      const refreshed = await loader.loadAll(); // TODO: selective reload
      for (const { entry, embedding } of refreshed) {
        await store.upsert(entry, embedding);
      }

      return {
        updated: changed.length,
        unchanged: refreshed.length - changed.length,
      };
    },

    async close() {
      store.close();
    },
  };
}
```

### Phase 2: CLI Migration Command (Week 1)

```typescript
// packages/cli/src/commands/memory.ts — new subcommand

new Command('migrate')
  .description('Migrate memory store from JSON to SQLite')
  .option('-d, --dir <path>', 'Project root directory', '.')
  .option('--dry-run', 'Show what would be migrated without executing')
  .option('--force', 'Overwrite existing SQLite database')
  .option('--json', 'Output as JSON')
  .action(async (options: MemoryMigrateOptions) => {
    const agentsDir = path.resolve(options.dir, 'agents');

    // Check for existing stores
    const jsonStorePath = path.join(agentsDir, 'state', 'vectors.json');
    const sqliteStorePath = path.join(agentsDir, 'state', 'memory.sqlite');

    const jsonExists = await fileExists(jsonStorePath);
    const sqliteExists = await fileExists(sqliteStorePath);

    if (!jsonExists) {
      console.log(chalk.yellow('⚠️  No JSON vector store found.'));
      console.log(
        chalk.gray("   Run 'ada memory init' to create a new SQLite store.")
      );
      return;
    }

    if (sqliteExists && !options.force) {
      console.log(chalk.yellow('⚠️  SQLite store already exists.'));
      console.log(chalk.gray('   Use --force to overwrite.'));
      return;
    }

    if (options.dryRun) {
      const jsonStore = await loadJsonVectorStore(jsonStorePath);
      const stats = jsonStore.getStats();
      console.log(chalk.bold('\n📋 Migration Preview (dry run)\n'));
      console.log(`  Source: ${jsonStorePath}`);
      console.log(`  Target: ${sqliteStorePath}`);
      console.log(`  Entries to migrate: ${stats.total}`);
      console.log(`    Hot:  ${stats.byTier.hot}`);
      console.log(`    Warm: ${stats.byTier.warm}`);
      console.log(`    Cold: ${stats.byTier.cold}`);
      return;
    }

    // Execute migration
    console.log(chalk.bold('\n🚀 Migrating memory store...\n'));

    // 1. Create embedding provider (same as JSON store used)
    const provider = new TfIdfEmbeddingProvider(256);

    // 2. Create MemoryManager
    const manager = await createMemoryManager({
      agentsDir,
      embeddingProvider: provider,
      dbPath: sqliteStorePath,
    });

    // 3. Initialize (loads innate)
    const { innateLoaded } = await manager.initialize();
    console.log(chalk.gray(`  Loaded ${innateLoaded} innate entries`));

    // 4. Migrate JSON entries
    const jsonStore = await loadJsonVectorStore(jsonStorePath);
    const allEntries = jsonStore.getAllEntries();

    let migrated = 0;
    for (const { entry, embedding } of allEntries) {
      if (entry.tier === 'innate') continue; // Already loaded
      await manager.store.upsert(entry, embedding);
      migrated++;
    }

    console.log(chalk.gray(`  Migrated ${migrated} learned entries`));

    // 5. Verify
    const stats = await manager.store.getStats();

    console.log(chalk.green(`\n✅ Migration complete!\n`));
    console.log(chalk.bold('New SQLite Store:'));
    console.log(`  Path: ${sqliteStorePath}`);
    console.log(`  Total entries: ${stats.total}`);
    console.log(`  Innate: ${stats.byTier.innate ?? 0}`);
    console.log(`  Hot:    ${stats.byTier.hot}`);
    console.log(`  Warm:   ${stats.byTier.warm}`);
    console.log(`  Cold:   ${stats.byTier.cold}`);

    // 6. Optionally backup old store
    const backupPath = jsonStorePath.replace(
      '.json',
      `.backup-${Date.now()}.json`
    );
    await fs.rename(jsonStorePath, backupPath);
    console.log(chalk.gray(`\n  JSON store backed up to: ${backupPath}`));

    await manager.close();
  });
```

### Phase 3: CLI Command Updates (Week 2)

Update existing CLI commands to use SqliteMemoryStore:

```typescript
// Shared initialization for all memory commands
async function getMemoryManager(agentsDir: string): Promise<MemoryManager> {
  const sqlitePath = path.join(agentsDir, 'state', 'memory.sqlite');
  const jsonPath = path.join(agentsDir, 'state', 'vectors.json');

  // Check which store exists
  if (await fileExists(sqlitePath)) {
    // Use SQLite (preferred)
    return createMemoryManager({
      agentsDir,
      embeddingProvider: new TfIdfEmbeddingProvider(256),
      dbPath: sqlitePath,
    });
  } else if (await fileExists(jsonPath)) {
    // Fall back to JSON (legacy)
    console.warn(
      chalk.yellow(
        "⚠️  Using legacy JSON store. Run 'ada memory migrate' to upgrade."
      )
    );
    return createLegacyMemoryManager(agentsDir, jsonPath);
  } else {
    throw new Error("No memory store found. Run 'ada memory init' first.");
  }
}

// Updated search command
async function executeSearch(
  query: string,
  options: MemorySearchOptions
): Promise<void> {
  const agentsDir = path.resolve(options.dir, 'agents');
  const manager = await getMemoryManager(agentsDir);

  try {
    await manager.initialize();

    const results = await manager.store.search(query, {
      limit: parseInt(options.limit ?? '10', 10),
      threshold: parseFloat(options.threshold ?? '0.3'),
      role: options.role,
      includeInnate: true,
    });

    // Output results...
  } finally {
    await manager.close();
  }
}
```

### Phase 4: Init Command (Week 2)

New `ada memory init` command for fresh SQLite setup:

```typescript
new Command('init')
  .description('Initialize SQLite memory store with innate memories')
  .option('-d, --dir <path>', 'Project root directory', '.')
  .option(
    '--embedding <provider>',
    'Embedding provider (tfidf, openai)',
    'tfidf'
  )
  .option('--force', 'Overwrite existing database')
  .option('--json', 'Output as JSON')
  .action(async (options: MemoryInitOptions) => {
    const agentsDir = path.resolve(options.dir, 'agents');
    const sqlitePath = path.join(agentsDir, 'state', 'memory.sqlite');

    // Create embedding provider
    let provider: EmbeddingProvider;
    if (options.embedding === 'openai') {
      // Future: OpenAI embeddings
      throw new Error(
        'OpenAI embeddings not yet implemented. Use --embedding tfidf'
      );
    } else {
      provider = new TfIdfEmbeddingProvider(256);
    }

    // Initialize
    const manager = await createMemoryManager({
      agentsDir,
      embeddingProvider: provider,
      dbPath: sqlitePath,
    });

    const { innateLoaded, totalEntries } = await manager.initialize();

    if (options.json) {
      console.log(
        JSON.stringify({ innateLoaded, totalEntries, path: sqlitePath })
      );
    } else {
      console.log(chalk.green(`\n✅ Memory store initialized!\n`));
      console.log(`  Path: ${sqlitePath}`);
      console.log(`  Innate entries: ${innateLoaded}`);
      console.log(`  Total entries: ${totalEntries}`);
    }

    await manager.close();
  });
```

---

## Embedding Provider Strategy

### Current: TF-IDF (Local)

- **Pros:** Zero cost, fast, no API dependency
- **Cons:** Lower semantic quality, vocabulary-dependent
- **Use case:** Development, demos, cost-sensitive deployments

### Future: OpenAI (ada-002/text-embedding-3-small)

```typescript
// packages/core/src/memory/providers/openai-provider.ts

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions = 1536; // text-embedding-3-small

  constructor(private readonly apiKey: string) {}

  async embed(text: string): Promise<Float32Array> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    const data = await response.json();
    return new Float32Array(data.data[0].embedding);
  }
}
```

### Provider Selection

```bash
# Local TF-IDF (default)
ada memory init --embedding tfidf

# OpenAI (requires OPENAI_API_KEY)
ada memory init --embedding openai

# Check which provider is active
ada memory stats --verbose
```

---

## Migration Path

### For Existing ADA Users

1. **Check current state:** `ada memory lifecycle`
2. **Preview migration:** `ada memory migrate --dry-run`
3. **Execute migration:** `ada memory migrate`
4. **Verify:** `ada memory stats`

### For New ADA Users

1. **Initialize project:** `ada init`
2. **Initialize memory:** `ada memory init`
3. **Verify:** `ada memory stats`

---

## Testing Requirements

### Unit Tests

- [ ] `MemoryManager.initialize()` loads innate entries
- [ ] `MemoryManager.refreshInnate()` detects changed files
- [ ] Migration preserves all entries and embeddings
- [ ] Tier classification is preserved during migration

### Integration Tests

- [ ] `ada memory init` creates working SQLite store
- [ ] `ada memory migrate` migrates JSON → SQLite correctly
- [ ] `ada memory search` works with SQLite backend
- [ ] Innate entries have correct tier ('innate') after load

### E2E Tests

- [ ] Full dispatch cycle with SQLite memory (Issue #205 scope)

---

## Rollout Plan

| Week | Deliverable                            | Owner       |
| ---- | -------------------------------------- | ----------- |
| 1    | MemoryManager factory + migrate CLI    | Frontier    |
| 1    | Unit tests for manager                 | Frontier/QA |
| 2    | Update search/list/stats to use SQLite | Engineering |
| 2    | Integration tests                      | QA          |
| 3    | OpenAI embedding provider (optional)   | Frontier    |
| 3    | Documentation updates                  | Docs        |

---

## Open Questions

1. **Embedding provider persistence:** Should the provider type be stored in SQLite metadata for automatic detection?
2. **Dimension mismatch handling:** What happens if user tries to search with different embedding dimensions than stored?
3. **Concurrent access:** Should we add WAL mode for SQLite to support concurrent CLI + dispatch access?

---

## Related Issues

- **#113** — Cognitive Memory Architecture (parent epic)
- **#180** — SQLite Integration (CLOSED by PR #210)
- **#172** — Automatic Memory Compression (P2, future)
- **#173** — Enhanced Memory Search with Heat-Weighted Results (P2, future)

---

## Appendix: CLI Command Summary

After implementation:

```bash
# New commands
ada memory init              # Create SQLite store with innate memories
ada memory migrate           # Migrate JSON → SQLite

# Updated commands (now use SQLite)
ada memory search <query>    # Semantic search
ada memory list              # List entries
ada memory stats             # System health
ada memory lifecycle         # Tier distribution
ada memory export            # Export to JSON
```
