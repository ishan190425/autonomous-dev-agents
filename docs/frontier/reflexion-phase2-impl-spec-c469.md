# 🌌 Reflexion Phase 2 Implementation Spec

> Engineering-ready spec for pattern extraction from reflections.
> Synthesizes Research C468 methodology into implementable code specifications.
> **Author:** 🌌 Frontier (The Frontier)
> **Cycle:** 469
> **Date:** 2026-02-12
> **Sprint 2 Week:** 1-2 (Feb 28 - Mar 7)
> **Related:** #108, C459 (Frontier Roadmap), C468 (Pattern Extraction Methodology)

---

## Executive Summary

This spec translates Research C468's pattern extraction methodology into engineering-ready code. The key decision: **keyword clustering for MVP, with optional embedding enhancement**.

**Why this matters:** Reflexion Phase 2 enables automatic pattern detection → lesson extraction → playbook updates. This is the core of ADA's self-improvement loop.

**Scope:** Core library + CLI commands for pattern extraction.

---

## Architecture

### File Structure

```
packages/core/src/reflexion/
├── index.ts                    # Barrel exports
├── types.ts                    # Shared types (existing)
├── keywords.ts                 # NEW: Keyword extraction
├── clusters.ts                 # NEW: Clustering algorithm
├── patterns.ts                 # NEW: Pattern detection orchestration
├── confidence.ts               # NEW: Confidence scoring
└── __tests__/
    ├── keywords.test.ts
    ├── clusters.test.ts
    ├── patterns.test.ts
    └── confidence.test.ts

packages/cli/src/commands/
├── reflexion/
│   ├── index.ts                # Command group
│   ├── patterns.ts             # NEW: ada reflexion patterns
│   ├── suggest.ts              # NEW: ada reflexion suggest
│   └── accept.ts               # NEW: ada reflexion accept/reject
```

---

## Core Library Implementation

### 1. Types (`types.ts` additions)

```typescript
// packages/core/src/reflexion/types.ts

/**
 * Keyword extracted from a reflection with optional role tag.
 */
export interface ExtractedKeyword {
  term: string;
  weight: number; // TF-IDF or frequency-based
  roleTag?: string; // e.g., "role:engineering" for cross-role detection
}

/**
 * A cluster of reflections sharing similar keywords.
 */
export interface ReflectionCluster {
  id: string; // UUID
  keywords: string[]; // Top 3-5 representative keywords
  reflectionIds: string[]; // Cycle IDs (e.g., "C450", "C463")
  roleDistribution: Record<string, number>; // { engineering: 5, qa: 3 }
  size: number;
  recentCount: number; // Reflections within last 50 cycles
  cohesion: number; // 0-1, how similar the reflections are
}

/**
 * A detected pattern with confidence scoring.
 */
export interface ReflexionPattern {
  id: string;
  theme: string; // Human-readable pattern name
  description: string; // What the pattern represents
  keywords: string[];
  confidence: number; // 0.0 - 1.0
  sourceCluster: ReflectionCluster;
  crossRole: boolean; // Involves 2+ roles
  roles: string[]; // Roles involved
  suggestedLesson?: string; // Draft lesson text
  status: 'candidate' | 'accepted' | 'rejected';
  detectedAt: number; // Unix timestamp
}

/**
 * Configuration for pattern extraction.
 */
export interface PatternExtractionConfig {
  method: 'keyword' | 'hybrid';
  confidenceThreshold: number; // Default 0.7 per Reflexion paper
  minClusterSize: number; // Default 3 reflections
  recentCycleWindow: number; // Default 50 cycles
  maxPatterns: number; // Default 10
}
```

### 2. Keyword Extraction (`keywords.ts`)

