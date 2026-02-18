/**
 * SQLite Memory Store
 *
 * Production implementation of MemoryStore using:
 * - better-sqlite3 for synchronous SQLite operations
 * - sqlite-vec for vector similarity search
 *
 * @see docs/frontier/memory-migration-poc-c836.md
 * @see docs/frontier/sqlite-vec-spike-c826.md
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  MemoryStore,
  MemoryEntry,
  MemorySearchResult,
  MemorySearchOptions,
  MemoryStoreOptions,
  MemoryStats,
  EmbeddingProvider,
  MemoryTier,
  MemoryEntryType,
} from './types.js';
import { randomUUID } from 'crypto';

// ==== Database Types ====

/**
 * Database instance type (better-sqlite3).
 * Dynamically imported to handle optional peer dependency.
 */
interface Database {
  exec(sql: string): this;
  prepare<T = unknown>(sql: string): Statement<T>;
  close(): void;
  pragma(pragma: string): unknown;
}

interface Statement<T = unknown> {
  run(...params: unknown[]): RunResult;
  get(...params: unknown[]): T | undefined;
  all(...params: unknown[]): T[];
  pluck(enable?: boolean): this;
}

interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

// ==== Utility Functions (exported for testing) ====

/**
 * Calculate effective score for ranking.
 *
 * @param distance - Cosine distance (0-2, lower = more similar)
 * @param heat - Heat score (0-1)
 * @param isInnate - Whether entry is innate (gets priority boost)
 */
export function calculateEffectiveScore(
  distance: number,
  heat: number,
  isInnate: boolean
): number {
  const similarity = 1 - distance;
  if (isInnate) {
    // Innate gets a fixed boost to ensure priority
    return similarity + 0.5;
  }
  // Learned: similarity weighted by heat
  return similarity * heat;
}

/**
 * Calculate new heat score after reference.
 *
 * heat = base_importance × recency_factor × reference_count^α
 *
 * @param entry - Current entry state
 * @param alpha - Reference count exponent (default: 0.3)
 */
export function calculateHeatFromEntry(entry: MemoryEntry, alpha: number = 0.3): number {
  const base = entry.baseImportance;
  const refs = Math.max(1, entry.referenceCount + 1);
  const refFactor = Math.pow(refs, alpha);

  // Recency: decay based on time since last reference
  let recency = 1.0;
  if (entry.lastReferencedAt) {
    const hoursSinceRef =
      (Date.now() - new Date(entry.lastReferencedAt).getTime()) / (1000 * 60 * 60);
    recency = Math.exp(-0.01 * hoursSinceRef); // Slow decay
  }

  return Math.min(1.0, base * recency * refFactor);
}

/**
 * Determine tier based on heat score.
 */
export function getTierFromHeat(
  heat: number,
  currentTier: MemoryTier,
  thresholds: { hot: number; cold: number }
): MemoryTier {
  if (currentTier === 'innate') return 'innate'; // Never change innate

  if (heat >= thresholds.hot) return 'hot';
  if (heat >= thresholds.cold) return 'warm';
  return 'cold';
}

/**
 * Generate entry ID.
 *
 * - Deterministic for innate (e.g., 'innate-rules')
 * - UUID for learned
 */
export function generateEntryId(
  entry: Pick<MemoryEntry, 'tier' | 'sourceFile'>
): string {
  if (entry.tier === 'innate' && entry.sourceFile) {
    // Deterministic ID for innate content
    const basename = entry.sourceFile.split('/').pop()?.replace(/\.[^.]+$/, '') || 'unknown';
    return `innate-${basename.toLowerCase()}`;
  }
  return randomUUID();
}

// ==== Schema Definition ====

/**
 * SQLite schema for memory storage.
 *
 * Tables:
 * - memory_entries: Core memory data with heat scoring
 * - memory_embeddings: Vector embeddings via sqlite-vec
 */
