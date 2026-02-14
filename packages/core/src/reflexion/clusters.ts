/**
 * @ada-ai/core — Clustering Algorithm for Reflexion Phase 2
 *
 * Clusters reflections by keyword similarity using agglomerative clustering.
 * Uses Jaccard similarity with single-linkage merging.
 *
 * @see docs/frontier/reflexion-phase2-impl-spec-c469.md
 */

import type { ReflectionCluster, ReflectionInput } from './types.js';
import { extractKeywordsWithTFIDF, getTopKeywords } from './keywords.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Default similarity threshold for cluster merging */
export const DEFAULT_SIMILARITY_THRESHOLD = 0.3;

/** Default minimum cluster size */
export const DEFAULT_MIN_CLUSTER_SIZE = 3;

/** Number of top keywords per reflection for clustering */
const TOP_KEYWORDS_FOR_CLUSTERING = 5;

/** Default recent cycle window */
export const DEFAULT_RECENT_WINDOW = 50;

// ─── Similarity Functions ────────────────────────────────────────────────────

/**
 * Calculate Jaccard similarity between two keyword sets.
 * Jaccard = |intersection| / |union|
 *
 * @param a - First set of keywords
 * @param b - Second set of keywords
 * @returns Similarity score between 0 and 1
 */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) {
    return 0;
  }

  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

// ─── Clustering ──────────────────────────────────────────────────────────────

/**
 * Cluster reflections by keyword similarity.
 * Uses single-linkage agglomerative clustering:
 * - Start with each reflection as its own cluster
 * - Merge clusters if ANY pair of reflections exceeds the similarity threshold
 * - Continue until no more merges are possible
 *
 * @param reflections - Reflections to cluster
 * @param minClusterSize - Minimum size for a cluster to be returned (default: 3)
 * @param similarityThreshold - Jaccard threshold for merging (default: 0.3)
 * @param recentCycleWindow - Window for "recent" calculation (default: 50)
 * @returns Array of clusters sorted by size (descending)
 */
export function clusterReflections(
  reflections: readonly ReflectionInput[],
  minClusterSize: number = DEFAULT_MIN_CLUSTER_SIZE,
  similarityThreshold: number = DEFAULT_SIMILARITY_THRESHOLD,
  recentCycleWindow: number = DEFAULT_RECENT_WINDOW
): ReflectionCluster[] {
  if (reflections.length < minClusterSize) {
    return [];
  }

  // Extract TF-IDF weighted keywords for all reflections
  const keywordsMap = extractKeywordsWithTFIDF(reflections);

  // Build keyword sets for each reflection (top N keywords only, excluding role tags)
  const keywordSets = new Map<string, Set<string>>();
  for (const [cycle, keywords] of keywordsMap) {
    const topTerms = keywords
      .filter((k) => k.roleTag === undefined)
      .slice(0, TOP_KEYWORDS_FOR_CLUSTERING)
      .map((k) => k.term);
    keywordSets.set(cycle, new Set(topTerms));
  }

  // Initialize: each reflection is its own cluster
  const clusters = new Map<string, Set<string>>();
  for (const cycle of keywordSets.keys()) {
    clusters.set(cycle, new Set([cycle]));
  }

  // Agglomerative clustering loop
  let merged = true;
  while (merged) {
    merged = false;
    const clusterIds = Array.from(clusters.keys());

    // Try to merge any pair of clusters
    for (let i = 0; i < clusterIds.length && !merged; i++) {
      for (let j = i + 1; j < clusterIds.length && !merged; j++) {
        const id1 = clusterIds[i];
        const id2 = clusterIds[j];
        if (id1 === undefined || id2 === undefined) continue;
        const c1 = clusters.get(id1);
        const c2 = clusters.get(id2);
        if (!c1 || !c2) continue;

        // Single-linkage: merge if ANY pair exceeds threshold
        let shouldMerge = false;
        for (const r1 of c1) {
          for (const r2 of c2) {
            const set1 = keywordSets.get(r1);
            const set2 = keywordSets.get(r2);
            if (set1 && set2) {
              const sim = jaccardSimilarity(set1, set2);
              if (sim >= similarityThreshold) {
                shouldMerge = true;
                break;
              }
            }
          }
          if (shouldMerge) break;
        }

        if (shouldMerge) {
          // Merge c2 into c1
          for (const r of c2) {
            c1.add(r);
          }
          clusters.delete(id2);
          merged = true;
        }
      }
    }
  }

  // Build ReflectionCluster objects from merged clusters
  const result: ReflectionCluster[] = [];
  let clusterId = 0;

  // Create lookup for reflection data
  const reflectionLookup = new Map(reflections.map((r) => [r.cycle, r]));

  // Find the maximum cycle number for recency calculation
  const maxCycleNum = Math.max(
    ...reflections.map((r) => parseCycleNumber(r.cycle))
  );

  for (const members of clusters.values()) {
    if (members.size < minClusterSize) {
      continue;
    }

    const memberReflections = Array.from(members)
      .map((id) => reflectionLookup.get(id))
      .filter((r): r is ReflectionInput => r !== undefined);

    // Role distribution
    const roleCount: Record<string, number> = {};
    for (const r of memberReflections) {
      roleCount[r.role] = (roleCount[r.role] ?? 0) + 1;
    }

    // Get top keywords for this cluster
    const memberKeywords = Array.from(members)
      .map((id) => keywordsMap.get(id) ?? []);
    const topKeywords = getTopKeywords(memberKeywords, 5, true);

    // Calculate cluster cohesion (average pairwise similarity)
    const memberArray = Array.from(members);
    let totalSim = 0;
    let pairs = 0;
    for (let i = 0; i < memberArray.length; i++) {
      for (let j = i + 1; j < memberArray.length; j++) {
        const m1 = memberArray[i];
        const m2 = memberArray[j];
        if (m1 === undefined || m2 === undefined) continue;
        const set1 = keywordSets.get(m1);
        const set2 = keywordSets.get(m2);
        if (set1 && set2) {
          totalSim += jaccardSimilarity(set1, set2);
          pairs++;
        }
      }
    }
    const cohesion = pairs > 0 ? totalSim / pairs : 0;

    // Count recent reflections
    const recentCount = memberReflections.filter((r) => {
      const cycleNum = parseCycleNumber(r.cycle);
      return maxCycleNum - cycleNum <= recentCycleWindow;
    }).length;

    result.push({
      id: `cluster-${clusterId++}`,
      keywords: topKeywords,
      reflectionIds: Array.from(members).sort(compareCycles),
      roleDistribution: roleCount,
      size: members.size,
      recentCount,
      cohesion,
    });
  }

  // Sort by size descending
  return result.sort((a, b) => b.size - a.size);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse cycle number from cycle ID string.
 * Handles both "C450" and "450" formats.
 */
function parseCycleNumber(cycle: string): number {
  const num = parseInt(cycle.replace(/^C/i, ''), 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Compare function for sorting cycle IDs.
 */
function compareCycles(a: string, b: string): number {
  return parseCycleNumber(a) - parseCycleNumber(b);
}
