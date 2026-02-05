/**
 * @ada/core — Dispatch Memory Integration
 *
 * Integrates embedding-based semantic memory retrieval into the dispatch cycle.
 * Phase 2 of Issue #17: sophisticated memory retrieval with embeddings.
 *
 * Architecture:
 * - loadContextWithMemory(): Enhanced context loader that indexes the bank
 * - queryRelevantContext(): Query for memories relevant to current task
 * - DispatchMemoryManager: Manages the semantic memory for a dispatch session
 *
 * Usage in dispatch cycle:
 * ```ts
 * // Phase 1: Load context with semantic memory
 * const context = await loadContextWithMemory(rootDir);
 *
 * // Query for relevant context based on role and task
 * const relevant = await context.memory.queryForRole(role.id, "implement plugin system");
 *
 * // Use relevant memories to inform action selection
 * for (const result of relevant) {
 *   console.log(`[${result.entry.kind}] ${result.entry.content} (score: ${result.score})`);
 * }
 * ```
 *
 * @see Issue #17 — feat(core): sophisticated memory retrieval with embeddings
 * @packageDocumentation
 */

import type {
  MemoryEntry,
  SearchResult,
  EmbeddingProvider,
  VectorStore,
} from './embedding.js';
import {
  extractMemoryEntries,
  TfIdfEmbeddingProvider,
  InMemoryVectorStore,
  SemanticMemoryManager,
} from './embedding.js';
import type { DispatchContext } from './dispatch.js';
import { loadContext } from './dispatch.js';
import type { AdaConfig, Role } from './types.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Configuration for dispatch memory integration */
export interface DispatchMemoryConfig {
  /** Maximum results to return from queries (default: 10) */
  readonly maxResults?: number;
  /** Minimum similarity score threshold (default: 0.1) */
  readonly minScore?: number;
  /** Custom embedding provider (default: TfIdfEmbeddingProvider) */
  readonly embeddingProvider?: EmbeddingProvider;
  /** Custom vector store (default: InMemoryVectorStore) */
  readonly vectorStore?: VectorStore;
}

/** Default dispatch memory configuration */
export const DEFAULT_DISPATCH_MEMORY_CONFIG: Required<DispatchMemoryConfig> = {
  maxResults: 10,
  minScore: 0.1,
  embeddingProvider: undefined as unknown as EmbeddingProvider, // Created at runtime
  vectorStore: undefined as unknown as VectorStore, // Created at runtime
};

/** Query context for role-specific memory retrieval */
export interface RoleQueryContext {
  /** The role making the query */
  readonly roleId: string;
  /** The task or action being considered */
  readonly task: string;
  /** Optional filter by memory entry kinds */
  readonly kinds?: readonly MemoryEntry['kind'][];
  /** Optional filter by tags */
  readonly tags?: readonly string[];
}

/** Enhanced search result with role relevance */
export interface RoleSearchResult extends SearchResult {
  /** Whether this memory is from the querying role */
  readonly isOwnRole: boolean;
  /** Boosted relevance score (own role + kind boost) */
  readonly relevanceScore: number;
}

// ─── Dispatch Memory Manager ─────────────────────────────────────────────────

/**
 * Manages semantic memory for a dispatch session.
 *
 * Created during context load, provides query methods tailored for dispatch.
 * Handles memory indexing, role-aware querying, and relevance boosting.
 */
export class DispatchMemoryManager {
  private readonly manager: SemanticMemoryManager;
  private readonly config: Required<DispatchMemoryConfig>;
  private indexed: boolean = false;
  private entries: MemoryEntry[] = [];

  constructor(
    provider: EmbeddingProvider,
    store: VectorStore,
    config: Partial<DispatchMemoryConfig> = {}
  ) {
    this.manager = new SemanticMemoryManager(provider, store);
    this.config = {
      maxResults: config.maxResults ?? DEFAULT_DISPATCH_MEMORY_CONFIG.maxResults,
      minScore: config.minScore ?? DEFAULT_DISPATCH_MEMORY_CONFIG.minScore,
      embeddingProvider: provider,
      vectorStore: store,
    };
  }

  /**
   * Index the memory bank content for semantic search.
   *
   * @param bankContent - Raw markdown content of bank.md
   * @returns Number of entries indexed
   */
  async indexBank(bankContent: string): Promise<number> {
    this.entries = extractMemoryEntries(bankContent);

    if (this.entries.length === 0) {
      this.indexed = true;
      return 0;
    }

    // Build vocabulary for TF-IDF (if using that provider)
    const provider = this.config.embeddingProvider;
    if (provider instanceof TfIdfEmbeddingProvider) {
      provider.buildVocabulary(this.entries.map((e) => e.content));
    }

    const count = await this.manager.indexBank(bankContent);
    this.indexed = true;
    return count;
  }