const SCHEMA_SQL = `
  -- Main memory entries table (extended for innate tier)
  CREATE TABLE IF NOT EXISTS memory_entries (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      source TEXT NOT NULL,
      role TEXT,
      cycle INTEGER,
      heat_score REAL DEFAULT 0.5,
      base_importance REAL DEFAULT 0.5,
      reference_count INTEGER DEFAULT 0,
      last_referenced_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      tier TEXT DEFAULT 'warm' CHECK (tier IN ('innate', 'hot', 'warm', 'cold')),
      source_file TEXT,
      is_protected INTEGER DEFAULT 0,
      tags TEXT
  );

  -- Indexes for efficient querying
  CREATE INDEX IF NOT EXISTS idx_entries_tier ON memory_entries(tier);
  CREATE INDEX IF NOT EXISTS idx_entries_type ON memory_entries(entry_type);
  CREATE INDEX IF NOT EXISTS idx_entries_heat ON memory_entries(heat_score DESC);
  CREATE INDEX IF NOT EXISTS idx_entries_protected ON memory_entries(is_protected);
  CREATE INDEX IF NOT EXISTS idx_entries_role ON memory_entries(role);
  CREATE INDEX IF NOT EXISTS idx_entries_cycle ON memory_entries(cycle);
`;

/**
 * sqlite-vec virtual table for embeddings.
 * Created separately since it requires the extension.
 */
const EMBEDDING_TABLE_SQL = (dimension: number): string => `
  CREATE VIRTUAL TABLE IF NOT EXISTS memory_embeddings USING vec0(
      id TEXT PRIMARY KEY,
      embedding FLOAT[${dimension}]
  );
`;

// ==== SqliteMemoryStore Class ====

/**
 * SQLite-based memory store with vector embeddings.
 *
 * Features:
 * - Innate memory protection (RULES.md, playbooks)
 * - Heat-based retrieval prioritization
 * - Tier management (innate/hot/warm/cold)
 * - Background heat decay
 *
 * @example
 * ```typescript
 * const store = new SqliteMemoryStore({
 *   dbPath: './memory.db',
 *   embeddingDimension: 384,
 * }, embeddingProvider);
 *
 * await store.initialize();
 * const results = await store.search('dispatch rules', { limit: 5 });
 * ```
 */
export class SqliteMemoryStore implements MemoryStore {
  /** Store configuration */
  readonly options: Required<MemoryStoreOptions>;
  /** Embedding provider for semantic search */
  readonly embeddingProvider: EmbeddingProvider;
  /** Database connection */
  private db: Database | null = null;
  /** Decay timer handle (for cleanup) */
  private decayTimer: ReturnType<typeof globalThis.setInterval> | undefined;
  /** Whether store is initialized */
  private initialized = false;

  constructor(options: MemoryStoreOptions, embeddingProvider: EmbeddingProvider) {
    this.embeddingProvider = embeddingProvider;
    this.options = {
      embeddingDimension: 384,
      enableHeatDecay: true,
      heatDecayIntervalMs: 60 * 60 * 1000, // 1 hour
      heatDecayFactor: 0.95,
      coldTierThreshold: 0.1,
      hotTierThreshold: 0.8,
      ...options,
    };
  }

  /**
   * Check if store is initialized.
   */
  get isInitialized(): boolean {
    return this.initialized && this.db !== null;
  }

