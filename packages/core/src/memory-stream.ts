/**
 * @ada/core — Memory Stream (Cognitive Memory Phase 1)
 *
 * JSONL-based memory stream for structured agent memory.
 * Implements Phase 1 of the Cognitive Memory Architecture (Issue #95).
 *
 * Architecture:
 * - StreamEntry: structured cycle records with importance scoring
 * - MemoryStream: JSONL persistence with filtering and retrieval
 * - Recall functions: recallSearch(), recallByCycle()
 * - Scoring: Generative Agents formula (recency × importance × relevance)
 *
 * Design decisions:
 * - JSONL for git-friendliness and append-only semantics (ADR-001)
 * - Agent-controlled retrieval, not automatic RAG (ADR-002)
 * - Importance scoring at creation AND retrieval (ADR-003)
 * - camelCase naming per TypeScript conventions (Design review)
 *
 * @see docs/design/cognitive-memory-architecture.md
 * @see docs/design/cognitive-memory-api-review.md
 * @see Issue #95 — Cognitive Memory Architecture
 * @packageDocumentation
 */

import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Categories of stream entries
 */
export type StreamEntryType = 'action' | 'observation' | 'reflection' | 'decision';

/**
 * Role identifiers (mirrors types.ts but allows any string)
 */
export type StreamRoleId = string;

/**
 * A structured entry in the memory stream (JSONL format)
 *
 * Combines Generative Agents (importance, reflection) with
 * MemGPT (structured metadata, agent-controlled retrieval).
 */
export interface StreamEntry {
  /** Unique identifier (UUID) */
  readonly id: string;

  /** Dispatch cycle number when this entry was created */
  readonly cycle: number;

  /** ISO timestamp of creation */
  readonly timestamp: string;

  /** Which role created this entry */
  readonly role: StreamRoleId;

  /** Brief description of the action/event */
  readonly action: string;

  /** Detailed content */
  readonly content: string;

  /** Importance score (1-10, assigned by agent at creation) */
  readonly importance: number;

  /** Entry type */
  readonly type: StreamEntryType;

  /** Semantic tags for filtering */
  readonly tags: readonly string[];

  /** Referenced issue numbers */
  readonly issueRefs: readonly number[];

  /** Referenced PR numbers */
  readonly prRefs: readonly number[];

  /** Estimated token count for retrieval budgeting */
  readonly tokenEstimate: number;
}

/**
 * Input for creating a new stream entry (subset of StreamEntry)
 */
export interface StreamEntryInput {
  /** Dispatch cycle number */
  cycle: number;

  /** Which role is logging this */
  role: StreamRoleId;

  /** Brief action description */
  action: string;

  /** Detailed content */
  content: string;

  /** Importance score (1-10) */
  importance: number;

  /** Entry type (default: 'action') */
  type?: StreamEntryType;

  /** Semantic tags */
  tags?: string[];

  /** Referenced issue numbers */
  issueRefs?: number[];

  /** Referenced PR numbers */
  prRefs?: number[];
}

/**
 * Options for recallSearch()
 */
export interface RecallSearchOptions {
  /** Filter by role */
  role?: StreamRoleId;

  /** Filter by issue reference */
  issue?: number;

  /** Minimum importance threshold (1-10) */
  minImportance?: number;

  /** Maximum results to return (default: 5) */
  limit?: number;

  /** Cycle range filter [start, end] */
  cycleRange?: [number, number];

  /** Entry type filter */
  type?: StreamEntryType;
}

/**
 * Options for recallByCycle()
 */
export interface RecallFilterOptions {
  /** Filter by role */
  role?: StreamRoleId;

  /** Minimum importance threshold (1-10) */
  minImportance?: number;

  /** Entry type filter */
  type?: StreamEntryType;
}

/**
 * Search result with scoring
 */
export interface StreamSearchResult {
  /** The matching entry */
  readonly entry: StreamEntry;

  /** Combined score (recency × importance × relevance) */
  readonly score: number;

  /** Individual score components for debugging */
  readonly components: {
    readonly recency: number;
    readonly importance: number;
    readonly relevance: number;
  };
}

/**
 * Memory stream statistics
 */
export interface StreamStats {
  /** Total number of entries */
  readonly entryCount: number;

  /** Oldest cycle number (or null if empty) */
  readonly oldestCycle: number | null;

