/**
 * Model Routing Module
 *
 * Role-based LLM model selection for cost optimization.
 * Implements Research C723 recommendations:
 * - 35% Haiku (routine tasks)
 * - 62% Sonnet (standard/complex tasks)
 * - 3% Opus (critical CEO decisions)
 *
 * Expected savings: 14% vs all-Sonnet baseline
 *
 * @packageDocumentation
 */

// Types
export type {
  ClaudeModel,
  ModelTier,
  RoleId,
  ActionType,
  TaskComplexity,
  ModelInfo,
  ModelRoutingConfig,
  RoleModelOverride,
  FallbackConfig,
  FallbackTrigger,
  FallbackRules,
  ModelSelectionResult,
  DispatchOutput,
  ValidationResult,
  CycleModelMetrics,
} from './types.js';

// Router
export {
  MODEL_INFO,
  AVG_TOKENS_PER_CYCLE,
  DEFAULT_ROUTING_CONFIG,
  DEFAULT_FALLBACK_RULES,
  calculateCycleCost,
  getModelTier,
  isComplexRole,
  inferActionType,
  selectModel,
  getFallbackModel,
  getModelDistribution,
  calculateProjectedCycleCost,
  ModelRouter,
} from './router.js';

// Validation
export {
  MIN_ACTION_LENGTH,
  MAX_ACTION_LENGTH,
  ROLE_ACTION_KEYWORDS,
  validateDispatchOutput,
  isValidPrUrl,
  isValidCommitMessage,
  parseDispatchOutput,
  calculateQualityScore,
} from './validation.js';