  /**
   * Initialize the store.
   *
   * - Creates/opens SQLite database
   * - Loads sqlite-vec extension
   * - Creates tables if they don't exist
   * - Starts heat decay background job
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return; // Already initialized
    }

    try {
      // Dynamically import better-sqlite3 and sqlite-vec
      // These are optional peer dependencies - will throw if not installed
      const Database = await import('better-sqlite3' as any).then((m: any) => m.default);
      const sqliteVec = await import('sqlite-vec' as any) as { load: (db: any) => void };

      // Create/open database
      this.db = new Database(this.options.dbPath) as unknown as Database;

      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');

      // Load sqlite-vec extension
      sqliteVec.load(this.db);

      // Create schema
      this.db.exec(SCHEMA_SQL);

      // Create embeddings table with configured dimension
      this.db.exec(EMBEDDING_TABLE_SQL(this.options.embeddingDimension));

      // Start heat decay timer if enabled
      if (this.options.enableHeatDecay) {
        this.startHeatDecayTimer();
      }

      this.initialized = true;
    } catch (error) {
      // Clean up on failure
      if (this.db) {
        try {
          this.db.close();
        } catch {
          // Ignore close errors
        }
        this.db = null;
      }

      // Re-throw with context
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize SqliteMemoryStore: ${message}`);
    }
  }

  /**
   * Close the store and cleanup resources.
   */
  close(): Promise<void> {
    // Stop decay timer
    if (this.decayTimer) {
      globalThis.clearInterval(this.decayTimer);
      this.decayTimer = undefined;
    }

    // Close database connection
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.initialized = false;
    return Promise.resolve();
  }

