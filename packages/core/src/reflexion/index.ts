/**
 * @ada-ai/core — Reflexion Phase 2
 *
 * Pattern extraction from reflection history using keyword clustering.
 * Based on Reflexion paper (Shinn et al. 2023).
 *
 * @module reflexion
 * @see docs/frontier/reflexion-phase2-impl-spec-c469.md
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type {
  ExtractedKeyword,
  ReflectionCluster,
  ReflexionPattern,
  PatternExtractionConfig,
  PatternStatus,
  ExtractionMethod,
  ReflectionInput,
} from './types.js';

// ─── Keyword Extraction ──────────────────────────────────────────────────────

export {
  extractKeywords,
  extractKeywordsWithTFIDF,
  getTopKeywords,
  tokenize,
  STOPWORDS,
  MAX_KEYWORDS_PER_REFLECTION,
  MIN_WORD_LENGTH,
} from './keywords.js';

// ─── Clustering ──────────────────────────────────────────────────────────────

export {
  clusterReflections,
  jaccardSimilarity,
  DEFAULT_SIMILARITY_THRESHOLD,
  DEFAULT_MIN_CLUSTER_SIZE,
  DEFAULT_RECENT_WINDOW,
} from './clusters.js';

// ─── Confidence Scoring ──────────────────────────────────────────────────────

export {
  calculateConfidence,
  isCrossRolePattern,
  generateTheme,
  generateDescription,
  getConfidenceBreakdown,
  DEFAULT_CONFIDENCE_THRESHOLD,
} from './confidence.js';

// ─── Pattern Detection ───────────────────────────────────────────────────────

export {
  extractPatterns,
  generateLessonSuggestion,
  generateDetailedLesson,
  filterByStatus,
  filterByRole,
  getCrossRolePatterns,
  isValidConfig,
  DEFAULT_PATTERN_CONFIG,
} from './patterns.js';