  /** Newest cycle number (or null if empty) */
  readonly newestCycle: number | null;

  /** Total estimated tokens across all entries */
  readonly totalTokens: number;

  /** Entries by role */
  readonly byRole: Record<string, number>;

  /** Entries by type */
  readonly byType: Record<StreamEntryType, number>;

  /** Last entry timestamp (or null if empty) */
  readonly lastTimestamp: string | null;
}

// ─── Token Estimation ────────────────────────────────────────────────────────

/**
 * Estimate tokens for text using cl100k_base approximation.
 *
 * Rule of thumb: ~4 characters per token for English text.
 * More accurate for production: use tiktoken library.
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // ~4 chars per token for English, slightly more for code/special chars
  return Math.ceil(text.length / 3.5);
}

// ─── UUID Generation ─────────────────────────────────────────────────────────

/**
 * Generate a simple UUID v4
 * (Avoids external dependency for this prototype)
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Scoring Algorithm ───────────────────────────────────────────────────────

/**
 * Scoring weights (Generative Agents formula)
 */
const SCORING_WEIGHTS = {
  alpha: 1.0, // Recency weight
  beta: 1.0, // Importance weight
  gamma: 1.0, // Relevance weight
  lambda: 0.995, // Decay rate (~30% weight at 100 cycles ago)
} as const;

/**
 * Calculate recency score with exponential decay.
 *
 * Score = exp(-λ × cyclesAgo)
 * At 0 cycles ago: 1.0
 * At 100 cycles ago: ~0.30
 *
 * @param entryCycle - Cycle when entry was created
 * @param currentCycle - Current cycle number
 * @returns Recency score (0 to 1)
 */
export function calculateRecencyScore(
  entryCycle: number,
  currentCycle: number
): number {
  const cyclesAgo = Math.max(0, currentCycle - entryCycle);
  return Math.exp(-SCORING_WEIGHTS.lambda * cyclesAgo * 0.01);
}

/**
 * Normalize importance to 0-1 scale.
 *
 * @param importance - Raw importance (1-10)
 * @returns Normalized importance (0 to 1)
 */
export function normalizeImportance(importance: number): number {
  return Math.max(0, Math.min(10, importance)) / 10;
}

/**
 * Calculate simple text relevance using keyword matching.
 *
 * Phase 1: Bag-of-words overlap
 * Phase 3: Replace with embedding cosine similarity
 *
 * @param query - Search query
 * @param content - Entry content to match against
 * @returns Relevance score (0 to 1)
 */
export function calculateRelevanceScore(query: string, content: string): number {
  const queryTerms = new Set(
    query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );

  if (queryTerms.size === 0) return 0.5; // Neutral if no query terms

  const contentLower = content.toLowerCase();
  let matches = 0;

  for (const term of queryTerms) {
    if (contentLower.includes(term)) {
      matches++;
    }
  }

  // Jaccard-like score with boost for complete matches
  const baseScore = matches / queryTerms.size;

  // Boost if action/title contains query terms
  return Math.min(1, baseScore * 1.2);
}

/**
 * Calculate combined retrieval score (Generative Agents formula).
 *
 * score = α·recency + β·importance + γ·relevance
 *
 * @param entry - Stream entry
 * @param query - Search query
 * @param currentCycle - Current cycle for recency calculation
 * @returns Score object with total and components
 */
export function calculateRetrievalScore(
  entry: StreamEntry,
  query: string,
  currentCycle: number
): { score: number; components: { recency: number; importance: number; relevance: number } } {
  const recency = calculateRecencyScore(entry.cycle, currentCycle);
  const importance = normalizeImportance(entry.importance);
  const relevance = calculateRelevanceScore(query, `${entry.action} ${entry.content}`);

  const score =
    SCORING_WEIGHTS.alpha * recency +
    SCORING_WEIGHTS.beta * importance +
    SCORING_WEIGHTS.gamma * relevance;

  return {
    score,
    components: { recency, importance, relevance },
  };
}

// ─── Memory Stream Class ─────────────────────────────────────────────────────

