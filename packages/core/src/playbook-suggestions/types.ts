/**
 * @ada-ai/core — Playbook Suggestion Types
 *
 * Type definitions for pattern-to-playbook automation.
 * Suggestions connect Reflexion patterns to actionable playbook amendments.
 *
 * @see docs/frontier/pattern-to-playbook-automation-spec-c449.md
 * @see Issue #108 (Reflexion Phase 2)
 * @packageDocumentation
 */

// ─── Core Types ─────────────────────────────────────────────────────────────

/**
 * Type of modification to a playbook.
 */
export type SuggestionType = 'add' | 'modify' | 'remove';

/**
 * Status of a playbook suggestion.
 */
export type SuggestionStatus = 'pending' | 'applied' | 'rejected';

/**
 * Confidence tier for suggestion handling.
 * - `weak`: 60-69%, logged but no suggestion generated
 * - `moderate`: 70-79%, suggestion generated, requires review
 * - `high`: 80-89%, suggestion generated, marked high confidence
 * - `auto`: 90%+, eligible for auto-apply (Phase 3)
 */
export type ConfidenceTier = 'weak' | 'moderate' | 'high' | 'auto';

// ─── Suggestion Schema ──────────────────────────────────────────────────────

/**
 * A playbook suggestion generated from a Reflexion pattern.
 * This is the core data structure for pattern-to-playbook automation.
 */
export interface PlaybookSuggestion {
  /** Unique identifier (e.g., "sug-001") */
  readonly id: string;

  /** Source pattern ID from Reflexion */
  readonly patternId: string;

  /** Pattern confidence when suggestion was generated (0.0 - 1.0) */
  readonly patternConfidence: number;

  /** Target playbook path (e.g., "agents/playbooks/qa.md") */
  readonly targetPlaybook: string;

  /** Target section in the playbook (e.g., "## Quality Bar") */
  readonly targetSection: string;

  /** Type of modification */
  readonly suggestionType: SuggestionType;

  /** Actual text to add/change/remove */
  readonly suggestedText: string;

  /** Why this suggestion was generated */
  readonly rationale: string;

  /** Cycle references that contributed to the pattern */
  readonly sourceReflections: readonly string[];

  /** Roles that contributed to the pattern */
  readonly contributingRoles: readonly string[];

  /** ISO timestamp when suggestion was generated */
  readonly generatedAt: string;

  /** Current status of the suggestion */
  status: SuggestionStatus;

  /** ISO timestamp when applied (if status === 'applied') */
  appliedAt?: string;

  /** Role that applied the suggestion */
  appliedBy?: string;

  /** Cycle when applied */
  appliedCycle?: number;

  /** ISO timestamp when rejected (if status === 'rejected') */
  rejectedAt?: string;

  /** Role that rejected the suggestion */
  rejectedBy?: string;

  /** Reason for rejection (required when rejecting) */
  rejectionReason?: string;
}

/**
 * Minimal input for creating a suggestion.
 */
export interface CreateSuggestionInput {
  /** Source pattern ID */
  readonly patternId: string;

  /** Pattern confidence (0.0 - 1.0) */
  readonly patternConfidence: number;

  /** Target playbook path */
  readonly targetPlaybook: string;

  /** Target section */
  readonly targetSection: string;

  /** Type of change */
  readonly suggestionType: SuggestionType;

  /** Text to add/modify/remove */
  readonly suggestedText: string;

  /** Rationale for the suggestion */
  readonly rationale: string;

  /** Source reflection cycles */
  readonly sourceReflections: readonly string[];

  /** Contributing roles */
  readonly contributingRoles: readonly string[];
}

// ─── Configuration ──────────────────────────────────────────────────────────

/**
 * Configuration for suggestion generation.
 */
export interface SuggestionConfig {
  /** Minimum confidence to generate a suggestion (default: 0.70) */
  readonly minConfidence: number;

  /** Minimum confidence to mark as high confidence (default: 0.80) */
  readonly highConfidenceThreshold: number;

  /** Minimum confidence for auto-apply eligibility (default: 0.90) */
  readonly autoApplyThreshold: number;

  /** Maximum character length for suggested text (default: 500) */
  readonly maxSuggestedTextLength: number;

  /** Allowed target directories for suggestions */
  readonly allowedTargetDirs: readonly string[];

  /** Whether to allow remove suggestions at < 90% confidence */
  readonly allowRemoveAtLowConfidence: boolean;
}

/**
 * Default suggestion configuration.
 * Conservative settings tuned for dogfooding.
 */
export const DEFAULT_SUGGESTION_CONFIG: SuggestionConfig = {
  minConfidence: 0.7,
  highConfidenceThreshold: 0.8,
  autoApplyThreshold: 0.9,
  maxSuggestedTextLength: 500,
  allowedTargetDirs: ['agents/playbooks/', 'agents/rules/'],
  allowRemoveAtLowConfidence: false,
} as const;

// ─── Store Types ────────────────────────────────────────────────────────────

/**
 * Options for listing suggestions.
 */
export interface ListSuggestionsOptions {
  /** Filter by status */
  readonly status?: SuggestionStatus;

  /** Filter by target playbook */
  readonly targetPlaybook?: string;

  /** Filter by minimum confidence */
  readonly minConfidence?: number;

  /** Maximum number of results */
  readonly limit?: number;

  /** Sort order */
  readonly sortBy?: 'confidence' | 'generatedAt' | 'targetPlaybook';

  /** Sort direction */
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Summary statistics for suggestions.
 */
export interface SuggestionStats {
  /** Total suggestions across all statuses */
  readonly total: number;

  /** Count by status */
  readonly byStatus: {
    readonly pending: number;
    readonly applied: number;
    readonly rejected: number;
  };

  /** Average confidence of suggestions */
  readonly averageConfidence: number;

  /** Acceptance rate (applied / (applied + rejected)) */
  readonly acceptanceRate: number;

  /** Count by target playbook */
  readonly byPlaybook: Record<string, number>;

  /** Count by contributing role */
  readonly byRole: Record<string, number>;
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validation result for a suggestion.
 */
export interface ValidationResult {
  /** Whether the suggestion is valid */
  readonly valid: boolean;

  /** Validation errors if invalid */
  readonly errors: readonly string[];

  /** Validation warnings (non-blocking) */
  readonly warnings: readonly string[];
}

/**
 * Result of applying a suggestion.
 */
export interface ApplyResult {
  /** Whether the apply succeeded */
  readonly success: boolean;

  /** Error message if failed */
  readonly error?: string;

  /** The updated suggestion */
  readonly suggestion: PlaybookSuggestion;

  /** Diff of the change (if successful) */
  readonly diff?: string;
}

/**
 * Result of rejecting a suggestion.
 */
export interface RejectResult {
  /** Whether the reject succeeded */
  readonly success: boolean;

  /** Error message if failed */
  readonly error?: string;

  /** The updated suggestion */
  readonly suggestion: PlaybookSuggestion;
}
