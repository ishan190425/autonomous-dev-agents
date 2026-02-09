/**
 * Tests for the Reflexion module (Issue #108 — Phase 1a)
 *
 * Verifies reflection prompt generation, parsing, retrieval, and formatting.
 */

import { describe, it, expect } from 'vitest';
import {
  generateReflectionPrompt,
  parseReflection,
  getRecentReflections,
  formatReflectionsForContext,
  isValidReflection,
  createEmptyReflection,
  MAX_SHORT_FIELD_LENGTH,
  MAX_LESSON_LENGTH,
  DEFAULT_REFLECTION_COUNT,
} from '../../src/reflection.js';
import type { RotationHistoryEntry } from '../../src/types.js';

// ─── Constants Tests ─────────────────────────────────────────────────────────

describe('Constants', () => {
  it('should have correct max lengths', () => {
    expect(MAX_SHORT_FIELD_LENGTH).toBe(100);
    expect(MAX_LESSON_LENGTH).toBe(150);
    expect(DEFAULT_REFLECTION_COUNT).toBe(3);
  });
});

// ─── Prompt Generation Tests ─────────────────────────────────────────────────

describe('generateReflectionPrompt', () => {
  it('should include the action summary', () => {
    const prompt = generateReflectionPrompt('Created issue #42');
    expect(prompt).toContain('Created issue #42');
  });

  it('should request all reflection fields', () => {
    const prompt = generateReflectionPrompt('Test action');
    expect(prompt).toContain('Outcome');
    expect(prompt).toContain('What worked');
    expect(prompt).toContain('What to improve');
    expect(prompt).toContain('Lesson learned');
  });

  it('should include JSON format example', () => {
    const prompt = generateReflectionPrompt('Test action');
    expect(prompt).toContain('"outcome"');
    expect(prompt).toContain('"whatWorked"');
    expect(prompt).toContain('"whatToImprove"');
    expect(prompt).toContain('"lessonLearned"');
  });
});

// ─── Parsing Tests ───────────────────────────────────────────────────────────

describe('parseReflection', () => {
  it('should parse a valid JSON block', () => {
    const llmOutput = `
Here's my reflection:
\`\`\`json
{
  "outcome": "success",
  "whatWorked": "Building on prior analysis",
  "whatToImprove": "Could have included more examples",
  "lessonLearned": "Specs are more actionable with concrete schemas"
}
\`\`\`
    `;

    const result = parseReflection(llmOutput);

    expect(result.outcome).toBe('success');
    expect(result.whatWorked).toBe('Building on prior analysis');
    expect(result.whatToImprove).toBe('Could have included more examples');
    expect(result.lessonLearned).toBe('Specs are more actionable with concrete schemas');
  });

  it('should parse all outcome types', () => {
    const outcomes = ['success', 'partial', 'blocked', 'unknown'] as const;

    for (const outcome of outcomes) {
      const llmOutput = `\`\`\`json\n{"outcome": "${outcome}"}\n\`\`\``;
      const result = parseReflection(llmOutput);
      expect(result.outcome).toBe(outcome);
    }
  });

  it('should default to unknown for invalid outcomes', () => {
    const llmOutput = '```json\n{"outcome": "awesome"}\n```';
    const result = parseReflection(llmOutput);
    expect(result.outcome).toBe('unknown');
  });

  it('should truncate long fields', () => {
    const longText = 'a'.repeat(200);
    const llmOutput = `\`\`\`json\n{"outcome": "success", "whatWorked": "${longText}"}\n\`\`\``;

    const result = parseReflection(llmOutput);

    expect(result.whatWorked).toBeDefined();
    expect(result.whatWorked?.length).toBe(MAX_SHORT_FIELD_LENGTH);
    expect(result.whatWorked).toContain('...');
  });

  it('should handle missing optional fields', () => {
    const llmOutput = '```json\n{"outcome": "partial"}\n```';
    const result = parseReflection(llmOutput);

    expect(result.outcome).toBe('partial');
    expect(result.whatWorked).toBeUndefined();
    expect(result.whatToImprove).toBeUndefined();
    expect(result.lessonLearned).toBeUndefined();
  });

  it('should handle raw JSON without code block', () => {
    const llmOutput = '{"outcome": "success", "whatWorked": "Direct approach"}';
    const result = parseReflection(llmOutput);

    expect(result.outcome).toBe('success');
    expect(result.whatWorked).toBe('Direct approach');
  });

  it('should gracefully degrade on parse failure', () => {
    const llmOutput = 'This is not JSON at all!';
    const result = parseReflection(llmOutput);

    expect(result.outcome).toBe('unknown');
    expect(result.whatWorked).toBeUndefined();
  });

  it('should handle empty string fields', () => {
    const llmOutput = '```json\n{"outcome": "success", "whatWorked": ""}\n```';
    const result = parseReflection(llmOutput);

    expect(result.outcome).toBe('success');
    expect(result.whatWorked).toBeUndefined();
  });
});

