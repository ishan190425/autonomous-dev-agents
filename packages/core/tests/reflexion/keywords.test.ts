/**
 * @ada-ai/core — Keyword Extraction Tests
 *
 * Unit tests for TF-IDF keyword extraction in Reflexion Phase 2.
 */

import { describe, it, expect } from 'vitest';
import {
  extractKeywords,
  extractKeywordsWithTFIDF,
  getTopKeywords,
  tokenize,
  STOPWORDS,
} from '../../src/reflexion/keywords.js';
import type { ReflectionInput } from '../../src/reflexion/types.js';

describe('tokenize', () => {
  it('converts text to lowercase tokens', () => {
    const tokens = tokenize('Running TESTS independently');
    expect(tokens).toContain('running');
    expect(tokens).toContain('tests');
    expect(tokens).toContain('independently');
  });

  it('removes punctuation', () => {
    const tokens = tokenize('What worked: tests, coverage, and quality!');
    expect(tokens).not.toContain('worked:');
    expect(tokens).not.toContain('tests,');
    expect(tokens).not.toContain('quality!');
    expect(tokens).toContain('tests');
    expect(tokens).toContain('coverage');
    expect(tokens).toContain('quality');
  });

  it('filters stopwords', () => {
    const tokens = tokenize('The testing is good and the results are better');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('and');
    expect(tokens).not.toContain('is');
    expect(tokens).not.toContain('are');
  });

  it('filters reflection-specific stopwords', () => {
    const tokens = tokenize('What worked: better lesson improve issue');
    expect(tokens).not.toContain('worked');
    expect(tokens).not.toContain('lesson');
    expect(tokens).not.toContain('improve');
    expect(tokens).not.toContain('issue');
  });

  it('filters short words', () => {
    const tokens = tokenize('an API is ok to use');
    expect(tokens).not.toContain('an');
    expect(tokens).not.toContain('is');
    expect(tokens).not.toContain('ok');
    expect(tokens).not.toContain('to');
    expect(tokens).toContain('api');
  });
});

describe('extractKeywords', () => {
  it('extracts meaningful keywords from reflection', () => {
    const reflection: ReflectionInput = {
      cycle: 'C450',
      role: 'engineering',
      whatWorked: 'Running tests independently gives faster feedback.',
    };

    const keywords = extractKeywords(reflection);

    // Role tag should be first
    expect(keywords[0].term).toBe('role:engineering');
    expect(keywords[0].roleTag).toBe('engineering');

    // Should contain meaningful terms
    const terms = keywords.map((k) => k.term);
    expect(terms).toContain('tests');
    expect(terms).toContain('feedback');
    expect(terms).toContain('faster');
    expect(terms).toContain('independently');
  });

  it('includes role tag for cross-role detection', () => {
    const reflection: ReflectionInput = {
      cycle: 'C452',
      role: 'design',
      whatWorked: 'TypeScript samples accelerate implementation.',
    };

    const keywords = extractKeywords(reflection);

    expect(keywords[0].roleTag).toBe('design');
    expect(keywords[0].term).toBe('role:design');
    expect(keywords[0].weight).toBe(1.0);
  });

  it('combines whatWorked and lessonLearned', () => {
    const reflection: ReflectionInput = {
      cycle: 'C453',
      role: 'qa',
      whatWorked: 'Coverage reports helped identify gaps.',
      lessonLearned: 'Automated testing catches regressions.',
    };

    const keywords = extractKeywords(reflection);
    const terms = keywords.map((k) => k.term);

    expect(terms).toContain('coverage');
    expect(terms).toContain('automated');
    expect(terms).toContain('testing');
  });

  it('handles empty reflection gracefully', () => {
    const reflection: ReflectionInput = {
      cycle: 'C454',
      role: 'ops',
      whatWorked: '',
    };

    const keywords = extractKeywords(reflection);

    // Should still have role tag
    expect(keywords.length).toBe(1);
    expect(keywords[0].term).toBe('role:ops');
  });

  it('normalizes weights by term frequency', () => {
    const reflection: ReflectionInput = {
      cycle: 'C455',
      role: 'engineering',
      whatWorked: 'Tests tests tests coverage coverage',
    };

    const keywords = extractKeywords(reflection);
    const testsKw = keywords.find((k) => k.term === 'tests');
    const coverageKw = keywords.find((k) => k.term === 'coverage');

    expect(testsKw).toBeDefined();
    expect(coverageKw).toBeDefined();
    // 'tests' appears 3x, 'coverage' 2x, total 5 tokens
    expect(testsKw?.weight).toBeCloseTo(3 / 5);
    expect(coverageKw?.weight).toBeCloseTo(2 / 5);
  });
});

