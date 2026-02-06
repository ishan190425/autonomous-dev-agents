/**
 * @ada/core — JSON-based Persistent Vector Store
 *
 * Implements Phase 3.2 of PLAT-002: Memory Lifecycle System.
 * Zero-dependency vector store using JSON files for persistence.
 *
 * Features:
 * - Persists vectors to disk as JSON
 * - Efficient brute-force cosine similarity search
 * - Metadata filtering support
 * - Atomic writes with temp file + rename
 *
 * Suitable for <10K entries. For larger corpora, migrate to SQLite-vec.
 *
 * @see docs/research/embedding-vector-storage-evaluation.md
 * @see Issue #17 — feat(core): sophisticated memory retrieval with embeddings
 * @packageDocumentation
 */

import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type {
  VectorStore,
  EmbeddedEntry,
  SearchResult,
  Embedding,
  MemoryEntry,
  MemoryEntryKind,
} from './embedding.js';
import { cosineSimilarity } from './embedding.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Serialized vector entry for JSON storage.
 */
export interface StoredVectorEntry {
  /** Entry ID */
  readonly id: string;
  /** Entry kind for filtering */
  readonly kind: MemoryEntryKind;
  /** Full text content */
  readonly content: string;
  /** Original role (if known) */
  readonly role?: string;
  /** Creation/update date */
  readonly date?: string;
  /** Tags for filtering */
  readonly tags: readonly string[];
  /** The embedding vector */
  readonly vector: readonly number[];
  /** Memory tier (hot/warm/cold) */
  tier: 'hot' | 'warm' | 'cold';
  /** ISO timestamp when entry was added to store */
  readonly addedAt: string;
  /** ISO timestamp when entry was last accessed via search */
  lastAccessedAt?: string;
}

/**
 * JSON file structure for vector store persistence.
 */
export interface VectorStoreState {
  /** Schema version for migrations */
  readonly version: 1;
  /** Provider name used for embeddings */
  readonly embeddingProvider: string;
  /** Embedding dimensions (for validation) */
  readonly dimensions: number;
  /** ISO timestamp of last modification */
  lastModified: string;
  /** Total entry count (for quick stats) */
  entryCount: number;
  /** All stored entries */
  entries: Record<string, StoredVectorEntry>;
}

/**
 * Filter options for search queries.
 */
export interface VectorSearchFilter {
  /** Filter by entry kind */
  readonly kinds?: readonly MemoryEntryKind[];
  /** Filter by tier */
  readonly tiers?: readonly ('hot' | 'warm' | 'cold')[];
  /** Filter by tags (any match) */
  readonly tags?: readonly string[];
  /** Filter by role */
  readonly role?: string;
}

// ─── JSON Vector Store ───────────────────────────────────────────────────────

/**
 * Persistent vector store using JSON files.
 *
 * Zero external dependencies. Data persists across process restarts.
 * Implements VectorStore interface for compatibility with SemanticMemoryManager.
 *
 * Usage:
 * ```ts
 * const store = new JsonVectorStore('/path/to/agents', 'tfidf', 256);
 * await store.load();
 * await store.upsert(entries);
 * const results = await store.searchWithFilter(queryVec, 5, { tiers: ['hot', 'warm'] });
 * await store.save();
 * ```
 */
export class JsonVectorStore implements VectorStore {
  private state: VectorStoreState;
  private readonly storePath: string;
  private dirty: boolean = false;

  /**
   * Create a JsonVectorStore.
   *
   * @param agentsDir - Path to the agents directory (store lives in state/)
   * @param providerName - Name of the embedding provider (for validation)
   * @param dimensions - Expected embedding dimensions
   */
  constructor(
    agentsDir: string,
    private readonly providerName: string,
    private readonly dimensions: number
  ) {
    this.storePath = join(agentsDir, 'state', 'vectors.json');
    this.state = this.createEmptyState();
  }

  /**
   * Create an empty store state.
   */
  private createEmptyState(): VectorStoreState {
    return {
      version: 1,
      embeddingProvider: this.providerName,
      dimensions: this.dimensions,
      lastModified: new Date().toISOString(),
      entryCount: 0,
      entries: {},
    };
  }

