/**
 * @ada-ai/core — Playbook Suggestion Generator
 *
 * Transforms Reflexion patterns into actionable playbook suggestions.
 * Closes the self-improvement loop: Reflect → Pattern → Suggestion → Apply.
 *
 * @see docs/frontier/pattern-to-playbook-automation-spec-c449.md
 * @see Issue #108 (Reflexion Phase 2)
 * @packageDocumentation
 */

import type { ReflexionPattern } from '../reflexion/types.js';
import type {
  PlaybookSuggestion,
  CreateSuggestionInput,
  SuggestionConfig,
  ConfidenceTier,
} from './types.js';
import { DEFAULT_SUGGESTION_CONFIG } from './types.js';
import { SuggestionStore } from './store.js';

// ─── Helper: Extract source reflections and roles from pattern ──────────────

/**
 * Get source reflection IDs from a pattern.
 * Uses sourceCluster.reflectionIds as the source of truth.
 */
function getSourceReflections(pattern: ReflexionPattern): readonly string[] {
  return pattern.sourceCluster?.reflectionIds ?? [];
}

/**
 * Get contributing roles from a pattern.
 * Uses pattern.roles as the source of truth.
 */
function getContributingRoles(pattern: ReflexionPattern): readonly string[] {
  return pattern.roles ?? [];
}

// ─── Role to Playbook Mapping ───────────────────────────────────────────────

/**
 * Maps role IDs to their playbook paths.
 */
const ROLE_PLAYBOOKS: Record<string, string> = {
  ceo: 'agents/playbooks/ceo.md',
  growth: 'agents/playbooks/growth.md',
  research: 'agents/playbooks/research.md',
  frontier: 'agents/playbooks/frontier.md',
  product: 'agents/playbooks/product.md',
  scrum: 'agents/playbooks/scrum.md',
  qa: 'agents/playbooks/qa.md',
  engineering: 'agents/playbooks/engineering.md',
  ops: 'agents/playbooks/ops.md',
  design: 'agents/playbooks/design.md',
};

/**
 * Default sections for cross-cutting suggestions.
 */
const CROSS_CUTTING_SECTIONS: Record<string, string> = {
  testing: '## Quality Bar',
  documentation: '## Documentation',
  review: '## Review Standards',
  communication: '## Inter-Role Communication',
  default: '## Best Practices',
};

// ─── Generator Class ────────────────────────────────────────────────────────

/**
 * Generates playbook suggestions from Reflexion patterns.
 *
 * @example
 * ```typescript
 * const generator = new SuggestionGenerator('/path/to/project');
 * await generator.init();
 *
 * // Generate suggestion from a pattern
 * const suggestion = await generator.fromPattern(pattern);
 *
 * // Or process all high-confidence patterns
 * const suggestions = await generator.processPatterns(patterns);
 * ```
 */
export class SuggestionGenerator {
  private readonly store: SuggestionStore;
  private readonly config: SuggestionConfig;

  constructor(projectDir: string, config: Partial<SuggestionConfig> = {}) {
    this.config = { ...DEFAULT_SUGGESTION_CONFIG, ...config };
    this.store = new SuggestionStore(projectDir, this.config);
  }

  /**
   * Initialize the generator (creates directories, etc).
   */
  async init(): Promise<void> {
    await this.store.init();
  }

  // ─── Pattern Processing ─────────────────────────────────────────────────

  /**
   * Generate a suggestion from a single pattern.
   * Returns null if pattern doesn't meet threshold or is duplicate.
   *
   * @param pattern - Reflexion pattern to process
   * @returns Generated suggestion or null
   */
  async fromPattern(
    pattern: ReflexionPattern
  ): Promise<PlaybookSuggestion | null> {
    // Check confidence threshold
    const tier = this.getConfidenceTier(pattern.confidence);
    if (tier === 'weak') {
      return null; // Below threshold, log only
    }

    // Determine target playbook and section
    const target = this.determineTarget(pattern);

    // Generate suggestion text
    const suggestedText = this.generateSuggestionText(pattern);

    // Check for duplicates
    const isDuplicate = await this.store.isDuplicate({
      targetPlaybook: target.playbook,
      targetSection: target.section,
      suggestedText,
    });

    if (isDuplicate) {
      return null;
    }

    // Create suggestion input
    const input: CreateSuggestionInput = {
      patternId: pattern.id,
      patternConfidence: pattern.confidence,
      targetPlaybook: target.playbook,
      targetSection: target.section,
      suggestionType: 'add', // Phase 1 only supports add
      suggestedText,
      rationale: this.generateRationale(pattern),
      sourceReflections: getSourceReflections(pattern),
      contributingRoles: getContributingRoles(pattern),
    };

    // Create and return suggestion
    return this.store.create(input);
  }

