/**
 * Tests for JsonVectorStore — Phase 3.2 Persistent Vector Storage
 *
 * @see Issue #17 — feat(core): sophisticated memory retrieval with embeddings
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { JsonVectorStore, createJsonVectorStore } from '../src/json-vector-store.js';
import type { EmbeddedEntry, MemoryEntry } from '../src/embedding.js';

// ─── Test Fixtures ───────────────────────────────────────────────────────────

function createTestEntry(
  id: string,
  content: string,
  kind: MemoryEntry['kind'] = 'decision'
): MemoryEntry {
  return {
    id,
    kind,
    content,
    tags: ['test'],
  };
}

function createEmbeddedEntry(
  id: string,
  content: string,
  embedding: number[],
  kind: MemoryEntry['kind'] = 'decision'
): EmbeddedEntry {
  return {
    entry: createTestEntry(id, content, kind),
    embedding,
  };
}

// Simple mock embedding — just hash the content to a vector
function mockEmbed(text: string, dimensions: number = 4): number[] {
  const vec = new Array(dimensions).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % dimensions] += text.charCodeAt(i) / 1000;
  }
  // Normalize
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return vec.map((v) => (norm > 0 ? v / norm : 0));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('JsonVectorStore', () => {
  let testDir: string;
  let store: JsonVectorStore;
  const dimensions = 4;

  beforeEach(async () => {
    // Create unique temp directory for each test
    testDir = join(tmpdir(), `json-vector-store-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
    store = new JsonVectorStore(testDir, 'test-provider', dimensions);
    await store.load();
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('basic operations', () => {
    it('should start with empty store', async () => {
      expect(await store.count()).toBe(0);
      expect(await store.listIds()).toEqual([]);
    });

    it('should upsert entries', async () => {
      const entries: EmbeddedEntry[] = [
        createEmbeddedEntry('entry-1', 'First entry', mockEmbed('First entry', dimensions)),
        createEmbeddedEntry('entry-2', 'Second entry', mockEmbed('Second entry', dimensions)),
      ];

      await store.upsert(entries);

      expect(await store.count()).toBe(2);
      expect(await store.listIds()).toContain('entry-1');
      expect(await store.listIds()).toContain('entry-2');
    });

    it('should update existing entries on upsert', async () => {
      const entry1 = createEmbeddedEntry('entry-1', 'Original content', mockEmbed('Original content', dimensions));
      await store.upsert([entry1]);

      const entry1Updated = createEmbeddedEntry('entry-1', 'Updated content', mockEmbed('Updated content', dimensions));
      await store.upsert([entry1Updated]);

      expect(await store.count()).toBe(1);
      const stored = store.getEntry('entry-1');
      expect(stored?.content).toBe('Updated content');
    });

    it('should remove entries by ID', async () => {
      const entries: EmbeddedEntry[] = [
        createEmbeddedEntry('entry-1', 'First', mockEmbed('First', dimensions)),
        createEmbeddedEntry('entry-2', 'Second', mockEmbed('Second', dimensions)),
        createEmbeddedEntry('entry-3', 'Third', mockEmbed('Third', dimensions)),
      ];
      await store.upsert(entries);

      await store.remove(['entry-2']);

      expect(await store.count()).toBe(2);
      expect(await store.listIds()).not.toContain('entry-2');
      expect(await store.listIds()).toContain('entry-1');
      expect(await store.listIds()).toContain('entry-3');
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const entries: EmbeddedEntry[] = [
        createEmbeddedEntry('arch-001', 'We decided to use TypeScript', mockEmbed('We decided to use TypeScript', dimensions), 'decision'),
        createEmbeddedEntry('lesson-1', 'Always write tests first', mockEmbed('Always write tests first', dimensions), 'lesson'),
        createEmbeddedEntry('status-1', 'Sprint 0 is in progress', mockEmbed('Sprint 0 is in progress', dimensions), 'status'),
      ];
      await store.upsert(entries);
    });

    it('should return search results ranked by similarity', async () => {
      const query = mockEmbed('TypeScript decision', dimensions);
      const results = await store.search(query, 3);

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(3);

      // Results should be sorted by score descending
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1];
        const curr = results[i];
        if (prev && curr) {
          expect(prev.score).toBeGreaterThanOrEqual(curr.score);
        }
      }
    });

    it('should respect topK limit', async () => {
      const query = mockEmbed('test query', dimensions);
      const results = await store.search(query, 2);

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should filter by kind', async () => {
      const query = mockEmbed('tests', dimensions);
      const results = await store.searchWithFilter(query, 10, { kinds: ['lesson'] });

      expect(results.every((r) => r.entry.kind === 'lesson')).toBe(true);
    });

    it('should filter by tier', async () => {
      // Set one entry to warm
      store.setTier(['lesson-1'], 'warm');

      const query = mockEmbed('tests', dimensions);

      const hotOnly = await store.searchWithFilter(query, 10, { tiers: ['hot'] });
      expect(hotOnly.every((r) => store.getEntry(r.entry.id)?.tier === 'hot')).toBe(true);
      expect(hotOnly.some((r) => r.entry.id === 'lesson-1')).toBe(false);

      const warmOnly = await store.searchWithFilter(query, 10, { tiers: ['warm'] });
      expect(warmOnly.some((r) => r.entry.id === 'lesson-1')).toBe(true);
    });
  });

  describe('tier management', () => {
    beforeEach(async () => {
      const entries: EmbeddedEntry[] = [
        createEmbeddedEntry('entry-1', 'Entry one', mockEmbed('Entry one', dimensions)),
        createEmbeddedEntry('entry-2', 'Entry two', mockEmbed('Entry two', dimensions)),
        createEmbeddedEntry('entry-3', 'Entry three', mockEmbed('Entry three', dimensions)),
      ];
      await store.upsert(entries);
    });

    it('should default new entries to hot tier', () => {
      expect(store.getEntry('entry-1')?.tier).toBe('hot');
      expect(store.getEntry('entry-2')?.tier).toBe('hot');
      expect(store.getEntry('entry-3')?.tier).toBe('hot');
    });

    it('should move entries between tiers', () => {
      store.setTier(['entry-1'], 'warm');
      store.setTier(['entry-2'], 'cold');

      expect(store.getEntry('entry-1')?.tier).toBe('warm');
      expect(store.getEntry('entry-2')?.tier).toBe('cold');
      expect(store.getEntry('entry-3')?.tier).toBe('hot');
    });

    it('should get entries by tier', () => {
      store.setTier(['entry-1'], 'warm');
      store.setTier(['entry-2'], 'cold');

      expect(store.getEntriesByTier('hot')).toEqual(['entry-3']);
      expect(store.getEntriesByTier('warm')).toEqual(['entry-1']);
      expect(store.getEntriesByTier('cold')).toEqual(['entry-2']);
    });

    it('should preserve tier on upsert update', async () => {
      store.setTier(['entry-1'], 'warm');

      // Update the entry
      const updated = createEmbeddedEntry('entry-1', 'Updated content', mockEmbed('Updated content', dimensions));
      await store.upsert([updated]);

      // Tier should be preserved
      expect(store.getEntry('entry-1')?.tier).toBe('warm');
      expect(store.getEntry('entry-1')?.content).toBe('Updated content');
    });
  });

  describe('persistence', () => {
    it('should persist data to disk', async () => {
      const entries: EmbeddedEntry[] = [
        createEmbeddedEntry('entry-1', 'Persisted entry', mockEmbed('Persisted entry', dimensions)),
      ];
      await store.upsert(entries);
      await store.save();

      // Verify file exists
      const filePath = join(testDir, 'state', 'vectors.json');
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      expect(data.version).toBe(1);
      expect(data.entryCount).toBe(1);
      expect(data.entries['entry-1']).toBeDefined();
    });

    it('should load persisted data on init', async () => {
      // Create and save data
      const entries: EmbeddedEntry[] = [
        createEmbeddedEntry('entry-1', 'Persisted entry', mockEmbed('Persisted entry', dimensions)),
      ];
      await store.upsert(entries);
      store.setTier(['entry-1'], 'warm');
      await store.save();

      // Create new store instance and load
      const store2 = new JsonVectorStore(testDir, 'test-provider', dimensions);
      await store2.load();

      expect(await store2.count()).toBe(1);
      expect(store2.getEntry('entry-1')?.content).toBe('Persisted entry');
      expect(store2.getEntry('entry-1')?.tier).toBe('warm');
    });

    it('should reset on provider mismatch', async () => {
      const entries: EmbeddedEntry[] = [
        createEmbeddedEntry('entry-1', 'Entry', mockEmbed('Entry', dimensions)),
      ];
      await store.upsert(entries);
      await store.save();

      // Load with different provider name
      const store2 = new JsonVectorStore(testDir, 'different-provider', dimensions);
      await store2.load();

      // Should have reset to empty (different provider means incompatible embeddings)
      expect(await store2.count()).toBe(0);
    });

    it('should reset on dimension mismatch', async () => {
      const entries: EmbeddedEntry[] = [
        createEmbeddedEntry('entry-1', 'Entry', mockEmbed('Entry', dimensions)),
      ];
      await store.upsert(entries);
      await store.save();

      // Load with different dimensions
      const store2 = new JsonVectorStore(testDir, 'test-provider', 8);
      await store2.load();

      // Should have reset to empty (different dimensions)
      expect(await store2.count()).toBe(0);
    });
  });

  describe('stats', () => {
    it('should return accurate statistics', async () => {
      const entries: EmbeddedEntry[] = [
        createEmbeddedEntry('decision-1', 'Decision', mockEmbed('Decision', dimensions), 'decision'),
        createEmbeddedEntry('lesson-1', 'Lesson', mockEmbed('Lesson', dimensions), 'lesson'),
        createEmbeddedEntry('lesson-2', 'Another lesson', mockEmbed('Another lesson', dimensions), 'lesson'),
      ];
      await store.upsert(entries);
      store.setTier(['decision-1'], 'warm');
      store.setTier(['lesson-2'], 'cold');

      const stats = store.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byTier).toEqual({ hot: 1, warm: 1, cold: 1 });
      expect(stats.byKind.decision).toBe(1);
      expect(stats.byKind.lesson).toBe(2);
      expect(stats.dimensions).toBe(dimensions);
      expect(stats.provider).toBe('test-provider');
    });
  });

  describe('dimension validation', () => {
    it('should reject entries with wrong dimensions', async () => {
      const wrongDimEntry = createEmbeddedEntry('bad', 'Bad entry', [0.5, 0.5]); // Only 2 dims, expected 4

      await expect(store.upsert([wrongDimEntry])).rejects.toThrow(/dimension mismatch/i);
    });

    it('should reject queries with wrong dimensions', async () => {
      const entries: EmbeddedEntry[] = [
        createEmbeddedEntry('entry-1', 'Entry', mockEmbed('Entry', dimensions)),
      ];
      await store.upsert(entries);

      const wrongDimQuery = [0.5, 0.5]; // Only 2 dims

      await expect(store.search(wrongDimQuery, 5)).rejects.toThrow(/dimension mismatch/i);
    });
  });

  describe('factory function', () => {
    it('should create and load store via factory', async () => {
      const factoryStore = await createJsonVectorStore(testDir, 'factory-test', dimensions);

      expect(await factoryStore.count()).toBe(0);

      // Should be able to use immediately
      const entries: EmbeddedEntry[] = [
        createEmbeddedEntry('entry-1', 'Factory entry', mockEmbed('Factory entry', dimensions)),
      ];
      await factoryStore.upsert(entries);
      expect(await factoryStore.count()).toBe(1);
    });
  });

  describe('access tracking', () => {
    it('should update lastAccessedAt on search', async () => {
      const entries: EmbeddedEntry[] = [
        createEmbeddedEntry('entry-1', 'Tracked entry', mockEmbed('Tracked entry', dimensions)),
      ];
      await store.upsert(entries);

      // Initially no access
      expect(store.getEntry('entry-1')?.lastAccessedAt).toBeUndefined();

      // Search
      const query = mockEmbed('Tracked', dimensions);
      await store.searchWithFilter(query, 5, undefined, true);

      // Should have access timestamp
      expect(store.getEntry('entry-1')?.lastAccessedAt).toBeDefined();
    });

    it('should not update lastAccessedAt when trackAccess is false', async () => {
      const entries: EmbeddedEntry[] = [
        createEmbeddedEntry('entry-1', 'Tracked entry', mockEmbed('Tracked entry', dimensions)),
      ];
      await store.upsert(entries);

      const query = mockEmbed('Tracked', dimensions);
      await store.searchWithFilter(query, 5, undefined, false);

      // Should NOT have access timestamp
      expect(store.getEntry('entry-1')?.lastAccessedAt).toBeUndefined();
    });
  });
});