  /**
   * Ensure store is initialized before operations.
   */
  private ensureInitialized(): Database {
    if (!this.db || !this.initialized) {
      throw new Error('SqliteMemoryStore not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Start the heat decay background timer.
   */
  private startHeatDecayTimer(): void {
    this.decayTimer = globalThis.setInterval(() => {
      // Run decay asynchronously, log errors
      this.decayHeat().catch(err => {
        console.error('[SqliteMemoryStore] Heat decay failed:', err);
      });
    }, this.options.heatDecayIntervalMs);

    // Don't keep process alive just for decay
    if (this.decayTimer.unref) {
      this.decayTimer.unref();
    }
  }

  /**
   * Add or update a memory entry.
   *
   * - Generates embedding from content
   * - Sets timestamps and defaults
   * - Protected entries cannot be overwritten
   */
  async upsert(
    entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MemoryEntry> {
    const db = this.ensureInitialized();
    const now = new Date().toISOString();
    const id = generateEntryId(entry);

    // Check if protected entry exists
    const existing = db.prepare<{ is_protected: number }>(
      'SELECT is_protected FROM memory_entries WHERE id = ?'
    ).get(id);

    if (existing?.is_protected === 1) {
      throw new Error(`Cannot overwrite protected entry: ${id}`);
    }

    // Build full entry
    const fullEntry: MemoryEntry = {
      ...entry,
      id,
      referenceCount: entry.referenceCount ?? 0,
      isProtected: entry.isProtected ?? entry.tier === 'innate',
      createdAt: existing ? (db.prepare<{ created_at: string }>('SELECT created_at FROM memory_entries WHERE id = ?').get(id)?.created_at ?? now) : now,
      updatedAt: now,
    };

    // Generate embedding
    const embedding = await this.embeddingProvider.embed(entry.content);

    // Insert/update entry and embedding in transaction
    const insertEntry = db.prepare(`
      INSERT OR REPLACE INTO memory_entries (
        id, content, entry_type, source, role, cycle,
        heat_score, base_importance, reference_count, last_referenced_at,
        created_at, updated_at, tier, source_file, is_protected, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertEmbed = db.prepare(`
      INSERT OR REPLACE INTO memory_embeddings (id, embedding)
      VALUES (?, ?)
    `);

    insertEntry.run(
      fullEntry.id,
      fullEntry.content,
      fullEntry.entryType,
      fullEntry.source,
      fullEntry.role ?? null,
      fullEntry.cycle ?? null,
      fullEntry.heatScore,
      fullEntry.baseImportance,
      fullEntry.referenceCount,
      fullEntry.lastReferencedAt ?? null,
      fullEntry.createdAt,
      fullEntry.updatedAt,
      fullEntry.tier,
      fullEntry.sourceFile ?? null,
      fullEntry.isProtected ? 1 : 0,
      fullEntry.tags ? JSON.stringify(fullEntry.tags) : null
    );

    insertEmbed.run(fullEntry.id, embedding);

    return fullEntry;
  }

  /**
   * Get an entry by ID.
   */
  get(id: string): Promise<MemoryEntry | null> {
    const db = this.ensureInitialized();

    const row = db.prepare<DbEntry>(`
      SELECT * FROM memory_entries WHERE id = ?
    `).get(id);

    return Promise.resolve(row ? this.rowToEntry(row) : null);
  }

  /**
   * Delete an entry.
   *
   * @returns true if deleted, false if not found or protected
   */
  delete(id: string): Promise<boolean> {
    const db = this.ensureInitialized();

    // Check if protected
    const entry = db.prepare<{ is_protected: number }>(
      'SELECT is_protected FROM memory_entries WHERE id = ?'
    ).get(id);

    if (!entry) return Promise.resolve(false);
    if (entry.is_protected === 1) return Promise.resolve(false);

    // Delete from both tables
    db.prepare('DELETE FROM memory_embeddings WHERE id = ?').run(id);
    const result = db.prepare('DELETE FROM memory_entries WHERE id = ?').run(id);

    return Promise.resolve(result.changes > 0);
  }

  /**
   * Semantic search using embeddings.
   *
   * Retrieval strategy:
   * 1. Always include innate memories first (if includeInnate)
   * 2. Fill remaining slots with warm/hot by heat-weighted similarity
   * 3. Sort by effective score
   */
  async search(query: string, options?: MemorySearchOptions): Promise<MemorySearchResult[]> {
    const db = this.ensureInitialized();
    const opts: Required<MemorySearchOptions> = {
      limit: 10,
      includeInnate: true,
      entryTypes: [],
      roles: [],
      tiers: [],
      minHeatScore: 0,
      tags: [],
      ...options,
    };

    // Generate query embedding
    const queryEmbedding = await this.embeddingProvider.embed(query);
    const results: MemorySearchResult[] = [];

    // Step 1: Get innate memories if requested
    if (opts.includeInnate) {
      const innateRows = db.prepare<SearchRow>(`
        SELECT 
          e.*, v.distance
        FROM memory_embeddings v
        JOIN memory_entries e ON e.id = v.id
        WHERE e.tier = 'innate'
          AND embedding MATCH ?
          AND k = 20
        ORDER BY distance
      `).all(queryEmbedding);

      for (const row of innateRows) {
        const entry = this.rowToEntry(row);
        results.push({
          entry,
          distance: row.distance,
          effectiveScore: calculateEffectiveScore(row.distance, entry.heatScore, true),
        });
      }
    }

    // Step 2: Get learned memories (warm/hot)
    const remaining = opts.limit - results.length;
    if (remaining > 0) {
      // Build WHERE clause for filters
      const conditions: string[] = ["e.tier IN ('hot', 'warm')"];
      const params: unknown[] = [queryEmbedding, remaining * 2]; // Fetch 2x for heat filtering

      if (opts.entryTypes.length > 0) {
        conditions.push(`e.entry_type IN (${opts.entryTypes.map(() => '?').join(',')})`);
        params.push(...opts.entryTypes);
      }
      if (opts.roles.length > 0) {
        conditions.push(`e.role IN (${opts.roles.map(() => '?').join(',')})`);
        params.push(...opts.roles);
      }
      if (opts.minHeatScore > 0) {
        conditions.push('e.heat_score >= ?');
        params.push(opts.minHeatScore);
      }

      const whereClause = conditions.join(' AND ');

      const learnedRows = db.prepare<SearchRow>(`
        SELECT 
          e.*, v.distance
        FROM memory_embeddings v
        JOIN memory_entries e ON e.id = v.id
        WHERE ${whereClause}
          AND embedding MATCH ?
          AND k = ?
        ORDER BY distance
      `).all(...params);

      // Score by heat-weighted similarity
      const learnedResults: MemorySearchResult[] = learnedRows.map(row => {
        const entry = this.rowToEntry(row);
        return {
          entry,
          distance: row.distance,
          effectiveScore: calculateEffectiveScore(row.distance, entry.heatScore, false),
        };
      });

      // Sort by effective score and take top N
      learnedResults.sort((a, b) => b.effectiveScore - a.effectiveScore);
      results.push(...learnedResults.slice(0, remaining));
    }

    // Final sort by effective score
    results.sort((a, b) => b.effectiveScore - a.effectiveScore);
    return results.slice(0, opts.limit);
  }

  /**
   * Record a reference to an entry.
   *
   * - Increments reference_count
   * - Updates last_referenced_at
   * - Recalculates heat_score
   * - May promote tier (cold → warm → hot)
   */
  recordReference(id: string): Promise<void> {
    const db = this.ensureInitialized();
    const now = new Date().toISOString();

    // Get current entry
    const row = db.prepare<DbEntry>(
      'SELECT * FROM memory_entries WHERE id = ?'
    ).get(id);

    if (!row) {
      return Promise.reject(new Error(`Entry not found: ${id}`));
    }

    const entry = this.rowToEntry(row);

    // Skip innate entries (they don't decay)
    if (entry.tier === 'innate') return Promise.resolve();

    // Calculate new heat
    const newHeat = calculateHeatFromEntry({
      ...entry,
      referenceCount: entry.referenceCount + 1,
      lastReferencedAt: now,
    });

    // Determine new tier
    const newTier = getTierFromHeat(newHeat, entry.tier, {
      hot: this.options.hotTierThreshold,
      cold: this.options.coldTierThreshold,
    });

    // Update entry
    db.prepare(`
      UPDATE memory_entries SET
        reference_count = reference_count + 1,
        last_referenced_at = ?,
        heat_score = ?,
        tier = ?,
        updated_at = ?
      WHERE id = ?
    `).run(now, newHeat, newTier, now, id);

    return Promise.resolve();
  }

  /**
   * Get store statistics.
   */
  getStats(): Promise<MemoryStats> {
    const db = this.ensureInitialized();

    // Total entries
    const totalEntries = db.prepare<{ count: number }>(
      'SELECT COUNT(*) as count FROM memory_entries'
    ).get()?.count ?? 0;

    // By tier
    const tierRows = db.prepare<{ tier: MemoryTier; count: number }>(
      'SELECT tier, COUNT(*) as count FROM memory_entries GROUP BY tier'
    ).all();

    const byTier: Record<MemoryTier, number> = { innate: 0, hot: 0, warm: 0, cold: 0 };
    for (const row of tierRows) {
      byTier[row.tier] = row.count;
    }

    // By type
    const typeRows = db.prepare<{ entry_type: MemoryEntryType; count: number }>(
      'SELECT entry_type, COUNT(*) as count FROM memory_entries GROUP BY entry_type'
    ).all();

    const byType: Record<MemoryEntryType, number> = {
      observation: 0, decision: 0, lesson: 0, context: 0,
      rule: 0, playbook: 0, protocol: 0, structure: 0,
    };
    for (const row of typeRows) {
      byType[row.entry_type] = row.count;
    }

    // Protected count
    const protectedCount = db.prepare<{ count: number }>(
      'SELECT COUNT(*) as count FROM memory_entries WHERE is_protected = 1'
    ).get()?.count ?? 0;

    // Average heat score
    const avgHeat = db.prepare<{ avg: number | null }>(
      'SELECT AVG(heat_score) as avg FROM memory_entries WHERE tier != \'innate\''
    ).get()?.avg ?? 0;

    // Database size (approximate via page count)
    const pageCount = db.pragma('page_count') as number;
    const pageSize = db.pragma('page_size') as number;
    const dbSizeBytes = pageCount * pageSize;

    return Promise.resolve({
      totalEntries,
      byTier,
      byType,
      protectedCount,
      averageHeatScore: avgHeat,
      dbSizeBytes,
    });
  }

  /**
   * Run heat decay on all non-innate entries.
   *
   * @returns Number of entries updated
   */
  decayHeat(): Promise<number> {
    const db = this.ensureInitialized();
    const now = new Date().toISOString();

    // Decay heat scores
    const result = db.prepare(`
      UPDATE memory_entries SET
        heat_score = heat_score * ?,
        updated_at = ?
      WHERE tier != 'innate'
    `).run(this.options.heatDecayFactor, now);

    // Demote entries below threshold
    db.prepare(`
      UPDATE memory_entries SET
        tier = 'cold',
        updated_at = ?
      WHERE heat_score < ? AND tier IN ('hot', 'warm')
    `).run(now, this.options.coldTierThreshold);

    // Demote hot to warm if below hot threshold
    db.prepare(`
      UPDATE memory_entries SET
        tier = 'warm',
        updated_at = ?
      WHERE heat_score < ? AND tier = 'hot'
    `).run(now, this.options.hotTierThreshold);

    return Promise.resolve(result.changes);
  }

  /**
   * Archive entries that have decayed below cold threshold.
   *
   * @returns Number of entries archived
   */
  archiveCold(): Promise<number> {
    const db = this.ensureInitialized();
    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE memory_entries SET
        tier = 'cold',
        updated_at = ?
      WHERE heat_score < ? AND tier = 'warm'
    `).run(now, this.options.coldTierThreshold);

    return Promise.resolve(result.changes);
  }

  /**
   * Load/refresh innate memories from source files.
   *
   * @returns Number of entries refreshed
   */
  refreshInnate(): Promise<number> {
    // This will be implemented using InnateLoader
    // For now, return 0 (no-op)
    return Promise.resolve(0);
  }

  /**
   * Convert database row to MemoryEntry.
   */
  private rowToEntry(row: DbEntry): MemoryEntry {
    const entry: MemoryEntry = {
      id: row.id,
      content: row.content,
      entryType: row.entry_type as MemoryEntryType,
      source: row.source as MemoryEntry['source'],
      heatScore: row.heat_score,
      baseImportance: row.base_importance,
      referenceCount: row.reference_count,
      tier: row.tier as MemoryTier,
      isProtected: row.is_protected === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    // Add optional fields only if present
    if (row.role !== null) entry.role = row.role;
    if (row.cycle !== null) entry.cycle = row.cycle;
    if (row.last_referenced_at !== null) entry.lastReferencedAt = row.last_referenced_at;
    if (row.source_file !== null) entry.sourceFile = row.source_file;
    if (row.tags !== null) entry.tags = JSON.parse(row.tags);

    return entry;
  }
}

/**
 * Database row type for memory_entries.
 */
interface DbEntry {
  id: string;
  content: string;
  entry_type: string;
  source: string;
  role: string | null;
  cycle: number | null;
  heat_score: number;
  base_importance: number;
  reference_count: number;
  last_referenced_at: string | null;
  created_at: string;
  updated_at: string;
  tier: string;
  source_file: string | null;
  is_protected: number;
  tags: string | null;
}

/**
 * Search result row type.
 */
interface SearchRow extends DbEntry {
  distance: number;
}

/**
 * Create a memory store with default configuration.
 *
 * @param agentsDir - Path to agents directory (for innate content)
 * @param embeddingProvider - Provider for generating embeddings
 */
export function createMemoryStore(
  agentsDir: string,
  embeddingProvider: EmbeddingProvider
): SqliteMemoryStore {
  const dbPath = `${agentsDir}/memory/memory.db`;
  return new SqliteMemoryStore({ dbPath }, embeddingProvider);
}
