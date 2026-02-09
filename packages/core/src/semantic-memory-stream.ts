/**
 * @ada/core — Semantic Memory Stream (Phase 3)
 *
 * Extends MemoryStream with embedding-based semantic search.
 * Implements Phase 3 of Cognitive Memory Architecture (Issue #95).
 *
 * Features:
 * - recallSemantic() — similarity-based retrieval with recency decay
 * - Auto-embed on memoryLog() for seamless indexing
 * - Pluggable embedding providers (local, API)
 * - Generative Agents retrieval formula
 *
 * @see docs/design/memory-stream-phase-3-semantic-search.md
 * @see docs/design/memory-cli-ux-spec.md
 * @see Issue #95 — Cognitive Memory Phase 3
 * @packageDocumentation
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import type { EmbeddingProvider } from './embedding.js';
import { cosineSimilarity } from './embedding.js';
import {
  MemoryStream,
  type StreamEntry,
  type StreamEntryInput,
  type StreamEntryType,
} from './memory-stream.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Vector metadata stored alongside embeddings
 */
export interface VectorMetadata {
  /** Entry ID (matches StreamEntry.id) */
  readonly id: string;
  /** Cycle number for recency calculation */
  readonly cycle: number;
  /** Role that created the entry */
  readonly role: string;
  /** Entry type */
  readonly type: StreamEntryType;
  /** Importance score (1-10) */
  readonly importance: number;
  /** ISO timestamp */
  readonly timestamp: string;
  /** Semantic tags */
  readonly tags: readonly string[];
}

/**
 * Filter options for semantic search
 */
export interface VectorFilter {
  /** Minimum cycle number */
  readonly minCycle?: number;
  /** Maximum cycle number */
  readonly maxCycle?: number;
  /** Filter by roles */
  readonly roles?: readonly string[];
  /** Filter by entry types */
  readonly types?: readonly StreamEntryType[];
  /** Minimum importance threshold */
  readonly minImportance?: number;
  /** Filter by tags (any match) */
  readonly tags?: readonly string[];
}

/**
 * Options for recallSemantic()
 */
export interface SemanticSearchOptions {
  /** Maximum results to return (default: 10) */
  readonly k?: number;
  /** Minimum similarity score 0-1 (default: 0.3) */
  readonly minScore?: number;
  /** Filter by metadata */
  readonly filter?: VectorFilter;
  /** Apply recency decay (default: true) */
  readonly useRecencyDecay?: boolean;
  /** Decay factor (default: 0.99, slower decay) */
  readonly recencyDecayFactor?: number;
}

/**
 * Result from semantic search
 */
export interface SemanticSearchResult {
  /** The matching entry */
  readonly entry: StreamEntry;
  /** Raw similarity score (0-1) */
  readonly similarity: number;
  /** Final score after recency/importance weighting */
  readonly score: number;
  /** Score components for debugging */
  readonly components: {
    readonly similarity: number;
    readonly recency: number;
    readonly importance: number;
  };
}

/**
 * Stored vector entry for JSON persistence
 */
interface StoredVector {
  /** Entry ID */
  readonly id: string;
  /** Embedding vector */
  readonly vector: readonly number[];
  /** Metadata for filtering */
  readonly metadata: VectorMetadata;
}

/**
 * Vector index state for JSON persistence
 */
interface VectorIndexState {
  /** Schema version */
  readonly version: 1;
  /** Provider name (embeddings from different providers aren't comparable) */
  readonly provider: string;
  /** Embedding dimensions */
  readonly dimensions: number;
  /** Last modified timestamp */
  lastModified: string;
  /** Total entry count */
  entryCount: number;
  /** All vectors */
  vectors: Record<string, StoredVector>;
}

// ─── Semantic Memory Stream ──────────────────────────────────────────────────

