/**
 * @ada/core — Embedding-based memory retrieval
 *
 * Provides semantic search over agent memory entries using vector embeddings.
 * Phase 1 implementation: in-memory vector store with pluggable embedding providers.
 *
 * Architecture:
 * - MemoryEntry: structured unit of agent memory (decision, lesson, status, etc.)
 * - EmbeddingProvider: interface for generating embeddings (OpenAI, local, TF-IDF)
 * - VectorStore: interface for storing/querying embeddings
 * - InMemoryVectorStore: zero-dependency reference implementation
 * - extractMemoryEntries: parses bank.md into structured MemoryEntry objects
 *
 * @see Issue #17 — feat(core): sophisticated memory retrieval with embeddings
 * @packageDocumentation
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Categories of memory entries */
export type MemoryEntryKind =
  | 'decision'
  | 'lesson'
  | 'status'
  | 'role_state'
  | 'blocker'
  | 'question'
  | 'metric'
  | 'thread';

/** A structured unit of agent memory */
export interface MemoryEntry {
  /** Unique identifier (e.g., "ADR-001", "lesson-3", "status-sprint0") */
  readonly id: string;
  /** What kind of memory this is */
  readonly kind: MemoryEntryKind;
  /** The text content of this memory */
  readonly content: string;
  /** Which role authored this entry (if known) */
  readonly role?: string | undefined;
  /** ISO date when this entry was created/last updated */
  readonly date?: string | undefined;
  /** Additional metadata tags for filtering */
  readonly tags: readonly string[];
}

/** A vector embedding — just a number array */
export type Embedding = readonly number[];

/** A memory entry paired with its embedding */
export interface EmbeddedEntry {
  /** The original memory entry */
  readonly entry: MemoryEntry;
  /** The vector embedding of entry.content */
  readonly embedding: Embedding;
}

/** Result of a similarity search */
export interface SearchResult {
  /** The matching memory entry */
  readonly entry: MemoryEntry;
  /** Cosine similarity score (0 to 1, higher = more similar) */
  readonly score: number;
}

// ─── Embedding Provider Interface ────────────────────────────────────────────

/**
 * Interface for embedding providers.
 *
 * Implementations can wrap OpenAI, local models, or simple heuristics.
 */
export interface EmbeddingProvider {
  /** Human-readable name of the provider */
  readonly name: string;
  /** Dimensionality of the embeddings produced */
  readonly dimensions: number;
  /** Generate an embedding for a single text */
  embed(text: string): Promise<Embedding>;
  /** Generate embeddings for multiple texts (batch) */
  embedBatch(texts: readonly string[]): Promise<readonly Embedding[]>;
}

// ─── Vector Store Interface ──────────────────────────────────────────────────

/**
 * Interface for vector storage and retrieval.
 *
 * Implementations can be in-memory, SQLite-vec, ChromaDB, Qdrant, etc.
 */
export interface VectorStore {
  /** Add entries with their embeddings to the store */
  upsert(entries: readonly EmbeddedEntry[]): Promise<void>;
  /** Find the top-k most similar entries to a query embedding */
  search(query: Embedding, topK: number): Promise<readonly SearchResult[]>;
  /** Remove entries by ID */
  remove(ids: readonly string[]): Promise<void>;
  /** Get all stored entry IDs */
  listIds(): Promise<readonly string[]>;
  /** Get total number of stored entries */
  count(): Promise<number>;
}

// ─── TF-IDF Embedding Provider ──────────────────────────────────────────────

/**
 * Simple TF-IDF-based embedding provider.
 *
 * Zero external dependencies. Uses term frequency with a fixed vocabulary
 * built from the corpus. Not production-grade, but useful for:
 * - Testing and development
 * - Offline operation (no API calls)
 * - Bootstrapping before an LLM embedding provider is configured
 *
 * Dimensions are dynamic based on vocabulary size (capped at maxDimensions).
 */