// ─── Retrieval Tests ─────────────────────────────────────────────────────────

describe('getRecentReflections', () => {
  const history: RotationHistoryEntry[] = [
    { cycle: 1, role: 'engineering', timestamp: '2026-02-01T00:00:00Z', action: 'Action 1' },
    { cycle: 2, role: 'engineering', timestamp: '2026-02-02T00:00:00Z', action: 'Action 2', reflection: { outcome: 'success', whatWorked: 'Test 1' } },
    { cycle: 3, role: 'ops', timestamp: '2026-02-03T00:00:00Z', action: 'Action 3', reflection: { outcome: 'partial' } },
    { cycle: 4, role: 'engineering', timestamp: '2026-02-04T00:00:00Z', action: 'Action 4', reflection: { outcome: 'success', whatWorked: 'Test 2' } },
    { cycle: 5, role: 'engineering', timestamp: '2026-02-05T00:00:00Z', action: 'Action 5', reflection: { outcome: 'blocked', whatToImprove: 'Test 3' } },
  ];

  it('should filter by role', () => {
    const result = getRecentReflections(history, 'engineering');

    expect(result).toHaveLength(3);
    expect(result.every((r) => r.reflection.outcome !== 'partial')).toBe(true);
  });

  it('should exclude entries without reflections', () => {
    const result = getRecentReflections(history, 'engineering');

    // Cycle 1 has no reflection
    expect(result.find((r) => r.cycle === 1)).toBeUndefined();
  });

  it('should return in reverse chronological order', () => {
    const result = getRecentReflections(history, 'engineering');

    expect(result[0].cycle).toBe(5);
    expect(result[1].cycle).toBe(4);
    expect(result[2].cycle).toBe(2);
  });

  it('should respect count limit', () => {
    const result = getRecentReflections(history, 'engineering', 2);

    expect(result).toHaveLength(2);
    expect(result[0].cycle).toBe(5);
    expect(result[1].cycle).toBe(4);
  });

  it('should return empty array for role with no reflections', () => {
    const result = getRecentReflections(history, 'ceo');
    expect(result).toHaveLength(0);
  });
});

// ─── Formatting Tests ────────────────────────────────────────────────────────

describe('formatReflectionsForContext', () => {
  const reflections = [
    { cycle: 5, reflection: { outcome: 'success' as const, whatWorked: 'Clear spec', whatToImprove: 'More examples' } },
    { cycle: 4, reflection: { outcome: 'partial' as const, lessonLearned: 'Always test first' } },
  ];

  it('should include role name in header', () => {
    const result = formatReflectionsForContext('Engineering', reflections);
    expect(result).toContain('## Recent Reflections (Engineering');
  });

  it('should include cycle numbers', () => {
    const result = formatReflectionsForContext('Engineering', reflections);
    expect(result).toContain('### Cycle 5');
    expect(result).toContain('### Cycle 4');
  });

  it('should format all present fields', () => {
    const result = formatReflectionsForContext('Engineering', reflections);

    expect(result).toContain('**Outcome:** success');
    expect(result).toContain('**Worked:** Clear spec');
    expect(result).toContain('**Improve:** More examples');
    expect(result).toContain('**Lesson:** Always test first');
  });

  it('should return empty string for no reflections', () => {
    const result = formatReflectionsForContext('Engineering', []);
    expect(result).toBe('');
  });
});

// ─── Validation Tests ────────────────────────────────────────────────────────

describe('isValidReflection', () => {
  it('should accept valid reflections', () => {
    expect(isValidReflection({ outcome: 'success' })).toBe(true);
    expect(isValidReflection({ outcome: 'partial', whatWorked: 'Test' })).toBe(true);
    expect(isValidReflection({ outcome: 'blocked', whatToImprove: 'Test', lessonLearned: 'Test' })).toBe(true);
  });

  it('should reject invalid outcomes', () => {
    expect(isValidReflection({ outcome: 'awesome' })).toBe(false);
    expect(isValidReflection({ outcome: 123 })).toBe(false);
  });

  it('should reject non-objects', () => {
    expect(isValidReflection(null)).toBe(false);
    expect(isValidReflection('string')).toBe(false);
    expect(isValidReflection(123)).toBe(false);
  });

  it('should reject invalid optional field types', () => {
    expect(isValidReflection({ outcome: 'success', whatWorked: 123 })).toBe(false);
    expect(isValidReflection({ outcome: 'success', whatToImprove: {} })).toBe(false);
    expect(isValidReflection({ outcome: 'success', lessonLearned: [] })).toBe(false);
  });
});

// ─── Factory Tests ───────────────────────────────────────────────────────────

describe('createEmptyReflection', () => {
  it('should create default unknown outcome', () => {
    const result = createEmptyReflection();
    expect(result).toEqual({ outcome: 'unknown' });
  });

  it('should accept custom outcome', () => {
    const result = createEmptyReflection('blocked');
    expect(result).toEqual({ outcome: 'blocked' });
  });
});
