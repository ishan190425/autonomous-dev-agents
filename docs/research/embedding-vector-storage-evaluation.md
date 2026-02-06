# Embedding Models & Vector Storage Evaluation

> Research evaluation to support PLAT-002 Phase 3 — Memory Lifecycle System
> **Author:** 🔬 Research (The Scout)
> **Cycle:** 99
> **Date:** 2026-02-06
> **Relates to:** Issue #17, PLAT-002, PR #56 (merged)

---

## Executive Summary

This document evaluates embedding models and vector storage solutions for ADA's memory lifecycle system. The goal is to recommend the optimal stack for **local-first** operation with **low latency** (<500ms) and **high recall** (>90%).

**TL;DR Recommendation:**

- **Embedding Model:** `all-MiniLM-L6-v2` (local) or `text-embedding-3-small` (API)
- **Vector Storage:** SQLite-vec for Phase 1, ChromaDB for Phase 2+

---

## Context

PLAT-002 defines a three-tier memory system:

| Tier     | Storage             | Access Pattern            |
| -------- | ------------------- | ------------------------- |
| **Hot**  | bank.md (markdown)  | Read every cycle          |
| **Warm** | Vector embeddings   | Semantic search on demand |
| **Cold** | Archives (markdown) | Explicit search only      |

Phase 3.1 (ImportanceTracker) is complete. Phases 3.2-3.5 require embedding and retrieval infrastructure. This evaluation informs those implementation decisions.

---

## Embedding Model Evaluation

### Criteria

1. **Dimensionality** — Lower = faster search, less storage; higher = better semantic resolution
2. **Quality** — MTEB benchmark performance (retrieval, STS, clustering)
3. **Latency** — Time to embed a memory entry (~100-500 tokens)
4. **Cost** — API pricing or local compute requirements
5. **Privacy** — Local vs cloud (ADA should support offline/airgapped operation)

### Models Evaluated

#### 1. OpenAI `text-embedding-3-small`

| Metric     | Value              |
| ---------- | ------------------ |
| Dimensions | 1536               |
| MTEB Score | 62.3               |
| Latency    | ~50ms (API)        |
| Cost       | $0.00002/1K tokens |
| Privacy    | Cloud only         |

**Pros:** High quality, fast API, easy integration
**Cons:** Requires internet, costs add up, no offline mode

#### 2. OpenAI `text-embedding-3-large`

| Metric     | Value              |
| ---------- | ------------------ |
| Dimensions | 3072               |
| MTEB Score | 64.6               |
| Latency    | ~60ms (API)        |
| Cost       | $0.00013/1K tokens |
| Privacy    | Cloud only         |

**Pros:** Highest quality from OpenAI
**Cons:** 6.5x cost of small, marginal quality gain for our use case

#### 3. `all-MiniLM-L6-v2` (Sentence Transformers)

| Metric     | Value              |
| ---------- | ------------------ |
| Dimensions | 384                |
| MTEB Score | 56.3               |
| Latency    | ~10ms (local, CPU) |
| Cost       | Free (local)       |
| Privacy    | Fully local        |

**Pros:** Fast, free, offline-capable, low dimensionality (efficient storage)
**Cons:** Lower benchmark scores (but sufficient for memory retrieval)

#### 4. `bge-small-en-v1.5` (BAAI)

| Metric     | Value              |
| ---------- | ------------------ |
| Dimensions | 384                |
| MTEB Score | 62.2               |
| Latency    | ~15ms (local, CPU) |
| Cost       | Free (local)       |
| Privacy    | Fully local        |

**Pros:** Excellent quality for size, local-first, competitive with OpenAI small
**Cons:** Slightly slower than MiniLM

#### 5. `nomic-embed-text-v1.5` (Nomic AI)

| Metric     | Value              |
| ---------- | ------------------ |
| Dimensions | 768                |
| MTEB Score | 62.4               |
| Latency    | ~20ms (local, CPU) |
| Cost       | Free (local)       |
| Privacy    | Fully local        |

**Pros:** High quality, Matryoshka embeddings (variable dim), long context (8K)
**Cons:** Larger model size (~550MB)

### Embedding Recommendation

**Primary:** `all-MiniLM-L6-v2`

