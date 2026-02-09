/**
 * @ada/core — Reflexion utilities
 *
 * Implements lightweight self-critique for ADA dispatch cycles.
 * Based on: Shinn et al. (2023) — "Reflexion: Language Agents with Verbal Reinforcement Learning"
 *
 * Phase 1a of the Recursive LM roadmap (Issue #108).
 *
 * @see docs/research/reflexion-integration-spec.md
 */

import type {
  Reflection,
  ReflectionOutcome,
  RotationHistoryEntry,
  RoleId,
} from './types.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum length for whatWorked and whatToImprove fields */
export const MAX_SHORT_FIELD_LENGTH = 100;

/** Maximum length for lessonLearned field */
export const MAX_LESSON_LENGTH = 150;

/** Default number of recent reflections to retrieve */
export const DEFAULT_REFLECTION_COUNT = 3;

// ─── Prompt Generation ───────────────────────────────────────────────────────

/**
 * Generate the prompt for post-action reflection.
 *
 * This should be appended to the LLM context after an action is taken,
 * asking the agent to self-critique before the cycle ends.
 *
 * @param actionSummary - Brief description of the action just completed
 * @returns Markdown prompt for the LLM
 */
export function generateReflectionPrompt(actionSummary: string): string {
  return `## Post-Action Reflection

You just completed: ${actionSummary}

Reflect briefly on this action:

1. **Outcome:** Was this successful, partially successful, blocked, or unknown?
2. **What worked:** What aspect of your approach was effective? (1 sentence, max 100 chars)
3. **What to improve:** What would you do differently next time? (1 sentence, max 100 chars)
4. **Lesson learned:** Any insight worth remembering? (optional, 1 sentence, max 150 chars)

Respond in this exact JSON format:
\`\`\`json
{
  "outcome": "success" | "partial" | "blocked" | "unknown",
  "whatWorked": "string or null",
  "whatToImprove": "string or null",
  "lessonLearned": "string or null"
}
\`\`\`

Keep responses concise — this adds ~50-100 tokens per cycle.`;
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

/**
 * Parse a reflection from LLM output.
 *
 * Attempts to extract a JSON block from the response. If parsing fails,
 * returns a fallback reflection with outcome 'unknown' (graceful degradation).
 *
 * @param llmOutput - Raw LLM response containing the reflection JSON
 * @returns Parsed and validated Reflection object
 */
export function parseReflection(llmOutput: string): Reflection {
  try {
    // Try to extract JSON from code block
    const jsonMatch = llmOutput.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch?.[1]?.trim() ?? llmOutput.trim();

    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    // Validate and sanitize outcome
    const validOutcomes: ReflectionOutcome[] = [
      'success',
      'partial',
      'blocked',
      'unknown',
    ];
    const outcome: ReflectionOutcome = validOutcomes.includes(
      parsed.outcome as ReflectionOutcome
    )
      ? (parsed.outcome as ReflectionOutcome)
      : 'unknown';

    // Truncate fields to max lengths
    const whatWorked = truncateField(parsed.whatWorked, MAX_SHORT_FIELD_LENGTH);
    const whatToImprove = truncateField(
      parsed.whatToImprove,
      MAX_SHORT_FIELD_LENGTH
    );
    const lessonLearned = truncateField(parsed.lessonLearned, MAX_LESSON_LENGTH);

    return {
      outcome,
      ...(whatWorked && { whatWorked }),
      ...(whatToImprove && { whatToImprove }),
      ...(lessonLearned && { lessonLearned }),
    };
  } catch {
    // Graceful degradation: don't block dispatch for reflection parsing
    return { outcome: 'unknown' };
  }
}

/**
 * Truncate a field to a maximum length.
 *
 * @param value - The value to truncate (may be undefined/null)
 * @param maxLength - Maximum allowed length
 * @returns Truncated string or undefined
 */
function truncateField(
  value: unknown,
  maxLength: number
): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 3)}...`;
}

// ─── Retrieval ───────────────────────────────────────────────────────────────

/**
 * Get recent reflections for a specific role from history.
 *
 * Filters history to entries for the given role that have reflections,
 * returns the most recent N entries in reverse chronological order.
 *
 * @param history - Rotation history entries
 * @param role - Role ID to filter by
 * @param count - Number of reflections to retrieve (default: 3)
 * @returns Array of reflections with cycle metadata
 */
export function getRecentReflections(
  history: readonly RotationHistoryEntry[],
  role: RoleId,
  count: number = DEFAULT_REFLECTION_COUNT
): ReadonlyArray<{
  readonly cycle: number;
  readonly timestamp: string;
  readonly action?: string;
  readonly reflection: Reflection;
}> {
  return history
    .filter((h): h is RotationHistoryEntry & { reflection: Reflection } =>
      h.role === role && h.reflection !== undefined
    )
    .slice(-count)
    .reverse()
    .map((h) => ({
      cycle: h.cycle,
      timestamp: h.timestamp,
      ...(h.action !== undefined && { action: h.action }),
      reflection: h.reflection,
    }));
}

/**
 * Format recent reflections for injection into dispatch context.
 *
 * Produces a markdown block suitable for appending to playbook context.
 *
 * @param role - Role name for the header
 * @param reflections - Recent reflections from getRecentReflections()
 * @returns Formatted markdown string
 */
export function formatReflectionsForContext(
  role: string,
  reflections: ReadonlyArray<{
    readonly cycle: number;
    readonly reflection: Reflection;
  }>
): string {
  if (reflections.length === 0) {
    return '';
  }

  const lines: string[] = [
    `## Recent Reflections (${role} — last ${reflections.length} cycles)`,
    '',
  ];

  for (const { cycle, reflection } of reflections) {
    lines.push(`### Cycle ${cycle}`);
    lines.push(`- **Outcome:** ${reflection.outcome}`);
    if (reflection.whatWorked) {
      lines.push(`- **Worked:** ${reflection.whatWorked}`);
    }
    if (reflection.whatToImprove) {
      lines.push(`- **Improve:** ${reflection.whatToImprove}`);
    }
    if (reflection.lessonLearned) {
      lines.push(`- **Lesson:** ${reflection.lessonLearned}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate a reflection object.
 *
 * @param reflection - Reflection to validate
 * @returns True if valid, false otherwise
 */
export function isValidReflection(reflection: unknown): reflection is Reflection {
  if (typeof reflection !== 'object' || reflection === null) {
    return false;
  }

  const r = reflection as Record<string, unknown>;

  // outcome is required
  const validOutcomes = ['success', 'partial', 'blocked', 'unknown'];
  if (typeof r.outcome !== 'string' || !validOutcomes.includes(r.outcome)) {
    return false;
  }

  // Optional fields must be strings if present
  if (r.whatWorked !== undefined && typeof r.whatWorked !== 'string') {
    return false;
  }
  if (r.whatToImprove !== undefined && typeof r.whatToImprove !== 'string') {
    return false;
  }
  if (r.lessonLearned !== undefined && typeof r.lessonLearned !== 'string') {
    return false;
  }

  return true;
}

/**
 * Create an empty reflection for failed or skipped cycles.
 *
 * @param outcome - The outcome to set (default: 'unknown')
 * @returns A minimal reflection object
 */
export function createEmptyReflection(
  outcome: ReflectionOutcome = 'unknown'
): Reflection {
  return { outcome };
}
