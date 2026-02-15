# Plugin RFC — Frontier Architecture Input

> **Author:** 🌌 The Frontier (Head of Platform & Innovation)
> **Cycle:** C680
> **Date:** 2026-02-15
> **Relates to:** Plugin Architecture RFC, gather.is Integration Spec, #113 Cognitive Memory

---

## Context

The Plugin Architecture RFC (docs/architecture/plugin-architecture-rfc.md) has two open questions assigned to Frontier:

| #   | Question                                                                                    | For Role |
| --- | ------------------------------------------------------------------------------------------- | -------- |
| Q3  | Should the memory plugin interface support structured queries (not just read/write string)? | Frontier |
| Q4  | How do plugins interact with the existing SemanticMemoryManager?                            | Frontier |

This document provides Frontier's architectural recommendations.

---

## Q3: Structured Query Support for Memory Plugins

### Recommendation: **Yes, with layered API**

The current `MemoryPlugin` interface (read/write string) should be the **base layer**, but we need a **structured query layer** for production use.

### Rationale

1. **SemanticMemoryManager already extracts structured entries.** The `extractMemoryEntries()` function parses `bank.md` into typed `MemoryEntry` objects (decisions, lessons, role_state, etc.). This structure should be queryable via plugins.

2. **gather.is Memory Bridge depends on it.** The gather.is integration spec (Option C: Memory Backend Bridge) needs structured queries:

   ```typescript
   // From gather.is spec — needs to query memories by tag
   await client.search(key);
   const posts = await client.feed({ tags: ['memory'] });
   ```

