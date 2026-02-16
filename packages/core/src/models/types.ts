/**
 * Model Routing Types
 *
 * Type definitions for role-based LLM model selection.
 * Based on Research C723: LLM Model Selection for Role-Based Routing.
 *
 * @packageDocumentation
 */

/**
 * Supported Anthropic Claude models for dispatch cycles.
 */
export type ClaudeModel =
  | 'claude-3-5-haiku-20241022'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-opus-20240229';

/**
 * Model tier classification for cost/quality tradeoffs.
 */
export type ModelTier = 'fast' | 'balanced' | 'premium';

/**
 * Role identifiers that can have model overrides.
 */
export type RoleId =
  | 'ceo'
  | 'growth'
  | 'research'
  | 'frontier'
  | 'product'
  | 'scrum'
  | 'qa'
  | 'engineering'
  | 'ops'
  | 'design'
  | 'evangelist';

/**
 * Action types that affect model selection.
 * Used for role-specific action routing (e.g., Ops merge vs infra).
 */
export type ActionType =
  // Ops actions
  | 'merge'
  | 'triage'
  | 'infra'
  // CEO actions
  | 'endorse'
  | 'pivot'
  | 'adr'
  | 'launch'
  // Generic
  | 'default';

/**
 * Task complexity levels for model selection.
 */
export type TaskComplexity = 'routine' | 'standard' | 'complex' | 'critical';

/**
 * Model metadata including cost and capabilities.
 */
export interface ModelInfo {
  /** Model identifier */
  readonly model: ClaudeModel;
  /** Model tier classification */
  readonly tier: ModelTier;
  /** Cost per million input tokens (USD) */
  readonly inputCostPerMillion: number;
  /** Cost per million output tokens (USD) */
  readonly outputCostPerMillion: number;
  /** Maximum context window size */
  readonly contextWindow: number;
  /** Task complexities this model handles well */
  readonly suitableFor: readonly TaskComplexity[];
}

/**
 * Role-specific model override configuration.
 */
export interface RoleModelOverride {
  /** Default model for this role */
  readonly default: ClaudeModel;
  /** Action-specific overrides (optional, partial - only specify actions that need overrides) */
  readonly actions?: Readonly<Partial<Record<ActionType, ClaudeModel>>>;
}

/**
 * Complete model routing configuration.
 */
export interface ModelRoutingConfig {
  /** Default model when no override applies */
  readonly default: ClaudeModel;
  /** Role-specific overrides */
  readonly roleOverrides: Readonly<Partial<Record<RoleId, ClaudeModel | RoleModelOverride>>>;
  /** Roles that should never be downgraded to fast tier */
  readonly complexRoles: readonly RoleId[];
  /** Enable fallback escalation on validation failure */
  readonly enableFallback: boolean;
}

/**
 * Fallback configuration for handling model failures.
 */
export interface FallbackConfig {
  /** Model to fall back to */
  readonly fallbackTo: ClaudeModel;
  /** Conditions that trigger fallback */
  readonly triggerOn: readonly FallbackTrigger[];
  /** Maximum retry attempts */
  readonly maxRetries: number;
}

/**
 * Conditions that can trigger a fallback to a higher-tier model.
 */
export type FallbackTrigger =
  | 'validation_failure'
  | 'incomplete_output'
  | 'format_error'
  | 'reasoning_failure'
  | 'critical_task';

/**
 * Fallback rules for each model tier.
 */
export interface FallbackRules {
  /** Haiku fallback configuration */
  readonly haiku: FallbackConfig;
  /** Sonnet fallback configuration */
  readonly sonnet: FallbackConfig;
}

/**
 * Result of model selection including the model and reasoning.
 */
export interface ModelSelectionResult {
  /** Selected model */
  readonly model: ClaudeModel;
  /** Tier of selected model */
  readonly tier: ModelTier;
  /** Why this model was selected */
  readonly reason: string;
  /** Estimated cost per cycle (USD) */
  readonly estimatedCostPerCycle: number;
  /** Whether this is a fallback selection */
  readonly isFallback: boolean;
  /** Original model if this is a fallback */
  readonly originalModel?: ClaudeModel;
}

/**
 * Dispatch output structure for validation.
 */
export interface DispatchOutput {
  /** Action description (required, min 10 chars) */
  readonly action: string;
  /** Role state update */
  readonly roleState: string;
  /** Memory bank updates */
  readonly memoryUpdates: readonly string[];
  /** Commit message if code change */
  readonly commitMessage?: string;
  /** PR URL if PR created */
  readonly prUrl?: string;
}

/**
 * Validation result for dispatch output.
 */
export interface ValidationResult {
  /** Whether validation passed */
  readonly valid: boolean;
  /** Error message if validation failed */
  readonly error?: string;
  /** Suggested fallback trigger if validation failed */
  readonly suggestedTrigger?: FallbackTrigger;
}

/**
 * Model usage metrics for a cycle.
 */
export interface CycleModelMetrics {
  /** Cycle number */
  readonly cycle: number;
  /** Role that executed */
  readonly role: RoleId;
  /** Model used */
  readonly model: ClaudeModel;
  /** Action type if relevant */
  readonly actionType?: ActionType;
  /** Input tokens used */
  readonly inputTokens: number;
  /** Output tokens used */
  readonly outputTokens: number;
  /** Total cost (USD) */
  readonly cost: number;
  /** Whether fallback was used */
  readonly usedFallback: boolean;
  /** Validation result */
  readonly validationPassed: boolean;
  /** Timestamp */
  readonly timestamp: string;
}