export class TfIdfEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'tfidf';
  readonly dimensions: number;

  private vocabulary: Map<string, number> = new Map();
  private idf: Map<string, number> = new Map();
  private readonly maxDimensions: number;

  constructor(maxDimensions: number = 256) {
    this.maxDimensions = maxDimensions;
    this.dimensions = maxDimensions;
  }

  /**
   * Build the vocabulary and IDF from a corpus of documents.
   * Must be called before embed/embedBatch.
   */
  buildVocabulary(documents: readonly string[]): void {
    const docFreq = new Map<string, number>();
    const allTerms = new Set<string>();

    for (const doc of documents) {
      const terms = this.tokenize(doc);
      const uniqueTerms = new Set(terms);
      Array.from(uniqueTerms).forEach((term) => {
        allTerms.add(term);
        docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
      });
    }

    // Sort by document frequency (most common first) and take top N
    const sortedTerms = Array.from(allTerms)
      .sort((a, b) => (docFreq.get(b) ?? 0) - (docFreq.get(a) ?? 0))
      .slice(0, this.maxDimensions);

    this.vocabulary = new Map(sortedTerms.map((term, i) => [term, i]));

    // Compute IDF: log(N / (1 + df))
    const n = documents.length;
    this.idf = new Map();
    Array.from(this.vocabulary.entries()).forEach(([term]) => {
      const df = docFreq.get(term) ?? 0;
      this.idf.set(term, Math.log(n / (1 + df)));
    });
  }

  embed(text: string): Promise<Embedding> {
    return Promise.resolve(this.computeTfIdf(text));
  }

  embedBatch(texts: readonly string[]): Promise<readonly Embedding[]> {
    return Promise.resolve(texts.map((t) => this.computeTfIdf(t)));
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1);
  }

  private computeTfIdf(text: string): number[] {
    const terms = this.tokenize(text);
    const termFreq = new Map<string, number>();

    for (const term of terms) {
      termFreq.set(term, (termFreq.get(term) ?? 0) + 1);
    }

    const vector = new Array<number>(this.maxDimensions).fill(0);
    const maxTf = Math.max(...Array.from(termFreq.values()), 1);

    Array.from(termFreq.entries()).forEach(([term, count]) => {
      const idx = this.vocabulary.get(term);
      if (idx !== undefined) {
        const tf = count / maxTf; // Normalized TF
        const idfVal = this.idf.get(term) ?? 0;
        vector[idx] = tf * idfVal;
      }
    });

    // L2 normalize
    return normalizeVector(vector);
  }
}

// ─── In-Memory Vector Store ──────────────────────────────────────────────────

/**
 * In-memory vector store using brute-force cosine similarity.
 *
 * Suitable for small-to-medium memory banks (< 10k entries).
 * For production, swap in SQLite-vec or a proper vector DB.
 */
export class InMemoryVectorStore implements VectorStore {
  private entries: Map<string, EmbeddedEntry> = new Map();

  upsert(entries: readonly EmbeddedEntry[]): Promise<void> {
    for (const entry of entries) {
      this.entries.set(entry.entry.id, entry);
    }
    return Promise.resolve();
  }

  search(
    query: Embedding,
    topK: number
  ): Promise<readonly SearchResult[]> {
    const results: SearchResult[] = Array.from(this.entries.values()).map(
      (embedded) => ({
        entry: embedded.entry,
        score: cosineSimilarity(query, embedded.embedding),
      })
    );

    results.sort((a, b) => b.score - a.score);
    return Promise.resolve(results.slice(0, topK));
  }

  remove(ids: readonly string[]): Promise<void> {
    for (const id of ids) {
      this.entries.delete(id);
    }
    return Promise.resolve();
  }

  listIds(): Promise<readonly string[]> {
    return Promise.resolve(Array.from(this.entries.keys()));
  }

  count(): Promise<number> {
    return Promise.resolve(this.entries.size);
  }
}

// ─── Memory Entry Extraction ─────────────────────────────────────────────────

/**
 * Parse a memory bank markdown file into structured MemoryEntry objects.
 *
 * Extracts:
 * - Architecture decisions (from the ADR table)
 * - Lessons learned (from the numbered list)
 * - Role state entries (from each role's section)
 * - Active threads and blockers
 * - Open questions
 *
 * @param bankContent - Raw markdown content of bank.md
 * @returns Array of structured memory entries
 */
export function extractMemoryEntries(bankContent: string): MemoryEntry[] {
  const entries: MemoryEntry[] = [];

  entries.push(...extractDecisions(bankContent));
  entries.push(...extractLessons(bankContent));
  entries.push(...extractRoleStates(bankContent));
  entries.push(...extractBlockers(bankContent));
  entries.push(...extractQuestions(bankContent));
  entries.push(...extractCompletedItems(bankContent));
  entries.push(...extractInProgressItems(bankContent));

  return entries;
}

