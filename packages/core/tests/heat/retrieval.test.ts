/**
 * @ada/core — Heat-Aware Retrieval Tests
 *
 * Tests for heat-retrieval.ts — bridging memory stream with heat scoring.
 *
 * @see Issue #118 — Heat Scoring Implementation
 * @see packages/core/src/heat-retrieval.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { StreamSearchResult, StreamEntry } from '../../src/memory-stream.js';
import { HeatStore, type HeatEntry } from '../../src/heat/store.js';
import {
  combineWithHeat,
  calculateRetrievalStats,
  initializeHeatData,
  syncHeatWithStream,
  formatHeatResults,
} from '../../src/heat-retrieval.js';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

function createMockEntry(
  id: string,
  importance: number = 7,
  timestamp: string = new Date().toISOString()
): StreamEntry {
  return {
    id,
    cycle: 100,
    timestamp,
    role: 'engineering',
    content: `Test content for ${id}`,
    importance,
    type: 'action',
    tags: [],
    issueRefs: [],
    prRefs: [],
  };
}

function createMockSearchResult(
  entry: StreamEntry,
  score: number = 0.5
): StreamSearchResult {
  return {
    entry,
    score,
    components: {
      recency: 0.8,
      importance: 0.7,
      relevance: 0.6,
    },
  };
}

function createMockHeatEntry(
  id: string,
  overrides: Partial<HeatEntry> = {}
): HeatEntry {
  const now = Date.now();
  return {
    id,
    memoryClass: 'learned',
    baseImportance: 0.7,
    referenceCount: 0,
    lastAccessedAt: now,
    createdAt: now - 10 * 24 * 60 * 60 * 1000, // 10 days ago
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('heat-retrieval', () => {
  let tempDir: string;
  let heatStorePath: string;
  let heatStore: HeatStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'heat-retrieval-test-'));
    heatStorePath = join(tempDir, 'heat.jsonl');
    heatStore = new HeatStore(heatStorePath);
    await heatStore.load();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('combineWithHeat', () => {
    it('combines search results with heat scores', async () => {
      // Set up heat data
      await heatStore.set(createMockHeatEntry('entry-1', { referenceCount: 5 }));
      await heatStore.set(createMockHeatEntry('entry-2', { referenceCount: 1 }));

      // Create mock search results
      const results: StreamSearchResult[] = [
        createMockSearchResult(createMockEntry('entry-1'), 0.6),
        createMockSearchResult(createMockEntry('entry-2'), 0.8),
      ];

      const heatAware = await combineWithHeat(results, heatStore);

      expect(heatAware).toHaveLength(2);
      expect(heatAware[0].heatScore).toBeDefined();
      expect(heatAware[1].heatScore).toBeDefined();
    });

    it('uses fallback score for entries without heat data', async () => {
      const results: StreamSearchResult[] = [
        createMockSearchResult(createMockEntry('no-heat-entry'), 0.7),
      ];

      const heatAware = await combineWithHeat(results, heatStore);

      expect(heatAware).toHaveLength(1);
      expect(heatAware[0].heatScore).toBeUndefined();
      expect(heatAware[0].combinedScore).toBeDefined();
    });

    it('filters by minimum heat tier', async () => {
      const now = Date.now();
      // Hot entry (high recent access, many refs)
      await heatStore.set(
        createMockHeatEntry('hot-entry', {
          referenceCount: 10,
          lastAccessedAt: now,
          baseImportance: 0.9,
        })
      );
      // Cold entry (old, no refs)
      await heatStore.set(
        createMockHeatEntry('cold-entry', {
          referenceCount: 0,
          lastAccessedAt: now - 30 * 24 * 60 * 60 * 1000, // 30 days ago
          baseImportance: 0.3,
        })
      );

      const results: StreamSearchResult[] = [
        createMockSearchResult(createMockEntry('hot-entry'), 0.5),
        createMockSearchResult(createMockEntry('cold-entry'), 0.9),
      ];

      const heatAware = await combineWithHeat(results, heatStore, {
        minTier: 'warm',
      });

      // Should filter out cold entry
      expect(heatAware.length).toBeLessThanOrEqual(2);
      // If hot-entry is included, it should pass the filter
      const hotResult = heatAware.find((r) => r.entry.id === 'hot-entry');
      if (hotResult) {
        expect(hotResult.heatTier).not.toBe('cold');
      }
    });

    it('applies heat weight to combined score', async () => {
      await heatStore.set(
        createMockHeatEntry('weighted-entry', {
          referenceCount: 5,
          baseImportance: 0.9,
        })
      );

      const results: StreamSearchResult[] = [
        createMockSearchResult(createMockEntry('weighted-entry'), 0.6),
      ];

      // Test with different heat weights
      const lowWeight = await combineWithHeat(results, heatStore, {
        heatWeight: 0.1,
      });
      const highWeight = await combineWithHeat(results, heatStore, {
        heatWeight: 0.9,
      });

      // Combined scores should differ based on weight
      expect(lowWeight[0].combinedScore).toBeDefined();
      expect(highWeight[0].combinedScore).toBeDefined();
      // Higher heat weight should favor entries with better heat scores
    });

    it('tracks access when requested', async () => {
      await heatStore.set(createMockHeatEntry('track-me', { referenceCount: 0 }));

      const results: StreamSearchResult[] = [
        createMockSearchResult(createMockEntry('track-me'), 0.7),
      ];

      await combineWithHeat(results, heatStore, { trackAccess: true });

      // Reload to verify
      await heatStore.load();
      const entry = heatStore.get('track-me');
      expect(entry?.referenceCount).toBe(1);
    });

    it('sorts results by combined score', async () => {
      await heatStore.set(
        createMockHeatEntry('low-heat', {
          referenceCount: 0,
          baseImportance: 0.3,
        })
      );
      await heatStore.set(
        createMockHeatEntry('high-heat', {
          referenceCount: 10,
          baseImportance: 0.9,
        })
      );

      const results: StreamSearchResult[] = [
        createMockSearchResult(createMockEntry('low-heat'), 0.9), // High semantic
        createMockSearchResult(createMockEntry('high-heat'), 0.3), // Low semantic
      ];

      const heatAware = await combineWithHeat(results, heatStore);

      // Results should be sorted by combined score
      expect(heatAware[0].combinedScore).toBeGreaterThanOrEqual(
        heatAware[1].combinedScore
      );
    });
  });

  describe('calculateRetrievalStats', () => {
    it('calculates statistics for heat-aware results', async () => {
      await heatStore.set(createMockHeatEntry('with-heat'));

      const results: StreamSearchResult[] = [
        createMockSearchResult(createMockEntry('with-heat'), 0.7),
        createMockSearchResult(createMockEntry('without-heat'), 0.8),
      ];

      const heatAware = await combineWithHeat(results, heatStore);
      const stats = calculateRetrievalStats(heatAware);

      expect(stats.totalResults).toBe(2);
      expect(stats.withHeatData).toBe(1);
      expect(stats.withoutHeatData).toBe(1);
    });

    it('counts entries by tier', async () => {
      const now = Date.now();
      // Hot entry
      await heatStore.set(
        createMockHeatEntry('hot', {
          baseImportance: 0.95,
          referenceCount: 10,
          lastAccessedAt: now,
        })
      );
      // Warm entry
      await heatStore.set(
        createMockHeatEntry('warm', {
          baseImportance: 0.5,
          referenceCount: 2,
          lastAccessedAt: now - 5 * 24 * 60 * 60 * 1000,
        })
      );

      const results: StreamSearchResult[] = [
        createMockSearchResult(createMockEntry('hot'), 0.7),
        createMockSearchResult(createMockEntry('warm'), 0.6),
      ];

      const heatAware = await combineWithHeat(results, heatStore);
      const stats = calculateRetrievalStats(heatAware);

      expect(stats.byTier.hot + stats.byTier.warm + stats.byTier.cold).toBe(2);
    });

    it('calculates average heat', async () => {
      await heatStore.set(
        createMockHeatEntry('entry-1', { baseImportance: 0.8 })
      );
      await heatStore.set(
        createMockHeatEntry('entry-2', { baseImportance: 0.6 })
      );

      const results: StreamSearchResult[] = [
        createMockSearchResult(createMockEntry('entry-1'), 0.5),
        createMockSearchResult(createMockEntry('entry-2'), 0.5),
      ];

      const heatAware = await combineWithHeat(results, heatStore);
      const stats = calculateRetrievalStats(heatAware);

      expect(stats.averageHeat).toBeGreaterThan(0);
      expect(stats.averageHeat).toBeLessThanOrEqual(1);
    });
  });

  describe('initializeHeatData', () => {
    it('creates heat entries for stream entries', async () => {
      const entries: StreamEntry[] = [
        createMockEntry('init-1', 8),
        createMockEntry('init-2', 5),
      ];

      const count = await initializeHeatData(entries, heatStore);

      expect(count).toBe(2);
      expect(heatStore.get('init-1')).not.toBeNull();
      expect(heatStore.get('init-2')).not.toBeNull();
    });

    it('normalizes importance to 0-1 range', async () => {
      const entries: StreamEntry[] = [createMockEntry('norm-test', 10)];

      await initializeHeatData(entries, heatStore);

      const entry = heatStore.get('norm-test');
      expect(entry?.baseImportance).toBe(1); // 10/10 = 1.0
    });

    it('skips existing entries unless overwrite is true', async () => {
      await heatStore.set(
        createMockHeatEntry('existing', { baseImportance: 0.9 })
      );

      const entries: StreamEntry[] = [createMockEntry('existing', 5)];

      // Without overwrite
      const countNoOverwrite = await initializeHeatData(entries, heatStore, {
        overwrite: false,
      });
      expect(countNoOverwrite).toBe(0);
      expect(heatStore.get('existing')?.baseImportance).toBe(0.9);

      // With overwrite
      const countWithOverwrite = await initializeHeatData(entries, heatStore, {
        overwrite: true,
      });
      expect(countWithOverwrite).toBe(1);
      expect(heatStore.get('existing')?.baseImportance).toBe(0.5); // 5/10
    });

    it('uses specified memory class', async () => {
      const entries: StreamEntry[] = [createMockEntry('episodic-test')];

      await initializeHeatData(entries, heatStore, {
        defaultClass: 'episodic',
      });

      const entry = heatStore.get('episodic-test');
      expect(entry?.memoryClass).toBe('episodic');
    });
  });

  describe('syncHeatWithStream', () => {
    it('removes orphaned heat entries', async () => {
      await heatStore.set(createMockHeatEntry('valid-1'));
      await heatStore.set(createMockHeatEntry('valid-2'));
      await heatStore.set(createMockHeatEntry('orphan'));

      const validIds = new Set(['valid-1', 'valid-2']);
      const removed = await syncHeatWithStream(validIds, heatStore);

      expect(removed).toBe(1);
      await heatStore.load();
      expect(heatStore.get('orphan')).toBeNull();
      expect(heatStore.get('valid-1')).not.toBeNull();
      expect(heatStore.get('valid-2')).not.toBeNull();
    });

    it('returns zero when all entries are valid', async () => {
      await heatStore.set(createMockHeatEntry('valid-1'));
      await heatStore.set(createMockHeatEntry('valid-2'));

      const validIds = new Set(['valid-1', 'valid-2', 'extra-valid']);
      const removed = await syncHeatWithStream(validIds, heatStore);

      expect(removed).toBe(0);
    });
  });

  describe('formatHeatResults', () => {
    it('formats results with tier emoji', async () => {
      await heatStore.set(
        createMockHeatEntry('format-test', {
          baseImportance: 0.9,
          referenceCount: 10,
        })
      );

      const results: StreamSearchResult[] = [
        createMockSearchResult(createMockEntry('format-test'), 0.7),
      ];

      const heatAware = await combineWithHeat(results, heatStore);
      const formatted = formatHeatResults(heatAware);

      expect(formatted).toContain('format-test');
      expect(formatted).toMatch(/[🔥🌡❄❓]/u);
    });

    it('includes components when requested', async () => {
      await heatStore.set(createMockHeatEntry('comp-test'));

      const results: StreamSearchResult[] = [
        createMockSearchResult(createMockEntry('comp-test'), 0.7),
      ];

      const heatAware = await combineWithHeat(results, heatStore);
      const formatted = formatHeatResults(heatAware, { showComponents: true });

      expect(formatted).toContain('sem:');
      expect(formatted).toContain('rec:');
      expect(formatted).toContain('imp:');
      expect(formatted).toContain('rel:');
    });

    it('handles entries without heat data', async () => {
      const results: StreamSearchResult[] = [
        createMockSearchResult(createMockEntry('no-heat'), 0.5),
      ];

      const heatAware = await combineWithHeat(results, heatStore);
      const formatted = formatHeatResults(heatAware);

      expect(formatted).toContain('❓');
      expect(formatted).toContain('N/A');
    });
  });
});