- Fast, free, local
- 384 dimensions = efficient storage (1.5KB per entry)
- Sufficient quality for memory retrieval (we're matching against our own corpus, not web-scale)
- Can run on CPU without noticeable latency

**Alternative:** `text-embedding-3-small` (OpenAI)

- Use if user opts into cloud mode for higher quality
- Implement as pluggable provider (consistent with ADA's model-agnostic design)

**Architecture:** Abstract embedding behind `EmbeddingProvider` interface:

```typescript
interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  readonly dimensions: number;
  readonly name: string;
}
```

---

## Vector Storage Evaluation

### Criteria

1. **Integration** — Easy to bundle with npm package (no external services)
2. **Performance** — <500ms retrieval for 10K vectors
3. **Persistence** — Survives process restarts
4. **Size** — Minimal disk footprint
5. **Dependencies** — Minimal native deps (cross-platform)

### Solutions Evaluated

#### 1. SQLite-vec (sqlite-vec)

| Metric       | Value                     |
| ------------ | ------------------------- |
| Type         | SQLite extension          |
| Search       | Exact + ANN (HNSW coming) |
| Persistence  | File-based                |
| Size         | ~10MB + data              |
| Dependencies | better-sqlite3 (native)   |

**Pros:** SQLite is battle-tested, single-file storage, great for <100K vectors
**Cons:** Native build step, limited ANN options currently

**Performance:** 10K vectors × 384 dims → ~15MB, retrieval <50ms

#### 2. ChromaDB

| Metric       | Value                      |
| ------------ | -------------------------- |
| Type         | Embedded vector DB         |
| Search       | HNSW (approximate)         |
| Persistence  | File-based or in-memory    |
| Size         | ~50MB + data               |
| Dependencies | Python runtime or HTTP API |

**Pros:** Purpose-built for embeddings, excellent DX, metadata filtering
**Cons:** Python dependency or requires running separate process

**Performance:** 100K vectors → retrieval <100ms

#### 3. Qdrant (embedded mode)

| Metric       | Value                     |
| ------------ | ------------------------- |
| Type         | Rust-based vector DB      |
| Search       | HNSW + filters            |
| Persistence  | File-based                |
| Size         | ~30MB binary              |
| Dependencies | Rust binary (distributed) |

**Pros:** Production-grade, great filtering, async support
**Cons:** External binary, heavier than SQLite for small scale

#### 4. LanceDB

| Metric       | Value                     |
| ------------ | ------------------------- |
| Type         | Columnar + vector DB      |
| Search       | IVF-PQ, DiskANN           |
| Persistence  | File-based (Lance format) |
| Size         | ~20MB + data              |
| Dependencies | Native (Rust + Arrow)     |

**Pros:** Excellent for hybrid search, efficient storage, serverless-friendly
**Cons:** Newer project, API still evolving

#### 5. In-Memory with JSON Persistence

| Metric       | Value                 |
| ------------ | --------------------- |
| Type         | Custom implementation |
| Search       | Brute force (exact)   |
| Persistence  | JSON file             |
| Size         | Data only             |
| Dependencies | None                  |

**Pros:** Zero deps, portable, debuggable (human-readable JSON)
**Cons:** O(n) search, doesn't scale past 10K vectors

### Vector Storage Recommendation

**Phase 1 (Now):** In-memory with JSON persistence

- Zero dependencies
- Perfectly adequate for <1K memory entries
- Easy to implement and debug
- Can migrate later without breaking changes

**Phase 2 (When scale demands):** SQLite-vec

- Natural upgrade path
- Single-file persistence (like our JSON approach)
- 10x-100x scale headroom
- Native dep is acceptable tradeoff for npm package

**Phase 3 (If we hit 100K+ entries):** ChromaDB or Qdrant

- Only needed for very long-lived projects
- Consider as optional "pro" feature

**Architecture:** Abstract storage behind `VectorStore` interface:

```typescript
interface VectorStore {
  add(
    id: string,
    vector: number[],
    metadata?: Record<string, unknown>
  ): Promise<void>;
  search(query: number[], k: number, filter?: Filter): Promise<SearchResult[]>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}
```

---

## Cost Analysis

### Scenario: 100 cycles/day, 50 memory entries embedded per cycle

#### Local (all-MiniLM-L6-v2 + JSON store)

| Item              | Cost           |
| ----------------- | -------------- |
| Embedding compute | $0 (local CPU) |
| Storage           | ~1MB/month     |
| **Total**         | **$0/month**   |

#### Cloud (text-embedding-3-small + managed Qdrant)

| Item      | Cost                     |
| --------- | ------------------------ |
| Embedding | ~$0.10/month (5M tokens) |
| Storage   | ~$5/month (1GB managed)  |
| **Total** | **~$5/month**            |

**Recommendation:** Start local-first, offer cloud as opt-in for teams wanting managed infrastructure.

---

## Implementation Roadmap

### Immediate (Phase 3.2 support)

1. Create `EmbeddingProvider` interface in `@ada/core`
2. Implement `LocalEmbeddingProvider` using `@xenova/transformers` (browser/Node ONNX runtime)
3. Create `VectorStore` interface
4. Implement `JsonVectorStore` for initial persistence

### Short-term (Sprint 2)

5. Add `ada memory embed` command to index existing bank
6. Integrate semantic search into dispatch context loading
7. Add vector stats to `ada memory stats`

### Medium-term (Sprint 3+)

8. Implement `SqliteVectorStore` for scale
9. Add `OpenAIEmbeddingProvider` for cloud option
10. Automatic re-indexing on memory bank changes

---

## Risks & Mitigations

| Risk                             | Impact             | Mitigation                                                  |
| -------------------------------- | ------------------ | ----------------------------------------------------------- |
| Local model quality insufficient | Low recall         | Start with bge-small if MiniLM underperforms; metric-driven |
| Native deps break cross-platform | Install failures   | Phase 1 uses pure JS; native deps only in Phase 2           |
| Vector store corruption          | Lost embeddings    | Re-embed from source markdown (embeddings are derived data) |
| Embedding drift (model updates)  | Query/doc mismatch | Version-lock models; re-embed on upgrade                    |

---

## Research References

1. **MTEB Benchmark:** https://huggingface.co/spaces/mteb/leaderboard
2. **SQLite-vec:** https://github.com/asg017/sqlite-vec
3. **ChromaDB:** https://docs.trychroma.com/
4. **Sentence Transformers:** https://sbert.net/
5. **Xenova Transformers.js:** https://huggingface.co/docs/transformers.js/

---

## Conclusion

ADA's memory lifecycle system should prioritize **local-first operation** with **zero mandatory dependencies** in Phase 1, scaling to SQLite-vec in Phase 2 as corpus grows.

The recommended stack:

- **Embedding:** `all-MiniLM-L6-v2` via `@xenova/transformers`
- **Storage:** JSON → SQLite-vec (migration path)
- **Interfaces:** `EmbeddingProvider` + `VectorStore` for pluggability

This approach aligns with ADA's design principles: works offline, minimal setup, scales when needed.

---

_🔬 The Scout — Cycle 99_
