# MemoryStream Phase 3: Semantic Search & Embeddings

> Implementation specification for semantic memory retrieval
> **Author:** 🌌 Frontier (The Frontier)
> **Cycle:** 209
> **Date:** 2026-02-08
> **Relates to:** Issue #95, PR #107 (Phase 2)

---

## Executive Summary

Phase 3 adds semantic search to MemoryStream, enabling agents to recall relevant memories by meaning rather than keyword matching. Building on Phase 2's structured logging, this phase implements the embedding pipeline and vector search per the [Embedding & Vector Storage Evaluation](../research/embedding-vector-storage-evaluation.md).

**Key deliverables:**

1. `EmbeddingProvider` interface + `LocalEmbeddingProvider` implementation
2. `VectorStore` interface + `JsonVectorStore` implementation
3. `recallSemantic()` function for similarity-based retrieval
4. Auto-embed on `log()` with background indexing

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MemoryStream (Phase 3)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   log(entry) ──► JSONL File ──► EmbeddingProvider ──► VectorStore
│                     │                                      │    │
│                     ▼                                      ▼    │
│              recallByCycle()                      recallSemantic()
│              recallSearch()                        (similarity)  │
│              (existing P1)                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Interfaces

### EmbeddingProvider

```typescript
/**
 * Abstract embedding provider for pluggable models
 */
export interface EmbeddingProvider {
  /** Generate embedding for a single text */
  embed(text: string): Promise<number[]>;

  /** Batch embed for efficiency */
  embedBatch(texts: string[]): Promise<number[][]>;

  /** Embedding dimensions (e.g., 384 for MiniLM) */
  readonly dimensions: number;

  /** Provider identifier */
  readonly name: string;

  /** Whether provider is ready (model loaded) */
  isReady(): Promise<boolean>;
}

/**
 * Provider initialization options
 */
export interface EmbeddingProviderOptions {
  /** Model identifier (default: 'all-MiniLM-L6-v2') */
  model?: string;

  /** Max concurrent embeddings (default: 10) */
  concurrency?: number;

  /** Cache embeddings in memory (default: true) */
  useCache?: boolean;
}
```

### VectorStore

```typescript
/**
 * Abstract vector storage for pluggable backends
 */
export interface VectorStore {
  /** Add vector with metadata */
  add(id: string, vector: number[], metadata?: VectorMetadata): Promise<void>;

  /** Search by similarity, return top-k matches */
  search(
    query: number[],
    k: number,
    filter?: VectorFilter
  ): Promise<VectorSearchResult[]>;

  /** Remove vector by ID */
  delete(id: string): Promise<void>;

  /** Get total count */
  count(): Promise<number>;

  /** Persist to disk (for JSON store) */
  save(): Promise<void>;

  /** Load from disk */
  load(): Promise<void>;
}

/**
 * Search result with score
 */
export interface VectorSearchResult {
  id: string;
  score: number; // Cosine similarity (0-1)
  metadata?: VectorMetadata;
}

/**
 * Metadata stored with vectors
 */
export interface VectorMetadata {
  cycle?: number;
  role?: string;
  type?: StreamEntryType;
  importance?: number;
  timestamp?: string;
  tags?: string[];
}

/**
 * Filter for search queries
 */
export interface VectorFilter {
  minCycle?: number;
  maxCycle?: number;
  roles?: string[];
  types?: StreamEntryType[];
  minImportance?: number;
  tags?: string[];
}
```

---

## Implementation

### Phase 3.1: Local Embedding Provider

```typescript
// packages/core/src/embedding-provider.ts

import { pipeline, type Pipeline } from '@xenova/transformers';

export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'local-minilm';
  readonly dimensions = 384;

  private pipeline: Pipeline | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(private options: EmbeddingProviderOptions = {}) {}

  async isReady(): Promise<boolean> {
    if (this.pipeline) return true;
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
    return true;
  }

  private async initialize(): Promise<void> {
    this.pipeline = await pipeline(
      'feature-extraction',
      this.options.model ?? 'Xenova/all-MiniLM-L6-v2',
      { quantized: true }
    );
  }

  async embed(text: string): Promise<number[]> {
    await this.isReady();
    const output = await this.pipeline!(text, {
      pooling: 'mean',
      normalize: true,
    });
    return Array.from(output.data as Float32Array);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.embed(t)));
  }
}
```

### Phase 3.2: JSON Vector Store

