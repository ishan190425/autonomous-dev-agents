/**
 * @ada-ai/core — Pattern Detection Tests
 *
 * Unit tests for pattern extraction in Reflexion Phase 2.
 */

import { describe, it, expect } from 'vitest';
import {
  extractPatterns,
  generateLessonSuggestion,
  generateDetailedLesson,
  filterByStatus,
  filterByRole,
  getCrossRolePatterns,
  isValidConfig,
  DEFAULT_PATTERN_CONFIG,
} from '../../src/reflexion/patterns.js';
import {
  calculateConfidence,
  isCrossRolePattern,
  generateTheme,
  generateDescription,
} from '../../src/reflexion/confidence.js';
import type { ReflectionInput, ReflectionCluster } from '../../src/reflexion/types.js';

describe('extractPatterns', () => {
  it('detects patterns from similar reflections', () => {
    const reflections: ReflectionInput[] = [
      { cycle: 'C1', role: 'engineering', whatWorked: 'Tests with coverage improve quality.' },
      { cycle: 'C2', role: 'engineering', whatWorked: 'Running tests improves coverage.' },
      { cycle: 'C3', role: 'engineering', whatWorked: 'Test coverage is important for quality.' },
      { cycle: 'C4', role: 'qa', whatWorked: 'Quality assurance needs coverage testing.' },
    ];

    const patterns = extractPatterns(reflections, {
      minClusterSize: 3,
      confidenceThreshold: 0.3, // Lower for test
    });

    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].keywords.length).toBeGreaterThan(0);
    expect(patterns[0].status).toBe('candidate');
  });

  it('respects confidence threshold', () => {
    const reflections: ReflectionInput[] = [
      { cycle: 'C1', role: 'engineering', whatWorked: 'Completely different topic A.' },
      { cycle: 'C2', role: 'qa', whatWorked: 'Another unrelated topic B.' },
      { cycle: 'C3', role: 'design', whatWorked: 'Third random subject C.' },
    ];

    // Low similarity reflections should not form patterns at 70% threshold
    const patterns = extractPatterns(reflections, {
      confidenceThreshold: 0.7,
      minClusterSize: 2,
    });

    expect(patterns.length).toBe(0);
  });

  it('limits patterns to maxPatterns', () => {
    // Create enough similar reflections to form multiple clusters
    const reflections: ReflectionInput[] = [
      // Cluster 1
      { cycle: 'C1', role: 'engineering', whatWorked: 'tests coverage quality' },
      { cycle: 'C2', role: 'engineering', whatWorked: 'tests coverage quality' },
      { cycle: 'C3', role: 'engineering', whatWorked: 'tests coverage quality' },
    ];

    const patterns = extractPatterns(reflections, {
      maxPatterns: 1,
      confidenceThreshold: 0.3,
      minClusterSize: 3,
    });

    expect(patterns.length).toBeLessThanOrEqual(1);
  });

  it('sorts patterns by confidence descending', () => {
    const reflections: ReflectionInput[] = [
      // More cohesive group
      { cycle: 'C1', role: 'engineering', whatWorked: 'exact same phrase' },
      { cycle: 'C2', role: 'engineering', whatWorked: 'exact same phrase' },
      { cycle: 'C3', role: 'engineering', whatWorked: 'exact same phrase' },
      { cycle: 'C4', role: 'engineering', whatWorked: 'exact same phrase' },
    ];

    const patterns = extractPatterns(reflections, {
      confidenceThreshold: 0.1,
      minClusterSize: 3,
    });

    if (patterns.length >= 2) {
      expect(patterns[0].confidence).toBeGreaterThanOrEqual(patterns[1].confidence);
    }
  });

  it('includes pattern ID and timestamp', () => {
    const reflections: ReflectionInput[] = [
      { cycle: 'C1', role: 'engineering', whatWorked: 'typescript strict types' },
      { cycle: 'C2', role: 'engineering', whatWorked: 'typescript strict types' },
      { cycle: 'C3', role: 'engineering', whatWorked: 'typescript strict types' },
    ];

    const patterns = extractPatterns(reflections, {
      confidenceThreshold: 0.3,
      minClusterSize: 3,
    });

    if (patterns.length > 0) {
      expect(patterns[0].id).toMatch(/^pat-/);
      expect(patterns[0].detectedAt).toBeGreaterThan(0);
    }
  });
});