  /**
   * Process multiple patterns and generate suggestions.
   * Filters by confidence and deduplicates.
   *
   * @param patterns - Patterns to process
   * @returns Array of generated suggestions
   */
  async processPatterns(
    patterns: readonly ReflexionPattern[]
  ): Promise<PlaybookSuggestion[]> {
    const suggestions: PlaybookSuggestion[] = [];

    // Sort by confidence (highest first)
    const sorted = [...patterns].sort(
      (a, b) => b.confidence - a.confidence
    );

    for (const pattern of sorted) {
      try {
        const suggestion = await this.fromPattern(pattern);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      } catch (error) {
        // Log error but continue processing
        console.error(
          `Error processing pattern ${pattern.id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    return suggestions;
  }

  // ─── Target Determination ───────────────────────────────────────────────

  /**
   * Determine the target playbook and section for a pattern.
   *
   * Logic:
   * 1. If pattern is cross-role (2+ roles), target the primary role's playbook
   * 2. Use theme to determine section
   * 3. Default to "## Best Practices" if no clear match
   */
  private determineTarget(pattern: ReflexionPattern): {
    playbook: string;
    section: string;
  } {
    const roles = getContributingRoles(pattern);

    // Primary role (first alphabetically or most frequent)
    const primaryRole = roles[0] ?? 'ops'; // Default to ops for cross-cutting rules

    // Get playbook for primary role
    const playbook: string =
      ROLE_PLAYBOOKS[primaryRole] ?? 'agents/rules/RULES.md';

    // Determine section from theme
    const themeLower = pattern.theme.toLowerCase();
    let section: string = CROSS_CUTTING_SECTIONS.default ?? '## Best Practices';

    for (const [keyword, sect] of Object.entries(CROSS_CUTTING_SECTIONS)) {
      if (themeLower.includes(keyword)) {
        section = sect;
        break;
      }
    }

    return { playbook, section };
  }

  // ─── Text Generation ────────────────────────────────────────────────────

  /**
   * Generate the suggestion text from a pattern.
   */
  private generateSuggestionText(pattern: ReflexionPattern): string {
    // Start with a bullet point
    let text = '- ';

    // If there's a suggested lesson, use it
    if (pattern.suggestedLesson) {
      text += pattern.suggestedLesson;
    } else {
      // Generate from theme and description
      text += this.capitalizeFirst(pattern.theme);
      if (pattern.description) {
        text += `: ${pattern.description}`;
      }
    }

    // Truncate if needed
    if (text.length > this.config.maxSuggestedTextLength) {
      text = `${text.slice(0, this.config.maxSuggestedTextLength - 3)}...`;
    }

    return text;
  }

  /**
   * Generate rationale explaining why this suggestion was created.
   */
  private generateRationale(pattern: ReflexionPattern): string {
    const roles = getContributingRoles(pattern);
    const sourceRefs = getSourceReflections(pattern);
    const roleStr =
      roles.length > 0
        ? `across ${roles.length} roles (${roles.join(', ')})`
        : 'in reflections';

    const confidencePercent = Math.round(pattern.confidence * 100);
    const clusterSize = pattern.sourceCluster?.size ?? sourceRefs.length;

    return (
      `Pattern '${pattern.theme}' detected ${roleStr} with ` +
      `${confidencePercent}% confidence. ` +
      `${clusterSize} occurrences in ${sourceRefs.length} reflections.`
    );
  }

  // ─── Confidence ─────────────────────────────────────────────────────────

  /**
   * Get the confidence tier for a given confidence score.
   */
  getConfidenceTier(confidence: number): ConfidenceTier {
    if (confidence >= this.config.autoApplyThreshold) return 'auto';
    if (confidence >= this.config.highConfidenceThreshold) return 'high';
    if (confidence >= this.config.minConfidence) return 'moderate';
    return 'weak';
  }

  /**
   * Check if a pattern should generate a suggestion.
   */
  shouldGenerateSuggestion(pattern: ReflexionPattern): boolean {
    return pattern.confidence >= this.config.minConfidence;
  }

  // ─── Store Access ───────────────────────────────────────────────────────

  /**
   * Get the underlying store for direct access.
   */
  getStore(): SuggestionStore {
    return this.store;
  }

  // ─── Utilities ──────────────────────────────────────────────────────────

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// ─── Factory Function ───────────────────────────────────────────────────────

/**
 * Create and initialize a suggestion generator.
 *
 * @param projectDir - Project root directory
 * @param config - Optional configuration overrides
 * @returns Initialized SuggestionGenerator
 */
export async function createSuggestionGenerator(
  projectDir: string,
  config: Partial<SuggestionConfig> = {}
): Promise<SuggestionGenerator> {
  const generator = new SuggestionGenerator(projectDir, config);
  await generator.init();
  return generator;
}
