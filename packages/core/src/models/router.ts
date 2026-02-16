/**
 * Model Router
 *
 * Role-based LLM model selection for dispatch cycles.
 * Implements cost optimization strategy from Research C723.
 *
 * Strategy: 35% Haiku, 62% Sonnet, 3% Opus
 * Target savings: 14% ($0.051 → $0.044/cycle)
 *
 * @packageDocumentation
 */

import type {
  ClaudeModel,
  ModelTier,
  RoleId,
  ActionType,
  ModelInfo,
  ModelRoutingConfig,
  RoleModelOverride,
  FallbackRules,
  FallbackTrigger,
  ModelSelectionResult,
} from './types.js';

/**
 * Model metadata registry.
 */
export const MODEL_INFO: Readonly<Record<ClaudeModel, ModelInfo>> = {
  'claude-3-5-haiku-20241022': {
    model: 'claude-3-5-haiku-20241022',
    tier: 'fast',
    inputCostPerMillion: 0.8,
    outputCostPerMillion: 4.0,
    contextWindow: 200_000,
    suitableFor: ['routine'] as const,
  },
  'claude-3-5-sonnet-20241022': {
    model: 'claude-3-5-sonnet-20241022',
    tier: 'balanced',
    inputCostPerMillion: 3.0,
    outputCostPerMillion: 15.0,
    contextWindow: 200_000,
    suitableFor: ['routine', 'standard', 'complex'] as const,
  },
  'claude-3-opus-20240229': {
    model: 'claude-3-opus-20240229',
    tier: 'premium',
    inputCostPerMillion: 15.0,
    outputCostPerMillion: 75.0,
    contextWindow: 200_000,
    suitableFor: ['routine', 'standard', 'complex', 'critical'] as const,
  },
} as const;

/**
 * Average token usage per cycle (from Research C723 analysis).
 */
export const AVG_TOKENS_PER_CYCLE = {
  input: 5000,
  output: 2000,
  tools: 1000,
} as const;

/**
 * Default routing configuration based on Research C723 recommendations.
 */
export const DEFAULT_ROUTING_CONFIG: ModelRoutingConfig = {
  default: 'claude-3-5-sonnet-20241022',

  roleOverrides: {
    // Routine roles → Haiku (35% of cycles)
    scrum: 'claude-3-5-haiku-20241022',
    evangelist: 'claude-3-5-haiku-20241022',

    // Ops with action-level routing
    ops: {
      default: 'claude-3-5-sonnet-20241022',
      actions: {
        merge: 'claude-3-5-haiku-20241022',
        triage: 'claude-3-5-haiku-20241022',
        infra: 'claude-3-5-sonnet-20241022',
        default: 'claude-3-5-sonnet-20241022',
      },
    },

    // CEO with action-level routing for strategic decisions
    ceo: {
      default: 'claude-3-5-sonnet-20241022',
      actions: {
        endorse: 'claude-3-opus-20240229',
        pivot: 'claude-3-opus-20240229',
        adr: 'claude-3-opus-20240229',
        launch: 'claude-3-opus-20240229',
        default: 'claude-3-5-sonnet-20241022',
      },
    },
  },

  // Roles that should never use Haiku
  complexRoles: ['engineering', 'research', 'frontier', 'design'],

  enableFallback: true,
} as const;

/**
 * Default fallback rules for model failures.
 */
export const DEFAULT_FALLBACK_RULES: FallbackRules = {
  haiku: {
    fallbackTo: 'claude-3-5-sonnet-20241022',
    triggerOn: ['validation_failure', 'incomplete_output', 'format_error'],
    maxRetries: 1,
  },
  sonnet: {
    fallbackTo: 'claude-3-opus-20240229',
    triggerOn: ['reasoning_failure', 'critical_task'],
    maxRetries: 1,
  },
} as const;

/**
 * Calculate estimated cost per cycle for a model.
 */
export function calculateCycleCost(model: ClaudeModel): number {
  const info = MODEL_INFO[model];
  const inputCost = (AVG_TOKENS_PER_CYCLE.input / 1_000_000) * info.inputCostPerMillion;
  const outputCost = (AVG_TOKENS_PER_CYCLE.output / 1_000_000) * info.outputCostPerMillion;
  const toolCost = (AVG_TOKENS_PER_CYCLE.tools / 1_000_000) * info.inputCostPerMillion;
  return inputCost + outputCost + toolCost;
}

