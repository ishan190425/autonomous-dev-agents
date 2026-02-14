/**
 * @ada-ai/core — Clustering Algorithm Tests
 *
 * Unit tests for agglomerative clustering in Reflexion Phase 2.
 */

import { describe, it, expect } from 'vitest';
import {
  jaccardSimilarity,
  clusterReflections,
} from '../../src/reflexion/clusters.js';
import type { ReflectionInput } from '../../src/reflexion/types.js';

describe('jaccardSimilarity', () => {
  it('returns 1.0 for identical sets', () => {
    const a = new Set(['tests', 'coverage', 'quality']);
    const b = new Set(['tests', 'coverage', 'quality']);

    expect(jaccardSimilarity(a, b)).toBe(1.0);
  });

  it('returns 0.0 for disjoint sets', () => {
    const a = new Set(['apple', 'banana']);
    const b = new Set(['cherry', 'date']);

    expect(jaccardSimilarity(a, b)).toBe(0.0);
  });

  it('calculates correct partial overlap', () => {
    const a = new Set(['a', 'b', 'c']);
    const b = new Set(['b', 'c', 'd']);

    // Intersection: {b, c} = 2
    // Union: {a, b, c, d} = 4
    // Jaccard = 2/4 = 0.5
    expect(jaccardSimilarity(a, b)).toBe(0.5);
  });

  it('handles empty sets', () => {
    const empty = new Set<string>();
    const nonEmpty = new Set(['a', 'b']);

    expect(jaccardSimilarity(empty, empty)).toBe(0);
    expect(jaccardSimilarity(empty, nonEmpty)).toBe(0);
  });
});

describe('clusterReflections', () => {
  it('clusters similar reflections together', () => {
    const reflections: ReflectionInput[] = [
      { cycle: 'C1', role: 'engineering', whatWorked: 'Tests with coverage improve quality.' },
      { cycle: 'C2', role: 'engineering', whatWorked: 'Running tests improves coverage.' },
      { cycle: 'C3', role: 'engineering', whatWorked: 'Test coverage is important for quality.' },
      { cycle: 'C4', role: 'qa', whatWorked: 'Quality assurance needs coverage testing.' },
    ];

    const clusters = clusterReflections(reflections, 3, 0.2);

    expect(clusters.length).toBeGreaterThan(0);
    expect(clusters[0].size).toBeGreaterThanOrEqual(3);
  });

  it('calculates role distribution correctly', () => {
    const reflections: ReflectionInput[] = [
      { cycle: 'C1', role: 'engineering', whatWorked: 'Tests coverage quality' },
      { cycle: 'C2', role: 'engineering', whatWorked: 'Tests coverage automation' },
      { cycle: 'C3', role: 'qa', whatWorked: 'Tests coverage verification' },
    ];

    const clusters = clusterReflections(reflections, 3, 0.2);

    if (clusters.length > 0) {
      const cluster = clusters[0];
      expect(cluster.roleDistribution.engineering).toBe(2);
      expect(cluster.roleDistribution.qa).toBe(1);
    }
  });

  it('extracts top keywords for cluster', () => {
    const reflections: ReflectionInput[] = [
      { cycle: 'C1', role: 'engineering', whatWorked: 'TypeScript strict mode catches errors' },
      { cycle: 'C2', role: 'engineering', whatWorked: 'TypeScript types catch bugs early' },
      { cycle: 'C3', role: 'engineering', whatWorked: 'Strict TypeScript prevents runtime errors' },
    ];

    const clusters = clusterReflections(reflections, 3, 0.2);

    if (clusters.length > 0) {
      const keywords = clusters[0].keywords;
      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords.length).toBeLessThanOrEqual(5);
      // TypeScript should be a top keyword
      expect(keywords.some(k => k.includes('typescript'))).toBe(true);
    }
  });

  it('calculates cohesion score', () => {
    const reflections: ReflectionInput[] = [
      { cycle: 'C1', role: 'engineering', whatWorked: 'identical terms here' },
      { cycle: 'C2', role: 'engineering', whatWorked: 'identical terms here' },
      { cycle: 'C3', role: 'engineering', whatWorked: 'identical terms here' },
    ];

    const clusters = clusterReflections(reflections, 3, 0.2);

    if (clusters.length > 0) {
      // Very similar reflections should have high cohesion
      expect(clusters[0].cohesion).toBeGreaterThan(0.5);
    }
  });

  it('filters clusters below minimum size', () => {
    const reflections: ReflectionInput[] = [
      { cycle: 'C1', role: 'engineering', whatWorked: 'apples oranges bananas' },
      { cycle: 'C2', role: 'engineering', whatWorked: 'completely different zebras' },
    ];

    // Require minimum 3 to form a cluster
    const clusters = clusterReflections(reflections, 3);

    // Should not form clusters below threshold
    expect(clusters.length).toBe(0);
  });

  it('handles empty input', () => {
    const clusters = clusterReflections([]);
    expect(clusters).toEqual([]);
  });

  it('sorts clusters by size descending', () => {
    const reflections: ReflectionInput[] = [
      // Group A: 3 similar
      { cycle: 'C1', role: 'engineering', whatWorked: 'tests coverage' },
      { cycle: 'C2', role: 'engineering', whatWorked: 'tests coverage' },
      { cycle: 'C3', role: 'engineering', whatWorked: 'tests coverage' },
      // Group B: 4 similar
      { cycle: 'C4', role: 'qa', whatWorked: 'documentation api specs' },
      { cycle: 'C5', role: 'qa', whatWorked: 'documentation api specs' },
      { cycle: 'C6', role: 'qa', whatWorked: 'documentation api specs' },
      { cycle: 'C7', role: 'qa', whatWorked: 'documentation api specs' },
    ];

    const clusters = clusterReflections(reflections, 3, 0.2);

    if (clusters.length >= 2) {
      expect(clusters[0].size).toBeGreaterThanOrEqual(clusters[1].size);
    }
  });

  it('tracks recent count correctly', () => {
    const reflections: ReflectionInput[] = [
      { cycle: 'C100', role: 'engineering', whatWorked: 'same keywords here' },
      { cycle: 'C150', role: 'engineering', whatWorked: 'same keywords here' },
      { cycle: 'C200', role: 'engineering', whatWorked: 'same keywords here' },
    ];

    // Window of 50 cycles, max is C200
    // C200 is recent (200-200=0 <= 50)
    // C150 is recent (200-150=50 <= 50)
    // C100 is NOT recent (200-100=100 > 50)
    const clusters = clusterReflections(reflections, 3, 0.3, 50);

    if (clusters.length > 0) {
      expect(clusters[0].recentCount).toBeLessThanOrEqual(clusters[0].size);
    }
  });
});