```typescript
// packages/core/src/reflexion/keywords.ts

import { Reflection, ExtractedKeyword } from './types.js';

/**
 * Stopwords to filter from keyword extraction.
 * Curated for ADA reflection context.
 */
const STOPWORDS = new Set([
  // Common
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
  // Reflection-specific (too generic)
  'worked',
  'lesson',
  'improve',
  'better',
  'good',
  'bad',
  'issue',
]);

/**
 * Extract keywords from a reflection's whatWorked field.
 * Includes role tag for cross-role pattern detection per C468.
 */
export function extractKeywords(reflection: Reflection): ExtractedKeyword[] {
  const { whatWorked, role, cycle } = reflection;
  const text = whatWorked.toLowerCase();

  // Simple noun phrase extraction via tokenization
  const tokens = text
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));

  // Count frequency
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }

  // Convert to weighted keywords
  const keywords: ExtractedKeyword[] = Array.from(freq.entries())
    .map(([term, count]) => ({
      term,
      weight: count / tokens.length, // Normalized frequency
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10); // Top 10 keywords per reflection

  // Add role tag for cross-role detection (C468 recommendation)
  keywords.unshift({
    term: `role:${role}`,
    weight: 1.0, // Role tag always included
    roleTag: role,
  });

  return keywords;
}

/**
 * Extract keywords from multiple reflections with TF-IDF weighting.
 */
export function extractKeywordsWithTFIDF(
  reflections: Reflection[]
): Map<string, ExtractedKeyword[]> {
  // Document frequency for each term
  const docFreq = new Map<string, number>();
  const reflectionKeywords = new Map<string, ExtractedKeyword[]>();

  // First pass: extract per-reflection and count doc frequency
  for (const reflection of reflections) {
    const keywords = extractKeywords(reflection);
    reflectionKeywords.set(reflection.cycle, keywords);

    const seen = new Set<string>();
    for (const kw of keywords) {
      if (!seen.has(kw.term)) {
        docFreq.set(kw.term, (docFreq.get(kw.term) || 0) + 1);
        seen.add(kw.term);
      }
    }
  }

  // Second pass: apply IDF weighting
  const n = reflections.length;
  for (const [cycle, keywords] of reflectionKeywords) {
    for (const kw of keywords) {
      const df = docFreq.get(kw.term) || 1;
      const idf = Math.log(n / df);
      kw.weight = kw.weight * idf;
    }
    // Re-sort by new weights
    keywords.sort((a, b) => b.weight - a.weight);
  }

  return reflectionKeywords;
}
```

### 3. Clustering Algorithm (`clusters.ts`)