/**
 * JSONL-based memory stream for structured agent memory.
 *
 * Implements the Recall Memory tier from Cognitive Memory Architecture.
 *
 * Features:
 * - Append-only JSONL storage (git-friendly)
 * - Importance-weighted retrieval
 * - Cycle-based filtering
 * - Semantic tag filtering
 *
 * @example
 * ```ts
 * const stream = new MemoryStream('/path/to/stream.jsonl');
 *
 * // Log an action
 * stream.memoryLog({
 *   cycle: 199,
 *   role: 'frontier',
 *   action: 'MemoryStream prototype',
 *   content: 'Implemented Phase 1 of cognitive memory...',
 *   importance: 8,
 *   tags: ['memory', 'architecture', 'prototype'],
 * });
 *
 * // Search for relevant entries
 * const results = stream.recallSearch('memory architecture', { limit: 5 });
 *
 * // Get entries from specific cycles
 * const recent = stream.recallByCycle(195, 199);
 * ```
 */
export class MemoryStream {
  private readonly filePath: string;
  private entries: StreamEntry[] = [];
  private loaded = false;

  /**
   * Create a new MemoryStream instance.
   *
   * @param filePath - Path to the JSONL file
   */
  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Load entries from the JSONL file.
   * Called automatically on first access.
   */
  private ensureLoaded(): void {
    if (this.loaded) return;

    if (existsSync(this.filePath)) {
      const content = readFileSync(this.filePath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      this.entries = [];
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as StreamEntry;
          this.entries.push(entry);
        } catch {
          // Skip malformed lines
          console.warn(`[MemoryStream] Skipping malformed line: ${line.slice(0, 50)}...`);
        }
      }
    }