```typescript
// packages/core/src/vector-store.ts

import { existsSync, readFileSync, writeFileSync } from 'fs';

export class JsonVectorStore implements VectorStore {
  private vectors: Map<string, { vector: number[]; metadata: VectorMetadata }> =
    new Map();

  constructor(private storagePath: string) {}

  async add(
    id: string,
    vector: number[],
    metadata?: VectorMetadata
  ): Promise<void> {
    this.vectors.set(id, { vector, metadata: metadata ?? {} });
  }

  async search(
    query: number[],
    k: number,
    filter?: VectorFilter
  ): Promise<VectorSearchResult[]> {
    const results: VectorSearchResult[] = [];

    for (const [id, { vector, metadata }] of this.vectors) {
      // Apply filters
      if (filter && !this.matchesFilter(metadata, filter)) continue;

      // Cosine similarity
      const score = this.cosineSimilarity(query, vector);
      results.push({ id, score, metadata });
    }

    // Sort by score descending, return top-k
    return results.sort((a, b) => b.score - a.score).slice(0, k);
  }

  private matchesFilter(
    metadata: VectorMetadata,
    filter: VectorFilter
  ): boolean {
    if (filter.minCycle && (metadata.cycle ?? 0) < filter.minCycle)
      return false;
    if (filter.maxCycle && (metadata.cycle ?? Infinity) > filter.maxCycle)
      return false;
    if (filter.roles && !filter.roles.includes(metadata.role ?? ''))
      return false;
    if (
      filter.types &&
      !filter.types.includes(metadata.type as StreamEntryType)
    )
      return false;
    if (
      filter.minImportance &&
      (metadata.importance ?? 0) < filter.minImportance
    )
      return false;
    if (
      filter.tags?.length &&
      !filter.tags.some(t => metadata.tags?.includes(t))
    )
      return false;
    return true;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async delete(id: string): Promise<void> {
    this.vectors.delete(id);
  }

  async count(): Promise<number> {
    return this.vectors.size;
  }

  async save(): Promise<void> {
    const data = Object.fromEntries(this.vectors);
    writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
  }

  async load(): Promise<void> {
    if (!existsSync(this.storagePath)) return;
    const data = JSON.parse(readFileSync(this.storagePath, 'utf-8'));
    this.vectors = new Map(Object.entries(data));
  }
}
```

### Phase 3.3: MemoryStream Semantic Search

```typescript
// Add to memory-stream.ts

export interface SemanticSearchOptions {
  /** Maximum results to return */
  k?: number;

  /** Minimum similarity score (0-1) */
  minScore?: number;

  /** Filter by metadata */
  filter?: VectorFilter;

  /** Combine with recency scoring (Generative Agents formula) */
  useRecencyDecay?: boolean;

  /** Decay factor for recency (higher = faster decay) */
  recencyDecayFactor?: number;
}

/**
 * Search memories by semantic similarity
 */
async recallSemantic(
  query: string,
  options: SemanticSearchOptions = {}
): Promise<StreamEntry[]> {
  const { k = 10, minScore = 0.3, filter, useRecencyDecay = true, recencyDecayFactor = 0.99 } = options;

  // Embed the query
  const queryVector = await this.embeddingProvider.embed(query);

  // Search vector store
  const vectorResults = await this.vectorStore.search(queryVector, k * 2, filter);

  // Filter by minimum score
  const filtered = vectorResults.filter(r => r.score >= minScore);

  // Apply recency decay if enabled (Generative Agents formula)
  const currentCycle = this.getCurrentCycle();
  const scored = filtered.map(r => {
    let finalScore = r.score;

    if (useRecencyDecay && r.metadata?.cycle) {
      const age = currentCycle - r.metadata.cycle;
      const recencyScore = Math.pow(recencyDecayFactor, age);
      const importanceWeight = (r.metadata.importance ?? 5) / 10;

      // Generative Agents formula: recency × importance × relevance
      finalScore = recencyScore * importanceWeight * r.score;
    }

    return { ...r, finalScore };
  });

  // Sort by final score, take top-k
  const topK = scored
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, k);

  // Look up full entries from JSONL
  return this.getEntriesByIds(topK.map(r => r.id));
}
```

### Phase 3.4: Auto-Embed on Log