/** Extract architecture decisions from the ADR table */
function extractDecisions(content: string): MemoryEntry[] {
  const entries: MemoryEntry[] = [];

  // P1 FIX: Only parse tables within the Architecture Decisions section
  // This prevents mismatching other 4-column tables (e.g., Backlog Priority)
  const adrSection = content.match(
    /## Architecture Decisions\n([\s\S]*?)(?=\n## |$)/
  );

  if (!adrSection?.[1]) return entries;

  // Process line by line within the ADR section only
  const lines = adrSection[1].split('\n');
  const rowRegex =
    /^\|\s*([\w-]+)\s*\|\s*(.+?)\s*\|\s*([\w-]+)\s*\|\s*([\w]+)\s*\|$/;

  for (const line of lines) {
    const match = rowRegex.exec(line.trim());
    if (!match) continue;

    const id = match[1]?.trim();
    const decision = match[2]?.trim();
    const date = match[3]?.trim();
    const author = match[4]?.trim();

    // Skip header/separator rows
    if (!id || id === 'ID' || /^-+$/.test(id)) continue;
    if (!decision || /^-+$/.test(decision)) continue;
    if (!date || /^-+$/.test(date)) continue;

    entries.push({
      id: `decision-${id}`,
      kind: 'decision',
      content: `${id}: ${decision}`,
      role: author,
      date,
      tags: ['architecture', 'decision'],
    });
  }

  return entries;
}

/** Extract lessons learned from the numbered list */
function extractLessons(content: string): MemoryEntry[] {
  const entries: MemoryEntry[] = [];
  const lessonSection = content.match(
    /## Lessons Learned\n([\s\S]*?)(?=\n## |$)/
  );

  if (!lessonSection?.[1]) return entries;

  const lessonRegex = /^\d+\.\s+\*\*(.+?)\*\*\s*—\s*(.+)$/gm;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = lessonRegex.exec(lessonSection[1])) !== null) {
    idx++;
    const title = match[1]?.trim() ?? '';
    const detail = match[2]?.trim() ?? '';
    entries.push({
      id: `lesson-${idx}`,
      kind: 'lesson',
      content: `${title}: ${detail}`,
      tags: ['lesson', 'retrospective'],
    });
  }

  return entries;
}

/** Extract role state entries */
function extractRoleStates(content: string): MemoryEntry[] {
  const entries: MemoryEntry[] = [];
  const roleSection = content.match(
    /## Role State\n([\s\S]*?)(?=\n## |$)/
  );

  if (!roleSection?.[1]) return entries;

  // P1 FIX: Match both formats:
  // 1. Old format: "### ... — The CEO"
  // 2. New format: "### 👔 CEO" (emoji headings)
  // The regex now captures the last word (role name) from either format
  const roleRegex =
    /### (?:[^\n]+? — The |.{0,3})(\w+)\n([\s\S]*?)(?=\n### |$)/g;
  let match: RegExpExecArray | null;

  while ((match = roleRegex.exec(roleSection[1])) !== null) {
    const roleName = match[1]?.trim().toLowerCase() ?? '';
    const body = match[2]?.trim() ?? '';

    if (body.length === 0) continue;

    entries.push({
      id: `role-state-${roleName}`,
      kind: 'role_state',
      content: body,
      role: roleName,
      tags: ['role-state', roleName],
    });
  }

  return entries;
}

/** Extract blockers */
function extractBlockers(content: string): MemoryEntry[] {
  const entries: MemoryEntry[] = [];
  const blockerSection = content.match(
    /### Blockers\n([\s\S]*?)(?=\n### |$)/
  );

  if (!blockerSection?.[1]) return entries;

  // P0 FIX: Filter out common "no blockers" patterns:
  // - "(none)", "None", "None 🎉", "N/A", "-" only, etc.
  const items = blockerSection[1]
    .split('\n')
    .filter((l) => {
      const trimmed = l.trim();
      if (!trimmed.startsWith('-')) return false;

      const text = trimmed.replace(/^-\s*/, '').toLowerCase();
      // Skip empty, "none", "n/a", celebration emoji, or just dashes
      if (text === '' || text === '--') return false;
      if (text.includes('none') || text.includes('(none)')) return false;
      if (text.includes('n/a') || text === '🎉') return false;
      if (/^[-–—]+$/.test(text)) return false;

      return true;
    });

  items.forEach((item, i) => {
    entries.push({
      id: `blocker-${i + 1}`,
      kind: 'blocker',
      content: item.replace(/^-\s*/, '').trim(),
      tags: ['blocker', 'urgent'],
    });
  });

  return entries;
}

/** Extract open questions */
function extractQuestions(content: string): MemoryEntry[] {
  const entries: MemoryEntry[] = [];
  const questionSection = content.match(
    /### Open Questions\n([\s\S]*?)(?=\n---|\n## |$)/
  );

  if (!questionSection?.[1]) return entries;

  const questionRegex = /[-*]\s+(?:~~)?(.+?)(?:~~)?$/gm;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = questionRegex.exec(questionSection[1])) !== null) {
    idx++;
    const text = match[1]?.trim() ?? '';
    if (text.length === 0) continue;

    const resolved = text.includes('RESOLVED');
    entries.push({
      id: `question-${idx}`,
      kind: 'question',
      content: text,
      tags: resolved
        ? ['question', 'resolved']
        : ['question', 'open'],
    });
  }

  return entries;
}