```typescript
// packages/core/src/reflexion/clusters.ts

import { Reflection, ExtractedKeyword, ReflectionCluster } from './types.js';
import { extractKeywordsWithTFIDF } from './keywords.js';

/**
 * Calculate Jaccard similarity between two keyword sets.
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Cluster reflections by keyword similarity.
 * Uses single-linkage agglomerative clustering with Jaccard > 0.3 threshold.
 */
export function clusterReflections(
  reflections: Reflection[],
  minClusterSize: number = 3,
  similarityThreshold: number = 0.3
): ReflectionCluster[] {
  const keywordsMap = extractKeywordsWithTFIDF(reflections);

  // Build keyword sets for each reflection (top 5 keywords only)
  const keywordSets = new Map<string, Set<string>>();
  for (const [cycle, keywords] of keywordsMap) {
    keywordSets.set(cycle, new Set(keywords.slice(0, 5).map(k => k.term)));
  }

  // Initialize each reflection as its own cluster
  const clusters: Map<string, Set<string>> = new Map();
  for (const cycle of keywordSets.keys()) {
    clusters.set(cycle, new Set([cycle]));
  }

  // Agglomerative clustering
  let merged = true;
  while (merged) {
    merged = false;
    const clusterIds = Array.from(clusters.keys());

    for (let i = 0; i < clusterIds.length && !merged; i++) {
      for (let j = i + 1; j < clusterIds.length && !merged; j++) {
        const c1 = clusters.get(clusterIds[i])!;
        const c2 = clusters.get(clusterIds[j])!;

        // Check if any pair of reflections exceeds similarity threshold
        for (const r1 of c1) {
          for (const r2 of c2) {
            const sim = jaccardSimilarity(
              keywordSets.get(r1)!,
              keywordSets.get(r2)!
            );
            if (sim >= similarityThreshold) {
              // Merge c2 into c1
              for (const r of c2) c1.add(r);
              clusters.delete(clusterIds[j]);
              merged = true;
              break;
            }
          }
          if (merged) break;
        }
      }
    }
  }

  // Convert to ReflectionCluster objects
  const result: ReflectionCluster[] = [];
  let clusterId = 0;

  for (const [_, members] of clusters) {
    if (members.size < minClusterSize) continue;

    const memberReflections = reflections.filter(r => members.has(r.cycle));

    // Aggregate keywords across cluster
    const keywordFreq = new Map<string, number>();
    const roleCount: Record<string, number> = {};

    for (const r of memberReflections) {
      const kws = keywordsMap.get(r.cycle) || [];
      for (const kw of kws.slice(0, 5)) {
        keywordFreq.set(kw.term, (keywordFreq.get(kw.term) || 0) + 1);
      }
      roleCount[r.role] = (roleCount[r.role] || 0) + 1;
    }

    // Top keywords for this cluster
    const topKeywords = Array.from(keywordFreq.entries())
      .filter(([term]) => !term.startsWith('role:')) // Exclude role tags from display
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([term]) => term);

    // Calculate cohesion (average pairwise similarity)
    const memberArray = Array.from(members);
    let totalSim = 0;
    let pairs = 0;
    for (let i = 0; i < memberArray.length; i++) {
      for (let j = i + 1; j < memberArray.length; j++) {
        totalSim += jaccardSimilarity(
          keywordSets.get(memberArray[i])!,
          keywordSets.get(memberArray[j])!
        );
        pairs++;
      }
    }
    const cohesion = pairs > 0 ? totalSim / pairs : 0;

    // Count recent reflections (last 50 cycles)
    const maxCycle = Math.max(
      ...memberReflections.map(r => parseInt(r.cycle.replace('C', '')))
    );
    const recentCount = memberReflections.filter(r => {
      const cycleNum = parseInt(r.cycle.replace('C', ''));
      return maxCycle - cycleNum <= 50;
    }).length;

    result.push({
      id: `cluster-${clusterId++}`,
      keywords: topKeywords,
      reflectionIds: Array.from(members).sort(),
      roleDistribution: roleCount,
      size: members.size,
      recentCount,
      cohesion,
    });
  }

  // Sort by size descending
  return result.sort((a, b) => b.size - a.size);
}
```

### 4. Confidence Scoring (`confidence.ts`)

```typescript
// packages/core/src/reflexion/confidence.ts

import { ReflectionCluster, ReflexionPattern } from './types.js';

/**
 * Calculate pattern confidence per Reflexion paper (Shinn et al. 2023).
 * Uses size, cohesion, and recency as weighted factors.
 *
 * Formula: 0.4 * sizeScore + 0.4 * cohesionScore + 0.2 * recencyScore
 */
export function calculateConfidence(cluster: ReflectionCluster): number {
  // Size score: caps at 10 reflections
  const sizeScore = Math.min(cluster.size / 10, 1.0);

  // Cohesion score: already 0-1 from cluster calculation
  const cohesionScore = cluster.cohesion;

  // Recency score: fraction of cluster that's recent
  const recencyScore =
    cluster.size > 0 ? cluster.recentCount / cluster.size : 0;

  // Weighted average per C468 recommendation
  return 0.4 * sizeScore + 0.4 * cohesionScore + 0.2 * recencyScore;
}

/**
 * Determine if a cluster represents a cross-role pattern.
 * Cross-role = 2+ roles each with 2+ reflections.
 */
export function isCrossRolePattern(cluster: ReflectionCluster): boolean {
  const significantRoles = Object.values(cluster.roleDistribution).filter(
    count => count >= 2
  );
  return significantRoles.length >= 2;
}

/**
 * Generate a theme name from cluster keywords.
 */
export function generateTheme(cluster: ReflectionCluster): string {
  const keywords = cluster.keywords.slice(0, 3);
  if (keywords.length === 0) return 'Unnamed Pattern';

  // Capitalize and join
  return keywords.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' + ');
}

/**
 * Generate a description for the pattern.
 */
export function generateDescription(
  cluster: ReflectionCluster,
  crossRole: boolean
): string {
  const roleList = Object.keys(cluster.roleDistribution);
  const keywordList = cluster.keywords.slice(0, 3).join(', ');

  if (crossRole) {
    return `Cross-role pattern involving ${roleList.join(', ')} around: ${keywordList}. Detected in ${cluster.size} reflections.`;
  }
  return `Pattern around: ${keywordList}. Detected in ${cluster.size} reflections from ${roleList.join(', ')}.`;
}
```