```typescript
// Extend log() method

async log(entry: StreamEntryInput): Promise<StreamEntry> {
  // Create entry (existing Phase 1 code)
  const fullEntry = this.createEntry(entry);

  // Append to JSONL (existing)
  this.appendToFile(fullEntry);

  // Auto-embed for semantic search (Phase 3)
  if (this.embeddingProvider && this.vectorStore) {
    const textToEmbed = `${fullEntry.action} ${fullEntry.content}`;
    const vector = await this.embeddingProvider.embed(textToEmbed);

    await this.vectorStore.add(fullEntry.id, vector, {
      cycle: fullEntry.cycle,
      role: fullEntry.role,
      type: fullEntry.type,
      importance: fullEntry.importance,
      timestamp: fullEntry.timestamp,
      tags: [...fullEntry.tags],
    });

    // Persist periodically (every 10 entries)
    if ((await this.vectorStore.count()) % 10 === 0) {
      await this.vectorStore.save();
    }
  }

  return fullEntry;
}
```

---

## File Structure

```
packages/core/src/
├── memory-stream.ts          # Enhanced with recallSemantic()
├── embedding-provider.ts     # EmbeddingProvider interface + LocalEmbeddingProvider
├── vector-store.ts           # VectorStore interface + JsonVectorStore
└── index.ts                  # Export new modules

packages/core/tests/unit/
├── embedding-provider.test.ts
├── vector-store.test.ts
└── memory-stream-semantic.test.ts
```

---

## Test Plan

### Unit Tests

| Test                              | Description                                    |
| --------------------------------- | ---------------------------------------------- |
| LocalEmbeddingProvider.embed      | Single text produces 384-dim vector            |
| LocalEmbeddingProvider.embedBatch | Batch matches individual embeds                |
| JsonVectorStore.add/search        | Basic add and retrieve                         |
| JsonVectorStore.filter            | Filters by cycle, role, type, importance, tags |
| JsonVectorStore.persistence       | Save/load roundtrip                            |
| cosineSimilarity                  | Math correctness                               |
| recallSemantic                    | End-to-end semantic search                     |
| recallSemantic + recency          | Recency decay affects ranking                  |
| auto-embed on log                 | Log creates vector entry                       |

### Integration Tests

| Test                       | Description                                     |
| -------------------------- | ----------------------------------------------- |
| Dispatch + semantic recall | completeDispatch logs, recallSemantic retrieves |
| Large corpus search        | 1000 entries, <500ms retrieval                  |
| Cross-role memory sharing  | Role A's memories found by Role B               |

---

## Dependencies

```json
{
  "dependencies": {
    "@xenova/transformers": "^2.17.0"
  }
}
```

**Note:** `@xenova/transformers` runs ONNX models in Node.js (and browser). No Python required. First embed downloads the model (~23MB for MiniLM).

---

## Migration Path

Phase 3 is **additive**:

- Existing MemoryStream API unchanged
- `recallByCycle()` and `recallSearch()` still work
- `recallSemantic()` is new, optional capability
- Vector store is separate file, can be deleted to re-index

**Re-indexing existing entries:**

```typescript
// CLI command: ada memory reindex
const entries = memoryStream.recallByCycle(1, Infinity);
for (const entry of entries) {
  const text = `${entry.action} ${entry.content}`;
  const vector = await embeddingProvider.embed(text);
  await vectorStore.add(entry.id, vector, { ... });
}
await vectorStore.save();
```

---

## Performance Targets

| Metric                       | Target                                         |
| ---------------------------- | ---------------------------------------------- |
| Embed latency (single)       | <50ms (local CPU)                              |
| Search latency (10K vectors) | <100ms                                         |
| Storage overhead             | ~2KB per entry (384 dims × 4 bytes + metadata) |
| Model download               | ~23MB (one-time)                               |

---

## Future Phases

### Phase 4: Decision Consistency

- Track decisions in separate vector space
- Alert on conflicting decisions
- Link decisions to ADRs

### Phase 5: Compression Integration

- Compress vectors for cold storage
- Hierarchical retrieval (summary → detail)
- Smart forgetting (remove low-importance vectors)

---

## Risks & Mitigations

| Risk                        | Impact           | Mitigation                                 |
| --------------------------- | ---------------- | ------------------------------------------ |
| Model download on first run | Slow first embed | Pre-download in setup, cache model         |
| Embedding quality issues    | Poor recall      | Fallback to keyword search, tune threshold |
| Vector store growth         | Disk usage       | Periodic pruning, limit to warm tier       |
| Cross-platform issues       | Install failures | Pure JS implementation, optional native    |

---

## References

- [Embedding & Vector Storage Evaluation](../research/embedding-vector-storage-evaluation.md)
- [Generative Agents Paper](https://arxiv.org/abs/2304.03442)
- [Phase 2 Dispatch Integration](./memory-stream-dispatch-integration.md)
- [DecisionTrace Schema](../research/decision-trace-schema.md)

---

_🌌 The Frontier — Cycle 209_