/** Extract completed items from Current Status */
function extractCompletedItems(content: string): MemoryEntry[] {
  const entries: MemoryEntry[] = [];
  const completedSection = content.match(
    /### Completed ✅\n([\s\S]*?)(?=\n### |$)/
  );

  if (!completedSection?.[1]) return entries;

  const itemRegex = /[-*]\s+\*\*(.+?)\*\*/g;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = itemRegex.exec(completedSection[1])) !== null) {
    idx++;
    entries.push({
      id: `completed-${idx}`,
      kind: 'status',
      content: match[1]?.trim() ?? '',
      tags: ['completed', 'status'],
    });
  }

  return entries;
}

/** Extract in-progress items from Current Status */
function extractInProgressItems(content: string): MemoryEntry[] {
  const entries: MemoryEntry[] = [];
  const progressSection = content.match(
    /### In Progress\n([\s\S]*?)(?=\n### |$)/
  );

  if (!progressSection?.[1]) return entries;

  const itemRegex = /[-*]\s+\*\*(.+?)\*\*(?:\s*—\s*(.+))?/g;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = itemRegex.exec(progressSection[1])) !== null) {
    idx++;
    const title = match[1]?.trim() ?? '';
    const desc = match[2]?.trim() ?? '';
    entries.push({
      id: `in-progress-${idx}`,
      kind: 'status',
      content: desc ? `${title}: ${desc}` : title,
      tags: ['in-progress', 'status'],
    });
  }

  return entries;
}

// ─── Vector Math Utilities ───────────────────────────────────────────────────

/**
 * Compute cosine similarity between two vectors.
 *
 * @returns Similarity score between -1 and 1 (higher = more similar)
 */
export function cosineSimilarity(a: Embedding, b: Embedding): number {
  if (a.length !== b.length) {
    throw new Error(
      `Vector dimension mismatch: ${a.length} vs ${b.length}`
    );
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dotProduct += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;

  return dotProduct / denom;
}

/**
 * L2-normalize a vector (make it unit length).
 */
export function normalizeVector(v: number[]): number[] {
  let norm = 0;
  for (const val of v) {
    norm += val * val;
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return v;
  return v.map((val) => val / norm);
}

// ─── Semantic Memory Manager ─────────────────────────────────────────────────

/**
 * High-level manager that ties together extraction, embedding, and retrieval.
 *
 * Usage:
 * ```ts
 * const manager = new SemanticMemoryManager(provider, store);
 * await manager.indexBank(bankContent);
 * const relevant = await manager.query("What LLM architecture did we choose?", 5);
 * ```
 */
export class SemanticMemoryManager {
  constructor(
    private readonly provider: EmbeddingProvider,
    private readonly store: VectorStore
  ) {}

  /**
   * Parse a memory bank and index all entries.
   *
   * @param bankContent - Raw markdown content
   * @returns Number of entries indexed
   */
  async indexBank(bankContent: string): Promise<number> {
    const entries = extractMemoryEntries(bankContent);
    if (entries.length === 0) return 0;

    const texts = entries.map((e) => e.content);
    const embeddings = await this.provider.embedBatch(texts);

    const embedded: EmbeddedEntry[] = entries.map((entry, i) => {
      const emb = embeddings[i];
      if (!emb) {
        throw new Error(`Missing embedding for entry ${i}: ${entry.id}`);
      }
      return { entry, embedding: emb };
    });

    await this.store.upsert(embedded);
    return entries.length;
  }

  /**
   * Query for relevant memories given a natural language question.
   *
   * @param queryText - What the agent wants to know
   * @param topK - Maximum number of results
   * @param minScore - Minimum similarity score threshold (0-1)
   * @returns Ranked search results
   */
  async query(
    queryText: string,
    topK: number = 5,
    minScore: number = 0.1
  ): Promise<readonly SearchResult[]> {
    const queryEmbedding = await this.provider.embed(queryText);
    const results = await this.store.search(queryEmbedding, topK);
    return results.filter((r) => r.score >= minScore);
  }

  /**
   * Get the total number of indexed entries.
   */
  entryCount(): Promise<number> {
    return this.store.count();
  }

  /**
   * Remove entries by ID from the store.
   */
  removeEntries(ids: readonly string[]): Promise<void> {
    return this.store.remove(ids);
  }
}