### 5. Pattern Detection Orchestration (`patterns.ts`)

```typescript
// packages/core/src/reflexion/patterns.ts

import { v4 as uuidv4 } from 'uuid';
import {
  Reflection,
  ReflexionPattern,
  PatternExtractionConfig,
} from './types.js';
import { clusterReflections } from './clusters.js';
import {
  calculateConfidence,
  isCrossRolePattern,
  generateTheme,
  generateDescription,
} from './confidence.js';

/**
 * Default configuration for pattern extraction.
 * Confidence threshold 0.7 per Reflexion paper (Shinn et al. 2023).
 */
export const DEFAULT_PATTERN_CONFIG: PatternExtractionConfig = {
  method: 'keyword',
  confidenceThreshold: 0.7,
  minClusterSize: 3,
  recentCycleWindow: 50,
  maxPatterns: 10,
};

/**
 * Extract patterns from reflection history.
 * Main entry point for Reflexion Phase 2.
 */
export async function extractPatterns(
  reflections: Reflection[],
  config: Partial<PatternExtractionConfig> = {}
): Promise<ReflexionPattern[]> {
  const fullConfig = { ...DEFAULT_PATTERN_CONFIG, ...config };

  // Step 1: Cluster reflections by keyword similarity
  const clusters = clusterReflections(reflections, fullConfig.minClusterSize);

  // Step 2: Convert clusters to patterns with confidence scoring
  const patterns: ReflexionPattern[] = [];

  for (const cluster of clusters) {
    const confidence = calculateConfidence(cluster);

    // Filter by confidence threshold
    if (confidence < fullConfig.confidenceThreshold) continue;

    const crossRole = isCrossRolePattern(cluster);
    const theme = generateTheme(cluster);
    const description = generateDescription(cluster, crossRole);

    patterns.push({
      id: uuidv4(),
      theme,
      description,
      keywords: cluster.keywords,
      confidence,
      sourceCluster: cluster,
      crossRole,
      roles: Object.keys(cluster.roleDistribution),
      status: 'candidate',
      detectedAt: Date.now(),
    });
  }

  // Step 3: Sort by confidence and limit
  return patterns
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, fullConfig.maxPatterns);
}

/**
 * Generate a suggested lesson from a pattern.
 * Uses a template-based approach for MVP.
 */
export function generateLessonSuggestion(pattern: ReflexionPattern): string {
  const { theme, crossRole, roles, sourceCluster } = pattern;

  if (crossRole) {
    return `**L-NEW:** Cross-role coordination between ${roles.join(' and ')} improves outcomes around ${theme.toLowerCase()}. (Detected in ${sourceCluster.size} cycles)`;
  }

  return `**L-NEW:** Pattern detected around ${theme.toLowerCase()} — review ${sourceCluster.reflectionIds.slice(0, 3).join(', ')} for insights. (${sourceCluster.size} occurrences)`;
}
```

### 6. Index Exports (`index.ts`)