/**
 * Memory stream with semantic search capabilities.
 *
 * Wraps MemoryStream and adds:
 * - Auto-embedding on memoryLog()
 * - recallSemantic() for similarity-based retrieval
 * - Vector index persistence (JSON file)
 *
 * @example
 * ```ts
 * const provider = await createLocalEmbeddingProvider();
 * const stream = new SemanticMemoryStream(
 *   '/path/to/stream.jsonl',
 *   provider,
 *   '/path/to/agents'
 * );
 *
 * // Log with auto-embedding
 * await stream.memoryLog({
 *   cycle: 219,
 *   role: 'frontier',
 *   action: 'Implemented Phase 3 semantic search',
 *   content: 'Added recallSemantic() with local embeddings...',
 *   importance: 8,
 * });
 *
 * // Semantic search
 * const results = await stream.recallSemantic('cognitive memory architecture');
 * ```
 */
export class SemanticMemoryStream {
  private readonly stream: MemoryStream;
  private readonly provider: EmbeddingProvider;
  private readonly indexPath: string;
  private state: VectorIndexState;
  private dirty = false;
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  /**
   * Create a SemanticMemoryStream.
   *
   * @param streamPath - Path to the JSONL stream file
   * @param provider - Embedding provider for semantic search
   * @param agentsDir - Path to agents directory (for vector index storage)
   */
  constructor(
    streamPath: string,
    provider: EmbeddingProvider,
    agentsDir: string
  ) {
    this.stream = new MemoryStream(streamPath);
    this.provider = provider;
    this.indexPath = join(agentsDir, 'state', 'vectors.json');
    this.state = this.createEmptyState();
  }

  /**
   * Create empty index state.
   */
  private createEmptyState(): VectorIndexState {
    return {
      version: 1,
      provider: this.provider.name,
      dimensions: this.provider.dimensions,
      lastModified: new Date().toISOString(),
      entryCount: 0,
      vectors: {},
    };
  }