describe('extractKeywordsWithTFIDF', () => {
  it('weights rare terms higher than common terms', () => {
    const reflections: ReflectionInput[] = [
      { cycle: 'C1', role: 'engineering', whatWorked: 'tests verification' },
      { cycle: 'C2', role: 'qa', whatWorked: 'tests coverage quality' },
      { cycle: 'C3', role: 'engineering', whatWorked: 'tests implementation' },
    ];

    const result = extractKeywordsWithTFIDF(reflections);

    // 'tests' appears in all 3 → low IDF
    // 'quality' appears in 1 → high IDF
    const c2Keywords = result.get('C2');
    expect(c2Keywords).toBeDefined();
    const testsWeight =
      c2Keywords?.find((k) => k.term === 'tests')?.weight ?? 0;
    const qualityWeight =
      c2Keywords.find((k) => k.term === 'quality')?.weight ?? 0;

    // Quality should have higher TF-IDF weight
    expect(qualityWeight).toBeGreaterThan(testsWeight);
  });

  it('preserves role tag weight at 1.0', () => {
    const reflections: ReflectionInput[] = [
      { cycle: 'C1', role: 'engineering', whatWorked: 'tests quality' },
      { cycle: 'C2', role: 'qa', whatWorked: 'tests coverage' },
    ];

    const result = extractKeywordsWithTFIDF(reflections);

    for (const keywords of result.values()) {
      const roleTag = keywords.find((k) => k.roleTag !== undefined);
      expect(roleTag?.weight).toBe(1.0);
    }
  });

  it('handles empty input', () => {
    const result = extractKeywordsWithTFIDF([]);
    expect(result.size).toBe(0);
  });

  it('keeps role tag first after re-sorting', () => {
    const reflections: ReflectionInput[] = [
      { cycle: 'C1', role: 'engineering', whatWorked: 'unique specialized term' },
    ];

    const result = extractKeywordsWithTFIDF(reflections);
    const keywords = result.get('C1');
    expect(keywords).toBeDefined();
    expect(keywords?.[0].term).toBe('role:engineering');
  });
});

describe('getTopKeywords', () => {
  it('returns top N keywords by aggregate weight', () => {
    const keywordSets = [
      [
        { term: 'tests', weight: 0.5 },
        { term: 'coverage', weight: 0.3 },
        { term: 'quality', weight: 0.2 },
      ],
      [
        { term: 'tests', weight: 0.4 },
        { term: 'automation', weight: 0.4 },
        { term: 'coverage', weight: 0.2 },
      ],
    ];

    const top = getTopKeywords(keywordSets, 2);

    // 'tests' has aggregate 0.9, 'coverage' has 0.5, 'automation' has 0.4
    expect(top).toEqual(['tests', 'coverage']);
  });

  it('excludes role tags by default', () => {
    const keywordSets = [
      [
        { term: 'role:engineering', weight: 1.0, roleTag: 'engineering' as const },
        { term: 'tests', weight: 0.5 },
      ],
    ];

    const top = getTopKeywords(keywordSets, 5);

    expect(top).not.toContain('role:engineering');
    expect(top).toContain('tests');
  });

  it('includes role tags when requested', () => {
    const keywordSets = [
      [
        { term: 'role:qa', weight: 1.0, roleTag: 'qa' as const },
        { term: 'tests', weight: 0.5 },
      ],
    ];

    const top = getTopKeywords(keywordSets, 5, false);

    expect(top).toContain('role:qa');
  });

  it('handles empty input', () => {
    const top = getTopKeywords([], 5);
    expect(top).toEqual([]);
  });
});

describe('STOPWORDS', () => {
  it('contains common English stopwords', () => {
    expect(STOPWORDS.has('the')).toBe(true);
    expect(STOPWORDS.has('and')).toBe(true);
    expect(STOPWORDS.has('is')).toBe(true);
  });

  it('contains reflection-specific stopwords', () => {
    expect(STOPWORDS.has('worked')).toBe(true);
    expect(STOPWORDS.has('lesson')).toBe(true);
    expect(STOPWORDS.has('improve')).toBe(true);
    expect(STOPWORDS.has('better')).toBe(true);
  });
});