```typescript
// packages/core/src/reflexion/index.ts

// Types
export type {
  Reflection,
  ExtractedKeyword,
  ReflectionCluster,
  ReflexionPattern,
  PatternExtractionConfig,
} from './types.js';

// Functions
export { extractKeywords, extractKeywordsWithTFIDF } from './keywords.js';
export { clusterReflections } from './clusters.js';
export {
  calculateConfidence,
  isCrossRolePattern,
  generateTheme,
  generateDescription,
} from './confidence.js';
export {
  extractPatterns,
  generateLessonSuggestion,
  DEFAULT_PATTERN_CONFIG,
} from './patterns.js';
```

---

## CLI Implementation

### Command: `ada reflexion patterns`

```typescript
// packages/cli/src/commands/reflexion/patterns.ts

import { Command } from 'commander';
import { extractPatterns, ReflexionPattern } from '@ada/core';
import { loadReflectionHistory } from '../../utils/reflection-loader.js';
import { formatTable, formatBox } from '../../utils/format.js';

export const patternsCommand = new Command('patterns')
  .description('Detect patterns from reflection history')
  .option('-t, --threshold <number>', 'Confidence threshold (0-1)', '0.7')
  .option('-n, --max <number>', 'Maximum patterns to return', '10')
  .option('--json', 'Output as JSON')
  .action(async options => {
    // Load reflections from rotation.json history
    const reflections = await loadReflectionHistory();
    console.log(`📊 Analyzing ${reflections.length} reflections...\n`);

    const patterns = await extractPatterns(reflections, {
      confidenceThreshold: parseFloat(options.threshold),
      maxPatterns: parseInt(options.max),
    });

    if (options.json) {
      console.log(JSON.stringify(patterns, null, 2));
      return;
    }

    if (patterns.length === 0) {
      console.log('No patterns detected above confidence threshold.');
      return;
    }

    // Display patterns
    console.log(
      formatBox('🔍 Detected Patterns', `${patterns.length} patterns found`)
    );

    for (const pattern of patterns) {
      const crossRoleTag = pattern.crossRole ? ' 🔄' : '';
      console.log(`\n${pattern.theme}${crossRoleTag}`);
      console.log(`  Confidence: ${(pattern.confidence * 100).toFixed(0)}%`);
      console.log(`  Roles: ${pattern.roles.join(', ')}`);
      console.log(`  Keywords: ${pattern.keywords.join(', ')}`);
      console.log(
        `  Sources: ${pattern.sourceCluster.reflectionIds.length} reflections`
      );
      console.log(`  ID: ${pattern.id.slice(0, 8)}`);
    }

    console.log('\n💡 Use `ada reflexion suggest <id>` to generate lesson.');
  });
```

### Command: `ada reflexion suggest`

```typescript
// packages/cli/src/commands/reflexion/suggest.ts

import { Command } from 'commander';
import { generateLessonSuggestion, ReflexionPattern } from '@ada/core';
import {
  loadPatternCache,
  savePatternCache,
} from '../../utils/pattern-cache.js';
import { formatBox } from '../../utils/format.js';

export const suggestCommand = new Command('suggest')
  .description('Generate lesson suggestion from a pattern')
  .argument('[pattern-id]', 'Pattern ID (from patterns command)')
  .option('--all', 'Generate suggestions for all candidate patterns')
  .action(async (patternId, options) => {
    const cache = await loadPatternCache();

    if (options.all) {
      const candidates = cache.patterns.filter(p => p.status === 'candidate');
      console.log(
        formatBox('💡 Lesson Suggestions', `${candidates.length} patterns`)
      );

      for (const pattern of candidates) {
        const suggestion = generateLessonSuggestion(pattern);
        console.log(`\n[${pattern.id.slice(0, 8)}] ${pattern.theme}`);
        console.log(`  ${suggestion}`);
      }
      return;
    }

    if (!patternId) {
      console.error('Usage: ada reflexion suggest <pattern-id>');
      console.error('       ada reflexion suggest --all');
      process.exit(1);
    }

    const pattern = cache.patterns.find(p => p.id.startsWith(patternId));
    if (!pattern) {
      console.error(`Pattern not found: ${patternId}`);
      process.exit(1);
    }

    const suggestion = generateLessonSuggestion(pattern);
    console.log(formatBox(`💡 Suggested Lesson`, pattern.theme));
    console.log(`\n${suggestion}\n`);
    console.log('To accept: ada reflexion accept ' + patternId);
    console.log('To reject: ada reflexion reject ' + patternId);
  });
```