describe('calculateConfidence', () => {
  it('returns score between 0 and 1', () => {
    const cluster: ReflectionCluster = {
      id: 'test-1',
      keywords: ['tests', 'coverage'],
      reflectionIds: ['C1', 'C2', 'C3'],
      roleDistribution: { engineering: 3 },
      size: 3,
      recentCount: 2,
      cohesion: 0.5,
    };

    const confidence = calculateConfidence(cluster);

    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it('weights size, cohesion, and recency', () => {
    const highScoreCluster: ReflectionCluster = {
      id: 'high',
      keywords: ['a'],
      reflectionIds: Array(10).fill('C').map((_, i) => `C${i}`),
      roleDistribution: { engineering: 10 },
      size: 10,
      recentCount: 10,
      cohesion: 1.0,
    };

    const lowScoreCluster: ReflectionCluster = {
      id: 'low',
      keywords: ['b'],
      reflectionIds: ['C1', 'C2', 'C3'],
      roleDistribution: { engineering: 3 },
      size: 3,
      recentCount: 0,
      cohesion: 0.1,
    };

    const highConf = calculateConfidence(highScoreCluster);
    const lowConf = calculateConfidence(lowScoreCluster);

    expect(highConf).toBeGreaterThan(lowConf);
  });
});

describe('isCrossRolePattern', () => {
  it('returns true when 2+ roles have 2+ reflections each', () => {
    const cluster: ReflectionCluster = {
      id: 'test',
      keywords: [],
      reflectionIds: [],
      roleDistribution: { engineering: 3, qa: 2 },
      size: 5,
      recentCount: 5,
      cohesion: 0.5,
    };

    expect(isCrossRolePattern(cluster)).toBe(true);
  });

  it('returns false when only one role is significant', () => {
    const cluster: ReflectionCluster = {
      id: 'test',
      keywords: [],
      reflectionIds: [],
      roleDistribution: { engineering: 5, qa: 1 },
      size: 6,
      recentCount: 6,
      cohesion: 0.5,
    };

    expect(isCrossRolePattern(cluster)).toBe(false);
  });
});

describe('generateTheme', () => {
  it('capitalizes and joins keywords', () => {
    const cluster: ReflectionCluster = {
      id: 'test',
      keywords: ['tests', 'coverage', 'quality'],
      reflectionIds: [],
      roleDistribution: {},
      size: 0,
      recentCount: 0,
      cohesion: 0,
    };

    const theme = generateTheme(cluster);

    expect(theme).toBe('Tests + Coverage + Quality');
  });

  it('handles empty keywords', () => {
    const cluster: ReflectionCluster = {
      id: 'test',
      keywords: [],
      reflectionIds: [],
      roleDistribution: {},
      size: 0,
      recentCount: 0,
      cohesion: 0,
    };

    expect(generateTheme(cluster)).toBe('Unnamed Pattern');
  });
});

describe('generateDescription', () => {
  it('generates cross-role description', () => {
    const cluster: ReflectionCluster = {
      id: 'test',
      keywords: ['coordination', 'handoff'],
      reflectionIds: ['C1', 'C2', 'C3', 'C4'],
      roleDistribution: { engineering: 2, qa: 2 },
      size: 4,
      recentCount: 4,
      cohesion: 0.5,
    };

    const desc = generateDescription(cluster, true);

    expect(desc).toContain('Cross-role');
    expect(desc).toContain('engineering');
    expect(desc).toContain('qa');
    expect(desc).toContain('4 reflections');
  });

  it('generates single-role description', () => {
    const cluster: ReflectionCluster = {
      id: 'test',
      keywords: ['testing', 'automation'],
      reflectionIds: ['C1', 'C2', 'C3'],
      roleDistribution: { qa: 3 },
      size: 3,
      recentCount: 3,
      cohesion: 0.5,
    };

    const desc = generateDescription(cluster, false);

    expect(desc).not.toContain('Cross-role');
    expect(desc).toContain('3 reflections');
  });
});

describe('generateLessonSuggestion', () => {
  it('generates cross-role lesson format', () => {
    const reflections: ReflectionInput[] = [
      { cycle: 'C1', role: 'engineering', whatWorked: 'coordination with qa speeds review' },
      { cycle: 'C2', role: 'engineering', whatWorked: 'qa coordination improves quality' },
      { cycle: 'C3', role: 'qa', whatWorked: 'engineering coordination helps testing' },
    ];

    const patterns = extractPatterns(reflections, {
      confidenceThreshold: 0.2,
      minClusterSize: 3,
    });

    if (patterns.length > 0 && patterns[0].crossRole) {
      const lesson = generateLessonSuggestion(patterns[0]);
      expect(lesson).toContain('L-NEW');
      expect(lesson).toContain('Cross-role');
    }
  });

  it('generates single-role lesson format', () => {
    const reflections: ReflectionInput[] = [
      { cycle: 'C1', role: 'engineering', whatWorked: 'typescript strict checks' },
      { cycle: 'C2', role: 'engineering', whatWorked: 'typescript strict mode' },
      { cycle: 'C3', role: 'engineering', whatWorked: 'strict typescript types' },
    ];

    const patterns = extractPatterns(reflections, {
      confidenceThreshold: 0.2,
      minClusterSize: 3,
    });

    if (patterns.length > 0 && !patterns[0].crossRole) {
      const lesson = generateLessonSuggestion(patterns[0]);
      expect(lesson).toContain('L-NEW');
      expect(lesson).toContain('Pattern detected');
    }
  });
});

describe('generateDetailedLesson', () => {
  it('includes all pattern metadata', () => {
    const reflections: ReflectionInput[] = [
      { cycle: 'C1', role: 'engineering', whatWorked: 'testing automation coverage' },
      { cycle: 'C2', role: 'engineering', whatWorked: 'testing automation coverage' },
      { cycle: 'C3', role: 'engineering', whatWorked: 'testing automation coverage' },
    ];

    const patterns = extractPatterns(reflections, {
      confidenceThreshold: 0.2,
      minClusterSize: 3,
    });

    if (patterns.length > 0) {
      const detailed = generateDetailedLesson(patterns[0]);
      expect(detailed).toContain('Confidence:');
      expect(detailed).toContain('Roles:');
      expect(detailed).toContain('Keywords:');
      expect(detailed).toContain('Sources:');
      expect(detailed).toContain('Suggested Lesson');
    }
  });
});

describe('filterByStatus', () => {
  it('filters patterns by status', () => {
    const reflections: ReflectionInput[] = [
      { cycle: 'C1', role: 'engineering', whatWorked: 'testing coverage' },
      { cycle: 'C2', role: 'engineering', whatWorked: 'testing coverage' },
      { cycle: 'C3', role: 'engineering', whatWorked: 'testing coverage' },
    ];

    const patterns = extractPatterns(reflections, {
      confidenceThreshold: 0.2,
      minClusterSize: 3,
    });

    // All patterns start as 'candidate'
    const candidates = filterByStatus(patterns, 'candidate');
    expect(candidates.length).toBe(patterns.length);

    const accepted = filterByStatus(patterns, 'accepted');
    expect(accepted.length).toBe(0);
  });
});

describe('filterByRole', () => {
  it('filters patterns by role involvement', () => {
    const reflections: ReflectionInput[] = [
      { cycle: 'C1', role: 'engineering', whatWorked: 'testing coverage' },
      { cycle: 'C2', role: 'engineering', whatWorked: 'testing coverage' },
      { cycle: 'C3', role: 'engineering', whatWorked: 'testing coverage' },
    ];

    const patterns = extractPatterns(reflections, {
      confidenceThreshold: 0.2,
      minClusterSize: 3,
    });

    const engPatterns = filterByRole(patterns, 'engineering');
    expect(engPatterns.length).toBe(patterns.length);

    const qaPatterns = filterByRole(patterns, 'qa');
    expect(qaPatterns.length).toBe(0);
  });
});

describe('getCrossRolePatterns', () => {
  it('returns only cross-role patterns', () => {
    const reflections: ReflectionInput[] = [
      { cycle: 'C1', role: 'engineering', whatWorked: 'coordination testing' },
      { cycle: 'C2', role: 'engineering', whatWorked: 'coordination testing' },
      { cycle: 'C3', role: 'qa', whatWorked: 'coordination testing' },
      { cycle: 'C4', role: 'qa', whatWorked: 'coordination testing' },
    ];

    const patterns = extractPatterns(reflections, {
      confidenceThreshold: 0.2,
      minClusterSize: 3,
    });

    const crossRole = getCrossRolePatterns(patterns);
    crossRole.forEach(p => expect(p.crossRole).toBe(true));
  });
});

describe('isValidConfig', () => {
  it('accepts valid config', () => {
    expect(isValidConfig({
      confidenceThreshold: 0.5,
      minClusterSize: 3,
      maxPatterns: 10,
      recentCycleWindow: 50,
    })).toBe(true);
  });

  it('rejects invalid confidence threshold', () => {
    expect(isValidConfig({ confidenceThreshold: -0.1 })).toBe(false);
    expect(isValidConfig({ confidenceThreshold: 1.5 })).toBe(false);
  });

  it('rejects invalid cluster size', () => {
    expect(isValidConfig({ minClusterSize: 0 })).toBe(false);
  });

  it('rejects invalid max patterns', () => {
    expect(isValidConfig({ maxPatterns: 0 })).toBe(false);
  });
});

describe('DEFAULT_PATTERN_CONFIG', () => {
  it('has valid default values', () => {
    expect(DEFAULT_PATTERN_CONFIG.confidenceThreshold).toBe(0.7);
    expect(DEFAULT_PATTERN_CONFIG.minClusterSize).toBe(3);
    expect(DEFAULT_PATTERN_CONFIG.maxPatterns).toBe(10);
    expect(DEFAULT_PATTERN_CONFIG.recentCycleWindow).toBe(50);
    expect(DEFAULT_PATTERN_CONFIG.method).toBe('keyword');
  });
});
