/**
 * @ada-ai/core — Playbook Suggestion Store
 *
 * File-based storage for playbook suggestions.
 * Manages pending, applied, and rejected suggestions.
 *
 * Storage layout:
 *   agents/suggestions/
 *   ├── pending/     ← Awaiting review
 *   ├── applied/     ← Applied suggestions (audit trail)
 *   └── rejected/    ← Rejected suggestions (learning data)
 *
 * @see docs/frontier/pattern-to-playbook-automation-spec-c449.md
 * @packageDocumentation
 */

import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import type {
  PlaybookSuggestion,
  SuggestionStatus,
  ListSuggestionsOptions,
  SuggestionStats,
  ValidationResult,
  ApplyResult,
  RejectResult,
  SuggestionConfig,
} from './types.js';
import { DEFAULT_SUGGESTION_CONFIG } from './types.js';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Base directory for suggestions relative to project root */
const SUGGESTIONS_DIR = 'agents/suggestions';

/** Subdirectories by status */
const STATUS_DIRS: Record<SuggestionStatus, string> = {
  pending: 'pending',
  applied: 'applied',
  rejected: 'rejected',
};

// ─── Store Class ────────────────────────────────────────────────────────────

/**
 * File-based store for playbook suggestions.
 *
 * @example
 * ```typescript
 * const store = new SuggestionStore('/path/to/project');
 * await store.init();
 *
 * // Create a suggestion
 * const suggestion = await store.create({
 *   patternId: 'pattern-001',
 *   patternConfidence: 0.82,
 *   targetPlaybook: 'agents/playbooks/qa.md',
 *   targetSection: '## Quality Bar',
 *   suggestionType: 'add',
 *   suggestedText: '- Test implication check required',
 *   rationale: 'Cross-role testing pattern detected',
 *   sourceReflections: ['C431', 'C432'],
 *   contributingRoles: ['qa', 'engineering'],
 * });
 *
 * // List pending suggestions
 * const pending = await store.list({ status: 'pending' });
 *
 * // Apply or reject
 * await store.apply(suggestion.id, 'qa', 639);
 * // or
 * await store.reject(suggestion.id, 'qa', 'Already covered in RULES.md');
 * ```
 */
export class SuggestionStore {
  private readonly projectDir: string;
  private readonly config: SuggestionConfig;
  private idCounter: number = 0;

  constructor(projectDir: string, config: Partial<SuggestionConfig> = {}) {
    this.projectDir = projectDir;
    this.config = { ...DEFAULT_SUGGESTION_CONFIG, ...config };
  }

  // ─── Initialization ─────────────────────────────────────────────────────

  /**
   * Initialize the store (create directories if needed).
   */
  async init(): Promise<void> {
    for (const status of Object.keys(STATUS_DIRS) as SuggestionStatus[]) {
      const dir = this.getStatusDir(status);
      await fs.mkdir(dir, { recursive: true });
    }

    // Load highest existing ID for counter
    await this.loadIdCounter();
  }