3. **Cognitive Memory (#113) requires heat scoring.** The cognitive memory architecture needs query support for:
   - Filter by entry type (innate vs. learned)
   - Sort by heat score (usage frequency)
   - Time-decay weighting

### Proposed API Extension

```typescript
/**
 * Extended memory plugin interface with structured query support.
 * Backwards compatible — base methods remain string-only.
 */
export interface StructuredMemoryPlugin extends MemoryPlugin {
  /**
   * Query memory entries with filters.
   * Falls back to parsing readBank() if not implemented.
   */
  queryEntries?(filter: MemoryFilter): Promise<readonly MemoryEntry[]>;

  /**
   * Write a structured entry (vs raw string).
   * Handles serialization to bank format internally.
   */
  writeEntry?(entry: MemoryEntry): Promise<void>;

  /**
   * Get entry by ID.
   */
  getEntry?(id: string): Promise<MemoryEntry | null>;

  /**
   * Delete entry by ID.
   */
  deleteEntry?(id: string): Promise<boolean>;
}

export interface MemoryFilter {
  /** Entry types to include */
  readonly types?: readonly MemoryEntryType[];

  /** Role filter */
  readonly role?: string;

  /** Time range */
  readonly since?: Date;
  readonly until?: Date;

  /** Semantic query (uses embedding search) */
  readonly query?: string;

  /** Minimum heat score */
  readonly minHeat?: number;

  /** Maximum entries to return */
  readonly limit?: number;

  /** Sort order */
  readonly sortBy?: 'heat' | 'time' | 'relevance';
}

export type MemoryEntryType =
  | 'decision'
  | 'lesson'
  | 'role_state'
  | 'blocker'
  | 'question'
  | 'completed'
  | 'in_progress';
```

### Backwards Compatibility

- `readBank()` and `writeBank()` remain the core interface
- `StructuredMemoryPlugin` extends `MemoryPlugin` — existing plugins work
- Default implementation: `queryEntries()` calls `readBank()` + `extractMemoryEntries()` + filters
- Plugins can override for optimized queries (e.g., SQL WHERE clauses)

---

## Q4: SemanticMemoryManager Plugin Integration

### Recommendation: **Composition over replacement**

Plugins should **use** SemanticMemoryManager, not replace it. The manager coordinates providers and stores; plugins provide implementations.

### Current Architecture (Phase 1)

```
SemanticMemoryManager
├── EmbeddingProvider (TfIdfEmbeddingProvider default)
├── VectorStore (InMemoryVectorStore default)
└── Methods: indexBank(), query(), count()
```

### Plugin Integration Pattern

```typescript
/**
 * Embedding plugins provide the provider and optionally the store.
 * SemanticMemoryManager remains the coordinator.
 */
export interface EmbeddingPlugin extends AdaPlugin {
  getProvider(): EmbeddingProvider;
  getVectorStore?(): VectorStore;
}

/**
 * Integration in dispatch context loading:
 */
async function loadContext(
  rootDir: string,
  config?: AdaConfig,
  plugins?: PluginRegistry
): Promise<DispatchContext> {
  // 1. Get embedding plugin if registered
  const embeddingPlugin = plugins?.getEmbeddingPlugin();

  // 2. Use plugin's provider/store, or defaults
  const provider =
    embeddingPlugin?.getProvider() ?? new TfIdfEmbeddingProvider();
  const store =
    embeddingPlugin?.getVectorStore?.() ?? new InMemoryVectorStore();

  // 3. SemanticMemoryManager coordinates
  const semanticMemory = new SemanticMemoryManager(provider, store);

  // 4. Available in context for all roles
  return { ...context, semanticMemory };
}
```

### gather.is as Memory Bridge Example

The gather.is integration demonstrates both patterns working together:

```typescript
/**
 * gather.is as a shared memory layer (cross-team discovery).
 * Implements MemoryPlugin for storage + uses SemanticMemoryManager for search.
 */
export const gatherisMemoryBridge: MemoryPlugin = {
  name: 'gatheris-memory-bridge',
  version: '1.0.0',
  description: 'Shared agent memory via gather.is feed',

  async readBank(): Promise<string> {
    // Primary source remains local bank.md
    // gather.is is supplementary (read-through cache)
    return readLocalBank();
  },

  async writeBank(content: string): Promise<void> {
    // Write locally AND publish digest to gather.is
    await writeLocalBank(content);
    await publishDigest(content);
  },

  // Extended structured queries
  async queryEntries(filter: MemoryFilter): Promise<MemoryEntry[]> {
    // Local entries + gather.is discoveries
    const localEntries = await queryLocalEntries(filter);

    if (filter.query) {
      // Semantic search across gather.is network
      const networkEntries = await gatherisClient.search({
        query: filter.query,
        tags: ['memory', 'ada'],
        limit: filter.limit,
      });
      return mergeAndRank(localEntries, networkEntries);
    }

    return localEntries;
  },
};
```

### Key Design Decisions

| Decision                                            | Rationale                                                  |
| --------------------------------------------------- | ---------------------------------------------------------- |
| Plugins provide components, not replace coordinator | SemanticMemoryManager handles lifecycle, caching, indexing |
| Multiple embedding providers allowed (future)       | Ensemble search: TF-IDF + OpenAI for hybrid retrieval      |
| Single memory plugin (enforced)                     | Prevents write conflicts; clear source of truth            |
| Store is optional in EmbeddingPlugin                | Default InMemoryVectorStore works for most cases           |
| StructuredMemoryPlugin is opt-in                    | Base plugins work with string-only API                     |

---

## Implementation Priority (Post-Demo)

Given feature freeze and demo phase (Pioneer T-10, YC T-14), this input is for **post-demo Sprint 3**.

### Priority Order

| Priority | Work                                   | Sprint   | Rationale                            |
| -------- | -------------------------------------- | -------- | ------------------------------------ |
| 1        | Plugin infrastructure (Phase 1 of RFC) | Sprint 3 | Foundation for everything            |
| 2        | EmbeddingPlugin integration            | Sprint 3 | SemanticMemoryManager already exists |
| 3        | StructuredMemoryPlugin interface       | Sprint 3 | Minimal code, unlocks Q3             |
| 4        | gather.is CLI command (Phase 1)        | Sprint 3 | External visibility, low risk        |
| 5        | gather.is lifecycle plugin             | Sprint 4 | Depends on #1                        |
| 6        | gather.is Memory Bridge                | Sprint 4 | Depends on #3                        |

### Dependencies

```
Plugin Infrastructure (RFC Phase 1)
├── EmbeddingPlugin integration
│   └── SemanticMemoryManager coordination
└── StructuredMemoryPlugin interface
    └── gather.is Memory Bridge
        └── Cognitive Memory heat scoring (#113)
```

---

## Action Items

1. **Product (Q1 validation):** Should plugins veto actions? Recommend: **No** — plugins observe, don't block. Vetoing creates fragile chains.

2. **Engineering (Q2):** Plugin-to-plugin communication? Recommend: **Event bus pattern** — plugins emit events, others subscribe. Keeps plugins decoupled.

3. **Frontier (this doc):** Q3 + Q4 answered above.

4. **Post-demo:** Update Plugin RFC Open Questions section with these recommendations.

---

## Lessons

- **L336:** Plugin integration should use composition (provide components) over replacement (swap coordinators). Keeps APIs stable while enabling customization.

---

_🌌 Frontier | C680 | Plugin RFC Frontier Input — Q3 & Q4 Answered_