  /**
   * Load vector index from disk.
   */
  load(): void {
    try {
      if (!existsSync(this.indexPath)) {
        this.state = this.createEmptyState();
        return;
      }

      const content = readFileSync(this.indexPath, 'utf-8');
      const parsed = JSON.parse(content) as VectorIndexState;

      // Validate version
      if (parsed.version !== 1) {
        console.warn(`[SemanticMemoryStream] Unknown version ${parsed.version}, rebuilding`);
        this.state = this.createEmptyState();
        return;
      }

      // Validate provider matches
      if (parsed.provider !== this.provider.name) {
        console.warn(
          `[SemanticMemoryStream] Provider mismatch: ${parsed.provider} → ${this.provider.name}, rebuilding`
        );
        this.state = this.createEmptyState();
        return;
      }

      // Validate dimensions
      if (parsed.dimensions !== this.provider.dimensions) {
        console.warn(
          `[SemanticMemoryStream] Dimensions mismatch: ${parsed.dimensions} → ${this.provider.dimensions}, rebuilding`
        );
        this.state = this.createEmptyState();
        return;
      }

      this.state = parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.state = this.createEmptyState();
      } else {
        console.error('[SemanticMemoryStream] Failed to load index:', error);
        this.state = this.createEmptyState();
      }
    }
  }

  /**
   * Save vector index to disk (atomic write).
   */
  async save(): Promise<void> {
    if (!this.dirty) return;

    this.state.lastModified = new Date().toISOString();
    this.state.entryCount = Object.keys(this.state.vectors).length;

    // Ensure directory exists
    const dir = dirname(this.indexPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Atomic write
    const tempPath = `${this.indexPath}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify(this.state, null, 2)}\n`, 'utf-8');

    // Rename for atomicity
    const { rename } = await import('fs/promises');
    await rename(tempPath, this.indexPath);

    this.dirty = false;
  }

  /**
   * Schedule a debounced save (avoids excessive disk writes).
   */
  private scheduleSave(): void {
    if (this.saveDebounceTimer) {
      globalThis.clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = globalThis.setTimeout(() => {
      this.save().catch(console.error);
    }, 1000);
  }

  /**
   * Log a new entry with automatic embedding.
   *
   * @param input - Entry input data
   * @returns The created StreamEntry
   */
  async memoryLog(input: StreamEntryInput): Promise<StreamEntry> {
    // Log to underlying stream
    const entry = this.stream.memoryLog(input);

    // Generate embedding
    const textToEmbed = `${entry.action} ${entry.content}`;
    const vector = await this.provider.embed(textToEmbed);

    // Store vector with metadata
    const storedVector: StoredVector = {
      id: entry.id,
      vector,
      metadata: {
        id: entry.id,
        cycle: entry.cycle,
        role: entry.role,
        type: entry.type,
        importance: entry.importance,
        timestamp: entry.timestamp,
        tags: entry.tags,
      },
    };

    this.state.vectors[entry.id] = storedVector;
    this.dirty = true;

    // Debounced save
    this.scheduleSave();

    return entry;
  }

  /**
   * Search memories by semantic similarity.
   *
   * Uses Generative Agents retrieval formula:
   *   score = recency × importance × relevance
   *
   * @param query - Natural language query
   * @param options - Search options
   * @returns Ranked semantic search results
   */
  async recallSemantic(
    query: string,
    options: SemanticSearchOptions = {}
  ): Promise<SemanticSearchResult[]> {
    const {
      k = 10,
      minScore = 0.3,
      filter,
      useRecencyDecay = true,
      recencyDecayFactor = 0.99,
    } = options;

    // Embed the query
    const queryVector = await this.provider.embed(query);

    // Get current cycle for recency calculation
    const stats = this.stream.getStats();
    const currentCycle = stats.newestCycle ?? 0;

    // Calculate similarity for all vectors
    const candidates: Array<{
      id: string;
      similarity: number;
      metadata: VectorMetadata;
    }> = [];

    for (const stored of Object.values(this.state.vectors)) {
      // Apply filters
      if (filter) {
        if (filter.minCycle && stored.metadata.cycle < filter.minCycle) continue;
        if (filter.maxCycle && stored.metadata.cycle > filter.maxCycle) continue;
        if (filter.roles && !filter.roles.includes(stored.metadata.role)) continue;
        if (filter.types && !filter.types.includes(stored.metadata.type)) continue;
        if (filter.minImportance && stored.metadata.importance < filter.minImportance) continue;
        if (filter.tags && !filter.tags.some((t) => stored.metadata.tags.includes(t))) continue;
      }

      // Calculate cosine similarity
      const similarity = cosineSimilarity(queryVector, stored.vector);

      // Skip low similarity
      if (similarity < minScore) continue;

      candidates.push({
        id: stored.id,
        similarity,
        metadata: stored.metadata,
      });
    }

    // Apply Generative Agents scoring formula
    const scored = candidates.map((c) => {
      let recencyScore = 1.0;
      if (useRecencyDecay && c.metadata.cycle > 0) {
        const cyclesAgo = currentCycle - c.metadata.cycle;
        recencyScore = Math.pow(recencyDecayFactor, cyclesAgo);
      }

      const importanceWeight = c.metadata.importance / 10;

      // Combined score: recency × importance × similarity
      const finalScore = recencyScore * importanceWeight * c.similarity;

      return {
        id: c.id,
        similarity: c.similarity,
        score: finalScore,
        recency: recencyScore,
        importance: importanceWeight,
        metadata: c.metadata,
      };
    });

    // Sort by final score descending
    scored.sort((a, b) => b.score - a.score);

    // Take top-k
    const topK = scored.slice(0, k);

    // Look up full entries
    const allEntries = this.stream.getAllEntries();
    const entryMap = new Map(allEntries.map((e) => [e.id, e]));

    const results: SemanticSearchResult[] = [];
    for (const s of topK) {
      const entry = entryMap.get(s.id);
      if (entry) {
        results.push({
          entry,
          similarity: s.similarity,
          score: s.score,
          components: {
            similarity: s.similarity,
            recency: s.recency,
            importance: s.importance,
          },
        });
      }
    }

    return results;
  }

  /**
   * Rebuild the vector index from the JSONL stream.
   *
   * Useful for:
   * - First-time indexing of existing entries
   * - Reindexing after model change
   * - Recovery from corrupted index
   *
   * @param onProgress - Optional progress callback
   * @returns Number of entries indexed
   */
  async reindex(
    onProgress?: (current: number, total: number) => void
  ): Promise<number> {
    const entries = this.stream.getAllEntries();

    // Clear existing index
    this.state = this.createEmptyState();
    this.dirty = true;

    if (entries.length === 0) {
      await this.save();
      return 0;
    }

    // Index all entries
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry) continue;

      const textToEmbed = `${entry.action} ${entry.content}`;
      const vector = await this.provider.embed(textToEmbed);

      const storedVector: StoredVector = {
        id: entry.id,
        vector,
        metadata: {
          id: entry.id,
          cycle: entry.cycle,
          role: entry.role,
          type: entry.type,
          importance: entry.importance,
          timestamp: entry.timestamp,
          tags: entry.tags,
        },
      };

      this.state.vectors[entry.id] = storedVector;

      if (onProgress) {
        onProgress(i + 1, entries.length);
      }
    }

    await this.save();
    return entries.length;
  }

  /**
   * Get index synchronization status.
   *
   * Checks if all stream entries are indexed.
   */
  getIndexStatus(): {
    streamCount: number;
    indexCount: number;
    inSync: boolean;
    missing: number;
  } {
    const streamCount = this.stream.count();
    const indexCount = Object.keys(this.state.vectors).length;

    return {
      streamCount,
      indexCount,
      inSync: streamCount === indexCount,
      missing: Math.max(0, streamCount - indexCount),
    };
  }

  /**
   * Get semantic memory statistics.
   */
  getSemanticStats(): {
    provider: string;
    dimensions: number;
    indexedEntries: number;
    lastModified: string;
    cacheHitRate?: number;
  } {
    return {
      provider: this.provider.name,
      dimensions: this.provider.dimensions,
      indexedEntries: Object.keys(this.state.vectors).length,
      lastModified: this.state.lastModified,
    };
  }

  // ─── Passthrough Methods ─────────────────────────────────────────────────────

  /**
   * Get underlying MemoryStream for Phase 1/2 methods.
   */
  getStream(): MemoryStream {
    return this.stream;
  }

  /**
   * Get all entries (passthrough).
   */
  getAllEntries(): readonly StreamEntry[] {
    return this.stream.getAllEntries();
  }

  /**
   * Get stream stats (passthrough).
   */
  getStats(): ReturnType<MemoryStream['getStats']> {
    return this.stream.getStats();
  }

  /**
   * Recall by cycle (passthrough).
   */
  recallByCycle(
    startCycle: number,
    endCycle: number,
    options?: Parameters<MemoryStream['recallByCycle']>[2]
  ): StreamEntry[] {
    return this.stream.recallByCycle(startCycle, endCycle, options);
  }

  /**
   * Recall by keyword search (passthrough).
   */
  recallSearch(
    query: string,
    options?: Parameters<MemoryStream['recallSearch']>[1]
  ): ReturnType<MemoryStream['recallSearch']> {
    return this.stream.recallSearch(query, options);
  }

  /**
   * Reload from disk.
   */
  reload(): void {
    this.stream.reload();
    this.load();
  }

  /**
   * Count entries (passthrough).
   */
  count(): number {
    return this.stream.count();
  }

  /**
   * Force save vector index to disk.
   */
  async flush(): Promise<void> {
    if (this.saveDebounceTimer) {
      globalThis.clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
    await this.save();
  }
}

// ─── Factory Function ────────────────────────────────────────────────────────

/**
 * Create and load a SemanticMemoryStream.
 *
 * @param streamPath - Path to JSONL stream file
 * @param provider - Embedding provider
 * @param agentsDir - Path to agents directory
 * @returns Loaded stream ready for use
 */
export function createSemanticMemoryStream(
  streamPath: string,
  provider: EmbeddingProvider,
  agentsDir: string
): SemanticMemoryStream {
  const stream = new SemanticMemoryStream(streamPath, provider, agentsDir);
  stream.load();
  return stream;
}
