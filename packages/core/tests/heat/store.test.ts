/**
 * @ada/core — Heat Store Tests
 *
 * Tests for JSONL-backed heat score persistence.
 *
 * @see packages/core/src/heat/store.ts
 * @see Issue #118 — Heat Scoring Implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import { HeatStore, createHeatStore, type HeatEntry } from '../../src/heat/index.js';
import { DEFAULT_HEAT_CONFIG } from '../../src/heat/types.js';

// ─── Test Helpers ───────────────────────────────────────────────────────────

const TEST_DIR = path.join(process.cwd(), '.test-heat-store');
const TEST_FILE = path.join(TEST_DIR, 'heat.jsonl');

async function cleanup(): Promise<void> {
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

function createTestEntry(id: string, overrides: Partial<HeatEntry> = {}): HeatEntry {
  return {
    id,
    memoryClass: 'learned',
    baseImportance: 0.7,
    referenceCount: 0,
    lastAccessedAt: Date.now(),
    createdAt: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('HeatStore', () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  describe('constructor', () => {
    it('creates store with custom path', () => {
      const store = new HeatStore('/custom/path/heat.jsonl');
      expect(store.path).toBe('/custom/path/heat.jsonl');
    });

    it('uses default config if none provided', () => {
      const store = new HeatStore(TEST_FILE);
      expect(store.path).toBe(TEST_FILE);
    });

    it('accepts custom config', () => {
      const customConfig = {
        ...DEFAULT_HEAT_CONFIG,
        thresholds: { hot: 0.9, warm: 0.5 },
      };
      const store = new HeatStore(TEST_FILE, customConfig);
      expect(store.path).toBe(TEST_FILE);
    });
  });

  describe('load', () => {
    it('creates file if it does not exist', async () => {
      const store = new HeatStore(TEST_FILE);
      const count = await store.load();

      expect(count).toBe(0);
      const exists = await fs
        .access(TEST_FILE)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('loads entries from existing file', async () => {
      // Create file with test data
      await fs.mkdir(TEST_DIR, { recursive: true });
      const entries = [
        createTestEntry('entry-1'),
        createTestEntry('entry-2'),
      ];
      await fs.writeFile(
        TEST_FILE,
        `${entries.map((e) => JSON.stringify(e)).join('\n')  }\n`,
        'utf-8'
      );

      const store = new HeatStore(TEST_FILE);
      const count = await store.load();

      expect(count).toBe(2);
      expect(store.get('entry-1')).not.toBeNull();
      expect(store.get('entry-2')).not.toBeNull();
    });

    it('skips malformed lines', async () => {
      await fs.mkdir(TEST_DIR, { recursive: true });
      const content = [
        JSON.stringify(createTestEntry('good-entry')),
        'not valid json',
        JSON.stringify(createTestEntry('another-good-entry')),
      ].join('\n');
      await fs.writeFile(TEST_FILE, content, 'utf-8');

      const store = new HeatStore(TEST_FILE);
      const count = await store.load();

      expect(count).toBe(2);
    });

    it('handles empty file', async () => {
      await fs.mkdir(TEST_DIR, { recursive: true });
      await fs.writeFile(TEST_FILE, '', 'utf-8');

      const store = new HeatStore(TEST_FILE);
      const count = await store.load();

      expect(count).toBe(0);
    });
  });

  describe('get/set/delete/has', () => {
    it('throws if not loaded', () => {
      const store = new HeatStore(TEST_FILE);
      expect(() => store.get('any')).toThrow('HeatStore not loaded');
    });

    it('returns null for non-existent entry', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      expect(store.get('nonexistent')).toBeNull();
    });

    it('stores and retrieves entries', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      const entry = createTestEntry('test-entry');
      await store.set(entry);

      const retrieved = store.get('test-entry');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('test-entry');
      expect(retrieved?.memoryClass).toBe('learned');
    });

    it('persists entries to file', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      await store.set(createTestEntry('persist-test'));

      // Load in a new store instance
      const store2 = new HeatStore(TEST_FILE);
      await store2.load();

      expect(store2.get('persist-test')).not.toBeNull();
    });

    it('updates existing entries', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      await store.set(createTestEntry('update-test', { referenceCount: 1 }));
      await store.set(createTestEntry('update-test', { referenceCount: 5 }));

      const entry = store.get('update-test');
      expect(entry?.referenceCount).toBe(5);
    });

    it('deletes entries', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      await store.set(createTestEntry('delete-me'));
      expect(store.has('delete-me')).toBe(true);

      const deleted = await store.delete('delete-me');
      expect(deleted).toBe(true);
      expect(store.has('delete-me')).toBe(false);
    });

    it('returns false when deleting non-existent entry', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      const deleted = await store.delete('nonexistent');
      expect(deleted).toBe(false);
    });

    it('checks existence with has()', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      expect(store.has('entry')).toBe(false);
      await store.set(createTestEntry('entry'));
      expect(store.has('entry')).toBe(true);
    });
  });

  describe('increment', () => {
    it('increments reference count', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      await store.set(createTestEntry('inc-test', { referenceCount: 2 }));
      const updated = await store.increment('inc-test');

      expect(updated?.referenceCount).toBe(3);
      expect(store.get('inc-test')?.referenceCount).toBe(3);
    });

    it('updates lastAccessedAt', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      const oldTime = Date.now() - 1000000;
      await store.set(createTestEntry('time-test', { lastAccessedAt: oldTime }));

      const before = store.get('time-test')?.lastAccessedAt;
      await store.increment('time-test');
      const after = store.get('time-test')?.lastAccessedAt;

      expect(after).toBeGreaterThan(before!);
    });

    it('returns null for non-existent entry', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      const result = await store.increment('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('incrementMany', () => {
    it('increments multiple entries atomically', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      await store.set(createTestEntry('multi-1', { referenceCount: 1 }), false);
      await store.set(createTestEntry('multi-2', { referenceCount: 2 }), false);
      await store.set(createTestEntry('multi-3', { referenceCount: 3 }), false);
      await store.save();

      const count = await store.incrementMany(['multi-1', 'multi-2', 'nonexistent']);

      expect(count).toBe(2); // Only 2 found
      expect(store.get('multi-1')?.referenceCount).toBe(2);
      expect(store.get('multi-2')?.referenceCount).toBe(3);
      expect(store.get('multi-3')?.referenceCount).toBe(3); // Unchanged
    });
  });

  describe('getByTier', () => {
    it('returns entries in specified tier', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      const now = Date.now();

      // Hot: innate memory (never decays)
      await store.set(
        createTestEntry('hot-entry', {
          memoryClass: 'innate',
          baseImportance: 0.9,
        }),
        false
      );

      // Cold: old learned memory with no references
      await store.set(
        createTestEntry('cold-entry', {
          memoryClass: 'learned',
          baseImportance: 0.3,
          referenceCount: 0,
          lastAccessedAt: now - 30 * 24 * 60 * 60 * 1000, // 30 days ago
          createdAt: now - 30 * 24 * 60 * 60 * 1000,
        }),
        false
      );

      await store.save();

      const hotEntries = store.getByTier('hot');
      const coldEntries = store.getByTier('cold');

      expect(hotEntries.some((e) => e.id === 'hot-entry')).toBe(true);
      expect(coldEntries.some((e) => e.id === 'cold-entry')).toBe(true);
    });

    it('includes heatScore in results', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      await store.set(
        createTestEntry('scored-entry', {
          memoryClass: 'innate',
          baseImportance: 0.9,
        })
      );

      const hotEntries = store.getByTier('hot');
      expect(hotEntries[0].heatScore).toBeGreaterThan(0);
    });

    it('sorts by heat score descending', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      const now = Date.now();

      // Two learned memories with different reference counts
      // Higher refs = higher heat
      await store.set(
        createTestEntry('learned-low', {
          memoryClass: 'learned',
          baseImportance: 0.9,
          referenceCount: 1,
          lastAccessedAt: now,
          createdAt: now,
        }),
        false
      );
      await store.set(
        createTestEntry('learned-high', {
          memoryClass: 'learned',
          baseImportance: 0.9,
          referenceCount: 10, // More references = higher heat
          lastAccessedAt: now,
          createdAt: now,
        }),
        false
      );
      await store.save();

      const all = store.getAllWithScores();
      // Should be sorted descending by heat score
      expect(all.length).toBe(2);
      expect(all[0].heatScore).toBeGreaterThanOrEqual(all[1].heatScore);
      expect(all[0].id).toBe('learned-high');
    });
  });

  describe('getAllWithScores', () => {
    it('returns all entries with scores and tiers', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      await store.set(createTestEntry('entry-a'), false);
      await store.set(createTestEntry('entry-b'), false);
      await store.save();

      const all = store.getAllWithScores();

      expect(all.length).toBe(2);
      expect(all[0]).toHaveProperty('heatScore');
      expect(all[0]).toHaveProperty('tier');
    });
  });

  describe('decay', () => {
    it('processes all entries', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      await store.set(createTestEntry('decay-1'), false);
      await store.set(createTestEntry('decay-2'), false);
      await store.save();

      const result = await store.decay();

      expect(result.processed).toBe(2);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('dry run does not modify entries', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      const now = Date.now();
      await store.set(
        createTestEntry('archive-candidate', {
          memoryClass: 'episodic',
          baseImportance: 0.1,
          lastAccessedAt: now - 60 * 24 * 60 * 60 * 1000,
          createdAt: now - 60 * 24 * 60 * 60 * 1000,
        })
      );

      const result = await store.decay({
        dryRun: true,
        archiveThreshold: 0.05,
      });

      expect(result.archived.length).toBeGreaterThanOrEqual(0);
      expect(store.has('archive-candidate')).toBe(true); // Still exists
    });

    it('archives entries below threshold when not dry run', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      const now = Date.now();
      await store.set(
        createTestEntry('very-cold', {
          memoryClass: 'episodic',
          baseImportance: 0.05,
          referenceCount: 0,
          lastAccessedAt: now - 100 * 24 * 60 * 60 * 1000,
          createdAt: now - 100 * 24 * 60 * 60 * 1000,
        }),
        false
      );
      await store.set(createTestEntry('keep-me'), false);
      await store.save();

      const result = await store.decay({
        dryRun: false,
        archiveThreshold: 0.1, // Anything below 0.1 gets archived
      });

      expect(result.archived).toContain('very-cold');
      expect(store.has('very-cold')).toBe(false);
      expect(store.has('keep-me')).toBe(true);
    });
  });

  describe('stats', () => {
    it('returns zero stats for empty store', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      const stats = store.stats();

      expect(stats.total).toBe(0);
      expect(stats.averageHeat).toBe(0);
      expect(stats.averageReferences).toBe(0);
    });

    it('calculates correct counts by class', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      await store.set(createTestEntry('i1', { memoryClass: 'innate' }), false);
      await store.set(createTestEntry('l1', { memoryClass: 'learned' }), false);
      await store.set(createTestEntry('l2', { memoryClass: 'learned' }), false);
      await store.set(createTestEntry('e1', { memoryClass: 'episodic' }), false);
      await store.save();

      const stats = store.stats();

      expect(stats.total).toBe(4);
      expect(stats.byClass.innate).toBe(1);
      expect(stats.byClass.learned).toBe(2);
      expect(stats.byClass.episodic).toBe(1);
    });

    it('calculates average references', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      await store.set(createTestEntry('r1', { referenceCount: 2 }), false);
      await store.set(createTestEntry('r2', { referenceCount: 4 }), false);
      await store.set(createTestEntry('r3', { referenceCount: 6 }), false);
      await store.save();

      const stats = store.stats();

      expect(stats.averageReferences).toBe(4);
    });
  });

  describe('size', () => {
    it('returns number of entries', async () => {
      const store = new HeatStore(TEST_FILE);
      await store.load();

      expect(store.size).toBe(0);

      await store.set(createTestEntry('a'), false);
      await store.set(createTestEntry('b'), false);

      expect(store.size).toBe(2);
    });
  });
});

describe('createHeatStore', () => {
  it('creates store with default agents path', () => {
    const store = createHeatStore();
    expect(store.path).toBe(path.join('agents', 'memory', 'heat.jsonl'));
  });

  it('creates store with custom agents path', () => {
    const store = createHeatStore('/custom/agents');
    expect(store.path).toBe('/custom/agents/memory/heat.jsonl');
  });
});
