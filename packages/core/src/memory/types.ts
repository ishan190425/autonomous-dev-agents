/**
 * Memory System Type Definitions
 *
 * Implements the Cognitive Memory Architecture from Issue #113:
 * - Innate vs Learned memory separation
 * - Reference-based heat scoring
 * - Tiered storage (innate/hot/warm/cold)
 *
 * @see docs/frontier/memory-migration-poc-c836.md
 * @see https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents/issues/113
 */

/**
 * Memory entry types categorize the nature of stored information.
 */
export type MemoryEntryType =
  | 'observation' // Dispatch cycle observations
  | 'decision' // Architecture Decision Records (ADRs)
  | 'lesson' // Lessons learned
  | 'context' // Current status, metrics
  | 'rule' // RULES.md content (innate)
  | 'playbook' // Role playbooks (innate)
  | 'protocol' // DISPATCH.md (innate)
  | 'structure'; // roster.json, team structure (innate)

/**
 * Source indicates how the memory entry was created.
 */
export type MemorySource =
  | 'dispatch' // Created during dispatch cycle
  | 'innate' // Loaded from protected files
  | 'user' // User-provided input
  | 'system' // System-generated
  | 'compression'; // Created during memory compression

/**
 * Memory tiers implement cognitive memory hierarchy.
 *
 * @property innate - Protected, immutable, always available (identity)
 * @property hot - Working memory, LRU cache, frequently accessed
 * @property warm - Active storage, SQLite + embeddings, default tier
 * @property cold - Archive, compressed, explicit recall only
 */
export type MemoryTier = 'innate' | 'hot' | 'warm' | 'cold';

/**
 * Core memory entry structure.
 *
 * Extends the markdown-based bank.md with structured metadata
 * for embedding-based retrieval and heat-based prioritization.
 */
export interface MemoryEntry {
  /** Unique identifier (UUID for learned, deterministic for innate) */
  id: string;

  /** The actual memory content */
  content: string;

  /** Categorization of the memory */
  entryType: MemoryEntryType;

  /** How this memory was created */
  source: MemorySource;

  /** Associated role (for role-specific context) */
  role?: string;

  /** Dispatch cycle when created/updated */
  cycle?: number;

  /**
   * Heat score (0.0 - 1.0)
   *
   * Calculated as: base_importance × recency_factor × reference_count^α
   *
   * - > 0.8: Hot (working memory)
   * - 0.4 - 0.8: Warm (active retrieval)
   * - < 0.4: Cold (archive)
   */
  heatScore: number;

  /** Base importance (0.0 - 1.0), set at creation */
  baseImportance: number;

  /** Number of times this entry has been retrieved */
  referenceCount: number;

  /** Last time this entry was retrieved */
  lastReferencedAt?: string;

  /** Current storage tier */
  tier: MemoryTier;

  /** Source file path for innate content */
  sourceFile?: string;

  /** Whether this entry is protected from modification */
  isProtected: boolean;

  /** ISO timestamp of creation */
  createdAt: string;

  /** ISO timestamp of last update */
  updatedAt: string;

  /** Optional tags for filtering */
  tags?: string[];
}

/**
 * Result from memory search operations.
 */
export interface MemorySearchResult {
  /** The memory entry */
  entry: MemoryEntry;

  /** Cosine distance from query (lower = more similar) */
  distance: number;

  /**
   * Effective score combining similarity and heat.
   *
   * For innate: (1 - distance) + 0.5 (priority boost)
   * For learned: (1 - distance) × heat_score
   */
  effectiveScore: number;
}

/**
 * Options for memory search operations.
 */
export interface MemorySearchOptions {
  /** Maximum number of results to return */
  limit?: number;

  /** Include innate memories in results */
  includeInnate?: boolean;

  /** Filter by entry types */
  entryTypes?: MemoryEntryType[];

  /** Filter by roles */
  roles?: string[];

  /** Filter by tiers */
  tiers?: MemoryTier[];

  /** Minimum heat score threshold */
  minHeatScore?: number;

  /** Filter by tags */
  tags?: string[];
}

/**
 * Options for memory store initialization.
 */
export interface MemoryStoreOptions {
  /** Path to SQLite database file */
  dbPath: string;

  /** Embedding dimension (default: 384 for all-MiniLM-L6-v2) */
  embeddingDimension?: number;

  /** Enable heat decay background job */
  enableHeatDecay?: boolean;

  /** Heat decay interval in milliseconds (default: 1 hour) */
  heatDecayIntervalMs?: number;

  /** Heat decay factor per interval (default: 0.95) */
  heatDecayFactor?: number;

  /** Cold tier threshold (default: 0.1) */
  coldTierThreshold?: number;

  /** Hot tier threshold (default: 0.8) */
  hotTierThreshold?: number;
}

/**
 * Statistics about memory store state.
 */
export interface MemoryStats {
  /** Total number of entries */
  totalEntries: number;

  /** Entries by tier */
  byTier: Record<MemoryTier, number>;

  /** Entries by type */
  byType: Record<MemoryEntryType, number>;

  /** Number of protected entries */
  protectedCount: number;

  /** Average heat score */
  averageHeatScore: number;

  /** Database size in bytes */
  dbSizeBytes: number;
}

/**
 * Interface for embedding providers.
 *
 * Abstracts the embedding generation to support different backends:
 * - Local: sentence-transformers, ONNX
 * - Remote: OpenAI, Anthropic, Cohere
 */
export interface EmbeddingProvider {
  /** Provider name for logging */
  readonly name: string;

  /** Embedding dimension */
  readonly dimension: number;

  /** Generate embedding for a single text */
  embed(text: string): Promise<Float32Array>;

  /** Batch embed multiple texts (more efficient) */
  embedBatch(texts: string[]): Promise<Float32Array[]>;
}

/**
 * Configuration for innate memory loading.
 */
export interface InnateLoaderConfig {
  /** Path to agents directory */
  agentsDir: string;

  /** Files to load as innate (relative to agentsDir) */
  innateFiles: InnateFileConfig[];

  /** Whether to recompute embeddings on content change */
  refreshOnChange?: boolean;
}

/**
 * Configuration for a single innate file.
 */
export interface InnateFileConfig {
  /** Relative path from agentsDir */
  path: string;

  /** Entry type for this file */
  entryType: MemoryEntryType;

  /** Base importance (default: 1.0 for innate) */
  baseImportance?: number;
}

/**
 * Memory store interface.
 *
 * Implemented by SqliteMemoryStore and potentially other backends.
 */
export interface MemoryStore {
  /** Initialize the store (create tables, load innate) */
  initialize(): Promise<void>;

  /** Close the store and cleanup resources */
  close(): Promise<void>;

  /** Add or update a memory entry */
  upsert(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<MemoryEntry>;

  /** Get an entry by ID */
  get(id: string): Promise<MemoryEntry | null>;

  /** Delete an entry (fails for protected entries) */
  delete(id: string): Promise<boolean>;

  /** Semantic search using embeddings */
  search(query: string, options?: MemorySearchOptions): Promise<MemorySearchResult[]>;

  /** Record a reference to an entry (updates heat) */
  recordReference(id: string): Promise<void>;

  /** Get store statistics */
  getStats(): Promise<MemoryStats>;

  /** Run heat decay on all entries */
  decayHeat(): Promise<number>;

  /** Archive cold entries */
  archiveCold(): Promise<number>;

  /** Load/refresh innate memories from files */
  refreshInnate(): Promise<number>;
}