  private async loadIdCounter(): Promise<void> {
    const allSuggestions = await this.listAll();
    let maxId = 0;
    for (const s of allSuggestions) {
      const match = s.id.match(/sug-(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    }
    this.idCounter = maxId;
  }

  private generateId(): string {
    this.idCounter++;
    return `sug-${String(this.idCounter).padStart(3, '0')}`;
  }

  private getStatusDir(status: SuggestionStatus): string {
    return join(this.projectDir, SUGGESTIONS_DIR, STATUS_DIRS[status]);
  }

  private getFilePath(id: string, status: SuggestionStatus): string {
    return join(this.getStatusDir(status), `${id}.json`);
  }

  // ─── CRUD Operations ────────────────────────────────────────────────────

  /**
   * Create a new suggestion.
   * Validates and persists to pending directory.
   */
  async create(
    input: Omit<
      PlaybookSuggestion,
      'id' | 'generatedAt' | 'status' | 'appliedAt' | 'rejectedAt'
    >
  ): Promise<PlaybookSuggestion> {
    // Validate input
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Invalid suggestion: ${validation.errors.join(', ')}`);
    }

    const suggestion: PlaybookSuggestion = {
      ...input,
      id: this.generateId(),
      generatedAt: new Date().toISOString(),
      status: 'pending',
    };

    await this.save(suggestion);
    return suggestion;
  }

  /**
   * Get a suggestion by ID.
   * Searches all status directories.
   */
  async get(id: string): Promise<PlaybookSuggestion | null> {
    for (const status of Object.keys(STATUS_DIRS) as SuggestionStatus[]) {
      const path = this.getFilePath(id, status);
      try {
        const content = await fs.readFile(path, 'utf-8');
        return JSON.parse(content) as PlaybookSuggestion;
      } catch {
        // Not found in this directory, continue
      }
    }
    return null;
  }

  /**
   * List suggestions with optional filters.
   */
  async list(options: ListSuggestionsOptions = {}): Promise<PlaybookSuggestion[]> {
    const {
      status,
      targetPlaybook,
      minConfidence,
      limit,
      sortBy = 'generatedAt',
      sortOrder = 'desc',
    } = options;

    let suggestions: PlaybookSuggestion[];

    if (status) {
      suggestions = await this.listByStatus(status);
    } else {
      suggestions = await this.listAll();
    }

    // Apply filters
    if (targetPlaybook) {
      suggestions = suggestions.filter((s) => s.targetPlaybook === targetPlaybook);
    }

    if (minConfidence !== undefined) {
      suggestions = suggestions.filter(
        (s) => s.patternConfidence >= minConfidence
      );
    }

    // Sort
    suggestions.sort((a, b) => {
      let cmp: number;
      switch (sortBy) {
        case 'confidence':
          cmp = a.patternConfidence - b.patternConfidence;
          break;
        case 'targetPlaybook':
          cmp = a.targetPlaybook.localeCompare(b.targetPlaybook);
          break;
        case 'generatedAt':
        default:
          cmp = new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime();
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    // Limit
    if (limit !== undefined && limit > 0) {
      suggestions = suggestions.slice(0, limit);
    }

    return suggestions;
  }

  private async listByStatus(
    status: SuggestionStatus
  ): Promise<PlaybookSuggestion[]> {
    const dir = this.getStatusDir(status);
    const suggestions: PlaybookSuggestion[] = [];

    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(join(dir, file), 'utf-8');
          suggestions.push(JSON.parse(content) as PlaybookSuggestion);
        }
      }
    } catch {
      // Directory doesn't exist or is empty
    }

    return suggestions;
  }

  private async listAll(): Promise<PlaybookSuggestion[]> {
    const all: PlaybookSuggestion[] = [];
    for (const status of Object.keys(STATUS_DIRS) as SuggestionStatus[]) {
      const statusSuggestions = await this.listByStatus(status);
      all.push(...statusSuggestions);
    }
    return all;
  }

  /**
   * Save a suggestion to its status directory.
   */
  private async save(suggestion: PlaybookSuggestion): Promise<void> {
    const path = this.getFilePath(suggestion.id, suggestion.status);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, JSON.stringify(suggestion, null, 2), 'utf-8');
  }

  /**
   * Move a suggestion between status directories.
   */
  private async move(
    suggestion: PlaybookSuggestion,
    fromStatus: SuggestionStatus,
    toStatus: SuggestionStatus
  ): Promise<void> {
    const fromPath = this.getFilePath(suggestion.id, fromStatus);
    const toPath = this.getFilePath(suggestion.id, toStatus);

    // Update status
    suggestion.status = toStatus;

    // Write to new location
    await fs.mkdir(dirname(toPath), { recursive: true });
    await fs.writeFile(toPath, JSON.stringify(suggestion, null, 2), 'utf-8');

    // Remove from old location
    try {
      await fs.unlink(fromPath);
    } catch {
      // Old file may not exist (direct creation to non-pending)
    }
  }

  // ─── Apply / Reject ─────────────────────────────────────────────────────

  /**
   * Apply a suggestion to its target playbook.
   *
   * @param id - Suggestion ID
   * @param appliedBy - Role applying the suggestion
   * @param cycle - Current dispatch cycle
   * @returns ApplyResult with success/failure and diff
   */
  async apply(
    id: string,
    appliedBy: string,
    cycle: number
  ): Promise<ApplyResult> {
    const suggestion = await this.get(id);

    if (!suggestion) {
      return {
        success: false,
        error: `Suggestion ${id} not found`,
        suggestion: {} as PlaybookSuggestion,
      };
    }

    if (suggestion.status !== 'pending') {
      return {
        success: false,
        error: `Suggestion ${id} is not pending (status: ${suggestion.status})`,
        suggestion,
      };
    }

    // Read target playbook
    const playbookPath = join(this.projectDir, suggestion.targetPlaybook);
    let playbookContent: string;

    try {
      playbookContent = await fs.readFile(playbookPath, 'utf-8');
    } catch {
      return {
        success: false,
        error: `Target playbook not found: ${suggestion.targetPlaybook}`,
        suggestion,
      };
    }

    // Find target section
    const sectionIndex = playbookContent.indexOf(suggestion.targetSection);
    if (sectionIndex === -1) {
      return {
        success: false,
        error: `Target section not found: ${suggestion.targetSection}`,
        suggestion,
      };
    }

    // Apply the change based on type
    let newContent: string;
    let diff: string;

    switch (suggestion.suggestionType) {
      case 'add': {
        // Find end of section (next ## or EOF)
        const nextSectionMatch = playbookContent
          .slice(sectionIndex + suggestion.targetSection.length)
          .match(/\n##\s/);
        const insertPos =
          nextSectionMatch && nextSectionMatch.index !== undefined
            ? sectionIndex +
              suggestion.targetSection.length +
              nextSectionMatch.index
            : playbookContent.length;

        // Insert before next section (with newline)
        const insertion = `\n${suggestion.suggestedText}\n`;
        newContent =
          playbookContent.slice(0, insertPos) +
          insertion +
          playbookContent.slice(insertPos);
        diff = `+ ${suggestion.suggestedText}`;
        break;
      }

      case 'modify':
      case 'remove':
        // For modify/remove, we need more complex logic
        // For now, return error - full implementation in Phase 2
        return {
          success: false,
          error: `${suggestion.suggestionType} not yet implemented (Phase 2)`,
          suggestion,
        };

      default:
        return {
          success: false,
          error: `Unknown suggestion type: ${suggestion.suggestionType}`,
          suggestion,
        };
    }

    // Write updated playbook
    await fs.writeFile(playbookPath, newContent, 'utf-8');

    // Update suggestion metadata
    suggestion.appliedAt = new Date().toISOString();
    suggestion.appliedBy = appliedBy;
    suggestion.appliedCycle = cycle;

    // Move to applied directory
    await this.move(suggestion, 'pending', 'applied');

    return {
      success: true,
      suggestion,
      diff,
    };
  }

  /**
   * Reject a suggestion with a reason.
   *
   * @param id - Suggestion ID
   * @param rejectedBy - Role rejecting the suggestion
   * @param reason - Reason for rejection (required)
   * @returns RejectResult with success/failure
   */
  async reject(
    id: string,
    rejectedBy: string,
    reason: string
  ): Promise<RejectResult> {
    if (!reason || reason.trim().length === 0) {
      return {
        success: false,
        error: 'Rejection reason is required',
        suggestion: {} as PlaybookSuggestion,
      };
    }

    const suggestion = await this.get(id);

    if (!suggestion) {
      return {
        success: false,
        error: `Suggestion ${id} not found`,
        suggestion: {} as PlaybookSuggestion,
      };
    }

    if (suggestion.status !== 'pending') {
      return {
        success: false,
        error: `Suggestion ${id} is not pending (status: ${suggestion.status})`,
        suggestion,
      };
    }

    // Update suggestion metadata
    suggestion.rejectedAt = new Date().toISOString();
    suggestion.rejectedBy = rejectedBy;
    suggestion.rejectionReason = reason;

    // Move to rejected directory
    await this.move(suggestion, 'pending', 'rejected');

    return {
      success: true,
      suggestion,
    };
  }

  // ─── Validation ─────────────────────────────────────────────────────────

  /**
   * Validate a suggestion against guardrails.
   */
  validate(
    input: Partial<PlaybookSuggestion>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!input.patternId) errors.push('patternId is required');
    if (!input.targetPlaybook) errors.push('targetPlaybook is required');
    if (!input.targetSection) errors.push('targetSection is required');
    if (!input.suggestedText) errors.push('suggestedText is required');
    if (!input.rationale) errors.push('rationale is required');

    // Confidence check
    if (
      input.patternConfidence !== undefined &&
      input.patternConfidence < this.config.minConfidence
    ) {
      errors.push(
        `Confidence ${input.patternConfidence} below minimum ${this.config.minConfidence}`
      );
    }

    // Target directory check
    if (input.targetPlaybook) {
      const targetPlaybook = input.targetPlaybook;
      const isAllowed = this.config.allowedTargetDirs.some((dir) =>
        targetPlaybook.startsWith(dir)
      );
      if (!isAllowed) {
        errors.push(
          `Target playbook must be in: ${this.config.allowedTargetDirs.join(', ')}`
        );
      }
    }

    // Text length check
    if (
      input.suggestedText &&
      input.suggestedText.length > this.config.maxSuggestedTextLength
    ) {
      errors.push(
        `Suggested text exceeds ${this.config.maxSuggestedTextLength} characters`
      );
    }

    // Remove at low confidence check
    if (
      input.suggestionType === 'remove' &&
      input.patternConfidence !== undefined &&
      input.patternConfidence < this.config.autoApplyThreshold &&
      !this.config.allowRemoveAtLowConfidence
    ) {
      errors.push(
        `Remove suggestions require ${this.config.autoApplyThreshold * 100}%+ confidence`
      );
    }

    // Warnings
    if (
      input.sourceReflections &&
      input.sourceReflections.length < 3
    ) {
      warnings.push('Few source reflections may indicate weak pattern');
    }

    if (
      input.contributingRoles &&
      input.contributingRoles.length < 2
    ) {
      warnings.push('Single-role pattern — consider if truly cross-cutting');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ─── Statistics ─────────────────────────────────────────────────────────

  /**
   * Calculate suggestion statistics.
   */
  async stats(): Promise<SuggestionStats> {
    const all = await this.listAll();

    const byStatus = { pending: 0, applied: 0, rejected: 0 };
    const byPlaybook: Record<string, number> = {};
    const byRole: Record<string, number> = {};
    let totalConfidence = 0;

    for (const s of all) {
      byStatus[s.status]++;
      totalConfidence += s.patternConfidence;

      byPlaybook[s.targetPlaybook] = (byPlaybook[s.targetPlaybook] || 0) + 1;

      for (const role of s.contributingRoles) {
        byRole[role] = (byRole[role] || 0) + 1;
      }
    }

    const decided = byStatus.applied + byStatus.rejected;

    return {
      total: all.length,
      byStatus,
      averageConfidence: all.length > 0 ? totalConfidence / all.length : 0,
      acceptanceRate: decided > 0 ? byStatus.applied / decided : 0,
      byPlaybook,
      byRole,
    };
  }

  // ─── Utilities ──────────────────────────────────────────────────────────

  /**
   * Check if a suggestion with similar content already exists.
   * Prevents duplicate suggestions for the same pattern.
   */
  async isDuplicate(input: {
    targetPlaybook: string;
    targetSection: string;
    suggestedText: string;
  }): Promise<boolean> {
    const pending = await this.listByStatus('pending');

    for (const s of pending) {
      if (
        s.targetPlaybook === input.targetPlaybook &&
        s.targetSection === input.targetSection &&
        this.textSimilarity(s.suggestedText, input.suggestedText) > 0.8
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Simple text similarity using Jaccard on words.
   */
  private textSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));

    const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
    const union = new Set([...wordsA, ...wordsB]);

    return intersection.size / union.size;
  }

  /**
   * Get pending suggestion count (for dispatch status display).
   */
  async pendingCount(): Promise<number> {
    const pending = await this.listByStatus('pending');
    return pending.length;
  }
}