    this.loaded = true;
  }

  /**
   * Append an entry to the JSONL file.
   */
  private appendToFile(entry: StreamEntry): void {
    // Ensure directory exists
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const line = `${JSON.stringify(entry)  }\n`;
    appendFileSync(this.filePath, line, 'utf-8');
  }

  /**
   * Log a new entry to the memory stream.
   *
   * This is the primary way to add entries during dispatch.
   *
   * @param input - Entry data (cycle, role, action, content, importance, etc.)
   * @returns The created StreamEntry
   */
  memoryLog(input: StreamEntryInput): StreamEntry {
    this.ensureLoaded();

    const entry: StreamEntry = {
      id: generateId(),
      cycle: input.cycle,
      timestamp: new Date().toISOString(),
      role: input.role,
      action: input.action,
      content: input.content,
      importance: Math.max(1, Math.min(10, input.importance)),
      type: input.type ?? 'action',
      tags: Object.freeze(input.tags ?? []),
      issueRefs: Object.freeze(input.issueRefs ?? []),
      prRefs: Object.freeze(input.prRefs ?? []),
      tokenEstimate: estimateTokens(`${input.action} ${input.content}`),
    };

    this.entries.push(entry);
    this.appendToFile(entry);

    return entry;
  }

  /**
   * Search for relevant entries using semantic scoring.
   *
   * Scoring formula (Generative Agents):
   *   score = α·recency + β·importance + γ·relevance
   *
   * @param query - Natural language search query
   * @param options - Search options (filters, limits)
   * @returns Ranked search results
   */
  recallSearch(query: string, options: RecallSearchOptions = {}): StreamSearchResult[] {
    this.ensureLoaded();

    const {
      role,
      issue,
      minImportance = 0,
      limit = 5,
      cycleRange,
      type,
    } = options;

    // Filter entries
    const filtered = this.entries.filter((e) => {
      if (role && e.role !== role) return false;
      if (issue && !e.issueRefs.includes(issue)) return false;
      if (e.importance < minImportance) return false;
      if (type && e.type !== type) return false;
      if (cycleRange) {
        if (e.cycle < cycleRange[0] || e.cycle > cycleRange[1]) return false;
      }
      return true;
    });

    // Get current cycle for recency scoring
    const currentCycle = this.entries.length > 0
      ? Math.max(...this.entries.map((e) => e.cycle))
      : 0;

    // Score and rank
    const scored: StreamSearchResult[] = filtered.map((entry) => {
      const { score, components } = calculateRetrievalScore(entry, query, currentCycle);
      return { entry, score, components };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit);
  }

  /**
   * Get entries from a specific cycle range.
   *
   * Simpler than recallSearch() — no scoring, just filtering.
   *
   * @param startCycle - First cycle (inclusive)
   * @param endCycle - Last cycle (inclusive)
   * @param options - Additional filters
   * @returns Matching entries (newest first)
   */
  recallByCycle(
    startCycle: number,
    endCycle: number,
    options: RecallFilterOptions = {}
  ): StreamEntry[] {
    this.ensureLoaded();

    const { role, minImportance = 0, type } = options;

    return this.entries
      .filter((e) => {
        if (e.cycle < startCycle || e.cycle > endCycle) return false;
        if (role && e.role !== role) return false;
        if (e.importance < minImportance) return false;
        if (type && e.type !== type) return false;
        return true;
      })
      .sort((a, b) => b.cycle - a.cycle); // Newest first
  }

  /**
   * Get entries by role.
   *
   * @param role - Role ID to filter by
   * @param limit - Maximum entries to return (default: 10)
   * @returns Matching entries (newest first)
   */
  recallByRole(role: StreamRoleId, limit = 10): StreamEntry[] {
    this.ensureLoaded();

    return this.entries
      .filter((e) => e.role === role)
      .sort((a, b) => b.cycle - a.cycle)
      .slice(0, limit);
  }

  /**
   * Get entries referencing a specific issue.
   *
   * @param issueNumber - GitHub issue number
   * @param limit - Maximum entries to return (default: 10)
   * @returns Matching entries (newest first)
   */
  recallByIssue(issueNumber: number, limit = 10): StreamEntry[] {
    this.ensureLoaded();

    return this.entries
      .filter((e) => e.issueRefs.includes(issueNumber))
      .sort((a, b) => b.cycle - a.cycle)
      .slice(0, limit);
  }

  /**
   * Get the most recent entry for a role.
   *
   * @param role - Role ID
   * @returns Most recent entry or null
   */
  getLastRoleEntry(role: StreamRoleId): StreamEntry | null {
    this.ensureLoaded();

    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i];
      if (entry && entry.role === role) {
        return entry;
      }
    }
    return null;
  }

  /**
   * Get stream statistics.
   *
   * @returns Stats object with counts and metrics
   */
  getStats(): StreamStats {
    this.ensureLoaded();

    if (this.entries.length === 0) {
      return {
        entryCount: 0,
        oldestCycle: null,
        newestCycle: null,
        totalTokens: 0,
        byRole: {},
        byType: { action: 0, observation: 0, reflection: 0, decision: 0 },
        lastTimestamp: null,
      };
    }

    const byRole: Record<string, number> = {};
    const byType: Record<StreamEntryType, number> = {
      action: 0,
      observation: 0,
      reflection: 0,
      decision: 0,
    };
    let totalTokens = 0;
    let oldestCycle = Infinity;
    let newestCycle = -Infinity;

    for (const entry of this.entries) {
      byRole[entry.role] = (byRole[entry.role] ?? 0) + 1;
      byType[entry.type]++;
      totalTokens += entry.tokenEstimate;
      oldestCycle = Math.min(oldestCycle, entry.cycle);
      newestCycle = Math.max(newestCycle, entry.cycle);
    }

    const lastEntry = this.entries[this.entries.length - 1];

    return {
      entryCount: this.entries.length,
      oldestCycle: oldestCycle === Infinity ? null : oldestCycle,
      newestCycle: newestCycle === -Infinity ? null : newestCycle,
      totalTokens,
      byRole,
      byType,
      lastTimestamp: lastEntry?.timestamp ?? null,
    };
  }

  /**
   * Get all entries (for debugging/export).
   *
   * @returns All entries in the stream
   */
  getAllEntries(): readonly StreamEntry[] {
    this.ensureLoaded();
    return this.entries;
  }

  /**
   * Get the total number of entries.
   */
  count(): number {
    this.ensureLoaded();
    return this.entries.length;
  }

  /**
   * Reload entries from disk.
   * Useful if the file was modified externally.
   */
  reload(): void {
    this.loaded = false;
    this.entries = [];
    this.ensureLoaded();
  }
}

// ─── Factory Function ────────────────────────────────────────────────────────

/**
 * Create a MemoryStream instance.
 *
 * @param filePath - Path to the JSONL file
 * @returns MemoryStream instance
 */
export function createMemoryStream(filePath: string): MemoryStream {
  return new MemoryStream(filePath);
}

// ─── Convenience Export ──────────────────────────────────────────────────────

/**
 * Default stream file path relative to agents directory.
 */
export const DEFAULT_STREAM_PATH = 'agents/memory/stream.jsonl';