  /**
   * Load store from disk.
   *
   * Creates empty state if file doesn't exist.
   * Validates provider and dimensions match.
   */
  async load(): Promise<void> {
    try {
      const content = await readFile(this.storePath, 'utf-8');
      const parsed = JSON.parse(content) as VectorStoreState;

      // Validate version
      if (parsed.version !== 1) {
        console.warn(
          `[json-vector-store] Unknown version ${parsed.version}, starting fresh`
        );
        this.state = this.createEmptyState();
        this.dirty = true;
        return;
      }

      // Validate provider matches (embeddings from different providers aren't comparable)
      if (parsed.embeddingProvider !== this.providerName) {
        console.warn(
          `[json-vector-store] Provider mismatch: stored=${parsed.embeddingProvider}, current=${this.providerName}. Re-indexing required.`
        );
        this.state = this.createEmptyState();
        this.dirty = true;
        return;
      }

      // Validate dimensions
      if (parsed.dimensions !== this.dimensions) {
        console.warn(
          `[json-vector-store] Dimension mismatch: stored=${parsed.dimensions}, current=${this.dimensions}. Re-indexing required.`
        );
        this.state = this.createEmptyState();
        this.dirty = true;
        return;
      }

      this.state = parsed;
      this.dirty = false;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist — start fresh
        this.state = this.createEmptyState();
        this.dirty = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * Save store to disk.
   *
   * Uses atomic write (temp file + rename) to prevent corruption.
   * Only writes if state has changed.
   */
  async save(): Promise<void> {
    if (!this.dirty) return;

    this.state.lastModified = new Date().toISOString();
    this.state.entryCount = Object.keys(this.state.entries).length;

    // Ensure directory exists
    await mkdir(dirname(this.storePath), { recursive: true });

    // Atomic write: write to temp file, then rename
    const tempPath = `${this.storePath}.tmp`;
    await writeFile(
      tempPath,
      `${JSON.stringify(this.state, null, 2)}\n`,
      'utf-8'
    );
    await rename(tempPath, this.storePath);

    this.dirty = false;
  }

  // ─── VectorStore Interface ─────────────────────────────────────────────────

  /**
   * Add or update entries in the store.
   *
   * New entries default to 'hot' tier.
   */
  upsert(entries: readonly EmbeddedEntry[]): Promise<void> {
    for (const { entry, embedding } of entries) {
      // Validate embedding dimensions
      if (embedding.length !== this.dimensions) {
        return Promise.reject(new Error(
          `Dimension mismatch for entry ${entry.id}: got ${embedding.length}, expected ${this.dimensions}`
        ));
      }

      const existing = this.state.entries[entry.id];

      const storedEntry: StoredVectorEntry = {
        id: entry.id,
        kind: entry.kind,
        content: entry.content,
        tags: entry.tags,
        vector: Array.from(embedding), // Ensure it's a plain array for JSON
        tier: existing?.tier ?? 'hot', // Preserve tier if updating, default to hot
        addedAt: existing?.addedAt ?? new Date().toISOString(),
      };
      // Only set optional properties if they have values
      if (entry.role !== undefined) {
        (storedEntry as { role?: string }).role = entry.role;
      }
      if (entry.date !== undefined) {
        (storedEntry as { date?: string }).date = entry.date;
      }
      if (existing?.lastAccessedAt !== undefined) {
        (storedEntry as { lastAccessedAt?: string }).lastAccessedAt = existing.lastAccessedAt;
      }
      this.state.entries[entry.id] = storedEntry;
    }
    this.dirty = true;
    return Promise.resolve();
  }

  /**
   * Search for similar entries (basic VectorStore interface).
   *
   * Searches all tiers. Use searchWithFilter for tier-specific queries.
   */
  search(query: Embedding, topK: number): Promise<readonly SearchResult[]> {
    return this.searchWithFilter(query, topK);
  }

  /**
   * Search with optional filters (kind, tier, tags, role).
   *
   * @param query - Query embedding
   * @param topK - Maximum results to return
   * @param filter - Optional filter criteria
   * @param trackAccess - Whether to update lastAccessedAt (default: true)
   * @returns Ranked search results
   */
  searchWithFilter(
    query: Embedding,
    topK: number,
    filter?: VectorSearchFilter,
    trackAccess: boolean = true
  ): Promise<readonly SearchResult[]> {
    // Validate query dimensions
    if (query.length !== this.dimensions) {
      return Promise.reject(new Error(
        `Query dimension mismatch: got ${query.length}, expected ${this.dimensions}`
      ));
    }

    const candidates: Array<{ stored: StoredVectorEntry; score: number }> = [];

    for (const stored of Object.values(this.state.entries)) {
      // Apply filters
      if (filter) {
        if (filter.kinds && !filter.kinds.includes(stored.kind)) continue;
        if (filter.tiers && !filter.tiers.includes(stored.tier)) continue;
        if (filter.role && stored.role !== filter.role) continue;
        if (filter.tags && !filter.tags.some((t) => stored.tags.includes(t))) continue;
      }

      const score = cosineSimilarity(query, stored.vector);
      candidates.push({ stored, score });
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Take top K
    const topResults = candidates.slice(0, topK);

    // Track access if enabled
    if (trackAccess) {
      const now = new Date().toISOString();
      for (const { stored } of topResults) {
        stored.lastAccessedAt = now;
      }
      if (topResults.length > 0) {
        this.dirty = true;
      }
    }

    // Convert to SearchResult format
    const results = topResults.map(({ stored, score }) => ({
      entry: {
        id: stored.id,
        kind: stored.kind,
        content: stored.content,
        role: stored.role,
        date: stored.date,
        tags: stored.tags,
      } as MemoryEntry,
      score,
    }));
    return Promise.resolve(results);
  }

  /**
   * Remove entries by ID.
   */
  remove(ids: readonly string[]): Promise<void> {
    for (const id of ids) {
      delete this.state.entries[id];
    }
    if (ids.length > 0) {
      this.dirty = true;
    }
    return Promise.resolve();
  }

  /**
   * List all stored entry IDs.
   */
  listIds(): Promise<readonly string[]> {
    return Promise.resolve(Object.keys(this.state.entries));
  }

  /**
   * Get total entry count.
   */
  count(): Promise<number> {
    return Promise.resolve(Object.keys(this.state.entries).length);
  }

  // ─── Tier Management ───────────────────────────────────────────────────────

  /**
   * Get entry IDs by tier.
   */
  getEntriesByTier(tier: 'hot' | 'warm' | 'cold'): readonly string[] {
    return Object.values(this.state.entries)
      .filter((e) => e.tier === tier)
      .map((e) => e.id);
  }

  /**
   * Move entries to a different tier.
   *
   * @param entryIds - IDs of entries to move
   * @param targetTier - Destination tier
   */
  setTier(entryIds: readonly string[], targetTier: 'hot' | 'warm' | 'cold'): void {
    for (const id of entryIds) {
      const entry = this.state.entries[id];
      if (entry && entry.tier !== targetTier) {
        entry.tier = targetTier;
        this.dirty = true;
      }
    }
  }

  /**
   * Get a specific entry by ID.
   */
  getEntry(id: string): StoredVectorEntry | undefined {
    return this.state.entries[id];
  }

  /**
   * Get statistics about the store.
   */
  getStats(): {
    total: number;
    byTier: Record<'hot' | 'warm' | 'cold', number>;
    byKind: Record<string, number>;
    dimensions: number;
    provider: string;
    lastModified: string;
  } {
    const entries = Object.values(this.state.entries);
    const byTier: Record<'hot' | 'warm' | 'cold', number> = {
      hot: 0,
      warm: 0,
      cold: 0,
    };
    const byKind: Record<string, number> = {};

    for (const entry of entries) {
      byTier[entry.tier]++;
      byKind[entry.kind] = (byKind[entry.kind] ?? 0) + 1;
    }

    return {
      total: entries.length,
      byTier,
      byKind,
      dimensions: this.dimensions,
      provider: this.providerName,
      lastModified: this.state.lastModified,
    };
  }
}

// ─── Factory Function ────────────────────────────────────────────────────────

/**
 * Create and load a JsonVectorStore.
 *
 * @param agentsDir - Path to the agents directory
 * @param providerName - Embedding provider name
 * @param dimensions - Embedding dimensions
 * @returns Loaded store ready for use
 */
export async function createJsonVectorStore(
  agentsDir: string,
  providerName: string,
  dimensions: number
): Promise<JsonVectorStore> {
  const store = new JsonVectorStore(agentsDir, providerName, dimensions);
  await store.load();
  return store;
}