/**
 * Get the model tier.
 */
export function getModelTier(model: ClaudeModel): ModelTier {
  return MODEL_INFO[model].tier;
}

/**
 * Check if a role is in the complex roles list.
 */
export function isComplexRole(role: RoleId, config: ModelRoutingConfig = DEFAULT_ROUTING_CONFIG): boolean {
  return config.complexRoles.includes(role);
}

/**
 * Parse action type from action description.
 * Looks for keywords to determine if this is a merge, triage, strategic decision, etc.
 */
export function inferActionType(role: RoleId, actionDescription: string): ActionType {
  const lower = actionDescription.toLowerCase();

  if (role === 'ops') {
    if (lower.includes('merge') || lower.includes('merged')) return 'merge';
    if (lower.includes('triage') || lower.includes('review')) return 'triage';
    if (lower.includes('infra') || lower.includes('ci') || lower.includes('workflow')) return 'infra';
  }

  if (role === 'ceo') {
    if (lower.includes('endorse') || lower.includes('endorsement')) return 'endorse';
    if (lower.includes('pivot') || lower.includes('strategic shift')) return 'pivot';
    if (lower.includes('adr') || lower.includes('architecture decision')) return 'adr';
    if (lower.includes('launch') || lower.includes('go/no-go')) return 'launch';
  }

  return 'default';
}

/**
 * Select the appropriate model for a role and action.
 *
 * @param role - Role executing the dispatch
 * @param actionDescription - Optional action description for action-level routing
 * @param config - Routing configuration (defaults to DEFAULT_ROUTING_CONFIG)
 * @returns Model selection result with reasoning
 */
export function selectModel(
  role: RoleId,
  actionDescription?: string,
  config: ModelRoutingConfig = DEFAULT_ROUTING_CONFIG
): ModelSelectionResult {
  const actionType = actionDescription ? inferActionType(role, actionDescription) : 'default';

  // Check for role-specific override
  const roleOverride = config.roleOverrides[role];

  let model: ClaudeModel;
  let reason: string;

  if (roleOverride === undefined) {
    // No override, use default
    model = config.default;
    reason = `Default model (no role override for ${role})`;
  } else if (typeof roleOverride === 'string') {
    // Simple role → model mapping
    model = roleOverride;
    reason = `Role override: ${role} → ${model}`;
  } else {
    // Role has action-level routing
    const roleConfig = roleOverride as RoleModelOverride;
    if (roleConfig.actions && actionType !== 'default' && roleConfig.actions[actionType]) {
      model = roleConfig.actions[actionType];
      reason = `Action override: ${role}/${actionType} → ${model}`;
    } else {
      model = roleConfig.default;
      reason = `Role default: ${role} → ${model}`;
    }
  }

  // Safety check: complex roles should never use Haiku
  if (isComplexRole(role, config) && model === 'claude-3-5-haiku-20241022') {
    model = config.default;
    reason = `Upgraded from Haiku: ${role} is a complex role`;
  }

  return {
    model,
    tier: getModelTier(model),
    reason,
    estimatedCostPerCycle: calculateCycleCost(model),
    isFallback: false,
  };
}

/**
 * Get the fallback model for a given model when a trigger condition occurs.
 *
 * @param currentModel - The model that failed
 * @param trigger - What caused the failure
 * @param rules - Fallback rules (defaults to DEFAULT_FALLBACK_RULES)
 * @returns Fallback model selection result, or null if no fallback applies
 */
export function getFallbackModel(
  currentModel: ClaudeModel,
  trigger: FallbackTrigger,
  rules: FallbackRules = DEFAULT_FALLBACK_RULES
): ModelSelectionResult | null {
  const tier = getModelTier(currentModel);

  // Haiku → Sonnet fallback
  if (tier === 'fast' && rules.haiku.triggerOn.includes(trigger)) {
    return {
      model: rules.haiku.fallbackTo,
      tier: getModelTier(rules.haiku.fallbackTo),
      reason: `Fallback from Haiku: ${trigger}`,
      estimatedCostPerCycle: calculateCycleCost(rules.haiku.fallbackTo),
      isFallback: true,
      originalModel: currentModel,
    };
  }

  // Sonnet → Opus fallback
  if (tier === 'balanced' && rules.sonnet.triggerOn.includes(trigger)) {
    return {
      model: rules.sonnet.fallbackTo,
      tier: getModelTier(rules.sonnet.fallbackTo),
      reason: `Fallback from Sonnet: ${trigger}`,
      estimatedCostPerCycle: calculateCycleCost(rules.sonnet.fallbackTo),
      isFallback: true,
      originalModel: currentModel,
    };
  }

  // Opus has no fallback (already premium tier)
  return null;
}