---

## Test Specifications

### Unit Tests

```typescript
// packages/core/src/reflexion/__tests__/keywords.test.ts

import { describe, it, expect } from 'vitest';
import { extractKeywords, extractKeywordsWithTFIDF } from '../keywords.js';

describe('extractKeywords', () => {
  it('extracts meaningful keywords from reflection', () => {
    const reflection = {
      cycle: 'C450',
      role: 'engineering',
      whatWorked:
        'What worked: Running tests independently gives faster feedback.',
    };

    const keywords = extractKeywords(reflection);

    expect(keywords[0].term).toBe('role:engineering'); // Role tag first
    expect(keywords.some(k => k.term === 'tests')).toBe(true);
    expect(keywords.some(k => k.term === 'feedback')).toBe(true);
  });

  it('filters stopwords', () => {
    const reflection = {
      cycle: 'C451',
      role: 'qa',
      whatWorked: 'The testing is good and the results are better.',
    };

    const keywords = extractKeywords(reflection);
    const terms = keywords.map(k => k.term);

    expect(terms).not.toContain('the');
    expect(terms).not.toContain('and');
    expect(terms).not.toContain('is');
  });

  it('includes role tag for cross-role detection', () => {
    const reflection = {
      cycle: 'C452',
      role: 'design',
      whatWorked: 'TypeScript samples accelerate implementation.',
    };

    const keywords = extractKeywords(reflection);

    expect(keywords[0].roleTag).toBe('design');
    expect(keywords[0].term).toBe('role:design');
  });
});

describe('extractKeywordsWithTFIDF', () => {
  it('weights rare terms higher than common terms', () => {
    const reflections = [
      { cycle: 'C1', role: 'engineering', whatWorked: 'tests verification' },
      { cycle: 'C2', role: 'qa', whatWorked: 'tests coverage quality' },
      { cycle: 'C3', role: 'engineering', whatWorked: 'tests implementation' },
    ];

    const result = extractKeywordsWithTFIDF(reflections);

    // 'tests' appears in all 3 → low IDF
    // 'quality' appears in 1 → high IDF
    const c2Keywords = result.get('C2')!;
    const testsWeight = c2Keywords.find(k => k.term === 'tests')?.weight || 0;
    const qualityWeight =
      c2Keywords.find(k => k.term === 'quality')?.weight || 0;

    // Quality should have higher TF-IDF weight
    expect(qualityWeight).toBeGreaterThan(testsWeight);
  });
});
```