  /**
   * Query for memories relevant to the current role and task.
   *
   * Applies role-aware relevance boosting:
   * - Own role's memories get a 20% boost
   * - Decisions and lessons get a 10% boost
   * - Blockers get a 15% boost (they're usually important)
   *
   * @param context - Role and task context
   * @returns Ranked search results with role relevance
   */
  async queryForRole(context: RoleQueryContext): Promise<readonly RoleSearchResult[]> {
    if (!this.indexed) {
      throw new Error('Memory bank not indexed. Call indexBank() first.');
    }

    const { roleId, task, kinds, tags } = context;

    // Build query string combining role context and task
    const queryParts = [task];

    // Add role context to help with relevance
    queryParts.push(`role: ${roleId}`);

    // If filtering by kinds, add them to query for better matching
    if (kinds && kinds.length > 0) {
      queryParts.push(`types: ${kinds.join(', ')}`);
    }

    const queryText = queryParts.join('. ');
    const results = await this.manager.query(
      queryText,
      this.config.maxResults * 2, // Fetch more for filtering
      this.config.minScore
    );

    // Apply filters and boosting
    const boosted: RoleSearchResult[] = results
      .map((result) => {
        const isOwnRole = result.entry.role?.toLowerCase() === roleId.toLowerCase();

        // Calculate relevance boost
        let boost = 1.0;

        // Own role's memories are more relevant
        if (isOwnRole) boost += 0.2;

        // Decisions and lessons are generally important
        if (result.entry.kind === 'decision') boost += 0.1;
        if (result.entry.kind === 'lesson') boost += 0.1;
        if (result.entry.kind === 'blocker') boost += 0.15;

        // Tag matching boost
        if (tags && tags.length > 0) {
          const matchingTags = result.entry.tags.filter((t) =>
            tags.some((filterTag) => t.toLowerCase().includes(filterTag.toLowerCase()))
          );
          if (matchingTags.length > 0) {
            boost += 0.1 * matchingTags.length;
          }
        }

        return {
          ...result,
          isOwnRole,
          relevanceScore: result.score * boost,
        };
      })
      .filter((result) => {
        // Apply kind filter
        if (kinds && kinds.length > 0) {
          if (!kinds.includes(result.entry.kind)) return false;
        }

        // Apply tag filter
        if (tags && tags.length > 0) {
          const hasMatchingTag = result.entry.tags.some((t) =>
            tags.some((filterTag) => t.toLowerCase().includes(filterTag.toLowerCase()))
          );
          if (!hasMatchingTag) return false;
        }

        return true;
      });

    // Sort by boosted relevance score
    boosted.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return boosted.slice(0, this.config.maxResults);
  }

  /**
   * Get all decisions from memory.
   * Useful for roles that need to check architectural context.
   */
  getDecisions(): readonly MemoryEntry[] {
    return this.entries.filter((e) => e.kind === 'decision');
  }

  /**
   * Get all lessons learned from memory.
   * Useful for avoiding past mistakes.
   */
  getLessons(): readonly MemoryEntry[] {
    return this.entries.filter((e) => e.kind === 'lesson');
  }

  /**
   * Get current blockers from memory.
   */
  getBlockers(): readonly MemoryEntry[] {
    return this.entries.filter((e) => e.kind === 'blocker');
  }

  /**
   * Get a specific role's state from memory.
   */
  getRoleState(roleId: string): MemoryEntry | undefined {
    return this.entries.find(
      (e) => e.kind === 'role_state' && e.role?.toLowerCase() === roleId.toLowerCase()
    );
  }

  /**
   * Get in-progress items from memory.
   */
  getInProgress(): readonly MemoryEntry[] {
    return this.entries.filter((e) => e.tags.includes('in-progress'));
  }

  /**
   * Get total number of indexed entries.
   */
  entryCount(): Promise<number> {
    return this.manager.entryCount();
  }

  /**
   * Get all extracted entries (useful for debugging/inspection).
   */
  getAllEntries(): readonly MemoryEntry[] {
    return this.entries;
  }
}

// ─── Enhanced Dispatch Context ───────────────────────────────────────────────

/** Dispatch context enhanced with semantic memory capabilities */
export interface EnhancedDispatchContext extends DispatchContext {
  /** Semantic memory manager for this dispatch session */
  readonly memory: DispatchMemoryManager;
  /** Number of memory entries indexed */
  readonly memoryEntryCount: number;
}

