/**
 * Dispatch Output Validation
 *
 * Validates dispatch cycle outputs to ensure quality.
 * Used for fallback escalation decisions.
 *
 * @packageDocumentation
 */

import type { DispatchOutput, ValidationResult, RoleId } from './types.js';

/**
 * Minimum action description length.
 */
export const MIN_ACTION_LENGTH = 10;

/**
 * Maximum action description length (sanity check).
 */
export const MAX_ACTION_LENGTH = 500;

/**
 * Required keywords that should appear in action descriptions.
 */
export const ROLE_ACTION_KEYWORDS: Readonly<Record<RoleId, readonly string[]>> = {
  ceo: ['strategy', 'decision', 'endorse', 'pivot', 'direction', 'priority', 'launch'],
  growth: ['marketing', 'channel', 'acquisition', 'growth', 'campaign', 'outreach', 'funnel'],
  research: ['research', 'analysis', 'finding', 'study', 'benchmark', 'paper', 'model'],
  frontier: ['prototype', 'architecture', 'platform', 'infrastructure', 'innovation', 'system'],
  product: ['spec', 'requirement', 'feature', 'user', 'acceptance', 'criteria', 'backlog'],
  scrum: ['retro', 'sprint', 'tracking', 'velocity', 'coordination', 'standup', 'blocked'],
  qa: ['test', 'coverage', 'quality', 'bug', 'regression', 'validation', 'gate'],
  engineering: ['implement', 'code', 'pr', 'fix', 'feature', 'module', 'function', 'test'],
  ops: ['ci', 'merge', 'deploy', 'workflow', 'rule', 'standard', 'review', 'triage'],
  design: ['design', 'ux', 'interface', 'api', 'spec', 'diagram', 'flow', 'experience'],
  evangelist: ['outreach', 'integration', 'pr', 'repo', 'adoption', 'external', 'case study'],
} as const;

/**
 * Validate a dispatch output for completeness and quality.
 *
 * @param output - The dispatch output to validate
 * @param role - The role that generated the output
 * @returns Validation result with error details if failed
 */
export function validateDispatchOutput(output: DispatchOutput, role: RoleId): ValidationResult {
  // Check action exists and meets length requirements
  if (!output.action) {
    return {
      valid: false,
      error: 'Missing action description',
      suggestedTrigger: 'incomplete_output',
    };
  }

  if (output.action.length < MIN_ACTION_LENGTH) {
    return {
      valid: false,
      error: `Action too short (${output.action.length} chars, min ${MIN_ACTION_LENGTH})`,
      suggestedTrigger: 'incomplete_output',
    };
  }

  if (output.action.length > MAX_ACTION_LENGTH) {
    return {
      valid: false,
      error: `Action too long (${output.action.length} chars, max ${MAX_ACTION_LENGTH})`,
      suggestedTrigger: 'format_error',
    };
  }

  // Check role state exists
  if (!output.roleState || output.roleState.trim().length === 0) {
    return {
      valid: false,
      error: 'Missing role state update',
      suggestedTrigger: 'incomplete_output',
    };
  }

  // Check memory updates exist
  if (!output.memoryUpdates || output.memoryUpdates.length === 0) {
    return {
      valid: false,
      error: 'Missing memory updates',
      suggestedTrigger: 'incomplete_output',
    };
  }

  // Check for role-relevant keywords (warning, not failure)
  const keywords = ROLE_ACTION_KEYWORDS[role];
  const actionLower = output.action.toLowerCase();
  const hasRelevantKeyword = keywords.some((keyword) => actionLower.includes(keyword));

  if (!hasRelevantKeyword) {
    // This is a soft warning - action may still be valid but potentially off-topic
    console.warn(
      `[ModelRouter] Action may be off-topic for ${role}: no keywords found. ` +
        `Expected one of: ${keywords.join(', ')}`
    );
  }

  // Validate PR URL format if present
  if (output.prUrl && !isValidPrUrl(output.prUrl)) {
    return {
      valid: false,
      error: `Invalid PR URL format: ${output.prUrl}`,
      suggestedTrigger: 'format_error',
    };
  }

  // Validate commit message format if present
  if (output.commitMessage && !isValidCommitMessage(output.commitMessage)) {
    return {
      valid: false,
      error: 'Commit message does not follow conventional format',
      suggestedTrigger: 'format_error',
    };
  }

  return { valid: true };
}

/**
 * Check if a URL looks like a valid GitHub PR URL.
 */
export function isValidPrUrl(url: string): boolean {
  // Basic validation - should be a GitHub PR URL
  const prUrlPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/;
  return prUrlPattern.test(url);
}

/**
 * Check if a commit message follows conventional commit format.
 */
export function isValidCommitMessage(message: string): boolean {
  // Conventional commit: type(scope): description
  const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore|ci|perf|build)\([^)]+\): .+$/;
  // Also allow type: description (without scope)
  const simplePattern = /^(feat|fix|docs|style|refactor|test|chore|ci|perf|build): .+$/;

  return conventionalPattern.test(message) || simplePattern.test(message);
}

/**
 * Parse a dispatch output from raw LLM response.
 * This is a best-effort parser for structured output.
 *
 * @param rawOutput - Raw text output from the LLM
 * @param role - The role that generated the output
 * @returns Parsed dispatch output or null if parsing failed
 */
export function parseDispatchOutput(rawOutput: string, role: RoleId): DispatchOutput | null {
  try {
    // Try JSON parse first
    const parsed = JSON.parse(rawOutput);
    if (parsed.action && parsed.roleState && parsed.memoryUpdates) {
      return parsed as DispatchOutput;
    }
  } catch {
    // Not JSON, try to extract from structured text
  }

  // Extract action from markdown-style output
  const actionMatch = rawOutput.match(/##?\s*Action[:\s]*(.+?)(?=##|$)/is);
  const roleStateMatch = rawOutput.match(/##?\s*Role State[:\s]*(.+?)(?=##|$)/is);
  const memoryMatch = rawOutput.match(/##?\s*Memory Updates?[:\s]*(.+?)(?=##|$)/is);

  if (actionMatch?.[1] && roleStateMatch?.[1]) {
    const memoryUpdates =
      memoryMatch?.[1]
        ? memoryMatch[1]
            .split(/[-*•]\s*/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : [`Updated ${role} state`];

    return {
      action: actionMatch[1].trim(),
      roleState: roleStateMatch[1].trim(),
      memoryUpdates,
    };
  }

  return null;
}

/**
 * Calculate a quality score for a dispatch output (0-100).
 * Higher scores indicate better quality.
 */
export function calculateQualityScore(output: DispatchOutput, role: RoleId): number {
  let score = 0;

  // Base score for having required fields
  if (output.action) score += 25;
  if (output.roleState) score += 25;
  if (output.memoryUpdates?.length > 0) score += 25;

  // Length quality
  if (output.action.length >= 50) score += 10;
  if (output.action.length >= 100) score += 5;

  // Keyword relevance
  const keywords = ROLE_ACTION_KEYWORDS[role];
  const actionLower = output.action.toLowerCase();
  const keywordMatches = keywords.filter((keyword) => actionLower.includes(keyword)).length;
  score += Math.min(keywordMatches * 5, 15);

  // Has PR or commit (extra credit for code work)
  if (output.prUrl) score += 5;
  if (output.commitMessage) score += 5;

  return Math.min(score, 100);
}