```typescript
// packages/core/src/reflexion/__tests__/patterns.test.ts

import { describe, it, expect } from 'vitest';
import { extractPatterns } from '../patterns.js';

describe('extractPatterns', () => {
  it('detects patterns from similar reflections', async () => {
    const reflections = [
      {
        cycle: 'C1',
        role: 'engineering',
        whatWorked: 'Tests with coverage improve quality.',
      },
      {
        cycle: 'C2',
        role: 'engineering',
        whatWorked: 'Running tests improves coverage.',
      },
      {
        cycle: 'C3',
        role: 'engineering',
        whatWorked: 'Test coverage is important for quality.',
      },
      {
        cycle: 'C4',
        role: 'qa',
        whatWorked: 'Quality assurance needs coverage testing.',
      },
    ];

    const patterns = await extractPatterns(reflections, {
      minClusterSize: 3,
      confidenceThreshold: 0.5, // Lower for test
    });

    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].keywords).toContain('tests');
  });

  it('detects cross-role patterns', async () => {
    const reflections = [
      {
        cycle: 'C1',
        role: 'engineering',
        whatWorked: 'Coordination with QA speeds verification.',
      },
      {
        cycle: 'C2',
        role: 'engineering',
        whatWorked: 'QA coordination helps catch bugs.',
      },
      {
        cycle: 'C3',
        role: 'qa',
        whatWorked: 'Engineering coordination improves verification.',
      },
      {
        cycle: 'C4',
        role: 'qa',
        whatWorked: 'Coordinating with engineering helps.',
      },
    ];

    const patterns = await extractPatterns(reflections, {
      minClusterSize: 3,
      confidenceThreshold: 0.5,
    });

    const crossRole = patterns.find(p => p.crossRole);
    expect(crossRole).toBeDefined();
    expect(crossRole?.roles).toContain('engineering');
    expect(crossRole?.roles).toContain('qa');
  });

  it('respects confidence threshold', async () => {
    const reflections = [
      {
        cycle: 'C1',
        role: 'engineering',
        whatWorked: 'Completely different topic A.',
      },
      { cycle: 'C2', role: 'qa', whatWorked: 'Another unrelated topic B.' },
      { cycle: 'C3', role: 'design', whatWorked: 'Third random subject C.' },
    ];

    const patterns = await extractPatterns(reflections, {
      confidenceThreshold: 0.7,
    });

    // Low similarity reflections should not form patterns at 70% threshold
    expect(patterns.length).toBe(0);
  });
});
```

---

## Success Criteria (from C468)

| Metric               | Target      | Measurement                      |
| -------------------- | ----------- | -------------------------------- |
| Pattern precision    | ≥70%        | Manual review of top 10 patterns |
| Cross-role detection | ≥3 patterns | Patterns involving 2+ roles      |
| Execution time       | <5s         | For 200 reflections              |
| Token cost           | $0.00       | Keyword-only MVP                 |

---

## Implementation Checklist

### Core Library (Sprint 2 Week 1)

- [ ] `packages/core/src/reflexion/types.ts` — Add new types
- [ ] `packages/core/src/reflexion/keywords.ts` — Keyword extraction
- [ ] `packages/core/src/reflexion/clusters.ts` — Clustering algorithm
- [ ] `packages/core/src/reflexion/confidence.ts` — Confidence scoring
- [ ] `packages/core/src/reflexion/patterns.ts` — Orchestration
- [ ] `packages/core/src/reflexion/index.ts` — Barrel exports
- [ ] Unit tests for all modules

### CLI Commands (Sprint 2 Week 1-2)

- [ ] `packages/cli/src/commands/reflexion/patterns.ts` — Pattern detection
- [ ] `packages/cli/src/commands/reflexion/suggest.ts` — Lesson suggestions
- [ ] `packages/cli/src/commands/reflexion/accept.ts` — Accept/reject
- [ ] Integration tests for CLI

### Documentation

- [ ] Update `packages/cli/README.md` with new commands
- [ ] Add examples to `docs/processes/reflexion-bootstrap-guide.md`

---

## Dependencies

- **#108 Phase 1 (Reflection capture):** ✅ Complete — reflections stored in rotation.json
- **C468 (Pattern Extraction Methodology):** ✅ Complete — methodology validated

---

## References

- Research C468: Pattern Extraction Methodology (keyword-first recommendation)
- Frontier C459: Sprint 2 Frontier Roadmap (architecture context)
- Shinn et al. 2023: Reflexion paper (70% confidence threshold validation)
- Blei et al. 2003: LDA topic modeling (keyword clustering baseline)

---

_🌌 Frontier | Cycle 469 | Reflexion Phase 2 Implementation Spec_
_Cross-referenced: #108, C459, C468_