/**
 * Create a dispatch memory manager with default providers.
 *
 * Uses TF-IDF + InMemory for zero-dependency operation.
 * Can be swapped for OpenAI embeddings + Qdrant in production.
 */
export function createDispatchMemoryManager(
  config: Partial<DispatchMemoryConfig> = {}
): DispatchMemoryManager {
  const provider = config.embeddingProvider ?? new TfIdfEmbeddingProvider(256);
  const store = config.vectorStore ?? new InMemoryVectorStore();
  return new DispatchMemoryManager(provider, store, config);
}

/**
 * Load dispatch context with semantic memory pre-indexed.
 *
 * Enhanced version of loadContext() that also:
 * 1. Extracts memory entries from bank.md
 * 2. Builds embeddings for semantic search
 * 3. Returns a manager for role-aware queries
 *
 * @param rootDir - Root directory of the project
 * @param config - Optional ADA configuration overrides
 * @param memoryConfig - Optional memory configuration overrides
 * @returns Enhanced dispatch context with semantic memory, or null if no roles
 */
export async function loadContextWithMemory(
  rootDir: string,
  config: Partial<AdaConfig> = {},
  memoryConfig: Partial<DispatchMemoryConfig> = {}
): Promise<EnhancedDispatchContext | null> {
  const baseContext = await loadContext(rootDir, config);

  if (!baseContext) {
    return null;
  }

  const memoryManager = createDispatchMemoryManager(memoryConfig);
  const entryCount = await memoryManager.indexBank(baseContext.memoryBank);

  return {
    ...baseContext,
    memory: memoryManager,
    memoryEntryCount: entryCount,
  };
}

// ─── Query Helpers ───────────────────────────────────────────────────────────

/**
 * Build a query context for a role starting its dispatch cycle.
 *
 * @param role - The active role
 * @param taskDescription - What the role is about to do
 * @returns Query context for memory retrieval
 */
export function buildRoleQueryContext(
  role: Role,
  taskDescription: string
): RoleQueryContext {
  return {
    roleId: role.id,
    task: taskDescription,
    // Focus on actionable memory types
    kinds: ['decision', 'lesson', 'blocker', 'role_state', 'status'],
  };
}

/**
 * Format search results for display in agent context.
 *
 * Creates a concise summary suitable for injection into LLM context.
 *
 * @param results - Search results from queryForRole
 * @param maxChars - Maximum characters in output (default: 2000)
 * @returns Formatted string for agent context
 */
export function formatRelevantContext(
  results: readonly RoleSearchResult[],
  maxChars: number = 2000
): string {
  if (results.length === 0) {
    return '(no relevant memories found)';
  }

  const lines: string[] = ['## Relevant Memory Context', ''];

  for (const result of results) {
    const { entry, relevanceScore, isOwnRole } = result;
    const roleMarker = isOwnRole ? ' (your role)' : '';
    const line = `- **[${entry.kind}]${roleMarker}** ${entry.content} _(relevance: ${(relevanceScore * 100).toFixed(0)}%)_`;

    // Check if adding this line would exceed limit
    const currentLength = lines.join('\n').length;
    if (currentLength + line.length + 1 > maxChars) {
      lines.push('- _(more results truncated)_');
      break;
    }

    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Query for context relevant to a specific GitHub issue.
 *
 * Useful when a role is working on an issue and needs related memories.
 *
 * @param memory - The dispatch memory manager
 * @param issueTitle - The issue title
 * @param issueBody - The issue body/description
 * @param roleId - The role doing the work
 * @returns Formatted relevant context
 */
export async function queryForIssue(
  memory: DispatchMemoryManager,
  issueTitle: string,
  issueBody: string,
  roleId: string
): Promise<string> {
  const task = `Working on: ${issueTitle}. ${issueBody.slice(0, 500)}`;

  const results = await memory.queryForRole({
    roleId,
    task,
    kinds: ['decision', 'lesson', 'blocker', 'status'],
  });

  return formatRelevantContext(results);
}

/**
 * Query for context when reviewing a PR.
 *
 * @param memory - The dispatch memory manager
 * @param prTitle - The PR title
 * @param prDescription - The PR description
 * @param roleId - The role doing the review
 * @returns Formatted relevant context
 */
export async function queryForPRReview(
  memory: DispatchMemoryManager,
  prTitle: string,
  prDescription: string,
  roleId: string
): Promise<string> {
  const task = `Reviewing PR: ${prTitle}. ${prDescription.slice(0, 500)}`;

  const results = await memory.queryForRole({
    roleId,
    task,
    kinds: ['decision', 'lesson'],
    tags: ['architecture', 'quality'],
  });

  return formatRelevantContext(results);
}
