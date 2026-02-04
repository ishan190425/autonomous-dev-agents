# ADR: Embedding-Based Memory Retrieval System

> **ID:** PLAT-001
> **Status:** Accepted (Phase 1 implemented)
> **Author:** The Frontier 🌌
> **Date:** 2026-02-04
> **Relates to:** Issue #17, ADR-001 (monorepo), API-001 (immutable-first design)

---

## Context

ADA's current memory system stores all agent memory in flat markdown files (`bank.md`, per-role banks, archives). As the cycle count grows (currently 29 cycles, ~200 lines), retrieving relevant context becomes increasingly expensive:

- **Token burn:** Every cycle reads the entire bank (~4k tokens), even when only a fraction is relevant
- **Retrieval quality:** Flat read means agents can't prioritize the most relevant memories
- **Scaling limit:** At 100+ cycles, the bank will exceed context windows even after compression

Issue #17 proposes embedding-based memory retrieval. This ADR documents the architecture and Phase 1 implementation.

## Decision

Implement a **three-phase embedding memory system** with the following architecture:

### Phase 1: Foundation (This PR) ✅

**In-memory vector store with pluggable embedding providers.**

Components:

- `MemoryEntry` — structured unit of memory (decisions, lessons, statuses, etc.)
- `EmbeddingProvider` interface — abstracts embedding generation (swap models freely)
- `VectorStore` interface — abstracts storage (swap backends freely)
- `TfIdfEmbeddingProvider` — zero-dependency baseline (no API keys needed)
- `InMemoryVectorStore` — brute-force cosine similarity search
- `extractMemoryEntries()` — parses `bank.md` into structured entries
- `SemanticMemoryManager` — high-level API tying it all together

**Why start here:**

- Establishes interfaces before committing to specific vendors
- TF-IDF provider enables testing without API keys or external services
- In-memory store is fast and correct (reference implementation)
- Extraction logic validates that bank.md structure supports semantic parsing

### Phase 2: Production Embeddings (Future)

Replace TF-IDF with a real embedding model:

| Option                                 | Pros                                         | Cons                                     | Recommendation         |
| -------------------------------------- | -------------------------------------------- | ---------------------------------------- | ---------------------- |
| OpenAI `text-embedding-3-small`        | Best quality, 1536d, cheap ($0.02/1M tokens) | Requires API key, network dependency     | **Production default** |
| `all-MiniLM-L6-v2` via transformers.js | Offline, 384d, good quality                  | ~100MB model download, slower first run  | Offline fallback       |
| TF-IDF (current)                       | Zero deps, instant                           | Lower quality, no semantic understanding | Dev/test only          |

Implementation: Create `OpenAIEmbeddingProvider` class implementing the same interface.

### Phase 3: Persistent Vector Storage (Future)

Replace in-memory store with durable storage:

| Option         | Pros                                  | Cons                               | Recommendation                                  |
| -------------- | ------------------------------------- | ---------------------------------- | ----------------------------------------------- |
| **SQLite-vec** | Zero external deps, single file, fast | Newer, smaller ecosystem           | **CLI default** (fits single-binary philosophy) |
| ChromaDB       | Rich features, Python ecosystem       | Requires running server, heavy     | Dashboard/server use                            |
| Qdrant         | Production-grade, Rust performance    | External service, overkill for CLI | Enterprise tier                                 |
| JSON file      | Simplest possible                     | Slow for large stores, no indexing | Bootstrapping only                              |

Implementation: Create `SqliteVecStore` class implementing the same interface.

## Architecture

```
┌─────────────────────────────────────────────────┐
│            SemanticMemoryManager                │
│  indexBank() → query() → removeEntries()        │
├──────────────────────┬──────────────────────────┤
│   EmbeddingProvider  │      VectorStore         │
│   ┌──────────────┐   │   ┌──────────────────┐   │
│   │  TF-IDF      │   │   │  InMemoryStore   │   │
│   │  OpenAI      │   │   │  SQLite-vec      │   │
│   │  MiniLM      │   │   │  ChromaDB        │   │
│   └──────────────┘   │   └──────────────────┘   │
├──────────────────────┴──────────────────────────┤
│         extractMemoryEntries(bank.md)           │
│  decisions | lessons | role_state | blockers    │
│  questions | completed | in-progress            │
└─────────────────────────────────────────────────┘
```

### Integration with DISPATCH.md

Phase 1 (Context Load) changes:

**Current flow:**

1. Read entire `bank.md` (~4k tokens)

**New flow (when enabled):**

1. Read `bank.md` header only (sprint info, ~500 tokens)
2. Query semantic memory: "What's relevant for [current role] doing [current task]?"
3. Retrieve top-k entries (~1k tokens of highly relevant context)
4. **Net savings: ~60% token reduction per cycle**

The manager hooks into `loadContext()` in `dispatch.ts` — existing bank.md remains the source of truth, embeddings are a derived index.

## Consequences

### Positive

- Every role gets more relevant context per cycle
- Token costs reduced significantly at scale
- Foundation for intelligent memory lifecycle (hot/warm/cold tiers)
- Clean interfaces allow easy backend swaps as needs evolve
- TF-IDF provider enables full test suite without external dependencies

### Negative

- Adds complexity to the core library
- TF-IDF quality is limited (no true semantic understanding)
- In-memory store doesn't persist across process restarts (Phase 3 fixes this)

### Neutral

- bank.md remains human-readable — embeddings are a parallel index, not a replacement
- No changes to existing DISPATCH.md protocol (additive, not breaking)

## Metrics (Phase 1)

- **Extraction coverage:** Parses 7 entry types from bank.md
- **Vector math:** Cosine similarity + L2 normalization
- **Test coverage:** 25+ test cases covering all components
- **Zero external dependencies** — no new packages added

## Future Considerations

1. **Embedding caching:** Don't re-embed unchanged entries (content hash → skip)
2. **Memory importance scoring:** Weight entries by recency, access frequency, and role relevance
3. **Cross-repo memory:** Share learnings across ADA projects via shared embedding space
4. **Automatic forgetting:** Decay scores for old entries, auto-archive below threshold
5. **Memory visualization:** Expose embedding clusters in ADA Hub (#18)

---

_This ADR was created by The Frontier as part of cycle 30._
