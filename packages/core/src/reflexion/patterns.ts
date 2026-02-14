/**
 * @ada-ai/core — Pattern Detection Orchestration for Reflexion Phase 2
 *
 * Main entry point for pattern extraction from reflection history.
 * Orchestrates keyword extraction, clustering, and confidence scoring.
 *
 * @see docs/frontier/reflexion-phase2-impl-spec-c469.md
 */

import type {
  ReflectionInput,
  ReflexionPattern,
  PatternExtractionConfig,
} from './types.js';
import { clusterReflections } from './clusters.js';
import {
  calculateConfidence,
  isCrossRolePattern,
  generateTheme,
  generateDescription,
  DEFAULT_CONFIDENCE_THRESHOLD,
} from './confidence.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Default configuration for pattern extraction.
 * Confidence threshold 0.7 per Reflexion paper (Shinn et al. 2023).
 */
export const DEFAULT_PATTERN_CONFIG: PatternExtractionConfig = {
  method: 'keyword',
  confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
  minClusterSize: 3,
  recentCycleWindow: 50,
  maxPatterns: 10,
} as const;

// ─── Pattern Extraction ──────────────────────────────────────────────────────

/**
 * Extract patterns from reflection history.
 * Main entry point for Reflexion Phase 2.
 *
 * Workflow:
 * 1. Cluster reflections by keyword similarity
 * 2. Score clusters with confidence metrics
 * 3. Filter by confidence threshold
 * 4. Generate pattern metadata (theme, description, cross-role)
 * 5. Sort and limit results
 *
 * @param reflections - Reflection history to analyze
 * @param config - Optional configuration overrides
 * @returns Array of detected patterns sorted by confidence
 */
export function extractPatterns(
  reflections: readonly ReflectionInput[],
  config: Partial<PatternExtractionConfig> = {}
): ReflexionPattern[] {
  const fullConfig: PatternExtractionConfig = {
    ...DEFAULT_PATTERN_CONFIG,
    ...config,
  };

  // Step 1: Cluster reflections by keyword similarity
  const clusters = clusterReflections(
    reflections,
    fullConfig.minClusterSize,
    undefined, // Use default similarity threshold
    fullConfig.recentCycleWindow
  );

  // Step 2-4: Convert clusters to patterns with confidence scoring
  const patterns: ReflexionPattern[] = [];
  const now = Date.now();

  for (const cluster of clusters) {
    const confidence = calculateConfidence(cluster);

    // Filter by confidence threshold
    if (confidence < fullConfig.confidenceThreshold) {
      continue;
    }

    const crossRole = isCrossRolePattern(cluster);
    const theme = generateTheme(cluster);
    const description = generateDescription(cluster, crossRole);

    patterns.push({
      id: generatePatternId(),
      theme,
      description,
      keywords: cluster.keywords,
      confidence,
      sourceCluster: cluster,
      crossRole,
      roles: Object.keys(cluster.roleDistribution),
      status: 'candidate',
      detectedAt: now,
    });
  }

  // Step 5: Sort by confidence and limit
  return patterns
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, fullConfig.maxPatterns);
}

// ─── Lesson Generation ───────────────────────────────────────────────────────

/**
 * Generate a suggested lesson from a pattern.
 * Uses a template-based approach for MVP (no LLM calls).
 *
 * @param pattern - Pattern to generate lesson for
 * @returns Markdown-formatted lesson suggestion
 */
export function generateLessonSuggestion(pattern: ReflexionPattern): string {
  const { theme, crossRole, roles, sourceCluster } = pattern;

  // Format source references (first 3 cycles)
  const sources = sourceCluster.reflectionIds.slice(0, 3).join(', ');

  if (crossRole) {
    return `**L-NEW:** Cross-role coordination between ${roles.join(' and ')} improves outcomes around ${theme.toLowerCase()}. (Detected in ${sourceCluster.size} cycles: ${sources})`;
  }

  return `**L-NEW:** Pattern detected around ${theme.toLowerCase()} — review ${sources} for insights. (${sourceCluster.size} occurrences)`;
}

/**
 * Generate a detailed lesson with context.
 * For use in CLI output and documentation.
 *
 * @param pattern - Pattern to describe
 * @returns Multi-line description with context
 */
export function generateDetailedLesson(pattern: ReflexionPattern): string {
  const { theme, description, keywords, confidence, roles, sourceCluster } =
    pattern;

  const lines: string[] = [
    `## ${theme}`,
    '',
    description,
    '',
    `**Confidence:** ${(confidence * 100).toFixed(0)}%`,
    `**Roles:** ${roles.join(', ')}`,
    `**Keywords:** ${keywords.join(', ')}`,
    `**Sources:** ${sourceCluster.reflectionIds.length} reflections (${sourceCluster.reflectionIds.slice(0, 5).join(', ')}${sourceCluster.reflectionIds.length > 5 ? '...' : ''})`,
    '',
    '### Suggested Lesson',
    '',
    generateLessonSuggestion(pattern),
  ];

  return lines.join('\n');
}

// ─── Pattern Filtering ───────────────────────────────────────────────────────

/**
 * Filter patterns by status.
 *
 * @param patterns - Patterns to filter
 * @param status - Status to filter by
 * @returns Filtered patterns
 */
export function filterByStatus(
  patterns: readonly ReflexionPattern[],
  status: ReflexionPattern['status']
): ReflexionPattern[] {
  return patterns.filter((p) => p.status === status);
}

/**
 * Filter patterns by role involvement.
 *
 * @param patterns - Patterns to filter
 * @param role - Role that must be involved
 * @returns Patterns involving the specified role
 */
export function filterByRole(
  patterns: readonly ReflexionPattern[],
  role: string
): ReflexionPattern[] {
  return patterns.filter((p) => p.roles.includes(role));
}

/**
 * Get only cross-role patterns.
 *
 * @param patterns - Patterns to filter
 * @returns Patterns involving 2+ roles
 */
export function getCrossRolePatterns(
  patterns: readonly ReflexionPattern[]
): ReflexionPattern[] {
  return patterns.filter((p) => p.crossRole);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate a unique pattern ID.
 * Uses a simple timestamp + random approach for MVP.
 */
function generatePatternId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `pat-${timestamp}-${random}`;
}

/**
 * Validate a pattern configuration.
 *
 * @param config - Configuration to validate
 * @returns True if valid
 */
export function isValidConfig(
  config: Partial<PatternExtractionConfig>
): boolean {
  if (
    config.confidenceThreshold !== undefined &&
    (config.confidenceThreshold < 0 || config.confidenceThreshold > 1)
  ) {
    return false;
  }
  if (config.minClusterSize !== undefined && config.minClusterSize < 1) {
    return false;
  }
  if (config.maxPatterns !== undefined && config.maxPatterns < 1) {
    return false;
  }
  if (
    config.recentCycleWindow !== undefined &&
    config.recentCycleWindow < 1
  ) {
    return false;
  }
  return true;
}
