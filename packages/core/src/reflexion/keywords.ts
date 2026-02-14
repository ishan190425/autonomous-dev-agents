/**
 * @ada-ai/core — Keyword Extraction for Reflexion Phase 2
 *
 * Extracts keywords from reflections using TF-IDF weighting.
 * Foundation for clustering and pattern detection.
 *
 * @see docs/frontier/reflexion-phase2-impl-spec-c469.md
 */

import type { ExtractedKeyword, ReflectionInput } from './types.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Stopwords to filter from keyword extraction.
 * Curated for ADA reflection context — includes common words and
 * generic reflection terms that don't carry pattern signal.
 */
export const STOPWORDS = new Set([
  // Common English stopwords
  'the',
  'a',
  'an',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'shall',
  'can',
  'need',
  'dare',
  'to',
  'of',
  'in',
  'for',
  'on',
  'with',
  'at',
  'by',
  'from',
  'as',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'under',
  'again',
  'further',
  'then',
  'once',
  'and',
  'but',
  'or',
  'nor',
  'so',
  'yet',
  'both',
  'either',
  'neither',
  'not',
  'only',
  'own',
  'same',
  'than',
  'too',
  'very',
  'this',
  'that',
  'these',
  'those',
  'what',
  'which',
  'who',
  'whom',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'every',
  'any',
  'some',
  'no',
  'more',
  'most',
  'other',
  'such',
  'just',
  'also',
  'now',
  'here',
  'there',
  'well',
  'out',
  'up',
  'down',
  'about',
  'over',
  // Reflection-specific (too generic to be useful)
  'worked',
  'work',
  'working',
  'lesson',
  'lessons',
  'learned',
  'learning',
  'improve',
  'improved',
  'improvement',
  'better',
  'best',
  'good',
  'great',
  'bad',
  'issue',
  'issues',
  'thing',
  'things',
  'way',
  'ways',
  'time',
  'times',
  'cycle',
  'cycles',
  'action',
  'actions',
  'approach',
  'result',
  'results',
  'make',
  'makes',
  'making',
  'made',
  'helps',
  'helped',
  'help',
  'helping',
  'use',
  'used',
  'using',
  'uses',
]);

/** Maximum keywords to extract per reflection */
export const MAX_KEYWORDS_PER_REFLECTION = 10;

/** Minimum word length to consider */
export const MIN_WORD_LENGTH = 3;

// ─── Tokenization ────────────────────────────────────────────────────────────

/**
 * Tokenize text into normalized word tokens.
 * Removes punctuation, converts to lowercase, filters stopwords and short words.
 *
 * @param text - Raw text to tokenize
 * @returns Array of normalized tokens
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ') // Keep only alphanumeric, spaces, hyphens
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= MIN_WORD_LENGTH && !STOPWORDS.has(token)
    );
}

// ─── Keyword Extraction ──────────────────────────────────────────────────────

/**
 * Extract keywords from a single reflection.
 * Uses term frequency (TF) weighting within the document.
 * Includes a role tag for cross-role pattern detection per C468.
 *
 * @param reflection - Reflection data to extract keywords from
 * @returns Array of extracted keywords sorted by weight (descending)
 */
export function extractKeywords(reflection: ReflectionInput): ExtractedKeyword[] {
  // Combine whatWorked and lessonLearned for more context
  const text = [reflection.whatWorked, reflection.lessonLearned]
    .filter(Boolean)
    .join(' ');

  const tokens = tokenize(text);

  if (tokens.length === 0) {
    // Still include role tag even with no other keywords
    return [
      {
        term: `role:${reflection.role}`,
        weight: 1.0,
        roleTag: reflection.role,
      },
    ];
  }

  // Count term frequency
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }

  // Convert to weighted keywords (normalized by total tokens)
  const keywords: ExtractedKeyword[] = Array.from(freq.entries())
    .map(([term, count]) => ({
      term,
      weight: count / tokens.length, // Term frequency (TF)
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_KEYWORDS_PER_REFLECTION);

  // Add role tag at the front for cross-role detection (C468 recommendation)
  keywords.unshift({
    term: `role:${reflection.role}`,
    weight: 1.0, // Role tag always has full weight
    roleTag: reflection.role,
  });

  return keywords;
}

/**
 * Extract keywords from multiple reflections with TF-IDF weighting.
 * IDF (Inverse Document Frequency) downweights terms that appear in many reflections.
 *
 * @param reflections - Array of reflections to process
 * @returns Map from cycle ID to extracted keywords
 */
export function extractKeywordsWithTFIDF(
  reflections: readonly ReflectionInput[]
): Map<string, ExtractedKeyword[]> {
  if (reflections.length === 0) {
    return new Map();
  }

  // Document frequency: how many reflections contain each term
  const docFreq = new Map<string, number>();
  const reflectionKeywords = new Map<string, ExtractedKeyword[]>();

  // First pass: extract per-reflection and count document frequency
  for (const reflection of reflections) {
    const keywords = extractKeywords(reflection);
    reflectionKeywords.set(reflection.cycle, keywords);

    const seen = new Set<string>();
    for (const kw of keywords) {
      if (!seen.has(kw.term)) {
        docFreq.set(kw.term, (docFreq.get(kw.term) ?? 0) + 1);
        seen.add(kw.term);
      }
    }
  }

  // Second pass: apply IDF weighting
  const n = reflections.length;
  for (const [cycle, keywords] of reflectionKeywords) {
    for (const kw of keywords) {
      // Skip role tags from IDF adjustment (they should stay at weight 1.0)
      if (kw.roleTag !== undefined) {
        continue;
      }

      const df = docFreq.get(kw.term) ?? 1;
      // IDF = log(N / df) — terms in fewer docs get higher weight
      const idf = Math.log(n / df);
      kw.weight = kw.weight * idf;
    }

    // Re-sort by new weights (keeping role tag first)
    const roleTag = keywords.find((k) => k.roleTag !== undefined);
    const others = keywords
      .filter((k) => k.roleTag === undefined)
      .sort((a, b) => b.weight - a.weight);

    reflectionKeywords.set(
      cycle,
      roleTag ? [roleTag, ...others] : others
    );
  }

  return reflectionKeywords;
}

/**
 * Get the top N keywords from a collection of keyword sets.
 * Aggregates by term frequency across all sets.
 *
 * @param keywordSets - Array of keyword arrays to aggregate
 * @param topN - Number of top keywords to return (default: 5)
 * @param excludeRoleTags - Whether to exclude role:* tags (default: true)
 * @returns Array of top keyword terms
 */
export function getTopKeywords(
  keywordSets: readonly (readonly ExtractedKeyword[])[],
  topN: number = 5,
  excludeRoleTags: boolean = true
): string[] {
  const aggregate = new Map<string, number>();

  for (const keywords of keywordSets) {
    for (const kw of keywords) {
      if (excludeRoleTags && kw.roleTag !== undefined) {
        continue;
      }
      aggregate.set(kw.term, (aggregate.get(kw.term) ?? 0) + kw.weight);
    }
  }

  return Array.from(aggregate.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([term]) => term);
}