/**
 * Get model distribution statistics based on config.
 * Used for cost projections.
 */
export function getModelDistribution(config: ModelRoutingConfig = DEFAULT_ROUTING_CONFIG): Record<ClaudeModel, number> {
  // Based on Research C723 analysis of role frequency
  const roleFrequency: Record<RoleId, number> = {
    ceo: 0.09, // ~9% of cycles
    growth: 0.09,
    research: 0.09,
    frontier: 0.09,
    product: 0.09,
    scrum: 0.09,
    qa: 0.09,
    engineering: 0.09,
    ops: 0.09,
    design: 0.09,
    evangelist: 0.10, // Slightly higher due to outreach focus
  };

  const distribution: Record<ClaudeModel, number> = {
    'claude-3-5-haiku-20241022': 0,
    'claude-3-5-sonnet-20241022': 0,
    'claude-3-opus-20240229': 0,
  };

  for (const [roleStr, freq] of Object.entries(roleFrequency)) {
    const role = roleStr as RoleId;
    const selection = selectModel(role, undefined, config);
    distribution[selection.model] += freq;
  }

  return distribution;
}

/**
 * Calculate projected average cost per cycle.
 */
export function calculateProjectedCycleCost(config: ModelRoutingConfig = DEFAULT_ROUTING_CONFIG): number {
  const distribution = getModelDistribution(config);
  let totalCost = 0;

  for (const [model, freq] of Object.entries(distribution)) {
    totalCost += freq * calculateCycleCost(model as ClaudeModel);
  }

  return totalCost;
}

/**
 * ModelRouter class for stateful model selection with metrics tracking.
 */
export class ModelRouter {
  private readonly config: ModelRoutingConfig;
  private readonly fallbackRules: FallbackRules;
  private retryCount: Map<number, number> = new Map();

  constructor(
    config: ModelRoutingConfig = DEFAULT_ROUTING_CONFIG,
    fallbackRules: FallbackRules = DEFAULT_FALLBACK_RULES
  ) {
    this.config = config;
    this.fallbackRules = fallbackRules;
  }

  /**
   * Select model for a dispatch cycle.
   */
  selectForCycle(role: RoleId, actionDescription?: string): ModelSelectionResult {
    return selectModel(role, actionDescription, this.config);
  }

  /**
   * Get fallback model after a failure.
   */
  handleFailure(
    cycle: number,
    currentModel: ClaudeModel,
    trigger: FallbackTrigger
  ): ModelSelectionResult | null {
    if (!this.config.enableFallback) {
      return null;
    }

    const retries = this.retryCount.get(cycle) || 0;
    const tier = getModelTier(currentModel);
    const maxRetries =
      tier === 'fast' ? this.fallbackRules.haiku.maxRetries : this.fallbackRules.sonnet.maxRetries;

    if (retries >= maxRetries) {
      return null;
    }

    const fallback = getFallbackModel(currentModel, trigger, this.fallbackRules);
    if (fallback) {
      this.retryCount.set(cycle, retries + 1);
    }

    return fallback;
  }

  /**
   * Get the current configuration.
   */
  getConfig(): ModelRoutingConfig {
    return this.config;
  }

  /**
   * Get projected cost statistics.
   */
  getProjectedStats(): {
    avgCostPerCycle: number;
    distribution: Record<ClaudeModel, number>;
    savingsVsAllSonnet: number;
  } {
    const avgCost = calculateProjectedCycleCost(this.config);
    const allSonnetCost = calculateCycleCost('claude-3-5-sonnet-20241022');
    const savings = (1 - avgCost / allSonnetCost) * 100;

    return {
      avgCostPerCycle: avgCost,
      distribution: getModelDistribution(this.config),
      savingsVsAllSonnet: savings,
    };
  }
}
